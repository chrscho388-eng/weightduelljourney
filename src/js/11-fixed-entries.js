  // ---- fixed daily entries by day type (e.g. cappuccino, skyr), entered by the app itself ----
  let daysLoaded = false;
  const DAY_TYPES = [{ id: "HO", name: "Home Office" }, { id: "Büro", name: "Büro" }, { id: "WE", name: "Wochenende" }, { id: "Frei", name: "Feiertag / frei" }];
  const BUILTIN_TYPES = DAY_TYPES.map((t) => t.id);
  const DAY_WEEK = ["HO", "HO", "HO", "HO", "HO", "WE", "WE"];
  // own day types (S.dayTypes) replace the standard list; built-in ids can be renamed but never removed
  const dayTypes = () => {
    const own = Array.isArray(S.dayTypes) ? S.dayTypes.filter((t) => t && t.id && t.name) : [];
    return DAY_TYPES.map((t) => ({ id: t.id, name: (own.find((o) => o.id === t.id) || t).name })).concat(own.filter((o) => !BUILTIN_TYPES.includes(o.id)));
  };
  // short label for the week table: the id of a built-in type as long as it keeps its standard name, otherwise the name
  const typeName = (id) => { const t = dayTypes().find((x) => x.id === id), d = DAY_TYPES.find((x) => x.id === id); return !t ? id : d && d.name === t.name ? id : t.name; };
  const COFFEE_DEFAULT = { since: "2026-10-28", kcal: 95, protein: 5, perType: { HO: 1, "Büro": 3, WE: 1, Frei: 1 } };
  const isFx = (m) => m.id === "coffee" || String(m.id).startsWith("fix:");
  // S.fixedMeals = { since, byType: { <type>: [{ id, label, count, kcal, protein }] } }; older profiles only have S.coffee
  function fixedConfig() {
    if (S.fixedMeals && S.fixedMeals.byType) return S.fixedMeals;
    const c = S.coffee || COFFEE_DEFAULT, byType = {};
    Object.entries(c.perType || {}).forEach(([t, n]) => {
      if (!n) return;
      const per = { kcal: c.kcal || 95, protein: c.protein ?? 5, label: "Cappuccino", ...((c.byType || {})[t] || {}) };
      byType[t] = [{ id: "coffee", label: per.label, count: n, kcal: per.kcal, protein: per.protein }];
    });
    return { since: c.since || "2026-10-28", byType };
  }
  const fixedMealOf = (it) => ({ id: it.id === "coffee" ? "coffee" : "fix:" + it.id, label: it.count > 1 ? it.count + "× " + it.label : it.label, kcal: Math.round(it.count * it.kcal), protein: Math.round(it.count * it.protein), auto: true });
  function ensureFixed(date) {
    const cfg = fixedConfig();
    // only once the stored days are loaded, otherwise this would overwrite the day with just the fixed entries
    if (!cfg || !base || !daysLoaded || date < (cfg.since || "9999") || date > todayStr()) return;
    const d = days[date] || {}, off = new Set([...(d.fixedOff || []), ...(d.coffeeOff ? ["coffee"] : [])]);
    const want = ((cfg.byType || {})[d.dayType || defaultType(date)] || []).map(fixedMealOf).filter((m) => !off.has(m.id));
    const cur = (d.meals || []).filter(isFx);
    if (cur.length === want.length && want.every((w) => cur.some((c) => c.id === w.id && c.kcal === w.kcal && c.protein === w.protein && c.label === w.label))) return;
    saveDay(date, (doc) => {
      doc.meals = (doc.meals || []).filter((m) => !isFx(m));
      doc.meals.unshift(...want);
      if (!doc.dayType) doc.dayType = defaultType(date);
    });
  }

  const uid = () => Math.random().toString(36).slice(2, 10);
  function partsTable(parts) {
    const t = document.createElement("table"); t.className = "parts";
    parts.forEach((pt) => {
      const tr = document.createElement("tr");
      const a = document.createElement("td"); a.textContent = pt.name + (pt.grams ? ` (${fmt(pt.grams)} g)` : "");
      const b = document.createElement("td"); b.textContent = `${fmt(pt.kcal)} kcal · ${fmt(pt.protein)} g Eiweiß`;
      tr.append(a, b); t.append(tr);
    });
    return t;
  }
  function mealDetails(m) {
    if (!m.photo && !m.seen && !(m.parts && m.parts.length)) return null;
    const det = document.createElement("details"); det.className = "mdet";
    const su = document.createElement("summary"); su.textContent = m.photo ? "Foto und Zusammensetzung" : "Zusammensetzung"; det.append(su);
    const body = document.createElement("div"); body.className = "dbody";
    if (m.photo && String(m.photo).startsWith(PHOTO_REF)) {
      const p = document.createElement("p"); p.className = "small muted";
      if (STANDALONE && syncCfg()) { p.textContent = "Foto wird geladen …"; photoFetch(m.photo.slice(PHOTO_REF.length)); } else p.textContent = STANDALONE ? "Foto liegt im Daten-Repo (Sync einrichten, um es zu sehen)." : "Das Foto ist in der echten App gespeichert.";
      body.append(p);
    } else if (m.photo) { const img = document.createElement("img"); img.className = "mphoto"; img.alt = "Foto: " + m.label; img.src = m.photo; body.append(img); }
    if (m.seen) { const p = document.createElement("p"); p.className = "seen"; p.textContent = m.seen; body.append(p); }
    if (m.parts && m.parts.length) body.append(partsTable(m.parts));
    det.append(body);
    return det;
  }
  function thumb(file, max = 400, q = 0.55) {
    return new Promise((res) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res(c.toDataURL("image/jpeg", q));
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(null); };
      img.src = url;
    });
  }
  const cleanParts = (arr) => (Array.isArray(arr) ? arr : []).filter((x) => x && x.name).slice(0, 15)
    .map((x) => ({ name: String(x.name).slice(0, 80), grams: Math.round(Number(x.grams) || 0), kcal: Math.round(Number(x.kcal) || 0), protein: Math.round(Number(x.protein) || 0) }));
