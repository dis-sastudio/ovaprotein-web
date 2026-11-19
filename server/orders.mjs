// Pedidos, clientes y stock de OVA PRO+.
// Un pedido guarda los datos del cliente necesarios para cobrar, facturar y enviar.
import { getStore, readAll } from './store.mjs';
import { computeOrder } from '../public/assets/js/pricing.mjs';

export const STATUS = {
  pendiente_pago: 'Por pagar',
  pagado: 'Pagado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
const CONSUMES_STOCK = new Set(['pagado', 'enviado', 'entregado']);
export const PAY_METHODS = { transfer: 'Transferencia / depósito', card: 'Tarjeta (PayPhone)', cash: 'Efectivo' };
export const CHANNELS = { web: 'Web', whatsapp: 'WhatsApp', manual: 'Manual' };

// Mutex en proceso: evita números de pedido o stock duplicados con pedidos simultáneos.
let chain = Promise.resolve();
function locked(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

const clean = (s, n = 160) => String(s ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const digits = (s) => String(s ?? '').replace(/\D/g, '');
export function normPhone(p) {
  const d = digits(p);
  if (!d) return '';
  if (d.startsWith('593')) return '+' + d;
  return '+593' + d.replace(/^0/, '');
}

/** Valida y normaliza los datos del cliente. Devuelve { customer, errors }. */
export function normalizeCustomer(c = {}, { strict = true } = {}) {
  const docType = ['cedula', 'ruc', 'pasaporte'].includes(c.docType) ? c.docType
    : ({ 1: 'cedula', 2: 'ruc', 3: 'pasaporte' })[String(c.documentType || c.docType)] || 'cedula';
  const customer = {
    name: clean(c.name, 120),
    docType,
    document: docType === 'pasaporte' ? clean(c.document, 20).toUpperCase() : digits(c.document).slice(0, 13),
    phone: normPhone(c.phone),
    email: clean(c.email, 120).toLowerCase(),
    province: clean(c.province, 60),
    city: clean(c.city, 60),
    address: clean(c.address, 220),
    reference: clean(c.reference, 220),
  };
  const errors = [];
  if (!customer.name) errors.push('Falta el nombre.');
  if (strict) {
    if (docType === 'cedula' && customer.document.length !== 10) errors.push('La cédula debe tener 10 dígitos.');
    if (docType === 'ruc' && customer.document.length !== 13) errors.push('El RUC debe tener 13 dígitos.');
    if (docType === 'pasaporte' && customer.document.length < 5) errors.push('Revisa el número de pasaporte.');
    if (!/^\+5939\d{8}$/.test(customer.phone)) errors.push('Escribe un celular de Ecuador, por ejemplo 0991234567.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) errors.push('Revisa el correo.');
    if (!customer.city || !customer.address) errors.push('Falta la ciudad o la dirección de entrega.');
  } else if (customer.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) errors.push('Revisa el correo.');
  return { customer, errors };
}

const customerKey = (c) => c.document || (c.phone ? 'tel' + digits(c.phone) : '');

// ---------- Stock ----------
export async function getStock() {
  return (await getStore('meta').get('stock', { type: 'json' })) || { items: {}, lowAlert: 10 };
}
export async function setStock(productId, qty, lowAlert) {
  return locked(async () => {
    const s = await getStock();
    if (qty === null) delete s.items[productId];
    else if (qty !== undefined) s.items[productId] = Math.max(0, Math.round(qty));
    if (lowAlert !== undefined) s.lowAlert = Math.max(0, Math.round(lowAlert));
    await getStore('meta').setJSON('stock', s);
    return s;
  });
}
async function adjustStock(lines, sign) {
  const s = await getStock();
  let changed = false;
  for (const l of lines) {
    if (typeof s.items[l.id] === 'number') { s.items[l.id] = Math.max(0, s.items[l.id] + sign * l.qty); changed = true; }
  }
  if (changed) await getStore('meta').setJSON('stock', s);
}
async function checkStock(lines) {
  const s = await getStock();
  for (const l of lines) {
    if (typeof s.items[l.id] === 'number' && s.items[l.id] < l.qty) {
      return s.items[l.id] === 0 ? `${l.name} está agotado por ahora.` : `Solo quedan ${s.items[l.id]} unidades de ${l.name}.`;
    }
  }
  return null;
}

// ---------- Clientes ----------
async function upsertCustomer(customer, order) {
  const key = customerKey(customer);
  if (!key) return null;
  const store = getStore('clientes');
  const prev = (await store.get(key, { type: 'json' })) || { key, createdAt: order.createdAt, orders: [] };
  const merged = {
    ...prev,
    ...Object.fromEntries(Object.entries(customer).filter(([, v]) => v)),
    key,
    updatedAt: new Date().toISOString(),
    orders: Array.from(new Set([...(prev.orders || []), order.id])),
  };
  await store.setJSON(key, merged);
  return merged;
}
export async function getCustomer(key) {
  return getStore('clientes').get(key, { type: 'json' });
}
export async function listCustomers() {
  const [customers, orders] = await Promise.all([readAll('clientes'), readAll('pedidos')]);
  const byId = Object.fromEntries(orders.map((o) => [o.id, o]));
  return customers.map((c) => {
    const os = (c.orders || []).map((id) => byId[id]).filter(Boolean);
    const valid = os.filter((o) => o.status !== 'cancelado');
    return {
      ...c,
      orderCount: valid.length,
      bags: valid.reduce((s, o) => s + o.lines.reduce((a, l) => a + l.qty, 0), 0),
      spent: valid.filter((o) => CONSUMES_STOCK.has(o.status)).reduce((s, o) => s + o.total, 0),
      lastOrderAt: os.map((o) => o.createdAt).sort().pop() || c.createdAt,
    };
  }).sort((a, b) => (b.lastOrderAt || '').localeCompare(a.lastOrderAt || ''));
}

// ---------- Pedidos ----------
async function nextId() {
  const meta = getStore('meta');
  const seq = ((await meta.get('seq', { type: 'json' })) || { n: 0 }).n + 1;
  await meta.setJSON('seq', { n: seq });
  return 'OVA-' + String(seq).padStart(4, '0');
}

/**
 * Crea un pedido. El precio SIEMPRE se calcula aquí con el catálogo.
 * opts: { items, zone, coupon, payMethod, channel, status, customer, notes, strict, by, skipStock }
 */
export async function createOrder(opts) {
  const payMethod = PAY_METHODS[opts.payMethod] ? opts.payMethod : 'transfer';
  const calc = computeOrder({ items: opts.items, coupon: opts.coupon, zone: opts.zone, payMethod: payMethod === 'card' ? 'card' : 'transfer' });
  if (!calc.lines.length) return { error: 'El pedido no tiene productos.' };
  if (!calc.zone) return { error: 'Elige el tipo de envío.' };
  const blocking = calc.errors.filter((e) => !/código/i.test(e));
  if (blocking.length) return { error: blocking.join(' ') };
  const { customer, errors } = normalizeCustomer(opts.customer, { strict: opts.strict !== false });
  if (errors.length) return { error: errors.join(' ') };

  return locked(async () => {
    if (!opts.skipStock) {
      const stockErr = await checkStock(calc.lines);
      if (stockErr) return { error: stockErr };
    }
    const now = new Date().toISOString();
    const status = STATUS[opts.status] ? opts.status : 'pendiente_pago';
    const order = {
      id: await nextId(),
      createdAt: now,
      updatedAt: now,
      channel: CHANNELS[opts.channel] ? opts.channel : 'web',
      payMethod,
      status,
      lines: calc.lines.map(({ id, sku, name, qty, unit, regular, total, promo }) => ({ id, sku, name, qty, unit, regular, total, promo })),
      subtotal: calc.subtotal,
      discount: calc.discount,
      coupon: calc.couponApplied?.code || null,
      zone: { id: calc.zone.id, label: calc.zone.label },
      shipping: calc.shipping,
      tax: calc.tax,
      total: calc.total,
      customer,
      notes: clean(opts.notes, 500),
      internalNotes: '',
      tracking: null,
      emails: [],
      history: [{ at: now, status, by: opts.by || 'cliente', note: opts.channel === 'manual' ? 'Pedido registrado en el panel' : 'Pedido creado' }],
    };
    if (CONSUMES_STOCK.has(status)) { await adjustStock(order.lines, -1); order.stockApplied = true; }
    await getStore('pedidos').setJSON(order.id, order);
    await upsertCustomer(customer, order);
    return { order };
  });
}

export async function getOrder(id) {
  return getStore('pedidos').get(String(id).toUpperCase(), { type: 'json' });
}
export async function saveOrder(order) {
  order.updatedAt = new Date().toISOString();
  await getStore('pedidos').setJSON(order.id, order);
  return order;
}
export async function listOrders({ status, q } = {}) {
  let all = await readAll('pedidos');
  if (status && status !== 'todos') {
    all = status === 'activos' ? all.filter((o) => !['entregado', 'cancelado'].includes(o.status)) : all.filter((o) => o.status === status);
  }
  if (q) {
    const t = String(q).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    all = all.filter((o) => [o.id, o.customer.name, o.customer.document, o.customer.phone, o.customer.email, o.customer.city, o.tracking?.number]
      .join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t));
  }
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Cambia el estado de un pedido y ajusta el stock. Devuelve { order, changed }. */
export async function setStatus(id, { status, tracking, note, by = 'admin' }) {
  return locked(async () => {
    const order = await getOrder(id);
    if (!order) return { error: 'No existe ese pedido.' };
    if (!STATUS[status]) return { error: 'Estado no válido.' };
    const prev = order.status;
    if (tracking) {
      order.tracking = {
        carrier: clean(tracking.carrier, 60) || 'Servientrega',
        number: clean(tracking.number, 60),
        url: /^https?:\/\//.test(tracking.url || '') ? clean(tracking.url, 300) : '',
      };
    }
    const nowConsumes = CONSUMES_STOCK.has(status);
    if (nowConsumes && !order.stockApplied) { await adjustStock(order.lines, -1); order.stockApplied = true; }
    if (!nowConsumes && order.stockApplied) { await adjustStock(order.lines, +1); order.stockApplied = false; }
    order.status = status;
    order.history.push({ at: new Date().toISOString(), status, by, note: clean(note, 300) });
    await saveOrder(order);
    return { order, changed: prev !== status };
  });
}

export async function addInternalNote(id, text) {
  const order = await getOrder(id);
  if (!order) return null;
  order.internalNotes = clean(text, 2000);
  return saveOrder(order);
}

// ---------- Resumen ----------
export async function stats() {
  const orders = await readAll('pedidos');
  const months = {};
  const sold = orders.filter((o) => CONSUMES_STOCK.has(o.status));
  for (const o of sold) {
    const m = o.createdAt.slice(0, 7);
    months[m] ||= { month: m, orders: 0, bags: 0, revenue: 0, shipping: 0, byPay: {} };
    const r = months[m];
    r.orders++; r.revenue += o.total; r.shipping += o.shipping;
    r.bags += o.lines.reduce((s, l) => s + l.qty, 0);
    r.byPay[o.payMethod] = (r.byPay[o.payMethod] || 0) + o.total;
  }
  return {
    months: Object.values(months).sort((a, b) => b.month.localeCompare(a.month)),
    pendingPayment: orders.filter((o) => o.status === 'pendiente_pago').length,
    toShip: orders.filter((o) => o.status === 'pagado').length,
    inTransit: orders.filter((o) => o.status === 'enviado').length,
    customers: new Set(orders.map((o) => customerKey(o.customer)).filter(Boolean)).size,
    stock: await getStock(),
  };
}
