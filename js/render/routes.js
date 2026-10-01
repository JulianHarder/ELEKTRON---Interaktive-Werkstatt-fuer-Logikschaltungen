/* Wo laeuft eine Leitung entlang? Diese Frage stellen zwei Seiten: das
   Zeichnen und der Treffertest. Beide muessen dieselbe Antwort bekommen,
   sonst trifft man neben die Leitung, die man sieht. Deshalb steht die
   Geometrie hier an einer Stelle. */
(function (C) {
  'use strict';

  var P = C.model.parts;
  var W = C.render.drawWires;
  var T = C.render.theme;

  /* Weltposition eines Pins, angegeben als { part, kind, index }. */
  function pinPoint(circuit, ref) {
    var part = circuit.part(ref.part);
    if (!part) return null;
    return P.pinPos(part, ref.kind, ref.index);
  }

  /* Stuetzpunkte einer Leitung. */
  function points(circuit, wire) {
    var a = pinPoint(circuit, { part: wire.from.part, kind: 'out', index: wire.from.index });
    var b = pinPoint(circuit, { part: wire.to.part,   kind: 'in',  index: wire.to.index });
    if (!a || !b) return null;
    return W.route(a.x, a.y, b.x, b.y, wire.mid);
  }

  /* Verzweigungspunkte: ein Ausgang, von dem mehr als eine Leitung abgeht,
     bekommt einen kleinen Knoten. Liefert eine Liste von { x, y, partId }. */
  function junctions(circuit) {
    var out = [];
    circuit.branchPoints().forEach(function (ref) {
      var p = pinPoint(circuit, { part: ref.part, kind: 'out', index: ref.index });
      if (p) out.push({ x: p.x, y: p.y, partId: ref.part, index: ref.index });
    });
    return out;
  }

  /* Umschliessendes Rechteck einer Polylinie – fuer das Weglassen von
     Leitungen ausserhalb des Bildes. */
  function boundsOf(pts) {
    var x0 = pts[0].x, y0 = pts[0].y, x1 = x0, y1 = y0;
    for (var i = 1; i < pts.length; i++) {
      if (pts[i].x < x0) x0 = pts[i].x; else if (pts[i].x > x1) x1 = pts[i].x;
      if (pts[i].y < y0) y0 = pts[i].y; else if (pts[i].y > y1) y1 = pts[i].y;
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /* Grober Bereich einer Leitung, nur aus den beiden Endpunkten – ohne den
     Verlauf zu berechnen. Der Zuschlag deckt Rueckkopplungen ab, die aussen
     um das Bauteil herumgefuehrt werden. Wer damit schon ausscheidet, muss
     gar nicht erst geroutet werden. */
  function roughBounds(circuit, wire) {
    var a = pinPoint(circuit, { part: wire.from.part, kind: 'out', index: wire.from.index });
    var b = pinPoint(circuit, { part: wire.to.part,   kind: 'in',  index: wire.to.index });
    if (!a || !b) return null;

    var pad = T.grid * 2;
    return {
      x: Math.min(a.x, b.x) - pad,
      y: Math.min(a.y, b.y) - pad,
      w: Math.abs(b.x - a.x) + pad * 2,
      h: Math.abs(b.y - a.y) + pad * 2
    };
  }

  C.render.routes = {
    pinPoint: pinPoint, points: points, junctions: junctions,
    boundsOf: boundsOf, roughBounds: roughBounds
  };

})(window.CIRCUIT = window.CIRCUIT || {});
