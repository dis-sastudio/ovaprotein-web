# OVA PRO+ — tienda web

Sitio estático rápido + funciones serverless en Netlify:

- **Tienda** con carrito, precio según forma de pago (tarjeta $27 / promo 2 × $50 por transferencia), envío por zona aparte e IVA incluido.
- **Cobro con PayPhone** (botón de pago por redirección: el token nunca llega al navegador y el precio se recalcula en el servidor).
- **Bot de WhatsApp** (WhatsApp Cloud API) con menú, botones, enlace de pago directo, paso a asesor humano y modo IA opcional.
- **Asistente en la web** que responde lo mismo que el bot y deriva a WhatsApp.
- **SEO + GEO**: 22 páginas con contenido sobre proteína de huevo, datos estructurados, `sitemap.xml`, `robots.txt` abierto a buscadores de IA, `llms.txt` y `llms-full.txt`.

```
data/catalog.json    precios, promos, cupones, envíos   ← editar aquí
data/site.json       WhatsApp, correo, ciudad, ARCSA…    ← editar aquí
content.py           textos de todas las páginas
build.py             genera /public (python3 build.py)
public/              el sitio que se publica
netlify/functions/   pago-preparar, pago-confirmar, whatsapp-webhook
tests/test.mjs       pruebas de precios y del bot (npm test)
```

## 1. Antes de publicar (pendientes)

Edita `data/site.json` y ejecuta `python3 build.py`:

| Campo | Qué poner |
|---|---|
| `whatsapp` / `whatsappDisplay` | Número real en formato 5939XXXXXXXX |
| `legalName`, `ruc` | Razón social y RUC (salen en Términos) |
| `city`, `region` | Ciudad base para entregas locales |
| `arcsa` | Número de notificación sanitaria ARCSA (se muestra en el pie) |
| `tiktok` | URL si existe (Instagram @ovaprotein y Facebook /ovaprotein ya están) |
| `reviewer` | Nombre del nutricionista que revisa el contenido (mejora E‑E‑A‑T) |

En `data/catalog.json` confirma los costos de envío por zona ($3 local, $5 nacional y $12 Galápagos son de ejemplo). Precio actual: OVA PRO+ 500 g $27; promo 2 bolsas a $25 c/u solo por transferencia (`promotions`), sin envío gratis (`freeFrom: null`). Para volver a vender 1 kg, combos o cupones, agrégalos en `products` / `coupons`. Si un producto no lleva IVA, cambia `pricesIncludeTax`/`taxRate` con tu contador.

Revisa con un abogado las plantillas de `/legal/`.

## 2. Publicar en Netlify

1. Sube esta carpeta a un repositorio de GitHub y conéctalo en Netlify (o arrástrala en *Deploy manually*).
2. Netlify detecta `netlify.toml`: publica `public/` y despliega las funciones. Netlify Blobs (registro de pedidos y estado del bot) se activa solo.
3. Conecta el dominio `ovaprotein.com` y fuerza `www` + HTTPS.
4. Carga las variables de `.env.example` en *Site configuration → Environment variables*.

## 2a. Publicar en el VPS con Coolify (recomendado si el VPS tiene Coolify)

1. Sube el proyecto a un repositorio de GitHub (privado).
2. En Coolify: *Projects → New → Application → Private Repository (GitHub App)*, elige el repo y la rama `main`. Build pack: **Dockerfile** (ya incluido). Puerto: **3107**.
3. *Domains*: `https://www.ovaprotein.com,https://ovaprotein.com`. Coolify saca el HTTPS solo.
4. *Environment variables*: copia las de `.env.example` (`SITE_URL`, `CANONICAL_HOST=www.ovaprotein.com`, PayPhone, WhatsApp, Resend).
5. *Persistent storage*: monta un volumen en `/app/storage` (pedidos y estado del bot).
6. DNS en Hostinger: registros **A** de `@` y `www` → IP del VPS. No toques MX, SPF, DKIM ni DMARC (correo).
7. Activa *Auto deploy*: cada push a `main` publica la nueva versión.

