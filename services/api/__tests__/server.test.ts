import http from 'node:http';

// Helper to (re)load the server module after tweaking env and start on a random port
const startServer = async (): Promise<http.Server> => {
  jest.resetModules();
  const mod = await import('../src/server');
  const srv: http.Server = (mod as any).server;
  const listener = srv.listen(0);
  await new Promise<void>((resolve) => listener.once('listening', resolve));
  return listener;
};

const stopServer = async (listener: http.Server) => {
  await new Promise<void>((resolve) => listener.close(() => resolve()));
};

test('health endpoint responds with ok (PORT unset branch)', async () => {
  delete process.env.PORT;
  const listener = await startServer();
  try {
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
  } finally {
    await stopServer(listener);
  }
});

test('health endpoint responds with ok (PORT set branch)', async () => {
  process.env.PORT = '3456';
  const listener = await startServer();
  try {
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
  } finally {
    await stopServer(listener);
  }
});