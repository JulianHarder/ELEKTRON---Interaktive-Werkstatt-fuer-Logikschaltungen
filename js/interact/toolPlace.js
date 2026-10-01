/* Bauteile aus der Leiste auf die Flaeche setzen.

   Zwei Wege, wie im Plan vorgesehen:
   - Klick auf den Baustein in der Leiste, dann Klick auf die Flaeche
   - Baustein aus der Leiste auf die Flaeche ziehen (siehe Palette.js)

   Der Baustein bleibt nach dem Setzen aktiv, damit man mehrere hintereinander
   platzieren kann. Escape oder ein zweiter Klick auf den Eintrag beendet das. */
(function (C) {
  'use strict';

  var T    = C.render.theme;
  var P    = C.model.parts;
  var math = C.util.math;
  var cmd  = C.model.commands;

  /* Position so rasten, dass das Bauteil mittig am Zeiger haengt und seine
     Ecke auf dem Raster liegt. */
  function snapped(type, wx, wy) {
    var def = P.get(type);
    if (!def) return null;
    return {
      x: math.snap(wx - def.w / 2, T.grid),
      y: math.snap(wy - def.h / 2, T.grid)
    };
  }

  function move(t, ev) {
    var pos = snapped(t.armedType, ev.wx, ev.wy);
    if (!pos) return;
    if (t.ghost && t.ghost.x === pos.x && t.ghost.y === pos.y) return;
    t.ghost = pos;
    t.env.r.markDirty();
  }

  function down(t, ev) {
    place(t, ev.wx, ev.wy);
  }

  /* Setzt das Bauteil und waehlt es gleich aus – so kann man es sofort
     verschieben oder loeschen, ohne es erst zu suchen. */
  function place(t, wx, wy) {
    var type = t.armedType;
    var pos = snapped(type, wx, wy);
    if (!pos) return null;

    var edit = cmd.addPart(t.env.circuit, type, pos.x, pos.y);
    if (!edit) return null;

    t.env.history.run(edit);
    t.env.selection.set([edit.newPart.id], []);
    t.env.hint('<b>' + P.get(type).name + '</b> gesetzt. Noch einer? ' +
               'Escape beendet das Platzieren.');
    t.env.r.markDirty();
    return edit.newPart;
  }

  C.interact.toolPlace = { down: down, move: move, place: place, snapped: snapped };

})(window.CIRCUIT = window.CIRCUIT || {});
