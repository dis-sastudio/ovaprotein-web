// Servidor para VPS (Hostinger u otro): sirve /public y las rutas /api.
// Uso: node server/server.mjs   (Node 20+; sin dependencias)
// Variables: ver .env.example. PORT por defecto 3107.
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Carga .env sin dependencias
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}
process.env.DATA_DIR ||= path.join(ROOT, 'storage');

const PUB = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3107);
const HOST = process.env.HOST || '127.0.0.1';

const routes = {
  '/api/pago/preparar': () => import('../netlify/functions/pago-preparar.mjs'),
  '/api/pago/confirmar': () => import('../netlify/functions/pago-confirmar.mjs'),
  '/api/whatsapp': () => import('../netlify/functions/whatsapp-webhook.mjs'),
};

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };

async function serveStatic(req, res, urlPath) {
  if (/^\/eggstrong/i.test(urlPath) || /^\/producto\//.test(urlPath)) { res.writeHead(301, { Location: '/proteina-de-huevo-ova-pro/' }); return res.end(); }
  let p = decodeURIComponent(urlPath);
  if (p.includes('\0')) { res.writeHead(400); return res.end(); }
  let file = path.join(PUB, path.normalize(p));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  try {
    let st = await fsp.stat(file);
    if (st.isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
      file = path.join(file, 'index.html'); st = await fsp.stat(file);
    }
    const ext = path.extname(file).toLowerCase();
    const cache = p.startsWith('/assets/js/') ? 'public, max-age=3600' : p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=300';
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache, ...SEC });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  } catch {
    const nf = path.join(PUB, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...SEC });
    fs.createReadStream(nf).on('error', () => res.end('404')).pipe(res);
  }
}

async function serveApi(req, res, url, load) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 1e6) { res.writeHead(413); return res.end(); } chunks.push(c); }
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const request = new Request(`${proto}://${req.headers.host}${url.pathname}${url.search}`, {
    method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
  const pending = [];
  try {
    const mod = await load();
    const r = await mod.default(request, { waitUntil: (p) => pending.push(p) });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error('API error', url.pathname, e);
    res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"error":"Error interno"}');
  }
  await Promise.allSettled(pending);
}

const CANON = process.env.CANONICAL_HOST || ''; // p. ej. www.ovaprotein.com
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0];
  if (CANON && host && host !== CANON && !host.startsWith('127.') && host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    res.writeHead(301, { Location: `https://${CANON}${url.pathname}${url.search}` }); return res.end();
  }
  const load = routes[url.pathname.replace(/\/$/, '')];
  if (load) return serveApi(req, res, url, load);
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  serveStatic(req, res, url.pathname);
}).listen(PORT, HOST, () => console.log(`OVA PRO+ en http://${HOST}:${PORT}`));
