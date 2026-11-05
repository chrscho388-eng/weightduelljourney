# Implement

> Einen Plan aus `/create-plan` umsetzen. Dritter Schritt der Entwicklungsschleife.

`$ARGUMENTS` ist der Pfad zur Plandatei (zum Beispiel `plans/2026-01-15-login-umbau.md`).

## 1. Plan verstehen

1. Den Plan **vollständig** lesen, nicht überfliegen.
2. Offene Fragen, fehlende Entscheidungen oder Abhängigkeiten von außen? Dann **anhalten und fragen**, nicht raten.
3. Ist der Plan fertig ausgefüllt (kein Platzhaltertext, Status „Entwurf" oder „Bereit")?

## 2. Umsetzen

Die Schritte **in der Reihenfolge des Plans**, jeden ganz fertig, bevor der nächste beginnt.

Vor jeder Änderung an bestehendem Code kurz benennen (per Grep, nicht aus dem Kopf):

- wer die Datei oder Funktion benutzt,
- welche Datenformate betroffen sind,
- was die Anweisung dazu wörtlich war.

Raten gilt nicht. Dann die Datei lesen, die Änderung genau so machen und prüfen, bevor es weitergeht.

Geht ein Schritt nicht wie geschrieben: Problem notieren und anpassen, wenn die Absicht klar ist, sonst fragen. Jede Abweichung vom Plan festhalten.

**Tests werden nie abgeschwächt**, damit etwas durchgeht. Ist ein Test nachweislich falsch (er prüft die alte Regel), wird er korrigiert und das begründet.

## 3. Prüfen

1. Alle Punkte des Fertig-Kriteriums aus dem Plan einzeln durchgehen, auch die Grenze („was darf sich nicht ändern").
2. Gibt es eine Test-Suite? Laufen lassen, Ergebnis nennen.
3. Neue Dateien dort eingetragen, wo sie hingehören? Namen stimmig?

## 4. Plan abschließen

Im Plan Status auf „Umgesetzt" setzen und am Ende „Umsetzungsnotizen" ergänzen: Datum, was gemacht wurde, **Abweichungen vom Plan**, aufgetretene Probleme.

## 5. Testen, dann prüfen

1. `/test` auf das Gebaute. Nie „fertig" melden, ohne es echt ausprobiert zu haben.
2. `/qc` auf den Diff.
3. Hat sich die Struktur des Projekts geändert, die `CLAUDE.md` nachziehen.

## Bericht

Kurz und konkret: was getan wurde, welche Dateien neu, geändert oder gelöscht sind, Ergebnis der Prüfpunkte, Abweichungen, offene Folgeschritte. Commits lokal, **gepusht wird nur auf ausdrückliches Wort von Chris.**
