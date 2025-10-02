import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const outDir = resolve(process.cwd(), 'build');
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: ['src/app.tsx'],
  outfile: resolve(outDir, 'assets/app.js'),
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['es2019'],
  jsx: 'automatic',
  platform: 'browser'
});

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Orchestrator UI</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="/config.js"></script>
    <script src="/assets/app.js"></script>
  </body>
  </html>`;
writeFileSync(resolve(outDir, 'index.html'), html);
console.log('Built UI to', outDir);