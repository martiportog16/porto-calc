// Datos de prueba. Se usan en ipv4-core.test.js y despues para la tabla del informe.
// Por ahora solo hay calculo del bloque y validacion; clase, tipo y hosts van despues.
'use strict';

// casos del PDF (seccion 6), solo la parte de calculo
// lastAddress = todos los bits de host en 1 (en /31 y /32 no es broadcast)
const pdfArithmetic = [
  { input: '192.168.1.100/24', network: '192.168.1.0', lastAddress: '192.168.1.255', mask: '255.255.255.0',   total: 256 },
  { input: '172.16.10.50/30',  network: '172.16.10.48', lastAddress: '172.16.10.51', mask: '255.255.255.252', total: 4 },
  { input: '10.0.0.0/31',      network: '10.0.0.0',    lastAddress: '10.0.0.1',      mask: '255.255.255.254', total: 2 },
  { input: '192.168.1.25/32',  network: '192.168.1.25', lastAddress: '192.168.1.25', mask: '255.255.255.255', total: 1 },
  { input: '224.0.0.1/24',     network: '224.0.0.0',   lastAddress: '224.0.0.255',   mask: '255.255.255.0',   total: 256 },
  { input: '240.0.0.1/24',     network: '240.0.0.0',   lastAddress: '240.0.0.255',   mask: '255.255.255.0',   total: 256 },
  { input: '127.0.0.1/8',      network: '127.0.0.0',   lastAddress: '127.255.255.255', mask: '255.0.0.0',     total: 16777216 },
  { input: '169.254.10.20/16', network: '169.254.0.0', lastAddress: '169.254.255.255', mask: '255.255.0.0',   total: 65536 }
];

// casos de error del PDF
const pdfErrors = [
  { mode: 'cidr', input: '192.168.1.300/24', code: 'IP_OCTET_RANGE' },
  { mode: 'cidr', input: '192.168.1.10/33',  code: 'PREFIX_RANGE' },
  { mode: 'mask', ip: '192.168.1.10', mask: '255.0.255.0', code: 'MASK_NOT_CONTIGUOUS' }
];

// casos extra
const extraArithmetic = [
  { input: '192.168.10.25/27', network: '192.168.10.0', lastAddress: '192.168.10.31', mask: '255.255.255.224', total: 32 },
  { input: '0.0.0.0/0',        network: '0.0.0.0',      lastAddress: '255.255.255.255', mask: '0.0.0.0',       total: 4294967296 },
  { input: '10.1.2.3/0',       network: '0.0.0.0',      lastAddress: '255.255.255.255', mask: '0.0.0.0',       total: 4294967296 },
  { input: '255.255.255.255/32', network: '255.255.255.255', lastAddress: '255.255.255.255', mask: '255.255.255.255', total: 1 },
  { input: '10.0.0.1/7',       network: '10.0.0.0',     lastAddress: '11.255.255.255', mask: '254.0.0.0',      total: 33554432 },
  { input: '172.31.255.255/12', network: '172.16.0.0',  lastAddress: '172.31.255.255', mask: '255.240.0.0',    total: 1048576 },
  { input: '200.100.50.25/1',  network: '128.0.0.0',    lastAddress: '255.255.255.255', mask: '128.0.0.0',     total: 2147483648 }
];

// IPs mal escritas y el codigo de error que deberian dar
const malformedIPs = [
  { input: '',                 code: 'IP_EMPTY' },
  { input: '   ',              code: 'IP_EMPTY' },
  { input: '192.168.1',        code: 'IP_OCTET_COUNT' },
  { input: '1.2.3.4.5',        code: 'IP_OCTET_COUNT' },
  { input: '1..2.3',           code: 'IP_OCTET_EMPTY' },
  { input: '1.2.3.',           code: 'IP_OCTET_EMPTY' },
  { input: '.1.2.3',           code: 'IP_OCTET_EMPTY' },
  { input: 'a.b.c.d',          code: 'IP_OCTET_NOT_INTEGER' },
  { input: '192.168.01.1',     code: 'IP_OCTET_LEADING_ZERO' },
  { input: '0x0A.0.0.1',       code: 'IP_OCTET_NOT_INTEGER' },
  { input: '1e2.0.0.1',        code: 'IP_OCTET_NOT_INTEGER' },
  { input: '-1.0.0.1',         code: 'IP_OCTET_NOT_INTEGER' },
  { input: '+1.0.0.1',         code: 'IP_OCTET_NOT_INTEGER' },
  { input: '1.2.3.4a',         code: 'IP_OCTET_NOT_INTEGER' },
  { input: '1.2.3.2.5',        code: 'IP_OCTET_COUNT' },
  { input: '192.168. 1.1',     code: 'IP_SPACES' },
  { input: '256.0.0.1',        code: 'IP_OCTET_RANGE' },
  { input: '1.2.3.1000',       code: 'IP_OCTET_RANGE' },
  { input: '1.2.3.99999999999999999999', code: 'IP_OCTET_RANGE' },
  { input: '١.٢.٣.٤',          code: 'IP_OCTET_NOT_INTEGER' } // numeros arabes, no son 0-9
];

