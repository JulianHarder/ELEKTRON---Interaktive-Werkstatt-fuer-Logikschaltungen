/* Haelt Simulation und Schaltung zusammen.

   Die Werkzeuge aendern das Modell, hier wird daraus neu kompiliert und
   gerechnet. Die Darstellung fragt umgekehrt nur nach Werten und muss nichts
   von Signalnummern wissen.

   Drei Betriebsarten:
   - live: nach jeder Aenderung sofort einpendeln (das fertige Ergebnis)
   - slow: ein Tick alle paar hundert Millisekunden (man sieht es wandern)
   - step: angehalten, ein Tick pro Klick */
(function (C) {
  'use strict';

  var SLOW_MS = 170;

  function Runner(circuit) {
    this.circuit = circuit;
    this.engine  = new C.sim.Engine();
    this.clock   = new C.sim.Clock();

    this.mode  = 'live';
    this.net   = null;
    this.dirty = true;          /* Netzliste muss neu gebaut werden */
    this.onUpdate = null;       /* function (runner) */

    this._slowTimer = null;
    this._clockTimer = null;
    this._clockMs = 0;          /* Dauer, mit der der Zeitgeber gerade laeuft */
  }

  /* --- Netzliste --- */

  Runner.prototype.invalidate = function () { this.dirty = true; };

  Runner.prototype.build = function () {
    if (!this.dirty) return;
    this.net = C.sim.compile(this.circuit);
    this.engine.load(this.net);
    this.dirty = false;
  };

  /* Quellen aus dem Modell in die Rechenmaschine schreiben. */
  Runner.prototype.applyInputs = function () {
    var e = this.engine, c = this.circuit, clk = this.clock;
    this.net.inputs.forEach(function (inp) {
      var p = c.part(inp.part);
      if (!p) return;
      e.setInput(inp.sig, inp.type === 'clock' ? clk.value : (p.value || 0));
    });
  };

  /* Nach jeder Modelaenderung aufrufen. */
  Runner.prototype.refresh = function () {
    this.build();
    this.applyInputs();
    if (this.mode === 'live') this.engine.settle();
    this.sync();
    this.fire();
  };

  /* Genau ein Tick – fuer Zeitlupe und Einzelschritt. */
  Runner.prototype.step = function () {
    this.build();
    if (this.clock.onTick()) { /* Takt hat gewechselt */ }
    this.applyInputs();
    this.engine.tick();
    this.fire();
  };

  /* --- Betriebsart --- */

  Runner.prototype.setMode = function (mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.sync();
    if (mode === 'live') this.refresh(); else this.fire();
  };

  /* Zeitgeber an die Betriebsart anpassen. Laeuft schon das Richtige, wird
     nichts angefasst – sonst wuerde jede Mausbewegung den Takt zuruecksetzen. */
  Runner.prototype.sync = function () {
    var self = this;
    var wantSlow  = this.mode === 'slow';
    var wantClock = this.mode === 'live' && this.clock.running &&
                    this.clock.usedIn(this.circuit);

    /* Eine geaenderte Taktdauer zaehlt auch als Unterschied – sonst liefe der
       Zeitgeber mit dem alten Wert weiter. */
    if (wantSlow === !!this._slowTimer && wantClock === !!this._clockTimer &&
        (!wantClock || this._clockMs === this.clock.periodMs)) return;

    stop(this, '_slowTimer');
    stop(this, '_clockTimer');
    this._clockMs = this.clock.periodMs;

    if (wantSlow) {
      this._slowTimer = setInterval(function () { self.step(); }, SLOW_MS);
      return;
    }

    /* Im Live-Betrieb gibt es keinen Tickstrom, an dem der Takt haengen
       koennte – dort laeuft er nach der Uhr. */
    if (wantClock) {
      this._clockTimer = setInterval(function () {
        self.clock.flip();
        self.applyInputs();
        self.engine.settle();
        self.fire();
      }, this.clock.periodMs);
    }
  };

  function stop(self, key) {
    if (self[key]) { clearInterval(self[key]); self[key] = null; }
  }

  Runner.prototype.reset = function () {
    this.engine.reset();
    this.clock.reset();
    this.refresh();
  };

  Runner.prototype.dispose = function () {
    stop(this, '_slowTimer');
    stop(this, '_clockTimer');
  };

  /* --- Auskuenfte fuer die Darstellung --- */

  Runner.prototype.pinValue = function (partId, kind, index) {
    if (!this.net) return 0;
    return this.engine.value(this.net.pinSig[partId + ':' + kind + ':' + index]);
  };

  Runner.prototype.wireOn = function (wireId) {
    if (!this.net) return false;
    return this.engine.value(this.net.wireSig[wireId]) === 1;
  };

  Runner.prototype.wireHot = function (wireId) {
    if (!this.net || !this.engine.oscillating) return false;
    return this.engine.isHot(this.net.wireSig[wireId]);
  };

  /* Was das Bauteil selbst anzeigt. */
  Runner.prototype.partValue = function (part) {
    if (part.type === 'led' || part.type === 'port-out') {
      return this.pinValue(part.id, 'in', 0);
    }
    if (part.type === 'clock') return this.clock.value;
    if (part.type === 'nand')  return this.pinValue(part.id, 'out', 0);
    return part.value || 0;               /* Schalter, Konstante */
  };

  Runner.prototype.nandCount    = function () { return this.net ? this.net.gateCount : 0; };
  Runner.prototype.isOscillating = function () { return this.engine.oscillating; };
  Runner.prototype.ticks        = function () { return this.engine.ticks; };
  Runner.prototype.anyHigh      = function () { return this.engine.anyHigh(); };

  Runner.prototype.fire = function () {
    if (this.onUpdate) this.onUpdate(this);
  };

  C.sim.Runner = Runner;

})(window.CIRCUIT = window.CIRCUIT || {});
