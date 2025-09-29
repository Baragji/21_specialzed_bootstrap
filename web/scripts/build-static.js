// Minimal static build: copy index.html to build directory
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const outDir = resolve(process.cwd(), 'build');
mkdirSync(outDir, { recursive: true });
const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Web</title></head>
  <body>
    <h1>It works</h1>
    <script type="module">console.log('web ok');</script>
  </body>
</html>`;
writeFileSync(resolve(outDir, 'index.html'), html);
console.log('Static build written to', outDir);