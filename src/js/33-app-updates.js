  // ---- app updates (real Android app only): the app asks GitHub for the newest release and installs it ----
  function initUpdates() {
    const A = window.WeightplanAndroid;
    if (!A || typeof A.checkUpdate !== "function") return;
    $("updRow").hidden = false;
    let manual = false, latest = "", pageReady = false;
    const show = (t) => { $("updText").textContent = t; $("updBanner").hidden = false; };
    window.__wpUpdate = (kind, val) => {
      if (kind === "available") {
        latest = val;
        if (manual || lsGet(LS + "updSkip") !== val) show(`Version ${val} braucht eine neue Installation (selten, nur bei Änderungen an der Android-App). „Herunterladen“ öffnet die APK im Browser. Deine Daten bleiben erhalten.`);
        $("updInstall").textContent = "Herunterladen";
        setStatus("updStatus", `Version ${val} ist verfügbar.`);
      } else if (kind === "page") {
        // only the page changed: already downloaded, no installer needed
        latest = val; pageReady = true;
        show(`Version ${val} ist geladen. Sie gilt ab dem nächsten Start, oder sofort mit „Jetzt neu laden“.`);
        $("updInstall").textContent = "Jetzt neu laden";
        setStatus("updStatus", `Version ${val} ist geladen.`);
      } else if (kind === "current") { if (manual) setStatus("updStatus", `Du hast die neueste Version (${val}).`); }
      else if (kind === "progress") { show(`Lade Version ${latest} … ${val} %`); }
      else if (kind === "permission") { show("Erlaube Weightplan einmalig, Apps zu installieren, und geh dann zurück. Die Installation startet danach von selbst."); $("updInstall").disabled = false; }
      else if (kind === "browser") { show("Die APK wird im Browser geladen. Öffne sie danach aus den Downloads und tippe auf „Aktualisieren“."); $("updInstall").disabled = false; }
      else if (kind === "installing") { show(`Bestätige im Android-Fenster „Aktualisieren“. Danach startet Weightplan ${latest}.`); $("updInstall").disabled = false; }
      else if (kind === "error") { $("updInstall").disabled = false; if (manual || !$("updBanner").hidden) { setStatus("updStatus", val, true); if (!$("updBanner").hidden) show(val); } }
      manual = false;
    };
    const check = (m) => { manual = m; try { lsSet(LS + "updLast", String(Date.now())); A.checkUpdate(); } catch (e) {} };
    $("updCheck").onclick = () => { setStatus("updStatus", "Suche nach Updates …"); $("updStatus").after($("updBanner")); check(true); }; // result appears right below the button
    $("updLater").onclick = () => { if (latest) lsSet(LS + "updSkip", latest); $("updBanner").hidden = true; };
    $("updInstall").onclick = async () => {
      if (pageReady) { try { if (syncCfg()) await syncNow(true); } catch (e) {} try { A.reloadPage(); } catch (e) {} return; }
      $("updInstall").disabled = true; show(`Lade Version ${latest} …`);
      try { if (syncCfg()) await syncNow(true); } catch (e) {}
      try { A.installUpdate(); } catch (e) { $("updInstall").disabled = false; }
    };
    // check on start and when the app comes back, at most every 3 hours
    const auto = () => { const last = Number(lsGet(LS + "updLast") || 0); if (Date.now() - last > 3 * 3600 * 1000) check(false); };
    setTimeout(auto, 2500);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") auto(); });
  }
