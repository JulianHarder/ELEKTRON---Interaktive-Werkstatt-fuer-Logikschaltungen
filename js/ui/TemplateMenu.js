/* Der Vorlagen-Teil des Menues.

   Steht in einer eigenen Datei, damit MenuPanel.js uebersichtlich bleibt.
   Gebaut wird nur das Stueck Oberflaeche – was beim Anwaehlen passiert,
   entscheidet die App ueber menu.onPickTemplate. */
(function (C) {
  'use strict';

  var D = C.util.dom;
  var I = C.ui.icons;

  /* Liefert die fertige <section> fuer das Menue. */
  function section(menu) {
    var box = D.el('section', { class: 'menu-section' }, [
      D.el('h3', { class: 'menu-section-title' }, [
        I.el('folder', 'ico'),
        D.el('span', { text: 'Vorlagen' }),
        D.el('span', { class: 'menu-total', text: C.templates.count() + ' Schaltungen' })
      ]),
      D.el('p', { class: 'menu-lead',
        text: 'Fertige Schaltungen zum Ansehen und Weiterbauen. Die einen ' +
              'zeigen, wie die Gatter aus NAND entstehen, die anderen, was ' +
              'man mit den fertigen Gattern baut.' })
    ]);

    C.templates.groups().forEach(function (name) {
      box.appendChild(D.el('div', { class: 'tpl-group-label', text: name }));
      var liste = D.el('div', { class: 'tpl-list' });
      C.templates.ofGroup(name).forEach(function (tpl) {
        liste.appendChild(zeile(menu, tpl));
      });
      box.appendChild(liste);
    });

    box.appendChild(leeren(menu));
    return box;
  }

  function zeile(menu, tpl) {
    var row = D.el('button', {
      class: 'tpl-row' + (tpl.id === menu.currentId ? ' is-current' : ''),
      type: 'button',
      title: tpl.desc
    }, [
      D.el('span', { class: 'tpl-text' }, [
        D.el('span', { class: 'tpl-name', text: tpl.title }),
        tpl.note ? D.el('span', { class: 'tpl-note', text: tpl.note }) : null
      ]),
      I.el('play', 'ico tpl-go')
    ]);

    row.addEventListener('click', function () {
      menu.close();
      if (menu.onPickTemplate) menu.onPickTemplate(tpl.id);
    });
    return row;
  }

  /* Flaeche leeren. Ohne Rueckfrage: Das Leeren laeuft als normaler Befehl,
     Strg+Z holt es zurueck. Eine Bestaetigung stuende nur im Weg. Derselbe
     Knopf sitzt auch oben in der Kopfleiste. */
  function leeren(menu) {
    var btn = D.el('button', { class: 'btn menu-wide menu-danger', type: 'button' }, [
      I.el('trash', 'ico'), D.el('span', { text: 'Fläche leeren' })
    ]);
    btn.addEventListener('click', function () {
      menu.close();
      if (menu.onClear) menu.onClear();
    });
    return btn;
  }

  C.ui.templateSection = section;

})(window.CIRCUIT = window.CIRCUIT || {});
