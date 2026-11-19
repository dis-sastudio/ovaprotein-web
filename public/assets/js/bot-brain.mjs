// Cerebro del asistente: lo usan el chat de la web y el bot de WhatsApp (servidor).
// Respuestas por reglas, con datos del catálogo. Edita los textos aquí.
import catalog from './catalog.mjs';
import site from './site.mjs';

const money = (c) => '$' + (c / 100).toFixed(2);
const P = Object.fromEntries(catalog.products.map((p) => [p.id, p]));
const CARD = !!site.cardPayments;
const url = (path) => site.url.replace(/\/$/, '') + path;

export const normalize = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ/ ]/g, ' ').replace(/\s+/g, ' ').trim();

const MENU = [
  { id: 'comprar', title: 'Comprar' },
  { id: 'precios', title: 'Precios y promos' },
  { id: 'tabla', title: 'Tabla nutricional' },
  { id: 'uso', title: 'Cómo se toma' },
  { id: 'envios', title: 'Envíos' },
  { id: 'pagos', title: 'Formas de pago' },
  { id: 'whey', title: 'OVA PRO+ vs whey' },
  { id: 'asesor', title: 'Hablar con asesor' },
];
export const menu = MENU;

const I = {
  menu: () => ({
    text: `¡Hola! Soy el asistente de *OVA PRO+* 💪\nProteína 100 % clara de huevo: 83 % proteína, 33,2 g por scoop y 0 % lactosa.\n\n¿En qué te ayudo?`,
    list: MENU,
  }),
  precios: () => {
    const p = P['ova-pro-500'];
    const pr = (catalog.promotions || [])[0];
    return {
      text:
        `*Precios (IVA incluido)*\n` +
        `• ${p.name}: ${money(p.price)} (12 scoops). ${CARD ? 'Pagas con tarjeta o transferencia.' : 'Pago por transferencia o depósito.'}\n` +
        (pr ? `• *Promo:* 2 bolsas por ${money(pr.unitPrice * pr.minQty)} (${money(pr.unitPrice)} c/u) pagando por transferencia o depósito.\n` : '') +
        `\nEl envío no está incluido: ${catalog.shipping.zones.map((z) => `${z.label.split(' (')[0]} ${money(z.price)}`).join(', ')}.\n` +
        `Por ahora solo tenemos la presentación de 500 g.`,
      buttons: [{ id: 'promo', title: 'Quiero la promo' }, { id: CARD ? 'buy_500' : 'pedido', title: 'Comprar 1 bolsa' }, { id: 'envios', title: 'Envíos' }],
    };
  },
  comprar: () => {
    const pr = (catalog.promotions || [])[0];
    const two = money(pr.unitPrice * pr.minQty);
    return CARD ? {
      text: `¿Cómo quieres tu pedido?\n• *1 bolsa* a ${money(P['ova-pro-500'].price)}: te mando el enlace para pagar con tarjeta.\n• *Promo 2 × ${two}*: pagas por transferencia y te enviamos los datos.`,
      buttons: [{ id: 'buy_500', title: '1 bolsa · tarjeta' }, { id: 'promo', title: 'Promo 2 por $50' }, { id: 'precios', title: 'Ver precios' }],
    } : {
      text: `¿Cuántas bolsas quieres?\n• *1 bolsa*: ${money(P['ova-pro-500'].price)}\n• *2 bolsas (promo)*: ${two}\nPagas por transferencia o depósito; el envío se cobra aparte.`,
      buttons: [{ id: 'pedido', title: '1 bolsa' }, { id: 'promo', title: 'Promo 2 por $50' }, { id: 'precios', title: 'Ver precios' }],
    };
  },
  pedido: () => ({
    text: `¡Perfecto! Para tu pedido de *1 OVA PRO+ 500 g* (${money(P['ova-pro-500'].price)}) envíanos:\n1. Nombre y cédula\n2. Ciudad y dirección de entrega\n\nTe respondemos con los datos bancarios y el costo del envío. Despachamos al recibir el comprobante.`,
    handoff: true,
  }),
  buy_500: () => (CARD ? buy('ova-pro-500') : I.pedido()),
  promo: () => {
    const pr = (catalog.promotions || [])[0];
    return {
      text: `*Promo 2 OVA PRO+ por ${money(pr.unitPrice * pr.minQty)}* 🙌\nPara cerrar tu pedido envíanos:\n1. Nombre y cédula\n2. Ciudad y dirección de entrega\n3. Cuántas bolsas quieres (desde 2)\n\nTe respondemos con los datos bancarios y el costo del envío. Despachamos al recibir el comprobante.\n\nTambién puedes armarlo en la web: ${url('/carrito/?add=ova-pro-500&cant=2&pago=transferencia')}`,
      handoff: true,
    };
  },
  tabla: () => ({
    text:
      `*Por scoop de 40 g*\n` +
      `• Energía: 143 kcal\n• Proteína: 33,2 g\n• Carbohidratos: 1,6 g\n• Grasa: 0,4 g\n• Leucina: ≈3,0 g · BCAA: ≈7,2 g\n` +
      `• Aminoácidos esenciales: ≈15,5 g\n\n` +
      `*Por 100 g*: 357 kcal · 83,07 g proteína · 4,05 g carbohidratos · 1,00 g grasa.\n` +
      `Ingrediente único: clara de huevo deshidratada y pasteurizada.\n\nTabla completa: ${url('/proteina-de-huevo-ova-pro/#nutricion')}`,
    buttons: [{ id: 'uso', title: 'Cómo se toma' }, { id: 'comprar', title: 'Comprar' }, { id: 'menu', title: 'Menú' }],
  }),
  uso: () => ({
    text:
      `*Cómo se toma*\n` +
      `1. Pon 250–300 ml de agua, leche vegetal o tu batido en el shaker.\n` +
      `2. Agrega 1 scoop (40 g = 33,2 g de proteína).\n` +
      `3. Agita 20–30 segundos.\n\n` +
      `No tiene sabor, así que va bien con fruta, avena, café frío o en recetas (pancakes, waffles, avena horneada).\n` +
      `La mayoría de personas activas usa 1–2 scoops al día para completar su requerimiento. Calcula el tuyo: ${url('/calculadora-de-proteina/')}`,
    buttons: [{ id: 'tabla', title: 'Tabla nutricional' }, { id: 'comprar', title: 'Comprar' }, { id: 'menu', title: 'Menú' }],
  }),
  envios: () => ({
    text:
      `*Envíos a todo Ecuador*\n` +
      catalog.shipping.zones.map((z) => `• ${z.label}: ${money(z.price)}`).join('\n') +
      `\n• Galápagos: escríbenos y te cotizamos.\n\nEl envío no está incluido en el precio. Te enviamos el número de guía al despachar.`,
    buttons: [{ id: 'pagos', title: 'Formas de pago' }, { id: 'comprar', title: 'Comprar' }, { id: 'menu', title: 'Menú' }],
  }),
  pagos: () => ({
    text:
      `*Formas de pago*\n` +
      (CARD ? `• Tarjeta de crédito o débito Visa / Mastercard con PayPhone (pago seguro en la web).\n• Saldo de la app PayPhone.\n` : `• Por ahora no aceptamos tarjeta; muy pronto.\n`) +
      `• Transferencia o depósito bancario: un asesor te envía los datos. Con transferencia aplica la promo 2 × $50.\n\n` +
      `${CARD ? 'Pagar ahora en la web' : 'Haz tu pedido en la web'}: ${url('/carrito/')}`,
    buttons: [{ id: 'comprar', title: 'Comprar' }, { id: 'asesor', title: 'Hablar con asesor' }, { id: 'menu', title: 'Menú' }],
  }),
  whey: () => ({
    text:
      `*OVA PRO+ vs whey*\n` +
      `• OVA PRO+ no es un lácteo: 0 % lactosa y sin proteínas de leche. Útil si la whey te cae pesada.\n` +
      `• Proteína completa: trae los 9 aminoácidos esenciales; ≈3 g de leucina por scoop.\n` +
      `• Muy baja en grasa (1 %) y carbohidratos (4 %).\n` +
      `• La whey tiene algo más de leucina por gramo; ambas son proteínas de alta calidad.\n\n` +
      `Comparativa completa: ${url('/ova-vs-whey/')}`,
    buttons: [{ id: 'comprar', title: 'Comprar' }, { id: 'tabla', title: 'Tabla nutricional' }, { id: 'menu', title: 'Menú' }],
  }),
  alergia: () => ({
    text:
      `*Alérgenos*: OVA PRO+ es clara de huevo, así que *no es apta* para personas con alergia al huevo.\n` +
      `No contiene lácteos ni gluten como ingrediente. Si estás embarazada, tienes enfermedad renal u otra condición médica, consulta a tu médico o nutricionista antes de usar suplementos proteicos.`,
    buttons: [{ id: 'asesor', title: 'Hablar con asesor' }, { id: 'menu', title: 'Menú' }],
  }),
  sabor: () => ({
    text: `OVA PRO+ es *sin sabor*: no lleva endulzantes, saborizantes ni colorantes. Mézclala con fruta, cacao, café o en recetas. Recetas: ${url('/blog/recetas-con-proteina-de-huevo/')}`,
    buttons: [{ id: 'uso', title: 'Cómo se toma' }, { id: 'comprar', title: 'Comprar' }, { id: 'menu', title: 'Menú' }],
  }),
  almacenamiento: () => ({
    text: `Guarda la bolsa bien cerrada, en un lugar fresco y seco, lejos del sol y de olores fuertes. Una vez abierta, consúmela antes de un año.`,
    buttons: [{ id: 'menu', title: 'Menú' }],
  }),
  her: () => ({
    text: `*OVA HER* está en camino: la misma clara de huevo pura con una línea pensada para mujeres. Escribe *avísame* y te contamos apenas salga.`,
    buttons: [{ id: 'menu', title: 'Menú' }],
  }),
  kilo: () => ({
    text: `Por ahora solo tenemos la bolsa de *500 g*. Si quieres más cantidad, aprovecha la promo: 2 bolsas por $50 pagando por transferencia.`,
    buttons: [{ id: 'promo', title: 'Quiero la promo' }, { id: 'precios', title: 'Ver precios' }, { id: 'menu', title: 'Menú' }],
  }),
  avisame: () => ({ text: `¡Listo! Te escribimos cuando OVA HER esté disponible. 🙌`, handoff: false, tag: 'lista_ova_her' }),
  asesor: () => ({
    text: `Te comunico con una persona del equipo. Horario: ${site.hours}. Cuéntanos tu consulta y te respondemos lo antes posible.`,
    handoff: true,
  }),
  gracias: () => ({ text: `¡Con gusto! Si necesitas algo más, escribe *menú*. 💚` }),
};

