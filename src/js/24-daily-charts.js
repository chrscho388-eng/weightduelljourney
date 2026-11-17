  // ---- daily charts ----
  let selDate = null;
  const markRange = () => document.querySelectorAll("#rangeChips .chip").forEach((x) => x.classList.toggle("on", x.dataset.range === histRange));
  markRange();
  document.querySelectorAll("#rangeChips .chip").forEach((c) => c.onclick = () => {
    histRange = c.dataset.range; try { localStorage.setItem("kurs:histRange", histRange); } catch (e) {}
    selDate = null; markRange(); renderHistory(); renderExpChart(); renderDaily();
  });
  // ---- chart cursor: tap a chart for a vertical day line, drag it sideways; every history chart shows the same day ----
  // Each chart registers { W, L, R, T, B, xOf(date) -> x or null, dateAt(x) -> date, items(date) -> [{ y, text, color }], note(date) }.
  const cursors = {};
  function paintCursor(id) {
    const svg = $(id), c = cursors[id]; if (!svg) return;
    const old = svg.querySelector("g.cur"); if (old) old.remove();
    svg.classList.remove("has-cur");
    if (!c || !selDate) return;
    const x = c.xOf(selDate); if (x == null) return;
    // one tidy info box beside the line (date on top, one row per series with its colour dot); on the curves only dots
    const note = c.note ? c.note(selDate) : "";
    const its = c.items(selDate).filter((it) => it && it.y != null && isFinite(it.y));
    let h = `<line x1="${x}" x2="${x}" y1="${c.T}" y2="${c.B}" stroke="var(--fg)" stroke-width="1.5" stroke-opacity=".6"/>`;
    its.forEach((it) => { if (it.dot !== false) h += `<circle cx="${x}" cy="${it.y}" r="5" fill="${it.color}" stroke="var(--surface)" stroke-width="2"/>`; });
    const rows = [{ t: `${WD[weekday(selDate)]} ${dm(selDate)}${note ? " · " + note : ""}`, head: true }].concat(its.slice().sort((a, b) => a.y - b.y).map((it) => ({ t: it.text, color: it.color })));
    const lh = 22, pad = 10, dotW = 16, chW = 9.6; // 16px data font: about 9.6px per character
    const bw = Math.ceil(Math.max(...rows.map((r) => r.t.length * chW + (r.head ? 0 : dotW)))) + 2 * pad, bh = rows.length * lh + 2 * pad - 4;
    let bx = x > (c.L + c.W - c.R) / 2 ? x - 12 - bw : x + 12;
    bx = Math.max(c.L + 2, Math.min(c.W - c.R - bw, bx));
    const by = c.T + 4;
    h += `<rect class="curbox" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="8"/>`;
    rows.forEach((r, k) => {
      const ty = by + pad + 14 + k * lh;
      if (r.head) h += `<text class="curhead" x="${bx + pad}" y="${ty}">${r.t}</text>`;
      else h += `<circle cx="${bx + pad + 5}" cy="${ty - 5}" r="5" fill="${r.color}"/><text class="curtxt" x="${bx + pad + dotW}" y="${ty}">${r.t}</text>`;
    });
    svg.insertAdjacentHTML("beforeend", `<g class="cur" pointer-events="none">${h}</g>`);
    svg.classList.add("has-cur");
  }
  // x-axis date label that never sticks out of the chart and never overlaps the previous one
  function xLabels(list, y, L, W, R) {
    let out = "", lastRight = -1e9; const half = 34;
    list.forEach(([x, t]) => {
      let a = "middle", tx = x, left = x - half, right = x + half;
      if (right > W - 2) { a = "end"; tx = W - 2; left = tx - 2 * half; right = tx; }
      else if (left < L - 6) { a = "start"; tx = L - 6; left = tx; right = tx + 2 * half; }
      if (left < lastRight + 6) return;
      lastRight = right; out += `<text x="${tx}" y="${y}" text-anchor="${a}">${t}</text>`;
    });
    return out;
  }
  function paintCursors() { Object.keys(cursors).forEach(paintCursor); dailyRead(); }
  function setCursor(d) { if (d === selDate) return; selDate = d; paintCursors(); }
  function clearCursor() { if (selDate) setCursor(null); }
  function attachCursor(id) {
    const svg = $(id); if (!svg || svg.dataset.cur) return;
    svg.dataset.cur = "1"; svg.classList.add("cursorable");
    const xAt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()).x; };
    let drag = null;
    svg.addEventListener("pointerdown", (e) => {
      const c = cursors[id]; if (!c || (e.pointerType === "mouse" && e.button !== 0)) return;
      const d = c.dateAt(xAt(e)); if (!d) return;
      drag = { off: d === selDate, moved: false, pid: e.pointerId };
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      setCursor(d);
    });
    svg.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.pid) return;
      const d = cursors[id] && cursors[id].dateAt(xAt(e));
      if (d && d !== selDate) { drag.moved = true; setCursor(d); }
    });
    svg.addEventListener("pointerup", () => { if (drag && drag.off && !drag.moved) setCursor(null); drag = null; });
    svg.addEventListener("pointercancel", () => { drag = null; });
  }
  // value of a step line (last point on or before the date)
  const stepAt = (pts, d) => { let v = null; for (const p of pts) { if (p[0] <= d) v = p; else break; } return v; };
  function dailyRows() {
    const end = todayStr();
    const firstData = Object.keys(days).filter((d) => hasData(days[d])).sort()[0] || end;
    const range = histDays();
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
    const W = 600, H = 230, R = 10, T = 12, B = 30;
    let L = o.left || 62;
    const vals = [];
    rows.forEach((r) => { if (r.has) { vals.push(o.bar(r) + (o.bar2 ? o.bar2(r) : 0)); if (o.line) { const v = o.line(r); if (v != null) vals.push(v); } } });
    if (o.ref != null) vals.push(o.ref);
    if (vals.length) (o.refs || []).forEach((f) => rows.forEach((r) => { const v = f.at(r); if (v != null) vals.push(v); }));
    if (!vals.length) { $(svgId).innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">Noch keine Einträge in diesem Zeitraum</text>`; return; }
    let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    const step = niceStep(hi - lo || 100);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi * 1.05 / step) * step; if (hi === lo) hi = lo + step;
    L = Math.max(L, Math.max(fmt(lo).length, fmt(hi).length) * 11 + 10); // wide labels like "−2.500" need more room
    const n = rows.length, band = (W - L - R) / n;
    const bw = Math.max(2, Math.min(28, band - 2));
    const X = (i) => L + i * band + (band - bw) / 2, XC = (i) => L + i * band + band / 2;
    const Y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
    let g = "";
    for (let v = lo; v <= hi + 1e-9; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${Y(v) + 5}" text-anchor="end">${fmt(v)}</text>`;
    const every = Math.ceil(n / 7);
    g += xLabels(rows.map((r, i) => (n - 1 - i) % every === 0 ? [XC(i), dm(r.date).slice(0, 6)] : null).filter(Boolean), H - 6, L, W, R);
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
    $(svgId).innerHTML = g + marks;
    const idx = {}; rows.forEach((r, i) => { idx[r.date] = i; });
    cursors[svgId] = { W, L, R, T, B: H - B, xOf: (d) => idx[d] == null ? null : XC(idx[d]),
      dateAt: (x) => rows[Math.max(0, Math.min(n - 1, Math.floor((x - L) / band)))].date,
      note: (d) => { const r = rows[idx[d]]; return !r || !r.has ? "keine Einträge" : r.ev ? "Event" : ""; },
      items: (d) => { const r = rows[idx[d]]; return r && r.has ? o.tags(r).map((t) => ({ ...t, y: Y(t.v) })) : []; } };
    attachCursor(svgId); paintCursor(svgId);
  }
  function renderDaily() {
    const rows = dailyRows();
    drawDaily("chEnergy", rows, { bar: (r) => r.kin, barColor: () => "var(--s1)", line: (r) => r.out, lineColor: "var(--s2)", ref: S.kcalTarget,
      tags: (r) => [{ v: r.kin, text: "Aufnahme " + fmt(r5(r.kin)), color: "var(--s1)" }, { v: r.out, text: "Verbrauch " + fmt(r5(r.out)), color: "var(--s2)" }] });
    drawDaily("chBal", rows, { bar: (r) => r.bal, barColor: (r) => r.bal > 0 ? "var(--bad)" : "var(--good)", line: (r) => r.avg7, lineColor: "var(--fg)",
      tags: (r) => [{ v: r.bal, text: signed(r5(r.bal)) + " kcal", color: r.bal > 0 ? "var(--bad)" : "var(--good)" }].concat(r.avg7 != null ? [{ v: r.avg7, text: "Ø 7 Tage " + signed(r5(r.avg7)), color: "var(--fg)" }] : []) });
    drawDaily("chProt", rows, { bar: (r) => r.pr, barColor: () => "var(--s1)", ref: S.proteinTarget, tags: (r) => [{ v: r.pr, text: fmt(r.pr) + " g", color: "var(--s1)" }] });
    drawDaily("chSteps", rows, { bar: (r) => r.inc, barColor: () => "var(--s1)", bar2: (r) => r.flat, bar2Color: "var(--s2)", left: 84, refs: [{ at: (r) => r.goal, dash: "6 4" }, { at: (r) => r.goalMin, dash: "2 4", faint: true }],
      tags: (r) => [{ v: r.inc + r.flat, text: fmt(Math.round((r.inc + r.flat) / 100) * 100) + " gesamt", color: "var(--fg)", dot: false }, { v: r.inc, text: fmt(Math.round(r.inc / 100) * 100) + " Steigung", color: "var(--s1)", dot: false }] });
    lastRows = rows; dailyRead();
  }
  let lastRows = [];
  function dailyRead() {
    const rows = lastRows;
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

