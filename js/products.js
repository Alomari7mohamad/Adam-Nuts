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
  const state = { cat: "nuts", sub: "all", q: "" };

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
  function weightText(g) { return g >= 1000 ? "1 " + kgWord() : g + " " + gWord(); }
  function priceUnitText(p, isKg, weight) {
    if (isKg) return "/ " + weightText(weight);
    if (p.fixedWeight) return "/ " + A.nameOf(p.fixedWeight);
    return A.t("per_piece");
  }
  const PRODUCT_ORDER = {
    nuts: [
      "nuts-13", "nuts-10", "nuts-14", "nuts-7", "nuts-6",
      "nuts-15", "nuts-16", "nuts-11", "nuts-8", "nuts-5"
    ],
    "natural-nuts": ["nat-7", "nat-8", "nat-9", "nat-6", "nat-2"],
    espresso: ["esp-8", "esp-9", "esp-10"]
  };
  function sortProducts(list) {
    return list.map((product, index) => ({ product, index })).sort((a, b) => {
      if (a.product.cat !== b.product.cat) {
        const ac = DATA.CATEGORIES.findIndex(c => c.id === a.product.cat);
        const bc = DATA.CATEGORIES.findIndex(c => c.id === b.product.cat);
        return ac - bc;
      }
      const order = PRODUCT_ORDER[a.product.cat] || [];
      const ai = order.indexOf(a.product.id);
      const bi = order.indexOf(b.product.id);
      const ar = ai < 0 ? order.length + a.index : ai;
      const br = bi < 0 ? order.length + b.index : bi;
      return ar - br;
    }).map(entry => entry.product);
  }
  function weightButtons(defaultW, onChange) {
    let selected = defaultW;
    const wrap = A.el("div", { class: "weight-buttons", role: "group", "aria-label": A.t("select_weight") });
    DATA.WEIGHTS.forEach(g => {
      const b = A.el("button", { type: "button", class: "weight-chip" + (g === selected ? " active" : ""), text: weightText(g), dataset: { weight: String(g) } });
      b.addEventListener("click", () => {
        selected = g;
        wrap.querySelectorAll(".weight-chip").forEach(x => x.classList.toggle("active", +x.dataset.weight === selected));
        onChange(selected);
      });
      wrap.append(b);
    });
    return { wrap, get value() { return selected; }, set value(v) { selected = +v; wrap.querySelectorAll(".weight-chip").forEach(x => x.classList.toggle("active", +x.dataset.weight === selected)); } };
  }

  /* ---------- Card builder ---------- */
  function card(p) {
    const isKg = p.unit === "kg";
    const defaultW = p.cat === "spices" ? 100 : 1000;

    const img = A.el("img", { src: p.img, alt: A.nameOf(p.name), loading: "lazy", decoding: "async" });
    const media = A.el("div", { class: "pc-media", role: "button", tabindex: "0", "aria-label": A.t("details") }, img);
    media.addEventListener("click", () => openQuickView(p));
    media.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openQuickView(p);
      }
    });

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
      if (p.customMix) {
        priceEl.textContent = A.t("price_on_selection");
        unitEl.textContent = "";
        return;
      }
      priceEl.innerHTML = '<span class="cur">₪</span>' + A.escapeHtml(A.fmtNum(A.unitPrice(p, w)));
      if (p.offer) { oldEl.textContent = A.money(A.oldUnitPrice(p, w)); oldEl.classList.remove("hidden"); }
      unitEl.textContent = priceUnitText(p, isKg, w);
    }
    paintPrice(defaultW);
    const priceRow = A.el("div", { class: "pc-price-row" }, priceEl, oldEl, unitEl);

    const addBtn = A.el("button", { class: "add-btn", html: A.icon("cart") + "<span>" + A.escapeHtml(A.t("add_to_cart")) + "</span>" });
    addBtn.addEventListener("click", () => openQuickView(p));

    const nameEl = A.el("button", { class: "pc-name", text: A.nameOf(p.name) });
    nameEl.addEventListener("click", () => openQuickView(p));

    const body = A.el("div", { class: "pc-body" },
      nameEl,
      p.desc ? A.el("p", { class: "pc-desc", text: A.nameOf(p.desc) }) : null,
      priceRow,
      A.el("div", { class: "pc-actions" }, addBtn)
    );

    return A.el("article", { class: "product-card", dataset: { id: p.id } }, media, body);
  }

  /* ---------- Quick-view detail ---------- */
  function buildQuickView() {
    if (document.getElementById("quickView")) return;
    const d = A.el("aside", { id: "quickView", class: "drawer product-modal", role: "dialog", "aria-modal": "true" });
    d.innerHTML =
      '<div class="drawer-head"><h3>' + A.icon("info") + '<span data-i18n="details">' + A.escapeHtml(A.t("details")) + '</span></h3>' +
      '<button class="close-x" data-action="close-drawer">' + A.icon("close") + '</button></div>' +
      '<div class="drawer-body" id="qvBody"></div>';
    document.body.append(d);
    const close = d.querySelector("[data-action='close-drawer']");
    if (close) close.addEventListener("click", A.closeAllDrawers);
  }

  function openQuickView(p, opts) {
    opts = opts || {};
    if (p.customMix) { openCustomMix(p, opts); return; }
    buildQuickView();
    const body = document.getElementById("qvBody");
    const isKg = p.unit === "kg";
    const defaultW = opts.weight || (isKg ? (p.cat === "spices" ? 100 : 500) : 1000);
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
      unitEl.textContent = priceUnitText(p, isKg, w);
    }
    paint(defaultW);

    let weightPick, controls;
    if (isKg) {
      weightPick = weightButtons(defaultW, paint);
      controls = A.el("div", { class: "weight-select weight-button-wrap" },
        A.el("span", { class: "wlabel", text: A.t("weight") }), weightPick.wrap);
    }

    const fav = A.el("button", { class: "btn btn-outline" + (isFav(p.id) ? " active-fav" : ""), html: A.icon("heart") + "<span>" + A.escapeHtml(A.t("favorites")) + "</span>", style: "color:var(--brown-700);border-color:var(--line)" });
    fav.addEventListener("click", () => { const now = toggleFav(p.id); fav.classList.toggle("active-fav", now); });

    const notes = A.el("textarea", { class: "product-notes", maxlength: "180", placeholder: A.t("product_notes_ph"), "aria-label": A.t("product_notes") });
    if (opts.notes) notes.value = opts.notes;

    const add = A.el("button", { class: "btn btn-gold", style: "flex:1", html: A.icon("cart") + "<span>" + A.escapeHtml(opts.replaceKey ? A.t("save_changes") : A.t("add_to_cart")) + "</span>" });
    add.addEventListener("click", () => {
      const note = A.sanitizeInput(notes.value, { maxLen: 180, multiline: true });
      if (opts.replaceKey) window.AdamCart.remove(opts.replaceKey);
      window.AdamCart.add(p.id, isKg ? weightPick.value : 1000, 1, note);
      add.innerHTML = A.icon("check") + "<span>" + A.escapeHtml(A.t("added")) + "</span>";
      setTimeout(() => { A.closeAllDrawers(); add.innerHTML = A.icon("cart") + "<span>" + A.escapeHtml(A.t("add_to_cart")) + "</span>"; }, 650);
    });

    const cat = catById(p.cat);
    body.append(
      media,
      A.el("div", { class: "qv-cat", text: cat ? A.nameOf(cat.name) : "" }),
      A.el("h2", { class: "qv-name", text: A.nameOf(p.name) }),
      p.desc ? A.el("p", { class: "qv-desc", text: A.nameOf(p.desc) }) : null,
      A.el("div", { class: "pc-price-row", style: "margin:6px 0 4px" }, priceEl, oldEl, unitEl),
      isKg ? controls : A.el("div", { class: "pc-unit", text: A.t("per_piece") }),
      A.el("div", { class: "field product-note-field" },
        A.el("label", { text: A.t("product_notes") }),
        notes
      ),
      A.el("div", { class: "qv-actions" }, fav, add)
    );

    A.openDrawer("quickView");
  }

  function openCustomMix(p, opts) {
    buildQuickView();
    const body = document.getElementById("qvBody");
    body.textContent = "";
    const choices = sortProducts(DATA.PRODUCTS.filter(x => x.cat === "nuts" && x.unit === "kg" && !x.customMix && x.id !== "adam-mix"));
    const selected = new Map();
    let activeId = null;
    const priceEl = A.el("span", { class: "pc-price", style: "font-size:24px" });
    function calc() {
      let total = 0;
      selected.forEach((weight, id) => {
        const item = DATA.PRODUCTS.find(x => x.id === id);
        if (item) total += A.unitPrice(item, weight);
      });
      if (total > 0) {
        priceEl.innerHTML = '<span class="cur">₪</span>' + A.escapeHtml(A.fmtNum(total));
      } else {
        priceEl.textContent = A.t("price_on_selection");
      }
      add.disabled = total <= 0;
      return total;
    }
    const list = A.el("div", { class: "mix-builder" });

    function syncCards() {
      list.querySelectorAll(".mix-card").forEach(card => {
        const id = card.dataset.productId;
        card.classList.toggle("active", selected.has(id));
        card.setAttribute("aria-pressed", String(selected.has(id)));
      });
    }

    function closeWeightDialog() {
      document.querySelector("#quickView .mix-weight-layer")?.remove();
      activeId = null;
    }

    function openWeightDialog(item) {
      closeWeightDialog();
      activeId = item.id;
      const layer = A.el("div", { class: "mix-weight-layer" });
      const dialog = A.el("div", {
        class: "mix-weight-dialog",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": A.lang() === "he" ? "בחירת משקל" : "اختيار الوزن"
      });
      let pendingWeight = selected.get(item.id) || 100;
      const picker = weightButtons(pendingWeight, weight => { pendingWeight = weight; });
      const close = A.el("button", {
        type: "button",
        class: "mix-dialog-close",
        "aria-label": A.lang() === "he" ? "סגירה" : "إغلاق",
        html: A.icon("close")
      });
      close.addEventListener("click", closeWeightDialog);
      const confirm = A.el("button", {
        type: "button",
        class: "btn btn-gold mix-confirm",
        html: A.icon("check") + "<span>" + A.escapeHtml(A.lang() === "he" ? "אישור המשקל" : "تأكيد الوزن") + "</span>"
      });
      confirm.addEventListener("click", () => {
        selected.set(item.id, pendingWeight);
        syncCards();
        calc();
        closeWeightDialog();
      });
      const actions = A.el("div", { class: "mix-dialog-actions" }, confirm);
      if (selected.has(item.id)) {
        const remove = A.el("button", {
          type: "button",
          class: "btn btn-outline mix-remove",
          html: A.icon("trash") + "<span>" + A.escapeHtml(A.lang() === "he" ? "הסרה מהתערובת" : "حذف من المخلوطة") + "</span>"
        });
        remove.addEventListener("click", () => {
          selected.delete(item.id);
          syncCards();
          calc();
          closeWeightDialog();
        });
        actions.prepend(remove);
      }
      dialog.append(
        close,
        A.el("img", { class: "mix-dialog-image", src: item.img, alt: A.nameOf(item.name) }),
        A.el("h3", { text: A.nameOf(item.name) }),
        A.el("p", { text: A.lang() === "he" ? "בחרו את המשקל הרצוי" : "اختر الوزن المطلوب" }),
        picker.wrap,
        actions
      );
      layer.append(dialog);
      layer.addEventListener("click", event => {
        if (event.target === layer) closeWeightDialog();
      });
      document.getElementById("quickView").append(layer);
      requestAnimationFrame(() => layer.classList.add("show"));
      close.focus();
    }

    choices.forEach(item => {
      const card = A.el("button", {
        type: "button",
        class: "mix-card",
        "aria-pressed": "false",
        dataset: { productId: item.id }
      },
        A.el("span", { class: "mix-card-check", html: A.icon("check") }),
        A.el("img", { src: item.img, alt: "" }),
        A.el("strong", { text: A.nameOf(item.name) }),
        A.el("small", { text: A.money(A.unitPrice(item, 100)) + " / " + weightText(100) })
      );
      card.addEventListener("click", () => {
        openWeightDialog(item);
      });
      list.append(card);
    });
    const notes = A.el("textarea", { class: "product-notes", maxlength: "180", placeholder: A.t("product_notes_ph"), "aria-label": A.t("product_notes") });
    const add = A.el("button", { class: "btn btn-gold btn-block", disabled: "disabled", html: A.icon("cart") + "<span>" + A.escapeHtml(A.t("add_to_cart")) + "</span>" });
    add.addEventListener("click", () => {
      const components = [];
      selected.forEach((weight, id) => {
        const item = DATA.PRODUCTS.find(x => x.id === id);
        if (item) components.push({ id, weight, name: A.nameOf(item.name), price: A.unitPrice(item, weight) });
      });
      if (!components.length) return;
      const total = calc();
      const componentNotes = components.map(c => c.name + " " + weightText(c.weight)).join("، ");
      const note = [componentNotes, A.sanitizeInput(notes.value, { maxLen: 180, multiline: true })].filter(Boolean).join("\n");
      if (opts.replaceKey) window.AdamCart.remove(opts.replaceKey);
      window.AdamCart.add(p.id, 1000, 1, note, { customPrice: total, components });
      setTimeout(() => A.closeAllDrawers(), 500);
    });
    body.append(
      A.el("div", { class: "qv-media" }, A.el("img", { src: p.img, alt: A.nameOf(p.name) })),
      A.el("h2", { class: "qv-name", text: A.nameOf(p.name) }),
      A.el("p", { class: "qv-desc", text: A.nameOf(p.desc) }),
      A.el("div", { class: "mix-total" }, A.el("span", { text: A.t("mix_total") }), priceEl),
      A.el("h3", { class: "mix-title", text: A.t("choose_mix_items") }),
      list,
      A.el("div", { class: "field product-note-field" }, A.el("label", { text: A.t("product_notes") }), notes),
      add
    );
    calc();
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
    return sortProducts(DATA.PRODUCTS.filter(p => {
      if (state.cat !== "all" && p.cat !== state.cat) return false;
      if (state.sub !== "all" && p.sub !== state.sub) return false;
      if (q) {
        const hay = (p.name.ar + " " + p.name.he + " " + (p.desc ? p.desc.ar + " " + p.desc.he : "")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }));
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
    const drawer = document.getElementById("favDrawer");
    if (drawer && drawer.classList.contains("show")) {
      A.closeAllDrawers();
      return;
    }
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
    A.toggleDrawer("favDrawer");
  }

  /* ---------- Public ---------- */
  function renderAll() {
    renderCategories();
    renderSubcats();
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
