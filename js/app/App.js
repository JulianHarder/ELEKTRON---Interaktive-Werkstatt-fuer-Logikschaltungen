/* Verbindet Canvas, Kamera, Eingabe, Modell und Oberflaeche.

   Die App selbst enthaelt keine Logik zum Bauen – sie stellt nur die Teile
   zusammen und reicht Ereignisse weiter. Was beim Klicken passiert, steht in
   interact/, was gezeichnet wird in app/drawScene.js. */
(function (C) {
  'use strict';

  var D = C.util.dom;

  function App() {
    this.stage  = D.$('#stage');
    this.canvas = D.$('#stage-canvas');
    this.badge  = D.$('#zoom-badge');
    this.hintEl = D.$('#hintline');

    this.cam = new C.render.Camera();
    this.r   = new C.render.Renderer(this.canvas, this.cam);
    this.p   = new C.interact.Pointer(this.canvas, this.cam);
    this.nav = new C.interact.Navigate(this.p, this.cam, this.r, this.stage);

    this.circuit   = new C.model.Circuit();
    this.history   = new C.model.History(this.circuit);
    this.selection = new C.interact.Selection();
    this.sim       = new C.sim.Runner(this.circuit);

    /* Alles, was die Werkzeuge brauchen – ohne dass sie die App kennen. */
    var self = this;
    this.env = {
      circuit:   this.circuit,
      history:   this.history,
      selection: this.selection,
      sim: this.sim,
      cam: this.cam, r: this.r, nav: this.nav,
      hint:   function (text) { self.setHint(text); },
      disarm: function () { self.palette.arm(null); }
    };

    this.tools = new C.interact.Tools(this.env);
    this.keys  = new C.interact.Shortcuts(this.env, this.tools);

    this.palette = new C.ui.Palette(D.$('#palette'));
    this.menu    = new C.ui.MenuPanel();
    this.ctx     = new C.ui.ContextMenu();

    this.store = new C.app.Store();
    this.card  = new C.ui.TruthCard(D.$('#level-card'));
    this.ask   = new C.ui.AskDialog();
    this.tip   = new C.ui.Tooltip();
    this.bench = new C.app.Bench(this);

    this._bind();
  }

  App.prototype.start = function () {
    var self = this;

    this.r.onDraw = function (ctx, info) {
      C.app.drawScene.draw(ctx, info, self.env, self.tools);
    };
    this.reduced = D.reducedMotion();
    this.env.reduced = this.reduced;
    this.r.start();

    this.sim.onUpdate = function () { self.onSimUpdate(); };
    this.sim.refresh();

    this.r.resize();
    this.cam.setScale(1);
    this.cam.snapToTarget();
    this.cam.centerOn(this.circuit.bounds(), this.r.cssW, this.r.cssH);

    this.updateBadge();
    this.updateHistoryButtons();
    this.updateCursor();
    this.setHint(null);

    /* Dort weitermachen, wo zuletzt aufgehoert wurde. Beim allerersten Start
       ist die Flaeche leer – Vorlagen holt man sich selbst aus dem Menue,
       statt in etwas hineingeworfen zu werden. */
    if (!this.bench.restore()) this.onBenchChange(null);
  };

  App.prototype._bind = function () {
    var self = this;

    this.nav.onZoom = function () { self.updateBadge(); };
    this.nav.canPanFrom = function (ev) { return self.tools.allowsPan(ev); };
    this.nav.onPanChange = function () { self.updateCursor(); };

    this.p.on('down',   function (ev) {
      self.tools.onDown(ev); self.updateCursor(); self.tip.hide();
    });
    this.p.on('move',   function (ev) {
      self.tools.onMove(ev); self.updateCursor(); self.updateTooltip(ev);
    });
    this.p.on('up',     function (ev) { self.tools.onUp(ev);   self.updateCursor(); });
    this.p.on('cancel', function ()   { self.tools.onCancel(); self.updateCursor(); });

    /* Maus raus aus der Flaeche: der Tooltip hat nichts mehr zu erklaeren. */
    this.canvas.addEventListener('pointerleave', function () { self.tip.hide(); });
    this.p.on('context', function (ev) { self.openContextMenu(ev); });

    this.palette.onPick = function (type) { self.tools.arm(type); };
    this.palette.onHover = function (type, x, y) { self.tip.showNow(type, x, y); };
    this.palette.onLeave = function () { self.tip.hide(); };
    this.palette.onDrop = function (type, cx, cy) { self.dropFromPalette(type, cx, cy); };
    this.palette.onDragMove = function (type, cx, cy) { self.ghostFromPalette(type, cx, cy); };

    this.history.onChange = function (h, edit) {
      /* Nur eine geaenderte Verdrahtung braucht eine neue Netzliste.
         Verschieben und Schalten aendern nur Werte. */
      if (!edit || edit.changesStructure()) self.sim.invalidate();
      self.sim.refresh();
      self.updateHistoryButtons();
      self.bench.saveCurrent();
    };

    this.bench.onChange      = function (tpl) { self.onBenchChange(tpl); };
    this.menu.onPickTemplate = function (id) { self.pickTemplate(id); };
    this.menu.onClear        = function () { self.wipe(); };
    /* Die Auswahl steuert mit, welche Spalten in der Tabelle stehen –
       deshalb muss die Karte bei jeder Aenderung mitziehen. */
    this.selection.onChange  = function () {
      /* Die Auswahl steuert mit, welche Spalten in der Tabelle stehen – und
         damit auch, welche Namen auf der Flaeche erscheinen und ob eine
         Begruendung angezeigt wird. Das muss vor updateHistoryButtons()
         laufen: Die endet mit updateHint(), und der Hinweis haengt an
         env.why. */
      self.afterSim();
      self.updateAnimate();
      self.updateHistoryButtons();
      self.r.markDirty();
    };

    bind('#btn-zoom-in',  function () { self.nav.zoomBy(1.25); });
    bind('#btn-zoom-out', function () { self.nav.zoomBy(1 / 1.25); });
    bind('#btn-fit',      function () { self.fit(); });
    bind('#btn-undo',     function () { self.keys.undo(); });
    bind('#btn-redo',     function () { self.keys.redo(); });
    bind('#btn-delete',   function () { self.keys.del(); });
    bind('#btn-wipe',     function () { self.wipe(); });
    bind('#btn-live',     function () { self.setSimMode('live'); });
    bind('#btn-slow',     function () { self.setSimMode('slow'); });
    bind('#btn-step',     function () { self.setSimMode('step'); self.sim.step(); });
    bind('#btn-menu',     function (b) {
      self.menu.currentId = self.bench.template ? self.bench.template.id : null;
      self.menu.toggle(b);
    });
    bind('#btn-grid',     function (b) {
      self.r.showGrid = !self.r.showGrid;
      D.toggleClass(b, 'is-active', self.r.showGrid);
      self.r.markDirty();
    });

    function bind(sel, fn) {
      var node = D.$(sel);
      if (node) node.addEventListener('click', function () { fn(node); });
    }
  };

  /* Baustein aus der Leiste fallen lassen (Koordinaten des Zeigers im Fenster). */
  App.prototype.dropFromPalette = function (type, clientX, clientY) {
    var w = this.toWorld(clientX, clientY);
    if (w) {
      this.tools.armedType = type;
      C.interact.toolPlace.place(this.tools, w.x, w.y);
    }
    this.palette.arm(null);         /* setzt armedType und Schatten zurueck */
  };

  /* Schatten mitfuehren, solange ein Baustein aus der Leiste gezogen wird. */
  App.prototype.ghostFromPalette = function (type, clientX, clientY) {
    var w = this.toWorld(clientX, clientY);
    this.tools.armedType = type;
    this.tools.ghost = w ? C.interact.toolPlace.snapped(type, w.x, w.y) : null;
    this.r.markDirty();
  };

  /* Fensterkoordinaten in Weltkoordinaten – null, wenn ausserhalb der Flaeche. */
  App.prototype.toWorld = function (clientX, clientY) {
    var rect = this.canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right ||
        clientY < rect.top  || clientY > rect.bottom) return null;
    return this.cam.screenToWorld(clientX - rect.left, clientY - rect.top);
  };

  /* --- Kontextmenue (Rechtsklick auf die Flaeche) --- */

  App.prototype.openContextMenu = function (ev) {
    var self = this;
    var keys = this.keys;
    var sel  = this.selection;

    this.tools.escape();                       /* laufendes Werkzeug abbrechen */

    /* Was unter dem Zeiger liegt, kommt in die Auswahl – sonst loescht das
       Menue etwas anderes, als man angeklickt hat. */
    var part = C.render.hit.part(this.circuit, ev.wx, ev.wy);
    var wire = part ? null : C.render.hit.wire(this.circuit, ev.wx, ev.wy);
    if (part && !sel.hasPart(part.id)) sel.set([part.id], []);
    else if (wire && !sel.hasWire(wire.id)) sel.set([], [wire.id]);
    else if (!part && !wire) sel.clear();

    var n = sel.count();
    var items = [
      { label: n > 1 ? n + ' Teile löschen' : 'Löschen', icon: 'trash',
        disabled: n === 0, action: function () { keys.del(); } },
      { label: 'Kopieren', icon: 'copy',
        disabled: sel.partIds().length === 0, action: function () { keys.copy(); } },
      { label: 'Einfügen', icon: 'paste',
        disabled: !keys.clipboard, action: function () { keys.paste(); } },
      null,
      { label: 'Alles auswählen', icon: 'select',
        disabled: this.circuit.isEmpty(),
        action: function () { sel.selectAll(self.circuit); self.r.markDirty(); } }
    ];

    this.r.markDirty();
    this.ctx.open(ev.raw.clientX, ev.raw.clientY, items);
  };

  /* Ansicht einpassen. Die Karte liegt ueber der Flaeche – ohne sie
     herauszurechnen verschwaenden die rechten Bauteile darunter. */
  App.prototype.fit = function () {
    var b = this.circuit.bounds();
    var pad = 80;
    var w = Math.max(240, this.r.cssW - this.rightInset());

    var sx = w / (b.w + pad * 2);
    var sy = this.r.cssH / (b.h + pad * 2);
    this.cam.setScale(Math.min(sx, sy, 2));
    this.cam.snapToTarget();
    /* Mit der verkleinerten Breite zentriert centerOn im freien Teil. */
    this.cam.centerOn(b, w, this.r.cssH);
    this.r.markDirty();
    this.updateBadge();
  };

  App.prototype.rightInset = function () {
    var card = D.$('#level-card');
    if (!card || card.hidden) return 0;
    return card.offsetWidth + 24;
  };

  /* --- Simulation --- */

  App.prototype.setSimMode = function (mode) {
    this.sim.setMode(mode);
    D.toggleClass(D.$('#btn-live'), 'is-active', mode === 'live');
    D.toggleClass(D.$('#btn-slow'), 'is-active', mode === 'slow');
    D.toggleClass(D.$('#btn-step'), 'is-active', mode === 'step');
    this.updateHint();
  };

  /* Die Simulation hat gerechnet: neu zeichnen und die Leiste nachfuehren. */
  App.prototype.onSimUpdate = function () {
    var tick = D.$('#tickcount');
    if (tick) tick.textContent = this.sim.ticks();

    this.afterSim();
    this.updateAnimate();          /* nach afterSim: das setzt env.why */
    this.updateHint();
    this.r.markDirty();
  };

  /* Dauerhaft zeichnen lohnt nur, wenn sich auch etwas bewegt – die
     Lichtimpulse brauchen jeden Frame, ein dunkles Bild nicht.

     Eine angezeigte Begruendung zaehlt mit: Ihr Saum wandert, auch wenn
     nirgends eine 1 anliegt. Ohne das stuende er still und saehe aus wie
     eine gestrichelte Linie statt wie eine Richtung. */
  App.prototype.updateAnimate = function () {
    this.r.animate = !this.reduced && (this.sim.anyHigh() || !!this.env.why);
  };

  /* --- Oberflaeche nachfuehren --- */

  App.prototype.updateBadge = function () {
    if (this.badge) this.badge.textContent = Math.round(this.cam.targetScale * 100) + ' %';
  };

  App.prototype.updateHistoryButtons = function () {
    var h = this.history;
    setEnabled('#btn-undo',   h.canUndo(), 'Rückgängig',  h.undoLabel());
    setEnabled('#btn-redo',   h.canRedo(), 'Wiederholen', h.redoLabel());
    setEnabled('#btn-delete', !this.selection.isEmpty(), 'Löschen', '');
    setEnabled('#btn-wipe', !this.circuit.isEmpty(), 'Fläche leeren', '');
    this.updateHint();
  };

  function setEnabled(sel, on, base, label) {
    var node = D.$(sel);
    if (!node) return;
    node.disabled = !on;
    node.title = on && label ? base + ': ' + label : base;
  }

  /* Zeigt an, was ein Klick hier bewirkt. */
  App.prototype.updateCursor = function () {
    var t = this.tools;
    var c = null;
    if (this.nav.panning)                 c = 'grabbing';
    else if (t.armedType)                 c = 'copy';
    else if (t.connect || t.hover.pin)    c = 'crosshair';
    else if (t.drag)                      c = 'grabbing';
    else if (this.nav.spaceDown)          c = 'grab';
    else if (t.hover.part)                c = t.hover.part.type === 'switch' ? 'pointer' : 'move';
    else if (t.hover.wire)                c = 'pointer';
    else                                  c = 'grab';
    if (this.canvas.style.cursor !== c) this.canvas.style.cursor = c;
  };

  C.app.App = App;

})(window.CIRCUIT = window.CIRCUIT || {});
