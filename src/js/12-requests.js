  // ---- requests Claude answers at the next sync (no API key needed) ----
  const requestMode = () => STANDALONE ? !!syncCfg() : !!(S.syncTriggerId);
  async function queueEstimate(images) {
    const text = $("mealText").value.trim();
    if (!text && !images.length) { setStatus("estStatus", "Beschreibe zuerst, was du gegessen hast, oder füge ein Foto hinzu.", true); return false; }
    const pics = (await Promise.all(images.map((f) => thumb(f)))).filter(Boolean);
    const photo = pics[0] || null;
    saveDay(curDay, (doc) => {
      doc.meals = doc.meals || [];
      doc.meals.push({ id: uid(), label: text ? text.slice(0, 200) : "Foto", kcal: 0, protein: 0, pending: true, request: text.slice(0, 600), ...(photo ? { photo } : {}), ...(pics.length > 1 ? { photos: pics } : {}) });
      if (!doc.dayType) doc.dayType = defaultType(curDay);
    });
    $("mealText").value = "";
    setStatus("estStatus", "An Claude geschickt. Die Werte erscheinen nach dem nächsten Abgleich.");
    return true;
  }
  // photos are only attached (several, e.g. dish and nutrition label); one button sends them together with the text
  const MAX_PHOTOS = 4;
  let attached = [];
  function renderAttach() {
    const box = $("attachList"); box.innerHTML = "";
    attached.forEach((f, i) => {
      const w = document.createElement("div"); w.className = "thumb";
      const img = document.createElement("img"), u = URL.createObjectURL(f); img.onload = () => URL.revokeObjectURL(u); img.src = u; img.alt = "Foto " + (i + 1);
      const x = document.createElement("button"); x.type = "button"; x.className = "x"; x.textContent = "×"; x.setAttribute("aria-label", "Foto entfernen");
      x.onclick = () => { attached.splice(i, 1); renderAttach(); };
      w.append(img, x); box.append(w);
    });
    $("attachBox").hidden = !attached.length;
    $("attachTxt").textContent = attached.length ? `${attached.length === 1 ? "1 Foto" : attached.length + " Fotos"} angehängt. Text ergänzen, dann „${$("sendBtn").textContent}“.` : "";
    if (draftPhotosReady) draftPhotosSave();
  }
  let draftPhotosReady = false; // saving starts only after the stored draft was restored at boot
  function attachPhoto(f) {
    if (!f) { attached = []; renderAttach(); return; }
    if (attached.length >= MAX_PHOTOS) { setStatus("estStatus", "Höchstens " + MAX_PHOTOS + " Fotos pro Mahlzeit.", true); return; }
    attached.push(f); renderAttach(); setStatus("estStatus", ""); $("mealText").focus();
  }
  // estimate right away when Claude is reachable (web app or API key), otherwise ask Claude at the next sync
  $("sendBtn").onclick = async () => {
    const imgs = attached.slice();
    const ok = directNow() && (!imgs.length || sampleImages) ? await runEstimate(imgs) : requestMode() ? await queueEstimate(imgs) : false;
    if (ok) attachPhoto(null);
  };
  // attached photos survive a restart (e.g. the system ended the app while the camera was open): kept as a draft
  const b64File = (b64, name, type) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new File([u], name, { type: type || "image/jpeg" }); };
  let draftPhotoSeq = 0;
  async function draftPhotosSave() {
    const seq = ++draftPhotoSeq;
    try {
      if (!attached.length) { localStorage.removeItem("kurs:draftPhotos"); return; }
      const arr = []; for (const f of attached) { const b = await shrinkImage(f); if (b) arr.push(b); }
      if (seq === draftPhotoSeq) localStorage.setItem("kurs:draftPhotos", JSON.stringify(arr));
    } catch (e) {}
  }
  function draftPhotosRestore() {
    draftPhotosReady = true;
    try { const arr = JSON.parse(lsGet("kurs:draftPhotos") || "[]"); if (arr.length && !attached.length) { arr.slice(0, MAX_PHOTOS).forEach((b, i) => attached.push(b64File(b, "entwurf-" + (i + 1) + ".jpg"))); renderAttach(); } } catch (e) {}
  }
  // the Android app hands over photos taken while it was restarted
  function pullNativePhotos() {
    const A = window.WeightplanAndroid; if (!A || !A.takePendingPhotos) return;
    let list = []; try { list = JSON.parse(A.takePendingPhotos() || "[]"); } catch (e) { return; }
    let n = 0;
    list.forEach((u, i) => { const m = String(u).match(/^data:([^;]+);base64,(.*)$/); if (m && attached.length < MAX_PHOTOS) { attached.push(b64File(m[2], "foto-" + (i + 1) + ".jpg", m[1])); n++; } });
    if (n) { renderAttach(); if (location.hash !== "#heute") location.hash = "#heute"; setStatus("estStatus", n === 1 ? "Foto übernommen." : n + " Fotos übernommen."); }
  }
  window.__wpPhotoPoll = pullNativePhotos;
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pullNativePhotos(); });
  // a picture the app cannot read (e.g. HEIC from a file manager) is reported instead of silently dropped later
  const readable = (f) => new Promise((res) => { const img = new Image(), url = URL.createObjectURL(f); img.onload = () => { URL.revokeObjectURL(url); res(img.width > 0); }; img.onerror = () => { URL.revokeObjectURL(url); res(false); }; img.src = url; });
  $("photoInput").onchange = async (e) => {
    const files = [...(e.target.files || [])]; e.target.value = "";
    if (!files.length) { setStatus("estStatus", "Es kam kein Foto an. Versuch es über die Galerie oder die Kamera.", true); return; }
    let bad = 0;
    for (const f of files) { if (await readable(f)) attachPhoto(f); else bad++; }
    if (bad) setStatus("estStatus", (bad === 1 ? "Ein Foto konnte" : bad + " Fotos konnten") + " nicht gelesen werden (Format wird nicht unterstützt, z. B. HEIC). Speichere es als JPG oder nimm es über Galerie oder Kamera.", true);
  };
  const sendModeGet = () => { try { return localStorage.getItem("kurs:sendMode") === "claude" ? "claude" : "direct"; } catch (e) { return "direct"; } };
  // with an API key and GitHub sync both ways work: let the user pick (remembered on the device)
  const directNow = () => !!sample && !(STANDALONE && requestMode() && sendModeGet() === "claude");
  document.querySelectorAll("[data-send-mode]").forEach((c) => c.onclick = () => { try { localStorage.setItem("kurs:sendMode", c.dataset.sendMode); } catch (e) {} updateEntryButtons(); if (medit && hasProfile) renderDay(); });
  function updateEntryButtons() {
    const rq = requestMode(), direct = directNow();
    $("sendMode").hidden = !(STANDALONE && sample && rq);
    document.querySelectorAll("[data-send-mode]").forEach((c) => c.classList.toggle("on", c.dataset.sendMode === sendModeGet()));
    // plan tab: same switch, one button (direct = compute now, else queue for Claude at the next sync)
    $("planSendMode").hidden = !(STANDALONE && sample && rq);
    $("planAsk").hidden = !(sample || rq); $("planAdjustBtn").hidden = !direct; $("planLaterBtn").hidden = direct || !rq;
    $("sendBtn").hidden = !(direct || rq);
    $("sendBtn").textContent = direct ? "Schätzen" : "An Claude senden";
    $("photoAdd").hidden = !((direct && sampleImages) || rq);
    $("askHint").hidden = direct || !rq;
    pasteHintUpd(); renderAttach();
  }
  function addMeals(items, date) {
    const day = date || curDay;
    saveDay(day, (doc) => {
      doc.meals = doc.meals || [];
      if (!doc.dayType) doc.dayType = defaultType(day);
      items.forEach((it) => doc.meals.push({ id: uid(), label: String(it.label).slice(0, 300), kcal: Math.round(Number(it.kcal) || 0), protein: Math.round(Number(it.protein) || 0), ...(it.fromPlan ? { fromPlan: it.fromPlan } : {}), ...(it.photo ? { photo: it.photo } : {}), ...(it.seen ? { seen: String(it.seen).slice(0, 600) } : {}), ...(it.parts && it.parts.length ? { parts: it.parts } : {}) }));
    });
  }

