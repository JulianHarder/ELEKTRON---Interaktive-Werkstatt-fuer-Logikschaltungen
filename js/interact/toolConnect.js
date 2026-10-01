/* Leitungen ziehen.

   Zwei Wege, beide fuehren zum selben Ergebnis:
   - Vom Pin zum Ziel ziehen und loslassen
   - Pin anklicken, loslassen, dann das Ziel anklicken (Klick-Klick)

   Loslassen auf dem Koerper eines Bauteils sucht selbst den passenden Pin:
   von einem Ausgang aus den naechsten freien Eingang, von einem Eingang aus
   den Ausgang. Ungueltiges wird mit einem Satz abgelehnt, nicht mit Schweigen. */
(function (C) {
  'use strict';

  var hit = C.render.hit;
  var cmd = C.model.commands;
  var R   = C.render.routes;

  var SLOP = 4;          /* ab hier gilt es als Ziehen statt als Klick */

  function startFrom(t, pin, ev) {
    /* Von einem belegten Eingang aus kann nichts Neues starten – ein Eingang
       nimmt nur ein Signal. Statt stumm zu bleiben, sagen wir warum. */
    if (pin.kind === 'in' && t.env.circuit.wireIntoPin(pin.part, pin.index)) {
      t.env.hint('Dieser Eingang ist schon belegt. Lösche erst die Leitung ' +
                 '(anklicken und <b>Entf</b>).');
      return;
    }

    t.connect = {
      from: pin,
      sx: ev.wx, sy: ev.wy,          /* wo das Ziehen begann */
      x: ev.wx, y: ev.wy,            /* wo der Zeiger jetzt steht */
      moved: false, sticky: false,
      valid: null, reason: ''
    };
    t.env.hint(pin.kind === 'out'
      ? 'Ziehe zu einem <b>Eingang</b> – oder lass auf dem Bauteil los.'
      : 'Ziehe zu einem <b>Ausgang</b>.');
    t.env.r.markDirty();
  }

  function update(t, ev) {
    var k = t.connect;
    if (!k) return;

    if (!k.moved && Math.abs(ev.wx - k.sx) + Math.abs(ev.wy - k.sy) > SLOP) k.moved = true;
    k.x = ev.wx;
    k.y = ev.wy;

    /* Laufend pruefen, damit das Ziel schon beim Darueberfahren faerbt. */
    var target = resolveTarget(t, ev.wx, ev.wy);
    if (target) {
      var check = t.env.circuit.checkConnect(k.from, target);
      k.valid = check.ok;
      k.reason = check.ok ? '' : check.reason;
    } else {
      k.valid = null;
      k.reason = '';
    }
    t.env.r.markDirty();
  }

  /* Maus losgelassen: entweder verbinden, oder in den Klick-Klick-Modus gehen. */
  function release(t, ev) {
    var k = t.connect;
    if (!k) return;

    if (!k.moved) {
      k.sticky = true;                 /* nur geklickt: auf den zweiten Klick warten */
      t.env.hint('Jetzt das <b>Ziel</b> anklicken. Escape bricht ab.');
      return;
    }
    finishAt(t, ev);
  }

  /* Zweiter Klick beim Klick-Klick, oder Loslassen nach dem Ziehen. */
  function finishAt(t, ev) {
    var k = t.connect;
    if (!k) return;

    var target = resolveTarget(t, ev.wx, ev.wy);
    if (!target) {
      /* Ins Leere: nicht als Fehler behandeln, nur abbrechen. */
      t.cancelConnect();
      return;
    }

    var res = cmd.connect(t.env.circuit, k.from, target);
    if (!res.ok) {
      t.env.hint(res.reason);
      t.env.r.markDirty();
      return;                          /* Verbindung bleibt aktiv, zweiter Versuch moeglich */
    }

    t.env.history.run(res.edit);
    t.connect = null;
    t.env.hint('Verbunden.');
    t.env.r.markDirty();
  }

  /* Welcher Pin ist gemeint? Erst der echte Pin, sonst der passende Pin des
     Bauteils unter dem Zeiger. */
  function resolveTarget(t, wx, wy) {
    var c = t.env.circuit;
    var k = t.connect;

    var pin = hit.pin(c, wx, wy);
    if (pin) return pin;

    var part = hit.part(c, wx, wy);
    if (!part || part.id === k.from.part) return null;

    if (k.from.kind === 'out') {
      var free = c.freeInput(part.id);
      if (free < 0) return null;
      var p = R.pinPoint(c, { part: part.id, kind: 'in', index: free });
      return { part: part.id, kind: 'in', index: free, x: p.x, y: p.y };
    }

    if (C.model.parts.pinCount(part.type, 'out') === 0) return null;
    var q = R.pinPoint(c, { part: part.id, kind: 'out', index: 0 });
    return { part: part.id, kind: 'out', index: 0, x: q.x, y: q.y };
  }

  C.interact.toolConnect = {
    startFrom: startFrom, update: update, release: release,
    finishAt: finishAt, resolveTarget: resolveTarget
  };

})(window.CIRCUIT = window.CIRCUIT || {});
