# 11 – Art of Wall Design · Offene Angaben (intern)

Diese Datei wird nicht ausgeliefert (der Server liefert keine .md-Dateien aus).
Alle Angaben werden im Generator unter `SITE` eingetragen. Leere Felder erscheinen
auf der Website nicht; im Impressum und in der Datenschutzerklärung sind sie als
«wird ergänzt» markiert.

## Kontakt (fehlt, wird auf der Website ausgeblendet)
- [ ] Telefonnummer
- [ ] E-Mail-Adresse
- [ ] Adresse (Strasse, PLZ, Ort)
- [ ] Erreichbarkeit / Öffnungszeiten (optional)
- [ ] Einsatzgebiet (welche Orte/Regionen ausser Solothurn)

## Über uns
- [ ] Echtes Foto vom Inhaber oder Team bei der Arbeit (bis dahin zeigt «Über uns» das Musterwand-Foto; eintragen in `SITE['team_photo']`)
- [ ] Name des Inhabers und 2–3 Sätze persönliche Vorstellung

## Rechtliches (Impressum / Datenschutz)
- [ ] Inhaber/in (vollständiger Name)
- [ ] Rechtsform
- [ ] UID-Nummer, Handelsregistereintrag (falls vorhanden)
- [ ] E-Mail-Anbieter und Standort des Postfachs (für das Kontaktformular)
- [ ] Serverstandort bei Render
- [ ] Rechtliche Prüfung durch eine Fachperson (es wird keine Konformität behauptet)

## Bilder
- [ ] Projektfotos in höherer Auflösung (mind. 2400 px Breite), vor allem für das grosse Startbild und die kleinen Detailbilder

## Vertrauen
- [ ] Echte Google-Bewertungen (nur falls vorhanden)

## Technik vor dem Livegang
- [ ] Domain festlegen (Platzhalter in `SITE['domain']`, `robots.txt`, `sitemap.xml`)
- [ ] `SITE['launch'] = True` setzen (Seite für Suchmaschinen freigeben), `robots.txt` öffnen
- [ ] In Render die Umgebungsvariablen setzen: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO, MAIL_FROM
- [ ] Nach dem Setzen einmal eine Testanfrage mit Foto über das Formular senden
