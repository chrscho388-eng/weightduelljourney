  // ---- routing ----
  const VIEWS = ["heute", "woche", "verlauf", "plan", "profil", "einstellungen"];
  function route() {
    let v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "heute";
    if (profileKnown && !hasProfile) v = "profil";
    document.querySelectorAll("[data-view]").forEach((s) => s.hidden = s.id !== "view-" + v);
    document.querySelectorAll("nav.tabs a").forEach((a) => { if (a.dataset.tab === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

