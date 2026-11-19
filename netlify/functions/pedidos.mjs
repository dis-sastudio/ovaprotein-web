// POST /api/pedidos  → registra un pedido por transferencia desde el carrito de la web.
import { createOrder, saveOrder } from '../../server/orders.mjs';
import { notifyCustomer, notifyOwner, bankLines } from '../../server/mailer.mjs';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Límite simple por IP: 8 pedidos por hora.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 8;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  if (!(req.headers.get('content-type') || '').includes('application/json')) return json({ error: 'Solicitud inválida.' }, 415);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  if (limited(ip)) return json({ error: 'Demasiados pedidos seguidos. Escríbenos por WhatsApp.' }, 429);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  if (body.website) return json({ error: 'Solicitud inválida.' }, 400); // trampa anti-bots
  if (!body.acepto) return json({ error: 'Debes aceptar los términos y la política de privacidad.' }, 400);

  const r = await createOrder({
    items: body.items, zone: body.zone, coupon: body.coupon,
    payMethod: 'transfer', channel: 'web', status: 'pendiente_pago',
    customer: body.customer, notes: body.customer?.notes || body.notes,
  });
  if (r.error) return json({ error: r.error }, 400);

  const order = r.order;
  const mail = await notifyCustomer(order, 'recibido');
  await saveOrder(order);
  notifyOwner(order).catch(() => {});

  return json({
    id: order.id,
    total: order.total,
    emailSent: !!mail.ok,
    bank: bankLines(),
    lines: order.lines.map((l) => ({ name: l.name, qty: l.qty, total: l.total })),
    shipping: order.shipping,
  });
};

export const config = { path: '/api/pedidos' };
