---
name: product-lens
description: Prüfung vor dem Bauen, ob eine Idee sich lohnt, plus Rangliste bei vielen Ideen. Sieben harte Fragen, kleinste Version, Anti-Ziel, Erfolgsmaß, am Ende eine Empfehlung (Chris entscheidet). Use when Chris has a new tool, game, offer or content idea and it is unclear whether to build it, when choosing between several ideas, or when a vague idea needs to become a short brief before writing a plan.
---

# Produkt-Linse: erst prüfen, dann bauen

Gekürzt und angepasst aus dem Skill `product-lens` im Open-Source-Repo ECC (affaan-m/ECC). Nur auf Abruf, nie automatisch: Wenn Chris etwas bauen will, wird gebaut. Dieser Skill läuft, wenn er fragt "lohnt sich das?", "was zuerst?" oder eine Idee noch vage ist.

**Regeln:** Fakten, die wir nicht kennen (Marktgröße, Zahlungsbereitschaft, Konkurrenz), werden als **Annahme** gekennzeichnet und nicht erfunden. Recherche im Netz nur, wenn Chris sie will. Die Entscheidung "bauen oder nicht" trifft Chris, Claude gibt eine begründete Empfehlung.

## Modus 1: Diagnose einer Idee

Sieben Fragen, im Gespräch gestellt (nicht als Formular), Lücken mit Chris gemeinsam füllen:

1. **Für wen?** Eine konkrete Person oder Gruppe, nicht "alle".
2. **Welcher Schmerz?** Wie oft, wie schlimm, was tun die Leute heute stattdessen?
3. **Warum jetzt?** Was hat sich geändert, dass es möglich oder nötig wird?
4. **Die 10-Sterne-Version?** Wie sähe es aus, wenn Zeit und Geld keine Rolle spielten?
5. **Die kleinste Version?** Das Wenigste, das die Idee beweist (oft ein Wochenende).
6. **Das Anti-Ziel?** Was bauen wir ausdrücklich nicht?
7. **Woran sehen wir, dass es funktioniert?** Eine Zahl, keine Stimmung.

Ergebnis: kurze Datei `produkt-brief-<name>-<JJJJ-MM-TT>.md` im Projektordner mit den Antworten, den größten Risiken (jeweils als Annahme markiert) und einer Empfehlung: **bauen / klein testen / parken**. Bei "bauen" ist der nächste Schritt ein kurzer Plan.

## Modus 2: Rangliste bei vielen Ideen

Wenn zehn Ideen da sind und zwei gewählt werden sollen:

1. Kandidaten auflisten.
2. Jeden bewerten mit **Wirkung (1–5) × Sicherheit (1–5) ÷ Aufwand (1–5)**.
3. Nach Ergebnis ordnen.
4. Rahmen prüfen: Wie viel Zeit hat Chris, was läuft sonst nebenher? Gibt es Abhängigkeiten?
5. Ausgabe als Tabelle mit je einem Satz Begründung. Darstellung: Tabelle, keine Fließtexte.

## Modus 3: Weg des Nutzers (bei fertigen Tools)

Das Tool wie ein neuer Nutzer durchgehen (Download, Start, erster Erfolg): Jede Hürde notieren, die Zeit bis zum ersten Erfolg schätzen, die drei wichtigsten Verbesserungen nennen. Gut vor einer Weitergabe an Freunde oder einer Veröffentlichung.

## Ausgabe

Immer umsetzbar, nie ein Aufsatz: jede Empfehlung hat einen konkreten nächsten Schritt.
