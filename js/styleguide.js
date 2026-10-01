/* Entwicklerseite: zeigt alle Bauteile in allen Zustaenden und Zoomstufen.
   Referenz fuer jede spaetere Aenderung am Look. Gehoert nicht zur App. */
(function (C) {
  'use strict';

  var D    = C.util.dom;
  var T    = C.render.theme;
  var P    = C.model.parts;
  var DP   = C.render.drawParts;
  var PINS = C.render.drawPins;
  var W    = C.render.drawWires;

  var dpr = window.devicePixelRatio || 1;
  var animated = [];    /* Kacheln, die pro Frame neu gezeichnet werden */

  /* Eine Kachel: Canvas mit fester Weltgroesse und Beschriftung. */
  function tile(host, caption, worldW, worldH, scale, drawFn, isAnimated) {
    var cssW = Math.round(worldW * scale);
    var cssH = Math.round(worldH * scale);

    var cv = document.createElement('canvas');
    cv.style.width  = cssW + 'px';
    cv.style.height = cssH + 'px';
    cv.width  = Math.round(cssW * dpr);
    cv.height = Math.round(cssH * dpr);

    var node = D.el('div', { class: 'sg-tile' }, [
      cv, D.el('div', { class: 'cap', html: caption })
    ]);
    host.appendChild(node);

    var ctx = cv.getContext('2d');
    var render = function (time) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = T.bg;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      drawFn(ctx, time || 0, scale);
    };
    render(0);
    if (isAnimated) animated.push(render);
    return node;
  }

  function section(title, note) {
    var host = D.$('#sg-body');
    var sec = D.el('div', { class: 'sg-section' }, [ D.el('h2', { text: title }) ]);
    if (note) sec.appendChild(D.el('p', { text: note }));
    var grid = D.el('div', { class: 'sg-grid' });
    sec.appendChild(grid);
    host.appendChild(sec);
    return grid;
  }

  /* --- 1. Bauteile in allen Zustaenden --- */
  function partsByState() {
    var grid = section('Bauteile · Zustände',
      'Jede Zeile zeigt dasselbe Bauteil in den Zuständen, die im Editor vorkommen.');

    var states = [
      { cap: 'aus',          o: { value: 0 } },
      { cap: 'an',           o: { value: 1 } },
      { cap: 'Hover',        o: { value: 0, hover: true } },
      { cap: 'ausgewählt',   o: { value: 1, selected: true } },
      { cap: 'Fehler',       o: { value: 0, error: true } }
    ];

    P.order.concat(['port-in', 'port-out']).forEach(function (type) {
      var def = P.get(type);
      states.forEach(function (s) {
        var o = Object.assign({ scale: 1 }, s.o);
        tile(grid, '<b>' + def.name + '</b> · ' + s.cap, def.w + 24, def.h + 16, 1.4,
          function (ctx) {
            ctx.translate(12, 8);
            var part = { type: type, x: 0, y: 0 };
            DP.draw(ctx, part, o);
            PINS.drawAll(ctx, part, {
              value: o.value,
              inValues: def.ins.map(function () { return o.value; }),
              outValues: def.outs.map(function () { return o.value; })
            });
          });
      });
    });
  }

  /* --- 2. Zoomstufen ---
     tile() setzt die Skalierung bereits im Kontext; hier wird deshalb in
     Weltkoordinaten gezeichnet und nur die Kachelgroesse waechst mit. */
  function zoomLevels() {
    var grid = section('Bauteile · Zoomstufen',
      'Unter ' + Math.round(T.zoomLOD * 100) + ' % schaltet die Darstellung auf die ' +
      'vereinfachte Form um (LOD), damit große Schaltungen ruhig aussehen. ' +
      'Die Kacheln zeigen dieselbe Szene in Originalgröße der jeweiligen Zoomstufe.');

    [0.35, 0.5, 0.75, 1, 1.4, 1.8].forEach(function (s) {
      tile(grid, 'Zoom <b>' + Math.round(s * 100) + ' %</b>', 232, 88, s, function (ctx) {
        var nand = { type: 'nand', x: 8,   y: 12 };
        var led  = { type: 'led',  x: 152, y: 12 };
        var o = { value: 1, scale: s };

        var pts = W.route(88, 44, 152, 44);
        W.draw(ctx, pts, { on: true, scale: s, pulses: false });

        DP.draw(ctx, nand, o);
        DP.draw(ctx, led, o);
        if (s >= T.zoomLOD) {
          PINS.drawAll(ctx, nand, { outValues: [1], inValues: [1, 0] });
          PINS.drawAll(ctx, led, { inValues: [1] });
        }
      });
    });
  }

  /* --- 3. Leitungen --- */
  function wires() {
    var grid = section('Leitungen',
      'Rechtwinkliger Verlauf mit abgerundeten Ecken. Signal 1 leuchtet amber, ' +
      'die Lichtimpulse zeigen die Flussrichtung. Die Begründung einer Lampe ' +
      'markiert ihren Weg und blendet alles andere ab: dunkle Fassung gegen ' +
      'das Gewirr, der Saum wandert rückwärts zur Ursache.');

    var cases = [
      { cap: 'aus',                 o: { on: false } },
      { cap: 'an · mit Impulsen',   o: { on: true }, anim: true },
      { cap: 'an · ohne Impulse',   o: { on: true, pulses: false } },
      { cap: 'Hover',               o: { on: false, hover: true } },
      { cap: 'ausgewählt',          o: { on: true, selected: true }, anim: true },
      { cap: 'Fehler (schwingt)',   o: { on: false, error: true } },
      /* Begründung: Der Weg, der eine Lampe gerade bestimmt. Eigene Farbe,
         weil Amber schon das Signal meint und Blau die Auswahl. */
      { cap: 'Begründung · an',     o: { on: true, trace: true }, anim: true },
      { cap: 'Begründung · aus',    o: { on: false, trace: true } },
      { cap: 'abgeblendet',         o: { on: true, pulses: false }, dim: true }
    ];

    cases.forEach(function (c) {
      tile(grid, c.cap, 210, 104, 1, function (ctx, time) {
        var pts = W.route(12, 22, 198, 82);
        if (c.dim) { ctx.save(); ctx.globalAlpha = T.dimAlpha; }
        W.draw(ctx, pts, Object.assign({ time: time, scale: 1 }, c.o));
        W.junction(ctx, 12, 22, c.o.on);
        if (c.dim) ctx.restore();
      }, c.anim);
    });

    /* Verläufe */
    var grid2 = section('Leitungsverläufe',
      'Läuft das Ziel nach links (Rückkopplung), wird die Leitung außen herum geführt.');

    [
      { cap: 'gerade',        a: [12, 52], b: [198, 52] },
      { cap: 'Knick',         a: [12, 20], b: [198, 84] },
      { cap: 'Rückkopplung',  a: [150, 20], b: [40, 84] }
    ].forEach(function (c) {
      tile(grid2, c.cap, 210, 104, 1, function (ctx, time) {
        var pts = W.route(c.a[0], c.a[1], c.b[0], c.b[1]);
        W.draw(ctx, pts, { on: true, time: time, scale: 1 });
        W.junction(ctx, c.a[0], c.a[1], true);
      }, true);
    });
  }

  /* --- 4. Pins --- */
  function pins() {
    var grid = section('Pins', 'Großzügiger Trefferradius (' + T.pinHit + ' px) für Maus und Touch.');
    var cases = [
      { cap: 'aus',       st: {} },
      { cap: 'an',        st: { on: true } },
      { cap: 'Hover',     st: { hover: true } },
      { cap: 'passend',   st: { valid: true } },
      { cap: 'unpassend', st: { valid: true, invalid: true } }
    ];
    cases.forEach(function (c) {
      tile(grid, c.cap, 64, 64, 1.6, function (ctx) {
        PINS.one(ctx, 32, 32, c.st);
      });
    });
  }

  /* --- 5. Farben und Schrift --- */
  function tokens() {
    var host = D.$('#sg-body');
    var sec = D.el('div', { class: 'sg-section' }, [ D.el('h2', { text: 'Farben' }) ]);
    var row = D.el('div', { class: 'sg-swatches' });

    [
      ['Arbeitsfläche', T.bg], ['Panel', '#10161f'], ['Rand', '#1f2a3b'],
      ['Text', '#e6ecf5'], ['Text gedämpft', '#8a97ab'],
      ['Leitung aus', T.wireOff], ['Signal an', T.signal], ['Signal weich', T.signalSoft],
      ['Erfolg', T.ok], ['Fehler', T.err], ['Begründung', '#' +
        T.traceRGB.split(',').map(function (n) {
          return ('0' + (+n).toString(16)).slice(-2); }).join('')],
      ['Körper oben', T.bodyTop], ['Körper unten', T.bodyBottom], ['Körperrand', T.bodyBorder]
    ].forEach(function (s) {
      row.appendChild(D.el('div', { class: 'sg-swatch' }, [
        D.el('div', { class: 'chip', style: 'background:' + s[1] }),
        D.el('div', { class: 'nm', text: s[0] }),
        D.el('div', { class: 'val', text: s[1] })
      ]));
    });
    sec.appendChild(row);
    host.appendChild(sec);

    var t = D.el('div', { class: 'sg-section sg-type' }, [
      D.el('h2', { text: 'Typografie' }),
      D.el('p', { class: 't-xl', text: 'Von einem NAND zur eigenen CPU' }),
      D.el('p', { class: 't-lg', text: 'Halbaddierer · Level 11' }),
      D.el('p', { class: 't-md dim', text: 'Addiere zwei einzelne Bits. S ist die Summe, C der Übertrag.' }),
      D.el('p', { class: 't-mono', text: '0101 1100 · 0x5C · 92 · −36' })
    ]);
    host.appendChild(t);
  }

  function loop() {
    var t0 = performance.now();
    function frame(now) {
      var time = (now - t0) / 1000;
      for (var i = 0; i < animated.length; i++) animated[i](time);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    partsByState();
    zoomLevels();
    wires();
    pins();
    tokens();
    loop();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window.CIRCUIT = window.CIRCUIT || {});
