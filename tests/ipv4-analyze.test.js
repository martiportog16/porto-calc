// Pruebas de clasificacion y casos especiales (ipv4-classify.js e ipv4-analyze.js)
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../public/js/ipv4-core.js');
const classify = require('../public/js/ipv4-classify.js');
const { analyze, analyzeInput } = require('../public/js/ipv4-analyze.js');
const casos = require('./casos.js');

const ip = (s) => core.parseIPv4(s).value;
const run = (s) => {
  const r = analyzeInput('cidr', s);
  assert.ok(r.ok, s);
  return r.result;
};

// Compara solo los campos que trae el caso esperado
function revisar(c) {
  const r = run(c.input);
  for (const campo of Object.keys(c.expect)) {
    let valor = r[campo];
    if (campo === 'ipClass') valor = r.ipClass.letter;
    if (campo === 'usage') valor = r.usage.type;
    assert.equal(valor, c.expect[campo], `${c.input} -> ${campo}`);
  }
}

test('clase segun el primer octeto (bordes)', () => {
  const bordes = [
    ['0.0.0.0', 'A'], ['127.255.255.255', 'A'],
    ['128.0.0.0', 'B'], ['191.255.255.255', 'B'],
    ['192.0.0.0', 'C'], ['223.255.255.255', 'C'],
    ['224.0.0.0', 'D'], ['239.255.255.255', 'D'],
    ['240.0.0.0', 'E'], ['255.255.255.255', 'E']
  ];
  for (const [d, cls] of bordes) assert.equal(classify.getClass(ip(d)).letter, cls, d);
});

test('la clase no cambia con el prefijo', () => {
  for (let p = 0; p <= 32; p++) {
    assert.equal(run(`10.1.2.3/${p}`).ipClass.letter, 'A');
    assert.equal(run(`192.168.1.1/${p}`).ipClass.letter, 'C');
  }
});

test('bordes de los rangos privados RFC 1918', () => {
  const t = [
    ['9.255.255.255', 'publica'], ['10.0.0.0', 'privada'], ['10.255.255.255', 'privada'], ['11.0.0.0', 'publica'],
    ['172.15.255.255', 'publica'], ['172.16.0.0', 'privada'], ['172.31.255.255', 'privada'], ['172.32.0.0', 'publica'],
    ['192.167.255.255', 'publica'], ['192.168.0.0', 'privada'], ['192.168.255.255', 'privada'], ['192.169.0.0', 'publica']
  ];
  for (const [d, tipo] of t) assert.equal(classify.getUsage(ip(d)).type, tipo, d);
});

test('se elige el rango mas especifico', () => {
  assert.equal(classify.findRange(ip('0.0.0.0')).cidr, '0.0.0.0/32');
  assert.equal(classify.findRange(ip('0.0.0.1')).cidr, '0.0.0.0/8');
  assert.equal(classify.findRange(ip('255.255.255.255')).cidr, '255.255.255.255/32');
  assert.equal(classify.findRange(ip('255.255.255.254')).cidr, '240.0.0.0/4');
  assert.equal(classify.findRange(ip('192.0.0.9')).cidr, '192.0.0.9/32');
  assert.equal(classify.findRange(ip('192.0.0.5')).cidr, '192.0.0.0/29');
  assert.equal(classify.findRange(ip('192.0.0.100')).cidr, '192.0.0.0/24');
});

test('100.64.0.0/10 es especial, no privada', () => {
  const u = classify.getUsage(ip('100.64.0.1'));
  assert.equal(u.type, 'especial');
  assert.equal(u.rfc, 'RFC 6598');
  assert.equal(classify.getUsage(ip('100.63.255.255')).type, 'publica');
  assert.equal(classify.getUsage(ip('100.128.0.0')).type, 'publica');
});

test('rangos especiales alcanzables globalmente (IANA)', () => {
  assert.equal(classify.getUsage(ip('192.0.0.9')).globallyReachable, true);
  assert.equal(classify.getUsage(ip('192.175.48.1')).globallyReachable, true);
  assert.equal(classify.getUsage(ip('192.0.2.1')).globallyReachable, false);
});

