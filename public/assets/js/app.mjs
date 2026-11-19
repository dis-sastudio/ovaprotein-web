import { catalog, computeOrder, fmt, findProduct } from './pricing.mjs';
import site from './site.mjs';
import { respond, fallback } from './bot-brain.mjs';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'ova_cart_v1';

/* ---------- Carrito (localStorage) ---------- */
function storeGet() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { items: [], coupon: '', zone: 'nacional' }; }
  catch { return { items: [], coupon: '', zone: 'nacional' }; }
}
function storeSet(c) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
  document.dispatchEvent(new CustomEvent('cart:change', { detail: c }));
}
export const cart = {
  get: storeGet,
  set: storeSet,
  add(id, qty = 1) {
    const c = storeGet();
    const it = c.items.find((x) => x.id === id);
    if (it) it.qty = Math.min(20, it.qty + qty); else c.items.push({ id, qty });
    storeSet(c);
  },
  setQty(id, qty) {
    const c = storeGet();
    c.items = c.items.map((x) => (x.id === id ? { ...x, qty } : x)).filter((x) => x.qty > 0);
    storeSet(c);
  },
  clear() { storeSet({ items: [], coupon: '', zone: storeGet().zone }); },
  order() { return computeOrder(storeGet()); },
};

export const img = (name, size = 'sm') => `/assets/img/${name}-${size}.webp`;
export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 2600);
}
export const waLink = (text) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Cabecera ---------- */
function updateCount() {
  const n = cart.order().count;
  $$('.cart-count').forEach((el) => { el.textContent = n || ''; el.dataset.n = n; });
}
const menuBtn = $('.menu-btn');
menuBtn?.addEventListener('click', () => {
  const nav = $('.nav'); const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});

const over = $('.header.over');
if (over) {
  const onScroll = () => over.classList.toggle('stuck', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
}

/* ---------- Drawer ---------- */
const drawer = $('#cart-drawer');
let lastFocus = null;
function openDrawer() {
  if (!drawer) return location.assign('/carrito/');
  lastFocus = document.activeElement;
  renderDrawer(); drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
  $('.close', drawer).focus();
}
function closeDrawer() {
  drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); lastFocus?.focus();
}
function renderDrawer() {
  if (!drawer) return;
  const o = cart.order();
  const items = $('.items', drawer);
  if (!o.lines.length) {
    items.innerHTML = `<p class="empty">Tu carrito está vacío.<br><a href="/proteina-de-huevo-ova-pro/">Ver OVA PRO+</a></p>`;
    $('footer', drawer).hidden = true; return;
  }
  $('footer', drawer).hidden = false;
  items.innerHTML = o.lines.map((l) => lineHtml(l)).join('');
  const pr = (catalog.promotions || [])[0];
  $('.free-bar', drawer).textContent = o.transferSavings
    ? `Pagando por transferencia ahorras ${fmt(o.transferSavings)} (${pr.short}).`
    : pr ? `Promo: ${pr.label}.` : '';
  $('[data-subtotal]', drawer).textContent = fmt(o.subtotal - o.discount);
}
export function lineHtml(l) {
  const p = findProduct(l.id);
  return `<div class="line" data-id="${l.id}">
    <img src="${img(p.image)}" alt="" width="64" height="64" loading="lazy">
    <div><h4>${escapeHtml(l.name)}</h4>${l.promo ? `<p class="msg ok" style="margin:0 0 .2rem">${escapeHtml(l.promo.label)}</p>` : ''}
      <div class="qty" role="group" aria-label="Cantidad de ${escapeHtml(l.name)}">
        <button type="button" data-dec aria-label="Quitar uno">−</button>
        <input type="number" min="1" max="20" value="${l.qty}" aria-label="Cantidad" data-qty>
        <button type="button" data-inc aria-label="Agregar uno">+</button>
      </div>
      <button type="button" class="rm" data-rm>Quitar</button></div>
    <strong>${fmt(l.total)}</strong></div>`;
}
document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) {
    e.preventDefault();
    const qtyInput = add.dataset.qtyFrom ? $(add.dataset.qtyFrom) : null;
    const id = add.dataset.variantFrom ? $(`${add.dataset.variantFrom}:checked`).value : add.dataset.add;
    cart.add(id, qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1);
    window.gtag?.('event', 'add_to_cart', { currency: 'USD', items: [{ item_id: id }] });
    openDrawer();
    return;
  }
  if (e.target.closest('[data-open-cart]')) { e.preventDefault(); openDrawer(); return; }
  if (e.target.closest('[data-close-cart]')) { closeDrawer(); return; }
  const line = e.target.closest('.line');
  if (line) {
    const id = line.dataset.id; const cur = cart.get().items.find((x) => x.id === id)?.qty || 0;
    if (e.target.closest('[data-inc]')) cart.setQty(id, Math.min(20, cur + 1));
    if (e.target.closest('[data-dec]')) cart.setQty(id, Math.max(0, cur - 1));
    if (e.target.closest('[data-rm]')) cart.setQty(id, 0);
  }
});
document.addEventListener('change', (e) => {
  const q = e.target.closest('.line [data-qty]');
  if (q) cart.setQty(q.closest('.line').dataset.id, Math.max(0, Math.min(20, parseInt(q.value, 10) || 0)));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (drawer?.classList.contains('open')) closeDrawer(); if ($('.wa-chat.open')) toggleChat(false); }
});
document.addEventListener('cart:change', () => { updateCount(); if (drawer?.classList.contains('open')) renderDrawer(); });
updateCount();

