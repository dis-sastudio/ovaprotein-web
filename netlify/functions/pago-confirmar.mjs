// POST /api/pago/confirmar  → confirma la transacción con PayPhone (obligatorio en los primeros 5 minutos)
// Variables: PAYPHONE_TOKEN, RESEND_API_KEY (opcional), ORDER_EMAIL_TO (opcional), ORDER_EMAIL_FROM (opcional)
import { getStore } from '../../server/store.mjs';

const CONFIRM_URL = 'https://pay.payphonetodoesposible.com/api/button/V2/Confirm';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const money = (c) => '$' + (c / 100).toFixed(2);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const { PAYPHONE_TOKEN } = process.env;
  let body;
  try { body = await req.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const id = Number(body.id);
  const clientTxId = String(body.clientTransactionId || '').slice(0, 50);
  if (!id || !clientTxId) return json({ error: 'Faltan datos del pago.' }, 400);

  let r, t;
  try {
    r = await fetch(CONFIRM_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYPHONE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, clientTxId }),
    });
    t = await r.json().catch(() => ({}));
  } catch (e) {
    console.error('PayPhone sin conexión', e.message);
    return json({ approved: false, message: 'No pudimos conectar con PayPhone para confirmar. Recarga esta página.' }, 502);
  }
  if (!r.ok) { console.error('PayPhone Confirm error', r.status, t); return json({ approved: false, message: t.message || 'No se pudo confirmar el pago.' }, 502); }

  const approved = t.statusCode === 3 || t.transactionStatus === 'Approved';
  const result = {
    approved, statusCode: t.statusCode, transactionStatus: t.transactionStatus, amount: t.amount,
    authorizationCode: t.authorizationCode, transactionId: t.transactionId, cardBrand: t.cardBrand, lastDigits: t.lastDigits,
    date: t.date, message: approved ? '' : t.message,
  };

  // Registro + notificación una sola vez por pedido
  let store, rec;
  try { store = getStore('pedidos'); rec = await store.get(clientTxId, { type: 'json' }); } catch (e) { console.error(e); }
  if (rec && rec.status === 'pendiente') {
    // Verifica que el monto cobrado coincida con el calculado al preparar
    const amountOk = !approved || t.amount === rec.order.total;
    rec.status = approved ? (amountOk ? 'pagado' : 'revisar_monto') : 'rechazado';
    rec.payphone = result; rec.confirmedAt = new Date().toISOString();
    await store.setJSON(clientTxId, rec).catch(() => {});
    if (approved) await notify(clientTxId, rec).catch((e) => console.error('Notificación', e));
  }
  return json(result);
};

async function notify(id, rec) {
  const { RESEND_API_KEY, ORDER_EMAIL_TO, ORDER_EMAIL_FROM } = process.env;
  if (!RESEND_API_KEY || !ORDER_EMAIL_TO) return;
  const c = Object.fromEntries(Object.entries(rec.customer).map(([k, v]) => [k, esc(v)])), o = rec.order;
  const lines = o.lines.map((l) => `<li>${l.qty} × ${esc(l.name)} — ${money(l.total)}</li>`).join('');
  const html = `<h2>Nuevo pedido pagado ${id}</h2><ul>${lines}</ul>
    <p>Descuento: ${money(o.discount)} ${o.coupon || ''}<br>Envío (${o.zone}): ${money(o.shipping)}<br><strong>Total: ${money(o.total)}</strong> (IVA ${money(o.tax)})</p>
    <p><strong>${c.name}</strong><br>Doc: ${c.document}<br>Tel: ${c.phone}<br>Email: ${c.email}<br>${c.address}, ${c.city}, ${c.province}<br>Ref: ${c.reference}<br>Notas: ${c.notes}</p>
    <p>PayPhone: autorización ${rec.payphone.authorizationCode} · ${rec.payphone.cardBrand || ''} ${rec.payphone.lastDigits || ''} · estado ${rec.status}</p>
    <p><a href="https://wa.me/${c.phone.replace(/\D/g, '')}">Escribir al cliente por WhatsApp</a></p>`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: ORDER_EMAIL_FROM || 'OVA PRO+ <pedidos@ovaprotein.com>', to: ORDER_EMAIL_TO.split(','), subject: `Pedido pagado ${id} — ${money(o.total)}`, html, reply_to: c.email }),
  });
}

export const config = { path: '/api/pago/confirmar' };
