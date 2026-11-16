import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';

// Local server for the React app, offline data/assets, and existing engine modules.
const root = new URL('./', import.meta.url);
const rendererRoot = new URL('../renderer/dist/', import.meta.url);
export function makeServer() {
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      // Serve the React app at the established origin so existing browser saves
      // remain available. Other requests go through the narrow local data/API map below.
      const rendererPath = path === '/' || path === '/index.html'
        ? 'index.html'
        : /^\/assets\/[A-Za-z0-9._-]+\.(?:js|css|svg)$/.test(path)
          ? path.slice(1)
          : null;
      if (rendererPath) {
        const file = new URL(rendererPath, rendererRoot);
        const extension = file.pathname.split('.').pop();
        const body = await readFile(file);
        const types = { js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml' };
        res.writeHead(200, {
          'Content-Type': types[extension] || 'text/html',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        res.end(body);
        return;
      }
      let file;
      if (path === '/glossary-data.json') file = new URL('../glossary/master.json', root);
      else if (['/unique-art.json', '/catalog-data.json', '/skills-data.json', '/tag-data.json', '/tooltip-data.json', '/buff-data.json'].includes(path)) file = new URL(path.slice(1), root);
      else if (/^\/assets\/(?:uniques|gems|buffs)\/[a-f0-9]{24}\.png$/.test(path) || /^\/assets\/currency\/[a-z]+\.webp$/.test(path)) file = new URL(path.slice(1), root);
      else if (/^\/assets\/(?:ascendancies|classes)\/[a-z]+\.png$/.test(path)) file = new URL(path.slice(1), root);
      else if (/^\/tree-data\/[a-z0-9-]+\.(json|png|jpg|webp)$/.test(path)) file = new URL('../data-sources/pob-tree-3_29/' + path.split('/').pop(), root);
      else if (path === '/data/repoe-poe1.json') file = new URL('../crafting-data/repoe-poe1.json', root);
      else if (path === '/calculation-data.json') file = new URL('calculation-data.json', root);
      else if (/^\/calculation-engine\/src\/(?:index|core|model|validate|modifiers|rules|defence|offence|conversion|advanced-defence|actors|build|skill|snapshot|adapters\/stat-lines)\.ts$/.test(path)) file = new URL('..' + path, root);
      else if (path === '/test/fixtures.ts') file = new URL('../crafting-engine/test/fixtures.ts', root);
      else if (/^\/src\/[a-z]+\.ts$/.test(path)) file = new URL('../crafting-engine' + path, root);
      else if (/^\/crafting-engine\/src\/[a-z]+\.ts$/.test(path)) file = new URL('..' + path, root);
      else { res.writeHead(404); res.end('Not found'); return; }
      // Read before sending headers so missing files return a clean 404.
      const extension = file.pathname.split('.').pop();
      const ts = extension === 'ts';
      let body = await readFile(file);
      if (ts) body = stripTypeScriptTypes(body.toString('utf8'), { mode: 'strip' });
      const types = { js:'text/javascript', mjs:'text/javascript', ts:'text/javascript', css:'text/css', html:'text/html', json:'application/json', png:'image/png', webp:'image/webp', jpg:'image/jpeg' };
      res.writeHead(200, {
        'Content-Type': types[extension] || 'application/octet-stream',
        'Cache-Control': path.startsWith('/assets/') && extension === 'png' ? 'public, max-age=86400' : 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(body);
    } catch (error) {
      res.writeHead(error?.code === 'ENOENT' ? 404 : 500);
      res.end('Unable to serve local file');
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = makeServer();
  server.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(4317, '127.0.0.1', () =>
    console.log('Exile Companion: http://127.0.0.1:4317 â€” Ctrl+C to stop'),
  );
}
