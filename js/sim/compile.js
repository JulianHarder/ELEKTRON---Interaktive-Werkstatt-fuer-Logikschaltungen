/* Schaltung -> flache NAND-Netzliste.

   Jeder Ausgangspin bekommt eine Signalnummer. Ein Eingang bekommt die Nummer
   des Ausgangs, der ihn speist – oder 0, wenn nichts angeschlossen ist.
   Signal 0 ist fest 0 und wird nie beschrieben; offene Eingaenge liegen also
   auf Low, so wie ein nicht angeschlossener Draht.

   Nebenbei entsteht eine Zuordnungstabelle (Pin -> Signalnummer). Aus ihr
   liest die Darstellung spaeter die Werte. */
(function (C) {
  'use strict';

  var P = C.model.parts;

  /* Bauteile, die ihren Wert selbst setzen statt ihn zu berechnen. */
  function isSource(type) {
    return type === 'switch' || type === 'const' || type === 'clock' ||
           type === 'port-in';
  }

  /* --- Gatter als NAND-Kapseln ---

     Hier steht der Kern der Regel "NAND ist das einzige Grundbauteil": AND,
     OR, XOR und so weiter sind keine eigene Rechenart, sondern feste
     Verdrahtungsmuster aus NANDs. Beim Uebersetzen werden sie eingesetzt,
     als haette der Nutzer sie selbst hingemalt.

     alloc() gibt eine neue Signalnummer fuer eine Zwischenleitung,
     emit(a, b, y) haengt ein NAND an die Netzliste.
     Die Gatterzahl stimmt mit den Richtwerten aus dem Plan ueberein. */
  var expanders = {

    /* NOT: beide Eingaenge an dieselbe Quelle. */
    not: function (a, b, y, alloc, emit) {
      emit(a, a, y);
    },

    /* AND: NAND, dann invertieren. */
    and: function (a, b, y, alloc, emit) {
      var t = alloc();
      emit(a, b, t);
      emit(t, t, y);
    },

    /* OR nach De Morgan: beide Eingaenge invertieren, dann NAND. */
    or: function (a, b, y, alloc, emit) {
      var na = alloc(), nb = alloc();
      emit(a, a, na);
      emit(b, b, nb);
      emit(na, nb, y);
    },

    /* NOR: OR, dann invertieren. */
    nor: function (a, b, y, alloc, emit) {
      var na = alloc(), nb = alloc(), o = alloc();
      emit(a, a, na);
      emit(b, b, nb);
      emit(na, nb, o);
      emit(o, o, y);
    },

    /* XOR: die klassische Vierer-Anordnung. */
    xor: function (a, b, y, alloc, emit) {
      var t = alloc(), u = alloc(), v = alloc();
      emit(a, b, t);
      emit(a, t, u);
      emit(t, b, v);
      emit(u, v, y);
    },

    /* XNOR: XOR, dann invertieren – das ist der Gleichheits-Vergleich. */
    xnor: function (a, b, y, alloc, emit) {
      var t = alloc(), u = alloc(), v = alloc(), o = alloc();
      emit(a, b, t);
      emit(a, t, u);
      emit(t, b, v);
      emit(u, v, o);
      emit(o, o, y);
    }
  };

  function compile(circuit) {
    var next = 1;                 /* 0 ist reserviert: fest 0 */
    var outSig = {};              /* "partId:index" -> Signalnummer */
    var inputs = [];              /* Quellen: { part, type, sig } */
    var ga = [], gb = [], gy = [];/* NAND-Gatter, flach */

    /* 1. Jedem Ausgangspin eine Nummer geben. */
    circuit.parts.forEach(function (p) {
      var n = P.pinCount(p.type, 'out');
      for (var i = 0; i < n; i++) outSig[p.id + ':' + i] = next++;
    });

    /* 2. Quellen merken – ihre Werte kommen von aussen. */
    circuit.parts.forEach(function (p) {
      if (!isSource(p.type)) return;
      inputs.push({ part: p.id, type: p.type, sig: outSig[p.id + ':0'] });
    });

    /* Welches Signal liegt an diesem Eingang? */
    function inSig(partId, index) {
      var w = circuit.wireIntoPin(partId, index);
      if (!w) return 0;
      return outSig[w.from.part + ':' + w.from.index] || 0;
    }

    /* 3. Die Gatter. Am Ende stehen ausschliesslich NANDs in der Liste –
          zusammengesetzte Gatter werden dabei aufgeloest. */
    function emit(a, b, y) { ga.push(a); gb.push(b); gy.push(y); }
    function alloc() { return next++; }

    circuit.parts.forEach(function (p) {
      var y = outSig[p.id + ':0'];

      if (p.type === 'nand') { emit(inSig(p.id, 0), inSig(p.id, 1), y); return; }

      var expand = expanders[p.type];
      if (!expand) return;

      /* NOT hat nur einen Eingang; b bleibt dann ungenutzt. */
      var a = inSig(p.id, 0);
      var b = P.pinCount(p.type, 'in') > 1 ? inSig(p.id, 1) : a;
      expand(a, b, y, alloc, emit);
    });

    /* 4. Zuordnung fuer die Darstellung. */
    var pinSig = {};
    circuit.parts.forEach(function (p) {
      var d = P.get(p.type);
      if (!d) return;
      d.outs.forEach(function (_, i) { pinSig[p.id + ':out:' + i] = outSig[p.id + ':' + i]; });
      d.ins.forEach(function (_, i)  { pinSig[p.id + ':in:' + i]  = inSig(p.id, i); });
    });

    var wireSig = {};
    circuit.wires.forEach(function (w) {
      wireSig[w.id] = outSig[w.from.part + ':' + w.from.index] || 0;
    });

    return {
      count:     next,                    /* Anzahl Signale inkl. der festen 0 */
      gateCount: gy.length,
      ga: Int32Array.from(ga),
      gb: Int32Array.from(gb),
      gy: Int32Array.from(gy),
      inputs:  inputs,
      pinSig:  pinSig,
      wireSig: wireSig
    };
  }

  C.sim.compile   = compile;
  C.sim.isSource  = isSource;
  C.sim.expanders = expanders;

})(window.CIRCUIT = window.CIRCUIT || {});
