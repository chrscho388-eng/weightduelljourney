  // ---- standalone mode (outside claude.ai, e.g. GitHub Pages): browser storage + own API key ----
  const STANDALONE = !(window.claude && typeof window.claude.use === "function");
  $("autoSyncWrap").hidden = STANDALONE; // the real app syncs with GitHub itself every 5 minutes
  const LS = "kurs:";
  // append-only local journal of every entry (last 200) and backups of days the sync is about to replace
  function journal(kind, o) {
    try { let j = []; try { j = JSON.parse(localStorage.getItem("kurs:journal") || "[]"); } catch (e) {} j.push({ t: new Date().toISOString(), kind, ...o }); localStorage.setItem("kurs:journal", JSON.stringify(j.slice(-200))); } catch (e) {}
  }
  function backupDoc(k, v) {
    try { let b = []; try { b = JSON.parse(localStorage.getItem("kurs:backups") || "[]"); } catch (e) {} b.push({ t: new Date().toISOString(), k, v }); b = b.slice(-30); while (JSON.stringify(b).length > 400000 && b.length > 1) b.shift(); localStorage.setItem("kurs:backups", JSON.stringify(b)); } catch (e) {}
  }
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
