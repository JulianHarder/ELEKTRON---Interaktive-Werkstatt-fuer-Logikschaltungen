/* Der Block "Warum?" in der Karte.

   Zeigt, was C.sim.why.explain() gefunden hat: ein Satz mit den Schaltern,
   auf die es ankommt – und darunter der Weg dorthin als eingerueckter Baum.
   Die Leitungen desselben Weges sind auf der Flaeche markiert; beides
   zusammen beantwortet "warum leuchtet das?".

   Reine Darstellung. Was ein ausreichender Grund ist, entscheidet why.js. */
(function (C) {
  'use strict';

  var D = C.util.dom;

  var MAX_QUELLEN = 6;        /* darueber wird die Aufzaehlung zusammengefasst */

  /* Liefert den fertigen Block oder null, wenn es nichts zu zeigen gibt. */
  function build(w) {
    if (!w) return null;

    var box = D.el('div', { class: 'why' });
    box.appendChild(D.el('p', { class: 'why-head', text: ueberschrift(w) }));
    box.appendChild(satz(w));
    box.appendChild(baum(w.root, 0));

    var fuss = fussnote(w);
    if (fuss) box.appendChild(D.el('p', { class: 'why-note', text: fuss }));
    return box;
  }

  function ueberschrift(w) {
    return w.value ? 'Warum leuchtet ' + w.name + '?'
                   : 'Warum ist ' + w.name + ' aus?';
  }

  /* --- Der Satz ---

     "Dafuer genuegt" statt "nur deshalb": Es ist ein ausreichender Grund.
     Stehen beide Eingaenge eines OR auf 1, haette auch jeder allein
     gereicht – die Begruendung nennt dann den ersten. */

  function satz(w) {
    var p = D.el('p', { class: 'why-text' });

    if (!w.quellen.length) {
      p.appendChild(document.createTextNode(w.loop
        ? 'Der Wert steht fest, weil die Schaltung sich ihn gemerkt hat – ' +
          'kein Schalter bestimmt ihn gerade.'
        : 'Kein Schalter bestimmt diesen Wert.'));
      return p;
    }

    p.appendChild(document.createTextNode('Dafür genügt: '));
    var zeigen = w.quellen.slice(0, MAX_QUELLEN);

    zeigen.forEach(function (q, i) {
      if (i) {
        p.appendChild(document.createTextNode(
          i === zeigen.length - 1 && w.quellen.length <= MAX_QUELLEN ? ' und ' : ', '));
      }
      p.appendChild(wert(q.name, q.value));
    });

    if (w.quellen.length > MAX_QUELLEN) {
      p.appendChild(document.createTextNode(
        ' und ' + (w.quellen.length - MAX_QUELLEN) + ' weitere'));
    }
    p.appendChild(document.createTextNode('.'));
    return p;
  }

  /* "A = 1" – Name und Wert, der Wert in Signalfarbe, wenn er 1 ist. */
  function wert(name, v) {
    return D.el('span', { class: 'why-pair' }, [
      D.el('span', { class: 'why-name', text: name }),
      D.el('span', { class: 'why-eq', text: ' = ' }),
      D.el('span', { class: 'why-val' + (v ? ' is-on' : ''), text: String(v) })
    ]);
  }

  /* --- Der Weg ---

     Ein Baum, kein Pfad: Ein AND, das 1 ausgibt, hat zwei Gruende, und beide
     gehen weiter. Eingerueckt wird mit verschachtelten Kaesten statt mit
     Zeichen, damit die Linien auch bei schmaler Karte stimmen. */

  function baum(n, tiefe) {
    var node = D.el('div', { class: 'why-node' }, [zeile(n)]);
    if (!n.kids.length) return node;

    var kids = D.el('div', { class: 'why-kids' });
    n.kids.forEach(function (k) { kids.appendChild(baum(k, tiefe + 1)); });
    node.appendChild(kids);
    return node;
  }

  function zeile(n) {
    if (n.art === 'offen') {
      return D.el('div', { class: 'why-row is-open' }, [
        D.el('span', { class: 'why-name',
          text: n.pin ? 'Eingang ' + n.pin : 'Eingang' }),
        D.el('span', { class: 'why-eq', text: ' ist offen, zählt als ' }),
        D.el('span', { class: 'why-val', text: '0' })
      ]);
    }

    if (n.art === 'quelle') {
      return D.el('div', { class: 'why-row' }, [wert(n.name, n.value)]);
    }

    /* Gatter: "OR gibt 1". Bei einer Rueckkopplung steht dahinter, woher
       der Wert wirklich kommt – aus dem, was vorher war. */
    var row = D.el('div', { class: 'why-row' }, [
      D.el('span', { class: 'why-name', text: n.name }),
      D.el('span', { class: 'why-eq', text: ' gibt ' }),
      D.el('span', { class: 'why-val' + (n.value ? ' is-on' : ''), text: String(n.value) })
    ]);
    if (n.art === 'loop') {
      row.appendChild(D.el('span', { class: 'why-tag', text: 'gemerkt' }));
      D.toggleClass(row, 'is-loop', true);
    }
    return row;
  }

  /* --- Was man dazusagen muss --- */

  function fussnote(w) {
    if (w.deep) {
      return 'Der Weg verzweigt sich weiter, als hier Platz ist – der Rest ' +
             'ist abgeschnitten. Die markierten Leitungen zeigen, wie weit ' +
             'die Begründung reicht.';
    }
    if (w.loop) {
      return 'Ein Teil davon kommt daher, dass die Schaltung sich etwas ' +
             'gemerkt hat: Dort steht der Wert fest, weil er vorher schon ' +
             'stand – nicht weil ein Schalter ihn gerade bestimmt.';
    }
    return '';
  }

  C.ui.whyBox = { build: build };

})(window.CIRCUIT = window.CIRCUIT || {});
