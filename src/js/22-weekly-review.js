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
    if (r.wStart && r.wEnd) { const act = r.wEnd - r.wStart; h += `<p><b>Gewicht (${wdS} → ${wdS}):</b> ${fmt(r.wStart, 1)} → ${fmt(r.wEnd, 1)} kg, also ${k(signedKg(act))} gegenüber ${signedKg(exp)} erwartet${Math.abs(act - exp) >= 0.5 ? " – einzelne Wiegungen schwanken stark (Wasser), aussagekräftig ist der Trend über zwei Wochen" : ""}.</p>`; }
    else h += `<p><b>Gewicht:</b> Vergleich nach dem Wiegen am ${wdS} ${dm(tue)}${r.wStart ? ` (Start ${fmt(r.wStart, 1)} kg)` : ""}.</p>`;
    if (r.ms) h += `<p><b>Zwischenziel:</b> ${fmt(r.ms.kg, 1)} kg bis ${dm(r.ms.date)}, noch ${k(fmt(r.lastW.weight - r.ms.kg, 1) + " kg")}.</p>`;
    if (r.f.eta) { const wk = Math.round((toUTC(S.goalDate) - toUTC(r.f.eta)) / (7 * 864e5)); h += `<p><b>Prognose:</b> ${fmt(S.goalWeight, 1)} kg etwa am ${k(dm(r.f.eta) + r.f.eta.slice(0, 4))}${wk > 0 ? `, ${wk} ${wk === 1 ? "Woche" : "Wochen"} vor der Deadline` : wk < 0 ? `, ${-wk} ${wk === -1 ? "Woche" : "Wochen"} nach der Deadline` : ""}.</p>`; }
    let rec;
    if (r.pace == null || weekNo(r.mon) < 2) rec = "Weiter so. Angepasst wird frühestens mit zwei Wochen Wiegedaten.";
    else if (r.pace < 0.5) rec = `Nur ${fmt(r.pace, 1)} kg pro Woche: zuerst Einträge und Schritte prüfen, bleibt es so, das Kalorienziel um 150 kcal senken.`;
    else if (r.pace <= 1.2) rec = `${fmt(r.pace, 1)} kg pro Woche liegen im Zielbereich – alles so lassen.`;
    else rec = `${fmt(r.pace, 1)} kg pro Woche sind schnell. Fühlst du dich gut, passt das; bei Müdigkeit oder Hunger das Ziel auf 2.200 kcal anheben.`;
    h += `<p><b>Empfehlung:</b> ${rec}</p>`;
    $("weekReview").innerHTML = h;
  }
  $("prevWeek").onclick = () => { closePickers(); curWeek = addDays(curWeek, -7); renderWeek(); };
  $("nextWeek").onclick = () => { closePickers(); curWeek = addDays(curWeek, 7); renderWeek(); };

