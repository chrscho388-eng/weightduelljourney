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
  const today0 = await pg.$$eval("#mealList .mname", (e) => e.map((x) => x.textContent));
  check(today0.includes("Frühstück vorhanden") && today0.includes("Cappuccino"), "auto coffee keeps existing meals");
  // manual entry
  await pg.fill("#mealText", "Testessen"); await pg.fill("#manKcal", "300"); await pg.fill("#manProt", "20");
  await pg.click("#manAdd"); await pg.waitForTimeout(200);
  check((await pg.$$eval("#mealList .mname", (e) => e.map((x) => x.textContent))).includes("Testessen"), "manual meal is added");
  check((await pg.$$("#favChips .chip")).length > 0, "favourites are shown");
  // history
  await pg.click("nav.tabs a[data-tab=verlauf]"); await pg.waitForTimeout(150);
  check((await pg.textContent("#insight")).includes("Prognose"), "overview shows the forecast");
  check((await pg.$$("#chart polyline")).length > 0, "weight chart is drawn");
  check((await pg.$$("#chSteps path")).length >= 2 && (await pg.$$("#chSteps line[stroke-dasharray='2 4']")).length > 0, "steps chart draws bars and goals");
  check(/Schritte, davon/.test(await pg.textContent("#readSteps")), "steps readout shown");
  // plan + shopping list
  await pg.click("nav.tabs a[data-tab=plan]"); await pg.waitForTimeout(150);
  check((await pg.textContent("#planBody")).includes("Reispfanne"), "plan shows meals");
  await pg.click("#shopBox summary"); await pg.waitForTimeout(150);
  const shop = await pg.textContent("#shopBox");
  check(/Hähnchenbrust/.test(shop) && /500 g/.test(shop), "shopping list doubles cooked dish");
  check(/Wahrscheinlich schon im Haushalt/.test(shop) && /Salz/.test(shop), "pantry items listed separately");
  check(!(await pg.textContent("header.top")).includes("%"), "header without incline badge");
  // request mode (GitHub sync, no API key): plan change goes to Claude for later
  await pg.evaluate(() => { localStorage.setItem("kurs:syncRepo", "a/b"); localStorage.setItem("kurs:syncToken", "x"); });
  await pg.reload(); await pg.waitForTimeout(800);
  await pg.click("nav.tabs a[data-tab=plan]"); await pg.waitForTimeout(150);
  check(await pg.isVisible("#planLaterBtn"), "plan change 'later' button visible without API key");
  await pg.fill("#planPrompt", "Mittwoch Pizza"); await pg.click("#planLaterBtn"); await pg.waitForTimeout(300);
  const pl = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile/plans/2026-11-02")));
  check(pl.planChange === "Mittwoch Pizza" && (await pg.inputValue("#planPrompt")) === "", "plan change stored and text box cleared");
  check((await pg.textContent("#planBody")).includes("Anpassung angefordert"), "requested change is shown");
  // standing wishes for all plans
  await pg.fill("#planRuleNew", "Kein Frühstück"); await pg.check("#rulesApply"); await pg.click("#planRulesSave"); await pg.waitForTimeout(400);
  await pg.fill("#planRuleNew", "Kein Fisch"); await pg.press("#planRuleNew", "Enter"); await pg.waitForTimeout(400);
  check((await pg.$$("#rulesList li:not(.none)")).length === 2, "standing wishes listed");
  await pg.click("#rulesList li:nth-child(2) .x"); await pg.waitForTimeout(400);
  check((await pg.$$eval("#rulesList li", (e) => e.map((x) => x.textContent))).join("|").startsWith("Kein Frühstück") && (await pg.$$("#rulesList li")).length === 1, "standing wish removed");
  const prof = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile")));
  const pl2 = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile/plans/2026-11-02")));
  check(prof.planRules === "Kein Frühstück", "standing wishes saved in profile");
  check(/Kein Frühstück/.test(pl2.planChange || "") && /Mittwoch Pizza/.test(pl2.planChange || ""), "standing wishes queued for existing plan");
  check(errors.length === 0, "no script errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await b.close();
  if (fails.length) { console.log(`\n${fails.length} check(s) failed`); process.exit(1); }
  console.log("\nall checks passed");
})().catch((e) => { console.error(e); process.exit(1); });
