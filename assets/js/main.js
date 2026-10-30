/* 11 – Art of Wall Design · Grundfunktionen: Header, Navigation, Einblenden, Kontaktformular */
(function () {
  'use strict';

  var doc = document.documentElement;
  var body = document.body;

  /* Header: feine Linie nach dem Scrollen */
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile Navigation */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');
  function setNav(open) {
    body.classList.toggle('nav-open', open);
    doc.classList.toggle('nav-lock', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    }
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setNav(!body.classList.contains('nav-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('nav-open')) { setNav(false); toggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 980) setNav(false); });
  }

  /* Dezentes Einblenden beim Scrollen (einmalig) */
  var fades = document.querySelectorAll('.fade');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    fades.forEach(function (el) { io.observe(el); });
  } else {
    fades.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Jahreszahl im Footer */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Kontaktformular ---------- */
  var MAX_FILES = 5, MAX_EDGE = 1800, MAX_BYTES = 3.5 * 1024 * 1024;

  function setStatus(form, msg, type) {
    var st = form.querySelector('.form-status');
    if (!st) return;
    st.textContent = msg || '';
    st.className = 'form-status' + (type ? ' is-' + type : '');
  }

  /* Bestätigungsfenster: muss aktiv geschlossen werden */
  function popup(title, text, type) {
    var dlg = document.createElement('dialog');
    dlg.className = 'popup' + (type === 'error' ? ' popup--error' : '');
    dlg.setAttribute('aria-labelledby', 'popup-title');
    dlg.innerHTML = '<div class="popup-ico" aria-hidden="true">' +
      (type === 'error'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 7v6M12 16.5v.5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m6 12.5 4 4 8-9"/></svg>') +
      '</div><h2 id="popup-title"></h2><p></p><button class="btn btn--solid popup-close" type="button">Schliessen</button>';
    dlg.querySelector('h2').textContent = title;
    dlg.querySelector('p').textContent = text;
    document.body.appendChild(dlg);
    var close = function () { dlg.classList.add('is-closing'); setTimeout(function () { if (dlg.open) dlg.close(); dlg.remove(); }, 200); };
    dlg.querySelector('.popup-close').addEventListener('click', close);
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.querySelector('.popup-close').focus();
  }

  /* Bilder im Browser verkleinern, damit die Anfrage schnell und klein bleibt */
  function readAsDataURL(blob) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); });
  }
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('blob')); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  function prepare(file) {
    var name = (file.name || 'bild').replace(/\.[^.]+$/, '');
    return shrink(file).then(function (b) { return { blob: b, name: name + '.jpg', type: 'image/jpeg' }; })
      .catch(function () {
        if (file.size <= MAX_BYTES) return { blob: file, name: file.name || 'bild', type: file.type || 'application/octet-stream' };
        throw new Error('Das Bild «' + file.name + '» konnte nicht verarbeitet werden. Bitte wähle ein JPG oder PNG.');
      });
  }

  function uploader(form) {
    var input = form.querySelector('input[type="file"]');
    var list = form.querySelector('.upload-list');
    var files = [];
    if (!input || !list) return function () { return []; };
    function render() {
      list.innerHTML = '';
      files.forEach(function (f, i) {
        var li = document.createElement('li');
        var im = document.createElement('img'); im.alt = ''; im.src = f.preview;
        var sp = document.createElement('span'); sp.textContent = f.file.name;
        var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = 'Entfernen';
        bt.setAttribute('aria-label', f.file.name + ' entfernen');
        bt.addEventListener('click', function () { URL.revokeObjectURL(f.preview); files.splice(i, 1); render(); input.focus(); });
        li.appendChild(im); li.appendChild(sp); li.appendChild(bt); list.appendChild(li);
      });
    }
    input.addEventListener('change', function () {
      var picked = Array.prototype.slice.call(input.files || []);
      var skipped = 0;
      picked.forEach(function (file) {
        if (!/^image\//.test(file.type) && !/\.(jpe?g|png|heic|heif|webp)$/i.test(file.name)) { skipped++; return; }
        if (files.length >= MAX_FILES) { skipped++; return; }
        files.push({ file: file, preview: URL.createObjectURL(file) });
      });
      input.value = '';
      render();
      setStatus(form, skipped ? 'Es sind höchstens ' + MAX_FILES + ' Bilder möglich (JPG, PNG oder HEIC).' : '', skipped ? 'error' : '');
    });
    form.addEventListener('reset', function () { files.forEach(function (f) { URL.revokeObjectURL(f.preview); }); files = []; render(); });
    return function () { return files.map(function (f) { return f.file; }); };
  }

  function collect(form) {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name === 'botcheck' || el.disabled || el.type === 'file') return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      if (el.value === '') return;
      data[el.name] = data[el.name] ? data[el.name] + ', ' + el.value : el.value;
    });
    return data;
  }

  function send(form, getFiles) {
    var hp = form.querySelector('[name="botcheck"]');
    if (hp && hp.checked) return; // Spam-Bot
    var btn = form.querySelector('[type="submit"]');
    var endpoint = form.getAttribute('data-endpoint');
    var data = collect(form);
    var label = btn ? btn.innerHTML : '';
    function busy(on, text) {
      if (!btn) return;
      btn.disabled = on;
      if (on) btn.textContent = text || 'Wird gesendet …'; else btn.innerHTML = label;
    }
    function ok(preview) {
      var t = 'Deine Anfrage ist bei uns angekommen. Wir melden uns so schnell wie möglich bei dir.' + (preview ? ' (Vorschau: Hier wird noch nichts verschickt.)' : '');
      setStatus(form, 'Danke für deine Anfrage! Wir melden uns so schnell wie möglich bei dir.', 'ok');
      form.reset();
      popup('Danke für deine Anfrage!', t, 'ok');
    }
    function fail(err) {
      var msg = err && err.message && err.message.length > 20 ? err.message : 'Das hat leider nicht geklappt. Bitte versuch es nochmals oder schreib uns direkt.';
      setStatus(form, msg, 'error');
      popup('Nicht gesendet', msg, 'error');
    }
    var picked = getFiles();
    busy(true, picked.length ? 'Bilder werden vorbereitet …' : '');
    Promise.all(picked.map(prepare))
      .then(function (prepared) {
        return Promise.all(prepared.map(function (p) {
          return readAsDataURL(p.blob).then(function (u) { return { name: p.name, type: p.type, data: String(u).split(',')[1] || '' }; });
        }));
      })
      .then(function (bilder) {
        if (!endpoint) { busy(false); ok(true); return; }
        busy(true);
        data.seite = location.pathname;
        if (bilder.length) data.bilder = bilder;
        return fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j, status: r.status }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error((res.j && res.j.message) || (res.status === 413 ? 'Die Bilder sind zu gross. Bitte wähle weniger oder kleinere Bilder.' : 'send'));
            busy(false); ok(false);
          });
      })
      .catch(function (err) { busy(false); fail(err); });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.js-form'), function (form) {
    var getFiles = uploader(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        setStatus(form, 'Bitte fülle die markierten Felder aus.', 'error');
        return;
      }
      setStatus(form, '', '');
      send(form, getFiles);
    });
  });
})();
