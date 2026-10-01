/* Der Tabellen-, Tooltip- und Hinweiszeilen-Teil der App.

   Steht in einer eigenen Datei, damit App.js unter der 350-Zeilen-Marke aus
   CLAUDE.md bleibt. Es sind bewusst weiterhin Methoden von App: sie arbeiten
   mit denselben Teilen (Karte, Kopfzeile, Simulation) und waeren als eigenes
   Objekt nur eine zusaetzliche Schicht ohne Nutzen.
   Diese Datei muss nach App.js geladen werden. */
(function (C) {
  'use strict';

  var App = C.app.App;
  var D   = C.util.dom;

  /* --- Vorlage eingesetzt oder Flaeche geleert ---

     Die Kopfleiste bleibt dabei unberuehrt: Dort steht dauerhaft der Name des
     Programms. Womit man gerade arbeitet, sagt die Karte rechts – und auch
     nur so lange, wie dort wirklich die Vorlage steht. */

  App.prototype.onBenchChange = function () {
    this.setHint(null);
    /* Auch die Fussleiste nachziehen: Ob "Leeren" anklickbar ist, haengt
       daran, ob etwas auf der Flaeche liegt – und das aendert sich hier.
       Beim Start laeuft updateHistoryButtons() sonst, bevor die gesicherte
       Schaltung ueberhaupt geladen ist, und der Knopf bliebe grau. */
    this.updateHistoryButtons();
    this.afterSim();
  };

  /* Flaeche leeren. Der Hinweis kommt nach dem Befehl, weil der ueber
     onBenchChange die Hinweiszeile zuruecksetzt. */
  App.prototype.wipe = function () {
    if (!this.bench.clear()) return;
    this.setHint('Fläche geleert. <b>Strg+Z</b> holt alles zurück.');
  };

  /* --- Eine Vorlage anwaehlen ---
     Liegt schon etwas auf der Flaeche, wird gefragt: ersetzen oder
     danebenstellen? Auf leerer Flaeche gibt es nichts zu entscheiden. */

  App.prototype.pickTemplate = function (id) {
    var self = this;
    var tpl = C.templates.get(id);
    if (!tpl) return;

    if (this.circuit.isEmpty()) {
      this.bench.insert(id, true);
      return;
    }

    this.ask.open({
      title: tpl.title + ' einsetzen',
      text: 'Auf der Fläche liegt schon etwas.',
      options: [
        { label: 'Dazusetzen', value: 'add', icon: 'paste', primary: true,
          note: 'Die Vorlage kommt rechts daneben, alles andere bleibt stehen.' },
        { label: 'Fläche ersetzen', value: 'replace', icon: 'trash',
          note: 'Das Vorhandene wird gelöscht.' }
      ]
    }, function (wahl) {
      if (wahl) self.bench.insert(id, wahl === 'replace');
    });
  };

  /* Zeigt beim Ueberfahren, was ein Bauteil tut. Waehrend man zieht, baut
     oder verbindet, stoert der Tooltip nur – dann bleibt er weg. */
  App.prototype.updateTooltip = function (ev) {
    var t = this.tools;
    var stoerend = t.armedType || t.connect || t.drag || t.rubber || this.nav.panning;
    var part = stoerend ? null : t.hover.part;

    if (!part) { this.tip.hide(); return; }
    this.tip.show(part.type, ev.raw.clientX, ev.raw.clientY, anschluss(this, part));
  };

  /* Was bedeutet die Beschriftung dieses Bauteils? Steht in der Vorlage, aus
     der es stammt – und nur, solange genau die auf der Flaeche liegt. Sobald
     eigene Bauteile dazukommen, ist die Zuordnung nicht mehr sicher. */
  function anschluss(app, part) {
    if (!part.label) return null;
    var tpl = app.bench.pureTemplate();
    var text = tpl && tpl.pins ? tpl.pins[part.label] : null;
    return text ? { name: part.label, text: text } : null;
  }

  /* --- Tabelle nachfuehren --- */

  /* Wird nach jedem Rechenschritt gerufen. */
  App.prototype.afterSim = function () {
    if (!this.card) return;

    /* Sicherheitsnetz: die Auswertung darf sich nicht selbst aufrufen.
       truth.build() stellt die Engine um und loest dabei wieder onUpdate
       aus – ohne diese Sperre liefe das endlos. */
    if (this._inAfterSim) return;
    this._inAfterSim = true;
    try {
      /* Nur eine mit Umschalt aufgezogene Auswahl schrumpft die Tabelle auf
         ihre Spalten zusammen. Ein einfacher Klick auf ein Bauteil tut es
         nicht – sonst baute sich die Tabelle bei jedem Anklicken um.
         pureTemplate() liefert null, sobald eigene Bauteile dazugekommen
         sind – dann faellt die Beschreibung weg. */
      var sel = this.selection;
      var auswahl = (sel.byRubber && !sel.isEmpty()) ? sel.partIds() : null;

      var data = C.sim.truth.build(this.sim, auswahl);
      /* Dieselben Namen auf die Flaeche schreiben, unter denen die Bauteile
         in der Tabelle stehen – sonst weiss man nicht, welcher Schalter
         welche Spalte ist. */
      this.env.captions = namenJeBauteil(data, this.circuit);
      /* Erst danach: Die Begruendung benutzt genau diese Namen. Und sie
         liest Werte aus der Engine, die truth.build() beim Durchrechnen
         umstellt und erst am Ende wieder herrichtet. */
      this.env.why = this.whyData();
      this.card.update(data, this.bench.pureTemplate(), this.env.why);
    } finally {
      this._inAfterSim = false;
    }
  };

  /* --- "Warum leuchtet das?" ---

     Angeklickt wird eine Lampe, und zwar genau eine: Die Frage lautet
     "warum leuchtet DAS", nicht "warum leuchtet irgendetwas davon". Ein
     einfacher Klick genuegt – ein eigener Knopf waere ein Modus mehr, und
     Modi soll es keine geben.

     Ein aufgezogener Rahmen zaehlt ausdruecklich nicht: Der filtert die
     Wahrheitstabelle, und beides zugleich waere eine Karte, die zwei
     verschiedene Fragen beantwortet. */

  App.prototype.whyData = function () {
    var sel = this.selection;
    if (sel.byRubber) return null;

    var ids = sel.partIds();
    if (ids.length !== 1 || sel.wireIds().length) return null;

    var part = this.circuit.part(ids[0]);
    if (!part || part.type !== 'led') return null;

    return C.sim.why.explain(this.circuit, this.sim, part.id, this.env.captions);
  };


  /* --- Die Hinweiszeile ---

     Steht hier und nicht in App.js, damit die unter der 350-Zeilen-Marke aus
     CLAUDE.md bleibt. Sie gehoert ohnehin zu demselben Nachfuehren wie die
     Karte: Beide beantworten, was gerade gilt. */

  App.prototype.setHint = function (html) {
    this._hint = html || null;
    this.updateHint();
  };

  /* Die Hinweiszeile zeigt den Text des laufenden Werkzeugs – und sonst den
     naechsten sinnvollen Schritt, abhaengig davon, wie weit die Schaltung ist. */
  App.prototype.updateHint = function () {
    if (!this.hintEl) return;
    var warn = this.sim.isOscillating();
    D.toggleClass(this.hintEl, 'is-warn', warn);
    this.hintEl.innerHTML = warn
      ? 'Diese Schaltung <b>schwingt</b> – die roten Leitungen kommen nicht zur Ruhe. ' +
        'Sieh sie dir in <b>Zeitlupe</b> an.'
      : (this._hint || this.defaultHint());
  };

  App.prototype.defaultHint = function () {
    if (this.sim.mode === 'slow') {
      return 'Zeitlupe: ein Tick nach dem anderen. Du siehst das Signal von Gatter ' +
             'zu Gatter wandern. <b>Live</b> rechnet wieder sofort zu Ende.';
    }
    if (this.sim.mode === 'step') {
      return 'Einzelschritt: jeder Klick auf <b>&#9193;</b> rechnet genau einen Tick.';
    }
    /* Eine angeklickte Lampe beantwortet gerade "warum leuchtet das?" –
       dann gehoert in die Zeile, was die Markierung auf der Fläche bedeutet. */
    if (this.env.why) {
      return 'Markiert ist, woran es gerade liegt – alles andere ist abgeblendet. ' +
             'Klick ins Leere zeigt wieder alles.';
    }
    var n = this.selection.count();
    if (n === 1) return 'Ausgewählt. <b>Entf</b> löscht, Ziehen verschiebt, <b>Strg+C</b> kopiert.';
    if (n > 1)   return n + ' ausgewählt. <b>Entf</b> löscht, Ziehen verschiebt.';
    if (this.circuit.isEmpty()) {
      /* Leere Flaeche: das ist der erste Eindruck. Hier gehoert der Weg zu
         den Vorlagen hin, nicht nur eine Bedienhilfe. */
      return 'Fertige <b>Vorlagen</b> stehen im <b>Menü</b> oben rechts. ' +
             'Oder bau frei: Baustein links wählen, auf die Fläche klicken.';
    }
    return 'Ziehe von einem <b>Ausgang</b> zu einem <b>Eingang</b>, um zu verbinden. ' +
           'Umschalt+Ziehen wählt mit einem Rahmen aus.';
  };

  /* { bauteilId: "A" } aus dem Ergebnis der Tabellenrechnung. */
  function namenJeBauteil(data, circuit) {
    var map = {};
    data.inputs.concat(data.outputs).forEach(function (s) { map[s.id] = s.name; });
    if (!data.gefiltert) return map;

    /* Bei gefilterter Ansicht bekommen die uebrigen Schalter und Lampen
       ausdruecklich keinen Namen – ein leerer Eintrag unterdrueckt auch ihr
       eigenes Label. Sonst stuende bei zwei gleichen Vorlagen zweimal "A"
       auf der Flaeche, waehrend die Tabelle nur eines davon meint. So ist
       beschriftet, was in der Tabelle steht, und sonst nichts. */
    circuit.parts.forEach(function (p) {
      if ((p.type === 'switch' || p.type === 'led') && map[p.id] === undefined) {
        map[p.id] = '';
      }
    });
    return map;
  }

})(window.CIRCUIT = window.CIRCUIT || {});
