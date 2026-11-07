  // ---- day inputs ----
  const numOrNull = (v) => v === "" ? null : Number(v);
  // one field per incline: 0 % first, then the profile's inclines, then any other incline the day already has
  function renderStepFields(d) {
    const m = stepsMap(d), list = [0, ...inclineList()];
    Object.keys(m).map(Number).forEach((p) => { if (!list.includes(p)) list.push(p); });
    const box = $("stepFields"), key = list.join(","), idOf = (p) => "steps_" + String(p).replace(".", "_");
    if (box.dataset.key !== key) {
      box.innerHTML = list.map((p) => `<div class="field"><label class="label" for="${idOf(p)}">${p ? "Schritte bei " + pctFmt(p) : "Schritte flach (0 %)"}</label><input id="${idOf(p)}" data-pct="${p}" type="number" inputmode="numeric" min="0" step="500"></div>`).join("");
      box.dataset.key = key;
      box.querySelectorAll("input").forEach((inp) => inp.onchange = (e) => saveDay(curDay, (dd) => { setSteps(dd, Number(inp.dataset.pct), numOrNull(e.target.value)); if (!dd.dayType) dd.dayType = defaultType(curDay); }));
    }
    list.forEach((p) => { const el = $(idOf(p)); if (document.activeElement !== el) el.value = m[p] || ""; });
  }
  $("weightShow").onclick = () => { weightExtra = curDay; $("weightField").hidden = false; $("weightShow").hidden = true; $("moveHead").textContent = "Bewegung und Gewicht"; $("weight").focus(); };
  $("weight").onchange = (e) => saveDay(curDay, (d) => { const w = numOrNull(e.target.value); if (w) d.weight = Math.round(w * 10) / 10; else delete d.weight; });
  $("dayType").onchange = (e) => saveDay(curDay, (d) => { d.dayType = e.target.value; });
  $("eventDay").onchange = (e) => saveDay(curDay, (d) => { d.event = e.target.checked; });
