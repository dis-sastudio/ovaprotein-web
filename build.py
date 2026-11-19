#!/usr/bin/env python3
"""Genera el sitio estático de OVA PRO+ en /public.

Uso:  python3 build.py
Edita data/catalog.json (precios, promos, envíos) y data/site.json (datos de marca)
y vuelve a ejecutar. No requiere dependencias externas.
"""
import json, html, os, re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
PUB = ROOT / "public"
CAT = json.loads((ROOT / "data/catalog.json").read_text(encoding="utf-8"))
SITE = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
from content import PAGES_CONTENT  # noqa: E402  (textos largos)

URL = SITE["url"].rstrip("/")
UPDATED = SITE["lastUpdated"]
P = {p["id"]: p for p in CAT["products"]}
e = html.escape


def money(c):
    return f"${c/100:,.2f}"


def jsonld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "</script>"


# ---------- Datos nutricionales ----------
PER100 = {"kcal": 357.48, "prot": 83.07, "carb": 4.05, "fat": 1.00, "ash": 4.88, "hum": 7.00}
SCOOP = CAT["scoop"]["grams"]
AMINO = [  # g por 100 g de proteína, esencial?
    ("Alanina", 6.3, False), ("Arginina", 5.5, False), ("Ácido aspártico", 9.8, False), ("Cisteína", 2.5, False),
    ("Ácido glutámico", 12.6, False), ("Glicina", 3.7, False), ("Histidina", 2.5, True), ("Isoleucina", 5.4, True),
    ("Leucina", 9.0, True), ("Lisina", 7.2, True), ("Metionina", 3.1, True), ("Fenilalanina", 6.4, True),
    ("Prolina", 3.4, False), ("Serina", 6.3, False), ("Treonina", 4.4, True), ("Triptófano", 1.4, True),
    ("Tirosina", 3.3, False), ("Valina", 7.2, True),
]
PS = CAT["scoop"]["proteinGrams"]
def per_scoop(pct):
    return pct / 100 * PS
EAA = sum(v for _, v, ess in AMINO if ess)
BCAA = 5.4 + 9.0 + 7.2
dec = lambda x, n=1: f"{x:.{n}f}".replace(".", ",")


def facts_panel(compact=False, title_tag="p"):
    sc = SCOOP / 100
    rows = [
        ("Energía", f"{round(PER100['kcal']*sc)} kcal", "big"),
        ("Proteína", f"{dec(PS)} g", "big"),
        ("Leucina", f"{dec(per_scoop(9.0))} g", "sub"),
        ("BCAA", f"{dec(per_scoop(BCAA))} g", "sub"),
        ("Carbohidratos", f"{dec(PER100['carb']*sc)} g", ""),
        ("Grasa", f"{dec(PER100['fat']*sc)} g", ""),
        ("Lactosa", "0 g", ""),
    ]
    dl = "".join(f'<div class="row {c}"><dt>{a}</dt><dd>{b}</dd></div>' for a, b, c in rows)
    return f'''<aside class="facts" aria-label="Información nutricional por scoop">
<{title_tag} class="facts-title">Información nutricional</{title_tag}>
<p class="serv">Por scoop de {SCOOP} g · {P["ova-pro-500"]["servings"]} scoops en 500 g</p>
<dl>{dl}</dl>
<p class="ingr"><strong>Ingredientes:</strong> clara de huevo.</p>
</aside>'''


def nutrition_table():
    sc = SCOOP / 100
    rows = [("Energía (kcal)", f"{dec(PER100['kcal'],2)}", f"{round(PER100['kcal']*sc)}"),
            ("Proteína (g)", dec(PER100['prot'], 2), dec(PS)),
            ("Carbohidratos (g)", dec(PER100['carb'], 2), dec(PER100['carb']*sc)),
            ("Grasa (g)", dec(PER100['fat'], 2), dec(PER100['fat']*sc)),
            ("Cenizas / minerales (g)", dec(PER100['ash'], 2), dec(PER100['ash']*sc)),
            ("Humedad (g)", dec(PER100['hum'], 2), dec(PER100['hum']*sc)),
            ("Lactosa (g)", "0", "0")]
    tr = "".join(f"<tr><th scope=row>{a}</th><td class=num>{b}</td><td class=num>{c}</td></tr>" for a, b, c in rows)
    return f'''<div class="table-wrap"><table><caption>Composición nutricional (valores referenciales del análisis del producto)</caption>
<thead><tr><th scope=col>Nutriente</th><th scope=col class=num>Por 100 g</th><th scope=col class=num>Por scoop ({SCOOP} g)</th></tr></thead><tbody>{tr}</tbody></table></div>'''


