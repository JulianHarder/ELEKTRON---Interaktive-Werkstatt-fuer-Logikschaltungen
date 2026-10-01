/* Sprite-Cache: alles Teure wird einmal in einen Offscreen-Canvas gezeichnet
   und danach nur noch kopiert. So entstehen Schatten und Glows ohne
   shadowBlur pro Frame (das waere um ein Vielfaches langsamer). */
(function (C) {
  'use strict';

  var T = C.render.theme;

  var cache = {};
  var order = [];
  var LIMIT = 160;   /* mehr als so viele Sprites braucht keine Ansicht gleichzeitig */

  function remember(key, canvas) {
    cache[key] = canvas;
    order.push(key);
    while (order.length > LIMIT) {
      var old = order.shift();
      if (old !== key) delete cache[old];
    }
    return canvas;
  }

  /* Holt ein Sprite aus dem Cache oder erzeugt es.
     drawFn(g, wDev, hDev) zeichnet in Geraetepixeln. */
  function get(key, wDev, hDev, drawFn) {
    var hit = cache[key];
    if (hit) return hit;

    var w = Math.max(1, Math.ceil(wDev));
    var h = Math.max(1, Math.ceil(hDev));
    var cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    drawFn(cv.getContext('2d'), w, h);
    return remember(key, cv);
  }

  /* Weicher runder Schein – Grundlage fuer LED-Leuchten und Signal-Halos. */
  function radialGlow(rDev, rgb, alpha) {
    var r = Math.max(2, Math.ceil(rDev));
    var key = 'glow|' + r + '|' + rgb + '|' + alpha;
    return get(key, r * 2, r * 2, function (g, w) {
      var c = w / 2;
      var grad = g.createRadialGradient(c, c, 0, c, c, c);
      grad.addColorStop(0.00, 'rgba(' + rgb + ',' + alpha + ')');
      grad.addColorStop(0.35, 'rgba(' + rgb + ',' + (alpha * 0.55) + ')');
      grad.addColorStop(0.70, 'rgba(' + rgb + ',' + (alpha * 0.16) + ')');
      grad.addColorStop(1.00, 'rgba(' + rgb + ',0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, w);
    });
  }

  /* Zeichnet einen Schein mittig auf (x,y) – Angaben in Geraetepixeln. */
  function drawGlow(ctx, x, y, rDev, alpha, rgb) {
    var sprite = radialGlow(rDev, rgb || T.glowRGB, alpha === undefined ? 0.85 : alpha);
    ctx.drawImage(sprite, x - sprite.width / 2, y - sprite.height / 2);
  }

  /* Weicher Schlagschatten unter einem abgerundeten Rechteck. */
  function boxShadow(wDev, hDev, radiusDev, blurDev, alpha) {
    var pad = Math.ceil(blurDev) + 2;
    var key = 'shadow|' + Math.round(wDev) + '|' + Math.round(hDev) + '|' +
              Math.round(radiusDev) + '|' + Math.round(blurDev) + '|' + alpha;
    return get(key, wDev + pad * 2, hDev + pad * 2, function (g, w, h) {
      g.filter = 'blur(' + (blurDev / 2) + 'px)';
      g.fillStyle = 'rgba(0,0,0,' + alpha + ')';
      roundRect(g, pad, pad, w - pad * 2, h - pad * 2, radiusDev);
      g.fill();
      g.filter = 'none';
    });
  }

  function roundRect(g, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.lineTo(x + w - rr, y);
    g.arcTo(x + w, y, x + w, y + rr, rr);
    g.lineTo(x + w, y + h - rr);
    g.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    g.lineTo(x + rr, y + h);
    g.arcTo(x, y + h, x, y + h - rr, rr);
    g.lineTo(x, y + rr);
    g.arcTo(x, y, x + rr, y, rr);
    g.closePath();
  }


  /* Kann der Browser Canvas-Filter? Ohne sie gibt es keine weichen Schatten. */
  var canFilter = (function () {
    try {
      var g = document.createElement('canvas').getContext('2d');
      g.filter = 'blur(2px)';
      return g.filter === 'blur(2px)';
    } catch (e) { return false; }
  })();

  /* Weicher Schatten aus einem beliebigen Pfad.
     Das Sprite wird in doppelter Aufloesung gebaut und beim Zeichnen
     wieder halbiert – dadurch bleibt es bei jedem Zoom brauchbar. */
  var OS = 2;
  function pathShadow(key, path, wWorld, hWorld, blurWorld, alpha) {
    var pad = Math.ceil((blurWorld + 3) * OS);
    var full = key + '|' + Math.round(wWorld) + 'x' + Math.round(hWorld) +
               '|' + blurWorld + '|' + alpha;
    return get(full, wWorld * OS + pad * 2, hWorld * OS + pad * 2, function (g) {
      if (canFilter) g.filter = 'blur(' + (blurWorld * OS / 2) + 'px)';
      g.translate(pad, pad);
      g.scale(OS, OS);
      g.fillStyle = 'rgba(0,0,0,' + alpha + ')';
      g.fill(path);
      g.filter = 'none';
    });
  }

  /* Zeichnet ein mit pathShadow erzeugtes Sprite in Weltkoordinaten. */
  function drawPathShadow(ctx, sprite, wWorld, hWorld, blurWorld, dx, dy) {
    var pad = Math.ceil((blurWorld + 3) * OS) / OS;
    ctx.drawImage(sprite,
      -pad + (dx || 0), -pad + (dy || 0),
      sprite.width / OS, sprite.height / OS);
  }

  function clear() { cache = {}; order = []; }

  C.render.sprites = {
    get: get,
    radialGlow: radialGlow,
    drawGlow: drawGlow,
    boxShadow: boxShadow,
    pathShadow: pathShadow,
    drawPathShadow: drawPathShadow,
    canFilter: canFilter,
    OS: OS,
    roundRect: roundRect,
    clear: clear
  };

})(window.CIRCUIT = window.CIRCUIT || {});
