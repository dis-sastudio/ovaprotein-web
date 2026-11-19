// POST /api/pago/confirmar  → confirma la transacción con PayPhone (obligatorio en los primeros 5 minutos)
// y marca el pedido como pagado. Variables: PAYPHONE_TOKEN
import { getStore } from '../../server/store.mjs';
import { getOrder, saveOrder, setStatus } from '../../server/orders.mjs';
import { notifyCustomer, notifyOwner } from '../../server/mailer.mjs';

const CONFIRM_URL = 'https://pay.payphonetodoesposible.com/api/button/V2/Confirm';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

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

  const map = await getStore('payphone-tx').get(clientTxId, { type: 'json' }).catch(() => null);
  const order = map ? await getOrder(map.orderId) : null;
  if (order) {
    result.orderId = order.id;
    order.payphone = { ...result, clientTxId };
    if (approved && order.status === 'pendiente_pago') {
      const amountOk = t.amount === order.total;
      await saveOrder(order);
      const { order: updated } = await setStatus(order.id, {
        status: 'pagado', by: 'PayPhone',
        note: amountOk ? `Pago con tarjeta aprobado (autorización ${t.authorizationCode || '—'})` : `REVISAR: PayPhone cobró ${t.amount} y el pedido es ${order.total}`,
      });
      await notifyCustomer(updated, 'pagado');
      await saveOrder(updated);
      notifyOwner(updated).catch(() => {});
    } else if (!approved && order.status === 'pendiente_pago') {
      await saveOrder(order);
      await setStatus(order.id, { status: 'cancelado', by: 'PayPhone', note: `Pago con tarjeta no aprobado: ${t.transactionStatus || t.message || ''}` });
    }
  }
  return json(result);
};

export const config = { path: '/api/pago/confirmar' };
