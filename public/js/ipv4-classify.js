// ipv4-classify.js
// Clase tradicional (A-E) y tipo de uso (publica, privada o especial).
// Son dos cosas distintas y ninguna depende del prefijo que escriba el usuario.
// Necesita ipv4-core.js y special-ranges.js cargados antes.

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ipv4-core.js'), require('./special-ranges.js'));
  } else {
    root.IPv4Calc = root.IPv4Calc || {};
    root.IPv4Calc.classify = factory(root.IPv4Calc.core, root.IPv4Calc.specialRanges);
  }
})(typeof self !== 'undefined' ? self : this, function (core, rawRanges) {
  'use strict';

  // Se pasa la tabla a enteros una sola vez al cargar
  var ranges = rawRanges.map(function (r) {
    var c = core.parseCidr(r.cidr);
    if (!c.ok) throw new Error('Rango mal escrito en special-ranges.js: ' + r.cidr);
    var b = core.blockInfo(c.ip, c.prefix);
    return {
      cidr: r.cidr, name: r.name, rfc: r.rfc, global: r.global, type: r.type, note: r.note,
      network: b.network, prefix: c.prefix, last: b.lastAddress
    };
  });

  // Clase segun los primeros bits (RFC 791 / RFC 1112):
  //   0xxx A, 10xx B, 110x C, 1110 D, 1111 E
  // Es lo mismo que mirar el primer octeto: 0-127, 128-191, 192-223, 224-239, 240-255
  var CLASES = {
    A: { letter: 'A', bits: '0',    range: '0 – 127',   desc: 'Unicast' },
    B: { letter: 'B', bits: '10',   range: '128 – 191', desc: 'Unicast' },
    C: { letter: 'C', bits: '110',  range: '192 – 223', desc: 'Unicast' },
    D: { letter: 'D', bits: '1110', range: '224 – 239', desc: 'Multicast' },
    E: { letter: 'E', bits: '1111', range: '240 – 255', desc: 'Reservada (experimental)' }
  };

  function getClass(ip) {
    var o = ip >>> 24;
    if (o < 128) return CLASES.A;
    if (o < 192) return CLASES.B;
    if (o < 224) return CLASES.C;
    if (o < 240) return CLASES.D;
    return CLASES.E;
  }

  function contains(r, ip) {
    return ip >= r.network && ip <= r.last;
  }

  // Busca el rango que contiene la IP. Si hay varios (por ejemplo 0.0.0.0 esta
  // en 0.0.0.0/8 y en 0.0.0.0/32) se queda con el mas especifico, el de
  // prefijo mas largo.
  function findRange(ip) {
    var best = null;
    for (var i = 0; i < ranges.length; i++) {
      if (contains(ranges[i], ip) && (!best || ranges[i].prefix > best.prefix)) {
        best = ranges[i];
      }
    }
    return best;
  }

  // Tipo de uso de la direccion:
  //   'privada'   -> 10/8, 172.16/12, 192.168/16
  //   'especial'  -> cualquier otro bloque de la tabla
  //   'publica'   -> no esta en ningun bloque especial
  function getUsage(ip) {
    var r = findRange(ip);
    if (!r) {
      return {
        type: 'publica',
        label: 'Pública (global)',
        name: 'Unicast pública',
        rfc: null,
        cidr: null,
        globallyReachable: true,
        note: 'No pertenece a ningún bloque reservado, es enrutable en Internet.'
      };
    }
    var label;
    if (r.type === 'privada') label = 'Privada (RFC 1918)';
    else if (r.global === true) label = 'Especial (alcanzable globalmente)';
    else label = 'Especial / no global';
    return {
      type: r.type,
      label: label,
      name: r.name,
      rfc: r.rfc,
      cidr: r.cidr,
      globallyReachable: r.global,
      note: r.note
    };
  }

  // Lista los rangos especiales que se cruzan con el bloque network/prefix.
  // Sirve para avisar cuando el bloque calculado mezcla tipos de direcciones,
  // por ejemplo 10.0.0.1/7 llega hasta 11.255.255.255, que ya es publica.
  function rangesOverlapping(network, prefix) {
    var last = core.blockInfo(network, prefix).lastAddress;
    return ranges.filter(function (r) {
      return r.network <= last && r.last >= network;
    });
  }

  // true si el bloque cabe completo dentro del rango
  function blockInsideRange(network, prefix, cidr) {
    var r = ranges.filter(function (x) { return x.cidr === cidr; })[0];
    if (!r) return false;
    var last = core.blockInfo(network, prefix).lastAddress;
    return network >= r.network && last <= r.last;
  }

  return {
    ranges: ranges,
    getClass: getClass,
    findRange: findRange,
    getUsage: getUsage,
    rangesOverlapping: rangesOverlapping,
    blockInsideRange: blockInsideRange
  };
});
