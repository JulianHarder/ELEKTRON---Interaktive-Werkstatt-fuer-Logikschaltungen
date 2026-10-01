/* Aenderungsbefehle. Jede Aenderung am Modell laeuft hier durch, damit Undo
   und Redo lueckenlos funktionieren.

   Statt fuer jede Aktion eine eigene Klasse zu bauen, gibt es einen einzigen
   umkehrbaren Typ: Edit. Loeschen, Einfuegen, Verbinden und Verschieben haben
   dieselbe Form – eine Liste dessen, was dazukommt, wegfaellt oder sich
   verschiebt. Das haelt die Umkehrung an genau einer Stelle korrekt. */
(function (C) {
  'use strict';

  var P   = C.model.parts;
  var ids = C.util.ids;

  function Edit(label) {
    this.label       = label || 'Änderung';
    this.addedParts  = [];
    this.addedWires  = [];
    this.removedParts = [];
    this.removedWires = [];
    this.moves  = [];   /* { id, from:{x,y}, to:{x,y} } */
    this.values = [];   /* { id, from, to } – Schalter umlegen */

    /* Wo in der Liste stand das Geloeschte? id -> Platz. Nur remove() fuellt
       das; siehe Circuit.addPartAt(), warum der Platz zaehlt. */
    this.removedAt = {};
  }

  /* Reihenfolge ist wichtig: erst abraeumen, dann aufbauen. Sonst stoesst eine
     neue Leitung auf einen Eingang, der erst im naechsten Schritt frei wird. */
  Edit.prototype.apply = function (c) {
    this.removedWires.forEach(function (w) { c.removeWire(w.id); });
    this.removedParts.forEach(function (p) { c.removePart(p.id); });
    this.addedParts.forEach(function (p) { c.addPart(p); });
    this.addedWires.forEach(function (w) { c.addWire(w); });
    this.moves.forEach(function (m) { c.movePart(m.id, m.to.x, m.to.y); });
    this.values.forEach(function (v) {
      var p = c.part(v.id); if (p) p.value = v.to;
    });
  };

  Edit.prototype.revert = function (c) {
    this.values.forEach(function (v) {
      var p = c.part(v.id); if (p) p.value = v.from;
    });
    this.moves.forEach(function (m) { c.movePart(m.id, m.from.x, m.from.y); });
    this.addedWires.forEach(function (w) { c.removeWire(w.id); });
    this.addedParts.forEach(function (p) { c.removePart(p.id); });

    /* An den alten Platz zurueck, aufsteigend – sonst verschieben die
       frueheren Plaetze die spaeteren. Ohne Platzangabe haengt es hinten an,
       wie bisher. */
    var wo = this.removedAt;
    anPlatz(this.removedParts, wo).forEach(function (p) { c.addPartAt(p, wo[p.id]); });
    anPlatz(this.removedWires, wo).forEach(function (w) { c.addWireAt(w, wo[w.id]); });
  };

  function anPlatz(liste, wo) {
    return liste.slice().sort(function (a, b) {
      var x = wo[a.id], y = wo[b.id];
      return (x === undefined ? Infinity : x) - (y === undefined ? Infinity : y);
    });
  }

  /* Hat sich die Verdrahtung geaendert – oder nur Position und Schalterwert?
     Nur im ersten Fall muss die Simulation neu uebersetzen. */
  Edit.prototype.changesStructure = function () {
    return !!(this.addedParts.length || this.removedParts.length ||
              this.addedWires.length || this.removedWires.length);
  };

  Edit.prototype.isEmpty = function () {
    return !this.addedParts.length && !this.addedWires.length &&
           !this.removedParts.length && !this.removedWires.length &&
           !this.moves.length && !this.values.length;
  };

  /* --- Fabriken --- */

  /* Ein neues Bauteil an einer bereits gerasterten Position. */
  function addPart(circuit, type, x, y) {
    var def = P.get(type);
    if (!def) return null;

    var part = { id: ids.next('p'), type: type, x: x, y: y };
    if (type === 'switch' || type === 'const' || type === 'clock') part.value = 0;

    var e = new Edit(def.name + ' platziert');
    e.addedParts.push(part);
    e.newPart = part;            /* damit der Aufrufer es gleich auswaehlen kann */
    return e;
  }

  /* Bauteile und Leitungen loeschen. Leitungen an geloeschten Bauteilen
     kommen automatisch mit – und beim Rueckgaengigmachen auch wieder zurueck. */
  function remove(circuit, partIds, wireIds) {
    var e = new Edit('Gelöscht');
    var seen = {};

    (wireIds || []).forEach(function (id) {
      var w = circuit.wire(id);
      if (w && !seen[id]) {
        seen[id] = true;
        e.removedWires.push(w);
        e.removedAt[id] = circuit.wires.indexOf(w);
      }
    });

    (partIds || []).forEach(function (id) {
      var p = circuit.part(id);
      if (!p) return;
      e.removedParts.push(p);
      e.removedAt[id] = circuit.parts.indexOf(p);
      circuit.wiresOfPart(id).forEach(function (w) {
        if (!seen[w.id]) {
          seen[w.id] = true;
          e.removedWires.push(w);
          e.removedAt[w.id] = circuit.wires.indexOf(w);
        }
      });
    });

    return e;
  }

  /* Zwei Pins verbinden. Die Pruefung liegt im Modell, hier wird sie nur
     abgefragt – so gilt dieselbe Regel egal, welches Werkzeug ruft. */
  function connect(circuit, a, b) {
    var check = circuit.checkConnect(a, b);
    if (!check.ok) return check;          /* { ok:false, reason }  */

    var e = new Edit('Verbunden');
    e.addedWires.push({ id: ids.next('w'), from: check.from, to: check.to });
    return { ok: true, edit: e };
  }

  /* Ausgewaehlte Bauteile um dx/dy verschieben. */
  function move(circuit, partIds, dx, dy) {
    var e = new Edit('Verschoben');
    partIds.forEach(function (id) {
      var p = circuit.part(id);
      if (!p) return;
      e.moves.push({ id: id, from: { x: p.x, y: p.y },
                             to:   { x: p.x + dx, y: p.y + dy } });
    });
    return e;
  }

  /* Verschieben, bei dem die Bauteile schon waehrend des Ziehens mitlaufen:
     Die Leitungen sollen live folgen, deshalb aendert das Werkzeug die
     Positionen sofort. starts haelt fest, wo es losging – daraus entsteht
     beim Loslassen der umkehrbare Befehl. */
  function moveFrom(circuit, starts) {
    var e = new Edit('Verschoben');
    starts.forEach(function (s) {
      var p = circuit.part(s.id);
      if (!p || (p.x === s.x && p.y === s.y)) return;
      e.moves.push({ id: s.id, from: { x: s.x, y: s.y }, to: { x: p.x, y: p.y } });
    });
    return e;
  }

  /* Einen Schalter umlegen – auch das ist eine Modelaenderung mit Undo. */
  function setValue(circuit, id, value) {
    var p = circuit.part(id);
    if (!p || p.value === value) return null;
    var e = new Edit('Schalter umgelegt');
    e.values.push({ id: id, from: p.value || 0, to: value });
    return e;
  }

  /* Eine Kopie einfuegen. snapshot stammt aus copy() unten und enthaelt
     Bauteile samt der Leitungen, die vollstaendig innerhalb der Auswahl liegen. */
  function paste(circuit, snapshot, dx, dy) {
    var e = new Edit('Eingefügt');
    var map = {};                                   /* alte id -> neue id */

    snapshot.parts.forEach(function (src) {
      var copy = { id: ids.next('p'), type: src.type, x: src.x + dx, y: src.y + dy };
      if (src.value !== undefined) copy.value = src.value;
      /* Die Beschriftung gehoert zum Bauteil: ohne sie verloere eine
         eingesetzte Vorlage ihre Spaltennamen in der Wahrheitstabelle. */
      if (src.label) copy.label = src.label;
      map[src.id] = copy.id;
      e.addedParts.push(copy);
    });

    snapshot.wires.forEach(function (src) {
      if (!map[src.from.part] || !map[src.to.part]) return;
      e.addedWires.push({
        id: ids.next('w'),
        from: { part: map[src.from.part], index: src.from.index },
        to:   { part: map[src.to.part],   index: src.to.index }
      });
    });

    return e;
  }

  /* Auswahl als eigenstaendiges Stueck herausloesen (nur Daten, keine Objekte
     aus der Schaltung – sonst wuerde ein spaeteres Verschieben die Kopie
     mitziehen). */
  function copy(circuit, partIds) {
    var inside = {};
    partIds.forEach(function (id) { inside[id] = true; });

    var parts = partIds.map(function (id) {
      var p = circuit.part(id);
      if (!p) return null;
      var c = { id: p.id, type: p.type, x: p.x, y: p.y };
      if (p.value !== undefined) c.value = p.value;
      if (p.label) c.label = p.label;
      return c;
    }).filter(Boolean);

    /* Nur Leitungen, deren beide Enden mitkopiert werden. */
    var wires = circuit.wires.filter(function (w) {
      return inside[w.from.part] && inside[w.to.part];
    }).map(function (w) {
      return { from: { part: w.from.part, index: w.from.index },
               to:   { part: w.to.part,   index: w.to.index } };
    });

    return { parts: parts, wires: wires };
  }

  C.model.Edit = Edit;
  C.model.commands = {
    addPart: addPart, remove: remove, connect: connect,
    move: move, moveFrom: moveFrom, setValue: setValue, paste: paste, copy: copy
  };

})(window.CIRCUIT = window.CIRCUIT || {});
