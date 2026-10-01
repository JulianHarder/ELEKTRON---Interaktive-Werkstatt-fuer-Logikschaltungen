/* Kurze, eindeutige IDs für Bauteile, Leitungen und Bausteine.
   Kein UUID nötig: die IDs sind nur innerhalb einer Schaltung eindeutig. */
(function (C) {
  'use strict';

  var counters = {};

  /* nextId('p') -> 'p1', 'p2', ... */
  function nextId(prefix) {
    var p = prefix || 'x';
    counters[p] = (counters[p] || 0) + 1;
    return p + counters[p];
  }

  /* Nach dem Laden einer Schaltung: Zähler so weit hochsetzen,
     dass neue IDs nicht mit geladenen kollidieren. */
  function observe(id) {
    var m = /^([a-z]+)(\d+)$/.exec(String(id));
    if (!m) return;
    var p = m[1], n = parseInt(m[2], 10);
    if (!counters[p] || counters[p] < n) counters[p] = n;
  }

  function reset() { counters = {}; }

  C.util.ids = { next: nextId, observe: observe, reset: reset };

})(window.CIRCUIT = window.CIRCUIT || {});
