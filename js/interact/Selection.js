/* Was ist gerade ausgewaehlt? Bauteile und Leitungen getrennt, beide als
   Menge ueber ihre id. Die Auswahl haelt bewusst nur ids und keine Objekte:
   nach einem Undo gibt es die alten Objekte nicht mehr, die ids schon. */
(function (C) {
  'use strict';

  function Selection() {
    this._parts = {};
    this._wires = {};
    this.onChange = null;

    /* Wie kam die Auswahl zustande? Nur ein aufgezogener Rahmen
       (Umschalt+Ziehen) laesst die Wahrheitstabelle auf die Auswahl
       zusammenschrumpfen. Ein einfacher Klick auf ein Bauteil soll sie nicht
       jedes Mal umbauen – man klickt staendig etwas an, ohne damit zu sagen
       "zeig mir nur noch das hier". */
    this.byRubber = false;
  }

  Selection.prototype.hasPart = function (id) { return !!this._parts[id]; };
  Selection.prototype.hasWire = function (id) { return !!this._wires[id]; };

  Selection.prototype.partIds = function () { return Object.keys(this._parts); };
  Selection.prototype.wireIds = function () { return Object.keys(this._wires); };

  Selection.prototype.count = function () {
    return this.partIds().length + this.wireIds().length;
  };
  Selection.prototype.isEmpty = function () { return this.count() === 0; };

  Selection.prototype.clear = function () {
    this.byRubber = false;
    if (this.isEmpty()) return false;
    this._parts = {};
    this._wires = {};
    this._fire();
    return true;
  };

  Selection.prototype.addPart = function (id) {
    this.byRubber = false;
    if (this._parts[id]) return false;
    this._parts[id] = true;
    this._fire();
    return true;
  };

  Selection.prototype.addWire = function (id) {
    this.byRubber = false;
    if (this._wires[id]) return false;
    this._wires[id] = true;
    this._fire();
    return true;
  };

  Selection.prototype.togglePart = function (id) {
    this.byRubber = false;
    if (this._parts[id]) delete this._parts[id]; else this._parts[id] = true;
    this._fire();
  };

  Selection.prototype.toggleWire = function (id) {
    this.byRubber = false;
    if (this._wires[id]) delete this._wires[id]; else this._wires[id] = true;
    this._fire();
  };

  /* Auswahl komplett ersetzen. */
  Selection.prototype.set = function (partIds, wireIds) {
    this.byRubber = false;
    this._parts = {};
    this._wires = {};
    (partIds || []).forEach(function (id) { this._parts[id] = true; }, this);
    (wireIds || []).forEach(function (id) { this._wires[id] = true; }, this);
    this._fire();
  };

  Selection.prototype.selectAll = function (circuit) {
    this.set(
      circuit.parts.map(function (p) { return p.id; }),
      circuit.wires.map(function (w) { return w.id; })
    );
  };

  /* Nach einem Undo koennen ids verschwunden sein – die raeumen wir weg,
     sonst zeigt die Fussleiste eine Auswahl an, die es nicht mehr gibt. */
  Selection.prototype.prune = function (circuit) {
    this.byRubber = false;
    var changed = false;
    Object.keys(this._parts).forEach(function (id) {
      if (!circuit.part(id)) { delete this._parts[id]; changed = true; }
    }, this);
    Object.keys(this._wires).forEach(function (id) {
      if (!circuit.wire(id)) { delete this._wires[id]; changed = true; }
    }, this);
    if (changed) this._fire();
    return changed;
  };

  /* Sagt: Diese Auswahl stammt aus einem aufgezogenen Rahmen. Wird direkt
     nach dem Setzen gerufen, weil set()/addPart() das Flag selbst loeschen. */
  Selection.prototype.markRubber = function () {
    this.byRubber = true;
    this._fire();
  };

  Selection.prototype._fire = function () {
    if (this.onChange) this.onChange(this);
  };

  C.interact.Selection = Selection;

})(window.CIRCUIT = window.CIRCUIT || {});
