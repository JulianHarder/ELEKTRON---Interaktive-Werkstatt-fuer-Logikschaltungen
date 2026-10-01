/* Schaltungen aus den fertigen Gattern der Leiste.

   Hier geht es nicht mehr darum, wie ein Gatter entsteht – das zeigt
   gates.js –, sondern darum, was man damit baut. Mit XOR, AND und OR als
   Bausteinen liest sich ein Addierer wie seine Formel; aus lauter einzelnen
   NAND waere dieselbe Schaltung ein Knaeuel.

   Die NAND-Zahl in `note` ist trotzdem ehrlich: compile.js loest jedes
   Gatter wieder in NANDs auf. Sie faellt hoeher aus als bei einer von Hand
   optimierten NAND-Schaltung, weil die fertigen Gatter nicht die
   sparsamste Verdrahtung sind. Das ist der Preis der Lesbarkeit. */
(function (C) {
  'use strict';

  var T = C.templates;
  var GRUPPE = 'Mit fertigen Gattern';

  /* --- Halbaddierer --- */
  T.register({
    id: 'half-adder',
    group: GRUPPE,
    title: 'Halbaddierer',
    desc: 'Addiert zwei einzelne Bits. S ist die Summe, C der Übertrag: ' +
          '1 + 1 ergibt 0 und einen Übertrag. Mit fertigen Gattern sind es ' +
          'genau zwei Bauteile – die Summe ist ein XOR, der Übertrag ein AND.',
    note: '2 Gatter, zusammen 6 NAND',
    pins: {
      A: 'Das erste Bit',
      B: 'Das zweite Bit',
      S: 'Summe – das Ergebnisbit',
      C: 'Übertrag, englisch carry: die Eins, die nicht mehr hineinpasst'
    },
    build: function (b) {
      b.in('A', 0, 0);
      b.in('B', 0, 2);
      b.gate('x1', 'xor', 1, 0.5);
      b.gate('a1', 'and', 1, 2);
      b.out('S', 2, 0.5);
      b.out('C', 2, 2);

      b.link('A', 'x1', 0);
      b.link('B', 'x1', 1);
      b.link('A', 'a1', 0);
      b.link('B', 'a1', 1);
      b.link('x1', 'S');
      b.link('a1', 'C');
    }
  });

  /* --- Volladdierer --- */
  T.register({
    id: 'full-adder',
    group: GRUPPE,
    title: 'Volladdierer',
    desc: 'Addiert drei Bits: A, B und einen hereinkommenden Übertrag Cin. ' +
          'Die Summe ist (A XOR B) XOR Cin. Ein Übertrag entsteht, wenn A ' +
          'und B beide 1 sind – oder wenn genau einer von beiden 1 ist und ' +
          'zusätzlich ein Übertrag hereinkommt.',
    note: '5 Gatter, zusammen 15 NAND',
    pins: {
      A: 'Das erste Bit',
      B: 'Das zweite Bit',
      Cin: 'Übertrag, der von der vorigen Stelle hereinkommt (carry in)',
      S: 'Summe – das Ergebnisbit',
      Cout: 'Übertrag, der an die nächste Stelle weitergeht (carry out)'
    },
    build: function (b) {
      b.in('A', 0, 0);
      b.in('B', 0, 1);
      b.in('Cin', 0, 4);
      b.gate('x1', 'xor', 1, 0.5);
      b.gate('a1', 'and', 1, 2.5);
      b.gate('x2', 'xor', 2, 0.5);
      b.gate('a2', 'and', 2, 2.5);
      b.gate('o1', 'or',  3, 3.5);
      b.out('S', 4, 0.5);
      b.out('Cout', 4, 3.5);

      b.link('A', 'x1', 0);
      b.link('B', 'x1', 1);
      b.link('A', 'a1', 0);
      b.link('B', 'a1', 1);

      b.link('x1',  'x2', 0);
      b.link('Cin', 'x2', 1);
      b.link('x1',  'a2', 0);
      b.link('Cin', 'a2', 1);

      b.link('a1', 'o1', 0);
      b.link('a2', 'o1', 1);
      b.link('x2', 'S');
      b.link('o1', 'Cout');
    }
  });

  /* --- Multiplexer 2:1 --- */
  T.register({
    id: 'mux2',
    group: GRUPPE,
    title: 'Multiplexer 2:1',
    desc: 'S entscheidet, welches Signal durchkommt: bei S = 0 geht A nach ' +
          'Y, bei S = 1 geht B nach Y. Jeder Weg bekommt ein AND als Tor, ' +
          'und das OR führt beide wieder zusammen. Ein Umschalter aus Logik ' +
          '– damit wählt eine CPU später aus, womit sie rechnet.',
    note: '4 Gatter, zusammen 8 NAND',
    pins: {
      A: 'Kommt durch, wenn S auf 0 steht',
      B: 'Kommt durch, wenn S auf 1 steht',
      S: 'Auswahl, englisch select: bestimmt, welcher Eingang durchkommt',
      Y: 'Das durchgelassene Signal'
    },
    build: function (b) {
      b.in('A', 0, 0);
      b.in('B', 0, 2);
      b.in('S', 0, 4);
      b.gate('i1', 'not', 1, 4);
      b.gate('a1', 'and', 2, 0.5);
      b.gate('a2', 'and', 2, 2.5);
      b.gate('o1', 'or',  3, 1.5);
      b.out('Y', 4, 1.5);

      b.link('S', 'i1', 0);
      b.link('A',  'a1', 0);
      b.link('i1', 'a1', 1);
      b.link('B', 'a2', 0);
      b.link('S', 'a2', 1);
      b.link('a1', 'o1', 0);
      b.link('a2', 'o1', 1);
      b.link('o1', 'Y');
    }
  });

  /* --- D-Flip-Flop ---

     Zwei Latches hintereinander, mit entgegengesetztem Takt. Einer von
     beiden ist immer gesperrt – und eine gesperrte Latch-Kreuzung ist beim
     Einschalten vollkommen symmetrisch: beide Haelften wollen dasselbe,
     keine gibt nach, die Schaltung schwingt. In echter Elektronik
     entscheidet dann die winzige Ungleichheit zweier Transistoren, hier
     muesste sie geraten werden.

     Deshalb hat dieses Flip-Flop einen Ruecksetz-Eingang R, so wie jeder
     gekaufte Baustein auch. Mit fertigen Gattern kostet er ein einziges OR
     im Ruecksetzpfad des hinteren Latch. */
  T.register({
    id: 'd-flipflop',
    group: GRUPPE,
    title: 'D-Flip-Flop',
    desc: 'Zwei Latches hintereinander, mit entgegengesetztem Takt. Der ' +
          'vordere übernimmt D, solange CLK auf 0 steht, der hintere gibt ' +
          'ihn weiter, sobald CLK auf 1 geht. Q ändert sich dadurch nur im ' +
          'Moment des Taktwechsels – genau das braucht ein Register. Die ' +
          'beiden über Kreuz verbundenen NOR sind der eigentliche Speicher.',
    note: 'R setzt zurück und wirkt bei 1. Beim Start steht R auf 1 – lege ' +
          'ihn auf 0, dann arbeitet das Flip-Flop.',
    pins: {
      D: 'Daten, englisch data: der Wert, der übernommen werden soll',
      CLK: 'Takt, englisch clock: beim Wechsel von 0 auf 1 wird D übernommen',
      R: 'Rücksetzen, englisch reset: wirkt bei 1 und setzt Q auf 0',
      Q: 'Der gespeicherte Wert',
      nQ: 'Derselbe Wert, umgekehrt – das n steht für „nicht"'
    },
    build: function (b) {
      b.in('D', 0, 0);
      b.in('CLK', 0, 6);             /* startet auf 0: der vordere Latch führt */
      b.in('R', 0, 8, 1);            /* Rücksetzen ist beim Start aktiv */

      b.gate('nd', 'not', 1, 2);     /* D umgekehrt – der Reset-Zweig */
      b.gate('nc', 'not', 1, 6);     /* Takt umgekehrt – für den vorderen Latch */
      b.link('D', 'nd', 0);
      b.link('CLK', 'nc', 0);

      /* Vorderer Latch: offen, solange CLK auf 0 steht. */
      latch(b, 'm', 2, 0, 'D', 'nd', 'nc');

      /* Hinterer Latch: offen, sobald CLK auf 1 geht. Seine Eingänge kommen
         vom vorderen, nicht von D. */
      latch(b, 's', 5, 0, 'mq', 'mnq', 'CLK');

      /* R zwingt den hinteren Latch auf Q = 0 und bricht damit die
         Symmetrie beim Einschalten. */
      b.gate('ro', 'or', 7, 2);
      b.link('sr', 'ro', 0);
      b.link('R',  'ro', 1);
      b.link('ro', 'sq', 0);

      b.out('Q', 9, 0);
      b.out('nQ', 9, 2);
      b.link('sq',  'Q');
      b.link('snq', 'nQ');
    }
  });

  /* Ein Latch aus zwei über Kreuz verbundenen NOR, mit zwei AND als Tor.
     set/reset sind die Namen der speisenden Bauteile, en der Takteingang.

     Der Rücksetz-Eingang des NOR bleibt offen, wenn der Aufrufer ihn selbst
     verdrahtet – beim hinteren Latch läuft dort das OR für R hinein. */
  function latch(b, p, col, row, set, reset, en) {
    var s = p + 's', r = p + 'r', q = p + 'q', nq = p + 'nq';
    b.gate(s,  'and', col,     row);
    b.gate(r,  'and', col,     row + 2);
    b.gate(q,  'nor', col + 1, row);
    b.gate(nq, 'nor', col + 1, row + 2);

    b.link(set,   s, 0);
    b.link(en,    s, 1);
    b.link(reset, r, 0);
    b.link(en,    r, 1);

    b.link(nq, q, 1);          /* über Kreuz */
    b.link(s, nq, 0);
    b.link(q, nq, 1);
    /* q:0 bleibt frei – dort kommt entweder r direkt oder das Reset-OR an. */
    if (p === 'm') b.link(r, q, 0);
  }

})(window.CIRCUIT = window.CIRCUIT || {});
