import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { createAgentIssue } from '../github/createIssue';

const constraintsSchema = z
  .object({
    allowedPaths: z.array(z.string()).optional(),
    forbiddenPaths: z.array(z.string()).optional(),
    timeCapMin: z.number().int().positive().optional(),
    costCapUSD: z.number().nonnegative().optional(),
  })
  .optional();

const taskRequestSchema = z.object({
  owner: z.string().min(1, 'owner is required'),
  repo: z.string().min(1, 'repo is required'),
  title: z.string().min(1, 'title is required'),
  objective: z.string().min(1, 'objective is required'),
  constraints: constraintsSchema,
  testSpec: z.array(z.string()).optional(),
  acceptance: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
});

function normalizeLabels(labels: string[] | undefined): string[] | undefined {
  if (!labels) {
    return undefined;
  }
  const trimmed = labels.map((label) => label.trim()).filter((label) => label.length > 0);
  return trimmed.length ? trimmed : undefined;
}

export function registerTasksRoute(app: FastifyInstance): void {
  app.post('/tasks', async (request, reply) => {
    const parseResult = taskRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        status: 'error',
        message: parseResult.error.format(),
      });
    }

    const payload = parseResult.data;

    try {
      const result = await createAgentIssue({
        owner: payload.owner,
        repo: payload.repo,
        title: payload.title,
        objective: payload.objective,
        constraints: payload.constraints,
        testSpec: payload.testSpec,
        acceptance: payload.acceptance,
        labels: normalizeLabels(payload.labels),
      });

      return reply.code(201).send({
        issue_number: result.issueNumber,
        issue_url: result.issueUrl,
      });
    } catch (error) {
      request.log.error({ err: error }, 'failed to create GitHub issue');
      return reply.code(502).send({ status: 'error', message: 'Failed to create GitHub issue' });
    }
  });
}
