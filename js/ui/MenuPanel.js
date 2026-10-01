/* Menue-Overlay: die Vorlagen und der Abschnitt "Ueber".
   Die Vorlagenliste selbst steht in TemplateMenu.js, damit diese Datei
   uebersichtlich bleibt. Die Texte zum Projekt stehen gesammelt in
   C.ui.about, damit sie nur an einer Stelle leben. */
(function (C) {
  'use strict';

  var D = C.util.dom;
  var I = C.ui.icons;

  /* Einzige Quelle fuer Name, Untertitel und Signatur. */
  var about = {
    name:     'ELEKTRON',
    subtitle: 'interaktive Werkstatt für Logikschaltungen',
    author:   'by Julian Harder',
    origin:   'Elektron ist das griechische Wort für Bernstein (Amber). ' +
              'Aus ihm wurde später das Wort Elektrizität.',
    pitch:    'Aus einem einzigen NAND-Gatter baust du Schritt für Schritt alles ' +
              'selbst – bis zur eigenen Mini-CPU.'
  };

  function MenuPanel() {
    this.scrim = null;
    this.trigger = null;
    this.currentId = null;       /* zuletzt eingesetzte Vorlage */
    this.onPickTemplate = null;
    this.onClear = null;
  }

  MenuPanel.prototype.isOpen = function () { return !!this.scrim; };

  MenuPanel.prototype.toggle = function (trigger) {
    if (this.isOpen()) this.close(); else this.open(trigger);
  };

  MenuPanel.prototype.open = function (trigger) {
    if (this.isOpen()) return;
    var self = this;
    this.trigger = trigger || null;

    var panel = D.el('div', {
      class: 'menu-panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Menü'
    }, [
      D.el('div', { class: 'menu-head' }, [
        D.el('span', { class: 'menu-title', text: 'Menü' }),
        D.el('button', {
          class: 'btn btn-ghost menu-close',
          type: 'button',
          title: 'Schließen',
          'aria-label': 'Schließen',
          html: I.markup('close')
        })
      ]),
      C.ui.templateSection(this),
      this.aboutSection()
    ]);

    var scrim = D.el('div', { class: 'overlay-scrim' }, panel);

    /* Klick auf den Hintergrund schliesst, Klick im Panel nicht. */
    scrim.addEventListener('pointerdown', function (ev) {
      if (ev.target === scrim) self.close();
    });
    D.$('.menu-close', panel).addEventListener('click', function () { self.close(); });

    this._onKey = function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); self.close(); }
    };
    window.addEventListener('keydown', this._onKey);

    document.body.appendChild(scrim);
    this.scrim = scrim;
    if (this.trigger) this.trigger.setAttribute('aria-expanded', 'true');
    D.$('.menu-close', panel).focus();
  };

  MenuPanel.prototype.close = function () {
    if (!this.isOpen()) return;
    window.removeEventListener('keydown', this._onKey);
    if (this.scrim.parentNode) this.scrim.parentNode.removeChild(this.scrim);
    this.scrim = null;
    if (this.trigger) {
      this.trigger.setAttribute('aria-expanded', 'false');
      this.trigger.focus();
      this.trigger = null;
    }
  };

  /* Abschnitt "Ueber": Wortmarke, Untertitel, Signatur, Namensherkunft. */
  MenuPanel.prototype.aboutSection = function () {
    return D.el('section', { class: 'menu-section' }, [
      D.el('h3', { class: 'menu-section-title' }, [
        I.el('info', 'ico'),
        D.el('span', { text: 'Über' })
      ]),
      D.el('div', { class: 'about-card' }, [
        D.el('div', { class: 'about-name', text: about.name }),
        D.el('div', { class: 'about-sub', text: about.subtitle }),
        D.el('div', { class: 'about-by', text: about.author }),
        D.el('p', { class: 'about-text', text: about.pitch }),
        D.el('p', { class: 'about-text about-origin', text: about.origin }),
        D.el('div', { class: 'about-meta', text: 'Version ' + C.version })
      ])
    ]);
  };

  C.ui.about = about;
  C.ui.MenuPanel = MenuPanel;

})(window.CIRCUIT = window.CIRCUIT || {});
