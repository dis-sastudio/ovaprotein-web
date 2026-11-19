// Prueba de punta a punta del sistema de pedidos: node tests/orders.test.mjs
// Levanta el servidor en un puerto libre con datos temporales.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ova-'));
const PORT = 3900 + Math.floor(Math.random() * 90);
const base = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, ['server/server.mjs'], {
  env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', DATA_DIR: dir, ADMIN_PASSWORD: 'prueba-segura-123', BANK_INFO: 'Banco Pichincha|Cuenta de ahorros 2200000000|Titular: OVA Nutrition|RUC 1790000000001', SMTP_HOST: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = ''; srv.stdout.on('data', (d) => (log += d)); srv.stderr.on('data', (d) => (log += d));
await new Promise((r) => setTimeout(r, 700));

let n = 0; const ok = async (name, fn) => { await fn(); n++; console.log('✓', name); };
const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const A = { 'X-Requested-With': 'ova-admin' };
const customer = { name: 'Ana Pérez', docType: 'cedula', document: '1712345678', phone: '0991234567', email: 'ana@example.com', province: 'Pichincha', city: 'Quito', address: 'Av. Amazonas N24-100', reference: 'Edificio azul' };

try {
  let id1;
  await ok('Pedido web por transferencia con promo 2×$50', async () => {
    const r = await post('/api/pedidos', { items: [{ id: 'ova-pro-500', qty: 2 }], zone: 'local', acepto: true, customer });
    const d = await r.json();
    assert.equal(r.status, 200, JSON.stringify(d));
    assert.equal(d.id, 'OVA-0001'); assert.equal(d.total, 5200); assert.equal(d.bank.length, 4); assert.equal(d.emailSent, false);
    id1 = d.id;
  });
  await ok('Rechaza datos incompletos y sin aceptar términos', async () => {
    let r = await post('/api/pedidos', { items: [{ id: 'ova-pro-500', qty: 1 }], zone: 'local', acepto: true, customer: { ...customer, document: '123' } });
    assert.equal(r.status, 400);
    r = await post('/api/pedidos', { items: [{ id: 'ova-pro-500', qty: 1 }], zone: 'local', customer });
    assert.equal(r.status, 400);
  });
  await ok('Ignora precios enviados por el navegador', async () => {
    const r = await post('/api/pedidos', { items: [{ id: 'ova-pro-500', qty: 1, price: 1 }], total: 1, zone: 'nacional', acepto: true, customer: { ...customer, document: '0912345678', city: 'Guayaquil' } });
    const d = await r.json(); assert.equal(d.total, 3200); assert.equal(d.id, 'OVA-0002');
  });
  await ok('Panel exige sesión y protege contra CSRF', async () => {
    let r = await fetch(base + '/api/admin/pedidos'); assert.equal(r.status, 401);
    r = await post('/api/admin/login', { password: 'x' }); assert.equal(r.status, 403);
    r = await post('/api/admin/login', { password: 'mala' }, A); assert.equal(r.status, 401);
  });
  let cookie;
  await ok('Inicio de sesión correcto', async () => {
    const r = await post('/api/admin/login', { password: 'prueba-segura-123' }, A);
    assert.equal(r.status, 200);
    cookie = r.headers.get('set-cookie').split(';')[0];
    assert.match(r.headers.get('set-cookie'), /HttpOnly/);
  });
  const H = { ...A, Cookie: '' }; const auth = () => ({ ...A, Cookie: cookie });
  await ok('Lista pedidos y clientes', async () => {
    const r = await fetch(base + '/api/admin/pedidos?status=todos', { headers: auth() });
    const d = await r.json(); assert.equal(d.orders.length, 2); assert.equal(d.orders[1].customer.document, '1712345678');
    const c = await (await fetch(base + '/api/admin/clientes', { headers: auth() })).json();
    assert.equal(c.customers.length, 2);
  });
  await ok('Stock: se descuenta al pagar y vuelve al cancelar', async () => {
    await post('/api/admin/stock', { productId: 'ova-pro-500', qty: 10, lowAlert: 3 }, auth());
    let r = await post(`/api/admin/pedidos/${id1}/estado`, { status: 'pagado' }, auth());
    assert.equal(r.status, 200);
    let s = await (await fetch(base + '/api/admin/stock', { headers: auth() })).json(); assert.equal(s.items['ova-pro-500'], 8);
    r = await post(`/api/admin/pedidos/${id1}/estado`, { status: 'enviado' }, auth()); assert.equal(r.status, 400); // falta guía
    r = await post(`/api/admin/pedidos/${id1}/estado`, { status: 'enviado', tracking: { carrier: 'Servientrega', number: 'SV123' } }, auth());
    const d = await r.json(); assert.equal(d.order.tracking.number, 'SV123');
    s = await (await fetch(base + '/api/admin/stock', { headers: auth() })).json(); assert.equal(s.items['ova-pro-500'], 8);
    await post(`/api/admin/pedidos/${id1}/estado`, { status: 'cancelado' }, auth());
    s = await (await fetch(base + '/api/admin/stock', { headers: auth() })).json(); assert.equal(s.items['ova-pro-500'], 10);
  });
  await ok('Pedido manual de WhatsApp reconoce al cliente', async () => {
    const r = await post('/api/admin/pedidos', { items: [{ id: 'ova-pro-500', qty: 3 }], zone: 'local', payMethod: 'transfer', status: 'pagado', channel: 'whatsapp', customer: { docType: 'cedula', document: '1712345678', name: 'Ana Pérez' } }, auth());
    const d = await r.json(); assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.order.total, 7700);
    const c = await (await fetch(base + '/api/admin/clientes/1712345678', { headers: auth() })).json();
    assert.equal(c.customer.orders.length, 2); assert.equal(c.customer.address, 'Av. Amazonas N24-100');
  });
  await ok('No deja vender más que el stock', async () => {
    await post('/api/admin/stock', { productId: 'ova-pro-500', qty: 1 }, auth());
    const r = await post('/api/pedidos', { items: [{ id: 'ova-pro-500', qty: 2 }], zone: 'local', acepto: true, customer: { ...customer, document: '1700000000' } });
    assert.equal(r.status, 400); assert.match((await r.json()).error, /quedan 1/);
    await post('/api/admin/stock', { productId: 'ova-pro-500', qty: null }, auth());
  });
  await ok('Resumen y Excel', async () => {
    const s = await (await fetch(base + '/api/admin/resumen', { headers: auth() })).json();
    assert.equal(s.months[0].bags, 3); assert.equal(s.pendingPayment, 1);
    const csv = await (await fetch(base + '/api/admin/export/pedidos.csv', { headers: auth() })).text();
    assert.match(csv, /OVA-0003/); assert.match(csv, /1712345678/);
  });
  await ok('Panel no indexable y sin caché', async () => {
    const r = await fetch(base + '/admin/');
    assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store'); assert.match(r.headers.get('x-robots-tag'), /noindex/);
  });
  await ok('Datos guardados en el volumen', async () => {
    assert.ok(fs.existsSync(path.join(dir, 'pedidos', 'OVA-0001.json')));
    assert.ok(fs.existsSync(path.join(dir, 'clientes', '1712345678.json')));
  });
  console.log(`\n${n} pruebas de pedidos OK`);
} catch (e) {
  console.error('FALLÓ:', e.message, '\n--- log servidor ---\n', log);
  process.exitCode = 1;
} finally {
  srv.kill(); fs.rmSync(dir, { recursive: true, force: true });
}
