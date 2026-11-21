"""Textos y estructura de cada página. Editar aquí el contenido SEO/GEO."""
import re
from datetime import date


def PAGES_CONTENT(c):
    P, CAT, SITE, URL, money, e, dec = c["P"], c["CAT"], c["SITE"], c["URL"], c["money"], c["e"], c["dec"]
    PS, SCOOP, per_scoop, EAA, BCAA = c["PS"], c["SCOOP"], c["per_scoop"], c["EAA"], c["BCAA"]
    wa = c["wa_url"]
    p500 = P["ova-pro-500"]
    CARD = bool(SITE.get("cardPayments"))
    PROMO = CAT["promotions"][0]
    promo_price = money(PROMO["unitPrice"] * PROMO["minQty"])
    ship_nat = money(CAT["shipping"]["zones"][1]["price"])
    leu = dec(per_scoop(9.0))
    kcal_sc = round(c["PER100"]["kcal"] * SCOOP / 100)
    per10_500 = money(round(p500["price"] / (500 * 0.8307) * 10))
    per10_promo = money(round(PROMO["unitPrice"] / (500 * 0.8307) * 10))
    pages = []
    ORG = c["org_schema"]()
    BC = c["breadcrumb"]

    SRC = {
        "issn": '<a href="https://doi.org/10.1186/s12970-017-0177-8" rel="noopener">Jäger R, et al. International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017;14:20.</a>',
        "matsuoka": '<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6732637/" rel="noopener">Matsuoka R, et al. J Nutr Metab. 2019;2019:5475302 (absorción, PDCAAS y DIAAS de proteínas de clara de huevo y whey).</a>',
        "kashyap": '<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6250983/" rel="noopener">Kashyap S, et al. Am J Clin Nutr. 2018 (digestibilidad ileal de clara de huevo, huevo entero y carne con isótopos estables en humanos).</a>',
        "vanvliet": '<a href="https://doi.org/10.3945/ajcn.117.159855" rel="noopener">van Vliet S, et al. Consumption of whole eggs promotes greater stimulation of postexercise muscle protein synthesis than consumption of isonitrogenous amounts of egg whites in young men. Am J Clin Nutr. 2017;106:1401–1412.</a>',
        "fao": '<a href="https://www.fao.org/3/i3124e/i3124e.pdf" rel="noopener">FAO. Dietary protein quality evaluation in human nutrition. FAO Food and Nutrition Paper 92. 2013.</a>',
        "evenepoel": '<a href="https://pubmed.ncbi.nlm.nih.gov/9772141/" rel="noopener">Evenepoel P, et al. Digestibility of cooked and raw egg protein in humans as assessed by stable isotope techniques. J Nutr. 1998;128(10):1716–1722.</a>',
        "antonio": '<a href="https://doi.org/10.1155/2016/9104792" rel="noopener">Antonio J, et al. A High Protein Diet Has No Harmful Effects: A One-Year Crossover Study in Resistance-Trained Males. J Nutr Metab. 2016;2016:9104792.</a>',
        "lactosa_ec": '<a href="https://www.primicias.ec/sociedad/leche-proteina-lactosa-malestar-estomacal-investigacion-vacas-gen-124659/" rel="noopener">Primicias. ¿Le cae mal la leche? Podría no ser intolerante a la lactosa (cita al Centro de la Industria Láctea de Ecuador).</a>',
        "huevo_ec": '<a href="https://www.primicias.ec/economia/precio-huevos-cubeta-octubre-ecuador-135530/" rel="noopener">Primicias. El precio de los huevos baja unos USD 0,50 por cubeta en octubre de 2026.</a>',
    }

    def sources(*keys):
        return '<h2 id="fuentes">Fuentes</h2><ol class="sources">' + "".join(f"<li>{SRC[k]}</li>" for k in keys) + "</ol>"

    # ================= INICIO =================
    home_faq = [
        ("¿Qué es OVA PRO+?", f"Es proteína de albúmina de huevo en polvo: clara de huevo de gallina deshidratada y pasteurizada, sin otros ingredientes. Aporta {dec(PS)} g de proteína por porción de {SCOOP} g (4 scoops de 8 g)."),
        ("¿OVA PRO+ tiene lactosa?", "No. Es clara de huevo, no un lácteo: 0 % lactosa y sin proteínas de leche. Es una alternativa para quienes no toleran bien la whey."),
        ("¿Tiene sabor?", "No. No lleva endulzantes, saborizantes ni colorantes, por eso puedes mezclarla con fruta, café, avena o usarla en recetas."),
        ("¿Cuánto cuesta OVA PRO+ en Ecuador?", f"OVA PRO+ 500 g cuesta {money(p500['price'])}, IVA incluido. En promoción, 2 bolsas cuestan {promo_price} ({money(PROMO['unitPrice'])} cada una) pagando por transferencia. El envío se cobra aparte según tu ciudad."),
        ("¿Cómo pago?", "Con tarjeta de crédito o débito Visa o Mastercard a través de PayPhone, con saldo PayPhone, o por transferencia coordinando por WhatsApp." if CARD else f"Por transferencia o depósito bancario. Haces tu pedido en el carrito o por WhatsApp y te enviamos los datos. Con transferencia aplica la promo de 2 bolsas por {promo_price}."),
        ("¿Quién no debería tomarla?", "Personas con alergia al huevo. Si estás embarazada, tienes enfermedad renal u otra condición médica, consulta a tu médico o nutricionista antes de usar suplementos proteicos."),
    ]
    fq_html, fq_schema = c["faq_block"](home_faq)
    ARROW = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>'
    IC = {
        "full": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6.5 6.5 17.5 17.5M4 10V4h6M20 14v6h-6M3 21l4-4M21 3l-4 4"/></svg>',
        "milk": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3h8v3l2 3v12H6V9l2-3z"/><path d="M4 4l16 16"/></svg>',
        "one": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3c-4 0-7 6-7 10.5S8 21 12 21s7-3 7-7.5S16 3 12 3z"/><path d="M12 10v6"/></svg>',
    }
    home = f'''
<section class="hero">
<span class="mist-l" aria-hidden="true"></span><span class="mist-r" aria-hidden="true"></span>
{c["HILLS"]}
<div class="hero-grid">
<h1><span class="big">Proteína pura</span><span class="script">de huevo</span></h1>
<div class="hero-bag">
<picture><source media="(max-width:600px)" srcset="/assets/img/ova-pro-bolsa-sm.webp"><img src="/assets/img/ova-pro-bolsa-lg.webp" alt="Bolsa kraft de OVA PRO+ 500 g, proteína de albúmina de huevo" width="409" height="668" fetchpriority="high"></picture>
<a class="chip chip-a" href="/proteina-de-huevo-ova-pro/"><img src="/assets/img/ova-pro-batido-gimnasio-sm.webp" alt="" width="44" height="44">OVA PRO+ sin sabor<br>{dec(PS)} g por porción</a>
</div>
<p class="hero-note">Clara de huevo, nada más. Para entrenar fuerte sin pelearte con los lácteos.</p>
<div class="hero-side"><div class="ph"><img src="/assets/img/atleta-ova-pro-sm.webp" alt="Atleta preparando su batido de OVA PRO+" width="480" height="360"><a class="play" href="#proceso"><i></i>Cómo se hace</a></div>
<p>De huevos de gallina a tu shaker en cinco pasos.</p></div>
<div class="hero-cards">
<a class="hcard c1" href="/proteina-de-huevo-ova-pro/#nutricion"><h2>Por porción</h2><p>Proteína completa con los 9 aminoácidos esenciales.</p>{ARROW}
<dl><dt>{dec(PS)} g</dt><dd>proteína</dd><dt>{leu} g</dt><dd>leucina</dd><dt>{kcal_sc}</dt><dd>kcal</dd></dl></a>
<a class="hcard c2" href="/ova-vs-whey/"><h2>0 % lactosa</h2><p>Sin suero de leche. Una alternativa si la whey te cae pesada.</p>{ARROW}<span class="egg" aria-hidden="true"></span></a>
<div class="hero-pitch"><p>Proteína de albúmina de huevo con un solo ingrediente, 83 % de proteína y envíos a todo Ecuador.</p>
<div class="ctas"><a class="btn btn-primary" href="/proteina-de-huevo-ova-pro/">Comprar desde {money(p500['price'])}</a><a class="btn btn-soft" href="#precios">Ver precios</a></div></div>
</div>
</div>
</section>

<div class="strip-wrap"><div class="wrap"><ul class="strip strip-ul">
<li><span class="ic">{IC["full"]}</span><div><strong>Proteína completa</strong><span>Los 9 aminoácidos esenciales y unos {leu} g de leucina por porción (4 scoops).</span></div></li>
<li><span class="ic">{IC["milk"]}</span><div><strong>Cero lácteos</strong><span>0 % lactosa y sin proteína de leche. Ligera para tu digestión.</span></div></li>
<li><span class="ic">{IC["one"]}</span><div><strong>Un ingrediente</strong><span>Clara de huevo pasteurizada. Sin azúcar, saborizantes ni rellenos.</span></div></li>
</ul></div></div>

<section class="section"><div class="wrap blob-split">
<div class="blob"><img src="/assets/img/ova-pro-bolsa-lg.webp" alt="OVA PRO+ 500 g" width="409" height="668" loading="lazy"></div>
<div>
<h2>La proteína que tu cuerpo reconoce</h2>
<p class="lead">La albúmina es la parte del huevo que concentra la proteína. Al quitarle el agua obtienes un polvo con 83 % de proteína, casi sin grasa (1 %) ni carbohidratos (4 %).</p>
<p>No tiene sabor ni endulzantes, así que la llevas a tu terreno: batidos, café frío, avena o pancakes.</p>
<p><a class="btn btn-dark" href="/proteina-de-huevo-ova-pro/">Comprar OVA PRO+</a></p>
</div></div></section>

<section class="section mist" id="proceso"><div class="wrap">
<h2>Así llega a tu shaker</h2>
<p class="lead">Del huevo de gallina al polvo, sin añadir nada.</p>
<ol class="steps">
<li><strong>Rotura y separación</strong><span>Huevos de gallina se rompen de forma mecánica y se separa la clara.</span></li>
<li><strong>Desglucosado</strong><span>Se retira la glucosa natural de la clara para que el polvo sea estable.</span></li>
<li><strong>Deshidratado</strong><span>La clara se seca hasta quedar en polvo con 7 % de humedad.</span></li>
<li><strong>Envasado</strong><span>Se empaca en la bolsa kraft de 500 g.</span></li>
<li><strong>Pasteurizado</strong><span>Tratamiento térmico para la seguridad del producto.</span></li>
</ol>
</div></section>

<section class="section white" id="precios"><div class="wrap">
<div class="offer">
<div class="offer-shot"><img src="/assets/img/ova-pro-bolsa-lg.webp" alt="OVA PRO+ 500 g" width="409" height="668" loading="lazy"></div>
<div class="offer-opt">
<h2>OVA PRO+ 500 g</h2>
<p class="lead">Precios con IVA incluido. El envío se cobra aparte según tu ciudad.</p>
<div class="opts">
<div class="opt"><h3>1 bolsa</h3><p class="price">{money(p500['price'])}</p><p class="per">{p500["servings"]} porciones · {"tarjeta o transferencia" if CARD else "pago por transferencia"}</p><button class="btn btn-primary" data-add="ova-pro-500">Agregar al carrito</button></div>
<div class="opt hot"><span class="tag promo">Promo</span><h3>2 bolsas</h3><p class="price">{promo_price}<small>{money(PROMO['unitPrice'])} c/u</small></p><p class="per">Solo pagando por transferencia</p><a class="btn btn-wa" href="{wa(f"Hola, quiero la promo de 2 OVA PRO+ por {promo_price} por transferencia.")}">{c["ICON_WA"]} Pedir la promo</a></div>
</div></div></div>
</div></section>

<section class="section dark"><div class="wrap">
<div class="split top"><div>
<h2>Una porción, {dec(PS)} gramos de proteína</h2>
<p class="lead">La clara de huevo es proteína completa: trae los 9 aminoácidos esenciales. En cada porción (4 scoops) hay unos {leu} g de leucina, el aminoácido que más se asocia con activar la síntesis de proteína muscular.</p>
<p>La International Society of Sports Nutrition sugiere dosis de 20–40 g de proteína de alta calidad con 0,7–3 g de leucina por toma. Una porción de OVA PRO+ entra en ese rango.</p>
<p><a href="/blog/leucina-aminoacidos-clara-de-huevo/">Ver el perfil de aminoácidos completo</a></p>
</div><div>{c["amino_list"]()}</div></div>
<ul class="figures"><li><strong>{dec(PS)} g</strong><span>proteína por porción</span></li><li><strong>{kcal_sc}</strong><span>kcal por porción</span></li><li><strong>{dec(per_scoop(EAA))} g</strong><span>aminoácidos esenciales</span></li><li><strong>0 g</strong><span>lactosa</span></li></ul>
</div></section>

<section class="section"><div class="wrap">
<div class="split"><div>
<h2>¿La whey te cae pesada?</h2>
<p class="lead">La whey sale de la leche. OVA PRO+ sale del huevo. Si la lactosa o la proteína láctea te generan molestias, la clara de huevo es la alternativa animal más directa.</p>
<a class="btn btn-ghost" href="/ova-vs-whey/">Ver la comparativa completa</a>
</div>
<div class="table-wrap"><table><caption>Resumen por cada 100 g de producto</caption><thead><tr><th scope=col></th><th scope=col>OVA PRO+</th><th scope=col>Whey concentrada típica</th></tr></thead>
<tbody><tr><th scope=row>Origen</th><td>Clara de huevo</td><td>Suero de leche</td></tr>
<tr><th scope=row>Lactosa</th><td class="yes">0 g</td><td>Variable, suele tener</td></tr>
<tr><th scope=row>Proteína</th><td>83 g</td><td>70–80 g</td></tr>
<tr><th scope=row>Aminoácidos esenciales</th><td class="yes">Los 9</td><td class="yes">Los 9</td></tr>
<tr><th scope=row>Ingredientes</th><td>1</td><td>Suele llevar saborizantes y endulzantes</td></tr></tbody></table></div>
</div></div></section>

<section class="section kraft"><div class="wrap split">
<div><h2>¿Cuánta proteína necesitas?</h2><p class="lead">Escribe tu peso y tu meta. La calculadora te dice tu rango diario, cuánto por comida y cuántas porciones de OVA PRO+ te faltan.</p><a class="btn btn-primary" href="/calculadora-de-proteina/">Abrir la calculadora</a></div>
<div><ul class="list-check"><li>Para ganar músculo: 1,6–2,2 g por kilo al día.</li><li>Para definir sin perder músculo: 2,3–3,1 g por kilo.</li><li>Por comida: unos 0,25–0,4 g por kilo.</li></ul><p style="font-size:.9rem">Rangos de la International Society of Sports Nutrition y la literatura que cita.</p></div>
</div></section>

<section class="section"><div class="wrap split">
<div><img src="/assets/img/atleta-ova-pro-lg.webp" alt="Atleta con la bolsa de OVA PRO+ y el shaker verde" width="907" height="1125" loading="lazy"></div>
<div><h2>Pensada para quien entrena en serio</h2>
<ul class="list-check">
<li><strong>Intolerancia a la lactosa o a la proteína de leche.</strong> Proteína animal completa sin lácteos.</li>
<li><strong>Etapas de definición.</strong> Mucha proteína con muy poca grasa y carbohidrato.</li>
<li><strong>Cocina fitness.</strong> Sin sabor: va en pancakes, avena, waffles y batidos.</li>
<li><strong>Etiquetas cortas.</strong> Si quieres saber exactamente qué comes, aquí es un ingrediente.</li>
</ul>
<p>¿Buscas una versión pensada para mujeres? <strong>OVA HER</strong> viene en camino. <a href="{wa('Hola, avísenme cuando salga OVA HER.')}">Avísame por WhatsApp</a>.</p>
</div></div></section>

<section class="section dark"><div class="wrap split">
<div><h2>Pregunta por WhatsApp</h2><p class="lead">Nuestro asistente responde al instante precios, envíos, tabla nutricional y cómo se toma. Si necesitas a una persona, te pasa con el equipo.</p>
<p><a class="btn btn-wa" href="{wa('Hola, quiero información de OVA PRO+.')}">{c["ICON_WA"]} Escribir por WhatsApp</a></p>
<p style="margin-top:1.5rem">O síguenos como @ovaprotein</p>{c["social_links"]()}</div>
<div><img src="/assets/img/whatsapp-ova-nutrition-lg.webp" alt="Conversación con el asistente de OVA Nutrition en WhatsApp" width="960" height="536" loading="lazy"></div>
</div></section>

<section class="section"><div class="wrap">{fq_html}</div></section>'''
    website = {"@context": "https://schema.org", "@type": "WebSite", "@id": URL + "/#web", "url": URL + "/", "name": "OVA PRO+", "inLanguage": "es-EC", "publisher": {"@id": URL + "/#org"}}
    pages.append(dict(path="/", title="OVA PRO+ | Proteína de clara de huevo en Ecuador, 0 % lactosa",
                      desc=f"Proteína de clara de huevo OVA PRO+: {dec(PS)} g por porción, 83 % proteína, 0 % lactosa, un ingrediente. 500 g a {money(p500['price'])}. Envíos a todo Ecuador.",
                      body=home, schema=[ORG, website, fq_schema], priority="1.0", over=True))

    # ================= PRODUCTO =================
    path = "/proteina-de-huevo-ova-pro/"
    gallery = [("ova-pro-500g-clara-de-huevo", "Bolsa OVA PRO+ 500 g con shaker, huevos y frutas"),
               ("ova-pro-batido-gimnasio", "Preparando un batido de OVA PRO+ en la cocina"),
               ("atleta-ova-pro", "Atleta sosteniendo OVA PRO+ y el shaker verde"),
               ("ova-pro-instagram", "OVA PRO+ en redes sociales")]
    thumbs = "".join(f'<button type="button" aria-pressed="{str(i==0).lower()}" data-src="/assets/img/{n}-lg.webp" data-alt="{e(a)}" aria-label="Ver imagen: {e(a)}"><img src="/assets/img/{n}-sm.webp" alt="" width="120" height="120" loading="lazy"></button>' for i, (n, a) in enumerate(gallery))
    ship_detail = {"@type": "OfferShippingDetails", "shippingRate": {"@type": "MonetaryAmount", "value": CAT["shipping"]["zones"][1]["price"] / 100, "currency": "USD"},
                   "shippingDestination": {"@type": "DefinedRegion", "addressCountry": "EC"},
                   "deliveryTime": {"@type": "ShippingDeliveryTime", "handlingTime": {"@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY"},
                                    "transitTime": {"@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY"}}}
    ret = {"@type": "MerchantReturnPolicy", "applicableCountry": "EC", "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
           "merchantReturnDays": 7, "returnMethod": "https://schema.org/ReturnByMail", "returnFees": "https://schema.org/FreeReturn",
           "merchantReturnLink": URL + "/legal/cambios-y-devoluciones/"}

    def variant(p):
        return {"@type": "Product", "@id": URL + path + "#" + p["id"], "name": p["name"], "sku": p["sku"], **({"gtin": p["gtin"]} if p["gtin"] else {}),
                "image": [f"{URL}/assets/img/{p['image']}.jpg"], "size": f"{p['sizeGrams']} g",
                "weight": {"@type": "QuantitativeValue", "value": p["sizeGrams"], "unitCode": "GRM"},
                "offers": {"@type": "Offer", "url": URL + path + "?v=" + p["id"], "price": f"{p['price']/100:.2f}", "priceCurrency": "USD",
                           "availability": "https://schema.org/InStock" if p["inStock"] else "https://schema.org/OutOfStock",
                           "itemCondition": "https://schema.org/NewCondition", "seller": {"@id": URL + "/#org"},
                           "shippingDetails": ship_detail, "hasMerchantReturnPolicy": ret}}
    product_schema = {"@context": "https://schema.org", "@type": "ProductGroup", "@id": URL + path + "#producto",
                      "name": "OVA PRO+ Proteína de albúmina de huevo", "productGroupID": "OVAPRO",
                      "description": f"Proteína de clara de huevo en polvo, sin sabor. {dec(PS)} g de proteína por porción de {SCOOP} g (4 scoops), 83 % proteína, 0 % lactosa. Ingrediente: clara de huevo.",
                      "brand": {"@type": "Brand", "name": "OVA PRO+"}, "manufacturer": {"@id": URL + "/#org"}, "variesBy": ["https://schema.org/size"],
                      "image": [f"{URL}/assets/img/{n}.jpg" for n, _ in gallery], "category": "Suplementos alimenticios > Proteína en polvo",
                      "additionalProperty": [
                          {"@type": "PropertyValue", "name": "Proteína por 100 g", "value": 83.07, "unitText": "g"},
                          {"@type": "PropertyValue", "name": "Proteína por porción (32 g, 4 scoops)", "value": PS, "unitText": "g"},
                          {"@type": "PropertyValue", "name": "Lactosa", "value": 0, "unitText": "g"},
                          {"@type": "PropertyValue", "name": "Ingredientes", "value": "Clara de huevo"},
                          {"@type": "PropertyValue", "name": "Sabor", "value": "Sin sabor"}],
                      "hasVariant": [variant(p500)]}
    pdp_faq = [
        ("¿Cuántas porciones trae cada bolsa?", f"El scoop que viene en la bolsa es de 8 g. Una porción son 4 scoops ({SCOOP} g de polvo, {dec(PS)} g de proteína). La bolsa de 500 g rinde unas {p500['servings']} porciones."),
        ("¿Cuánto dura una bolsa?", "Con una porción al día te dura unas dos semanas. Con la promo de 2 bolsas tienes para casi un mes. Una vez abierta, consúmela antes de un año."),
        ("¿Cómo funciona la promo 2 por $50?", f"Llevas 2 bolsas de OVA PRO+ 500 g por {promo_price} ({money(PROMO['unitPrice'])} cada una) pagando por transferencia. Pídela por WhatsApp o elige “Transferencia” en el carrito. Con tarjeta el precio es {money(p500['price'])} por bolsa. El envío no está incluido."),
        ("¿Se puede cocinar con OVA PRO+?", "Sí. Es clara de huevo, así que funciona en pancakes, waffles, avena horneada y masas. El calor no le quita el valor proteico."),
        ("¿Contiene alérgenos?", "Contiene huevo. No contiene lácteos ni gluten como ingredientes."),
    ]
    pfq_html, pfq_schema = c["faq_block"](pdp_faq, "Dudas sobre el producto", "dudas")
    pdp = f'''
<section class="section" style="padding-top:2rem"><div class="wrap">
<nav class="crumbs" aria-label="Ruta" style="color:var(--muted)"><a href="/">Inicio</a> / <span aria-current="page">OVA PRO+</span></nav>
<div class="pdp">
<div class="gallery"><img class="main" src="/assets/img/{gallery[0][0]}-lg.webp" alt="{e(gallery[0][1])}" width="960" height="960" fetchpriority="high"><div class="thumbs">{thumbs}</div></div>
<div>
<h1 style="font-size:clamp(2.4rem,5vw,3.8rem)">OVA PRO+ proteína de albúmina de huevo</h1>
<p class="lead">Clara de huevo en polvo, sin sabor. {dec(PS)} g de proteína por porción (4 scoops), 83 % proteína, 0 % lactosa y un solo ingrediente.</p>
<p class="price" data-variant-price>{money(p500['price'])}</p>
<p class="per" data-variant-per>{money(round(p500['price']/p500['servings']))} por porción · {p500['servings']} porciones</p>
<input type="hidden" name="variant" value="ova-pro-500">
<p class="promo-box"><strong>Promo: 2 bolsas por {promo_price}</strong> ({money(PROMO['unitPrice'])} c/u) pagando por transferencia. <a href="{wa(f"Hola, quiero la promo de 2 OVA PRO+ por {promo_price} por transferencia.")}">Pedir la promo por WhatsApp</a></p>
<div class="buy-row"><div class="qty" role="group" aria-label="Cantidad"><button type="button" data-qty-step="-1" data-target="#pdp-qty" aria-label="Quitar uno">−</button><input id="pdp-qty" type="number" min="1" max="20" value="1" aria-label="Cantidad"><button type="button" data-qty-step="1" data-target="#pdp-qty" aria-label="Agregar uno">+</button></div>
<button class="btn btn-primary" data-add data-qty-from="#pdp-qty">Agregar al carrito</button></div>
<a class="btn btn-wa btn-block" data-wa-variant href="{wa(f"Hola, quiero pedir {p500['name']} ({money(p500['price'])}).")}">{c["ICON_WA"]} Pedir por WhatsApp</a>
<ul class="assure"><li>Envío no incluido: {money(CAT['shipping']['zones'][0]['price'])} en Quito, {ship_nat} a otras provincias.</li><li>Paga con Visa o Mastercard a través de PayPhone, o por transferencia.</li><li>Contiene huevo. No apta para personas alérgicas al huevo.</li></ul>
</div></div>

<div class="tabs"><div class="tablist" role="tablist" aria-label="Información del producto">
<button role="tab" id="t1" aria-controls="descripcion" aria-selected="true">Descripción</button>
<button role="tab" id="t2" aria-controls="nutricion" aria-selected="false" tabindex="-1">Tabla nutricional</button>
<button role="tab" id="t3" aria-controls="aminoacidos" aria-selected="false" tabindex="-1">Aminoácidos</button>
<button role="tab" id="t4" aria-controls="uso" aria-selected="false" tabindex="-1">Modo de uso</button>
</div>
<div class="tabpanel" role="tabpanel" id="descripcion" aria-labelledby="t1"><div class="prose">
<p>OVA PRO+ es <strong>clara de huevo obtenida de la rotura mecánica de huevos de gallina, desglucosada, deshidratada, envasada y pasteurizada</strong>. No lleva suero de leche, soya, azúcar, saborizantes ni colorantes.</p>
<p>Cada porción de {SCOOP} g (4 scoops de 8 g) aporta {dec(PS)} g de proteína completa, unos {leu} g de leucina y apenas {kcal_sc} kcal. Es una opción práctica para completar tu proteína del día si entrenas fuerza, si estás en definición o si los lácteos no te sientan bien.</p>
<p>Como no tiene sabor, puedes llevarla a tu terreno: batido con guineo y cacao, café frío proteico, avena, pancakes. Ideas en <a href="/blog/recetas-con-proteina-de-huevo/">recetas con proteína de huevo</a>.</p>
<h3>Almacenamiento</h3><p>Mantén el envase cerrado, en un lugar fresco y seco, protegido de la luz solar y de olores intensos. Una vez abierto, consúmelo antes de un año.</p>
</div></div>
<div class="tabpanel" role="tabpanel" id="nutricion" aria-labelledby="t2" hidden>{c["nutrition_table"]()}</div>
<div class="tabpanel" role="tabpanel" id="aminoacidos" aria-labelledby="t3" hidden>{c["amino_list"]()}</div>
<div class="tabpanel" role="tabpanel" id="uso" aria-labelledby="t4" hidden><div class="prose"><ol>
<li>Pon 250–300 ml de agua, leche vegetal o tu bebida favorita en el shaker.</li><li>Agrega 4 scoops (1 porción, {SCOOP} g).</li><li>Cierra y agita 20–30 segundos.</li></ol>
<p>Tómala cuando te quede más cómodo para llegar a tu meta diaria: después de entrenar, en el desayuno o como snack. El total del día pesa más que la hora exacta. Calcula tu meta con la <a href="/calculadora-de-proteina/">calculadora de proteína</a>.</p></div></div>
</div>
<div style="margin-top:2rem">{pfq_html}</div>

</div></section>'''
    pages.append(dict(path=path, title=f"Comprar proteína de huevo OVA PRO+ 500 g | {money(p500['price'])} o 2 por {promo_price}",
                      desc=f"OVA PRO+, proteína de albúmina de huevo sin sabor: {dec(PS)} g por porción, 0 % lactosa. 500 g a {money(p500['price'])} o 2 por {promo_price} por transferencia. Envíos a todo Ecuador.",
                      body=pdp, schema=[product_schema, pfq_schema, BC([("/", "Inicio"), (path, "OVA PRO+")])], priority="0.9", og_type="product"))

    # ================= GUÍA PILAR =================
    path = "/proteina-de-huevo/"
    title = "Proteína de huevo (albúmina): qué es, beneficios y cómo usarla"
    guide = c["page_head"]([("/", "Inicio"), (path, "Proteína de huevo")], "Proteína de huevo: guía completa", "Qué es la albúmina en polvo, qué tan buena es como proteína, cómo se compara con la whey y cómo usarla para entrenar.", True) + f'''
<section class="section"><div class="wrap"><article class="prose">
<div class="answer"><p><strong>En resumen:</strong> la proteína de huevo en polvo es clara de huevo deshidratada. Es una proteína animal completa (los 9 aminoácidos esenciales), con alta digestibilidad, casi sin grasa ni carbohidratos y sin lactosa. Un scoop de {SCOOP} g de OVA PRO+ aporta {dec(PS)} g de proteína y unos {leu} g de leucina.</p></div>
<nav class="toc" aria-label="Contenido"><strong>En esta guía</strong><ol>
<li><a href="#que-es">Qué es la albúmina de huevo</a></li><li><a href="#calidad">Qué tan buena es como proteína</a></li><li><a href="#beneficios">Beneficios para quien entrena</a></li>
<li><a href="#vs">Proteína de huevo vs whey</a></li><li><a href="#cuanta">Cuánta tomar</a></li><li><a href="#seguridad">Seguridad y alérgenos</a></li><li><a href="#elegir">Cómo elegir una buena proteína de huevo</a></li></ol></nav>

<h2 id="que-es">Qué es la albúmina de huevo</h2>
<p>La clara del huevo es casi toda agua y proteína. Su proteína principal es la <strong>ovoalbúmina</strong> (más de la mitad), acompañada de ovotransferrina, ovomucoide y lisozima. Cuando se retira el agua, la clara se convierte en un polvo con alrededor de 80–85 % de proteína.</p>
<p>En OVA PRO+ el proceso es: rotura mecánica de huevos de gallina, separación de la clara, desglucosado (se quita la glucosa natural para que el polvo no se oscurezca ni cambie con el tiempo), deshidratado, envasado y pasteurizado. El resultado tiene 83,07 % de proteína, 4,05 % de carbohidratos y 1 % de grasa.</p>

<h2 id="calidad">Qué tan buena es como proteína</h2>
<p>La calidad de una proteína depende de dos cosas: si trae todos los aminoácidos esenciales en cantidad suficiente y si el cuerpo la digiere y absorbe bien. Para medirlo se usan el PDCAAS y el DIAAS, el índice que la FAO recomienda desde 2013.</p>
<ul>
<li><strong>Completa.</strong> La clara de huevo contiene los 9 aminoácidos esenciales. En OVA PRO+ suman {dec(EAA)} g por cada 100 g de proteína.</li>
<li><strong>Alta digestibilidad.</strong> Un estudio con isótopos en humanos midió una digestibilidad ileal verdadera de 86 % para la proteína de clara de huevo cocida (y de 89 % para el huevo entero).</li>
<li><strong>Puntajes altos.</strong> En un estudio de 2019, los puntajes PDCAAS y DIAAS de la proteína de clara de huevo resultaron equivalentes a los de la whey.</li>
</ul>
<p>Traducido: la proteína de huevo está en el grupo de las proteínas de mayor calidad, junto con la leche y sus derivados.</p>

<h2 id="beneficios">Beneficios para quien entrena</h2>
<ul>
<li><strong>Aporta lo que el músculo necesita.</strong> Las dosis de 20–40 g con 0,7–3 g de leucina se asocian con una buena respuesta de síntesis de proteína muscular después de entrenar. Una porción de OVA PRO+ (4 scoops) trae {dec(PS)} g de proteína y unos {leu} g de leucina.</li>
<li><strong>Sin lactosa.</strong> Para personas con intolerancia a la lactosa o que sienten pesadez con los lácteos.</li>
<li><strong>Magra.</strong> Con {kcal_sc} kcal por porción y casi nada de grasa, encaja en etapas de definición donde la proteína sube y las calorías bajan.</li>
<li><strong>Versátil en la cocina.</strong> Al no tener sabor ni endulzante, sirve tanto en batidos como en recetas dulces o saladas.</li>
</ul>
<p>Un matiz honesto: un estudio de 2017 encontró que comer huevos enteros estimuló más la síntesis muscular post-entreno que la misma cantidad de proteína solo de claras. No significa que la clara no funcione; sugiere que la comida completa también importa. Puedes combinar OVA PRO+ con comidas que incluyan huevo entero, fruta o avena.</p>

<h2 id="vs">Proteína de huevo vs whey</h2>
<p>Ambas son proteínas animales completas y de alta calidad. La whey tiene algo más de leucina por gramo (alrededor de 10–11 % frente a 9 % de la clara) y se absorbe muy rápido. La proteína de huevo gana cuando la lactosa o la proteína láctea son un problema, y cuando buscas una etiqueta de un solo ingrediente. Ver la <a href="/ova-vs-whey/">comparativa completa OVA PRO+ vs whey</a>.</p>

<h2 id="cuanta">Cuánta proteína de huevo tomar</h2>
<p>La cifra importante es tu proteína total del día, no la del suplemento. Para personas que entrenan, la ISSN propone 1,4–2,0 g por kilo de peso al día, y más (2,3–3,1 g/kg) en déficit calórico para conservar músculo. Si con tu comida no llegas, 1 o 2 porciones de OVA PRO+ cubren la diferencia. Calcula tu número en la <a href="/calculadora-de-proteina/">calculadora de proteína</a>.</p>

<h2 id="seguridad">Seguridad y alérgenos</h2>
<ul>
<li>El huevo es uno de los alérgenos alimentarios más comunes. Si eres alérgico al huevo, no consumas proteína de huevo.</li>
<li>La clara cruda contiene avidina, una proteína que se une a la biotina. El tratamiento térmico reduce su actividad; si cocinas con OVA PRO+, el calor la inactiva por completo.</li>
<li>Si tienes enfermedad renal, estás embarazada o tomas medicación, consulta con tu médico o nutricionista antes de aumentar tu proteína con suplementos.</li>
</ul>

<h2 id="elegir">Cómo elegir una buena proteína de huevo</h2>
<ol>
<li><strong>Lee la lista de ingredientes.</strong> Lo ideal es que diga solo “clara de huevo” o “albúmina de huevo”.</li>
<li><strong>Revisa el porcentaje de proteína.</strong> Una albúmina pura ronda el 80–85 %. Menos puede indicar rellenos.</li>
<li><strong>Pide la tabla de aminoácidos.</strong> Una marca seria la publica. La de OVA PRO+ está en la <a href="/proteina-de-huevo-ova-pro/#aminoacidos">página del producto</a>.</li>
<li><strong>Verifica pasteurización y registro sanitario.</strong> En Ecuador, los suplementos deben contar con notificación sanitaria de ARCSA.</li>
<li><strong>Compara el precio por gramo de proteína.</strong> Con OVA PRO+, 10 g de proteína cuestan {per10_500} a precio normal y {per10_promo} con la promo de 2 bolsas.</li>
</ol>
<p><a class="btn btn-primary" href="/proteina-de-huevo-ova-pro/">Ver OVA PRO+</a></p>
{sources("fao", "kashyap", "matsuoka", "issn", "vanvliet")}
</article></div></section>'''
    pages.append(dict(path=path, title="Proteína de huevo (albúmina): qué es, beneficios y cómo usarla",
                      desc="Guía de proteína de huevo en polvo: qué es la albúmina, calidad (PDCAAS/DIAAS), beneficios para entrenar, comparación con whey, cuánta tomar y cómo elegir una buena.",
                      body=guide, schema=[c["article_schema"](path, title, "Guía de proteína de huevo en polvo (albúmina)."), BC([("/", "Inicio"), (path, "Proteína de huevo")])], priority="0.9", og_type="article"))

    # ================= OVA VS WHEY =================
    path = "/ova-vs-whey/"
    title = "Proteína de huevo vs whey: ¿cuál elegir?"
    rows = [("Origen", "Clara de huevo de gallina", "Suero de leche (subproducto del queso)"),
            ("Proteína por 100 g", "83 g", "Concentrada 70–80 g · aislada 85–90 g"),
            ("Lactosa", "0 g", "Concentrada: algo · aislada: muy poca"),
            ("Proteína de leche", "No contiene", "Sí (alérgeno lácteo)"),
            ("Aminoácidos esenciales", "Los 9", "Los 9"),
            ("Leucina por 100 g de proteína", "9,0 g", "≈10–11 g"),
            ("Velocidad de absorción", "Media-rápida", "Rápida"),
            ("Sabor", "Neutro, sin endulzar", "Normalmente saborizada y endulzada"),
            ("Alérgeno principal", "Huevo", "Leche"),
            ("Ideal para", "Intolerancia a lácteos, etiquetas limpias, cocina", "Quien tolera bien los lácteos y busca máxima leucina")]
    tr = "".join(f"<tr><th scope=row>{a}</th><td>{b}</td><td>{x}</td></tr>" for a, b, x in rows)
    vs_faq = [("¿La proteína de huevo sirve igual que la whey para ganar músculo?", "Ambas son proteínas completas de alta calidad. Si alcanzas tu proteína diaria y la dosis por toma (20–40 g), las dos sirven. La whey trae un poco más de leucina por gramo; un scoop de OVA PRO+ ya aporta alrededor de 3 g."),
              ("¿La whey aislada tiene lactosa?", "Muy poca, pero sigue siendo proteína de leche. Si tu problema es la proteína láctea y no solo la lactosa, la aislada también puede molestarte."),
              ("¿Puedo mezclar OVA PRO+ con whey?", "Sí. Combinar fuentes de proteína es seguro y te da variedad de aminoácidos y texturas.")]
    vfq_html, vfq_schema = c["faq_block"](vs_faq, "Dudas frecuentes", "dudas")
    vs = c["page_head"]([("/", "Inicio"), (path, "OVA vs whey")], "Proteína de huevo vs whey", "Las dos son proteínas completas. La diferencia está en el origen, la lactosa y la etiqueta.", True) + f'''
<section class="section"><div class="wrap"><div class="prose">
<div class="answer"><p><strong>Respuesta corta:</strong> si toleras bien los lácteos, whey y proteína de huevo son opciones de alta calidad. Si la lactosa o la proteína de leche te causan hinchazón, gases o pesadez, la proteína de huevo como OVA PRO+ te da una proteína animal completa sin lácteos: {dec(PS)} g por scoop y 0 g de lactosa.</p></div></div>
<div class="table-wrap" style="margin:2rem 0"><table><caption>Comparativa general. Los valores de whey son rangos típicos del mercado y varían por marca.</caption>
<thead><tr><th scope=col></th><th scope=col>OVA PRO+ (proteína de huevo)</th><th scope=col>Whey</th></tr></thead><tbody>{tr}</tbody></table></div>
<div class="prose">
<h2>Cuándo elegir OVA PRO+</h2>
<ul><li>Te cae mal la leche o la whey concentrada.</li><li>Quieres una etiqueta con un ingrediente, sin endulzantes.</li><li>Cocinas tus snacks proteicos (pancakes, avena, waffles).</li><li>Prefieres variar tu fuente de proteína.</li></ul>
<h2>Cuándo la whey puede ser mejor</h2>
<ul><li>Toleras bien los lácteos y buscas la máxima leucina por gramo.</li><li>Eres alérgico al huevo.</li><li>Prefieres un batido ya saborizado.</li></ul>
<h2>Sobre la inflamación</h2>
<p>Vas a leer que la whey “inflama”. Lo que sí está documentado es que la lactosa causa síntomas digestivos en personas con intolerancia, y que la proteína de leche es un alérgeno. Si ese es tu caso, cambiar a proteína de huevo puede ayudarte a evitar esas molestias. Fuera de eso, no hay evidencia de que la whey inflame a una persona que la tolera bien.</p>
{vfq_html}
<p style="margin-top:2rem"><a class="btn btn-primary" href="/proteina-de-huevo-ova-pro/">Probar OVA PRO+ desde {money(p500['price'])}</a></p>
{sources("matsuoka", "issn", "fao")}
</div></div></section>'''
    pages.append(dict(path=path, title=title + " | OVA PRO+",
                      desc="Comparativa de proteína de huevo y whey: lactosa, aminoácidos, leucina, digestibilidad, sabor y para quién es mejor cada una. Tabla clara y fuentes.",
                      body=vs, schema=[c["article_schema"](path, title, "Comparativa entre proteína de huevo y proteína whey."), vfq_schema, BC([("/", "Inicio"), (path, "OVA vs whey")])], priority="0.8", og_type="article"))

    # ================= CALCULADORA =================
    path = "/calculadora-de-proteina/"
    calc = c["page_head"]([("/", "Inicio"), (path, "Calculadora de proteína")], "Calculadora de proteína diaria", "Tu rango de proteína al día según tu peso y tu meta, cuánto por comida y cuántas porciones de OVA PRO+ te faltan.") + f'''
<section class="section"><div class="wrap">
<form class="calc" id="calc" novalidate>
<div>
<div class="field"><label for="peso">Tu peso (kg)</label><input id="peso" type="number" inputmode="decimal" min="30" max="250" step="0.5" value="75"></div>
<fieldset><legend>Tu meta</legend><div class="choices">
<label><input type="radio" name="meta" value="ganar" checked> Ganar músculo</label>
<label><input type="radio" name="meta" value="definir"> Definir</label>
<label><input type="radio" name="meta" value="mantener"> Mantener</label>
<label><input type="radio" name="meta" value="resistencia"> Resistencia</label></div></fieldset>
<div class="field"><label for="comidas">Comidas al día</label><select id="comidas"><option>3</option><option selected>4</option><option>5</option><option>6</option></select></div>
<div class="field"><label for="dieta">Proteína que ya comes al día (g, opcional)</label><input id="dieta" type="number" inputmode="numeric" min="0" max="400" step="5" placeholder="Ej.: 90"></div>
</div>
<div class="calc-out" id="calc-out" aria-live="polite"></div>
</form>
<div class="prose" style="margin-top:3rem">
<h2>Cómo calculamos</h2>
<table><thead><tr><th scope=col>Meta</th><th scope=col>Gramos por kilo al día</th></tr></thead><tbody>
<tr><th scope=row>Ganar músculo</th><td>1,6–2,2 g/kg</td></tr><tr><th scope=row>Definir conservando músculo</th><td>2,3–3,1 g/kg</td></tr>
<tr><th scope=row>Mantener (persona activa)</th><td>1,2–1,6 g/kg</td></tr><tr><th scope=row>Deportes de resistencia</th><td>1,4–1,8 g/kg</td></tr></tbody></table>
<p>Los rangos salen de la postura de la International Society of Sports Nutrition: 1,4–2,0 g/kg al día para personas que entrenan y 2,3–3,1 g/kg en déficit calórico. Para cada comida se recomiendan unos 0,25 g/kg de proteína de alta calidad (20–40 g); usamos 0,3 g/kg como referencia práctica. Un scoop de OVA PRO+ ({SCOOP} g) aporta {dec(PS)} g de proteína.</p>
<p class="note-box">Esta herramienta es orientativa para adultos sanos. Si tienes enfermedad renal, diabetes, estás embarazada o eres menor de edad, consulta a un profesional de la salud.</p>
{sources("issn")}
</div></div></section>'''
    app_schema = {"@context": "https://schema.org", "@type": "WebApplication", "name": "Calculadora de proteína diaria OVA PRO+", "url": URL + path,
                  "applicationCategory": "HealthApplication", "operatingSystem": "Web", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "inLanguage": "es-EC"}
    pages.append(dict(path=path, title="Calculadora de proteína diaria: cuántos gramos necesitas | OVA PRO+",
                      desc="Calcula cuánta proteína necesitas al día según tu peso y tu meta (ganar músculo, definir, mantener). Te dice gramos por comida y porciones de OVA PRO+.",
                      body=calc, schema=[app_schema, BC([("/", "Inicio"), (path, "Calculadora de proteína")])], priority="0.8"))

    # ================= PROMOCIONES =================
    path = "/promociones/"
    promo = c["page_head"]([("/", "Inicio"), (path, "Promociones")], "Promociones OVA PRO+", "La promo vigente y cómo pedirla.") + f'''
<section class="section"><div class="wrap">
<div class="offer">
<div class="offer-shot"><img src="/assets/img/ova-pro-bolsa-duo-lg.webp" alt="Dos bolsas de OVA PRO+ 500 g" width="617" height="689"></div>
<div class="offer-opt">
<h2>2 OVA PRO+ por {promo_price}</h2>
<p class="lead">Llevas dos bolsas de 500 g a {money(PROMO['unitPrice'])} cada una, en vez de {money(p500['price'])}, pagando por transferencia o depósito.</p>
<ol class="how">
<li>Escríbenos por WhatsApp o arma tu pedido en el carrito y elige “Transferencia”.</li>
<li>Te enviamos los datos bancarios y el costo del envío a tu ciudad.</li>
<li>Envías el comprobante y despachamos tu pedido.</li>
</ol>
<p><a class="btn btn-wa" href="{wa(f"Hola, quiero la promo de 2 OVA PRO+ por {promo_price} por transferencia.")}">{c["ICON_WA"]} Pedir la promo</a> <a class="btn btn-ghost" href="/carrito/?add=ova-pro-500&cant=2&pago=transferencia">Armar pedido en el carrito</a></p>
<p style="font-size:.92rem;color:var(--muted)">Válida solo con pago por transferencia o depósito{f"; con tarjeta el precio es {money(p500['price'])} por bolsa" if CARD else ""}. El envío no está incluido. Precios con IVA incluido. Promoción válida hasta agotar stock o hasta que se anuncie su cambio en esta página.</p>
<p style="font-size:.92rem">¿Tienes un gimnasio o quieres distribuir? <a href="{wa("Hola, quiero información de precios de mayoreo de OVA PRO+.")}">Pregunta por precios de mayoreo</a>.</p>
</div></div>
</div></section>'''
    pages.append(dict(path=path, title="Promociones de proteína de huevo en Ecuador | OVA PRO+",
                      desc=f"Promoción OVA PRO+: 2 bolsas de proteína de clara de huevo de 500 g por {promo_price} ({money(PROMO['unitPrice'])} c/u) pagando por transferencia. Envíos a todo Ecuador.",
                      body=promo, schema=[BC([("/", "Inicio"), (path, "Promociones")])], priority="0.7"))

    # ================= BLOG =================
    # Cada artículo tiene "published" (AAAA-MM-DD). Los de fecha futura no se publican hasta ese día
    # (el sitio se regenera cada mañana con .github/workflows/publicar-blog.yml).
    posts = sorted((p for p in BLOG_POSTS(c, SRC, sources) if p.get("published", "2026-11-17") <= c["TODAY"]),
                   key=lambda p: p.get("published", "2026-11-17"), reverse=True)
    cards = "".join(f'<a class="card-link" href="{p["path"]}"><h3>{e(p["h1"])}</h3><p>{e(p["desc"])}</p></a>' for p in posts)
    pages.append(dict(path="/blog/", title="Blog OVA PRO+: proteína, entrenamiento y recetas",
                      desc="Artículos sobre proteína de huevo, cuánta proteína necesitas, aminoácidos, proteína sin lactosa y recetas fitness.",
                      body=c["page_head"]([("/", "Inicio"), ("/blog/", "Blog")], "Blog", "Proteína, entrenamiento y cocina, con fuentes.") + f'<section class="section"><div class="wrap"><div class="grid-3">{cards}</div></div></section>',
                      schema=[BC([("/", "Inicio"), ("/blog/", "Blog")])], priority="0.6"))
    for p in posts:
        body = c["page_head"]([("/", "Inicio"), ("/blog/", "Blog"), (p["path"], p["crumb"])], p["h1"], p["lead"], True) + f'<section class="section"><div class="wrap"><article class="prose">{p["body"]}<p style="margin-top:2rem"><a class="btn btn-primary" href="/proteina-de-huevo-ova-pro/">Ver OVA PRO+</a></p></article></div></section>'
        sch = [c["article_schema"](p["path"], p["h1"], p["desc"], published=p.get("published", "2026-11-17")), BC([("/", "Inicio"), ("/blog/", "Blog"), (p["path"], p["crumb"])])] + p.get("schema", [])
        pages.append(dict(path=p["path"], title=p["title"], desc=p["desc"], body=body, schema=sch, priority="0.6", og_type="article"))

    # ================= FAQ =================
    path = "/preguntas-frecuentes/"
    allfaq = home_faq + pdp_faq + [
        ("¿Hacen envíos a todo Ecuador?", f"Sí. Entregamos a domicilio en Quito y enviamos a las demás provincias de Ecuador continental en 24–72 horas. El envío no está incluido en el precio: cuesta {money(CAT['shipping']['zones'][0]['price'])} en Quito y {ship_nat} a otras provincias. Para Galápagos, consúltanos por WhatsApp."),
        
        ("¿Puedo pagar por transferencia?", f"Sí, y es la forma de acceder a la promo de 2 bolsas por {promo_price}. Escríbenos por WhatsApp o elige “Transferencia” en el carrito y te enviamos los datos bancarios."),
        ("¿OVA PRO+ engorda?", f"Ningún alimento engorda por sí solo; depende de tus calorías totales. Una porción (4 scoops) aporta {kcal_sc} kcal y casi nada de grasa, por eso se usa mucho en etapas de definición."),
        ("¿Pueden tomarla mujeres?", "Sí. La proteína no tiene género. Igual estamos preparando OVA HER, una línea pensada para mujeres."),
        ("¿Es apta para vegetarianos?", "Sí para ovo-vegetarianos. No es apta para veganos porque proviene del huevo."),
    ]
    if CARD: allfaq.append((("¿Es seguro pagar en la web?", "Sí. El pago lo procesa PayPhone, una pasarela ecuatoriana certificada PCI DSS. Nosotros nunca vemos ni guardamos los datos de tu tarjeta.")))
    fqh, fqs = c["faq_block"](allfaq, "Todas las preguntas")
    pages.append(dict(path=path, title="Preguntas frecuentes sobre OVA PRO+ y la proteína de huevo",
                      desc="Respuestas sobre OVA PRO+: lactosa, sabor, cómo se toma, precios, envíos en Ecuador, formas de pago, alérgenos y más.",
                      body=c["page_head"]([("/", "Inicio"), (path, "Preguntas frecuentes")], "Preguntas frecuentes") + f'<section class="section"><div class="wrap">{fqh}<p style="margin-top:2rem">¿No encuentras tu respuesta? <a href="{wa("Hola, tengo una pregunta sobre OVA PRO+.")}">Escríbenos por WhatsApp</a>.</p></div></section>',
                      schema=[fqs, BC([("/", "Inicio"), (path, "Preguntas frecuentes")])], priority="0.7"))

    # ================= ENVÍOS Y PAGOS =================
    path = "/envios-y-pagos/"
    CARD_LIS = '''<li><strong>Tarjeta de crédito o débito</strong> Visa y Mastercard, procesada por PayPhone. La pasarela es certificada PCI DSS y usa 3-D Secure.</li><li><strong>Saldo PayPhone</strong> desde la app.</li>''' if CARD else ""
    ztr = "".join(f"<tr><th scope=row>{e(z['label'])}</th><td class=num>{money(z['price'])}</td></tr>" for z in CAT["shipping"]["zones"])
    pages.append(dict(path=path, title="Envíos a todo Ecuador y formas de pago | OVA PRO+",
                      desc=f"Envíos de OVA PRO+ a todo Ecuador; el envío se paga aparte. " + ("Paga con tarjeta vía PayPhone o por transferencia " if CARD else "Pago por transferencia o depósito ") + f"(promo 2 por {promo_price}).",
                      body=c["page_head"]([("/", "Inicio"), (path, "Envíos y pagos")], "Envíos y pagos") + f'''<section class="section"><div class="wrap prose">
<h2>Envíos</h2><table><thead><tr><th scope=col>Destino</th><th scope=col class=num>Costo</th></tr></thead><tbody>{ztr}</tbody></table>
<ul><li>El costo del envío no está incluido en el precio del producto.</li><li>Galápagos: escríbenos por WhatsApp y te cotizamos.</li><li>Despachamos en máximo 1 día hábil después de confirmar el pago.</li><li>Te enviamos el número de guía por WhatsApp para que sigas tu pedido.</li></ul>
<h2>Formas de pago</h2>
<ul>{CARD_LIS}<li><strong>Transferencia o depósito</strong>: elige “Transferencia” en el carrito o escríbenos por WhatsApp. Con transferencia aplica la promo de 2 bolsas por {promo_price}.</li></ul>
<p>Todos los precios incluyen IVA. Emitimos factura electrónica con los datos que ingreses en el carrito.</p>
</div></section>''', schema=[BC([("/", "Inicio"), (path, "Envíos y pagos")])], priority="0.5"))

    # ================= NOSOTROS / CONTACTO =================
    pages.append(dict(path="/nosotros/", title="Nosotros | OVA Nutrition, creadores de OVA PRO+",
                      desc="OVA Nutrition es una marca ecuatoriana de nutrición deportiva. Creamos OVA PRO+, proteína de albúmina de huevo con un solo ingrediente.",
                      body=c["page_head"]([("/", "Inicio"), ("/nosotros/", "Nosotros")], "Fuerza real, etiqueta corta") + f'''<section class="section"><div class="wrap split top">
<div class="prose"><p class="lead">OVA Nutrition es una marca ecuatoriana de nutrición deportiva. Empezamos con una pregunta simple: ¿por qué una proteína necesita una lista de veinte ingredientes?</p>
<p>OVA PRO+ es nuestra respuesta: clara de huevo, deshidratada y pasteurizada. Nada más. Publicamos la composición completa y el perfil de aminoácidos porque creemos que quien entrena merece saber exactamente lo que toma.</p>
<p>Atendemos personalmente por WhatsApp y enviamos a todo el país. Si tienes una pregunta técnica, escríbenos: nos gusta hablar de proteína.</p>
<p><!-- PENDIENTE: historia de los fundadores, foto del equipo y credenciales del nutricionista que respalda la marca (mejora E-E-A-T) --></p></div>
<div><img src="/assets/img/atleta-ova-pro-lg.webp" alt="OVA PRO+ en uso" width="907" height="1125" loading="lazy"></div>
</div></section>''', schema=[ORG, BC([("/", "Inicio"), ("/nosotros/", "Nosotros")])], priority="0.4"))
    pages.append(dict(path="/contacto/", title="Contacto | OVA PRO+ Ecuador",
                      desc="Contacta a OVA Nutrition por WhatsApp, correo o Instagram. Atención de lunes a sábado.",
                      body=c["page_head"]([("/", "Inicio"), ("/contacto/", "Contacto")], "Contacto", "La forma más rápida es WhatsApp.") + f'''<section class="section"><div class="wrap grid-3">
<div class="box"><h2>WhatsApp</h2><p>{e(SITE["whatsappDisplay"])}<br>{e(SITE["hours"])}</p><a class="btn btn-wa" href="{wa("Hola, quiero información de OVA PRO+.")}">{c["ICON_WA"]} Escribir</a></div>
<div class="box"><h2>Correo</h2><p><a href="mailto:{SITE["email"]}">{SITE["email"]}</a></p><p>Para distribución, gimnasios y alianzas.</p></div>
<div class="box"><h2>Redes</h2><p>Síguenos como <strong>@ovaprotein</strong> para recetas, lanzamientos y promociones.</p>{c["social_links"]("social social-dark")}</div>
</div></section>''', schema=[ORG, BC([("/", "Inicio"), ("/contacto/", "Contacto")])], priority="0.4"))

    # ================= CARRITO / PAGO =================
    pages.append(dict(path="/carrito/", title="Carrito y pago | OVA PRO+", desc="Finaliza tu compra de OVA PRO+.", noindex=True, scripts=("checkout",),
                      body=f'''<section class="section" style="padding-top:2.5rem"><div class="wrap">
<h1 style="font-size:clamp(2.2rem,5vw,3.4rem)">Tu pedido</h1><div id="notice"></div>
<div class="checkout">
<div>
<div class="box" style="margin-bottom:1.5rem"><h2>Productos</h2><div id="lines"></div></div>
<form class="box" id="checkout-form" novalidate>
<h2>Datos de entrega y factura</h2>
<div class="field"><label for="nombre">Nombre completo</label><input id="nombre" name="nombre" autocomplete="name" required></div>
<div class="two"><div class="field"><label for="tipo_doc">Documento</label><select id="tipo_doc" name="tipo_doc"><option value="1">Cédula</option><option value="2">RUC</option><option value="3">Pasaporte</option></select></div>
<div class="field"><label for="documento">Número</label><input id="documento" name="documento" inputmode="numeric" required></div></div>
<div class="two"><div class="field"><label for="telefono">Celular</label><input id="telefono" name="telefono" type="tel" autocomplete="tel" placeholder="0991234567" required></div>
<div class="field"><label for="email">Correo</label><input id="email" name="email" type="email" autocomplete="email" required></div></div>
<div class="field"><label for="zona">Tipo de envío</label><select id="zona" name="zona"></select></div>
<div class="two"><div class="field"><label for="provincia">Provincia</label><input id="provincia" name="provincia" autocomplete="address-level1" required></div>
<div class="field"><label for="ciudad">Ciudad</label><input id="ciudad" name="ciudad" autocomplete="address-level2" required></div></div>
<div class="field"><label for="direccion">Dirección</label><input id="direccion" name="direccion" autocomplete="street-address" required></div>
<div class="field"><label for="referencia">Referencia (opcional)</label><input id="referencia" name="referencia"></div>
<div class="field"><label for="notas">Notas para el pedido (opcional)</label><textarea id="notas" name="notas" rows="2"></textarea></div>
<div style="position:absolute;left:-5000px" aria-hidden="true"><label>No llenar<input name="website" tabindex="-1" autocomplete="off"></label></div>
<label style="display:flex;gap:.5rem;align-items:flex-start;font-size:.95rem"><input type="checkbox" name="acepto" required style="margin-top:.3rem"> Acepto los <a href="/legal/terminos/" target="_blank">términos</a> y la <a href="/legal/privacidad/" target="_blank">política de privacidad</a>.</label>
</form>
</div>
<aside class="box" id="summary" style="position:sticky;top:90px">
<h2>Resumen</h2>
<div class="sum"><span>Subtotal</span><span id="s-sub"></span></div>
<div class="sum" id="s-desc-row" hidden><span>Descuento</span><span id="s-desc"></span></div>
<div class="sum"><span>Envío</span><span id="s-env"></span></div>
<p class="msg ok" id="free-msg" aria-live="polite"></p>
<div class="sum total"><span>Total</span><span id="s-total"></span></div>
<p style="font-size:.85rem;color:var(--muted);margin:0 0 1rem">Incluye IVA de <span id="s-iva"></span>.</p>
<div class="field"{"" if CAT["coupons"] else " hidden"}><label for="cupon">Código de descuento</label><div class="coupon"><input id="cupon" autocomplete="off"><button type="button" class="btn btn-ghost" id="aplicar">Aplicar</button></div><p class="msg" id="cupon-msg" aria-live="polite"></p></div>
<fieldset class="paym"><legend>Forma de pago</legend>
<label{"" if CARD else " hidden"}><input type="radio" name="pago" value="card"{" checked" if CARD else ""}><span><strong>Tarjeta</strong> Visa o Mastercard con PayPhone. {money(p500['price'])} por bolsa.</span></label>
<label><input type="radio" name="pago" value="transfer"{"" if CARD else " checked"}><span><strong>Transferencia o depósito</strong> Pedido por WhatsApp. 2 o más bolsas a {money(PROMO['unitPrice'])} c/u.</span></label>
</fieldset>
<div id="card-box"{"" if CARD else " hidden"}><button type="button" class="btn btn-primary btn-block" id="pay-card">Pagar con tarjeta</button>
<label style="display:flex;gap:.45rem;font-size:.88rem;margin:.6rem 0;color:var(--muted)"><input type="checkbox" id="pay-app"> Prefiero pagar con mi saldo de la app PayPhone</label>
<p class="pay-logos">Visa · Mastercard · procesado por PayPhone</p></div>
<div id="transfer-box"{" hidden" if CARD else ""}><button type="button" class="btn btn-wa btn-block" id="pay-wa">Hacer pedido por transferencia</button>
<p style="font-size:.85rem;color:var(--muted);margin:.6rem 0 0">Registramos tu pedido y te mostramos los datos para transferir (también por correo). Despachamos al recibir el comprobante.</p></div>
<p class="msg err" id="pay-error" aria-live="polite"></p>
</aside></div></div></section>'''))
    pages.append(dict(path="/pago/", title="Confirmación de pago | OVA PRO+", desc="Estado de tu pago.", noindex=True, scripts=("app", "pago"),
                      body='<section class="section"><div class="wrap status-card" id="status" tabindex="-1"><h1>Confirmando tu pago…</h1><p>No cierres esta página.</p></div></section>'))

    # ================= LEGAL =================
    legal = LEGAL(c)
    for lp in legal:
        pages.append(dict(path=lp["path"], title=lp["title"] + " | OVA PRO+", desc=lp["desc"],
                          body=c["page_head"]([("/", "Inicio"), (lp["path"], lp["title"])], lp["title"]) + f'<section class="section"><div class="wrap prose">{lp["body"]}</div></section>', priority="0.2"))

    pages.append(dict(path="/404.html", title="Página no encontrada | OVA PRO+", desc="Esta página no existe.", noindex=True,
                      body=c["page_head"]([("/", "Inicio"), ("/404.html", "404")], "Esta página no existe", "Puede que el enlace haya cambiado.") + '<section class="section"><div class="wrap"><a class="btn btn-primary" href="/">Ir al inicio</a> <a class="btn btn-ghost" href="/proteina-de-huevo-ova-pro/">Ver OVA PRO+</a></div></section>'))
    return pages


