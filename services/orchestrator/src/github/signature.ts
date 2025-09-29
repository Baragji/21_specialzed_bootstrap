import crypto from 'crypto';

const SIGNATURE_PREFIX = 'sha256=';

export function verifySignature(headerValue: string | undefined, payload: string, secret: string): boolean {
  if (!headerValue || !secret) {
    return false;
  }

  if (!headerValue.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const received = headerValue.substring(SIGNATURE_PREFIX.length);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = hmac.digest('hex');

  if (received.length !== expected.length) {
    return false;
  }

  try {
    const receivedBuffer = Buffer.from(received, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch (error) {
    return false;
  }
}
