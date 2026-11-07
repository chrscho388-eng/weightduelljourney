  // ---- reminders (real Android app only): settings go to the app, which plans local notifications ----
  function initReminders() {
    const A = window.WeightplanAndroid;
    if (!A || typeof A.setReminders !== "function") return;
    $("remBox").hidden = false;
    let cfg = {}; try { cfg = JSON.parse(lsGet(LS + "reminders") || "{}"); } catch (e) {}
    const w = cfg.weigh || { on: false, time: "07:00" }, st = cfg.steps || { on: false, time: "20:30" };
    $("remWeigh").checked = !!w.on; $("remWeighT").value = w.time; $("remSteps").checked = !!st.on; $("remStepsT").value = st.time;
    const save = () => {
      const day = S.weighDay ?? 1; remDay = day; $("remWeighDay").textContent = WDL[day];
      const c = { weigh: { on: $("remWeigh").checked, time: $("remWeighT").value || "07:00", day }, steps: { on: $("remSteps").checked, time: $("remStepsT").value || "20:30" } };
      lsSet(LS + "reminders", JSON.stringify(c)); try { A.setReminders(JSON.stringify(c)); } catch (e) {}
    };
    ["remWeigh", "remWeighT", "remSteps", "remStepsT"].forEach((id) => $(id).onchange = save);
    remSave = save; $("remWeighDay").textContent = WDL[S.weighDay ?? 1];
  }
  // the weigh reminder follows the weigh day from the profile: resend the settings when it changes
  let remSave = null, remDay = null;
  function syncRemDay() { if (remSave && remDay !== (S.weighDay ?? 1)) remSave(); }
  let dayStateLast = "";
  function reportToday() {
    const A = window.WeightplanAndroid;
    if (!A || typeof A.dayState !== "function" || !daysLoaded) return;
    const t = todayStr(), d = days[t] || {}, w = !!d.weight, st = stepsOf(d) > 0;
    const key = t + w + st; if (key === dayStateLast) return; dayStateLast = key;
    try { A.dayState(t, w, st); } catch (e) {}
  }
