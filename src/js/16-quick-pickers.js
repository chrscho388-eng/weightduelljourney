  // ---- quick pickers: tap the day / week name to jump ----
  function openPicker(btnId, boxId, items, pick) {
    const btn = $(btnId), box = $(boxId), open = box.hidden;
    document.querySelectorAll(".picker").forEach((b) => { b.hidden = true; }); document.querySelectorAll(".dpick").forEach((b) => b.setAttribute("aria-expanded", "false"));
    if (!open) return;
    box.innerHTML = items.map((it) => `<button type="button" data-v="${it.v}"${it.on ? ' class="on" aria-current="true"' : ""}><span>${esc(it.label)}</span><span>${esc(it.info || "")}</span></button>`).join("");
    box.querySelectorAll("button").forEach((b) => b.onclick = () => { box.hidden = true; btn.setAttribute("aria-expanded", "false"); pick(b.dataset.v); });
    box.hidden = false; btn.setAttribute("aria-expanded", "true");
    const on = box.querySelector(".on"); if (on) on.scrollIntoView({ block: "nearest" });
  }
  const closePickers = () => { document.querySelectorAll(".picker").forEach((b) => { b.hidden = true; }); document.querySelectorAll(".dpick").forEach((b) => b.setAttribute("aria-expanded", "false")); };
  window.addEventListener("hashchange", closePickers);
  function weekList(from, to, cur, info) {
    const out = []; for (let m = to; m >= from; m = addDays(m, -7)) { const wn = weekNo(m); out.push({ v: m, on: m === cur, label: `${wn >= 1 ? "Woche " + wn : "Vor dem Start"} · ${dm(m)}–${dm(addDays(m, 6))}`, info: info(m) }); }
    return out;
  }
  const firstMon = () => mondayOf([Object.keys(days).filter((d) => hasData(days[d])).sort()[0], S.startDate, todayStr()].filter(Boolean).sort()[0]);
  $("dayName").onclick = () => {
    const mon = wkStart(curDay), t = todayStr(), items = [];
    for (let i = 0; i < 7; i++) { const x = addDays(mon, i), d = dayDoc(x); items.push({ v: x, on: x === curDay, label: `${WDL[weekday(x)]}, ${dm(x)}${x === t ? " · heute" : ""}`, info: hasData(d) ? `${fmt(intake(d))} kcal · ${signed(intake(d) - burn(d))}` : (x > t ? "" : "offen") }); }
    if (mon !== wkStart(t)) items.push({ v: t, label: "Zu heute springen", info: "" });
    openPicker("dayName", "dayPicker", items, (v) => { curDay = v; endEdit(); renderDay(); });
  };
  $("weekName").onclick = () => openPicker("weekName", "weekPicker", weekList(wkStart(firstMon()), wkStart(todayStr()), curWeek, (m) => { const st = weekStats(m); return st.n ? `${signed(r5(st.sum))} kcal` : ""; }), (v) => { curWeek = v; renderWeek(); });
  $("planName").onclick = () => {
    const ks = Object.keys(plans).sort(), to = [ks[ks.length - 1], addDays(mondayOf(todayStr()), 7)].filter(Boolean).sort().pop();
    openPicker("planName", "planPicker", weekList([ks[0], firstMon()].filter(Boolean).sort()[0], to, curPlan, (m) => plans[m] ? "Plan" : "–"), (v) => { curPlan = v; openRecipe = null; renderPlan(); });
  };
  $("prevDay").onclick = () => { closePickers(); curDay = addDays(curDay, -1); endEdit(); renderDay(); };
  $("nextDay").onclick = () => { closePickers(); curDay = addDays(curDay, 1); endEdit(); renderDay(); };

