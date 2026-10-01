/* Sehr schlanker Ereignisverteiler. Damit reden die Schichten miteinander,
   ohne sich gegenseitig zu kennen (Modell -> Darstellung -> Oberfläche). */
(function (C) {
  'use strict';

  function Emitter() {
    this._map = {};
  }

  Emitter.prototype.on = function (name, fn) {
    (this._map[name] || (this._map[name] = [])).push(fn);
    var self = this;
    return function off() { self.off(name, fn); };
  };

  Emitter.prototype.off = function (name, fn) {
    var list = this._map[name];
    if (!list) return;
    var i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };

  Emitter.prototype.emit = function (name, payload) {
    var list = this._map[name];
    if (!list || !list.length) return;
    /* Kopie, damit Abmelden während des Auslösens sicher ist. */
    list.slice().forEach(function (fn) { fn(payload); });
  };

  C.util.Emitter = Emitter;
  /* Ein globaler Bus für app-weite Meldungen. */
  C.bus = new Emitter();

})(window.CIRCUIT = window.CIRCUIT || {});
