// Ein Schritt für ein Release: bauen, prüfen, testen, Kopie ins Projekt, committen, pushen.
// node release.js "Commit-Nachricht"        (Trailer wie Co-Authored-By über die Umgebungsvariable RELEASE_TRAILER)
// node release.js "Nachricht" --no-push     (alles außer dem Push)
const fs = require("fs"), cp = require("child_process");
const run = (cmd, args) => { const r = cp.spawnSync(cmd, args, { stdio: "inherit", cwd: __dirname }); if (r.status) { console.error("Abbruch bei: " + [cmd, ...args].join(" ")); process.exit(1); } };
const msg = process.argv[2];
if (!msg || msg.startsWith("--")) { console.error('Aufruf: node release.js "Nachricht" [--no-push]'); process.exit(1); }
run("node", ["build.js"]);
run("node", ["lint.js"]);
run("node", ["tests/smoke.js", "kurs.html"]);
const copy = "/mnt/project-files/abnehmplan/app/kurs.html";
if (fs.existsSync(copy)) { fs.copyFileSync("kurs.html", copy); run("cmp", ["kurs.html", copy]); console.log("Kopie nach " + copy + " geprüft"); }
run("git", ["add", "-A"]);
run("git", ["commit", "-q", "-m", msg + (process.env.RELEASE_TRAILER ? "\n\n" + process.env.RELEASE_TRAILER : "")]);
if (!process.argv.includes("--no-push")) run("git", ["push", "-u", "origin", "HEAD:main"]);
console.log("Release fertig. Danach: Artifact veröffentlichen, CI-Lauf prüfen.");
