  // ---- photos live outside the documents (real app): IndexedDB on the device, photos/<id>.jpg in the data repo ----
  // A document only keeps "photo:<id>"; id = FNV-1a 64 of the data URL, so every side derives the same id.
  const PHOTO_REF = "photo:";
  const photoMem = new Map(); let photoIdb = null;
  function photoId(s) { let h = 0xcbf29ce484222325n; for (let i = 0; i < s.length; i++) { h ^= BigInt(s.charCodeAt(i) & 0xff); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; } return h.toString(16).padStart(16, "0"); }
  function photoInit() {
    return new Promise((res) => {
      let req; try { req = indexedDB.open("weightplan", 1); } catch (e) { res(false); return; }
      req.onupgradeneeded = () => req.result.createObjectStore("photos");
      req.onerror = () => res(false);
      req.onsuccess = () => {
        const idb = req.result;
        try {
          const all = idb.transaction("photos").objectStore("photos").openCursor();
          all.onsuccess = () => { const c = all.result; if (c) { photoMem.set(c.key, c.value); c.continue(); } else { photoIdb = idb; res(true); } };
          all.onerror = () => res(false);
        } catch (e) { res(false); }
      };
    });
  }
  function photoPut(id, data) { photoMem.set(id, data); try { photoIdb.transaction("photos", "readwrite").objectStore("photos").put(data, id); } catch (e) {} }
  // walk a document and swap inline images for references (or back)
  const walkStrings = (v, f) => Array.isArray(v) ? v.map((x) => walkStrings(x, f)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walkStrings(x, f)])) : typeof v === "string" ? f(v) : v;
  function photosOut(doc) {
    if (!photoIdb || !doc) return doc;
    return walkStrings(doc, (x) => { if (!x.startsWith("data:image/")) return x; const id = photoId(x); if (!photoMem.has(id)) photoPut(id, x); return PHOTO_REF + id; });
  }
  const photosIn = (doc) => !doc || !photoMem.size ? doc : walkStrings(doc, (x) => x.startsWith(PHOTO_REF) && photoMem.has(x.slice(PHOTO_REF.length)) ? photoMem.get(x.slice(PHOTO_REF.length)) : x);
  const photoRefs = (doc, out) => { walkStrings(doc, (x) => { if (x.startsWith(PHOTO_REF)) out.add(x.slice(PHOTO_REF.length)); return x; }); return out; };
  // move inline photos of old documents into the photo store (keeps updatedAt: the content stays the same)
  function photoMigrate() {
    if (!photoIdb) return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i); if (!k.startsWith(LS + "data/")) continue;
        const raw = localStorage.getItem(k); if (!raw || !raw.includes("data:image/")) continue;
        localStorage.setItem(k, JSON.stringify(photosOut(JSON.parse(raw))));
      }
    } catch (e) {}
  }
  // two versions of one day: meals are merged one by one, deletions travel along in "removed"
  function mergeDay(a, b) {
    if (!a || !b) return a || b;
    const [nw, old] = (b.updatedAt || "") > (a.updatedAt || "") ? [b, a] : [a, b];
    const removed = [...new Set([...(old.removed || []), ...(nw.removed || [])])].slice(-100);
    const gone = new Set(removed), have = new Set((nw.meals || []).map((m) => m.id));
    const olds = new Map((old.meals || []).map((m) => [m.id, m]));
    // a side without the photo (e.g. shortened) never deletes the other side's photo
    const keepPhoto = (m) => { const o = olds.get(m.id); return o && !m.photo && !m.photos && (o.photo || o.photos) ? { ...m, ...(o.photo ? { photo: o.photo } : {}), ...(o.photos ? { photos: o.photos } : {}) } : m; };
    const meals = [...(nw.meals || []).map(keepPhoto), ...(old.meals || []).filter((m) => !have.has(m.id))].filter((m) => !gone.has(m.id));
    const out = { ...nw, meals };
    if (removed.length) out.removed = removed; else delete out.removed;
    return out;
  }
  function localDb() {
    const listeners = {};
    const keys = () => { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(LS + "data/")) out.push(k.slice(LS.length)); } } catch (e) {} return out; };
    const read = (path) => { const v = lsGet(LS + path); return v ? photosIn(JSON.parse(v)) : null; };
    const snap = (path) => { const d = read(path); return { id: path.split("/").pop(), exists: !!d, data: () => d }; };
    const notify = (path) => { const coll = path.split("/").slice(0, -1).join("/"); [path, coll].forEach((k) => (listeners[k] || []).forEach((f) => f())); };
    const listen = (key, f) => { (listeners[key] = listeners[key] || []).push(f); setTimeout(f, 0); return () => { listeners[key] = listeners[key].filter((x) => x !== f); }; };
    function docRef(path) {
      return {
        path,
        get: async () => snap(path),
        set: async (d) => { if (!lsSet(LS + path, JSON.stringify(photosOut(d)))) throw { code: "quota_exceeded" }; notify(path); onLocalWrite(); },
        delete: async () => { try { localStorage.removeItem(LS + path); } catch (e) {} notify(path); },
        onSnapshot: (next) => listen(path, () => next(snap(path))),
        collection: (name) => collRef(path + "/" + name)
      };
    }
    function collRef(cpath) {
      return {
        doc: (id) => docRef(cpath + "/" + id),
        onSnapshot: (next) => {
          let prev = {};
          return listen(cpath, () => {
            const cur = {}, changes = [];
            keys().filter((k) => k.startsWith(cpath + "/") && !k.slice(cpath.length + 1).includes("/")).forEach((k) => {
              const id = k.slice(cpath.length + 1), raw = lsGet(LS + k); cur[id] = raw;
              if (prev[id] !== raw) changes.push({ type: prev[id] === undefined ? "added" : "modified", doc: snap(k) });
            });
            Object.keys(prev).forEach((id) => { if (!(id in cur)) { const old = JSON.parse(prev[id]); changes.push({ type: "removed", doc: { id, exists: true, data: () => old } }); } });
            prev = cur;
            if (changes.length) next({ docChanges: () => changes });
          });
        }
      };
    }
    return { doc: docRef, collection: collRef, reloadAll: () => Object.keys(listeners).forEach((k) => (listeners[k] || []).forEach((f) => f())) };
  }
  const ESTIMATE_MODEL = "claude-sonnet-5-5";
  function shrinkImage(file) {
    return new Promise((res) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const sc = Math.min(1, 1568 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res(c.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(null); };
      img.src = url;
    });
  }
  function localSample() {
    const key = lsGet(LS + "apiKey");
    if (!key) return null;
    return {
      limits: async () => ({ images: { maxCount: 1 } }),
      json: async (prompt, opts) => {
        const content = [];
        for (const f of (opts && opts.images) || []) { const b64 = await shrinkImage(f); if (b64) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }); }
        content.push({ type: "text", text: prompt });
        let r;
        try {
          r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
            body: JSON.stringify({ model: ESTIMATE_MODEL, max_tokens: 6000, messages: [{ role: "user", content }] })
          });
        } catch (e) { throw { code: "network" }; }
        if (r.status === 401 || r.status === 403) throw { code: "bad_key" };
        if (r.status === 429 || r.status === 529) throw { code: "rate_limited" };
        if (!r.ok) throw { code: "error" };
        const j = await r.json();
        const t = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
        const m = t.match(/\{[\s\S]*\}/);
        try { return JSON.parse(m ? m[0] : t); } catch (e) { throw { code: "invalid_json" }; }
      }
    };
  }
  const use = (n) => !STANDALONE ? claude.use(n)
    : Promise.resolve(n === "db" ? localDb() : n === "user" ? { id: async () => "local" } : n === "sample" ? localSample() : null);