function buy(id) {
  const p = P[id];
  return {
    text: `*${p.name}* — ${money(p.price)}\nPaga con tarjeta aquí: ${url('/carrito/?add=' + id)}\n\nSi prefieres transferencia, escribe *asesor* y te ayudamos a cerrar el pedido.`,
    cta: { url: url('/carrito/?add=' + id), label: 'Pagar con tarjeta' },
  };
}

// Orden importa: lo más específico primero.
const RULES = [
  ['tabla', /(^| )\/datos\b/],
  ['envios', /(^| )\/envio\b/],
  ['pagos', /(^| )\/pago\b/],
  ['asesor', /\b(asesor|humano|persona|agente|hablar con)/],
  ['kilo', /\b(1 ?kg|1000|un kilo|kilo)\b/],
  ['promo', /\b(promo|promocion|2 ?x ?50|2 por 50|dos por|2 bolsas|dos bolsas)/],
  ['buy_500', /\b(500 ?g?|medio kilo)\b/],
  ['avisame', /\bavisame\b/],
  ['her', /\b(ova her|her|mujer|mujeres)\b/],
  ['alergia', /\b(alergi|alergico|alergica|embaraz|renal|rinon)/],
  ['whey', /\b(whey|suero|lactosa|lacteo|leche|inflam|hinch|gases|digest)/],
  ['tabla', /\b(tabla|nutricion|macro|calori|aminoacid|leucina|bcaa|gramos de proteina|cuanta proteina tiene|datos nutri)/],
  ['uso', /\b(como (se )?(toma|usa|prepara|mezcla)|modo de uso|scoop|cuando tomar|dosis|cuantos scoops|receta)/],
  ['sabor', /\b(sabor|sabe|dulce|endulz|saboriz)/],
  ['envios', /\b(envio|envian|entrega|delivery|domicilio|servientrega|guia|provincia|ciudad|galapagos)/],
  ['pagos', /\b(pago|pagar|tarjeta|transferencia|deposito|payphone|efectivo)/],
  ['precios', /\b(precio|cuanto (cuesta|vale|es)|costo|valor|descuento|oferta|cupon|combo)/],
  ['comprar', /\b(comprar|compro|pedido|pedir|quiero|ordenar|me interesa)/],
  ['almacenamiento', /\b(guardar|almacen|caduc|vence|vencimiento|dura)/],
  ['gracias', /\b(gracias|genial|perfecto|ok gracias)\b/],
  ['menu', /\b(hola|buenas|buenos|menu|inicio|info|informacion|ayuda|opciones)\b/],
];

