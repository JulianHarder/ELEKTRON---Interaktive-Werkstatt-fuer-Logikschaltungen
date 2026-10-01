/* Treffertests: Was liegt an dieser Weltposition?

   Pins bekommen eine deutlich groessere Trefferflaeche als sie optisch haben
   (theme.pinHit), damit Verbinden auch mit der Maus in Eile und auf dem
   Tablet gelingt. Die Reihenfolge der Abfrage ist absichtlich Pin -> Bauteil
   -> Leitung: der Pin ist die feinere Absicht und gewinnt. */
(function (C) {
  'use strict';

  var T    = C.render.theme;
  var P    = C.model.parts;
  var math = C.util.math;
  var R    = C.render.routes;

  /* Naechstgelegener Pin innerhalb des Trefferradius, oder null.
     Liefert { part, kind, index, x, y }. */
  function pin(circuit, wx, wy, radius) {
    var rad = radius === undefined ? T.pinHit : radius;
    var state = { best: null, d2: rad * rad, wx: wx, wy: wy };

    for (var i = circuit.parts.length - 1; i >= 0; i--) {
      var p = circuit.parts[i];
      var def = P.get(p.type);
      if (!def) continue;
      nearest(state, p, def.ins,  'in');
      nearest(state, p, def.outs, 'out');
    }
    return state.best;
  }

  /* Prueft eine Pin-Liste und merkt sich den bisher naechsten Treffer. */
  function nearest(state, part, list, kind) {
    for (var j = 0; j < list.length; j++) {
      var px = part.x + list[j].x;
      var py = part.y + list[j].y;
      var d2 = math.dist2(state.wx, state.wy, px, py);
      if (d2 <= state.d2) {
        state.d2 = d2;
        state.best = { part: part.id, kind: kind, index: j, x: px, y: py };
      }
    }
  }

  /* Oberstes Bauteil unter dem Punkt. Spaeter Platziertes liegt oben. */
  function part(circuit, wx, wy) {
    for (var i = circuit.parts.length - 1; i >= 0; i--) {
      if (math.inRect(wx, wy, P.bounds(circuit.parts[i]))) return circuit.parts[i];
    }
    return null;
  }

  /* Leitung unter dem Punkt – Abstand zur Polylinie. */
  function wire(circuit, wx, wy, tol) {
    var t = tol === undefined ? 7 : tol;
    var best = null, bestD = t;

    /* Grobfilter ueber das umschliessende Rechteck: der genaue Abstand zu
       jedem Segment lohnt nur fuer Leitungen, die ueberhaupt in Frage kommen. */
    var box = { x: wx - t, y: wy - t, w: t * 2, h: t * 2 };

    for (var i = circuit.wires.length - 1; i >= 0; i--) {
      var w = circuit.wires[i];
      var rough = R.roughBounds(circuit, w);
      if (!rough || !math.rectsOverlap(box, rough)) continue;

      var pts = R.points(circuit, w);
      if (!pts || !math.rectsOverlap(box, R.boundsOf(pts))) continue;
      var d = distToPolyline(wx, wy, pts);
      if (d < bestD) { bestD = d; best = w; }
    }
    return best;
  }

  function distToPolyline(px, py, pts) {
    var best = Infinity;
    for (var i = 1; i < pts.length; i++) {
      var d = math.distToSegment(px, py, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      if (d < best) best = d;
    }
    return best;
  }

  /* Alle Bauteile, die ein Rechteck beruehren – fuer den Auswahlrahmen. */
  function partsInRect(circuit, rect) {
    return circuit.parts.filter(function (p) {
      return math.rectsOverlap(rect, P.bounds(p));
    });
  }

  /* Leitungen, deren beide Enden im Rechteck liegen. So zieht ein Rahmen
     nicht versehentlich Leitungen mit, die nur durchlaufen. */
  function wiresInRect(circuit, rect, partIdSet) {
    return circuit.wires.filter(function (w) {
      return partIdSet[w.from.part] && partIdSet[w.to.part];
    });
  }

  /* Aus zwei Eckpunkten ein normalisiertes Rechteck machen. */
  function rectFrom(x0, y0, x1, y1) {
    return {
      x: Math.min(x0, x1), y: Math.min(y0, y1),
      w: Math.abs(x1 - x0), h: Math.abs(y1 - y0)
    };
  }

  C.render.hit = {
    pin: pin, part: part, wire: wire,
    partsInRect: partsInRect, wiresInRect: wiresInRect, rectFrom: rectFrom,
    distToPolyline: distToPolyline
  };

})(window.CIRCUIT = window.CIRCUIT || {});
