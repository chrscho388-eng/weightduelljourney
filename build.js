// Baut kurs.html aus src/ zusammen: head.html, style.css, body.html, js/*.js (nach Dateiname sortiert), tail.html.
// node build.js          schreibt kurs.html
// node build.js --check  prüft nur, ob kurs.html zum Quellstand passt (für CI)
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "src");
const read = (p) => fs.readFileSync(path.join(dir, p), "utf8");
const js = fs.readdirSync(path.join(dir, "js")).filter((f) => f.endsWith(".js")).sort();
const html = read("head.html") + read("style.css") + read("body.html") + js.map((f) => read("js/" + f)).join("") + read("tail.html");
const target = path.join(__dirname, "kurs.html");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8") !== html) { console.error("kurs.html passt nicht zu src/ – bitte `node build.js` ausführen und mit einchecken."); process.exit(1); }
  console.log("kurs.html ist aktuell (" + js.length + " JS-Teile)");
} else {
  fs.writeFileSync(target, html);
  console.log("kurs.html gebaut (" + html.split("\n").length + " Zeilen, " + js.length + " JS-Teile)");
}
