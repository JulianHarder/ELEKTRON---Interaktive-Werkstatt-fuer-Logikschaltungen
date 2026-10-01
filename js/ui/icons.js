/* Eigenes Icon-Set als Inline-SVG. Einheitlich 24x24, Strichstaerke 1.6,
   Farbe ueber currentColor. Keine Emojis, keine fremden Icon-Fonts. */
(function (C) {
  'use strict';

  var paths = {
    /* Wortmarke: ein Gatter mit Leitung */
    logo: 'M3 8h4M3 16h4M7 5h5a7 7 0 0 1 0 14H7z M19.5 12H22',

    undo:    'M4 10h9a5 5 0 0 1 0 10H8 M4 10l4-4 M4 10l4 4',
    redo:    'M20 10h-9a5 5 0 0 0 0 10h5 M20 10l-4-4 M20 10l-4 4',

    play:    'M8 5.5v13l11-6.5z',
    pause:   'M9 5.5v13 M15 5.5v13',
    slow:    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7.5V12l3 2',
    step:    'M6 5.5v13l9-6.5z M18 5.5v13',

    check:   'M4.5 12.5l5 5 10-11',
    close:   'M6 6l12 12 M18 6L6 18',
    menu:    'M4 7h16 M4 12h16 M4 17h16',

    zoomIn:  'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4 M11 8v6 M8 11h6',
    zoomOut: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4 M8 11h6',
    fit:     'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5',

    grid:    'M4 4h16v16H4z M4 10h16 M4 16h16 M10 4v16 M16 4v16',
    save:    'M5 4h11l3 3v13H5z M9 4v5h6V4 M8 20v-6h8v6',
    trash:   'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
    copy:    'M9 9h10v11H9z M15 9V4H5v11h4',
    paste:   'M8 5H5v15h14V5h-3 M9 3h6v4H9z',
    select:  'M4 8V4h4 M20 8V4h-4 M4 16v4h4 M20 16v4h-4 M8 8h8v8H8z',
    folder:  'M4 6h6l2 2h8v10H4z',
    bolt:    'M13 3L5 13h6l-1 8 8-10h-6z',
    star:    'M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z',
    info:    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v6 M12 7.6v.5'
  };

  /* Pfade, die gefuellt statt gestrichen werden. */
  var filled = { play: true, star: true, bolt: true };

  function markup(name, cls) {
    var d = paths[name];
    if (!d) return '';
    var isFill = !!filled[name];
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" aria-hidden="true" ' +
           'fill="' + (isFill ? 'currentColor' : 'none') + '" ' +
           'stroke="' + (isFill ? 'none' : 'currentColor') + '" ' +
           'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
           '<path d="' + d + '"/></svg>';
  }

  function el(name, cls) {
    var box = document.createElement('div');
    box.innerHTML = markup(name, cls);
    return box.firstChild;
  }

  function has(name) { return !!paths[name]; }

  C.ui.icons = { markup: markup, el: el, has: has, paths: paths };

})(window.CIRCUIT = window.CIRCUIT || {});