def amino_list():
    mx = max(v for _, v, _ in AMINO)
    li = "".join(
        f'<li><span class="{"ess" if ess else ""}">{n}{" *" if ess else ""}</span><span class="bar" aria-hidden="true"><i style="width:{v/mx*100:.0f}%"></i></span><b>{dec(v)} g</b></li>'
        for n, v, ess in sorted(AMINO, key=lambda x: -x[1]))
    return f'<ul class="amino" aria-label="Aminoácidos en gramos por 100 g de proteína">{li}</ul><p style="margin-top:1rem;font-size:.92rem">* Aminoácido esencial. Valores en gramos por cada 100 g de proteína. Esenciales: {dec(EAA)} g/100 g de proteína (≈{dec(per_scoop(EAA))} g por scoop).</p>'


# ---------- Iconos ----------
ICON_LOGO = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#10B981"/><path d="M20 7c-6 0-11 9.5-11 16.5S13.9 34 20 34s11-3.5 11-10.5S26 7 20 7z" fill="none" stroke="#1A1D1B" stroke-width="3"/><path d="M20 17v10M15 22h10" stroke="#1A1D1B" stroke-width="3" stroke-linecap="round"/></svg>'
ICON_CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>'
ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.9-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'

HILLS = '<svg class="hills" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true"><path d="M0 230 C 220 150 420 170 640 215 S 1060 140 1440 190 V420 H0Z" fill="#2F6A4F" opacity=".75"/><path d="M0 300 C 260 230 520 260 760 290 S 1180 230 1440 270 V420 H0Z" fill="#245C43"/><path d="M0 360 C 300 320 600 345 880 365 S 1260 330 1440 350 V420 H0Z" fill="#1A4A36"/></svg>'

NAV = [("/proteina-de-huevo-ova-pro/", "Producto"), ("/proteina-de-huevo/", "Proteína de huevo"), ("/ova-vs-whey/", "OVA vs whey"),
       ("/promociones/", "Promociones"), ("/blog/", "Blog")]


SOCIAL_SVG = {
    "instagram": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',
    "facebook": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4a20 20 0 0 0-2.2-.1c-2.2 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z"/></svg>',
    "tiktok": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.6c-1.4.1-2.7-.3-3.9-1v6.2c0 3.9-4.2 6.3-7.5 4.3-2.1-1.2-3-3.9-2.1-6.2.8-2.1 3-3.4 5.3-3.1v2.7c-.3-.1-.7-.1-1-.1-1.3.1-2.3 1.3-2.1 2.6.2 1.5 1.8 2.4 3.2 1.8.9-.4 1.4-1.2 1.4-2.2V3z"/></svg>',
    "whatsapp": None,
}


def social_links(cls="social"):
    items = [("instagram", "Instagram", SITE["instagram"]), ("facebook", "Facebook", SITE["facebook"]), ("tiktok", "TikTok", SITE["tiktok"])]
    a = "".join(f'<a href="{u}" target="_blank" rel="noopener" aria-label="OVA PRO+ en {n}">{SOCIAL_SVG[k]}</a>' for k, n, u in items if u)
    a += f'<a href="https://wa.me/{SITE["whatsapp"]}" target="_blank" rel="noopener" aria-label="OVA PRO+ en WhatsApp">{ICON_WA}</a>'
    return f'<div class="{cls}">{a}</div>'


def wa_url(text):
    from urllib.parse import quote
    return f"https://wa.me/{SITE['whatsapp']}?text={quote(text)}"