// IP/prefijo mal escritos
const malformedCidr = [
  { input: '192.168.1.1',       code: 'PREFIX_MISSING' },
  { input: '192.168.1.1/',      code: 'PREFIX_EMPTY' },
  { input: '/24',               code: 'IP_EMPTY' },
  { input: '1.2.3.4/24/5',      code: 'CIDR_FORMAT' },
  { input: '1.2.3.4/-1',        code: 'PREFIX_NOT_INTEGER' },
  { input: '1.2.3.4/2.5',       code: 'PREFIX_NOT_INTEGER' },
  { input: '1.2.3.4/abc',       code: 'PREFIX_NOT_INTEGER' },
  { input: '1.2.3.4/024',       code: 'PREFIX_LEADING_ZERO' },
  { input: '1.2.3.4/100',       code: 'PREFIX_RANGE' },
  { input: '1.2.3.4 /24',       code: 'CIDR_SPACES' },
  { input: '1.2.3.4/ 24',       code: 'CIDR_SPACES' }
];

// mascaras buenas (con su prefijo) y malas
const masks = {
  valid: [
    { mask: '0.0.0.0',         prefix: 0 },
    { mask: '128.0.0.0',       prefix: 1 },
    { mask: '255.0.0.0',       prefix: 8 },
    { mask: '255.240.0.0',     prefix: 12 },
    { mask: '255.255.255.224', prefix: 27 },
    { mask: '255.255.255.254', prefix: 31 },
    { mask: '255.255.255.255', prefix: 32 }
  ],
  invalid: [
    { mask: '255.0.255.0',     code: 'MASK_NOT_CONTIGUOUS', wildcardHint: false },
    { mask: '0.0.0.255',       code: 'MASK_NOT_CONTIGUOUS', wildcardHint: true },
    { mask: '0.0.255.255',     code: 'MASK_NOT_CONTIGUOUS', wildcardHint: true },
    { mask: '255.255.255.253', code: 'MASK_NOT_CONTIGUOUS', wildcardHint: false },
    { mask: '1.0.0.0',         code: 'MASK_NOT_CONTIGUOUS', wildcardHint: false },
    { mask: '255.255.255.256', code: 'IP_OCTET_RANGE' },
    { mask: '255.255.255',     code: 'IP_OCTET_COUNT' },
    { mask: '',                code: 'IP_EMPTY' }
  ]
};


