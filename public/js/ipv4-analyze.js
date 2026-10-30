// ipv4-analyze.js
// Junta todo: con la IP y el prefijo ya validados arma el resultado completo
// y aplica las reglas de los casos especiales (/0, /31, /32, clase D y E).
// Necesita ipv4-core.js, special-ranges.js e ipv4-classify.js cargados antes.
//
// Los campos que no aplican quedan en null y llevan una nota (xxxNote)
// explicando por que, para que la interfaz muestre "No aplica: ...".

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ipv4-core.js'), require('./ipv4-classify.js'));
  } else {
    root.IPv4Calc = root.IPv4Calc || {};
    root.IPv4Calc.analyze = factory(root.IPv4Calc.core, root.IPv4Calc.classify);
  }
})(typeof self !== 'undefined' ? self : this, function (core, classify) {
  'use strict';

  var LIMITED_BROADCAST = 0xFFFFFFFF;

  function fmt(n) {
    // 16777216 -> "16 777 216" (espacio como separador de miles)
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function analyze(ip, prefix) {
    var b = core.blockInfo(ip, prefix);
    var ipClass = classify.getClass(ip);
    var usage = classify.getUsage(ip);
    var ipStr = core.intToIp;

    var r = {
      ip: ipStr(ip),
      prefix: prefix,
      cidr: ipStr(ip) + '/' + prefix,
      mask: ipStr(b.mask),
      wildcard: ipStr(b.wildcard),
      ipBinary: core.intToBinary(ip),
      maskBinary: core.intToBinary(b.mask),
      ipClass: ipClass,
      usage: usage,
      kind: 'subred',
      blockFirst: ipStr(b.network),   // primera y ultima direccion del bloque,
      blockLast: ipStr(b.lastAddress), // solo aritmetica, siempre se muestran
      total: b.total,
      totalText: fmt(b.total),
      network: ipStr(b.network), networkNote: null,
      broadcast: null, broadcastNote: null,
      usable: null, usableText: null, usableNote: null,
      firstHost: null, lastHost: null, hostRangeNote: null,
      notes: [],
      warnings: []
    };

    // ---------- clase D: multicast ----------
    if (ipClass.letter === 'D') {
      r.kind = 'multicast';
      r.networkNote = 'Es el inicio del bloque multicast, no una red de hosts.';
      r.broadcastNote = 'No aplica: en multicast no hay broadcast dirigido.';
      r.usableNote = 'No aplica: las direcciones de clase D identifican grupos multicast, no hosts.';
      r.hostRangeNote = 'No aplica (multicast).';
      r.notes.push('Clase D (224.0.0.0/4): direcciones de grupo multicast (RFC 5771). ' +
        'Se muestra el bloque solo como cálculo, sin tratarlo como subred unicast.');
    }

    // ---------- clase E: reservada (incluye 255.255.255.255) ----------
    else if (ipClass.letter === 'E') {
      r.kind = 'reservada';
      r.networkNote = 'Es el inicio del bloque, pero la clase E no se usa para redes de hosts.';
      r.broadcastNote = 'No aplica: la clase E no se usa para subredes unicast.';
      r.usableNote = 'No aplica: la clase E está reservada (RFC 1112), no se asigna a hosts.';
      r.hostRangeNote = 'No aplica (clase E reservada).';
      if (ip === LIMITED_BROADCAST) {
        r.kind = 'broadcast-limitado';
        r.notes.push('255.255.255.255 es el broadcast limitado (RFC 919, RFC 8190): llega a todos los ' +
          'equipos del enlace local y ningún router lo reenvía. No es un broadcast dirigido de una subred.');
      } else {
        r.notes.push('Clase E (240.0.0.0/4): reservada para uso futuro (RFC 1112). ' +
          'Se muestra el bloque solo como cálculo.');
      }
    }

    // ---------- /0: ruta por defecto ----------
    else if (prefix === 0) {
      r.kind = 'ruta-por-defecto';
      r.networkNote = '0.0.0.0/0 es la ruta por defecto: abarca todas las direcciones IPv4.';
      r.broadcastNote = 'No aplica: /0 no es una subred real, es la ruta por defecto.';
      r.usableNote = 'No aplica: /0 cubre todo IPv4 (incluye privadas, multicast y reservadas).';
      r.hostRangeNote = 'No aplica (/0).';
      r.notes.push('Con /0 la máscara es 0.0.0.0 y todos los bits son de host. Se usa en tablas de ' +
        'enrutamiento como "cualquier destino" (RFC 4632).');
    }

    // ---------- /32: una sola direccion ----------
    else if (prefix === 32) {
      r.kind = 'host';
      r.networkNote = 'Con /32 el bloque es solo esta dirección.';
      r.broadcastNote = 'No aplica: un /32 tiene una sola dirección.';
      r.usable = 1;
      r.usableText = '1';
      r.usableNote = 'Dirección individual / ruta de host. No se aplica 2^n − 2 (daría −1).';
      r.firstHost = r.ip;
      r.lastHost = r.ip;
      r.notes.push('/32 identifica un único equipo. Se usa, por ejemplo, en interfaces loopback de ' +
        'routers o en rutas hacia un host específico.');
    }

    // ---------- /31: enlace punto a punto (RFC 3021) ----------
    else if (prefix === 31) {
      r.kind = 'punto-a-punto';
      r.networkNote = 'En /31 no se reserva dirección de red (RFC 3021).';
      r.broadcastNote = 'No aplica: según el RFC 3021 un /31 no tiene broadcast dirigido.';
      r.usable = 2;
      r.usableText = '2';
      r.usableNote = 'Las 2 direcciones se usan en un enlace punto a punto (RFC 3021).';
      r.firstHost = ipStr(b.network);
      r.lastHost = ipStr(b.lastAddress);
      r.notes.push('Se asume que es un enlace punto a punto, que es el caso para el que el RFC 3021 ' +
        'permite /31. Si se usara en una red con más de dos equipos no funcionaría.');
    }

    // ---------- subred normal (/1 a /30) ----------
    else {
      r.broadcast = ipStr(b.lastAddress);
      r.usable = b.total - 2;
      r.usableText = fmt(r.usable);
      r.usableNote = '2^' + (32 - prefix) + ' − 2 (se restan la red y el broadcast).';
      r.firstHost = ipStr(b.network + 1);
      r.lastHost = ipStr(b.lastAddress - 1);
      if (prefix < 8) {
        r.notes.push('Prefijo menor a /8: es una superred o bloque CIDR grande (RFC 4632), ' +
          'más grande que una red de clase A.');
      }
    }

    // ---------- avisos segun el tipo de direccion ----------
    // con /0 no sale el aviso de abajo, entonces se aclara aqui
    if (ip === 0 && r.kind === 'ruta-por-defecto') {
      r.notes.push('0.0.0.0 por sí sola es la dirección no especificada: no se asigna a ninguna interfaz.');
    }
    if (usage.type === 'especial' && r.kind !== 'multicast' && r.kind !== 'reservada' &&
        r.kind !== 'broadcast-limitado' && r.kind !== 'ruta-por-defecto') {
      r.warnings.push(usage.name + ' (' + usage.cidr + '): ' + usage.note +
        ' Los cálculos se muestran como referencia.');
    }

    // el bloque se sale del rango al que pertenece la IP
    if (usage.cidr && !classify.blockInsideRange(b.network, prefix, usage.cidr) && prefix !== 0) {
      r.warnings.push('El bloque /' + prefix + ' es más grande que ' + usage.cidr + ' (' + usage.name +
        '), así que incluye direcciones de otro tipo. La clasificación corresponde a la IP escrita, no a todo el bloque.');
    }
    // IP publica pero el bloque contiene rangos especiales
    if (!usage.cidr && prefix !== 0) {
      var otros = classify.rangesOverlapping(b.network, prefix);
      if (otros.length > 0) {
        var lista = otros.slice(0, 3).map(function (x) { return x.cidr; }).join(', ');
        r.warnings.push('La IP es pública, pero el bloque incluye rangos especiales (' + lista +
          (otros.length > 3 ? ', ...' : '') + ').');
      }
    }

    return r;
  }

  // Entrada directa desde los textos del formulario.
  // mode 'cidr':  analyzeInput('cidr', '192.168.1.10/24')
  // mode 'mask':  analyzeInput('mask', '192.168.1.10', '255.255.255.0')
  function analyzeInput(mode, a, b) {
    var p = mode === 'mask' ? core.parseIpAndMask(a, b) : core.parseCidr(a);
    if (!p.ok) return p;
    return { ok: true, result: analyze(p.ip, p.prefix) };
  }

  return { analyze: analyze, analyzeInput: analyzeInput, formatNumber: fmt };
});
