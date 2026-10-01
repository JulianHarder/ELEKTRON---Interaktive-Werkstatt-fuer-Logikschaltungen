/* Vektorsymbole der Bauteile als Path2D, in lokalen Weltkoordinaten
   (Ursprung = linke obere Ecke des Bauteils).
   Die Pfade werden einmal gebaut und danach nur noch gefuellt/gestrichen. */
(function (C) {
  'use strict';

  var T = C.render.theme;
  var built = null;

  function rr(p, x, y, w, h, r) {
    var q = Math.min(r, w / 2, h / 2);
    p.moveTo(x + q, y);
    p.lineTo(x + w - q, y);
    p.arcTo(x + w, y, x + w, y + q, q);
    p.lineTo(x + w, y + h - q);
    p.arcTo(x + w, y + h, x + w - q, y + h, q);
    p.lineTo(x + q, y + h);
    p.arcTo(x, y + h, x, y + h - q, q);
    p.lineTo(x, y + q);
    p.arcTo(x, y, x + q, y, q);
    p.closePath();
  }

  /* --- Bausteine der Gattersymbole ---
     Alle Gatter sind 64 hoch, Mitte bei y = 32. Die UND-Familie ist eine
     D-Form, die ODER-Familie ein Schild mit konkaver Rueckseite, NOT ein
     Dreieck. Negiert wird immer durch denselben Kreis am Ausgang. */

  /* D-Form: gerade Rueckseite, halbrunde Front. */
  function dShape(backX, flatTo, r) {
    var p = new Path2D();
    p.moveTo(backX, 6);
    p.lineTo(flatTo, 6);
    p.arc(flatTo, 32, r, -Math.PI / 2, Math.PI / 2);
    p.lineTo(backX, 58);
    p.closePath();
    return p;
  }

  /* Schild: konkave Rueckseite, zwei Flanken zur Spitze. */
  function orShape(backX, tipX) {
    var p = new Path2D();
    var k = backX + (tipX - backX) * 0.55;
    p.moveTo(backX, 6);
    p.quadraticCurveTo(k, 6, tipX, 32);
    p.quadraticCurveTo(k, 58, backX, 58);
    p.quadraticCurveTo(backX + 18, 32, backX, 6);
    p.closePath();
    return p;
  }

  /* Der zusaetzliche Bogen vor XOR und XNOR. Wird gestrichen, nicht gefuellt. */
  function xorArc(x) {
    var p = new Path2D();
    p.moveTo(x, 6);
    p.quadraticCurveTo(x + 18, 32, x, 58);
    return p;
  }

  function circle(x, y, r) {
    var p = new Path2D();
    p.arc(x, y, r, 0, Math.PI * 2);
    return p;
  }

  /* Anschluss-Stummel: zwei Eingaenge links, ein Ausgang rechts. */
  function stubs2(inTo, outFrom, outTo) {
    var p = new Path2D();
    p.moveTo(0, 16); p.lineTo(inTo, 16);
    p.moveTo(0, 48); p.lineTo(inTo, 48);
    p.moveTo(outFrom, 32); p.lineTo(outTo, 32);
    return p;
  }

  function build() {
    var S = {};

    /* --- UND-Familie: NAND (mit Kreis) und AND (ohne) --- */
    S.nandBody   = dShape(6, 34, 26);          /* Front endet bei 60 */
    S.nandBubble = circle(65, 32, 5);
    S.nandStubs  = stubs2(6, 70, 80);

    S.andBody  = dShape(6, 40, 26);            /* Front endet bei 66 */
    S.andStubs = stubs2(6, 66, 80);

    /* --- ODER-Familie, alle 88 breit --- */
    S.orBody  = orShape(4, 68);
    S.orStubs = stubs2(14, 68, 88);

    S.norBody   = orShape(4, 62);
    S.norBubble = circle(67, 32, 5);
    S.norStubs  = stubs2(14, 72, 88);

    S.xorBody  = orShape(12, 72);
    S.xorArc   = xorArc(4);
    S.xorStubs = stubs2(20, 72, 88);

    S.xnorBody   = orShape(12, 66);
    S.xnorArc    = xorArc(4);
    S.xnorBubble = circle(71, 32, 5);
    S.xnorStubs  = stubs2(20, 76, 88);

    /* --- NOT: Dreieck mit Kreis, nur ein Eingang --- */
    var not = new Path2D();
    not.moveTo(12, 8); not.lineTo(12, 56); not.lineTo(48, 32); not.closePath();
    S.notBody   = not;
    S.notBubble = circle(53, 32, 5);

    var notStubs = new Path2D();
    notStubs.moveTo(0, 32);  notStubs.lineTo(12, 32);
    notStubs.moveTo(58, 32); notStubs.lineTo(64, 32);
    S.notStubs = notStubs;

    /* --- Schalter: Kippflaeche mit gleitendem Knopf --- */
    var swBody = new Path2D();
    rr(swBody, 8, 16, 48, 32, 16);
    S.switchBody = swBody;

    var swStub = new Path2D();
    swStub.moveTo(56, 32); swStub.lineTo(64, 32);
    S.switchStub = swStub;

    /* --- LED: Kolben mit Innenring --- */
    var ledBulb = new Path2D();
    ledBulb.arc(36, 32, 18, 0, Math.PI * 2);
    S.ledBulb = ledBulb;

    var ledInner = new Path2D();
    ledInner.arc(36, 32, 10.5, 0, Math.PI * 2);
    S.ledInner = ledInner;

    var ledStub = new Path2D();
    ledStub.moveTo(0, 32); ledStub.lineTo(18, 32);
    S.ledStub = ledStub;

    /* --- Konstante und Takt: gleicher Kastenkoerper --- */
    var box = new Path2D();
    rr(box, 8, 16, 48, 32, T.bodyRadius);
    S.boxBody = box;

    var boxStub = new Path2D();
    boxStub.moveTo(56, 32); boxStub.lineTo(64, 32);
    S.boxStub = boxStub;

    /* Rechteckwelle im Taktgeber */
    var wave = new Path2D();
    wave.moveTo(18, 40);
    wave.lineTo(24, 40); wave.lineTo(24, 24); wave.lineTo(33, 24);
    wave.lineTo(33, 40); wave.lineTo(42, 40); wave.lineTo(42, 24);
    wave.lineTo(46, 24);
    S.clockWave = wave;

    /* --- Anschluesse eigener Bausteine --- */
    var pIn = new Path2D();
    pIn.moveTo(4, 18); pIn.lineTo(29, 18); pIn.lineTo(42, 32);
    pIn.lineTo(29, 46); pIn.lineTo(4, 46); pIn.closePath();
    S.portInBody = pIn;

    var pInStub = new Path2D();
    pInStub.moveTo(42, 32); pInStub.lineTo(48, 32);
    S.portInStub = pInStub;

    var pOut = new Path2D();
    pOut.moveTo(6, 32); pOut.lineTo(19, 18); pOut.lineTo(44, 18);
    pOut.lineTo(44, 46); pOut.lineTo(19, 46); pOut.closePath();
    S.portOutBody = pOut;

    var pOutStub = new Path2D();
    pOutStub.moveTo(0, 32); pOutStub.lineTo(6, 32);
    S.portOutStub = pOutStub;

    /* Vereinfachte Form fuer weit herausgezoomte Ansichten (LOD). */
    S.lodBox = function (w, h) {
      var p = new Path2D();
      rr(p, 4, 8, w - 8, h - 16, 5);
      return p;
    };

    return S;
  }

  /* Pfade erst beim ersten Zugriff bauen – Path2D steht erst zur Verfuegung,
     wenn das Dokument laeuft. */
  function get() {
    if (!built) built = build();
    return built;
  }

  C.render.symbols = { get: get, roundRectPath: rr };

})(window.CIRCUIT = window.CIRCUIT || {});
