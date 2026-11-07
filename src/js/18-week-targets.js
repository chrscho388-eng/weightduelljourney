  // ---- week targets: what today needs so the running week average meets the goals ----
  // average step goal per day (e.g. 18,000 on 5 days and 13,000 on 2 → 16,571)
  function stepAvgGoal(date) { const g = stepGoalFor(date), fd = Math.max(0, Math.min(7, S.stepFullDays ?? 5)); return g ? (g.min < g.full ? (fd * g.full + (7 - fd) * g.min) / 7 : g.full) : 0; }
  // planned balance of a day: kcal target minus the burn at exactly the step goal (flat steps as logged up to the goal, rest with incline);
  // extra steps beyond the goal never raise the target, they show up in the actual balance
  function sollBal(date) {
    const d = dayDoc(date), goal = stepAvgGoal(date), f = Math.min(stepsMap(d)[0] || 0, goal), rest = restIncline();
    const out = burn({ steps: rest ? { 0: f, [rest]: goal - f } : { 0: goal } });
    return { bal: (d.event ? S.eventKcal : S.kcalTarget) - out, out };
  }
  function weekTargets(date) {
    const mon = wkStart(date), n = wkPos(date) + 1, d = dayDoc(date), today = stepsOf(d);
    const r = { n, left: 7 - n + 1 };
    // steps: every day of the week so far counts, days without steps as 0
    let goalSum = 0, before = 0, weekGoal = 0;
    for (let k = 0; k < 7; k++) { const x = addDays(mon, k), g = stepAvgGoal(x); weekGoal += g; if (k < n) goalSum += g; if (k < n - 1) before += stepsOf(dayDoc(x)); }
    if (weekGoal > 0) {
      r.steps = { today, before, avg: n > 1 ? before / (n - 1) : null, goalAvg: goalSum / n,
        need: Math.max(0, Math.round(goalSum - before)), spread: Math.max(0, Math.round((weekGoal - before) / r.left / 10) * 10) };
      r.steps.rest = Math.max(0, r.steps.need - today);
    }
    // calories: only earlier days with entries count, plus today
    let sollSum = 0, istSum = 0, cnt = 0;
    for (let k = 0; k < n - 1; k++) { const x = addDays(mon, k), dx = dayDoc(x); if (!hasData(dx)) continue; cnt++; sollSum += sollBal(x).bal; istSum += intake(dx) - burn(dx); }
    const st = sollBal(date);
    sollSum += st.bal;
    r.kcal = { soll: sollSum / (cnt + 1), ist: cnt ? istSum / cnt : null, days: cnt,
      need: sollSum - istSum, outToday: Math.max(burn(d), st.out), inToday: intake(d), balToday: intake(d) - burn(d) };
    r.kcal.eatLeft = r.kcal.need + r.kcal.outToday - r.kcal.inToday;
    // deficit the deadline needs from the latest weight
    const ws = Object.values(days).filter((x) => x.weight && x.date <= date).sort((a, b) => a.date < b.date ? -1 : 1);
    const w = ws.length ? ws[ws.length - 1].weight : S.startWeight;
    const dl = Math.round((toUTC(S.goalDate) - toUTC(date)) / 864e5);
    if (w > S.goalWeight && dl > 0) r.deadline = (w - S.goalWeight) * (S.kcalPerKg || 7000) / dl;
    return r;
  }
  const defTxt = (bal) => { const v = Math.round(Math.abs(bal) / 10) * 10; return bal <= 0 ? `${fmt(v)} Defizit` : `${fmt(v)} Überschuss`; };
  function renderWeekGoal() {
    const box = $("weekGoal");
    if (!hasProfile || curDay > todayStr()) { box.hidden = true; return; }
    const t = weekTargets(curDay), today = curDay === todayStr();
    let h = "";
    if (t.steps) {
      const s = t.steps;
      h += `<h3>Schritte für den Wochenschnitt</h3><div class="balance-row">` +
        `<span>Heute nötig (Schnitt ${fmt(Math.round(s.goalAvg / 100) * 100)})</span><b>${fmt(s.need)}</b>` +
        `<span>${today ? "Davon noch offen" : "Offen geblieben"}</span><b class="${s.rest > 0 ? "pos" : "neg"}">${s.rest > 0 ? fmt(s.rest) : "erreicht"}</b>` +
        (s.avg != null ? `<span>Schnitt bisher (${t.n - 1} ${t.n - 1 === 1 ? "Tag" : "Tage"})</span><b>${fmt(Math.round(s.avg))}</b>` : "") +
        (t.left > 1 ? `<span>Verteilt auf ${t.left} Resttage</span><b>${fmt(s.spread)} / Tag</b>` : "") + `</div>`;
    }
    const k = t.kcal;
    h += `<h3>Defizit für den Wochenschnitt</h3><div class="balance-row">` +
      `<span>Soll pro Tag</span><b class="neg">${defTxt(k.soll)}</b>` +
      (k.ist != null ? `<span>Ist-Schnitt bis gestern (${k.days} ${k.days === 1 ? "Tag" : "Tage"})</span><b class="${k.ist > k.soll ? "pos" : "neg"}">${defTxt(k.ist)}</b>` : "") +
      `<span>Heute nötig</span><b>${defTxt(k.need)}</b>` +
      `<span>Heute bisher</span><b class="${k.balToday > k.need ? "pos" : "neg"}">${defTxt(k.balToday)}</b>` +
      (today ? `<span>Puffer zum Wochen-Soll</span><b class="${k.eatLeft < 0 ? "pos" : ""}">${k.eatLeft < 0 ? "schon " + fmt(Math.round(-k.eatLeft / 10) * 10) + " drüber" : fmt(Math.round(k.eatLeft / 10) * 10) + " kcal"}</b>` : "") + `</div>`;
    h += `<p class="small muted" style="margin:6px 0 0">Alles in kcal. Soll = ${fmt(S.kcalTarget)} kcal essen und genau das Schrittziel gehen. Heute nötig = Soll × ${t.n} Tage minus das Defizit ${k.days === 1 ? "des Vortags" : "der Vortage"}, damit der Schnitt inklusive heute auf Soll kommt.${today ? " Puffer = heute bisher minus heute nötig (Verbrauch mindestens wie beim Schrittziel)." : ""} ${t.deadline ? `Für ${fmt(S.goalWeight, 1)} kg bis ${dm(S.goalDate)}${S.goalDate.slice(0, 4)} reichen im Schnitt ${fmt(Math.round(t.deadline / 10) * 10)} kcal Defizit pro Tag.` : ""}</p>`;
    box.innerHTML = h; box.hidden = false;
  }