/** Devuelve la respuesta para un id de opción o un texto libre. null = no entendido. */
export function respond(input, { byId = false } = {}) {
  if (byId && I[input]) return { id: input, ...I[input]() };
  const t = normalize(input);
  if (!t) return { id: 'menu', ...I.menu() };
  for (const [id, re] of RULES) if (re.test(t)) return { id, ...I[id]() };
  return null;
}

export function fallback() {
  return { id: 'fallback', text: `No tengo una respuesta automática para eso. Elige una opción o escribe *asesor* para hablar con una persona.`, list: MENU };
}

// Base de conocimiento para el modo IA (opcional) del bot de WhatsApp.
export function knowledgeBase() {
  return [
    I.precios().text, I.tabla().text, I.uso().text, I.envios().text, I.pagos().text,
    I.whey().text, I.alergia().text, I.sabor().text, I.almacenamiento().text,
    `Producto: OVA PRO+, proteína de albúmina (clara) de huevo de gallina. Proceso: rotura mecánica de huevos, separación de la clara, desglucosado, deshidratado, pasteurizado y envasado. Composición por 100 g: 357,48 kcal; proteína 83,07 %; carbohidratos 4,05 %; grasa 1,00 %; cenizas 4,88 %; humedad 7,00 %.`,
    `Aminoácidos (g por 100 g de proteína): alanina 6,3; arginina 5,5; ác. aspártico 9,8; cisteína 2,5; ác. glutámico 12,6; glicina 3,7; histidina 2,5; isoleucina 5,4; leucina 9,0; lisina 7,2; metionina 3,1; fenilalanina 6,4; prolina 3,4; serina 6,3; treonina 4,4; triptófano 1,4; tirosina 3,3; valina 7,2.`,
    `Web: ${site.url}. Instagram: ${site.instagram}. Horario de atención humana: ${site.hours}.`,
  ].join('\n\n');
}
