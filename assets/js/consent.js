/* 11 – Art of Wall Design · Cookie-Abfrage
   Speichert die Auswahl lokal im Browser (localStorage, technisch notwendig).
   Dienste mit Einwilligung einbinden: <script type="text/plain" data-consent="statistik" src="…"></script>
   bzw. data-consent="marketing". Sie werden erst nach Zustimmung geladen. */
(function () {
  'use strict';
  var KEY = 'aowd-consent-v1';
  var doc = document.documentElement;
  var box = null;

  function read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save(c) {
    c.datum = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    apply(c);
  }
  function apply(c) {
    doc.setAttribute('data-consent', ['notwendig', c.statistik ? 'statistik' : '', c.marketing ? 'marketing' : ''].filter(Boolean).join(' '));
    Array.prototype.forEach.call(document.querySelectorAll('script[type="text/plain"][data-consent]'), function (old) {
      if (!c[old.getAttribute('data-consent')]) return;
      var s = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function (a) { if (a.name !== 'type') s.setAttribute(a.name, a.value); });
      s.text = old.text; old.parentNode.replaceChild(s, old);
    });
    try { window.dispatchEvent(new CustomEvent('consentchange', { detail: c })); } catch (e) {}
  }

  function close() {
    if (!box) return;
    var b = box; box = null;
    b.classList.remove('is-open'); doc.classList.remove('cc-open');
    setTimeout(function () { b.remove(); }, 300);
  }

  function open(withSettings) {
    if (box) return;
    var cur = read() || {};
    box = document.createElement('section');
    box.className = 'cc';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-labelledby', 'cc-title');
    box.innerHTML =
      '<h2 id="cc-title">Cookies und Datenschutz</h2>' +
      '<p>Wir verwenden nur technisch notwendige Speicherungen, damit die Website funktioniert. Mit deiner Zustimmung dürfen wir zusätzlich Statistik- und Marketing-Dienste nutzen. Deine Wahl kannst du jederzeit im Footer unter «Cookie-Einstellungen» ändern. Mehr dazu in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>' +
      '<div class="cc-opts" hidden>' +
        '<label class="cc-opt"><input type="checkbox" checked disabled><span class="cc-sw" aria-hidden="true"></span><span><b>Notwendig</b>Speichert zum Beispiel deine Cookie-Auswahl. Immer aktiv.</span></label>' +
        '<label class="cc-opt"><input type="checkbox" name="statistik"><span class="cc-sw" aria-hidden="true"></span><span><b>Statistik</b>Anonyme Auswertung, wie die Website genutzt wird.</span></label>' +
        '<label class="cc-opt"><input type="checkbox" name="marketing"><span class="cc-sw" aria-hidden="true"></span><span><b>Marketing und externe Medien</b>Inhalte von Drittanbietern, zum Beispiel Karten, Videos oder Werbung.</span></label>' +
      '</div>' +
      '<div class="cc-btns">' +
        '<button class="btn btn--solid" type="button" data-cc="alle">Alle akzeptieren</button>' +
        '<button class="btn" type="button" data-cc="notwendig">Nur notwendige</button>' +
        '<button class="cc-more" type="button" data-cc="einstellungen" aria-expanded="false">Einstellungen</button>' +
      '</div>';
    document.body.appendChild(box);
    var opts = box.querySelector('.cc-opts');
    box.querySelector('[name="statistik"]').checked = !!cur.statistik;
    box.querySelector('[name="marketing"]').checked = !!cur.marketing;
    var more = box.querySelector('[data-cc="einstellungen"]');
    function showSettings() {
      opts.hidden = false; more.setAttribute('aria-expanded', 'true');
      more.textContent = 'Auswahl speichern'; more.setAttribute('data-cc', 'speichern');
    }
    if (withSettings) showSettings();
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cc]'); if (!b) return;
      var a = b.getAttribute('data-cc');
      if (a === 'alle') { save({ notwendig: true, statistik: true, marketing: true }); close(); }
      else if (a === 'notwendig') { save({ notwendig: true, statistik: false, marketing: false }); close(); }
      else if (a === 'einstellungen') { showSettings(); box.querySelector('[name="statistik"]').focus(); }
      else if (a === 'speichern') {
        save({ notwendig: true, statistik: box.querySelector('[name="statistik"]').checked, marketing: box.querySelector('[name="marketing"]').checked });
        close();
      }
    });
    doc.classList.add('cc-open');
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('is-open'); }); });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-consent-open]');
    if (t) { e.preventDefault(); open(true); }
  });

  var c = read();
  if (c) apply(c); else open(false);
  window.cookieEinstellungen = function () { open(true); };
})();
