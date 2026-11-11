  // ---- estimation via Claude ----
  // recent log and this week's plan, so "Rest von gestern" or "1/3 vom Curry" can be resolved
  function estContext() {
    const out = [];
    for (let i = 3; i >= 1; i--) {
      const d = addDays(curDay, -i), doc = days[d];
      const ms = ((doc && doc.meals) || []).filter((m) => !m.auto && !m.pending);
      if (ms.length) out.push(`${WDL[weekday(d)]} ${dm(d)}: ` + ms.map((m) => `${m.label} (${m.kcal} kcal, ${m.protein} g Eiweiß${m.parts && m.parts.length ? "; " + m.parts.map((p) => `${p.name} ${p.grams} g`).join(", ") : ""})`).join("; "));
    }
    const today = ((days[curDay] || {}).meals || []).filter((m) => !m.auto && !m.pending);
    if (today.length) out.push(`Heute schon eingetragen: ` + today.map((m) => `${m.label} (${m.kcal} kcal)`).join("; "));
    const plan = plans[mondayOf(curDay)], prev = plans[addDays(mondayOf(curDay), -7)];
    const dishes = [];
    [prev, plan].forEach((p) => p && [...(p.days || []).flatMap((x) => x.meals || []), ...(p.swaps || [])].forEach((m) => { if (isDish(m) && m.detail && !dishes.some((x) => x.startsWith(m.name + ":"))) dishes.push(`${m.name}: ${m.detail} (${m.kcal} kcal, ${m.protein} g Eiweiß pro Portion)`); }));
    if (dishes.length) out.push("Gerichte aus dem Wochenplan:\n" + dishes.slice(0, 14).join("\n"));
    return out.join("\n").slice(0, 3500);
  }
  function estPrompt(text, withImage) {
    const ctx = estContext();
    const who = [S.sex === "w" ? "Frau" : "Mann", S.age ? S.age + " Jahre" : "", S.heightCm ? S.heightCm + " cm" : ""].filter(Boolean).join(", ");
    return `Du schätzt Nährwerte für ein Ernährungslog (Abnehmen; ${who}).
Regeln:
- Gib für jeden Posten genau EINEN Mittelwert an, niemals Spannen.
- Gewichtsangaben gelten roh, wenn nicht anders gesagt. Fehlen Mengen, nimm übliche Portionen für einen Erwachsenen an.
- Bei Marken- oder Restaurantprodukten nutze die bekannten Herstellerangaben.
- Fasse ein Gericht als einen Posten zusammen; getrennte Lebensmittel oder Getränke als getrennte Posten.
- label: kurz und auf Deutsch, mit den wichtigsten Mengen.
${withImage ? "- Die Bilder zeigen die Mahlzeit, eventuell auch Verpackung oder Nährwerttabelle. Steht eine Nährwerttabelle drauf, nimm deren Werte für die gegessene Menge; sonst schätze die Portion aus dem Bild. Der Text ergänzt die Bilder.\n" : ""}${S.estimateHints ? "Persönliche Hinweise der Person (nur für die Schätzung):\n" + S.estimateHints.slice(0, 600) + "\n" : ""}
Antworte nur mit JSON in genau dieser Form, ohne weiteren Text:
{"seen":"${withImage ? "1 bis 3 Sätze: was du auf dem Foto erkennst und wie groß du die Portion einschätzt" : ""}","items":[{"label":"…","kcal":0,"protein":0,"parts":[{"name":"Zutat","grams":0,"kcal":0,"protein":0}]}],"note":"eine kurze Annahme, die die Schätzung am stärksten beeinflusst"}
parts: die wichtigsten Bestandteile des Postens mit geschätzter Menge in Gramm; ihre kcal und protein ergeben zusammen die Werte des Postens.

${ctx ? "Kontext (nur nutzen, wenn sich die Mahlzeit darauf bezieht, z. B. Reste, \"wie gestern\", Anteile eines Topfes):\n" + ctx + "\n\n" : ""}Mahlzeit: ${text || "(siehe Bild)"}`;
  }
  let pendingDay = null, pendingNote = "";
  // the estimate waits here until "Übernehmen"; it is kept on the device so a restart cannot lose it
  function savePreview() {
    try { if (pendingEst && pendingEst.length) localStorage.setItem("kurs:pendingEst", JSON.stringify({ items: pendingEst, note: pendingNote, day: pendingDay })); else localStorage.removeItem("kurs:pendingEst"); } catch (e) {}
  }
  function showPreview(p) {
    const items = p.items; pendingEst = items; pendingDay = p.day || curDay; pendingNote = p.note || "";
    const photo = items[0] && items[0].photo || null, seen = items[0] && items[0].seen || "";
    $("estSeenBox").hidden = !(photo || seen);
    $("estPhoto").hidden = !photo; if (photo) $("estPhoto").src = photo;
    $("estSeen").textContent = seen ? "Das sehe ich: " + seen : "";
    const ul = $("estList"); ul.innerHTML = "";
    items.forEach((it, i) => {
      const li = document.createElement("li");
      const nm = document.createElement("div"); nm.className = "mname"; nm.textContent = it.label;
      const v = document.createElement("div"); v.className = "mv"; v.textContent = `${fmt(it.kcal)} kcal\n${fmt(it.protein)} g Eiweiß`;
      const x = document.createElement("button"); x.className = "x"; x.textContent = "×"; x.setAttribute("aria-label", "Posten entfernen");
      x.onclick = () => { pendingEst.splice(i, 1); li.remove(); if (!pendingEst.length) $("estPreview").hidden = true; savePreview(); };
      li.append(nm, v, x);
      if (it.parts && it.parts.length) { const w = document.createElement("div"); w.className = "mdet"; w.append(partsTable(it.parts)); li.append(w); }
      ul.append(li);
    });
    const tk = items.reduce((a, x) => a + x.kcal, 0), tp = items.reduce((a, x) => a + x.protein, 0);
    $("estNote").textContent = `Zusammen ${fmt(tk)} kcal und ${fmt(tp)} g Eiweiß.` + (pendingNote ? " Annahme: " + pendingNote : "");
    $("estPreview").hidden = false; savePreview();
  }
  let estFailImgs = [];
  $("estFallbackBtn").onclick = async () => { const ok = await queueEstimate(estFailImgs); if (ok) { $("estFallback").hidden = true; estFailImgs = []; attachPhoto(null); } };
  async function runEstimate(images) {
    const text = $("mealText").value.trim();
    if (!text && !images.length) { setStatus("estStatus", "Beschreibe zuerst, was du gegessen hast, oder füge ein Foto hinzu.", true); return false; }
    $("sendBtn").disabled = true; $("estFallback").hidden = true; setStatus("estStatus", "Claude schätzt …");
    try {
      const opts = { modelTier: "default" };
      if (images.length) opts.images = images;
      const image = images[0];
      const res = await sample.json(estPrompt(text, !!image), opts);
      const items = (res && Array.isArray(res.items) ? res.items : []).filter((x) => x && x.label).map((x) => ({ label: String(x.label), kcal: Math.round(Number(x.kcal) || 0), protein: Math.round(Number(x.protein) || 0), parts: cleanParts(x.parts) }));
      if (!items.length) throw { code: "empty" };
      const seen = res && res.seen ? String(res.seen).slice(0, 600) : "";
      const photo = image ? await thumb(image) : null;
      if (photo || seen) { items[0].photo = photo; items[0].seen = seen; }
      if ($("mealText").value.trim() === text) $("mealText").value = ""; // sent: clear for the next entry
      journal("estimate", { date: curDay, items: items.map((x) => ({ label: String(x.label).slice(0, 120), kcal: x.kcal, protein: x.protein })) });
      showPreview({ items, note: res.note ? String(res.note) : "", day: curDay });
      setStatus("estStatus", "Prüfen und übernehmen. Einzelne Posten kannst du nach dem Übernehmen antippen und anpassen.");
      return true;
    } catch (e) {
      const c = e && e.code;
      if (c === "not_granted") { setStatus("estStatus", "Schätzen ist nicht erlaubt worden. Trag kcal und Eiweiß selbst ein.", true); sample = null; updateEntryButtons(); }
      else if (c === "bad_key") setStatus("estStatus", "Der API-Schlüssel wurde abgelehnt. Prüfe ihn im Tab Profil.", true);
      else if (c === "rate_limited") setStatus("estStatus", "Gerade zu viele Anfragen. Versuch es in einer Minute erneut.", true);
      else setStatus("estStatus", "Die Schätzung hat nicht geklappt. " + aiErr(e) + (requestMode() ? " Du kannst den Eintrag stattdessen an Claude schicken." : " Trag die Werte sonst selbst ein."), true);
      // no dead end: the same text and photos can go to Claude for the next sync
      if (c !== "not_granted" && requestMode()) { estFailImgs = images.slice(); $("estFallback").hidden = false; }
    } finally { $("sendBtn").disabled = false; }
    return false;
  }
  $("estAccept").onclick = () => { if (pendingEst && pendingEst.length) addMeals(pendingEst, pendingDay); pendingEst = null; savePreview(); $("estPreview").hidden = true; $("estSeenBox").hidden = true; $("mealText").value = ""; setStatus("estStatus", "Eingetragen."); };
  $("estDiscard").onclick = () => { pendingEst = null; savePreview(); $("estPreview").hidden = true; $("estSeenBox").hidden = true; setStatus("estStatus", ""); };