/* ---------- Pestañas y galería (producto) ---------- */
$$('[role=tablist]').forEach((list) => {
  const tabs = $$('[role=tab]', list);
  const select = (t) => {
    tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; select(n); n.focus();
      }
    });
  });
  const hash = location.hash.slice(1);
  const target = tabs.find((t) => t.getAttribute('aria-controls') === hash);
  if (target) select(target);
});
$$('.thumbs button').forEach((b) => b.addEventListener('click', () => {
  const main = $('.gallery .main');
  main.src = b.dataset.src; main.alt = b.dataset.alt;
  $$('.thumbs button').forEach((x) => x.setAttribute('aria-pressed', x === b));
}));
$$('[data-qty-step]').forEach((b) => b.addEventListener('click', () => {
  const inp = $(b.dataset.target); inp.value = Math.max(1, Math.min(20, (parseInt(inp.value, 10) || 1) + Number(b.dataset.qtyStep)));
}));
$$('input[name=variant]').forEach((r) => r.addEventListener('change', () => {
  const p = findProduct(r.value);
  $$('[data-variant-price]').forEach((el) => (el.textContent = fmt(p.price)));
  $$('[data-variant-per]').forEach((el) => (el.textContent = `${fmt(Math.round(p.price / p.servings))} por scoop · ${p.servings} scoops`));
  const wa = $('[data-wa-variant]'); if (wa) wa.href = waLink(`Hola, quiero pedir ${p.name} (${fmt(p.price)}).`);
}));

