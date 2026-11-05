# Autoend

> Beendet einen laufenden `/auto`-Modus kontrolliert, nicht abrupt: aktuellen Schritt sauber abschließen, keine neue große Aufgabe beginnen, die Freigabe-Warteschlange gemeinsam mit Chris durchgehen, validieren, Aufgabenstatus aktualisieren, Protokoll schreiben.

## 1. Kontrollierter Abschluss

1. Aktuell sinnvollen Arbeitsschritt sauber beenden.
2. Steht die Aufgabe kurz vor Abschluss: vollständig fertig machen.
3. Ist die Aufgabe umfangreich: auf einen sinnvollen, stabilen Zwischenstand bringen statt mittendrin abzubrechen.
4. Keine neue große Aufgabe mehr beginnen.
5. Nötige Validierung durchführen.
6. Aufgabenstatus aller Punkte aktualisieren.

## 2. Freigabe-Warteschlange durchgehen

Bevor `/auto` endgültig endet: alle während `/auto` zurückgestellten freigabepflichtigen Aktionen (siehe `.claude/commands/auto.md`, Abschnitt 7) gesammelt mit Chris durchgehen — was, wofür, welche Aufgabe hängt davon ab. Für jede: freigeben (dann ausführen und die davon abhängige Aufgabe zu Ende bringen), verwerfen, oder für später zurückstellen. Erst danach `/auto` als beendet betrachten.

## 3. Protokoll erstellen

Markdown-Protokoll unter `Auto Protokoll/YYYY-MM-DD_Kurze-Session-Zusammenfassung.md` (Dateiname beschreibt kurz, woran hauptsächlich gearbeitet wurde, z. B. `2026-01-15_Login-Umbau.md`).

### Inhalt

```markdown
# Zusammenfassung
- Ursprüngliches Ziel der Session
- Gesamtfortschritt
- Wichtigste Ergebnisse

# Durchgeführte Arbeiten
Wichtigste Arbeitsschritte in sinnvoller Reihenfolge: welche Bereiche untersucht,
welche Dateien/Komponenten relevant geändert, welche Funktionen umgesetzt wurden.

# Probleme und Lösungen
Für jedes relevante Hindernis: Problem, zunächst versuchter Ansatz, warum er nicht
funktionierte, wie die Ursache erkannt wurde, wie es letztendlich gelöst wurde.
Verworfene Ansätze dokumentieren, wenn relevant fürs Verständnis.

# Eigenständige Entscheidungen
Wichtige Entscheidungen ohne Rückfrage: welche Optionen bestanden, welche wurde
gewählt, warum.

# Freigabe-Warteschlange
Was zur Genehmigung vorgelegt wurde, wie entschieden wurde (freigegeben/verworfen/
zurückgestellt), was danach damit passiert ist.

# Validierung
Tests, Builds, Checks, Ergebnisse, bekannte verbleibende Probleme.

# Aufgabenstatus
## Fertig
- Aufgabe — Ergebnis

## Teilweise fertig
- Erreicht — Noch offen

## Blockiert
- Ursache — Versuchte Lösungsansätze — Warum keine Lösung erreicht wurde

## Zurückgestellt
- Warum zurückgestellt — Ob später erneut geprüft — Möglicher nächster Ansatz

# Empfohlene nächste Schritte
Nur wenn sinnvoll: konkrete nächste Schritte für die weitere Arbeit.
```

## 4. Abschluss an Chris

1. Protokoll kurz vorstellen.
2. Dateiname und Speicherort nennen.
3. Finalen Status der Session knapp zusammenfassen.
4. Blockierte oder offene Punkte deutlich benennen.
5. Bestätigen, dass `/auto` beendet ist.

Klar unterscheiden zwischen: **Fertig**, **Teilweise fertig**, **Blockiert**, **Offen**.
