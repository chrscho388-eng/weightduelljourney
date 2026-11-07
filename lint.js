// Prüft den JS-Teil von src/ auf undefinierte Variablen und ähnliche Fehler (ESLint, Regeln in eslint.config.js).
// node lint.js   (ESLint muss installiert sein: npm i -g eslint, oder in CI per npm install)
const fs = require("fs"), path = require("path"), cp = require("child_process");
const dir = path.join(__dirname, "src", "js");
const js = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).sort().map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("") + "})();\n";
const tmp = path.join(__dirname, ".lint-app.js");
fs.writeFileSync(tmp, js);
let r;
try { r = cp.spawnSync("npx", ["--no-install", "eslint", "--no-warn-ignored", "--config", path.join(__dirname, "eslint.config.js"), tmp], { stdio: "inherit", cwd: __dirname }); }
finally { fs.rmSync(tmp, { force: true }); }
if (r.status) { console.error("Lint-Fehler (Zeilen beziehen sich auf alle JS-Teile hintereinander)."); process.exit(1); }
console.log("lint ok");
