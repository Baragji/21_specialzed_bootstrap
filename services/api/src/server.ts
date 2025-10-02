import http from 'node:http';

// Simple HTTP server for health check
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

export const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

/* istanbul ignore next - runtime bootstrap ignored in tests */
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on :${PORT}`);
  });
}