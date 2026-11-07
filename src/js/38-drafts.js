  // ---- drafts: typed but not yet saved text survives minimizing and restarts ----
  const DRAFT_IDS = ["mealText", "manKcal", "manProt", "weight", "planPrompt", "planNotes", "canteenHabits", "planRuleNew"];
  function draftSave() {
    try {
      const d = {}; DRAFT_IDS.forEach((id) => { const e = $(id); if (e && e.value) d[id] = e.value; });
      if ($("eventDay") && $("eventDay").checked) d.eventDay = 1;
      const tab = location.hash.slice(1); if (tab) d._tab = tab;
      d._day = curDay;
      localStorage.setItem("kurs:drafts", JSON.stringify(d));
    } catch (e) {}
  }
  function draftRestore() {
    try {
      const d = JSON.parse(lsGet("kurs:drafts") || "null"); if (!d) return;
      DRAFT_IDS.forEach((id) => { const e = $(id); if (e && d[id] && !e.value) e.value = d[id]; });
      if (d.eventDay && $("eventDay") && !$("eventDay").checked) $("eventDay").checked = true;
      if (d._tab && !location.hash && VIEWS.includes(d._tab)) location.hash = "#" + d._tab;
    } catch (e) {}
  }
  document.addEventListener("input", draftSave);
  document.addEventListener("change", draftSave);
  document.addEventListener("click", () => setTimeout(draftSave, 400));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") draftSave(); });
  window.addEventListener("pagehide", draftSave);

