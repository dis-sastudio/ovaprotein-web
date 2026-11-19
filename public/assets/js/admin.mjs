// Panel de pedidos OVA PRO+ (ovaprotein.com/admin)
import { computeOrder, fmt } from './pricing.mjs';
import site from './site.mjs';

const app = document.getElementById('app');
const nav = document.querySelector('.adm-nav');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dt = (iso) => iso ? new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const day = (iso) => iso ? new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const waNum = (p) => String(p || '').replace(/\D/g, '');
let CFG = null;

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api/admin/' + path, {
    method, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ova-admin' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== 'login') { showLogin(); throw new Error('Inicia sesión.'); }
  if (!res.ok) throw new Error(data.error || 'Error ' + res.status);
  return data;
}
const badge = (s) => `<span class="badge st-${s}">${esc(CFG?.statuses?.[s] || s)}</span>`;
function notice(msg, kind = 'ok') {
  const n = document.createElement('div'); n.className = 'notice ' + kind; n.setAttribute('role', 'status'); n.textContent = msg;
  app.prepend(n); setTimeout(() => n.remove(), 6000); window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- Sesión ----------
function showLogin(msg = '') {
  nav.hidden = true;
  app.innerHTML = `<form class="adm-card adm-login" id="login">
    <h1>Panel de pedidos</h1>
    ${msg ? `<div class="notice err">${esc(msg)}</div>` : ''}
    <div class="field"><label for="pw">Contraseña</label><input id="pw" type="password" autocomplete="current-password" required></div>
    <button class="btn btn-dark btn-block">Entrar</button></form>`;
  const f = document.getElementById('login'); document.getElementById('pw').focus();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('login', { method: 'POST', body: { password: document.getElementById('pw').value } }); start(); }
    catch (err) { showLogin(err.message); }
  });
}
document.getElementById('logout').addEventListener('click', async () => { await api('logout', { method: 'POST' }).catch(() => {}); showLogin(); });

async function start() {
  try { CFG = await api('config'); } catch (e) { if (!/sesión/i.test(e.message)) app.innerHTML = `<div class="notice err">${esc(e.message)}</div>`; return; }
  nav.hidden = false;
  route();
}
window.addEventListener('hashchange', () => CFG && route());

function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || 'pedidos';
  nav.querySelectorAll('a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.view === h || (h.startsWith('OVA-') && a.dataset.view === 'pedidos')));
  if (nav.querySelector('[aria-current]')) nav.querySelector('[aria-current]').setAttribute('aria-current', 'page');
  if (/^OVA-\d+$/i.test(h)) return viewOrder(h.toUpperCase());
  ({ pedidos: viewOrders, nuevo: viewNew, clientes: viewCustomers, resumen: viewStats, stock: viewStock }[h] || viewOrders)();
}

