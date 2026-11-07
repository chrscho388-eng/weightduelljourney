  // ---- render: today ----
  let weightExtra = null;
  function renderDay() {
    if (hasProfile) setTimeout(() => ensureFixed(curDay), 0);
    const d = dayDoc(curDay);
    const wn = weekNo(wkStart(curDay));
    $("dayName").textContent = `${WDL[weekday(curDay)]}, ${dm(curDay)}${curDay === todayStr() ? " · heute" : ""}`;
    const kin = intake(d), pr = protein(d), out = burn(d), bal = kin - out;
    const target = d.event ? S.eventKcal : S.kcalTarget;
    $("gKcal").textContent = fmt(kin);
    $("gKcalOf").textContent = (d.event ? `Event-Tag, Rahmen ${fmt(S.eventKcal)} kcal` : `von ${fmt(target)} kcal`) + (kin > target ? ` · ${fmt(kin - target)} drüber` : ` · noch ${fmt(target - kin)}`);
    $("gKcalBar").firstElementChild.style.width = Math.min(100, kin / target * 100) + "%";
    $("gKcalBar").classList.toggle("over", kin > target);
    $("gProt").textContent = fmt(pr) + " g";
    // minimum target plus an optional optimum (e.g. 150 g, ideally 180 g)
    const popt = Number(S.proteinOptimum) > S.proteinTarget ? Number(S.proteinOptimum) : 0, pmax = popt || S.proteinTarget;
    $("gProtOf").textContent = `von ${S.proteinTarget} g${popt ? ` (optimal ${popt} g)` : ""} · ` + (pr < S.proteinTarget ? `noch ${fmt(S.proteinTarget - pr)} g` : popt && pr < popt ? `Ziel erreicht, bis optimal noch ${fmt(popt - pr)} g` : popt ? `Optimum erreicht (+${fmt(pr - popt)} g)` : `Ziel erreicht (+${fmt(pr - S.proteinTarget)} g)`);
    $("gProtBar").firstElementChild.style.width = Math.min(100, pr / pmax * 100) + "%";
    $("gProtOpt").hidden = !popt; if (popt) $("gProtOpt").style.left = (S.proteinTarget / popt * 100) + "%";

    // week-to-date average
    const mon = wkStart(curDay);
    const wdays = []; for (let i = 0; i <= wkPos(curDay); i++) { const x = addDays(mon, i); if (hasData(dayDoc(x))) wdays.push(dayDoc(x)); }
    const avgBal = wdays.length ? wdays.reduce((a, x) => a + intake(x) - burn(x), 0) / wdays.length : null;
    $("balanceRow").innerHTML =
      `<span>Verbrauch</span><b>${fmt(out)} kcal</b>` +
      `<span>Bilanz heute</span><b class="${bal > 0 ? "pos" : "neg"}">${signed(bal)} kcal</b>` +
      (avgBal != null ? `<span>Schnitt ${wn >= 1 ? "Woche " + wn : "dieser Woche"} (${wdays.length} ${wdays.length === 1 ? "Tag" : "Tage"})</span><b class="${avgBal > 0 ? "pos" : "neg"}">${signed(Math.round(avgBal / 5) * 5)} kcal</b>` : "");

    renderWeekGoal();

    // meals
    const ul = $("mealList"); ul.innerHTML = "";
    if (!(d.meals || []).length) ul.innerHTML = `<li class="empty" style="display:block">Noch nichts eingetragen. Beschreibe unten, was du gegessen hast.</li>`;
    (d.meals || []).forEach((m) => {
      const li = document.createElement("li");
      const nm = document.createElement("div"); nm.className = "mname";
      const b = document.createElement("button"); b.textContent = m.label; b.title = "Anpassen";
      b.onclick = () => { if (m.pending) return; medit = medit && medit.id === m.id ? null : mEditStart(m); renderDay(); };
      nm.append(b);
      const v = document.createElement("div"); v.className = "mv"; v.textContent = m.pending ? "wartet auf\nClaude" : `${fmt(m.kcal)} kcal\n${fmt(m.protein)} g Eiweiß`;
      const x = document.createElement("button"); x.className = "x"; x.setAttribute("aria-label", "Löschen: " + m.label); x.textContent = "×";
      x.onclick = () => deleteMeal(curDay, m);
      const st = document.createElement("button"); st.className = "x star"; const fav = isFav(m);
      st.textContent = fav ? "★" : "☆"; st.setAttribute("aria-label", (fav ? "Aus Favoriten entfernen: " : "Als Favorit merken: ") + m.label); st.title = fav ? "Favorit entfernen" : "Als Favorit merken";
      st.onclick = () => toggleFav(m);
      if (m.auto || m.pending) st.style.visibility = "hidden";
      li.append(nm, v, st, x);
      const det = mealDetails(m); if (det) li.append(det);
      if (medit && medit.id === m.id && medit.day === curDay) li.append(mEditBox(m));
      ul.append(li);
    });

    renderFavs();
    $("streakLine").innerHTML = streakLine();
    // last day of the week: preview of this week's review, weigh day: the full review of last week
    { const t = todayStr(), wd = wkPos(t), rh = $("reviewHint");
      rh.hidden = !(curDay === t && hasProfile && (wd === 6 || wd === 0));
      if (!rh.hidden) { const m = wd === 6 ? wkStart(t) : addDays(wkStart(t), -7); rh.textContent = wd === 6 ? "Wochenrückblick: Vorabinfo ansehen ›" : "Wochenrückblick der letzten Woche ansehen ›"; rh.onclick = () => { curWeek = m; location.hash = "#woche"; renderWeek(); }; } }

    // plan chips
    const plan = plans[mondayOf(curDay)]; // meal plans stay Mon–Sun
    const pday = plan && (plan.days || []).find((x) => x.date === curDay);
    const wrap = $("planChipsWrap"), chips = $("planChips"); chips.innerHTML = "";
    if (pday && (pday.meals || []).length) {
      wrap.hidden = false;
      pday.meals.forEach((pm) => {
        const taken = (d.meals || []).some((m) => m.fromPlan === pm.name);
        const c = document.createElement("button"); c.className = "chip" + (taken ? " on" : "");
        c.textContent = `${pm.slot ? pm.slot + ": " : ""}${pm.name} · ${fmt(pm.kcal)}`;
        // fill the entry form instead of logging right away, so portions can be adjusted first
        c.onclick = () => {
          if (taken) return;
          if (editingId) endEdit();
          $("mealText").value = pm.name + (pm.detail ? " (" + pm.detail + ")" : ""); $("manKcal").value = pm.kcal; $("manProt").value = pm.protein;
          planFill = pm.name;
          setStatus("estStatus", "Aus dem Plan übernommen. Passe Text, kcal oder Eiweiß an und tippe auf „Eintragen“, oder lass den geänderten Text schätzen.");
          $("mealText").focus(); $("mealText").scrollIntoView({ block: "center", behavior: "smooth" });
        };
        chips.append(c);
      });
    } else wrap.hidden = true;

    // inputs (don't clobber focused field)
    const setIf = (id, val) => { const el = $(id); if (document.activeElement !== el) el.value = val ?? ""; };
    renderStepFields(d);
    setIf("weight", d.weight || "");
    // weight only on the weigh day (Tuesday), on days that already have one, or on request
    const weighNow = weekday(curDay) === (S.weighDay ?? 1) || !!d.weight || weightExtra === curDay;
    $("weightField").hidden = !weighNow; $("weightShow").hidden = weighNow;
    $("moveHead").textContent = weighNow ? "Bewegung und Gewicht" : "Bewegung";
    { const sel = $("dayType"), list = dayTypes(), sig = JSON.stringify(list); if (sel.dataset.sig !== sig) { sel.innerHTML = list.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join(""); sel.dataset.sig = sig; } }
    if (document.activeElement !== $("dayType")) $("dayType").value = d.dayType || defaultType(curDay);
    $("eventDay").checked = !!d.event;
  }
  function defaultType(s) {
    const pd = ((plans[mondayOf(s)] || {}).days || []).find((x) => x.date === s);
    if (pd && dayTypes().some((t) => t.id === pd.type)) return pd.type;
    const w = weekday(s), id = (S.dayTypeWeek || [])[w];
    return id && dayTypes().some((t) => t.id === id) ? id : DAY_WEEK[w];
  }
