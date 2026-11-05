---
name: click-path-audit
description: Verfolgt jeden Knopf einer Oberfläche durch alle Zustandsänderungen, um Bugs zu finden, bei denen einzelne Funktionen korrekt arbeiten, sich aber gegenseitig aufheben oder den falschen Endzustand hinterlassen. Use when a button does nothing, after a refactor that touches shared state or config, after changing a GUI tool (Desktop-Oberfläche, Webseite, App), or when normal debugging finds no bug but the UI still behaves wrong.
---

# Klickpfad-Audit

Findet Fehler, die man beim Lesen des Codes nicht sieht: Handler, die sich gegenseitig rückgängig machen, Wettläufe zwischen Aufrufen und Nebenwirkungen auf geteilten Zustand. Gekürzt aus dem Skill `click-path-audit` im Open-Source-Repo ECC (affaan-m/ECC). Beispiele stammen aus Python (Tk, pywebview) und JavaScript, das Prinzip gilt für jede Oberfläche.

## Das Problem

Normales Debugging prüft: Gibt es die Funktion? Stürzt sie ab? Stimmt der Rückgabetyp? Es prüft **nicht**:

- Entspricht der Endzustand dem, was die Beschriftung des Knopfes verspricht?
- Macht Funktion B still rückgängig, was Funktion A gerade getan hat?
- Setzt eine Nebenwirkung (Zurücksetzen, Neuladen, Speichern der Config) den Zustand wieder zurück?

Musterbeispiel: Der Knopf "Neue Mail" ruft erst `setComposeMode(true)` und dann `selectThread(null)` auf. Beide laufen fehlerfrei, aber `selectThread` setzt als Nebenwirkung `composeMode` wieder auf `false`. Der Knopf tut nichts.

## Vorgehen (alles selbst, keine Agenten)

**Schritt 1: Nebenwirkungs-Karte.** Für allen geteilten Zustand im Zielbereich (Variablen der Oberfläche, `config.json`, Klassenfelder, Tk-Variablen, JS-Stores) pro Funktion festhalten, was sie setzt und **was sie als Nebenwirkung zurücksetzt**:

```
selectThread(t) → setzt: {selectedThread, messages}   SETZT ZURÜCK: {composeMode}
```

Darunter die "gefährlichen Rücksetzer": Funktionen, die Zustand löschen, den sie nicht besitzen.

**Schritt 2: Jeden Berührungspunkt durchgehen.** Für jeden Knopf, Schalter, jedes Formular und jeden Hotkey:

1. Handler finden (`onClick`, `command=`, `js_api`-Methode, Hotkey-Callback).
2. Jeden Aufruf **in Reihenfolge** verfolgen: Was liest er, was schreibt er, was setzt er zurück?
3. Prüfen: Macht ein späterer Aufruf eine frühere Änderung rückgängig? Ist der **Endzustand** das, was die Beschriftung verspricht?
4. Prüfen: Laufen asynchrone Teile (Threads, `after()`, `fetch`, Timer) in falscher Reihenfolge ab?

**Schritt 3: Bericht.** Pro Fund eine Zeile:

| Nr | Ort (Datei:Zeile) | Knopf | Muster | Ablauf | Erwartet | Tatsächlich | Fix |
|---|---|---|---|---|---|---|---|

## Muster, auf die jeder Punkt geprüft wird

1. **Rückgängigmachen:** Aufruf 1 setzt X, Aufruf 2 setzt X als Nebenwirkung zurück.
2. **Wettlauf:** Zwei Threads oder Callbacks schreiben denselben Zustand, der Endwert hängt davon ab, wer zuerst fertig wird.
3. **Veralteter Wert:** Ein Callback hält einen alten Wert fest. In Python typisch: `lambda` in einer Schleife (spätes Binden, alle Knöpfe benutzen den letzten Wert). In JS: Closure über alten State.
4. **Fehlender Zustandswechsel:** Der Knopf heißt "Speichern", der Handler prüft nur. Oder er setzt ein Flag, ruft aber nie die eigentliche Funktion auf.
5. **Toter Pfad:** Eine Bedingung ist an dieser Stelle immer falsch, der eigentliche Code wird nie erreicht.
6. **Beobachter stört:** Der Knopf setzt einen Wert, ein Watcher (Tk-`trace`, `useEffect`, Auto-Speichern) setzt ihn gleich wieder zurück.
7. **Config überschreibt:** Ein Handler ändert die Einstellung im Speicher, ein anderer lädt kurz danach die `config.json` und überschreibt sie mit dem alten Stand.

## Umfang

Der Audit ist aufwendig, deshalb begrenzen:

- **Ein Fenster oder eine Funktion:** nach einem neuen Bildschirm oder wenn ein Knopf "nichts tut".
- **Zustandsbezogen:** nach der Änderung einer geteilten Funktion alle ihre Aufrufer durchgehen.
- **Ganze App:** nur vor einer Veröffentlichung, Bereich für Bereich nacheinander.

## Wann nicht

- Falsche API-Antwort, fehlender Endpunkt: normales Debugging.
- Layout und Optik: Sichtprüfung, siehe Skill `ui-polish`.
- Geschwindigkeit: Profiling.

## Danach

Erst normales Debugging, dann dieser Audit, dann ein echter Test der Oberfläche zur Bestätigung. Für jeden behobenen Fund gilt die Regressionstest-Regel aus `/qc`: ein Test, der genau diesen Ablauf prüft und vor dem Fix scheitert.
