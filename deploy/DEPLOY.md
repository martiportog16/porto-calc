# Despliegue en Rocky Linux 9 con Nginx

Pasos para dejar la calculadora publicada por HTTP en el puerto 80 y abrirla
desde otro equipo de la red. Todo se hace con un usuario que tenga `sudo`.

Hay un script que hace todo esto (`sudo bash deploy/instalar.sh`), pero para
el informe conviene hacerlo a mano la primera vez y tomar capturas en cada paso.

## 0. Antes de empezar: la red de la máquina virtual

Si Rocky está en una máquina virtual (VirtualBox, VMware...), el adaptador de
red tiene que estar en **adaptador puente (bridge)** o en **red interna /
solo anfitrión** junto con el equipo cliente. En modo **NAT** el otro equipo
no puede llegar al servidor.

Ver la IP del servidor:

```bash
ip -4 addr
# o
hostname -I
```

> **Captura 1:** salida de `ip -4 addr` con la IP del servidor.

## 1. Pasar el código al servidor

Opción A, con Git (si el repositorio es público):

```bash
sudo dnf install -y git
git clone https://github.com/martiportog16/porto-calc.git
cd porto-calc
```

Si el repositorio es privado, Git pide usuario y un token de GitHub en vez de
la contraseña.

Opción B, copiando el ZIP desde otro equipo:

```bash
# en el equipo que tiene el zip
scp porto-calc.zip usuario@IP_DEL_SERVIDOR:~
# en el servidor
sudo dnf install -y unzip
unzip porto-calc.zip && cd porto-calc
```

## 2. Instalar Nginx

```bash
sudo dnf install -y nginx
nginx -v
```

> **Captura 2:** instalación terminada y versión de nginx.

## 3. Copiar la página

```bash
sudo mkdir -p /var/www/porto-calc
sudo cp -r public/. /var/www/porto-calc/
sudo find /var/www/porto-calc -type d -exec chmod 755 {} \;
sudo find /var/www/porto-calc -type f -exec chmod 644 {} \;
```

**SELinux.** Rocky trae SELinux en modo *enforcing*. Los archivos deben tener
el tipo `httpd_sys_content_t` o Nginx responde **403 Forbidden**. `/var/www`
ya tiene ese tipo en la política, solo hay que aplicarlo:

```bash
sudo restorecon -Rv /var/www/porto-calc
ls -Z /var/www/porto-calc
getenforce
```

Debe salir `httpd_sys_content_t` en los archivos y `Enforcing`. No hace falta
desactivar SELinux.

> Si se usa otra carpeta que no esté dentro de `/var/www`, hay que registrar
> la regla primero:
> `sudo semanage fcontext -a -t httpd_sys_content_t "/ruta(/.*)?"` y luego
> `restorecon`. (`semanage` viene en `policycoreutils-python-utils`.)

> **Captura 3:** `ls -Z` y `getenforce`.

## 4. Configurar Nginx

```bash
sudo cp deploy/nginx/porto-calc.conf /etc/nginx/conf.d/
```

El `nginx.conf` de Rocky trae su propio `server` en el puerto 80. Hay que
revisar si dice `default_server`:

```bash
grep -n "listen" /etc/nginx/nginx.conf
```

Si alguna línea dice `listen 80 default_server;` (o `[::]:80 default_server`),
se le quita esa palabra para que no choque con nuestro archivo:

```bash
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.original
sudo sed -i -E 's/(listen\s+(\[::\]:)?80)\s+default_server/\1/' /etc/nginx/nginx.conf
```

Revisar que la configuración no tenga errores:

```bash
sudo nginx -t
```

Tiene que decir `syntax is ok` y `test is successful`.

> **Captura 4:** contenido de `porto-calc.conf` (`cat`) y salida de `nginx -t`.

## 5. Arrancar el servicio

```bash
sudo systemctl enable --now nginx
sudo systemctl reload nginx
systemctl status nginx
```

`enable` hace que arranque solo cuando se reinicia el servidor.

> **Captura 5:** `systemctl status nginx` en `active (running)` y `enabled`.

## 6. Abrir el puerto 80 en el firewall

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
sudo firewall-cmd --list-services
```

En la lista debe aparecer `http`.

> **Captura 6:** `firewall-cmd --list-services`.

## 7. Verificar

En el servidor:

```bash
sudo ss -tlnp | grep ':80 '
curl -I http://localhost/
```

Debe verse nginx escuchando en `0.0.0.0:80` y la respuesta `HTTP/1.1 200 OK`.

Desde **otro equipo** de la red:

- Navegador: `http://IP_DEL_SERVIDOR/`
- Terminal (Windows 10/11, Linux o Mac): `curl -I http://IP_DEL_SERVIDOR/`
- Opcional: `ping IP_DEL_SERVIDOR`

> **Captura 7:** `ss` y `curl -I` en el servidor.
> **Captura 8:** la calculadora abierta en el navegador del otro equipo, con la
> IP del servidor visible en la barra de direcciones.
> **Captura 9:** `curl -I` desde el otro equipo con `200 OK`.
> **Capturas** de los casos de prueba: usar los botones de "Ejemplos de la guía".

Prueba de que sobrevive a un reinicio (opcional pero recomendable):

```bash
sudo reboot
# al volver
systemctl is-active nginx
```

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `403 Forbidden` | Contexto SELinux o permisos | `restorecon -Rv /var/www/porto-calc`, revisar `ls -Z` y permisos 755/644. Ver `sudo ausearch -m avc -ts recent` |
| `duplicate default server` en `nginx -t` | `default_server` en dos sitios | Paso 4, quitarlo de `nginx.conf` |
| Se ve la página de prueba de Nginx/Rocky | Nuestro server no es el que responde | Revisar paso 4 y hacer `reload` |
| Funciona en el servidor pero no desde otro equipo (se queda cargando) | Firewall o VM en NAT | Paso 6 y paso 0 |
| `Connection refused` | Nginx apagado | `systemctl status nginx`, `journalctl -u nginx` |
| La página sale pero no calcula | Falta algún .js | `ls /var/www/porto-calc/js` debe tener 5 archivos; ver consola del navegador (F12) |

## Actualizar después de cambios

```bash
cd porto-calc && git pull
sudo cp -r public/. /var/www/porto-calc/
sudo restorecon -Rv /var/www/porto-calc
```
