/* =====================================================================
   cart.js — cart state (localStorage), floating summary, cart drawer
   Cart item shape: { id, weight, qty, notes }. Key = id + "|" + weight + notes.
   ===================================================================== */
(function () {
  "use strict";
  const A = window.Adam;
  const KEY = "adam_cart";

  let items = load();

  // Hardened read: drop anything that isn't a known product with a sane
  // numeric weight and a positive integer qty (defends against tampered storage)
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(it => it && typeof it.id === "string" && A.productById(it.id)
          && Number.isFinite(+it.weight) && +it.weight > 0
          && Number.isInteger(+it.qty) && +it.qty > 0)
        .map(it => ({ id: it.id, weight: +it.weight, qty: Math.min(+it.qty, 999), notes: A.sanitizeInput(it.notes || "", { maxLen: 180, multiline: true }), userNotes: A.sanitizeInput(it.userNotes || "", { maxLen: 180, multiline: true }), customPrice: it.customPrice != null && Number.isFinite(+it.customPrice) ? +it.customPrice : null, components: Array.isArray(it.components) ? it.components : [] }));
    } catch { return []; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(items)); }
  function keyOf(it) { return it.id + "|" + it.weight + "|" + (it.notes || ""); }
  function weightText(g) { return g >= 1000 ? (A.lang() === "he" ? '1 ק"ג' : "1 كيلو") : g + " " + (A.lang() === "he" ? "גרם" : "غرام"); }
  function weightButtons(current, onChange) {
    const wrap = A.el("div", { class: "weight-buttons cart-weight-buttons", role: "group", "aria-label": A.t("weight") });
    A.DATA.WEIGHTS.forEach(g => {
      const b = A.el("button", { type: "button", class: "weight-chip" + (g === current ? " active" : ""), text: weightText(g), dataset: { weight: String(g) } });
      b.addEventListener("click", () => onChange(g));
      wrap.append(b);
    });
    return wrap;
  }

  /* ---------- Mutations ---------- */
  function add(id, weight, qty, notes, meta) {
    meta = meta || {};
    notes = A.sanitizeInput(notes || "", { maxLen: 180, multiline: true });
    const customPrice = meta.customPrice != null && Number.isFinite(+meta.customPrice) ? +meta.customPrice : null;
    const components = Array.isArray(meta.components) ? meta.components : [];
    const userNotes = A.sanitizeInput(meta.userNotes || "", { maxLen: 180, multiline: true });
    const found = items.find(it => it.id === id && it.weight === weight && (it.notes || "") === notes && (it.customPrice || null) === customPrice);
    if (found) found.qty += qty; else items.push({ id, weight, qty, notes, userNotes, customPrice, components });
    save(); render(); bump();
    A.toast(A.t("added"), "check");
  }
  function setQty(key, qty) {
    const it = items.find(x => keyOf(x) === key);
    if (!it) return;
    it.qty = Math.max(1, qty);
    save(); render();
  }
  function setWeight(key, weight) {
    const it = items.find(x => keyOf(x) === key);
    if (!it) return;
    // merge if an identical product+weight already exists
    const twin = items.find(x => x.id === it.id && x.weight === weight && (x.notes || "") === (it.notes || "") && (x.customPrice || null) === (it.customPrice || null) && x !== it);
    if (twin) { twin.qty += it.qty; items = items.filter(x => x !== it); }
    else it.weight = weight;
    save(); render();
  }
  function remove(key) { items = items.filter(x => keyOf(x) !== key); save(); render(); }
  function clear() { items = []; save(); render(); }

  /* ---------- Derived ---------- */
  function count() { return items.reduce((s, it) => s + it.qty, 0); }
  function baseLine(it, p) {
    return (it.customPrice != null ? it.customPrice : A.unitPrice(p, it.weight)) * it.qty;
  }
  function promoFor(p) {
    return (A.DATA.PROMOS || []).find(promo => promo.ids.includes(p.id));
  }
  function promoQty(promo) {
    return items.reduce((n, it) => {
      const p = A.productById(it.id);
      return n + (p && promo.ids.includes(p.id) && it.customPrice == null ? it.qty : 0);
    }, 0);
  }
  function promoDiscount() {
    return (A.DATA.PROMOS || []).reduce((sum, promo) => {
      const qty = promoQty(promo);
      const bundles = Math.floor(qty / promo.qty);
      const save = Math.max(0, promo.qty * promo.unitPrice - promo.bundlePrice);
      return sum + bundles * save;
    }, 0);
  }
  function promoHint(promo, qty) {
    if (qty >= promo.qty) return A.t("promo_6_applied").replace("{qty}", promo.qty).replace("{price}", A.money(promo.bundlePrice));
    return A.t("promo_6_hint")
      .replace("{qty}", promo.qty)
      .replace("{price}", A.money(promo.bundlePrice))
      .replace("{save}", A.money(Math.max(0, promo.qty * promo.unitPrice - promo.bundlePrice)));
  }
  function subtotalBeforeDiscount() {
    return items.reduce((s, it) => {
      const p = A.productById(it.id); if (!p) return s;
      return s + baseLine(it, p);
    }, 0);
  }
  function subtotal() { return Math.max(0, subtotalBeforeDiscount() - promoDiscount()); }
  function getItems() {
    return items.map(it => {
      const p = A.productById(it.id);
      return { product: p, weight: it.weight, qty: it.qty, notes: it.notes || "", userNotes: it.userNotes || "", customPrice: it.customPrice, components: it.components || [], line: baseLine(it, p) };
    }).filter(x => x.product);
  }

  /* ---------- Rendering ---------- */
  function weightLabel(it, p) {
    if (p.fixedWeight) return A.nameOf(p.fixedWeight);
    if (p.unit !== "kg") return A.t("per_piece");
    return it.weight >= 1000 ? (A.lang() === "he" ? '1 ק"ג' : "1 كيلو")
                             : it.weight + " " + (A.lang() === "he" ? "גרם" : "غرام");
  }
  function cartName(p) {
    if (p.customMix) return A.lang() === "he" ? "תערובת אישית" : "مخلوطة خاصة";
    return A.nameOf(p.name);
  }

  function renderDrawer() {
    const body = document.getElementById("cartBody");
    const foot = document.getElementById("cartFoot");
    if (!body) return;
    body.textContent = "";

    if (!items.length) {
      body.append(A.el("div", { class: "empty-state" },
        A.el("div", { html: A.icon("cart") }),
        A.el("h4", { text: A.t("cart_empty") }),
        A.el("p", { text: A.t("cart_empty_hint") })
      ));
      if (foot) foot.classList.add("hidden");
      return;
    }
    if (foot) foot.classList.remove("hidden");

    getItems().forEach(({ product: p, weight, qty, notes, userNotes, customPrice, components, line }) => {
      const it = { id: p.id, weight, notes };
      const key = keyOf(it);
      const promo = promoFor(p);

      const removeBtn = A.el("button", { class: "ci-remove tap", "aria-label": A.t("remove"), html: A.icon("trash") });
      removeBtn.addEventListener("click", () => remove(key));

      // qty stepper
      const minus = A.el("button", { "aria-label": "-", html: A.icon("minus") });
      const plus = A.el("button", { "aria-label": "+", html: A.icon("plus") });
      const qSpan = A.el("span", { text: String(qty) });
      minus.addEventListener("click", () => setQty(key, qty - 1));
      plus.addEventListener("click", () => setQty(key, qty + 1));
      const qtyBox = A.el("div", { class: "qty" }, minus, qSpan, plus);

      const editBtn = A.el("button", { class: "ci-edit tap", html: A.icon("info") + "<span>" + A.escapeHtml(A.t("edit_item")) + "</span>" });
      editBtn.addEventListener("click", () => {
        A.closeAllDrawers();
        if (window.AdamProducts) window.AdamProducts.openQuickView(p, { weight, notes, userNotes, customPrice, components, replaceKey: key });
      });

      const row = A.el("div", { class: "cart-item cart-sheet-item" },
        A.el("img", { class: "ci-img", src: p.img, alt: A.nameOf(p.name), loading: "lazy" }),
        A.el("div", { class: "ci-main" },
          A.el("div", { class: "ci-name", text: cartName(p) }),
          A.el("div", { class: "ci-variant", text: weightLabel(it, p) }),
          A.el("span", { class: "ci-price", text: A.money(line) }),
          promo ? A.el("div", { class: "ci-promo", text: promoHint(promo, promoQty(promo)) }) : null,
          notes ? A.el("div", { class: "ci-notes", text: notes }) : null
        ),
        A.el("div", { class: "ci-side" },
          qtyBox,
          A.el("div", { class: "ci-tools" }, editBtn, removeBtn)
        )
      );
      body.append(row);
    });

    // totals
    if (foot) {
      foot.textContent = "";
      const discount = promoDiscount();
      const totals = A.el("div", { class: "totals" },
        discount ? A.el("div", { class: "row" }, A.el("span", { text: A.t("promo_discount") }), A.el("span", { text: "-" + A.money(discount) })) : null,
        A.el("div", { class: "row" }, A.el("span", { text: A.t("subtotal") }), A.el("span", { text: A.money(subtotal()) }))
      );
      const clearBtn = A.el("button", { class: "cart-clear-icon", "aria-label": A.t("clear_cart"), html: A.icon("trash") });
      clearBtn.addEventListener("click", clear);

      const checkoutBtn = A.el("button", { class: "btn btn-gold btn-block cart-checkout", html: A.icon("check") });
      checkoutBtn.append(document.createTextNode(" " + A.t("checkout")));
      checkoutBtn.addEventListener("click", () => { A.closeAllDrawers(); window.AdamCheckout.open(); });

      totals.append(clearBtn);
      foot.append(totals, checkoutBtn);
    }
  }

  function renderFloating() {
    const fc = document.getElementById("floatingCart");
    if (!fc) return;
    const n = count();
    fc.classList.toggle("show", n > 0);
    const cnt = fc.querySelector(".fc-count");
    const items_lbl = fc.querySelector(".fc-items");
    const total = fc.querySelector(".fc-total");
    if (cnt) cnt.textContent = n;
    if (items_lbl) items_lbl.textContent = n + " " + (n === 1 ? A.t("item") : A.t("items"));
    if (total) total.textContent = A.money(subtotal());
  }

  function updateBadges() {
    const n = count();
    document.querySelectorAll("[data-cart-count]").forEach(b => {
      b.textContent = n; b.classList.toggle("hidden", n === 0);
      b.classList.remove("ping"); void b.offsetWidth; if (n) b.classList.add("ping");
    });
  }

  function render() { renderFloating(); updateBadges(); renderDrawer(); }
  function bump() { const fc = document.getElementById("floatingCart"); if (fc) { fc.classList.remove("bump"); void fc.offsetWidth; fc.classList.add("bump"); } }

  function open() {
    const drawer = document.getElementById("cartDrawer");
    if (drawer && drawer.classList.contains("show")) {
      A.closeAllDrawers();
      return;
    }
    renderDrawer();
    A.toggleDrawer("cartDrawer");
  }

  function init() {
    render();
    document.querySelectorAll("[data-action='open-cart']").forEach(b =>
      b.addEventListener("click", e => { e.preventDefault(); open(); }));
  }

  window.AdamCart = { init, add, remove, clear, setQty, setWeight, render, open, count, subtotal, promoDiscount, getItems };
})();
