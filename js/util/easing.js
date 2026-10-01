/* Zeitkurven für Animationen. t läuft jeweils von 0 bis 1. */
(function (C) {
  'use strict';

  var E = {};

  E.linear    = function (t) { return t; };
  E.easeOut   = function (t) { return 1 - Math.pow(1 - t, 3); };
  E.easeIn    = function (t) { return t * t * t; };
  E.easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* Leichtes Überschwingen – für das "Einrasten" beim Ablegen. */
  E.backOut = function (t) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  C.util.easing = E;

})(window.CIRCUIT = window.CIRCUIT || {});
