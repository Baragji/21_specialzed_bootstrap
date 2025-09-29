export interface AppConfig {
  port: number;
  githubAppId: string;
  githubWebhookSecret: string;
  githubAppPrivateKey: string;
  rateLimit?: WebhookRateLimit;
}

export interface WebhookLogPayload {
  event: string;
  repo: string;
  deliveryId: string;
}

export interface WebhookRateLimit {
  max: number;
  timeWindow: string | number;
}
