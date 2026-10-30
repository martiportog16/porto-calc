// special-ranges.js
// Tabla de bloques de uso especial. Sale del registro de IANA
// "IANA IPv4 Special-Purpose Address Registry" (consultado el 29/10/2026,
// ultima actualizacion del registro: 2025-10-09), mas el bloque multicast
// 224.0.0.0/4 que no esta en ese registro sino en el de multicast (RFC 5771).
//
// Campos:
//   cidr    bloque
//   name    nombre que se muestra
//   rfc     RFC de referencia
//   global  columna "Globally Reachable" de IANA (true / false / null si no aplica)
//   type    'privada' solo para los tres bloques del RFC 1918, 'especial' para el resto
//   note    explicacion corta para el usuario
//
// Si IANA cambia algo, solo hay que tocar esta lista.

(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.IPv4Calc = root.IPv4Calc || {};
    root.IPv4Calc.specialRanges = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return [
    { cidr: '0.0.0.0/8', name: '"Esta red" (this network)', rfc: 'RFC 791 §3.2', global: false, type: 'especial',
      note: 'Solo puede usarse como origen mientras un equipo arranca y aún no conoce su dirección. No es enrutable.' },
    { cidr: '0.0.0.0/32', name: 'Dirección no especificada (este host en esta red)', rfc: 'RFC 1122 §3.2.1.3', global: false, type: 'especial',
      note: 'Significa "ninguna dirección todavía". No se asigna a una interfaz; en rutas se usa como red de la ruta por defecto.' },
    { cidr: '10.0.0.0/8', name: 'Privada (RFC 1918)', rfc: 'RFC 1918', global: false, type: 'privada',
      note: 'Uso libre dentro de redes internas. Para salir a Internet necesita NAT.' },
    { cidr: '100.64.0.0/10', name: 'Espacio compartido (CGN)', rfc: 'RFC 6598', global: false, type: 'especial',
      note: 'Lo usan los proveedores para NAT a gran escala (CGN). No es privada RFC 1918.' },
    { cidr: '127.0.0.0/8', name: 'Loopback', rfc: 'RFC 1122 §3.2.1.3', global: false, type: 'especial',
      note: 'Tráfico hacia el mismo equipo; nunca debe salir a la red. Los "hosts" del bloque no son equipos distintos.' },
    { cidr: '169.254.0.0/16', name: 'Link-local', rfc: 'RFC 3927', global: false, type: 'especial',
      note: 'Autoconfiguración cuando no hay DHCP. Solo sirve dentro del mismo enlace, los routers no la reenvían. ' +
            'El RFC 3927 reserva los primeros y últimos 256 (169.254.0.x y 169.254.255.x).' },
    { cidr: '172.16.0.0/12', name: 'Privada (RFC 1918)', rfc: 'RFC 1918', global: false, type: 'privada',
      note: 'Va de 172.16.0.0 a 172.31.255.255. Uso libre dentro de redes internas; para salir a Internet necesita NAT.' },
    { cidr: '192.0.0.0/24', name: 'Asignaciones de protocolos IETF', rfc: 'RFC 6890 §2.1', global: false, type: 'especial',
      note: 'Reservado para protocolos del IETF; no se usa salvo por una reserva más específica.' },
    { cidr: '192.0.0.0/29', name: 'Prefijo de continuidad de servicio IPv4 (DS-Lite)', rfc: 'RFC 7335', global: false, type: 'especial',
      note: 'Usado por mecanismos de transición a IPv6 como DS-Lite.' },
    { cidr: '192.0.0.8/32', name: 'Dirección IPv4 ficticia (dummy)', rfc: 'RFC 7600', global: false, type: 'especial',
      note: 'Dirección de relleno para equipos sin IPv4 propia.' },
    { cidr: '192.0.0.9/32', name: 'Anycast de Port Control Protocol', rfc: 'RFC 7723', global: true, type: 'especial',
      note: 'Dirección anycast de servicio; sí es alcanzable globalmente según IANA.' },
    { cidr: '192.0.0.10/32', name: 'Anycast de TURN', rfc: 'RFC 8155', global: true, type: 'especial',
      note: 'Dirección anycast de servicio; sí es alcanzable globalmente según IANA.' },
    { cidr: '192.0.0.170/32', name: 'Descubrimiento NAT64/DNS64', rfc: 'RFC 8880, RFC 7050 §2.2', global: false, type: 'especial',
      note: 'Usada para detectar NAT64. No se enruta.' },
    { cidr: '192.0.0.171/32', name: 'Descubrimiento NAT64/DNS64', rfc: 'RFC 8880, RFC 7050 §2.2', global: false, type: 'especial',
      note: 'Usada para detectar NAT64. No se enruta.' },
    { cidr: '192.0.2.0/24', name: 'Documentación (TEST-NET-1)', rfc: 'RFC 5737', global: false, type: 'especial',
      note: 'Solo para ejemplos en documentación. No debe aparecer en redes reales.' },
    { cidr: '192.31.196.0/24', name: 'AS112-v4', rfc: 'RFC 7535', global: true, type: 'especial',
      note: 'Servicio DNS AS112; sí es alcanzable globalmente según IANA.' },
    { cidr: '192.52.193.0/24', name: 'AMT', rfc: 'RFC 7450', global: true, type: 'especial',
      note: 'Túneles multicast automáticos (AMT); sí es alcanzable globalmente según IANA.' },
    { cidr: '192.88.99.0/24', name: 'Obsoleto (antes 6to4 relay anycast)', rfc: 'RFC 7526', global: null, type: 'especial',
      note: 'Bloque retirado; IANA no le asigna atributos.' },
    { cidr: '192.88.99.2/32', name: 'Anycast de relay 6a44', rfc: 'RFC 6751', global: false, type: 'especial',
      note: 'Mecanismo de transición a IPv6.' },
    { cidr: '192.168.0.0/16', name: 'Privada (RFC 1918)', rfc: 'RFC 1918', global: false, type: 'privada',
      note: 'Uso libre dentro de redes internas. Para salir a Internet necesita NAT.' },
    { cidr: '192.175.48.0/24', name: 'Delegación directa AS112', rfc: 'RFC 7534', global: true, type: 'especial',
      note: 'Servicio DNS AS112; sí es alcanzable globalmente según IANA.' },
    { cidr: '198.18.0.0/15', name: 'Pruebas de rendimiento (benchmarking)', rfc: 'RFC 2544', global: false, type: 'especial',
      note: 'Para pruebas de equipos de red en laboratorio.' },
    { cidr: '198.51.100.0/24', name: 'Documentación (TEST-NET-2)', rfc: 'RFC 5737', global: false, type: 'especial',
      note: 'Solo para ejemplos en documentación. No debe aparecer en redes reales.' },
    { cidr: '203.0.113.0/24', name: 'Documentación (TEST-NET-3)', rfc: 'RFC 5737', global: false, type: 'especial',
      note: 'Solo para ejemplos en documentación. No debe aparecer en redes reales.' },
    { cidr: '224.0.0.0/4', name: 'Multicast', rfc: 'RFC 5771', global: null, type: 'especial',
      note: 'Identifica grupos multicast, no equipos individuales. No se asigna como dirección de host.' },
    { cidr: '240.0.0.0/4', name: 'Reservada (uso futuro)', rfc: 'RFC 1112 §4', global: false, type: 'especial',
      note: 'Reservada por el IETF. No se usa como dirección de host.' },
    { cidr: '255.255.255.255/32', name: 'Broadcast limitado', rfc: 'RFC 919 §7, RFC 8190', global: false, type: 'especial',
      note: 'Llega a todos los equipos del enlace local; los routers nunca la reenvían.' }
  ];
});
