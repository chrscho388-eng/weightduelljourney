  // ---- profile (data/users/<id>/profile); neutral placeholder until it loads ----
  const DEFAULTS = {
    name: "", sex: "m", age: null, heightCm: null, inclinePct: 9, speedKmh: 3.5, handrail: false, weighDay: 1,
    baseKcal: 2300, flatFactor: 0.036, inclineFactor: 0.07,
    kcalTarget: 2000, eventKcal: 3000, proteinTarget: 150,
    startDate: null, startWeightDate: null, startWeight: null, goalWeight: null, goalDate: null,
    kcalPerKg: 7000, milestones: null, estimateHints: ""
  };
  let S = { ...DEFAULTS };
  let hasProfile = false, profileKnown = false;
  // Energy model: Mifflin-St Jeor x 1.2 (sedentary); flat steps ~0.0004 kcal per kg;
  // treadmill steps via the ACSM walking formula, stride ~0.0027 x height at slow pace.
  function deriveFactors(p) {
    const kg = p.startWeight, cm = p.heightCm;
    const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === "w" ? -161 : 5);
    const v = p.speedKmh * 1000 / 60, g = (p.inclinePct || 0) / 100;
    const kcalMin = (3.5 + 0.1 * v + 1.8 * v * g) * kg / 1000 * 5;
    const stepsMin = v / (0.0027 * cm);
    return {
      baseKcal: Math.round(bmr * 1.2 / 10) * 10,
      flatFactor: Math.round(0.0004 * kg * 1000) / 1000,
      inclineFactor: Math.round(kcalMin / stepsMin * (p.handrail ? 0.95 : 1) * 1000) / 1000
    };
  }
  const milestones = () => (S.milestones && S.milestones.length > 1) ? S.milestones
    : (S.startWeightDate && S.goalDate ? [{ date: S.startWeightDate, kg: S.startWeight }, { date: S.goalDate, kg: S.goalWeight }] : []);
  const pctFmt = (p) => fmt(p, p % 1 ? 1 : 0) + " %";