## 2b. Publicar en un VPS sin Coolify (nginx)

El proyecto trae su propio servidor (`server/server.mjs`, Node 20, sin dependencias) para no depender de Netlify. nginx sirve los archivos y pasa `/api/*` al servidor Node en el puerto 3107. Los pedidos y el estado del bot se guardan como JSON en `/var/www/ovaprotein/storage`.

1. En el DNS de ovaprotein.com crea registros **A** para `@` y `www` con la IP del VPS.
2. Sube la carpeta del proyecto al VPS (por ejemplo con `scp -r ova-pro-web root@IP:/root/`).
3. En el VPS: `cd /root/ova-pro-web && sudo bash deploy/setup-vps.sh tu-correo@ovaprotein.com`
   - Instala nginx, Node 20 y certbot si faltan; crea el usuario `ovaprotein`, el servicio `ovaprotein` y el sitio en nginx; saca el certificado HTTPS.
   - No toca otros sitios que ya tengas en el VPS.
4. Edita `/var/www/ovaprotein/.env` con las claves y corre `systemctl restart ovaprotein`.
5. Para actualizar: vuelve a subir la carpeta y corre el mismo script (no borra `.env` ni `storage`).

Registros: `journalctl -u ovaprotein -f`.

## 3. PayPhone

1. Cuenta **PayPhone Business** → en **PayPhone Developer** crea una aplicación tipo *WEB*.
2. Registra el dominio exacto (`https://www.ovaprotein.com`). PayPhone bloquea dominios no registrados.
3. URL de respuesta: `https://www.ovaprotein.com/pago/` · URL de cancelación: `https://www.ovaprotein.com/carrito/?cancelado=1`.
4. Copia el **Token** a `PAYPHONE_TOKEN` y el **StoreId** a `PAYPHONE_STORE_ID`.
5. Prueba en modo pruebas y luego pide el paso a producción.

Flujo: carrito → `/api/pago/preparar` (calcula total, llama a `button/Prepare`) → formulario de PayPhone → `/pago/` → `/api/pago/confirmar` (`button/V2/Confirm`).
PayPhone **reversa el cobro si no se confirma en 5 minutos**; la página `/pago/` lo hace sola al cargar.
Cada pedido queda guardado en Netlify Blobs (`pedidos`) y, si configuras `RESEND_API_KEY` + `ORDER_EMAIL_TO`, te llega un correo con los datos de entrega.

Comisión de la cajita/botón PayPhone según su web: 5 % + IVA por transacción, sin mensualidad.

## 4. Bot de WhatsApp

### Opción A — Bot automático (WhatsApp Cloud API) · recomendado
1. En **Meta for Developers** crea una app de tipo *Business* y agrega el producto WhatsApp.
2. Registra el número. Para seguir respondiendo desde el celular usa el **modo coexistencia** (mismo número en la app WhatsApp Business y en la API).
3. *Configuration → Webhook*: URL `https://www.ovaprotein.com/api/whatsapp`, token de verificación = `WA_VERIFY_TOKEN`. Suscríbete a `messages`.
4. Crea un token permanente de usuario del sistema → `WA_ACCESS_TOKEN`. Copia `WA_PHONE_NUMBER_ID` y el *App secret* → `WA_APP_SECRET`.

Qué hace:
- Menú con lista: comprar, precios y promos, tabla nutricional, cómo se toma, envíos, pagos, OVA vs whey, asesor.
- Botón **Pagar con tarjeta** que abre el carrito con el producto cargado (`/carrito/?add=ova-pro-500`).
- Entiende texto libre ("cuánto cuesta", "tiene lactosa", "envían a Quito", `/pago`, `/datos`, `/envio`).
- **Asesor humano**: al pedirlo, el bot se calla 12 horas con ese cliente para que respondas tú. Escribir "menú" lo reactiva.
- Lista de espera de **OVA HER** ("avísame") guardada en Blobs.
- **Modo IA (opcional)**: con `ANTHROPIC_API_KEY`, las preguntas que no reconoce las responde un modelo limitado a la base de conocimiento de OVA PRO+. Sin la clave, deriva a asesor.

