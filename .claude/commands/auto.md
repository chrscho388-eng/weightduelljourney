# Auto

> Autonomer Arbeitsmodus für eine Aufgabe oder Aufgabenliste. Klarheit einmal gesammelt am Anfang schaffen, danach selbstständig arbeiten, bis alle sinnvollen Aufgaben erledigt, zurückgestellt oder blockiert sind. Gehört zusammen mit `/autoend`, das diesen Modus kontrolliert beendet.

`$ARGUMENTS` ist die Aufgabe oder Aufgabenliste, die abgearbeitet werden soll.

## 1. Startphase: Klarheit schaffen

Prüfe vor Beginn, ob Informationen fehlen, die eine langfristig autonome Bearbeitung verhindern würden. Frage gesammelt, nicht über viele spätere Unterbrechungen — und nur, wenn wirklich nötig:

- das gewünschte Ergebnis ist grundlegend unklar
- Anforderungen fehlen, die das Ergebnis wesentlich verändern
- mehrere Optionen führen zu fundamental unterschiedlichen Lösungen
- eine wichtige Entscheidung kann nur Chris treffen
- notwendige Ressourcen, Zugänge oder Informationen fehlen

Bei ausreichender Klarheit sofort beginnen.

## 2. Autonom arbeiten

Ab hier gilt: selbstständig weiterarbeiten, bis alle sinnvollen Aufgaben erledigt, zurückgestellt oder blockiert sind. Entscheidungsgrundlage: die Anforderungen von Chris, bestehender Code/Projektstruktur, bestehende Konventionen, Abhängigkeiten, Dokumentation, etablierte technische Best Practices.

- Gewöhnliche Unklarheit → vernünftige Annahme treffen, weiterarbeiten.
- Mehrere sinnvolle Lösungen → selbstständig die plausibelste wählen.
- Keine Rückfrage für gewöhnliche Entwicklungsentscheidungen.

## 3. Arbeitsweise (Loop)

1. Analysieren
2. Umsetzen
3. Testen oder validieren
4. Fehler untersuchen
5. Fehler beheben
6. Weiterarbeiten

Ein fehlgeschlagener Ansatz ist kein Grund, sofort nachzufragen — Ursache analysieren, sinnvolle Alternative probieren.

## 4. Quality-Check-Runden

Nach Abschluss eines sinnvollen Arbeitsschritts oder einer Aufgabe die bekannte Quality-Check-Routine über mehrere Runden fahren: Fehler, fehlerhafte Logik, fehlende/unvollständige Implementierung, offensichtliche Edge Cases, Inkonsistenzen, durch die aktuelle Änderung neu entstandene Probleme. Wiederholen, bis eine komplette Runde nichts mehr findet.

Eine fehlerfreie Runde ist nur der Abschluss dieser einen Arbeitsrunde, nicht des autonomen Modus: danach direkt mit der nächsten offenen Aufgabe weitermachen, ohne zu fragen. Sind keine Aufgaben mehr offen, zurückgestellte/blockierte Punkte erneut prüfen (siehe 6).

## 5. Aufgabenliste & Status

Mehrere Aufgaben = Arbeitsliste, grundsätzlich in der angegebenen Reihenfolge, außer technische Abhängigkeiten oder eine sinnvollere Reihenfolge sprechen dagegen. Intern Status je Aufgabe mitführen: Offen, In Bearbeitung, Fertig, Teilweise fertig, Zurückgestellt, Blockiert.

Ziel: maximaler Gesamtfortschritt über die ganze Liste, nicht maximale Zeit in einen einzelnen Punkt.

## 6. Retry-Bremse

Probleme zunächst selbstständig lösen (Code/Logs analysieren, Fehler reproduzieren/isolieren, Doku prüfen, alternative Implementierungen testen, Lösungsansatz grundlegend ändern). Bringen etwa drei substanziell unterschiedliche Versuche keinen ausreichenden Fortschritt: intern festhalten, als Zurückgestellt/Blockiert markieren, mit der nächsten unabhängigen Aufgabe weitermachen. Nicht denselben Ansatz minimal variiert wiederholen, ohne neue Erkenntnis. Bei neuer Erkenntnis oder deutlich neuer Hypothese: weiter dranbleiben ist erlaubt.

Nachdem alle anderen unabhängigen Aufgaben bearbeitet sind: zurückgestellte/blockierte Punkte mit den inzwischen gewonnenen Erkenntnissen erneut versuchen. Ohne neue Erkenntnis bleibt eine Aufgabe blockiert.

## 6a. Schutz vor Entgleisen (Idee aus dem Open-Source-Repo ECC, `loop-design-check`)

Eine Schleife, die allein läuft, kann sich im Kreis drehen, die eigene Prüfung austricksen oder ein falsches Ergebnis konsequent zu Ende führen. Drei Regeln dagegen, ohne dass `/auto` dafür anhält:

