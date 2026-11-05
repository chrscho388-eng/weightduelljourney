# Explore

> Eine Idee im Gespräch zu einem klaren, abgegrenzten Konzept formen, bevor etwas gebaut oder geplant wird. Der erste Schritt der Entwicklungsschleife: `/explore` → `/create-plan` → `/implement` → `/test` → `/qc`.

`$ARGUMENTS` ist die Idee, grob beschrieben (ein Satz reicht).

## Haltung

Das ist ein **Gespräch in Etappen, kein Durchlauf.** Nach jeder Etappe zeigst du, was du gefunden hast, stellst Fragen und **wartest auf die Antwort**, bevor du weitermachst. Nie alle Etappen am Stück erledigen. Entschiedenes wird nicht neu verhandelt, außer es gibt einen starken technischen Grund.

Vor jeder Frage Kontext und ein Beispiel geben. Wenn es hilft, Antwortmenüs mit Vorschlag anbieten (A, B, C), höchstens vier Fragen pro Runde, und ausdrücklich sagen, was schon feststeht.

## Sammelmodus (wenn Chris „erstmal nur sammeln" sagt)

Dann wird **nichts entschieden und nichts gebaut.** Jede Idee wird wortgetreu in einem Abschnitt „Ideen" des Dokuments notiert, mit Nummer (I1, I2 ...), dem Ist-Stand (nur aus Code und Dateien gelesen, als solcher gekennzeichnet) und den Fragen, die später zu klären sind. Rückfragen nur, wenn eine Aussage mehrdeutig ist. Am Ende einer Idee kurz sagen, was sie berührt (andere Regeln, andere Ideen), ohne es zu entscheiden.

## Etappe 1: Verstehen

1. Idee lesen, die relevanten Dateien des Projekts ansehen (README, `CLAUDE.md`, passender Code).
2. In zwei, drei Sätzen wiedergeben, was du verstanden hast.
3. Zwei bis vier Fragen: Welches Problem löst das? Wer nutzt es wann? Woran sehen wir, dass es fertig ist? Was gehört ausdrücklich **nicht** dazu?

**Warten.**

## Etappe 2: Umfeld erkunden

1. Im Projekt nach Vorhandenem suchen, das dazugehört (Funktionen, Muster, ähnliche Features), per Grep und Lesen, nicht aus dem Kopf.
2. Bei externen Diensten oder Bibliotheken nachsehen, was es gibt.
3. Zeigen: Was existiert schon? Welche Optionen gibt es (mit Vor- und Nachteilen)? Welche Abhängigkeiten und Grenzen? Grobe Größe: klein, mittel, groß.

**Warten, welche Richtung gewählt wird.**

## Etappe 3: Formen

Festhalten: Was es tut, wie es sich anfühlt oder abläuft, was dabei herauskommt, wie es mit dem Bestehenden zusammenhängt. Bei echten Gestaltungsfragen zwei, drei Varianten mit Abwägung und einer Empfehlung. Riskantes, Unsicheres und Teures offen benennen.

**Warten auf Bestätigung oder Korrektur.**

## Etappe 4: Zuschnitt

1. In Bausteine oder Phasen zerlegen, je mit Abhängigkeiten und grobem Aufwand.
2. Die **kleinste brauchbare Version** von der vollen Vision trennen.
3. Empfehlen, was zuerst kommt und was warten kann.

**Zur Durchsicht vorlegen.**

## Etappe 5: Dokument

Alles in `plans/explore-<JJJJ-MM-TT>-<kurzer-name>.md` festhalten:

- **Ausgangsidee** (ein Satz) und **Ziel** (zwei, drei Sätze)
- **Problem** und **Lösung** (was, wie, Ergebnis)
- **Zuschnitt:** kleinste Version, volle Vision, Bausteine mit Aufwand, was ausdrücklich nicht dazugehört
- **Technisches:** Grenzen, Abhängigkeiten, Risiken, Unbekanntes
- **Verbindungen** zu anderen Teilen des Projekts
- **Entschieden und verworfen** (mit Begründung)
- **Nächste Schritte:** meist `/create-plan`

Danach Pfad nennen und den nächsten Schritt empfehlen.

## Regeln

- Interaktiv: nie alle Etappen autonom.
- Ehrlich über Komplexität: Schweres klar benennen, nichts kleinreden.
- Im Projekt verankert: Empfehlungen stützen sich auf das, was im Projekt wirklich da ist.
- Das ist **kein Plan.** Das Dokument hält das Was und Warum fest, das Wie kommt in `/create-plan`.
