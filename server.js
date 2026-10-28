/*
 * 11 – Art of Wall Design · Webserver für Render
 * - liefert die statische Website aus
 * - POST /api/kontakt verschickt Anfragen per E-Mail (SMTP, z. B. Hostpoint)
 * Keine externen Pakete nötig (nur Node.js ab Version 18).
 *
 * Umgebungsvariablen (in Render unter «Environment» eintragen):
 *   SMTP_HOST   z. B. asmtp.mail.hostpoint.ch
 *   SMTP_PORT   465 (SSL) oder 587 (STARTTLS)
 *   SMTP_USER   E-Mail-Adresse des Postfachs, z. B. info@deine-domain.ch
 *   SMTP_PASS   Passwort dieses Postfachs
 *   MAIL_TO     Empfänger der Anfragen (mehrere mit Komma)
 *   MAIL_FROM   Absender (meist gleich wie SMTP_USER)
 *   AUTO_REPLY  «1» = Kunde erhält eine kurze Eingangsbestätigung (Standard: 1)
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const tls = require('tls');
const zlib = require('zlib');
const os = require('os');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const BRAND = '11 – Art of Wall Design';
const env = (k, d = '') => (process.env[k] || d).trim();

/* ------------------------------------------------------------ Statische Dateien */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json'
};
const COMPRESS = /^(text\/|application\/(xml|json|manifest)|image\/svg)/;

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function allowed(rel) {
  // Keine Server-Dateien, keine versteckten Dateien ausliefern
  if (rel.split('/').some((p) => p.startsWith('.'))) return false;
  const ext = path.extname(rel).toLowerCase();
  if (!TYPES[ext]) return false;
  if (ext === '.js' || ext === '.json') return rel.startsWith('assets/');
  return true;
}

function sendFile(req, res, file, status = 200) {
  const ext = path.extname(file).toLowerCase();
  const type = TYPES[ext];
  fs.readFile(file, (err, buf) => {
    if (err) return notFound(req, res);
    securityHeaders(res);
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', ext === '.html' || ext === '.xml' || ext === '.txt'
      ? 'no-cache' : 'public, max-age=604800');
    const gz = COMPRESS.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && buf.length > 1024;
    if (gz) { buf = zlib.gzipSync(buf); res.setHeader('Content-Encoding', 'gzip'); res.setHeader('Vary', 'Accept-Encoding'); }
    res.writeHead(status, { 'Content-Length': buf.length });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
}

function notFound(req, res) {
  const f = path.join(ROOT, '404.html');
  if (fs.existsSync(f)) return sendFile(req, res, f, 404);
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Seite nicht gefunden');
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  if (!path.extname(rel) && fs.existsSync(path.join(ROOT, rel + '.html'))) rel += '.html'; // /kontakt -> kontakt.html
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) || !allowed(rel)) return notFound(req, res);
  fs.stat(file, (err, st) => (err || !st.isFile()) ? notFound(req, res) : sendFile(req, res, file));
}

/* ------------------------------------------------------------ SMTP (ohne Pakete) */
function smtpSend({ from, to, replyTo, subject, text, html }) {
  const host = env('SMTP_HOST'), port = Number(env('SMTP_PORT', '465'));
  const user = env('SMTP_USER'), pass = env('SMTP_PASS');
  const insecure = env('SMTP_INSECURE') === '1'; // nur für lokale Tests
  const secure = env('SMTP_SECURE') ? env('SMTP_SECURE') === '1' : port === 465; // 465 = SSL, sonst STARTTLS
  if (!host || !user || !pass) return Promise.reject(new Error('SMTP ist nicht konfiguriert'));
  const recipients = to.split(',').map((s) => s.trim()).filter(Boolean);
  const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
  const wrap = (s) => s.replace(/.{1,76}/g, '$&\r\n');
  const boundary = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  const domain = (from.split('@')[1] || 'localhost').replace(/>.*/, '');
  const msg = [
    `From: =?UTF-8?B?${b64(BRAND)}?= <${from}>`,
    `To: ${recipients.join(', ')}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`, 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', wrap(b64(text)),
    `--${boundary}`, 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '', wrap(b64(html)),
    `--${boundary}--`, ''
  ].filter((l) => l !== null).join('\r\n');

  return new Promise((resolve, reject) => {
    let sock, buf = '', waiter = null, done = false;
    const tlsOpts = { host, servername: host, rejectUnauthorized: !insecure };
    const fail = (e) => { if (done) return; done = true; try { sock && sock.destroy(); } catch (_) {} reject(e); };
    const timer = setTimeout(() => fail(new Error('SMTP-Zeitüberschreitung')), 20000);
    const onData = (d) => {
      buf += d.toString('utf8');
      if (!waiter) return; // Antwort aufbewahren, bis jemand darauf wartet
      const lines = buf.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) { // letzte Zeile einer (mehrzeiligen) Antwort
          const resp = lines.slice(0, i + 1).join('\n'); buf = lines.slice(i + 1).join('\r\n');
          const w = waiter; waiter = null; if (w) w(resp); return;
        }
      }
    };
    const read = () => new Promise((r) => { waiter = r; if (buf) onData(''); });
    const cmd = async (line, ok) => {
      if (line !== null) sock.write(line + '\r\n');
      const r = await read();
      if (!String(ok).split(',').some((c) => r.startsWith(c))) throw new Error('SMTP: ' + r.split('\n').pop());
      return r;
    };
    const attach = (s) => { sock = s; s.on('data', onData); s.on('error', fail); };
    const run = async () => {
      await cmd(null, '220');
      await cmd('EHLO ' + os.hostname(), '250');
      if (!secure) { // STARTTLS
        await cmd('STARTTLS', '220');
        sock.removeListener('data', onData);
        await new Promise((r, j) => { const t = tls.connect({ ...tlsOpts, socket: sock }, r); t.on('error', j); attach(t); });
        await cmd('EHLO ' + os.hostname(), '250');
      }
      await cmd('AUTH LOGIN', '334'); await cmd(b64(user), '334'); await cmd(b64(pass), '235');
      await cmd(`MAIL FROM:<${from}>`, '250');
      for (const r of recipients) await cmd(`RCPT TO:<${r}>`, '250,251');
      await cmd('DATA', '354');
      await cmd(msg.replace(/\r\n\./g, '\r\n..') + '\r\n.', '250');
      try { sock.write('QUIT\r\n'); } catch (_) {}
    };
    const start = () => run().then(() => { done = true; clearTimeout(timer); sock.end(); resolve(); }, (e) => { clearTimeout(timer); fail(e); });
    if (secure) { const s = tls.connect({ ...tlsOpts, port }, start); attach(s); }
    else { const s = net.connect({ host, port }, start); attach(s); }
  });
}

