/* 11 – Art of Wall Design · Interaktionen (Hero, Karussell, Lightbox, Filter, Parallax) */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Bild-Reveals, die nicht schon von main.js beobachtet werden ---------- */
  var clips = document.querySelectorAll('.reveal-clip:not(.reveal)');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    clips.forEach(function (el) { io.observe(el); });
  } else {
    clips.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Seitenübergänge ---------- */
  if (!reduce) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|https?:)/i.test(href)) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      doc.classList.add('is-leaving');
      setTimeout(function () { location.href = url.href; }, 260);
    });
    window.addEventListener('pageshow', function () { doc.classList.remove('is-leaving'); });
  }

  /* ---------- Hero: Foto-Wechsel ---------- */
  var slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1) {
    var cur = 0;
    var countEl = document.querySelector('.hero-count b');
    var projEl = document.querySelector('.hero-proj');
    var capEl = document.querySelector('.hero-caption');
    var bar = document.querySelector('.hero-progress span');
    var DUR = 6500;
    var timer = null;
    function runBar() {
      if (!bar) return;
      bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
    }
    function show(i) {
      slides[cur].classList.remove('is-active');
      cur = (i + slides.length) % slides.length;
      var s = slides[cur];
      // Bild nachladen, falls noch nicht geladen
      var img = s.querySelector('img');
      if (img && img.loading === 'lazy') img.loading = 'eager';
      s.classList.add('is-active');
      if (countEl) countEl.textContent = (cur < 9 ? '0' : '') + (cur + 1);
      if (projEl) {
        projEl.style.opacity = 0;
        setTimeout(function () { projEl.textContent = s.getAttribute('data-title'); projEl.style.opacity = 1; }, 300);
      }
      if (capEl) capEl.setAttribute('href', s.getAttribute('data-href'));
      runBar();
    }
    function start() {
      if (reduce) return;
      stop();
      runBar();
      timer = setInterval(function () { show(cur + 1); }, DUR);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    // Nächstes Bild schon vorab laden
    slides.forEach(function (s, i) { if (i > 0) { var im = s.querySelector('img'); if (im) im.loading = 'eager'; } });
    var delay = doc.classList.contains('show-intro') ? 2400 : 0;
    setTimeout(start, delay);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  }

  /* ---------- Karussell «Ausgewählte Arbeiten» ---------- */
  var track = document.querySelector('.showcase-track');
  if (track) {
    var items = track.querySelectorAll('.sc-item');
    var prev = document.querySelector('.sc-prev');
    var next = document.querySelector('.sc-next');
    var cnt = document.querySelector('.sc-count b');
    function step() { return items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : track.clientWidth; }
    function index() { return Math.round(track.scrollLeft / step()); }
    function update() {
      var i = Math.min(items.length - 1, Math.max(0, index()));
      if (cnt) cnt.textContent = (i < 9 ? '0' : '') + (i + 1);
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    }
    function go(d) { track.scrollBy({ left: d * step(), behavior: reduce ? 'auto' : 'smooth' }); }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    // Mit der Maus ziehen
    var down = false, moved = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 5 && !moved) { moved = true; track.classList.add('is-dragging'); }
      if (moved) track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (moved) {
        track.classList.remove('is-dragging');
        var i = Math.round(track.scrollLeft / step());
        track.scrollTo({ left: i * step(), behavior: reduce ? 'auto' : 'smooth' });
      }
    });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    update();
    window.addEventListener('resize', update);
  }

  /* ---------- Parallax ---------- */
  var par = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (par.length && !reduce) {
    var ticking = false;
    function paint() {
      var vh = window.innerHeight;
      par.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var f = parseFloat(el.getAttribute('data-parallax')) || 0;
        var off = (r.top + r.height / 2 - vh / 2) * f;
        el.style.translate = '0 ' + off.toFixed(1) + 'px';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ---------- Mobile Anfrage-Leiste ---------- */
  function mcta() { doc.classList.toggle('show-mcta', window.scrollY > 520); }
  window.addEventListener('scroll', mcta, { passive: true });
  mcta();

  /* ---------- Projektfilter ---------- */
  /* Raster: Fünfergruppen (2 gross, 3 klein), Rest füllt die Zeile vollständig */
  function layout(n) {
    var out = [], full = Math.floor(n / 5), r = n % 5;
    for (var i = 0; i < full; i++) out.push('big first', 'big', '', '', '');
    var rest = { 0: [], 1: ['big first full'], 2: ['big first', 'big'], 3: ['', '', ''], 4: ['big first', 'big', 'big first', 'big'] };
    return out.concat(rest[r]);
  }
  var filter = document.querySelector('.filter');
  var grid = document.querySelector('.projects.masonry');
  if (filter && grid) {
    var tiles = Array.prototype.slice.call(grid.querySelectorAll('.project'));
    filter.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var f = b.getAttribute('data-filter');
      Array.prototype.forEach.call(filter.children, function (x) {
        x.classList.toggle('is-active', x === b);
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      var vis = tiles.filter(function (t) { return f === 'all' || t.getAttribute('data-cat') === f; });
      var lay = layout(vis.length);
      tiles.forEach(function (t) {
        t.classList.add('is-hidden');
        t.classList.remove('big', 'first', 'full');
      });
      vis.forEach(function (t, i) {
        t.classList.remove('is-hidden');
        if (lay[i]) lay[i].split(' ').forEach(function (c) { t.classList.add(c); });
        t.classList.add('is-visible');
      });
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
      box.querySelector('.lb-cap').textContent = (img.alt ? img.alt + ' · ' : '') + (idx + 1) + ' / ' + lbImgs.length;
      box.querySelector('.lb-prev').hidden = lbImgs.length < 2;
      box.querySelector('.lb-next').hidden = lbImgs.length < 2;
    }
    function open(i) {
      idx = i; lastFocus = document.activeElement;
      box = document.createElement('div');
      box.className = 'lb'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Bildansicht');
      box.innerHTML = '<img alt=""><button class="lb-btn lb-close" type="button" aria-label="Schliessen"></button>' +
        '<button class="lb-btn lb-prev" type="button" aria-label="Vorheriges Bild"><span class="arrow arrow--left" aria-hidden="true"></span></button>' +
        '<button class="lb-btn lb-next" type="button" aria-label="Nächstes Bild"><span class="arrow" aria-hidden="true"></span></button><p class="lb-cap"></p>';
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
})();

/* Leistungen-Scroller: stehendes Bild wechselt mit dem aktiven Eintrag */
(function () {
  var items = document.querySelectorAll('.lx-item');
  if (!items.length) return;
  var imgs = document.querySelectorAll('.lx-img');
  var count = document.querySelector('.lx-count b');
  function set(i) {
    items.forEach(function (it, k) { it.classList.toggle('is-active', k === i); });
    imgs.forEach(function (im, k) { im.classList.toggle('is-active', k === i); });
    if (count) count.textContent = (i < 9 ? '0' : '') + (i + 1);
  }
  set(0);
  if (!('IntersectionObserver' in window)) { items.forEach(function (it) { it.classList.add('is-active'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) set(+e.target.getAttribute('data-i')); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  items.forEach(function (it) { io.observe(it); });
})();

/* Bewertungs-Slider (automatisch, Pfeile, Swipe) und schwebendes Kontaktmenü */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var track = document.querySelector('.rv-track');
  if (track) {
    var step = function () { var it = track.querySelector('.rv-item'); return it ? it.getBoundingClientRect().width + 24 : track.clientWidth; };
    var go = function (d) {
      var end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (d > 0 && end) track.scrollTo({ left: 0, behavior: reduce ? 'auto' : 'smooth' });
      else track.scrollBy({ left: d * step(), behavior: reduce ? 'auto' : 'smooth' });
    };
    var p = document.querySelector('.rv-prev'), n = document.querySelector('.rv-next');
    if (p) p.addEventListener('click', function () { go(-1); });
    if (n) n.addEventListener('click', function () { go(1); });
    var t = null, start = function () { if (!reduce) { stop(); t = setInterval(function () { go(1); }, 6000); } }, stop = function () { if (t) clearInterval(t); };
    ['pointerenter', 'focusin', 'touchstart'].forEach(function (ev) { track.addEventListener(ev, stop, { passive: true }); });
    track.addEventListener('pointerleave', start);
    start();
  }
  var fc = document.querySelector('[data-fc]');
  if (fc) {
    var b = fc.querySelector('.fc-btn'), m = fc.querySelector('.fc-menu');
    b.addEventListener('click', function () { var o = m.hidden; m.hidden = !o; b.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    document.addEventListener('click', function (e) { if (!fc.contains(e.target)) { m.hidden = true; b.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { m.hidden = true; b.setAttribute('aria-expanded', 'false'); } });
  }
})();