// ---------- Lista de pedidos ----------
let filter = { status: 'activos', q: '' };
async function viewOrders() {
  const warn = [];
  if (!CFG.mail) warn.push('Los correos automáticos aún no están activos: falta configurar el correo (SMTP) en Coolify.');
  if (!CFG.bank) warn.push('Faltan los datos bancarios (BANK_INFO): el cliente no los verá al pedir por transferencia.');
  app.innerHTML = `${warn.map((w) => `<div class="notice warn">${esc(w)}</div>`).join('')}
    <h1>Pedidos</h1>
    <div class="chips" id="chips"></div>
    <div class="adm-toolbar">
      <input type="search" id="q" placeholder="Buscar por nombre, cédula, celular, pedido o guía" value="${esc(filter.q)}" aria-label="Buscar pedidos">
      <a class="btn btn-ghost btn-sm" href="#nuevo">+ Nuevo pedido</a>
      <a class="btn btn-ghost btn-sm" href="/api/admin/export/pedidos.csv">Descargar Excel</a>
    </div>
    <div class="olist" id="olist"><p class="adm-muted">Cargando…</p></div>`;
  const all = (await api('pedidos?status=todos')).orders;
  const counts = { activos: all.filter((o) => !['entregado', 'cancelado'].includes(o.status)).length, todos: all.length };
  for (const s of Object.keys(CFG.statuses)) counts[s] = all.filter((o) => o.status === s).length;
  const chipDefs = [['activos', 'Activos'], ['pendiente_pago', 'Por pagar'], ['pagado', 'Por enviar'], ['enviado', 'En camino'], ['entregado', 'Entregados'], ['cancelado', 'Cancelados'], ['todos', 'Todos']];
  const chips = document.getElementById('chips');
  chips.innerHTML = chipDefs.map(([k, l]) => `<button type="button" class="chip-f" data-s="${k}" aria-pressed="${filter.status === k}">${l}<b>${counts[k] || 0}</b></button>`).join('');
  chips.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; filter.status = b.dataset.s; draw(); chips.querySelectorAll('[data-s]').forEach((x) => x.setAttribute('aria-pressed', x === b)); });
  const q = document.getElementById('q');
  q.addEventListener('input', () => { filter.q = q.value; draw(); });
  function draw() {
    const t = filter.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let list = all;
    if (filter.status === 'activos') list = list.filter((o) => !['entregado', 'cancelado'].includes(o.status));
    else if (filter.status !== 'todos') list = list.filter((o) => o.status === filter.status);
    if (t) list = list.filter((o) => [o.id, o.customer.name, o.customer.document, o.customer.phone, o.customer.email, o.customer.city, o.tracking?.number].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t));
    document.getElementById('olist').innerHTML = list.length ? list.map((o) => `<a class="orow" href="#${o.id}">
      <span class="id">${o.id}<small>${dt(o.createdAt)}</small></span>
      <span class="who">${esc(o.customer.name)}<small>${esc(o.customer.city)} · ${o.lines.reduce((s, l) => s + l.qty, 0)} bolsa(s)</small></span>
      <span class="pay adm-muted">${esc(CFG.payMethods[o.payMethod])}</span>
      <span class="tot">${fmt(o.total)}</span>
      <span>${badge(o.status)}</span></a>`).join('') : `<div class="adm-card adm-muted">No hay pedidos en esta vista.</div>`;
  }
  draw();
}

// ---------- Detalle ----------
function waMessage(o) {
  const n = o.customer.name.split(' ')[0];
  if (o.status === 'pendiente_pago') return `Hola ${n}, te escribo de OVA PRO+ por tu pedido ${o.id} de ${fmt(o.total)}. ¿Pudiste hacer la transferencia? Cuando la hagas, envíame el comprobante por aquí.`;
  if (o.status === 'pagado') return `Hola ${n}, recibimos tu pago del pedido ${o.id}. Lo estamos preparando y te aviso apenas salga.`;
  if (o.status === 'enviado') return `Hola ${n}, tu pedido ${o.id} ya va en camino con ${o.tracking?.carrier || 'Servientrega'}${o.tracking?.number ? ', guía ' + o.tracking.number : ''}.`;
  if (o.status === 'entregado') return `Hola ${n}, ¿qué tal te fue con tu OVA PRO+? Si te gustó, nos ayudarías mucho con una reseña.`;
  return `Hola ${n}, te escribo de OVA PRO+ por tu pedido ${o.id}.`;
}

