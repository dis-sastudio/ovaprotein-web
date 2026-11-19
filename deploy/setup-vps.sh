#!/usr/bin/env bash
# Instala OVA PRO+ en un VPS Ubuntu/Debian (Hostinger). Ejecutar como root desde la carpeta del proyecto:
#   sudo bash deploy/setup-vps.sh correo@para-certificado.com
# Es seguro si el VPS ya tiene otros sitios: solo agrega un bloque nginx nuevo y un servicio propio.
set -euo pipefail
EMAIL="${1:-}"
APP=/var/www/ovaprotein
SRC="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Paquetes =="
apt-get update -y
command -v nginx >/dev/null || apt-get install -y nginx
command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx
command -v rsync >/dev/null || apt-get install -y rsync
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "== Usuario y carpeta =="
id ovaprotein >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin ovaprotein
mkdir -p "$APP/storage"
rsync -a --delete --exclude node_modules --exclude storage --exclude .env --exclude .git "$SRC/" "$APP/"
[ -f "$APP/.env" ] || cp "$APP/.env.example" "$APP/.env"
chown -R ovaprotein:ovaprotein "$APP"
chmod 600 "$APP/.env"

echo "== Servicio =="
cp "$APP/deploy/ovaprotein.service" /etc/systemd/system/ovaprotein.service
systemctl daemon-reload
systemctl enable --now ovaprotein
systemctl restart ovaprotein

echo "== nginx =="
cp "$APP/deploy/nginx-ovaprotein.conf" /etc/nginx/sites-available/ovaprotein.com
ln -sf /etc/nginx/sites-available/ovaprotein.com /etc/nginx/sites-enabled/ovaprotein.com
nginx -t
systemctl reload nginx

echo "== HTTPS =="
if [ -n "$EMAIL" ]; then
  certbot --nginx -d ovaprotein.com -d www.ovaprotein.com --non-interactive --agree-tos -m "$EMAIL" --redirect || \
    echo "Certbot falló: revisa que el DNS de ovaprotein.com y www apunte a la IP de este VPS y vuelve a correr certbot."
else
  echo "Sin correo: corre luego  certbot --nginx -d ovaprotein.com -d www.ovaprotein.com"
fi

echo "== Prueba =="
sleep 1
curl -fsS -o /dev/null -w "API local: %{http_code}\n" -X POST http://127.0.0.1:3107/api/pago/confirmar -H 'Content-Type: application/json' -d '{}' || true
echo "Listo. Edita $APP/.env con las claves de PayPhone y WhatsApp y luego: systemctl restart ovaprotein"