1. **Messbares Fertig-Kriterium plus Grenzen, je Aufgabe festhalten (in der Startphase, bei unklaren Aufgaben als begründete Annahme).** Das Kriterium muss sich durch einen Befehl oder eine klare Beobachtung mit Ja/Nein entscheiden lassen ("alle Tests grün und Feld X wird im Testfenster angezeigt", nicht "sieht gut aus"). Dazu eine Grenze: was darf sich dabei nicht ändern. Wo es einen Wert von außen gibt (Referenzdatei, API-Antwort, Zahl aus dem echten Programm), gegen den prüfen statt gegen die eigene Behauptung.
2. **Wer baut, lockert nicht die Prüfung.** Um eine Aufgabe als fertig zu melden, werden bestehende Tests, Asserts und Prüfskripte nicht abgeschwächt, Fehler nicht verschluckt und Mocks nicht so angepasst, dass sie passen. Ist ein Test nachweislich falsch, wird er korrigiert und das mit Begründung im Protokoll vermerkt. Das Prüfen am Ende übernimmt `/qc` (eigener Blick auf den Diff), nicht die Selbsteinschätzung "sieht richtig aus".
3. **Stimmt das Ziel noch?** Zeigt sich beim Arbeiten, dass die Aufgabe auf einer falschen Annahme beruht, einer anderen Entscheidung widerspricht oder sich ihr Zweck erledigt hat, wird sie nicht stur zu Ende gebaut: als Zurückgestellt mit Begründung markieren und weitermachen. Ob ein Ziel richtig ist, entscheidet Chris, das Ergebnis geht in das Protokoll beziehungsweise in die gesammelte Rückfrage bei `/autoend`.

## 7. Freigabepflichtige Aktionen: zurückstellen, nicht stoppen

Die Sicherheits-/Freigaberegeln aus der System-Instruktion gelten in `/auto` unverändert weiter (u. a. Push nur mit expliziter Freigabe, keine destruktiven Aktionen ohne Rückfrage, Zahlungen/Nachrichten/öffentliche Inhalte nur mit Bestätigung, generell verbotene Aktionen bleiben verboten). "Gewöhnliche Entwicklungsentscheidungen ohne Rückfrage" bezieht sich nicht auf diese Kategorie.

Trifft eine Aufgabe im Verlauf von `/auto` auf so eine Aktion:

- Nicht ausführen, nicht anhalten und auf Antwort warten — das würde den autonomen Fluss blockieren.
- Stattdessen in eine laufende **Freigabe-Warteschlange** eintragen (was genau, wofür nötig, welche Aufgabe hängt davon ab), Aufgabenstatus "Zurückgestellt (Freigabe nötig)".
- Mit der nächsten unabhängigen Aufgabe weitermachen.
- Die ganze Warteschlange wird gesammelt am Ende von `/auto`, spätestens bei `/autoend`, mit Chris durchgegangen — einzeln oder gebündelt freigegeben oder verworfen, danach ggf. die davon abhängige Aufgabe zu Ende bringen.

## 8. Wann eine Aufgabe fertig ist

- ursprüngliche Anforderung erfüllt
- offensichtlich fehlende Teile geprüft
- relevante Tests/Builds/Validierungen durchgeführt, soweit möglich
- erkennbare Probleme behoben
- keine offensichtlich halbfertigen Teile

Ein Zwischenziel ist kein Anlass zum Anhalten. **Nie fragen, ob weitergemacht werden soll, solange `/auto` läuft** — Standardannahme ist immer: weiterarbeiten.

## 9. Automatischer Abschluss (kein manuelles `/autoend` abwarten)

Sind alle Aufgaben der Liste in einem Endzustand (Fertig, Teilweise fertig, Blockiert, oder Zurückgestellt ohne neue Erkenntnis für einen weiteren Versuch), endet `/auto` nicht einfach kommentarlos und wartet nicht darauf, dass Chris von sich aus `/autoend` tippt oder nachfragt, ob abgeschlossen werden soll. Stattdessen selbstständig direkt in die `/autoend`-Prozedur übergehen (`.claude/commands/autoend.md`), im selben Zug:

- **Freigabe-Warteschlange leer:** keine offene Entscheidung nötig — Protokoll unter `Auto Protokoll/` schreiben (autoend.md Abschnitt 3), Abschluss an Chris geben (autoend.md Abschnitt 4), `/auto` als beendet erklären. Alles in einem Zug, ohne zwischendurch auf eine Reaktion zu warten.
- **Freigabe-Warteschlange nicht leer:** die Warteschlange konkret vorlegen (was, wofür, welche Aufgabe hängt dran) und gezielt danach fragen — das ist die einzige Rückfrage, die an dieser Stelle noch erlaubt ist, weil nur Chris diese Entscheidungen treffen kann. Nach seiner Antwort (freigeben/verwerfen/zurückstellen je Punkt, ggf. abhängige Aufgabe zu Ende bringen) den Abschluss trotzdem selbstständig fertig machen (Protokoll schreiben, Status zusammenfassen), nicht erneut nachfragen ob geschlossen werden soll.

Kurz: `/auto` mündet von selbst in `/autoend`, sobald nichts mehr offen ist. Ein separater `/autoend`-Aufruf durch Chris bleibt möglich (z. B. um mittendrin bewusst abzubrechen), ist am regulären Ende aber nicht nötig.
