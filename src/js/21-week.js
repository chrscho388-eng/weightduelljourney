  // ---- week ----
  // only finished days count: today (and later) is still running and stays out of sums, averages and expectations
  function weekStats(mon) {
    let sum = 0, n = 0, kin = 0, out = 0, pr = 0;
    const rows = [], today = todayStr();
    let running = false;
    for (let i = 0; i < 7; i++) {
      const date = addDays(mon, i), d = dayDoc(date);
      if (!hasData(d)) { rows.push({ date, d, empty: true }); continue; }
      const a = intake(d), b = burn(d);
      const live = date >= today; if (live) running = true;
      rows.push({ date, d, kin: a, out: b, bal: a - b, pr: protein(d), live });
      if (live) continue;
      sum += a - b; kin += a; out += b; pr += protein(d); n++;
    }
    const wStart = days[mon] && days[mon].weight;
    const wEnd = days[addDays(mon, 7)] && days[addDays(mon, 7)].weight;
    // projection: every day without a finished entry (today included) gets the average of the finished days
    const proj = n ? { avg: sum / n, rest: 7 - n, sum: sum / n * 7 } : null;
    return { rows, sum, n, running, avg: n ? { kin: kin / n, out: out / n, bal: sum / n, pr: pr / n } : null, expected: sum / S.kcalPerKg, proj, wStart, wEnd };
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
      const tag = `<span>${WD[weekday(r.date)]} ${dm(r.date)} ›</span>${r.d.dayType ? ` <span class="pill">${esc(typeName(r.d.dayType))}</span>` : ""}${r.d.event ? ' <span class="pill warn">Event</span>' : ""}${r.d.weight ? ` <span class="pill">${fmtW(r.d.weight)} kg</span>` : ""}`;
      if (r.empty) h += `<button class="dayrow empty" data-date="${r.date}"><span class="dtag">${tag}</span><span class="dbal">offen</span></button>`;
      else h += `<button class="dayrow${r.live ? " live" : ""}" data-date="${r.date}"><span class="dtag">${tag}</span>${r.live ? `<span class="dbal">läuft</span>` : `<span class="dbal ${r.bal > 0 ? "pos" : "neg"}">${signed(r.bal)} kcal</span>`}
        <span class="dsub">Aufnahme <b>${fmt(r.kin)}</b> · Verbrauch <b>${fmt(r.out)}</b> · Eiweiß <b>${fmt(r.pr)} g</b></span>
        <span class="dsub">Schritte: ${stepsTxt(r.d)}</span></button>`;
    });
    if (st.avg) h += `<div class="dayrow sum"><span class="dtag">Schnitt (${st.n} ${st.n === 1 ? "Tag" : "Tage"})</span><span class="dbal ${st.avg.bal > 0 ? "pos" : "neg"}">${signed(r5(st.avg.bal))} kcal</span>
        <span class="dsub">Aufnahme <b>${fmt(r5(st.avg.kin))}</b> · Verbrauch <b>${fmt(r5(st.avg.out))}</b> · Eiweiß <b>${fmt(st.avg.pr)} g</b></span>
        <span class="dsub">Verbrauch: Grund <b>${fmt(S.baseKcal)}</b> · durch Schritte <b>${fmt(r5(st.avg.out - S.baseKcal))}</b></span></div>`;
    $("weekTable").innerHTML = h;
    renderReview();
    $("weekTable").querySelectorAll("button[data-date]").forEach((b) => { b.title = "Tag öffnen"; b.onclick = () => { curDay = b.dataset.date; endEdit(); location.hash = "#heute"; renderDay(); }; });
    const actual = (st.wStart && st.wEnd) ? st.wEnd - st.wStart : null;
    $("weekSum").innerHTML = !st.n ? `<div class="muted">${st.running ? "Noch kein abgeschlossener Tag. Der heutige Tag zählt ab morgen mit." : "Für diese Woche gibt es noch keine Einträge."}</div>` : `
      <div class="fields">
        <div><div class="label">Summe Bilanz</div><div class="num" style="font-size:20px">${signed(r5(st.sum))} kcal</div><div class="small muted">${st.n} von 7 Tagen erfasst</div></div>
        <div><div class="label">Erwartet</div><div class="num" style="font-size:20px">${signedKg(st.expected)}</div><div class="small muted">Summe / ${fmt(S.kcalPerKg)} kcal pro kg</div></div>
        <div id="weekProj"><div class="label">Hochgerechnet</div><div class="num" style="font-size:20px">${signedKg(st.proj.sum / S.kcalPerKg)}</div><div class="small muted">${st.proj.rest ? `Schnitt ${signed(r5(st.proj.avg))} kcal × ${st.proj.rest} ${st.proj.rest === 1 ? "Resttag" : "Resttage"}` : "alle 7 Tage abgeschlossen"}</div></div>
        <div><div class="label">Tatsächlich (${WD[S.weighDay ?? 1]} → ${WD[S.weighDay ?? 1]})</div><div class="num" style="font-size:20px">${actual == null ? "offen" : signedKg(actual)}</div><div class="small muted">${st.wStart ? fmtW(st.wStart) : "?"} → ${st.wEnd ? fmtW(st.wEnd) : "Di " + dm(addDays(curWeek, 8))} kg</div></div>
      </div>`;
  }
