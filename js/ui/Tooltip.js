/* Der Tooltip: erklaert ein Bauteil beim Ueberfahren.

   Ein eigener statt des Browser-Tooltips, aus zwei Gruenden: Der eingebaute
   kommt erst nach einer Sekunde, sieht auf jedem System anders aus und kann
   keine Tabelle zeigen. Hier steht Name und ein Satz dazu, was das Bauteil
   tut.

   Zwei Fassungen, je nachdem wo man ist:

   - Auf der Arbeitsflaeche kommt bei Gattern die Wahrheitstabelle dazu –
     ausgerechnet aus der echten Simulation, nicht abgeschrieben. Dort hat man
     die Schaltung vor sich und will wissen, was das Gatter mit den Signalen
     macht. Gezeigt wird erst nach einer kurzen Verzoegerung: Wer nur mit der
     Maus ueber die Flaeche faehrt, soll nicht von aufpoppenden Kaesten
     verfolgt werden.

   - In der Bausteinleiste bleibt es beim Satz, ohne Tabelle. Dort sucht man
     ein Bauteil aus, da genuegt "was ist das". Dafuer erscheint der Tooltip
     sofort: Man faehrt einen Eintrag gezielt an, nicht zufaellig. */
(function (C) {
  'use strict';

  var D = C.util.dom;

  var DELAY = 350;        /* ms, bis der Tooltip erscheint */
  var ABSTAND = 14;       /* px Luft zum Mauszeiger */

  function Tooltip() {
    this.node = null;
    this.key = null;        /* was gerade gezeigt wird: Typ plus Fassung */
    this._timer = 0;
  }

  /* Auf der Arbeitsflaeche: mit Wahrheitstabelle, nach kurzer Verzoegerung.
     type = Bauteiltyp oder null zum Ausblenden.
     x/y sind Fensterkoordinaten, an denen der Tooltip haengt.
     anschluss = { name, text } erklaert die Beschriftung des Bauteils, etwa
     "CLK – Takt …". Fehlt sie, bleibt es bei der Bauteilbeschreibung. */
  Tooltip.prototype.show = function (type, x, y, anschluss) {
    if (!type) { this.hide(); return; }
    var key = schluessel(type, true, anschluss);

    /* Dasselbe Bauteil in derselben Fassung: nur mitziehen, nicht neu bauen. */
    if (this.key === key && this.node) {
      this.place(x, y);
      return;
    }

    this.clearTimer();
    this.key = key;
    var self = this;
    this._timer = setTimeout(function () {
      self.build(type, true, anschluss);
      self.place(x, y);
    }, DELAY);
  };

  /* In der Bausteinleiste: ohne Tabelle, dafuer sofort. */
  Tooltip.prototype.showNow = function (type, x, y) {
    if (!type) { this.hide(); return; }
    var key = schluessel(type, false);

    this.clearTimer();
    if (this.key !== key || !this.node) {
      this.key = key;
      this.build(type, false);
    }
    this.place(x, y);
  };

  /* Bauteil, Fassung und Anschluss zusammen – sonst bliebe beim Wechsel von
     der Flaeche in die Leiste die Tabelle stehen, und beim Wechsel von einem
     Schalter zum naechsten die Erklaerung des vorigen. */
  function schluessel(type, mitTabelle, anschluss) {
    return type + (mitTabelle ? '+t' : '') +
           (anschluss ? '+' + anschluss.name : '');
  }

  Tooltip.prototype.hide = function () {
    this.clearTimer();
    this.key = null;
    if (this.node && this.node.parentNode) this.node.parentNode.removeChild(this.node);
    this.node = null;
  };

  Tooltip.prototype.clearTimer = function () {
    if (this._timer) { clearTimeout(this._timer); this._timer = 0; }
  };

  /* --- Aufbau --- */

  Tooltip.prototype.build = function (type, mitTabelle, anschluss) {
    var def = C.model.parts.get(type);
    if (!def) { this.hide(); return; }

    if (this.node && this.node.parentNode) this.node.parentNode.removeChild(this.node);

    /* Traegt das Bauteil eine Beschriftung, deren Bedeutung bekannt ist,
       steht die oben – danach sucht man, wenn man "CLK" liest. Die
       allgemeine Bauteilbeschreibung kommt darunter. */
    var box = D.el('div', { class: 'tip', role: 'tooltip' }, [
      anschluss
        ? D.el('div', { class: 'tip-head' }, [
            D.el('span', { class: 'tip-name tip-pin', text: anschluss.name }),
            D.el('span', { class: 'tip-hint', text: def.name })
          ])
        : D.el('div', { class: 'tip-head' }, [
            D.el('span', { class: 'tip-name', text: def.name }),
            def.hint ? D.el('span', { class: 'tip-hint', text: def.hint }) : null
          ]),
      anschluss ? D.el('p', { class: 'tip-desc', text: anschluss.text }) : null,
      def.desc ? D.el('p', { class: anschluss ? 'tip-note' : 'tip-desc',
                             text: def.desc }) : null,
      mitTabelle ? tabelle(type) : null,
      (def.note && !anschluss) ? D.el('p', { class: 'tip-note', text: def.note }) : null
    ]);

    document.body.appendChild(box);
    this.node = box;
  };

  /* Die Wahrheitstabelle des Gatters – bei Schalter, Lampe und Takt gibt es
     keine, dann bleibt der Tooltip einfach kuerzer. */
  function tabelle(type) {
    var rows = C.sim.gateTruth.of(type);
    if (!rows || !rows.length) return null;

    var namen = C.sim.gateTruth.inputNames(type);
    var box = D.el('div', { class: 'tip-truth' });

    var kopf = D.el('div', { class: 'tip-row tip-row-head' });
    namen.forEach(function (n) {
      kopf.appendChild(D.el('span', { class: 'tip-cell', text: n }));
    });
    kopf.appendChild(D.el('span', { class: 'tip-cell tip-cell-out', text: 'Y' }));
    box.appendChild(kopf);

    rows.forEach(function (r) {
      var zeile = D.el('div', { class: 'tip-row' });
      r.in.forEach(function (v) {
        zeile.appendChild(D.el('span', { class: 'tip-cell', text: v }));
      });
      zeile.appendChild(D.el('span', {
        class: 'tip-cell tip-cell-out' + (r.out ? ' is-on' : ''), text: r.out
      }));
      box.appendChild(zeile);
    });
    return box;
  }

  /* --- Platzieren ---
     Standard ist rechts unterhalb des Zeigers. Passt der Tooltip dort nicht
     mehr ins Fenster, klappt er auf die andere Seite statt abgeschnitten zu
     werden. */

  Tooltip.prototype.place = function (x, y) {
    if (!this.node) return;

    var b = this.node.getBoundingClientRect();
    var links = x + ABSTAND;
    var oben  = y + ABSTAND;

    if (links + b.width > window.innerWidth - 8)  links = x - b.width - ABSTAND;
    if (oben + b.height > window.innerHeight - 8) oben  = y - b.height - ABSTAND;

    this.node.style.left = Math.max(8, links) + 'px';
    this.node.style.top  = Math.max(8, oben) + 'px';
  };

  C.ui.Tooltip = Tooltip;

})(window.CIRCUIT = window.CIRCUIT || {});
