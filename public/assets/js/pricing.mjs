// Lógica de precios compartida: la usa el navegador (carrito) y el servidor (PayPhone).
// El servidor SIEMPRE recalcula con esta función; el total que envía el navegador se ignora.
// payMethod: 'card' (PayPhone, precio normal) | 'transfer' (pedido por WhatsApp, aplica promos de transferencia)
import catalog from './catalog.mjs';

export { catalog };

export const fmt = (cents) => '$' + (cents / 100).toFixed(2);

export const findProduct = (id) => catalog.products.find((p) => p.id === id);

const promosFor = (productId) => (catalog.promotions || []).filter((x) => x.productId === productId);

export function computeOrder({ items = [], coupon = '', zone = '', payMethod = 'card' } = {}) {
  const errors = [];
  const lines = [];
  const method = payMethod === 'transfer' ? 'transfer' : 'card';
  let transferSavings = 0; // cuánto ahorraría pagando por transferencia (para mostrarlo)
  for (const it of items) {
    const p = findProduct(String(it.id));
    const qty = Math.max(0, Math.min(20, parseInt(it.qty, 10) || 0));
    if (!p || !qty) continue;
    if (!p.inStock) { errors.push(`${p.name} está agotado.`); continue; }
    let unit = p.price;
    let promo = null;
    for (const pr of promosFor(p.id)) {
      if (qty < pr.minQty) continue;
      if (pr.payMethod === 'transfer') transferSavings += (p.price - pr.unitPrice) * qty;
      if (!pr.payMethod || pr.payMethod === method) { unit = Math.min(unit, pr.unitPrice); promo = pr; }
    }
    lines.push({ id: p.id, sku: p.sku, name: p.name, qty, unit, regular: p.price, total: unit * qty, promo: promo ? { id: promo.id, label: promo.label } : null });
  }
  if (method === 'transfer') transferSavings = 0;
  const subtotal = lines.reduce((s, l) => s + l.total, 0);

  // Cupón (opcional, definidos en catalog.coupons)
  let discount = 0;
  let couponApplied = null;
  const code = String(coupon || '').trim().toUpperCase();
  if (code) {
    const c = (catalog.coupons || {})[code];
    if (!c || !c.active) {
      errors.push('El código de descuento no es válido.');
    } else {
      const base = lines.filter((l) => !(c.excludePromo && l.promo)).reduce((s, l) => s + l.total, 0);
      discount = c.type === 'percent' ? Math.round((base * c.value) / 100) : Math.min(base, c.value);
      if (discount > 0) couponApplied = { code, label: c.label };
      else errors.push('El código no aplica a los productos en promoción.');
    }
  }

  // Envío (lo paga el cliente; freeFrom null = nunca gratis)
  const ship = catalog.shipping;
  const z = ship.zones.find((x) => x.id === zone) || null;
  const afterDiscount = subtotal - discount;
  const freeShipping = !!z && ship.freeFrom != null && afterDiscount >= ship.freeFrom && !ship.freeExcludes.includes(z.id);
  const shipping = !lines.length || !z ? 0 : freeShipping ? 0 : z.price;

  const total = afterDiscount + shipping;
  const rate = catalog.taxRate;
  const taxBase = catalog.pricesIncludeTax ? Math.round(total / (1 + rate)) : total;
  const tax = catalog.pricesIncludeTax ? total - taxBase : Math.round(total * rate);
  const grandTotal = catalog.pricesIncludeTax ? total : total + tax;

  return {
    lines, subtotal, discount, couponApplied, zone: z, shipping, freeShipping, payMethod: method, transferSavings,
    missingForFree: z && ship.freeFrom != null && !freeShipping && !ship.freeExcludes.includes(z.id) ? Math.max(0, ship.freeFrom - afterDiscount) : 0,
    taxBase, tax, total: grandTotal, errors,
    count: lines.reduce((s, l) => s + l.qty, 0),
  };
}

// Montos para PayPhone (centavos). amount = amountWithoutTax + amountWithTax + tax
export function payphoneAmounts(order) {
  return { amount: order.total, amountWithTax: order.taxBase, tax: order.tax, amountWithoutTax: 0 };
}

export function orderSummaryText(order) {
  const l = order.lines.map((x) => `• ${x.qty} × ${x.name} a ${fmt(x.unit)} — ${fmt(x.total)}${x.promo ? ` (${x.promo.label})` : ''}`).join('\n');
  const d = order.discount ? `\nDescuento (${order.couponApplied?.code}): −${fmt(order.discount)}` : '';
  const s = order.zone ? `\nEnvío (${order.zone.label}): ${order.shipping ? fmt(order.shipping) : 'gratis'}` : '';
  return `${l}${d}${s}\nTotal: ${fmt(order.total)}`;
}