/* ---------- Calculadora de proteína ---------- */
const calc = $('#calc');
if (calc) {
  const factors = { mantener: [1.2, 1.6], ganar: [1.6, 2.2], definir: [2.3, 3.1], resistencia: [1.4, 1.8] };
  const run = () => {
    const kg = parseFloat($('#peso').value);
    const goal = $('input[name=meta]:checked').value;
    const meals = parseInt($('#comidas').value, 10);
    const diet = parseFloat($('#dieta').value) || 0;
    const out = $('#calc-out');
    if (!kg || kg < 30 || kg > 250) { out.innerHTML = `<p>Escribe tu peso en kilos (entre 30 y 250) para ver el resultado.</p>`; return; }
    const [lo, hi] = factors[goal];
    const min = Math.round(kg * lo), max = Math.round(kg * hi), mid = Math.round((min + max) / 2);
    const perMeal = Math.round(kg * 0.3);
    const gap = Math.max(0, mid - diet);
    const scoops = gap / catalog.scoop.proteinGrams;
    const sc = gap === 0 ? 0 : Math.max(0.5, Math.round(scoops * 2) / 2);
    const days500 = sc ? Math.floor(12 / sc) : null;
    out.innerHTML = `
      <p>Tu meta diaria aproximada</p>
      <p class="total">${min}–${max} g</p>
      <ul>
        <li>Unos <strong>${perMeal} g por comida</strong> repartidos en ${meals} comidas.</li>
        ${diet ? `<li>Con tu comida ya cubres ~${diet} g; te faltan ~${gap} g para llegar a ${mid} g.</li>` : ''}
        ${!diet ? `<li>Un scoop de OVA PRO+ aporta ${String(catalog.scoop.proteinGrams).replace('.', ',')} g. Escribe cuánta proteína ya comes al día y te decimos cuántos scoops te faltan.</li>`
          : `<li>${sc ? `Eso equivale a <strong>${String(sc).replace('.', ',')} scoop${sc > 1 ? 's' : ''} de OVA PRO+ al día</strong> (${Math.round(sc * catalog.scoop.proteinGrams)} g de proteína).` : 'Con tu alimentación ya llegas a la meta; OVA PRO+ te sirve como opción práctica.'}</li>
        ${days500 ? `<li>Una bolsa de 500 g te dura unos ${days500} días.</li>` : ''}`}
      </ul>
      <p class="note">Rangos basados en la postura de la International Society of Sports Nutrition (2017) para personas sanas que entrenan. No reemplaza la evaluación de un nutricionista; si tienes una condición renal o estás embarazada, consulta antes.</p>
      <a class="btn btn-primary" href="/proteina-de-huevo-ova-pro/">Elegir mi presentación</a>`;
    window.gtag?.('event', 'calculadora_proteina', { goal, kg });
  };
  calc.addEventListener('input', run); calc.addEventListener('change', run);
  calc.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  run();
}

/* ---------- Asistente (chat web → WhatsApp) ---------- */
const fab = $('.wa-fab');
const chat = $('.wa-chat');
function toggleChat(open) {
  const isOpen = open ?? !chat.classList.contains('open');
  chat.classList.toggle('open', isOpen); fab.setAttribute('aria-expanded', isOpen);
  if (isOpen) {
    if (!$('.wa-log', chat).children.length) say(respond('hola'));
    $('.wa-form input', chat).focus();
  } else fab.focus();
}
const fmtBot = (t) => escapeHtml(t).replace(/\*(.+?)\*/g, '<strong>$1</strong>').replace(/(https?:\/\/[^\s]+)/g, (u) => {
  const local = u.replace(site.url.replace(/\/$/, ''), '') || '/';
  return `<a href="${local}">${local === '/' ? 'Abrir' : 'Abrir enlace'}</a>`;
});
function bubble(html, who) {
  const b = document.createElement('div'); b.className = 'bubble ' + who; b.innerHTML = html;
  const log = $('.wa-log', chat); log.append(b); log.scrollTop = log.scrollHeight;
}
let lastQuestion = '';
function say(r) {
  bubble(fmtBot(r.text), 'bot');
  const q = $('.wa-quick', chat);
  const opts = r.list || r.buttons || [{ id: 'menu', title: 'Menú' }];
  q.innerHTML = opts.map((o) => `<button type="button" data-q="${o.id}">${escapeHtml(o.title)}</button>`).join('') +
    `<a class="btn btn-wa" style="padding:.35rem .8rem;font-size:.85rem" target="_blank" rel="noopener" href="${waLink(r.handoff ? lastQuestion || 'Hola, quiero hablar con un asesor de OVA PRO+.' : 'Hola, tengo una consulta sobre OVA PRO+.')}">Seguir en WhatsApp</a>`;
}
if (fab && chat) {
  fab.addEventListener('click', () => toggleChat());
  $('.wa-chat header button').addEventListener('click', () => toggleChat(false));
  chat.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    bubble(escapeHtml(b.textContent), 'me');
    const id = b.dataset.q;
    setTimeout(() => say(respond(id, { byId: true }) || fallback()), 250);
  });
  $('.wa-form', chat).addEventListener('submit', (e) => {
    e.preventDefault(); const inp = $('input', e.target); const v = inp.value.trim(); if (!v) return;
    bubble(escapeHtml(v), 'me'); inp.value = ''; lastQuestion = v;
    const r = respond(v);
    setTimeout(() => {
      if (r) say(r);
      else say({ ...fallback(), text: 'No tengo esa respuesta aquí. Toca "Seguir en WhatsApp" y te responde una persona del equipo, o elige una opción.', handoff: true });
    }, 250);
  });
}
