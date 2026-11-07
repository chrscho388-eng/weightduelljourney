  // ---- streaks: days in a row meeting a goal; today counts once met and never breaks the run ----
  function stepGoalFor(date) {
    const g = (S.stepGoals || []).filter((x) => x.from <= date).sort((a, b) => a.from < b.from ? -1 : 1).pop();
    return g ? { full: g.steps, min: g.min || g.steps } : null;
  }
  const stepsOf = (d) => Object.values(stepsMap(d)).reduce((a, n) => a + n, 0);
  const logged = (d) => (d.meals || []).some((m) => !m.auto && !m.pending);
  const STREAKS = [
    { key: "prot", label: "Eiweißziel", short: "Eiweiß", ok: (d) => protein(d) >= S.proteinTarget },
    { key: "kcal", label: "Im kcal-Ziel", short: "kcal", today: false, ok: (d) => logged(d) && (d.event || intake(d) <= S.kcalTarget) },
    { key: "steps", label: "Schrittziel", short: "Schritte", ok: (d, date) => { const g = stepGoalFor(date); return !!g && stepsOf(d) >= g.min; }, show: () => (S.stepGoals || []).length > 0 }
  ];
  function streak(st) {
    const today = todayStr();
    const okOn = (date) => { const d = days[date]; return !!(d && hasData(d) && st.ok(d, date)); };
    let cur = 0, dt = today;
    if (st.today === false || !okOn(dt)) dt = addDays(dt, -1);
    while (okOn(dt)) { cur++; dt = addDays(dt, -1); }
    let best = 0, run = 0;
    const first = Object.keys(days).sort()[0];
    if (first) for (let x = first; x < today; x = addDays(x, 1)) { if (okOn(x)) { run++; if (run > best) best = run; } else run = 0; }
    return { cur, best: Math.max(best, cur) };
  }
  const tage = (n) => n === 1 ? "1 Tag" : fmt(n) + " Tage";
  function streakLine() {
    const parts = STREAKS.filter((s) => !s.show || s.show()).map((s) => { const r = streak(s); return r.cur ? `${s.short} <b class="num">${tage(r.cur)}</b>` : ""; }).filter(Boolean);
    return parts.length ? "Serien: " + parts.join(" · ") : "";
  }

