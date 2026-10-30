# porto-calc

Calculadora de direccionamiento IPv4 para Redes de Datos I. Es una página web
estática (HTML, CSS y JavaScript, sin librerías) que recibe una IP con prefijo
(`192.168.10.25/27`) o con máscara (`192.168.10.25` + `255.255.255.224`) y
muestra la red, el broadcast, los hosts, la clase y el tipo de dirección.

Va a quedar publicada con Nginx en Rocky Linux 9 por el puerto 80.

**Avance:** por ahora está lista la parte de validación y cálculo básico
(`public/js/ipv4-core.js`). Falta la clasificación, los casos especiales, la
interfaz y el despliegue. Las instrucciones completas de instalación se
agregan al final.

## Carpetas

- `public/` lo que se sube al servidor
- `tests/` pruebas y datos de prueba
- `deploy/` configuración de Nginx (pendiente)
- `docs/` decisiones que tomamos y capturas

## Pruebas

Se necesita Node.js 18 o más nuevo, solo en el PC donde se desarrolla (el
servidor no lo usa):

```
npm test
```

Las decisiones sobre casos raros (/0, /31, /32, ceros a la izquierda, etc.)
están en [docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md).
