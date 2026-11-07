  // ---- canteen: weekly menu photo -> best choice on office days ----
  const canteenWish = (habits) => `Das Kantinen-Menü dieser Woche ist da (Bild). Plane für jeden Bürotag ab heute das Mittagessen in der Kantine: wähle aus dem Menü die beste Kombination nach den Kantinen-Gewohnheiten, mit möglichst viel Eiweiß und passenden kcal. Mahlzeit mit slot "Mittag (Kantine)", name = die gewählten Gerichte vom Menü, detail = Portionen und eine gute Alternative vom Menü, kcal und protein als Mittelwerte, cook false. Gleiche den Rest des Tages so aus, dass die Tagesziele möglichst halten. Bürotage laut Hinweisen und Plan (type Büro); Tage ohne Kantine nicht ändern.${habits ? " Kantinen-Gewohnheiten: " + habits : ""}`;
  $("canteenHabitsSave").onclick = async () => {
    const txt = $("canteenHabits").value.trim().slice(0, 1000);
    setStatus("canteenStatus", (await saveProfile({ canteenHabits: txt })) ? "Gespeichert." : "Speichern fehlgeschlagen.", false);
  };
  async function sendCanteen(file) {
    if (!base) { setStatus("canteenStatus", "Speicher nicht erreichbar.", true); return; }
    const direct = !!(sample && sampleImages), later = requestMode();
    if (!direct && !later) { setStatus("canteenStatus", "Dafür braucht die App Claude: einen API-Schlüssel oder den Abgleich mit GitHub.", true); return; }
    const week = curPlan, habits = $("canteenHabits").value.trim().slice(0, 1000);
    $("canteenLabel").classList.add("disabled"); setStatus("canteenStatus", "Menü wird gespeichert …");
    try {
      if (habits !== (S.canteenHabits || "")) await saveProfile({ canteenHabits: habits });
      const cur = plans[week] && !plans[week].deleted ? plans[week] : { days: [], swaps: [] };
      const wish = canteenWish(habits);
      const next = { ...JSON.parse(JSON.stringify(cur)), canteenAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (!direct) next.planChange = (cur.planChange ? cur.planChange + " | " : "") + wish;
      // keep the menu readable but small enough for the database; retry smaller if the save is refused
      let saved = false;
      for (const [max, q] of [[1100, 0.6], [800, 0.5]]) {
        const img = await thumb(file, max, q);
        if (img) next.canteenMenu = img;
        try { await base.collection("plans").doc(week).set(next); saved = true; break; } catch (e) {}
      }
      if (!saved) throw new Error("save");
      plans[week] = next;
      if (!direct) { setStatus("canteenStatus", "An Claude geschickt. Der Plan mit Kantinen-Essen kommt beim nächsten Abgleich."); renderPlan(); return; }
      setStatus("canteenStatus", "Claude liest das Menü und plant die Bürotage …");
      const res = await sample.json(planPrompt(wish, week, cur.days && cur.days.length ? cur : null), { modelTier: "default", images: [file] });
      const plan = cleanPlan(res && res.plan, week);
      if (!plan.days.length) throw { code: "empty" };
      pendingPlan = { week, plan, wish: "Kantinen-Menü eingeplant" };
      $("planSummary").textContent = res.summary ? String(res.summary).slice(0, 600) : "Vorschlag erstellt.";
      setStatus("canteenStatus", "Vorschlag unten prüfen und übernehmen."); renderPlan();
    } catch (e) {
      const c = e && e.code;
      setStatus("canteenStatus", c === "not_granted" ? "Claude-Nutzung wurde nicht erlaubt." : c === "rate_limited" ? "Gerade zu viele Anfragen. Versuch es in einer Minute erneut." : c === "bad_key" ? "Der API-Schlüssel wurde abgelehnt. Prüfe ihn im Tab Profil." : c ? "Das Menü konnte nicht ausgewertet werden. Versuch ein schärferes Foto." : "Speichern fehlgeschlagen.", true);
    } finally { $("canteenLabel").classList.remove("disabled"); }
  }
  $("canteenInput").onchange = (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) sendCanteen(f); };
  // Strg+V with an image (e.g. a fresh screenshot): Plan tab -> canteen menu, Heute tab -> meal photo
  document.addEventListener("paste", (e) => {
    const item = [...((e.clipboardData && e.clipboardData.items) || [])].find((it) => it.kind === "file" && it.type.startsWith("image/"));
    const f = item && item.getAsFile();
    if (!f) return;
    const view = (document.querySelector("[data-view]:not([hidden])") || {}).id;
    if (view === "view-plan" && !$("canteenLabel").hidden) { e.preventDefault(); sendCanteen(f); }
    else if (view === "view-heute" && !$("photoAdd").hidden) { e.preventDefault(); attachPhoto(f); }
  });
  function pasteHintUpd() { $("pasteHint").hidden = $("photoAdd").hidden; }
  $("planAccept").onclick = async () => {
    if (!pendingPlan || !base) return;
    const { week, plan, wish } = pendingPlan;
    const prev = plans[week] || null;
    const keep = prev && prev.canteenMenu ? { canteenMenu: prev.canteenMenu, canteenAt: prev.canteenAt } : {};
    const doc = { ...plan, ...keep, updatedAt: new Date().toISOString(), lastWish: wish.slice(0, 300) };
    $("planAccept").disabled = true;
    try {
      await base.collection("plans").doc(week).set(doc);
      plans[week] = doc; lastPlan = { week, plan: prev };
      pendingPlan = null; $("planPrompt").value = "";
      setStatus("planStatus", "Plan gespeichert.");
    } catch (e) { setStatus("planStatus", "Speichern fehlgeschlagen (" + (e && e.code || "Fehler") + ").", true); }
    finally { $("planAccept").disabled = false; renderAll(); }
  };
  $("planDiscard").onclick = () => { pendingPlan = null; setStatus("planStatus", "Vorschlag verworfen."); renderPlan(); };
  $("planUndo").onclick = async () => {
    if (!lastPlan || !base) return;
    const { week, plan } = lastPlan;
    try {
      const now = new Date().toISOString();
      if (plan) { const back = { ...plan, updatedAt: now }; await base.collection("plans").doc(week).set(back); plans[week] = back; }
      else { const gone = { days: [], swaps: [], deleted: true, updatedAt: now }; await base.collection("plans").doc(week).set(gone); plans[week] = gone; }
      lastPlan = null; setStatus("planStatus", "Änderung rückgängig gemacht.");
    } catch (e) { setStatus("planStatus", "Rückgängig fehlgeschlagen (" + (e && e.code || "Fehler") + ").", true); }
    renderAll();
  };