async function viewOrder(id) {
  app.innerHTML = '<p class="adm-muted">Cargando…</p>';
  let o;
  try { o = (await api('pedidos/' + id)).order; } catch (e) { app.innerHTML = `<div class="notice err">${esc(e.message)}</div><a href="#pedidos">Volver</a>`; return; }
  const c = o.customer;
  const canMail = CFG.mail && c.email;
  const addr = `${c.name}\n${c.docType === 'ruc' ? 'RUC' : c.docType === 'pasaporte' ? 'Pasaporte' : 'C.I.'} ${c.document}\n${c.phone}\n${c.address}${c.reference ? ' (' + c.reference + ')' : ''}\n${c.city}, ${c.province}`;
  const step = {
    pendiente_pago: `<button class="btn btn-primary btn-sm" data-st="pagado">Marcar pagado</button><button class="btn btn-danger btn-sm" data-st="cancelado">Cancelar pedido</button>`,
    pagado: `<div style="width:100%"><div class="formgrid">
        <div class="field"><label for="carrier">Transportista</label><select id="carrier"><option>Servientrega</option><option>Entrega propia</option><option>Laar Courier</option><option>Tramaco</option><option>Correos del Ecuador</option><option>Otro</option></select></div>
        <div class="field"><label for="guia">Número de guía</label><input id="guia" value="${esc(o.tracking?.number || '')}" placeholder="Ej.: 1234567890"></div></div>
        <div class="field"><label for="turl">Enlace de seguimiento (opcional)</label><input id="turl" type="url" placeholder="https://…"></div>
        <label style="display:flex;gap:.45rem;font-size:.92rem;margin-bottom:.8rem"><input type="checkbox" id="singuia"> Lo entregué yo, sin guía</label></div>
      <button class="btn btn-primary btn-sm" data-st="enviado">Marcar enviado</button><button class="btn btn-danger btn-sm" data-st="cancelado">Cancelar pedido</button>`,
    enviado: `<button class="btn btn-primary btn-sm" data-st="entregado">Marcar entregado</button>`,
    entregado: `<span class="adm-muted">Pedido completado.</span>`,
    cancelado: `<button class="btn btn-ghost btn-sm" data-st="pendiente_pago">Reactivar pedido</button>`,
  }[o.status];
  app.innerHTML = `<p><a href="#pedidos">← Pedidos</a></p>
    <h1>${o.id} ${badge(o.status)}</h1>
    <p class="adm-muted">${dt(o.createdAt)} · ${esc(CFG.channels[o.channel])} · ${esc(CFG.payMethods[o.payMethod])}</p>
    <div class="adm-card"><h2>Siguiente paso</h2><div class="actions" id="acts">${step}</div>
      ${['pendiente_pago', 'pagado', 'enviado'].includes(o.status) ? `<label style="display:flex;gap:.45rem;font-size:.92rem;margin-top:.8rem"><input type="checkbox" id="notify" ${canMail ? 'checked' : 'disabled'}> Avisar al cliente por correo ${canMail ? '' : `<span class="adm-muted">(${c.email ? 'correo no configurado' : 'sin correo del cliente'})</span>`}</label>` : ''}
      <p style="margin:.9rem 0 0"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/${waNum(c.phone)}?text=${encodeURIComponent(waMessage(o))}">Escribir al cliente por WhatsApp</a></p></div>
    <div class="adm-grid">
      <div class="adm-card"><h2>Cliente</h2><dl class="kv">
        <dt>Nombre</dt><dd>${esc(c.name)}</dd>
        <dt>${c.docType === 'ruc' ? 'RUC' : c.docType === 'pasaporte' ? 'Pasaporte' : 'Cédula'}</dt><dd>${esc(c.document) || '—'}</dd>
        <dt>Celular</dt><dd>${c.phone ? `<a href="https://wa.me/${waNum(c.phone)}" target="_blank" rel="noopener">${esc(c.phone)}</a>` : '—'}</dd>
        <dt>Correo</dt><dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd>
        <dt>Dirección</dt><dd>${esc(c.address)}${c.reference ? `<br><span class="adm-muted">${esc(c.reference)}</span>` : ''}</dd>
        <dt>Ciudad</dt><dd>${esc(c.city)}, ${esc(c.province)}</dd></dl>
        <p style="margin:.8rem 0 0"><button class="copy" id="copyaddr">Copiar datos para la guía</button> · <a href="#clientes" data-q="${esc(c.document || c.phone)}" id="seecust">Ver historial del cliente</a></p></div>
      <div class="adm-card"><h2>Productos</h2><table class="lines">
        ${o.lines.map((l) => `<tr><td>${l.qty} × ${esc(l.name)}${l.promo ? `<br><small class="adm-muted">${esc(l.promo.label)}</small>` : ''}</td><td class="num">${fmt(l.total)}</td></tr>`).join('')}
        ${o.discount ? `<tr><td>Descuento</td><td class="num">−${fmt(o.discount)}</td></tr>` : ''}
        <tr><td>Envío · ${esc(o.zone.label)}</td><td class="num">${fmt(o.shipping)}</td></tr>
        <tr class="t"><td>Total <small class="adm-muted">(IVA ${fmt(o.tax)})</small></td><td class="num">${fmt(o.total)}</td></tr></table>
        ${o.notes ? `<p style="margin:.8rem 0 0"><strong>Nota del cliente:</strong> ${esc(o.notes)}</p>` : ''}
        ${o.tracking?.number || o.tracking?.carrier ? `<p style="margin:.8rem 0 0"><strong>Envío:</strong> ${esc(o.tracking.carrier)} ${esc(o.tracking.number || '')} ${o.tracking.url ? `<a href="${esc(o.tracking.url)}" target="_blank" rel="noopener">seguir</a>` : ''}</p>` : ''}</div>
    </div>
    <div class="adm-grid">
      <div class="adm-card"><h2>Historial</h2><ul class="hist">${o.history.slice().reverse().map((h) => `<li><time>${dt(h.at)}</time>${badge(h.status)} ${esc(h.note || '')} <span class="adm-muted">· ${esc(h.by)}</span></li>`).join('')}</ul>
        ${(o.emails || []).length ? `<h2 style="margin-top:1rem">Correos</h2><ul class="hist">${o.emails.slice().reverse().map((m) => `<li><time>${dt(m.at)}</time>${esc(m.kind)} — ${m.ok ? 'enviado' : 'no enviado: ' + esc(m.error || '')}</li>`).join('')}</ul>` : ''}
        ${canMail ? `<p style="margin:.8rem 0 0"><button class="copy" data-mail="recibido">Reenviar "pedido recibido"</button>${o.status !== 'pendiente_pago' ? ` · <button class="copy" data-mail="${o.status === 'cancelado' ? 'recibido' : o.status}">Reenviar último aviso</button>` : ''}</p>` : ''}</div>
      <div class="adm-card"><h2>Nota interna</h2><p class="adm-muted" style="font-size:.9rem">Solo la ves tú. Ej.: "pagó por Pichincha", "factura 001-001-0000123".</p>
        <textarea id="inote" rows="4">${esc(o.internalNotes || '')}</textarea><p style="margin:.6rem 0 0"><button class="btn btn-ghost btn-sm" id="savenote">Guardar nota</button></p></div>
    </div>`;

  document.getElementById('acts').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    const st = b.dataset.st;
    if (st === 'cancelado' && !confirmBox('¿Cancelar este pedido? Si ya estaba pagado, el stock se devuelve.')) return;
    const body = { status: st, notify: document.getElementById('notify')?.checked ?? false };
    if (st === 'enviado') {
      body.tracking = { carrier: document.getElementById('carrier').value, number: document.getElementById('guia').value.trim(), url: document.getElementById('turl').value.trim() };
      body.sinGuia = document.getElementById('singuia').checked;
    }
    b.disabled = true;
    try {
      const r = await api(`pedidos/${o.id}/estado`, { method: 'POST', body });
      await viewOrder(o.id);
      notice(`Pedido ${o.id}: ${CFG.statuses[st]}.` + (r.mail ? (r.mail.ok ? ' Se avisó al cliente por correo.' : ' El correo no se pudo enviar: ' + r.mail.error) : ''), r.mail && !r.mail.ok ? 'warn' : 'ok');
    } catch (err) { notice(err.message, 'err'); b.disabled = false; }
  });
  document.getElementById('copyaddr').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(addr); notice('Datos copiados.'); } catch { notice('No se pudo copiar; selecciona el texto a mano.', 'warn'); }
  });
  document.getElementById('seecust').addEventListener('click', () => { custQuery = c.document || c.phone; });
  document.getElementById('savenote').addEventListener('click', async () => {
    try { await api(`pedidos/${o.id}/nota`, { method: 'POST', body: { text: document.getElementById('inote').value } }); notice('Nota guardada.'); }
    catch (err) { notice(err.message, 'err'); }
  });
  app.querySelectorAll('[data-mail]').forEach((b) => b.addEventListener('click', async () => {
    try { const r = await api(`pedidos/${o.id}/correo`, { method: 'POST', body: { kind: b.dataset.mail } }); notice(r.mail.ok ? 'Correo reenviado.' : 'No se pudo enviar: ' + r.mail.error, r.mail.ok ? 'ok' : 'warn'); }
    catch (err) { notice(err.message, 'err'); }
  }));
}

