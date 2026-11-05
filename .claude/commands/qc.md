# QC

> Eigener, lokaler Quality-Check-Workflow, angelehnt an den eingebauten `code-review`-Skill (der selbst nicht editierbar ist). Zwei Anpassungen gegenüber dem Original: mehrere Runden fahren, bis eine komplette Runde nichts mehr findet, und den ganzen Prozess selbst direkt erledigen statt über parallele Subagenten — Token-Effizienz hat Vorrang vor Zeit.

`$ARGUMENTS` ist optional das Review-Ziel (Diff-Bereich, Dateipfad, PR-Nummer). Ohne Angabe: der aktuelle uncommittete Diff, sonst der Diff seit dem letzten sinnvollen Basis-Commit (z. B. dem Start der aktuellen Aufgabe).

## Zentrale Regel: alles selbst, keine Agenten

Diesen kompletten Workflow direkt in diesem Kontext durchführen — Grep/Read/Bash/Write selbst benutzen. **Nicht** über das Agent-Tool an Subagenten delegieren, auch nicht für einzelne Prüfwinkel. Das ist der Hauptunterschied zum eingebauten Skill und der eigentliche Grund für diesen Command.

## Eine Runde

Pro Runde alle folgenden Blickwinkel selbst am zu prüfenden Diff/Code durchgehen:

1. **Zeile für Zeile** — jeden Hunk lesen, die umgebende Funktion mitlesen (auch unveränderte Zeilen einer geänderten Funktion sind im Geltungsbereich, nicht nur die Diff-Zeilen selbst). Falsche/invertierte Bedingungen, Off-by-one, Null-Dereferenzierung, fehlende awaits, verschluckte Fehler in except-Blöcken, unescapte Regex. Bei Python speziell immer mitprüfen: `global`/`nonlocal` nach Nutzung im selben Funktionskörper — diese Fehlerklasse erkennt `ast.parse()` nicht, erst der echte Bytecode-Compiler.
2. **Entferntes Verhalten** — für jede gelöschte/ersetzte Zeile: welche Garantie gab sie, steht die im neuen Code wieder da?
3. **Cross-File** — für jede geänderte Funktion per Grep die Aufrufer suchen, prüfen ob neue Vorbedingungen, geänderte Rückgabeformen oder neue Exceptions dort etwas brechen.
4. **Reuse** — neuer Code, der etwas im Projekt bereits Vorhandenes nachbaut, statt es zu verwenden.
5. **Simplification** — unnötige Komplexität, Copy-Paste mit leichten Abweichungen, totes Zeug.
6. **Efficiency** — verschwendete Arbeit, Sequenzielles das parallel liefe, blockierende Arbeit auf Hot Paths.
7. **Altitude** — behebt der Fix die eigentliche Ursache, oder ist es ein Pflaster auf Symptomebene? Deutet ein Fund auf eine allgemeinere, an der richtigen Stelle sitzende Lösung hin?
8. **Konventionen** — die relevanten `CLAUDE.md`-Dateien (Workspace-Root + alle Eltern-Ordner des geänderten Codes) gegen den Diff prüfen, nur bei wörtlich zitierbarer Regelverletzung, keine Stilvorlieben.
9. **Stille Fehler** (Idee aus dem Open-Source-Repo ECC, `silent-failure-hunter`) — im geänderten Code gezielt suchen nach: leeren `except`/`catch`-Blöcken und Fehlern, die zu `None`/leerer Liste/`""` umgewandelt werden, ohne Kontext zu hinterlassen; Fallback-Werten, die einen echten Fehler verdecken (z. B. "nichts gefunden" statt "Suche fehlgeschlagen"); Logs ohne genug Kontext oder mit falscher Schwere ("loggen und weitermachen"); verlorenen Stacktraces und generischen Re-Raises; Netzwerk-, Datei- und API-Aufrufen ohne Timeout oder Fehlerbehandlung; Teil-Schreibvorgängen ohne Rückrollen. Pro Fund: Ort, Schwere, was im Fehlerfall passiert, Fixvorschlag.

Jeden plausiblen Fund selbst direkt verifizieren, nicht nur behaupten: Code lesen, bei Bedarf einen echten isolierten Test schreiben und laufen lassen. Für Python-Dateien nach jeder Änderung `python -m py_compile <datei>` (oder ein echtes Ausführen) prüfen, niemals nur `ast.parse()` als alleinigen Nachweis werten. Bestätigte, hochsichere Funde sofort fixen und erneut verifizieren. Echte, aber niedrigpriore Funde (Cleanup, Duplikation, Nice-to-have-Refactors) bewusst zurückstellen und kurz benennen, statt sie stillschweigend zu übergehen — Chris selbst entscheidet, ob die aufgegriffen werden.

**Regressionstest pro behobenem Bug** (Idee aus dem Open-Source-Repo ECC, `ai-regression-testing`): Dieselbe KI schreibt den Fix und prüft ihn, beide Schritte teilen dieselben blinden Flecken ("Fix geprüft, sieht richtig aus", Bug bleibt trotzdem). Deshalb gilt: Für jeden bestätigten und gefixten Fund einen Test schreiben, der genau diesen Fehler an der Stelle abfängt, wo er aufgetreten ist, und vor dem Fix scheitern würde (kurz zeigen, dass er rot wird, dann grün). Gibt es im Projekt eine Test-Suite (z. B. `pytest`), kommt der Test dort hinein; sonst als kleines Skript neben den Code. Lässt sich der Fund nicht sinnvoll testen (reine Optik, Verhalten ohne Testumgebung), das in einem Satz benennen statt den Test stillschweigend wegzulassen. Besonders prüfen, wenn es mehrere Pfade gibt (Testmodus/echter Modus, mit/ohne Cache): der Fix muss in allen Pfaden stehen.

`ReportFindings` darf am Ende einer Runde genutzt werden, um Funde strukturiert in der Oberfläche anzuzeigen — ersetzt aber nicht den eigenen Verifizierungsschritt oben.

## Mehrere Runden

Nach jeder Runde: gab es mindestens einen bestätigten, gefixten Fund? Dann sofort eine neue Runde starten — der Fix selbst kann neue Probleme einführen. Erst aufhören, wenn eine komplette Runde nichts Neues mehr findet.

## Abschluss

Kurze Zusammenfassung im Chat: wie viele Runden, was in welcher Runde gefunden/gefixt wurde, was bewusst zurückgestellt wurde und warum. Kein separates Artefakt, keine lange Auflistung.
