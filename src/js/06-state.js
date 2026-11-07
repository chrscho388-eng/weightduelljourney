  // ---- state ----
  let db = null, sample = null, sampleImages = false, base = null;
  const days = {};      // date -> doc
  const plans = {};     // monday -> doc
  let curDay = todayStr();
  let curWeek = wkStart(curDay);
  let curPlan = mondayOf(curDay);
  let editingId = null, planFill = null;
  let pendingEst = null;

  const dayDoc = (d) => days[d] || { date: d, meals: [] };
  const intake = (doc) => (doc.meals || []).reduce((a, m) => a + (Number(m.kcal) || 0), 0);
  const protein = (doc) => (doc.meals || []).reduce((a, m) => a + (Number(m.protein) || 0), 0);
  const burn = (doc) => {
    if (doc.burnOverride) return doc.burnOverride;
    let k = 0;
    for (const [p, n] of Object.entries(stepsMap(doc))) k += n * stepFactor(Number(p));
    return Math.round((S.baseKcal + k) / 5) * 5;
  };
  const hasData = (doc) => (doc.meals && doc.meals.length) || doc.flatSteps || doc.inclineSteps || Object.keys(stepsMap(doc)).length > 0;

