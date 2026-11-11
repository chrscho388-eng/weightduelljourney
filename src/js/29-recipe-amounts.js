  // ---- recipe amounts for 1 or 2 people (choice remembered on this device) ----
  const isPot = (r) => /topf/i.test(r.servings || "");
  function ppAmount(a, r, n) {
    a = String(a);
    const pair = /in klammern/i.test(r.servings || "") && a.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
    if (pair) return n === 2 ? pair[2] : pair[1];  // plan already lists "1 Person (2 Personen)"
    if (n === 1 || isPot(r)) return a;
    const FR = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
    const out = (v) => { const x = Math.round(v * 100) / 100; return ({ 0.5: "½", 0.25: "¼", 0.75: "¾", 1.5: "1½", 2.5: "2½" })[x] || String(x).replace(".", ","); };
    // double every quantity except package info ("6 Stück = 371 g"), per-100-g values and kcal
    return a.replace(/(=\s*)?(\d+(?:[.,]\d+)?(?:\/\d+)?|[½¼¾⅓⅔])(\s*(?:kcal|\/\s*100|%))?/g, (m, eq, num, tail, at, str) => {
      if (eq || tail || /\/\s*$/.test(str.slice(0, at)) || /^\s*[A-Za-zÄÖÜäöüß.]*\s*=/.test(str.slice(at + m.length))) return m;
      let v = FR[num] != null ? FR[num] : num.includes("/") ? num.split("/")[0] / num.split("/")[1] : parseFloat(num.replace(",", "."));
      return out(v * 2);
    });
  }
  let ppMode = 1; try { ppMode = localStorage.getItem("kurs:recipePP") === "2" ? 2 : 1; } catch (e) {}
  function applyPP(root) {
    (root || document).querySelectorAll("details.recipe").forEach((d) => d.classList.toggle("pp2", ppMode === 2));
    (root || document).querySelectorAll(".pptog [data-pp]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.pp === ppMode)));
  }
  function recipeHtml(m, ref) {
    if (!isDish(m)) return "";
    const r = m.recipe;
    if (r && (r.ingredients || []).length) {
      return `<details class="recipe"${ref && ref === openRecipe ? " open" : ""}><summary>Rezept${r.minutes ? ` · ${fmt(r.minutes)} Min.` : ""}</summary>`
        + `<div class="ppbar"><span class="small muted">${esc(r.servings || "1 Portion")}</span><span class="pptog" role="group" aria-label="Zutaten für"><button type="button" data-pp="1">1 Person</button><button type="button" data-pp="2">2 Personen</button></span></div>`
        + (isPot(r) ? `<div class="small muted pp2only">Die Mengen sind für den ganzen Topf, der reicht für euch beide und einen Rest.</div>` : "")
        + `<ul>${r.ingredients.map((i) => `<li><span class="pp1only">${esc(i.amount ? ppAmount(i.amount, r, 1) + " " : "")}</span><span class="pp2only">${esc(i.amount ? ppAmount(i.amount, r, 2) + " " : "")}</span>${esc(i.item)}${i.note ? ` <span class="muted">(${esc(i.note)})</span>` : ""}${i.have ? ` <span class="muted">(da)</span>` : ""}</li>`).join("")}</ul>`
        + `<div class="small muted pp2only">In der Anleitung stehen die Mengen für 1 Person.</div>`
        + `<ol>${(r.steps || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`
        + (r.tip ? `<div class="small muted">${esc(r.tip)}</div>` : "")
        + (!ref || !recipeAllowed() ? "" : m.recipeChange
          ? `<div class="small muted" style="margin-top:6px">Änderung angefordert („${esc(m.recipeChange)}“), sie kommt beim nächsten Abgleich.</div>`
          : `<div class="rchange" style="margin-top:8px"><button class="btn ghost" type="button" data-rc="open" style="padding:4px 10px;font-size:13px">Rezept ändern</button>`
            + `<div class="redit" hidden><textarea class="rwish" placeholder="z. B. ohne Paprika, im Airfryer, vegetarisch, mit Zucchini statt Brokkoli"></textarea>`
            + `<div class="btnrow">${sample ? `<button class="btn" type="button" data-rc="now" style="padding:4px 10px;font-size:13px">Jetzt ändern</button>` : ""}${requestMode() ? `<button class="btn ghost" type="button" data-rc="later" style="padding:4px 10px;font-size:13px">An Claude senden (später)</button>` : ""}</div>`
            + `<span class="status small"></span></div></div>`)
        + `</details>`;
    }
    if (!ref || !recipeAllowed()) return "";
    if (m.recipeRequested) return `<div class="recipe small muted">Rezept angefordert, es kommt beim nächsten Abgleich.</div>`;
    if (sample && requestMode()) return `<div class="recipe small"><span class="rhint">Rezept: </span><button class="btn ghost" type="button" data-act="now" style="padding:4px 10px;font-size:13px">Jetzt erstellen</button> <button class="btn ghost" type="button" data-act="later" style="padding:4px 10px;font-size:13px">An Claude senden (später)</button><span class="status small"></span></div>`;
    return `<div class="recipe small"><span class="rhint">Tippen für Rezept ›</span><span class="status small"></span></div>`;
  }
  function recipePrompt(m, wish) {
    const cur = wish && m.recipe ? `Bisheriges Rezept (JSON): ${JSON.stringify(m.recipe).slice(0, 2500)}\nÄnderungswunsch der Person: ${wish}\nPasse das Rezept an diesen Wunsch an. Halte kcal und Eiweiß möglichst gleich; passe Mengen an, wenn sich Zutaten ändern.\nGib zusätzlich im Feld "meal" den passenden Titel des Gerichts, die neue Zutatenzeile im Stil des Plans (Mengen für 1 Portion, inklusive Beilagen wie Shake) und die neuen kcal und Eiweiß der Portion zurück, damit Titel, Zutatenzeile und Werte zum Rezept passen.\n` : "";
    return `${cur}Schreibe ein einfaches, schnelles Rezept auf Deutsch für dieses Gericht aus einem Abnehm-Wochenplan.
Gericht: ${m.name}
${m.detail ? "Mengen und Zutaten laut Plan: " + m.detail + "\n" : ""}Zielwerte für die Portion: ${m.kcal || 0} kcal, ${m.protein || 0} g Eiweiß.
- Die Zutatenmengen sind für genau diese eine Portion und treffen die Zielwerte. Halte dich an die Mengen aus dem Plan.
- Wenige Schritte, alltagstauglich, ohne Spezialgeräte.
- Jede Zutat hat amount (Zahl + Einheit, Brüche als Zahl, z. B. "0,5" statt "½"; Eier in Stück), item (nur der Name des Produkts), optional note (Zubereitung oder Hinweis, z. B. "Saft", "in Streifen") und have: true, wenn die Zutat aus Vorrat oder Rest stammt. Eiklar nie einzeln, rechne es in ganze Eier um. Zitrusfrüchte nur als Frucht (1 Limette), Saft oder Schale in note.
${S.estimateHints ? "Hinweise der Person (No-Gos und Vorlieben beachten):\n" + S.estimateHints.slice(0, 600) + "\n" : ""}${S.planRules ? "Dauerhafte Wünsche der Person (Vorrang):\n" + String(S.planRules).slice(0, 800) + "\n" : ""}
Antworte nur mit JSON in genau dieser Form:
{${cur ? '"meal":{"name":"…","detail":"…","kcal":0,"protein":0},' : ""}"servings":"1 Portion (für 2 Personen Mengen verdoppeln)","minutes":0,"ingredients":[{"amount":"150 g","item":"Hähnchenbrust","note":"in Streifen"}],"steps":["…"],"tip":"ein kurzer Tipp oder leer"}`;
  }
  function locateMeal(plan, ref) {
    const [kind, idx] = ref[0] === "s" ? ["s", +ref.slice(2)] : ["d", ref.slice(1).split(":").map(Number)];
    const pick = (p) => kind === "s" ? (p.swaps || [])[idx] : ((p.days || [])[idx[0]] || {}).meals?.[idx[1]];
    return pick;
  }
  // Zutat: amount (Zahl + Einheit), item (nur der Name), note (Hinweis, optional), have (Vorrat/Rest, optional)
  const cleanIngs = (list) => list.slice(0, 25).map((i) => ({ amount: String(i.amount || "").slice(0, 40), item: String(i.item || "").slice(0, 120), ...(i.note ? { note: String(i.note).slice(0, 80) } : {}), ...(i.have === true ? { have: true } : {}) })).filter((i) => i.item);
  const cleanRecipe = (r) => ({
    servings: String(r.servings || "1 Portion").slice(0, 120), minutes: Math.max(0, Math.round(+r.minutes || 0)),
    ingredients: cleanIngs(r.ingredients),
    steps: (r.steps || []).slice(0, 15).map((x) => String(x).slice(0, 400)), tip: String(r.tip || "").slice(0, 300)
  });
  // a changed recipe also renames the dish and updates its ingredient line and values, so plan and recipe match
  function applyMealChange(target, mc) {
    if (!mc || typeof mc !== "object") return;
    if (mc.name) target.name = String(mc.name).slice(0, 120);
    if (mc.detail) target.detail = String(mc.detail).slice(0, 500);
    if (+mc.kcal > 0) target.kcal = Math.round(+mc.kcal);
    if (+mc.protein > 0) target.protein = Math.round(+mc.protein);
  }
  async function changeRecipe(row, wish, later) {
    if (row.dataset.busy) return;
    const ref = row.dataset.ref, week = curPlan, plan = plans[week]; if (!plan) return;
    const pick = locateMeal(plan, ref), meal = pick(plan); if (!meal) return;
    const st = row.querySelector(".redit .status");
    const next = JSON.parse(JSON.stringify(plan)), target = pick(next);
    row.dataset.busy = "1"; st.classList.remove("err");
    try {
      if (later || !sample) target.recipeChange = wish.slice(0, 300);
      else {
        st.textContent = "Claude passt das Rezept an …";
        const r = await sample.json(recipePrompt(meal, wish), { modelTier: "default" });
        if (!r || !Array.isArray(r.ingredients) || !r.ingredients.length) throw new Error("empty");
        target.recipe = cleanRecipe(r);
        applyMealChange(target, r.meal);
      }
      next.updatedAt = new Date().toISOString();
      await base.collection("plans").doc(week).set(next); plans[week] = next;
      openRecipe = ref; renderPlan();
    } catch (e) {
      delete row.dataset.busy; st.textContent = "Das hat nicht geklappt. " + aiErr(e) + " Versuch es noch einmal."; st.classList.add("err");
    }
  }
  async function makeRecipe(row, later) {
    if (!recipeAllowed() || row.dataset.busy) return;
    const ref = row.dataset.ref, week = curPlan, plan = plans[week]; if (!plan) return;
    const st = row.querySelector(".recipe .status"), hint = row.querySelector(".rhint");
    const [kind, idx] = ref[0] === "s" ? ["s", +ref.slice(2)] : ["d", ref.slice(1).split(":").map(Number)];
    const meal = kind === "s" ? (plan.swaps || [])[idx] : ((plan.days || [])[idx[0]] || {}).meals?.[idx[1]];
    if (!meal) return;
    if (later || !sample) {
      if (meal.recipeRequested) return;
      const next = JSON.parse(JSON.stringify(plan));
      const target = kind === "s" ? next.swaps[idx] : next.days[idx[0]].meals[idx[1]];
      target.recipeRequested = true; next.updatedAt = new Date().toISOString();
      try { await base.collection("plans").doc(week).set(next); plans[week] = next; renderPlan(); }
      catch (e) { st.textContent = "Speichern fehlgeschlagen."; st.classList.add("err"); }
      return;
    }
    row.dataset.busy = "1"; if (hint) hint.hidden = true; st.textContent = "Claude schreibt das Rezept …"; st.classList.remove("err");
    try {
      const r = await sample.json(recipePrompt(meal), { modelTier: "default" });
      if (!r || !Array.isArray(r.ingredients) || !r.ingredients.length) throw new Error("empty");
      const recipe = {
        servings: String(r.servings || "1 Portion").slice(0, 120), minutes: Math.max(0, Math.round(+r.minutes || 0)),
        ingredients: cleanIngs(r.ingredients),
        steps: (r.steps || []).slice(0, 15).map((x) => String(x).slice(0, 400)), tip: String(r.tip || "").slice(0, 300)
      };
      const next = JSON.parse(JSON.stringify(plan));
      const target = kind === "s" ? next.swaps[idx] : next.days[idx[0]].meals[idx[1]];
      target.recipe = recipe; next.updatedAt = new Date().toISOString();
      await base.collection("plans").doc(week).set(next); plans[week] = next;
      openRecipe = ref; renderPlan();
    } catch (e) {
      delete row.dataset.busy; st.textContent = "Das hat nicht geklappt. " + aiErr(e) + " Tippe noch einmal."; st.classList.add("err");
    }
  }
