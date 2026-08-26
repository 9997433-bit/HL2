/**
 * Zero-dependency static server, because ES modules will not load over
 * `file://`. Serves this directory only.
 *
 *   node prototypes/parking-jam/serve.js [port]
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

http
  .createServer(async (req, res) => {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = path.join(root, requested === '/' ? 'index.html' : requested);
    if (!target.startsWith(root)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    try {
      const body = await fs.readFile(target);
      res.writeHead(200, { 'content-type': TYPES[path.extname(target)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  })
  .listen(port, () => console.log(`Gridlock Garage -> http://localhost:${port}/`));
