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
  }
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
  $("photoInput").onchange = (e) => { [...(e.target.files || [])].forEach((f) => attachPhoto(f)); e.target.value = ""; };
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