def org_schema():
    same = [u for u in (SITE["instagram"], SITE["tiktok"], SITE["facebook"]) if u]
    return {
        "@context": "https://schema.org", "@type": ["Organization", "OnlineStore"], "@id": URL + "/#org",
        "name": SITE["company"], "alternateName": [SITE["brand"], "OVA PRO", "OVA Nutrition Ecuador"],
        "url": URL + "/", "logo": URL + "/assets/img/logo-ova-pro-verde.jpg", "email": SITE["email"],
        "sameAs": same, "areaServed": {"@type": "Country", "name": "Ecuador"},
        "address": {"@type": "PostalAddress", "addressLocality": SITE["city"], "addressRegion": SITE["region"], "addressCountry": "EC"},
        "contactPoint": [{"@type": "ContactPoint", "contactType": "customer service", "telephone": "+" + SITE["whatsapp"],
                          "availableLanguage": "es", "areaServed": "EC", "url": f"https://wa.me/{SITE['whatsapp']}"}],
        "brand": {"@type": "Brand", "name": SITE["brand"]},
    }


def breadcrumb(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": URL + p} for i, (p, n) in enumerate(items)]}


def crumbs_html(items):
    parts = [f'<a href="{p}">{e(n)}</a>' if i < len(items) - 1 else f'<span aria-current="page">{e(n)}</span>' for i, (p, n) in enumerate(items)]
    return '<nav class="crumbs" aria-label="Ruta">' + " / ".join(parts) + "</nav>"


def layout(path, title, desc, body, schema=(), noindex=False, og="og-ova-pro.jpg", scripts=("app",), head_extra="", og_type="website", over=False):
    canon = URL + path
    nav = "".join(f'<a href="{p}"{" aria-current=page" if path.startswith(p) else ""}>{n}</a>' for p, n in NAV)
    sch = "".join(jsonld(s) for s in schema)
    js = "".join(f'<script type="module" src="/assets/js/{s}.mjs"></script>' for s in scripts)
    robots = "noindex, follow" if noindex else "index, follow, max-image-preview:large, max-snippet:-1"
    arcsa = f" Notificación sanitaria ARCSA: {e(SITE['arcsa'])}." if SITE["arcsa"] else ""
    return f'''<!doctype html>
<html lang="es-EC">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{canon}">
<meta name="robots" content="{robots}">
<link rel="alternate" hreflang="es-EC" href="{canon}">
<link rel="alternate" hreflang="x-default" href="{canon}">
<meta name="theme-color" content="#1A1D1B">
<meta property="og:type" content="{og_type}">
<meta property="og:locale" content="es_EC">
<meta property="og:site_name" content="{e(SITE['brand'])}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{URL}/assets/img/{og}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="geo.region" content="EC"><meta name="geo.placename" content="{e(SITE['city'])}">
<link rel="icon" href="/favicon.png" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/outfit-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/outfit-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css">
{head_extra}
{sch}
<!-- Analítica: pega aquí tu etiqueta de Google Analytics 4 / Meta Pixel -->
</head>
<body>
<a class="skip" href="#main">Saltar al contenido</a>
<div class="topbar">Promo: 2 OVA PRO+ por $50 ($25 c/u) pagando por transferencia. <a href="/promociones/">Ver promo</a></div>
<header class="header{' over' if over else ''}"><div class="wrap">
<a class="logo" href="/" aria-label="OVA PRO+ inicio"><img src="/assets/img/logo-ova-pro.webp" alt="OVA PRO+ inicio" width="244" height="142"></a>
<nav class="nav" id="nav" aria-label="Principal">{nav}</nav>
<div class="head-actions"><a class="btn btn-soft hide-sm" href="/calculadora-de-proteina/">Calcular proteína</a>
<a class="btn btn-dark cart-btn" href="/carrito/" data-open-cart aria-label="Abrir carrito">Carrito<span class="cart-count" aria-live="polite"></span></a>
<button class="menu-btn" aria-controls="nav" aria-expanded="false" aria-label="Abrir menú">{ICON_MENU}</button></div>
</div></header>
<main id="main">
{body}
</main>
<footer class="footer"><div class="wrap">
<div class="cols">
<div><a class="logo" href="/"><img src="/assets/img/logo-ova-pro.webp" alt="OVA PRO+" width="244" height="142"></a>
<p style="margin-top:1rem">Proteína de albúmina de huevo. Un solo ingrediente: clara de huevo. Hecha para entrenar fuerte y hecha en Ecuador para todo el país.</p>
<p><a href="{wa_url('Hola, tengo una consulta sobre OVA PRO+.')}">WhatsApp {e(SITE['whatsappDisplay'])}</a><br><a href="mailto:{SITE['email']}">{SITE['email']}</a><br>{e(SITE['hours'])}</p>{social_links()}</div>
<div><h2>Tienda</h2><ul><li><a href="/proteina-de-huevo-ova-pro/">OVA PRO+ 500 g</a></li><li><a href="/promociones/">Promociones</a></li><li><a href="/envios-y-pagos/">Envíos y pagos</a></li><li><a href="/carrito/">Carrito</a></li></ul></div>
<div><h2>Aprende</h2><ul><li><a href="/proteina-de-huevo/">Guía de proteína de huevo</a></li><li><a href="/ova-vs-whey/">OVA PRO+ vs whey</a></li><li><a href="/calculadora-de-proteina/">Calculadora de proteína</a></li><li><a href="/blog/">Blog</a></li><li><a href="/preguntas-frecuentes/">Preguntas frecuentes</a></li></ul></div>
<div><h2>Marca</h2><ul><li><a href="/nosotros/">Nosotros</a></li><li><a href="/contacto/">Contacto</a></li><li><a href="/legal/terminos/">Términos</a></li><li><a href="/legal/privacidad/">Privacidad</a></li><li><a href="/legal/cambios-y-devoluciones/">Cambios y devoluciones</a></li></ul></div>
</div>
<p class="legal">© {date.today().year} {e(SITE['company'])}. OVA PRO+ es un suplemento alimenticio; no reemplaza una alimentación variada ni el consejo de un profesional de la salud. Contiene huevo.{arcsa}{" Pagos con tarjeta procesados de forma segura por PayPhone." if SITE.get("cardPayments") else ""}</p>
</div></footer>
<div class="drawer" id="cart-drawer" aria-hidden="true">
<div class="scrim" data-close-cart></div>
<div class="panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
<header><h2 id="drawer-title">Tu carrito</h2><button class="close" data-close-cart aria-label="Cerrar carrito">×</button></header>
<div class="items"></div>
<footer><p class="free-bar"></p><div class="sum total"><span>Subtotal</span><span data-subtotal></span></div>
<p style="font-size:.88rem;color:var(--muted);margin:.2rem 0 .8rem">IVA incluido. El envío se calcula en el siguiente paso y no está incluido.</p>
<a class="btn btn-primary btn-block" href="/carrito/">Finalizar compra</a></footer>
</div></div>
<button class="wa-fab" aria-controls="wa-chat" aria-expanded="false" aria-label="Abrir asistente de OVA PRO+">{ICON_WA}</button>
<section class="wa-chat" id="wa-chat" aria-label="Asistente OVA PRO+">
<header><span class="av"><img src="/assets/img/apple-touch-icon.png" alt="" width="38" height="38"></span><div><strong>OVA Nutrition</strong><small>Asistente · responde al instante</small></div><button aria-label="Cerrar asistente">×</button></header>
<div class="wa-log" aria-live="polite"></div>
<div class="wa-quick"></div>
<form class="wa-form"><label class="sr-only" for="wa-in">Escribe tu pregunta</label><input id="wa-in" autocomplete="off" placeholder="Escribe tu pregunta…"><button>Enviar</button></form>
</section>
{js}
</body></html>'''


# ---------- Bloques reutilizables ----------
def promo_line(pid):
    pr = [x for x in CAT.get("promotions", []) if x["productId"] == pid]
    return "".join(f'<p class="promo-line">{e(x["label"])}. <a href="{wa_url("Hola, quiero la promo " + x["label"] + ".")}">Pedir por WhatsApp</a></p>' for x in pr)


def product_card(pid, featured=False, cta_add=True):
    p = P[pid]
    per = f'{money(round(p["price"]/p["servings"]))} por scoop · {p["servings"]} scoops' if p["servings"] else p["short"]
    cmp_ = f'<small>por separado {money(p["compareAt"])}</small>' if p.get("compareAt") else ""
    tag = f'<span class="tag{" promo" if p["promo"] else ""}">{e(p["tag"])}</span>' if p["tag"] else ""
    return f'''<article class="product{" featured" if featured else ""}">
<div class="shot"><img{' class="cut"' if p["image"].startswith("ova-pro-bolsa") else ""} src="/assets/img/{p["image"]}-sm.webp" alt="{e(p["name"])}: proteína de clara de huevo OVA PRO+" width="360" height="360" loading="lazy"></div>
<div class="body">{tag}<h3>{e(p["name"])}</h3><p class="meta">{e(p["short"])}</p>
<p class="price">{money(p["price"])}{cmp_}</p><p class="per">{per}</p>{promo_line(pid)}
<button class="btn btn-primary" data-add="{pid}">Agregar al carrito</button></div></article>'''


def faq_block(items, heading="Preguntas frecuentes", hid="faq"):
    d = "".join(f"<details><summary>{e(q)}</summary><p>{a}</p></details>" for q, a in items)
    schema = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub("<[^>]+>", "", a)}} for q, a in items]}
    return f'<h2 id="{hid}">{heading}</h2><div class="faq">{d}</div>', schema


