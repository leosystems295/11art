/* Farbwelten – animiertes, isometrisches Hex-Diagramm der möglichen Farbtöne
   11 – Art of Wall Design · ohne externe Bibliotheken (Canvas 2D) */
(function () {
  'use strict';

  var root = document.querySelector('[data-farbwelt]');
  if (!root) return;

  var FAMILIES = [
    { id: 'erde', name: 'Erdtöne', colors: [
      ['Umbra', '#4a3b2f'], ['Tabak', '#6b5240'], ['Lehm', '#9c8166'], ['Terrakotta', '#a0623f'],
      ['Ocker', '#b98a4e'], ['Sand', '#cdb48f'], ['Leinen', '#d9cdb8'], ['Kalkweiss', '#e6dfd2'] ] },
    { id: 'grau', name: 'Grautöne', colors: [
      ['Graphit', '#2f3133'], ['Anthrazit', '#3e4144'], ['Schiefer', '#575b5e'], ['Beton', '#807f7a'],
      ['Zement', '#9d9a93'], ['Kiesel', '#b7b3aa'], ['Nebel', '#cfccc5'], ['Kreide', '#e7e5df'] ] },
    { id: 'gruen', name: 'Grüntöne', colors: [
      ['Tanne', '#233329'], ['Moos', '#3d4a33'], ['Oliv', '#5f6440'], ['Eukalyptus', '#7f9488'],
      ['Salbei', '#8c977c'], ['Lind', '#a8b090'], ['Schilf', '#b9bda3'], ['Pistazie', '#cfd3b9'] ] },
    { id: 'blau', name: 'Blautöne', colors: [
      ['Nachtblau', '#1d2836'], ['Marine', '#2c3e55'], ['Petrol', '#2f5a5f'], ['Stahl', '#4e6170'],
      ['Taubenblau', '#6e8291'], ['Rauchblau', '#8d9ca6'], ['Gletscher', '#b3c2c8'], ['Eis', '#d5dee0'] ] },
    { id: 'akzent', name: 'Akzente', colors: [
      ['Aubergine', '#4a2d3f'], ['Bordeaux', '#5a2128'], ['Ziegel', '#8f3b2c'], ['Rost', '#a3532c'],
      ['Kupfer', '#b9773f'], ['Messing', '#b9a27c'], ['Senf', '#c49a3a'], ['Altrosa', '#c49a92'] ] }
  ];

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Farbhilfen ---------- */
  function hexToRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function lum(rgb) { return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; }
  function shade(rgb, k) {
    return 'rgb(' + Math.round(Math.min(255, rgb[0] * k)) + ',' +
      Math.round(Math.min(255, rgb[1] * k)) + ',' + Math.round(Math.min(255, rgb[2] * k)) + ')';
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  FAMILIES.forEach(function (f) {
    f.colors = f.colors.map(function (c) { return { name: c[0], hex: c[1], rgb: hexToRgb(c[1]) }; })
      .sort(function (a, b) { return lum(a.rgb) - lum(b.rgb); });
  });

  /* ---------- Raster ---------- */
  var RADIUS = 4, SQ3 = Math.sqrt(3);
  var cells = [];
  for (var q = -RADIUS; q <= RADIUS; q++) {
    for (var r = Math.max(-RADIUS, -q - RADIUS); r <= Math.min(RADIUS, -q + RADIUS); r++) {
      cells.push({
        q: q, r: r,
        x: 1.5 * q, z: SQ3 * (r + q / 2),
        d: (Math.abs(q) + Math.abs(r) + Math.abs(-q - r)) / 2,
        h: 0, h0: 0, h1: 0,
        rgb: [20, 20, 22], rgb0: [20, 20, 22], rgb1: [20, 20, 22],
        color: null, delay: 0
      });
    }
  }

  // reproduzierbarer Zufall pro Familie
  function rng(seed) {
    return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  }

  function targetsFor(fi) {
    var rand = rng(97 + fi * 131);
    var cx = (rand() - 0.5) * 2.2, cz = (rand() - 0.5) * 2.2;
    var hs = cells.map(function (c) {
      var dd = Math.hypot(c.x - cx, c.z - cz) / (RADIUS * 1.75);
      var base = Math.max(0, 1 - dd);
      return 0.4 + 5.6 * Math.pow(base, 1.3) + rand() * 1.3;
    });
    var order = hs.map(function (h, i) { return i; }).sort(function (a, b) { return hs[a] - hs[b]; });
    var cols = FAMILIES[fi].colors, out = new Array(cells.length);
    order.forEach(function (idx, rank) {
      var ci = Math.min(cols.length - 1, Math.floor(rank / cells.length * cols.length));
      out[idx] = { h: hs[idx], color: cols[ci] };
    });
    return out;
  }

  /* ---------- DOM ---------- */
  var canvas = root.querySelector('.fw-canvas');
  var ctx = canvas.getContext('2d');
  var tabsEl = root.querySelector('.fw-tabs');
  var swEl = root.querySelector('.fw-swatches');
  var tip = root.querySelector('.fw-tip');
  var stage = root.querySelector('.fw-stage');

  FAMILIES.forEach(function (f, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'fw-tab'; b.textContent = f.name;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', function () { userTouched(); setFamily(i); });
    tabsEl.appendChild(b);
  });

  var current = -1, focusColor = null, focusAmt = 0;

  function renderSwatches(fi) {
    swEl.innerHTML = '';
    FAMILIES[fi].colors.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'fw-swatch';
      b.innerHTML = '<span class="fw-chip" style="background:' + c.hex + '"></span>' +
        '<span class="fw-sw-name">' + c.name + '</span><span class="fw-sw-hex">' + c.hex.toUpperCase() + '</span>';
      b.addEventListener('mouseenter', function () { focusColor = c; });
      b.addEventListener('mouseleave', function () { focusColor = null; });
      b.addEventListener('focus', function () { focusColor = c; });
      b.addEventListener('blur', function () { focusColor = null; });
      b.addEventListener('click', function () { userTouched(); focusColor = (focusColor === c && pinned) ? null : c; pinned = !!focusColor; });
      swEl.appendChild(b);
    });
  }
  var pinned = false;

  var tStart = 0, TRANS = reduce ? 1 : 1100;
  function setFamily(fi) {
    if (fi === current) return;
    current = fi; pinned = false; focusColor = null;
    var tg = targetsFor(fi), now = performance.now();
    cells.forEach(function (c, i) {
      c.h0 = c.h; c.rgb0 = c.rgb.slice();
      c.h1 = tg[i].h; c.rgb1 = tg[i].color.rgb; c.color = tg[i].color;
      c.delay = reduce ? 0 : (c.d * 55 + ((c.q * 7 + c.r * 13) & 7) * 12);
    });
    tStart = now;
    Array.prototype.forEach.call(tabsEl.children, function (b, i) {
      b.classList.toggle('is-active', i === fi);
      b.setAttribute('aria-selected', i === fi ? 'true' : 'false');
    });
    renderSwatches(fi);
    canvas.setAttribute('aria-label', 'Farbwelt ' + FAMILIES[fi].name + ': ' +
      FAMILIES[fi].colors.map(function (c) { return c.name; }).join(', '));
  }

  /* ---------- Ansicht & Interaktion ---------- */
  var theta = -0.6, tilt = 0.62, vel = reduce ? 0 : 0.0016;
  var W = 0, H = 0, dpr = 1, scale = 30, cx = 0, cy = 0;
  function resize() {
    var rect = stage.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    scale = Math.min(W / (W < 600 ? 15.5 : 16.5), H / 12.6);
    cx = W / 2; cy = H / 2 + 1.5 * scale;
  }
  window.addEventListener('resize', resize);

  var dragging = false, lastX = 0, lastY = 0, idleTimer = null, autoplay = !reduce, mouse = null;
  function userTouched() {
    autoplay = false;
    clearTimeout(idleTimer);
    if (!reduce) idleTimer = setTimeout(function () { autoplay = true; lastSwitch = performance.now(); }, 14000);
  }
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY; userTouched();
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    theta += dx * 0.008; vel = dx * 0.0008;
    tilt = Math.max(0.32, Math.min(1.05, tilt + dy * 0.004));
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false; canvas.classList.remove('is-dragging');
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', function () { mouse = null; });
  canvas.addEventListener('dblclick', function () { theta = -0.6; tilt = 0.62; });

  /* ---------- Zeichnen ---------- */
  var HEX = [];
  for (var k = 0; k < 6; k++) HEX.push([Math.cos(k * Math.PI / 3) * 0.94, Math.sin(k * Math.PI / 3) * 0.94]);
  var LIGHT = [-0.55, 0.0, -0.83]; // aus der Tiefe links

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  var hovered = null, lastSwitch = 0, visible = false, running = false;

  function frame(now) {
    if (!visible && now - tStart > TRANS + 800) { running = false; return; }
    if (autoplay && now - lastSwitch > 6200) { setFamily((current + 1) % FAMILIES.length); lastSwitch = now; }
    if (!dragging) {
      if (autoplay) vel += (0.0016 - vel) * 0.02; else vel *= 0.95;
      theta += vel;
    }
    var cos = Math.cos(theta), sin = Math.sin(theta);
    var ct = Math.cos(tilt), st = Math.sin(tilt);

    // Übergänge
    cells.forEach(function (c) {
      var t = Math.max(0, Math.min(1, (now - tStart - c.delay) / TRANS));
      var e = ease(t);
      c.h = c.h0 + (c.h1 - c.h0) * e;
      c.rgb = mix(c.rgb0, c.rgb1, Math.min(1, t * 1.4));
      c.zr = c.x * sin + c.z * cos;
    });
    var target = (focusColor ? 1 : 0);
    focusAmt += (target - focusAmt) * 0.12;

    function P(x, y, z) {
      var xr = x * cos - z * sin, zr = x * sin + z * cos;
      return [cx + xr * scale, cy + (zr * st - y * ct) * scale];
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // weicher Bodenschatten
    var g = ctx.createRadialGradient(cx, cy + scale * 0.6, scale, cx, cy + scale * 0.6, scale * 9);
    g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.ellipse(cx, cy + scale * 0.6, scale * 9, scale * 9 * st, 0, 0, Math.PI * 2); ctx.fill();

    var order = cells.slice().sort(function (a, b) { return a.zr - b.zr; });
    var hitList = [];
    order.forEach(function (c) {
      var h = Math.max(0.02, c.h);
      var dim = 1;
      if (focusAmt > 0.01 && focusColor) dim = (c.color === focusColor) ? 1 + 0.12 * focusAmt : 1 - 0.62 * focusAmt;
      var isHover = hovered === c;
      var lift = isHover ? 0.18 : 0;
      var base = c.rgb;
      var top = [], bot = [];
      for (var i = 0; i < 6; i++) {
        var vx = c.x + HEX[i][0], vz = c.z + HEX[i][1];
        top.push(P(vx, h + lift, vz)); bot.push(P(vx, lift, vz));
      }
      var path = new Path2D();
      // Seiten
      for (var j = 0; j < 6; j++) {
        var a = (j + 0.5) * Math.PI / 3;
        var nx = Math.cos(a), nz = Math.sin(a);
        if (nx * sin + nz * cos <= 0) continue;
        var n2 = (j + 1) % 6;
        var lit = 0.42 + 0.38 * Math.max(0, -(nx * LIGHT[0] + nz * LIGHT[2]));
        ctx.beginPath();
        ctx.moveTo(top[j][0], top[j][1]); ctx.lineTo(top[n2][0], top[n2][1]);
        ctx.lineTo(bot[n2][0], bot[n2][1]); ctx.lineTo(bot[j][0], bot[j][1]); ctx.closePath();
        ctx.fillStyle = shade(base, lit * dim); ctx.fill();
        path.moveTo(top[j][0], top[j][1]); path.lineTo(top[n2][0], top[n2][1]);
        path.lineTo(bot[n2][0], bot[n2][1]); path.lineTo(bot[j][0], bot[j][1]); path.closePath();
      }
      // Deckfläche
      ctx.beginPath();
      top.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.closePath();
      ctx.fillStyle = shade(base, (isHover ? 1.12 : 1.0) * dim); ctx.fill();
      ctx.strokeStyle = isHover ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = isHover ? 1.2 : 0.6; ctx.stroke();
      top.forEach(function (p, i) { if (i) path.lineTo(p[0], p[1]); else path.moveTo(p[0], p[1]); });
      path.closePath();
      hitList.push({ c: c, path: path, top: top });
    });

    // Hover-Erkennung (von vorne nach hinten)
    var newHover = null;
    if (mouse && !dragging) {
      for (var m = hitList.length - 1; m >= 0; m--) {
        if (ctx.isPointInPath(hitList[m].path, mouse.x * dpr, mouse.y * dpr)) { newHover = hitList[m]; break; }
      }
    }
    hovered = newHover ? newHover.c : null;
    if (newHover && newHover.c.color) {
      var col = newHover.c.color, tp = newHover.top;
      var tx = 0, ty = Infinity;
      tp.forEach(function (p) { tx += p[0] / 6; ty = Math.min(ty, p[1]); });
      tip.hidden = false;
      tip.querySelector('.fw-tip-chip').style.background = col.hex;
      tip.querySelector('.fw-tip-name').textContent = col.name;
      tip.querySelector('.fw-tip-hex').textContent = col.hex.toUpperCase() + ' · ' + FAMILIES[current].name;
      tip.style.transform = 'translate(' + Math.round(Math.min(W - 90, Math.max(90, tx))) + 'px,' + Math.round(ty - 14) + 'px) translate(-50%,-100%)';
      canvas.style.cursor = dragging ? 'grabbing' : 'pointer';
    } else {
      tip.hidden = true;
      canvas.style.cursor = '';
    }

    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true; requestAnimationFrame(frame);
  }

  resize();
  // Start: Säulen wachsen aus dem Boden
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        visible = en.isIntersecting;
        if (visible) {
          if (current < 0) { resize(); setFamily(0); lastSwitch = performance.now(); }
          start();
        }
      });
    }, { threshold: 0.15 }).observe(stage);
  } else {
    visible = true; setFamily(0); start();
  }
})();
