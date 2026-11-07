  // ---- boot ----
  $("pStartD").value = todayStr();
  route(); renderAll();
  draftRestore();
  try { const p = JSON.parse(lsGet("kurs:pendingEst") || "null"); if (p && Array.isArray(p.items) && p.items.length) { showPreview(p); setStatus("estStatus", "Nicht übernommener Eintrag wiederhergestellt. Prüfen und übernehmen."); } } catch (e) {}
  (async () => {
    if (STANDALONE && await photoInit()) photoMigrate();
    db = await use("db");
    const user = await use("user");
    const id = user ? await user.id() : null;
    if (!db || !id) { $("dbNotice").hidden = false; return; }
    base = db.doc("data/users/" + id + "/profile");
    base.onSnapshot((s) => {
      profileKnown = true;
      hasProfile = !!(s.exists && s.data().startWeight);
      S = { ...DEFAULTS, ...(s.exists ? s.data() : {}) };
      fillForm(); renderAll(); route();
    }, () => { $("dbNotice").hidden = false; });
    base.collection("days").onSnapshot((snap) => {
      daysLoaded = true;
      snap.docChanges().forEach((ch) => { if (ch.type === "removed") delete days[ch.doc.id]; else days[ch.doc.id] = JSON.parse(JSON.stringify(ch.doc.data())); });
      renderAll();
    }, () => { $("dbNotice").hidden = false; });
    base.collection("plans").onSnapshot((snap) => {
      snap.docChanges().forEach((ch) => { if (ch.type === "removed") delete plans[ch.doc.id]; else plans[ch.doc.id] = ch.doc.data(); });
      renderAll();
    }, () => {});
  })();
  async function initSample() {
    sample = await use("sample");
    updateSyncBtn();
    if (!sample) return;
    try { const lim = await sample.limits(); if (lim && lim.images) { sampleImages = true; updateEntryButtons(); } } catch (e) {}
  }
  initSample();
  renderChangelog();
  if (!STANDALONE) use("mcp").then((m) => { mcpApi = m; updateSyncBtn(); }).catch(() => {});
  // refresh "today" at midnight-ish when the app stays open
  let lastToday = todayStr();
  setInterval(() => { const t = todayStr(); if (t !== lastToday) { if (curDay === lastToday) curDay = t; lastToday = t; renderAll(); } }, 60000);
