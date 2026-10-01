/* Farben und Maße für die Canvas-Seite.
   Spiegelt css/tokens.css – beide Dateien müssen zusammen geändert werden. */
(function (C) {
  'use strict';

  var T = {

    /* --- Flächen --- */
    bg:          '#0a0e16',
    gridDot:     '#1e2839',
    gridDotMaj:  '#2b3a54',

    /* --- Bauteilkörper --- */
    bodyTop:     '#1c2536',
    bodyBottom:  '#141b29',
    bodyBorder:  '#33435e',
    bodyGloss:   'rgba(255,255,255,.06)',
    bodyShadow:  'rgba(0,0,0,.55)',

    /* --- Text auf der Fläche --- */
    label:       '#c7d2e2',
    labelDim:    '#7c8aa0',

    /* --- Leitungen und Signal --- */
    wireOff:     '#3a4a63',
    wireOffEdge: '#2a3852',
    signal:      '#ffb547',
    signalSoft:  '#ffcd80',
    signalCore:  '#ffe0ab',
    glowRGB:     '255,181,71',

    /* --- Zustände --- */
    hover:       '#5b7ba8',
    selection:   '#7fb2ff',
    ok:          '#4be3b0',
    err:         '#ff5d73',

    /* Begründung einer Lampe ("Warum leuchtet das?"): Der Weg wird markiert,
       alles andere abgeblendet. Eigene Farbe, weil Amber schon das Signal
       meint, Blau die Auswahl und Rot das Schwingen. */
    traceRGB:    '75,227,176',
    dimAlpha:    0.18,

    /* --- Pins --- */
    pin:         '#546582',
    pinRing:     '#0a0e16',

    /* --- Maße in Weltkoordinaten --- */
    grid:        16,     /* Rasterweite, alles rastet darauf ein */
    gridMajor:   5,      /* jeder 5. Punkt ist heller */
    pinR:        4.5,    /* Radius eines Pin-Punkts */
    pinHit:      13,     /* Trefferradius (großzügig, auch für Touch) */
    pinStub:     8,      /* Länge des Anschluss-Stummels am Körper */
    wireW:       2.5,    /* Strichstärke einer Leitung */
    wireRadius:  8,      /* Eckenradius im Leitungsverlauf */
    bodyRadius:  7,      /* Eckenradius der Bauteilkörper */
    stroke:      1.5,    /* Standard-Strichstärke der Symbole */

    /* --- Zoom --- */
    zoomMin:     0.25,
    zoomMax:     4,
    zoomLOD:     0.55,   /* darunter: vereinfachte Darstellung */

    /* --- Animation --- */
    pulseSpeed:  70      /* Weltpixel pro Sekunde, mit denen Lichtimpulse wandern */
  };

  /* Farbe mit abweichender Deckkraft, z. B. rgba des Signal-Glows. */
  T.glow = function (alpha) { return 'rgba(' + T.glowRGB + ',' + alpha + ')'; };

  /* Dasselbe für die Markierung der Begründung. */
  T.trace = function (alpha) { return 'rgba(' + T.traceRGB + ',' + alpha + ')'; };

  C.render.theme = T;

})(window.CIRCUIT = window.CIRCUIT || {});
