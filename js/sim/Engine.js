/* Die Rechenmaschine: sie kennt nur Signale und NAND-Gatter, keine Bauteile,
   keine Koordinaten.

   Ein Tick rechnet ALLE Gatter gleichzeitig aus dem alten Zustand und
   schreibt sie in den neuen. Das entspricht einer Gatterlaufzeit von einem
   Tick. Genau deshalb verhalten sich Rueckkopplungen wie in echt: ein
   SR-Latch haelt seinen Wert, und ein Ring aus ungerade vielen Invertern
   schwingt – statt in einer Endlosschleife haengen zu bleiben. */
(function (C) {
  'use strict';

  var LIMIT = 2000;          /* so viele Ticks darf das Einpendeln dauern */
  var HOT_ROUNDS = 24;       /* so lange wird nach dem Limit noch beobachtet */

  function Engine() {
    this.net = null;
    this.cur = new Uint8Array(1);
    this.nxt = new Uint8Array(1);
    this.ticks = 0;
    this.oscillating = false;
    this.hot = null;         /* Signalnummern, die nicht zur Ruhe kommen */
    this.cold = true;        /* seit load/reset wurde noch nicht gerechnet */
  }

  Engine.prototype.load = function (net) {
    this.net = net;
    this.cur = new Uint8Array(net.count);
    this.nxt = new Uint8Array(net.count);
    this.ticks = 0;
    this.oscillating = false;
    this.hot = null;
    this.cold = true;
  };

  /* Wert einer Quelle setzen (Schalter, Konstante, Takt). */
  Engine.prototype.setInput = function (sig, value) {
    if (sig > 0 && sig < this.cur.length) this.cur[sig] = value ? 1 : 0;
  };

  Engine.prototype.value = function (sig) {
    return sig > 0 && sig < this.cur.length ? this.cur[sig] : 0;
  };

  /* Ein Tick. Liefert true, wenn sich etwas geaendert hat. */
  Engine.prototype.tick = function () {
    var n = this.net;
    if (!n) return false;
    this.cold = false;

    var cur = this.cur, nxt = this.nxt;
    nxt.set(cur);                       /* Quellen und ruhende Signale uebernehmen */

    var a = n.ga, b = n.gb, y = n.gy, m = n.gateCount;
    var changed = false;

    for (var i = 0; i < m; i++) {
      var v = (cur[a[i]] & cur[b[i]]) ? 0 : 1;
      if (nxt[y[i]] !== v) { nxt[y[i]] = v; changed = true; }
    }

    this.cur = nxt;
    this.nxt = cur;
    this.ticks++;
    return changed;
  };

  /* Ticken, bis sich nichts mehr aendert. Liefert true, wenn das gelungen ist.
     Sonst schwingt die Schaltung – dann wird noch kurz beobachtet, welche
     Signale daran beteiligt sind, damit die Oberflaeche sie markieren kann. */
  Engine.prototype.settle = function (limit) {
    var max = limit || LIMIT;
    if (this.cold) this.warmUp();

    for (var i = 0; i < max; i++) {
      if (!this.tick()) {
        this.oscillating = false;
        this.hot = null;
        return true;
      }
    }

    this.oscillating = true;
    this.hot = this.collectHot(HOT_ROUNDS);
    return false;
  };

  /* Welche Signale wechseln staendig? */
  Engine.prototype.collectHot = function (rounds) {
    var hot = {};
    var n = this.cur.length;

    for (var r = 0; r < rounds; r++) {
      var before = new Uint8Array(this.cur);
      this.tick();
      for (var s = 1; s < n; s++) {
        if (before[s] !== this.cur[s]) hot[s] = true;
      }
    }
    return hot;
  };

  Engine.prototype.isHot = function (sig) {
    return !!(this.hot && this.hot[sig]);
  };

  /* Liegt irgendwo eine 1 an? Damit entscheidet die Darstellung, ob sich
     das dauernde Neuzeichnen fuer die Lichtimpulse ueberhaupt lohnt. */
  Engine.prototype.anyHigh = function () {
    for (var i = 1; i < this.cur.length; i++) if (this.cur[i]) return true;
    return false;
  };

  Engine.prototype.reset = function () {
    this.cur.fill(0);
    this.nxt.fill(0);
    this.ticks = 0;
    this.oscillating = false;
    this.hot = null;
    this.cold = true;
  };

  /* --- Der erste Moment nach dem Einschalten ---

     Nach load() und reset() stehen alle Signale auf 0. Fuer rueckgekoppelte
     Schaltungen ist das eine Zwickmuehle: Zwei ueber Kreuz verbundene Gatter
     sind dann vollkommen symmetrisch. Beide wollen dasselbe, keines gibt
     nach – und die Schaltung schwingt, statt sich fuer einen Zustand zu
     entscheiden. Ein Speicher, der beim Einschalten schwingt, waere aber
     falsch: In echter Elektronik entscheidet die winzige Ungleichheit zweier
     Bauteile. Eines schaltet minimal frueher und zieht das andere mit.

     Genau das macht dieser eine Durchlauf nach. Er rechnet die Gatter
     nacheinander statt gleichzeitig, sodass jedes die schon gerechneten
     Werte der vorherigen sieht. Welches Gatter dabei zuerst drankommt, ist
     die Reihenfolge der Netzliste – willkuerlich, aber immer dieselbe, und
     genau das ist die Rolle der Bauteilstreuung.

     Danach laeuft alles wieder synchron mit einer Gatterlaufzeit pro Tick.
     Ein echter Oszillator – ein Ring aus ungerade vielen Invertern – schwingt
     deshalb weiterhin: Der kommt auch so nicht zur Ruhe. */
  Engine.prototype.warmUp = function () {
    var n = this.net;
    this.cold = false;
    if (!n) return;

    var cur = this.cur;
    var a = n.ga, b = n.gb, y = n.gy, m = n.gateCount;
    for (var i = 0; i < m; i++) {
      cur[y[i]] = (cur[a[i]] & cur[b[i]]) ? 0 : 1;
    }
  };

  C.sim.Engine = Engine;
  C.sim.LIMIT  = LIMIT;

})(window.CIRCUIT = window.CIRCUIT || {});
