# CLAUDE.md

Sprache: Deutsch. Tokens sind wichtiger als Zeit. Code erst auf ausdrücklichen Befehl von Chris; davor erkunden und erklären.

## Historie

Kontext liegt als eine Datei pro Tag unter einem Ordner pro Chat: `/mnt/project-files/history/health/<chat-name>/health_<chat-name>_JJJJ-MM-TT.md` (Projektordner). Bei Bedarf dort nachlesen statt Kontext mitzuschleppen; am Ende jeder Arbeit 3–5 Zeilen in die Tagesdatei schreiben.


## Die Entwicklungsschleife

Etwas Neues entsteht in fester Reihenfolge, jeder Schritt hat einen eigenen Befehl:

`/explore` (Idee formen, im Gespräch) → `/create-plan` (Plan schreiben und prüfen) → `/implement` (Plan umsetzen) → `/test` (echt ausprobieren) → `/qc` (Quality-Check in Runden)

- Bei einer neuen Idee zuerst `/explore`, nicht gleich bauen. Soll eine Idee nur festgehalten werden, sagt Chris „erstmal nur sammeln": Dann wird nichts entschieden oder gebaut, Ideen werden wortgetreu mit Ist-Stand und offenen Fragen notiert.
- Ein Plan wird nach dem Schreiben selbst in Runden geprüft, bis eine Runde nichts mehr findet, und ebenso nach jeder späteren Überarbeitung.
- Bei einem Großumbau mit vielen Änderungen schreibt Claude am Ende eine **Übergabeseite** (Stand, Stufen mit Fundstellen im Code, offene Fragen, Fallen, ein Startsatz für die nächste Sitzung), damit eine frische Sitzung ohne Vorwissen weiterarbeiten kann.

## Wie Claude hier arbeitet

- **Selbst arbeiten, keine Agenten-Fächer.** Claude liest, sucht und prüft direkt (Grep, Read, Bash), statt viele Hilfs-Agenten parallel zu starten. Sparsam mit Rechenaufwand zu sein hat Vorrang vor Geschwindigkeit. Agenten nur, wenn Chris ausdrücklich parallele Arbeit will.
- **Nach jeder nicht-trivialen Änderung ein Quality-Check (`/qc`)**, in mehreren Runden, bis eine komplette Runde nichts mehr findet.
- **Fakten vor dem Ändern.** Bevor bestehender Code geändert wird: per Grep benennen, wer die Datei oder Funktion benutzt und welches Datenformat sie liefert. Nicht aus dem Kopf.
- **Tests werden nie abgeschwächt**, damit etwas durchgeht. Ist ein Test nachweislich falsch, wird er korrigiert und das begründet.
- **Für längere, selbstständige Stücke Arbeit `/auto <Aufgabenliste>`**: Rückfragen einmal am Anfang, danach arbeitet Claude die Liste ab. Alles, was eine Freigabe braucht (Push, Löschen, Nachrichten senden), wird nicht ausgeführt, sondern gesammelt und am Ende mit Chris besprochen. `/autoend` schließt sauber ab und schreibt ein Protokoll.

## Code-Aufbau

`kurs.html` ist die gebaute Datei und wird nicht von Hand bearbeitet. Quellen liegen in `src/`: `head.html`, `style.css`, `body.html` (HTML der Tabs), `js/NN-thema.js` (ein Abschnitt je Funktion, in Dateinamen-Reihenfolge zusammengesetzt, alle in einer gemeinsamen Funktion), `tail.html`. Änderung: nur die passende Datei lesen und bearbeiten, dann `node build.js` (baut `kurs.html`), dann `node tests/smoke.js kurs.html`. Beides einchecken; CI prüft mit `node build.js --check`. Changelog steht in `src/js/02-changelog.js`.

## Git

- Lokal oft committen (billige Rollback-Punkte), gebündelt pushen (am Ende einer Arbeitsphase), nicht nach jeder Kleinigkeit.
- Kein Push, keine Einladung, keine Sichtbarkeitsänderung ohne ausdrückliches Wort von Chris.
- Commit-Nachrichten beschreiben, was getan wurde („Ließ den Login Fehler melden"), und sind kurz, wenn der Code-Kommentar das Warum schon trägt.

## Zusammenarbeit

- Bei einer Aufgabe, die nach „lohnt sich das?" klingt, kann der Skill `product-lens` helfen. Bei einer Oberfläche, die „nicht ganz stimmt", `ui-polish`. Bei einem Knopf, der nichts tut, `click-path-audit`.
- Lange Wunschlisten in **einer** Nachricht schicken, nicht in vielen kurzen hintereinander.
