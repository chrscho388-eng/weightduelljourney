  // ---- writes: one at a time per doc ----
  const chains = {};
  function saveDay(date, mutate) {
    const had = new Set((dayDoc(date).meals || []).map((m) => m.id));
    const doc = JSON.parse(JSON.stringify(dayDoc(date)));
    mutate(doc);
    doc.date = date;
    doc.updatedAt = new Date().toISOString();
    (doc.meals || []).filter((m) => !had.has(m.id)).forEach((m) => journal("add", { date, id: m.id, label: String(m.label).slice(0, 120), kcal: m.kcal, protein: m.protein }));
    days[date] = doc;
    renderAll();
    if (!base) { setStatus("saveStatus", "Nicht gespeichert: Speicher nicht erreichbar.", true); return; }
    const put = async () => {
      // never write over what is stored right now: meals that exist there but not in this copy stay (only "removed" deletes)
      let out = doc;
      try {
        const st = (await base.collection("days").doc(date).get()).data();
        if (st && Array.isArray(st.meals)) {
          const have = new Set((doc.meals || []).map((m) => m.id)), gone = new Set(doc.removed || []);
          const extra = st.meals.filter((m) => !isFx(m) && !have.has(m.id) && !gone.has(m.id));
          if (extra.length) { out = { ...doc, meals: [...(doc.meals || []), ...extra] }; days[date] = out; journal("keep", { date, n: extra.length }); renderAll(); }
        }
      } catch (e) {}
      await base.collection("days").doc(date).set(out);
    };
    chains[date] = (chains[date] || Promise.resolve()).then(put)
      .then(() => setStatus("saveStatus", "Gespeichert"))
      .catch(async (e) => {
        if (e && e.code === "invalid_argument") $("roNotice").hidden = false;
        journal("fail", { date, code: e && e.code });
        setStatus("saveStatus", "Speichern fehlgeschlagen (" + (e && e.code || "Fehler") + "). Neuer Versuch folgt.", true);
        await new Promise((r) => setTimeout(r, 3000));
        try { await put(); setStatus("saveStatus", "Gespeichert"); } catch (e2) { setStatus("saveStatus", "NICHT gespeichert (" + (e2 && e2.code || "Fehler") + "). Bitte den Eintrag noch einmal machen.", true); }
      });
  }
  // delete a meal, remember it for the merge and offer a short undo
  let undoT = null;
  function deleteMeal(date, m) {
    const before = ((dayDoc(date).meals) || []).findIndex((y) => y.id === m.id);
    saveDay(date, (doc) => {
      doc.meals = (doc.meals || []).filter((y) => y.id !== m.id);
      if (isFx(m)) doc.fixedOff = [...new Set([...(doc.fixedOff || []), m.id])]; else doc.removed = [...new Set([...(doc.removed || []), m.id])].slice(-100);
    });
    const t = $("toast"); $("toastText").textContent = `„${m.label}“ gelöscht.`; t.hidden = false;
    clearTimeout(undoT); undoT = setTimeout(() => { t.hidden = true; }, 8000);
    $("toastUndo").onclick = () => {
      clearTimeout(undoT); t.hidden = true;
      saveDay(date, (doc) => {
        doc.meals = doc.meals || [];
        if (!doc.meals.some((y) => y.id === m.id)) doc.meals.splice(Math.max(0, Math.min(before, doc.meals.length)), 0, m);
        doc.removed = (doc.removed || []).filter((id) => id !== m.id); if (!doc.removed.length) delete doc.removed;
        if (isFx(m)) { delete doc.coffeeOff; doc.fixedOff = (doc.fixedOff || []).filter((id) => id !== m.id); if (!doc.fixedOff.length) delete doc.fixedOff; }
      });
    };
  }
  function setStatus(id, txt, err) { const el = $(id); el.textContent = txt || ""; el.classList.toggle("err", !!err); }