def article_schema(path, title, desc, image="ova-pro-500g-clara-de-huevo.jpg", published="2026-11-17"):
    a = {"@context": "https://schema.org", "@type": "Article", "headline": title, "description": desc,
         "image": f"{URL}/assets/img/{image}", "datePublished": published, "dateModified": UPDATED,
         "inLanguage": "es-EC", "mainEntityOfPage": URL + path,
         "author": {"@type": "Organization", "name": SITE["company"], "url": URL + "/nosotros/"},
         "publisher": {"@id": URL + "/#org"}}
    if SITE.get("reviewer"):
        a["reviewedBy"] = {"@type": "Person", "name": SITE["reviewer"]}
    return a


def page_head(crumbs, h1, lead="", byline=False):
    by = f'<p class="byline">Por el equipo de {e(SITE["company"])}{" · Revisado por " + e(SITE["reviewer"]) if SITE.get("reviewer") else ""}. Actualizado el {UPDATED[8:10]}/{UPDATED[5:7]}/{UPDATED[:4]}.</p>' if byline else ""
    return f'<section class="page-head">{HILLS}<div class="wrap">{crumbs_html(crumbs)}<h1>{h1}</h1>{f"<p class=lead>{lead}</p>" if lead else ""}{by}</div></section>'


CTX = dict(social_links=social_links, promo_line=promo_line, HILLS=HILLS, P=P, CAT=CAT, SITE=SITE, URL=URL, money=money, facts_panel=facts_panel, nutrition_table=nutrition_table,
           amino_list=amino_list, product_card=product_card, faq_block=faq_block, article_schema=article_schema,
           page_head=page_head, breadcrumb=breadcrumb, org_schema=org_schema, wa_url=wa_url, e=e, dec=dec,
           per_scoop=per_scoop, EAA=EAA, BCAA=BCAA, PS=PS, SCOOP=SCOOP, PER100=PER100, ICON_WA=ICON_WA, UPDATED=UPDATED)


