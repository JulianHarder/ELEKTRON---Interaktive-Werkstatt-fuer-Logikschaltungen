/* Ansicht bewegen: Verschieben durch Ziehen mit der linken Maustaste auf
   freier Flaeche (zusaetzlich Leertaste, mittlere Taste, Zwei-Finger) und
   Zoomen (Mausrad, Pinch) – immer zum Mauszeiger hin.

   Was "freie Flaeche" ist, weiss nur die Anwendung. Sie haengt sich dafuer in
   canPanFrom ein; Navigate selbst kennt das Modell bewusst nicht. */
(function (C) {
  'use strict';

  var math = C.util.math;

  function Navigate(pointer, cam, renderer, stageEl) {
    this.p = pointer;
    this.cam = cam;
    this.r = renderer;
    this.stage = stageEl;

    this.spaceDown = false;
    this.panning = false;
    this.didPan = false;      /* wurde seit dem Druecken wirklich verschoben? */
    this._pinch = null;

    /* Rueckfrage an die Anwendung: darf hier mit links gezogen werden?
       Ohne Antwort ist die ganze Flaeche frei. */
    this.canPanFrom = null;
    this.onPanChange = null;

    this._bind();
  }

  /* Mindestweg in Pixeln, ab dem aus einem Klick ein Ziehen wird. So loest ein
     leichtes Zittern beim Klicken noch keine Verschiebung aus. */
  var PAN_SLOP = 3;

  Navigate.prototype.wantsPan = function (ev) {
    if (ev.button === 1) return true;                    /* mittlere Taste */
    if (ev.button !== 0) return false;
    if (this.spaceDown || ev.alt) return true;           /* Leertaste oder Alt */
    /* Linke Taste auf freier Flaeche verschiebt. */
    return this.canPanFrom ? !!this.canPanFrom(ev) : true;
  };

  Navigate.prototype._bind = function () {
    var self = this;
    var cam = this.cam, r = this.r;

    this.p.on('down', function (ev) {
      self.didPan = false;
      if (self.p.count === 2) { self._startPinch(); return; }
      if (!self.wantsPan(ev)) return;
      self.panning = true;
      self._slop = 0;
      self.stage.classList.add('is-panning');
      if (self.onPanChange) self.onPanChange(true);
      ev.raw.preventDefault();
    });

    this.p.on('move', function (ev) {
      if (self._pinch && self.p.count === 2) { self._updatePinch(); return; }
      if (!self.panning) return;

      var dx = ev.dx || 0, dy = ev.dy || 0;

      /* Erst ab PAN_SLOP gilt es als Ziehen – vorher bleibt es ein Klick. */
      if (!self.didPan) {
        self._slop += Math.abs(dx) + Math.abs(dy);
        if (self._slop < PAN_SLOP) return;
        self.didPan = true;
      }

      cam.panByScreen(dx, dy);
      r.markDirty();
    });

    function stop() {
      var was = self.panning;
      self.panning = false;
      self._pinch = null;
      self.stage.classList.remove('is-panning');
      if (was && self.onPanChange) self.onPanChange(false);
    }
    this.p.on('up', stop);
    this.p.on('cancel', stop);

    this.p.on('wheel', function (ev) {
      /* Umschalt + Rad verschiebt waagerecht, alles andere zoomt. */
      if (ev.shift && !ev.ctrl) {
        cam.panByScreen(-ev.deltaY, 0);
      } else {
        /* Eine Radrastung (~100) ergibt rund 13 % Zoom – klein genug, dass es
           sich fein anfuehlt, gross genug, dass man vorankommt. */
        var step = math.clamp(-ev.deltaY, -200, 200);
        cam.zoomAt(ev.x, ev.y, Math.exp(step * 0.0012));
      }
      r.markDirty();
      if (self.onZoom) self.onZoom(cam);
    });

    /* Leertaste haelt den Verschiebemodus. */
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && !isTyping(e.target)) {
        if (!self.spaceDown) {
          self.spaceDown = true;
          if (self.onPanChange) self.onPanChange(false);
        }
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', function (e) {
      if (e.code === 'Space') {
        self.spaceDown = false;
        if (self.onPanChange) self.onPanChange(false);
      }
    });
    window.addEventListener('blur', function () {
      self.spaceDown = false;
      stop();
      if (self.onPanChange) self.onPanChange(false);
    });
  };

  function isTyping(el) {
    if (!el) return false;
    var t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || el.isContentEditable;
  }

  /* --- Pinch --- */
  Navigate.prototype._startPinch = function () {
    var pts = this.p.points();
    if (pts.length < 2) return;
    this._pinch = {
      dist: gap(pts[0], pts[1]),
      cx: (pts[0].x + pts[1].x) / 2,
      cy: (pts[0].y + pts[1].y) / 2
    };
    this.panning = false;
  };

  Navigate.prototype._updatePinch = function () {
    var pts = this.p.points();
    if (pts.length < 2 || !this._pinch) return;

    var d  = gap(pts[0], pts[1]);
    var cx = (pts[0].x + pts[1].x) / 2;
    var cy = (pts[0].y + pts[1].y) / 2;

    this.cam.panByScreen(cx - this._pinch.cx, cy - this._pinch.cy);
    if (this._pinch.dist > 4) this.cam.zoomAt(cx, cy, d / this._pinch.dist);

    this._pinch = { dist: d, cx: cx, cy: cy };
    this.r.markDirty();
    if (this.onZoom) this.onZoom(this.cam);
  };

  function gap(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

  /* Zoomstufen fuer Tastatur und Buttons. */
  Navigate.prototype.zoomBy = function (factor) {
    this.cam.zoomAt(this.r.cssW / 2, this.r.cssH / 2, factor);
    this.r.markDirty();
    if (this.onZoom) this.onZoom(this.cam);
  };

  Navigate.prototype.resetZoom = function () {
    var before = this.cam.targetScale;
    this.zoomBy(1 / before);
  };

  C.interact.Navigate = Navigate;

})(window.CIRCUIT = window.CIRCUIT || {});
