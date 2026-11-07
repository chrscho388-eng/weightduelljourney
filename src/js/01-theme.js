  // ---- theme: automatic (device), light or dark, remembered on this device ----
  function applyTheme(t) {
    const r = document.documentElement;
    if (t === "light" || t === "dark") r.dataset.theme = t; else delete r.dataset.theme;
    document.querySelectorAll("#themeChips .chip").forEach((c) => c.classList.toggle("on", c.dataset.themeSet === (t || "auto")));
  }
  let theme = null; try { theme = localStorage.getItem("kurs:theme"); } catch (e) {}
  applyTheme(theme);
  document.querySelectorAll("#themeChips .chip").forEach((c) => c.onclick = () => {
    theme = c.dataset.themeSet === "auto" ? null : c.dataset.themeSet;
    try { theme ? localStorage.setItem("kurs:theme", theme) : localStorage.removeItem("kurs:theme"); } catch (e) {}
    applyTheme(theme);
  });
