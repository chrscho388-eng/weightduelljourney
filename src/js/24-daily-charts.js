  // ---- daily charts ----
  let range = 14, selDate = null;
  document.querySelectorAll("#rangeChips .chip").forEach((c) => c.onclick = () => {
    range = Number(c.dataset.range);
    document.querySelectorAll("#rangeChips .chip").forEach((x) => x.classList.toggle("on", x === c));
    renderDaily();
  });
  function dailyRows() {
    const end = todayStr();
    const firstData = Object.keys(days).filter((d) => hasData(days[d])).sort()[0] || end;
    let start = range ? addDays(end, -(range - 1)) : firstData;
    const rows = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const doc = dayDoc(d), has = !!hasData(doc);
      const g = stepGoalFor(d);
      const goals = { goal: g ? g.full : null, goalMin: g && g.min < g.full ? g.min : null };
      rows.push(has ? { date: d, has, kin: intake(doc), out: burn(doc), bal: intake(doc) - burn(doc), pr: protein(doc), ev: !!doc.event, inc: stepsOf(doc) - (stepsMap(doc)[0] || 0), flat: stepsMap(doc)[0] || 0, ...goals } : { date: d, has, ...goals });
    }
    rows.forEach((r, i) => { // rolling 7-day mean of recorded days
      const win = rows.slice(Math.max(0, i - 6), i + 1).filter((x) => x.has);
      r.avg7 = r.has && win.length ? win.reduce((a, x) => a + x.bal, 0) / win.length : null;
    });
    return rows;
  }
  function niceStep(span) { for (const st of [10, 20, 25, 50, 100, 250, 500, 1000, 2000]) if (span / st <= 5) return st; return 5000; }
  // bar path with a rounded data end (radius 4) and a square base on the baseline
  function barPath(x, w, y0, y1) {
    const r = Math.min(4, w / 2, Math.abs(y1 - y0));
    if (y1 <= y0) return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
    return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
  }
  function drawDaily(svgId, rows, o) {
    const W = 600, H = 230, L = o.left || 62, R = 10, T = 12, B = 30;
    const vals = [];
    rows.forEach((r) => { if (r.has) { vals.push(o.bar(r) + (o.bar2 ? o.bar2(r) : 0)); if (o.line) { const v = o.line(r); if (v != null) vals.push(v); } } });
    if (o.ref != null) vals.push(o.ref);
    if (vals.length) (o.refs || []).forEach((f) => rows.forEach((r) => { const v = f.at(r); if (v != null) vals.push(v); }));
    if (!vals.length) { $(svgId).innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">Noch keine Einträge in diesem Zeitraum</text>`; return; }
    let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    const step = niceStep(hi - lo || 100);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi * 1.05 / step) * step; if (hi === lo) hi = lo + step;
    const n = rows.length, band = (W - L - R) / n;
    const bw = Math.max(2, Math.min(28, band - 2));
    const X = (i) => L + i * band + (band - bw) / 2, XC = (i) => L + i * band + band / 2;
    const Y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
    let g = "";
    for (let v = lo; v <= hi + 1e-9; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${Y(v) + 5}" text-anchor="end">${fmt(v)}</text>`;
    const every = Math.ceil(n / 7);
    rows.forEach((r, i) => { if ((n - 1 - i) % every === 0) g += `<text x="${XC(i)}" y="${H - 6}" text-anchor="middle">${dm(r.date).slice(0, 6)}</text>`; });
    let marks = "";
    rows.forEach((r, i) => {
      if (!r.has) return;
      const a = o.bar(r), b = o.bar2 ? o.bar2(r) : 0;
      if (b > 0) { marks += `<rect x="${X(i)}" y="${Y(a)}" width="${bw}" height="${Y(0) - Y(a)}" fill="${o.barColor(r)}"/><path d="${barPath(X(i), bw, Y(a), Y(a + b))}" fill="${o.bar2Color}"/>`; }
      else marks += `<path d="${barPath(X(i), bw, Y(0), Y(a))}" fill="${o.barColor(r)}"/>`;
    });
    // goals that can change from day to day: a dashed segment across each day's band
    (o.refs || []).forEach((f) => rows.forEach((r, i) => { const v = f.at(r); if (v != null) marks += `<line x1="${L + i * band}" x2="${L + (i + 1) * band}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--chart-goal)" stroke-width="2" stroke-dasharray="${f.dash}"${f.faint ? ' stroke-opacity=".55"' : ""}/>`; }));
    if (lo < 0) marks += `<line x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--muted)" stroke-width="1"/>`;
    if (o.ref != null) marks += `<line x1="${L}" x2="${W - R}" y1="${Y(o.ref)}" y2="${Y(o.ref)}" stroke="var(--chart-goal)" stroke-width="2" stroke-dasharray="6 4"/>`;
    if (o.line) {
      let seg = [], segs = [];
      rows.forEach((r, i) => { const v = r.has ? o.line(r) : null; if (v == null) { if (seg.length) segs.push(seg); seg = []; } else seg.push([XC(i), Y(v)]); });
      if (seg.length) segs.push(seg);
      segs.forEach((sg) => {
        if (sg.length > 1) marks += `<polyline fill="none" stroke="${o.lineColor}" stroke-width="2" stroke-linejoin="round" points="${sg.map((p) => p.join(",")).join(" ")}"/>`;
        if (n <= 31) sg.forEach((p) => marks += `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${o.lineColor}" stroke="var(--surface)" stroke-width="2"/>`);
      });
    }
    let hits = "";
    rows.forEach((r, i) => hits += `<rect class="hit${r.date === selDate ? " on" : ""}" data-date="${r.date}" x="${L + i * band}" y="${T}" width="${band}" height="${H - T - B}"/>`);
    $(svgId).innerHTML = g + hits + marks;
    $(svgId).querySelectorAll(".hit").forEach((h) => {
      const pick = () => { selDate = h.dataset.date; renderDaily(); };
      h.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") pick(); });
      h.addEventListener("click", pick);
    });
  }
  function renderDaily() {
    const rows = dailyRows();
    if (!rows.some((r) => r.date === selDate)) selDate = null;
    drawDaily("chEnergy", rows, { bar: (r) => r.kin, barColor: () => "var(--s1)", line: (r) => r.out, lineColor: "var(--s2)", ref: S.kcalTarget });
    drawDaily("chBal", rows, { bar: (r) => r.bal, barColor: (r) => r.bal > 0 ? "var(--bad)" : "var(--good)", line: (r) => r.avg7, lineColor: "var(--fg)" });
    drawDaily("chProt", rows, { bar: (r) => r.pr, barColor: () => "var(--s1)", ref: S.proteinTarget });
    drawDaily("chSteps", rows, { bar: (r) => r.inc, barColor: () => "var(--s1)", bar2: (r) => r.flat, bar2Color: "var(--s2)", left: 84, refs: [{ at: (r) => r.goal, dash: "6 4" }, { at: (r) => r.goalMin, dash: "2 4", faint: true }] });
    const rec = rows.filter((r) => r.has);
    const avg = (f) => rec.length ? rec.reduce((a, r) => a + f(r), 0) / rec.length : null;
    const sel = selDate && rows.find((r) => r.date === selDate);
    const lbl = sel ? `${WD[weekday(sel.date)]} ${dm(sel.date)}` : `Schnitt ${rec.length} Tage`;
    if (sel && !sel.has) { ["readEnergy", "readBal", "readProt", "readSteps"].forEach((id) => $(id).innerHTML = `${lbl}: keine Einträge`); return; }
    if (!rec.length) { ["readEnergy", "readBal", "readProt", "readSteps"].forEach((id) => $(id).textContent = ""); return; }
    const v = sel ? { kin: sel.kin, out: sel.out, bal: sel.bal, pr: sel.pr } : { kin: avg((r) => r.kin), out: avg((r) => r.out), bal: avg((r) => r.bal), pr: avg((r) => r.pr) };
    $("readEnergy").innerHTML = `${lbl}: Aufnahme <b>${fmt(r5(v.kin))}</b> · Verbrauch <b>${fmt(r5(v.out))}</b> kcal${sel && sel.ev ? " · Event-Tag" : ""}`;
    $("readBal").innerHTML = `${lbl}: <b>${signed(r5(v.bal))}</b> kcal${sel && sel.avg7 != null ? ` · Schnitt 7 Tage <b>${signed(r5(sel.avg7))}</b>` : ` · entspricht <b>${signedKg(v.bal * 7 / S.kcalPerKg)}</b> pro Woche`}`;
    $("readProt").innerHTML = `${lbl}: <b>${fmt(v.pr)} g</b> von ${fmt(S.proteinTarget)} g${Number(S.proteinOptimum) > S.proteinTarget ? ` (optimal ${fmt(S.proteinOptimum)} g)` : ""}`;
    // days without any steps entered (only meals logged) do not count for steps
    const sr = rec.filter((r) => r.inc + r.flat > 0), savg = (f) => sr.reduce((a, r) => a + f(r), 0) / sr.length;
    if (!sel && !sr.length) $("readSteps").textContent = "Noch keine Schritte in diesem Zeitraum.";
    const st = sel ? { inc: sel.inc, flat: sel.flat } : sr.length ? { inc: savg((r) => r.inc), flat: savg((r) => r.flat) } : null;
    const r100 = (x) => Math.round(x / 100) * 100;
    let goalTxt = "";
    if (sel && sel.goal) goalTxt = sel.inc + sel.flat >= sel.goal ? " · Ziel erreicht" : sel.goalMin && sel.inc + sel.flat >= sel.goalMin ? ` · Mindestziel erreicht, ${fmt(r100(sel.goal - sel.inc - sel.flat))} bis zum vollen Ziel` : ` · ${fmt(r100((sel.goalMin || sel.goal) - sel.inc - sel.flat))} unter dem ${sel.goalMin ? "Mindestziel" : "Ziel"}`;
    else if (!sel) { const gs = sr.filter((r) => r.goal); if (gs.length) goalTxt = ` · Ziel erreicht an ${fmt(gs.filter((r) => r.inc + r.flat >= (r.goalMin || r.goal)).length)} von ${fmt(gs.length)} Tagen`; }
    if (st) $("readSteps").innerHTML = `${sel ? lbl : "Schnitt " + tage(sr.length)}: <b>${fmt(r100(st.inc + st.flat))}</b> Schritte, davon <b>${fmt(r100(st.inc))}</b> mit Steigung${goalTxt}`;
  }