def BLOG_POSTS(c, SRC, sources):
    P, money, dec, PS, SCOOP, per_scoop, EAA, BCAA = c["P"], c["money"], c["dec"], c["PS"], c["SCOOP"], c["per_scoop"], c["EAA"], c["BCAA"]
    URL = c["URL"]
    leu = dec(per_scoop(9.0))
    posts = []

    lact_faq = c["faq_block"]([
        ("¿La proteína de huevo hincha?", "No tiene lactosa, que es la causa más común de hinchazón con la whey. Como con cualquier alimento, cada persona reacciona distinto."),
        ("¿Con qué la mezclo si soy intolerante a la lactosa?", "Con agua, bebida de almendra o de avena, o leche deslactosada."),
        ("¿Dónde compro proteína sin lactosa en Ecuador?", f"OVA PRO+ se envía desde Quito a todo el país: {money(c['CAT']['shipping']['zones'][0]['price'])} en Quito y {money(c['CAT']['shipping']['zones'][1]['price'])} a otras provincias, en <a href=\"/proteina-de-huevo-ova-pro/\">la tienda</a>."),
    ])
    posts.append(dict(path="/blog/proteina-sin-lactosa/", crumb="Proteína sin lactosa",
        title="Proteína sin lactosa: opciones reales si la whey te cae mal | OVA PRO+",
        h1="Proteína sin lactosa: qué opciones tienes si la whey te cae mal",
        lead="Hinchazón, gases o pesadez después del batido no son normales. Estas son las alternativas y cómo elegir.",
        desc="Si la whey te produce hinchazón o gases, estas son las proteínas sin lactosa: huevo, aislada, vegetales. Ventajas, diferencias y cómo elegir.",
        body=f'''<div class="answer"><p><strong>En resumen:</strong> si la whey te cae mal, las opciones sin lactosa son la proteína de clara de huevo, las proteínas vegetales (arveja, arroz, soya) y, con matices, la whey aislada. La proteína de huevo es la única de esas que es animal, completa y sin ningún componente lácteo.</p></div>
<h2>Por qué la whey puede caerte mal</h2>
<p>La whey viene del suero de la leche. La versión concentrada conserva parte de la lactosa, el azúcar de la leche. Si tu intestino produce poca lactasa (la enzima que la digiere), la lactosa llega al colon, fermenta y aparecen hinchazón, gases o diarrea. Es muy común en adultos.</p>
<p>En Ecuador es todavía más frecuente: el Centro de la Industria Láctea estima que el 70 % de la población mestiza tiene algún grado de intolerancia a la lactosa.</p>
<p>Otras personas no reaccionan a la lactosa sino a la proteína de la leche, o a los endulzantes y gomas que llevan muchos batidos saborizados.</p>
<h2>Las opciones sin lactosa</h2>
<table><thead><tr><th scope=col>Opción</th><th scope=col>Ventaja</th><th scope=col>A tener en cuenta</th></tr></thead><tbody>
<tr><th scope=row>Proteína de huevo (OVA PRO+)</th><td>Animal, completa, 0 % lactosa y sin proteína láctea</td><td>No apta para alérgicos al huevo</td></tr>
<tr><th scope=row>Whey aislada</th><td>Muy poca lactosa, mucha leucina</td><td>Sigue siendo proteína de leche</td></tr>
<tr><th scope=row>Vegetales (arveja, arroz, soya)</th><td>Aptas para veganos</td><td>Suelen combinarse para completar aminoácidos</td></tr></tbody></table>
<h2>Cómo saber si el problema es la lactosa</h2>
<ol><li>Deja la whey dos semanas y usa una proteína sin lácteos.</li><li>Si los síntomas desaparecen, la lactosa o la proteína láctea eran probablemente la causa.</li><li>Si persisten, consulta a un gastroenterólogo: puede haber otra explicación.</li></ol>
<h2>Intolerancia no es lo mismo que alergia</h2>
<p>La intolerancia a la lactosa da molestias digestivas. La alergia a la proteína de la leche es una reacción del sistema inmune y debe verla un médico. OVA PRO+ no tiene lactosa ni proteína de leche, pero <strong>no es apta si tienes alergia al huevo</strong>.</p>
<h2>Por qué la proteína de huevo es buena opción</h2>
<p>OVA PRO+ es clara de huevo y nada más: {dec(PS)} g de proteína por porción, los 9 aminoácidos esenciales y unos {leu} g de leucina. Al no llevar endulzantes ni gomas, también eliminas otras posibles causas de molestias.</p>
{lact_faq[0]}
{sources("lactosa_ec", "matsuoka", "issn")}''', schema=[lact_faq[1]], published="2026-11-17"))

    posts.append(dict(path="/blog/cuanta-proteina-necesito-al-dia/", crumb="Cuánta proteína necesito",
        title="¿Cuánta proteína necesito al día para ganar músculo? | OVA PRO+",
        h1="¿Cuánta proteína necesito al día para ganar músculo?",
        lead="Los números que usa la ciencia del deporte, explicados con ejemplos.",
        desc="Cuánta proteína necesitas al día según tu peso y meta: 1,6–2,2 g/kg para ganar músculo, 2,3–3,1 g/kg para definir. Ejemplos y cómo repartirla.",
        body=f'''<div class="answer"><p><strong>En resumen:</strong> si entrenas fuerza, apunta a 1,6–2,2 g de proteína por kilo de peso al día. En déficit calórico, sube a 2,3–3,1 g/kg para conservar músculo. Repártela en 3–5 comidas de unos 20–40 g cada una.</p></div>
<h2>Los rangos</h2>
<p>La recomendación general para adultos sedentarios es 0,8 g/kg, pero quien entrena necesita más. La International Society of Sports Nutrition propone 1,4–2,0 g/kg al día para la mayoría de personas activas, y 2,3–3,1 g/kg cuando estás comiendo menos calorías de las que gastas.</p>
<h2>Ejemplos</h2>
<table><thead><tr><th scope=col>Peso</th><th scope=col>Ganar músculo (1,6–2,2 g/kg)</th><th scope=col>Definir (2,3–3,1 g/kg)</th></tr></thead><tbody>
<tr><th scope=row>60 kg</th><td>96–132 g</td><td>138–186 g</td></tr><tr><th scope=row>75 kg</th><td>120–165 g</td><td>173–233 g</td></tr><tr><th scope=row>90 kg</th><td>144–198 g</td><td>207–279 g</td></tr></tbody></table>
<h2>Cómo repartirla</h2>
<p>La ISSN sugiere tomas de 0,25 g/kg (20–40 g) cada 3–4 horas. Para una persona de 75 kg, eso son unos 20–30 g por comida en 4 comidas. Cada toma debería traer 0,7–3 g de leucina.</p>
<h2>Dónde entra un suplemento</h2>
<p>La comida es la base. El suplemento sirve cuando no llegas o cuando necesitas algo práctico. Una porción de OVA PRO+ (4 scoops) aporta {dec(PS)} g de proteína y unos {leu} g de leucina, así que cubre una toma completa. Calcula tu número exacto con la <a href="/calculadora-de-proteina/">calculadora de proteína</a>.</p>
<p class="note-box">Si tienes enfermedad renal, consulta a tu médico antes de aumentar tu proteína.</p>
{sources("issn")}'''))

    rec = [("Batido de guineo y cacao", "1 porción de OVA PRO+ (4 scoops), 1 guineo, 1 cucharada de cacao puro, 250 ml de leche de almendras y hielo.", "Licúa todo 30 segundos.", "PT5M"),
           ("Pancakes proteicos de avena", "1 porción de OVA PRO+ (4 scoops), 40 g de avena en hojuelas, 1 huevo entero, ½ guineo maduro, 60 ml de agua o leche vegetal, ½ cucharadita de polvo de hornear y canela.", "Licúa hasta tener una masa espesa. Cocina porciones en sartén antiadherente a fuego medio, 2 minutos por lado.", "PT15M"),
           ("Café frío proteico", "1 porción de OVA PRO+ (4 scoops), 1 taza de café frío, 100 ml de leche vegetal, hielo y una pizca de canela.", "Agita en el shaker 20 segundos y sirve con hielo.", "PT3M"),
           ("Avena de la noche", "1 porción de OVA PRO+ (4 scoops), 40 g de avena, 1 cucharada de chía y 200 ml de leche deslactosada o bebida vegetal.", "Mezcla en un frasco, tapa y refrigera toda la noche. En la mañana agrega fruta.", "PT5M"),
           ("Batido de mora", "1 porción de OVA PRO+ (4 scoops), 1 taza de mora, 250 ml de agua fría y hielo.", "Licúa 30 segundos. También funciona con maracuyá o frutilla.", "PT5M"),
           ("Bolitas de avena y maní sin horno", "2 porciones de OVA PRO+ (8 scoops), 1 taza de avena, 3 cucharadas de mantequilla de maní y 2 cucharadas de miel.", "Mezcla todo; si queda seco agrega un chorrito de agua. Forma 8 bolitas y refrigera 30 minutos.", "PT15M")]
    rec_html = "".join(f"<h2>{n}</h2><p><strong>Ingredientes:</strong> {i}</p><p><strong>Preparación:</strong> {s}</p>" for n, i, s, _ in rec)
    rec_schema = [{"@context": "https://schema.org", "@type": "Recipe", "name": n, "image": [f"{URL}/assets/img/ova-pro-batido-gimnasio.jpg"],
                   "author": {"@type": "Organization", "name": "OVA Nutrition"}, "totalTime": t, "recipeYield": "1 porción", "recipeCategory": "Snack proteico",
                   "recipeCuisine": "Fitness", "keywords": "proteína de huevo, receta fitness, OVA PRO+",
                   "recipeIngredient": [x.strip() for x in re.split(r",| y (?=\d|hielo|una)", i.rstrip("."))],
                   "recipeInstructions": [{"@type": "HowToStep", "text": s}]} for n, i, s, t in rec]
    rec_faq = c["faq_block"]([
        ("¿La proteína de huevo sabe a huevo?", "Sola en agua tiene un sabor suave con fondo a huevo. Mezclada con fruta, cacao o café casi no se nota."),
        ("¿Pierde proteína si la cocino?", "No. Cocinar cambia la forma de la proteína, no la cantidad."),
        ("¿La puedo poner en el café caliente?", "Sí, si primero la disuelves en un poco de líquido frío o esperas a que el café baje de temperatura."),
    ])
    posts.append(dict(path="/blog/recetas-con-proteina-de-huevo/", crumb="Recetas",
        title="6 recetas con proteína de huevo sin sabor (fáciles) | OVA PRO+",
        h1="6 recetas con proteína de huevo sin sabor",
        lead="Como OVA PRO+ no tiene sabor, se adapta a lo que tengas en la cocina.",
        desc="Recetas fáciles con proteína de huevo sin sabor: batido de guineo y cacao, pancakes, café frío, avena de la noche, batido de mora y bolitas sin horno.",
        body=f'''<div class="answer"><p><strong>Tip:</strong> la proteína de huevo sin sabor funciona como la clara: en frío se mezcla con líquidos y en caliente cuaja. Úsala en batidos, masas y avena. Cada porción de OVA PRO+ que uses suma {dec(PS)} g de proteína.</p></div>{rec_html}
<h2>Trucos para cocinar con proteína de huevo</h2><ul><li>Mezcla primero con el líquido y luego agrega lo sólido, así no se forman grumos.</li><li>En masas, reemplaza hasta un tercio de la harina por OVA PRO+.</li><li>No hace falta cocinarla: el producto ya viene pasteurizado.</li><li>Nunca la eches directo en agua o café hirviendo: la clara se cuaja y quedan grumos. Disuélvela antes en un poco de líquido frío.</li></ul>
{rec_faq[0]}''',
        schema=rec_schema + [rec_faq[1]], published="2026-11-17"))

    posts.append(dict(path="/blog/leucina-aminoacidos-clara-de-huevo/", crumb="Aminoácidos",
        title="Aminoácidos de la clara de huevo: leucina, BCAA y esenciales",
        h1="Aminoácidos de la clara de huevo: leucina, BCAA y esenciales",
        lead="Qué hay en cada porción de OVA PRO+ y por qué importa.",
        desc=f"Perfil de aminoácidos de la proteína de clara de huevo OVA PRO+: {leu} g de leucina y {dec(per_scoop(BCAA))} g de BCAA por porción, los 9 esenciales. Tabla completa.",
        body=f'''<div class="answer"><p><strong>En resumen:</strong> cada porción de OVA PRO+ (4 scoops, {dec(PS)} g de proteína) aporta unos {dec(per_scoop(EAA))} g de aminoácidos esenciales, {dec(per_scoop(BCAA))} g de BCAA y {leu} g de leucina.</p></div>
<h2>Esenciales, BCAA y leucina</h2>
<p>Los <strong>aminoácidos esenciales</strong> son los 9 que tu cuerpo no fabrica: histidina, isoleucina, leucina, lisina, metionina, fenilalanina, treonina, triptófano y valina. Una proteína “completa” los trae todos.</p>
<p>Los <strong>BCAA</strong> (aminoácidos de cadena ramificada) son tres de ellos: leucina, isoleucina y valina. La <strong>leucina</strong> es la que más se estudia porque actúa como señal para iniciar la síntesis de proteína muscular. La ISSN sugiere 0,7–3 g de leucina por toma.</p>
<h2>Perfil completo de OVA PRO+</h2>
{c["amino_list"]()}
<h2>Por porción</h2>
<table><thead><tr><th scope=col>Aminoácido</th><th scope=col class=num>g por porción</th></tr></thead><tbody>
<tr><th scope=row>Leucina</th><td class=num>{leu}</td></tr><tr><th scope=row>Isoleucina</th><td class=num>{dec(per_scoop(5.4))}</td></tr><tr><th scope=row>Valina</th><td class=num>{dec(per_scoop(7.2))}</td></tr>
<tr><th scope=row>Lisina</th><td class=num>{dec(per_scoop(7.2))}</td></tr><tr><th scope=row>Total BCAA</th><td class=num>{dec(per_scoop(BCAA))}</td></tr><tr><th scope=row>Total esenciales</th><td class=num>{dec(per_scoop(EAA))}</td></tr></tbody></table>
<h2>¿Necesitas BCAA aparte?</h2>
<p>Si consumes suficiente proteína completa, como la de huevo, ya recibes BCAA. Tomarlos sueltos tiene menos sentido que asegurar tu proteína total del día.</p>
{sources("issn", "fao")}'''))

    posts.append(dict(path="/blog/como-tomar-proteina-de-huevo/", crumb="Cómo tomarla",
        title="Cómo tomar proteína de huevo: cuándo, cuánto y con qué | OVA PRO+",
        h1="Cómo tomar proteína de huevo: cuándo, cuánto y con qué",
        lead="Guía práctica para sacarle provecho a tu OVA PRO+.",
        desc="Cómo tomar proteína de huevo en polvo: cuántas porciones al día, en qué momento, con qué mezclarla y errores comunes. Guía práctica.",
        body=f'''<div class="answer"><p><strong>En resumen:</strong> mezcla 1 porción (4 scoops, {SCOOP} g) en 250–300 ml de líquido. Úsala para completar tu proteína del día, en 1 o 2 tomas, cuando te quede cómodo. La hora exacta importa menos que el total diario.</p></div>
<h2>Cuánto</h2><p>Depende de cuánta proteína ya comes. Si te faltan 25 g para llegar a tu meta, una porción (4 scoops) basta. Si te faltan 50, dos. Usa la <a href="/calculadora-de-proteina/">calculadora</a>.</p>
<h2>Cuándo</h2><ul><li><strong>Después de entrenar:</strong> práctico y cómodo, aunque el efecto del entrenamiento dura al menos 24 horas.</li><li><strong>En el desayuno:</strong> muchos desayunos son bajos en proteína; una porción lo corrige.</li><li><strong>Entre comidas:</strong> como snack que da saciedad.</li></ul>
<h2>Con qué mezclarla</h2><ul><li>Agua: lo más simple.</li><li>Leche vegetal: más cremosa.</li><li>Batidos con fruta, avena o mantequilla de maní.</li><li>Café frío.</li></ul>
<h2>Errores comunes</h2><ul><li>Echar el polvo antes que el líquido: se forman grumos.</li><li>Usar agua muy caliente en el shaker: la clara cuaja. Si quieres algo caliente, mézclala primero en frío.</li><li>Pensar que el suplemento reemplaza la comida: es un complemento.</li></ul>
{sources("issn")}'''))
    # ---------- Artículos programados (se publican solos en su fecha "published") ----------
    p500 = P["ova-pro-500"]
    PROMO = c["CAT"]["promotions"][0]
    kcal_sc = round(c["PER100"]["kcal"] * SCOOP / 100)
    claras = PS / 3.6
    per_srv = money(round(p500["price"] / p500["servings"]))
    per_srv_promo = money(round(PROMO["unitPrice"] / p500["servings"]))

    f2 = c["faq_block"]([
        ("¿Cuántas porciones trae una bolsa de 500 g?", f"Unas {p500['servings']} porciones de 4 scoops (el scoop de la bolsa es de 8 g)."),
        ("¿Cuánta proteína necesito al día?", 'Depende de tu peso y de tu actividad. Calcúlalo en la <a href="/calculadora-de-proteina/">calculadora de proteína</a>.'),
        ("¿La clara en polvo tiene colesterol?", "El colesterol del huevo está en la yema; la clara casi no tiene."),
    ])
    posts.append(dict(path="/blog/cuantas-claras-de-huevo-es-un-scoop/", crumb="Claras vs proteína en polvo", published="2026-11-26",
        title="¿Cuántas claras de huevo es una porción de proteína?",
        h1="¿Cuántas claras de huevo equivale una porción de proteína?",
        lead="Comparamos proteína, tiempo y costo entre la cubeta, el whey y la clara en polvo.",
        desc=f"Una porción de OVA PRO+ (4 scoops) equivale a unas {round(claras)} claras de huevo. Comparamos proteína, tiempo y costo con la cubeta y el whey en Ecuador.",
        body=f'''<div class="answer"><p><strong>Respuesta corta:</strong> una porción de OVA PRO+ (4 scoops, {SCOOP} g) tiene {dec(PS)} g de proteína, lo mismo que unas {round(claras)} claras de huevo grandes. Cada scoop de 8 g equivale a casi 2 claras.</p></div>
<h2>La cuenta, paso a paso</h2>
<ol><li>Una clara de huevo grande tiene unos 3,6 g de proteína.</li><li>Una porción de OVA PRO+ (4 scoops) tiene {dec(PS)} g.</li><li>{dec(PS)} ÷ 3,6 = {dec(claras)} claras por porción.</li></ol>
<p>La clara en polvo es clara de huevo pasteurizada a la que se le quitó el agua. Por eso concentra tanta proteína en poco peso: el 83 % del polvo es proteína.</p>
<h2>¿Qué sale más barato: huevos, whey o clara en polvo?</h2>
<p>Por gramo de proteína, la cubeta gana. Pero hay que contar el tiempo, las yemas y las calorías.</p>
<table><thead><tr><th scope=col>Opción</th><th scope=col>Proteína</th><th scope=col>Costo aproximado</th><th scope=col>Tiempo</th><th scope=col>Lo que no se ve</th></tr></thead><tbody>
<tr><th scope=row>{round(claras)} claras de cubeta (USD 4–5 por 30 huevos)</th><td>{dec(PS)} g</td><td>USD 0,90–1,20</td><td>10 min</td><td>Sobran {round(claras)} yemas: o te las comes (unas 380 kcal más) o se botan</td></tr>
<tr><th scope=row>4–5 huevos enteros</th><td>{dec(PS)} g</td><td>USD 0,55–0,85</td><td>10 min</td><td>Unas 330 kcal y 22 g de grasa</td></tr>
<tr><th scope=row>1 porción de OVA PRO+</th><td>{dec(PS)} g</td><td>{per_srv} ({per_srv_promo} con la promo)</td><td>30 segundos</td><td>Nada que botar; cabe en la mochila</td></tr>
<tr><th scope=row>Whey de tienda</th><td>20–30 g por medida</td><td>Varía por marca</td><td>30 segundos</td><td>Tiene lácteos</td></tr></tbody></table>
<p>En resumen: si tienes tiempo y te gustan los huevos, cómelos. La clara en polvo es para cuando no hay tiempo, cuando sales del gym o cuando quieres proteína sin la grasa de la yema.</p>
<h2>¿La clara en polvo es igual de nutritiva que la fresca?</h2>
<p>La proteína es la misma; el proceso le quita el agua. Casi no tiene grasa ni carbohidratos. Lo que no trae son los nutrientes de la yema, como la colina y la vitamina D.</p>
<h2>¿Y si mejor me tomo las claras crudas?</h2>
<p>No es buena idea. Un estudio en personas encontró que el cuerpo aprovecha cerca del 91 % de la proteína del huevo cocido y solo cerca del 51 % del crudo. Además, el huevo crudo puede traer salmonela. OVA PRO+ ya viene pasteurizada.</p>
<h2>¿Cuándo conviene cada opción?</h2>
<ul><li><strong>Desayuno con tiempo:</strong> huevos enteros.</li><li><strong>Después de entrenar o en la oficina:</strong> una porción en agua o bebida vegetal.</li><li><strong>Recetas fit:</strong> la clara en polvo se mezcla con la masa sin cambiar mucho el sabor (ver <a href="/blog/recetas-con-proteina-de-huevo/">recetas</a>).</li></ul>
<p>Más sobre el tema en la <a href="/proteina-de-huevo/">guía de proteína de huevo</a> y en la comparación <a href="/ova-vs-whey/">OVA PRO+ vs whey</a>.</p>
{f2[0]}
{sources("huevo_ec", "evenepoel")}''', schema=[f2[1]]))

    f5 = c["faq_block"]([
        ("¿Cuántas porciones al día puedo tomar?", 'Para la mayoría, una o dos bastan para completar lo que no cubre la comida. Calcula tu meta en la <a href="/calculadora-de-proteina/">calculadora de proteína</a>.'),
        ("¿Pueden tomarla los adolescentes?", "Si comen bien, normalmente no la necesitan. Si un adolescente entrena mucho, lo mejor es que lo vea un nutricionista."),
        ("¿La proteína de huevo sube el colesterol?", "El colesterol del huevo está en la yema. La clara casi no tiene."),
    ])
    posts.append(dict(path="/blog/mitos-proteina-en-polvo/", crumb="Mitos de la proteína", published="2026-11-30",
        title="Mitos de la proteína en polvo: riñones, peso y huevo crudo",
        h1="Mitos de la proteína en polvo: lo que dice la evidencia",
        lead="¿Daña los riñones? ¿Engorda? ¿Sirve tomar huevos crudos? Respuestas sin exagerar.",
        desc="¿La proteína daña los riñones? ¿Engorda? ¿Los huevos crudos sirven más? Seis mitos de la proteína en polvo y lo que dice la evidencia.",
        body=f'''<div class="answer"><p><strong>Respuesta corta:</strong> en personas sanas, la proteína en polvo no daña los riñones, no engorda por sí sola y no es solo para fisicoculturistas. Lo que sí es mito es que los huevos crudos sirvan más que los cocidos.</p></div>
<h2>Mito 1: "La proteína daña los riñones"</h2>
<p>En personas con riñones sanos, los estudios no han encontrado daño renal por comer más proteína. Un ensayo de un año con unos 3 g por kilo al día en hombres que entrenaban no encontró efectos dañinos en la función renal ni en la hepática.</p>
<p class="note-box">Si tienes enfermedad renal, diabetes mal controlada o presión alta, tu médico debe decidir cuánta proteína comes. Y toma suficiente agua.</p>
<h2>Mito 2: "La proteína engorda"</h2>
<p>Engorda comer más calorías de las que gastas, vengan de donde vengan. Una porción de OVA PRO+ (4 scoops) tiene {kcal_sc} kcal, casi todas de proteína. La proteína es el nutriente que más llena, por eso se usa en planes para bajar de peso sin perder músculo.</p>
<h2>Mito 3: "Es solo para fisicoculturistas"</h2>
<p>La proteína en polvo es comida: proteína sin el agua. Sirve a quien entrena, pero también a quien no llega a su proteína diaria, a mujeres de 40+ que quieren conservar músculo y a quien desayuna apurado.</p>
<h2>Mito 4: "Los huevos crudos son mejores"</h2>
<p>Es al revés. Un estudio en personas encontró que el cuerpo aprovecha cerca del 91 % de la proteína del huevo cocido y solo cerca del 51 % del crudo. El huevo crudo, además, puede traer salmonela. Si quieres proteína de huevo en un batido, usa clara en polvo pasteurizada o cocina tus huevos.</p>
<h2>Mito 5: "Mientras más proteína, más músculo"</h2>
<p>Hay un techo. Para quien entrena, la ISSN ubica el rango útil entre 1,4 y 2,0 g por kilo al día. Pasar de ahí no suma músculo, solo calorías. Sin entrenamiento de fuerza, la proteína sola no construye músculo.</p>
<h2>Mito 6: "La proteína de huevo es peor que el whey"</h2>
<p>Ambas tienen la puntuación máxima de calidad (PDCAAS 1). El whey tiene algo más de leucina y suele saber mejor; la clara de huevo no tiene lactosa y puede ser un solo ingrediente. La mejor es la que toleras y tomas con constancia. Comparación completa: <a href="/ova-vs-whey/">OVA PRO+ vs whey</a>.</p>
{f5[0]}
{sources("antonio", "evenepoel", "issn")}''', schema=[f5[1]]))

    f3 = c["faq_block"]([
        ("¿Me voy a poner musculosa?", "Ganar volumen exige años de entrenamiento pesado y comer de más. Con proteína suficiente vas a estar más fuerte, no más grande."),
        ("¿La tomo si no voy al gym?", "Puedes, para completar tu proteína del día, pero sumar caminatas y ejercicios de fuerza en casa hace la diferencia."),
        ("¿Sirve en la menopausia?", "La proteína ayuda a conservar el músculo en esta etapa, junto con el entrenamiento de fuerza, el calcio y la vitamina D. No reemplaza el control con tu médico."),
    ])
    posts.append(dict(path="/blog/proteina-para-mujeres-40/", crumb="Proteína para mujeres 40+", published="2026-12-02",
        title="Proteína para mujeres de 40+: cuánta y cómo repartirla",
        h1="Proteína para mujeres de 40+: cuánta necesitas y cómo repartirla",
        lead="Después de los 40 se pierde músculo más rápido. La proteína bien repartida ayuda a frenarlo.",
        desc="Después de los 40 se pierde músculo más rápido. Cuánta proteína necesitas, cómo repartirla en el día y por qué no te vas a poner \"grande\".",
        body=f'''<div class="answer"><p><strong>Respuesta corta:</strong> una mujer activa de más de 40 suele necesitar entre 1,2 y 1,6 g de proteína por kilo de peso al día, repartida en 3 o 4 comidas de 25 a 30 g. La proteína no te pone "grande": eso depende del entrenamiento y de las calorías.</p></div>
<h2>¿Qué cambia después de los 40?</h2>
<p>Con la perimenopausia y la menopausia baja el estrógeno y el cuerpo pierde masa muscular más rápido. Esa pérdida se llama sarcopenia: quita fuerza y equilibrio y hace que quemes menos calorías en reposo.</p>
<p>Dos cosas la frenan: entrenar fuerza y comer suficiente proteína. Una no reemplaza a la otra.</p>
<h2>¿Cuánta proteína necesito?</h2>
<table><thead><tr><th scope=col>Peso</th><th scope=col>Al día (1,2–1,6 g/kg)</th><th scope=col>Por comida (en 3 comidas)</th></tr></thead><tbody>
<tr><th scope=row>55 kg</th><td>66–88 g</td><td>22–29 g</td></tr><tr><th scope=row>65 kg</th><td>78–104 g</td><td>26–35 g</td></tr><tr><th scope=row>75 kg</th><td>90–120 g</td><td>30–40 g</td></tr></tbody></table>
<p>Para tu número exacto usa la <a href="/calculadora-de-proteina/">calculadora de proteína</a>. Si tienes una enfermedad renal, la cantidad la define tu médico.</p>
<h2>El error más común: toda la proteína en el almuerzo</h2>
<p>Muchas mujeres desayunan pan con café, almuerzan bien y cenan liviano. Así la proteína se concentra en una sola comida. Repartirla en el día ayuda más a mantener el músculo.</p>
<p>Un día tipo para 65 kg:</p>
<ul><li><strong>Desayuno (unos 30 g):</strong> avena con una porción de OVA PRO+ (4 scoops) y fruta.</li><li><strong>Almuerzo (30 g):</strong> pollo, pescado o menestra con huevo.</li><li><strong>Media tarde (15 g):</strong> yogur o queso fresco.</li><li><strong>Cena (25 g):</strong> tortilla de huevos con verduras.</li></ul>
<h2>¿La proteína en polvo engorda?</h2>
<p>No más que cualquier otro alimento. Una porción de OVA PRO+ tiene {kcal_sc} kcal y casi nada de grasa ni azúcar. Sube de peso quien come más calorías de las que gasta. Además, la proteína llena más que los carbohidratos. Más en <a href="/blog/mitos-proteina-en-polvo/">mitos de la proteína en polvo</a>.</p>
<h2>¿Por qué de huevo y no de leche?</h2>
<p>Muchas mujeres notan que la leche les cae peor con los años. La clara de huevo no tiene lactosa y es un solo ingrediente, sin saborizantes ni endulzantes. Más en <a href="/blog/proteina-sin-lactosa/">proteína sin lactosa</a>.</p>
{f3[0]}
{sources("issn")}''', schema=[f3[1]]))
    return posts


