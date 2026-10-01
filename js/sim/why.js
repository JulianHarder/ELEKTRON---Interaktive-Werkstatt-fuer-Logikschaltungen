/* "Warum leuchtet das?" – die Begruendung rueckwaerts durch die Schaltung.

   Die Wahrheitstabelle sagt, WAS die Schaltung tut. Hier steht, WARUM sie
   es im Augenblick tut: Von einer Lampe aus wird rueckwaerts gesucht, welche
   Schalter ihren Wert gerade bestimmen.

   Der Trick ist, dass oft ein einziger Eingang genuegt. Ein OR, das 1
   ausgibt, braucht dafuer nur einen seiner Eingaenge auf 1 – der andere ist
   unbeteiligt, egal wie er steht. Dadurch schrumpft die Begruendung auf die
   paar Schalter, auf die es wirklich ankommt, statt alles aufzuspannen, was
   irgendwie mit der Lampe verbunden ist.

   Das ist ausdruecklich EIN ausreichender Grund, nicht der einzige. Stehen
   beide Eingaenge eines OR auf 1, haette jeder allein gereicht; genannt wird
   der erste. Deshalb heisst es in der Oberflaeche "dafuer genuegt" und nicht
   "nur deshalb".

   Gerechnet wird ueber das Modell, nicht ueber die Netzliste: Die ist flach
   aus NAND und kennt das AND des Nutzers gar nicht mehr. Die Werte kommen
   vom Runner, der sie ohnehin fuer die Darstellung liefert.

   Benannt wird mit genau den Namen, unter denen Schalter und Lampen auch in
   der Wahrheitstabelle und auf der Flaeche stehen (env.captions). Ein Gatter
   mittendrin hat keinen Eigennamen und traegt seinen Gattungsnamen; wo es
   liegt, zeigt die markierte Leitung. */
