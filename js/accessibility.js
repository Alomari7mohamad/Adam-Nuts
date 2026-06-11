/* =====================================================================
   accessibility.js — font scaling, high contrast, grayscale, reset.
   Settings persist in localStorage and apply on every page load.
   ===================================================================== */
(function () {
  "use strict";
  const A = window.Adam;
  const KEY = "adam_a11y";

  const defaults = { font: 1, contrast: false, grayscale: false };
  let s = load();

  function load() {
    try {
      const s = Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY)) || {});
      s.font = Math.min(1.6, Math.max(0.85, Number(s.font) || 1));  // clamp scale
      s.contrast = !!s.contrast;
      s.grayscale = !!s.grayscale;
      return s;
    } catch { return { ...defaults }; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(s)); }

  function apply() {
    const html = document.documentElement;
    html.style.setProperty("--font-scale", s.font);
    html.classList.toggle("a11y-contrast", s.contrast);
    html.classList.toggle("a11y-grayscale", s.grayscale);
    html.classList.toggle("a11y-bigfont", s.font >= 1.3);
    syncButtons();
  }

  function syncButtons() {
    const p = document.getElementById("a11yPanel");
    if (!p) return;
    p.querySelector("[data-a11y='contrast']")?.classList.toggle("active", s.contrast);
    p.querySelector("[data-a11y='grayscale']")?.classList.toggle("active", s.grayscale);
    const lbl = p.querySelector("#a11yFontVal");
    if (lbl) lbl.textContent = Math.round(s.font * 100) + "%";
  }

  function setFont(delta) { s.font = Math.min(1.6, Math.max(0.85, +(s.font + delta).toFixed(2))); save(); apply(); }
  function reset() { s = { ...defaults }; save(); apply(); A.toast(A.t("reset"), "reset"); }

  function buildPanel() {
    const A1 = window.Adam;
    const panel = A1.el("div", { id: "a11yPanel", class: "drawer", role: "dialog", "aria-modal": "true", style: "inset-inline-end:0" });
    panel.innerHTML =
      '<div class="drawer-head"><h3>' + A1.icon("access") + '<span data-i18n="accessibility"></span></h3>' +
      '<button class="close-x" data-action="close-drawer">' + A1.icon("close") + '</button></div>' +
      '<div class="drawer-body"><div class="menu-list">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 12px;border-radius:12px;background:var(--cream-2)">' +
          '<span style="font-weight:700">A<span style="font-size:1.3em">A</span></span>' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<button class="icon-btn" data-a11y="font-down" style="color:var(--brown-700);background:var(--card);border-color:var(--line)">' + A1.icon("fontDown") + '</button>' +
            '<span id="a11yFontVal" style="font-weight:700;min-width:46px;text-align:center">100%</span>' +
            '<button class="icon-btn" data-a11y="font-up" style="color:var(--brown-700);background:var(--card);border-color:var(--line)">' + A1.icon("fontUp") + '</button>' +
          '</div>' +
        '</div>' +
        '<button data-a11y="contrast">' + A1.icon("contrast") + '<span data-i18n="high_contrast"></span></button>' +
        '<button data-a11y="grayscale">' + A1.icon("droplet") + '<span data-i18n="grayscale"></span></button>' +
        '<div class="menu-sep"></div>' +
        '<button data-a11y="reset" style="color:var(--danger)">' + A1.icon("reset") + '<span data-i18n="reset"></span></button>' +
      '</div></div>';
    document.body.append(panel);

    panel.querySelector("[data-a11y='font-up']").addEventListener("click", () => setFont(0.1));
    panel.querySelector("[data-a11y='font-down']").addEventListener("click", () => setFont(-0.1));
    panel.querySelector("[data-a11y='contrast']").addEventListener("click", () => { s.contrast = !s.contrast; save(); apply(); });
    panel.querySelector("[data-a11y='grayscale']").addEventListener("click", () => { s.grayscale = !s.grayscale; save(); apply(); });
    panel.querySelector("[data-a11y='reset']").addEventListener("click", reset);
  }

  function init() {
    buildPanel();
    apply();
    const btn = document.getElementById("a11yToggle");
    if (btn) btn.addEventListener("click", () => A.openDrawer("a11yPanel"));
  }

  window.AdamAccessibility = { init, apply };
  // apply ASAP to avoid flash (before DOMContentLoaded chrome exists, html still gets classes)
  (function preapply() {
    const html = document.documentElement;
    html.style.setProperty("--font-scale", s.font);
    html.classList.toggle("a11y-contrast", s.contrast);
    html.classList.toggle("a11y-grayscale", s.grayscale);
    html.classList.toggle("a11y-bigfont", s.font >= 1.3);
  })();
})();
