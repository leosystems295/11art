/* 11 – Art of Wall Design · Interaktionen: Hero-Bildwechsel, Projektfilter, Lightbox, mobile Anfrage-Leiste */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hero: ruhiger Bildwechsel ---------- */
  var slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1) {
    var cur = 0, timer = null, DUR = 7000;
    var countEl = document.querySelector('.hero-count');
    var projEl = document.querySelector('.hero-proj');
    var capEl = document.querySelector('.hero-caption');
    function preload(i) {
      var img = slides[(i + slides.length) % slides.length].querySelector('img');
      if (img && img.loading === 'lazy') img.loading = 'eager';
    }
    function show(i) {
      slides[cur].classList.remove('is-active');
      cur = (i + slides.length) % slides.length;
      var s = slides[cur];
      s.classList.add('is-active');
      if (countEl) countEl.textContent = (cur < 9 ? '0' : '') + (cur + 1) + ' / ' + (slides.length < 10 ? '0' : '') + slides.length;
      if (projEl) {
        projEl.style.opacity = 0;
        setTimeout(function () { projEl.textContent = s.getAttribute('data-title'); projEl.style.opacity = 1; }, 350);
      }
      if (capEl) capEl.setAttribute('href', s.getAttribute('data-href'));
      preload(cur + 1);
    }
    function start() { if (reduce) return; stop(); timer = setInterval(function () { show(cur + 1); }, DUR); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    preload(1);
    start();
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  }

  /* ---------- Mobile Anfrage-Leiste ---------- */
  function mcta() { doc.classList.toggle('show-mcta', window.scrollY > 520); }
  window.addEventListener('scroll', mcta, { passive: true });
  mcta();

  /* ---------- Projektfilter ---------- */
  var filter = document.querySelector('.filter');
  var grid = document.querySelector('.pgrid[data-filterable]');
  if (filter && grid) {
    var tiles = Array.prototype.slice.call(grid.querySelectorAll('.pj'));
    filter.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var f = b.getAttribute('data-filter');
      Array.prototype.forEach.call(filter.children, function (x) {
        x.classList.toggle('is-active', x === b);
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      tiles.forEach(function (t) { t.classList.toggle('is-hidden', !(f === 'all' || t.getAttribute('data-cat') === f)); });
      grid.classList.remove('is-filtering'); void grid.offsetWidth; grid.classList.add('is-filtering');
    });
  }

  /* ---------- Lightbox ---------- */
  var lbImgs = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox] img'));
  if (lbImgs.length) {
    var box = null, idx = 0, lastFocus = null;
    function bestSrc(img) {
      var ss = img.getAttribute('srcset');
      if (!ss) return img.currentSrc || img.src;
      var best = null, bw = 0;
      ss.split(',').forEach(function (part) {
        var p = part.trim().split(/\s+/); var w = parseInt(p[1], 10) || 0;
        if (w >= bw) { bw = w; best = p[0]; }
      });
      return best || img.src;
    }
    function render() {
      var img = lbImgs[idx];
      var el = box.querySelector('img');
      el.src = bestSrc(img); el.alt = img.alt || '';
      box.querySelector('.lb-cap').textContent = (img.alt ? img.alt + ' – ' : '') + (idx + 1) + ' von ' + lbImgs.length;
      box.querySelector('.lb-prev').hidden = lbImgs.length < 2;
      box.querySelector('.lb-next').hidden = lbImgs.length < 2;
    }
    function open(i) {
      idx = i; lastFocus = document.activeElement;
      box = document.createElement('div');
      box.className = 'lb'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Bildansicht');
      box.innerHTML = '<img alt=""><button class="lb-btn lb-close" type="button" aria-label="Schliessen"></button>' +
        '<button class="lb-btn lb-prev" type="button" aria-label="Vorheriges Bild"></button>' +
        '<button class="lb-btn lb-next" type="button" aria-label="Nächstes Bild"></button><p class="lb-cap"></p>';
      document.body.appendChild(box);
      doc.classList.add('lb-open');
      render();
      requestAnimationFrame(function () { box.classList.add('is-open'); });
      box.querySelector('.lb-close').focus();
      box.addEventListener('click', function (e) {
        if (e.target.closest('.lb-close') || e.target === box) close();
        else if (e.target.closest('.lb-prev')) { idx = (idx - 1 + lbImgs.length) % lbImgs.length; render(); }
        else if (e.target.closest('.lb-next')) { idx = (idx + 1) % lbImgs.length; render(); }
      });
      var tx = null;
      box.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
      box.addEventListener('touchend', function (e) {
        if (tx === null) return;
        var dx = e.changedTouches[0].clientX - tx; tx = null;
        if (Math.abs(dx) > 50 && lbImgs.length > 1) { idx = (idx + (dx < 0 ? 1 : -1) + lbImgs.length) % lbImgs.length; render(); }
      });
    }
    function close() {
      if (!box) return;
      var b = box; box = null;
      b.classList.remove('is-open'); doc.classList.remove('lb-open');
      setTimeout(function () { b.remove(); }, 300);
      if (lastFocus) lastFocus.focus();
    }
    document.addEventListener('keydown', function (e) {
      if (!box) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' && lbImgs.length > 1) { idx = (idx + 1) % lbImgs.length; render(); }
      if (e.key === 'ArrowLeft' && lbImgs.length > 1) { idx = (idx - 1 + lbImgs.length) % lbImgs.length; render(); }
      if (e.key === 'Tab') {
        var f = box.querySelectorAll('button:not([hidden])'); var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    lbImgs.forEach(function (img, i) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.addEventListener('click', function () { open(i); });
      img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
  }

  /* ---------- Scroll-Animationen ----------
     Bereiche erscheinen einmalig, sobald sie ins Bild kommen.
     Ablauf: Icons zeichnen sich, Goldrahmen leuchtet nacheinander auf, Verbindungslinie läuft mit. */
  if (!reduce && 'IntersectionObserver' in window) {
    var GROUPS = '.steps, .values-row, .tiles-3, .pgrid, .surfaces-track, .faq-list, .values, .more, .sv-list, .detail-grid, .nf-links';
    var SOLOS = '.head-center, .section-head, .panel, .band .wrap, .cta-inner, .contact-card, .price, .page-head .wrap, .fw-stage, .filter';
    var items = [];
    Array.prototype.forEach.call(document.querySelectorAll(GROUPS), function (g) {
      if (g.closest('.hero')) return;
      Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 7)); });
      g.classList.add('a-g', 'a-wait'); g._a = 'a-anim';
      items.push(g);
    });
    Array.prototype.forEach.call(document.querySelectorAll(SOLOS), function (el) {
      if (el.closest('.a-anim')) return;
      el.classList.add('a-s', 'a-wait'); el._a = 'a-solo';
      items.push(el);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.steps .ico svg *, .values-row .ico svg *'), function (el) {
      el.setAttribute('pathLength', '1');
    });
    var aio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; aio.unobserve(el);
        /* Übergänge erst jetzt einschalten, dann im nächsten Frame sichtbar machen */
        el.classList.add(el._a);
        requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove('a-wait'); }); });
        var t = el.classList.contains('steps') ? 3200 : 1800;
        setTimeout(function () { el.classList.remove('a-anim', 'a-solo', 'a-g', 'a-s'); }, t);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { aio.observe(el); });
  }
})();
