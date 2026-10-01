/* Punktraster als gecachtes Muster.

   Eine Kachel enthält 5x5 Rasterzellen; der Punkt links oben ist der hellere
   "grosse" Punkt. Massgeblich ist die ganzzahlige Kachelbreite – genau darauf
   rastet auch die Kamera ein. Dadurch wiederholt sich das Muster exakt im
   Weltraster und laeuft nicht gegen die Bauteile davon. Die einzelne Zelle darf
   dabei gebrochen sein; die Punkte selbst setzen wir auf ganze Pixel. */
(function (C) {
  'use strict';

  var T = C.render.theme;

  var cache = { key: '', pattern: null, tile: 0 };

  function buildTile(tileDev, dpr) {
    var major = T.gridMajor;
    var cell = tileDev / major;          /* darf gebrochen sein */

    var cv = document.createElement('canvas');
    cv.width = tileDev;
    cv.height = tileDev;
    var g = cv.getContext('2d');

    var rSmall = Math.max(0.6, 1.0 * dpr) * 0.5 + (cell > 22 ? 0.35 : 0);
    var rBig   = rSmall + Math.max(0.5, 0.45 * dpr);

    /* Kleine Punkte: alle Zellen ausser der Ecke links oben. */
    g.fillStyle = T.gridDot;
    for (var iy = 0; iy < major; iy++) {
      for (var ix = 0; ix < major; ix++) {
        if (ix === 0 && iy === 0) continue;
        dot(g, Math.round(ix * cell), Math.round(iy * cell), rSmall);
      }
    }
    /* Grosser Punkt in der Ecke – gibt dem Raster Struktur. */
    g.fillStyle = T.gridDotMaj;
    dot(g, 0, 0, rBig);

    return { canvas: cv, tile: tileDev };
  }

  function dot(g, x, y, r) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  /* Zeichnet das Raster in Geraetepixeln. Der Aufrufer setzt vorher
     ctx.setTransform(1,0,0,1,0,0). */
  function draw(ctx, cam, wDev, hDev) {
    /* Ganzzahlige Kachelbreite – dieselbe Groesse, auf die die Kamera einrastet. */
    var tileDev = Math.round(T.grid * T.gridMajor * cam.scale * cam.dpr);
    if (tileDev < 12) return;                    /* zu klein: Raster weglassen */

    /* Bei sehr kleinem Zoom nur noch die grossen Punkte zeigen. */
    var majorOnly = tileDev / T.gridMajor < 7;
    var key = tileDev + '|' + cam.dpr + '|' + (majorOnly ? 'maj' : 'all');

    if (cache.key !== key) {
      var built = majorOnly
        ? buildMajorOnly(tileDev, cam.dpr)
        : buildTile(tileDev, cam.dpr);
      cache.key = key;
      cache.pattern = ctx.createPattern(built.canvas, 'repeat');
      cache.tile = built.tile;
    }
    if (!cache.pattern) return;

    var ox = ((cam.txDev() % cache.tile) + cache.tile) % cache.tile;
    var oy = ((cam.tyDev() % cache.tile) + cache.tile) % cache.tile;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = cache.pattern;
    ctx.fillRect(-ox, -oy, wDev + cache.tile, hDev + cache.tile);
    ctx.restore();
  }

  /* Kachel mit nur einem Punkt – fuer stark herausgezoomte Ansichten. */
  function buildMajorOnly(step, dpr) {
    var cv = document.createElement('canvas');
    cv.width = step;
    cv.height = step;
    var g = cv.getContext('2d');
    g.fillStyle = T.gridDotMaj;
    dot(g, 0, 0, Math.max(0.6, 0.9 * dpr));
    return { canvas: cv, tile: step };
  }

  function invalidate() { cache.key = ''; cache.pattern = null; }

  C.render.grid = { draw: draw, invalidate: invalidate };

})(window.CIRCUIT = window.CIRCUIT || {});
