/* Schaltung als JSON – rein und raus.

   Wird in Etappe 4 gebraucht, um die Loesung eines Levels zu sichern, und
   ist ab Etappe 7 die Grundlage fuer Export und Import als Datei. Deshalb
   traegt das Format von Anfang an eine Versionsnummer. */
(function (C) {
  'use strict';

  var VERSION = 1;
  var ids = C.util.ids;

  function toJSON(circuit, meta) {
    var data = {
      version: VERSION,
      parts: circuit.parts.map(function (p) {
        var o = { id: p.id, type: p.type, x: p.x, y: p.y };
        if (p.value !== undefined) o.value = p.value;
        if (p.label) o.label = p.label;
        if (p.locked) o.locked = true;
        return o;
      }),
      wires: circuit.wires.map(function (w) {
        return {
          id: w.id,
          from: { part: w.from.part, index: w.from.index },
          to:   { part: w.to.part,   index: w.to.index }
        };
      })
    };
    if (meta) { Object.keys(meta).forEach(function (k) { data[k] = meta[k]; }); }
    return data;
  }

  /* Laedt in eine LEERE Schaltung. Liefert false, wenn die Daten nicht passen. */
  function fromJSON(circuit, data) {
    if (!data || data.version !== VERSION || !Array.isArray(data.parts)) return false;

    circuit.clear();

    data.parts.forEach(function (p) {
      if (!C.model.parts.get(p.type)) return;      /* unbekannter Typ: ueberspringen */
      var part = { id: p.id, type: p.type, x: p.x, y: p.y };
      if (p.value !== undefined) part.value = p.value;
      if (p.label) part.label = p.label;
      if (p.locked) part.locked = true;
      circuit.addPart(part);
      ids.observe(p.id);
    });

    (data.wires || []).forEach(function (w) {
      if (!circuit.part(w.from.part) || !circuit.part(w.to.part)) return;
      /* Doppelbelegung eines Eingangs waere ein kaputter Stand – dann lieber
         die Leitung weglassen als die Regel zu brechen. */
      if (circuit.wireIntoPin(w.to.part, w.to.index)) return;
      circuit.addWire({
        id: w.id,
        from: { part: w.from.part, index: w.from.index },
        to:   { part: w.to.part,   index: w.to.index }
      });
      ids.observe(w.id);
    });

    return true;
  }

  C.model.serialize = { toJSON: toJSON, fromJSON: fromJSON, VERSION: VERSION };

})(window.CIRCUIT = window.CIRCUIT || {});
