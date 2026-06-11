/* =====================================================================
   checkout.js — order form, delivery rules, validation, WhatsApp message
   ===================================================================== */
(function () {
  "use strict";
  const A = window.Adam;
  const DATA = window.AdamData;

  const form = { name: "", type: "pickup", location: "", currentLocation: "", notes: "" };

  /* ---------- Delivery fee derivation ---------- */
  function normalize(s) {
    return String(s).toLowerCase().replace(/[ً-ٟ]/g, "").trim();
  }
  function deliveryFee() {
    if (form.type === "pickup") return 0;
    const loc = normalize(form.location);
    if (!loc) return DATA.DELIVERY.far.fee;
    const near = DATA.DELIVERY.near.places.some(p => loc.includes(normalize(p)));
    return near ? DATA.DELIVERY.near.fee : DATA.DELIVERY.far.fee;
  }

  /* ---------- Render form ---------- */
  function render() {
    const body = document.getElementById("checkoutBody");
    if (!body) return;
    const items = window.AdamCart.getItems();

    body.textContent = "";
    if (!items.length) {
      body.append(A.el("div", { class: "empty-state" },
        A.el("div", { html: A.icon("cart") }),
        A.el("h4", { text: A.t("cart_empty") })
      ));
      return;
    }

    // ----- Order summary -----
    const summary = A.el("div", { style: "margin-bottom:18px" },
      A.el("div", { class: "section-title", style: "font-size:16px;margin-bottom:10px" },
        A.el("span", { text: A.t("order_summary") }))
    );
    items.forEach(({ product: p, weight, qty, line }) => {
      const wl = p.unit === "kg"
        ? (weight >= 1000 ? (A.lang() === "he" ? '1 ק"ג' : "1 كيلو") : weight + (A.lang() === "he" ? " גרם" : " غ"))
        : "×" + qty;
      summary.append(A.el("div", { class: "totals" },
        A.el("div", { class: "row" },
          A.el("span", { text: A.nameOf(p.name) + " · " + wl + (p.unit === "kg" ? " ×" + qty : "") }),
          A.el("span", { text: A.money(line) })
        )
      ));
    });

    // ----- Name -----
    const nameField = field("name", "full_name", "full_name_ph", "input", true);
    nameField.input.value = form.name;
    nameField.input.addEventListener("input", () => { form.name = nameField.input.value; validateField(nameField); });

    // ----- Order type -----
    const pickup = A.el("button", { type: "button", class: "otype" + (form.type === "pickup" ? " active" : ""), html: A.icon("store") + "<span>" + A.escapeHtml(A.t("pickup")) + "</span>" });
    const deliver = A.el("button", { type: "button", class: "otype" + (form.type === "delivery" ? " active" : ""), html: A.icon("truck") + "<span>" + A.escapeHtml(A.t("delivery")) + "</span>" });
    pickup.addEventListener("click", () => { form.type = "pickup"; refresh(); });
    deliver.addEventListener("click", () => { form.type = "delivery"; refresh(); requestCurrentLocation(); });
    const typeWrap = A.el("div", { class: "field" },
      A.el("label", { html: A.escapeHtml(A.t("order_type")) + ' <span class="req">*</span>' }),
      A.el("div", { class: "order-type" }, pickup, deliver)
    );

    // ----- Delivery fields -----
    const locField = field("location", "delivery_location", "delivery_location_ph", "input", false);
    locField.input.value = form.location;
    locField.input.addEventListener("input", () => { form.location = locField.input.value; validateField(locField); updateTotals(); });
    const notesField = field("notes", "delivery_notes", "delivery_notes_ph", "textarea", false);
    notesField.input.value = form.notes;
    notesField.input.addEventListener("input", () => { form.notes = notesField.input.value; });
    const currentLocationBox = A.el("div", { class: "current-location-box" },
      A.el("div", { class: "current-location-text", text: form.currentLocation ? A.t("current_location_ready") + ": " + form.currentLocation : A.t("current_location_waiting") }),
      A.el("button", { type: "button", class: "btn btn-outline btn-block use-location", html: A.icon("location") + "<span>" + A.escapeHtml(A.t("use_current_location")) + "</span>" })
    );
    currentLocationBox.querySelector("button").addEventListener("click", requestCurrentLocation);
    const deliveryWrap = A.el("div", { class: "delivery-fields" + (form.type === "delivery" ? " show" : "") }, currentLocationBox, locField.wrap, notesField.wrap);

    // ----- Totals -----
    const totals = A.el("div", { class: "totals", id: "ckTotals" });

    // ----- Send button -----
    const send = A.el("button", { class: "btn btn-gold btn-block", style: "margin-top:6px", html: A.icon("whatsapp") + "<span>" + A.escapeHtml(A.t("send_order")) + "</span>" });
    send.addEventListener("click", submit);

    const back = A.el("button", { class: "btn btn-outline btn-block", style: "margin-top:10px;color:var(--brown-700);border-color:var(--line)", html: A.icon("cart") + "<span>" + A.escapeHtml(A.t("view_cart")) + "</span>" });
    back.style.color = "var(--brown-700)";
    back.addEventListener("click", () => { A.closeAllDrawers(); window.AdamCart.open(); });

    body.append(summary, nameField.wrap, typeWrap, deliveryWrap, totals, send, back);

    // keep refs for live updates
    body._refs = { nameField, locField, deliveryWrap, totals, pickup, deliver };
    updateTotals();
  }

  // Per-field length caps (also enforced again in submit() as the authority)
  const MAXLEN = { name: 60, location: 120, notes: 300 };

  function field(id, labelKey, phKey, kind, required) {
    const max = MAXLEN[id] || 100;
    const input = kind === "textarea"
      ? A.el("textarea", { id: "ck_" + id, maxlength: String(max), placeholder: A.t(phKey) })
      : A.el("input", { id: "ck_" + id, type: "text", maxlength: String(max), placeholder: A.t(phKey), autocomplete: id === "name" ? "name" : "off" });
    const label = A.el("label", { for: "ck_" + id, html: A.escapeHtml(A.t(labelKey)) + (required ? ' <span class="req">*</span>' : "") });
    const err = A.el("div", { class: "err", text: A.t("required") });
    const wrap = A.el("div", { class: "field" }, label, input, err);
    return { wrap, input, required, id, max };
  }

  // Validate against the SANITIZED value (a string of only spaces/control
  // chars is rejected; a name must contain at least one real letter).
  function validateField(f) {
    if (!f.required) return true;
    const v = A.sanitizeInput(f.input.value, { maxLen: f.max });
    const ok = f.id === "name" ? A.isValidName(v) : v.length > 0;
    f.wrap.classList.toggle("invalid", !ok);
    return ok;
  }

  function refresh() {
    const body = document.getElementById("checkoutBody");
    const r = body && body._refs;
    if (!r) { render(); return; }
    r.pickup.classList.toggle("active", form.type === "pickup");
    r.deliver.classList.toggle("active", form.type === "delivery");
    r.deliveryWrap.classList.toggle("show", form.type === "delivery");
    updateTotals();
  }

  function updateTotals() {
    const totals = document.getElementById("ckTotals");
    if (!totals) return;
    const sub = window.AdamCart.subtotal();
    const fee = deliveryFee();
    totals.textContent = "";
    totals.append(
      row(A.t("subtotal"), A.money(sub)),
      row(A.t("delivery_fee"), fee === 0 ? (A.lang() === "he" ? "—" : "—") : A.money(fee)),
      row(A.t("total"), A.money(sub + fee), true)
    );
  }
  function row(label, val, grand) {
    return A.el("div", { class: "row" + (grand ? " grand" : "") },
      A.el("span", { text: label }), A.el("span", { class: grand ? "v" : "", text: val }));
  }

  /* ---------- Submit -> WhatsApp ---------- */
  let busy = false; // guards against accidental double-tap opening many tabs
                    // (a UX guard — NOT server-side API rate limiting, which
                    //  is N/A for a backend-less static site)

  function submit() {
    const body = document.getElementById("checkoutBody");
    const r = body._refs;
    let ok = validateField(r.nameField);
    if (form.type === "delivery") {
      const hasDeliveryLocation = !!A.sanitizeInput(form.location, { maxLen: MAXLEN.location }) || !!form.currentLocation;
      r.locField.wrap.classList.toggle("invalid", !hasDeliveryLocation);
      ok = hasDeliveryLocation && ok;
    }
    if (!ok) { A.toast(A.t("required"), "info"); return; }
    if (!window.AdamCart.getItems().length) return;
    if (busy) return;
    busy = true; setTimeout(() => { busy = false; }, 2000);

    // Authoritative sanitisation pass before the data leaves the app.
    const clean = {
      name: A.sanitizeInput(form.name, { maxLen: MAXLEN.name }),
      type: form.type === "delivery" ? "delivery" : "pickup",
      location: A.sanitizeInput(form.location, { maxLen: MAXLEN.location }),
      currentLocation: A.sanitizeInput(form.currentLocation, { maxLen: 160 }),
      notes: A.sanitizeInput(form.notes, { maxLen: MAXLEN.notes, multiline: true })
    };
    A.openExternal(A.whatsappLink(buildMessage(clean)));
    window.AdamCart.clear();
    A.closeAllDrawers();
    render();
  }

  function buildMessage(clean) {
    const items = window.AdamCart.getItems();
    const sub = window.AdamCart.subtotal();
    const fee = deliveryFee();
    const isDelivery = clean.type === "delivery";
    const L = [];
    const line = "━━━━━━━━━━━━━━━";

    L.push(line);
    L.push("🌰  " + A.t("wa_title"));
    L.push(line);
    L.push("");
    // Single-line sanitised fields cannot inject newlines to forge other rows.
    L.push("👤 " + A.t("wa_name") + ": " + clean.name);
    L.push("🧾 " + A.t("wa_type") + ": " + (isDelivery ? A.t("wa_delivery_type") : A.t("wa_pickup")));
    if (isDelivery) {
      if (clean.currentLocation) L.push("📍 " + A.t("wa_current_location") + ": " + clean.currentLocation);
      L.push("📍 " + A.t("wa_location") + ": " + clean.location);
    }
    L.push("");
    L.push("🛒 " + A.t("wa_products") + ":");
    items.forEach(({ product: p, weight, qty, notes, line: lp }, i) => {
      const wl = p.unit === "kg"
        ? (weight >= 1000 ? "1kg" : weight + "g")
        : (A.lang() === "he" ? "יחידה" : "قطعة");
      L.push("  " + (i + 1) + ") " + A.nameOf(p.name));
      L.push("       " + wl + " × " + qty + "  =  " + A.money(lp));
      if (notes) L.push("       " + A.t("wa_notes") + ": " + notes);
    });
    L.push("");
    L.push(line);
    L.push(A.t("wa_subtotal") + ": " + A.money(sub));
    L.push(A.t("wa_delivery") + ": " + (fee ? A.money(fee) : (A.lang() === "he" ? "ללא" : "بدون")));
    L.push("💰 " + A.t("wa_total") + ": " + A.money(sub + fee));
    if (isDelivery && clean.notes) { L.push(""); L.push("📝 " + A.t("wa_notes") + ": " + clean.notes); }
    L.push(line);
    return L.join("\n");
  }

  function requestCurrentLocation() {
    if (form.type !== "delivery" || !navigator.geolocation) return;
    const body = document.getElementById("checkoutBody");
    const status = body && body.querySelector(".current-location-text");
    if (status) status.textContent = A.t("current_location_loading");
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      form.currentLocation = "https://maps.google.com/?q=" + lat + "," + lng;
      render();
    }, () => {
      if (status) status.textContent = A.t("current_location_failed");
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  function open() { render(); A.openDrawer("checkoutDrawer"); }

  function init() {
    document.querySelectorAll("[data-action='checkout']").forEach(b =>
      b.addEventListener("click", e => { e.preventDefault(); open(); }));
    window.addEventListener("adam:lang", () => { if (document.getElementById("checkoutDrawer")?.classList.contains("show")) render(); });
  }

  window.AdamCheckout = { init, open, deliveryFee };
})();
