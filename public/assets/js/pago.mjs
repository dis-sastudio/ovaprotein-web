// Página de respuesta de PayPhone: /pago/?id=123&clientTransactionId=OVA...
import { cart, waLink, escapeHtml } from './app.mjs';
import { fmt } from './pricing.mjs';

const box = document.querySelector('#status');
const p = new URLSearchParams(location.search);
const id = p.get('id');
const ctx = p.get('clientTransactionId');

function show(html) { box.innerHTML = html; box.focus(); }

if (!id || !ctx) {
  show(`<p class="icon">?</p><h1>No encontramos un pago para confirmar</h1><p>Si ya pagaste, escríbenos por WhatsApp con tu número de pedido y lo revisamos.</p><a class="btn btn-wa" href="${waLink('Hola, hice un pago en la web y no vi la confirmación.')}">Escribir por WhatsApp</a>`);
} else {
  fetch('/api/pago/confirmar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(id), clientTransactionId: ctx }),
  })
    .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
    .then(({ ok, d }) => {
      if (ok && d.approved) {
        cart.clear(); localStorage.removeItem('ova_pending');
        window.gtag?.('event', 'purchase', { transaction_id: ctx, value: d.amount / 100, currency: 'USD' });
        show(`<p class="icon" style="color:var(--emerald-ink)">✓</p>
          <h1>Pago aprobado</h1>
          <p class="lead">Pedido <strong>${escapeHtml(ctx)}</strong> por ${fmt(d.amount)}${d.cardBrand ? ` con ${escapeHtml(d.cardBrand)} terminada en ${escapeHtml(d.lastDigits || '')}` : ''}.</p>
          <p>Te escribimos por WhatsApp para coordinar la entrega y enviarte la guía. Autorización: ${escapeHtml(d.authorizationCode || '—')}.</p>
          <p><a class="btn btn-wa" href="${waLink(`Hola, acabo de pagar el pedido ${ctx} en la web.`)}">Avisar por WhatsApp</a>
          <a class="btn btn-ghost" href="/blog/recetas-con-proteina-de-huevo/">Ver recetas</a></p>`);
      } else {
        show(`<p class="icon">✕</p><h1>El pago no se completó</h1>
          <p>${escapeHtml(d.message || 'La transacción fue cancelada o rechazada. No se hizo ningún cobro.')}</p>
          <p><a class="btn btn-primary" href="/carrito/">Volver al carrito</a>
          <a class="btn btn-wa" href="${waLink(`Hola, tuve un problema al pagar el pedido ${ctx}.`)}">Pedir ayuda por WhatsApp</a></p>`);
      }
    })
    .catch(() => show(`<h1>No pudimos confirmar el pago</h1><p>Revisa tu conexión y recarga esta página. Si el problema sigue, escríbenos con el pedido <strong>${escapeHtml(ctx)}</strong>.</p><a class="btn btn-wa" href="${waLink(`Hola, no pude confirmar el pago del pedido ${ctx}.`)}">Escribir por WhatsApp</a>`));
}
