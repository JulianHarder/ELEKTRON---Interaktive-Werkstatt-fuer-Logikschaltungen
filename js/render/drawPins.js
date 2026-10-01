/* Pin-Punkte an den Bauteilen. Bewusst getrennt von drawParts.js, weil Pins
   oben auf allen Bauteilen liegen und eigene Zustaende haben (Hover, passend/unpassend). */
(function (C) {
  'use strict';

  var T = C.render.theme;
  var P = C.model.parts;
  var SPR = C.render.sprites;

  /* Ein einzelner Pin.
     st: { on, hover, valid, invalid } */
  function pin(ctx, x, y, st) {
    var s = st || {};

    if (s.on) SPR.drawGlow(ctx, x, y, 18, 0.55);

    /* Hervorhebung beim Verbinden: passende Ziele bekommen einen Ring. */
    if (s.valid || s.hover) {
      ctx.beginPath();
      ctx.arc(x, y, T.pinR + 5, 0, Math.PI * 2);
      ctx.fillStyle = s.invalid ? 'rgba(255,93,115,.18)' : 'rgba(255,181,71,.20)';
      ctx.fill();
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = s.invalid ? T.err : T.signal;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, T.pinR, 0, Math.PI * 2);
    ctx.fillStyle = s.on ? T.signal : T.pin;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = T.pinRing;
    ctx.stroke();
  }

  /* Alle Pins eines Bauteils.
     opts: { inValues:[], outValues:[], hover:{kind,index}, highlight:'in'|'out' } */
  function drawAll(ctx, part, opts) {
    var o = opts || {};
    var d = P.get(part.type);
    if (!d) return;

    ctx.save();
    ctx.translate(part.x, part.y);

    d.ins.forEach(function (p, i) {
      pin(ctx, p.x, p.y, {
        on: o.inValues ? o.inValues[i] === 1 : false,
        hover: isHover(o, 'in', i),
        valid: o.highlight === 'in'
      });
    });

    d.outs.forEach(function (p, i) {
      pin(ctx, p.x, p.y, {
        on: o.outValues ? o.outValues[i] === 1 : (o.value === 1),
        hover: isHover(o, 'out', i),
        valid: o.highlight === 'out'
      });
    });

    ctx.restore();
  }

  function isHover(o, kind, i) {
    return !!(o.hover && o.hover.kind === kind && o.hover.index === i);
  }

  C.render.drawPins = { one: pin, drawAll: drawAll };

})(window.CIRCUIT = window.CIRCUIT || {});
