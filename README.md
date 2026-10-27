# Weight Duell Journey · App „Kurs“

Eine schlanke Web-App zum Abnehmen: Essen und Schritte eintragen, kcal schätzen lassen, Tages- und Wochenbilanz, Gewichtsverlauf, Tagesgraphen und ein Mahlzeitenplan pro Woche.

**App öffnen:** https://claude.ai/artifact/ASMW4wKwuuup6b16ptVRnH (Zugang über Einladung mit dem Recht „Mitwirkende“)

## Funktionen

- **Heute:** Aufnahme und Eiweiß gegen das Tagesziel, Verbrauch, Bilanz und Wochenschnitt. Mahlzeiten frei beschreiben oder fotografieren und von Claude schätzen lassen, oder Werte selbst eintragen. Schritte flach und mit Steigung, Gewicht, Tagesart, Event-Tag.
- **Woche:** Tagesbilanz, Wochensumme, erwartete gegen tatsächliche Gewichtsveränderung (Dienstag zu Dienstag).
- **Verlauf:** Gewichtskurve mit Zwischenzielen und Erwartung laut Bilanz, Tagesgraphen für Aufnahme und Verbrauch, Energiebilanz und Eiweiß.
- **Plan:** Mahlzeiten der Woche mit Mengen, kcal und Eiweiß.
- **Profil:** persönliche Angaben und Ziele, daraus berechnet die App den Verbrauch.

## Wie die App läuft

Die App ist eine einzelne Datei, [`kurs.html`](kurs.html), ohne Build-Schritt. Sie läuft als Claude-Artifact auf claude.ai und nutzt dort drei Laufzeitfunktionen über `window.claude.use(...)`:

| Funktion | Wofür |
|---|---|
| `db` | Speicher. Jede Person hat einen privaten Bereich unter `data/users/<id>/profile` mit den Untersammlungen `days` und `plans`. Niemand sonst sieht ihn. |
| `user` | Die eigene, anonyme Nutzer-ID für den privaten Bereich. |
| `sample` | kcal-Schätzung durch Claude aus Text oder Foto, über das Claude-Konto der Person. |

Außerhalb von claude.ai (z. B. lokal im Browser) zeigt die App einen Hinweis, dass der Speicher nicht erreichbar ist. Die Oberfläche lässt sich trotzdem ansehen.

### Datenmodell

```
data/users/<id>/profile            Profil: Ziele, Verbrauchsfaktoren, Meilensteine, Hinweise für die Schätzung
data/users/<id>/profile/days/<JJJJ-MM-TT>
    meals: [{ id, label, kcal, protein }]
    flatSteps, inclineSteps, weight, dayType, event
data/users/<id>/profile/plans/<Montag JJJJ-MM-TT>
    days: [{ date, type, meals: [{ slot, name, detail, kcal, protein }] }]
    swaps: [{ name, detail, kcal, protein }]
```

### Verbrauchsmodell

- Grundbedarf: Mifflin-St Jeor mal 1,2 (sitzender Alltag)
- Flache Schritte: 0,0004 kcal pro kg Körpergewicht und Schritt
- Schritte mit Steigung: ACSM-Gehformel aus Tempo und Steigung, Schrittlänge ca. 0,0027 × Körpergröße; minus 5 %, wenn man sich am Laufband abstützt
- 7.000 kcal Defizit entsprechen etwa 1 kg

Alles sind Schätzungen und ersetzen keine ärztliche Beratung.

## Mitwirken

Siehe [CONTRIBUTING.md](CONTRIBUTING.md).
