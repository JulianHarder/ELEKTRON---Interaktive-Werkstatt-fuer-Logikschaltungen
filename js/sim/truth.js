/* Wahrheitstabelle aus der Schaltung selbst.

   Es gibt keine vorgegebene Aufgabe mehr, gegen die geprueft wird. Statt
   dessen wird genommen, was dasteht: jeder Schalter ist eine Spalte links,
   jede Lampe eine Spalte rechts. Dann werden alle Kombinationen der
   Schalter durchgerechnet.

   Ist etwas ausgewaehlt, zaehlen nur die ausgewaehlten Schalter und Lampen
   als Spalten. So bekommt man bei zwei Schaltungen nebeneinander die Tabelle
   der einen, ohne die andere wegraeumen zu muessen. Die nicht ausgewaehlten
   Schalter behalten dabei ihre jetzige Stellung – die Tabelle beantwortet
   also: "Was macht dieser Teil, waehrend der Rest so steht wie gerade?"

   Drei Grenzen sind eingebaut:

   1. Bei vielen Schaltern waechst die Tabelle auf 2^n Zeilen. Ab MAX_INPUTS
      wird deshalb nur noch die aktuelle Stellung gezeigt.
   2. Schaltungen mit Rueckkopplung (Latches) haben gar keine
      Wahrheitstabelle – ihr Ausgang haengt davon ab, was vorher war. Das
      wird erkannt und gesagt, statt eine Tabelle zu zeigen, die luegt.
   3. Dasselbe gilt fuer einen laufenden Takt: Er wechselt von selbst, also
      wechselt auch die Tabelle – sie wuerde im Sekundentakt etwas anderes
      behaupten. Haelt man den Takt an, steht er fest wie eine Konstante und
      die Tabelle gilt wieder.

   Eine Konstante bekommt bewusst keine Spalte. Sie gehoert zur Schaltung und
   nicht zur Eingabe; eine Spalte haette in jeder Zeile denselben Wert. Ihr
   Wert steht auf dem Bauteil und wirkt sich auf die Tabelle aus, wie jede
   andere feste Verdrahtung auch.

   Die Schalterstellung des Nutzers wird vorher gesichert und danach
   wiederhergestellt: das Rechnen darf die Schaltung nicht umstellen. */
