// Correos automáticos a clientes y aviso al negocio.
// Envío por SMTP (correo de Hostinger: hola@ovaprotein.com) o, si no hay SMTP, por Resend.
// Variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, ORDER_EMAIL_TO, BANK_INFO, RESEND_API_KEY, SITE_URL
import site from '../public/assets/js/site.mjs';

const money = (c) => '$' + (c / 100).toFixed(2);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const siteUrl = () => (process.env.SITE_URL || site.url).replace(/\/$/, '');
const waLink = (text) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
export const bankLines = () => String(process.env.BANK_INFO || '').split(/\||\\n|\n/).map((s) => s.trim()).filter(Boolean);

let transporter = null;
async function getTransport() {
  if (transporter !== null) return transporter;
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) { transporter = false; return false; }
  try {
    const nodemailer = (await import('nodemailer')).default;
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  } catch (e) { console.error('nodemailer no disponible', e.message); transporter = false; }
  return transporter;
}

export function mailConfigured() {
  return !!((process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);
}

/** Envía un correo. Devuelve { ok, via, error }. */
export async function sendMail({ to, subject, html, text, replyTo }) {
  if (!to) return { ok: false, error: 'Sin destinatario' };
  const from = process.env.MAIL_FROM || `OVA PRO+ <${process.env.SMTP_USER || 'hola@ovaprotein.com'}>`;
  const t = await getTransport();
  try {
    if (t) {
      await t.sendMail({ from, to, subject, html, text, replyTo });
      return { ok: true, via: 'smtp' };
    }
    if (process.env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [].concat(to), subject, html, text, reply_to: replyTo }),
      });
      if (!r.ok) return { ok: false, error: 'Resend ' + r.status };
      return { ok: true, via: 'resend' };
    }
    return { ok: false, error: 'Correo no configurado' };
  } catch (e) {
    console.error('Error enviando correo', e.message);
    return { ok: false, error: e.message };
  }
}

// ---------- Plantillas ----------
function layout(title, body) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#EAF1EB;font-family:Arial,Helvetica,sans-serif;color:#14211B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EAF1EB;padding:24px 0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td style="background:#0F3B2C;padding:20px 24px"><img src="${siteUrl()}/assets/img/logo-ova-pro.png" alt="OVA PRO+" height="44" style="display:block;height:44px"></td></tr>
<tr><td style="padding:28px 24px 8px"><h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:#0F3B2C">${esc(title)}</h1>${body}</td></tr>
<tr><td style="padding:16px 24px 28px;font-size:13px;color:#4F6157;border-top:1px solid #CFDDD2">
¿Dudas? Escríbenos por <a href="${waLink('Hola, tengo una consulta sobre mi pedido.')}" style="color:#1E5A43">WhatsApp</a> o responde a este correo.<br>
OVA PRO+ · <a href="${siteUrl()}" style="color:#1E5A43">ovaprotein.com</a> · Instagram @ovaprotein</td></tr>
</table></td></tr></table></body></html>`;
}

function linesTable(o) {
  const rows = o.lines.map((l) => `<tr><td style="padding:6px 0">${l.qty} × ${esc(l.name)}${l.promo ? `<br><span style="font-size:12px;color:#0B7A56">${esc(l.promo.label)}</span>` : ''}</td><td align="right" style="padding:6px 0">${money(l.total)}</td></tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;margin:12px 0 16px;border-top:1px solid #CFDDD2;border-bottom:1px solid #CFDDD2">
${rows}
${o.discount ? `<tr><td style="padding:6px 0">Descuento</td><td align="right">−${money(o.discount)}</td></tr>` : ''}
<tr><td style="padding:6px 0">Envío (${esc(o.zone.label)})</td><td align="right">${o.shipping ? money(o.shipping) : 'Gratis'}</td></tr>
<tr><td style="padding:8px 0;font-weight:bold;font-size:17px">Total</td><td align="right" style="font-weight:bold;font-size:17px">${money(o.total)}</td></tr>
</table>`;
}

function addressBlock(c) {
  return `<p style="font-size:14px;line-height:1.5;margin:0 0 16px"><strong>Entrega:</strong> ${esc(c.name)}<br>${esc(c.address)}${c.reference ? ', ' + esc(c.reference) : ''}<br>${esc(c.city)}${c.province ? ', ' + esc(c.province) : ''} · ${esc(c.phone)}</p>`;
}

export function tplOrderReceived(o) {
  const bank = bankLines();
  const transfer = o.payMethod === 'transfer';
  const payBox = transfer
    ? `<div style="background:#EAF1EB;border-left:4px solid #10B981;padding:14px 16px;margin:0 0 16px;font-size:15px;line-height:1.5">
