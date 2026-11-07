  // ---- plan adjust via Claude ----
  let pendingPlan = null, lastPlan = null;
  function cleanPlan(raw, mon) {
    const inWeek = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= mon && d <= addDays(mon, 6);
    // keep recipes of dishes that stay in the plan
    const known = {}; const prev = plans[mon];
    if (prev) [...(prev.days || []).flatMap((d) => d.meals || []), ...(prev.swaps || [])].forEach((m) => { if (m.recipe) known[m.name] = m.recipe; });
    const meal = (m) => {
      const name = String(m.name || "").slice(0, 120);
      return { slot: String(m.slot || "").slice(0, 40), name, detail: String(m.detail || "").slice(0, 400), kcal: Math.round(Number(m.kcal) || 0), protein: Math.round(Number(m.protein) || 0), cook: m.cook === true, ...(known[name] ? { recipe: known[name] } : {}) };
    };
    const days = (Array.isArray(raw && raw.days) ? raw.days : []).filter((d) => d && inWeek(d.date))
      .map((d) => ({ date: d.date, ...(d.type ? { type: String(d.type).slice(0, 20) } : {}), ...(d.info ? { info: String(d.info).slice(0, 300) } : {}), meals: (Array.isArray(d.meals) ? d.meals : []).filter((m) => m && m.name).map(meal) }))
      .sort((a, b) => a.date < b.date ? -1 : 1);
    const swaps = (Array.isArray(raw && raw.swaps) ? raw.swaps : []).filter((m) => m && m.name).map(meal);
    return { ...(raw && raw.note ? { note: String(raw.note).slice(0, 500) } : {}), days, swaps };
  }
  function planPrompt(wish, mon, current) {
    const today = todayStr();
    const eaten = [];
    for (let i = 0; i < 7; i++) { const d = addDays(mon, i); if (d > today) break; const doc = days[d]; if (doc && (doc.meals || []).length) eaten.push(`${WDL[weekday(d)]} ${d}: ` + doc.meals.map((m) => `${m.label} (${m.kcal} kcal, ${m.protein} g)`).join("; ") + (doc.event ? " [Event-Tag]" : "")); }
    const types = []; for (let i = 0; i < 7; i++) { const d = addDays(mon, i), doc = days[d]; if (doc && (doc.dayType || doc.event)) types.push(`${WDL[weekday(d)]} ${d}: ${[doc.dayType, doc.event ? "Event-Tag" : ""].filter(Boolean).join(", ")}`); }
    const notes = (S.planNotes || {})[mon];
    const fixedTxt = Object.entries(fixedConfig().byType || {}).map(([t, items]) => `${t}: ` + items.map(fixedMealOf).map((m) => `${m.label} (${m.kcal} kcal, ${m.protein} g Eiweiß)`).join(", ")).join("\n");
    return `Du passt den Wochen-Mahlzeitenplan einer Person an, die abnehmen will.
${notes ? "Hinweise der Person für diese Woche (Tagesarten, Termine, Essen auswärts):\n" + String(notes).slice(0, 800) + "\n" : ""}${types.length ? "Tagesarten laut Log (" + dayTypes().map((t) => t.id + " = " + t.name).join(", ") + "):\n" + types.join("\n") : ""}
Heute ist ${WDL[weekday(today)]}, ${today}. Die Woche geht von ${mon} (Montag) bis ${addDays(mon, 6)} (Sonntag).
${fixedTxt ? "Feste Einträge, die die App je Tagesart jeden Tag selbst einträgt (nicht in den Plan schreiben, aber beim Tagesziel mitrechnen):\n" + fixedTxt + "\n" : ""}Tagesziel: ${S.kcalTarget} kcal und mindestens ${S.proteinTarget} g Eiweiß${Number(S.proteinOptimum) > S.proteinTarget ? `, ideal ${S.proteinOptimum} g` : ""}. Event-Tage sind beim Kalorienziel frei.
${S.estimateHints ? "Hinweise und Vorlieben der Person:\n" + S.estimateHints.slice(0, 1500) + "\n" : ""}${S.planRules ? "DAUERHAFTE WÜNSCHE der Person (haben Vorrang vor allen Hinweisen oben):\n" + String(S.planRules).slice(0, 1500) + "\n" : ""}${S.canteenHabits ? "Was die Person in der Kantine (Bürotage, mittags) meistens isst:\n" + String(S.canteenHabits).slice(0, 1000) + "\n" : ""}${eaten.length ? "Diese Woche schon gegessen (laut Log):\n" + eaten.join("\n") + "\n" : ""}
Aktueller Plan als JSON:
${current ? JSON.stringify(current) : "(noch kein Plan, erstelle einen für die ganze Woche)"}

Wunsch der Person: ${wish}

Regeln:
- Ändere nur, was der Wunsch betrifft, und gleiche danach den Rest so aus, dass die Ziele möglichst gehalten werden. Eiweiß hat Vorrang.
- Tage vor heute nicht ändern.
- Jede Mahlzeit mit slot (z. B. Frühstück, Mittag, Abend, Nachtisch), name, detail (Zutaten mit Gramm roh, Eier in Stück, Eiklar nie einzeln, Zitrusfrüchte nur als Frucht; Vorrat oder Reste in Klammern als "(Vorrat)" bzw. "(Rest von …)"), kcal und protein als je EIN Mittelwert, nie Spannen.
- cook: true nur für Gerichte, die man selbst kocht oder zubereitet und für die ein Rezept sinnvoll ist; false für Fertiges, Kantine, Lieferdienst, auswärts, Shakes, Skyr, Joghurt-Frühstück und Ähnliches.
- Bei auswärts essen: eine realistische Schätzung als Mahlzeit, im detail kurze Tipps für eine gute Wahl.
- type pro Tag optional (eines von ${dayTypes().map((t) => t.id).join(", ")} oder Event), info pro Tag optional für einen kurzen Hinweis.
- Gib immer den kompletten Plan der Woche zurück, auch unveränderte Tage.

Antworte nur mit JSON in genau dieser Form, ohne weiteren Text:
{"summary":"1 bis 3 Sätze auf Deutsch, was du geändert hast und warum","plan":{"note":"…","days":[{"date":"JJJJ-MM-TT","type":"…","info":"…","meals":[{"slot":"…","name":"…","detail":"…","kcal":0,"protein":0,"cook":true}]}],"swaps":[{"name":"…","detail":"…","kcal":0,"protein":0,"cook":true}]}}`;
  }
  $("planPrompt").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); const b = !$("planAdjustBtn").hidden ? $("planAdjustBtn") : $("planLaterBtn"); if (!b.hidden) b.click(); } });
  $("planAdjustBtn").onclick = async () => {
    const wish = $("planPrompt").value.trim();
    if (!wish) { setStatus("planStatus", "Beschreib zuerst, was sich ändern soll.", true); return; }
    if (!sample) return;
    const mon = curPlan;
    $("planAdjustBtn").disabled = true; setStatus("planStatus", "Claude passt den Plan an …");
    try {
      const res = await sample.json(planPrompt(wish, mon, plans[mon] || null), { modelTier: "default" });
      const plan = cleanPlan(res && res.plan, mon);
      if (!plan.days.length) throw { code: "empty" };
      pendingPlan = { week: mon, plan, wish };
      if ($("planPrompt").value.trim() === wish) $("planPrompt").value = "";
      $("planSummary").textContent = (res.summary ? String(res.summary).slice(0, 600) : "Vorschlag erstellt.");
      setStatus("planStatus", ""); curPlan = mon; renderPlan();
    } catch (e) {
      const c = e && e.code;
      setStatus("planStatus", c === "not_granted" ? "Claude-Nutzung wurde nicht erlaubt." : c === "rate_limited" ? "Gerade zu viele Anfragen. Versuch es in einer Minute erneut." : c === "bad_key" ? "Der API-Schlüssel wurde abgelehnt. Prüfe ihn im Tab Profil." : "Das hat nicht geklappt. Formuliere den Wunsch etwas genauer und versuch es noch einmal.", true);
    } finally { $("planAdjustBtn").disabled = false; }
  };
  // without a key: store the wish on the plan, Claude rewrites the plan at the next sync
  // standing wishes for every plan (profile.planRules, one per line); optionally queue a rewrite of plans from this week on
  const ruleList = () => String(S.planRules || "").split("\n").map((x) => x.trim()).filter(Boolean);
  function renderRules() {
    const ul = $("rulesList"), rules = ruleList(); ul.innerHTML = "";
    if (!rules.length) { ul.innerHTML = `<li class="none">Noch keine. Es gilt das Standardmuster aus dem Profil.</li>`; return; }
    rules.forEach((r, i) => {
      const li = document.createElement("li"), t = document.createElement("span"), x = document.createElement("button");
      t.textContent = r; x.className = "x"; x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Wunsch entfernen: " + r);
      x.onclick = () => changeRules(rules.filter((_, j) => j !== i), "Diesen dauerhaften Wunsch nicht mehr anwenden: " + r);
      li.append(t, x); ul.append(li);
    });
  }
  async function changeRules(list, wish) {
    if (!base) { setStatus("planRulesStatus", "Speicher nicht erreichbar.", true); return false; }
    $("planRulesSave").disabled = true;
    try {
      if (!(await saveProfile({ planRules: list.join("\n").slice(0, 1500) }))) throw new Error("save");
      let n = 0;
      if ($("rulesApply").checked && requestMode()) {
        const mon = mondayOf(todayStr());
        for (const [week, p] of Object.entries(plans)) {
          if (week < mon || p.deleted || !((p.days || []).length)) continue;
          const w = wish + " (ab heute, vergangene Tage nicht ändern)";
          const next = { ...JSON.parse(JSON.stringify(p)), planChange: (p.planChange ? p.planChange + " | " : "") + w, updatedAt: new Date().toISOString() };
          await base.collection("plans").doc(week).set(next); plans[week] = next; n++;
        }
        $("rulesApply").checked = false;
      }
      setStatus("planRulesStatus", "Gespeichert. Gilt ab dem nächsten Plan." + (n ? ` ${n === 1 ? "Ein bestehender Plan wird" : n + " bestehende Pläne werden"} beim nächsten Abgleich angepasst.` : ""));
      renderPlan(); return true;
    } catch (e) { setStatus("planRulesStatus", "Speichern fehlgeschlagen.", true); return false; }
    finally { $("planRulesSave").disabled = false; }
  }
  $("planRulesSave").onclick = async () => {
    const r = $("planRuleNew").value.trim();
    if (!r) { setStatus("planRulesStatus", "Schreib zuerst einen Wunsch ins Feld.", true); return; }
    if (await changeRules([...ruleList(), r], "Neuer dauerhafter Wunsch: " + r)) $("planRuleNew").value = "";
  };
  $("planRuleNew").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("planRulesSave").click(); } };
  $("planLaterBtn").onclick = async () => {
    const wish = $("planPrompt").value.trim();
    if (!wish) { setStatus("planStatus", "Beschreib zuerst, was sich ändern soll.", true); return; }
    if (!base) { setStatus("planStatus", "Speicher nicht erreichbar.", true); return; }
    const week = curPlan, cur = plans[week] && !plans[week].deleted ? plans[week] : { days: [], swaps: [] };
    // several wishes before the next sync: append, never replace an open one
    const next = { ...JSON.parse(JSON.stringify(cur)), planChange: (cur.planChange ? cur.planChange + " | " : "") + wish.slice(0, 800), updatedAt: new Date().toISOString() };
    $("planLaterBtn").disabled = true;
    try {
      await base.collection("plans").doc(week).set(next); plans[week] = next;
      const n = next.planChange.split(" | ").length;
      $("planPrompt").value = ""; setStatus("planStatus", n > 1 ? `An Claude geschickt. ${n} Wünsche warten jetzt gemeinsam auf den nächsten Abgleich.` : "An Claude geschickt. Der angepasste Plan kommt beim nächsten Abgleich."); renderPlan();
    } catch (e) { setStatus("planStatus", "Speichern fehlgeschlagen.", true); }
    finally { $("planLaterBtn").disabled = false; }
  };
