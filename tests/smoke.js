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
  // office days use the smaller office cappuccino
  await pg.click("#prevDay"); await pg.waitForTimeout(400);
  const d3 = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile/days/2026-11-03")));
  const cof = d3.meals.find((m) => m.id === "coffee");
  check(cof && cof.kcal === 143 && cof.protein === 8 && cof.label === "3× Cappuccino (Firma)", "office coffee uses its own size");
  await pg.click("#nextDay"); await pg.waitForTimeout(200);
  // weight field only on the weigh day (Tuesday) or on request
  const hid = (sel) => pg.$eval(sel, (e) => e.hidden);
  await pg.click("#prevDay"); await pg.waitForTimeout(200);
  check(!(await hid("#weightField")) && await hid("#weightShow"), "weight field shown on Tuesday");
  await pg.click("#nextDay"); await pg.waitForTimeout(200);
  check(await hid("#weightField") && !(await hid("#weightShow")), "weight field hidden on other days");
  await pg.click("nav.tabs a[data-tab=heute]"); await pg.waitForTimeout(150);
  await pg.click("#weightShow"); await pg.waitForTimeout(100);
  check(!(await hid("#weightField")), "weight field can be opened on other days");
  // manual entry
  await pg.fill("#mealText", "Testessen"); await pg.fill("#manKcal", "300"); await pg.fill("#manProt", "20");
  await pg.click("#manAdd"); await pg.waitForTimeout(200);
  check((await pg.$$eval("#mealList .mname", (e) => e.map((x) => x.textContent))).includes("Testessen"), "manual meal is added");
  check((await pg.$$("#favChips .chip")).length > 0, "favourites are shown");
  // adjust a logged meal in place: one gram amount in the label scales kcal and protein
  await pg.fill("#mealText", "Eiweißshake (100 g Whey)"); await pg.fill("#manKcal", "380"); await pg.fill("#manProt", "77"); await pg.click("#manAdd"); await pg.waitForTimeout(200);
  await pg.click('#mealList .mname button:has-text("Eiweißshake")'); await pg.waitForTimeout(150);
  check(await pg.isVisible(".medit"), "tapping a meal opens the editor");
  await pg.fill('.medit [data-me="g"]', "120"); await pg.click('.medit [data-ma="save"]'); await pg.waitForTimeout(250);
  const shk = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile/days/2026-11-04"))).meals.find((m) => /Eiweißshake/.test(m.label));
  check(shk && shk.label === "Eiweißshake (120 g Whey)" && shk.kcal === 456 && shk.protein === 92 && !(await pg.$(".medit")), "amount change scales the entry (" + (shk && shk.label + " " + shk.kcal + "/" + shk.protein) + ")");
  // favourite chip: logged and the hint says it can be adjusted
  await pg.click('#favChips .chip:has-text("Skyr mit Beeren")'); await pg.waitForTimeout(200);
  check(/anzupassen/.test(await pg.textContent("#favHint")), "favourite logged with an adjust hint");
  await pg.click('#mealList .mname button:has-text("Skyr mit Beeren")'); await pg.waitForTimeout(150);
  await pg.fill('.medit [data-me="pct"]', "150"); await pg.click('.medit [data-ma="save"]'); await pg.waitForTimeout(250);
  const sky = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile/days/2026-11-04"))).meals.find((m) => m.label === "Skyr mit Beeren");
  check(sky && sky.kcal === 315 && sky.protein === 42, "portion percent scales a favourite");
  // plan chip fills the form first, logging happens on "Eintragen"
  const chip = await pg.$('#planChips .chip:has-text("Reispfanne")');
  await chip.click(); await pg.waitForTimeout(150);
  const listed = () => pg.$$eval("#mealList .mname", (e) => e.map((x) => x.textContent).join("|"));
  check((await pg.inputValue("#mealText")).startsWith("Reispfanne") && (await pg.inputValue("#manKcal")) === "800" && !/Reispfanne/.test(await listed()), "plan chip fills the form instead of logging");
  await pg.fill("#manKcal", "700"); await pg.click("#manAdd"); await pg.waitForTimeout(200);
  const d0 = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile/days/2026-11-04")));
  const rp = d0.meals.find((m) => m.label.startsWith("Reispfanne"));
  check(rp && rp.kcal === 700 && rp.fromPlan === "Reispfanne" && (await pg.inputValue("#mealText")) === "", "adjusted plan meal logged and marked as taken");
  // history
  await pg.click("nav.tabs a[data-tab=verlauf]"); await pg.waitForTimeout(150);
  check((await pg.textContent("#insight")).includes("Prognose"), "overview shows the forecast");
  check((await pg.$$("#chart polyline")).length > 0, "weight chart is drawn");
  check((await pg.$$("#chSteps path")).length >= 2 && (await pg.$$("#chSteps line[stroke-dasharray='2 4']")).length > 0, "steps chart draws bars and goals");
  check(/Schritte, davon/.test(await pg.textContent("#readSteps")), "steps readout shown");
  // plan + shopping list
  await pg.click("nav.tabs a[data-tab=plan]"); await pg.waitForTimeout(150);
  check((await pg.textContent("#planBody")).includes("Reispfanne"), "plan shows meals");
  // plan days collapse: past days closed, today open, choice remembered
  const openDays = await pg.$$eval("details.planday", (e) => e.map((x) => [x.dataset.date, x.open]));
  check(openDays.some(([d, o]) => d < "2026-11-04" && !o) && openDays.some(([d, o]) => d === "2026-11-04" && o), "past plan days collapsed, today open");
  await pg.click('details.planday[data-date="2026-11-04"] > summary'); await pg.waitForTimeout(100);
  await pg.click("nav.tabs a[data-tab=heute]"); await pg.click("nav.tabs a[data-tab=plan]"); await pg.waitForTimeout(150);
  check(!(await pg.$eval('details.planday[data-date="2026-11-04"]', (x) => x.open)), "collapsed day stays collapsed");
  await pg.click('details.planday[data-date="2026-11-04"] > summary'); await pg.waitForTimeout(100);
  await pg.click("#shopBox summary"); await pg.waitForTimeout(150);
  const shop = await pg.textContent("#shopBox");
  check(/Hähnchenbrust/.test(shop) && /500 g/.test(shop), "shopping list doubles cooked dish");
  check(/Wahrscheinlich schon im Haushalt/.test(shop) && /Salz/.test(shop), "pantry items listed separately");
  check(!/Schöpfer|Buffetsalat|\)/.test(shop.split("Wahrscheinlich")[0]) && /Eiklar/.test(shop) && /Whey/.test(shop), "shopping list skips canteen and parses brackets");
  check(!/Skyr\)/.test(shop) && (shop.match(/Skyr/g) || []).length === 1, "shopping list merges bracketed items");
  check(!/Berglinsen/.test(shop) && !(await pg.$('#shopBox [data-sp="today"]')), "shopping list skips past days");
  // ticked items move into their own collapsible box
  const nOpen = (await pg.$$("#shopBox > details > ul li")).length;
  await pg.click("#shopBox > details > ul li input"); await pg.waitForTimeout(150);
  check((await pg.$$("#shopBox > details > ul li")).length === nOpen - 1 && (await pg.$$("#shopBox details.donebox li")).length === 1, "ticked item moves to the 'Abgehakt' box");
  check(/Abgehakt · 1/.test(await pg.textContent("#shopBox details.donebox summary")) && !(await pg.$eval("#shopBox details.donebox", (e) => e.open)), "'Abgehakt' box is collapsed and counts");
  await pg.click("#shopBox details.donebox summary"); await pg.click("#shopBox details.donebox li input"); await pg.waitForTimeout(150);
  check((await pg.$$("#shopBox > details > ul li")).length === nOpen && !(await pg.$("#shopBox details.donebox")), "unticking moves the item back");
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
  // canteen menu: photo is stored on the plan and queued for Claude
  check(await pg.isVisible("#canteenLabel"), "canteen upload visible in request mode");
  await pg.fill("#canteenHabits", "Suppe, kleiner Salat, Dessert");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await pg.setInputFiles("#canteenInput", { name: "menu.png", mimeType: "image/png", buffer: png }); await pg.waitForTimeout(800);
  const pl3 = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile/plans/2026-11-02")));
  const prof3 = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile")));
  check(/^data:image\/jpeg/.test(pl3.canteenMenu || "") && /Kantinen-Menü/.test(pl3.planChange || "") && /Mittwoch Pizza/.test(pl3.planChange || ""), "canteen menu stored and queued");
  check(prof3.canteenHabits === "Suppe, kleiner Salat, Dessert" && /Suppe/.test(pl3.planChange), "canteen habits saved and sent along");
  check(await pg.isVisible("#canteenMenuBox"), "menu of the week can be viewed");
  // Strg+V: a pasted screenshot goes to the canteen menu on the Plan tab and to "Foto später" on Heute
  const pasteImg = (sel) => pg.evaluate(async (sel) => {
    const b = await (await fetch("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")).blob();
    const dt = new DataTransfer(); dt.items.add(new File([b], "shot.png", { type: "image/png" }));
    (sel ? document.querySelector(sel) : document).dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
  }, sel);
  await pasteImg(null); await pg.waitForTimeout(800);
  const pl5 = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile/plans/2026-11-02")));
  check((pl5.planChange.match(/Kantinen-Menü/g) || []).length === 2, "pasted screenshot is used as canteen menu");
  await pg.click("nav.tabs a[data-tab=heute]"); await pg.waitForTimeout(150);
  check(await pg.isVisible("#pasteHint"), "paste hint shown on Heute");
  await pasteImg("#mealText"); await pg.waitForTimeout(400);
  const dayNow = () => pg.evaluate(() => JSON.parse(localStorage.getItem("kurs:data/users/local/profile/days/2026-11-04")));
  check(await pg.isVisible("#attachBox") && !(await dayNow()).meals.some((m) => m.pending && m.photo), "pasted photo is attached, not sent yet");
  check((await pg.textContent("#sendBtn")) === "An Claude senden" && (await pg.$$eval("#view-heute .btnrow:has(#sendBtn) > :not([hidden])", (e) => e.length)) === 2, "one send button and one photo button without API key");
  await pg.fill("#mealText", "nur halbe Portion Pommes"); await pg.click("#sendBtn"); await pg.waitForTimeout(800);
  const d5 = await dayNow();
  check(d5.meals.some((m) => m.pending && /^data:image/.test(m.photo || "") && m.request === "nur halbe Portion Pommes") && !(await pg.isVisible("#attachBox")), "photo sent together with the edited text");
  // several photos at once (dish and nutrition label)
  await pg.setInputFiles("#photoInput", [{ name: "a.png", mimeType: "image/png", buffer: png }, { name: "b.png", mimeType: "image/png", buffer: png }]); await pg.waitForTimeout(300);
  check((await pg.$$("#attachList .thumb")).length === 2, "two photos attached");
  await pg.click("#attachList .thumb .x"); await pg.waitForTimeout(100);
  await pg.setInputFiles("#photoInput", [{ name: "c.png", mimeType: "image/png", buffer: png }]); await pg.waitForTimeout(300);
  await pg.fill("#mealText", "Fertiggericht, Etikett"); await pg.click("#sendBtn"); await pg.waitForTimeout(800);
  const d6 = (await dayNow()).meals.find((m) => m.request === "Fertiggericht, Etikett");
  check(d6 && d6.photos && d6.photos.length === 2 && d6.photo === d6.photos[0], "several photos sent with one request");
  // with an API key Claude reads the menu right away and proposes the office-day lunches
  let estImgs = -1;
  await pg.route("https://api.anthropic.com/**", (r) => { const body = r.request().postData() || ""; if (body.includes("korrigiert")) return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ seen: "", items: [{ label: "Testessen ohne Soße", kcal: 515, protein: 42, parts: [{ name: "Reis", grams: 100, kcal: 350, protein: 7 }, { name: "Hähnchen", grams: 150, kcal: 165, protein: 35 }] }], note: "" }) }] }) });
    if (body.includes("Ernährungslog")) { estImgs = (body.match(/"type":"image"/g) || []).length; return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ seen: "Teller und Etikett", items: [{ label: "Fertiggericht", kcal: 410, protein: 39, parts: [] }], note: "" }) }] }) }); } return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ content: [{ type: "text", text: JSON.stringify({ summary: "Kantine eingeplant", plan: { note: "Kantine", days: [{ date: "2026-11-05", type: "Büro", meals: [{ slot: "Mittag (Kantine)", name: "Frittatensuppe, Kartoffelsalat, Topfencreme", detail: "", kcal: 750, protein: 30, cook: false }] }], swaps: [] } }) }] }) }); });
  await pg.evaluate(() => localStorage.setItem("kurs:apiKey", "sk-test")); await pg.reload(); await pg.waitForTimeout(800);
  await pg.setInputFiles("#photoInput", [{ name: "a.png", mimeType: "image/png", buffer: png }, { name: "b.png", mimeType: "image/png", buffer: png }]); await pg.waitForTimeout(300);
  await pg.click("#sendBtn"); await pg.waitForTimeout(800);
  check(estImgs === 2 && await pg.isVisible("#estPreview") && !(await pg.isVisible("#attachBox")), "direct estimate sends both photos (" + estImgs + ")");
  check((await pg.textContent("#sendBtn")) === "Schätzen" && await pg.$eval("#askHint", (e) => e.hidden) && !(await pg.textContent("#view-heute")).includes("später"), "with API key only 'Schätzen', no 'später'");
  check(await pg.isVisible("#sendMode"), "send mode switch shown with API key and sync");
  await pg.click("#sendMode [data-send-mode=claude]"); await pg.waitForTimeout(100);
  check((await pg.textContent("#sendBtn")) === "An Claude senden" && await pg.isVisible("#askHint"), "switch to 'über Claude' changes the send button");
  estImgs = -1; await pg.fill("#mealText", "Mango-Shake über Claude"); await pg.click("#sendBtn"); await pg.waitForTimeout(800);
  check(estImgs === -1 && (await dayNow()).meals.some((m) => m.pending && m.request === "Mango-Shake über Claude"), "'über Claude' queues a request instead of estimating");
  await pg.reload(); await pg.waitForTimeout(800);
  check((await pg.textContent("#sendBtn")) === "An Claude senden", "send mode remembered");
  // editor in 'über Claude' mode: the described change is queued, old values still count
  await pg.click('#mealList .mname button:has-text("Testessen")'); await pg.waitForTimeout(150);
  check((await pg.textContent('.medit [data-ma="ask"]')) === "An Claude senden", "editor follows the send mode");
  await pg.fill('.medit [data-me="change"]', "ohne Soße"); await pg.click('.medit [data-ma="ask"]'); await pg.waitForTimeout(300);
  const te = (await dayNow()).meals.find((m) => m.label === "Testessen");
  check(te && te.pending && /Korrektur/.test(te.request) && /ohne Soße/.test(te.request) && te.kcal === 300, "described change queued for Claude");
  await pg.evaluate(() => { const k = "kurs:data/users/local/profile/days/2026-11-04"; const d = JSON.parse(localStorage.getItem(k)); d.meals.forEach((m) => { if (m.label === "Testessen") { delete m.pending; delete m.request; } }); localStorage.setItem(k, JSON.stringify(d)); });
  // plan tab: same switch, one button
  await pg.click("nav.tabs a[data-tab=plan]"); await pg.waitForTimeout(150);
  check(await pg.isVisible("#planSendMode") && await pg.isVisible("#planLaterBtn") && !(await pg.isVisible("#planAdjustBtn")), "plan: 'über Claude' shows only 'An Claude senden'");
  await pg.click("#planSendMode [data-send-mode=direct]"); await pg.waitForTimeout(100);
  check(await pg.isVisible("#planAdjustBtn") && !(await pg.isVisible("#planLaterBtn")), "plan: direct shows only 'Jetzt berechnen'");
  check(await pg.evaluate(() => { const a = document.getElementById("planAsk"), n = document.getElementById("planNotes"); return !!(a.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING); }), "plan change field is at the top of the plan tab");
  await pg.click("nav.tabs a[data-tab=heute]"); await pg.waitForTimeout(150);
  await pg.reload(); await pg.waitForTimeout(800);
  await pg.click("#sendMode [data-send-mode=direct]"); await pg.waitForTimeout(100);
  check((await pg.textContent("#sendBtn")) === "Schätzen", "switch back to direct");
  // editor, direct: Claude re-estimates, single ingredients can be left out
  await pg.click('#mealList .mname button:has-text("Testessen")'); await pg.waitForTimeout(150);
  await pg.fill('.medit [data-me="change"]', "ohne Soße"); await pg.click('.medit [data-ma="ask"]'); await pg.waitForTimeout(600);
  check((await pg.inputValue('.medit [data-me="kcal"]')) === "515" && (await pg.$$(".medit .prow")).length === 2, "re-estimate fills the editor with parts");
  await pg.click('.medit [data-px="0"]'); await pg.waitForTimeout(150);
  check((await pg.inputValue('.medit [data-me="kcal"]')) === "165" && (await pg.inputValue('.medit [data-me="protein"]')) === "35", "leaving out an ingredient subtracts it");
  await pg.click('.medit [data-ma="save"]'); await pg.waitForTimeout(250);
  const te2 = (await dayNow()).meals.find((m) => m.label === "Testessen ohne Soße");
  check(te2 && te2.kcal === 165 && te2.parts.length === 1 && te2.parts[0].name === "Hähnchen", "edited parts saved");
  await pg.click("nav.tabs a[data-tab=plan]"); await pg.waitForTimeout(150);
  await pg.setInputFiles("#canteenInput", { name: "menu.png", mimeType: "image/png", buffer: png }); await pg.waitForTimeout(1000);
  check(await pg.isVisible("#planProposal") && (await pg.textContent("#planBody")).includes("Frittatensuppe"), "canteen proposal shown with API key");
  await pg.click("#planAccept"); await pg.waitForTimeout(400);
  const pl4 = JSON.parse(await pg.evaluate(() => localStorage.getItem("kurs:data/users/local/profile/plans/2026-11-02")));
  check(pl4.days[0].meals[0].name.startsWith("Frittatensuppe") && /^data:image/.test(pl4.canteenMenu || ""), "accepted plan keeps the menu photo");
  await pg.click("nav.tabs a[data-tab=profil]"); await pg.waitForTimeout(150);
  await pg.click('#themeChips [data-theme-set="dark"]'); await pg.waitForTimeout(100);
  const bgDark = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(bgDark === "rgb(19, 24, 21)", "dark mode can be switched on (" + bgDark + ")");
  await pg.reload(); await pg.waitForTimeout(800);
  check(await pg.evaluate(() => document.documentElement.dataset.theme) === "dark", "dark mode is remembered");
  await pg.click("nav.tabs a[data-tab=profil]"); await pg.waitForTimeout(150);
  await pg.click('#themeChips [data-theme-set="light"]'); await pg.waitForTimeout(100);
  check(await pg.evaluate(() => getComputedStyle(document.body).backgroundColor) === "rgb(243, 244, 239)", "light mode can be switched on");
  await pg.click("#changelogBox > summary");
  check(await pg.isVisible("#changelog .ver") && (await pg.$$("#changelog .ver")).length > 20 && /^3\.\d+/.test(await pg.textContent("#changelog .ver b")), "changelog lists the versions");
  check(errors.length === 0, "no script errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await b.close();
  if (fails.length) { console.log(`\n${fails.length} check(s) failed`); process.exit(1); }
  console.log("\nall checks passed");
})().catch((e) => { console.error(e); process.exit(1); });
