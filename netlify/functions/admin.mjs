// /api/admin/*  → API del panel de pedidos (requiere sesión).
// Variables: ADMIN_PASSWORD (obligatoria), ADMIN_SECRET (opcional, para firmar la sesión)
import crypto from 'node:crypto';
import {
  STATUS, PAY_METHODS, CHANNELS, createOrder, getOrder, saveOrder, listOrders, setStatus, addInternalNote,
  listCustomers, getCustomer, stats, getStock, setStock,
} from '../../server/orders.mjs';
import { notifyCustomer, mailConfigured, bankLines } from '../../server/mailer.mjs';
import { catalog } from '../../public/assets/js/pricing.mjs';

const SESSION_HOURS = 12;
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

const secret = () => process.env.ADMIN_SECRET || crypto.createHash('sha256').update('ova-admin:' + (process.env.ADMIN_PASSWORD || '')).digest('hex');
const b64 = (s) => Buffer.from(s).toString('base64url');
function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + mac;
}
function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const exp = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (mac.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(exp))) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
}
const cookieOf = (req, name) => (req.headers.get('cookie') || '').split(/;\s*/).map((c) => c.split('=')).find(([k]) => k === name)?.[1];
function cookieHeader(req, value, maxAge) {
  const https = (req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '')) === 'https';
  return `ova_admin=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${https ? '; Secure' : ''}`;
}

// Límite de intentos de inicio de sesión: 8 cada 15 minutos por IP.
const attempts = new Map();
function tooMany(ip) {
  const now = Date.now();
  const a = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60e3);
  attempts.set(ip, a);
  return a.length >= 8;
}

const csvCell = (v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows) => '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
const money = (c) => (c / 100).toFixed(2);

