# Test

> Claude prüft die eigene Arbeit, indem es sie **wirklich benutzt**, so wie ein Mensch es täte. Vierter Schritt der Entwicklungsschleife, läuft nach `/implement` und immer, wenn „funktioniert das?" im Raum steht.

Die Regel: **„Müsste funktionieren" ist kein Testergebnis.** Etwas ist fertig, wenn es echt benutzt wurde und sich richtig verhalten hat.

## Ablauf

1. **Liefergegenstand benennen:** Was wurde gebaut oder geändert, und was soll es tun (ein Satz)?
2. **Passend ausprobieren** (unten) und das Echte zeigen: Ausgabe, Bildschirm, Antwort.
3. **Vorsichtig kaputt machen:** die zwei, drei wahrscheinlichsten Fehlerfälle.
4. **Fehlgeschlagenes beheben:** kleine Fehler sofort, genau diesen Fall danach erneut testen. Strukturelle Probleme erst erklären, Lösung vorschlagen, dann umsetzen.
5. **Ehrlich berichten.**

## Je nach Gegenstand

- **Skript oder Automatisierung:** mit realistischer Eingabe laufen lassen und die echte Ausgabe zeigen. Ein zweites Mal laufen lassen (findet „klappt nur einmal"-Fehler). Leere Eingabe, fehlende Einstellung, falscher Pfad probieren.
- **Oberfläche oder Webseite:** starten und öffnen, nicht nur den Code lesen. Den wichtigsten Ablauf von Anfang bis Ende als Nutzer durchklicken und sagen, was erschienen ist. Neu laden mitten im Ablauf, leere Eingabe absenden, schmales Fenster.
- **Bibliothek oder Funktion:** mit echten und mit Randwerten aufrufen, bestehende Tests laufen lassen.
- **Spiel oder Regelwerk:** eine echte Runde spielen oder simulieren, nicht nur die Formel nachrechnen. Zufall festnageln, damit sich ein Fehler wiederholen lässt.
- **Dokument oder Plan:** als der vorgesehene Leser von vorn bis hinten lesen, prüfen, ob alle genannten Dateien und Pfade existieren.

## Bericht

```
Getestet: <was>
- <Prüfung>: lief
- <Prüfung>: behoben (war: <Problem, eine Zeile>)
Urteil: funktioniert / funktioniert mit Einschränkung: <Einschränkung>
```

Was sich nicht testen lässt (fehlende Zugänge, keine echten Daten), wird genau so gesagt, mit dem, was es testbar machen würde. Nicht stillschweigend überspringen.
