/* Bauteil-Typen: Größe, Pins, Beschriftung, Kurzbeschreibung.
   Reine Daten – diese Datei weiß nichts vom Zeichnen und nichts von der Simulation.
   `desc` erklärt in einem Satz, was das Bauteil tut; die Oberfläche zeigt das
   beim Überfahren. Es steht hier und nicht in der UI, weil es zum Bauteil
   gehört wie seine Pins.
   Alle Maße in Weltkoordinaten. Einheitliche Bauhöhe 64 sorgt für ein ruhiges Bild;
   dadurch liegen alle Pins auf dem 16er-Raster. */
(function (C) {
  'use strict';

  var H = 64;   /* Bauhöhe aller Bauteile */
  var W = 64;   /* Standardbreite */

  var defs = {

    /* Der einzige echte Logikbaustein am Anfang. Alles andere baut der Nutzer daraus. */
    nand: {
      type: 'nand', name: 'NAND', hint: 'Nicht-Und', note: 'Das einzige echte Logikbauteil',
      desc: 'Y ist 0, nur wenn A und B beide 1 sind. Sonst 1. ' +
            'Aus diesem einen Bauteil lässt sich jede Logik bauen.',
      w: 80, h: H,
      ins:  [ { name: 'A', x: 0,  y: 16 }, { name: 'B', x: 0, y: 48 } ],
      outs: [ { name: 'Y', x: 80, y: 32 } ]
    },

    /* --- Die uebrigen Gatter ---
       Sie sind KEINE eigenen Grundbauteile: compile.js loest jedes davon
       beim Rechnen wieder in NAND-Gatter auf (siehe expanders dort). Damit
       bleibt NAND das einzige echte Logikbauteil, und die NAND-Zahl einer
       Schaltung stimmt weiterhin fuer die spaetere Sternwertung. */

    not: {
      type: 'not', name: 'NOT', hint: 'Nicht', note: 'Kapsel aus 1 NAND',
      desc: 'Y ist immer das Gegenteil von A.',
      w: 64, h: H,
      ins:  [ { name: 'A', x: 0, y: 32 } ],
      outs: [ { name: 'Y', x: 64, y: 32 } ]
    },

    and: {
      type: 'and', name: 'AND', hint: 'Und', note: 'Kapsel aus 2 NAND',
      desc: 'Y ist 1, nur wenn A und B beide 1 sind.',
      w: 80, h: H,
      ins:  [ { name: 'A', x: 0, y: 16 }, { name: 'B', x: 0, y: 48 } ],
      outs: [ { name: 'Y', x: 80, y: 32 } ]
    },

    or: {
      type: 'or', name: 'OR', hint: 'Oder', note: 'Kapsel aus 3 NAND',
      desc: 'Y ist 1, sobald A oder B 1 ist – oder beide.',
      w: 88, h: H,
      ins:  [ { name: 'A', x: 0, y: 16 }, { name: 'B', x: 0, y: 48 } ],
      outs: [ { name: 'Y', x: 88, y: 32 } ]
    },

    nor: {
      type: 'nor', name: 'NOR', hint: 'Nicht-Oder', note: 'Kapsel aus 4 NAND',
      desc: 'Y ist 1, nur wenn weder A noch B 1 ist.',
      w: 88, h: H,
      ins:  [ { name: 'A', x: 0, y: 16 }, { name: 'B', x: 0, y: 48 } ],
      outs: [ { name: 'Y', x: 88, y: 32 } ]
    },

    xor: {
      type: 'xor', name: 'XOR', hint: 'Entweder-oder', note: 'Kapsel aus 4 NAND',
      desc: 'Y ist 1, wenn A und B verschieden sind.',
      w: 88, h: H,
      ins:  [ { name: 'A', x: 0, y: 16 }, { name: 'B', x: 0, y: 48 } ],
      outs: [ { name: 'Y', x: 88, y: 32 } ]
    },

    xnor: {
      type: 'xnor', name: 'XNOR', hint: 'Gleichheit', note: 'Kapsel aus 5 NAND',
      desc: 'Y ist 1, wenn A und B gleich sind. Ein Vergleich zweier Bits.',
      w: 88, h: H,
      ins:  [ { name: 'A', x: 0, y: 16 }, { name: 'B', x: 0, y: 48 } ],
      outs: [ { name: 'Y', x: 88, y: 32 } ]
    },

    /* Eingabe: per Klick umlegbar. */
    switch: {
      type: 'switch', name: 'Schalter', hint: 'Eingang',
      desc: 'Eingang zum Umlegen. Ein Klick wechselt zwischen 0 und 1.',
      w: W, h: H,
      ins:  [],
      outs: [ { name: '', x: W, y: 32 } ]
    },

    /* Ausgabe: leuchtet bei 1. */
    led: {
      type: 'led', name: 'LED', hint: 'Anzeige',
      desc: 'Zeigt an, was ankommt: leuchtet bei 1, bleibt dunkel bei 0.',
      w: W, h: H,
      ins:  [ { name: '', x: 0, y: 32 } ],
      outs: []
    },

    /* Fester Pegel 0 oder 1. */
    const: {
      type: 'const', name: 'Konstante', hint: 'Fest 0 oder 1',
      desc: 'Ein fest verdrahteter Pegel. Ein Klick wechselt ihn zwischen 0 und 1. ' +
            'Anders als ein Schalter bekommt er keine Spalte in der Wahrheitstabelle – ' +
            'er gehört zur Schaltung, nicht zur Eingabe.',
      w: W, h: H,
      ins:  [],
      outs: [ { name: '', x: W, y: 32 } ]
    },

    /* Taktgeber – wechselt regelmäßig den Pegel. */
    clock: {
      type: 'clock', name: 'Takt', hint: 'Taktsignal',
      desc: 'Wechselt von selbst regelmäßig zwischen 0 und 1. Ein Klick hält ihn an. ' +
            'Solange er läuft, gibt es keine feste Wahrheitstabelle.',
      w: W, h: H,
      ins:  [],
      outs: [ { name: '', x: W, y: 32 } ]
    },

    /* Anschlüsse eines eigenen Bausteins. Als Typ vorhanden, aber noch
       ohne Verwendung: Eigene Bausteine gibt es (wieder) nicht – siehe
       Etappe 5 im Plan. Sie stehen deshalb auch nicht in der Leiste. */
    'port-in': {
      type: 'port-in', name: 'Eingang', hint: 'Anschluss des Bausteins',
      desc: 'Anschluss eines eigenen Bausteins – hier geht ein Signal hinein.',
      w: 48, h: H,
      ins:  [],
      outs: [ { name: '', x: 48, y: 32 } ]
    },
    'port-out': {
      type: 'port-out', name: 'Ausgang', hint: 'Anschluss des Bausteins',
      desc: 'Anschluss eines eigenen Bausteins – hier kommt ein Signal heraus.',
      w: 48, h: H,
      ins:  [ { name: '', x: 0, y: 32 } ],
      outs: []
    }
  };

  function get(type) { return defs[type] || null; }

  /* Rechteck eines platzierten Bauteils (ohne Pin-Stummel). */
  function bounds(part) {
    var d = get(part.type);
    return { x: part.x, y: part.y, w: d ? d.w : W, h: d ? d.h : H };
  }

  /* Weltposition eines Pins. kind ist 'in' oder 'out'. */
  function pinPos(part, kind, index) {
    var d = get(part.type);
    if (!d) return { x: part.x, y: part.y };
    var list = kind === 'in' ? d.ins : d.outs;
    var p = list[index];
    if (!p) return { x: part.x, y: part.y };
    return { x: part.x + p.x, y: part.y + p.y };
  }

  function pinCount(type, kind) {
    var d = get(type);
    if (!d) return 0;
    return (kind === 'in' ? d.ins : d.outs).length;
  }

  /* Reihenfolge in der Bausteinleiste (und im Styleguide). */
  var order = ['switch', 'led', 'nand',
               'not', 'and', 'or', 'nor', 'xor', 'xnor',
               'const', 'clock'];

  /* Gatter, die aus NAND zusammengesetzt sind. */
  var derived = ['not', 'and', 'or', 'nor', 'xor', 'xnor'];

  function isGate(type) {
    return type === 'nand' || derived.indexOf(type) >= 0;
  }

  C.model.parts = {
    defs: defs,
    order: order,
    derived: derived,
    isGate: isGate,
    get: get,
    bounds: bounds,
    pinPos: pinPos,
    pinCount: pinCount,
    HEIGHT: H
  };

})(window.CIRCUIT = window.CIRCUIT || {});
