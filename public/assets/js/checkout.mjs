import { cart, lineHtml, waLink, escapeHtml, toast } from './app.mjs';
import site from './site.mjs';
import { catalog, fmt, orderSummaryText, findProduct, computeOrder } from './pricing.mjs';

const $ = (s, r = document) => r.querySelector(s);
const params = new URLSearchParams(location.search);

// Enlaces directos: /carrito/?add=ova-pro-500  (los usa el bot de WhatsApp)
// Enlaces directos: /carrito/?add=ova-pro-500&cant=2&pago=transferencia (los usan el bot y la página de promos)
if (params.get('add') && findProduct(params.get('add'))) {
  const c = cart.get();
  const want = Math.max(1, Math.min(20, parseInt(params.get('cant'), 10) || 1));
  const it = c.items.find((i) => i.id === params.get('add'));
  if (!it) c.items.push({ id: params.get('add'), qty: want }); else if (it.qty < want) it.qty = want;
  if (params.get('pago') === 'transferencia') c.pay = 'transfer';
  cart.set(c);
  history.replaceState(null, '', location.pathname);
}
if (params.get('cupon')) { const c = cart.get(); c.coupon = params.get('cupon').toUpperCase(); cart.set(c); }
if (params.get('cancelado')) $('#notice').innerHTML = `<p class="note-box">Cancelaste el pago. Tu carrito sigue aquí; puedes intentarlo de nuevo o pedir por WhatsApp.</p>`;

const form = $('#checkout-form');
const zoneSel = $('#zona');
zoneSel.innerHTML = catalog.shipping.zones.map((z) => `<option value="${z.id}">${escapeHtml(z.label)} — ${fmt(z.price)}</option>`).join('');

// Restaurar datos del cliente
try {
  const saved = JSON.parse(localStorage.getItem('ova_customer') || '{}');
  for (const [k, v] of Object.entries(saved)) if (form.elements[k] && form.elements[k].type !== 'checkbox') form.elements[k].value = v;
} catch {}

const orderNow = () => { const c = cart.get(); return computeOrder({ ...c, payMethod: site.cardPayments ? (c.pay || 'card') : 'transfer' }); };
form.closest('.checkout').addEventListener('change', (e) => {
  if (e.target.name === 'pago') { const c = cart.get(); c.pay = e.target.value; cart.set(c); }
});
function render() {
  const c = cart.get();
  const pay = site.cardPayments ? (c.pay || 'card') : 'transfer';
  document.querySelectorAll('input[name=pago]').forEach((r) => (r.checked = r.value === pay));
  $('#card-box').hidden = pay !== 'card';
  $('#transfer-box').hidden = pay !== 'transfer';
  zoneSel.value = c.zone || 'nacional';
  $('#cupon').value = c.coupon || '';
  const o = orderNow();
  const list = $('#lines');
  if (!o.lines.length) {
    list.innerHTML = `<p class="empty">Tu carrito está vacío.</p><p style="text-align:center"><a class="btn btn-primary" href="/proteina-de-huevo-ova-pro/">Ver OVA PRO+</a></p>`;
    $('#summary').hidden = true; form.hidden = true; return;
  }
  $('#summary').hidden = false; form.hidden = false;
  list.innerHTML = o.lines.map(lineHtml).join('');
  $('#s-sub').textContent = fmt(o.subtotal);
  $('#s-desc-row').hidden = !o.discount;
  $('#s-desc').textContent = '−' + fmt(o.discount);
  $('#s-env').textContent = o.shipping ? fmt(o.shipping) : 'Gratis';
  $('#s-iva').textContent = fmt(o.tax);
  $('#s-total').textContent = fmt(o.total);
  const pr = (catalog.promotions || [])[0];
  const promoOn = o.lines.some((l) => l.promo);
  $('#free-msg').textContent = promoOn ? `Promo aplicada: ${pr.label}.`
    : o.transferSavings ? `Pagando por transferencia ahorras ${fmt(o.transferSavings)}.`
    : pr && o.count === 1 ? `Lleva 2 y paga ${fmt(pr.unitPrice * pr.minQty)} por transferencia.` : '';
  const cm = $('#cupon-msg');
  const cErr = o.errors.find((e) => /código/i.test(e));
  cm.className = 'msg ' + (cErr ? 'err' : o.couponApplied ? 'ok' : '');
  cm.textContent = cErr || (o.couponApplied ? `Código ${o.couponApplied.code} aplicado: ${o.couponApplied.label}.` : '');
}
document.addEventListener('cart:change', render);
zoneSel.addEventListener('change', () => { const c = cart.get(); c.zone = zoneSel.value; cart.set(c); });
$('#aplicar').addEventListener('click', () => { const c = cart.get(); c.coupon = $('#cupon').value.trim().toUpperCase(); cart.set(c); });
render();