// Resultado completo esperado de los casos del PDF (seccion 6).
// Estos valores se sacaron a mano antes de programar; las pruebas comparan
// contra lo que devuelve analyze(). null = "No aplica".
const pdfFull = [
  { input: '192.168.1.100/24', expect: { ipClass: 'C', usage: 'privada', mask: '255.255.255.0', network: '192.168.1.0',
    broadcast: '192.168.1.255', total: 256, usable: 254, firstHost: '192.168.1.1', lastHost: '192.168.1.254', kind: 'subred' } },
  { input: '172.16.10.50/30', expect: { ipClass: 'B', usage: 'privada', mask: '255.255.255.252', network: '172.16.10.48',
    broadcast: '172.16.10.51', total: 4, usable: 2, firstHost: '172.16.10.49', lastHost: '172.16.10.50', kind: 'subred' } },
  { input: '10.0.0.0/31', expect: { ipClass: 'A', usage: 'privada', mask: '255.255.255.254', network: '10.0.0.0',
    broadcast: null, total: 2, usable: 2, firstHost: '10.0.0.0', lastHost: '10.0.0.1', kind: 'punto-a-punto' } },
  { input: '192.168.1.25/32', expect: { ipClass: 'C', usage: 'privada', mask: '255.255.255.255', network: '192.168.1.25',
    broadcast: null, total: 1, usable: 1, firstHost: '192.168.1.25', lastHost: '192.168.1.25', kind: 'host' } },
  { input: '224.0.0.1/24', expect: { ipClass: 'D', usage: 'especial', mask: '255.255.255.0', blockFirst: '224.0.0.0',
    blockLast: '224.0.0.255', broadcast: null, total: 256, usable: null, firstHost: null, lastHost: null, kind: 'multicast' } },
  { input: '240.0.0.1/24', expect: { ipClass: 'E', usage: 'especial', mask: '255.255.255.0', blockFirst: '240.0.0.0',
    blockLast: '240.0.0.255', broadcast: null, total: 256, usable: null, firstHost: null, lastHost: null, kind: 'reservada' } },
  { input: '127.0.0.1/8', expect: { ipClass: 'A', usage: 'especial', mask: '255.0.0.0', network: '127.0.0.0',
    broadcast: '127.255.255.255', total: 16777216, usable: 16777214, firstHost: '127.0.0.1', lastHost: '127.255.255.254' } },
  { input: '169.254.10.20/16', expect: { ipClass: 'B', usage: 'especial', mask: '255.255.0.0', network: '169.254.0.0',
    broadcast: '169.254.255.255', total: 65536, usable: 65534, firstHost: '169.254.0.1', lastHost: '169.254.255.254' } }
];

// Casos extra con resultado completo
const extraFull = [
  { input: '192.168.10.25/27', expect: { ipClass: 'C', usage: 'privada', network: '192.168.10.0', broadcast: '192.168.10.31',
    total: 32, usable: 30, firstHost: '192.168.10.1', lastHost: '192.168.10.30' } },
  { input: '8.8.8.8/24', expect: { ipClass: 'A', usage: 'publica', network: '8.8.8.0', broadcast: '8.8.8.255', usable: 254 } },
  { input: '0.0.0.0/0', expect: { ipClass: 'A', usage: 'especial', mask: '0.0.0.0', network: '0.0.0.0', broadcast: null,
    total: 4294967296, usable: null, kind: 'ruta-por-defecto' } },
  { input: '10.1.2.3/0', expect: { ipClass: 'A', usage: 'privada', network: '0.0.0.0', usable: null, kind: 'ruta-por-defecto' } },
  { input: '0.0.0.0/32', expect: { usage: 'especial', total: 1, usable: 1, broadcast: null, kind: 'host' } },
  { input: '0.0.0.0/8', expect: { ipClass: 'A', usage: 'especial', network: '0.0.0.0', broadcast: '0.255.255.255' } },
  { input: '255.255.255.255/32', expect: { ipClass: 'E', usage: 'especial', broadcast: null, usable: null, kind: 'broadcast-limitado' } },
  { input: '10.0.0.1/7', expect: { ipClass: 'A', usage: 'privada', network: '10.0.0.0', broadcast: '11.255.255.255', usable: 33554430 } },
  { input: '100.64.0.1/10', expect: { ipClass: 'A', usage: 'especial', network: '100.64.0.0', broadcast: '100.127.255.255' } },
  { input: '192.0.2.10/24', expect: { ipClass: 'C', usage: 'especial', network: '192.0.2.0' } },
  { input: '198.18.0.1/15', expect: { ipClass: 'C', usage: 'especial', network: '198.18.0.0', broadcast: '198.19.255.255' } },
  { input: '203.0.113.5/24', expect: { ipClass: 'C', usage: 'especial' } },
  { input: '172.32.0.1/16', expect: { ipClass: 'B', usage: 'publica' } },
  { input: '172.31.255.254/31', expect: { usage: 'privada', firstHost: '172.31.255.254', lastHost: '172.31.255.255', usable: 2 } },
  { input: '239.255.255.255/32', expect: { ipClass: 'D', kind: 'multicast', usable: null } },
  { input: '1.2.3.4/30', expect: { network: '1.2.3.4', broadcast: '1.2.3.7', firstHost: '1.2.3.5', lastHost: '1.2.3.6', usable: 2 } }
];

module.exports = {
  pdfFull,
  extraFull,
  pdfArithmetic,
  pdfErrors,
  extraArithmetic,
  malformedIPs,
  malformedCidr,
  masks
};
