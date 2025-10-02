import { describe, it, expect } from '@jest/globals';
import { verifySignature } from '../src/github/signature';

describe('signature extra branches', () => {
  it('returns false when header does not start with sha256=', () => {
    expect(verifySignature('md5=abcd', 'body', 'secret')).toBe(false);
  });
  it('returns false when header contains invalid hex (throws in Buffer.from)', () => {
    // different length from expected also returns false earlier, so craft same length by computing expected then corrupting chars
    const body = 'x';
    const secret = 's';
    // compute expected correctly
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const invalid = 'zz' + expected.slice(2); // invalid hex prefix but same length
    expect(verifySignature(`sha256=${invalid}`, body, secret)).toBe(false);
  });
});
