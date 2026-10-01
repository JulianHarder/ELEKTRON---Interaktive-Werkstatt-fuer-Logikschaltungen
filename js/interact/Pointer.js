/* Vereinheitlicht Maus, Touch und Stift zu einem einzigen Ereignisstrom.
   Meldet 'down', 'move', 'up', 'cancel', 'wheel' und 'dblclick' mit
   Bildschirm- UND Weltkoordinaten. */
(function (C) {
  'use strict';

  var Emitter = C.util.Emitter;

  function Pointer(el, cam) {
    Emitter.call(this);
    this.el = el;
    this.cam = cam;
    this.active = {};       /* id -> letzter Zustand, fuer Mehrfinger-Gesten */
    this.count = 0;
    this._bind();
  }
  Pointer.prototype = Object.create(Emitter.prototype);
  Pointer.prototype.constructor = Pointer;

  Pointer.prototype._norm = function (e) {
    var r = this.el.getBoundingClientRect();
    var sx = e.clientX - r.left;
    var sy = e.clientY - r.top;
    var w = this.cam.screenToWorld(sx, sy);
    return {
      id: e.pointerId,
      x: sx, y: sy,
      wx: w.x, wy: w.y,
      button: e.button,
      buttons: e.buttons,
      shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey,
      type: e.pointerType || 'mouse',
      raw: e
    };
  };

  Pointer.prototype._bind = function () {
    var self = this;
    var el = this.el;

    el.addEventListener('pointerdown', function (e) {
      var p = self._norm(e);
      self.active[p.id] = p;
      self.count = Object.keys(self.active).length;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      self.emit('down', p);
    });

    el.addEventListener('pointermove', function (e) {
      var p = self._norm(e);
      var prev = self.active[p.id];
      if (prev) {
        p.dx = p.x - prev.x;
        p.dy = p.y - prev.y;
        self.active[p.id] = p;
      } else {
        p.dx = 0; p.dy = 0;
      }
      self.emit('move', p);
    });

    function end(e, name) {
      var p = self._norm(e);
      delete self.active[p.id];
      self.count = Object.keys(self.active).length;
      try { el.releasePointerCapture(e.pointerId); } catch (err) { /* egal */ }
      self.emit(name, p);
    }
    el.addEventListener('pointerup',     function (e) { end(e, 'up'); });
    el.addEventListener('pointercancel', function (e) { end(e, 'cancel'); });

    el.addEventListener('dblclick', function (e) { self.emit('dblclick', self._norm(e)); });

    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = self._norm(e);
      p.deltaX = e.deltaX;
      p.deltaY = e.deltaY;
      /* deltaMode 1 = Zeilen, 2 = Seiten – auf Pixel umrechnen.
         Eine Radrastung meldet in Chrome rund 100 px, in Firefox 3 Zeilen.
         Mit dem Faktor 33.3 kommt in beiden Browsern derselbe Wert an. */
      var f = e.deltaMode === 1 ? 33.3 : (e.deltaMode === 2 ? 400 : 1);
      p.deltaX *= f;
      p.deltaY *= f;
      self.emit('wheel', p);
    }, { passive: false });

    /* Eigenes Kontextmenue statt des Browsermenues. */
    el.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      self.emit('context', self._norm(e));
    });
  };

  /* Liste der aktuell aufliegenden Finger – fuer Pinch-Gesten. */
  Pointer.prototype.points = function () {
    var self = this;
    return Object.keys(this.active).map(function (k) { return self.active[k]; });
  };

  C.interact.Pointer = Pointer;

})(window.CIRCUIT = window.CIRCUIT || {});
