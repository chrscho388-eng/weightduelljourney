// Smoke test for the page bundled into the APK: it must load, render and switch tabs without script errors.
// Usage: node tests/smoke.js <path to html>
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const file = path.resolve(process.argv[2] || "kurs.html");
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixture.json"), "utf8"));
const fails = [];
const check = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) fails.push(msg); };

(async () => {
  const html = fs.readFileSync(file, "utf8");
  check(html.lastIndexOf("</script>") > html.lastIndexOf("<script>"), "script block is complete (file not truncated)");
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  pg.on("pageerror", (e) => errors.push(e.message));
  pg.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await pg.route("https://api.github.com/**", (r) => r.fulfill({ status: 404, body: "{}" }));
  await pg.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await pg.clock.setFixedTime(new Date("2026-11-04T18:00:00+01:00"));
  await pg.goto("file://" + file);
  await pg.evaluate((d) => { for (const [k, v] of Object.entries(d)) localStorage.setItem("kurs:data/users/local/" + k, JSON.stringify(v)); }, fixture);
  await pg.reload(); await pg.waitForTimeout(1200);

  check(!/lädt/.test(await pg.textContent("#topMeta")), "header shows weight, not 'lädt'");
  check((await pg.textContent("#dayName")).includes("04.11."), "today view shows the date");
  for (const t of ["woche", "verlauf", "plan", "profil", "heute"]) {
    await pg.click(`nav.tabs a[data-tab=${t}]`); await pg.waitForTimeout(150);
    check(await pg.$eval("#view-" + t, (e) => !e.hidden), "tab " + t + " opens");
  }
  // manual entry
  await pg.fill("#mealText", "Testessen"); await pg.fill("#manKcal", "300"); await pg.fill("#manProt", "20");
  await pg.click("#manAdd"); await pg.waitForTimeout(200);
  check((await pg.$$eval("#mealList .mname", (e) => e.map((x) => x.textContent))).includes("Testessen"), "manual meal is added");
  check((await pg.$$("#favChips .chip")).length > 0, "favourites are shown");
  // history
  await pg.click("nav.tabs a[data-tab=verlauf]"); await pg.waitForTimeout(150);
  check((await pg.textContent("#insight")).includes("Prognose"), "overview shows the forecast");
  check((await pg.$$("#chart polyline")).length > 0, "weight chart is drawn");
  // plan + shopping list
  await pg.click("nav.tabs a[data-tab=plan]"); await pg.waitForTimeout(150);
  check((await pg.textContent("#planBody")).includes("Reispfanne"), "plan shows meals");
  await pg.click("#shopBox summary"); await pg.waitForTimeout(150);
  const shop = await pg.textContent("#shopBox");
  check(/Hähnchenbrust/.test(shop) && /500 g/.test(shop), "shopping list doubles cooked dish");
  check(/Wahrscheinlich schon im Haushalt/.test(shop) && /Salz/.test(shop), "pantry items listed separately");
  check(errors.length === 0, "no script errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await b.close();
  if (fails.length) { console.log(`\n${fails.length} check(s) failed`); process.exit(1); }
  console.log("\nall checks passed");
})().catch((e) => { console.error(e); process.exit(1); });
