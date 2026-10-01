/* Werkzeug-Verteiler.

   Haelt den Zustand der Bedienung (was schwebt unter dem Zeiger, wird gerade
   eine Leitung gezogen, ein Rahmen aufgezogen, etwas verschoben) und reicht
   die Zeigerereignisse an das passende Werkzeug weiter. Die Werkzeuge selbst
   liegen in toolPlace.js, toolConnect.js und toolMove.js.

   env liefert alles, was die Werkzeuge brauchen, ohne dass sie die App kennen:
   { circuit, history, selection, cam, r, nav, hint(text), disarm() } */
(function (C) {
  'use strict';

  var hit = C.render.hit;

  function Tools(env) {
    this.env = env;
    this.armedType = null;                          /* aus der Bausteinleiste */
    this.hover   = { part: null, pin: null, wire: null };
    this.connect = null;                            /* laufende Verbindung */
    this.rubber  = null;                            /* Auswahlrahmen */
    this.drag    = null;                            /* laufendes Verschieben */
    this.ghost   = null;                            /* Schatten beim Platzieren */
  }

  /* --- Bausteinleiste --- */

  Tools.prototype.arm = function (type) {
    this.armedType = type || null;
    this.ghost = null;
    if (this.armedType) {
      this.cancelConnect();
      this.env.hint('Klicke auf die Fläche, um <b>' + name(type) + '</b> zu setzen. ' +
                    'Escape beendet das Platzieren.');
    } else {
      this.env.hint(null);
    }
    this.env.r.markDirty();
  };

  /* --- Frage von Navigate: darf hier mit links gezogen werden? --- */

  Tools.prototype.allowsPan = function (ev) {
    if (this.armedType || this.connect) return false;
    if (ev.shift) return false;                     /* Umschalt zieht den Rahmen */
    var c = this.env.circuit;
    if (hit.pin(c, ev.wx, ev.wy))  return false;
    if (hit.part(c, ev.wx, ev.wy)) return false;
    if (hit.wire(c, ev.wx, ev.wy)) return false;
    return true;
  };

  /* --- Zeigerereignisse --- */

  Tools.prototype.onDown = function (ev) {
    if (ev.button !== 0) return;

    /* Navigate hat zugegriffen – das heisst: freie Flaeche (oder Leertaste).
       Verschieben macht es selbst, wir merken uns nur, dass ein reiner Klick
       hier die Auswahl leeren soll. */
    if (this.env.nav.panning) { this._clearOnUp = true; return; }

    if (this.armedType) { C.interact.toolPlace.down(this, ev); return; }
    if (this.connect)   { C.interact.toolConnect.finishAt(this, ev); return; }

    var c = this.env.circuit;

    var pin = hit.pin(c, ev.wx, ev.wy);
    if (pin) { C.interact.toolConnect.startFrom(this, pin, ev); return; }

    if (ev.shift) {
      this.rubber = { x0: ev.wx, y0: ev.wy, x1: ev.wx, y1: ev.wy, add: !!ev.ctrl };
      return;
    }

    var part = hit.part(c, ev.wx, ev.wy);
    if (part) { C.interact.toolMove.down(this, ev, part); return; }

    var wire = hit.wire(c, ev.wx, ev.wy);
    if (wire) {
      if (ev.ctrl) this.env.selection.toggleWire(wire.id);
      else this.env.selection.set([], [wire.id]);
      this.env.r.markDirty();
      return;
    }

    /* Freie Flaeche: Navigate verschiebt. Beim reinen Klick die Auswahl leeren. */
    this._clearOnUp = true;
  };

  Tools.prototype.onMove = function (ev) {
    this.updateHover(ev);

    if (this.armedType) { C.interact.toolPlace.move(this, ev); return; }
    if (this.connect)   { C.interact.toolConnect.update(this, ev); return; }
    if (this.drag)      { C.interact.toolMove.update(this, ev); return; }

    if (this.rubber) {
      this.rubber.x1 = ev.wx;
      this.rubber.y1 = ev.wy;
      this.env.r.markDirty();
    }
  };

  Tools.prototype.onUp = function (ev) {
    if (this.drag)   { C.interact.toolMove.up(this, ev); return; }
    if (this.rubber) { this.applyRubber(); return; }

    if (this.connect && !this.connect.sticky) {
      C.interact.toolConnect.release(this, ev);
      return;
    }

    if (this._clearOnUp) {
      this._clearOnUp = false;
      if (!this.env.nav.didPan) {
        this.env.selection.clear();
        this.env.r.markDirty();
      }
    }
  };

  Tools.prototype.onCancel = function () {
    this.drag = null;
    this.rubber = null;
    this._clearOnUp = false;
    this.env.r.markDirty();
  };

  /* Escape raeumt der Reihe nach auf: erst das laufende Werkzeug, dann die
     Auswahl. So kommt man mit einer Taste immer einen Schritt zurueck. */
  Tools.prototype.escape = function () {
    if (this.connect)   { this.cancelConnect(); return true; }
    if (this.armedType) { this.env.disarm(); return true; }
    if (this.drag || this.rubber) { this.onCancel(); return true; }
    if (!this.env.selection.isEmpty()) {
      this.env.selection.clear();
      this.env.r.markDirty();
      return true;
    }
    return false;
  };

  Tools.prototype.cancelConnect = function () {
    if (!this.connect) return;
    this.connect = null;
    this.env.hint(null);
    this.env.r.markDirty();
  };

  /* --- Auswahlrahmen auswerten --- */

  Tools.prototype.applyRubber = function () {
    var rb = this.rubber;
    this.rubber = null;
    if (!rb) return;

    var rect = hit.rectFrom(rb.x0, rb.y0, rb.x1, rb.y1);
    var c = this.env.circuit;
    var parts = hit.partsInRect(c, rect);

    var set = {};
    var partIds = parts.map(function (p) { set[p.id] = true; return p.id; });
    var wireIds = hit.wiresInRect(c, rect, set).map(function (w) { return w.id; });

    var sel = this.env.selection;
    if (rb.add) {
      partIds.forEach(function (id) { sel.addPart(id); });
      wireIds.forEach(function (id) { sel.addWire(id); });
    } else {
      sel.set(partIds, wireIds);
    }
    /* Nur eine so aufgezogene Auswahl schrumpft die Wahrheitstabelle
       zusammen – siehe Selection.byRubber. */
    sel.markRubber();
    this.env.r.markDirty();
  };

  /* --- Hover: was liegt gerade unter dem Zeiger? --- */

  Tools.prototype.updateHover = function (ev) {
    var c = this.env.circuit;
    var pin  = hit.pin(c, ev.wx, ev.wy);
    var part = pin ? null : hit.part(c, ev.wx, ev.wy);
    var wire = (pin || part) ? null : hit.wire(c, ev.wx, ev.wy);

    var h = this.hover;
    if (samePin(h.pin, pin) && h.part === part && h.wire === wire) return;

    h.pin = pin;
    h.part = part;
    h.wire = wire;
    this.env.r.markDirty();
  };

  function samePin(a, b) {
    if (!a || !b) return a === b;
    return a.part === b.part && a.kind === b.kind && a.index === b.index;
  }

  function name(type) {
    var d = C.model.parts.get(type);
    return d ? d.name : type;
  }

  C.interact.Tools = Tools;

})(window.CIRCUIT = window.CIRCUIT || {});
