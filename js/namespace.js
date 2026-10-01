/* Legt den globalen Namensraum an. Muss als erstes Skript geladen werden.
   Es gibt bewusst keine ES-Module: das Projekt läuft per Doppelklick über file://. */
(function (root) {
  'use strict';

  var C = root.CIRCUIT || (root.CIRCUIT = {});

  C.version = '0.1.0';

  /* Unterbereiche vorbereiten, damit spätere Dateien nur noch anhängen müssen. */
  C.util     = C.util     || {};
  C.model    = C.model    || {};
  C.sim      = C.sim      || {};
  C.render   = C.render   || {};
  C.interact = C.interact || {};
  C.ui       = C.ui       || {};
  C.app      = C.app      || {};

})(window);
