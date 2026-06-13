/* =====================================================================
   checkout.js — order form, delivery rules, validation, WhatsApp message
   ===================================================================== */
(function () {
  "use strict";
  const A = window.Adam;
  const DATA = window.AdamData;

  const FREE_DELIVERY_MIN = 300;
  const INVOICE_KEY = "adam_last_invoice";
  const form = { name: "", type: "pickup", location: "", currentLocation: "", currentCoords: null, deliveryArea: "", notes: "" };

  /* ---------- Delivery fee derivation ---------- */
  function normalize(s) {
    return String(s).toLowerCase().replace(/[ً-ٟ]/g, "").trim();
  }
  function areaFromCoords(coords) {
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return "";
    const accuracy = Math.min(Math.max(Number(coords.accuracy) || 0, 75), 350);
    const latPad = accuracy / 111320;
    const lngPad = accuracy / (111320 * Math.cos(coords.lat * Math.PI / 180));
    const area = (DATA.DELIVERY.geoAreas || []).find(({ bounds }) =>
      coords.lat >= bounds.south - latPad &&
      coords.lat <= bounds.north + latPad &&
      coords.lng >= bounds.west - lngPad &&
      coords.lng <= bounds.east + lngPad
    );
    return area ? area.id : "";
  }
  function areaLabel(id) {
    const labels = {
      sandala: { ar: "صندلة", he: "סנדלה" },
      muqeible: { ar: "مقيبلة", he: "מוקייבלה" }
    };
    return labels[id] ? labels[id][A.lang()] : "";
  }
  function deliveryFee() {
    if (form.type === "pickup") return 0;
    if (window.AdamCart.subtotal() >= FREE_DELIVERY_MIN) return 0;
    if (form.currentCoords) {
      return areaFromCoords(form.currentCoords) ? DATA.DELIVERY.near.fee : DATA.DELIVERY.far.fee;
    }
    const loc = normalize(form.location);
    if (!loc) return DATA.DELIVERY.far.fee;
    const near = DATA.DELIVERY.near.places.some(p => loc.includes(normalize(p)));
    return near ? DATA.DELIVERY.near.fee : DATA.DELIVERY.far.fee;
  }

  function freeDeliveryMessage(sub) {
    if (sub >= FREE_DELIVERY_MIN) return A.t("free_delivery_unlocked");
    return A.t("free_delivery_hint") + " " + A.t("free_delivery_remaining").replace("{amount}", A.money(FREE_DELIVERY_MIN - sub));
  }

  function deliveryFeeText(fee, sub) {
    if (form.type === "delivery" && sub >= FREE_DELIVERY_MIN) return A.t("free_delivery_label");
    if (fee === 0) return "—";
    return A.money(fee);
  }

  function componentsWeight(components) {
    return (components || []).reduce((sum, component) =>
      component.weight != null && Number.isFinite(+component.weight) ? sum + +component.weight : sum, 0);
  }

  function orderWeight(product, weight, components, shortUnit) {
    const selectedWeight = product.customMix ? componentsWeight(components) : 0;
    const value = selectedWeight || weight;
    if (product.unit !== "kg") return A.lang() === "he" ? "יחידה" : "قطعة";
    if (value >= 1000) {
      const kg = value / 1000;
      return A.fmtNum(kg) + (shortUnit ? "kg" : (A.lang() === "he" ? ' ק"ג' : " كيلو"));
    }
    return value + (shortUnit ? "g" : (A.lang() === "he" ? " גרם" : " غرام"));
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
    items.forEach(({ product: p, weight, qty, components, line }) => {
      const wl = p.unit === "kg" ? orderWeight(p, weight, components, false) : "×" + qty;
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
    const freeDeliveryNote = A.el("div", { class: "free-delivery-note" },
      A.el("span", { class: "free-delivery-ico", html: A.icon("truck") }),
      A.el("span", { class: "free-delivery-text" })
    );

    // ----- Delivery fields -----
    const locField = field("location", "delivery_location", "delivery_location_ph", "input", false);
    locField.input.value = form.location;
    locField.input.addEventListener("input", () => { form.location = locField.input.value; validateField(locField); updateTotals(); });
    const notesField = field("notes", "delivery_notes", "delivery_notes_ph", "textarea", false);
    notesField.input.value = form.notes;
    notesField.input.addEventListener("input", () => { form.notes = notesField.input.value; });
    const currentLocationBox = A.el("div", { class: "current-location-box" },
      A.el("div", { class: "current-location-text", text: form.currentLocation ? A.t("current_location_ready") + (form.deliveryArea ? ": " + areaLabel(form.deliveryArea) : "") : A.t("current_location_waiting") }),
      A.el("button", { type: "button", class: "btn btn-outline btn-block use-location", html: A.icon("location") + "<span>" + A.escapeHtml(A.t("use_current_location")) + "</span>" })
    );
    currentLocationBox.querySelector("button").addEventListener("click", requestCurrentLocation);
    const deliveryWrap = A.el("div", { class: "delivery-fields" + (form.type === "delivery" ? " show" : "") }, currentLocationBox, locField.wrap, notesField.wrap);

    // ----- Totals -----
    const totals = A.el("div", { class: "totals", id: "ckTotals" });

    // ----- Send button -----
    const send = A.el("button", { class: "btn btn-gold btn-block", "data-checkout-send": "true", style: "margin-top:6px", html: A.icon("whatsapp") + "<span>" + A.escapeHtml(A.t("send_order")) + "</span>" });
    send.addEventListener("click", submit);

    const back = A.el("button", { class: "btn btn-outline btn-block", style: "margin-top:10px;color:var(--brown-700);border-color:var(--line)", html: A.icon("cart") + "<span>" + A.escapeHtml(A.t("view_cart")) + "</span>" });
    back.style.color = "var(--brown-700)";
    back.addEventListener("click", () => { A.closeAllDrawers(); window.AdamCart.open(); });

    body.append(summary, nameField.wrap, typeWrap, freeDeliveryNote, deliveryWrap, totals, send, back);

    // keep refs for live updates
    body._refs = { nameField, locField, deliveryWrap, totals, pickup, deliver, freeDeliveryNote };
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
    const discount = window.AdamCart.promoDiscount ? window.AdamCart.promoDiscount() : 0;
    const fee = deliveryFee();
    const body = document.getElementById("checkoutBody");
    const note = body && body._refs && body._refs.freeDeliveryNote;
    if (note) {
      note.classList.toggle("unlocked", sub >= FREE_DELIVERY_MIN);
      note.querySelector(".free-delivery-text").textContent = freeDeliveryMessage(sub);
    }
    totals.textContent = "";
    const rows = [];
    if (discount) rows.push(row(A.t("promo_discount"), "-" + A.money(discount)));
    rows.push(
      row(A.t("subtotal"), A.money(sub)),
      row(A.t("delivery_fee"), deliveryFeeText(fee, sub)),
      row(A.t("total"), A.money(sub + fee), true)
    );
    totals.append(...rows);
  }
  function row(label, val, grand) {
    return A.el("div", { class: "row" + (grand ? " grand" : "") },
      A.el("span", { text: label }), A.el("span", { class: grand ? "v" : "", text: val }));
  }

  /* ---------- Submit -> WhatsApp ---------- */
  let busy = false; // guards against accidental double-tap opening many tabs
                    // (a UX guard — NOT server-side API rate limiting, which
                    //  is N/A for a backend-less static site)

  function fallbackCopy(text) {
    const ta = A.el("textarea", { value: text, readonly: "readonly" });
    ta.style.position = "fixed";
    ta.style.insetInlineStart = "-9999px";
    ta.style.opacity = "0";
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) {}
    ta.remove();
    return ok;
  }

  function copyOrderText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => A.toast(A.t("order_text_copied"), "check"))
        .catch(() => A.toast(fallbackCopy(text) ? A.t("order_text_copied") : A.t("order_text_copy_failed"), "info"));
      return;
    }
    A.toast(fallbackCopy(text) ? A.t("order_text_copied") : A.t("order_text_copy_failed"), "info");
  }

  function showSendFollowup(message) {
    const body = document.getElementById("checkoutBody");
    if (!body) return;
    body.querySelector(".order-send-followup")?.remove();

    const copyBtn = A.el("button", { type: "button", class: "btn btn-outline btn-block order-copy-btn", html: A.icon("doc") + "<span>" + A.escapeHtml(A.t("copy_order_text")) + "</span>" });
    copyBtn.addEventListener("click", () => copyOrderText(message));

    const printLabel = A.lang() === "he" ? "הדפסת חשבונית" : "طباعة الفاتورة";
    const printBtn = A.el("a", { href: "invoice.html", target: "_blank", rel: "noopener", class: "btn btn-outline btn-block", html: A.icon("doc") + "<span>" + A.escapeHtml(printLabel) + "</span>" });

    const doneBtn = A.el("button", { type: "button", class: "btn btn-gold btn-block", html: A.icon("check") + "<span>" + A.escapeHtml(A.t("order_sent_clear_cart")) + "</span>" });
    doneBtn.addEventListener("click", () => {
      window.AdamCart.clear();
      A.closeAllDrawers();
      render();
    });

    const panel = A.el("div", { class: "order-send-followup" },
      A.el("strong", { text: A.t("order_opened_whatsapp") }),
      A.el("p", { text: A.t("order_keep_cart_hint") }),
      printBtn,
      copyBtn,
      doneBtn
    );

    const send = body.querySelector("[data-checkout-send]");
    if (send) send.after(panel);
    else body.append(panel);
  }

  async function submit() {
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
    busy = true; setTimeout(() => { busy = false; }, 10000);
    const whatsappWindow = window.open("about:blank", "_blank");
    if (whatsappWindow) whatsappWindow.opener = null;

    // Authoritative sanitisation pass before the data leaves the app.
    const clean = {
      name: A.sanitizeInput(form.name, { maxLen: MAXLEN.name }),
      type: form.type === "delivery" ? "delivery" : "pickup",
      location: A.sanitizeInput(form.location, { maxLen: MAXLEN.location }),
      currentLocation: A.sanitizeInput(form.currentLocation, { maxLen: 160 }),
      notes: A.sanitizeInput(form.notes, { maxLen: MAXLEN.notes, multiline: true })
    };
    const invoice = saveInvoice(clean);
    const longPrintUrl = invoiceLink(invoice);
    const printUrl = await shortenUrl(longPrintUrl);
    const message = buildMessage(clean, printUrl);
    const whatsappUrl = A.whatsappLink(message);
    if (whatsappWindow && !whatsappWindow.closed) {
      whatsappWindow.location.replace(whatsappUrl);
    } else {
      A.openExternal(whatsappUrl);
    }
    showSendFollowup(message);
  }

  function compactInvoice(invoice) {
    return {
      v: 3,
      l: invoice.lang,
      d: new Date(invoice.createdAt).getTime(),
      c: invoice.customer,
      o: invoice.orderType === "delivery" ? 1 : 0,
      a: invoice.orderType === "delivery" ? invoice.location : "",
      g: invoice.deliveryArea,
      x: invoice.notes,
      k: invoice.discount,
      f: invoice.delivery,
      t: invoice.total,
      i: invoice.items.map(item => [
        item.id,
        item.weight,
        item.qty,
        item.userNotes || (!item.components.length ? item.notes : ""),
        item.line,
        item.components.map(component => [
          component.id || "",
          component.weight == null ? "" : component.weight,
          component.qty == null ? "" : component.qty
        ])
      ])
    };
  }

  function encodeInvoice(invoice) {
    const bytes = new TextEncoder().encode(JSON.stringify(compactInvoice(invoice)));
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function invoiceLink(invoice) {
    try {
      const liveBase = /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)
        ? location.href
        : DATA.STORE.menuUrl;
      const url = new URL("invoice.html", liveBase);
      url.hash = "i=" + encodeInvoice(invoice);
      return url.href;
    } catch (_) {
      return "";
    }
  }

  async function shortenUrl(longUrl) {
    if (!longUrl || !/^https?:\/\//i.test(longUrl)) return longUrl || "";

    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 3500) : null;

    try {
      const response = await fetch(
        "https://is.gd/create.php?format=simple&url=" + encodeURIComponent(longUrl),
        controller ? { signal: controller.signal } : undefined
      );
      if (!response.ok) throw new Error("URL shortening failed");

      const shortUrl = (await response.text()).trim();
      return /^https:\/\/is\.gd\/[A-Za-z0-9_-]+$/i.test(shortUrl) ? shortUrl : longUrl;
    } catch (_) {
      return shortenUrlWithJsonp(longUrl);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  function shortenUrlWithJsonp(longUrl) {
    return new Promise(resolve => {
      const callbackName = "adamInvoiceShortener_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      let finished = false;

      const finish = value => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        script.remove();
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
        resolve(value);
      };

      const timeout = setTimeout(() => finish(longUrl), 5000);
      window[callbackName] = result => {
        const shortUrl = result && typeof result.shorturl === "string" ? result.shorturl.trim() : "";
        finish(/^https:\/\/is\.gd\/[A-Za-z0-9_-]+$/i.test(shortUrl) ? shortUrl : longUrl);
      };
      script.onerror = () => finish(longUrl);
      script.src = "https://is.gd/create.php?format=json&callback=" +
        encodeURIComponent(callbackName) + "&url=" + encodeURIComponent(longUrl);
      document.head.append(script);
    });
  }

  function saveInvoice(clean) {
    const items = window.AdamCart.getItems();
    const subtotal = items.reduce((sum, item) => sum + Number(item.line || 0), 0);
    const discount = window.AdamCart.promoDiscount ? window.AdamCart.promoDiscount() : 0;
    const productsTotal = window.AdamCart.subtotal();
    const delivery = deliveryFee();
    const total = Math.round((productsTotal + delivery) * 100) / 100;
    const beforeTax = Math.round((total / 1.18) * 100) / 100;
    const tax = Math.round((total - beforeTax) * 100) / 100;
    const lang = A.lang() === "he" ? "he" : "ar";
    const invoice = {
      version: 2,
      lang,
      number: String(Date.now()).slice(-8),
      createdAt: new Date().toISOString(),
      customer: clean.name,
      orderType: clean.type,
      location: clean.location,
      currentLocation: clean.currentLocation,
      deliveryArea: form.deliveryArea || "",
      notes: clean.notes,
      subtotal,
      discount,
      delivery,
      beforeTax,
      taxRate: 18,
      tax,
      total,
      items: items.map(({ product: p, weight, qty, notes, userNotes, components, line }) => ({
        id: p.id,
        name: A.nameOf(p.name),
        unit: p.unit,
        fixedWeight: p.fixedWeight ? A.nameOf(p.fixedWeight) : "",
        weight,
        qty,
        notes,
        userNotes,
        line,
        components: (components || []).map(component => {
          const item = A.productById(component.id);
          return {
            id: component.id,
            name: item ? A.nameOf(item.name) : String(component.name || ""),
            weight: component.weight != null && Number.isFinite(+component.weight) ? +component.weight : null,
            qty: component.qty != null && Number.isFinite(+component.qty) ? +component.qty : null
          };
        })
      }))
    };
    try { localStorage.setItem(INVOICE_KEY, JSON.stringify(invoice)); } catch (_) {}
    return invoice;
  }

  function buildMessage(clean, printUrl) {
    const items = window.AdamCart.getItems();
    const sub = window.AdamCart.subtotal();
    const discount = window.AdamCart.promoDiscount ? window.AdamCart.promoDiscount() : 0;
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
      if (clean.currentLocation) {
        const detectedArea = form.deliveryArea ? " (" + areaLabel(form.deliveryArea) + ")" : "";
        L.push("📍 " + A.t("wa_current_location") + detectedArea + ": " + clean.currentLocation);
      }
      L.push("📍 " + A.t("wa_location") + ": " + clean.location);
    }
    L.push("");
    L.push("🛒 " + A.t("wa_products") + ":");
    items.forEach(({ product: p, weight, qty, notes, userNotes, components, line: lp }, i) => {
      const wl = orderWeight(p, weight, components, true);
      L.push("  " + (i + 1) + ") " + A.nameOf(p.name));
      L.push("       " + wl + " × " + qty + "  =  " + A.money(lp));
      if (Array.isArray(components) && components.length) {
        components.forEach(component => {
          const item = A.productById(component.id);
          const name = item ? A.nameOf(item.name) : component.name;
          if (Number.isFinite(+component.weight)) {
            const componentWeight = +component.weight >= 1000 ? "1kg" : +component.weight + "g";
            L.push("       - " + name + ": " + componentWeight);
          } else if (Number.isFinite(+component.qty)) {
            L.push("       - " + name + " × " + component.qty);
          }
        });
        if (userNotes) L.push("       " + A.t("wa_notes") + ": " + userNotes);
      } else if (notes) {
        L.push("       " + A.t("wa_notes") + ": " + notes);
      }
      if (i < items.length - 1) L.push("");
    });
    L.push("");
    L.push(line);
    if (discount) L.push(A.t("promo_discount") + ": -" + A.money(discount));
    L.push(A.t("wa_subtotal") + ": " + A.money(sub));
    L.push(A.t("wa_delivery") + ": " + (isDelivery && sub >= FREE_DELIVERY_MIN ? A.t("free_delivery_label") : (fee ? A.money(fee) : (A.lang() === "he" ? "ללא" : "بدون"))));
    L.push("💰 " + A.t("wa_total") + ": " + A.money(sub + fee));
    if (isDelivery && clean.notes) { L.push(""); L.push("📝 " + A.t("wa_notes") + ": " + clean.notes); }
    if (printUrl) {
      L.push("");
      L.push("🧾 " + (A.lang() === "he" ? "קישור להדפסת חשבונית" : "رابط طباعة الفاتورة") + ":");
      L.push(printUrl);
    }
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
      form.currentCoords = {
        lat: Number(lat),
        lng: Number(lng),
        accuracy: Number(pos.coords.accuracy) || 0
      };
      form.deliveryArea = areaFromCoords(form.currentCoords);
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
