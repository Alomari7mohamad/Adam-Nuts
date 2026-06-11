/* =====================================================================
   products.js — catalog rendering, categories, subcategories,
   live search, favourites, product quick-view.
   Renders into whichever containers exist on the current page:
     #cats #subcats #bestsellers #offers-grid #catalog #search
   ===================================================================== */
(function () {
  "use strict";
  const A = window.Adam;
  const DATA = window.AdamData;

  const FAV_KEY = "adam_favs";
  const LOGO = "assets/images/logo/logo.svg.png";
  const state = { cat: "all", sub: "all", q: "" };

  /* ---------- Favourites (localStorage) ---------- */
  // Hardened read: only keep string ids that map to a real product
  function favs() {
    try {
      const raw = JSON.parse(localStorage.getItem(FAV_KEY));
      return Array.isArray(raw) ? raw.filter(id => typeof id === "string" && DATA.PRODUCTS.some(p => p.id === id)) : [];
    } catch { return []; }
  }
  function isFav(id) { return favs().includes(id); }
  function toggleFav(id) {
    const f = favs();
    const i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    localStorage.setItem(FAV_KEY, JSON.stringify(f));
    updateFavCount();
    return i < 0;
  }
  function updateFavCount() {
    const n = favs().length;
    document.querySelectorAll("[data-fav-count]").forEach(b => {
      b.textContent = n;
      b.classList.toggle("hidden", n === 0);
    });
  }

  function gWord() { return A.lang() === "he" ? "גרם" : "غرام"; }
  function kgWord() { return A.lang() === "he" ? 'ק"ג' : "كيلو"; }
  function catById(id) { return DATA.CATEGORIES.find(c => c.id === id); }

  /* ---------- Card builder ---------- */
  function card(p) {
    const isKg = p.unit === "kg";
    const defaultW = isKg ? 500 : 1000;

    const img = A.el("img", { src: p.img, alt: A.nameOf(p.name), loading: "lazy", decoding: "async" });
    const media = A.el("button", { class: "pc-media", "aria-label": A.t("details") }, img);
    media.addEventListener("click", () => openQuickView(p));

    const badges = A.el("div", { class: "pc-badges" });
    if (p.bestseller) badges.append(A.el("span", { class: "badge badge-best", html: A.icon("star") + "<span>" + A.escapeHtml(A.t("bestseller_badge")) + "</span>" }));
    if (p.offer) badges.append(A.el("span", { class: "badge badge-offer", text: "-" + p.offer + "%" }));
    media.append(badges);

    const favBtn = A.el("button", {
      class: "fav-btn tap" + (isFav(p.id) ? " active" : ""),
      "aria-label": A.t("favorites"), html: A.icon("heart")
    });
    favBtn.addEventListener("click", e => {
      e.stopPropagation();
      const now = toggleFav(p.id);
      favBtn.classList.toggle("active", now);
      favBtn.classList.remove("pop"); void favBtn.offsetWidth; favBtn.classList.add("pop");
    });
    media.append(favBtn);

    // price
    const priceEl = A.el("span", { class: "pc-price" });
    const oldEl = A.el("span", { class: "pc-old hidden" });
    const unitEl = A.el("span", { class: "pc-unit" });
    function paintPrice(w) {
      priceEl.innerHTML = '<span class="cur">₪</span>' + A.escapeHtml(A.fmtNum(A.unitPrice(p, w)));
      if (p.offer) { oldEl.textContent = A.money(A.oldUnitPrice(p, w)); oldEl.classList.remove("hidden"); }
      unitEl.textContent = isKg ? "/ " + A.t("per_kg").replace(/^\//, "") : A.t("per_piece");
    }
    paintPrice(defaultW);
    const priceRow = A.el("div", { class: "pc-price-row" }, priceEl, oldEl, unitEl);

    // weight selector
    let weightSel, controls;
    if (isKg) {
      weightSel = A.el("select", { "aria-label": A.t("select_weight") });
      DATA.WEIGHTS.forEach(g => {
        const o = A.el("option", { value: g, text: g >= 1000 ? "1 " + kgWord() : g + " " + gWord() });
        if (g === defaultW) o.selected = true;
        weightSel.append(o);
      });
      weightSel.addEventListener("change", () => paintPrice(+weightSel.value));
      controls = A.el("div", { class: "weight-select" },
        A.el("span", { class: "wlabel", text: A.t("weight") }), weightSel);
    }

    const addBtn = A.el("button", { class: "add-btn", html: A.icon("cart") + "<span>" + A.escapeHtml(A.t("add_to_cart")) + "</span>" });
    addBtn.addEventListener("click", () => {
      const w = isKg ? +weightSel.value : 1000;
      window.AdamCart.add(p.id, w, 1);
      addBtn.classList.add("done");
      addBtn.innerHTML = A.icon("check") + "<span>" + A.escapeHtml(A.t("added")) + "</span>";
      setTimeout(() => {
        addBtn.classList.remove("done");
        addBtn.innerHTML = A.icon("cart") + "<span>" + A.escapeHtml(A.t("add_to_cart")) + "</span>";
      }, 1300);
    });

    const nameEl = A.el("button", { class: "pc-name", text: A.nameOf(p.name) });
    nameEl.addEventListener("click", () => openQuickView(p));

    const body = A.el("div", { class: "pc-body" },
      nameEl,
      p.desc ? A.el("p", { class: "pc-desc", text: A.nameOf(p.desc) }) : null,
      priceRow,
      isKg ? controls : A.el("div", { class: "pc-unit", text: A.t("per_piece") }),
      A.el("div", { class: "pc-actions" }, addBtn)
    );

    return A.el("article", { class: "product-card", dataset: { id: p.id } }, media, body);
  }

  /* ---------- Quick-view detail ---------- */
  function buildQuickView() {
    if (document.getElementById("quickView")) return;
    const d = A.el("aside", { id: "quickView", class: "drawer", role: "dialog", "aria-modal": "true" });
    d.innerHTML =
      '<div class="drawer-head"><h3>' + A.icon("info") + '<span data-i18n="details">' + A.escapeHtml(A.t("details")) + '</span></h3>' +
      '<button class="close-x" data-action="close-drawer">' + A.icon("close") + '</button></div>' +
      '<div class="drawer-body" id="qvBody"></div>';
    document.body.append(d);
  }

  function openQuickView(p) {
    buildQuickView();
    const body = document.getElementById("qvBody");
    const isKg = p.unit === "kg";
    const defaultW = isKg ? 500 : 1000;
    body.textContent = "";

    const media = A.el("div", { class: "qv-media" }, A.el("img", { src: p.img, alt: A.nameOf(p.name) }));
    if (p.bestseller) media.append(A.el("span", { class: "badge badge-best qv-badge", html: A.icon("star") + "<span>" + A.escapeHtml(A.t("bestseller_badge")) + "</span>" }));
    if (p.offer) media.append(A.el("span", { class: "badge badge-offer qv-badge2", text: "-" + p.offer + "%" }));

    const priceEl = A.el("span", { class: "pc-price", style: "font-size:26px" });
    const oldEl = A.el("span", { class: "pc-old hidden" });
    const unitEl = A.el("span", { class: "pc-unit" });
    function paint(w) {
      priceEl.innerHTML = '<span class="cur">₪</span>' + A.escapeHtml(A.fmtNum(A.unitPrice(p, w)));
      if (p.offer) { oldEl.textContent = A.money(A.oldUnitPrice(p, w)); oldEl.classList.remove("hidden"); }
      unitEl.textContent = isKg ? "/ " + A.t("per_kg").replace(/^\//, "") : A.t("per_piece");
    }
    paint(defaultW);

    let weightSel, controls;
    if (isKg) {
      weightSel = A.el("select", { "aria-label": A.t("select_weight") });
      DATA.WEIGHTS.forEach(g => {
        const o = A.el("option", { value: g, text: g >= 1000 ? "1 " + kgWord() : g + " " + gWord() });
        if (g === defaultW) o.selected = true;
        weightSel.append(o);
      });
      weightSel.addEventListener("change", () => paint(+weightSel.value));
      controls = A.el("div", { class: "weight-select", style: "max-width:220px" },
        A.el("span", { class: "wlabel", text: A.t("weight") }), weightSel);
    }

    const fav = A.el("button", { class: "btn btn-outline" + (isFav(p.id) ? " active-fav" : ""), html: A.icon("heart") + "<span>" + A.escapeHtml(A.t("favorites")) + "</span>", style: "color:var(--brown-700);border-color:var(--line)" });
    fav.addEventListener("click", () => { const now = toggleFav(p.id); fav.classList.toggle("active-fav", now); });

    const add = A.el("button", { class: "btn btn-gold", style: "flex:1", html: A.icon("cart") + "<span>" + A.escapeHtml(A.t("add_to_cart")) + "</span>" });
    add.addEventListener("click", () => {
      window.AdamCart.add(p.id, isKg ? +weightSel.value : 1000, 1);
      add.innerHTML = A.icon("check") + "<span>" + A.escapeHtml(A.t("added")) + "</span>";
      setTimeout(() => { add.innerHTML = A.icon("cart") + "<span>" + A.escapeHtml(A.t("add_to_cart")) + "</span>"; }, 1300);
    });

    const cat = catById(p.cat);
    body.append(
      media,
      A.el("div", { class: "qv-cat", text: cat ? A.nameOf(cat.name) : "" }),
      A.el("h2", { class: "qv-name", text: A.nameOf(p.name) }),
      p.desc ? A.el("p", { class: "qv-desc", text: A.nameOf(p.desc) }) : null,
      A.el("div", { class: "pc-price-row", style: "margin:6px 0 4px" }, priceEl, oldEl, unitEl),
      isKg ? controls : A.el("div", { class: "pc-unit", text: A.t("per_piece") }),
      A.el("div", { style: "display:flex;gap:10px;margin-top:18px" }, fav, add)
    );

    A.openDrawer("quickView");
  }

  /* ---------- Categories ---------- */
  function renderCategories() {
    const wrap = document.getElementById("cats");
    if (!wrap) return;
    wrap.textContent = "";
    const all = A.el("button", { class: "cat" + (state.cat === "all" ? " active" : ""), dataset: { cat: "all" } },
      A.el("div", { class: "cat-thumb" }, A.el("img", { src: LOGO, alt: "" })),
      A.el("span", { class: "cat-name", text: A.t("all_products") })
    );
    all.addEventListener("click", () => setCat("all"));
    wrap.append(all);

    DATA.CATEGORIES.forEach(c => {
      const node = A.el("button", { class: "cat" + (state.cat === c.id ? " active" : ""), dataset: { cat: c.id } },
        A.el("div", { class: "cat-thumb" }, A.el("img", { src: c.img, alt: A.nameOf(c.name), loading: "lazy" })),
        A.el("span", { class: "cat-name", text: A.nameOf(c.name) })
      );
      node.addEventListener("click", () => setCat(c.id));
      wrap.append(node);
    });
  }

  /* ---------- Subcategories ----------
     Show chips only when the active category defines subs AND at least
     two of them currently contain products (keeps thin groups hidden). */
  function renderSubcats() {
    const wrap = document.getElementById("subcats");
    if (!wrap) return;
    wrap.textContent = "";
    const cat = catById(state.cat);
    const subs = (cat && cat.subs) || [];
    const nonEmpty = subs.filter(s => DATA.PRODUCTS.some(p => p.cat === state.cat && p.sub === s.id));
    if (nonEmpty.length < 2) { wrap.classList.remove("show"); return; }
    wrap.classList.add("show");

    const mk = (id, label) => {
      const b = A.el("button", { class: "subcat" + (state.sub === id ? " active" : ""), dataset: { sub: id }, text: label });
      b.addEventListener("click", () => setSub(id));
      return b;
    };
    wrap.append(mk("all", A.t("all")));
    nonEmpty.forEach(s => wrap.append(mk(s.id, A.nameOf(s.name))));
  }

  function renderRail(containerId, list) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.textContent = "";
    list.forEach(p => wrap.append(card(p)));
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return DATA.PRODUCTS.filter(p => {
      if (state.cat !== "all" && p.cat !== state.cat) return false;
      if (state.sub !== "all" && p.sub !== state.sub) return false;
      if (q) {
        const hay = (p.name.ar + " " + p.name.he + " " + (p.desc ? p.desc.ar + " " + p.desc.he : "")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderCatalog() {
    const wrap = document.getElementById("catalog");
    if (!wrap) return;
    const list = filtered();
    wrap.textContent = "";

    const titleEl = document.getElementById("catalog-title");
    if (titleEl) {
      if (state.q) titleEl.textContent = A.t("results_for") + ' "' + state.q + '"';
      else if (state.cat === "all") titleEl.textContent = A.t("all_products");
      else { const c = catById(state.cat); titleEl.textContent = c ? A.nameOf(c.name) : A.t("all_products"); }
    }

    if (!list.length) {
      wrap.classList.remove("stagger", "in-view");
      wrap.append(A.el("div", { class: "empty-state" },
        A.el("div", { html: A.icon("search") }),
        A.el("h4", { text: A.t("no_results") })
      ));
      return;
    }
    list.forEach(p => wrap.append(card(p)));
    wrap.classList.add("stagger");
    requestAnimationFrame(() => wrap.classList.add("in-view"));
  }

  function setCat(id) {
    state.cat = id;
    state.sub = "all";
    document.querySelectorAll(".cat").forEach(c => c.classList.toggle("active", c.dataset.cat === id));
    renderSubcats();
    renderCatalog();
    const sec = document.getElementById("catalog-section");
    if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setSub(id) {
    state.sub = id;
    document.querySelectorAll(".subcat").forEach(c => c.classList.toggle("active", c.dataset.sub === id));
    renderCatalog();
  }

  /* ---------- Search ---------- */
  function initSearch() {
    const input = document.getElementById("search");
    if (!input) return;
    const bar = input.closest(".search-bar");
    const clear = bar && bar.querySelector(".search-clear");
    let tmr;
    input.addEventListener("input", () => {
      if (bar) bar.classList.toggle("has-text", input.value.length > 0);
      clearTimeout(tmr);
      tmr = setTimeout(() => { state.q = A.sanitizeInput(input.value, { maxLen: 60 }); renderCatalog(); }, 120);
    });
    if (clear) clear.addEventListener("click", () => {
      input.value = ""; state.q = ""; bar.classList.remove("has-text"); renderCatalog(); input.focus();
    });
  }

  /* ---------- Favourites drawer ---------- */
  function openFavorites() {
    const body = document.getElementById("favBody");
    if (!body) return;
    body.textContent = "";
    const list = DATA.PRODUCTS.filter(p => isFav(p.id));
    if (!list.length) {
      body.append(A.el("div", { class: "empty-state" },
        A.el("div", { html: A.icon("heart") }),
        A.el("h4", { text: A.t("empty_fav") }),
        A.el("p", { text: A.t("empty_fav_hint") })
      ));
    } else {
      const grid = A.el("div", { class: "product-grid" });
      list.forEach(p => grid.append(card(p)));
      body.append(grid);
    }
    A.openDrawer("favDrawer");
  }

  /* ---------- Public ---------- */
  function renderAll() {
    renderCategories();
    renderSubcats();
    renderRail("bestsellers", DATA.PRODUCTS.filter(p => p.bestseller));
    renderRail("offers-grid", DATA.PRODUCTS.filter(p => p.offer));
    renderCatalog();
    updateFavCount();
  }

  function init() {
    const params = new URLSearchParams(location.search);
    const c = params.get("cat");
    if (c && (c === "all" || DATA.CATEGORIES.some(x => x.id === c))) state.cat = c;
    buildQuickView();
    initSearch();
    renderAll();
  }

  window.AdamProducts = { init, renderAll, openFavorites, openQuickView, isFav, productCard: card };
})();
