---
name: ui-polish
description: Checkliste für UI-Feinschliff bei Oberflächen, die wir bauen (Desktop-Tools, Webseiten, Webviews in Apps). Abstände, Rundungen, Schatten, Textumbruch, Bewegung, Trefferflächen, Zustände. Use when reviewing or improving UI spacing, typography, borders, shadows, motion, hit areas, icons, text wrapping and interaction states, or when a UI "feels off, flat, cramped, jumpy or unfinished".
---

# UI-Feinschliff

Kleine Details, die eine Oberfläche fertig wirken lassen. Übernommen und gekürzt aus dem MIT-lizenzierten Skill `make-interfaces-feel-better` im Repo affaan-m/ECC; angepasst auf Windows-Desktop-Tools und Mobile (die macOS-Schriftglättung ist gestrichen).

Für alles mit Handy-Ansicht gilt zusätzlich: immer bei 375 px Breite prüfen, nicht nur am Desktop.

## Grundsätze

- **Verschachtelte Rundungen:** äußerer Radius = innerer Radius + Innenabstand. Ist der Abstand groß, die Ebenen als getrennte Flächen behandeln, es geht um optische Stimmigkeit, nicht um die Formel.
- **Optische Ausrichtung:** geometrische Mitte ist nicht immer die sichtbare Mitte. Play-Dreiecke, Pfeile, Sterne und andere unsymmetrische Icons brauchen oft einen kleinen Versatz, am besten im SVG selbst korrigieren.
- **Schatten und Rahmen:** Rahmen trennen und zeigen den Fokus, geschichtete, transparente Schatten geben Tiefe (Karten, Dropdowns, Popovers). Schatten dezent, damit sie auf jedem Hintergrund funktionieren.
- **Textumbruch:** `text-wrap: balance` für Überschriften und kurze Titel, `text-wrap: pretty` für kurze bis mittlere Fließtexte. Nicht bei langen Texten und Code. Für Zähler, Preise, Timer und Tabellen `font-variant-numeric: tabular-nums`, damit nichts springt.
- **Bildkanten:** feine, neutrale Innenkontur (`outline: 1px solid rgba(0,0,0,.1); outline-offset: -1px`, im Dunkelmodus weiß mit 10 %), keine Markenfarbe.
- **Bewegung:** CSS-Übergänge für Zustandswechsel (sie lassen sich mitten in der Bewegung umlenken), Keyframes nur für einmalige Auftritte. Eintritt: Deckkraft + kleines `translateY`. Austritt kürzer und leiser (ca. 150 ms). Knopf-Druck: `scale(0.96)`. Icon-Wechsel per Überblendung statt hartem Umschalten.
- **Übergänge benennen:** nie `transition: all`, immer die konkreten Eigenschaften (`transform, background-color, box-shadow`). `will-change` nur bei Anlaufruckeln und nur für `transform`, `opacity`, `filter`, nie `all`.
- **Trefferflächen:** mindestens 40×40 px, besser 44×44. Ist das Icon kleiner, die Fläche mit einem Pseudo-Element vergrößern, ohne dass sich Flächen überlappen.
- **Zustände:** jedes bedienbare Element hat Hover, Active, Fokus, Laden und leer/Fehler durchgedacht.

## Ausgabe bei einem Review

Konkrete Vorher/Nachher-Zeilen mit Datei und Eigenschaft, nur Punkte nennen, die tatsächlich geändert wurden:

| Prinzip | Vorher | Nachher |
|---|---|---|
| Übergang benennen | `transition: all` | explizite Eigenschaften |
| Zahlen | Zähler springt beim Ändern | `tabular-nums` |

## Checkliste

- Verschachtelte Rundungen stimmig, Icons optisch zentriert
- Überschriften ohne hässlichen Umbruch, laufende Zahlen mit `tabular-nums`
- Kein `transition: all`, kein `will-change: all`
- Eintritts- und Austrittsbewegung getrennt, dezent, unterbrechbar
- Kleine Knöpfe haben trotzdem eine brauchbare Trefferfläche
- Bei 375 px Breite geprüft, wenn die Oberfläche auch aufs Handy kommt
