// Bot de WhatsApp (WhatsApp Cloud API de Meta)
// GET  /api/whatsapp  → verificación del webhook
// POST /api/whatsapp  → mensajes entrantes
// Variables: WA_VERIFY_TOKEN, WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, WA_APP_SECRET,
//            WA_API_VERSION (opcional, p. ej. v25.0), ANTHROPIC_API_KEY y ANTHROPIC_MODEL (opcionales, modo IA)
import crypto from 'node:crypto';
import { getStore } from '../../server/store.mjs';
import { respond, fallback, knowledgeBase } from '../../public/assets/js/bot-brain.mjs';

const HANDOFF_HOURS = 12;
const env = process.env;
const API = () => `https://graph.facebook.com/${env.WA_API_VERSION || 'v25.0'}/${env.WA_PHONE_NUMBER_ID}/messages`;

export default async (req, context) => {
  const url = new URL(req.url);
  if (req.method === 'GET') {
    if (url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === env.WA_VERIFY_TOKEN)
      return new Response(url.searchParams.get('hub.challenge'), { status: 200 });
    return new Response('Forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  if (env.WA_APP_SECRET) {
    const sig = req.headers.get('x-hub-signature-256') || '';
    const exp = 'sha256=' + crypto.createHmac('sha256', env.WA_APP_SECRET).update(raw).digest('hex');
    if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return new Response('Bad signature', { status: 401 });
  }
  let payload;
  try { payload = JSON.parse(raw); } catch { return new Response('ok'); }

  // Responder 200 de inmediato y procesar en segundo plano (Meta reintenta si tardamos).
  const work = handle(payload).catch((e) => console.error('Bot error', e));
  if (context?.waitUntil) context.waitUntil(work); else await work;
  return new Response('ok', { status: 200 });
};

async function handle(payload) {
  for (const entry of payload.entry || []) {
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      for (const m of v.messages || []) await onMessage(m, v.contacts?.[0]);
    }
  }
}

async function onMessage(m, contact) {
  const from = m.from;
  const seen = safeStore('wa-seen');
  if (seen && (await seen.get(m.id))) return; // reintento de Meta
  await seen?.set(m.id, '1');
  markRead(m.id);

  let input = '', byId = false;
  if (m.type === 'text') input = m.text?.body || '';
  else if (m.type === 'interactive') { input = m.interactive?.button_reply?.id || m.interactive?.list_reply?.id || ''; byId = true; }
  else if (m.type === 'button') input = m.button?.text || '';
  else return send(from, { text: 'Por ahora solo leo texto 🙂 Escribe tu consulta o *menú* para ver opciones.' });

  // Modo asesor humano: el bot se calla durante unas horas salvo que pidan el menú.
  const ho = safeStore('wa-handoff');
  const since = ho ? Number(await ho.get(from)) : 0;
  const wantsMenu = /^(menu|menú|inicio|bot)$/i.test(input.trim()) || input === 'menu';
  if (since && Date.now() - since < HANDOFF_HOURS * 3600e3 && !wantsMenu) return;
  if (since && wantsMenu) await ho.delete(from);

  let r = respond(input, { byId });
  if (!r && env.ANTHROPIC_API_KEY && !byId) r = await askAI(input);
  if (!r) r = fallback();

  if (r.handoff) await ho?.set(from, String(Date.now()));
  if (r.tag) await safeStore('wa-listas')?.set(`${r.tag}:${from}`, JSON.stringify({ name: contact?.profile?.name || '', at: new Date().toISOString() }));
  await send(from, r);
}

function safeStore(name) { try { return getStore(name); } catch { return null; } }

const waText = (t) => t; // los textos ya usan *negrita* de WhatsApp

async function send(to, r) {
  const body = waText(r.text);
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to };
  if (r.cta) {
    return post({ ...base, type: 'interactive', interactive: { type: 'cta_url', body: { text: body.slice(0, 1024) },
      action: { name: 'cta_url', parameters: { display_text: r.cta.label.slice(0, 20), url: r.cta.url } } } });
  }
  if (r.list) {
    return post({ ...base, type: 'interactive', interactive: { type: 'list', body: { text: body.slice(0, 1024) }, footer: { text: 'OVA PRO+ · clara de huevo' },
      action: { button: 'Ver opciones', sections: [{ title: 'Menú', rows: r.list.slice(0, 10).map((o) => ({ id: o.id, title: o.title.slice(0, 24) })) }] } } });
  }
  if (r.buttons?.length) {
    if (body.length > 1000) { await post({ ...base, type: 'text', text: { body, preview_url: true } }); }
    return post({ ...base, type: 'interactive', interactive: { type: 'button', body: { text: body.length > 1000 ? '¿Algo más?' : body },
      action: { buttons: r.buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })) } } });
  }
  return post({ ...base, type: 'text', text: { body, preview_url: true } });
}

async function post(msg) {
  const res = await fetch(API(), { method: 'POST', headers: { Authorization: `Bearer ${env.WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(msg) });
  if (!res.ok) console.error('WA send error', res.status, await res.text());
}
function markRead(id) {
  fetch(API(), { method: 'POST', headers: { Authorization: `Bearer ${env.WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: id }) }).catch(() => {});
}

// Modo IA opcional: responde solo sobre OVA PRO+ con la base de conocimiento.
async function askAI(question) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
        max_tokens: 350,
        system: `Eres el asistente de atención al cliente de OVA PRO+ (OVA Nutrition, Ecuador) en WhatsApp.
Responde en español de Ecuador, tuteando, en 2 a 5 frases cortas. Usa *negrita* de WhatsApp con moderación.
Responde SOLO sobre OVA PRO+, sus precios, envíos, pagos, uso, nutrición deportiva general y proteína de huevo.
Usa únicamente los datos de la BASE. Si algo no está en la BASE (stock, estado de un pedido, descuentos especiales, temas médicos personales), di que una persona del equipo le ayudará y sugiere escribir *asesor*.
No hagas diagnósticos ni promesas de salud. No inventes precios ni promociones.
Si la pregunta no tiene relación con OVA PRO+ o nutrición deportiva, indica amablemente que solo puedes ayudar con eso.

BASE:
${knowledgeBase()}`,
        messages: [{ role: 'user', content: question.slice(0, 1000) }],
      }),
    });
    if (!res.ok) { console.error('AI error', res.status, await res.text()); return null; }
    const d = await res.json();
    const text = (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return text ? { id: 'ai', text, buttons: [{ id: 'comprar', title: 'Comprar' }, { id: 'asesor', title: 'Hablar con asesor' }, { id: 'menu', title: 'Menú' }] } : null;
  } catch (e) { console.error(e); return null; }
}

export const config = { path: '/api/whatsapp' };
