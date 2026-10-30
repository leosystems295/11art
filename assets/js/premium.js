/* 11 – Art of Wall Design · Projektfilter und Bildansicht */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Projekte: Filter und ausgewogene Verteilung auf zwei Spalten ---------- */
  var works = document.querySelector('.works[data-filterable]');
  var filter = document.querySelector('.filter');
  if (works && filter) {
    var cols = works.querySelectorAll('.works-col');
    var all = Array.prototype.slice.call(works.querySelectorAll('.work')).sort(function (a, b) { return a.getAttribute('data-i') - b.getAttribute('data-i'); });
    function layout(f) {
      var h = [0, 0.18];             /* rechte Spalte startet tiefer */
      var w = [7, 5];
      all.forEach(function (el) {
        var show = f === 'all' || el.getAttribute('data-cat') === f;
        el.classList.toggle('is-hidden', !show);
        if (!show) { cols[0].appendChild(el); return; }
        var r = parseFloat(el.getAttribute('data-ratio')) || 1;
        var c = el.hasAttribute('data-narrow') ? 1 : (h[0] <= h[1] ? 0 : 1);
        cols[c].appendChild(el);
        h[c] += (el.hasAttribute('data-small') ? 0.6 : 1) * r * w[c] / 7 + 0.12;
      });
    }
    filter.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      Array.prototype.forEach.call(filter.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      layout(b.getAttribute('data-filter'));
      works.classList.remove('is-filtering'); void works.offsetWidth; works.classList.add('is-filtering');
    });
  }

  /* ---------- Feder-Physik (nach Apple «Designing Fluid Interfaces») ----------
     response = wie schnell das Ziel erreicht wird (s), damping = 1 ohne Nachwippen.
     Startet immer vom aktuellen Wert und übernimmt die aktuelle Geschwindigkeit. */
  function Spring(value, opts) {
    this.x = value; this.v = 0; this.target = value; this.o = opts || { response: 0.4, damping: 1 }; this.raf = 0; this.cb = null;
  }
  Spring.prototype.to = function (target, opts, velocity, onUpdate, onDone) {
    var s = this; s.target = target; if (opts) s.o = opts; if (typeof velocity === 'number') s.v = velocity;
    if (onUpdate) s.cb = onUpdate; s.done = onDone || null;
    cancelAnimationFrame(s.raf);
    var last = performance.now();
    var k = Math.pow(2 * Math.PI / s.o.response, 2), c = 4 * Math.PI * s.o.damping / s.o.response;
    function step(now) {
      var dt = Math.min(0.064, (now - last) / 1000); last = now;
      var n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
      for (var i = 0; i < n; i++) { var a = -k * (s.x - s.target) - c * s.v; s.v += a * h; s.x += s.v * h; }
      var settled = Math.abs(s.x - s.target) < (s.o.eps || 0.05) && Math.abs(s.v) < (s.o.eps || 0.05) * 10;
      if (settled) { s.x = s.target; s.v = 0; }
      if (s.cb) s.cb(s.x);
      if (!settled) s.raf = requestAnimationFrame(step); else if (s.done) s.done();
    }
    if (reduce) { s.x = target; s.v = 0; if (s.cb) s.cb(s.x); if (s.done) s.done(); return; }
    s.raf = requestAnimationFrame(step);
  };
  Spring.prototype.stop = function () { cancelAnimationFrame(this.raf); };
  Spring.prototype.set = function (v) { this.stop(); this.x = v; this.v = 0; this.target = v; };
  /* Wohin ein Wisch mit dieser Geschwindigkeit führen würde (Apple: Projektion wie Scroll-Abbremsung) */
  function project(v, d) { d = d || 0.998; return (v / 1000) * d / (1 - d); }
  function rubber(over, dim) { var c = 0.55; return (over * dim * c) / (dim + c * Math.abs(over)); }

  /* ---------- Bildansicht: zoomt aus der Kachel, folgt dem Finger 1:1 ---------- */
  var lbImgs = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox] img'));
  if (lbImgs.length) {
    var box = null, idx = 0, lastFocus = null, closing = false;
    var X = new Spring(0), Y = new Spring(0), P = new Spring(0); // X/Y getrennt, P = Morph Kachel→Vollbild
    var morph = null; // {from:{x,y,s,c:[t,r,b,l]}, to:{...}}
    function bestSrc(img) {
      var ss = img.getAttribute('srcset');
      if (!ss) return img.currentSrc || img.src;
      var best = null, bw = 0;
      ss.split(',').forEach(function (part) { var p = part.trim().split(/\s+/); var w = parseInt(p[1], 10) || 0; if (w >= bw) { bw = w; best = p[0]; } });
      return best || img.src;
    }
    function fitSize(img) {
      var ar = (img.naturalWidth || img.width || 4) / (img.naturalHeight || img.height || 3);
      var mw = Math.min(window.innerWidth * 0.92, 1600), mh = window.innerHeight * 0.82;
      var w = mw, h = w / ar; if (h > mh) { h = mh; w = h * ar; }
      return { w: Math.round(w), h: Math.round(h) };
    }
    function thumbState(img, size) {
      var r = img.getBoundingClientRect();
      if (r.width < 2 || r.bottom < 0 || r.top > window.innerHeight) return null;
      var s = Math.max(r.width / size.w, r.height / size.h);
      var cx = (size.w * s - r.width) / s / 2, cy = (size.h * s - r.height) / s / 2;
      return { x: r.left + r.width / 2 - window.innerWidth / 2, y: r.top + r.height / 2 - window.innerHeight / 2, s: s, c: [cy, cx, cy, cx] };
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function paint() {
      if (!box) return;
      var el = box.querySelector('.lb-img'), bg = box.querySelector('.lb-bg');
      var x = X.x, y = Y.x, s = 1, c = [0, 0, 0, 0], o = 1, p = P.x;
      if (morph) {
        x += lerp(morph.from.x, morph.to.x, p); y += lerp(morph.from.y, morph.to.y, p); s = lerp(morph.from.s, morph.to.s, p);
        c = [0, 1, 2, 3].map(function (i) { return lerp(morph.from.c[i], morph.to.c[i], p); });
        o = morph.fade ? lerp(morph.from.o, morph.to.o, p) : 1;
      }
      var drag = Math.min(1, Math.abs(Y.x) / (window.innerHeight * 0.5));
      s *= 1 - drag * 0.25;
      el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
      el.style.clipPath = 'inset(' + c.map(function (v) { return Math.max(0, v).toFixed(1) + 'px'; }).join(' ') + ')';
      el.style.opacity = o;
      var bgo = (morph ? lerp(morph.from.bg, morph.to.bg, p) : 1) * (1 - drag * 0.85);
      bg.style.opacity = Math.max(0, Math.min(1, bgo));
      box.querySelectorAll('.lb-btn, .lb-cap').forEach(function (b) { b.style.opacity = Math.max(0, bgo * (1 - drag * 1.5)); });
    }
    [X, Y, P].forEach(function (s) { s.cb = paint; });
    function setImage(i) {
      var img = lbImgs[i], el = box.querySelector('.lb-img');
      var size = fitSize(img);
      el.style.width = size.w + 'px'; el.style.height = size.h + 'px';
      el.src = img.currentSrc || img.src; el.alt = img.alt || '';
      var hi = bestSrc(img); if (hi !== el.src) { var pre = new Image(); pre.onload = function () { if (box && idx === i) el.src = hi; }; pre.src = hi; }
      el.setAttribute('data-hi', hi);
      box.querySelector('.lb-cap').textContent = (img.alt ? img.alt + ' – ' : '') + (i + 1) + ' von ' + lbImgs.length;
      return size;
    }
    function go(dir, velocity) {
      if (lbImgs.length < 2) { X.to(0, { response: 0.35, damping: 0.8 }, velocity || 0); return; }
      var w = window.innerWidth, ni = (idx + dir + lbImgs.length) % lbImgs.length, nimg = lbImgs[ni];
      box.querySelector('.lb-cap').textContent = (nimg.alt ? nimg.alt + ' – ' : '') + (ni + 1) + ' von ' + lbImgs.length;
      X.to(-dir * w, { response: 0.3, damping: 1, eps: 2 }, velocity || 0, null, function () {
        idx = (idx + dir + lbImgs.length) % lbImgs.length; setImage(idx);
        X.set(dir * w * 0.6); paint();
        X.to(0, { response: 0.4, damping: 1 }, velocity ? velocity * 0.6 : 0);
      });
    }
    function open(i) {
      idx = i; lastFocus = document.activeElement; closing = false;
      box = document.createElement('div');
      box.className = 'lb'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Bildansicht');
      box.innerHTML = '<div class="lb-bg"></div><img class="lb-img" alt="" draggable="false"><button class="lb-btn lb-close" type="button" aria-label="Schliessen"></button>' +
        '<button class="lb-btn lb-prev" type="button" aria-label="Vorheriges Bild"></button>' +
        '<button class="lb-btn lb-next" type="button" aria-label="Nächstes Bild"></button><p class="lb-cap"></p>';
      document.body.appendChild(box);
      doc.classList.add('lb-open');
      var size = setImage(i);
      box.querySelector('.lb-prev').hidden = lbImgs.length < 2;
      box.querySelector('.lb-next').hidden = lbImgs.length < 2;
      var full = { x: 0, y: 0, s: 1, c: [0, 0, 0, 0], o: 1, bg: 1 };
      var th = thumbState(lbImgs[i], size);
      var start = th ? { x: th.x, y: th.y, s: th.s, c: th.c, o: 1, bg: 0 } : { x: 0, y: 24, s: 0.94, c: [0, 0, 0, 0], o: 0, bg: 0 };
      morph = { from: start, to: full, fade: !th };
      X.set(0); Y.set(0); P.set(0); box.classList.add('is-open'); paint();
      P.to(1, { response: 0.42, damping: 1, eps: 0.002 });
      box.querySelector('.lb-close').focus();
      bindGestures();
    }
    function close() {
      if (!box || closing) return;
      closing = true;
      var size = { w: parseFloat(box.querySelector('.lb-img').style.width), h: parseFloat(box.querySelector('.lb-img').style.height) };
      var th = thumbState(lbImgs[idx], size);
      // Vom aktuellen Zustand aus (inkl. Wisch-Versatz) zurück in die Kachel
      var cur = { x: X.x + (morph ? lerp(morph.from.x, morph.to.x, P.x) : 0), y: Y.x + (morph ? lerp(morph.from.y, morph.to.y, P.x) : 0), s: 1 - Math.min(1, Math.abs(Y.x) / (window.innerHeight * 0.5)) * 0.25, c: [0, 0, 0, 0], o: 1, bg: parseFloat(box.querySelector('.lb-bg').style.opacity || 1) };
      var vy = Y.v;
      X.set(0); Y.set(0);
      morph = { from: cur, to: th ? { x: th.x, y: th.y, s: th.s, c: th.c, o: 1, bg: 0 } : { x: cur.x, y: cur.y + 40, s: 0.94, c: [0, 0, 0, 0], o: 0, bg: 0 }, fade: !th };
      P.set(0); doc.classList.remove('lb-open');
      var b = box;
      P.to(1, { response: 0.34, damping: 1, eps: 0.004 }, Math.abs(vy) / 1000, null, function () { b.remove(); if (box === b) box = null; morph = null; });
      setTimeout(function () { if (b.isConnected) { b.remove(); if (box === b) box = null; } }, 650);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    function bindGestures() {
      var el = box, axis = null, sx = 0, sy = 0, hist = [], ox = 0, oy = 0, active = false;
      el.addEventListener('click', function (e) {
        if (e.target.closest('.lb-close') || e.target.classList.contains('lb-bg')) close();
        else if (e.target.closest('.lb-prev')) go(-1);
        else if (e.target.closest('.lb-next')) go(1);
      });
      el.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || e.target.closest('.lb-btn') || closing) return;
        active = true; axis = null; sx = e.clientX; sy = e.clientY;
        X.stop(); Y.stop(); ox = X.x; oy = Y.x;          // unterbrechen: vom aktuellen Wert weiter
        hist = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      });
      el.addEventListener('pointermove', function (e) {
        if (!active) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (!axis) { if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; sx = e.clientX - (axis === 'x' ? dx : 0); sy = e.clientY - (axis === 'y' ? dy : 0); }
        hist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp }); if (hist.length > 6) hist.shift();
        if (axis === 'x') { var nx = ox + (e.clientX - sx); if (lbImgs.length < 2) nx = rubber(nx, window.innerWidth); X.set(nx); }
        else { var ny = oy + (e.clientY - sy); if (ny < 0) ny = rubber(ny, window.innerHeight); Y.set(ny); }
        paint();
      });
      function end(e) {
        if (!active) return; active = false;
        var a = hist[0], b = hist[hist.length - 1], dt = Math.max(1, b.t - a.t);
        var vx = (b.x - a.x) / dt * 1000, vy = (b.y - a.y) / dt * 1000;
        if (axis === 'x') {
          var endX = X.x + project(vx);
          if (endX < -window.innerWidth * 0.35) go(1, vx); else if (endX > window.innerWidth * 0.35) go(-1, vx);
          else X.to(0, { response: 0.35, damping: 0.8 }, vx);       // Schwung zurück, leichtes Federn
        } else if (axis === 'y') {
          Y.v = vy;
          var endY = Y.x + project(vy);
          if (endY > window.innerHeight * 0.3) close();
          else Y.to(0, { response: 0.35, damping: 0.8 }, vy);
        }
        axis = null;
      }
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    }
    document.addEventListener('keydown', function (e) {
      if (!box || closing) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' && lbImgs.length > 1) go(1);
      if (e.key === 'ArrowLeft' && lbImgs.length > 1) go(-1);
      if (e.key === 'Tab') {
        var f = box.querySelectorAll('button:not([hidden])'); var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', function () { if (box && !closing) { setImage(idx); paint(); } });
    lbImgs.forEach(function (img, i) {
      img.setAttribute('tabindex', '0'); img.setAttribute('role', 'button');
      img.addEventListener('click', function () { open(i); });
      img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
  }
})();
