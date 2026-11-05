# Create-Plan

> Aus einer Idee oder einem Explore-Dokument einen Plan schreiben, den `/implement` ohne Rückfragen abarbeiten kann. Zweiter Schritt der Entwicklungsschleife. Es wird **nur geplant, nichts umgesetzt.**

`$ARGUMENTS` ist, was geplant werden soll, oder der Pfad eines Explore-Dokuments aus `plans/`.

## Vorbereitung

1. `CLAUDE.md`, das Explore-Dokument (falls vorhanden) und den betroffenen Code lesen. Vorhandene Muster und Namensregeln übernehmen, keine neue Struktur erfinden, wo es schon eine gibt.
2. Per Grep festhalten, **wer die betroffenen Dateien und Funktionen benutzt** und welche Datenformate betroffen sind. Das gehört in den Plan, nicht in den Kopf.
3. Offene Fragen, die Chris entscheiden muss, **vor** dem Schreiben stellen oder im Plan klar als „Vor dem Bauen klären" kennzeichnen.

## Der Plan

Speichern unter `plans/<JJJJ-MM-TT>-<kurzer-name>.md`, Status „Entwurf". Inhalt:

1. **Ziel:** was am Ende anders ist und warum das wichtig ist.
2. **Ist-Stand:** betroffene Dateien, Muster, Lücken oder Probleme.
3. **Änderungen:** neue Dateien, geänderte Dateien (mit dem, was sich ändert), zu löschende Dateien.
4. **Entscheidungen:** was gewählt wurde und warum, welche Alternativen verworfen wurden, was noch offen ist.
5. **Schritte in fester Reihenfolge:** je Schritt, was zu tun ist, welche Dateien betroffen sind, wie man sieht, dass er gelungen ist.
6. **Abhängigkeiten:** was andere Teile des Projekts von dieser Änderung berühren, was dort mitgeändert werden muss.
7. **Fertig-Kriterium:** messbar und mit Ja/Nein entscheidbar („alle Tests grün und Feld X erscheint im Testfenster", nicht „sieht gut aus"), dazu eine **Grenze**: was sich nicht ändern darf.
8. **Risiken:** wo es schiefgehen kann und wie man es früh merkt.

## Danach: Prüfrunden

Den fertigen Plan gleich selbst prüfen (nicht erst auf Nachfrage): Widersprüche, fehlende Schritte, Annahmen, die nicht belegt sind, Dateien oder Funktionen, die es nicht gibt. Behebbares sofort beheben und **in weiteren Runden prüfen, bis eine komplette Runde nichts mehr findet.** Das gilt auch, wenn der Plan später überarbeitet wird. Dann Pfad nennen und `/implement` empfehlen.