(function (C) {
  'use strict';

  var MAX_INPUTS = 6;          /* 2^6 = 64 Zeilen – darueber wird es unleserlich */

  /* --- Welche Bauteile bilden die Spalten? ---
     Die Reihenfolge folgt der Anordnung auf der Flaeche: was oben liegt,
     steht links in der Tabelle. */

  function spalten(circuit, type, nurIds) {
    var alle = circuit.parts.filter(function (p) { return p.type === type; });

    /* Enthaelt die Auswahl ueberhaupt Bauteile dieser Art? Wenn nicht, waere
       die Spalte leer – dann ist offensichtlich nicht gemeint, sie
       wegzulassen, und es bleibt bei allen. Wer nur ein paar NANDs markiert,
       sieht so weiterhin die ganze Tabelle. */
    if (nurIds) {
      var gewaehlt = alle.filter(function (p) { return nurIds[p.id]; });
      if (gewaehlt.length) alle = gewaehlt;
    }

    return alle.slice()
      .sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });
  }

  /* --- Wie die Spalten heissen ---

     Ein Bauteil mit eigener Beschriftung behaelt sie – die Vorlagen bringen
     sprechende Namen mit (S fuer Summe, C fuer Uebertrag), und die sind mehr
     wert als ein durchnummerierter Buchstabe.

     Alles andere wird nach seiner Lage auf der Flaeche benannt, von oben
     nach unten:

       Schalter   A, B, C … Z, AA, AB …   wie die Spalten einer Tabelle
       Lampen     Y0, Y1, Y2 …            immer mit Nummer, auch bei einer

     Schalternamen enthalten dabei nie eine Ziffer. Das ist Absicht: Ziffern
     bleiben der Unterscheidung gleichnamiger Bauteile vorbehalten (A1, A2,
     siehe eindeutig()). Kaemen beide Nummerierungen durcheinander, wuesste
     man bei "A1" nicht, ob der 27. Schalter gemeint ist oder der zweite von
     zweien, die beide "A" heissen. */

  function benennen(parts, kind) {
    var frei = 0;

    var namen = parts.map(function (p) {
      if (p.label) return p.label;
      var name = kind === 'in' ? spalte(frei) : 'Y' + frei;
      frei++;
      return name;
    });

    return eindeutig(namen).map(function (name, i) {
      return { id: parts[i].id, name: name, part: parts[i] };
    });
  }

  /* A, B, C … Z, AA, AB … AZ, BA … – wie die Spaltenkoepfe einer Tabelle. */
  function spalte(i) {
    var s = '';
    var n = i + 1;
    while (n > 0) {
      s = String.fromCharCode(65 + (n - 1) % 26) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  /* Setzt man dieselbe Vorlage zweimal ein, heissen zwei Schalter "A".
     Unveraendert staenden dann zwei gleich benannte Spalten nebeneinander und
     man wuesste nicht, welche zu welchem Bauteil gehoert. Deshalb bekommen
     mehrfach vergebene Namen eine laufende Nummer: A1 und A2.

     Einzelne nicht – sonst hiesse ein ganz normales A ploetzlich A1. */
  function eindeutig(namen) {
    var anzahl = {};
    namen.forEach(function (n) { anzahl[n] = (anzahl[n] || 0) + 1; });

    var lauf = {};
    return namen.map(function (n) {
      if (anzahl[n] < 2) return n;
      lauf[n] = (lauf[n] || 0) + 1;
      return n + lauf[n];
    });
  }

  /* Laeuft ein Takt, der sich auf die Schaltung auswirkt?

     Zwei Faelle zaehlen ausdruecklich nicht: Ein angehaltener Takt liegt fest
     wie eine Konstante, und ein Taktbauteil, das noch frei auf der Flaeche
     liegt, blinkt zwar vor sich hin, aendert aber nichts an den Ausgaengen.
     In beiden Faellen gilt die Tabelle.

     Clock.usedIn() reicht hier nicht: Es fragt nur, ob ueberhaupt ein
     Taktbauteil da ist (das genuegt dem Runner, damit es blinkt). Hier
     zaehlt, ob eine Leitung davon abgeht. */
  function taktLaeuft(runner) {
    var clk = runner.clock;
    if (!clk || !clk.running) return false;

    var c = runner.circuit;
    for (var i = 0; i < c.parts.length; i++) {
      var p = c.parts[i];
      if (p.type === 'clock' && c.fanOut(p.id, 0) > 0) return true;
    }
    return false;
  }

  function zaehle(circuit, type) {
    return circuit.parts.filter(function (p) { return p.type === type; }).length;
  }

  /* --- Rueckkopplung finden ---
     Ein Zyklus in der Netzliste heisst: der Ausgang eines Gatters wirkt
     ueber Umwege auf seinen eigenen Eingang zurueck. Genau das macht einen
     Speicher aus – und genau dann gibt es keine Wahrheitstabelle.

     Gesucht wird mit Tiefensuche ueber die Gatter. farbe[i] ist 0 = noch
     nicht angefasst, 1 = liegt gerade auf dem Weg, 2 = fertig. Trifft der
     Weg auf ein Gatter mit der 1, liegt ein Zyklus vor. */

  function hatRueckkopplung(net) {
    var n = net.gateCount;
    if (!n) return false;

    /* Welches Gatter macht welches Signal? */
    var macht = {};
    for (var i = 0; i < n; i++) macht[net.gy[i]] = i;

    var farbe = new Uint8Array(n);
    var stapel = [];

    for (var start = 0; start < n; start++) {
      if (farbe[start]) continue;
      stapel.push({ g: start, schritt: 0 });

      while (stapel.length) {
        var oben = stapel[stapel.length - 1];
        if (oben.schritt === 0) farbe[oben.g] = 1;

        if (oben.schritt > 1) {                 /* beide Eingaenge erledigt */
          farbe[oben.g] = 2;
          stapel.pop();
          continue;
        }

        var sig = oben.schritt === 0 ? net.ga[oben.g] : net.gb[oben.g];
        oben.schritt++;

        var vor = macht[sig];
        if (vor === undefined) continue;        /* Quelle oder feste 0 */
        if (farbe[vor] === 1) return true;      /* zurueck auf den eigenen Weg */
        if (farbe[vor] === 0) stapel.push({ g: vor, schritt: 0 });
      }
    }
    return false;
  }

  /* --- Eine Zeile rechnen ---
     Vor jeder Zeile wird die Engine zurueckgesetzt, sonst traegt eine
     Rueckkopplung aus der vorigen Zeile ihr Ergebnis weiter. */

  function zeile(runner, ins, outs, werte) {
    runner.engine.reset();
    ins.forEach(function (s, i) { s.part.value = werte[i]; });
    runner.applyInputs();
    var stabil = runner.engine.settle();

    return {
      in:     werte.slice(),
      out:    outs.map(function (s) { return runner.pinValue(s.id, 'in', 0); }),
      stable: stabil
    };
  }

  /* --- Die Tabelle --- */

  /* auswahl ist eine Liste von Bauteil-ids oder null fuer "alles". */
  function build(runner, auswahl) {
    var c = runner.circuit;
    runner.build();

    var nurIds = null;
    if (auswahl && auswahl.length) {
      nurIds = {};
      auswahl.forEach(function (id) { nurIds[id] = true; });
    }

    var ins  = benennen(spalten(c, 'switch', nurIds), 'in');
    var outs = benennen(spalten(c, 'led',    nurIds), 'out');

    var res = {
      inputs:   ins,
      outputs:  outs,
      rows:     [],
      current:  ins.map(function (s) { return s.part.value || 0; }),
      nand:     runner.nandCount(),
      feedback: false,
      tooMany:  false,
      clocked:  false,
      full:     false,
      /* Nur wahr, wenn die Auswahl die Tabelle wirklich verkleinert hat. */
      gefiltert: !!nurIds &&
                 (ins.length  < zaehle(c, 'switch') ||
                  outs.length < zaehle(c, 'led'))
    };

    if (!ins.length || !outs.length) return res;

    res.feedback = hatRueckkopplung(runner.net);
    res.tooMany  = ins.length > MAX_INPUTS;
    res.clocked  = taktLaeuft(runner);

    /* Alle drei sind Gruende, nicht alle Kombinationen durchzuspielen: beim
       Speicher waere das Ergebnis irrefuehrend, beim laufenden Takt nur
       einen Augenblick lang gueltig, bei vielen Schaltern schlicht zu lang.
       Dann bleibt die Zeile, die gerade gilt. */
    if (res.feedback || res.tooMany || res.clocked) {
      res.rows = [jetzt(runner, ins, outs)];
      return res;
    }

    var gesichert = res.current.slice();
    var n = ins.length;
    var zeilen = 1 << n;

    for (var k = 0; k < zeilen; k++) {
      var werte = [];
      /* Das erste Bit steht links – wie man eine Tabelle liest. */
      for (var b = 0; b < n; b++) werte.push((k >> (n - 1 - b)) & 1);
      res.rows.push(zeile(runner, ins, outs, werte));
    }

    /* Stellung des Nutzers zurueckholen. */
    ins.forEach(function (s, i) { s.part.value = gesichert[i]; });
    runner.engine.reset();
    runner.applyInputs();
    runner.engine.settle();

    res.full = true;
    return res;
  }

  /* Die eine Zeile, die zur jetzigen Schalterstellung gehoert – ohne die
     Engine anzufassen, damit ein laufender Takt nicht stolpert. */
  function jetzt(runner, ins, outs) {
    return {
      in:  ins.map(function (s) { return s.part.value || 0; }),
      out: outs.map(function (s) { return runner.pinValue(s.id, 'in', 0); }),
      stable: !runner.engine.oscillating
    };
  }

  C.sim.truth = { build: build, MAX_INPUTS: MAX_INPUTS,
                  hatRueckkopplung: hatRueckkopplung };

})(window.CIRCUIT = window.CIRCUIT || {});
