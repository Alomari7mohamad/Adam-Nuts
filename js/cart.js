/* =====================================================================
   cart.js — cart state (localStorage), floating summary, cart drawer
   Cart item shape: { id, weight, qty }. Key = id + "|" + weight.
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
        .map(it => ({ id: it.id, weight: +it.weight, qty: Math.min(+it.qty, 999) }));
    } catch { return []; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(items)); }
  function keyOf(it) { return it.id + "|" + it.weight; }

  /* ---------- Mutations ---------- */
  function add(id, weight, qty) {
    const found = items.find(it => it.id === id && it.weight === weight);
    if (found) found.qty += qty; else items.push({ id, weight, qty });
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
    const twin = items.find(x => x.id === it.id && x.weight === weight && x !== it);
    if (twin) { twin.qty += it.qty; items = items.filter(x => x !== it); }
    else it.weight = weight;
    save(); render();
  }
  function remove(key) { items = items.filter(x => keyOf(x) !== key); save(); render(); }
  function clear() { items = []; save(); render(); }

  /* ---------- Derived ---------- */
  function count() { return items.reduce((s, it) => s + it.qty, 0); }
  function subtotal() {
    return items.reduce((s, it) => {
      const p = A.productById(it.id); if (!p) return s;
      return s + A.unitPrice(p, it.weight) * it.qty;
    }, 0);
  }
  function getItems() {
    return items.map(it => {
      const p = A.productById(it.id);
      return { product: p, weight: it.weight, qty: it.qty, line: A.unitPrice(p, it.weight) * it.qty };
    }).filter(x => x.product);
  }

  /* ---------- Rendering ---------- */
  function weightLabel(it, p) {
    if (p.unit !== "kg") return A.t("per_piece");
    return it.weight >= 1000 ? (A.lang() === "he" ? '1 ק"ג' : "1 كيلو")
                             : it.weight + " " + (A.lang() === "he" ? "גרם" : "غرام");
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

    getItems().forEach(({ product: p, weight, qty, line }) => {
      const it = { id: p.id, weight };
      const key = keyOf(it);

      const removeBtn = A.el("button", { class: "ci-remove tap", "aria-label": A.t("remove"), html: A.icon("trash") });
      removeBtn.addEventListener("click", () => remove(key));

      // qty stepper
      const minus = A.el("button", { "aria-label": "-", html: A.icon("minus") });
      const plus = A.el("button", { "aria-label": "+", html: A.icon("plus") });
      const qSpan = A.el("span", { text: String(qty) });
      minus.addEventListener("click", () => setQty(key, qty - 1));
      plus.addEventListener("click", () => setQty(key, qty + 1));
      const qtyBox = A.el("div", { class: "qty" }, minus, qSpan, plus);

      // weight editor (kg only)
      let bottomLeft;
      if (p.unit === "kg") {
        const sel = A.el("select", { "aria-label": A.t("weight") });
        A.DATA.WEIGHTS.forEach(g => {
          const o = A.el("option", { value: g, text: g >= 1000 ? (A.lang() === "he" ? '1 ק"ג' : "1 كيلو") : g + (A.lang() === "he" ? " גרם" : " غ") });
          if (g === weight) o.selected = true;
          sel.append(o);
        });
        sel.addEventListener("change", () => setWeight(key, +sel.value));
        bottomLeft = A.el("div", { class: "ci-weight" }, sel);
      } else {
        bottomLeft = A.el("span", { class: "ci-variant", text: weightLabel(it, p) });
      }

      const row = A.el("div", { class: "cart-item" },
        A.el("img", { class: "ci-img", src: p.img, alt: A.nameOf(p.name), loading: "lazy" }),
        A.el("div", { class: "ci-main" },
          A.el("div", { class: "ci-top" },
            A.el("div", {},
              A.el("div", { class: "ci-name", text: A.nameOf(p.name) }),
              p.unit === "kg" ? A.el("div", { class: "ci-variant", text: weightLabel(it, p) }) : null
            ),
            removeBtn
          ),
          A.el("div", { class: "ci-bottom" },
            qtyBox,
            A.el("span", { class: "ci-price", text: A.money(line) })
          ),
          bottomLeft
        )
      );
      body.append(row);
    });

    // totals
    if (foot) {
      foot.textContent = "";
      const totals = A.el("div", { class: "totals" },
        A.el("div", { class: "row" }, A.el("span", { text: A.t("subtotal") }), A.el("span", { text: A.money(subtotal()) }))
      );
      const clearBtn = A.el("button", { class: "btn btn-outline", style: "flex:0 0 auto", html: A.icon("trash") });
      clearBtn.append(document.createTextNode(" " + A.t("clear_cart")));
      clearBtn.style.color = "var(--danger)";
      clearBtn.style.borderColor = "var(--danger)";
      clearBtn.addEventListener("click", clear);

      const checkoutBtn = A.el("button", { class: "btn btn-gold", style: "flex:1", html: A.icon("check") });
      checkoutBtn.append(document.createTextNode(" " + A.t("checkout")));
      checkoutBtn.addEventListener("click", () => { A.closeAllDrawers(); window.AdamCheckout.open(); });

      foot.append(totals, A.el("div", { style: "display:flex; gap:10px" }, clearBtn, checkoutBtn));
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

  function open() { renderDrawer(); A.openDrawer("cartDrawer"); }

  function init() {
    render();
    document.querySelectorAll("[data-action='open-cart']").forEach(b =>
      b.addEventListener("click", e => { e.preventDefault(); open(); }));
  }

  window.AdamCart = { init, add, remove, clear, setQty, setWeight, render, open, count, subtotal, getItems };
})();