test('la tabla de rangos no tiene bloques mal alineados', () => {
  // si alguien escribe 10.0.0.1/8 en la tabla, la red no coincide con la IP
  for (const r of classify.ranges) {
    assert.equal(core.intToIp(r.network) + '/' + r.prefix, r.cidr, r.cidr);
  }
});

test('casos minimos del PDF', () => {
  casos.pdfFull.forEach(revisar);
});

test('casos extra', () => {
  casos.extraFull.forEach(revisar);
});

test('errores del PDF desde analyzeInput', () => {
  assert.equal(analyzeInput('cidr', '192.168.1.300/24').error.code, 'IP_OCTET_RANGE');
  assert.equal(analyzeInput('cidr', '192.168.1.10/33').error.code, 'PREFIX_RANGE');
  assert.equal(analyzeInput('mask', '192.168.1.10', '255.0.255.0').error.code, 'MASK_NOT_CONTIGUOUS');
});

test('los dos formatos dan exactamente el mismo resultado', () => {
  const ejemplos = ['192.168.10.25', '10.0.0.0', '224.0.0.1', '240.0.0.1', '127.0.0.1', '8.8.8.8', '0.0.0.0', '255.255.255.255'];
  for (const d of ejemplos) {
    for (let p = 0; p <= 32; p++) {
      const a = analyzeInput('cidr', `${d}/${p}`);
      const b = analyzeInput('mask', d, core.intToIp(core.prefixToMask(p)));
      assert.deepEqual(a, b, `${d}/${p}`);
    }
  }
});

test('nunca hay hosts negativos, NaN ni direcciones raras (todos los prefijos)', () => {
  const ejemplos = ['0.0.0.0', '1.2.3.4', '10.0.0.1', '127.0.0.1', '169.254.1.1', '172.16.5.4',
    '192.168.1.1', '200.1.1.1', '224.0.0.1', '239.1.1.1', '240.0.0.1', '255.255.255.255'];
  const ipValida = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  for (const d of ejemplos) {
    for (let p = 0; p <= 32; p++) {
      const r = analyze(ip(d), p);
      if (r.usable !== null) {
        assert.ok(Number.isInteger(r.usable) && r.usable >= 1, `${d}/${p} usable=${r.usable}`);
        assert.ok(r.usable <= r.total);
      } else {
        assert.ok(r.usableNote, `${d}/${p} sin nota`);
      }
      for (const campo of ['network', 'broadcast', 'firstHost', 'lastHost', 'blockFirst', 'blockLast']) {
        if (r[campo] !== null) {
          const m = r[campo].match(ipValida);
          assert.ok(m && m.slice(1).every((o) => Number(o) <= 255), `${d}/${p} ${campo}=${r[campo]}`);
        }
      }
      if (r.broadcast === null) assert.ok(r.broadcastNote, `${d}/${p} broadcast sin nota`);
    }
  }
});

test('avisos: bloque que se sale del rango y publica con rangos especiales', () => {
  const r1 = run('10.0.0.1/7');
  assert.equal(r1.usage.type, 'privada');
  assert.ok(r1.warnings.some((w) => /más grande que 10\.0\.0\.0\/8/.test(w)));

  const r2 = run('8.8.8.8/1'); // 0.0.0.0 - 127.255.255.255 incluye 10/8, 127/8...
  assert.equal(r2.usage.type, 'publica');
  assert.ok(r2.warnings.some((w) => /rangos especiales/.test(w)));

  assert.deepEqual(run('8.8.8.8/24').warnings, []);
  assert.deepEqual(run('192.168.1.100/24').warnings, []);
});

test('loopback y link-local llevan aviso de uso especial', () => {
  assert.ok(run('127.0.0.1/8').warnings.some((w) => /Loopback/.test(w)));
  assert.ok(run('169.254.10.20/16').warnings.some((w) => /3927/.test(w)));
});
