import { server } from '../src/server';
import http from 'node:http';

// Start server on random port for test
let listener: http.Server;

beforeAll((done) => {
  listener = server.listen(0, done);
});

afterAll((done) => {
  listener.close(done);
});

test('health endpoint responds with ok', async () => {
  const address = listener.address();
  if (address && typeof address !== 'string') {
    const url = `http://127.0.0.1:${address.port}`;
    const res = await fetch(url);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: 'ok' });
  } else {
    throw new Error('failed to get server address');
  }
});