<strong>Para completar tu compra, transfiere ${money(o.total)}:</strong><br>
${bank.length ? bank.map(esc).join('<br>') : 'Escríbenos por WhatsApp con tu número de pedido y te pasamos los datos para transferir.'}<br>
<strong>Referencia:</strong> ${esc(o.id)}</div>
<p style="font-size:15px;margin:0 0 16px">Cuando transfieras, envíanos el comprobante por WhatsApp y despachamos tu pedido.</p>
<p style="margin:0 0 20px"><a href="${waLink(`Hola, envío el comprobante de mi pedido ${o.id} por ${money(o.total)}.`)}" style="background:#25D366;color:#0b2b17;text-decoration:none;padding:12px 18px;font-weight:bold;display:inline-block">Enviar comprobante por WhatsApp</a></p>`
    : '';
  const subject = transfer ? `Recibimos tu pedido ${o.id}: datos para transferir` : `Recibimos tu pedido ${o.id}`;
  const html = layout(`¡Gracias, ${o.customer.name.split(' ')[0]}! Recibimos tu pedido ${o.id}`, `${payBox}${linesTable(o)}${addressBlock(o.customer)}`);
  const text = `Recibimos tu pedido ${o.id} por ${money(o.total)}.\n${transfer ? (bank.length ? 'Datos para transferir:\n' + bank.join('\n') + `\nReferencia: ${o.id}\n` : 'Te enviaremos los datos de la cuenta por WhatsApp.\n') : ''}`;
  return { subject, html, text };
}

export function tplPaid(o) {
  const html = layout(`Pago confirmado: pedido ${o.id}`, `<p style="font-size:15px;margin:0 0 12px">Recibimos tu pago. Estamos preparando tu OVA PRO+ y te avisamos apenas salga, con el número de guía.</p>${linesTable(o)}${addressBlock(o.customer)}`);
  return { subject: `Pago confirmado: pedido ${o.id}`, html, text: `Recibimos tu pago del pedido ${o.id} (${money(o.total)}). Te avisaremos cuando salga.` };
}

export function tplShipped(o) {
  const t = o.tracking || {};
  const html = layout(`Tu pedido ${o.id} va en camino`, `<p style="font-size:15px;margin:0 0 12px">Despachamos tu OVA PRO+.</p>
<div style="background:#EAF1EB;border-left:4px solid #10B981;padding:14px 16px;margin:0 0 16px;font-size:15px;line-height:1.5">
<strong>Transportista:</strong> ${esc(t.carrier || 'Servientrega')}<br>${t.number ? `<strong>Número de guía:</strong> ${esc(t.number)}<br>` : ''}
${t.url ? `<a href="${esc(t.url)}" style="color:#1E5A43">Seguir mi envío</a>` : ''}</div>
${addressBlock(o.customer)}<p style="font-size:14px;margin:0 0 16px">Mientras llega, mira <a href="${siteUrl()}/blog/recetas-con-proteina-de-huevo/" style="color:#1E5A43">recetas con OVA PRO+</a>.</p>`);
  return { subject: `Tu pedido ${o.id} va en camino`, html, text: `Tu pedido ${o.id} va en camino con ${t.carrier || 'Servientrega'}. Guía: ${t.number || '—'}` };
}

export function tplDelivered(o) {
  const html = layout(`¡Tu pedido ${o.id} fue entregado!`, `<p style="font-size:15px;margin:0 0 12px">Esperamos que disfrutes tu OVA PRO+. Si te gustó, nos ayudas mucho dejando una reseña o etiquetándonos en Instagram @ovaprotein.</p>
<p style="font-size:14px;margin:0 0 16px">Cuando se te esté acabando, escríbenos y te lo reponemos: <a href="${waLink('Hola, quiero volver a pedir OVA PRO+.')}" style="color:#1E5A43">pedir de nuevo por WhatsApp</a>.</p>`);
  return { subject: `Tu pedido ${o.id} fue entregado`, html, text: `Tu pedido ${o.id} fue entregado. ¡Gracias por tu compra!` };
}

export function tplOwnerNew(o) {
  const c = o.customer;
  const html = `<h2>Nuevo pedido ${esc(o.id)} — ${money(o.total)}</h2>
<p>Canal: ${esc(o.channel)} · Pago: ${esc(o.payMethod)} · Estado: ${esc(o.status)}</p>
<ul>${o.lines.map((l) => `<li>${l.qty} × ${esc(l.name)} — ${money(l.total)}</li>`).join('')}</ul>
<p>Envío (${esc(o.zone.label)}): ${money(o.shipping)}<br><strong>Total: ${money(o.total)}</strong></p>
<p><strong>${esc(c.name)}</strong> · ${esc(c.docType)} ${esc(c.document)}<br>${esc(c.phone)} · ${esc(c.email)}<br>${esc(c.address)}, ${esc(c.city)}, ${esc(c.province)}<br>Ref: ${esc(c.reference)}<br>Notas: ${esc(o.notes)}</p>
<p><a href="${siteUrl()}/admin/#${esc(o.id)}">Abrir en el panel</a> · <a href="https://wa.me/${esc(c.phone.replace(/\D/g, ''))}">WhatsApp del cliente</a></p>`;
  return { subject: `Nuevo pedido ${o.id} — ${money(o.total)} (${o.customer.city})`, html, text: `Nuevo pedido ${o.id} ${money(o.total)}` };
}

const TEMPLATES = { recibido: tplOrderReceived, pagado: tplPaid, enviado: tplShipped, entregado: tplDelivered };

/** Envía al cliente el correo del tipo indicado y lo registra en el pedido. */
export async function notifyCustomer(order, kind) {
  const tpl = TEMPLATES[kind];
  if (!tpl || !order.customer.email) return { ok: false, error: 'Sin correo del cliente' };
  const m = tpl(order);
  const r = await sendMail({ to: order.customer.email, ...m, replyTo: process.env.ORDER_EMAIL_TO || process.env.SMTP_USER });
  order.emails = [...(order.emails || []), { at: new Date().toISOString(), kind, ok: r.ok, error: r.error || undefined }];
  return r;
}

export async function notifyOwner(order) {
  const to = process.env.ORDER_EMAIL_TO;
  if (!to) return { ok: false };
  return sendMail({ to: to.split(',').map((s) => s.trim()), ...tplOwnerNew(order), replyTo: order.customer.email || undefined });
}
