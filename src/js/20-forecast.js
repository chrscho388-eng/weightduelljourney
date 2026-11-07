  // ---- forecast and expected-vs-weighed ----
  const avgOf = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const weighIns = () => Object.values(days).filter((d) => d.weight).sort((a, b) => a.date < b.date ? -1 : 1);
  // trend = mean of all weigh-ins in the 14 days up to each weigh-in
  const trendAt = (ws, i) => avgOf(ws.filter((x, j) => j <= i && x.date >= addDays(ws[i].date, -13)).map((x) => x.weight));
  function forecast() {
    const ws = weighIns(), today = todayStr();
    const last = ws.length ? ws[ws.length - 1] : { date: S.startWeightDate, weight: S.startWeight };
    let rate = null, basis = "";
    // pace: least squares over the weigh-ins of the last 5 weeks, otherwise the logged balance of the last 14 days
    const rec = ws.filter((w) => w.date >= addDays(today, -35));
    if (rec.length >= 2 && toUTC(rec[rec.length - 1].date) - toUTC(rec[0].date) >= 7 * 864e5) {
      const xs = rec.map((w) => (toUTC(w.date) - toUTC(rec[0].date)) / 864e5), ys = rec.map((w) => w.weight);
      const mx = avgOf(xs), my = avgOf(ys);
      rate = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
      basis = `${rec.length} Wiegungen seit ${dm(rec[0].date)}`;
    }
    const bal = [];
    for (let d = addDays(today, -1); d >= addDays(today, -14); d = addDays(d, -1)) { const doc = days[d]; if (doc && logged(doc)) bal.push(intake(doc) - burn(doc)); }
    const balRate = bal.length >= 3 ? avgOf(bal) / S.kcalPerKg : null;
    if (rate == null && balRate != null) { rate = balRate; basis = `Bilanz der letzten ${bal.length} erfassten Tage`; }
    let eta = null;
    if (rate != null && rate < -0.005 && last.weight > S.goalWeight) eta = addDays(last.date, Math.ceil((last.weight - S.goalWeight) / -rate));
    return { rate, basis, balRate, fromWeights: !!basis && !basis.startsWith("Bilanz"), eta, last, reached: ws.some((w) => w.weight <= S.goalWeight) };
  }
  const dmy = (s) => `${WD[weekday(s)]} ${dm(s)}${s.slice(0, 4)}`;
  function renderInsights() {
    if (!S.goalWeight || !S.goalDate) { $("insight").innerHTML = ""; return; }
    const f = forecast();
    let h = `<div class="label">Prognose Zielgewicht ${fmt(S.goalWeight, 1)} kg</div>`;
    if (f.reached) h += `<div class="big">Erreicht</div>`;
    else if (!f.eta) h += `<div class="big">Noch offen</div><div class="small muted">${f.rate == null ? "Sobald ein paar Tage erfasst sind oder die zweite Wiegung da ist, steht hier das voraussichtliche Datum." : "Beim aktuellen Tempo nimmst du gerade nicht ab."}</div>`;
    else {
      const wk = Math.round((toUTC(S.goalDate) - toUTC(f.eta)) / (7 * 864e5));
      const wtxt = (n) => n === 1 ? "1 Woche" : n + " Wochen";
      h += `<div class="big num">${dmy(f.eta)}</div><div class="small muted">bei ${fmt(-f.rate * 7, 1)} kg pro Woche (${f.basis}), wenn das Tempo so bleibt. ${wk > 0 ? wtxt(wk) + " vor" : wk < 0 ? wtxt(-wk) + " nach" : "Genau zur"} Deadline ${dm(S.goalDate)}${S.goalDate.slice(0, 4)}.</div>`;
      if (f.fromWeights && f.balRate != null) h += `<div class="small muted">Laut Bilanz der letzten zwei Wochen wären es ${fmt(-f.balRate * 7, 1)} kg pro Woche.</div>`;
    }
    h += `<div class="tiles">` + STREAKS.filter((s) => !s.show || s.show()).map((s) => {
      const r = streak(s);
      let extra = "";
      if (s.key === "steps") {
        const g = stepGoalFor(todayStr());
        if (g && g.full > g.min) { const mon = wkStart(todayStr()); let n = 0; for (let i = 0; i < 7; i++) { const d = days[addDays(mon, i)]; if (d && stepsOf(d) >= g.full) n++; } extra = `<div class="small muted">Diese Woche ${n} von 5 Tagen mit ${fmt(g.full)}</div>`; }
        else if (g) extra = `<div class="small muted">Ziel ${fmt(g.min)} Schritte</div>`;
      }
      return `<div class="tile"><div class="label">${s.label}</div><div class="big num">${tage(r.cur)}</div><div class="small muted">in Folge · Rekord ${tage(r.best)}</div>${extra}</div>`;
    }).join("") + `</div>`;
    $("insight").innerHTML = h;
  }
  // shared time range of the history graphs: "14", "30" (days), "start" (since the start weight) or "goal" (all the way to the target)
  let histRange = "start"; try { const v = localStorage.getItem("kurs:histRange"); if (["14", "30", "start", "goal"].includes(v)) histRange = v; } catch (e) {}
  const histDays = () => histRange === "14" ? 14 : histRange === "30" ? 30 : 0;
  function renderExpChart() {
    const start = S.startWeightDate, svg = $("chExp");
    if (!start || !S.startWeight) { svg.innerHTML = ""; $("readExp").textContent = ""; return; }
    const today = todayStr();
    // expected loss: summed balance of the days before each date (weigh-ins are in the morning)
    const exp = [[start, 0]]; let cum = 0;
    for (let d = start; d < today; d = addDays(d, 1)) { const doc = days[d]; if (doc && hasData(doc)) cum += intake(doc) - burn(doc); exp.push([addDays(d, 1), cum / S.kcalPerKg]); }
    const act = weighIns().filter((w) => w.date >= start).map((w) => [w.date, w.weight - S.startWeight]);
    if (!act.length || act[0][0] !== start) act.unshift([start, 0]);
    const W = 600, H = 230, L = 52, R = 14, T = 12, B = 30;
    const wd = histDays(), wStart = wd ? [start, addDays(today, -(wd - 1))].sort().pop() : start;
    const expW = exp.filter((p) => p[0] >= wStart), actW = act.filter((p) => p[0] >= wStart);
    const endD = [exp[exp.length - 1][0], act[act.length - 1][0], addDays(wStart, wd ? 13 : 21)].sort().pop();
    const vals = expW.map((p) => p[1]).concat(actW.map((p) => p[1]), wd ? [] : [0]); if (!vals.length) vals.push(0);
    let lo = Math.floor(Math.min(...vals) * 2 - 0.5) / 2, hi = Math.max(0.5, Math.ceil(Math.max(...vals) * 2) / 2);
    const span = hi - lo, step = span > 8 ? 2 : span > 4 ? 1 : 0.5;
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    const x0 = toUTC(wStart), x1 = toUTC(endD);
    const X = (s) => L + (toUTC(s) - x0) / (x1 - x0) * (W - L - R), Y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
    let g = "";
    for (let v = lo; v <= hi + 1e-9; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${Y(v) + 5}" text-anchor="end">${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt(Math.abs(v), step < 1 ? 1 : 0)}</text>`;
    const nd = Math.round((x1 - x0) / 864e5), every = Math.max(7, Math.ceil(nd / 6 / 7) * 7);
    for (let i = 0; i <= nd; i += every) { const d = addDays(wStart, i); g += `<text x="${X(d)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : "middle"}">${dm(d).slice(0, 6)}</text>`; }
    if (lo <= 0 && hi >= 0) g += `<line x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--muted)" stroke-width="1"/>`;
    g += `<polyline fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 4" points="${expW.map(([d, v]) => X(d) + "," + Y(v)).join(" ")}"/>`;
    if (actW.length > 1) g += `<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="${actW.map(([d, v]) => X(d) + "," + Y(v)).join(" ")}"/>`;
    actW.forEach(([d, v]) => g += `<circle cx="${X(d)}" cy="${Y(v)}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"/>`);
    svg.innerHTML = g;
    const la = act[act.length - 1], ePt = exp.find((p) => p[0] === la[0]);
    if (act.length < 2 || !ePt) { $("readExp").innerHTML = `Erwartet bisher <b>${signedKg(cum / S.kcalPerKg)}</b>. Der Vergleich erscheint nach der nächsten Wiegung.`; return; }
    const diff = la[1] - ePt[1], weeks = (toUTC(la[0]) - x0) / (7 * 864e5);
    let hint = "Passt gut zusammen.";
    if (diff < -0.5 && weeks < 3) hint = "Mehr als erwartet ist am Anfang normal (Wasser und Glykogen).";
    else if (diff < -0.7) hint = "Du nimmst mehr ab als die Bilanz sagt. Der Verbrauch ist vermutlich etwas zu niedrig geschätzt.";
    else if (diff > 0.7) hint = "Weniger als erwartet. Häufige Gründe: Aufnahme unterschätzt oder Wasser eingelagert.";
    $("readExp").innerHTML = `Bis ${WD[weekday(la[0])]} ${dm(la[0])}: erwartet <b>${signedKg(ePt[1])}</b>, gewogen <b>${signedKg(la[1])}</b>. ${hint}`;
  }