def LEGAL(c):
    SITE = c["SITE"]
    return [
        dict(path="/legal/terminos/", title="Términos y condiciones", desc="Términos y condiciones de compra en OVA PRO+.",
             body=f'''<p class="note-box">Plantilla base. Revísala con tu asesor legal antes de publicar.</p>
<h2>1. Quiénes somos</h2><p>{c["e"](SITE["legalName"])}{", RUC " + SITE["ruc"] if SITE["ruc"] else ""}, con domicilio en {c["e"](SITE["city"])}, Ecuador, opera la tienda {c["URL"]}.</p>
<h2>2. Productos</h2><p>OVA PRO+ es un suplemento alimenticio. No es un medicamento ni pretende diagnosticar, tratar o prevenir enfermedades. Contiene huevo.</p>
<h2>3. Precios y pagos</h2><p>Los precios están en dólares de EE. UU. e incluyen IVA. Los pagos con tarjeta los procesa PayPhone; no almacenamos datos de tarjetas.</p>
<h2>4. Envíos</h2><p>Los tiempos y costos de envío se detallan en <a href="/envios-y-pagos/">Envíos y pagos</a>.</p>
<h2>5. Cambios y devoluciones</h2><p>Ver <a href="/legal/cambios-y-devoluciones/">política de cambios y devoluciones</a>, conforme a la Ley Orgánica de Defensa del Consumidor.</p>
<h2>6. Promociones</h2><p>Las promociones y códigos tienen las condiciones indicadas en <a href="/promociones/">Promociones</a> y no son acumulables salvo que se indique.</p>'''),
        dict(path="/legal/privacidad/", title="Política de privacidad", desc="Cómo tratamos tus datos personales en OVA PRO+.",
             body=f'''<p class="note-box">Texto base alineado con la Ley Orgánica de Protección de Datos Personales del Ecuador. Revísalo con tu asesor legal.</p>
<h2>Datos que recogemos</h2><p>Cuando haces un pedido guardamos tu nombre, número de cédula, RUC o pasaporte, celular, correo, provincia, ciudad, dirección y referencia de entrega, junto con el detalle de tu compra.</p>
<h2>Para qué los usamos</h2><ul><li>Procesar y entregar tu pedido, y avisarte de su estado por correo o WhatsApp.</li><li>Emitir tu factura y cumplir obligaciones tributarias.</li><li>Atenderte si tienes una consulta o un reclamo, y reconocerte en tu próxima compra.</li></ul>
<p>No usamos tus datos para enviarte publicidad sin tu permiso.</p>
<h2>Con quién los compartimos</h2><p>Solo con quien hace falta para tu pedido: la empresa de mensajería (nombre, teléfono y dirección de entrega), PayPhone si pagas con tarjeta y nuestro proveedor de correo. Si nos escribes por WhatsApp, Meta procesa esa conversación. No vendemos ni alquilamos tus datos.</p>
<h2>Cómo los protegemos y cuánto tiempo</h2><p>Se guardan en nuestro servidor, con acceso restringido por contraseña al equipo de OVA Nutrition. Conservamos los datos de pedidos el tiempo que exige la normativa tributaria y, el resto, mientras seas cliente o hasta que nos pidas eliminarlos.</p>
<h2>Tus derechos</h2><p>Conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador, puedes pedir acceso, rectificación, actualización, eliminación u oposición escribiendo a {SITE["email"]} o por WhatsApp.</p>
<h2>Cookies</h2><p>Usamos almacenamiento local del navegador para recordar tu carrito y tus datos de entrega en tu propio dispositivo, y, si se activa, herramientas de analítica.</p>'''),
        dict(path="/legal/cambios-y-devoluciones/", title="Cambios y devoluciones", desc="Política de cambios y devoluciones de OVA PRO+.",
             body=f'''<p class="note-box">Plantilla base. Ajusta plazos y condiciones antes de publicar.</p>
<p>Si tu pedido llega dañado, abierto o con un producto equivocado, escríbenos por WhatsApp dentro de los 7 días siguientes a la entrega con fotos del empaque. Te enviamos el reemplazo sin costo.</p>
<p>Por tratarse de un alimento, no aceptamos devoluciones de productos abiertos, salvo defecto de fábrica.</p>
<p>Los reembolsos de pagos con tarjeta se procesan a través de PayPhone y el tiempo de acreditación depende de tu banco.</p>'''),
    ]