(function (C) {
  'use strict';

  var P = C.model.parts;

  /* Grenzen gegen die Ausuferung. Ein Weg, der sich mehrfach verzweigt und
     wieder zusammenlaeuft, kann als Baum sehr viel groesser werden als die
     Schaltung selbst – gezaehlt wird deshalb, nicht geschaetzt. */
  var MAX_NODES = 60;
  var MAX_DEPTH = 24;

  /* --- Wer ist schuld? ---

     Welche Eingaenge eines Gatters bestimmen seinen Ausgang so, wie er
     gerade steht? Bei einem Gatter mit einem "dominanten" Pegel genuegt ein
     einziger Eingang, sonst zaehlen alle:

       NAND  Ausgang 1  <-  eine 0 genuegt        Ausgang 0  <-  beide
       AND   Ausgang 0  <-  eine 0 genuegt        Ausgang 1  <-  beide
       OR    Ausgang 1  <-  eine 1 genuegt        Ausgang 0  <-  beide
       NOR   Ausgang 0  <-  eine 1 genuegt        Ausgang 1  <-  beide
       XOR, XNOR, NOT   immer alle

     XOR hat keinen dominanten Pegel: Bei ihm zaehlt jeder Eingang immer
     mit, weil sein Ausgang von beiden zugleich abhaengt. */

  function schuldige(type, v, werte) {
    switch (type) {
      case 'nand': return v ? ersteMit(werte, 0) : alle(werte);
      case 'and':  return v ? alle(werte) : ersteMit(werte, 0);
      case 'or':   return v ? ersteMit(werte, 1) : alle(werte);
      case 'nor':  return v ? alle(werte) : ersteMit(werte, 1);
      default:     return alle(werte);        /* not, xor, xnor */
    }
  }

  function alle(werte) {
    var out = [];
    for (var i = 0; i < werte.length; i++) out.push(i);
    return out;
  }

  /* Der erste Eingang mit diesem Wert.

     Gibt es keinen, passt der Ausgang nicht zu seinen Eingaengen – in
     Zeitlupe ist das der Normalfall, weil ein Gatter eine Gatterlaufzeit
     hinterherhinkt. Dann zaehlen alle Eingaenge; die Begruendung wird
     weitlaeufiger, bleibt aber richtig. */
  function ersteMit(werte, gesucht) {
    for (var i = 0; i < werte.length; i++) if (werte[i] === gesucht) return [i];
    return alle(werte);
  }

  /* --- Der Name eines Bauteils ---

     captions ordnet jedem Schalter und jeder Lampe den Namen zu, unter dem
     sie in der Wahrheitstabelle steht – A, B, Y0, oder bei den Vorlagen die
     Fachnamen D, CLK, Cout. Nur so heisst dasselbe Bauteil hier, in der
     Tabelle und auf der Flaeche gleich.

     Fuer ein Gatter gibt es keinen solchen Namen, und einen zu erfinden
     waere eine zweite Benennung neben der der Tabelle. Es traegt deshalb
     seinen Gattungsnamen. */

  function nameVon(part, captions) {
    var c = captions ? captions[part.id] : null;
    if (c) return c;
    if (part.label) return part.label;
    var d = P.get(part.type);
    return d ? d.name : part.type;
  }

  /* --- Die Suche --- */

  /* Liefert null, wenn es nichts zu erklaeren gibt – weil das Bauteil keine
     Lampe ist, oder weil an der Lampe gar nichts haengt. Der zweite Fall
     sieht man ihr an: Da ist keine Leitung, also bleibt sie dunkel. Ein
     Kasten, der das noch einmal aufschreibt, waere nur im Weg.

     Sonst: { name, value, root, quellen, parts, wires, offen, loop, deep } */
  function explain(circuit, sim, lampId, captions) {
    var lamp = circuit.part(lampId);
    if (!lamp || lamp.type !== 'led') return null;

    var res = {
      name:    nameVon(lamp, captions),
      value:   sim.pinValue(lampId, 'in', 0),
      root:    null,
      quellen: [],            /* Schalter, Konstanten, Takt – die Begruendung */
      parts:   {},            /* alles auf dem Weg, fuer die Darstellung */
      wires:   {},
      offen:   false,         /* ein Gatter-Eingang unterwegs ist unbelegt */
      loop:    false,         /* der Weg kam auf sich selbst zurueck */
      deep:    false          /* abgebrochen, zu gross */
    };
    res.parts[lampId] = true;

    var w = circuit.wireIntoPin(lampId, 0);
    if (!w) return null;

    var st = {
      circuit: circuit, sim: sim, captions: captions, res: res,
      aufWeg: {},             /* liegt dieses Bauteil gerade auf dem Weg? */
      zahl: 0
    };
    res.wires[w.id] = true;
    res.root = knoten(st, w.from.part, w.from.index, 0);

    /* Haengt die Leitung ins Leere, gibt es ebenfalls nichts zu sagen. */
    return res.root ? res : null;
  }

  /* Ein Knoten des Begruendungsbaums. art ist 'quelle', 'gate', 'loop'
     oder 'offen'. */
  function knoten(st, partId, outIndex, tiefe) {
    var part = st.circuit.part(partId);
    if (!part) return null;

    st.res.parts[partId] = true;
    var n = {
      art:   'gate',
      part:  part,
      name:  nameVon(part, st.captions),
      value: st.sim.pinValue(partId, 'out', outIndex),
      kids:  []
    };

    if (C.sim.isSource(part.type)) {
      n.art = 'quelle';
      merkeQuelle(st, n);
      return n;
    }

    /* Rueckkopplung: Der Weg ist dort angekommen, wo er herkam. Weiter
       zurueck fuehrt hier nichts – der Wert steht, weil er vorher schon
       stand. Genau das macht einen Speicher aus. */
    if (st.aufWeg[partId]) { n.art = 'loop'; st.res.loop = true; return n; }

    if (st.zahl >= MAX_NODES || tiefe >= MAX_DEPTH) { st.res.deep = true; return n; }
    st.zahl++;
    st.aufWeg[partId] = true;

    var anzahl = P.pinCount(part.type, 'in');
    var werte = [];
    for (var i = 0; i < anzahl; i++) werte.push(st.sim.pinValue(partId, 'in', i));

    schuldige(part.type, n.value, werte).forEach(function (i) {
      var w = st.circuit.wireIntoPin(partId, i);
      if (!w) { n.kids.push(offen(st, part, i)); return; }
      st.res.wires[w.id] = true;
      var kid = knoten(st, w.from.part, w.from.index, tiefe + 1);
      if (kid) n.kids.push(kid);
    });

    /* Nur solange der Weg hier entlanglaeuft. Danach darf dasselbe Gatter
       auf einem anderen Ast wieder vorkommen – das ist keine Rueckkopplung,
       sondern ein Signal, das an zwei Stellen gebraucht wird. */
    st.aufWeg[partId] = false;
    return n;
  }

  /* Ein Eingang, an dem nichts haengt. Er liegt auf 0, wie ein nicht
     angeschlossener Draht – und genau das ist dann oft die Erklaerung. */
  function offen(st, part, index) {
    st.res.offen = true;
    var d = P.get(part.type);
    var pin = d && d.ins[index] ? d.ins[index].name : '';
    return { art: 'offen', part: part, pin: pin, name: '', value: 0, kids: [] };
  }

  /* Dieselbe Quelle kann an mehreren Stellen gebraucht werden – in der
     Aufzaehlung steht sie trotzdem nur einmal. */
  function merkeQuelle(st, n) {
    var liste = st.res.quellen;
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].id === n.part.id) return;
    }
    liste.push({ id: n.part.id, name: n.name, value: n.value, type: n.part.type });
  }

  C.sim.why = { explain: explain, MAX_NODES: MAX_NODES, MAX_DEPTH: MAX_DEPTH };

})(window.CIRCUIT = window.CIRCUIT || {});
