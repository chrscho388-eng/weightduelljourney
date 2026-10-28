# Weightplan

Eine schlanke Web-App zum Abnehmen: Essen und Schritte eintragen, kcal schätzen lassen, Tages- und Wochenbilanz, Gewichtsverlauf, Tagesgraphen und ein Mahlzeitenplan pro Woche.

**So nutzt du die App:** Jede Person holt sie sich in ihr eigenes Claude, siehe [In dein eigenes Claude holen](#in-dein-eigenes-claude-holen). Deine Daten liegen dann in deinem Claude-Konto, und die kcal-Schätzung läuft über dein Claude.

## Funktionen

- **Heute:** Aufnahme und Eiweiß gegen das Tagesziel, Verbrauch, Bilanz und Wochenschnitt. Mahlzeiten frei beschreiben oder fotografieren und von Claude schätzen lassen, oder Werte selbst eintragen. Bei Fotos speichert die App ein verkleinertes Bild mit der Mahlzeit, dazu Claudes Beschreibung und die Aufschlüsselung nach Zutaten (Gramm, kcal, Eiweiß). Schritte flach und mit Steigung, Gewicht, Tagesart, Event-Tag.
- **Woche:** Tagesbilanz, Wochensumme, erwartete gegen tatsächliche Gewichtsveränderung (Dienstag zu Dienstag).
- **Verlauf:** Gewichtskurve mit Zwischenzielen und Erwartung laut Bilanz, Tagesgraphen für Aufnahme und Verbrauch, Energiebilanz und Eiweiß.
- **Plan:** Mahlzeiten der Woche mit Mengen, kcal und Eiweiß. Über ein Textfeld passt Claude den Plan an („Heute kein Frühstück, abends auswärts“) oder erstellt einen neuen; der Vorschlag wird erst nach „Übernehmen“ gespeichert und lässt sich rückgängig machen.
- **Profil:** persönliche Angaben und Ziele, daraus berechnet die App den Verbrauch. Unter „Hinweise für Schätzung und Plan“ stehen Vorlieben und No-Gos, die Claude beim Schätzen und Planen beachtet.

## In dein eigenes Claude holen

Du brauchst ein Claude-Konto mit Zugang zu **Claude Code im Web** (claude.ai/code, ab dem Pro-Tarif).

1. Öffne [claude.ai/code](https://claude.ai/code) und starte eine neue Sitzung. Ein Repo musst du nicht verbinden.
2. Schick Claude diese Nachricht:

   > Lade https://raw.githubusercontent.com/chrscho388-eng/weightduelljourney/main/kurs.html und https://raw.githubusercontent.com/chrscho388-eng/weightduelljourney/main/artifact-capabilities.json herunter. Lies kurs.html vollständig und veröffentliche sie unverändert als Artifact mit dem Titel "Weightplan" und dem Icon "scale" und genau den Capabilities aus artifact-capabilities.json. Gib mir danach den Link.

3. Öffne den Link, den Claude dir gibt, und leg im Tab **Profil** deine Daten an. Den Link kannst du dir im Browser als Lesezeichen oder auf den Home-Bildschirm legen.

Beim ersten „kcal schätzen lassen“ fragt die App einmal um Erlaubnis. Die Schätzung zählt dann zu deinem eigenen Claude-Kontingent.

**Updates:** Wenn sich `kurs.html` hier im Repo ändert, schick Claude in einer Sitzung: „Lade kurs.html neu aus dem Repo und veröffentliche sie als Update von <dein App-Link>, Capabilities unverändert.“ Deine Daten bleiben dabei erhalten.

**Ohne Claude:** Öffnest du `kurs.html` direkt im Browser, läuft die App im Notbetrieb. Die Daten liegen dann nur in diesem Browser, mit Sichern und Laden als Datei. Die Schätzung geht dort nur mit eigenem Anthropic-API-Schlüssel.

## Android-App (APK)

Die APK ist eine eigenständige App: `kurs.html` ist eingebaut und läuft ohne claude.ai. Daten liegen auf dem Handy und können über ein privates GitHub-Repo synchronisiert werden. Fotos lassen sich direkt mit der Kamera aufnehmen.

1. Auf dem Handy [Releases → latest](https://github.com/chrscho388-eng/weightduelljourney/releases/tag/latest) öffnen und die neueste `Weightplan-3.<Nummer>.apk` herunterladen (die Web-Variante heißt `Weightplan-Web-2.<Nummer>.apk`).
2. Die Datei antippen und die Installation aus dieser Quelle erlauben („Einstellungen“ → „Aus dieser Quelle zulassen“ → zurück → „Installieren“).
3. Warnt Google Play Protect („Unbekannte App“): „Trotzdem installieren“. Der Quellcode liegt in `android/`.

### Sync über GitHub (optional)

1. Ein **privates** Repo anlegen, z. B. `weightplan-data`.
2. Einen [Fine-grained Token](https://github.com/settings/personal-access-tokens/new) nur für dieses Repo erstellen, Berechtigung **Contents: Read and write**.
3. In der App unter Profil → „Sync über GitHub“ Repo (`besitzer/name`) und Token eintragen und „Verbinden und synchronisieren“ tippen.

Die App schreibt `weightplan.json` in das Repo. Pro Eintrag gewinnt die neueste Änderung (`updatedAt`). Wer Claude Zugriff auf das Repo gibt, kann dort Wochenauswertungen und Pläne pflegen, die die App beim nächsten Sync übernimmt. Für die kcal-Schätzung per Text oder Foto braucht die App einen eigenen Anthropic-API-Schlüssel (Profil → Schätzung).

Die APK wird bei jeder Änderung an `kurs.html` oder `android/` automatisch über GitHub Actions gebaut.

## Wie die App läuft

Die App ist eine einzelne Datei, [`kurs.html`](kurs.html), ohne Build-Schritt. Sie läuft als Claude-Artifact auf claude.ai und nutzt dort drei Laufzeitfunktionen über `window.claude.use(...)`:

| Funktion | Wofür |
|---|---|
| `db` | Speicher. Jede Person hat einen privaten Bereich unter `data/users/<id>/profile` mit den Untersammlungen `days` und `plans`. Niemand sonst sieht ihn. |
| `user` | Die eigene, anonyme Nutzer-ID für den privaten Bereich. |
| `sample` | kcal-Schätzung durch Claude aus Text oder Foto, über das Claude-Konto der Person. |

Außerhalb von claude.ai (z. B. lokal im Browser) nutzt die App stattdessen den Browserspeicher (`localStorage`) und für die Schätzung optional einen eigenen API-Schlüssel.

### Datenmodell

```
data/users/<id>/profile            Profil: Ziele, Verbrauchsfaktoren, Meilensteine, Hinweise für die Schätzung
data/users/<id>/profile/days/<JJJJ-MM-TT>
    meals: [{ id, label, kcal, protein, photo?, seen?, parts?: [{ name, grams, kcal, protein }] }]
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

