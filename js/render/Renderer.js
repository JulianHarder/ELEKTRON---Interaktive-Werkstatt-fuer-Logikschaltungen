/* Frame-Schleife und Canvas-Verwaltung.

   Gezeichnet wird nur, wenn sich etwas geaendert hat (Dirty-Flag), die Kamera
   noch nachgleitet oder eine Animation laeuft. Die Schleife selbst laeuft
   durchgehend, kostet ohne Zeichnen aber praktisch nichts. */
(function (C) {
  'use strict';

  var grid = C.render.grid;

  function Renderer(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = camera;

    this.cssW = 0;
    this.cssH = 0;
    this.dpr = 1;

    this.dirty = true;
    this.animate = false;      /* true = jeder Frame wird gezeichnet (Impulse, Takt) */
    this.time = 0;             /* Sekunden seit Start, fuer Animationen */
    this.showGrid = true;

    this.onDraw = null;        /* function (ctx, info) – zeichnet die Szene in Weltkoordinaten */
    this.onResize = null;

    this._raf = 0;
    this._last = 0;
    this._frames = 0;
    this._fpsTime = 0;
    this.fps = 0;

    this.resize();
    this._bindResize();
  }

  Renderer.prototype._bindResize = function () {
    var self = this;
    var handler = function () { self.resize(); };
    window.addEventListener('resize', handler);
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(handler);
      this._ro.observe(this.canvas.parentNode || this.canvas);
    }
    /* Fenster auf einen anderen Bildschirm ziehen aendert devicePixelRatio. */
    if (window.matchMedia) {
      var mq = window.matchMedia('(resolution: 1dppx)');
      if (mq.addEventListener) mq.addEventListener('change', handler);
    }
  };

  Renderer.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    var dpr = window.devicePixelRatio || 1;

    if (w === this.cssW && h === this.cssH && dpr === this.dpr) return;

    this.cssW = w; this.cssH = h; this.dpr = dpr;
    this.canvas.width  = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);

    this.cam.setDpr(dpr);
    grid.invalidate();
    this.dirty = true;
    if (this.onResize) this.onResize(w, h);
  };

  Renderer.prototype.markDirty = function () { this.dirty = true; };

  Renderer.prototype.start = function () {
    if (this._raf) return;
    var self = this;
    this._last = performance.now();
    var loop = function (now) {
      self._raf = requestAnimationFrame(loop);
      self._tick(now);
    };
    this._raf = requestAnimationFrame(loop);
  };

  Renderer.prototype.stop = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  };

  Renderer.prototype._tick = function (now) {
    var dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this.time += dt;

    var moving = this.cam.update(dt);
    if (!this.dirty && !moving && !this.animate) return;

    this.dirty = false;
    this._draw(dt);

    /* FPS nur zur Entwicklungshilfe */
    this._frames++;
    this._fpsTime += dt;
    if (this._fpsTime >= 0.5) {
      this.fps = Math.round(this._frames / this._fpsTime);
      this._frames = 0; this._fpsTime = 0;
    }
  };

  Renderer.prototype._draw = function (dt) {
    var ctx = this.ctx;
    var wDev = this.canvas.width, hDev = this.canvas.height;

    /* 1. Hintergrund und Raster – in Geraetepixeln, damit das Muster scharf bleibt. */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.render.theme.bg;
    ctx.fillRect(0, 0, wDev, hDev);
    if (this.showGrid) grid.draw(ctx, this.cam, wDev, hDev);

    /* 2. Szene – in Weltkoordinaten. */
    if (this.onDraw) {
      this.cam.apply(ctx);
      this.onDraw(ctx, {
        time: this.time,
        dt: dt,
        scale: this.cam.scale,
        view: this.cam.visibleRect(this.cssW, this.cssH, 64),
        cssW: this.cssW,
        cssH: this.cssH
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  };

  C.render.Renderer = Renderer;

})(window.CIRCUIT = window.CIRCUIT || {});
