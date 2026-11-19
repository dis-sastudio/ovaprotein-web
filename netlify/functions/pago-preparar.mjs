// POST /api/pago/preparar  → crea la transacción en PayPhone (Botón de pago por redirección)
// Variables de entorno: PAYPHONE_TOKEN, PAYPHONE_STORE_ID, SITE_URL
import { computeOrder, payphoneAmounts } from '../../public/assets/js/pricing.mjs';
import { getStore } from '../../server/store.mjs';

const PREPARE_URL = 'https://pay.payphonetodoesposible.com/api/button/Prepare';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const clean = (s, n = 120) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const { PAYPHONE_TOKEN, PAYPHONE_STORE_ID, SITE_URL } = process.env;
  if (!PAYPHONE_TOKEN || !PAYPHONE_STORE_ID) return json({ error: 'El pago con tarjeta aún no está configurado.' }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }

  // El precio se calcula SIEMPRE en el servidor con el catálogo.
  const order = computeOrder({ items: body.items, coupon: body.coupon, zone: body.zone });
  if (!order.lines.length) return json({ error: 'Tu carrito está vacío.' }, 400);
  if (!order.zone) return json({ error: 'Elige un tipo de envío.' }, 400);
  const blocking = order.errors.filter((e) => !/código/i.test(e));
  if (blocking.length) return json({ error: blocking.join(' ') }, 400);

  const cu = body.customer || {};
  const customer = {
    name: clean(cu.name), email: clean(cu.email), phone: clean(cu.phone, 16), document: clean(cu.document, 13),
    documentType: ['1', '2', '3'].includes(String(cu.documentType)) ? Number(cu.documentType) : 1,
    province: clean(cu.province), city: clean(cu.city), address: clean(cu.address, 200), reference: clean(cu.reference, 200), notes: clean(cu.notes, 300),
  };
  if (!customer.name || !customer.email || !customer.phone || !customer.address) return json({ error: 'Completa tus datos de entrega.' }, 400);

  const clientTransactionId = 'OVA' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const site = (SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
  const amounts = payphoneAmounts(order);
  const reference = ('OVA PRO+ ' + order.lines.map((l) => `${l.qty}x${l.sku}`).join(' ')).slice(0, 100);

  const payload = {
    ...amounts,
    currency: 'USD',
    clientTransactionId,
    storeId: PAYPHONE_STORE_ID,
    reference,
    responseUrl: `${site}/pago/`,
    cancellationUrl: `${site}/carrito/?cancelado=1`,
    email: customer.email,
    phoneNumber: customer.phone,
    documentId: customer.document,
    lang: 'es',
    timeZone: -5,
  };

  let r, data;
  try {
    r = await fetch(PREPARE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYPHONE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    data = await r.json().catch(() => ({}));
  } catch (e) {
    console.error('PayPhone sin conexión', e.message);
    return json({ error: 'No pudimos conectar con PayPhone. Intenta en un minuto o elige Transferencia.' }, 502);
  }
  if (!r.ok || !data.payWithCard) {
    console.error('PayPhone Prepare error', r.status, data);
    return json({ error: 'PayPhone no respondió. Intenta en un minuto o pide por WhatsApp.' }, 502);
  }

  // Guardamos el pedido pendiente para confirmarlo y notificarlo después.
  try {
    await getStore('pedidos').setJSON(clientTransactionId, {
      status: 'pendiente', createdAt: new Date().toISOString(), paymentId: data.paymentId,
      order: { lines: order.lines, subtotal: order.subtotal, discount: order.discount, coupon: order.couponApplied?.code || null,
        shipping: order.shipping, zone: order.zone.label, tax: order.tax, total: order.total },
      customer,
    });
  } catch (e) { console.error('Blobs no disponible', e); }

  return json({ clientTransactionId, total: order.total, payWithCard: data.payWithCard, payWithPayPhone: data.payWithPayPhone });
};

export const config = { path: '/api/pago/preparar' };
