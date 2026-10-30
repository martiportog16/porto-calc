// app.js
// Parte de la pagina: lee el formulario, llama a IPv4Calc.analyze y pinta el
// resultado. Aqui no se hace ningun calculo de red.
// Todo el texto se inserta con textContent (nunca innerHTML con datos del
// usuario) para que nadie pueda meter HTML en la pagina.

(function () {
  'use strict';

  var calc = window.IPv4Calc;
  var modo = 'cidr';

  var $ = function (id) { return document.getElementById(id); };
  var form = $('form-calc');
  var inputs = { cidr: $('in-cidr'), ip: $('in-ip'), mask: $('in-mask') };
  var errores = { cidr: $('err-cidr'), ip: $('err-ip'), mask: $('err-mask') };

  // crea un elemento con clase y texto
  function el(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  // ---------- pestañas ----------
  function cambiarModo(nuevo) {
    modo = nuevo;
    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.mode === modo ? 'true' : 'false');
    });
    document.querySelectorAll('[data-show]').forEach(function (d) {
      d.hidden = d.dataset.show !== modo;
    });
    limpiarErrores();
  }

  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      cambiarModo(b.dataset.mode);
      (modo === 'cidr' ? inputs.cidr : inputs.ip).focus();
    });
  });

  // ---------- errores ----------
  function limpiarErrores() {
    Object.keys(errores).forEach(function (k) {
      errores[k].textContent = '';
      inputs[k].removeAttribute('aria-invalid');
    });
  }

  function mostrarError(err) {
    // en modo cidr los errores de ip y prefijo van a la misma casilla
    var campo = modo === 'cidr' ? 'cidr' : (err.field === 'mask' ? 'mask' : 'ip');
    errores[campo].textContent = err.message;
    inputs[campo].setAttribute('aria-invalid', 'true');
    inputs[campo].focus();
    $('resultado').hidden = true;
  }

  // ---------- resultado ----------
  function fila(tbody, etiqueta, valor, nota) {
    var tr = el('tr');
    tr.appendChild(el('th', null, etiqueta));
    var td = el('td');
    if (valor === null || valor === undefined) {
      td.appendChild(el('span', 'na', 'No aplica'));
      // las notas de analyze empiezan con "No aplica:", aqui no se repite
      if (nota) nota = nota.replace(/^No aplica:\s*/, '');
      if (nota) nota = nota.charAt(0).toUpperCase() + nota.slice(1);
    } else {
      td.appendChild(el('span', 'valor', valor));
    }
    if (nota) td.appendChild(el('span', 'nota', nota));
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  // pone en negrita los primeros "prefix" bits del binario "xxxxxxxx.xxxxxxxx..."
  function lineaBinaria(etiqueta, binario, prefix) {
    var div = el('div');
    div.appendChild(el('span', 'lbl', etiqueta));
    var bits = 0, corte = binario.length;
    for (var i = 0; i < binario.length; i++) {
      if (bits === prefix) { corte = i; break; }
      if (binario[i] !== '.') bits++;
    }
    div.appendChild(el('b', null, binario.slice(0, corte)));
    div.appendChild(document.createTextNode(binario.slice(corte)));
    return div;
  }

  function mostrarResultado(r) {
    $('res-titulo').textContent = r.cidr;

    var badges = $('badges');
    badges.textContent = '';
    badges.appendChild(el('span', 'badge', 'Clase ' + r.ipClass.letter));
    badges.appendChild(el('span', 'badge ' + r.usage.type, r.usage.label));

    var esBloqueSinHosts = r.kind === 'multicast' || r.kind === 'reservada' || r.kind === 'broadcast-limitado';
    var t = $('res-tabla');
    t.textContent = '';
    fila(t, 'Clase tradicional', r.ipClass.letter + ' · ' + r.ipClass.desc,
      'Primer octeto ' + r.ipClass.range + ' (bits iniciales ' + r.ipClass.bits + ').');
    var detalle = [];
    if (r.usage.name !== r.usage.label) detalle.push(r.usage.name);
    if (r.usage.cidr) detalle.push(r.usage.cidr);
    if (r.usage.rfc && detalle.join(' ').indexOf(r.usage.rfc) === -1) detalle.push(r.usage.rfc);
    fila(t, 'Tipo de dirección', r.usage.label, detalle.join(' · '));
    fila(t, 'Máscara decimal', r.mask);
    fila(t, 'Prefijo CIDR', '/' + r.prefix);
    fila(t, 'Wildcard', r.wildcard);
    fila(t, esBloqueSinHosts ? 'Inicio del bloque' : 'Dirección de red', r.network, r.networkNote);
    fila(t, 'Broadcast dirigido', r.broadcast, r.broadcastNote);
    fila(t, 'Rango del bloque', r.blockFirst + ' – ' + r.blockLast);
    fila(t, 'Total de direcciones', r.totalText, '2^' + (32 - r.prefix));
    fila(t, 'Hosts utilizables', r.usableText, r.usableNote);
    fila(t, 'Primer host', r.firstHost, r.firstHost ? null : r.hostRangeNote);
    fila(t, 'Último host', r.lastHost, r.lastHost ? null : r.hostRangeNote);

    var avisos = $('avisos');
    avisos.textContent = '';
    if (r.warnings.length) {
      var ca = el('div', 'caja aviso');
      r.warnings.forEach(function (w) { ca.appendChild(el('p', null, '⚠ ' + w)); });
      avisos.appendChild(ca);
    }
    if (r.notes.length) {
      var cn = el('div', 'caja nota');
      r.notes.forEach(function (n) { cn.appendChild(el('p', null, n)); });
      avisos.appendChild(cn);
    }

    var bin = $('binario');
    bin.textContent = '';
    bin.appendChild(lineaBinaria('IP', r.ipBinary, r.prefix));
    bin.appendChild(lineaBinaria('Máscara', r.maskBinary, r.prefix));

    $('resultado').hidden = false;
  }

  // ---------- eventos ----------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    limpiarErrores();
    var res = modo === 'cidr'
      ? calc.analyze.analyzeInput('cidr', inputs.cidr.value)
      : calc.analyze.analyzeInput('mask', inputs.ip.value, inputs.mask.value);
    if (!res.ok) {
      mostrarError(res.error);
      return;
    }
    mostrarResultado(res.result);
  });

  $('btn-limpiar').addEventListener('click', function () {
    form.reset();
    limpiarErrores();
    $('resultado').hidden = true;
    (modo === 'cidr' ? inputs.cidr : inputs.ip).focus();
  });

  // botones de ejemplo: llenan el formulario y calculan
  $('chips').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.cidr) {
      cambiarModo('cidr');
      inputs.cidr.value = b.dataset.cidr;
    } else {
      cambiarModo('mask');
      inputs.ip.value = b.dataset.ip;
      inputs.mask.value = b.dataset.mask;
    }
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
  });
})();
