  // ---- GitHub sync (standalone only): one JSON file, newest updatedAt per document wins ----
  const SYNC_FILE = "weightplan.json", USER_ROOT = "data/users/local/";
  let syncTimer = null, syncing = false, syncAgain = false;
  const syncCfg = () => { const r = lsGet(LS + "syncRepo"), t = lsGet(LS + "syncToken"); return r && t ? { repo: r, token: t } : null; };
  let writeSeq = 0, retryT = null, retryN = 0, syncWarn = "";
  function onLocalWrite() { if (!STANDALONE || !syncCfg() || applyingRemote) return; writeSeq++; if (!lsGet(LS + "dirtyAt")) lsSet(LS + "dirtyAt", new Date().toISOString()); clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 800); }
  // visible warning: entries not yet on GitHub (more than 20 s) or entries the sync removed
  function updateUnsynced() {
    const el = $("unsynced"); if (!el) return;
    const d = STANDALONE && syncCfg() ? lsGet(LS + "dirtyAt") : null, late = d && Date.now() - Date.parse(d) > 20000;
    el.hidden = !(late || syncWarn); el.textContent = syncWarn ? "⚠ " + syncWarn : late ? "⚠ Einträge noch nicht hochgeladen" : "";
  }
  setInterval(updateUnsynced, 5000);
  let applyingRemote = false;
  const b64enc = (str) => { const bytes = new TextEncoder().encode(str); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const b64dec = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
  function localDocs() {
    const out = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(LS + USER_ROOT)) out[k.slice((LS + USER_ROOT).length)] = JSON.parse(localStorage.getItem(k)); } } catch (e) {}
    return out;
  }
  async function gh(cfg, method, body, raw, file) {
    return fetch(`https://api.github.com/repos/${cfg.repo}/contents/${file || SYNC_FILE}`, {
      method, cache: "no-store",
      headers: { Authorization: "Bearer " + cfg.token, Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  }
  // photos referenced in the documents go to photos/<id>.jpg once; missing ones are fetched on demand
  async function photosUpload(cfg, docs) {
    if (!photoIdb) return;
    let up = []; try { up = JSON.parse(lsGet(LS + "photosUp") || "[]"); } catch (e) {}
    const done = new Set(up), need = [...photoRefs(docs, new Set())].filter((id) => !done.has(id) && photoMem.has(id));
    for (const id of need) {
      const data = photoMem.get(id), b64 = data.split(",")[1] || "";
      try {
        const w = await gh(cfg, "PUT", { message: "Foto " + id, content: b64 }, false, "photos/" + id + ".jpg");
        if (w.ok || w.status === 422) done.add(id); // 422: file is already there
      } catch (e) { break; }
    }
    lsSet(LS + "photosUp", JSON.stringify([...done]));
  }
  const photoLoading = new Set();
  async function photoFetch(id) {
    const cfg = syncCfg();
    if (!cfg || !photoIdb || photoLoading.has(id) || photoMem.has(id)) return;
    photoLoading.add(id);
    try {
      const r = await gh(cfg, "GET", null, false, "photos/" + id + ".jpg");
      if (r.ok) { const j = await r.json(); if (j.content) { photoPut(id, "data:image/jpeg;base64," + j.content.replace(/\s/g, "")); db && db.reloadAll && db.reloadAll(); } }
    } catch (e) {} finally { photoLoading.delete(id); }
  }
  async function syncNow(manual) {
    const cfg = syncCfg(); if (!cfg) return;
    if (syncing) { syncAgain = true; return; }
    const say = (t, err) => { setStatus("syncStatus", t, err); if (manual === true) hdrMsg(t, err); };
    syncing = true; say("Synchronisiere …"); const seq0 = writeSeq;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        let sha = null, remote = {};
        const r = await gh(cfg, "GET");
        if (r.status === 401 || r.status === 403) throw "Zugangsschlüssel abgelehnt. Prüfe Schlüssel und Repo-Rechte (Contents: Lesen und Schreiben).";
        if (r.ok) {
          const j = await r.json(); sha = j.sha;
          let text = j.content ? b64dec(j.content) : "";
          if (!text) { const rr = await gh(cfg, "GET", null, true); text = rr.ok ? await rr.text() : ""; }
          if (text) { const parsed = JSON.parse(text); remote = parsed && parsed.docs || {}; }
        } else if (r.status !== 404) throw "GitHub antwortet nicht wie erwartet (" + r.status + ").";
        const local = localDocs(), merged = {};
        let localChanged = false, remoteChanged = false;
        new Set([...Object.keys(local), ...Object.keys(remote)]).forEach((k) => {
          const a = local[k], b = remote[k];
          let pick = !a ? b : !b ? a : k.startsWith("profile/days/") ? mergeDay(a, b) : ((b.updatedAt || "") > (a.updatedAt || "") ? b : a);
          pick = photosOut(pick);
          merged[k] = pick;
          const same = (x) => x && JSON.stringify(x) === JSON.stringify(pick);
          if (!same(a)) localChanged = true;
          if (!same(b)) remoteChanged = true;
        });
        const dropped = [];
        Object.entries(merged).forEach(([k, v]) => { if (k.startsWith("profile/days/") && local[k]) { const ids = new Set((v.meals || []).map((m) => m.id)); (local[k].meals || []).forEach((m) => { if (!ids.has(m.id)) dropped.push(k.slice(-10) + " " + String(m.label).slice(0, 40)); }); } });
        if (dropped.length) { journal("drop", { items: dropped.slice(0, 10) }); syncWarn = "Abgleich hat " + dropped.length + " Eintrag/Einträge entfernt: " + dropped.slice(0, 3).join("; "); } else syncWarn = "";
        if (localChanged) {
          Object.keys(merged).forEach((k) => { if (k.startsWith("profile/days/") && local[k] && JSON.stringify(merged[k]) !== JSON.stringify(local[k])) backupDoc(k, local[k]); });
          applyingRemote = true;
          Object.entries(merged).forEach(([k, v]) => { if (JSON.stringify(v) !== JSON.stringify(local[k])) lsSet(LS + USER_ROOT + k, JSON.stringify(v)); });
          applyingRemote = false;
          db && db.reloadAll && db.reloadAll();
        }
        await photosUpload(cfg, merged);
        if (remoteChanged || !sha) {
          const body = { message: "Weightplan-Sync " + new Date().toISOString(), content: b64enc(JSON.stringify({ app: "weightplan", updatedAt: new Date().toISOString(), docs: merged })), ...(sha ? { sha } : {}) };
          const w = await gh(cfg, "PUT", body);
          if (w.status === 409 || w.status === 422) continue; // someone else wrote in between: merge again
          if (!w.ok) throw "Hochladen fehlgeschlagen (" + w.status + ").";
        }
        lsSet(LS + "syncLast", new Date().toISOString());
        if (writeSeq === seq0) { try { localStorage.removeItem(LS + "dirtyAt"); } catch (e) {} } retryN = 0; updateUnsynced();
        say("Synchronisiert um " + new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + ".");
        break;
      }
    } catch (e) {
      say(typeof e === "string" ? e : "Keine Verbindung zu GitHub. Deine Einträge sind lokal gespeichert und werden später übertragen.", true);
      clearTimeout(retryT); retryN = Math.min(retryN + 1, 5); retryT = setTimeout(syncNow, Math.min(300000, 10000 * 2 ** (retryN - 1))); updateUnsynced();
    } finally {
      syncing = false;
      if (syncAgain) { syncAgain = false; setTimeout(syncNow, 500); }
    }
  }

  if (STANDALONE) {
    if (lsGet(LS + "syncRepo")) $("syncRepo").value = lsGet(LS + "syncRepo");
    if (lsGet(LS + "syncToken")) $("syncToken").placeholder = "gespeichert";
    $("syncSave").onclick = () => {
      const repo = $("syncRepo").value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/$/, ""), tok = $("syncToken").value.trim();
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { setStatus("syncStatus", "Repo bitte als besitzer/name angeben.", true); return; }
      if (!tok && !lsGet(LS + "syncToken")) { setStatus("syncStatus", "Bitte den Zugangsschlüssel eintragen.", true); return; }
      lsSet(LS + "syncRepo", repo); if (tok) lsSet(LS + "syncToken", tok);
      $("syncToken").value = ""; $("syncToken").placeholder = "gespeichert";
      updateSyncBtn(); syncNow(true);
    };
    $("syncNowBtn").onclick = () => syncNow(true);
    $("syncOff").onclick = () => { try { localStorage.removeItem(LS + "syncToken"); localStorage.removeItem(LS + "syncRepo"); } catch (e) {} $("syncRepo").value = ""; $("syncToken").placeholder = "github_pat_…"; setStatus("syncStatus", "Sync getrennt. Deine Daten bleiben auf diesem Gerät."); updateSyncBtn(); };
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
    setInterval(syncNow, 5 * 60 * 1000);
    setTimeout(syncNow, 800);
    $("dataBox").hidden = false; $("verBox").hidden = false;
    try { const v = window.WeightplanAndroid && window.WeightplanAndroid.getVersion ? window.WeightplanAndroid.getVersion() : ""; if (v) { $("appVersion").textContent = "App-Version " + v; $("appVersion").hidden = false; } } catch (e) {}
    initUpdates(); initReminders();
    $("profilIntro").textContent = "Deine Angaben und Einträge bleiben auf diesem Gerät. Niemand sonst sieht sie.";
    if (lsGet(LS + "apiKey")) $("apiKey").placeholder = "gespeichert";
    $("keySave").onclick = () => {
      const k = $("apiKey").value.trim();
      if (!k.startsWith("sk-")) { setStatus("keyStatus", "Das sieht nicht nach einem API-Schlüssel aus (beginnt mit sk-).", true); return; }
      lsSet(LS + "apiKey", k); $("apiKey").value = ""; $("apiKey").placeholder = "gespeichert";
      setStatus("keyStatus", "Gespeichert. Schätzung, Plan anpassen und Rezepte sind jetzt verfügbar."); initSample();
    };
    $("keyClear").onclick = () => {
      try { localStorage.removeItem(LS + "apiKey"); } catch (e) {}
      $("apiKey").placeholder = "sk-ant-…"; setStatus("keyStatus", "Schlüssel entfernt."); initSample();
    };
    $("exportBtn").onclick = () => {
      const out = {};
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(LS + "data/")) out[k.slice(LS.length)] = JSON.parse(localStorage.getItem(k)); } } catch (e) {}
      const text = JSON.stringify({ app: "kurs", exportedAt: new Date().toISOString(), docs: out }, null, 1);
      const name = "weightplan-sicherung-" + todayStr() + ".json";
      if (window.WeightplanAndroid) { // Android app: save through the native bridge into Downloads
        const where = window.WeightplanAndroid.saveFile(name, text);
        setStatus("ioStatus", where ? `${Object.keys(out).length} Einträge gesichert: ${where}` : "Sichern fehlgeschlagen.", !where);
        return;
      }
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name;
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setStatus("ioStatus", Object.keys(out).length + " Einträge gesichert.");
    };
    $("importInput").onchange = async (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        if (!j || j.app !== "kurs" || typeof j.docs !== "object") throw 0;
        Object.entries(j.docs).forEach(([k, v]) => { if (k.startsWith("data/")) lsSet(LS + k, JSON.stringify(v)); });
        setStatus("ioStatus", Object.keys(j.docs).length + " Einträge geladen.");
        db && db.reloadAll && db.reloadAll();
      } catch (err) { setStatus("ioStatus", "Die Datei ist keine Weightplan-Sicherung.", true); }
    };
  }

