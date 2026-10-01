/* Startpunkt. Muss als letztes Skript geladen werden. */
(function (C) {
  'use strict';

  function boot() {
    try {
      /* Alte Speicherstaende aus der Zeit als das Projekt CIRCUIT bzw. FORGE
         hiess, einmalig uebernehmen - bevor irgendwer den Speicher liest. */
      C.util.storage.migrate();

      C.app.instance = new C.app.App();
      C.app.instance.start();
    } catch (err) {
      showFatal(err);
      throw err;
    }
  }

  /* Wenn beim Start etwas schiefgeht, soll man nicht vor einer schwarzen
     Flaeche sitzen, sondern den Grund sehen. */
  function showFatal(err) {
    var box = document.createElement('div');
    box.setAttribute('style',
      'position:fixed;inset:auto 16px 16px 16px;z-index:99;padding:12px 14px;' +
      'background:#21151a;border:1px solid #ff5d73;border-radius:10px;' +
      'color:#ffd9df;font:13px/1.5 monospace;white-space:pre-wrap');
    box.textContent = 'Start fehlgeschlagen:\n' + (err && err.stack ? err.stack : err);
    document.body.appendChild(box);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window.CIRCUIT = window.CIRCUIT || {});
