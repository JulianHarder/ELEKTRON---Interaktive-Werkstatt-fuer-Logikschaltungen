/* Kamera: Weltkoordinaten <-> Bildschirmkoordinaten, Zoom und Verschieben.

   Zwei Kniffe für ein scharfes Bild:
   1. Die Skalierung rastet auf ganze Gerätepixel pro Rasterzelle ein – aber erst,
      wenn die Kamera zur Ruhe kommt. Während der Bewegung läuft sie stufenlos,
      sonst ruckelt der Zoom über die groben Raststufen (beim Herauszoomen liegen
      die über 20 % auseinander).
   2. Die Verschiebung wird auf ganze Gerätepixel gerundet. Raster und Bauteile
      verschieben sich damit immer gemeinsam, nichts "flimmert". */
(function (C) {
  'use strict';

  var math = C.util.math;
  var T = C.render.theme;

  function Camera() {
    this.x = 0;          /* Weltkoordinate an der linken oberen Ecke */
    this.y = 0;
    this.scale = 1;
    this.dpr = 1;

    /* Ziele für das weiche Nachgleiten beim Zoomen. */
    this.targetX = 0;
    this.targetY = 0;
    this.targetScale = 1;
    this.smoothing = true;

    /* Der stufenlose Zoomwunsch, getrennt vom eingerasteten Ziel.
       Ohne ihn verschluckt sich feines Zoomen selbst: Ein Trackpad oder ein
       hochauflösendes Mausrad meldet Schritte, die kleiner sind als eine
       Raststufe. Die würden beim Einrasten jedes Mal wieder weggerundet –
       der Zoom bewegt sich dann überhaupt nicht. Hier summieren sie sich. */
    this.zoomWish = 1;
  }

  /* Haelt eine Skalierung in den erlaubten Grenzen – stufenlos. */
  Camera.prototype.clampScale = function (scale) {
    return math.clamp(scale, T.zoomMin, T.zoomMax);
  };

  /* Rastet eine Skalierung so ein, dass eine ganze Rasterkachel (5 Zellen)
     ganzzahlig viele Geraetepixel breit ist. Die Kachel statt der einzelnen
     Zelle zu nehmen macht die Stufen fuenfmal feiner: bei 30 % Zoom sind es
     4 % Abstand statt 20 %, und der Sprung am Ende einer Zoombewegung faellt
     nicht mehr auf. Nur fuer den Ruhezustand gedacht, nicht fuer jeden Frame. */
  Camera.prototype.quantize = function (scale) {
    var s = this.clampScale(scale);
    var span = T.grid * T.gridMajor * this.dpr;
    return Math.max(T.gridMajor, Math.round(span * s)) / span;
  };

  Camera.prototype.setDpr = function (dpr) {
    this.dpr = dpr || 1;
    this.scale = this.quantize(this.scale);
    this.setScale(this.targetScale);
  };

  /* Skalierung unmittelbar setzen – für Einpassen, Zurücksetzen und
     Bildschirmwechsel. Anders als zoomAt() setzt das auch den stufenlosen
     Wunsch neu: hier beginnt eine neue Zoomreihe, nichts soll sich aus der
     vorigen übertragen. */
  Camera.prototype.setScale = function (s) {
    this.targetScale = this.quantize(s);
    this.zoomWish = this.targetScale;
  };

  /* Verschiebung in Gerätepixeln, ganzzahlig gerundet. */
  Camera.prototype.txDev = function () { return Math.round(-this.x * this.scale * this.dpr); };
  Camera.prototype.tyDev = function () { return Math.round(-this.y * this.scale * this.dpr); };

  /* Setzt die Transformation für das Zeichnen in Weltkoordinaten. */
  Camera.prototype.apply = function (ctx) {
    var s = this.scale * this.dpr;
    ctx.setTransform(s, 0, 0, s, this.txDev(), this.tyDev());
  };

  Camera.prototype.worldToScreen = function (wx, wy) {
    var s = this.scale * this.dpr;
    return {
      x: (wx * s + this.txDev()) / this.dpr,
      y: (wy * s + this.tyDev()) / this.dpr
    };
  };

  Camera.prototype.screenToWorld = function (sx, sy) {
    var s = this.scale * this.dpr;
    return {
      x: (sx * this.dpr - this.txDev()) / s,
      y: (sy * this.dpr - this.tyDev()) / s
    };
  };

  /* Sichtbarer Weltausschnitt – für Culling. */
  Camera.prototype.visibleRect = function (cssW, cssH, pad) {
    var a = this.screenToWorld(0, 0);
    var b = this.screenToWorld(cssW, cssH);
    var p = pad || 0;
    return { x: a.x - p, y: a.y - p, w: (b.x - a.x) + 2 * p, h: (b.y - a.y) + 2 * p };
  };

  /* Direktes Verschieben (folgt der Maus 1:1, deshalb ohne Glätten). */
  Camera.prototype.panByScreen = function (dxCss, dyCss) {
    this.x -= dxCss / this.scale;
    this.y -= dyCss / this.scale;
    this.targetX = this.x;
    this.targetY = this.y;
  };

  /* Zoom zum Mauszeiger. factor > 1 heißt heranzoomen.

     Gerechnet wird auf dem stufenlosen Wunsch, nicht auf dem eingerasteten
     Ziel – sonst gingen Schritte verloren, die kleiner sind als eine
     Raststufe (siehe zoomWish oben). */
  Camera.prototype.zoomAt = function (sxCss, syCss, factor) {
    var oldScale = this.targetScale;
    var wish = this.clampScale(this.zoomWish * factor);
    if (wish === this.zoomWish) return false;     /* schon am Anschlag */
    this.zoomWish = wish;

    /* Weltpunkt unter dem Zeiger festhalten. */
    var wx = this.targetX + sxCss / oldScale;
    var wy = this.targetY + syCss / oldScale;

    this.targetScale = wish;
    this.targetX = wx - sxCss / wish;
    this.targetY = wy - syCss / wish;

    if (!this.smoothing) this.snapToTarget();
    return true;
  };

  /* Kommt zur Ruhe: jetzt darf eingerastet werden. Das Ziel rastet mit ein,
     sonst faende update() sofort wieder eine Restdifferenz und liefe endlos.
     Der stufenlose Wunsch bleibt bewusst stehen – er ist der Faden, an dem
     die nächste Radbewegung weiterzählt. */
  Camera.prototype.snapToTarget = function () {
    var s = this.quantize(this.targetScale);
    this.targetScale = s;
    this.scale = s;
    this.x = this.targetX;
    this.y = this.targetY;
  };

  /* Nähert die Kamera ihrem Ziel an. Gibt true zurück, solange noch Bewegung nötig ist. */
  Camera.prototype.update = function (dt) {
    if (!this.smoothing) { this.snapToTarget(); return false; }

    /* Zeitunabhängige Annäherung: pro Sekunde bleibt ein Milliardstel der
       Differenz übrig. Zusammen mit den Schwellen unten steht die Kamera nach
       gut 150 ms – im Rahmen, den der Plan für Animationen vorgibt. */
    var k = 1 - Math.pow(1e-9, Math.min(dt, 0.05));
    var ds = this.targetScale - this.scale;
    var dx = this.targetX - this.x;
    var dy = this.targetY - this.y;

    /* Schwellen so gewaehlt, dass der Rest unter einem Bildpunkt liegt. */
    var nearScale = Math.abs(ds) < this.targetScale * 0.003;
    var nearPos   = Math.abs(dx) * this.scale < 0.4 && Math.abs(dy) * this.scale < 0.4;
    if (nearScale && nearPos) { this.snapToTarget(); return false; }

    /* Bewusst ohne quantize: sonst ist ein kleiner Zwischenschritt kleiner als
       eine Raststufe, wird weggerundet und die Bewegung bleibt haengen. */
    this.scale += ds * k;
    this.x += dx * k;
    this.y += dy * k;
    return true;
  };

  /* Setzt die Ansicht so, dass ein Weltrechteck mittig sichtbar ist. */
  Camera.prototype.centerOn = function (rect, cssW, cssH) {
    this.setScale(this.targetScale);
    this.targetX = rect.x + rect.w / 2 - cssW / (2 * this.targetScale);
    this.targetY = rect.y + rect.h / 2 - cssH / (2 * this.targetScale);
    this.snapToTarget();
  };

  C.render.Camera = Camera;

})(window.CIRCUIT = window.CIRCUIT || {});
