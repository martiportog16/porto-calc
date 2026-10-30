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

module.exports = {
  pdfArithmetic,
  pdfErrors,
  extraArithmetic,
  malformedIPs,
  malformedCidr,
  masks
};
