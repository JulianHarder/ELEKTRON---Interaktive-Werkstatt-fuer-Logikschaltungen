/* Kleine Mathe-Helfer. Absichtlich ohne Abhängigkeiten. */
(function (C) {
  'use strict';

  var M = {};

  M.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

  M.lerp = function (a, b, t) { return a + (b - a) * t; };

  /* Rundet auf ein Raster, z. B. snap(37, 16) -> 32. */
  M.snap = function (v, step) { return Math.round(v / step) * step; };

  M.dist2 = function (ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    return dx * dx + dy * dy;
  };

  /* Liegt der Punkt im Rechteck? (Rechteck als {x,y,w,h}) */
  M.inRect = function (px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  };

  /* Überschneiden sich zwei Rechtecke? Für Culling und Rahmenauswahl. */
  M.rectsOverlap = function (a, b) {
    return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y);
  };

  /* Kürzester Abstand eines Punkts zu einer Strecke – für Treffertests auf Leitungen. */
  M.distToSegment = function (px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var len2 = dx * dx + dy * dy;
    var t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
    t = M.clamp(t, 0, 1);
    var cx = ax + t * dx, cy = ay + t * dy;
    return Math.sqrt(M.dist2(px, py, cx, cy));
  };

  C.util.math = M;

})(window.CIRCUIT = window.CIRCUIT || {});
