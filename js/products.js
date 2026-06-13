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
  function hasPrice(value) {
    return value != null && value !== "" && Number.isFinite(+value);
  }
  function priceHtml(value) {
    return hasPrice(value) ? '<span class="cur">₪</span>' + A.escapeHtml(A.fmtNum(value)) : "";
  }
  function isAvailable(p) {
    return !p || p.available !== false;
  }
  function promoFor(p) {
    return (DATA.PROMOS || []).find(promo => promo.ids.includes(p.id));
  }
  function promoById(id) {
    return (DATA.PROMOS || []).find(promo => promo.id === id);
  }
  function promoSave(promo) {
    return Math.max(0, promo.qty * promo.unitPrice - promo.bundlePrice);
  }
  function promoHint(promo) {
    return A.t("promo_6_hint")
      .replace("{qty}", promo.qty)
      .replace("{price}", A.money(promo.bundlePrice))
      .replace("{save}", A.money(promoSave(promo)));
  }
  const PRODUCT_ORDER = {
    nuts: [
      "nuts-13", "nuts-10", "nuts-14", "nuts-7", "nuts-6",
      "nuts-15", "nuts-16", "nuts-11", "nuts-8", "nuts-5"
    ],
    "natural-nuts": ["nat-7", "nat-8", "nat-9", "nat-6", "nat-2"],
    espresso: ["esp-8", "esp-9", "esp-10"],
    specials: ["offer-espresso-6", "esp-1", "esp-2", "esp-11", "esp-12", "esp-13", "esp-23"]
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
    const available = isAvailable(p);

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
    const promo = promoFor(p);
    if (p.bestseller) badges.append(A.el("span", { class: "badge badge-best", html: A.icon("star") + "<span>" + A.escapeHtml(A.t("bestseller_badge")) + "</span>" }));
    if (p.offer) badges.append(A.el("span", { class: "badge badge-offer", text: "-" + p.offer + "%" }));
    if (promo) badges.append(A.el("span", { class: "badge badge-offer", text: promo.qty + "=" + promo.bundlePrice }));
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
      const price = A.unitPrice(p, w);
      priceEl.innerHTML = priceHtml(price);
      oldEl.classList.add("hidden");
      oldEl.textContent = "";
      if (p.offer && hasPrice(A.oldUnitPrice(p, w))) { oldEl.textContent = A.money(A.oldUnitPrice(p, w)); oldEl.classList.remove("hidden"); }
      unitEl.textContent = hasPrice(price) ? priceUnitText(p, isKg, w) : "";
    }
    paintPrice(defaultW);
    const priceRow = A.el("div", { class: "pc-price-row" }, priceEl, oldEl, unitEl);

    const addBtn = A.el("button", { class: "add-btn", html: A.icon("cart") + "<span>" + A.escapeHtml(A.t("add_to_cart")) + "</span>", disabled: available ? null : "disabled" });
    addBtn.addEventListener("click", () => { if (available) openQuickView(p); });

    const nameEl = A.el("button", { class: "pc-name", text: A.nameOf(p.name) });
    nameEl.addEventListener("click", () => openQuickView(p));

    const body = A.el("div", { class: "pc-body" },
      nameEl,
      p.desc ? A.el("p", { class: "pc-desc", text: A.nameOf(p.desc) }) : null,
      priceRow,
      promo ? A.el("div", { class: "promo-hint", text: promoHint(promo) }) : null,
      A.el("div", { class: "pc-actions" }, addBtn)
    );

    return A.el("article", { class: "product-card" + (available ? "" : " unavailable"), dataset: { id: p.id } }, media, body);
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

  function openImageZoom(src, alt) {
    document.querySelector(".image-zoom-layer")?.remove();
    const layer = A.el("div", { class: "image-zoom-layer", role: "dialog", "aria-modal": "true" },
      A.el("button", { class: "image-zoom-close", type: "button", "aria-label": A.t("back"), html: A.icon("close") }),
      A.el("img", { src, alt: alt || "" })
    );
    layer.addEventListener("click", event => {
      if (event.target === layer || event.target.closest(".image-zoom-close")) layer.remove();
    });
    document.body.append(layer);
    requestAnimationFrame(() => layer.classList.add("show"));
  }

  function openQuickView(p, opts) {
    opts = opts || {};
    if (p.customMix) { openCustomMix(p, opts); return; }
    if (p.offerBundle) { openOfferBundle(p, opts); return; }
    const available = isAvailable(p);
    buildQuickView();
    const body = document.getElementById("qvBody");
    const isKg = p.unit === "kg";
    const defaultW = opts.weight || (isKg ? (p.cat === "spices" ? 100 : 500) : 1000);
    body.textContent = "";

    const mediaImg = A.el("img", { src: p.img, alt: A.nameOf(p.name) });
    const media = A.el("button", { type: "button", class: "qv-media qv-media-click", "aria-label": A.nameOf(p.name) }, mediaImg);
    media.addEventListener("click", () => openImageZoom(p.img, A.nameOf(p.name)));
    const promo = promoFor(p);
    if (p.bestseller) media.append(A.el("span", { class: "badge badge-best qv-badge", html: A.icon("star") + "<span>" + A.escapeHtml(A.t("bestseller_badge")) + "</span>" }));
    if (p.offer) media.append(A.el("span", { class: "badge badge-offer qv-badge2", text: "-" + p.offer + "%" }));
    if (promo) media.append(A.el("span", { class: "badge badge-offer qv-badge2", text: promo.qty + "=" + promo.bundlePrice }));

    const priceEl = A.el("span", { class: "pc-price", style: "font-size:26px" });
    const oldEl = A.el("span", { class: "pc-old hidden" });
    const unitEl = A.el("span", { class: "pc-unit" });
    function paint(w) {
      const price = A.unitPrice(p, w);
      priceEl.innerHTML = priceHtml(price);
      oldEl.classList.add("hidden");
      oldEl.textContent = "";
      if (p.offer && hasPrice(A.oldUnitPrice(p, w))) { oldEl.textContent = A.money(A.oldUnitPrice(p, w)); oldEl.classList.remove("hidden"); }
      unitEl.textContent = hasPrice(price) ? priceUnitText(p, isKg, w) : "";
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

    const add = A.el("button", { class: "btn btn-gold", style: "flex:1", disabled: available ? null : "disabled", html: A.icon("cart") + "<span>" + A.escapeHtml(opts.replaceKey ? A.t("save_changes") : A.t("add_to_cart")) + "</span>" });
    add.addEventListener("click", () => {
      if (!available) return;
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
      promo ? A.el("div", { class: "promo-hint qv-promo-hint", text: promoHint(promo) }) : null,
      isKg ? controls : A.el("div", { class: "pc-unit", text: A.t("per_piece") }),
      A.el("div", { class: "field product-note-field" },
        A.el("label", { text: A.t("product_notes") }),
        notes
      ),
      A.el("div", { class: "qv-actions" }, fav, add)
    );

    A.openDrawer("quickView");
  }

  function openOfferBundle(p, opts) {
    opts = opts || {};
    const available = isAvailable(p);
    buildQuickView();
    const body = document.getElementById("qvBody");
    body.textContent = "";
    const promo = promoById(p.offerBundle);
    if (!promo) { openQuickView(Object.assign({}, p, { offerBundle: null }), opts); return; }
    const choices = promo.ids.map(id => DATA.PRODUCTS.find(x => x.id === id)).filter(Boolean);
    const selected = new Map();
    if (Array.isArray(opts.components)) {
      opts.components.forEach(c => {
        if (c && c.id && Number.isInteger(+c.qty) && +c.qty > 0) selected.set(c.id, Math.min(+c.qty, promo.qty));
      });
    }

    const countEl = A.el("span", { class: "offer-count" });
    const add = A.el("button", { class: "btn btn-gold btn-block", disabled: "disabled", html: A.icon("cart") + "<span>" + A.escapeHtml(opts.replaceKey ? A.t("save_changes") : A.t("add_to_cart")) + "</span>" });
    const list = A.el("div", { class: "mix-builder offer-builder" });

    function totalQty() {
      let total = 0;
      selected.forEach(qty => { total += qty; });
      return total;
    }
    function sync() {
      const total = totalQty();
      countEl.textContent = A.t("offer_selected_count").replace("{count}", total).replace("{qty}", promo.qty);
      add.disabled = !available || total !== promo.qty;
      list.querySelectorAll(".mix-card").forEach(card => {
        const qty = selected.get(card.dataset.productId) || 0;
        const item = DATA.PRODUCTS.find(x => x.id === card.dataset.productId);
        const itemAvailable = isAvailable(item);
        card.classList.toggle("active", qty > 0);
        card.classList.toggle("unavailable", !itemAvailable);
        card.setAttribute("aria-pressed", String(qty > 0));
        const qtyEl = card.querySelector(".offer-card-qty");
        if (qtyEl) qtyEl.textContent = String(qty);
        const minus = card.querySelector("[data-offer-minus]");
        const plus = card.querySelector("[data-offer-plus]");
        if (minus) minus.disabled = !itemAvailable || qty <= 0;
        if (plus) plus.disabled = !itemAvailable || total >= promo.qty;
      });
    }
    function setQty(id, qty) {
      const item = DATA.PRODUCTS.find(x => x.id === id);
      if (!available || !isAvailable(item)) return;
      qty = Math.max(0, Math.min(promo.qty, qty));
      if (qty) selected.set(id, qty);
      else selected.delete(id);
      sync();
    }

    choices.forEach(item => {
      const qty = A.el("span", { class: "offer-card-qty", text: "0" });
      const minus = A.el("button", { type: "button", class: "offer-card-step", "data-offer-minus": "true", "aria-label": "-", html: A.icon("minus") });
      const plus = A.el("button", { type: "button", class: "offer-card-step", "data-offer-plus": "true", "aria-label": "+", html: A.icon("plus") });
      const card = A.el("div", { class: "mix-card offer-card", "aria-pressed": "false", dataset: { productId: item.id } },
        A.el("span", { class: "mix-card-check", html: A.icon("check") }),
        A.el("img", { src: item.img, alt: "" }),
        A.el("strong", { text: A.nameOf(item.name) }),
        A.el("small", { text: A.money(item.price) ? A.money(item.price) + " / " + A.t("per_piece") : "" }),
        A.el("div", { class: "offer-card-controls" }, minus, qty, plus)
      );
      card.addEventListener("click", event => {
        if (!available || !isAvailable(item)) return;
        if (event.target.closest(".offer-card-step")) return;
        const current = selected.get(item.id) || 0;
        if (current > 0) setQty(item.id, 0);
        else if (totalQty() < promo.qty) setQty(item.id, 1);
      });
      minus.addEventListener("click", () => setQty(item.id, (selected.get(item.id) || 0) - 1));
      plus.addEventListener("click", () => setQty(item.id, (selected.get(item.id) || 0) + 1));
      list.append(card);
    });

    add.addEventListener("click", () => {
      if (!available) return;
      if (totalQty() !== promo.qty) { A.toast(A.t("offer_must_choose").replace("{qty}", promo.qty), "info"); return; }
      const components = [];
      selected.forEach((qty, id) => {
        const item = DATA.PRODUCTS.find(x => x.id === id);
        if (item) components.push({ id, qty, name: A.nameOf(item.name), price: item.price * qty });
      });
      const note = components.map(c => c.name + " × " + c.qty).join("، ");
      if (opts.replaceKey) window.AdamCart.remove(opts.replaceKey);
      window.AdamCart.add(p.id, 1000, 1, note, { customPrice: promo.bundlePrice, components, userNotes: "" });
      setTimeout(() => A.closeAllDrawers(), 500);
    });

    body.append(
      A.el("button", { type: "button", class: "qv-media qv-media-click", "aria-label": A.nameOf(p.name), onclick: () => openImageZoom(p.img, A.nameOf(p.name)) }, A.el("img", { src: p.img, alt: A.nameOf(p.name) })),
      A.el("h2", { class: "qv-name", text: A.nameOf(p.name) }),
      A.el("p", { class: "qv-desc", text: A.nameOf(p.desc) }),
      A.el("div", { class: "mix-total offer-total" }, A.el("span", { text: A.t("mix_total") }), A.el("strong", { text: A.money(promo.bundlePrice) })),
      A.el("div", { class: "offer-count-row" }, countEl),
      A.el("h3", { class: "mix-title", text: A.t("choose_offer_items") }),
      list,
      add
    );
    sync();
    A.openDrawer("quickView");
  }

  function openCustomMix(p, opts) {
    opts = opts || {};
    const available = isAvailable(p);
    buildQuickView();
    const body = document.getElementById("qvBody");
    body.textContent = "";
    const choices = sortProducts(DATA.PRODUCTS.filter(x => x.cat === "nuts" && x.unit === "kg" && !x.customMix && x.id !== "adam-mix"));
    const selected = new Map();
    if (Array.isArray(opts.components)) {
      opts.components.forEach(c => {
        if (c && c.id && Number.isFinite(+c.weight)) selected.set(c.id, +c.weight);
      });
    }
    let activeId = null;
    const priceEl = A.el("span", { class: "pc-price", style: "font-size:24px" });
    function calc() {
      let total = 0;
      selected.forEach((weight, id) => {
        const item = DATA.PRODUCTS.find(x => x.id === id);
        if (item && hasPrice(A.unitPrice(item, weight))) total += A.unitPrice(item, weight);
      });
      if (total > 0) {
        priceEl.innerHTML = priceHtml(total);
      } else {
        priceEl.textContent = A.t("price_on_selection");
      }
      add.disabled = !available || total <= 0;
      return total;
    }
    const list = A.el("div", { class: "mix-builder" });
    function cleanEditNotes() {
      if (opts.userNotes) return opts.userNotes;
      if (!opts.components?.length || !opts.notes) return opts.notes || "";
      return String(opts.notes).split("\n").slice(1).join("\n");
    }

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
      if (!available || !isAvailable(item)) return;
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
        class: "mix-card" + (isAvailable(item) ? "" : " unavailable"),
        disabled: isAvailable(item) ? null : "disabled",
        "aria-pressed": "false",
        dataset: { productId: item.id }
      },
        A.el("span", { class: "mix-card-check", html: A.icon("check") }),
        A.el("img", { src: item.img, alt: "" }),
        A.el("strong", { text: A.nameOf(item.name) }),
        A.el("small", { text: A.money(A.unitPrice(item, 100)) ? A.money(A.unitPrice(item, 100)) + " / " + weightText(100) : "" })
      );
      card.addEventListener("click", () => {
        openWeightDialog(item);
      });
      list.append(card);
    });
    const notes = A.el("textarea", { class: "product-notes", maxlength: "180", placeholder: A.t("product_notes_ph"), "aria-label": A.t("product_notes") });
    notes.value = cleanEditNotes();
    const add = A.el("button", { class: "btn btn-gold btn-block", disabled: "disabled", html: A.icon("cart") + "<span>" + A.escapeHtml(opts.replaceKey ? A.t("save_changes") : A.t("add_to_cart")) + "</span>" });
    add.addEventListener("click", () => {
      if (!available) return;
      const components = [];
      selected.forEach((weight, id) => {
        const item = DATA.PRODUCTS.find(x => x.id === id);
        if (item) components.push({ id, weight, name: A.nameOf(item.name), price: A.unitPrice(item, weight) });
      });
      if (!components.length) return;
      const total = calc();
      const componentNotes = components.map(c => c.name + " " + weightText(c.weight)).join("، ");
      const userNotes = A.sanitizeInput(notes.value, { maxLen: 180, multiline: true });
      const note = [componentNotes, userNotes].filter(Boolean).join("\n");
      if (opts.replaceKey) window.AdamCart.remove(opts.replaceKey);
      window.AdamCart.add(p.id, 1000, 1, note, { customPrice: total, components, userNotes });
      setTimeout(() => A.closeAllDrawers(), 500);
    });
    body.append(
      A.el("button", { type: "button", class: "qv-media qv-media-click", "aria-label": A.nameOf(p.name), onclick: () => openImageZoom(p.img, A.nameOf(p.name)) }, A.el("img", { src: p.img, alt: A.nameOf(p.name) })),
      A.el("h2", { class: "qv-name", text: A.nameOf(p.name) }),
      A.el("p", { class: "qv-desc", text: A.nameOf(p.desc) }),
      A.el("div", { class: "mix-total" }, A.el("span", { text: A.t("mix_total") }), priceEl),
      A.el("h3", { class: "mix-title", text: A.t("choose_mix_items") }),
      list,
      A.el("div", { class: "field product-note-field" }, A.el("label", { text: A.t("product_notes") }), notes),
      add
    );
    calc();
    syncCards();
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
    updateCatsArrows();
  }

  function updateCatsArrows() {
    const wrap = document.getElementById("cats");
    const box = wrap && wrap.closest(".cats-wrap");
    if (!wrap || !box) return;
    const max = Math.max(0, wrap.scrollWidth - wrap.clientWidth - 2);
    const prev = box.querySelector(".cats-arrow-prev");
    const next = box.querySelector(".cats-arrow-next");
    if (prev) prev.classList.toggle("hidden", max <= 0);
    if (next) next.classList.toggle("hidden", max <= 0);
    box.classList.toggle("no-scroll", max <= 0);
  }

  function initCatsArrows() {
    const wrap = document.getElementById("cats");
    const box = wrap && wrap.closest(".cats-wrap");
    if (!wrap || !box || box.dataset.ready) return;
    box.dataset.ready = "true";
    box.querySelectorAll("[data-cats-scroll]").forEach(btn => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.catsScroll) || 1;
        wrap.scrollBy({ left: dir * Math.max(160, wrap.clientWidth * 0.65), behavior: "smooth" });
      });
    });
    wrap.addEventListener("scroll", updateCatsArrows, { passive: true });
    window.addEventListener("resize", updateCatsArrows);
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

  function haystack(p) {
    return (p.name.ar + " " + p.name.he + " " + (p.desc ? p.desc.ar + " " + p.desc.he : "")).toLowerCase();
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    const list = DATA.PRODUCTS.filter(p => {
      if (q) return haystack(p).includes(q);
      if (state.cat === "specials" && p.cat !== "specials" && !promoFor(p)) return false;
      if (state.cat === "specials") return !q || (p.name.ar + " " + p.name.he + " " + (p.desc ? p.desc.ar + " " + p.desc.he : "")).toLowerCase().includes(q);
      if (state.cat !== "all" && p.cat !== state.cat) return false;
      if (state.sub !== "all" && p.sub !== state.sub) return false;
      return true;
    });
    if (state.cat === "specials") {
      const order = PRODUCT_ORDER.specials || [];
      return list.map((product, index) => ({ product, index })).sort((a, b) => {
        const ai = order.indexOf(a.product.id);
        const bi = order.indexOf(b.product.id);
        return (ai < 0 ? order.length + a.index : ai) - (bi < 0 ? order.length + b.index : bi);
      }).map(entry => entry.product);
    }
    return sortProducts(list);
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
    const wrap = input.closest(".search-wrap");
    const suggestions = A.el("div", { class: "search-suggest hidden", role: "listbox" });
    if (wrap && !wrap.querySelector(".search-suggest")) wrap.append(suggestions);

    function matches(q) {
      q = q.trim().toLowerCase();
      if (!q) return [];
      return sortProducts(DATA.PRODUCTS.filter(p => haystack(p).includes(q))).slice(0, 3);
    }

    function hideSuggestions() {
      suggestions.classList.add("hidden");
      suggestions.textContent = "";
    }

    function showSuggestions(q) {
      const list = matches(q);
      suggestions.textContent = "";
      if (!list.length) { hideSuggestions(); return; }
      list.forEach(p => {
        const item = A.el("button", { type: "button", class: "search-suggest-item", role: "option" },
          A.el("img", { src: p.img, alt: "" }),
          A.el("span", { class: "search-suggest-text" },
            A.el("strong", { text: A.nameOf(p.name) }),
            A.el("small", { text: p.customMix ? A.t("price_on_selection") : A.money(A.unitPrice(p, p.unit === "kg" ? (p.cat === "spices" ? 100 : 1000) : 1000)) })
          )
        );
        item.addEventListener("click", () => {
          input.value = A.nameOf(p.name);
          state.q = A.sanitizeInput(input.value, { maxLen: 60 });
          hideSuggestions();
          renderCatalog();
          openQuickView(p);
        });
        suggestions.append(item);
      });
      suggestions.classList.remove("hidden");
    }

    let tmr;
    input.addEventListener("input", () => {
      if (bar) bar.classList.toggle("has-text", input.value.length > 0);
      clearTimeout(tmr);
      const clean = A.sanitizeInput(input.value, { maxLen: 60 });
      showSuggestions(clean);
      tmr = setTimeout(() => {
        state.q = clean;
        renderCatalog();
      }, 120);
    });
    input.addEventListener("focus", () => showSuggestions(input.value));
    input.addEventListener("keydown", event => {
      if (event.key === "Escape") hideSuggestions();
      if (event.key === "Enter") {
        const first = matches(input.value)[0];
        if (first) {
          event.preventDefault();
          hideSuggestions();
          state.q = A.sanitizeInput(input.value, { maxLen: 60 });
          renderCatalog();
          openQuickView(first);
        }
      }
    });
    document.addEventListener("click", event => {
      if (wrap && !wrap.contains(event.target)) hideSuggestions();
    });
    if (clear) clear.addEventListener("click", () => {
      input.value = ""; state.q = ""; bar.classList.remove("has-text"); hideSuggestions(); renderCatalog(); input.focus();
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
    state.cat = "nuts";
    state.sub = "all";
    state.q = "";
    buildQuickView();
    initSearch();
    initCatsArrows();
    renderAll();
  }

  window.AdamProducts = { init, renderAll, openFavorites, openQuickView, isFav, productCard: card };
})();
