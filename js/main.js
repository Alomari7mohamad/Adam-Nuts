/* =====================================================================
   main.js — shared core (icons, utils, i18n apply) + shell behaviours
   Loaded LAST; orchestrates init of all modules on DOMContentLoaded.
   ===================================================================== */
(function () {
  "use strict";

  const I18n = window.AdamI18n;
  const DATA = window.AdamData;

  /* ---------------- Inline SVG icon set (static, safe to inject) -------- */
  const ICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 12.3a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8" cy="8" r="1.4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.2-.7-2.7-1.1-4.4-3.9-4.5-4.1-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.7 1.1 1.4 1.7.9.8 1.7 1 2 1.2.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.4.1.1.1.7-.1 1.3Z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
    crown: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l3.5 3L12 5l5.5 6L21 8l-1.5 10h-15L3 8Z"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 11h16v9H4z"/><path d="M2 7h20v4H2zM12 7v13M12 7S10.5 3 8.5 3 6 5 7 7M12 7s1.5-4 3.5-4S18 5 17 7"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    access: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.25"/><circle cx="12" cy="7" r="1.35" fill="currentColor" stroke="none"/><path d="M7.8 10.1c2.8 1 5.6 1 8.4 0M12 10.4v4.1m0 0-3 4m3-4 3 4"/></svg>',
    fontUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18 8 6l5 12M4.5 14h7M16 9v8m-4-4h8"/></svg>',
    fontDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18 8 6l5 12M4.5 14h7M12 13h8"/></svg>',
    contrast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/></svg>',
    droplet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3Z"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v6h6"/><path d="M20 12a8 8 0 1 1-2.3-5.6L20 8"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 11l6-6 6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17l9-10"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.6 6 .7-4.5 4 1.3 6L12 16.8 6.6 19.3l1.3-6-4.5-4 6-.7z"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 9 5 4h14l1 5M4 9h16M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 14l2 5v3a1 1 0 0 1-1 1A17 17 0 0 1 4 4a1 1 0 0 1 1-1Z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4M9 13h6M9 17h6"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3m4-3v7h-7m3 0h.01M17 21h.01"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>'
  };

  /* ---------------- Utilities ---------------- */
  function lang() { return I18n.getLang(); }
  function t(k) { return I18n.t(k); }
  function nameOf(obj) { return obj[lang()] || obj.ar; }

  // Escape any string before it touches the DOM as text content fallback
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function fmtNum(n) {
    if (n == null || n === "" || !Number.isFinite(+n)) return "";
    const r = Math.round(n * 2) / 2;            // nearest 0.5 ₪
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  }
  function money(n) {
    const formatted = fmtNum(n);
    return formatted ? formatted + " ₪" : "";
  }

  /* ---------------- Input sanitization (OWASP: validate/sanitize input) ----
     Central, reusable cleaner for every free-text user input (checkout fields,
     search). Defends against: control-char / newline injection into the
     WhatsApp message, zero-width & bidirectional (Trojan-Source) spoofing,
     and unbounded length. Output encoding for the DOM is handled separately
     by escapeHtml()/textContent — this is the INPUT side. */
  function sanitizeInput(value, opts) {
    opts = opts || {};
    const maxLen = opts.maxLen || 200;
    let s = String(value == null ? "" : value);
    try { s = s.normalize("NFC"); } catch (e) { /* older engines */ }
    // strip zero-width + bidirectional (Trojan-Source) control characters
    s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
    if (opts.multiline) {
      // keep newlines/tabs, drop other control chars; tidy whitespace
      s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
      s = s.replace(/[^\S\r\n]{2,}/g, " ");
      s = s.replace(/\n{3,}/g, "\n\n");
    } else {
      // single line: collapse every control char / newline to one space
      s = s.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s{2,}/g, " ");
    }
    s = s.trim();
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }
  // A name must have real content: >= 2 chars and at least one Unicode letter.
  function isValidName(s) {
    try { return s.length >= 2 && /\p{L}/u.test(s); }
    catch (e) { return s.length >= 2 && /[A-Za-z\u0590-\u05FF\u0600-\u06FF]/.test(s); }
  }

  // Price for one item at given weight(g)/qty, after optional offer %
  function unitPrice(p, weight) {
    if (!p || p.price == null || p.price === "" || !Number.isFinite(+p.price)) return null;
    let base = p.unit === "kg" ? p.price * (weight / 1000) : p.price;
    if (p.offer) base = base * (1 - p.offer / 100);
    return base;
  }
  function oldUnitPrice(p, weight) {
    if (!p || p.price == null || p.price === "" || !Number.isFinite(+p.price)) return null;
    return p.unit === "kg" ? p.price * (weight / 1000) : p.price;
  }
  function productById(id) { return DATA.PRODUCTS.find(p => p.id === id); }

  // Build an element safely from a tag + props + children
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === "class") n.className = props[k];
      else if (k === "html") n.innerHTML = props[k];       // ONLY for trusted icon strings
      else if (k === "text") n.textContent = props[k];     // safe text
      else if (k.startsWith("on") && typeof props[k] === "function") n.addEventListener(k.slice(2), props[k]);
      else if (k === "dataset") Object.assign(n.dataset, props[k]);
      else if (props[k] != null) n.setAttribute(k, props[k]);
    }
    kids.flat().forEach(c => { if (c != null) n.append(c.nodeType ? c : document.createTextNode(c)); });
    return n;
  }

  /* ---------------- Toast notifications ---------------- */
  let toastWrap;
  function toast(msg, icon) {
    if (!toastWrap) {
      toastWrap = el("div", { class: "toast-wrap", "aria-live": "polite" });
      document.body.append(toastWrap);
    }
    const node = el("div", { class: "toast" });
    if (icon) node.innerHTML = ICONS[icon] || "";
    node.append(document.createTextNode(msg));
    toastWrap.append(node);
    setTimeout(() => {
      node.classList.add("out");
      node.addEventListener("animationend", () => node.remove());
    }, 2200);
  }

  /* ---------------- i18n application over static markup -------------- */
  function applyTranslations(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(n => { n.textContent = t(n.dataset.i18n); });
    root.querySelectorAll("[data-i18n-ph]").forEach(n => { n.setAttribute("placeholder", t(n.dataset.i18nPh)); });
    root.querySelectorAll("[data-i18n-aria]").forEach(n => { n.setAttribute("aria-label", t(n.dataset.i18nAria)); });
  }

  function applyLangToHtml() {
    const l = lang();
    const html = document.documentElement;
    html.setAttribute("lang", l);
    html.setAttribute("dir", I18n.TRANSLATIONS[l].dir);
  }

  // Full re-render after a language change
  function fillBrand() {
    document.querySelectorAll(".store-name").forEach(n => n.textContent = nameOf(DATA.STORE.name));
    document.querySelectorAll(".store-tag").forEach(n => n.textContent = nameOf(DATA.STORE.tagline));
  }

  function rerenderAll() {
    applyLangToHtml();
    applyTranslations(document);
    fillBrand();
    document.querySelectorAll(".lang-current").forEach(n => n.textContent = t("switchTo"));
    window.AdamProducts && window.AdamProducts.renderAll();
    window.AdamCart && window.AdamCart.render();
    window.dispatchEvent(new CustomEvent("adam:lang"));
  }

  function toggleLang() {
    I18n.setLang(lang() === "ar" ? "he" : "ar");
    rerenderAll();
    toast(t("langName"), "globe");
  }

  /* ---------------- Drawers / overlay ---------------- */
  let overlay;
  function getOverlay() {
    if (!overlay) {
      overlay = el("div", { class: "overlay", onclick: closeAllDrawers });
      document.body.append(overlay);
    }
    return overlay;
  }
  function openDrawer(id) {
    const d = document.getElementById(id);
    if (!d) return;
    getOverlay().classList.add("show");
    d.classList.add("show");
    document.body.classList.add("scroll-lock");
  }
  function closeAllDrawers() {
    document.querySelectorAll(".drawer.show").forEach(d => d.classList.remove("show"));
    if (overlay) overlay.classList.remove("show");
    document.body.classList.remove("scroll-lock");
  }
  function toggleDrawer(id) {
    const drawer = document.getElementById(id);
    if (!drawer) return;
    if (drawer.classList.contains("show")) {
      closeAllDrawers();
      return;
    }
    closeAllDrawers();
    openDrawer(id);
  }

  /* ---------------- External links (safe) ---------------- */
  function openExternal(url) {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) w.opener = null;
  }
  function whatsappLink(text) {
    return "https://wa.me/" + DATA.STORE.whatsapp + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function phoneLink() { return "tel:0" + DATA.STORE.whatsapp.slice(3); }

  /* ---------------- Bottom-nav wiring ---------------- */
  function initNav() {
    document.querySelectorAll("[data-nav]").forEach(btn => {
      btn.addEventListener("click", e => {
        const target = btn.dataset.nav;
        if (target === "cart") { e.preventDefault(); window.AdamCart && window.AdamCart.open(); }
        else if (target === "favorites") { e.preventDefault(); window.AdamProducts && window.AdamProducts.openFavorites(); }
        else if (target === "hours") { e.preventDefault(); toggleDrawer("hoursDrawer"); }
        else if (target === "catalog") {
          e.preventDefault();
          closeAllDrawers();
          const cats = document.getElementById("cats");
          if (cats) cats.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        else if (target === "account") { e.preventDefault(); openDrawer("accountDrawer"); }
      });
    });
  }
  function setActiveNav(key) {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.nav === key));
  }

  /* ---------------- Header wiring ---------------- */
  function initHeader() {
    document.querySelectorAll("[data-action='lang']").forEach(b => b.addEventListener("click", toggleLang));
    document.querySelectorAll("[data-action='menu']").forEach(b => b.addEventListener("click", () => openDrawer("sideMenu")));
    document.querySelectorAll("[data-action='whatsapp']").forEach(b =>
      b.addEventListener("click", () => openExternal(whatsappLink(t("wa_title") + "\n"))));
    document.querySelectorAll("[data-action='close-drawer']").forEach(b => b.addEventListener("click", closeAllDrawers));
    document.querySelectorAll("[data-action='location']").forEach(b =>
      b.addEventListener("click", () => openExternal(DATA.STORE.location)));
    document.querySelectorAll("[data-action='qr']").forEach(b =>
      b.addEventListener("click", () => { closeAllDrawers(); openDrawer("qrDrawer"); }));
  }

  /* ---------------- Expose shared API ---------------- */
  window.Adam = {
    ICONS, DATA, lang, t, nameOf, escapeHtml, el, money, fmtNum,
    unitPrice, oldUnitPrice, productById, toast,
    sanitizeInput, isValidName,
    applyTranslations, rerenderAll, openDrawer, closeAllDrawers, toggleDrawer,
    openExternal, whatsappLink, setActiveNav, icon: k => ICONS[k] || ""
  };

  /* ---------------- Shared chrome injection ---------------- */
  function I(k) { return ICONS[k] || ""; }
  function buildChrome() {
    const app = document.getElementById("app");
    if (!app) return;
    const page = document.body.dataset.page || "home";
    const showFloating = page === "home" || page === "menu";

    // Loader
    if (!document.getElementById("loader")) {
      const loader = el("div", { id: "loader", class: "loader" });
      loader.innerHTML =
        '<div class="loader-inner"><div class="loader-badge"><img src="assets/images/logo/logo.svg.png" alt=""></div>' +
        '<div class="loader-title">' + escapeHtml(nameOf(DATA.STORE.name)) + '</div>' +
        '<div class="loader-bar"></div></div>';
      document.body.prepend(loader);
    }

    // Header
    const header = el("header", { class: "site-header" });
    header.innerHTML =
      '<div class="header-left">' +
        '<button class="lang-pill" data-action="lang" aria-label="language">' + I("globe") + '<span class="lang-current"></span></button>' +
      '</div>' +
      '<a href="index.html" class="brand-badge" aria-label="' + escapeHtml(nameOf(DATA.STORE.name)) + '"><img src="assets/images/logo/logo.svg.png" alt="' + escapeHtml(nameOf(DATA.STORE.name)) + '"></a>' +
      '<div class="header-right">' +
        '<button class="icon-btn" data-action="menu" data-i18n-aria="menu">' + I("menu") + '</button>' +
      '</div>';
    app.prepend(header);

    // Footer
    const footer = el("footer", { class: "site-footer" });
    footer.innerHTML =
      '<div class="footer-badge"><img src="assets/images/logo/logo.svg.png" alt=""></div>' +
      '<div class="footer-name store-name"></div>' +
      '<div class="footer-tag store-tag"></div>' +
      '<div class="footer-social">' +
        '<a href="' + whatsappLink("") + '" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">' + I("whatsapp") + '</a>' +
        '<a href="' + DATA.STORE.location + '" target="_blank" rel="noopener noreferrer" aria-label="location">' + I("location") + '</a>' +
        '<a href="tel:0' + DATA.STORE.whatsapp.slice(3) + '" aria-label="phone">' + I("phone") + '</a>' +
      '</div>' +
      '<div class="footer-links">' +
        '<a href="privacy.html" data-i18n="privacy"></a>' +
        '<a href="terms.html" data-i18n="terms"></a>' +
      '</div>' +
      '<div class="footer-dev"><a href="' + DATA.STORE.developer.url + '" target="_blank" rel="noopener noreferrer" data-i18n="developed_by"></a></div>' +
      '<div class="footer-rights">© ' + new Date().getFullYear() + ' ' + escapeHtml(nameOf(DATA.STORE.name)) + ' · <span data-i18n="rights"></span></div>';
    app.append(footer);

    // Bottom nav
    const nav = el("nav", { class: "bottom-nav", "aria-label": "main" });
    nav.innerHTML =
      '<a href="' + phoneLink() + '" class="nav-item" data-nav="contact">' + I("phone") + '<span data-i18n="contact_us"></span></a>' +
      '<button class="nav-item" data-nav="hours">' + I("calendar") + '<span data-i18n="business_hours"></span></button>' +
      '<button class="nav-item center" data-nav="cart"><span class="nav-badge hidden" data-cart-count>0</span><span class="nav-ico">' + I("cart") + '</span><span data-i18n="cart"></span></button>' +
      navItem("favorites", "heart", "fav") +
      '<button class="nav-item" data-nav="catalog">' + I("store") + '<span data-i18n="menu"></span></button>';
    app.append(nav);

    // Floating cart
    if (showFloating) {
      const fc = el("div", { id: "floatingCart", class: "floating-cart", role: "button", tabindex: "0", "data-action": "open-cart" });
      fc.innerHTML =
        '<div class="fc-ico">' + I("cart") + '<span class="fc-count">0</span></div>' +
        '<div class="fc-info"><div class="fc-items">0</div><div class="fc-total">0 ₪</div></div>' +
        '<span class="btn btn-gold" style="pointer-events:none" data-i18n="view_cart"></span>';
      app.append(fc);
    }

    // FAB stack
    const fabs = el("div", { class: "fab-stack" });
    fabs.innerHTML =
      '<a class="fab instagram" href="' + DATA.STORE.instagram + '" target="_blank" rel="noopener noreferrer" aria-label="Instagram">' + I("instagram") + '</a>' +
      '<button class="fab gold" data-action="location" data-i18n-aria="store_location">' + I("location") + '</button>' +
      '<button class="fab accessibility-fab" id="a11yToggle" data-i18n-aria="accessibility">' + I("access") + '</button>' +
      '<button class="fab scrolltop" id="scrollTop" data-i18n-aria="scroll_top">' + I("arrowUp") + '</button>';
    document.body.append(fabs);

    // Drawers
    document.body.append(buildDrawers());
  }

  function navItem(nav, icon, badge) {
    const b = badge === "cart" ? '<span class="nav-badge hidden" data-cart-count>0</span>'
            : badge === "fav" ? '<span class="nav-badge hidden" data-fav-count>0</span>' : "";
    const tag = nav === "cart" || nav === "favorites" || nav === "account" || nav === "offers" ? "button" : "button";
    return '<' + tag + ' class="nav-item" data-nav="' + nav + '">' + b + I(icon) + '<span data-i18n="' + nav + '"></span></' + tag + '>';
  }

  function drawerShell(id, titleKey, icon, bodyId, footHtml) {
    return '<aside class="drawer" id="' + id + '" role="dialog" aria-modal="true">' +
      '<div class="drawer-head"><h3>' + I(icon) + '<span data-i18n="' + titleKey + '"></span></h3>' +
      '<button class="close-x" data-action="close-drawer" data-i18n-aria="back">' + I("close") + '</button></div>' +
      '<div class="drawer-body" id="' + bodyId + '"></div>' +
      (footHtml || "") + '</aside>';
  }

  function buildDrawers() {
    const frag = document.createElement("div");
    // Side menu
    const cats = DATA.CATEGORIES.map(c =>
      '<a href="index.html?cat=' + c.id + '#catalog-section">' + I("store") + '<span>' + escapeHtml(nameOf(c.name)) + '</span></a>'
    ).join("");
    frag.innerHTML =
      '<aside class="drawer" id="sideMenu" role="dialog" aria-modal="true">' +
        '<div class="drawer-head"><h3>' + I("menu") + '<span data-i18n="menu"></span></h3>' +
        '<button class="close-x" data-action="close-drawer" data-i18n-aria="back">' + I("close") + '</button></div>' +
        '<div class="drawer-body" id="sideMenuBody">' +
        '<div class="menu-list">' +
          '<a href="index.html#catalog-section">' + I("menu") + '<span data-i18n="menu"></span></a>' +
          cats +
          '<div class="menu-sep"></div>' +
          '<a href="index.html?cat=all#catalog-section">' + I("store") + '<span data-i18n="all_products"></span></a>' +
          '<button data-action="open-cart">' + I("cart") + '<span data-i18n="your_cart"></span></button>' +
          '<button data-action="qr">' + I("qr") + '<span data-i18n="qr_title"></span></button>' +
          '<a href="' + DATA.STORE.location + '" target="_blank" rel="noopener noreferrer">' + I("location") + '<span data-i18n="store_location"></span></a>' +
        '</div></div></aside>' +

      // Cart bottom sheet
      '<aside class="drawer bottom-sheet cart-sheet" id="cartDrawer" role="dialog" aria-modal="true">' +
        '<div class="drawer-head"><h3>' + I("cart") + '<span data-i18n="your_cart"></span></h3>' +
        '<button class="close-x" data-action="close-drawer" data-i18n-aria="back">' + I("close") + '</button></div>' +
        '<div class="drawer-body" id="cartBody"></div>' +
        '<div class="drawer-foot" id="cartFoot"></div>' +
      '</aside>' +

      // Favourites bottom sheet
      '<aside class="drawer bottom-sheet favorites-sheet" id="favDrawer" role="dialog" aria-modal="true">' +
        '<div class="drawer-head"><h3>' + I("heart") + '<span data-i18n="favorites"></span></h3>' +
        '<button class="close-x" data-action="close-drawer" data-i18n-aria="back">' + I("close") + '</button></div>' +
        '<div class="drawer-body" id="favBody"></div>' +
      '</aside>' +

      // Business hours bottom sheet
      '<aside class="drawer bottom-sheet" id="hoursDrawer" role="dialog" aria-modal="true">' +
        '<div class="drawer-head"><h3>' + I("calendar") + '<span data-i18n="business_hours"></span></h3>' +
        '<button class="close-x" data-action="close-drawer" data-i18n-aria="back">' + I("close") + '</button></div>' +
        '<div class="drawer-body hours-body">' +
          '<div class="hours-icon">' + I("calendar") + '</div>' +
          '<p data-i18n="business_hours_text"></p>' +
          '<a class="btn btn-gold btn-block" href="' + phoneLink() + '">' + I("phone") + '<span data-i18n="contact_us"></span></a>' +
        '</div>' +
      '</aside>' +

      // Account drawer
      drawerShell("accountDrawer", "account_title", "user", "accountBodyInner") +

      // Checkout drawer
      '<aside class="drawer" id="checkoutDrawer" role="dialog" aria-modal="true">' +
        '<div class="drawer-head"><h3>' + I("check") + '<span data-i18n="checkout_title"></span></h3>' +
        '<button class="close-x" data-action="close-drawer">' + I("close") + '</button></div>' +
        '<div class="drawer-body" id="checkoutBody"></div>' +
      '</aside>' +

      // QR drawer (share the live menu)
      '<aside class="drawer" id="qrDrawer" role="dialog" aria-modal="true">' +
        '<div class="drawer-head"><h3>' + I("qr") + '<span data-i18n="qr_title"></span></h3>' +
        '<button class="close-x" data-action="close-drawer">' + I("close") + '</button></div>' +
        '<div class="drawer-body">' +
          '<div class="qr-card">' +
            '<div class="qr-frame"><img src="assets/images/qr-menu.svg" alt="QR" width="240" height="240" /></div>' +
            '<div class="qr-store store-name"></div>' +
            '<p class="qr-hint" data-i18n="qr_hint"></p>' +
            '<a class="qr-url" href="' + DATA.STORE.menuUrl + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(DATA.STORE.menuUrl) + '</a>' +
          '</div>' +
          '<a class="btn btn-gold btn-block" style="margin-top:16px" href="' + DATA.STORE.menuUrl + '" target="_blank" rel="noopener noreferrer">' + I("globe") + '<span data-i18n="open_menu"></span></a>' +
          '<a class="btn btn-outline btn-block" style="margin-top:10px;color:var(--brown-700);border-color:var(--line)" href="https://wa.me/?text=' + encodeURIComponent(nameOf(DATA.STORE.name) + " — " + DATA.STORE.menuUrl) + '" target="_blank" rel="noopener noreferrer">' + I("share") + '<span data-i18n="share_menu"></span></a>' +
        '</div>' +
      '</aside>';

    // account text
    const acc = frag.querySelector("#accountBodyInner");
    acc.innerHTML = '<div style="text-align:center;padding:14px">' +
      '<div style="width:72px;height:72px;margin:0 auto 14px;border-radius:50%;background:var(--cream-2);display:grid;place-items:center;color:var(--gold-dark)">' + I("user") + '</div>' +
      '<p data-i18n="account_text" style="color:var(--muted)"></p>' +
      '<a class="btn btn-gold btn-block" style="margin-top:18px" href="' + whatsappLink("") + '" target="_blank" rel="noopener noreferrer">' + I("whatsapp") + '<span data-i18n="whatsapp"></span></a>' +
      '</div>';
    return frag;
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    buildChrome();
    applyLangToHtml();
    applyTranslations(document);
    fillBrand();
    document.querySelectorAll(".lang-current").forEach(n => n.textContent = t("switchTo"));

    initHeader();
    initNav();

    // Fill static icon slots
    const setIco = (id, k) => { const n = document.getElementById(id); if (n) n.innerHTML = I(k); };
    setIco("crownSlot", "crown");
    setIco("offerIcoSlot", "gift");
    document.querySelectorAll(".search-ico").forEach(n => n.innerHTML = I("search"));
    document.querySelectorAll("[data-action='scroll-cats']").forEach(b =>
      b.addEventListener("click", () => { const c = document.getElementById("cats"); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); }));

    window.AdamAccessibility && window.AdamAccessibility.init();
    window.AdamProducts && window.AdamProducts.init();
    window.AdamCart && window.AdamCart.init();
    window.AdamCheckout && window.AdamCheckout.init();
    window.AdamAnimations && window.AdamAnimations.init();

    // Hide loader once ready
    const loader = document.getElementById("loader");
    if (loader) {
      window.addEventListener("load", () => setTimeout(() => loader.classList.add("hide"), 500));
      setTimeout(() => loader.classList.add("hide"), 2200); // safety
    }
  });
})();
