/* Register fuer Vorlagen.

   Eine Vorlage ist eine fertig verdrahtete Schaltung mit kurzer Beschreibung.
   Man waehlt sie im Menue, sie landet auf der Flaeche, und von dort baut man
   weiter. Es gibt keine Aufgabe, keine Pruefung und keine Sterne – die
   Wahrheitstabelle rechnet einfach mit, was da steht.

   Vorlagen liegen als .js-Dateien vor, die sich beim Laden selbst anmelden –
   kein fetch, kein JSON, damit das Ganze per Doppelklick laeuft. */
(function (C) {
  'use strict';

  /* Rasterweite des Vorlagenaufbaus. Beide Vielfache von 16, damit alles auf
     dem Fangraster liegt. Eine Spalte fasst das breiteste Bauteil (88) plus
     Platz fuer die Leitungen dazwischen. */
  var COL = 176;
  var ROW = 96;

  var list = [];
  var byId = {};

  /* --- Der Aufbauhelfer ---
     Die Namen ("a", "n1", "Y") gelten nur innerhalb einer Vorlage. Erst beim
     Einsetzen auf die Flaeche bekommt jedes Teil eine echte id. Dadurch
     liest sich eine Vorlage wie ein Schaltplan und nicht wie eine
     Id-Verwaltung. */

  function Builder() {
    this.parts = [];
    this.wires = [];
    this.named = {};
  }

  /* Ein Bauteil setzen. col/row sind Rasterfelder, keine Pixel. */
  Builder.prototype.add = function (name, type, col, row, label) {
    if (this.named[name]) throw new Error('Name "' + name + '" doppelt vergeben');
    var p = {
      name:  name,
      type:  type,
      x:     Math.round(col * COL / 16) * 16,
      y:     Math.round(row * ROW / 16) * 16
    };
    if (label) p.label = label;
    if (type === 'switch' || type === 'const' || type === 'clock') p.value = 0;
    this.parts.push(p);
    this.named[name] = p;
    return this;
  };

  /* Beschrifteter Schalter – wird zur Spalte links in der Wahrheitstabelle.
     Der Name ist zugleich die Beschriftung. */
  Builder.prototype.in = function (name, col, row, value) {
    this.add(name, 'switch', col, row, name);
    if (value) this.named[name].value = 1;
    return this;
  };

  /* Beschriftete Lampe – wird zur Spalte rechts in der Wahrheitstabelle. */
  Builder.prototype.out = function (name, col, row) {
    return this.add(name, 'led', col, row, name);
  };

  Builder.prototype.gate = function (name, type, col, row) {
    return this.add(name, type, col, row);
  };

  /* Kurzform fuer das haeufigste Bauteil. */
  Builder.prototype.nand = function (name, col, row) {
    return this.add(name, 'nand', col, row);
  };

  /* Verbinden: vom Ausgang des Bauteils "from" an den Eingang toIndex
     des Bauteils "to". fromIndex ist nur bei mehreren Ausgaengen noetig. */
  Builder.prototype.link = function (from, to, toIndex, fromIndex) {
    this.wires.push({
      from: from, fromIndex: fromIndex || 0,
      to:   to,   toIndex:   toIndex   || 0
    });
    return this;
  };

  /* Beide Eingaenge eines NAND an dieselbe Quelle – das ist die Umkehrung.
     Kommt so oft vor, dass es eine eigene Zeile verdient. */
  Builder.prototype.invert = function (from, to) {
    return this.link(from, to, 0).link(from, to, 1);
  };

  /* --- Anmelden --- */

  function register(def) {
    if (!def || !def.id) throw new Error('Vorlage ohne id');
    if (byId[def.id]) throw new Error('Vorlage "' + def.id + '" gibt es schon');
    if (typeof def.build !== 'function') throw new Error('Vorlage "' + def.id + '" ohne build');

    var b = new Builder();
    def.build(b);
    pruefen(def.id, b);

    var tpl = {
      id:    def.id,
      group: def.group || 'Sonstige',
      title: def.title || def.id,
      desc:  def.desc  || '',
      note:  def.note  || '',
      /* Was die Anschluesse bedeuten: { "CLK": "Takt …" }. Die Vorlagen
         benutzen die Namen aus der Elektronik – D, CLK, Cout –, und die
         sagen nur etwas, wenn irgendwo steht, wofuer sie stehen. Die
         Erklaerung gehoert zur Vorlage und nicht in eine allgemeine Liste:
         "S" heisst beim Halbaddierer Summe und beim Multiplexer Auswahl. */
      pins:  def.pins  || null,
      parts: b.parts,
      wires: b.wires
    };

    list.push(tpl);
    byId[tpl.id] = tpl;
    return tpl;
  }

  /* Tippfehler in einer Vorlage sollen sofort auffallen, nicht erst dann,
     wenn jemand sie auf die Flaeche holt. */
  function pruefen(id, b) {
    var P = C.model.parts;
    var belegt = {};

    b.parts.forEach(function (p) {
      if (!P.get(p.type)) throw new Error(id + ': unbekannter Typ "' + p.type + '"');
    });

    b.wires.forEach(function (w) {
      var from = b.named[w.from];
      var to   = b.named[w.to];
      if (!from) throw new Error(id + ': "' + w.from + '" gibt es nicht');
      if (!to)   throw new Error(id + ': "' + w.to + '" gibt es nicht');
      if (w.fromIndex >= P.pinCount(from.type, 'out')) {
        throw new Error(id + ': "' + w.from + '" hat keinen Ausgang ' + w.fromIndex);
      }
      if (w.toIndex >= P.pinCount(to.type, 'in')) {
        throw new Error(id + ': "' + w.to + '" hat keinen Eingang ' + w.toIndex);
      }
      var k = w.to + ':' + w.toIndex;
      if (belegt[k]) throw new Error(id + ': Eingang ' + k + ' doppelt belegt');
      belegt[k] = true;
    });
  }

  /* --- Einsetzen ---
     Eine Vorlage wird in genau die Form gebracht, die commands.paste()
     ohnehin schon versteht. Dadurch laeuft das Einsetzen ueber denselben
     umkehrbaren Befehl wie das Einfuegen einer Kopie – ohne einen zweiten
     Weg ins Modell, der eigene Fehler haette. Die Namen aus der Vorlage
     dienen dabei als vorlaeufige ids; paste() vergibt die echten. */

  function snapshot(tpl) {
    return {
      parts: tpl.parts.map(function (p) {
        var o = { id: p.name, type: p.type, x: p.x, y: p.y };
        if (p.value !== undefined) o.value = p.value;
        if (p.label) o.label = p.label;
        return o;
      }),
      wires: tpl.wires.map(function (w) {
        return {
          from: { part: w.from, index: w.fromIndex },
          to:   { part: w.to,   index: w.toIndex }
        };
      })
    };
  }

  /* Breite und Hoehe einer Vorlage – damit der Aufrufer weiss, wie viel
     Platz er daneben freihalten muss. */
  function size(tpl) {
    var P = C.model.parts;
    var x1 = 0, y1 = 0;
    tpl.parts.forEach(function (p) {
      var d = P.get(p.type);
      x1 = Math.max(x1, p.x + (d ? d.w : 64));
      y1 = Math.max(y1, p.y + (d ? d.h : 64));
    });
    return { w: x1, h: y1 };
  }

  /* --- Auskuenfte --- */

  function all()   { return list.slice(); }
  function get(id) { return byId[id] || null; }
  function count() { return list.length; }

  /* Gruppennamen in der Reihenfolge ihres ersten Auftretens. */
  function groups() {
    var seen = {}, out = [];
    list.forEach(function (t) {
      if (seen[t.group]) return;
      seen[t.group] = true;
      out.push(t.group);
    });
    return out;
  }

  function ofGroup(name) {
    return list.filter(function (t) { return t.group === name; });
  }

  C.templates = {
    register: register, all: all, get: get, count: count,
    groups: groups, ofGroup: ofGroup,
    snapshot: snapshot, size: size,
    COL: COL, ROW: ROW
  };

})(window.CIRCUIT = window.CIRCUIT || {});