// Confirmación sin diálogos del navegador
function confirmBox(msg) { return window.confirm ? window.confirm(msg) : true; }

// ---------- Nuevo pedido (ventas por WhatsApp) ----------
async function viewNew() {
  const p = CFG.products[0];
  app.innerHTML = `<p><a href="#pedidos">← Pedidos</a></p><h1>Nuevo pedido</h1>
  <p class="adm-muted">Para registrar las ventas que te llegan por WhatsApp o en persona. Si el cliente ya compró, escribe su cédula y toca Buscar.</p>
  <form class="adm-card" id="nf" novalidate>
    <h2>Cliente</h2>
    <div class="formgrid">
      <div class="field"><label for="n-doctype">Documento</label><select id="n-doctype"><option value="cedula">Cédula</option><option value="ruc">RUC</option><option value="pasaporte">Pasaporte</option></select></div>
      <div class="field"><label for="n-doc">Número</label><div style="display:flex;gap:.4rem"><input id="n-doc" inputmode="numeric"><button type="button" class="btn btn-ghost btn-sm" id="find">Buscar</button></div></div>
      <div class="field"><label for="n-name">Nombre completo *</label><input id="n-name" required></div>
      <div class="field"><label for="n-phone">Celular</label><input id="n-phone" type="tel" placeholder="0991234567"></div>
      <div class="field"><label for="n-email">Correo</label><input id="n-email" type="email"></div>
      <div class="field"><label for="n-prov">Provincia</label><input id="n-prov" value="Pichincha"></div>
      <div class="field"><label for="n-city">Ciudad</label><input id="n-city" value="Quito"></div>
      <div class="field"><label for="n-addr">Dirección</label><input id="n-addr"></div>
      <div class="field"><label for="n-ref">Referencia</label><input id="n-ref"></div>
    </div>
    <h2 style="margin-top:.6rem">Pedido</h2>
    <div class="formgrid">
      <div class="field"><label for="n-qty">${esc(p.name)} (cantidad)</label><input id="n-qty" type="number" min="1" max="20" value="1"></div>
      <div class="field"><label for="n-zone">Envío</label><select id="n-zone">${CFG.zones.map((z) => `<option value="${z.id}">${esc(z.label)} — ${fmt(z.price)}</option>`).join('')}</select></div>
      <div class="field"><label for="n-pay">Forma de pago</label><select id="n-pay"><option value="transfer">Transferencia / depósito</option><option value="cash">Efectivo</option><option value="card">Tarjeta (PayPhone)</option></select></div>
      <div class="field"><label for="n-status">Estado</label><select id="n-status"><option value="pendiente_pago">Por pagar</option><option value="pagado">Ya pagó</option></select></div>
      <div class="field"><label for="n-channel">Canal</label><select id="n-channel"><option value="whatsapp">WhatsApp</option><option value="manual">En persona / otro</option></select></div>
      <div class="field"><label for="n-notes">Notas</label><input id="n-notes"></div>
    </div>
    <p id="n-total" style="font-size:1.2rem;font-weight:500"></p>
    <label style="display:flex;gap:.45rem;font-size:.92rem;margin-bottom:1rem"><input type="checkbox" id="n-notify" ${CFG.mail ? 'checked' : 'disabled'}> Enviar correo de confirmación al cliente ${CFG.mail ? '' : '<span class="adm-muted">(correo no configurado)</span>'}</label>
    <div id="n-err" class="notice err" hidden></div>
    <button class="btn btn-dark">Registrar pedido</button>
  </form>`;
  const $ = (id) => document.getElementById(id);
  const calc = () => {
    const o = computeOrder({ items: [{ id: p.id, qty: $('n-qty').value }], zone: $('n-zone').value, payMethod: $('n-pay').value === 'card' ? 'card' : 'transfer' });
    $('n-total').textContent = `Total: ${fmt(o.total)}` + (o.lines[0]?.promo ? ` · ${o.lines[0].promo.label}` : '') + ` · envío ${fmt(o.shipping)}`;
  };
  ['n-qty', 'n-zone', 'n-pay'].forEach((i) => $(i).addEventListener('input', calc)); calc();
  $('find').addEventListener('click', async () => {
    const d = $('n-doc').value.replace(/\D/g, '') || $('n-doc').value.trim();
    if (!d) return;
    try {
      const { customer: c } = await api('clientes/' + encodeURIComponent(d));
      $('n-doctype').value = c.docType || 'cedula'; $('n-name').value = c.name || ''; $('n-phone').value = (c.phone || '').replace(/^\+593/, '0');
      $('n-email').value = c.email || ''; $('n-prov').value = c.province || ''; $('n-city').value = c.city || ''; $('n-addr').value = c.address || ''; $('n-ref').value = c.reference || '';
      notice(`Cliente encontrado: ${c.name} (${(c.orders || []).length} pedido/s).`);
    } catch { notice('No hay un cliente con ese documento. Llena los datos y se guardará.', 'warn'); }
  });
  $('nf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      items: [{ id: p.id, qty: Number($('n-qty').value) }], zone: $('n-zone').value, payMethod: $('n-pay').value,
      status: $('n-status').value, channel: $('n-channel').value, notes: $('n-notes').value, notify: $('n-notify').checked,
      customer: { docType: $('n-doctype').value, document: $('n-doc').value, name: $('n-name').value, phone: $('n-phone').value, email: $('n-email').value,
        province: $('n-prov').value, city: $('n-city').value, address: $('n-addr').value, reference: $('n-ref').value },
    };
    try { const { order } = await api('pedidos', { method: 'POST', body }); location.hash = order.id; setTimeout(() => notice(`Pedido ${order.id} registrado.`), 400); }
    catch (err) { $('n-err').hidden = false; $('n-err').textContent = err.message; }
  });
}

