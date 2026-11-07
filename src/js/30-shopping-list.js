  // ---- shopping list from the week's plan: recipe ingredients where present, else the meal's ingredient line ----
  const PANTRY = /(?<![\p{L}-])(salz|pfeffer|öl|olivenöl|rapsöl|sesamöl|sonnenblumenöl|paprikapulver|kreuzkümmel|currypulver|chiliflocken|chilipulver|cayennepfeffer|zimt|oregano|thymian|majoran|getrocknete kräuter|kräuter der provence|italienische kräuter|gewürze?|muskat|lorbeer|essig|balsamico|sojaso(?:ß|ss)e|sojasauce|fischso(?:ß|ss)e|chili|senf|honig|brühe|gemüsebrühe|hühnerbrühe|zucker|mehl|speisestärke|backpulver|wasser|süßstoff|sirup|knoblauch|knoblauchpulver|knoblauchzehen?)(?![\p{L}-])/iu;
  // own words are added to the built-in list; built-in words can be switched off in the settings
  function isPantry(n) {
    const re = (w) => new RegExp("(?<![\\p{L}-])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\p{L}-])", "iu");
    if ((S.pantryExtra || []).some((w) => w && re(w).test(n))) return true;
    const m = n.match(PANTRY);
    return !!m && !(S.pantryOff || []).some((w) => w.toLowerCase() === m[1].toLowerCase());
  }
  const NOT_SHOPPED = /kantine|juit|lieferdienst|restaurant|auswärts|verkostung|einladung|grillabend|imbiss|essen gehen/i;
  const SHOP_CATS = [
    ["Vorrat und Konserven", /passata|gehackte tomaten|tomatenmark|kokosmilch|aroy|kidney|kichererbsen|linsen|mais|thunfisch|currypaste|sweet.?chili|soße|sauce|nudeln|pasta|spaghetti|reis|couscous|bulgur|wraps?|tortilla|brot|brötchen|haferflocken|whey|protein|nüsse|mandeln/i],
    ["Fleisch und Fisch", /hähnchen|huhn|pute|puten|lachs|fisch|garnele|shrimp|schwein|hack|wurst|schinken|speck|filet|steak/i],
    ["Kühlregal", /joghurt|skyr|quark|käse|feta|parmesan|gouda|mozzarella|halloumi|milch|sahne|eier|eiklar|ei$|butter|tofu|hüttenkäse|frischkäse/i],
    ["Obst und Gemüse", /paprika|zucchini|brokkoli|karotte|möhre|tomate|kartoffel|hokkaido|kürbis|beere|zitrone|limette|spinat|lauch|frühlingszwiebel|aubergine|blumenkohl|ingwer|avocado|salat|kräuter|petersilie|koriander|dill|schnittlauch|basilikum|apfel|banane|gemüse|pilz|erbsen|bohnen|rucola|zwiebel|sellerie|fenchel|mango|ananas|kohl/i]
  ];
  const shopCat = (n) => (SHOP_CATS.find(([, re]) => re.test(n)) || ["Sonstiges"])[0];
  const cleanItem = (x) => String(x).replace(/\(.*?\)/g, "").replace(/\(.*$/, "").replace(/[()]/g, "").replace(/^\s*(?:dazu|plus|mit)\s+/i, "").replace(/,.*$/, "").replace(/\s+(?:mit|in|für)\s+.*$/i, "").replace(/(?<!\p{L})(?:roh|abgetropft|optional|frisch)(?!\p{L})/giu, "").replace(/(?<!\p{L})(?:gegrillt|gebraten|gekocht|gedünstet|gewürfelt|geschnitten)(?:e|er|es|en)?(?!\p{L})/giu, "").replace(/\s+/g, " ").trim();
  const FRAC = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
  // Vorrat/Rest-Hinweis in Klammern oder nach Komma: solche Zutaten kauft man nicht
  const HAVE_RE = /(?<!\p{L})(?:vorrat|rest|reste|übrig|schon da|im haus)(?!\p{L})/iu;
  const isHave = (i) => i.have === true || HAVE_RE.test([...String(i.amount || "").matchAll(/\(([^)]*)\)/g), ...String(i.item || "").matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join(" ") + " " + (String(i.item || "").split(",").slice(1).join(" ")) + " " + String(i.note || ""));
  function parseQty(a) {
    a = String(a || "").replace(",", ".")
      .replace(/(\d+)\s+(\d+)\/(\d+)/g, (_, w, x, y) => String(+w + x / y)).replace(/(\d+)\/(\d+)/g, (_, x, y) => String(x / y))
      .replace(/(\d+)?\s*([½¼¾⅓⅔])/gu, (_, w, f) => String((+w || 0) + FRAC[f]));
    let m = a.match(/\((\d+(?:\.\d+)?)\s*(g|ml)\)/i); if (m) return { q: +m[1], u: m[2].toLowerCase() };
    m = a.match(/^\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l)(?!\p{L})/iu);
    if (m) { const u = m[2].toLowerCase(); return u === "kg" ? { q: m[1] * 1000, u: "g" } : u === "l" ? { q: m[1] * 1000, u: "ml" } : { q: +m[1], u }; }
    m = a.match(/^\s*(\d+(?:\.\d+)?)\s*(\p{L}*\.?)/u);
    return m ? { q: +m[1], u: !m[2] || /^st(?:ück|k\.?)$/i.test(m[2]) ? "Stk." : m[2] } : null;
  }
  // split on separators, but not inside parentheses: "Salat (Kartoffel, Bohnen), 1 Ei" -> 2 parts
  function splitTop(str, re) {
    const out = []; let depth = 0, cur = "";
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "(") depth++; else if (c === ")") depth = Math.max(0, depth - 1);
      if (!depth) { const m = s.slice(i).match(re); if (m && m.index === 0) { out.push(cur); cur = ""; i += m[0].length - 1; continue; } }
      cur += c;
    }
    out.push(cur); return out.map((x) => x.trim()).filter(Boolean);
  }
  // "250 g griech. Joghurt 10 %, 60 g Whey; dazu Skyr (250 g Skyr)" -> [{amount, item}]
  function parseDetail(detail) {
    const one = (part) => { const m = part.match(/(\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l)?)\s+([^\d\s/].*)$/i); return m ? { amount: m[1], item: m[2] } : null; };
    return splitTop(String(detail || "").replace(/\.\s*Alternative:.*$/is, ""), /^[,;+]/).map((part) => {
      const outer = part.replace(/\(.*?\)/g, "").trim(), inner = (part.match(/\(([^()]*)\)/) || [])[1] || "";
      return one(outer) || (/\d/.test(inner) && !/ca\.|circa/i.test(inner) ? one(inner) : null);
    }).filter(Boolean);
  }
  let shopOpen = false, shopDoneOpen = false;
  const shopPref = (k, def) => { const v = lsGet(LS + "shop:" + k); return v == null ? def : v === "1"; };
  function shopList(p, forTwo, fromToday) {
    const items = {}, pantry = {}, skipped = [], today = todayStr();
    const add = (name, qty, mult) => {
      let note = ""; const sub = String(name).match(/^([^:]+):\s*(.+)$/); if (sub) { name = sub[1]; note = sub[2]; }
      let n = cleanItem(name); if (!n) return;
      let lc = n.toLowerCase();
      const cit = lc.match(/^(zitronen|limetten|orangen)(?:saft|schale|abrieb)$/) || lc.match(/^(?:saft|schale|abrieb)(?: von| der| einer)? (zitrone|limette|orange)n?$/);
      if (cit) { n = { zitronen: "Zitrone", limetten: "Limette", orangen: "Orange" }[cit[1]] || cit[1].charAt(0).toUpperCase() + cit[1].slice(1); lc = n.toLowerCase(); qty = null; }
      if (/^(?:hühnerei)?(?:eiklar|eiweiß)$/.test(lc)) { n = "Eier"; lc = "eier"; qty = qty && (qty.u === "g" || qty.u === "ml") ? { q: qty.q / (S.eggWhiteG || 33), u: "Stk." } : null; }
      else if (lc === "ei") { n = "Eier"; lc = "eier"; }
      const key = lc;
      if (isPantry(n)) { pantry[key] = pantry[key] || n; return; }
      const it = items[key] = items[key] || { name: n.charAt(0).toUpperCase() + n.slice(1), units: {} };
      if (qty) it.units[qty.u] = (it.units[qty.u] || 0) + qty.q * mult;
      if (note && !it.note) it.note = note;
    };
    (p.days || []).forEach((d) => {
      if (fromToday && d.date < today) return;
      (d.meals || []).forEach((m) => {
        if (NOT_SHOPPED.test((m.name || "") + " " + (m.slot || "")) || /^geschätzt/i.test(m.detail || "")) { skipped.push(`${m.name} (${WD[weekday(d.date)]})`); return; }
        const lg = (dayDoc(d.date).meals || []).some((x) => x.fromPlan && x.fromPlan === m.name);
        if (lg || /^rest|\breste?\b|aufwärm|vom vortag/i.test(m.name || "") || /\brest von\b|vom vortag/i.test(m.detail || "")) { skipped.push(`${m.name} (${WD[weekday(d.date)]}, ${lg ? "schon gekocht" : "Rest"})`); return; }
        const pot = /topf/i.test([m.name, m.detail, m.recipe && m.recipe.servings].join(" "));
        const mult = forTwo && isDish(m) && !pot ? 2 : 1;
        const ings = m.recipe && (m.recipe.ingredients || []).length ? m.recipe.ingredients : parseDetail(m.detail);
        if (!ings.length) { skipped.push(`${m.name} (${WD[weekday(d.date)]})`); return; }
        ings.forEach((i) => {
          if (isHave(i)) { const hn = cleanItem(i.item); if (hn) pantry[hn.toLowerCase()] = pantry[hn.toLowerCase()] || hn; return; }
          const qty = parseQty(i.amount);
          if (qty && qty.u !== "Prise" && !/^etwas/i.test(i.amount)) add(i.item, qty, mult);
          else splitTop(i.item, /^(?:,|\sund\s|\soder\s)/).forEach((x) => add(x, null, mult));
        });
      });
    });
    return { items: Object.entries(items), pantry: Object.values(pantry), skipped };
  }
  const stkTxt = (q, name) => { const r = /^eier$/i.test(name || "") ? Math.ceil(q - 1e-9) : Math.ceil(q * 2 - 1e-9) / 2, w = Math.floor(r); return (w || r % 1 ? (w ? w : "") + (r % 1 ? "½" : "") : "0") + " Stk."; };
  const amtTxt = (units, name) => Object.entries(units).map(([u, q]) => u === "g" || u === "ml" ? (q >= 1000 ? fmt(q / 1000, 1) + (u === "g" ? " kg" : " l") : fmt(Math.round(q / 5) * 5) + " " + u) : u === "Stk." ? stkTxt(q, name) : fmt(q, q % 1 ? 1 : 0) + " " + u).join(" + ");
  function renderShop(p) {
    const box = $("shopBox");
    if (!p) { box.innerHTML = ""; return; }
    const week = curPlan, isNow = week === mondayOf(todayStr());
    const forTwo = shopPref("two", true), fromToday = true; // past days are never cooked any more
    const L = shopList(p, forTwo, fromToday);
    let ticks = {}; try { ticks = JSON.parse(lsGet(LS + "shop:ticks:" + week) || "{}"); } catch (e) {}
    const groups = {};
    L.items.forEach(([k, it]) => (groups[shopCat(it.name)] = groups[shopCat(it.name)] || []).push([k, it]));
    const order = SHOP_CATS.map((c) => c[0]).concat("Sonstiges");
    let h = `<details class="panel shop"${shopOpen ? " open" : ""}><summary>Einkaufsliste · ${L.items.filter(([k]) => !ticks[k]).length} von ${L.items.length} offen</summary>`
      + `<div class="chips" style="margin-top:10px"><button type="button" class="chip${forTwo ? " on" : ""}" data-sp="two">Gekochtes für 2</button><button type="button" class="chip" data-sp="copy">Liste kopieren</button></div>`;
    const li = ([k, it]) => `<li class="${ticks[k] ? "done" : ""}"><label><input type="checkbox" data-k="${esc(k)}"${ticks[k] ? " checked" : ""}><span class="nm">${esc(it.name)}${it.note ? ` <span class="small muted">(${esc(it.note)})</span>` : ""}</span><span class="amt">${esc(amtTxt(it.units, it.name))}</span></label></li>`;
    const byName = (a, b) => a[1].name.localeCompare(b[1].name, "de");
    // open items by category; ticked ones move into a separate collapsible box
    order.filter((c) => groups[c] && groups[c].some(([k]) => !ticks[k])).forEach((c) => {
      h += `<h4>${c}</h4><ul>` + groups[c].filter(([k]) => !ticks[k]).sort(byName).map(li).join("") + `</ul>`;
    });
    const done = L.items.filter(([k]) => ticks[k]);
    if (L.items.length && done.length === L.items.length) h += `<p class="small" style="margin:10px 0 0">Alles abgehakt.</p>`;
    if (done.length) h += `<details class="donebox"${shopDoneOpen ? " open" : ""}><summary>Abgehakt · ${done.length}</summary><ul>` + done.sort(byName).map(li).join("") + `</ul></details>`;
    if (!L.items.length) h += `<p class="small muted">Im Plan stehen keine Zutaten mit Mengen.</p>`;
    if (L.pantry.length) h += `<h4>Wahrscheinlich schon im Haushalt</h4><p class="small muted" style="margin:0">${esc(L.pantry.sort((a, b) => a.localeCompare(b, "de")).join(", "))}</p>`;
    if (L.skipped.length) h += `<p class="small muted" style="margin:10px 0 0">Nicht enthalten (auswärts, geschätzt, schon gekocht oder Rest): ${esc(L.skipped.join(", "))}</p>`;
    h += `<p class="small muted" style="margin:6px 0 0">Mengen roh laut Plan und Rezepten. ${forTwo ? "Gekochte Gerichte doppelt, Frühstück und Snacks einfach." : "Alles für eine Person."}</p><span class="status small" id="shopStatus"></span></details>`;
    box.innerHTML = h;
    const det = box.querySelector("details"); det.ontoggle = () => { shopOpen = det.open; };
    const dbx = box.querySelector("details.donebox"); if (dbx) dbx.ontoggle = () => { shopDoneOpen = dbx.open; };
    box.querySelectorAll("input[data-k]").forEach((cb) => cb.onchange = () => {
      if (cb.checked) ticks[cb.dataset.k] = 1; else delete ticks[cb.dataset.k];
      lsSet(LS + "shop:ticks:" + week, JSON.stringify(ticks)); renderShop(p);
    });
    box.querySelectorAll("[data-sp]").forEach((b) => b.onclick = async () => {
      const k = b.dataset.sp;
      if (k === "copy") {
        const txt = order.filter((c) => groups[c]).map((c) => c + ":\n" + groups[c].filter(([key]) => !ticks[key]).map(([, it]) => `- ${it.name}${it.note ? " (" + it.note + ")" : ""} ${amtTxt(it.units, it.name)}`.trim()).join("\n")).join("\n\n");
        try { await navigator.clipboard.writeText(txt); $("shopStatus").textContent = "Kopiert."; }
        catch (e) { $("shopStatus").textContent = "Kopieren ging hier nicht. Halte den Text gedrückt, um ihn zu markieren."; }
        return;
      }
      lsSet(LS + "shop:" + k, shopPref(k, k === "two") ? "0" : "1"); renderShop(p);
    });
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  $("prevPlan").onclick = () => { closePickers(); curPlan = addDays(curPlan, -7); openRecipe = null; renderPlan(); };
  $("nextPlan").onclick = () => { closePickers(); curPlan = addDays(curPlan, 7); openRecipe = null; renderPlan(); };

