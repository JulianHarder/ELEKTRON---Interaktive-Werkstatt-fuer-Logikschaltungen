/* Die Karte rechts auf der Arbeitsflaeche.

   Die Wahrheitstabelle rechnet laufend mit: links die Schalter, rechts die
   Lampen, eine Zeile je Kombination. Die Zeile, die zur aktuellen
   Schalterstellung gehoert, ist hervorgehoben.

   Solange genau die eingesetzte Vorlage dasteht, steht ihre Beschreibung
   darueber. Sobald eigene Bauteile dazukommen, faellt sie weg und es bleibt
   die Tabelle – was man gebaut hat, ist dann ja nicht mehr die Vorlage.

   Es wird nichts bewertet. Die Tabelle zeigt, was die Schaltung tut – nicht,
   ob sie etwas Vorgegebenes erfuellt. */
(function (C) {
  'use strict';

  var D = C.util.dom;
  var I = C.ui.icons;

  function TruthCard(host) {
    this.host = host;
    this.template = null;      /* zuletzt eingesetzte Vorlage, nur als Text */
    this.collapsed = false;
    this.data = null;
    this.why  = null;          /* Begruendung einer angeklickten Lampe */
  }

  TruthCard.prototype.render = function () {
    D.clear(this.host);

    /* Ohne Schalter oder ohne Lampen gibt es nichts zu zeigen – dann bleibt
       die Flaeche frei statt eine leere Karte zu zeigen. */
    var leer = !this.template && !this.why &&
               (!this.data || !this.data.rows.length);
    /* this.table gehoert zu einer Karte, die es gleich nicht mehr gibt –
       ohne das Loeschen haelt update() sie faelschlich fuer noch aufgebaut
       und baut nie wieder neu auf. */
    if (leer) { this.table = null; this.host.hidden = true; return; }

    this.host.hidden = false;
    D.toggleClass(this.host, 'is-collapsed', this.collapsed);

    this.host.appendChild(this.head());
    if (this.collapsed) return;

    var body = D.el('div', { class: 'card-body' });

    /* Der Block "Warum?" steht ganz oben: Er ist die Antwort auf einen
       Klick, den man gerade getan hat, und soll nicht unter einer langen
       Tabelle gesucht werden muessen. */
    this.whyHost = D.el('div', { class: 'why-host' });
    body.appendChild(this.whyHost);

    /* Bei gefilterter Ansicht passt die Vorlagenbeschreibung nicht mehr –
       sie beschreibt ja das Ganze, nicht den ausgewaehlten Teil. */
    if (this.template && !(this.data && this.data.gefiltert)) {
      body.appendChild(D.el('p', { class: 'card-task', text: this.template.desc }));
      if (this.template.note) {
        body.appendChild(D.el('p', { class: 'card-note', text: this.template.note }));
      }
      var pins = anschluesse(this.template);
      if (pins) body.appendChild(pins);
    }

    this.table = D.el('div', { class: 'truth' });
    this.hinweis = D.el('p', { class: 'card-note card-truthnote' });
    body.appendChild(this.table);
    body.appendChild(this.hinweis);

    this.host.appendChild(body);
    this.fill();
  };

  TruthCard.prototype.head = function () {
    var self = this;
    var gefiltert = this.data && this.data.gefiltert;
    var titel = gefiltert ? 'Auswahl'
              : (this.template ? this.template.title : 'Wahrheitstabelle');

    var head = D.el('div', { class: 'card-head' }, [
      gefiltert
        ? D.el('span', { class: 'card-step is-select', text: 'Nur Auswahl' })
        : (this.template ? D.el('span', { class: 'card-step', text: 'Vorlage' }) : null),
      D.el('span', { class: 'card-title', text: titel, title: titel }),
      D.el('button', {
        class: 'btn btn-ghost card-fold', type: 'button',
        title: this.collapsed ? 'Aufklappen' : 'Einklappen',
        'aria-label': this.collapsed ? 'Aufklappen' : 'Einklappen',
        html: I.markup(this.collapsed ? 'zoomIn' : 'close')
      })
    ]);

    D.$('.card-fold', head).addEventListener('click', function () {
      self.collapsed = !self.collapsed;
      self.render();
    });
    return head;
  };

  /* Die Anschluesse mit ihrer Bedeutung. Die Vorlagen benutzen die Namen aus
     der Elektronik – D, CLK, Cout –, und die sagen nur etwas, wenn irgendwo
     steht, wofuer sie stehen. Genau hier ist der Platz dafuer: direkt unter
     der Beschreibung und ueber der Tabelle, deren Spalten so heissen. */
  function anschluesse(tpl) {
    if (!tpl.pins) return null;
    var namen = Object.keys(tpl.pins);
    if (!namen.length) return null;

    var box = D.el('div', { class: 'pin-help' });
    namen.forEach(function (name) {
      box.appendChild(D.el('div', { class: 'pin-help-row' }, [
        D.el('span', { class: 'pin-help-name', text: name }),
        D.el('span', { class: 'pin-help-text', text: tpl.pins[name] })
      ]));
    });
    return box;
  }

  /* --- Nachfuehren ---
     data kommt aus C.sim.truth.build(), tpl aus bench.pureTemplate() –
     also null, sobald die Schaltung nicht mehr der Vorlage entspricht. */

  TruthCard.prototype.update = function (data, tpl, why) {
    var vorher = this.data;
    var vorherTpl = this.template;
    var vorherWhy = !!this.why;
    this.data = data;
    this.template = tpl || null;
    this.why = why || null;

    /* Neu aufgebaut wird nur, wenn sich am Aufbau wirklich etwas aendert:
       andere Anschluesse, andere Beschreibung oder ein Wechsel zwischen
       ganzer Schaltung und Auswahl. Sonst wird bloss neu gefuellt – sonst
       flackerte die Karte bei jedem Schalterklick. */
    if (!this.table || !vorher || vorherTpl !== this.template ||
        vorherWhy !== !!this.why ||
        !!vorher.gefiltert !== !!data.gefiltert ||
        !gleicherKopf(vorher, data)) {
      this.render();
      return;
    }
    this.fill();
  };

  function gleicherKopf(a, b) {
    return namen(a.inputs) === namen(b.inputs) &&
           namen(a.outputs) === namen(b.outputs) &&
           a.rows.length === b.rows.length &&
           a.feedback === b.feedback && a.tooMany === b.tooMany;
  }

  /* Spaltennamen als eine Zeichenkette, nur zum Vergleichen. Die Anzahl
     steht mit davor, damit zwei verschiedene Aufteilungen nicht zufaellig
     dieselbe Kette ergeben. */
  function namen(list) {
    return list.length + ':' + list.map(function (s) { return s.name; }).join('|');
  }

  TruthCard.prototype.fill = function () {
    if (!this.table) return;
    var d = this.data;

    /* Zuerst die Begruendung: Sie haengt an der Auswahl und wechselt mit
       jedem Schalterklick, waehrend der Rest der Karte stehen bleibt. */
    D.clear(this.whyHost);
    var box = this.why ? C.ui.whyBox.build(this.why) : null;
    if (box) this.whyHost.appendChild(box);
    this.whyHost.hidden = !box;

    D.clear(this.table);
    D.clear(this.hinweis);

    if (!d || !d.rows.length) {
      this.table.appendChild(D.el('p', { class: 'truth-empty',
        text: 'Setze einen Schalter und eine Lampe, dann erscheint hier die Tabelle.' }));
      return;
    }

    this.table.appendChild(kopfzeile(d));
    d.rows.forEach(function (r) {
      this.table.appendChild(this.zeile(d, r));
    }, this);

    this.hinweis.textContent = hinweisText(d);
    this.hinweis.hidden = !this.hinweis.textContent;
  };

  TruthCard.prototype.zeile = function (d, r) {
    var cls = 'truth-row';
    /* Bei nur einer Zeile ist sie immer die aktuelle – das Hervorheben
       waere dann nur Dekoration. */
    if (d.full && gleich(d.current, r.in)) cls += ' is-here';
    if (!r.stable) cls += ' is-bad';

    var row = D.el('div', { class: cls });
    r.in.forEach(function (v) {
      row.appendChild(D.el('span', { class: 'cell', text: v }));
    });
    r.out.forEach(function (v) {
      row.appendChild(D.el('span', {
        class: 'cell cell-out' + (v ? ' is-on' : ''),
        text: r.stable ? v : '?'
      }));
    });
    return row;
  };

  function kopfzeile(d) {
    var head = D.el('div', { class: 'truth-row truth-head' });
    d.inputs.forEach(function (s) {
      head.appendChild(D.el('span', { class: 'cell', text: s.name }));
    });
    d.outputs.forEach(function (s) {
      head.appendChild(D.el('span', { class: 'cell cell-out', text: s.name }));
    });
    return head;
  }

  /* Warum steht da das, was da steht? Das gehoert dazugesagt. */
  function hinweisText(d) {
    if (d.feedback) {
      return 'Diese Schaltung merkt sich etwas – ihr Ausgang hängt davon ab, ' +
             'was vorher war. Eine vollständige Tabelle gäbe es dafür nicht, ' +
             'deshalb steht hier nur die aktuelle Stellung.';
    }
    if (d.clocked) {
      return 'Der Takt läuft – sein Wert wechselt von selbst, und damit würde ' +
             'auch die Tabelle ständig eine andere sein. Klick auf das ' +
             'Taktbauteil hält ihn an, dann gilt sie wieder.';
    }
    if (d.tooMany) {
      return d.inputs.length + ' Schalter ergäben ' + Math.pow(2, d.inputs.length) +
             ' Zeilen. Gezeigt wird deshalb nur die aktuelle Stellung.';
    }
    /* Steht zuletzt: Die beiden Faelle oben erklaeren, warum nur eine Zeile
       dasteht – das ist dringender. Dass gefiltert wird, sagt schon der Kopf. */
    if (d.gefiltert) {
      return 'Gezeigt wird nur, was ausgewählt ist. Die übrigen Schalter ' +
             'bleiben so stehen, wie sie gerade stehen. Ein Klick auf die ' +
             'freie Fläche zeigt wieder alles.';
    }
    return '';
  }

  function gleich(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  C.ui.TruthCard = TruthCard;

})(window.CIRCUIT = window.CIRCUIT || {});