def write(path, content):
    out = PUB / (path.strip("/") + "/index.html" if path not in ("/", "/404.html") else ("index.html" if path == "/" else "404.html"))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(content, encoding="utf-8")


def merchant_feed():
    """Feed RSS 2.0 para Google Merchant Center (se publica en /merchant-feed.xml)."""
    items = []
    for p in CAT["products"]:
        if not p.get("inStock"):
            continue
        link = URL + "/proteina-de-huevo-ova-pro/"
        desc = (f"Proteína de albúmina (clara) de huevo en polvo, sin sabor. Un solo ingrediente: clara de huevo. "
                f"{dec(CAT['scoop']['proteinGrams'])} g de proteína por scoop de {CAT['scoop']['grams']} g, 83 % proteína, 0 % lactosa. "
                f"Bolsa de {p['sizeGrams']} g, {p['servings']} scoops. Contiene huevo.")
        items.append(f"""<item>
<g:id>{p['sku']}</g:id>
<g:title>{e(p['name'])} Proteína de clara de huevo sin sabor</g:title>
<g:description>{e(desc)}</g:description>
<g:link>{link}</g:link>
<g:image_link>{URL}/assets/img/{p['image']}.jpg</g:image_link>
<g:additional_image_link>{URL}/assets/img/ova-pro-500g-clara-de-huevo.jpg</g:additional_image_link>
<g:availability>in_stock</g:availability>
<g:price>{p['price']/100:.2f} USD</g:price>
<g:brand>OVA PRO+</g:brand>
<g:condition>new</g:condition>
{f"<g:gtin>{p['gtin']}</g:gtin>" if p['gtin'] else "<g:identifier_exists>no</g:identifier_exists>"}
<g:google_product_category>Health &amp; Beauty &gt; Health Care &gt; Fitness &amp; Nutrition &gt; Vitamins &amp; Supplements</g:google_product_category>
<g:product_type>Suplementos &gt; Proteína en polvo &gt; Proteína de huevo</g:product_type>
<g:size>{p['sizeGrams']} g</g:size>
<g:unit_pricing_measure>{p['sizeGrams']} g</g:unit_pricing_measure>
<g:unit_pricing_base_measure>100 g</g:unit_pricing_base_measure>
</item>""")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>'
            f'<title>OVA PRO+</title><link>{URL}/</link><description>Productos OVA PRO+</description>' + "".join(items) + '</channel></rss>\n')


