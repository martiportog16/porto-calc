# Decisiones técnicas

Aquí van las cosas que el enunciado no define del todo y cómo las resolvimos.
Lo que sí pide el profesor está marcado como (enunciado).

## Cómo está hecho

- Página estática con HTML, CSS y JavaScript sin frameworks. No hace falta
  backend ni base de datos porque todo el cálculo se puede hacer en el
  navegador. Se sirve con Nginx en Rocky Linux 9, puerto 80 (enunciado).
- Los .js son scripts normales y no módulos ES. Así la página se puede abrir
  con doble clic sin montar un servidor local, que era útil para probar en los
  PCs de la universidad. Lo malo es que hay que cargar los scripts en orden en
  el HTML.
- El cálculo está separado de la interfaz: `ipv4-core.js` lee y calcula,
  otros archivos clasifican y `app.js` es lo único que toca la página.
- Los dos formatos de entrada (IP/prefijo e IP + máscara) se convierten a lo
  mismo (IP y prefijo) y pasan por la misma función, entonces siempre dan el
  mismo resultado (enunciado).
- Las pruebas usan el test runner que ya trae Node, sin instalar paquetes.

## Validación (ya implementado)

- 4 octetos entre 0 y 255, prefijo entre 0 y 32, máscara contigua (enunciado).
- Solo se aceptan dígitos del 0 al 9. Cosas como `0x0A`, `1e2` o `-1` se
  rechazan aunque JavaScript las pueda convertir a número.
- No se aceptan ceros a la izquierda (`192.168.01.1`, `/08`). Algunos
  programas leen `010` como octal (8), entonces preferimos no aceptarlo.
- Los espacios al principio y al final se quitan; si hay espacios en medio,
  es error.
- `0.0.0.0` se acepta como máscara (/0) y `255.255.255.255` también (/32).
- Si alguien escribe una wildcard (`0.0.0.255`) el mensaje le dice cuál sería
  la máscara correcta.

## Casos especiales (por implementar)

- La clase A–E sale solo del primer octeto, nunca del prefijo (enunciado).
- El tipo de dirección (pública, privada, especial) se decide con la IP que
  escribe el usuario. Si el bloque que resulta se sale de ese rango (por
  ejemplo `10.0.0.1/7`, que llega hasta 11.255.255.255) se muestra un aviso.
- /31: siguiendo el RFC 3021, 2 direcciones utilizables y sin broadcast
  (enunciado). La calculadora no sabe si de verdad es un enlace punto a punto,
  así que lo asume y lo dice en una nota.
- /32: una sola dirección, sin broadcast ni fórmula de hosts (enunciado).
- /0: se acepta. Total 4294967296, se muestra como ruta por defecto y no se
  calculan hosts ni broadcast.
- Clase D y E: se muestra el bloque pero no se calculan hosts ni broadcast
  porque no son direcciones de host normales (enunciado). La 255.255.255.255 se
  muestra como broadcast limitado.
- Loopback, link-local y similares: se hace el cálculo pero con un aviso de
  que no son direcciones enrutables.
- 100.64.0.0/10 no es privada RFC 1918, es espacio compartido (RFC 6598).
- La lista de rangos especiales se revisa contra el registro de IANA antes de
  programarla.

## Detalles de JavaScript a tener en cuenta

- Los operadores de bits devuelven números con signo, por eso se usa `>>> 0`.
- `0xFFFFFFFF << 32` no da 0 en JS, así que el /0 se trata aparte.
- El total se calcula con `Math.pow(2, 32 - prefijo)`.
- Antes de convertir un octeto a número se revisa que sean solo dígitos,
  porque `parseInt("12abc")` da 12 y `Number("")` da 0.
