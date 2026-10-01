/* Auswaehlen, Verschieben und Schalter umlegen.

   Die Bauteile laufen schon waehrend des Ziehens mit, damit die Leitungen
   sichtbar folgen. Festgehalten wird das erst beim Loslassen – dann entsteht
   ein einziger Befehl fuer die ganze Bewegung, und Undo nimmt sie am Stueck
   zurueck statt in hundert Einzelschritten. */
(function (C) {
  'use strict';

  var T    = C.render.theme;
  var math = C.util.math;
  var cmd  = C.model.commands;

  var SLOP = 3;                 /* ab hier gilt es als Ziehen statt als Klick */

  function down(t, ev, part) {
    var sel = t.env.selection;

    /* Was nicht in der Auswahl liegt, wird zur Auswahl – sonst verschiebt man
       etwas anderes, als man angefasst hat. */
    if (!sel.hasPart(part.id)) {
      if (ev.ctrl) sel.addPart(part.id);
      else sel.set([part.id], []);
    }

    var c = t.env.circuit;
    t.drag = {
      part: part,
      ctrl: !!ev.ctrl,
      ox: ev.wx, oy: ev.wy,
      moved: false,
      starts: sel.partIds().map(function (id) {
        var p = c.part(id);
        return p ? { id: id, x: p.x, y: p.y } : null;
      }).filter(Boolean)
    };
    t.env.r.markDirty();
  }

  function update(t, ev) {
    var d = t.drag;
    if (!d) return;

    var rawX = ev.wx - d.ox;
    var rawY = ev.wy - d.oy;

    if (!d.moved) {
      if (Math.abs(rawX) + Math.abs(rawY) < SLOP) return;
      d.moved = true;
    }

    /* Auf das Raster fangen. Weil alle Bauteile auf dem Raster liegen, reicht
       es, die Verschiebung zu rasten – die Abstaende untereinander bleiben. */
    var dx = math.snap(rawX, T.grid);
    var dy = math.snap(rawY, T.grid);

    var c = t.env.circuit;
    d.starts.forEach(function (s) { c.movePart(s.id, s.x + dx, s.y + dy); });
    t.env.r.markDirty();
  }

  function up(t, ev) {
    var d = t.drag;
    t.drag = null;
    if (!d) return;

    if (d.moved) {
      /* Der Befehl beschreibt nur Start und Ziel, nicht den Weg dazwischen. */
      t.env.history.run(cmd.moveFrom(t.env.circuit, d.starts));
      t.env.r.markDirty();
      return;
    }

    /* Nicht bewegt – also war es ein Klick. */
    click(t, ev, d);
  }

  function click(t, ev, d) {
    var sel = t.env.selection;
    var part = d.part;

    if (d.ctrl) { sel.togglePart(part.id); t.env.r.markDirty(); return; }

    /* Quellen legt man um, statt sie nur auszuwaehlen. */
    if (part.type === 'switch' || part.type === 'const') {
      var edit = cmd.setValue(t.env.circuit, part.id, part.value ? 0 : 1);
      if (edit) t.env.history.run(edit);
      t.env.r.markDirty();
      return;
    }

    /* Der Takt haelt an und laeuft weiter. Sein Zustand gehoert zur
       Simulation, nicht zum Modell – deshalb ohne Undo.

       refresh() statt nur sync(): sync() stellt bloss den Zeitgeber um und
       sagt niemandem Bescheid. Die Wahrheitstabelle haengt aber davon ab, ob
       der Takt laeuft – sie zeigt bei laufendem Takt nur die aktuelle
       Stellung. Ohne das Nachrechnen bliebe sie samt Hinweis auf dem alten
       Stand stehen, obwohl der Takt schon steht. */
    if (part.type === 'clock' && t.env.sim) {
      var clk = t.env.sim.clock;
      clk.running = !clk.running;
      t.env.sim.refresh();
      t.env.hint(clk.running ? 'Takt läuft.' : 'Takt angehalten.');
      t.env.r.markDirty();
      return;
    }

    sel.set([part.id], []);
    t.env.r.markDirty();
  }

  /* Ausgewaehltes mit den Pfeiltasten schieben – fein mit Umschalt. */
  function nudge(t, dx, dy) {
    var ids = t.env.selection.partIds();
    if (!ids.length) return false;
    return t.env.history.run(cmd.move(t.env.circuit, ids, dx, dy));
  }

  C.interact.toolMove = { down: down, update: update, up: up, nudge: nudge };

})(window.CIRCUIT = window.CIRCUIT || {});
