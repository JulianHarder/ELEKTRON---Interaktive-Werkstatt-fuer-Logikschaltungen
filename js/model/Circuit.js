/* Die Schaltung: Bauteile und Leitungen als reine Daten.

   Diese Datei weiss nichts vom Zeichnen und nichts vom Rechnen. Sie kennt nur
   die Regeln, welche Verbindung erlaubt ist. Geaendert wird sie ausschliesslich
   ueber commands.js, damit Undo/Redo lueckenlos bleibt. */
(function (C) {
  'use strict';

  var P   = C.model.parts;
  var ids = C.util.ids;

  /* Ein Pin wird ueberall als { part: id, kind: 'in'|'out', index: n } benannt. */
  function pinKey(ref) { return ref.part + ':' + ref.kind + ':' + ref.index; }

  function Circuit() {
    this.parts = [];
    this.wires = [];
    this._part = {};        /* id -> Bauteil */
    this._wire = {};        /* id -> Leitung */

    /* Zwei Verzeichnisse ueber die Pins. Ohne sie muesste jede Frage nach
       "was haengt an diesem Eingang?" alle Leitungen durchsuchen – beim
       Uebersetzen einmal pro Pin, also quadratisch. */
    this._into = {};        /* "partId:index" -> die Leitung in diesen Eingang */
    this._from = {};        /* "partId:index" -> Liste der Leitungen aus diesem Ausgang */
  }

  function key(ref) { return ref.part + ':' + ref.index; }

  /* --- Bauteile --- */

  Circuit.prototype.part = function (id) { return this._part[id] || null; };

  Circuit.prototype.addPart = function (part) {
    if (!part.id) part.id = ids.next('p');
    if (this._part[part.id]) return this._part[part.id];
    ids.observe(part.id);
    this._part[part.id] = part;
    this.parts.push(part);
    return part;
  };

  /* Bauteil an einer bestimmten Stelle der Liste einsetzen.

     Nur fuer Undo. Die Reihenfolge ist nicht bloss Kosmetik: compile.js baut
     die Netzliste in genau dieser Reihenfolge, und Engine.warmUp() entscheidet
     daran, welchen Zustand eine ueber Kreuz verbundene Schaltung beim
     Kaltstart annimmt. Landet ein zurueckgeholtes Bauteil am Ende statt an
     seinem alten Platz, kommt ein gesetzter Latch nach Loeschen und Undo mit
     dem umgekehrten Wert zurueck. */
  Circuit.prototype.addPartAt = function (part, index) {
    var p = this.addPart(part);
    if (p !== part || typeof index !== 'number') return p;
    return setzeAn(this.parts, p, index);
  };

  Circuit.prototype.addWireAt = function (wire, index) {
    var w = this.addWire(wire);
    if (w !== wire || typeof index !== 'number') return w;
    return setzeAn(this.wires, w, index);
  };

  /* addPart/addWire haengen hinten an – von dort an den gewuenschten Platz. */
  function setzeAn(liste, eintrag, index) {
    var jetzt = liste.indexOf(eintrag);
    if (jetzt < 0 || jetzt === index || index < 0 || index >= liste.length) return eintrag;
    liste.splice(jetzt, 1);
    liste.splice(index, 0, eintrag);
    return eintrag;
  }

  Circuit.prototype.removePart = function (id) {
    var part = this._part[id];
    if (!part) return null;
    delete this._part[id];
    this.parts.splice(this.parts.indexOf(part), 1);
    return part;
  };

  Circuit.prototype.movePart = function (id, x, y) {
    var part = this._part[id];
    if (!part) return;
    part.x = x;
    part.y = y;
  };

  /* --- Leitungen --- */

  Circuit.prototype.wire = function (id) { return this._wire[id] || null; };

  Circuit.prototype.addWire = function (wire) {
    if (!wire.id) wire.id = ids.next('w');
    if (this._wire[wire.id]) return this._wire[wire.id];
    ids.observe(wire.id);
    this._wire[wire.id] = wire;
    this.wires.push(wire);

    this._into[key(wire.to)] = wire;
    var fk = key(wire.from);
    (this._from[fk] || (this._from[fk] = [])).push(wire);
    return wire;
  };

  Circuit.prototype.removeWire = function (id) {
    var wire = this._wire[id];
    if (!wire) return null;
    delete this._wire[id];
    this.wires.splice(this.wires.indexOf(wire), 1);

    delete this._into[key(wire.to)];
    var list = this._from[key(wire.from)];
    if (list) {
      var i = list.indexOf(wire);
      if (i >= 0) list.splice(i, 1);
      if (!list.length) delete this._from[key(wire.from)];
    }
    return wire;
  };

  /* Alle Leitungen, die an einem Bauteil haengen – egal an welchem Pin. */
  Circuit.prototype.wiresOfPart = function (partId) {
    return this.wires.filter(function (w) {
      return w.from.part === partId || w.to.part === partId;
    });
  };

  /* Die eine Leitung, die diesen Eingang speist (Eingaenge nehmen nur eine). */
  Circuit.prototype.wireIntoPin = function (partId, index) {
    return this._into[partId + ':' + index] || null;
  };

  /* Wie viele Leitungen gehen von diesem Ausgang ab? (Fan-Out ist erlaubt.) */
  Circuit.prototype.fanOut = function (partId, index) {
    var list = this._from[partId + ':' + index];
    return list ? list.length : 0;
  };

  /* Erster freier Eingang eines Bauteils – fuer "Leitung aufs Gatter fallen lassen". */
  Circuit.prototype.freeInput = function (partId) {
    var part = this._part[partId];
    if (!part) return -1;
    var n = P.pinCount(part.type, 'in');
    for (var i = 0; i < n; i++) {
      if (!this.wireIntoPin(partId, i)) return i;
    }
    return -1;
  };

  /* --- Verbindungsregeln ---
     Liefert { ok:true, from, to } oder { ok:false, reason: 'Text' }.
     Die Reihenfolge der beiden Pins ist egal: Ausgang und Eingang werden
     selbst sortiert, damit man in beide Richtungen ziehen kann. */
  Circuit.prototype.checkConnect = function (a, b) {
    if (!a || !b) return no('Da ist kein Anschluss.');

    if (a.kind === b.kind) {
      return no(a.kind === 'out'
        ? 'Zwei Ausgänge lassen sich nicht verbinden – ein Ausgang braucht einen Eingang.'
        : 'Zwei Eingänge lassen sich nicht verbinden – einer davon muss ein Ausgang sein.');
    }

    var from = a.kind === 'out' ? a : b;
    var to   = a.kind === 'out' ? b : a;

    var belegt = this.wireIntoPin(to.part, to.index);
    if (belegt) return no('Dieser Eingang ist schon belegt. Ein Eingang nimmt genau ein Signal.');

    if (this.findWire(from, to)) return no('Diese Leitung gibt es schon.');

    return { ok: true, from: { part: from.part, index: from.index },
                       to:   { part: to.part,   index: to.index } };
  };

  Circuit.prototype.findWire = function (from, to) {
    var w = this._into[key(to)];
    return (w && w.from.part === from.part && w.from.index === from.index) ? w : null;
  };

  /* Ausgaenge, von denen mehr als eine Leitung abgeht – fuer die Knoten. */
  Circuit.prototype.branchPoints = function () {
    var out = [];
    var from = this._from;
    Object.keys(from).forEach(function (k) {
      if (from[k].length < 2) return;
      var sep = k.lastIndexOf(':');
      out.push({ part: k.slice(0, sep), index: +k.slice(sep + 1) });
    });
    return out;
  };

  function no(reason) { return { ok: false, reason: reason }; }

  /* --- Auskuenfte --- */

  /* Alles loeschen. Die Verzeichnisse muessen mit – sonst zeigen sie auf
     Leitungen, die es nicht mehr gibt. */
  Circuit.prototype.clear = function () {
    this.parts.length = 0;
    this.wires.length = 0;
    this._part = {};
    this._wire = {};
    this._into = {};
    this._from = {};
  };

  Circuit.prototype.isEmpty = function () { return this.parts.length === 0; };

  /* Weltrechteck aller Bauteile – fuer "Ansicht einpassen". */
  Circuit.prototype.bounds = function () {
    if (!this.parts.length) return { x: -160, y: -120, w: 320, h: 240 };
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    this.parts.forEach(function (p) {
      var b = P.bounds(p);
      x0 = Math.min(x0, b.x);          y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.w);    y1 = Math.max(y1, b.y + b.h);
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  C.model.Circuit = Circuit;
  C.model.pinKey = pinKey;

})(window.CIRCUIT = window.CIRCUIT || {});
