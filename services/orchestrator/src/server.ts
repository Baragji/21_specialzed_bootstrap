import Fastify, { FastifyBaseLogger, FastifyInstance, FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { RateLimitOptions as FastifyRateLimitOptions } from '@fastify/rate-limit';
import pino from 'pino';
import { z } from 'zod';

import { verifySignature } from './github/signature';
import { registerTasksRoute } from './routes/tasks';
import { AppConfig, WebhookLogPayload, WebhookRateLimit } from './types';
import { routeGithubEvent } from './webhooks/router';
import { getTask } from './state/store';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
  }
  interface FastifyInstance {
    orchestratorRateLimit?: FastifyRateLimitOptions;
    orchestratorInternalLimiter?: boolean;
  }
}

const webhookSummarySchema = z.object({
  repository: z
    .object({ full_name: z.string() })
    .optional(),
});

export interface RequestForExtraction {
  rawBody?: string;
  body?: unknown;
}

export function extractRawBody(request: RequestForExtraction): string {
  if (typeof request.rawBody === 'string') {
    return request.rawBody;
  }

  if (request.body) {
    if (typeof request.body === 'string') {
      return request.body;
    }
    try {
      return JSON.stringify(request.body);
    } catch (_error) {
      return '';
    }
  }

  return '';
}

export function buildWebhookLogPayload(event: string, deliveryId: string, payload: unknown): WebhookLogPayload {
  const parsed = webhookSummarySchema.safeParse(payload);
  const repo = parsed.success && parsed.data.repository ? parsed.data.repository.full_name : 'unknown';

  return {
    event,
    repo,
    deliveryId,
  };
}

