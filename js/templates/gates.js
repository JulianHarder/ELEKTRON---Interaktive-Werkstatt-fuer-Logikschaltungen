/* Die Grundgatter, alle aus reinen NAND-Gattern.

   Hier steht absichtlich kein einziges fertiges AND oder XOR aus der Leiste:
   Der Sinn dieser Vorlagen ist zu zeigen, wie die Gatter entstehen. Wer
   darauf aufbaut, nimmt die fertigen Bausteine – dafuer gibt es built.js.

   NOR und XNOR fehlen mit Absicht: Sie sind das OR bzw. XOR von hier mit
   einer Umkehrung dahinter. Wer die vier hier verstanden hat, braucht die
   beiden nicht mehr vorgefuehrt zu bekommen. */
(function (C) {
  'use strict';

  var T = C.templates;

  /* --- NOT --- */
  T.register({
    id: 'not',
    group: 'Aus NAND gebaut',
    title: 'NOT – die Umkehrung',
    desc: 'Y ist immer das Gegenteil von A. Beide Eingänge des NAND hängen ' +
          'an derselben Leitung: ein NAND mit zwei gleichen Eingängen kehrt um.',
    note: '1 NAND',
    build: function (b) {
      b.in('A', 0, 0);
      b.nand('n1', 1, 0);
      b.out('Y', 2, 0);
      b.invert('A', 'n1');
      b.link('n1', 'Y');
    }
  });

  /* --- AND --- */
  T.register({
    id: 'and',
    group: 'Aus NAND gebaut',
    title: 'AND – beide müssen',
    desc: 'Y ist nur dann 1, wenn A und B beide 1 sind. NAND ist bereits ' +
          '„nicht und“ – das zweite NAND kehrt das Ergebnis wieder um.',
    note: '2 NAND',
    build: function (b) {
      b.in('A', 0, 0);
      b.in('B', 0, 1);
      b.nand('n1', 1, 0.5);
      b.nand('n2', 2, 0.5);
      b.out('Y', 3, 0.5);
      b.link('A', 'n1', 0);
      b.link('B', 'n1', 1);
      b.invert('n1', 'n2');
      b.link('n2', 'Y');
    }
  });

  /* --- OR --- */
  T.register({
    id: 'or',
    group: 'Aus NAND gebaut',
    title: 'OR – einer reicht',
    desc: 'Y ist 1, sobald A oder B 1 ist. Nach De Morgan ist „A oder B“ ' +
          'dasselbe wie „nicht (nicht A und nicht B)“: erst jeden Eingang ' +
          'für sich umkehren, dann ein NAND darüber.',
    note: '3 NAND',
    build: function (b) {
      b.in('A', 0, 0);
      b.in('B', 0, 2);
      b.nand('n1', 1, 0);
      b.nand('n2', 1, 2);
      b.nand('n3', 2, 1);
      b.out('Y', 3, 1);
      b.invert('A', 'n1');
      b.invert('B', 'n2');
      b.link('n1', 'n3', 0);
      b.link('n2', 'n3', 1);
      b.link('n3', 'Y');
    }
  });

  /* --- XOR --- */
  T.register({
    id: 'xor',
    group: 'Aus NAND gebaut',
    title: 'XOR – genau einer',
    desc: 'Y ist 1, wenn A und B verschieden sind. Das erste NAND liefert ein ' +
          'Zwischensignal, das gleich dreimal gebraucht wird. XOR ist die ' +
          'Summe zweier Bits – der halbe Weg zum Addierer.',
    note: '4 NAND',
    build: function (b) {
      b.in('A', 0, 0);
      b.in('B', 0, 2);
      b.nand('n1', 1, 1);
      b.nand('n2', 2, 0);
      b.nand('n3', 2, 2);
      b.nand('n4', 3, 1);
      b.out('Y', 4, 1);
      b.link('A', 'n1', 0);
      b.link('B', 'n1', 1);
      b.link('A',  'n2', 0);
      b.link('n1', 'n2', 1);
      b.link('n1', 'n3', 0);
      b.link('B',  'n3', 1);
      b.link('n2', 'n4', 0);
      b.link('n3', 'n4', 1);
      b.link('n4', 'Y');
    }
  });

})(window.CIRCUIT = window.CIRCUIT || {});
