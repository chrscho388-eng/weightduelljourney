  // ---- history ----
  function renderHistory() {
    const MS = milestones();
    // all weeks table
    const first = wkStart(Object.keys(days).sort()[0] || S.startDate || todayStr());
    const lastMon = wkStart(todayStr());
    let h = `<thead><tr><th>Woche</th><th>Summe</th><th>Erwartet</th><th>Tatsächlich</th><th>Gewicht</th></tr></thead><tbody>`;
    let any = false;
    for (let m = lastMon; m >= first; m = addDays(m, -7)) {
      if (weekNo(m) < 1) continue; // weeks before the start weigh-in are not listed
      const st = weekStats(m); if (!st.n && !st.wStart) continue; any = true;
      const wn = weekNo(m), act = (st.wStart && st.wEnd) ? st.wEnd - st.wStart : null;
      h += `<tr class="weekrow" data-week="${m}" tabindex="0" title="Woche öffnen"><td>${wn >= 1 ? "W" + wn : "W0"} · ${dm(m)} ›</td><td>${signed(r5(st.sum))}</td><td>${signedKg(st.expected)}</td><td>${act == null ? "offen" : signedKg(act)}</td><td>${st.wStart ? fmt(st.wStart, 1) : "–"}</td></tr>`;
    }
    $("allWeeks").innerHTML = any ? h + "</tbody>" : `<tbody><tr><td class="muted">Noch keine Wochen erfasst.</td></tr></tbody>`;
    $("allWeeks").querySelectorAll("tr[data-week]").forEach((r) => {
      const open = () => { curWeek = r.dataset.week; location.hash = "#woche"; renderWeek(); };
      r.onclick = open; r.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
    });

    // goals table
    const weights = Object.values(days).filter((d) => d.weight).sort((a, b) => a.date < b.date ? -1 : 1);
    let g = `<thead><tr><th>Spätestens bis</th><th>Ziel</th><th>Stand</th></tr></thead><tbody>`;
    MS.slice(1).forEach((ms) => {
      const w = weights.filter((x) => x.date <= ms.date).pop();
      const reached = weights.some((x) => x.weight <= ms.kg);
      const state = reached ? `<span class="pill">erreicht</span>` : (todayStr() > ms.date ? `<span class="pill warn">verpasst</span>` : (w ? `noch ${fmt(w.weight - ms.kg, 1)} kg` : "–"));
      g += `<tr><td>${WD[weekday(ms.date)]} ${dm(ms.date)}${ms.date.slice(2, 4)}</td><td>${fmt(ms.kg, 1)} kg</td><td>${state}</td></tr>`;
    });
    $("goalTable").innerHTML = g + "</tbody>";

    // chart
    if (MS.length < 2) { $("chart").innerHTML = ""; return; }
    const W = 600, H = 300, L = 46, R = 16, T = 16, B = 36;
    const today = todayStr(), wd = histDays(), lastMs = MS[MS.length - 1].date;
    let xa = MS[0].date, xb = lastMs; // visible time window
    if (histRange === "start") { xa = S.startWeightDate || MS[0].date; xb = addDays(today, 14); }
    else if (wd) { xa = addDays(today, -(wd - 1)); xb = addDays(today, 2); }
    if (xb > lastMs) xb = lastMs;
    if (xb <= xa) xb = addDays(xa, 7);
    const x0 = toUTC(xa), x1 = toUTC(xb);
    const vw = weights.filter((w) => w.date >= xa && w.date <= xb), vm = MS.filter((m) => m.date >= xa && m.date <= xb);
    const seen = (vw.length ? vw : weights).map((w) => w.weight).concat(vm.map((m) => m.kg), histRange === "goal" ? [S.goalWeight] : []);
    if (!seen.length) seen.push(S.goalWeight);
    let yMax = Math.ceil(Math.max(...seen) + 0.5), yMin = Math.floor(Math.min(...seen) - 0.5);
    if (yMax - yMin < 2) { yMax += 1; yMin -= 1; }
    const X = (s) => L + (toUTC(s) - x0) / (x1 - x0) * (W - L - R);
    const Y = (kg) => T + (yMax - kg) / (yMax - yMin) * (H - T - B);
    let svg = `<defs><clipPath id="chClip"><rect x="${L - 6}" y="${T - 6}" width="${W - L - R + 12}" height="${H - T - B + 12}"/></clipPath></defs>`;
    const span = yMax - yMin, step = span > 24 ? 5 : span > 10 ? 2 : span > 3 ? 1 : 0.5;
    for (let k = yMin; k <= yMax + 1e-9; k += step) svg += `<line x1="${L}" x2="${W - R}" y1="${Y(k)}" y2="${Y(k)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${Y(k) + 4}" text-anchor="end">${fmt(k, step < 1 ? 1 : 0)}</text>`;
    const MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    const nd = Math.round((x1 - x0) / 864e5);
    if (nd > 100) {
      const months = []; for (let m = addDays(xa.slice(0, 8) + "01", 32).slice(0, 8) + "01"; m <= xb; m = addDays(m, 32).slice(0, 8) + "01") months.push(m);
      const every = Math.ceil(months.length / 7);
      months.filter((_, i) => i % every === 0).forEach((s) => {
        const lbl = MON[Number(s.slice(5, 7)) - 1];
        svg += `<line x1="${X(s)}" x2="${X(s)}" y1="${T}" y2="${H - B}" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 4"/><text x="${X(s) + 4}" y="${H - B + 22}">${lbl}</text>`;
      });
    } else {
      const every = Math.max(1, Math.ceil(nd / 6));
      for (let i = 0; i <= nd; i += every) { const s = addDays(xa, i); svg += `<line x1="${X(s)}" x2="${X(s)}" y1="${T}" y2="${H - B}" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 4"/><text x="${X(s)}" y="${H - B + 22}" text-anchor="${i === 0 ? "start" : "middle"}">${dm(s).slice(0, 6)}</text>`; }
    }
    svg += '<g clip-path="url(#chClip)">';
    if (histRange === "goal" || S.goalWeight >= yMin) svg += `<line x1="${L}" x2="${W - R}" y1="${Y(S.goalWeight)}" y2="${Y(S.goalWeight)}" stroke="var(--chart-goal)" stroke-width="1" stroke-dasharray="5 4"/>`;
    svg += `<polyline fill="none" stroke="var(--chart-goal)" stroke-width="2" points="${MS.map((m) => X(m.date) + "," + Y(m.kg)).join(" ")}"/>`;
    MS.slice(1).forEach((m) => svg += `<circle cx="${X(m.date)}" cy="${Y(m.kg)}" r="3" fill="var(--chart-goal)"/>`);
    // expected from balance, starting at start weight
    let cum = 0; const exp = [[S.startWeightDate, S.startWeight]];
    const end = todayStr();
    for (let d = addDays(S.startWeightDate, 0); d <= end; d = addDays(d, 1)) {
      const doc = dayDoc(d); if (!hasData(doc)) continue;
      cum += intake(doc) - burn(doc); exp.push([addDays(d, 1), S.startWeight + cum / S.kcalPerKg]);
    }
    if (exp.length > 1) svg += `<polyline fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 4" points="${exp.map(([d, k]) => X(d) + "," + Y(k)).join(" ")}"/>`;
    if (weights.length) {
      svg += `<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="${weights.map((w) => X(w.date) + "," + Y(w.weight)).join(" ")}"/>`;
      weights.forEach((w, i) => svg += `<circle cx="${X(w.date)}" cy="${Y(w.weight)}" r="${i === weights.length - 1 ? 5 : 3.5}" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"/>`);
      if (weights.length > 1) svg += `<polyline fill="none" stroke="var(--s2)" stroke-width="2" stroke-linejoin="round" points="${weights.map((w, i) => X(w.date) + "," + Y(trendAt(weights, i))).join(" ")}"/>`;
      const lw = weights[weights.length - 1];
      svg += `<text x="${Math.min(X(lw.date) + 10, W - R - 60)}" y="${Y(lw.weight) - 8}" style="fill:var(--fg)">${fmt(lw.weight, 1)}</text>`;
    }
    $("chart").innerHTML = svg + "</g>";
  }

