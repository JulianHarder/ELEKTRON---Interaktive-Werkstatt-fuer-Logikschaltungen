/* Tastenkuerzel. Sammelt alles an einer Stelle, damit man nachsehen kann,
   was belegt ist – und damit kein Werkzeug heimlich eine Taste wegnimmt. */
(function (C) {
  'use strict';

  var T   = C.render.theme;
  var cmd = C.model.commands;

  function Shortcuts(env, tools) {
    this.env = env;
    this.tools = tools;
    this.clipboard = null;          /* eigene Ablage, nicht die des Systems */
    this._bind();
  }

  Shortcuts.prototype._bind = function () {
    var self = this;
    window.addEventListener('keydown', function (e) {
      if (isTyping(e.target)) return;
      if (self.handle(e)) e.preventDefault();
    });
  };

  Shortcuts.prototype.handle = function (e) {
    var mod = e.ctrlKey || e.metaKey;
    var key = e.key.toLowerCase();

    if (mod && key === 'z') { return e.shiftKey ? this.redo() : this.undo(); }
    if (mod && key === 'y') { return this.redo(); }
    if (mod && key === 'a') { this.env.selection.selectAll(this.env.circuit);
                              this.env.r.markDirty(); return true; }
    if (mod && key === 'c') { return this.copy(); }
    if (mod && key === 'x') { return this.copy() && this.del(); }
    if (mod && key === 'v') { return this.paste(); }
    if (mod) return false;

    if (key === 'delete' || key === 'backspace') return this.del();
    if (key === 'escape') return this.tools.escape();

    var step = e.shiftKey ? T.grid : T.grid * 2;
    if (key === 'arrowleft')  return C.interact.toolMove.nudge(this.tools, -step, 0);
    if (key === 'arrowright') return C.interact.toolMove.nudge(this.tools,  step, 0);
    if (key === 'arrowup')    return C.interact.toolMove.nudge(this.tools, 0, -step);
    if (key === 'arrowdown')  return C.interact.toolMove.nudge(this.tools, 0,  step);

    return false;
  };

  /* --- Einzelne Aktionen (auch von den Knoepfen aufgerufen) --- */

  Shortcuts.prototype.undo = function () {
    if (!this.env.history.undo()) return false;
    this.after('Rückgängig');
    return true;
  };

  Shortcuts.prototype.redo = function () {
    if (!this.env.history.redo()) return false;
    this.after('Wiederhergestellt');
    return true;
  };

  Shortcuts.prototype.del = function () {
    var sel = this.env.selection;
    if (sel.isEmpty()) return false;

    /* Ein- und Ausgaenge der Aufgabe bleiben stehen – ohne sie waere das
       Level nicht mehr pruefbar. Leitungen daran darf man loeschen. */
    var c = this.env.circuit;
    var alle = sel.partIds();
    var ids = alle.filter(function (id) {
      var p = c.part(id);
      return p && !p.locked;
    });

    if (!ids.length && !sel.wireIds().length) {
      this.env.hint('Die <b>Anschlüsse der Aufgabe</b> lassen sich nicht löschen.');
      return false;
    }
    if (ids.length < alle.length) {
      this.env.hint('Die Anschlüsse der Aufgabe bleiben stehen, der Rest ist gelöscht.');
    }

    var edit = cmd.remove(this.env.circuit, ids, sel.wireIds());
    if (!this.env.history.run(edit)) return false;
    sel.clear();
    this.after('Gelöscht');
    return true;
  };

  Shortcuts.prototype.copy = function () {
    var ids = this.env.selection.partIds();
    if (!ids.length) return false;
    this.clipboard = cmd.copy(this.env.circuit, ids);
    this.env.hint(ids.length + (ids.length === 1 ? ' Bauteil' : ' Bauteile') + ' kopiert.');
    return true;
  };

  Shortcuts.prototype.paste = function () {
    if (!this.clipboard || !this.clipboard.parts.length) return false;
    /* Versetzt einfuegen, damit die Kopie nicht genau auf dem Original liegt. */
    var edit = cmd.paste(this.env.circuit, this.clipboard, T.grid * 2, T.grid * 2);
    if (!this.env.history.run(edit)) return false;

    this.env.selection.set(edit.addedParts.map(function (p) { return p.id; }), []);
    /* Weitere Einfuegungen wandern weiter, statt sich zu stapeln. */
    this.clipboard = cmd.copy(this.env.circuit, edit.addedParts.map(function (p) { return p.id; }));
    this.after('Eingefügt');
    return true;
  };

  /* Nach jeder Aktion: verschwundene ids aus der Auswahl werfen und neu zeichnen. */
  Shortcuts.prototype.after = function (text) {
    this.env.selection.prune(this.env.circuit);
    this.env.hint(text + '.');
    this.env.r.markDirty();
  };

  function isTyping(el) {
    if (!el) return false;
    var t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || el.isContentEditable;
  }

  C.interact.Shortcuts = Shortcuts;

})(window.CIRCUIT = window.CIRCUIT || {});