/* ------------------------------------------------------------ Kontakt-API */
const LABELS = {
  vorname: 'Vorname', nachname: 'Nachname', email: 'E-Mail', telefon: 'Telefon', rueckruf: 'Rückruf gewünscht',
  leistung: 'Leistung', projektart: 'Projektart', raum: 'Raum', flaeche: 'Fläche (m²)', ort: 'Ort des Projekts',
  zeitraum: 'Zeitraum', besichtigung: 'Wunschtermin Besichtigung', nachricht: 'Nachricht'
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hits = new Map();
function limited(ip) { // max. 5 Anfragen pro 10 Minuten und IP
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 600000);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 30000) { reject(new Error('zu gross')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parse(body, type) {
  if (/json/.test(type)) return JSON.parse(body || '{}');
  const out = {};
  for (const [k, v] of new URLSearchParams(body)) out[k] = out[k] ? out[k] + ', ' + v : v;
  return out;
}

async function handleKontakt(req, res) {
  const isForm = !/json/.test(req.headers['content-type'] || '');
  const reply = (status, ok, message) => {
    if (isForm) { // Fallback ohne JavaScript
      if (ok) { res.writeHead(303, { Location: '/danke.html' }); return res.end(); }
      res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anfrage</title><body style="font-family:system-ui;background:#0a0a0b;color:#eee;padding:40px"><p>${esc(message)}</p><p><a style="color:#fff" href="javascript:history.back()">Zurück zum Formular</a></p>`);
    }
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok, message }));
  };
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (limited(ip)) return reply(429, false, 'Zu viele Anfragen. Bitte versuch es in ein paar Minuten nochmals.');
    const d = parse(await readBody(req), req.headers['content-type'] || '');
    if (d.botcheck) return reply(200, true, 'ok'); // Spam-Bot: still ignorieren
    const email = String(d.email || '').trim();
    if (!d.vorname || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !d.datenschutz) {
      return reply(400, false, 'Bitte fülle Vorname, eine gültige E-Mail-Adresse und die Datenschutz-Bestätigung aus.');
    }
    const rows = Object.keys(LABELS).filter((k) => d[k]).map((k) => [LABELS[k], String(d[k]).slice(0, 4000)]);
    const name = [d.vorname, d.nachname].filter(Boolean).join(' ');
    const topic = d.leistung || d.projektart || 'Anfrage';
    const text = `Neue Anfrage über die Website\n\n${rows.map(([l, v]) => `${l}: ${v}`).join('\n')}\n\nGesendet von: ${d.seite || 'Website'}`;
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#141413"><h2 style="font-weight:normal">Neue Anfrage über die Website</h2><table cellpadding="8" style="border-collapse:collapse">${rows.map(([l, v]) => `<tr><td style="color:#6e6a62;vertical-align:top;border-bottom:1px solid #eee">${esc(l)}</td><td style="border-bottom:1px solid #eee;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table><p style="color:#6e6a62;font-size:13px">Antworte einfach auf diese E-Mail, sie geht direkt an ${esc(email)}.</p></div>`;
    const from = env('MAIL_FROM') || env('SMTP_USER');
    await smtpSend({ from, to: env('MAIL_TO') || from, replyTo: email, subject: `Neue Anfrage: ${topic} – ${name}`, text, html });
    if (env('AUTO_REPLY', '1') === '1') {
      const t = `Hoi ${d.vorname}\n\nDanke für deine Anfrage. Wir haben sie erhalten und melden uns so schnell wie möglich bei dir.\n\nFreundliche Grüsse\n${BRAND}`;
      smtpSend({ from, to: email, subject: 'Deine Anfrage bei 11 – Art of Wall Design', text: t, html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#141413;white-space:pre-wrap">${esc(t)}</div>` })
        .catch((e) => console.error('Bestätigung nicht gesendet:', e.message));
    }
    console.log('Anfrage gesendet:', topic);
    return reply(200, true, 'Danke! Deine Anfrage ist bei uns angekommen.');
  } catch (e) {
    console.error('Fehler beim Senden:', e.message);
    return reply(500, false, 'Das hat leider nicht geklappt. Bitte versuch es nochmals oder schreib uns direkt per E-Mail.');
  }
}

/* ------------------------------------------------------------ Server */
http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (pathname === '/api/kontakt') {
    if (req.method === 'POST') return handleKontakt(req, res);
    res.writeHead(405, { Allow: 'POST' }); return res.end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res, pathname);
}).listen(PORT, () => console.log(`${BRAND} läuft auf Port ${PORT}`));