export default async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean);
  const [res, id, action] = parts;
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';

  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8) {
    return json({ error: 'El panel no está configurado. Define ADMIN_PASSWORD (mínimo 8 caracteres) en Coolify.' }, 503);
  }
  if (req.method !== 'GET' && req.headers.get('x-requested-with') !== 'ova-admin') return json({ error: 'Solicitud no permitida.' }, 403);

  // --- Sesión ---
  if (res === 'login' && req.method === 'POST') {
    if (tooMany(ip)) return json({ error: 'Demasiados intentos. Espera 15 minutos.' }, 429);
    const { password } = await req.json().catch(() => ({}));
    const a = Buffer.from(crypto.createHash('sha256').update(String(password || '')).digest('hex'));
    const b = Buffer.from(crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest('hex'));
    if (!crypto.timingSafeEqual(a, b)) {
      attempts.get(ip).push(Date.now());
      await new Promise((r) => setTimeout(r, 600));
      return json({ error: 'Contraseña incorrecta.' }, 401);
    }
    attempts.delete(ip);
    const token = sign({ sub: 'admin', exp: Date.now() + SESSION_HOURS * 3600e3 });
    return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader(req, token, SESSION_HOURS * 3600) });
  }
  if (res === 'logout') return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader(req, '', 0) });

  const session = verify(cookieOf(req, 'ova_admin'));
  if (!session) return json({ error: 'Inicia sesión.' }, 401);

  try {
    // --- Configuración para el panel ---
    if (res === 'config') {
      return json({
        statuses: STATUS, payMethods: PAY_METHODS, channels: CHANNELS,
        products: catalog.products.map(({ id, name, price }) => ({ id, name, price })),
        zones: catalog.shipping.zones, promotions: catalog.promotions || [],
        mail: mailConfigured(), bank: bankLines().length > 0,
      });
    }

    // --- Pedidos ---
    if (res === 'pedidos') {
      if (!id && req.method === 'GET') return json({ orders: await listOrders({ status: url.searchParams.get('status'), q: url.searchParams.get('q') }) });
      if (!id && req.method === 'POST') {
        const b = await req.json();
        const r = await createOrder({
          items: b.items, zone: b.zone, payMethod: b.payMethod, channel: b.channel || 'whatsapp',
          status: b.status, customer: b.customer, notes: b.notes, strict: false, by: 'admin', skipStock: !!b.skipStock,
        });
        if (r.error) return json({ error: r.error }, 400);
        if (b.notify && r.order.customer.email) {
          await notifyCustomer(r.order, r.order.status === 'pagado' ? 'pagado' : 'recibido');
          await saveOrder(r.order);
        }
        return json({ order: r.order });
      }
      const order = await getOrder(id);
      if (!order) return json({ error: 'No existe ese pedido.' }, 404);
      if (!action && req.method === 'GET') return json({ order });
      if (action === 'estado' && req.method === 'POST') {
        const b = await req.json();
        if (b.status === 'enviado' && !(b.tracking?.number || order.tracking?.number) && !b.sinGuia) {
          return json({ error: 'Escribe el número de guía (o marca "sin guía" si lo entregaste tú).' }, 400);
        }
        const r = await setStatus(id, { status: b.status, tracking: b.tracking, note: b.note });
        if (r.error) return json({ error: r.error }, 400);
        let mail = null;
        if (b.notify !== false && r.changed && ['pagado', 'enviado', 'entregado'].includes(b.status)) {
          mail = await notifyCustomer(r.order, b.status);
          await saveOrder(r.order);
        }
        return json({ order: r.order, mail });
      }
      if (action === 'nota' && req.method === 'POST') {
        const { text } = await req.json();
        return json({ order: await addInternalNote(id, text) });
      }
      if (action === 'correo' && req.method === 'POST') {
        const { kind } = await req.json();
        const mail = await notifyCustomer(order, kind);
        await saveOrder(order);
        return json({ order, mail });
      }
    }

    // --- Clientes ---
    if (res === 'clientes') {
      if (!id) return json({ customers: await listCustomers() });
      const c = await getCustomer(decodeURIComponent(id));
      return c ? json({ customer: c }) : json({ error: 'No encontrado' }, 404);
    }

    // --- Resumen y stock ---
    if (res === 'resumen') return json(await stats());
    if (res === 'stock') {
      if (req.method === 'GET') return json(await getStock());
      const b = await req.json();
      return json(await setStock(b.productId, b.qty === '' || b.qty === null ? null : Number(b.qty), b.lowAlert === undefined ? undefined : Number(b.lowAlert)));
    }

    // --- Exportar CSV (abre en Excel) ---
    if (res === 'export' && id === 'pedidos.csv') {
      const orders = await listOrders({});
      const rows = [['Pedido', 'Fecha', 'Estado', 'Canal', 'Pago', 'Cliente', 'Tipo doc', 'Documento', 'Celular', 'Correo', 'Provincia', 'Ciudad', 'Dirección', 'Referencia', 'Productos', 'Bolsas', 'Subtotal', 'Envío', 'IVA incluido', 'Total', 'Guía', 'Notas']];
      for (const o of orders) {
        const c = o.customer;
        rows.push([o.id, o.createdAt.slice(0, 16).replace('T', ' '), STATUS[o.status], CHANNELS[o.channel], PAY_METHODS[o.payMethod], c.name, c.docType, c.document, c.phone, c.email, c.province, c.city, c.address, c.reference,
          o.lines.map((l) => `${l.qty}x ${l.name}`).join(' + '), o.lines.reduce((s, l) => s + l.qty, 0), money(o.subtotal - o.discount), money(o.shipping), money(o.tax), money(o.total),
          o.tracking ? `${o.tracking.carrier} ${o.tracking.number}` : '', o.notes]);
      }
      return new Response(csv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="pedidos-ova-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
    }
    if (res === 'export' && id === 'clientes.csv') {
      const cs = await listCustomers();
      const rows = [['Nombre', 'Tipo doc', 'Documento', 'Celular', 'Correo', 'Provincia', 'Ciudad', 'Dirección', 'Referencia', 'Pedidos', 'Bolsas', 'Total comprado', 'Última compra']];
      for (const c of cs) rows.push([c.name, c.docType, c.document, c.phone, c.email, c.province, c.city, c.address, c.reference, c.orderCount, c.bags, money(c.spent), (c.lastOrderAt || '').slice(0, 10)]);
      return new Response(csv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="clientes-ova-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
    }
  } catch (e) {
    console.error('Admin error', e);
    return json({ error: 'Error interno.' }, 500);
  }
  return json({ error: 'Ruta no encontrada.' }, 404);
};

export const config = { path: ['/api/admin', '/api/admin/*'] };
