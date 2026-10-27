# Mitwirken

Danke, dass du helfen willst. So läuft es ab:

1. **Fehler oder Idee:** Leg ein Issue an. Beschreibe, was du erwartet hast, was passiert ist, und hänge bei Darstellungsfehlern einen Screenshot an (Handy oder Desktop, hell oder dunkel).
2. **Änderung am Code:** Forke das Repo, ändere `kurs.html` und öffne einen Pull Request mit einer kurzen Beschreibung.
3. **Veröffentlichen:** Nach dem Merge wird die neue Version in die laufende App auf claude.ai übernommen. Das macht der Maintainer.

## Regeln für Änderungen

- Alles bleibt in einer Datei (`kurs.html`), ohne Build-Schritt und ohne zusätzliche Abhängigkeiten. Skripte nur von cdnjs, jsDelivr oder unpkg mit fester Version, Schriften nur von Google Fonts.
- Keine persönlichen Daten, Gewichte oder Mahlzeiten in den Code schreiben. Die liegen nur im privaten Speicher jeder Person.
- Farben nur über die Tokens in `:root`. Hell- und Dunkelmodus müssen beide funktionieren.
- Die App muss bei 400 px Breite ohne seitliches Scrollen funktionieren.
- Das Datenmodell aus der README nicht brechen. Neue Felder sind okay, umbenannte oder entfernte Felder brauchen eine Migration.
- Schätzungen werden immer als ein Mittelwert angezeigt, nie als Spanne.

## Lokal ansehen

`kurs.html` im Browser öffnen. Speicher und kcal-Schätzung gibt es nur auf claude.ai, die Oberfläche lässt sich aber prüfen.