function customer() {
  const f = Object.fromEntries(new FormData(form));
  try { const { acepto, ...keep } = f; localStorage.setItem('ova_customer', JSON.stringify(keep)); } catch {}
  return f;
}
function validate() {
  const f = form.elements;
  const doc = f.documento.value.replace(/\D/g, '');
  f.documento.setCustomValidity(f.tipo_doc.value === '3' || doc.length === 10 || doc.length === 13 ? '' : 'Escribe una cédula de 10 dígitos o un RUC de 13.');
  const tel = f.telefono.value.replace(/\D/g, '');
  f.telefono.setCustomValidity(/^(0?9\d{8}|5939\d{8})$/.test(tel) ? '' : 'Escribe un celular de Ecuador, por ejemplo 0991234567.');
  return form.reportValidity();
}
const phoneIntl = (t) => { const d = t.replace(/\D/g, ''); return d.startsWith('593') ? '+' + d : '+593' + d.replace(/^0/, ''); };

$('#pay-card').addEventListener('click', async () => {
  if (!validate()) return;
  const btn = $('#pay-card'); const c = cart.get(); const cu = customer();
  btn.disabled = true; btn.textContent = 'Conectando con PayPhone…';
  try {
    const res = await fetch('/api/pago/preparar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: c.items, coupon: c.coupon, zone: c.zone,
        customer: { name: cu.nombre, email: cu.email, phone: phoneIntl(cu.telefono), document: cu.documento.replace(/\D/g, ''), documentType: cu.tipo_doc,
          province: cu.provincia, city: cu.ciudad, address: cu.direccion, reference: cu.referencia, notes: cu.notas },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago.');
    localStorage.setItem('ova_pending', JSON.stringify({ clientTransactionId: data.clientTransactionId, at: Date.now() }));
    window.gtag?.('event', 'begin_checkout', { currency: 'USD', value: data.total / 100 });
    location.assign($('#pay-app').checked ? data.payWithPayPhone : data.payWithCard);
  } catch (err) {
    toast(err.message);
    $('#pay-error').textContent = err.message + ' Puedes elegir Transferencia y completar tu pedido por WhatsApp.';
    btn.disabled = false; btn.textContent = 'Pagar con tarjeta';
  }
});

$('#pay-wa').addEventListener('click', () => {
  if (!validate()) return;
  const cu = customer(); const o = computeOrder({ ...cart.get(), payMethod: 'transfer' });
  const msg = `Hola, quiero hacer este pedido de OVA PRO+:\n${orderSummaryText(o)}\n\nNombre: ${cu.nombre}\nCédula/RUC: ${cu.documento}\nCelular: ${cu.telefono}\nCorreo: ${cu.email}\nDirección: ${cu.direccion}, ${cu.ciudad}, ${cu.provincia}${cu.referencia ? '\nReferencia: ' + cu.referencia : ''}${cu.notas ? '\nNotas: ' + cu.notas : ''}\n\nPago por transferencia, por favor envíenme los datos.`;
  window.gtag?.('event', 'pedido_whatsapp', { value: o.total / 100, currency: 'USD' });
  window.open(waLink(msg), '_blank', 'noopener');
});
