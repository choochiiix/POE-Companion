import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {makeServer} from '../crafting-ui/server.mjs';
const legacy = makeServer();
const root = new URL('./dist/',import.meta.url);
const mime = {html:'text/html',js:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png'};
const server = createServer(async (req,res)=>{
  const path = new URL(req.url??'/', 'http://localhost').pathname;
  const renderer = path==='/' || path==='/index.html' || /^\/assets\/(?:[A-Za-z0-9_-]+\.)*[A-Za-z0-9_-]+\.(?:js|css|svg)$/.test(path);
  if(!renderer){legacy.emit('request',req,res);return;}
  try { const file = new URL(path==='/'?'index.html':path.slice(1),root); const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[file.pathname.split('.').pop()]||'application/octet-stream','Cache-Control':'no-store'});res.end(body); }
  catch {res.writeHead(404);res.end('Renderer file not found. Build renderer first.');}
});
server.listen(Number(process.env.RENDERER_PORT||4321),'127.0.0.1',()=>console.log(`React renderer: http://127.0.0.1:${server.address().port}`));
