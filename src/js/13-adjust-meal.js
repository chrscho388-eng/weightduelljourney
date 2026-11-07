  // ---- adjust a logged meal in place: amount, single ingredients, or a described change ----
  let medit = null;
  const GRAM_RE = /(\d+(?:[.,]\d+)?)\s?g\b/g;
  function mEditStart(m) {
    const grams = [...String(m.label).matchAll(GRAM_RE)];
    return { id: m.id, day: curDay, label: m.label, kcal: m.kcal, protein: m.protein, orig: { kcal: m.kcal, protein: m.protein, label: m.label },
      parts: (m.parts || []).map((pt) => ({ ...pt, g0: pt.grams, k0: pt.kcal, p0: pt.protein, gone: false })),
      g0: grams.length === 1 ? Number(grams[0][1].replace(",", ".")) : null, g: null, pct: 100, change: "" };
  }
  // recompute totals from the edited amounts (parts scale linearly with their grams)
  function mEditCalc(e) {
    if (e.parts.length) {
      let dk = 0, dp = 0;
      e.parts.forEach((pt) => {
        const f = pt.gone ? 0 : pt.g0 > 0 ? (Number(pt.grams) || 0) / pt.g0 : 1;
        pt.kcal = Math.round(pt.k0 * f); pt.protein = Math.round(pt.p0 * f);
        dk += pt.kcal - pt.k0; dp += pt.protein - pt.p0;
      });
      e.kcal = Math.max(0, Math.round(e.orig.kcal + dk)); e.protein = Math.max(0, Math.round(e.orig.protein + dp));
    } else if (e.g0 && e.g != null) {
      const f = (Number(e.g) || 0) / e.g0;
      e.kcal = Math.round(e.orig.kcal * f); e.protein = Math.round(e.orig.protein * f);
      e.label = e.orig.label.replace(GRAM_RE, (all, n) => fmt(Number(e.g) || 0) + all.slice(n.length));
    } else {
      const f = (Number(e.pct) || 0) / 100;
      e.kcal = Math.round(e.orig.kcal * f); e.protein = Math.round(e.orig.protein * f);
    }
  }
  function mEditBox(m) {
    const e = medit, box = document.createElement("div"); box.className = "medit";
    const direct = directNow(), rq = requestMode();
    const row = (cls, html) => { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; return d; };
    box.append(row("row", `<input type="text" data-me="label" aria-label="Bezeichnung" value="${esc(e.label)}"><input type="number" inputmode="numeric" min="0" data-me="kcal" aria-label="kcal" value="${e.kcal}"><input type="number" inputmode="numeric" min="0" data-me="protein" aria-label="Eiweiß (g)" value="${e.protein}">`));
    box.append(row("small muted", "Oben die Bezeichnung, darunter kcal und Eiweiß (g)."));
    if (e.parts.length) {
      box.append(row("small label", "Zutaten anpassen"));
      e.parts.forEach((pt, i) => box.append(row("prow" + (pt.gone ? " gone" : ""), `<span class="pn">${esc(pt.name)}</span><input type="number" inputmode="numeric" min="0" step="5" data-pg="${i}" aria-label="Gramm ${esc(pt.name)}" value="${pt.gone ? 0 : pt.grams}"${pt.gone ? " disabled" : ""}><button type="button" class="chip" data-px="${i}">${pt.gone ? "wieder rein" : "weggelassen"}</button>`)));
    } else if (e.g0) {
      box.append(row("prow", `<span class="pn">Menge statt ${fmt(e.g0)} g</span><input type="number" inputmode="numeric" min="0" step="5" data-me="g" aria-label="Menge in Gramm" value="${e.g ?? e.g0}"><span class="small muted">g</span>`));
    } else {
      box.append(row("prow", `<span class="pn">Portion</span><input type="number" inputmode="numeric" min="0" step="10" data-me="pct" aria-label="Portion in Prozent" value="${e.pct}"><span class="small muted">%</span>`));
    }
    if (direct || rq) box.append(row("", `<textarea data-me="change" rows="2" placeholder="Oder beschreiben, was anders war, z. B. ohne Feta, dafür 50 g Reis mehr">${esc(e.change)}</textarea><div class="btnrow" style="margin-top:6px"><button type="button" class="btn ghost" data-ma="ask">${direct ? "Neu schätzen" : "An Claude senden"}</button></div>`));
    box.append(row("btnrow", `<button type="button" class="btn" data-ma="save">Speichern</button><button type="button" class="btn ghost" data-ma="cancel">Abbrechen</button>`));
    const st = row("status small", ""); box.append(st);
    const sync = () => { box.querySelector('[data-me="kcal"]').value = e.kcal; box.querySelector('[data-me="protein"]').value = e.protein; box.querySelector('[data-me="label"]').value = e.label; };
    box.querySelectorAll("[data-me]").forEach((inp) => inp.oninput = () => {
      const k = inp.dataset.me; e[k] = inp.value;
      if (k === "g" || k === "pct") { mEditCalc(e); sync(); }
      if (k === "kcal" || k === "protein") e[k] = Number(inp.value) || 0;
    });
    box.querySelectorAll("[data-pg]").forEach((inp) => inp.oninput = () => { e.parts[+inp.dataset.pg].grams = Number(inp.value) || 0; mEditCalc(e); sync(); });
    box.querySelectorAll("[data-px]").forEach((b) => b.onclick = () => { const pt = e.parts[+b.dataset.px]; pt.gone = !pt.gone; if (!pt.gone && !pt.grams) pt.grams = pt.g0; mEditCalc(e); renderDay(); });
    box.querySelector('[data-ma="cancel"]').onclick = () => { medit = null; renderDay(); };
    box.querySelector('[data-ma="save"]').onclick = () => {
      const label = String(e.label).trim() || e.orig.label, id = e.id, day = e.day;
      const parts = e.parts.length ? e.parts.filter((pt) => !pt.gone).map((pt) => ({ name: pt.name, grams: Math.round(Number(pt.grams) || 0), kcal: pt.kcal, protein: pt.protein })) : null;
      medit = null;
      saveDay(day, (doc) => { doc.meals = (doc.meals || []).map((x) => x.id === id ? { ...x, label: label.slice(0, 300), kcal: Math.round(Number(e.kcal) || 0), protein: Math.round(Number(e.protein) || 0), ...(parts ? { parts } : {}) } : x); });
    };
    const ask = box.querySelector('[data-ma="ask"]');
    if (ask) ask.onclick = async () => {
      const change = String(e.change || "").trim();
      if (!change) { st.textContent = "Beschreib kurz, was anders war."; st.classList.add("err"); return; }
      const before = `${e.orig.label} (${e.orig.kcal} kcal, ${e.orig.protein} g Eiweiß${e.parts.length ? "; Bestandteile: " + e.parts.map((pt) => `${pt.name} ${pt.g0} g`).join(", ") : ""})`;
      if (!directNow()) {
        // queue: Claude re-estimates at the next sync; the old values count until then
        const id = e.id, day = e.day; medit = null;
        saveDay(day, (doc) => { doc.meals = (doc.meals || []).map((x) => x.id === id ? { ...x, pending: true, request: `Korrektur dieses Eintrags. Bisher: ${before}. Änderung: ${change}`.slice(0, 600) } : x); });
        setStatus("estStatus", "An Claude geschickt. Die neue Schätzung kommt beim nächsten Abgleich, bis dahin zählen die bisherigen Werte.");
        return;
      }
      ask.disabled = true; st.classList.remove("err"); st.textContent = "Claude schätzt neu …";
      try {
        const res = await sample.json(estPrompt(`Ein schon eingetragener Posten wird korrigiert. Bisher: ${before}. Änderung: ${change}. Gib genau EINEN Posten mit dem korrigierten Stand zurück.`, false), { modelTier: "default" });
        const it = res && Array.isArray(res.items) && res.items.find((x) => x && x.label);
        if (!it) throw { code: "empty" };
        e.label = String(it.label).slice(0, 300); e.kcal = Math.round(Number(it.kcal) || 0); e.protein = Math.round(Number(it.protein) || 0);
        const parts = cleanParts(it.parts);
        e.orig = { kcal: e.kcal, protein: e.protein, label: e.label }; e.parts = parts.map((pt) => ({ ...pt, g0: pt.grams, k0: pt.kcal, p0: pt.protein, gone: false })); e.change = ""; e.g0 = null; e.pct = 100;
        renderDay();
        const st2 = document.querySelector(".medit .status"); if (st2) st2.textContent = "Neu geschätzt. Prüfen und speichern.";
      } catch (er) { st.classList.add("err"); st.textContent = er && er.code === "rate_limited" ? "Gerade zu viele Anfragen. Versuch es gleich noch einmal." : "Das hat nicht geklappt. Formuliere es etwas genauer."; ask.disabled = false; }
    };
    return box;
  }
  function startEdit(m) {
    editingId = m.id;
    $("mealText").value = m.label; $("manKcal").value = m.kcal; $("manProt").value = m.protein;
    $("manAdd").textContent = "Änderung speichern"; $("editCancel").hidden = false;
    $("mealText").focus();
  }
  function endEdit() {
    editingId = null; planFill = null; $("mealText").value = ""; $("manKcal").value = ""; $("manProt").value = "";
    $("manAdd").textContent = "Eintragen"; $("editCancel").hidden = true;
  }
  $("editCancel").onclick = endEdit;
  $("manAdd").onclick = () => {
    const label = $("mealText").value.trim(), kcal = Number($("manKcal").value), prot = Number($("manProt").value) || 0;
    if (!label || !(kcal >= 0) || $("manKcal").value === "") { setStatus("estStatus", "Bitte Beschreibung und kcal angeben, oder schätzen lassen.", true); return; }
    if (editingId) {
      const id = editingId;
      saveDay(curDay, (doc) => { doc.meals = doc.meals.map((m) => m.id === id ? { ...m, label, kcal: Math.round(kcal), protein: Math.round(prot) } : m); });
    } else addMeals([{ label, kcal, protein: prot, ...(planFill ? { fromPlan: planFill } : {}) }]);
    setStatus("estStatus", ""); endEdit();
  };