export function rateLimitErrorResponse() {
  return { status: 'rate_limited' } as const;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

const TIME_MULTIPLIERS = new Map<string, number>([
  ['ms', 1],
  ['millisecond', 1],
  ['milliseconds', 1],
  ['s', 1000],
  ['sec', 1000],
  ['second', 1000],
  ['seconds', 1000],
  ['m', 60_000],
  ['min', 60_000],
  ['minute', 60_000],
  ['minutes', 60_000],
]);

export function resolveTimeWindowMs(window: string | number): number {
  if (typeof window === 'number' && Number.isFinite(window)) {
    return Math.max(1, Math.round(window));
  }

  const normalized = window.toString().trim().toLowerCase();

  if (/^\d+$/.test(normalized)) {
    return Math.max(1, Number(normalized));
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(\w+)$/);
  if (!match) {
    return 60_000;
  }

  const value = Number(match[1]);
  const multiplier = TIME_MULTIPLIERS.get(match[2]);
  if (!multiplier) {
    return 60_000;
  }

  return Math.max(1, Math.round(value * multiplier));
}

export function createRateLimiter(config: WebhookRateLimit) {
  const limit = Math.max(1, config.max);
  const windowMs = resolveTimeWindowMs(config.timeWindow);
  const state = new Map<string, RateLimitState>();

  return (request: FastifyRequest): boolean => {
    const key = request.ip ?? 'unknown';
    const now = Date.now();
    const current = state.get(key);

    if (!current || now >= current.resetAt) {
      state.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (current.count >= limit) {
      return false;
    }

    current.count += 1;
    return true;
  };
}

export function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function buildServer(config: AppConfig): FastifyInstance {
  const envLogLevel = typeof process.env.LOG_LEVEL === 'string' ? process.env.LOG_LEVEL.trim() : undefined;
  const loggerLevel = envLogLevel && envLogLevel.length > 0 ? envLogLevel : 'info';

  const baseLogger = pino({
    level: loggerLevel,
    redact: ['req.headers.authorization'],
  });

  const app = Fastify({
    logger: baseLogger as unknown as FastifyBaseLogger,
  });

  const rateLimitConfig: WebhookRateLimit = config.rateLimit ?? {
    max: 100,
    timeWindow: '1 minute',
  };
  const useInternalLimiter = process.env.RATE_LIMIT_MODE === 'internal';
  const enforceRateLimit = useInternalLimiter ? createRateLimiter(rateLimitConfig) : undefined;

  void app.register(rateLimit, {
    global: false,
    ban: 0,
  });

  const routeMaxEnv = Number.parseInt(process.env.RATE_LIMIT_MAX ?? '', 10);
  const routeRateLimit: FastifyRateLimitOptions = {
    max: Number.isNaN(routeMaxEnv) ? rateLimitConfig.max : Math.max(1, routeMaxEnv),
    timeWindow: resolveTimeWindowMs(rateLimitConfig.timeWindow),
  };

  app.decorate('orchestratorRateLimit', routeRateLimit);
  app.decorate('orchestratorInternalLimiter', useInternalLimiter);

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    const bodyString = body as string;
    request.rawBody = bodyString;

    if (!bodyString) {
      done(null, {});
      return;
    }

    try {
      const json = JSON.parse(bodyString);
      done(null, json);
    } catch (error) {
      done(null, undefined);
    }
  });

  app.get('/healthz', async (_request, reply) => {
    return reply.send({ status: 'ok' });
  });

  app.post(
    '/webhooks/github',
    {
      config: {
        rateLimit: routeRateLimit,
      },
      preHandler: useInternalLimiter
        ? [
            async (request, reply) => {
              if (enforceRateLimit && !enforceRateLimit(request)) {
                request.log.warn({ reason: 'rate_limited' }, 'github webhook rate limited (internal)');
                return reply.code(429).send(rateLimitErrorResponse());
              }
            },
          ]
        : undefined,
    },
    async (request, reply) => {
      const signature = firstHeaderValue(request.headers['x-hub-signature-256']);
      const eventValue = firstHeaderValue(request.headers['x-github-event']);
      const deliveryId = firstHeaderValue(request.headers['x-github-delivery']);

      const rawPayload = extractRawBody(request);

      const isValid = verifySignature(signature, rawPayload, config.githubWebhookSecret);

      if (!isValid) {
        request.log.warn({ reason: 'invalid_signature' }, 'github webhook rejected');
        return reply.code(401).send({ status: 'invalid signature' });
      }

      if (!eventValue || typeof eventValue !== 'string') {
        request.log.warn({ reason: 'missing_event_header' }, 'github webhook missing event header');
        return reply.code(400).send({ status: 'missing event header' });
      }

      const event = eventValue.trim();
      if (!event) {
        request.log.warn({ reason: 'empty_event_header' }, 'github webhook empty event header');
        return reply.code(400).send({ status: 'missing event header' });
      }

      const contentType = firstHeaderValue(request.headers['content-type']);
      const expectsJson = typeof contentType === 'string' && contentType.includes('application/json');

      let parsedBody: unknown;
      if (rawPayload && expectsJson) {
        try {
          parsedBody = JSON.parse(rawPayload);
        } catch (_error) {
          request.log.warn({ reason: 'invalid_json' }, 'github webhook payload parse failed');
          return reply.code(400).send({ status: 'invalid payload' });
        }
      } else if (rawPayload) {
        parsedBody = undefined;
      }

      const summary = buildWebhookLogPayload(event, deliveryId ?? 'unknown', parsedBody);

      request.log.info({ webhook: summary }, 'github webhook accepted');

      // Dispatch to router (best-effort)
      try {
        if (parsedBody) {
          routeGithubEvent(event, parsedBody);
        }
      } catch (err) {
        request.log.warn({ err }, 'webhook handler error');
      }

  return reply.code(200).send({ status: 'received' });
    },
  );

  registerTasksRoute(app);

  app.get('/tasks/:issue_number', async (request, reply) => {
    const param = (request.params as { issue_number?: string }).issue_number;
    const issue_number = param ? Number(param) : NaN;
    if (!Number.isFinite(issue_number)) {
      return reply.code(400).send({ status: 'error', message: 'invalid issue number' });
    }
    const rec = getTask(issue_number);
    if (!rec) {
      return reply.code(404).send({ status: 'not_found' });
    }
    return reply.send({
      issue_number: rec.issue_number,
      state: rec.state,
      last_event: rec.timeline.at(-1),
      timeline: rec.timeline.slice(-25),
      repo: rec.repo,
      pr_number: rec.pr_number,
      checks: { required: rec.checks.required, green: rec.checks.green },
      updatedAt: rec.updatedAt,
    });
  });

  return app;
}

export function loadConfigFromEnv(env = process.env): AppConfig {
  const port = Number(env.PORT ?? '8080');
  const githubWebhookSecret = env.GITHUB_WEBHOOK_SECRET;
  const githubAppId = env.GITHUB_APP_ID;
  const githubPrivateKey = env.GITHUB_APP_PRIVATE_KEY;

  if (!githubWebhookSecret) {
    throw new Error('GITHUB_WEBHOOK_SECRET is required');
  }

  if (!githubAppId) {
    throw new Error('GITHUB_APP_ID is required');
  }

  if (!githubPrivateKey) {
    throw new Error('GITHUB_APP_PRIVATE_KEY is required');
  }

  return {
    port,
    githubWebhookSecret,
    githubAppId,
    githubAppPrivateKey: githubPrivateKey,
  };
}

export async function startRuntime(
  env = process.env,
  exitFn: (code?: number) => never | void = process.exit,
  errorLogger: (message?: unknown, ...optionalParams: unknown[]) => void = console.error,
  serverFactory: (config: AppConfig) => FastifyInstance = buildServer,
): Promise<void> {
  try {
    const config = loadConfigFromEnv(env);
    const app = serverFactory(config);
    await app.listen({ port: config.port, host: '0.0.0.0' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    errorLogger('Failed to start orchestrator service:', message);
    exitFn(1);
  }
}

/* c8 ignore start */
async function start() {
  /* c8 ignore next */
  if (require.main !== module) {
    return;
  }

  /* c8 ignore next */
  await startRuntime();
}

void start();
/* c8 ignore end */
