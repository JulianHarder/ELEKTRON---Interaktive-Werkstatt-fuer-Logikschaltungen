/* Die Wahrheitstabelle eines einzelnen Gattertyps.

   Sie wird nicht als Liste gepflegt, sondern ausgerechnet: fuer den Typ
   entsteht eine Mini-Schaltung aus Schaltern, dem Gatter und einer Lampe,
   die dann wirklich durch die Engine laeuft. Damit kann der Tooltip gar
   nichts anderes behaupten als das, was beim Bauen auch passiert – auch
   wenn jemand spaeter einen Expander in compile.js aendert.

   Gerechnet wird einmal je Typ, danach liegt das Ergebnis im Cache. */
(function (C) {
  'use strict';

  var P = C.model.parts;
  var cache = {};

  /* Liefert [{ in: [...], out: 0|1 }] – oder null, wenn der Typ kein
     Gatter ist (Schalter, Lampe, Takt haben keine Tabelle). */
  function of(type) {
    if (cache[type] !== undefined) return cache[type];
    cache[type] = P.isGate(type) ? rechnen(type) : null;
    return cache[type];
  }

  function rechnen(type) {
    var ids = C.util.ids;
    var n = P.pinCount(type, 'in');
    if (!n) return null;

    /* Mini-Schaltung: n Schalter, das Gatter, eine Lampe. */
    var c = new C.model.Circuit();
    var gate = c.addPart({ id: ids.next('t'), type: type, x: 0, y: 0 });
    var led  = c.addPart({ id: ids.next('t'), type: 'led', x: 200, y: 0 });
    var sw = [];

    for (var i = 0; i < n; i++) {
      var s = c.addPart({ id: ids.next('t'), type: 'switch', x: -200, y: i * 96, value: 0 });
      sw.push(s);
      c.addWire({ id: ids.next('t'), from: { part: s.id, index: 0 },
                                     to:   { part: gate.id, index: i } });
    }
    c.addWire({ id: ids.next('t'), from: { part: gate.id, index: 0 },
                                   to:   { part: led.id, index: 0 } });

    var runner = new C.sim.Runner(c);
    runner.build();

    var rows = [];
    for (var k = 0; k < (1 << n); k++) {
      var werte = [];
      /* Erstes Bit links – so, wie man eine Tabelle liest. */
      for (var b = 0; b < n; b++) werte.push((k >> (n - 1 - b)) & 1);

      runner.engine.reset();
      sw.forEach(function (s, j) { s.value = werte[j]; });
      runner.applyInputs();
      runner.engine.settle();

      rows.push({ in: werte, out: runner.pinValue(led.id, 'in', 0) });
    }

    runner.dispose();
    return rows;
  }

  /* Namen der Eingangspins, fuer den Kopf der Mini-Tabelle. */
  function inputNames(type) {
    var d = P.get(type);
    if (!d) return [];
    return d.ins.map(function (pin, i) {
      return pin.name || String.fromCharCode(65 + i);
    });
  }

  C.sim.gateTruth = { of: of, inputNames: inputNames };

})(window.CIRCUIT = window.CIRCUIT || {});
