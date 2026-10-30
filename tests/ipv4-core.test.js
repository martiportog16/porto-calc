// Pruebas de ipv4-core.js
// Se corren con: npm test   (o node --test). Necesita Node 18 o mas nuevo.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../public/js/ipv4-core.js');
const casos = require('./casos.js');

const ip = (text) => {
  const r = core.parseIPv4(text);
  assert.ok(r.ok, `deberia ser valida: ${text}`);
  return r.value;
};

test('IPs validas y extremos', () => {
  assert.equal(core.parseIPv4('0.0.0.0').value, 0);
  assert.equal(core.parseIPv4('255.255.255.255').value, 4294967295);
  assert.equal(core.parseIPv4('192.168.1.1').value, 3232235777);
  assert.equal(core.parseIPv4('  10.0.0.1  ').value, 167772161); // quita espacios de los lados
  assert.equal(core.parseIPv4('128.0.0.0').value, 2147483648);   // no debe salir negativo
});

test('IPs mal escritas', () => {
  for (const c of casos.malformedIPs) {
    const r = core.parseIPv4(c.input);
    assert.equal(r.ok, false, `deberia fallar: "${c.input}"`);
    assert.equal(r.error.code, c.code, `codigo de "${c.input}"`);
    assert.equal(r.error.field, 'ip');
  }
});

test('si no llega un string se toma como vacio', () => {
  for (const v of [undefined, null, 123, {}]) {
    assert.equal(core.parseIPv4(v).error.code, 'IP_EMPTY');
  }
});

test('intToIp devuelve lo mismo que se leyo', () => {
  for (const s of ['0.0.0.0', '1.2.3.4', '127.0.0.1', '128.0.0.0', '223.255.255.255', '255.255.255.255']) {
    assert.equal(core.intToIp(ip(s)), s);
  }
});

test('intToBinary', () => {
  assert.equal(core.intToBinary(ip('192.168.1.0')), '11000000.10101000.00000001.00000000');
  assert.equal(core.intToBinary(0), '00000000.00000000.00000000.00000000');
});

test('prefijo <-> mascara de /0 a /32', () => {
  for (let p = 0; p <= 32; p++) {
    const mask = core.prefixToMask(p);
    assert.ok(mask >= 0 && mask <= 4294967295, `/${p}`);
    assert.equal(core.popCount(mask), p);
    assert.equal(core.maskToPrefix(mask), p);
    assert.ok(core.isContiguousMask(mask));
  }
  assert.equal(core.intToIp(core.prefixToMask(0)), '0.0.0.0');
  assert.equal(core.intToIp(core.prefixToMask(32)), '255.255.255.255');
});

test('una mascara rotada ya no es contigua', () => {
  // se toma cada mascara /1../31 y se rotan sus bits; ninguna rotacion debe pasar
  for (let unos = 1; unos < 32; unos++) {
    const base = core.prefixToMask(unos);
    for (let r = 1; r < 32; r++) {
      const rotada = ((base >>> r) | (base << (32 - r))) >>> 0;
      assert.equal(core.isContiguousMask(rotada), false, core.intToIp(rotada));
    }
  }
});

test('parsePrefix', () => {
  assert.equal(core.parsePrefix('0').prefix, 0);
  assert.equal(core.parsePrefix('/27').prefix, 27);
  assert.equal(core.parsePrefix(' 32 ').prefix, 32);
  assert.equal(core.parsePrefix('33').error.code, 'PREFIX_RANGE');
  assert.equal(core.parsePrefix('').error.code, 'PREFIX_EMPTY');
  assert.equal(core.parsePrefix('/').error.code, 'PREFIX_EMPTY');
  assert.equal(core.parsePrefix('08').error.code, 'PREFIX_LEADING_ZERO');
});

test('IP/prefijo mal escritos', () => {
  for (const c of casos.malformedCidr) {
    const r = core.parseCidr(c.input);
    assert.equal(r.ok, false, `deberia fallar: "${c.input}"`);
    assert.equal(r.error.code, c.code, `codigo de "${c.input}"`);
  }
});

