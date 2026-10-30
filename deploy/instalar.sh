#!/usr/bin/env bash
# Instala la calculadora en Rocky Linux 9 con Nginx (puerto 80).
# Uso, desde la carpeta raiz del proyecto:
#     sudo bash deploy/instalar.sh
# Hace los mismos pasos que deploy/DEPLOY.md; se puede correr varias veces.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Hay que correrlo con sudo: sudo bash deploy/instalar.sh"
  exit 1
fi

DIR_PROYECTO="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO=/var/www/porto-calc

echo "== 1. Instalando nginx"
dnf install -y nginx

echo "== 2. Copiando archivos a $DESTINO"
mkdir -p "$DESTINO"
cp -r "$DIR_PROYECTO"/public/. "$DESTINO"/
chown -R root:root "$DESTINO"
find "$DESTINO" -type d -exec chmod 755 {} \;
find "$DESTINO" -type f -exec chmod 644 {} \;

echo "== 3. Contexto SELinux"
restorecon -Rv "$DESTINO"
ls -Z "$DESTINO"

echo "== 4. Configuracion de nginx"
cp "$DIR_PROYECTO"/deploy/nginx/porto-calc.conf /etc/nginx/conf.d/porto-calc.conf
# si el server por defecto de nginx.conf tambien dice default_server, nginx -t
# falla con "duplicate default server"; se le quita esa palabra
if grep -qE 'listen\s+(\[::\]:)?80\s+default_server' /etc/nginx/nginx.conf; then
  cp -n /etc/nginx/nginx.conf /etc/nginx/nginx.conf.original
  sed -i -E 's/(listen\s+(\[::\]:)?80)\s+default_server/\1/' /etc/nginx/nginx.conf
  echo "   se quito default_server de nginx.conf (copia en nginx.conf.original)"
fi
nginx -t

echo "== 5. Activando el servicio"
systemctl enable --now nginx
systemctl reload nginx
systemctl --no-pager status nginx | head -5

echo "== 6. Firewall (puerto 80)"
if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=http
  firewall-cmd --reload
  firewall-cmd --list-services
else
  echo "   firewalld no esta activo, se omite"
fi

echo "== 7. Verificacion local"
ss -tlnp | grep ':80 ' || true
curl -sI http://localhost/ | head -1

echo
echo "Listo. Desde otro equipo abra:  http://$(hostname -I | awk '{print $1}')/"
