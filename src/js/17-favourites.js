  // ---- favourites: pinned meals (profile.favorites) plus meals logged often in the last 30 days ----
  let favEditing = false;
  const favKey = (l) => String(l || "").trim().toLowerCase();
  async function saveProfile(patch) {
    if (!base) return false;
    const next = { ...S, ...patch, updatedAt: new Date().toISOString() };
    try { await base.set(next); S = next; renderAll(); return true; } catch (e) { return false; }
  }
  const isFav = (m) => (S.favorites || []).some((f) => favKey(f.label) === favKey(m.label));
  function toggleFav(m) {
    const favs = (S.favorites || []).slice();
    const i = favs.findIndex((f) => favKey(f.label) === favKey(m.label));
    if (i >= 0) favs.splice(i, 1);
    else favs.push({ label: String(m.label).slice(0, 200), kcal: Math.round(+m.kcal || 0), protein: Math.round(+m.protein || 0) });
    saveProfile({ favorites: favs.slice(0, 20) });
  }
  function frequentMeals() {
    const cnt = {}, from = addDays(todayStr(), -30);
    Object.values(days).forEach((d) => {
      if (d.date < from) return;
      (d.meals || []).forEach((m) => {
        if (m.auto || m.pending || m.fromPlan || !m.label) return;
        const k = favKey(m.label); cnt[k] = { m, n: (cnt[k] ? cnt[k].n : 0) + 1 };
      });
    });
    return Object.values(cnt).filter((x) => x.n >= 2 && !isFav(x.m)).sort((a, b) => b.n - a.n).slice(0, 6).map((x) => x.m);
  }
  let favAdded = null, favAddedT = null;
  function renderFavs() {
    const favs = S.favorites || [], freq = favEditing ? [] : frequentMeals();
    if (!favs.length) favEditing = false;
    $("favWrap").hidden = !favs.length && !freq.length;
    const fc = $("favChips"); fc.innerHTML = "";
    const chip = (m, cls, add) => {
      const c = document.createElement("button"); c.type = "button"; c.className = "chip fav" + cls;
      c.textContent = (favEditing ? "× " : "") + `${m.label} · ${fmt(m.kcal)}`;
      c.title = favEditing ? "Aus Favoriten entfernen" : `${m.label}: ${fmt(m.kcal)} kcal, ${fmt(m.protein)} g Eiweiß eintragen`;
      c.onclick = () => { if (favEditing) toggleFav(m); else if (add) { addMeals([{ label: m.label, kcal: m.kcal, protein: m.protein, ...(m.parts && m.parts.length ? { parts: m.parts } : {}) }]); setStatus("estStatus", ""); favAdded = m.label; } };
      fc.append(c);
    };
    favs.forEach((f) => chip(f, "", true));
    freq.forEach((m) => chip(m, " freq", true));
    $("favEdit").hidden = !favs.length; $("favEdit").textContent = favEditing ? "Fertig" : "Bearbeiten";
    if (favAdded && !favEditing) { $("favHint").textContent = `„${favAdded}“ eingetragen. Tippe oben in der Liste auf den Eintrag, um Menge oder Zutaten anzupassen.`; clearTimeout(favAddedT); favAddedT = setTimeout(() => { favAdded = null; renderFavs(); }, 15000); return; }
    $("favHint").textContent = favEditing ? "Tipp auf einen Favoriten, um ihn zu entfernen." : favs.length ? (freq.length ? "Gestrichelt: oft gegessen. Mit ☆ bei einer Mahlzeit heftest du sie an." : "") : "Oft gegessen. Mit ☆ bei einer Mahlzeit heftest du sie dauerhaft an.";
  }
  $("favEdit").onclick = () => { favEditing = !favEditing; renderFavs(); };