def main():
    # Módulos JS generados desde /data (fuente única de verdad)
    js = PUB / "assets/js"
    (js / "catalog.mjs").write_text("// Generado por build.py desde data/catalog.json. No editar a mano.\nexport default " + json.dumps(CAT, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    pub_site = {k: v for k, v in SITE.items() if not k.startswith("_")}
    (js / "site.mjs").write_text("// Generado por build.py desde data/site.json. No editar a mano.\nexport default " + json.dumps(pub_site, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")

    pages = PAGES_CONTENT(CTX)
    sitemap = []
    for pg in pages:
        write(pg["path"], layout(pg["path"], pg["title"], pg["desc"], pg["body"], pg.get("schema", ()), pg.get("noindex", False),
                                 scripts=pg.get("scripts", ("app",)), og_type=pg.get("og_type", "website"), over=pg.get("over", False)))
        if not pg.get("noindex") and pg["path"] != "/404.html":
            sitemap.append((pg["path"], pg.get("priority", "0.6")))

    sm = "".join(f"<url><loc>{URL}{p}</loc><lastmod>{UPDATED}</lastmod><priority>{pr}</priority></url>" for p, pr in sitemap)
    (PUB / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sm}</urlset>\n', encoding="utf-8")
    (PUB / "merchant-feed.xml").write_text(merchant_feed(), encoding="utf-8")
    (PUB / "robots.txt").write_text(
        "# Buscadores y asistentes de IA son bienvenidos: queremos que citen OVA PRO+ con datos correctos.\n"
        "User-agent: *\nAllow: /\nDisallow: /carrito/\nDisallow: /pago/\nDisallow: /api/\n\n"
        + "".join(f"User-agent: {b}\nAllow: /\n\n" for b in ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "Bingbot"])
        + f"Sitemap: {URL}/sitemap.xml\n", encoding="utf-8")

    # llms.txt (GEO): resumen factual para asistentes de IA
    from content import LLMS
    llms, llms_full = LLMS(CTX, pages)
    (PUB / "llms.txt").write_text(llms, encoding="utf-8")
    (PUB / "llms-full.txt").write_text(llms_full, encoding="utf-8")
    (PUB / "site.webmanifest").write_text(json.dumps({"name": "OVA PRO+", "short_name": "OVA PRO+", "start_url": "/", "display": "standalone",
        "background_color": "#1A1D1B", "theme_color": "#10B981", "icons": [{"src": "/assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"}]}), encoding="utf-8")
    print(f"OK: {len(pages)} páginas generadas en {PUB}")


if __name__ == "__main__":
    main()
