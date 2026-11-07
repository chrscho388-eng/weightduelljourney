  // ---- profile ----
  const PF = { pName: "name", pSex: "sex", pAge: "age", pHeight: "heightCm", pStartW: "startWeight", pStartD: "startWeightDate", pGoalW: "goalWeight", pGoalD: "goalDate", pKcal: "kcalTarget", pProt: "proteinTarget", pProtOpt: "proteinOptimum", pSpeed: "speedKmh", pWeighDay: "weighDay", pHints: "estimateHints" };
  const NUMS = ["age", "heightCm", "startWeight", "goalWeight", "kcalTarget", "proteinTarget", "proteinOptimum", "speedKmh", "weighDay"];
  $("pAutoSync").onchange = () => { saveProfile({ autoSyncHourly: $("pAutoSync").checked }); };
  // step goals: list of {from, steps, min?}; edited rows live in formGoals until the profile is saved
  let formGoals = [];
  function renderGoalRows() {
    const box = $("stepGoalList"); box.innerHTML = "";
    formGoals.forEach((g, i) => {
      const row = document.createElement("div"); row.className = "small"; row.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap";
      row.innerHTML = `<span>ab</span><input type="date" value="${esc(g.from || "")}" aria-label="gilt ab" style="width:auto"><input type="number" inputmode="numeric" min="0" step="500" value="${g.steps ?? ""}" placeholder="Ziel" aria-label="Schrittziel" style="width:90px"><input type="number" inputmode="numeric" min="0" step="500" value="${g.min ?? ""}" placeholder="mindestens" aria-label="Mindestens" style="width:100px"><button type="button" class="x" aria-label="Zeile entfernen">×</button>`;
      const [d, st, mn, x] = row.querySelectorAll("input,button");
      d.oninput = () => { g.from = d.value; }; st.oninput = () => { g.steps = st.value === "" ? "" : Number(st.value); }; mn.oninput = () => { g.min = mn.value === "" ? "" : Number(mn.value); };
      x.onclick = () => { formGoals.splice(i, 1); renderGoalRows(); };
      box.append(row);
    });
  }
  $("stepGoalAdd").onclick = () => { const last = formGoals[formGoals.length - 1]; formGoals.push({ from: todayStr(), steps: last ? last.steps : "", min: last ? last.min : "" }); renderGoalRows(); };
  const cleanGoals = () => formGoals.filter((g) => /^\d{4}-\d{2}-\d{2}$/.test(g.from || "") && Number(g.steps) > 0).map((g) => ({ from: g.from, steps: Number(g.steps), ...(Number(g.min) > 0 && Number(g.min) < Number(g.steps) ? { min: Number(g.min) } : {}) })).sort((a, b) => a.from < b.from ? -1 : 1);
  // day types: formTypes (list) and formWeek (standard per weekday) live here until the profile is saved
  let formTypes = DAY_TYPES.map((t) => ({ ...t })), formWeek = DAY_WEEK.slice();
  function renderTypes() {
    const box = $("typeBox"); box.innerHTML = "";
    formTypes.forEach((t, i) => {
      const row = document.createElement("div"); row.className = "small"; row.style.cssText = "display:flex;gap:6px;align-items:center;margin-top:6px";
      row.innerHTML = `<input type="text" maxlength="30" value="${esc(t.name)}" aria-label="Name" style="flex:1"><span class="muted">${esc(t.id)}</span>${BUILTIN_TYPES.includes(t.id) ? "" : '<button type="button" class="x" aria-label="Zeile entfernen">×</button>'}`;
      const [nm, , x] = [row.querySelector("input"), 0, row.querySelector("button")];
      nm.oninput = () => { t.name = nm.value; renderTypeWeek(); };
      if (x) x.onclick = () => { formTypes.splice(i, 1); formWeek = formWeek.map((id, w) => id === t.id ? DAY_WEEK[w] : id); renderTypes(); renderFixed(); };
      box.append(row);
    });
    renderTypeWeek();
  }
  function renderTypeWeek() {
    const wk = $("typeWeek"); wk.innerHTML = "";
    WDL.forEach((nameDay, w) => {
      const lab = document.createElement("span"); lab.textContent = nameDay;
      const sel = document.createElement("select"); sel.setAttribute("aria-label", nameDay);
      sel.innerHTML = formTypes.map((t) => `<option value="${esc(t.id)}"${formWeek[w] === t.id ? " selected" : ""}>${esc(t.name || t.id)}</option>`).join("");
      sel.onchange = () => { formWeek[w] = sel.value; };
      wk.append(lab, sel);
    });
  }
  $("typeAdd").onclick = () => {
    let id = "T" + (formTypes.length + 1); while (formTypes.some((t) => t.id === id)) id += "x";
    formTypes.push({ id, name: "" }); renderTypes(); renderFixed();
  };
  const cleanTypes = () => formTypes.map((t) => ({ id: t.id, name: String(t.name || "").trim().slice(0, 30) })).filter((t) => t.name);
  // fixed daily entries: rows per day type live in formFixed until the profile is saved
  let formFixed = {};
  function renderFixed() {
    const box = $("fixedBox"); box.innerHTML = "";
    formTypes.forEach((t) => {
      const rows = formFixed[t.id] = formFixed[t.id] || [];
      const h = document.createElement("div"); h.className = "label"; h.textContent = t.name; h.style.marginTop = "10px"; box.append(h);
      rows.forEach((it, i) => {
        const row = document.createElement("div"); row.className = "small"; row.style.cssText = "display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap";
        row.innerHTML = `<input type="text" maxlength="40" value="${esc(it.label)}" placeholder="Bezeichnung" aria-label="Bezeichnung" style="width:130px"><input type="number" inputmode="decimal" min="0" step="0.5" value="${it.count ?? 1}" aria-label="Anzahl" style="width:60px"><span>×</span><input type="number" inputmode="decimal" min="0" step="5" value="${it.kcal ?? ""}" placeholder="kcal" aria-label="kcal je Stück" style="width:70px"><input type="number" inputmode="decimal" min="0" step="1" value="${it.protein ?? ""}" placeholder="g Eiweiß" aria-label="Eiweiß je Stück" style="width:80px"><button type="button" class="x" aria-label="Zeile entfernen">×</button>`;
        const [lb, ct, kc, pr, x] = row.querySelectorAll("input,button");
        lb.oninput = () => { it.label = lb.value; }; ct.oninput = () => { it.count = ct.value === "" ? "" : Number(ct.value); }; kc.oninput = () => { it.kcal = kc.value === "" ? "" : Number(kc.value); }; pr.oninput = () => { it.protein = pr.value === "" ? "" : Number(pr.value); };
        x.onclick = () => { rows.splice(i, 1); renderFixed(); };
        box.append(row);
      });
      const add = document.createElement("button"); add.type = "button"; add.className = "btn ghost"; add.textContent = "Eintrag hinzufügen"; add.style.marginTop = "6px";
      add.onclick = () => { rows.push({ id: uid(), label: "", count: 1, kcal: "", protein: "" }); renderFixed(); };
      box.append(add);
      const others = formTypes.filter((o) => o.id !== t.id && (formFixed[o.id] || []).length);
      if (others.length) {
        const cp = document.createElement("select"); cp.setAttribute("aria-label", "Von anderer Tagesart kopieren"); cp.style.cssText = "margin-left:6px;width:auto";
        cp.innerHTML = `<option value="">Kopieren von …</option>` + others.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join("");
        cp.onchange = () => { if (cp.value) { (formFixed[cp.value] || []).forEach((r) => rows.push({ ...r, id: uid() })); renderFixed(); } };
        box.append(cp);
      }
    });
  }
  const cleanFixed = () => {
    const byType = {};
    Object.entries(formFixed).forEach(([t, rows]) => {
      const out = rows.filter((r) => String(r.label || "").trim() && Number(r.count) > 0 && Number(r.kcal) >= 0 && r.kcal !== "").map((r) => ({ id: r.id, label: String(r.label).trim().slice(0, 40), count: Number(r.count), kcal: Number(r.kcal), protein: Number(r.protein) || 0 }));
      if (out.length) byType[t] = out;
    });
    return byType;
  };
  function readForm() {
    const p = {};
    for (const [id, k] of Object.entries(PF)) { const v = $(id).value.trim(); p[k] = NUMS.includes(k) ? (v === "" ? null : Number(v)) : v; }
    p.handrail = $("pRail").checked;
    p.autoSyncHourly = $("pAutoSync").checked;
    { const own = cleanTypes(), ids = new Set(DAY_TYPES.map((t) => t.id).concat(own.map((t) => t.id))); p.dayTypes = own; p.dayTypeWeek = formWeek.map((id, w) => ids.has(id) ? id : DAY_WEEK[w]); }
    { const words = (id) => [...new Set($(id).value.split(/\n|,/).map((x) => x.trim()).filter(Boolean))].slice(0, 60); p.pantryExtra = words("pPantryExtra"); p.pantryOff = words("pPantryOff"); const g = Number($("pEggG").value); p.eggWhiteG = $("pEggG").value.trim() !== "" && g >= 20 && g <= 50 ? g : null; }
    { const byType = cleanFixed(), cur = fixedConfig(); p.fixedMeals = JSON.stringify(byType) === JSON.stringify(cur.byType) ? { since: cur.since, byType } : { since: todayStr(), byType }; }
    p.stepGoals = cleanGoals(); p.stepFullDays = $("pFullDays").value.trim() === "" ? 5 : Math.max(0, Math.min(7, Math.round(Number($("pFullDays").value))));
    const num = (id, lo, hi) => { const v = Number($(id).value); return $(id).value.trim() !== "" && v >= lo && v <= hi ? v : null; };
    p.eventKcal = num("pEvent", 1500, 6000) ?? DEFAULTS.eventKcal; p.kcalPerKg = num("pKcalKg", 3000, 10000) ?? DEFAULTS.kcalPerKg; p.baseKcalManual = num("pBase", 1000, 4000);
    p.inclines = formInclines.slice(); p.inclinePct = S.inclinePct ?? 9; // inclinePct stays: older days are read with it
    return p;
  }
  // profile: the incline list as chips (0 % is fixed and not listed)
  let formInclines = [];
  function renderInclineChips() {
    $("pInclines").innerHTML = `<span class="chip on">0 %</span>` + formInclines.map((x) => `<button type="button" class="chip on" data-inc="${x}" title="Entfernen">${pctFmt(x)} ✕</button>`).join("");
    $("pInclines").querySelectorAll("button[data-inc]").forEach((b) => b.onclick = () => { formInclines = formInclines.filter((x) => x !== Number(b.dataset.inc)); renderInclineChips(); calcPreview(); });
  }
  $("pInclineAddBtn").onclick = () => {
    const v = Math.round(Number($("pInclineAdd").value) * 2) / 2;
    if (!(v > 0 && v <= 25)) return;
    formInclines = [...new Set([...formInclines, v])].sort((a, b) => a - b); $("pInclineAdd").value = ""; renderInclineChips(); calcPreview();
  };
  function calcPreview() {
    const p = readForm();
    if (!(p.startWeight && p.heightCm && p.age && p.speedKmh != null)) { $("pCalc").textContent = ""; return; }
    const rp = Math.max(0, ...p.inclines), f = deriveFactors({ ...p, inclinePct: rp });
    const day = (n) => Math.round((f.baseKcal + n * (rp ? f.inclineFactor : f.flatFactor)) / 10) * 10;
    let txt = `Grundbedarf ca. ${fmt(f.baseKcal)} kcal am Tag. Mit 10.000 Schritten bei ${pctFmt(rp)} ca. ${fmt(day(10000))} kcal.`;
    if (p.kcalTarget) txt += ` Bei ${fmt(p.kcalTarget)} kcal Aufnahme und 10.000 Schritten wären das etwa ${fmt((day(10000) - p.kcalTarget) * 7 / 7000, 1)} kg pro Woche.`;
    $("pCalc").textContent = txt;
  }
  Object.keys(PF).concat(["pRail"]).forEach((id) => $(id).addEventListener("input", calcPreview));
  function fillForm() {
    for (const [id, k] of Object.entries(PF)) if (document.activeElement !== $(id)) $(id).value = S[k] ?? (id === "pSpeed" ? 3.5 : id === "pWeighDay" ? 1 : id === "pStartD" ? todayStr() : "");
    $("pRail").checked = !!S.handrail;
    // while a settings field has the focus, a sync must not reset the rows being edited
    if (!$("view-einstellungen").contains(document.activeElement)) {
    $("pAutoSync").checked = S.autoSyncHourly !== false;
    $("pPantryExtra").value = (S.pantryExtra || []).join("\n"); $("pPantryOff").value = (S.pantryOff || []).join("\n"); $("pEggG").value = S.eggWhiteG ?? "";
    formTypes = dayTypes().map((t) => ({ ...t })); formWeek = (S.dayTypeWeek && S.dayTypeWeek.length === 7 ? S.dayTypeWeek : DAY_WEEK).slice(); renderTypes();
    formFixed = JSON.parse(JSON.stringify(fixedConfig().byType)); renderFixed();
    formGoals = (S.stepGoals || []).map((g) => ({ from: g.from, steps: g.steps, min: g.min ?? "" })); renderGoalRows(); $("pFullDays").value = S.stepFullDays != null && S.stepFullDays !== 5 ? S.stepFullDays : "";
    $("pEvent").value = S.eventKcal !== DEFAULTS.eventKcal ? S.eventKcal : ""; $("pKcalKg").value = S.kcalPerKg !== DEFAULTS.kcalPerKg ? S.kcalPerKg : ""; $("pBase").value = S.baseKcalManual ?? "";
    try { $("pBaseAuto").textContent = fmt(deriveFactors({ ...S, ...readForm() }).baseKcal); } catch (e) {}
    }
    formInclines = inclineList(); renderInclineChips();
    $("profilTitle").textContent = hasProfile ? "Dein Profil" : "Willkommen! Lege zuerst dein Profil an";
    calcPreview();
  }
  const pStat = (t, err) => { setStatus("pStatus", t, err); setStatus("pStatus2", t, err); };
  $("pSave2").onclick = () => $("profileForm").dispatchEvent(new Event("submit", { cancelable: true }));
  $("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!base) { pStat("Speicher nicht erreichbar.", true); return; }
    const p = readForm();
    if (p.goalWeight >= p.startWeight) { pStat("Das Zielgewicht muss unter dem Startgewicht liegen.", true); return; }
    if (p.goalDate <= p.startWeightDate) { pStat("Das Zieldatum muss nach dem Startdatum liegen.", true); return; }
    const startChanged = !hasProfile || p.startWeight !== S.startWeight || p.startWeightDate !== S.startWeightDate || p.goalWeight !== S.goalWeight || p.goalDate !== S.goalDate;
    const next = { ...S, ...p, ...deriveFactors(p), startDate: mondayOf(p.startWeightDate) };
    if (p.baseKcalManual) next.baseKcal = p.baseKcalManual; else delete next.baseKcalManual;
    if (startChanged) next.milestones = null; // custom milestones only kept while start and goal stay the same
    delete next.updatedAt;
    next.updatedAt = new Date().toISOString();
    $("pSave").disabled = true; $("pSave2").disabled = true;
    try {
      await base.set(next);
      if (!days[p.startWeightDate] || !days[p.startWeightDate].weight) saveDay(p.startWeightDate, (d) => { d.weight = p.startWeight; });
      pStat("Gespeichert.");
      if (!hasProfile) location.hash = "#heute";
    } catch (err) {
      if (err && err.code === "invalid_argument") $("roNotice").hidden = false;
      pStat("Speichern fehlgeschlagen (" + (err && err.code || "Fehler") + ").", true);
    } finally { $("pSave").disabled = false; $("pSave2").disabled = false; }
  });


