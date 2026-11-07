  // ---- week ----
  function weekStats(mon) {
    let sum = 0, n = 0, kin = 0, out = 0, pr = 0;
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(mon, i), d = dayDoc(date);
      if (!hasData(d)) { rows.push({ date, d, empty: true }); continue; }
      const a = intake(d), b = burn(d);
      rows.push({ date, d, kin: a, out: b, bal: a - b, pr: protein(d) });
      sum += a - b; kin += a; out += b; pr += protein(d); n++;
    }
    const wStart = days[mon] && days[mon].weight;
    const wEnd = days[addDays(mon, 7)] && days[addDays(mon, 7)].weight;
    return { rows, sum, n, avg: n ? { kin: kin / n, out: out / n, bal: sum / n, pr: pr / n } : null, expected: sum / S.kcalPerKg, wStart, wEnd };
  }
  const r5 = (x) => Math.round(x / 5) * 5;
  function stepsTxt(d) {
    const p = [];
    Object.entries(stepsMap(d)).map(([k, n]) => [Number(k), n]).sort((a, b) => b[0] - a[0])
      .forEach(([k, n]) => p.push(k ? fmt(n) + " @" + pctFmt(k) : fmt(n) + " flach"));
    return p.join(" + ") || "–";
  }
  function renderWeek() {
    curWeek = wkStart(curWeek); // the weigh day may have changed
    const wn = weekNo(curWeek);
    $("weekName").textContent = `${wn >= 1 ? "Woche " + wn : "Vor dem Start"} · ${dm(curWeek)}–${dm(addDays(curWeek, 6))}`;
    const st = weekStats(curWeek);
    let h = "";
    st.rows.forEach((r) => {
      const tag = `<span>${WD[weekday(r.date)]} ${dm(r.date)} ›</span>${r.d.dayType ? ` <span class="pill">${esc(typeName(r.d.dayType))}</span>` : ""}${r.d.event ? ' <span class="pill warn">Event</span>' : ""}${r.d.weight ? ` <span class="pill">${fmt(r.d.weight, 1)} kg</span>` : ""}`;
      if (r.empty) h += `<button class="dayrow empty" data-date="${r.date}"><span class="dtag">${tag}</span><span class="dbal">offen</span></button>`;
      else h += `<button class="dayrow" data-date="${r.date}"><span class="dtag">${tag}</span><span class="dbal ${r.bal > 0 ? "pos" : "neg"}">${signed(r.bal)} kcal</span>
        <span class="dsub">Aufnahme <b>${fmt(r.kin)}</b> · Verbrauch <b>${fmt(r.out)}</b> · Eiweiß <b>${fmt(r.pr)} g</b></span>
        <span class="dsub">Schritte: ${stepsTxt(r.d)}</span></button>`;
    });
    if (st.avg) h += `<div class="dayrow sum"><span class="dtag">Schnitt (${st.n} ${st.n === 1 ? "Tag" : "Tage"})</span><span class="dbal ${st.avg.bal > 0 ? "pos" : "neg"}">${signed(r5(st.avg.bal))} kcal</span>
        <span class="dsub">Aufnahme <b>${fmt(r5(st.avg.kin))}</b> · Verbrauch <b>${fmt(r5(st.avg.out))}</b> · Eiweiß <b>${fmt(st.avg.pr)} g</b></span></div>`;
    $("weekTable").innerHTML = h;
    renderReview();
    $("weekTable").querySelectorAll("button[data-date]").forEach((b) => { b.title = "Tag öffnen"; b.onclick = () => { curDay = b.dataset.date; endEdit(); location.hash = "#heute"; renderDay(); }; });
    const actual = (st.wStart && st.wEnd) ? st.wEnd - st.wStart : null;
    $("weekSum").innerHTML = !st.n ? `<div class="muted">Für diese Woche gibt es noch keine Einträge.</div>` : `
      <div class="fields">
        <div><div class="label">Summe Bilanz</div><div class="num" style="font-size:20px">${signed(r5(st.sum))} kcal</div><div class="small muted">${st.n} von 7 Tagen erfasst</div></div>
        <div><div class="label">Erwartet</div><div class="num" style="font-size:20px">${signedKg(st.expected)}</div><div class="small muted">Summe / ${fmt(S.kcalPerKg)} kcal pro kg</div></div>
        <div><div class="label">Tatsächlich (${WD[S.weighDay ?? 1]} → ${WD[S.weighDay ?? 1]})</div><div class="num" style="font-size:20px">${actual == null ? "offen" : signedKg(actual)}</div><div class="small muted">${st.wStart ? fmt(st.wStart, 1) : "?"} → ${st.wEnd ? fmt(st.wEnd, 1) : "Di " + dm(addDays(curWeek, 8))} kg</div></div>
      </div>`;
  }
