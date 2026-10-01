/* Bausteinleiste am linken Rand. Jeder Eintrag zeigt eine echte Miniatur
   des Bauteils, gezeichnet mit denselben Funktionen wie die Arbeitsflaeche. */
(function (C) {
  'use strict';

  var D = C.util.dom;
  var P = C.model.parts;
  var DP = C.render.drawParts;
  var PINS = C.render.drawPins;

  function Palette(host) {
    this.host = host;
    this.armed = null;          /* angeklickter Baustein, der als naechstes gesetzt wird */
    this.onPick = null;
    this.onHover = null;        /* (type, x, y) – die App zeigt den Tooltip */
    this.onLeave = null;
    this.chips = {};
    this.render();
  }

  Palette.prototype.render = function () {
    D.clear(this.host);

    /* NAND steht bewusst allein und zuerst: es ist das einzige echte
       Logikbauteil. Die Gatter darunter sind Kapseln daraus. */
    var groups = [
      { label: 'Ein- und Ausgabe', types: ['switch', 'led'] },
      { label: 'Grundbaustein',    types: ['nand'] },
      { label: 'Gatter aus NAND',  types: ['not', 'and', 'or', 'nor', 'xor', 'xnor'] },
      { label: 'Quellen',          types: ['const', 'clock'] }
    ];

    var self = this;
    groups.forEach(function (g) {
      var box = D.el('div', { class: 'palette-group' });
      box.appendChild(D.el('div', { class: 'palette-label', text: g.label }));
      g.types.forEach(function (t) { box.appendChild(self.chip(t)); });
      self.host.appendChild(box);
    });
  };

  Palette.prototype.chip = function (type) {
    var def = P.get(type);
    if (!def) return D.el('div');

    var self = this;
    var cv = document.createElement('canvas');
    /* Kurzer Text im Eintrag, die Einzelheit erst im Tooltip – so bleiben
       alle Eintraege gleich hoch und die Leiste ruhig. Bewusst ohne
       title-Attribut: den eigenen Tooltip zeigt die App, der kommt sofort
       und kann die Wahrheitstabelle mitzeigen. */
    var node = D.el('div', { class: 'part-chip', 'data-type': type }, [
      cv,
      D.el('div', { class: 'text' }, [
        D.el('div', { class: 'name', text: def.name }),
        D.el('div', { class: 'hint', text: def.hint })
      ])
    ]);

    /* Beim Ueberfahren erklaeren, was der Baustein tut. */
    node.addEventListener('pointerenter', function (e) {
      if (self.onHover) self.onHover(type, e.clientX, e.clientY);
    });
    node.addEventListener('pointermove', function (e) {
      if (self.onHover) self.onHover(type, e.clientX, e.clientY);
    });
    node.addEventListener('pointerleave', function () {
      if (self.onLeave) self.onLeave();
    });

    /* Klick bewaffnet den Baustein, Ziehen setzt ihn direkt ab. */
    node.addEventListener('pointerdown', function (e) { self.beginDrag(type, node, e); });
    node.addEventListener('click', function () {
      if (self._skipClick) { self._skipClick = false; return; }
      self.arm(type);
    });
    this.chips[type] = node;
    /* Zeichnen erst, wenn das Element im Dokument haengt (Groesse steht dann fest). */
    requestAnimationFrame(function () { preview(cv, type); });
    return node;
  };

  /* Baustein aus der Leiste auf die Flaeche ziehen.
     Bewusst ohne HTML5-Drag-and-Drop: das liefert bei file:// und auf
     Touch-Geraeten zu unterschiedliche Ergebnisse. Zeigerereignisse
     verhalten sich ueberall gleich. */
  Palette.prototype.beginDrag = function (type, node, e) {
    if (e.button !== 0) return;
    var self = this;
    var sx = e.clientX, sy = e.clientY;
    var dragging = false;

    try { node.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }

    function move(ev) {
      if (!dragging && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 6) {
        dragging = true;
        D.toggleClass(node, 'is-dragging', true);
      }
      if (dragging && self.onDragMove) self.onDragMove(type, ev.clientX, ev.clientY);
    }

    function up(ev) {
      cleanup();
      if (!dragging) return;              /* war nur ein Klick */
      self._skipClick = true;             /* sonst bewaffnet der Klick gleich wieder */
      if (self.onDrop) self.onDrop(type, ev.clientX, ev.clientY);
    }

    function cleanup() {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', cleanup);
      D.toggleClass(node, 'is-dragging', false);
      try { node.releasePointerCapture(e.pointerId); } catch (err) { /* egal */ }
    }

    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', cleanup);
  };

  Palette.prototype.arm = function (type) {
    var same = this.armed === type;
    this.armed = same ? null : type;
    var self = this;
    Object.keys(this.chips).forEach(function (t) {
      D.toggleClass(self.chips[t], 'is-armed', t === self.armed);
    });
    if (this.onPick) this.onPick(this.armed);
  };

  /* Miniatur eines Bauteils in einen kleinen Canvas zeichnen.
     Alle Bauteile sind senkrecht um y = 32 herum aufgebaut; 58 Welteinheiten
     Hoehe fassen das hoechste Symbol (NAND) vollstaendig. */
  var PREVIEW_H = 58;

  function preview(cv, type) {
    var def = P.get(type);
    if (!def) return;
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth || 64;
    var h = cv.clientHeight || 48;

    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    var ctx = cv.getContext('2d');

    var pad = 3;
    var s = Math.min((w - pad * 2) / (def.w + 10), (h - pad * 2) / PREVIEW_H);

    /* Weltpunkt (Mitte des Bauteils, y = 32) auf die Canvas-Mitte legen. */
    ctx.setTransform(s * dpr, 0, 0, s * dpr,
      dpr * (w / 2 - (def.w / 2) * s),
      dpr * (h / 2 - 32 * s));

    var part = { type: type, x: 0, y: 0 };
    var opts = { value: 0, scale: 1 };
    DP.draw(ctx, part, opts);
    PINS.drawAll(ctx, part, opts);
  }

  C.ui.Palette = Palette;

})(window.CIRCUIT = window.CIRCUIT || {});
