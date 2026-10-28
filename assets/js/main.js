(function () {
  'use strict';

  var doc = document.documentElement;
  var body = document.body;

  /* Neue Seite immer ganz oben öffnen (auch beim Zurückgehen) */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function toTop() {
    if (location.hash && location.hash.length > 1) return;
    var prev = doc.style.scrollBehavior;
    doc.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    doc.style.scrollBehavior = prev;
  }
  toTop();
  window.addEventListener('pageshow', toTop);

  /* Header: Hintergrund nach dem Scrollen */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile Navigation */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');
  function setNav(open) {
    body.classList.toggle('nav-open', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    }
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setNav(!body.classList.contains('nav-open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setNav(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1000) setNav(false);
    });
  }

  /* Elemente beim Scrollen einblenden */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Jahreszahl im Footer */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* Formulare: Versand an /api/kontakt, Honeypot, Ladezustand, Erfolg/Fehler ohne Seitenwechsel */
  function setStatus(form, msg, type) {
    var st = form.querySelector('.form-status');
    if (!st) return;
    st.textContent = msg;
    st.className = 'form-status is-visible' + (type ? ' is-' + type : '');
  }
  function collect(form) {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name === 'botcheck' || el.disabled) return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      if (el.value === '') return;
      data[el.name] = data[el.name] ? data[el.name] + ', ' + el.value : el.value;
    });
    return data;
  }
  function send(form) {
    var hp = form.querySelector('[name="botcheck"]');
    if (hp && hp.checked) return; // Spam-Bot
    var btn = form.querySelector('[type="submit"]');
    var endpoint = form.getAttribute('data-endpoint');
    var data = collect(form);
    var done = function () {
      form.classList.add('is-sent');
      form.reset();
      window.scrollTo({ top: Math.max(0, form.getBoundingClientRect().top + window.scrollY - 140), behavior: 'smooth' });
    };
    if (!endpoint) {
      setStatus(form, 'Danke für deine Anfrage! Wir melden uns so schnell wie möglich bei dir. (Vorschau: Hier wird noch nichts verschickt.)', 'ok');
      done();
      return;
    }
    data.seite = location.pathname;
    var label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); btn.textContent = 'Wird gesendet …'; }
    fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data)
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error((res.j && res.j.message) || 'send');
        setStatus(form, 'Danke für deine Anfrage! Wir melden uns so schnell wie möglich bei dir.', 'ok');
        done();
      })
      .catch(function (err) {
        var msg = err && err.message && err.message !== 'send' && err.message.length > 20 ? err.message : 'Das hat leider nicht geklappt. Bitte versuch es nochmals oder schreib uns direkt per E-Mail oder Telefon.';
        setStatus(form, msg, 'error');
      })
      .then(function () { if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); btn.innerHTML = label; } });
  }

  /* Mehrstufiges Formular */
  function stepper(form) {
    var steps = Array.prototype.slice.call(form.querySelectorAll('.fstep'));
    var dots = form.querySelectorAll('.steps-progress li');
    var bar = form.querySelector('.steps-bar span');
    var back = form.querySelector('.steps-back'), next = form.querySelector('.steps-next'), submit = form.querySelector('.steps-submit');
    var cur = 0;
    form.classList.add('is-stepped');
    function valid(step) {
      var group = step.querySelector('.tiles[data-min]');
      if (group && !group.querySelector('input:checked')) {
        setStatus(form, 'Bitte wähle mindestens eine Leistung aus.', 'error');
        var first = group.querySelector('input'); if (first) first.focus();
        return false;
      }
      var fields = step.querySelectorAll('input, select, textarea');
      for (var i = 0; i < fields.length; i++) {
        if (!fields[i].checkValidity()) { fields[i].reportValidity(); return false; }
      }
      setStatus(form, '', ''); form.querySelector('.form-status').className = 'form-status';
      return true;
    }
    function summary() {
      var dl = form.querySelector('.summary dl'); if (!dl) return;
      var d = collect(form);
      var rows = [['Leistung', d.leistung], ['Raum', d.raum], ['Fläche', d.flaeche ? d.flaeche + ' m²' : ''], ['Ort', d.ort], ['Zeitraum', d.zeitraum], ['Besichtigung', d.besichtigung ? d.besichtigung.split('-').reverse().join('.') : ''], ['Beschreibung', d.nachricht]];
      dl.innerHTML = '';
      rows.forEach(function (r) {
        if (!r[1]) return;
        var dt = document.createElement('dt'); dt.textContent = r[0];
        var dd = document.createElement('dd'); dd.textContent = r[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
    }
    function show(i) {
      cur = i;
      steps.forEach(function (s, k) { s.classList.toggle('is-current', k === i); });
      Array.prototype.forEach.call(dots, function (d, k) { d.classList.toggle('is-current', k === i); d.classList.toggle('is-done', k < i); });
      if (bar) bar.style.width = ((i + 1) / steps.length * 100) + '%';
      back.hidden = i === 0;
      next.hidden = i === steps.length - 1;
      submit.hidden = i !== steps.length - 1;
      if (i === steps.length - 1) summary();
      var top = form.getBoundingClientRect().top + window.scrollY - 120;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
      var lg = steps[i].querySelector('legend'); if (lg) { lg.setAttribute('tabindex', '-1'); lg.focus({ preventScroll: true }); }
    }
    next.addEventListener('click', function () { if (valid(steps[cur])) show(cur + 1); });
    back.addEventListener('click', function () { show(cur - 1); });
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && cur < steps.length - 1) { e.preventDefault(); next.click(); }
    });
    show(0);
    return function () { return valid(steps[cur]); };
  }

  Array.prototype.forEach.call(document.querySelectorAll('.js-form'), function (form) {
    var stepValid = form.classList.contains('form--steps') ? stepper(form) : null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (stepValid && !stepValid()) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      send(form);
    });
  });
})();
