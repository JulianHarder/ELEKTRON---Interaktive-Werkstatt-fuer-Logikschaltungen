/* Leitungen: rechtwinkliger Verlauf mit abgerundeten Ecken, Glow und
   wandernden Lichtimpulsen in Flussrichtung. */
(function (C) {
  'use strict';

  var T   = C.render.theme;
  var SPR = C.render.sprites;

  /* --- Verlauf berechnen ---
     Normalfall: Knick in der Mitte. Laeuft das Ziel nach links (Rueckkopplung),
     wird aussen herum gefuehrt, damit die Leitung nicht durch das Bauteil laeuft. */
  function route(ax, ay, bx, by, mid) {
    if (Math.abs(ay - by) < 0.5) return [ { x: ax, y: ay }, { x: bx, y: by } ];

    if (bx - ax > 2 * T.grid) {
      var mx = mid === undefined || mid === null ? (ax + bx) / 2 : mid;
      mx = Math.max(ax + T.grid, Math.min(bx - T.grid, mx));
      return [ { x: ax, y: ay }, { x: mx, y: ay }, { x: mx, y: by }, { x: bx, y: by } ];
    }

    var out = T.grid * 1.5;
    var my = mid === undefined || mid === null ? (ay + by) / 2 : mid;
    return [
      { x: ax, y: ay }, { x: ax + out, y: ay }, { x: ax + out, y: my },
      { x: bx - out, y: my }, { x: bx - out, y: by }, { x: bx, y: by }
    ];
  }

  /* Polyline mit abgerundeten Ecken als Path2D. */
  function path(pts, radius) {
    var p = new Path2D();
    if (!pts.length) return p;
    var r = radius === undefined ? T.wireRadius : radius;

    p.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length - 1; i++) {
      var prev = pts[i - 1], cur = pts[i], next = pts[i + 1];
      var rr = Math.min(r, len(prev, cur) / 2, len(cur, next) / 2);
      p.arcTo(cur.x, cur.y, next.x, next.y, rr);
    }
    p.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    return p;
  }

  function len(a, b) { return Math.abs(b.x - a.x) + Math.abs(b.y - a.y); }

  function totalLength(pts) {
    var s = 0;
    for (var i = 1; i < pts.length; i++) s += len(pts[i - 1], pts[i]);
    return s;
  }

  /* Punkt im Abstand d entlang der Polyline. */
  function pointAt(pts, d) {
    for (var i = 1; i < pts.length; i++) {
      var seg = len(pts[i - 1], pts[i]);
      if (d <= seg) {
        var t = seg === 0 ? 0 : d / seg;
        return {
          x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
          y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t
        };
      }
      d -= seg;
    }
    return pts[pts.length - 1];
  }

  /* --- Zeichnen ---
     o: { on, time, hover, selected, error, scale, pulses, trace, lift } */
  function draw(ctx, pts, o) {
    var opt = o || {};
    var p = path(pts);
    var lod = opt.scale !== undefined && opt.scale < T.zoomLOD;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (opt.on && !lod) {
      ctx.strokeStyle = T.glow(0.09);
      ctx.lineWidth = T.wireW * 5.5;
      ctx.stroke(p);

      ctx.strokeStyle = T.glow(0.20);
      ctx.lineWidth = T.wireW * 2.6;
      ctx.stroke(p);
    }

    /* --- Leitung auf dem Weg einer Begründung ---

       Alles hier liegt UNTER dem eigentlichen Strich: Die gelbe Leitung
       selbst bleibt unangetastet, sie bekommt nur eine Fassung und einen
       mitlaufenden Saum.

       Die dunkle Fassung ist der eigentliche Trick gegen das Gewirr. Sie
       trennt den Weg von allem, was darunter liegt – wie der Rand einer
       Linie im Liniennetzplan. Ohne sie verschwimmt die Markierung dort,
       wo sich Leitungen kreuzen. */
    if (opt.trace) {
      ctx.strokeStyle = 'rgba(10,14,22,.88)';
      ctx.lineWidth = T.wireW * 6.8;
      ctx.stroke(p);

      ctx.strokeStyle = T.trace(0.18);
      ctx.lineWidth = T.wireW * 5.5;
      ctx.stroke(p);

      ctx.strokeStyle = T.trace(0.45);
      ctx.lineWidth = T.wireW * 2.8;
      ctx.stroke(p);

      /* Der Saum wandert rückwärts – in die Richtung, in die man liest:
         zur Ursache hin. Er ist breiter als der Strich darüber, also sieht
         man ihn nur an den Rändern. */
      if (opt.pulses !== false && !lod) traceDash(ctx, p, opt.time || 0);
    }

    /* Angefasste Leitung: dieselbe dunkle Fassung wie bei der Begründung,
       damit man sie durch das Gewirr verfolgen kann. Wohin eine Leitung
       führt, lässt sich nicht am Verlauf ablesen, wenn mehrere übereinander
       liegen – also fragt man sie an, statt alle auseinanderzuziehen. */
    if (opt.lift) {
      ctx.strokeStyle = 'rgba(10,14,22,.88)';
      ctx.lineWidth = T.wireW * 6.8;
      ctx.stroke(p);

      /* Zweistufig wie bei der Begründung: ein breiter, blasser Saum trägt
         den schmalen, kräftigen. Einstufig verliert sich die Leitung dort,
         wo eine andere sie kreuzt – und genau dort braucht man sie. */
      ctx.strokeStyle = 'rgba(127,178,255,.20)';
      ctx.lineWidth = T.wireW * 5.5;
      ctx.stroke(p);

      ctx.strokeStyle = 'rgba(127,178,255,.52)';
      ctx.lineWidth = T.wireW * 2.8;
      ctx.stroke(p);
    }

    if (opt.selected || (opt.hover && !opt.lift)) {
      ctx.strokeStyle = opt.selected ? 'rgba(127,178,255,.35)' : 'rgba(91,123,168,.28)';
      ctx.lineWidth = T.wireW * 3.4;
      ctx.stroke(p);
    }

    ctx.strokeStyle = opt.error ? T.err : (opt.on ? T.signal : T.wireOff);
    ctx.lineWidth = opt.on ? T.wireW + 0.4 : T.wireW;
    ctx.stroke(p);

    if (opt.on && opt.pulses !== false && !lod) drawPulses(ctx, pts, opt.time || 0);

    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  }

  /* Mitlaufender Saum entlang einer begründeten Leitung.

     lineDashOffset waechst, dadurch wandert das Muster entgegen der
     Flussrichtung – also dorthin, wo der Grund liegt. Umgekehrt zu den
     Lichtimpulsen, und genau das ist gemeint: Die Impulse zeigen, wohin das
     Signal geht, der Saum zeigt, woher der Wert kommt. */
  var TRACE_DASH = 26;
  var TRACE_SPEED = 46;        /* Weltpixel pro Sekunde */

  function traceDash(ctx, p, time) {
    ctx.save();
    ctx.setLineDash([11, TRACE_DASH - 11]);
    ctx.lineDashOffset = (time * TRACE_SPEED) % TRACE_DASH;
    ctx.strokeStyle = T.trace(0.95);
    ctx.lineWidth = T.wireW * 2.8;
    ctx.stroke(p);
    ctx.restore();
  }

  /* Wandernde Lichtpunkte – zeigen die Flussrichtung. */
  var SPACING = 96;
  function drawPulses(ctx, pts, time) {
    var total = totalLength(pts);
    if (total < 24) return;

    var offset = (time * T.pulseSpeed) % SPACING;
    for (var d = offset; d < total; d += SPACING) {
      var q = pointAt(pts, d);
      /* am Anfang und Ende sanft ein- und ausblenden */
      var fade = Math.min(1, d / 18, (total - d) / 18);
      if (fade <= 0) continue;
      SPR.drawGlow(ctx, q.x, q.y, 11, 0.58 * fade);
      ctx.beginPath();
      ctx.arc(q.x, q.y, 1.9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,238,205,' + (0.95 * fade) + ')';
      ctx.fill();
    }
  }

  /* Verzweigungsknoten, wenn ein Ausgang mehrere Leitungen speist. */
  function junction(ctx, x, y, on) {
    ctx.beginPath();
    ctx.arc(x, y, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = on ? T.signal : T.wireOff;
    ctx.fill();
  }

  /* Vorschau beim Ziehen einer neuen Leitung. */
  function preview(ctx, pts, valid) {
    var p = path(pts);
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.lineCap = 'round';
    ctx.lineWidth = T.wireW;
    ctx.strokeStyle = valid === false ? T.err : 'rgba(255,181,71,.85)';
    ctx.stroke(p);
    ctx.restore();
  }

  C.render.drawWires = {
    route: route, path: path, draw: draw,
    junction: junction, preview: preview,
    totalLength: totalLength, pointAt: pointAt
  };

})(window.CIRCUIT = window.CIRCUIT || {});
