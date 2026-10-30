// ipv4-core.js
// Funciones base de la calculadora: leer y validar la IP, el prefijo y la
// mascara, convertir entre formatos y sacar red / ultima direccion / total.
// Aqui no se clasifica nada (clase, privada, etc.), eso va en otros archivos.
//
// Las direcciones se manejan como enteros de 32 bits sin signo
// (de 0 a 4294967295).
//
// OJO: en JS los operadores de bits (&, |, ~, <<) devuelven enteros CON signo,
// por ejemplo 192.168.x.x sale negativo. Por eso casi todo termina en ">>> 0",
// que lo vuelve a dejar sin signo.

(function (root, factory) {
  'use strict';
  var api = factory();
  // en Node (pruebas) se exporta normal, en el navegador queda en window.IPv4Calc
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.IPv4Calc = root.IPv4Calc || {};
    root.IPv4Calc.core = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_UINT32 = 0xFFFFFFFF;
  var SOLO_DIGITOS = /^[0-9]+$/;
  var ESPACIOS = /\s/;

  // Todas las funciones de lectura devuelven { ok: true, ... } o
  // { ok: false, error: { code, field, message } }.
  // field dice en que casilla mostrar el error (ip, prefix o mask).
  function fail(code, field, message) {
    return { ok: false, error: { code: code, field: field, message: message } };
  }

  // ---------- conversiones ----------

  function intToIp(n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  // para mostrar la mascara o la IP en binario, separada por octetos
  function intToBinary(n) {
    var bits = (n >>> 0).toString(2).padStart(32, '0');
    return bits.match(/.{8}/g).join('.');
  }

  function prefixToMask(prefix) {
    // el /0 va aparte porque en JS el corrimiento es modulo 32:
    // 0xFFFFFFFF << 32 da 0xFFFFFFFF y no 0
    if (prefix === 0) return 0;
    return (MAX_UINT32 << (32 - prefix)) >>> 0;
  }

  // cuantos bits en 1 tiene el numero
  function popCount(n) {
    var count = 0;
    n = n >>> 0;
    while (n !== 0) {
      n = (n & (n - 1)) >>> 0; // quita el 1 de mas a la derecha
      count++;
    }
    return count;
  }

  // Una mascara valida es 111...1000...0. Si se invierte queda 000...0111...1,
  // y a ese numero al sumarle 1 da una potencia de 2, entonces inv & (inv+1) = 0.
  // Con la mascara 0.0.0.0 inv+1 = 2^32, que con & se vuelve 0, asi que tambien pasa.
  function isContiguousMask(mask) {
    var inv = (~mask) >>> 0;
    return (inv & (inv + 1)) === 0;
  }

  // devuelve el prefijo o null si la mascara no es contigua
  function maskToPrefix(mask) {
    mask = mask >>> 0;
    if (!isContiguousMask(mask)) return null;
    return popCount(mask);
  }

  // ---------- lectura de lo que escribe el usuario ----------

  // Lee "a.b.c.d". Se rechaza:
  //  - menos o mas de 4 octetos, octetos vacios
  //  - cualquier cosa que no sean digitos 0-9 (signos, hex, 1e2...)
  //  - ceros a la izquierda tipo "01", porque hay programas que lo leen en octal
  //  - octetos mayores a 255
  //  - espacios en medio (los de los extremos si se quitan)
  function parseIPv4(text, field, label) {
    field = field || 'ip';
    label = label || 'La dirección IP';

    if (typeof text !== 'string' || text.trim() === '') {
      return fail('IP_EMPTY', field, label + ' es obligatoria.');
    }
    var s = text.trim();
    if (ESPACIOS.test(s)) {
      return fail('IP_SPACES', field, label + ' no debe contener espacios.');
    }

    var partes = s.split('.');
    if (partes.length !== 4) {
      return fail('IP_OCTET_COUNT', field,
        label + ' debe tener 4 octetos separados por puntos (tiene ' +
        partes.length + '). Ejemplo: 192.168.10.25');
    }

    var valor = 0;
    for (var i = 0; i < 4; i++) {
      var p = partes[i];
      var pos = i + 1;
      if (p === '') {
        return fail('IP_OCTET_EMPTY', field, label + ': el octeto ' + pos + ' está vacío.');
      }
      if (!SOLO_DIGITOS.test(p)) {
        return fail('IP_OCTET_NOT_INTEGER', field,
          label + ': el octeto ' + pos + ' ("' + p + '") no es un número entero. ' +
          'Use solo dígitos del 0 al 9.');
      }
      if (p.length > 1 && p.charAt(0) === '0') {
        return fail('IP_OCTET_LEADING_ZERO', field,
          label + ': el octeto ' + pos + ' ("' + p + '") tiene ceros a la izquierda, ' +
          'escríbalo como ' + Number(p) + '.');
      }
      var octeto = Number(p);
      if (octeto > 255) {
        return fail('IP_OCTET_RANGE', field,
          label + ': el octeto ' + pos + ' (' + p + ') está fuera del rango 0–255.');
      }
      // se multiplica en vez de usar << para no caer en numeros negativos
      valor = valor * 256 + octeto;
    }
    return { ok: true, value: valor };
  }

  // acepta "27" o "/27"
  function parsePrefix(text) {
    var s = typeof text === 'string' ? text.trim() : '';
    if (s.charAt(0) === '/') s = s.slice(1);
    if (s === '') {
      return fail('PREFIX_EMPTY', 'prefix', 'Falta el prefijo (de 0 a 32).');
    }
    if (!SOLO_DIGITOS.test(s)) {
      return fail('PREFIX_NOT_INTEGER', 'prefix',
        'El prefijo /' + s + ' no es un número entero, debe estar entre 0 y 32.');
    }
    if (s.length > 1 && s.charAt(0) === '0') {
      return fail('PREFIX_LEADING_ZERO', 'prefix',
        'El prefijo /' + s + ' tiene ceros a la izquierda, escríbalo como /' + Number(s) + '.');
    }
    var prefix = Number(s);
    if (prefix > 32) {
      return fail('PREFIX_RANGE', 'prefix',
        'El prefijo /' + s + ' está fuera del rango permitido (0–32).');
    }
    return { ok: true, prefix: prefix };
  }

  function parseMask(text) {
    var r = parseIPv4(text, 'mask', 'La máscara');
    if (!r.ok) return r;

    var mask = r.value;
    var prefix = maskToPrefix(mask);
    if (prefix === null) {
      var msg = 'La máscara ' + intToIp(mask) + ' no es válida: los bits en 1 ' +
        'deben ir seguidos desde la izquierda (por ejemplo 255.255.255.224).';
      // si los unos estan seguidos pero a la derecha, lo mas seguro es que
      // escribieron una wildcard (como en las ACL de Cisco)
      if ((mask & (mask + 1)) === 0) {
        var p = 32 - popCount(mask);
        msg += ' Parece una wildcard; la máscara equivalente sería ' +
          intToIp(prefixToMask(p)) + ' (/' + p + ').';
      }
      return fail('MASK_NOT_CONTIGUOUS', 'mask', msg);
    }
    return { ok: true, mask: mask, prefix: prefix };
  }

  // ---------- los dos formatos de entrada ----------
  // Los dos terminan en { ip, prefix } para que el calculo sea uno solo.

  // "192.168.10.25/27"
  function parseCidr(text) {
    if (typeof text !== 'string' || text.trim() === '') {
      return fail('IP_EMPTY', 'ip', 'Escriba una dirección con prefijo, por ejemplo 192.168.10.25/27.');
    }
    var s = text.trim();
    // esto se revisa aca porque despues cada lado se recorta por separado
    // y "1.2.3.4 /24" se colaba
    if (ESPACIOS.test(s)) {
      return fail('CIDR_SPACES', 'ip', 'No escriba espacios. Ejemplo: 192.168.10.25/27.');
    }
    var barras = s.split('/').length - 1;
    if (barras === 0) {
      return fail('PREFIX_MISSING', 'prefix',
        'Falta el prefijo. Use el formato IP/prefijo, por ejemplo 192.168.10.25/27.');
    }
    if (barras > 1) {
      return fail('CIDR_FORMAT', 'ip', 'Solo puede haber una barra "/". Ejemplo: 192.168.10.25/27.');
    }
    var i = s.indexOf('/');
    var ip = parseIPv4(s.slice(0, i));
    if (!ip.ok) return ip;
    var pre = parsePrefix(s.slice(i + 1));
    if (!pre.ok) return pre;
    return { ok: true, ip: ip.value, prefix: pre.prefix };
  }

  // "192.168.10.25" + "255.255.255.224"
  function parseIpAndMask(ipText, maskText) {
    var ip = parseIPv4(ipText);
    if (!ip.ok) return ip;
    var m = parseMask(maskText);
    if (!m.ok) return m;
    return { ok: true, ip: ip.value, prefix: m.prefix };
  }

  // ---------- calculo del bloque ----------
  // Solo la parte aritmetica. lastAddress es la direccion con todos los bits
  // de host en 1; si eso es broadcast o no (en /31 y /32 no lo es) se decide
  // despues en ipv4-analyze.js.
  function blockInfo(ip, prefix) {
    var mask = prefixToMask(prefix);
    var wildcard = (~mask) >>> 0;
    var network = (ip & mask) >>> 0;
    return {
      ip: ip >>> 0,
      prefix: prefix,
      mask: mask,
      wildcard: wildcard,
      network: network,
      lastAddress: (network | wildcard) >>> 0,
      total: Math.pow(2, 32 - prefix) // con /0 da 4294967296, cabe bien en un Number
    };
  }

  return {
    MAX_UINT32: MAX_UINT32,
    intToIp: intToIp,
    intToBinary: intToBinary,
    prefixToMask: prefixToMask,
    maskToPrefix: maskToPrefix,
    isContiguousMask: isContiguousMask,
    popCount: popCount,
    parseIPv4: parseIPv4,
    parsePrefix: parsePrefix,
    parseMask: parseMask,
    parseCidr: parseCidr,
    parseIpAndMask: parseIpAndMask,
    blockInfo: blockInfo
  };
});
