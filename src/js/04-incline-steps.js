  // ---- steps per incline: the profile lists the inclines (0 % is always there), a day keeps steps: {"<pct>": n} ----
  // Older days only have flatSteps (0 %) and inclineSteps (at S.inclinePct); new saves fill those too, for older app versions.
  const inclineList = () => [...new Set((Array.isArray(S.inclines) ? S.inclines : [S.inclinePct || 9]).map(Number).filter((x) => x > 0))].sort((a, b) => a - b);
  const restIncline = () => Math.max(0, ...inclineList()); // the steps still missing to the goal are planned at the highest incline
  function stepsMap(d) {
    const m = {};
    const f = Number(d && d.flatSteps) || 0, i = Number(d && d.inclineSteps) || 0, ip = Number(S.inclinePct) || 0;
    if (d && d.steps && typeof d.steps === "object") {
      for (const [k, v] of Object.entries(d.steps)) { const n = Number(v) || 0; if (n > 0) m[Number(k)] = n; }
      const inc = Object.entries(m).reduce((a, [p, n]) => a + (Number(p) > 0 ? n : 0), 0);
      if ((m[0] || 0) === f && inc === i) return m;
      for (const k of Object.keys(m)) delete m[k]; // the plain fields were changed without "steps" (older app, Claude): they win
    }
    if (f) m[0] = f;
    if (i) m[ip] = (m[ip] || 0) + i;
    return m;
  }
  function setSteps(d, pct, v) {
    const m = stepsMap(d);
    if (v) m[pct] = v; else delete m[pct];
    if (Object.keys(m).length) d.steps = m; else delete d.steps;
    const inc = Object.entries(m).reduce((a, [p, n]) => a + (Number(p) > 0 ? n : 0), 0);
    d.flatSteps = m[0] || null; d.inclineSteps = inc || null;
  }
  // kcal per step: 0 % = walking factor, the profile's incline = its stored factor (unchanged results for older days),
  // any other incline via the same walking formula (or in proportion when the profile lacks height or age)
  function stepFactor(pct) {
    if (!pct) return S.flatFactor;
    if (pct === Number(S.inclinePct)) return S.inclineFactor;
    if (S.startWeight && S.heightCm && S.age && S.speedKmh) return deriveFactors({ ...S, inclinePct: pct }).inclineFactor;
    return S.flatFactor + (S.inclineFactor - S.flatFactor) * pct / (Number(S.inclinePct) || 9);
  }

