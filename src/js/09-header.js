  // ---- render: header ----
  function renderTop() {
    $("brandName").textContent = "Weightplan";
    if (!hasProfile) { $("topMeta").innerHTML = `<div class="tm2">${profileKnown ? "Profil anlegen" : "lädt …"}</div>`; return; }
    const weights = Object.values(days).filter((d) => d.weight).sort((a, b) => a.date < b.date ? -1 : 1);
    const last = weights.length ? weights[weights.length - 1] : { weight: S.startWeight, date: S.startWeightDate };
    const toGo = last.weight - S.goalWeight;
    $("topMeta").innerHTML = `<div class="tm1">${fmt(last.weight, 1)} kg</div><div class="tm2">noch ${fmt(toGo, 1)} kg · Woche ${Math.max(0, weekNo(wkStart(todayStr())))}</div>`;
  }

