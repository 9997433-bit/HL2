/**
 * Zero-dependency static server, because ES modules will not load over
 * `file://`. Serves the repository root, since the game imports the shared
 * `wx` shim from a sibling directory, and opens on this prototype.
 *
 *   node prototypes/parking-jam/serve.js [port]
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const home = '/prototypes/parking-jam/';
const port = Number(process.argv[2] ?? 8080);

// `.mjs` matters: a browser refuses to execute a module served as
// application/octet-stream, and the shared wx shim is imported as one.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

http
  .createServer(async (req, res) => {
    let requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (requested === '/') requested = home;
    if (requested.endsWith('/')) requested += 'index.html';
    const target = path.join(root, requested);
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
