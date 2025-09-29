import crypto from 'crypto';

import { verifySignature } from '../src/github/signature';

describe('verifySignature', () => {
  const secret = 'another-secret';
  const payload = JSON.stringify({ ok: true });

  test('returns true for matching signatures', () => {
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(verifySignature(`sha256=${signature}`, payload, secret)).toBe(true);
  });

  test('returns false when header missing', () => {
    expect(verifySignature(undefined, payload, secret)).toBe(false);
  });

  test('returns false for malformed header prefix', () => {
    expect(verifySignature('sha1=deadbeef', payload, secret)).toBe(false);
  });

  test('returns false when digest lengths differ', () => {
    expect(verifySignature('sha256=short', payload, secret)).toBe(false);
  });

  test('returns false when signature is not valid hex', () => {
    expect(verifySignature('sha256=zzzz', payload, secret)).toBe(false);
  });

  test('returns false when digests differ but length matches', () => {
    const bogus = 'sha256=' + 'a'.repeat(64);
    expect(verifySignature(bogus, payload, secret)).toBe(false);
  });
});