def LLMS(c, pages):
    P, CAT, SITE, URL, money, dec = c["P"], c["CAT"], c["SITE"], c["URL"], c["money"], c["dec"]
    p500 = P["ova-pro-500"]; PROMO = CAT["promotions"][0]
    from_js = None
    facts = f"""# OVA PRO+ (OVA Nutrition, Ecuador)

> OVA PRO+ es una proteína de albúmina (clara) de huevo en polvo, sin sabor, de la marca ecuatoriana OVA Nutrition. Un solo ingrediente: clara de huevo. {dec(c['PS'])} g de proteína por porción de {c['SCOOP']} g (4 scoops de 8 g), 83,07 % de proteína, 0 % lactosa. Se vende en {URL} con envío a todo Ecuador y pago con PayPhone.

Datos clave (actualizado {c['UPDATED']}):
- Ingrediente: clara de huevo de gallina, desglucosada, deshidratada, envasada y pasteurizada.
- Por 100 g: 357,48 kcal; proteína 83,07 g; carbohidratos 4,05 g; grasa 1,00 g; cenizas 4,88 g; humedad 7,00 g; lactosa 0 g.
- Por porción ({c['SCOOP']} g = 4 scoops de 8 g): {round(c['PER100']['kcal']*c['SCOOP']/100)} kcal; {dec(c['PS'])} g proteína; ≈{dec(c['per_scoop'](9.0))} g leucina; ≈{dec(c['per_scoop'](c['BCAA']))} g BCAA; ≈{dec(c['per_scoop'](c['EAA']))} g aminoácidos esenciales.
- Presentación y precios (USD, IVA incluido): {p500['name']} {money(p500['price'])}. Promoción: 2 bolsas por {money(PROMO['unitPrice']*PROMO['minQty'])} ({money(PROMO['unitPrice'])} c/u) solo pagando por transferencia. No hay presentación de 1 kg por ahora.
- Envío no incluido; se cobra según la ciudad (Quito $2, otras provincias $5). Pagos: {"Visa/Mastercard vía PayPhone, saldo PayPhone y transferencia" if SITE.get("cardPayments") else "transferencia o depósito bancario (pago con tarjeta próximamente)"}.
- Alérgenos: contiene huevo. Sin lácteos. Sin sabor, sin endulzantes.
- Contacto: WhatsApp +{SITE['whatsapp']} · {SITE['email']} · Instagram {SITE['instagram']}

## Páginas principales
"""
    lines = [f"- [{p['title']}]({URL}{p['path']}): {p['desc']}" for p in pages if not p.get("noindex") and p["path"] != "/404.html"]
    llms = facts + "\n".join(lines) + "\n"
    full = [facts]
    for p in pages:
        if p.get("noindex") or p["path"].startswith("/legal") or p["path"] == "/404.html":
            continue
        txt = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", p["body"], flags=re.S)
        txt = re.sub(r"<li[^>]*>", "\n- ", txt)
        txt = re.sub(r"<(h[1-3])[^>]*>", "\n\n## ", txt)
        txt = re.sub(r"</?(p|div|tr|table|ul|ol|section|article)[^>]*>", "\n", txt)
        txt = re.sub(r"<t[hd][^>]*>", " | ", txt)
        txt = re.sub(r"<[^>]+>", "", txt)
        txt = re.sub(r"\n\s*\n+", "\n\n", txt).strip()
        import html as _h
        full.append(f"\n\n# {p['title']}\nURL: {URL}{p['path']}\n\n{_h.unescape(txt)}")
    return llms, "".join(full) + "\n"
