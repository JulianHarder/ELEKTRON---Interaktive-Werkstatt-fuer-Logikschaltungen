/* Kleines Kontextmenue auf der Arbeitsflaeche (Rechtsklick).

   Macht das Loeschen auffindbar, ohne dass man die Entf-Taste kennen muss.
   Eigene Eintraege statt des Browsermenues – Pointer.js unterdrueckt das
   Browsermenue ohnehin schon. */
(function (C) {
  'use strict';

  var D = C.util.dom;
  var I = C.ui.icons;

  function ContextMenu() {
    this.node = null;
    this._onAway = null;
  }

  /* items: [ { label, icon, action, disabled } ] – null trennt Gruppen. */
  ContextMenu.prototype.open = function (clientX, clientY, items) {
    this.close();
    if (!items || !items.length) return;

    var self = this;
    var menu = D.el('div', { class: 'ctx-menu', role: 'menu' });

    items.forEach(function (it) {
      if (!it) { menu.appendChild(D.el('div', { class: 'ctx-sep' })); return; }
      var btn = D.el('button', {
        class: 'ctx-item', type: 'button', role: 'menuitem',
        disabled: it.disabled ? true : null
      }, [
        it.icon && I.has(it.icon) ? I.el(it.icon, 'ico') : D.el('span', { class: 'ico' }),
        D.el('span', { text: it.label })
      ]);
      if (!it.disabled) {
        btn.addEventListener('click', function () { self.close(); it.action(); });
      }
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    place(menu, clientX, clientY);
    this.node = menu;

    /* Ein Klick daneben oder Escape schliesst wieder. */
    this._onAway = function (e) {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      if (e.type !== 'keydown' && menu.contains(e.target)) return;
      self.close();
    };
    window.addEventListener('pointerdown', this._onAway, true);
    window.addEventListener('keydown', this._onAway, true);
    window.addEventListener('blur', this._onAway, true);
  };

  ContextMenu.prototype.close = function () {
    if (!this.node) return;
    if (this.node.parentNode) this.node.parentNode.removeChild(this.node);
    this.node = null;
    window.removeEventListener('pointerdown', this._onAway, true);
    window.removeEventListener('keydown', this._onAway, true);
    window.removeEventListener('blur', this._onAway, true);
    this._onAway = null;
  };

  ContextMenu.prototype.isOpen = function () { return !!this.node; };

  /* Am Zeiger aufklappen, aber nie ueber den Fensterrand hinaus. */
  function place(menu, x, y) {
    var r = menu.getBoundingClientRect();
    var pad = 8;
    var left = Math.min(x, window.innerWidth  - r.width  - pad);
    var top  = Math.min(y, window.innerHeight - r.height - pad);
    menu.style.left = Math.max(pad, left) + 'px';
    menu.style.top  = Math.max(pad, top) + 'px';
  }

  C.ui.ContextMenu = ContextMenu;

})(window.CIRCUIT = window.CIRCUIT || {});
