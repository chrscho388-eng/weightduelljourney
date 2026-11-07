  // ---- header sync button: real app syncs with GitHub directly; the claude.ai version asks Claude to run the GitHub sync ----
  let hdrTimer = null;
  function hdrMsg(t, err) { const el = $("syncHdrMsg"); el.textContent = t; el.hidden = !t; el.classList.toggle("err", !!err); clearTimeout(hdrTimer); if (t && !err) hdrTimer = setTimeout(() => { el.hidden = true; }, 15000); }
  let mcpApi = null;
  function updateSyncBtn() {
    $("syncHdr").hidden = STANDALONE ? !syncCfg() : !(mcpApi && S.syncTriggerId);
    updateEntryButtons();
    autoSyncClaude();
  }
  // claude.ai version: start the GitHub sync by itself when the page opens or comes back, at most every 2 hours,
  // so entries from the phone app show up without pressing Sync. The memory guard also covers blocked browser storage.
  const AUTO_SYNC_MS = 2 * 3600 * 1000;
  let autoSyncAt = 0;
  function autoSyncClaude() {
    if (STANDALONE || !mcpApi || !S.syncTriggerId || document.visibilityState !== "visible") return;
    const prev = Number(lsGet(LS + "autoSyncLast") || 0);
    if (Date.now() - Math.max(prev, autoSyncAt) < AUTO_SYNC_MS) return;
    autoSyncAt = Date.now(); lsSet(LS + "autoSyncLast", String(autoSyncAt));
    mcpApi.callTool("Claude Code Remote", "fire_trigger", { trigger_id: S.syncTriggerId, text: "Die Web-App hat den Abgleich beim Öffnen automatisch gestartet." }, { cache: false })
      .then(() => hdrMsg("Abgleich läuft. Einträge aus der Handy-App erscheinen in etwa 2 bis 3 Minuten."))
      .catch(() => { lsSet(LS + "autoSyncLast", String(prev)); }); // retry on the next opening; the Sync button still works
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") autoSyncClaude(); });
  $("syncHdr").onclick = async () => {
    if (STANDALONE) { syncNow(true); return; }
    const b = $("syncHdr"); b.disabled = true; hdrMsg("Starte den Abgleich mit GitHub …");
    try {
      await mcpApi.callTool("Claude Code Remote", "fire_trigger", { trigger_id: S.syncTriggerId, text: "Chris hat den Abgleich manuell über den Sync-Knopf gestartet." }, { cache: false });
      autoSyncAt = Date.now(); lsSet(LS + "autoSyncLast", String(autoSyncAt)); // a manual sync also counts for the 2-hour pause
      hdrMsg("Abgleich gestartet. In etwa 2 bis 3 Minuten erscheinen hier die Einträge aus der Handy-App, und deine Einträge von hier landen dort.");
    } catch (e) {
      hdrMsg(e && e.code === "not_granted" ? "Der Sync braucht deine Freigabe für Claude Code Remote. Tippe erneut und erlaube den Zugriff." : "Der Abgleich ließ sich nicht starten. Tippe später erneut auf Sync.", true);
    } finally { setTimeout(() => { b.disabled = false; }, 20000); }
  };
  function renderAll() { reportToday(); updateSyncBtn(); syncRemDay(); renderTop(); if (hasProfile) { renderDay(); renderWeek(); renderHistory(); renderInsights(); renderExpChart(); renderDaily(); renderPlan(); } }

