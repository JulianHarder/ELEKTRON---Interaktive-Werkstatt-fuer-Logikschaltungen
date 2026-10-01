/* Eine kurze Rueckfrage mit zwei oder drei Antworten.

   Wird gebraucht, wenn eine Vorlage eingesetzt wird und schon etwas auf der
   Flaeche liegt: ersetzen oder dazusetzen? Das ist die einzige Stelle, an
   der das Programm nachfragt – deshalb genuegt ein kleiner, allgemeiner
   Dialog und kein eigenes Fenster je Fall. */
(function (C) {
  'use strict';

  var D = C.util.dom;
  var I = C.ui.icons;

  function AskDialog() {
    this.scrim = null;
  }

  /* frage = { title, text, options: [ { label, note, icon, value, primary } ] }
     onPick bekommt den value der gewaehlten Antwort – oder null beim
     Abbrechen. */
  AskDialog.prototype.open = function (frage, onPick) {
    this.close();
    var self = this;

    function waehle(value) {
      self.close();
      if (onPick) onPick(value);
    }

    var knoepfe = frage.options.map(function (o) {
      var btn = D.el('button', {
        class: 'ask-option' + (o.primary ? ' is-primary' : ''),
        type: 'button'
      }, [
        o.icon ? I.el(o.icon, 'ico') : null,
        D.el('span', { class: 'ask-option-text' }, [
          D.el('span', { class: 'ask-option-label', text: o.label }),
          o.note ? D.el('span', { class: 'ask-option-note', text: o.note }) : null
        ])
      ]);
      btn.addEventListener('click', function () { waehle(o.value); });
      return btn;
    });

    var panel = D.el('div', {
      class: 'ask-panel', role: 'dialog', 'aria-modal': 'true',
      'aria-label': frage.title
    }, [
      D.el('h3', { class: 'ask-title', text: frage.title }),
      frage.text ? D.el('p', { class: 'ask-text', text: frage.text }) : null,
      D.el('div', { class: 'ask-options' }, knoepfe),
      abbrechen(waehle)
    ]);

    var scrim = D.el('div', { class: 'overlay-scrim' }, panel);
    scrim.addEventListener('pointerdown', function (ev) {
      if (ev.target === scrim) waehle(null);
    });

    this._onKey = function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); waehle(null); }
    };
    window.addEventListener('keydown', this._onKey);

    document.body.appendChild(scrim);
    this.scrim = scrim;
    knoepfe[0].focus();
  };

  function abbrechen(waehle) {
    var btn = D.el('button', { class: 'btn btn-ghost ask-cancel', type: 'button' },
                   [D.el('span', { text: 'Abbrechen' })]);
    btn.addEventListener('click', function () { waehle(null); });
    return btn;
  }

  AskDialog.prototype.close = function () {
    if (!this.scrim) return;
    window.removeEventListener('keydown', this._onKey);
    if (this.scrim.parentNode) this.scrim.parentNode.removeChild(this.scrim);
    this.scrim = null;
  };

  C.ui.AskDialog = AskDialog;

})(window.CIRCUIT = window.CIRCUIT || {});
