/* =====================================================================
   animations.js — scroll reveal (IntersectionObserver), scroll-to-top,
   active-nav tracking. CSS does the heavy lifting; JS toggles classes.
   ===================================================================== */
(function () {
  "use strict";

  function initReveal() {
    const els = document.querySelectorAll(".reveal, .stagger");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach(e => e.classList.add("in-view"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add("in-view"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(e => io.observe(e));
  }

  function initScrollTop() {
    const btn = document.getElementById("scrollTop");
    if (!btn) return;
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        btn.classList.toggle("show", window.scrollY > 420);
        ticking = false;
      });
    }, { passive: true });
  }

  // Highlight the bottom-nav item matching the section in view (home page)
  function initNavSpy() {
    if (document.body.dataset.page !== "home") return;
    const offers = document.getElementById("offers");
    const onScroll = () => {
      const y = window.scrollY + window.innerHeight * 0.5;
      let key = "home";
      if (offers && y >= offers.offsetTop) key = "offers";
      window.Adam && window.Adam.setActiveNav(key);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Re-run reveal when new content (e.g. language switch) is rendered
  function init() {
    initReveal();
    initScrollTop();
    initNavSpy();
    window.addEventListener("adam:lang", () => requestAnimationFrame(initReveal));
  }

  window.AdamAnimations = { init, refresh: initReveal };
})();
