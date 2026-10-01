/* Zeichnet die Schaltung und alles, was daruebergelegt wird.

   Reine Darstellung: hier wird nichts am Modell geaendert. Die Reihenfolge ist
   Leitungen, Knoten, Bauteile, Pins, Overlay – so liegen Bauteile ueber ihren
   Leitungen und die Pins ganz oben, wo man sie treffen muss.

   Die Werte kommen vom Simulations-Runner (env.sim). Hier wird nur gefragt,
   nie gerechnet: welche Leitung fuehrt eine 1, was zeigt dieses Bauteil an,
   welches Signal schwingt. */
(function (C) {
  'use strict';

  var P    = C.model.parts;
  var math = C.util.math;
  var T    = C.render.theme;
  var DP   = C.render.drawParts;
  var PINS = C.render.drawPins;
  var W    = C.render.drawWires;
  var OV   = C.render.drawOverlay;
  var R    = C.render.routes;
  var hit  = C.render.hit;

  /* ctx traegt bereits die Kamera-Transformation. */
  function draw(ctx, info, env, tools) {
    var c   = env.circuit;
    var sel = env.selection;

    var sim = env.sim;

    /* env.why haelt fest, welche Bauteile und Leitungen die angeklickte
       Lampe gerade bestimmen. Alles andere wird abgeblendet, statt den Weg
       hervorzuheben: Abblenden kostet eine Deckkraft, ein eigener
       Hervorhebungsstil muesste Bauteile und Leitungen beide anfassen. */
    var why = env.why || null;

    drawWires(ctx, info, c, sel, tools, sim, !!env.reduced, why);
    OV.junctions(ctx, R.junctions(c), function (j) {
      return sim.pinValue(j.partId, 'out', j.index) === 1;
    }, why ? function (j) {
      return why.parts[j.partId] ? 1 : T.dimAlpha;
    } : null);
    /* env.captions ordnet jedem Schalter und jeder Lampe den Namen zu, unter
       dem sie in der Wahrheitstabelle steht. Gefuellt wird das beim Rechnen
       der Tabelle, hier wird es nur gelesen. */
    drawParts(ctx, info, c, sel, tools, sim, env.captions, why);
    drawOverlay(ctx, info, tools);
  }

  function drawWires(ctx, info, c, sel, tools, sim, reduced, why) {
    var hoverWire = tools.hover.wire;

    /* Zwei Sorten Leitung werden zurueckgestellt und zuletzt gezeichnet:
       die auf dem Weg einer Begruendung, und die gerade angefasste.

       Ohne das liegt eine hervorgehobene Leitung genau dort im Gewirr, wo sie
       in der Liste steht – und eine kreuzende malt quer darueber. Gerade wo
       viele Draehte uebereinanderliegen, reisst die Hervorhebung dann auf,
       also genau dort, wo man sie braucht. Zuletzt gezeichnet laeuft sie als
       durchgehendes Band ueber alles hinweg. Bauteile kommen weiterhin
       spaeter und bleiben oben.

       Die angefasste Leitung liegt ueber dem Weg und ist nie abgeblendet:
       "wohin fuehrt diese hier" soll immer eine Antwort bekommen, auch
       waehrend eine Begruendung angezeigt wird. */
    var spaeter = [];
    var oben = null;

    c.wires.forEach(function (w) {
      /* Culling in zwei Stufen: erst der grobe Bereich aus den Endpunkten,
         dann erst der tatsaechliche Verlauf. */
      var rough = R.roughBounds(c, w);
      if (!rough || !math.rectsOverlap(info.view, rough)) return;

      var pts = R.points(c, w);
      if (!pts) return;

      if (hoverWire === w)           { oben = { w: w, pts: pts }; return; }
      if (why && why.wires[w.id])    { spaeter.push({ w: w, pts: pts }); return; }
      eine(w, pts, false, false);
    });

    spaeter.forEach(function (e) { eine(e.w, e.pts, true, false); });
    if (oben) eine(oben.w, oben.pts, !!(why && why.wires[oben.w.id]), true);

    function eine(w, pts, aufWeg, angefasst) {
      var dunkel = why && !aufWeg && !angefasst;
      if (dunkel) { ctx.save(); ctx.globalAlpha = T.dimAlpha; }

      W.draw(ctx, pts, {
        trace:    aufWeg,
        lift:     angefasst,
        on:       sim.wireOn(w.id),
        error:    sim.wireHot(w.id),     /* schwingt: rot statt amber */
        selected: sel.hasWire(w.id),
        hover:    hoverWire === w,
        time:     info.time,
        scale:    info.scale,
        pulses:   !reduced          /* wer weniger Bewegung will, bekommt keine */
      });

      if (dunkel) ctx.restore();
    }
  }

  function drawParts(ctx, info, c, sel, tools, sim, captions, why) {
    /* Waehrend eine Leitung gezogen wird, leuchten die passenden Gegenstellen. */
    var highlight = tools.connect
      ? (tools.connect.from.kind === 'out' ? 'in' : 'out')
      : null;
    var hoverPin = tools.hover.pin;

    c.parts.forEach(function (part) {
      if (!math.rectsOverlap(info.view, P.bounds(part))) return;      /* Culling */

      var auf = why ? !!why.parts[part.id] : true;
      if (!auf) { ctx.save(); ctx.globalAlpha = T.dimAlpha; }

      var opts = {
        value:    sim.partValue(part),
        hover:    tools.hover.part === part,
        selected: sel.hasPart(part.id),
        scale:    info.scale,
        time:     info.time,
        caption:  captions ? captions[part.id] : null
      };
      DP.draw(ctx, part, opts);

      if (info.scale < T.zoomLOD) {                                   /* grobe Stufe */
        if (!auf) ctx.restore();
        return;
      }

      opts.inValues  = pinValues(sim, part, 'in');
      opts.outValues = pinValues(sim, part, 'out');
      opts.highlight = highlightFor(highlight, part, c);
      opts.hover = hoverPin && hoverPin.part === part.id
        ? { kind: hoverPin.kind, index: hoverPin.index }
        : null;
      PINS.drawAll(ctx, part, opts);

      if (!auf) ctx.restore();
    });
  }

  /* Werte aller Pins einer Seite – fuer das Leuchten der Pin-Punkte. */
  function pinValues(sim, part, kind) {
    var d = P.get(part.type);
    if (!d) return [];
    return (kind === 'in' ? d.ins : d.outs).map(function (_, i) {
      return sim.pinValue(part.id, kind, i);
    });
  }

  /* Einen freien Eingang hervorheben lohnt nur, wenn es ihn gibt. */
  function highlightFor(kind, part, c) {
    if (!kind) return null;
    if (kind === 'in')  return c.freeInput(part.id) >= 0 ? 'in' : null;
    return P.pinCount(part.type, 'out') > 0 ? 'out' : null;
  }

  function drawOverlay(ctx, info, tools) {
    if (tools.rubber) {
      var rb = tools.rubber;
      OV.rubberBand(ctx, hit.rectFrom(rb.x0, rb.y0, rb.x1, rb.y1), info.scale);
    }

    if (tools.connect) {
      var k = tools.connect;
      OV.wirePreview(ctx, k.from, k.x, k.y, k.valid);
    }

    if (tools.armedType && tools.ghost) {
      OV.placeGhost(ctx, tools.armedType, tools.ghost.x, tools.ghost.y, info.scale);
    }
  }

  C.app.drawScene = { draw: draw };

})(window.CIRCUIT = window.CIRCUIT || {});
