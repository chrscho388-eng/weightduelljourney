  // ---- weekly review: preview on the week's last day (without it), complete from the next weigh day on ----
  function weekReview(mon) {
    const today = todayStr(), sun = addDays(mon, 6);
    if (today < sun) return null;
    const pre = today === sun, last = pre ? 5 : 6;
    const ds = []; for (let i = 0; i <= last; i++) { const x = addDays(mon, i), d = dayDoc(x); if (hasData(d)) ds.push({ x, d }); }
    if (!ds.length) return null;
    const n = ds.length, avg = (f) => ds.reduce((a, o) => a + f(o), 0) / n;
    const r = { pre, mon, sun, n, kin: avg((o) => intake(o.d)), pr: avg((o) => protein(o.d)), steps: avg((o) => stepsOf(o.d)),
      goalSteps: avgOf(ds.map((o) => stepAvgGoal(o.x))), sum: ds.reduce((a, o) => a + intake(o.d) - burn(o.d), 0),
      inKcal: ds.filter((o) => intake(o.d) <= (o.d.event ? S.eventKcal : S.kcalTarget)).length,
      protOk: ds.filter((o) => protein(o.d) >= S.proteinTarget).length,
      stepOk: ds.filter((o) => { const g = stepGoalFor(o.x); return g && stepsOf(o.d) >= g.full; }).length };
    if (pre && !logged(dayDoc(sun))) r.withSun = r.sum + sollBal(sun).bal;
    const st = weekStats(mon); r.wStart = st.wStart; r.wEnd = st.wEnd;
    // pace over the last two weeks of weigh-ins, for the adjustment rules
    const ws = weighIns().filter((w) => w.date <= addDays(mon, 7));
    const w2 = ws.filter((w) => w.date >= addDays(ws.length ? ws[ws.length - 1].date : today, -14));
    if (w2.length >= 2 && w2[w2.length - 1].date > w2[0].date) r.pace = (w2[0].weight - w2[w2.length - 1].weight) / ((toUTC(w2[w2.length - 1].date) - toUTC(w2[0].date)) / (7 * 864e5));
    r.lastW = ws.length ? ws[ws.length - 1] : { date: S.startWeightDate, weight: S.startWeight };
    r.ms = milestones().find((m) => m.date >= today && m.kg < r.lastW.weight) || null;
    r.f = forecast();
    return r;
  }
  function renderReview() {
    const r = weekReview(curWeek), wrap = $("weekReviewWrap");
    wrap.hidden = !r; if (!r) return;
    $("weekReviewHead").textContent = r.pre ? "Wochenrückblick (Vorabinfo)" : "Wochenrückblick";
    const k = (v) => `<b class="k">${v}</b>`, tg = (c) => `${c} von ${r.n}`;
    const exp = r.sum / S.kcalPerKg, expSun = r.withSun != null ? r.withSun / S.kcalPerKg : null;
    const wdN = WDL[S.weighDay ?? 1], lastN = WDL[(weekday(r.mon) + 6) % 7];
    let h = `<p>${r.pre ? `${WDL[weekday(r.mon)]} bis ${WDL[(weekday(r.mon) + 5) % 7]}, der ${lastN} läuft noch. Komplett ab ${wdN}.` : `${r.n} von 7 Tagen erfasst.`}</p>`;
    h += `<p><b>Ernährung:</b> im Schnitt ${k(fmt(r5(r.kin)) + " kcal")} und ${k(fmt(Math.round(r.pr)) + " g")} Eiweiß. Im Kalorienrahmen an ${tg(r.inKcal)} Tagen, Eiweißziel ${fmt(S.proteinTarget)} g an ${tg(r.protOk)}.</p>`;
    if (r.goalSteps) h += `<p><b>Bewegung:</b> im Schnitt ${k(fmt(Math.round(r.steps / 100) * 100))} Schritte (Ziel ${fmt(Math.round(r.goalSteps / 100) * 100)}), volles Schrittziel an ${tg(r.stepOk)} Tagen.</p>`;
    h += `<p><b>Bilanz:</b> ${k(signed(r5(r.sum)) + " kcal")}, das sind etwa ${k(signedKg(exp))}${expSun != null ? `. Mit dem ${lastN} nach Plan rund ${signedKg(expSun)}` : ""}.</p>`;
    const tue = addDays(r.mon, 7), wdS = WD[S.weighDay ?? 1];
    if (r.wStart && r.wEnd) { const act = r.wEnd - r.wStart; h += `<p><b>Gewicht (${wdS} → ${wdS}):</b> ${fmtW(r.wStart)} → ${fmtW(r.wEnd)} kg, also ${k(signedKg(act))} gegenüber ${signedKg(exp)} erwartet${Math.abs(act - exp) >= 0.5 ? " – einzelne Wiegungen schwanken stark (Wasser), aussagekräftig ist der Trend über zwei Wochen" : ""}.</p>`; }
    else h += `<p><b>Gewicht:</b> Vergleich nach dem Wiegen am ${wdS} ${dm(tue)}${r.wStart ? ` (Start ${fmtW(r.wStart)} kg)` : ""}.</p>`;
    if (r.ms) h += `<p><b>Zwischenziel:</b> ${fmt(r.ms.kg, 1)} kg bis ${dm(r.ms.date)}, noch ${k(fmt(r.lastW.weight - r.ms.kg, 1) + " kg")}.</p>`;
    if (r.f.eta) { const wk = Math.round((toUTC(S.goalDate) - toUTC(r.f.eta)) / (7 * 864e5)); h += `<p><b>Prognose:</b> ${fmt(S.goalWeight, 1)} kg etwa am ${k(dm(r.f.eta) + r.f.eta.slice(0, 4))}${wk > 0 ? `, ${wk} ${wk === 1 ? "Woche" : "Wochen"} vor der Deadline` : wk < 0 ? `, ${-wk} ${wk === -1 ? "Woche" : "Wochen"} nach der Deadline` : ""}.</p>`; }
    let rec;
    if (r.pace == null || weekNo(r.mon) < 2) rec = "Weiter so. Angepasst wird frühestens mit zwei Wochen Wiegedaten.";
    else if (r.pace < 0.5) rec = `Nur ${fmt(r.pace, 1)} kg pro Woche: zuerst Einträge und Schritte prüfen, bleibt es so, das Kalorienziel um 150 kcal senken.`;
    else if (r.pace <= 1.2) rec = `${fmt(r.pace, 1)} kg pro Woche liegen im Zielbereich – alles so lassen.`;
    else rec = `${fmt(r.pace, 1)} kg pro Woche sind schnell. Fühlst du dich gut, passt das; bei Müdigkeit oder Hunger das Ziel auf 2.200 kcal anheben.`;
    // Claude's own analysis of the week, stored on the week's first day (synced like any day)
    const ai = dayDoc(r.mon).review, asked = dayDoc(r.mon).reviewRequested;
    if (ai && (ai.summary || (ai.tips || []).length)) h += aiReviewHtml(ai);
    else h += `<p><b>Empfehlung:</b> ${rec}</p>`;
    const canNow = directNow(), canAsk = requestMode();
    if (canNow || canAsk) h += `<div class="btnrow"><button class="btn${ai ? " ghost" : ""}" type="button" id="reviewAiBtn"${asked && !canNow ? " disabled" : ""}>${ai ? "Neu analysieren" : "Von Claude analysieren lassen"}</button></div>`;
    h += `<div class="status" id="reviewAiStatus">${asked && !canNow ? "Angefragt. Claude analysiert die Woche beim nächsten Abgleich." : ""}</div>`;
    $("weekReview").innerHTML = h;
    const b = $("reviewAiBtn"); if (b) b.onclick = () => runReviewAi(r);
  }
  function aiReviewHtml(ai) {
    const li = (a) => (a || []).filter(Boolean).map((x) => `<li>${esc(String(x))}</li>`).join("");
    let h = `<div class="aireview"><p><b>Claudes Analyse</b>${ai.at ? ` <span class="small muted">vom ${dm(ai.at.slice(0, 10))}</span>` : ""}</p>`;
    if (ai.summary) h += `<p>${esc(String(ai.summary))}</p>`;
    if ((ai.good || []).length) h += `<p><b>Lief gut</b></p><ul>${li(ai.good)}</ul>`;
    if ((ai.notice || []).length) h += `<p><b>Fällt auf</b></p><ul>${li(ai.notice)}</ul>`;
    if ((ai.tips || []).length) h += `<p><b>Für nächste Woche</b></p><ul>${li(ai.tips)}</ul>`;
    return h + "</div>";
  }
  // everything Claude needs about the week, as compact text
  function reviewData(r) {
    const line = (x) => { const d = dayDoc(x); if (!hasData(d)) return `${WD[weekday(x)]} ${dm(x)}: keine Einträge`;
      const meals = (d.meals || []).map((m) => `${m.label} (${Math.round(m.kcal || 0)} kcal, ${Math.round(m.protein || 0)} g)`).join("; ");
      return `${WD[weekday(x)]} ${dm(x)}${d.dayType ? " [" + typeName(d.dayType) + "]" : ""}${d.event ? " [Event-Tag]" : ""}${d.weight ? " Gewicht " + d.weight + " kg" : ""}: Aufnahme ${intake(d)} kcal, Eiweiß ${protein(d)} g, Verbrauch ${burn(d)} kcal, Bilanz ${intake(d) - burn(d)} kcal, Schritte ${stepsTxt(d).replace(/<[^>]+>/g, "")}. Essen: ${meals || "–"}`; };
    const week = (m) => { const out = []; for (let i = 0; i < 7; i++) out.push(line(addDays(m, i))); return out.join("\n"); };
    const prev = weekStats(addDays(r.mon, -7));
    const notes = [r.mon, addDays(r.mon, 6)].map((x) => (S.planNotes || {})[mondayOf(x)]).filter(Boolean);
    return `Ziele: ${S.kcalTarget} kcal pro Tag (Event-Tag ${S.eventKcal} kcal), Eiweiß mindestens ${S.proteinTarget} g${Number(S.proteinOptimum) > S.proteinTarget ? `, optimal ${S.proteinOptimum} g` : ""}, Zielgewicht ${S.goalWeight} kg bis ${S.goalDate}, ${S.kcalPerKg} kcal je kg.
Startgewicht ${S.startWeight} kg am ${S.startWeightDate}. Gewogen zu Wochenbeginn ${r.wStart || "–"} kg, zum nächsten Wiegetag ${r.wEnd || "noch offen"} kg. Tempo der letzten zwei Wochen: ${r.pace != null ? (Math.round(r.pace * 100) / 100) + " kg pro Woche" : "noch zu wenig Daten"}.
${r.ms ? `Nächstes Zwischenziel: ${r.ms.kg} kg bis ${r.ms.date}.` : ""}${r.f && r.f.eta ? ` Prognose Zielgewicht: ${r.f.eta}.` : ""}
Woche ${weekNo(r.mon)} (${dm(r.mon)}–${dm(r.sun)})${r.pre ? ", der letzte Tag läuft noch" : ""}:
${week(r.mon)}
Vorwoche: ${prev.n ? `${prev.n} Tage, Schnitt Aufnahme ${Math.round(prev.avg.kin)} kcal, Eiweiß ${Math.round(prev.avg.pr)} g, Bilanz Summe ${Math.round(prev.sum)} kcal` : "keine Daten"}.
${notes.length ? "Hinweise der Person zur Woche: " + notes.join(" | ") + "\n" : ""}${ruleList().length ? "Dauerhafte Wünsche: " + ruleList().join(" | ") + "\n" : ""}`;
  }
  function reviewPrompt(r) {
    return `Du bist Ernährungs- und Abnehm-Coach für eine Person, die mit dieser App gezielt abnimmt. Werte die folgende Woche aus. Sprich die Person mit „du“ an, auf Deutsch, freundlich, ehrlich und konkret, ohne Floskeln.
Achte auf Muster: Wochentage oder Tagesarten mit hoher Aufnahme, Eiweiß unter Ziel, Snacks, Alkohol, Event-Tage, Schritte gegenüber Ziel, erwartete gegenüber gewogener Veränderung (Wasserschwankungen bei einzelnen Wiegungen sind normal). Nenne Zahlen, wenn sie die Aussage tragen. Keine medizinischen Ratschläge, kein Krafttraining vorschlagen.
${reviewData(r)}
Antworte NUR mit JSON: {"summary": "2–3 Sätze Gesamteinschätzung", "good": ["1–3 Punkte, was gut lief"], "notice": ["1–3 Auffälligkeiten mit Zahlen"], "tips": ["2–3 konkrete, umsetzbare Tipps für die nächste Woche"]}`;
  }
  const cleanReview = (x) => { const arr = (a) => (Array.isArray(a) ? a : []).map((s) => String(s).slice(0, 400)).filter(Boolean).slice(0, 4);
    return { summary: String((x && x.summary) || "").slice(0, 800), good: arr(x && x.good), notice: arr(x && x.notice), tips: arr(x && x.tips) }; };
  async function runReviewAi(r) {
    const b = $("reviewAiBtn");
    if (!directNow()) { // no direct Claude: ask at the next sync
      saveDay(r.mon, (d) => { d.reviewRequested = true; });
      renderReview(); setStatus("reviewAiStatus", "Angefragt. Claude analysiert die Woche beim nächsten Abgleich."); return;
    }
    if (b) b.disabled = true; setStatus("reviewAiStatus", "Claude analysiert die Woche …");
    try {
      const res = cleanReview(await sample.json(reviewPrompt(r), { modelTier: "default" }));
      if (!res.summary && !res.tips.length) throw { code: "empty" };
      saveDay(r.mon, (d) => { d.review = { ...res, at: new Date().toISOString() }; delete d.reviewRequested; });
      renderReview();
    } catch (e) {
      setStatus("reviewAiStatus", "Die Analyse hat nicht geklappt. " + aiErr(e), true);
      if (b) b.disabled = false;
    }
  }
  $("prevWeek").onclick = () => { closePickers(); curWeek = addDays(curWeek, -7); renderWeek(); };
  $("nextWeek").onclick = () => { closePickers(); curWeek = addDays(curWeek, 7); renderWeek(); };

