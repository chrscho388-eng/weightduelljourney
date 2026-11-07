  // ---- plan ----
  let notesWeek = null;
  let dayOpen = {};
  try { dayOpen = JSON.parse(localStorage.getItem("kurs:planDayOpen") || "{}") || {}; } catch (e) {}
  function renderPlanNotes() {
    const el = $("planNotes");
    // keep what the person is typing; refresh when the week changes or the field is not focused
    if (notesWeek !== curPlan || document.activeElement !== el) el.value = (S.planNotes || {})[curPlan] || "";
    notesWeek = curPlan;
  }
  $("planNotesSave").onclick = async () => {
    if (!base) { setStatus("planNotesStatus", "Speicher nicht erreichbar.", true); return; }
    const txt = $("planNotes").value.trim().slice(0, 1500), week = curPlan;
    const notes = { ...(S.planNotes || {}) };
    if (txt) notes[week] = txt; else delete notes[week];
    // drop notes for weeks that are long over
    Object.keys(notes).forEach((k) => { if (k < addDays(mondayOf(todayStr()), -28)) delete notes[k]; });
    const next = { ...S, planNotes: notes, updatedAt: new Date().toISOString() };
    $("planNotesSave").disabled = true;
    try { await base.set(next); S = next; setStatus("planNotesStatus", txt ? "Gespeichert. Fließt in den Plan für diese Woche ein." : "Hinweise gelöscht."); }
    catch (e) { setStatus("planNotesStatus", "Speichern fehlgeschlagen.", true); }
    finally { $("planNotesSave").disabled = false; }
  };
  function renderPlan() {
    renderPlanNotes();
    renderRules();
    $("rulesApplyWrap").hidden = !requestMode();
    if (document.activeElement !== $("canteenHabits")) $("canteenHabits").value = S.canteenHabits || "";
    $("canteenLabel").hidden = !((sample && sampleImages) || requestMode());
    const menu = plans[curPlan] && plans[curPlan].canteenMenu;
    const menuRef = menu && String(menu).startsWith(PHOTO_REF);
    if (menuRef && STANDALONE) photoFetch(menu.slice(PHOTO_REF.length));
    $("canteenMenuBox").hidden = !menu || menuRef; if (menu && !menuRef && $("canteenImg").src !== menu) $("canteenImg").src = menu;
    const wn = weekNo(curPlan);
    $("planName").textContent = `Plan ${wn >= 1 ? "Woche " + wn : ""} · ${dm(curPlan)}–${dm(addDays(curPlan, 6))}`;
    const isProposal = !!(pendingPlan && pendingPlan.week === curPlan);
    const p = isProposal ? pendingPlan.plan : (plans[curPlan] && !plans[curPlan].deleted ? plans[curPlan] : null), el = $("planBody");
    $("planProposal").hidden = !isProposal;
    $("planUndo").hidden = !(lastPlan && lastPlan.week === curPlan) || isProposal;
    $("planPrompt").placeholder = p ? "z. B. Heute kein Frühstück und ich esse abends auswärts" : "z. B. Erstelle einen Plan für diese Woche, Montag und Dienstag Büro";
    renderShop(isProposal ? null : p);
    const asked = plans[curPlan] && plans[curPlan].planChange;
    const askedList = asked ? String(asked).split(" | ").filter(Boolean) : [];
    const short = (w) => w.length > 140 ? w.slice(0, 137) + " …" : w;
    const askedHtml = asked && !isProposal ? (askedList.length > 1
      ? `<div class="small" style="margin-top:12px"><span class="pill warn">${askedList.length} Anpassungen angefordert</span> kommen gemeinsam beim nächsten Abgleich:<ul style="margin:6px 0 0;padding-left:18px">${askedList.map((w) => `<li>„${esc(short(w))}“</li>`).join("")}</ul></div>`
      : `<p class="small" style="margin-top:12px"><span class="pill warn">Anpassung angefordert</span> „${esc(short(asked))}“ kommt beim nächsten Abgleich.</p>`) : "";
    if (p && !(p.days || []).length && !(p.swaps || []).length && asked) { el.innerHTML = askedHtml; return; }
    if (!p) { el.innerHTML = `<div class="panel muted" style="margin-top:14px">Für diese Woche gibt es noch keinen Plan.${sample ? " Beschreib oben, was du brauchst, dann erstellt Claude einen." : ""}</div>`; return; }
    let h = (isProposal ? `<p style="margin-top:12px"><span class="pill warn">Vorschlag</span></p>` : "") + askedHtml;
    h += p.note ? `<p class="small muted" style="margin-top:12px">${esc(p.note)}</p>` : "";
    (p.days || []).forEach((d, di) => {
      const tk = (d.meals || []).reduce((a, m) => a + (m.kcal || 0), 0), tp = (d.meals || []).reduce((a, m) => a + (m.protein || 0), 0);
      // collapsible: past days start closed, the person's own choice per day is remembered
      const open = d.date in dayOpen ? dayOpen[d.date] : d.date >= todayStr();
      h += `<details class="planday panel${d.date === todayStr() ? " today" : ""}" data-date="${d.date}"${open ? " open" : ""}><summary><h3><span>${WD[weekday(d.date)]} ${dm(d.date)}${d.type ? ` <span class="pill">${esc(d.type)}</span>` : ""}</span><span class="num">${fmt(tk)} kcal · ${fmt(tp)} g Eiweiß</span></h3></summary>`;
      if (d.info) h += `<div class="small muted">${esc(d.info)}</div>`;
      (d.meals || []).forEach((m, mi) => h += `<div ${mealAttrs(m, isProposal ? null : "d" + di + ":" + mi)}><div><div class="slot">${esc(m.slot || "")}</div>${esc(m.name)}</div><div class="mv">${fmt(m.kcal)} kcal\n${fmt(m.protein)} g Eiweiß</div>${m.detail ? `<div class="detail">${esc(m.detail)}</div>` : ""}${recipeHtml(m, isProposal ? null : "d" + di + ":" + mi)}</div>`);
      h += `</details>`;
    });
    if ((p.swaps || []).length) {
      h += `<h3>Tauschgerichte</h3><p class="small muted" style="margin:-4px 0 8px">Alternativen mit ähnlichen Werten. Du kannst sie gegen jedes Abendessen der Woche tauschen.</p><div class="panel">`;
      p.swaps.forEach((m, mi) => h += `<div ${mealAttrs(m, isProposal ? null : "s:" + mi)}><div>${esc(m.name)}</div><div class="mv">${fmt(m.kcal)} kcal\n${fmt(m.protein)} g Eiweiß</div>${m.detail ? `<div class="detail">${esc(m.detail)}</div>` : ""}${recipeHtml(m, isProposal ? null : "s:" + mi)}</div>`);
      h += `</div>`;
    }
    el.innerHTML = h;
    el.querySelectorAll("details.planday").forEach((dt) => dt.addEventListener("toggle", () => {
      dayOpen[dt.dataset.date] = dt.open;
      Object.keys(dayOpen).forEach((k) => { if (k < addDays(todayStr(), -42)) delete dayOpen[k]; });
      lsSet(LS + "planDayOpen", JSON.stringify(dayOpen));
    }));
    el.querySelectorAll(".pmeal.tap [data-rc]").forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const row = b.closest(".pmeal"), box = row.querySelector(".redit");
      if (b.dataset.rc === "open") { box.hidden = !box.hidden; if (!box.hidden) box.querySelector("textarea").focus(); return; }
      const wish = box.querySelector("textarea").value.trim();
      const st = box.querySelector(".status");
      if (!wish) { st.textContent = "Beschreibe kurz, was sich ändern soll."; st.classList.add("err"); return; }
      changeRecipe(row, wish, b.dataset.rc === "later");
    });
    el.querySelectorAll(".pmeal .rwish").forEach((t) => t.onclick = (e) => e.stopPropagation());
    el.querySelectorAll(".pptog [data-pp]").forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      ppMode = +b.dataset.pp; try { localStorage.setItem("kurs:recipePP", String(ppMode)); } catch (x) {}
      applyPP(el);
    });
    applyPP(el);
    el.querySelectorAll(".pmeal.tap").forEach((row) => {
      const act = (e) => {
        if (e && e.target.closest("details.recipe > :not(summary)")) return; // reading or selecting recipe text
        const det = row.querySelector("details.recipe");
        if (det) { if (!e || !e.target.closest("summary")) det.open = !det.open; return; }
        const btn = e && e.target.closest("button[data-act]");
        if (row.querySelector("button[data-act]")) { if (btn) makeRecipe(row, btn.dataset.act === "later"); return; }
        makeRecipe(row, !sample);
      };
      row.onclick = act;
      row.onkeydown = (e) => { if (e.target === row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); act(); } };
    });
  }
