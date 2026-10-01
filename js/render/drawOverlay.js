/* Alles, was ueber der Schaltung liegt und nicht zur Schaltung gehoert:
   Auswahlrahmen, Vorschau einer neuen Leitung und der Schatten eines
   Bauteils, das gerade platziert wird. Wird zuletzt gezeichnet. */
(function (C) {
  'use strict';

  var T  = C.render.theme;
  var P  = C.model.parts;
  var W  = C.render.drawWires;
  var DP = C.render.drawParts;

  /* Aufziehbarer Auswahlrahmen. */
  function rubberBand(ctx, rect, scale) {
    if (!rect || (rect.w < 0.5 && rect.h < 0.5)) return;
    var px = 1 / (scale || 1);            /* immer gleich duenn, egal wie nah */

    ctx.save();
    ctx.fillStyle = 'rgba(127,178,255,.10)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.setLineDash([5 * px, 4 * px]);
    ctx.lineWidth = 1.25 * px;
    ctx.strokeStyle = T.selection;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }

  /* Leitung, die gerade gezogen wird. valid steuert die Farbe. */
  function wirePreview(ctx, from, toX, toY, valid) {
    if (!from) return;
    var pts = W.route(from.x, from.y, toX, toY);
    W.preview(ctx, pts, valid);

    /* Punkt am Startpin, damit klar ist, woher die Leitung kommt. */
    ctx.beginPath();
    ctx.arc(from.x, from.y, T.pinR + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = valid === false ? T.err : T.signal;
    ctx.fill();
  }

  /* Umriss eines Bauteils, das gerade platziert wird. */
  function placeGhost(ctx, type, x, y, scale) {
    var def = P.get(type);
    if (!def) return;

    ctx.save();
    ctx.globalAlpha = 0.55;
    DP.draw(ctx, { type: type, x: x, y: y, value: 0 }, { value: 0, scale: scale || 1 });
    ctx.restore();

    /* Rahmen, damit der Schatten nicht mit echten Bauteilen verwechselt wird. */
    var px = 1 / (scale || 1);
    ctx.save();
    ctx.setLineDash([4 * px, 4 * px]);
    ctx.lineWidth = 1.25 * px;
    ctx.strokeStyle = 'rgba(255,181,71,.75)';
    ctx.strokeRect(x - 3, y - 3, def.w + 6, def.h + 6);
    ctx.restore();
  }

  /* Verzweigungsknoten an Ausgaengen mit mehreren Leitungen.

     alphaOf blendet einzelne Knoten ab – sonst blieben helle Punkte ueber
     abgeblendeten Leitungen stehen, waehrend eine Begruendung angezeigt
     wird. */
  function junctions(ctx, list, isOn, alphaOf) {
    list.forEach(function (j) {
      var a = alphaOf ? alphaOf(j) : 1;
      if (a >= 1) { W.junction(ctx, j.x, j.y, isOn ? isOn(j) : false); return; }
      ctx.save();
      ctx.globalAlpha = a;
      W.junction(ctx, j.x, j.y, isOn ? isOn(j) : false);
      ctx.restore();
    });
  }

  C.render.drawOverlay = {
    rubberBand: rubberBand,
    wirePreview: wirePreview,
    placeGhost: placeGhost,
    junctions: junctions
  };

})(window.CIRCUIT = window.CIRCUIT || {});
