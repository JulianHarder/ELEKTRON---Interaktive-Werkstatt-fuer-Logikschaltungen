/* Kleine DOM-Helfer, damit die UI-Dateien ohne Template-Strings auskommen. */
(function (C) {
  'use strict';

  var D = {};

  D.$  = function (sel, root) { return (root || document).querySelector(sel); };
  D.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* el('div', {class:'x', text:'Hallo'}, [kind1, kind2]) */
  D.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class')      node.className = v;
        else if (k === 'text')  node.textContent = v;
        else if (k === 'html')  node.innerHTML = v;
        else if (k === 'style') node.setAttribute('style', v);
        else if (k.indexOf('on') === 0 && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else node.setAttribute(k, v === true ? '' : v);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (kid) {
        if (kid === null || kid === undefined) return;
        node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
      });
    }
    return node;
  };

  D.clear = function (node) { while (node.firstChild) node.removeChild(node.firstChild); };

  D.toggleClass = function (node, name, on) {
    if (on) node.classList.add(name); else node.classList.remove(name);
  };

  /* Bevorzugt der Nutzer weniger Bewegung? (System oder eigene Einstellung) */
  D.reducedMotion = function () {
    if (document.body && document.body.classList.contains('reduce-motion')) return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  C.util.dom = D;

})(window.CIRCUIT = window.CIRCUIT || {});
