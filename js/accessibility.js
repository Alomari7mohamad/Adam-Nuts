/* Accessibility controls: persistent, bilingual and keyboard friendly. */
(function () {
  "use strict";

  const A = window.Adam;
  const KEY = "adam_a11y";
  const toggleKeys = [
    "grayscale", "invert", "lowSaturation", "contrast", "bigText",
    "highlightLinks", "underlineLinks", "hideImages", "readableFont",
    "lineSpacing", "letterSpacing", "alignLeft", "bigCursor",
    "reduceMotion", "stopAnimations"
  ];
  const classMap = {
    contrast: "a11y-contrast",
    highlightLinks: "a11y-highlight-links",
    underlineLinks: "a11y-underline-links",
    hideImages: "a11y-hide-images",
    readableFont: "a11y-readable-font",
    lineSpacing: "a11y-line-spacing",
    letterSpacing: "a11y-letter-spacing",
    alignLeft: "a11y-align-left",
    bigCursor: "a11y-big-cursor",
    reduceMotion: "a11y-reduce-motion",
    stopAnimations: "a11y-stop-animations"
  };
  const defaults = {
    font: 1,
    grayscale: false,
    invert: false,
    lowSaturation: false,
    colorFilter: "none",
    contrast: false,
    bigText: false,
    highlightLinks: false,
    underlineLinks: false,
    hideImages: false,
    readableFont: false,
    lineSpacing: false,
    letterSpacing: false,
    alignLeft: false,
    bigCursor: false,
    reduceMotion: false,
    stopAnimations: false
  };
  const copy = {
    ar: {
      title: "أدوات إمكانية الوصول",
      subtitle: "قم بتخصيص تجربتك لتناسب احتياجاتك",
      fontSize: "حجم النص",
      colorModes: "أوضاع الألوان",
      grayscale: "تدرج رمادي",
      invert: "عكس الألوان",
      lowSaturation: "تشبع منخفض",
      colorFilter: "فلتر عمى الألوان",
      none: "لا شيء",
      red: "أحمر",
      blueYellow: "أزرق - أصفر",
      redGreen: "أحمر - أخضر",
      visual: "خيارات بصرية",
      contrast: "تباين عالٍ",
      bigText: "نص كبير",
      highlightLinks: "تسليط الضوء على الروابط",
      underlineLinks: "تسطير الروابط",
      hideImages: "إخفاء الصور",
      text: "خيارات النص",
      readableFont: "خط قابل للقراءة",
      lineSpacing: "زيادة المسافة بين الأسطر",
      letterSpacing: "زيادة المسافة بين الحروف",
      alignLeft: "محاذاة النص لليسار",
      navigation: "خيارات التنقل",
      bigCursor: "مؤشر كبير",
      reduceMotion: "تقليل الحركة",
      stopAnimations: "إيقاف الرسوم المتحركة",
      reset: "إعادة تعيين إلى الافتراضي",
      close: "إغلاق",
      decrease: "تصغير النص",
      increase: "تكبير النص",
      resetDone: "تمت إعادة إعدادات الوصول"
    },
    he: {
      title: "כלי נגישות",
      subtitle: "התאימו את חוויית הגלישה לצרכים שלכם",
      fontSize: "גודל טקסט",
      colorModes: "מצבי צבע",
      grayscale: "גווני אפור",
      invert: "היפוך צבעים",
      lowSaturation: "רוויה נמוכה",
      colorFilter: "מסנן עיוורון צבעים",
      none: "ללא",
      red: "אדום",
      blueYellow: "כחול - צהוב",
      redGreen: "אדום - ירוק",
      visual: "אפשרויות חזותיות",
      contrast: "ניגודיות גבוהה",
      bigText: "טקסט גדול",
      highlightLinks: "הדגשת קישורים",
      underlineLinks: "קו תחתון לקישורים",
      hideImages: "הסתרת תמונות",
      text: "אפשרויות טקסט",
      readableFont: "גופן קריא",
      lineSpacing: "הגדלת מרווח בין שורות",
      letterSpacing: "הגדלת מרווח בין אותיות",
      alignLeft: "יישור טקסט לשמאל",
      navigation: "אפשרויות ניווט",
      bigCursor: "סמן גדול",
      reduceMotion: "הפחתת תנועה",
      stopAnimations: "עצירת אנימציות",
      reset: "איפוס לברירת מחדל",
      close: "סגירה",
      decrease: "הקטנת טקסט",
      increase: "הגדלת טקסט",
      resetDone: "הגדרות הנגישות אופסו"
    }
  };

  let state = load();

  function language() {
    return document.documentElement.lang === "he" ? "he" : "ar";
  }

  function text(key) {
    return copy[language()][key] || copy.ar[key] || key;
  }

  function load() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) {}
    const next = Object.assign({}, defaults, stored);
    next.font = Math.min(1.6, Math.max(0.85, Number(next.font) || 1));
    toggleKeys.forEach(key => { next[key] = !!next[key]; });
    if (!["none", "red", "blueYellow", "redGreen"].includes(next.colorFilter)) {
      next.colorFilter = "none";
    }
    return next;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function colorFilterValue() {
    const filters = [];
    if (state.grayscale) filters.push("grayscale(1)");
    if (state.invert) filters.push("invert(1) hue-rotate(180deg)");
    if (state.lowSaturation) filters.push("saturate(.35)");
    if (state.colorFilter === "red") filters.push("sepia(.28) saturate(1.35) hue-rotate(-18deg)");
    if (state.colorFilter === "blueYellow") filters.push("sepia(.22) saturate(1.2) hue-rotate(155deg)");
    if (state.colorFilter === "redGreen") filters.push("sepia(.3) saturate(.75) hue-rotate(25deg)");
    return filters.join(" ");
  }

  function apply() {
    const html = document.documentElement;
    const scale = Math.min(1.75, state.font * (state.bigText ? 1.18 : 1));
    html.style.setProperty("--font-scale", scale.toFixed(3));
    html.style.setProperty("--a11y-page-filter", colorFilterValue() || "none");
    html.classList.toggle("a11y-filtered", colorFilterValue() !== "");
    Object.keys(classMap).forEach(key => {
      html.classList.toggle(classMap[key], state[key]);
    });
    html.classList.toggle("a11y-bigfont", scale >= 1.3);
    sync();
  }

  function switchRow(key, icon) {
    return '<button type="button" class="a11y-option" data-a11y-toggle="' + key +
      '" role="switch" aria-checked="false">' +
      '<span class="a11y-option-label"><span class="a11y-row-icon">' + icon +
      '</span><span data-a11y-copy="' + key + '"></span></span>' +
      '<span class="a11y-switch" aria-hidden="true"><span></span></span></button>';
  }

  function icon(name) {
    return A.icon(name) || '<span class="a11y-letter-icon">A</span>';
  }

  function section(titleKey, sectionIcon, content) {
    return '<section class="a11y-section"><h4>' + icon(sectionIcon) +
      '<span data-a11y-copy="' + titleKey + '"></span></h4>' + content + '</section>';
  }

  function buildPanel() {
    if (document.getElementById("a11yPanel")) return;
    const panel = A.el("div", {
      id: "a11yPanel",
      class: "drawer a11y-panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "a11yTitle"
    });

    const colorModes =
      switchRow("grayscale", icon("droplet")) +
      switchRow("invert", icon("contrast")) +
      switchRow("lowSaturation", icon("droplet")) +
      '<div class="a11y-filter-block"><div class="a11y-filter-title" data-a11y-copy="colorFilter"></div>' +
      '<div class="a11y-filter-grid">' +
      ["none", "red", "blueYellow", "redGreen"].map(value =>
        '<button type="button" data-a11y-filter="' + value +
        '" data-a11y-copy="' + value + '"></button>'
      ).join("") + '</div></div>';

    panel.innerHTML =
      '<div class="drawer-head a11y-head"><div><h3 id="a11yTitle">' +
      icon("access") + '<span data-a11y-copy="title"></span></h3>' +
      '<p data-a11y-copy="subtitle"></p></div>' +
      '<button type="button" class="close-x" data-action="close-drawer" data-a11y-label="close">' +
      icon("close") + '</button></div>' +
      '<div class="drawer-body a11y-body">' +
      '<section class="a11y-font-section"><div class="a11y-font-heading"><strong data-a11y-copy="fontSize"></strong>' +
      '<span id="a11yFontVal">100%</span></div><div class="a11y-font-controls">' +
      '<button type="button" class="a11y-font-btn" data-a11y-font="-0.1" data-a11y-label="decrease">−</button>' +
      '<div class="a11y-font-track" aria-hidden="true"><span id="a11yFontTrack"></span></div>' +
      '<button type="button" class="a11y-font-btn" data-a11y-font="0.1" data-a11y-label="increase">+</button>' +
      '</div></section>' +
      section("colorModes", "droplet", colorModes) +
      section("visual", "contrast",
        switchRow("contrast", icon("contrast")) +
        switchRow("bigText", icon("fontUp")) +
        switchRow("highlightLinks", icon("droplet")) +
        switchRow("underlineLinks", icon("reset")) +
        switchRow("hideImages", icon("info"))) +
      section("text", "doc",
        switchRow("readableFont", icon("doc")) +
        switchRow("lineSpacing", icon("fontUp")) +
        switchRow("letterSpacing", icon("fontUp")) +
        switchRow("alignLeft", icon("fontDown"))) +
      section("navigation", "reset",
        switchRow("bigCursor", icon("info")) +
        switchRow("reduceMotion", icon("reset")) +
        switchRow("stopAnimations", icon("reset"))) +
      '<button type="button" class="a11y-reset" data-a11y-reset>' +
      icon("reset") + '<span data-a11y-copy="reset"></span></button></div>';

    document.body.append(panel);

    panel.querySelector("[data-action='close-drawer']").addEventListener("click", A.closeAllDrawers);
    panel.querySelectorAll("[data-a11y-font]").forEach(button => {
      button.addEventListener("click", () => {
        state.font = Math.min(1.6, Math.max(0.85,
          +(state.font + Number(button.dataset.a11yFont)).toFixed(2)));
        save();
        apply();
      });
    });
    panel.querySelectorAll("[data-a11y-toggle]").forEach(button => {
      button.addEventListener("click", () => {
        const key = button.dataset.a11yToggle;
        state[key] = !state[key];
        save();
        apply();
      });
    });
    panel.querySelectorAll("[data-a11y-filter]").forEach(button => {
      button.addEventListener("click", () => {
        state.colorFilter = button.dataset.a11yFilter;
        save();
        apply();
      });
    });
    panel.querySelector("[data-a11y-reset]").addEventListener("click", reset);
    updateLanguage();
  }

  function sync() {
    const panel = document.getElementById("a11yPanel");
    if (!panel) return;
    panel.querySelectorAll("[data-a11y-toggle]").forEach(button => {
      const active = state[button.dataset.a11yToggle];
      button.classList.toggle("active", active);
      button.setAttribute("aria-checked", String(active));
    });
    panel.querySelectorAll("[data-a11y-filter]").forEach(button => {
      const active = state.colorFilter === button.dataset.a11yFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const value = Math.round(state.font * 100);
    const label = panel.querySelector("#a11yFontVal");
    const track = panel.querySelector("#a11yFontTrack");
    if (label) label.textContent = value + "%";
    if (track) track.style.width = Math.max(0, Math.min(100, ((state.font - .85) / .75) * 100)) + "%";
  }

  function updateLanguage() {
    const panel = document.getElementById("a11yPanel");
    if (!panel) return;
    panel.querySelectorAll("[data-a11y-copy]").forEach(node => {
      node.textContent = text(node.dataset.a11yCopy);
    });
    panel.querySelectorAll("[data-a11y-label]").forEach(node => {
      node.setAttribute("aria-label", text(node.dataset.a11yLabel));
      node.setAttribute("title", text(node.dataset.a11yLabel));
    });
  }

  function reset() {
    state = Object.assign({}, defaults);
    save();
    apply();
    A.toast(text("resetDone"), "reset");
  }

  function init() {
    buildPanel();
    apply();
    document.getElementById("a11yToggle")?.addEventListener("click", () => A.toggleDrawer("a11yPanel"));
    document.addEventListener("adam:lang", updateLanguage);
  }

  window.AdamAccessibility = { init, apply };
  apply();
})();
