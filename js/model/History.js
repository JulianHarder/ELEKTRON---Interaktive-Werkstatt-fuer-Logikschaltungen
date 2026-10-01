/* Undo und Redo. Haelt zwei Stapel: was passiert ist und was rueckgaengig
   gemacht wurde. Jede neue Aenderung verwirft den Redo-Stapel – das ist das
   Verhalten, das man von jedem Editor kennt. */
(function (C) {
  'use strict';

  var LIMIT = 100;

  function History(circuit) {
    this.circuit = circuit;
    this.past = [];
    this.future = [];
    this.onChange = null;      /* function (history, edit) */
  }

  /* Fuehrt einen Edit aus und legt ihn auf den Stapel. */
  History.prototype.run = function (edit) {
    if (!edit || edit.isEmpty()) return false;
    edit.apply(this.circuit);
    this.past.push(edit);
    if (this.past.length > LIMIT) this.past.shift();
    this.future.length = 0;
    this._fire(edit);
    return true;
  };

  History.prototype.undo = function () {
    var edit = this.past.pop();
    if (!edit) return null;
    edit.revert(this.circuit);
    this.future.push(edit);
    this._fire(edit);
    return edit;
  };

  History.prototype.redo = function () {
    var edit = this.future.pop();
    if (!edit) return null;
    edit.apply(this.circuit);
    this.past.push(edit);
    this._fire(edit);
    return edit;
  };

  History.prototype.canUndo = function () { return this.past.length > 0; };
  History.prototype.canRedo = function () { return this.future.length > 0; };

  /* Name der naechsten Aktion – fuer Knopf-Tooltips ("Rückgängig: Verbunden"). */
  History.prototype.undoLabel = function () {
    var e = this.past[this.past.length - 1];
    return e ? e.label : '';
  };
  History.prototype.redoLabel = function () {
    var e = this.future[this.future.length - 1];
    return e ? e.label : '';
  };

  History.prototype.clear = function () {
    this.past.length = 0;
    this.future.length = 0;
    this._fire();
  };

  History.prototype._fire = function (edit) {
    if (this.onChange) this.onChange(this, edit || null);
  };

  C.model.History = History;

})(window.CIRCUIT = window.CIRCUIT || {});
