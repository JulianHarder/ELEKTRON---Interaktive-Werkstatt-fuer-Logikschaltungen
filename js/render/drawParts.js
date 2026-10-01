/* Zeichnet Bauteile in Weltkoordinaten. Der Kontext traegt bereits die
   Kamera-Transformation; hier wird nur noch auf das Bauteil verschoben.

   opts: { value, hover, selected, error, knob, scale, time } */
(function (C) {
  'use strict';

  var T   = C.render.theme;
  var SYM = C.render.symbols;
  var SPR = C.render.sprites;
  var P   = C.model.parts;

  /* Verlaeufe haengen am Kontext und werden einmal erzeugt.
     CanvasGradient-Koordinaten gelten im lokalen Bauteilraum. */
  function grads(ctx) {
    if (ctx._cGrads) return ctx._cGrads;
    var body = ctx.createLinearGradient(0, 6, 0, 58);
    body.addColorStop(0, T.bodyTop);
    body.addColorStop(1, T.bodyBottom);

    var gloss = ctx.createLinearGradient(0, 6, 0, 30);
    gloss.addColorStop(0, T.bodyGloss);
    gloss.addColorStop(1, 'rgba(255,255,255,0)');

    ctx._cGrads = { body: body, gloss: gloss };
    return ctx._cGrads;
  }

  function borderColor(o) {
    if (o.error)    return T.err;
    if (o.selected) return T.selection;
    if (o.hover)    return T.hover;
    return T.bodyBorder;
  }

  /* Koerper: Schatten, Fuellung, Innenglanz, Rand. */
  function body(ctx, path, key, w, h, o) {
    var g = grads(ctx);

    var sprite = SPR.pathShadow(key, path, w, h, 6, 0.5);
    SPR.drawPathShadow(ctx, sprite, w, h, 6, 0, 3);

    ctx.fillStyle = g.body;
    ctx.fill(path);

    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = g.gloss;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    ctx.lineWidth = o.selected || o.error ? 2 : T.stroke;
    ctx.strokeStyle = borderColor(o);
    ctx.stroke(path);
  }

  /* Anschluss-Stummel am Koerper, in Signalfarbe wenn aktiv. */
  function stubs(ctx, path, on) {
    ctx.lineWidth = T.wireW;
    ctx.lineCap = 'round';
    ctx.strokeStyle = on ? T.signal : T.wireOff;
    ctx.stroke(path);
    ctx.lineCap = 'butt';
  }

  function text(ctx, s, x, y, size, color, weight) {
    ctx.font = (weight || 600) + ' ' + size + 'px ' + fontUI();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }

  function fontUI()   { return "'Inter', system-ui, sans-serif"; }
  function fontMono() { return "'JetBrains Mono', Consolas, monospace"; }

  /* --- die einzelnen Bauteile --- */

  /* Negationskreis: immer in Koerperfarbe gefuellt, nur der Rand traegt das
     Signal. Gefuellt wuerde er wie ein zweiter Pin neben dem Ausgang wirken. */
  function bubble(ctx, path, o) {
    ctx.fillStyle = T.bodyBottom;
    ctx.fill(path);
    ctx.lineWidth = o.value === 1 ? 2 : T.stroke;
    ctx.strokeStyle = o.value === 1 ? T.signal : borderColor(o);
    ctx.stroke(path);
  }

  /* Alle Gatter nach demselben Muster: Stummel, Koerper, Beschriftung,
     dann Sonderteile (XOR-Bogen, Negationskreis).
     g: { stubs, body, key, w, label, labelX, size, arc, bubble } */
  function drawGate(ctx, o, g) {
    var S = SYM.get();
    stubs(ctx, S[g.stubs], o.value === 1);
    body(ctx, S[g.body], g.key, g.w, 64, o);

    if (g.arc) {
      ctx.lineWidth = T.stroke;
      ctx.strokeStyle = borderColor(o);
      ctx.stroke(S[g.arc]);
    }
    if (g.label) text(ctx, g.label, g.labelX, 32, g.size || 12, T.label);
    if (g.bubble) bubble(ctx, S[g.bubble], o);
  }

  /* Beschreibung je Gattertyp – die Geometrie steckt in symbols.js. */
  var gates = {
    nand: { stubs: 'nandStubs', body: 'nandBody', key: 'nand', w: 80,
            label: 'NAND', labelX: 30, size: 13, bubble: 'nandBubble' },
    and:  { stubs: 'andStubs',  body: 'andBody',  key: 'and',  w: 80,
            label: 'AND',  labelX: 32, size: 13 },
    or:   { stubs: 'orStubs',   body: 'orBody',   key: 'or',   w: 88,
            label: 'OR',   labelX: 32, size: 13 },
    nor:  { stubs: 'norStubs',  body: 'norBody',  key: 'nor',  w: 88,
            label: 'NOR',  labelX: 31, size: 12, bubble: 'norBubble' },
    xor:  { stubs: 'xorStubs',  body: 'xorBody',  key: 'xor',  w: 88,
            label: 'XOR',  labelX: 40, size: 13, arc: 'xorArc' },
    xnor: { stubs: 'xnorStubs', body: 'xnorBody', key: 'xnor', w: 88,
            label: 'XNOR', labelX: 38, size: 10, arc: 'xnorArc', bubble: 'xnorBubble' },
    not:  { stubs: 'notStubs',  body: 'notBody',  key: 'not',  w: 64,
            bubble: 'notBubble' }
  };

  function drawSwitch(ctx, o) {
    var S = SYM.get();
    var on = o.value === 1;
    var k = o.knob === undefined ? (on ? 1 : 0) : o.knob;

    stubs(ctx, S.switchStub, on);
    body(ctx, S.switchBody, 'switch', 64, 64, o);

    /* Innenbahn */
    ctx.save();
    ctx.clip(S.switchBody);
    ctx.fillStyle = on ? 'rgba(255,181,71,.18)' : 'rgba(10,14,22,.55)';
    ctx.fillRect(8, 16, 48, 32);
    ctx.restore();

    /* Knopf gleitet zwischen den Endlagen. */
    var kx = 24 + k * 16;
    if (on) SPR.drawGlow(ctx, kx, 32, 24, 0.30 * k);
    ctx.beginPath();
    ctx.arc(kx, 32, 11, 0, Math.PI * 2);
    ctx.fillStyle = on ? T.signal : '#46566f';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = on ? T.signalCore : '#5b6d8a';
    ctx.stroke();

    text(ctx, on ? '1' : '0', kx, 32, 12, on ? '#221703' : '#0c121b', 600);
  }

  function drawLed(ctx, o) {
    var S = SYM.get();
    var on = o.value === 1;

    stubs(ctx, S.ledStub, on);

    var sprite = SPR.pathShadow('led', S.ledBulb, 64, 64, 6, 0.5);
    SPR.drawPathShadow(ctx, sprite, 64, 64, 6, 0, 3);

    if (on) SPR.drawGlow(ctx, 36, 32, 40, 0.62);

    ctx.fillStyle = on ? T.signal : '#18202e';
    ctx.fill(S.ledBulb);
    ctx.lineWidth = o.selected || o.error ? 2 : T.stroke;
    ctx.strokeStyle = on ? T.signalSoft : borderColor(o);
    ctx.stroke(S.ledBulb);

    ctx.fillStyle = on ? 'rgba(255,240,210,.80)' : 'rgba(255,255,255,.04)';
    ctx.fill(S.ledInner);
  }

  function drawConst(ctx, o) {
    var S = SYM.get();
    var on = o.value === 1;
    stubs(ctx, S.boxStub, on);
    body(ctx, S.boxBody, 'box', 64, 64, o);
    ctx.font = '600 20px ' + fontMono();
    ctx.fillStyle = on ? T.signal : T.labelDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(on ? '1' : '0', 32, 33);
  }

  function drawClock(ctx, o) {
    var S = SYM.get();
    var on = o.value === 1;
    stubs(ctx, S.boxStub, on);
    body(ctx, S.boxBody, 'box', 64, 64, o);

    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = on ? T.signal : T.labelDim;
    ctx.stroke(S.clockWave);
    ctx.lineJoin = 'miter';
  }

  function drawPort(ctx, o, isIn) {
    var S = SYM.get();
    var on = o.value === 1;
    stubs(ctx, isIn ? S.portInStub : S.portOutStub, on);
    body(ctx, isIn ? S.portInBody : S.portOutBody, isIn ? 'pin' : 'pout', 48, 64, o);
    text(ctx, o.label || (isIn ? 'IN' : 'OUT'), 24, 32, 11, T.labelDim);
  }

  /* Vereinfachte Darstellung fuer weit herausgezoomte Ansichten. */
  function drawLod(ctx, part, o) {
    var d = P.get(part.type);
    if (!d) return;
    var path = SYM.get().lodBox(d.w, d.h);
    ctx.fillStyle = o.value === 1 ? 'rgba(255,181,71,.22)' : T.bodyBottom;
    ctx.fill(path);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = o.value === 1 ? T.signal : borderColor(o);
    ctx.stroke(path);
  }

  var drawers = {
    switch: drawSwitch,
    led:    drawLed,
    const:  drawConst,
    clock:  drawClock,
    'port-in':  function (ctx, o) { drawPort(ctx, o, true); },
    'port-out': function (ctx, o) { drawPort(ctx, o, false); }
  };

  /* Haupteinstieg: ein Bauteil zeichnen. */
  function draw(ctx, part, opts) {
    var o = opts || {};
    var gate = gates[part.type];
    var fn = drawers[part.type];
    if (!gate && !fn) return;

    ctx.save();
    ctx.translate(part.x, part.y);
    if (o.scale !== undefined && o.scale < T.zoomLOD) drawLod(ctx, part, o);
    else if (gate) drawGate(ctx, o, gate);
    else fn(ctx, o);

    /* Beschriftung ueber dem Bauteil (A, B, Y ...).
       o.caption kommt aus der Wahrheitstabelle und hat Vorrang vor dem
       mitgelieferten Label: Nur so steht ueber dem Schalter derselbe Name
       wie in der Spalte darueber – auch bei selbst gesetzten Bauteilen, die
       gar kein Label haben, und bei doppelt vergebenen Namen (A1, A2).
       Weit herausgezoomt weggelassen, sonst wird es unleserlich. */
    /* Ein leerer caption ist etwas anderes als gar keiner: Er heisst
       "dieses Bauteil steht gerade nicht in der Tabelle" und unterdrueckt
       auch das eigene Label. */
    var name = (o.caption === undefined || o.caption === null) ? part.label : o.caption;
    if (name && (o.scale === undefined || o.scale >= T.zoomLOD)) {
      var d = P.get(part.type);
      text(ctx, name, (d ? d.w : 64) / 2, -10, 13,
           o.value === 1 ? T.signal : T.label);
    }
    ctx.restore();
  }

  C.render.drawParts = { draw: draw, fontUI: fontUI, fontMono: fontMono, grads: grads };

})(window.CIRCUIT = window.CIRCUIT || {});
