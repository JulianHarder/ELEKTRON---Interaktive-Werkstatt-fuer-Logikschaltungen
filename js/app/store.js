/* Der Speicherstand: die Schaltung, an der gerade gebaut wird.

   Frueher lagen hier Sterne, geloeste Level und Freischaltungen. Davon ist
   nichts geblieben – es gibt nur noch eine Werkbank, und die soll beim
   naechsten Start wieder so dastehen, wie man sie verlassen hat.

   Alles liegt im localStorage unter dem Prefix "elektron.". Weil der bei
   file:// am Speicherort haengt, ist hier alles so gebaut, dass ein leerer
   oder kaputter Stand einfach als "nichts gespeichert" durchgeht – nie als
   Fehler. */
(function (C) {
  'use strict';

  var S = C.util.storage;
  var KEY = 'bench';
  var VERSION = 4;

  function Store() {
    this.data = load();
  }

  function load() {
    var raw = S.read(KEY, null);
    if (!raw || raw.version !== VERSION) {
      return { version: VERSION, circuit: null, template: null };
    }
    return raw;
  }

  Store.prototype.save = function () { S.write(KEY, this.data); };

  /* Die Schaltung sichern. Wird nach jeder Aenderung gerufen, deshalb
     darf hier nichts Teures passieren. */
  Store.prototype.setCircuit = function (json) {
    this.data.circuit = json;
    this.save();
  };

  Store.prototype.circuit = function () { return this.data.circuit || null; };

  /* Welche Vorlage zuletzt eingesetzt wurde – nur fuer die Beschreibung
     oben in der Karte. Die Schaltung selbst steht fuer sich. */
  Store.prototype.setTemplate = function (id) {
    this.data.template = id || null;
    this.save();
  };

  Store.prototype.template = function () { return this.data.template || null; };

  Store.prototype.clear = function () {
    this.data.circuit = null;
    this.data.template = null;
    this.save();
  };

  C.app.Store = Store;

})(window.CIRCUIT = window.CIRCUIT || {});