Los textos están en `public/assets/js/bot-brain.mjs` y los comparte el asistente de la web.
Costos: Meta cobra por mensajes de plantilla iniciados por la empresa; las respuestas dentro de la ventana de 24 h a un cliente que escribió primero no tienen costo por mensaje (revisa la tarifa vigente de Meta para Ecuador).

### Opción B — Sin costo, con la app WhatsApp Business
Si aún no quieres la API, configura en la app (Herramientas para la empresa):
- **Mensaje de bienvenida**: «¡Hola! 💪 Bienvenido a OVA Nutrition. OVA PRO+ es proteína 100 % clara de huevo: 33,2 g por scoop y 0 % lactosa. Responde: 1️⃣ Comprar · 2️⃣ Tabla nutricional · 3️⃣ Hablar con un asesor. Tienda: https://www.ovaprotein.com»
- **Respuestas rápidas**: `/pago` (enlace al carrito + datos de transferencia), `/datos` (tabla nutricional), `/envio` (tarifas y tiempos). Copia los textos de `bot-brain.mjs`.
- **Catálogo**: agrega OVA PRO+ 500 g ($27) y la promo 2 × $50 por transferencia, con enlace a la web.

## 5. SEO y GEO: qué está hecho y qué falta

Hecho:
- Una URL fuerte por intención: producto (`/proteina-de-huevo-ova-pro/`), guía pilar (`/proteina-de-huevo/`), comparativa (`/ova-vs-whey/`), calculadora, promociones, FAQ y 5 artículos.
- Schema: `Organization`+`OnlineStore`, `WebSite`, `ProductGroup` con variantes, ofertas, envío y política de devolución (listados de comerciante en Google), `FAQPage`, `Article`, `Recipe`, `BreadcrumbList`, `WebApplication`.
- Respuesta corta al inicio de cada guía, tablas con datos, fuentes científicas enlazadas y fecha de actualización: el formato que más citan los buscadores con IA.
- `llms.txt` / `llms-full.txt` con datos del producto; `robots.txt` permite a GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.
- `hreflang es-EC`, Open Graph, imagen social, fuentes propias, imágenes WebP con tamaño fijo (buen CLS), sin frameworks pesados.
- Redirecciones 301 desde `/eggstrong*` por si existían enlaces de la marca anterior.

Por hacer tú:
1. **Google Search Console** y **Bing Webmaster Tools**: verifica el dominio y envía `sitemap.xml`.
2. **Google Merchant Center**: crea la cuenta y usa la fuente automática desde el sitio (los datos estructurados ya están).
3. **Perfil de Empresa de Google** con la ciudad, horario y WhatsApp (clave para "proteína cerca de mí").
4. Pega GA4 / Meta Pixel donde dice `<!-- Analítica -->` en `build.py`. El código ya envía `add_to_cart`, `begin_checkout`, `purchase` y `calculadora_proteina`.
5. Consigue reseñas reales de clientes (Google y en la web). No publiques reseñas inventadas.
6. Publica 2 artículos al mes (ideas: proteína para mujeres/OVA HER, proteína en ayunas, proteína y keto, precio por gramo de proteína en Ecuador).
7. Usa siempre el mismo nombre de marca (OVA PRO+ / OVA Nutrition) en Instagram, TikTok, Google y marketplaces: la consistencia de entidad ayuda a que las IA te reconozcan.

## 6. Cuidado con las afirmaciones

En la web se evitó decir "0 % inflamación" (no hay evidencia general) y "hidrolizada" (la ficha técnica dice clara deshidratada, no hidrolizada). Ajusta también esos textos en redes y en el bot de WhatsApp para no tener problemas con ARCSA ni con la publicidad en Meta.

## Desarrollo local

```bash
python3 build.py         # regenera /public
npm install && npm test  # pruebas de precios y del bot
npx netlify dev          # sitio + funciones en http://localhost:8888
```
