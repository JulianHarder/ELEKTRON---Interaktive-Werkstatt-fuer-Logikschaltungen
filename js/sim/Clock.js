/* Taktgeber.

   Der Taktwert gehoert bewusst NICHT ins Modell: sonst stuende nach einer
   Minute Laufzeit ein paar tausend Mal "Takt gewechselt" im Undo-Stapel.
   Er ist Zustand der Simulation, genau wie die Signale selbst. Das Bauteil
   auf der Flaeche zeigt nur an, was der Taktgeber gerade ausgibt.

   Zwei Gangarten, je nach Betriebsart:
   - Live:     Wechsel nach Millisekunden (man sieht die Schaltung arbeiten)
   - Zeitlupe: Wechsel nach Ticks (man sieht, wie das Signal wandert) */
(function (C) {
  'use strict';

  function Clock() {
    this.value = 0;
    this.running = true;
    this.periodMs = 700;        /* halbe Periode im Live-Betrieb */
    this.periodTicks = 10;      /* halbe Periode in Zeitlupe / Einzelschritt */
    this._ticks = 0;
  }

  Clock.prototype.flip = function () {
    this.value = this.value ? 0 : 1;
    return this.value;
  };

  /* Pro Simulationstick aufrufen. Liefert true, wenn gewechselt wurde. */
  Clock.prototype.onTick = function () {
    if (!this.running) return false;
    this._ticks++;
    if (this._ticks < this.periodTicks) return false;
    this._ticks = 0;
    this.flip();
    return true;
  };

  Clock.prototype.reset = function () {
    this.value = 0;
    this._ticks = 0;
  };

  /* Hat die Schaltung ueberhaupt einen Taktgeber? Nur dann muss im
     Live-Betrieb ein Zeitgeber laufen.

     Bewusst ohne Pruefung, ob er verdrahtet ist: Ein frisch gesetzter Takt
     soll blinken, auch wenn noch keine Leitung an ihm haengt. Wer wissen
     will, ob sich der Takt auf die Ausgaenge auswirkt, fragt anders –
     siehe taktLaeuft() in truth.js. */
  Clock.prototype.usedIn = function (circuit) {
    for (var i = 0; i < circuit.parts.length; i++) {
      if (circuit.parts[i].type === 'clock') return true;
    }
    return false;
  };

  C.sim.Clock = Clock;

})(window.CIRCUIT = window.CIRCUIT || {});