test('mascaras validas', () => {
  for (const m of casos.masks.valid) {
    const r = core.parseMask(m.mask);
    assert.ok(r.ok, m.mask);
    assert.equal(r.prefix, m.prefix, m.mask);
  }
});

test('mascaras invalidas (y aviso de wildcard)', () => {
  for (const m of casos.masks.invalid) {
    const r = core.parseMask(m.mask);
    assert.equal(r.ok, false, m.mask);
    assert.equal(r.error.code, m.code, m.mask);
    assert.equal(r.error.field, 'mask', m.mask);
    if (m.code === 'MASK_NOT_CONTIGUOUS') {
      assert.equal(/wildcard/.test(r.error.message), m.wildcardHint, m.mask);
    }
  }
  assert.match(core.parseMask('0.0.0.255').error.message, /255\.255\.255\.0 \(\/24\)/);
});

test('casos de error del PDF', () => {
  for (const c of casos.pdfErrors) {
    const r = c.mode === 'cidr' ? core.parseCidr(c.input) : core.parseIpAndMask(c.ip, c.mask);
    assert.equal(r.ok, false);
    assert.equal(r.error.code, c.code, JSON.stringify(c));
  }
});

function revisarBloque(c) {
  const r = core.parseCidr(c.input);
  assert.ok(r.ok, c.input);
  const b = core.blockInfo(r.ip, r.prefix);
  assert.equal(core.intToIp(b.network), c.network, `red de ${c.input}`);
  assert.equal(core.intToIp(b.lastAddress), c.lastAddress, `ultima de ${c.input}`);
  assert.equal(core.intToIp(b.mask), c.mask, `mascara de ${c.input}`);
  assert.equal(b.total, c.total, `total de ${c.input}`);
}

test('calculo de los casos del PDF', () => {
  casos.pdfArithmetic.forEach(revisarBloque);
});

test('calculo de casos extra (/0, /1, /7, /12, /32...)', () => {
  casos.extraArithmetic.forEach(revisarBloque);
});

test('IP/prefijo y IP + mascara dan lo mismo', () => {
  for (let p = 0; p <= 32; p++) {
    const a = core.parseCidr(`192.168.10.25/${p}`);
    const b = core.parseIpAndMask('192.168.10.25', core.intToIp(core.prefixToMask(p)));
    assert.ok(a.ok && b.ok);
    assert.deepEqual(core.blockInfo(a.ip, a.prefix), core.blockInfo(b.ip, b.prefix), `/${p}`);
  }
});

// Para no depender solo de casos hechos a mano, se compara contra otra forma
// de calcular (con BigInt y division, sin operadores de bits) en muchas IPs
// al azar. La semilla es fija para que siempre salgan los mismos casos.
function bloqueReferencia(ipInt, prefix) {
  const tam = 1n << BigInt(32 - prefix);
  const red = (BigInt(ipInt) / tam) * tam;
  return {
    network: Number(red),
    lastAddress: Number(red + tam - 1n),
    mask: Number((1n << 32n) - tam),
    total: Number(tam)
  };
}

function aleatorio(semilla) { // mulberry32
  return function () {
    semilla = (semilla + 0x6D2B79F5) >>> 0;
    let t = semilla;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
  };
}

test('comparacion con calculo de referencia (20000 casos)', () => {
  const rand = aleatorio(2026);
  const bordes = [0, 1, 0x7FFFFFFF, 0x80000000, 0xFFFFFFFE, 0xFFFFFFFF];
  for (let i = 0; i < 20000; i++) {
    // primero todos los bordes con todos los prefijos, luego al azar
    const enBordes = i < bordes.length * 33;
    const ipInt = enBordes ? bordes[i % bordes.length] : rand();
    const prefix = enBordes ? Math.floor(i / bordes.length) : rand() % 33;
    const got = core.blockInfo(ipInt, prefix);
    const ref = bloqueReferencia(ipInt, prefix);
    assert.equal(got.network, ref.network);
    assert.equal(got.lastAddress, ref.lastAddress);
    assert.equal(got.mask, ref.mask);
    assert.equal(got.total, ref.total);
    assert.equal(core.parseIPv4(core.intToIp(ipInt)).value, ipInt);
  }
});