// ---------- Clientes ----------
let custQuery = '';
async function viewCustomers() {
  app.innerHTML = `<h1>Clientes</h1><div class="adm-toolbar"><input type="search" id="cq" placeholder="Buscar por nombre, cédula, celular o ciudad" value="${esc(custQuery)}" aria-label="Buscar clientes">
    <a class="btn btn-ghost btn-sm" href="/api/admin/export/clientes.csv">Descargar Excel</a></div><div id="clist" class="olist"><p class="adm-muted">Cargando…</p></div>`;
  const { customers } = await api('clientes');
  const q = document.getElementById('cq');
  const draw = () => {
    const t = q.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const list = customers.filter((c) => !t || [c.name, c.document, c.phone, c.email, c.city].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t));
    document.getElementById('clist').innerHTML = list.length ? list.map((c) => `<details class="adm-card" style="margin:0"><summary style="cursor:pointer;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap">
      <span><strong>${esc(c.name)}</strong><br><span class="adm-muted">${esc(c.document || '')} · ${esc(c.phone || '')} · ${esc(c.city || '')}</span></span>
      <span style="text-align:right">${c.orderCount} pedido(s) · ${c.bags} bolsa(s)<br><strong>${fmt(c.spent)}</strong> <span class="adm-muted">· última ${day(c.lastOrderAt)}</span></span></summary>
      <dl class="kv" style="margin-top:.8rem"><dt>Correo</dt><dd>${esc(c.email || '—')}</dd><dt>Dirección</dt><dd>${esc(c.address || '—')} ${esc(c.reference || '')}</dd><dt>Provincia</dt><dd>${esc(c.province || '—')}</dd>
      <dt>Pedidos</dt><dd>${(c.orders || []).slice().reverse().map((id) => `<a href="#${id}">${id}</a>`).join(', ')}</dd></dl>
      <p style="margin:.8rem 0 0">${c.phone ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/${waNum(c.phone)}?text=${encodeURIComponent(`Hola ${c.name.split(' ')[0]}, te escribo de OVA PRO+.`)}">WhatsApp</a>` : ''}</p></details>`).join('')
      : `<div class="adm-card adm-muted">${customers.length ? 'Sin resultados.' : 'Aún no hay clientes. Se guardan solos con cada pedido.'}</div>`;
  };
  q.addEventListener('input', draw); draw(); custQuery = '';
}

// ---------- Resumen ----------
async function viewStats() {
  const s = await api('resumen');
  const st = s.stock; const low = Object.entries(st.items).filter(([, n]) => n <= st.lowAlert);
  const name = (id) => CFG.products.find((p) => p.id === id)?.name || id;
  app.innerHTML = `<h1>Resumen</h1>
  ${low.map(([id, n]) => `<div class="notice warn">Stock bajo: ${esc(name(id))} — quedan ${n}.</div>`).join('')}
  <div class="kpis">
    <a class="kpi${s.pendingPayment ? ' warn' : ''}" href="#pedidos" style="text-decoration:none;color:inherit"><strong>${s.pendingPayment}</strong><span>pedidos por pagar</span></a>
    <a class="kpi${s.toShip ? ' warn' : ''}" href="#pedidos" style="text-decoration:none;color:inherit"><strong>${s.toShip}</strong><span>pagados por enviar</span></a>
    <div class="kpi"><strong>${s.inTransit}</strong><span>en camino</span></div>
    <div class="kpi"><strong>${s.customers}</strong><span>clientes</span></div>
  </div>
  <div class="adm-card"><h2>Ventas por mes</h2><p class="adm-muted" style="font-size:.9rem">Cuenta solo pedidos pagados, enviados o entregados. Montos con IVA y envío incluidos.</p>
  <div class="tablewrap"><table><thead><tr><th>Mes</th><th class="num">Pedidos</th><th class="num">Bolsas</th><th class="num">Ventas</th><th class="num">Envíos</th><th class="num">Transferencia</th><th class="num">Tarjeta</th><th class="num">Efectivo</th><th class="num">Ticket prom.</th></tr></thead>
  <tbody>${s.months.length ? s.months.map((m) => `<tr><th scope="row">${new Date(m.month + '-15').toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}</th><td class="num">${m.orders}</td><td class="num">${m.bags}</td><td class="num">${fmt(m.revenue)}</td><td class="num">${fmt(m.shipping)}</td>
    <td class="num">${fmt(m.byPay.transfer || 0)}</td><td class="num">${fmt(m.byPay.card || 0)}</td><td class="num">${fmt(m.byPay.cash || 0)}</td><td class="num">${fmt(Math.round(m.revenue / m.orders))}</td></tr>`).join('') : '<tr><td colspan="9" class="adm-muted">Aún no hay ventas registradas.</td></tr>'}</tbody></table></div></div>`;
}

// ---------- Stock ----------
async function viewStock() {
  const st = await api('stock');
  app.innerHTML = `<h1>Stock</h1><p class="adm-muted">El stock baja solo cuando un pedido pasa a <strong>Pagado</strong> y vuelve si lo cancelas. Si lo dejas vacío, la web vende sin límite.</p>
  <form class="adm-card" id="sf">${CFG.products.map((p) => `<div class="field"><label for="s-${p.id}">${esc(p.name)}: unidades disponibles</label><input id="s-${p.id}" data-id="${p.id}" type="number" min="0" value="${st.items[p.id] ?? ''}" placeholder="Sin control"></div>`).join('')}
    <div class="field"><label for="s-low">Avisarme cuando queden</label><input id="s-low" type="number" min="0" value="${st.lowAlert}"></div>
    <button class="btn btn-dark">Guardar stock</button></form>`;
  document.getElementById('sf').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      for (const inp of document.querySelectorAll('#sf [data-id]')) await api('stock', { method: 'POST', body: { productId: inp.dataset.id, qty: inp.value === '' ? null : Number(inp.value), lowAlert: Number(document.getElementById('s-low').value) } });
      notice('Stock guardado.');
    } catch (err) { notice(err.message, 'err'); }
  });
}

start();
