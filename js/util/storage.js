/* localStorage mit Sicherheitsnetz: bei file:// kann der Zugriff je nach
   Browsereinstellung fehlschlagen. Dann arbeitet die App ohne Speicher weiter.
   Der Prefix heisst "elektron." – aeltere Staende aus der Zeit als das Projekt
   noch CIRCUIT bzw. FORGE hiess, werden beim ersten Start einmalig uebernommen. */
(function (C) {
  'use strict';

  var PREFIX = 'elektron.';
  var LEGACY = ['forge.', 'circuit.'];   /* Reihenfolge = aelteste zuerst */
  var MIGRATED = '__migrated';

  var available = (function () {
    try {
      var k = PREFIX + '__test';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function read(key, fallback) {
    if (!available) return fallback;
    try {
      var raw = window.localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function write(key, value) {
    if (!available) return false;
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }

  function remove(key) {
    if (!available) return;
    try { window.localStorage.removeItem(PREFIX + key); } catch (e) { /* egal */ }
  }

  /* Alte Speicherstaende uebernehmen. Laeuft genau einmal und loescht nichts:
     die alten Eintraege bleiben als Sicherheitsnetz liegen. Ein bereits
     vorhandener elektron.-Wert wird nie ueberschrieben. */
  function migrate() {
    if (!available) return 0;
    var store = window.localStorage;
    if (store.getItem(PREFIX + MIGRATED) !== null) return 0;

    /* Schluesselliste zuerst einsammeln – wir schreiben waehrend der Auswertung. */
    var keys = [];
    var i;
    for (i = 0; i < store.length; i++) keys.push(store.key(i));

    var taken = {};      /* in diesem Durchlauf geschriebene Schluessel */
    var count = 0;

    LEGACY.forEach(function (old) {
      keys.forEach(function (full) {
        if (!full || full.indexOf(old) !== 0) return;

        var bare = full.slice(old.length);
        if (bare === '__test' || bare === MIGRATED) return;

        /* Fremden, schon vorhandenen Wert nicht antasten. */
        if (!taken[bare] && store.getItem(PREFIX + bare) !== null) return;

        try {
          store.setItem(PREFIX + bare, store.getItem(full));
          taken[bare] = true;
          count++;
        } catch (e) { /* Platz voll o. ae. – dann eben nicht */ }
      });
    });

    try { store.setItem(PREFIX + MIGRATED, '1'); } catch (e) { /* egal */ }
    return count;
  }

  C.util.storage = {
    read: read,
    write: write,
    remove: remove,
    migrate: migrate,
    available: available,
    PREFIX: PREFIX
  };

})(window.CIRCUIT = window.CIRCUIT || {});
