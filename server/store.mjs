// Almacenamiento simple de pedidos, clientes y estado del bot.
// En Netlify usa Netlify Blobs; en el VPS guarda archivos JSON en DATA_DIR (volumen persistente /app/storage).
import fs from 'node:fs/promises';
import path from 'node:path';

const onNetlify = !!(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);
let netlifyGetStore = null;
if (onNetlify) {
  try { ({ getStore: netlifyGetStore } = await import('@netlify/blobs')); } catch { netlifyGetStore = null; }
}

const dataDir = () => process.env.DATA_DIR || path.resolve(process.cwd(), 'storage');
const safe = (k) => encodeURIComponent(String(k)).slice(0, 180);
const unsafe = (f) => decodeURIComponent(f.replace(/\.json$/, ''));

function fileStore(name) {
  const dir = path.join(dataDir(), name.replace(/[^a-z0-9_-]/gi, ''));
  const file = (k) => path.join(dir, safe(k) + '.json');
  return {
    async get(key, opts = {}) {
      try {
        const raw = await fs.readFile(file(key), 'utf8');
        return opts.type === 'json' ? JSON.parse(raw) : JSON.parse(raw).value ?? raw;
      } catch { return null; }
    },
    async set(key, value) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file(key), JSON.stringify({ value: String(value) }));
    },
    async setJSON(key, obj) {
      await fs.mkdir(dir, { recursive: true });
      const tmp = file(key) + '.' + process.pid + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(obj, null, 1));
      await fs.rename(tmp, file(key));
    },
    async delete(key) { await fs.rm(file(key), { force: true }); },
    async list() {
      try {
        const names = await fs.readdir(dir);
        return { blobs: names.filter((n) => n.endsWith('.json')).map((n) => ({ key: unsafe(n) })) };
      } catch { return { blobs: [] }; }
    },
  };
}

export function getStore(name) {
  if (netlifyGetStore) return netlifyGetStore(name);
  return fileStore(name);
}

/** Lee todos los documentos JSON de una colección. */
export async function readAll(name) {
  const s = getStore(name);
  const { blobs } = await s.list();
  const out = await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' }).catch(() => null)));
  return out.filter(Boolean);
}
