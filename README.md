# porto-calc

Calculadora de direccionamiento IPv4 hecha para Redes de Datos I.

Es una página web estática (HTML, CSS y JavaScript, sin librerías ni
frameworks). Se escribe una IP con prefijo (`192.168.10.25/27`) o una IP con su
máscara (`192.168.10.25` y `255.255.255.224`) y muestra:

- clase tradicional (A, B, C, D o E)
- tipo de dirección: pública, privada RFC 1918 o especial / no global
- dirección de red y broadcast dirigido
- total de direcciones y hosts utilizables
- primer y último host
- máscara decimal, prefijo y wildcard, y la IP y la máscara en binario

También maneja los casos especiales que pide la guía: /31 (RFC 3021), /32,
/0, multicast (clase D), clase E, loopback, link-local, 0.0.0.0 y
255.255.255.255. Las entradas mal escritas muestran un mensaje que explica
el error.

## Dependencias

- **Para usar la página:** solo un navegador. No necesita internet (no carga
  nada externo).
- **Para publicarla:** Rocky Linux 9 con Nginx (se instala con `dnf`).
- **Para correr las pruebas:** Node.js 18 o más nuevo. No hay que instalar
  paquetes con npm; se usa el test runner que ya trae Node.

## Probarla rápido

Abrir `public/index.html` con doble clic. Funciona sin servidor.

## Publicarla en Rocky Linux 9

La guía completa, con capturas sugeridas y solución de problemas, está en
[deploy/DEPLOY.md](deploy/DEPLOY.md). Resumen:

```bash
sudo dnf install -y nginx
sudo mkdir -p /var/www/porto-calc
sudo cp -r public/. /var/www/porto-calc/
sudo restorecon -Rv /var/www/porto-calc
sudo cp deploy/nginx/porto-calc.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl enable --now nginx
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

Antes de `nginx -t` hay que revisar que `nginx.conf` no tenga otro
`default_server` en el puerto 80 (ver paso 4 de la guía). También está
`deploy/instalar.sh`, que hace todo esto de una vez:

```bash
sudo bash deploy/instalar.sh
```

Luego, desde otro equipo de la red: `http://IP_DEL_SERVIDOR/`

## Pruebas

```bash
npm test
```

(o `node --test` si no se tiene npm). Hay 30 pruebas que revisan validación,
conversiones, los casos mínimos de la guía, casos extra, la equivalencia de los
dos formatos de entrada y una comparación con un segundo método de cálculo en
20 000 combinaciones de IP y prefijo.

Los datos de prueba están en `tests/casos.js`.

## Estructura

```
porto-calc/
├── public/                  lo que se publica en el servidor
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── ipv4-core.js       lectura, validación y cálculo del bloque
│       ├── special-ranges.js  tabla de rangos especiales (IANA)
│       ├── ipv4-classify.js   clase A-E y tipo de dirección
│       ├── ipv4-analyze.js    resultado final y casos especiales
│       └── app.js             formulario y presentación
├── tests/
│   ├── casos.js               datos de prueba
│   ├── ipv4-core.test.js
│   └── ipv4-analyze.test.js
├── deploy/
│   ├── nginx/porto-calc.conf  configuración de Nginx (puerto 80)
│   ├── instalar.sh            instalación automática
│   └── DEPLOY.md              guía de despliegue
└── docs/
    ├── decisiones-tecnicas.md
    └── evidencias/            capturas del despliegue
```

Los scripts se cargan en ese orden en `index.html` porque cada uno usa los
anteriores.

## Decisiones técnicas

Lo que la guía no define del todo (/0, /31, cómo mostrar multicast, ceros a la
izquierda, etc.) está explicado en
[docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md).

## Referencias

RFC 950, RFC 1918, RFC 3021, RFC 4632, RFC 6890 y el registro IANA IPv4
Special-Purpose Address Registry. También se consultaron RFC 1112, RFC 1122,
RFC 3927, RFC 5737, RFC 5771 y RFC 6598 para rangos puntuales.
