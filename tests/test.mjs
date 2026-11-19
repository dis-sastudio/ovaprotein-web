// Pruebas rápidas: node tests/test.mjs
import assert from 'node:assert/strict';
import { computeOrder, payphoneAmounts } from '../public/assets/js/pricing.mjs';
import { respond } from '../public/assets/js/bot-brain.mjs';

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('✓', name); };

ok('1 bolsa con tarjeta: $27 + envío', () => {
  const o = computeOrder({ items: [{ id: 'ova-pro-500', qty: 1 }], zone: 'nacional' });
  assert.equal(o.subtotal, 2700); assert.equal(o.shipping, 500); assert.equal(o.total, 3200);
  const a = payphoneAmounts(o);
  assert.equal(a.amount, a.amountWithTax + a.tax + a.amountWithoutTax);
});
ok('2 bolsas con tarjeta NO tienen promo', () => {
  const o = computeOrder({ items: [{ id: 'ova-pro-500', qty: 2 }], zone: 'local', payMethod: 'card' });
  assert.equal(o.subtotal, 5400); assert.equal(o.transferSavings, 400);
});
ok('2 bolsas por transferencia: $50 + envío', () => {
  const o = computeOrder({ items: [{ id: 'ova-pro-500', qty: 2 }], zone: 'local', payMethod: 'transfer' });
  assert.equal(o.subtotal, 5000); assert.equal(o.total, 5300); assert.ok(o.lines[0].promo);
});
ok('1 bolsa por transferencia sigue a $27', () => {
  const o = computeOrder({ items: [{ id: 'ova-pro-500', qty: 1 }], zone: 'local', payMethod: 'transfer' });
  assert.equal(o.subtotal, 2700);
});
ok('Nunca hay envío gratis', () => {
  const o = computeOrder({ items: [{ id: 'ova-pro-500', qty: 10 }], zone: 'nacional', payMethod: 'transfer' });
  assert.equal(o.shipping, 500);
});
ok('Productos inexistentes y cantidades manipuladas se ignoran', () => {
  const o = computeOrder({ items: [{ id: 'ova-pro-1000', qty: 5 }, { id: 'ova-pro-500', qty: 999 }], zone: 'local' });
  assert.equal(o.lines.length, 1); assert.equal(o.lines[0].qty, 20);
});
ok('IVA 15 % incluido', () => {
  const o = computeOrder({ items: [{ id: 'ova-pro-500', qty: 1 }], zone: 'local' });
  assert.equal(o.taxBase, 2609); assert.equal(o.tax, 391);
});
ok('Cupón inexistente da error', () => {
  const o = computeOrder({ items: [{ id: 'ova-pro-500', qty: 1 }], coupon: 'OVAPRO10', zone: 'local' });
  assert.equal(o.discount, 0); assert.ok(o.errors.length);
});
for (const [q, id] of [['Hola', 'menu'], ['cuánto cuesta?', 'precios'], ['tiene lactosa?', 'whey'], ['hacen envíos a Quito?', 'envios'],
  ['quiero el de 1kg', 'kilo'], ['quiero la promo 2x50', 'promo'], ['quiero comprar', 'comprar'], ['cómo se toma', 'uso'], ['soy alérgico al huevo', 'alergia'], ['/pago', 'pagos'], ['/datos', 'tabla'],
  ['quiero hablar con un asesor', 'asesor'], ['tiene sabor?', 'sabor'], ['ova her', 'her']]) {
  ok(`Bot: "${q}" → ${id}`, () => assert.equal(respond(q)?.id, id));
}
ok('Bot: pregunta rara → null', () => assert.equal(respond('cuál es la capital de Francia'), null));
console.log(`\n${n} pruebas OK`);
