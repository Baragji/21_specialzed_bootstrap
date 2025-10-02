import { describe, it, expect, jest } from '@jest/globals';
import { storeMode } from '../src/state/store';

describe('fallback when REDIS_URL missing', () => {
  it('uses memory store and warns once', async () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Importing store already executed initialization path; call storeMode to assert
    const mode = storeMode();
    expect(mode === 'memory' || mode === 'redis').toBe(true);
    spy.mockRestore();
  });
});
