/* Die Werkbank: was gerade auf der Flaeche liegt.

   Es gibt keine Level mehr und keine Aufgabe, die man erfuellen muesste.
   Man baut frei, und wenn man einen Anfang braucht, holt man sich eine
   Vorlage. Die kann die Flaeche ersetzen oder sich danebenstellen – danach
   ist sie ganz normaler Inhalt, den man verschieben, erweitern und loeschen
   kann wie alles andere.

   Gesichert wird nach jeder Aenderung, damit ein Neuladen nichts kostet. */
(function (C) {
  'use strict';

  var SER = C.model.serialize;
  var CMD = C.model.commands;

  var ABSTAND = 160;        /* Luft zwischen Vorhandenem und neuer Vorlage */


  function Bench(app) {
    this.app = app;
    this.template = null;     /* zuletzt eingesetzte Vorlage, nur als Text */
    this.onChange = null;
  }

  /* --- Start --- */

  /* Den letzten Stand zurueckholen. Liefert false, wenn es keinen gab. */
  Bench.prototype.restore = function () {
    var json = this.app.store.circuit();
    if (!json || !SER.fromJSON(this.app.circuit, json)) return false;

    this.template = C.templates.get(this.app.store.template());
    this.after(false);
    return true;
  };

  /* --- Vorlagen einsetzen --- */

  /* ersetzen = true leert die Flaeche vorher, sonst kommt die Vorlage
     rechts neben das Vorhandene. */
  Bench.prototype.insert = function (id, ersetzen) {
    var tpl = C.templates.get(id);
    if (!tpl) return false;

    var app = this.app;

    if (ersetzen) {
      app.circuit.clear();
      app.history.clear();
      app.selection.clear();
    }

    /* Daneben statt darauf: ohne Versatz laegen zwei Vorlagen uebereinander
       und man haette ein Knaeuel statt zwei Schaltungen. */
    var dx = 0, dy = 0;
    if (!app.circuit.isEmpty()) {
      var b = app.circuit.bounds();
      dx = b.x + b.w + ABSTAND;
      dy = b.y;
    }

    var edit = CMD.paste(app.circuit, C.templates.snapshot(tpl), dx, dy);
    edit.label = tpl.title + ' eingesetzt';
    app.history.run(edit);

    /* Das Eingesetzte ist gleich ausgewaehlt – dann kann man es sofort
       als Ganzes an die richtige Stelle ziehen. */
    app.selection.set(edit.addedParts.map(function (p) { return p.id; }), []);

    this.template = tpl;
    app.store.setTemplate(tpl.id);
    this.after(true);
    return true;
  };

  /* --- Flaeche leeren ---

     Als ganz normaler Befehl, nicht als Abriss: So nimmt Strg+Z das Leeren
     zurueck wie jede andere Aenderung auch. Ohne das waere ein Fehlgriff
     endgueltig – und dann braeuchte der Knopf eine Rueckfrage, die bei jedem
     gewollten Leeren im Weg stuende.

     Die zuletzt eingesetzte Vorlage bleibt gemerkt. Sichtbar wird sie nicht,
     solange die Flaeche leer ist (pureTemplate vergleicht die Teilezahl) –
     holt man sie per Undo zurueck, steht ihre Beschreibung wieder da. */

  Bench.prototype.clear = function () {
    var c = this.app.circuit;
    if (c.isEmpty()) return false;

    var edit = CMD.remove(c,
      c.parts.map(function (p) { return p.id; }),
      c.wires.map(function (w) { return w.id; }));
    edit.label = 'Fläche geleert';

    this.app.selection.clear();
    this.app.history.run(edit);
    if (this.onChange) this.onChange(this.template);
    return true;
  };


  /* --- Ist die Vorlage noch unberuehrt? ---

     Sobald eigene Bauteile dazukommen oder welche verschwinden, ist das
     nicht mehr "die Vorlage", sondern eine eigene Schaltung. Dann verschwindet
     die Beschreibung und es bleibt die Tabelle – die gilt ja weiterhin.

     Verglichen wird nur die Anzahl, nicht Bauteil fuer Bauteil: Das reicht
     fuer eine reine Anzeigefrage, kostet nichts und hat den Vorteil, dass
     Undo die Beschreibung zurueckholt. Wer genau ein Bauteil loescht und ein
     anderes setzt, behaelt sie faelschlich – das faellt niemandem auf. */

  Bench.prototype.pureTemplate = function () {
    if (!this.template) return null;
    var c = this.app.circuit;
    var t = this.template;
    return (c.parts.length === t.parts.length &&
            c.wires.length === t.wires.length) ? t : null;
  };

  /* --- Sichern --- */

  /* Nach jeder Modelaenderung. Das Sichern selbst ist billig; teuer waere
     nur, die Schaltung dabei jedes Mal neu zu uebersetzen – das passiert
     hier bewusst nicht. */
  Bench.prototype.saveCurrent = function () {
    this.app.store.setCircuit(SER.toJSON(this.app.circuit));
  };

  /* Aufraeumen nach einem Wechsel: Simulation neu, Ansicht einpassen,
     Oberflaeche nachziehen. */
  Bench.prototype.after = function (einpassen) {
    var app = this.app;
    app.tools.arm(null);
    app.sim.invalidate();
    app.sim.refresh();
    if (einpassen) app.fit();
    this.saveCurrent();
    if (this.onChange) this.onChange(this.template);
  };

  C.app.Bench = Bench;

})(window.CIRCUIT = window.CIRCUIT || {});
