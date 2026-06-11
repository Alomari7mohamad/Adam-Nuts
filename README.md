# محمص آدم · Adam Roastery — Premium QR Menu

A luxury, mobile-first **QR menu & ordering web app** for *Adam Roastery* (محمص آدم / פיצוחי אדם).
Built with **plain HTML5, CSS3 and vanilla JavaScript** — no backend, no frameworks, no build step.
Orders are placed through **WhatsApp**.

---

## ✨ Features

- **Bilingual** — Arabic (default) & Hebrew, full **RTL**, instant switching, remembered in `localStorage`.
- **Luxury theme** — espresso brown · brushed gold · cream, per-language premium fonts, app-shell layout.
- **Catalog** — 100+ real products across 9 categories, parsed from the store's own photos.
- **Two pricing models**
  - `unit: "kg"` → weight selector **100g–1000g**, price scales from a per-kg base.
  - `unit: "piece"` → fixed unit price (machines, capsules, packaged sweets).
- **Live search** with instant filtering, **category slider**, best-sellers, weekly offers.
- **Subcategories** — large sections show secondary chips (Nuts → Tree Nuts / Seeds / Legumes, Spices → Ground / Whole / Blends, Dates → Medjool / Soft / Stuffed). Chips appear only when ≥2 subgroups have products, so the data structure stays ready for future items without showing empty filters.
- **Product descriptions** — every product has a bilingual description shown on the card and in full inside a **quick-view** panel (tap a product image or name).
- **Menu QR code** — a real, scannable QR (`assets/images/qr-menu.svg`) generated from `STORE.menuUrl`, shown in a shareable "Share menu" panel (open menu / share via WhatsApp).
- **Cart** (add / remove / edit qty & weight / totals) persisted in `localStorage`.
- **Checkout** → name, order type (pickup / delivery), location & notes, with **automatic delivery fees**:
  - Muqeible (مقيبلة) / Sandala (صندلة) → **₪10**
  - Any other location → **₪30**
  - Pickup → **₪0**
- **WhatsApp order** — generates a clean, professional message and opens `wa.me/972523305309`.
- **Floating action buttons** — scroll-to-top, accessibility panel, store location, WhatsApp.
- **Accessibility** — font scaling, high-contrast, grayscale, reset (persisted).
- **Animations** — loading screen, scroll reveal, staggered cards, micro-interactions (respects `prefers-reduced-motion`).
- **Security** — strict CSP, all dynamic data via `textContent` / escaping (no unsafe `innerHTML` of user data), `rel="noopener noreferrer"` on external links, input validation & length limits.

---

## 📁 Structure

```
/
├── index.html          Homepage (hero, search, categories, best-sellers, offers, catalog)
├── menu.html           Full catalog (category filter + search, supports ?cat=<id>)
├── privacy.html        Privacy Policy (AR + HE)
├── terms.html          Terms of Service (AR + HE)
├── assets/
│   ├── images/         Product photos organised by category + SVG logo
│   ├── icons/
│   └── fonts/
├── css/
│   ├── style.css       Theme, components, layout (mobile-first)
│   ├── responsive.css  Breakpoints + accessibility theme overrides
│   └── animations.css  Keyframes & reveal classes
├── js/
│   ├── data.js         Store config, categories, products, delivery rules
│   ├── translations.js AR/HE UI dictionary + i18n helper
│   ├── products.js     Catalog rendering, search, favourites, weight selector
│   ├── cart.js         Cart state, persistence, drawer, floating summary
│   ├── checkout.js     Order form, delivery fee, validation, WhatsApp message
│   ├── accessibility.js Font / contrast / grayscale controls
│   ├── animations.js   Scroll reveal, scroll-to-top, nav spy
│   └── main.js         Shared utils, icons, chrome injection, boot
└── README.md
```

The shared **chrome** (header, bottom nav, drawers, FABs, footer, loader) is injected once by `main.js`,
so every page stays consistent — pages only contain their unique content inside `<div id="app" class="app-shell">`.

---

## ▶️ Run it

It's a **pure static website** — no build, no npm, no Node.

- **Open directly:** double-click `index.html` (runs from `file://`).
- **Deploy to GitHub Pages:** push the folder to a repo and enable Pages — it works as-is, with **no `npm install`** and **no `npm run build`**.

> A static server (e.g. the VS Code "Live Server" extension) is optional and only gives nicer URLs; it is never required.

---

## 🛠️ Editing products & prices

Everything lives in **`js/data.js`**:

```js
{ id: "nuts-7", cat: "nuts", unit: "kg", price: 80,
  img: "assets/images/nuts/nuts-7.jpeg",
  name: { ar: "جوز فاخر", he: "אגוזי מלך משובחים" },
  bestseller: true, offer: 10 }
```

- `price` = price **per kilogram** for `unit:"kg"`, or the **unit price** for `unit:"piece"`.
- `bestseller: true` → shows in the best-sellers rail.
- `offer: <percent>` → shows a discount badge and a struck-through price, and lists the item under Offers.

To change the WhatsApp number, store location, or developer link, edit the `STORE` object at the top of `data.js`.

### Subcategories

Add `subs: [ {id,name:{ar,he}}, ... ]` to a category and tag products with a matching `sub: "<id>"`.
The chip bar shows automatically once **two or more** of that category's subgroups contain products.

### Menu QR code

The QR is a plain static image at `assets/images/qr-menu.svg`, currently encoding `STORE.menuUrl`
(`https://adam-roastery.netlify.app`). To point it at a different URL after deploying, regenerate the
image with any free online QR generator (e.g. search "QR code generator"), paste your live URL, download
as **SVG** (or PNG), and replace `assets/images/qr-menu.svg`. No tooling or build step is involved.

Also update `STORE.menuUrl` in `js/data.js` so the "Open menu" / "Share menu" links match.

---

## 📞 Business

- **WhatsApp orders:** 052-330-5309
- **Location:** https://share.google/GE8DXfe1LgktsaNbT

---

Developed by **[O&H Tech](https://oh-tech.co)**.
