(function () {
  "use strict";

  const KEY = "adam_last_invoice";
  const receipt = document.getElementById("invoiceReceipt");
  const printButton = document.getElementById("printInvoice");
  const backLink = document.getElementById("backToStore");

  const TEXT = {
    ar: {
      title: "فاتورة محمص آدم",
      store: "محمص آدم",
      invoice: "رقم الفاتورة",
      date: "التاريخ",
      time: "الوقت",
      customer: "اسم الزبون",
      orderType: "نوع الطلب",
      pickup: "استلام من المحل",
      delivery: "توصيل",
      location: "موقع التوصيل",
      area: "المنطقة",
      products: "تفاصيل المنتجات",
      product: "المنتج",
      qty: "الكمية",
      price: "السعر",
      weight: "الوزن",
      piece: "قطعة",
      notes: "ملاحظات",
      subtotal: "قيمة الطلب بدون الضريبة",
      discount: "الخصم",
      deliveryFee: "التوصيل",
      beforeTax: "المبلغ قبل الضريبة",
      tax: "الضريبة 18%",
      total: "السعر النهائي شامل الضريبة",
      thanks: "شكراً لشرائكم من محمص آدم",
      empty: "لا توجد فاتورة محفوظة للطباعة",
      print: "طباعة الفاتورة",
      back: "العودة إلى المتجر"
    },
    he: {
      title: "חשבונית פיצוחי אדם",
      store: "פיצוחי אדם",
      invoice: "מספר חשבונית",
      date: "תאריך",
      time: "שעה",
      customer: "שם הלקוח",
      orderType: "סוג הזמנה",
      pickup: "איסוף מהחנות",
      delivery: "משלוח",
      location: "כתובת למשלוח",
      area: "אזור",
      products: "פרטי המוצרים",
      product: "מוצר",
      qty: "כמות",
      price: "מחיר",
      weight: "משקל",
      piece: "יחידה",
      notes: "הערות",
      subtotal: "סכום ההזמנה ללא מע״מ",
      discount: "הנחה",
      deliveryFee: "משלוח",
      beforeTax: "סכום לפני מע״מ",
      tax: "מע״מ 18%",
      total: "סה״כ כולל מע״מ",
      thanks: "תודה שקניתם מפיצוחי אדם",
      empty: "אין חשבונית שמורה להדפסה",
      print: "הדפסת חשבונית",
      back: "חזרה לחנות"
    }
  };

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    const rounded = Math.round(number * 100) / 100;
    return rounded.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";
  }

  function weightText(item, lang) {
    if (item.fixedWeight) return item.fixedWeight;
    if (item.unit !== "kg") return TEXT[lang].piece;
    return Number(item.weight) >= 1000
      ? (lang === "he" ? '1 ק"ג' : "1 كيلو")
      : Number(item.weight) + (lang === "he" ? " גרם" : " غرام");
  }

  function componentText(component, lang) {
    if (component.weight != null && Number.isFinite(Number(component.weight))) {
      const weight = Number(component.weight) >= 1000
        ? (lang === "he" ? '1 ק"ג' : "1 كيلو")
        : Number(component.weight) + (lang === "he" ? " גרם" : " غرام");
      return component.name + ": " + weight;
    }
    if (component.qty != null && Number.isFinite(Number(component.qty))) return component.name + " × " + component.qty;
    return component.name;
  }

  function row(label, value, className) {
    const element = node("div", "total-row" + (className ? " " + className : ""));
    element.append(node("span", "", label), node("strong", "", value));
    return element;
  }

  function metaRow(label, value) {
    const element = node("div", "meta-row");
    element.append(node("span", "", label), node("span", "", value));
    return element;
  }

  function expandCompact(data) {
    if (!data || data.v !== 3 || !Array.isArray(data.i)) return data;
    const lang = data.l === "he" ? "he" : "ar";
    const products = window.AdamData?.PRODUCTS || [];
    const findProduct = id => products.find(product => product.id === id);
    const localName = value => value ? (value[lang] || value.ar || value.he || "") : "";
    const createdAt = new Date(Number(data.d) || Date.now());
    return {
      version: 3,
      lang,
      number: String(createdAt.getTime()).slice(-8),
      createdAt: createdAt.toISOString(),
      customer: String(data.c || ""),
      orderType: data.o ? "delivery" : "pickup",
      location: String(data.a || ""),
      deliveryArea: String(data.g || ""),
      notes: String(data.x || ""),
      discount: Number(data.k) || 0,
      delivery: Number(data.f) || 0,
      total: Number(data.t) || 0,
      items: data.i.map(raw => {
        const product = findProduct(raw[0]);
        const components = Array.isArray(raw[5]) ? raw[5].map(component => {
          const componentProduct = findProduct(component[0]);
          return {
            name: localName(componentProduct?.name),
            weight: component[1] === "" ? null : Number(component[1]),
            qty: component[2] === "" ? null : Number(component[2])
          };
        }) : [];
        return {
          id: raw[0],
          name: localName(product?.name),
          unit: product?.unit || "piece",
          fixedWeight: localName(product?.fixedWeight),
          weight: Number(raw[1]) || 1000,
          qty: Number(raw[2]) || 1,
          notes: components.length ? "" : String(raw[3] || ""),
          userNotes: components.length ? String(raw[3] || "") : "",
          line: Number(raw[4]) || 0,
          components
        };
      })
    };
  }

  function render(invoice) {
    const lang = invoice.lang === "he" ? "he" : "ar";
    const t = TEXT[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = "rtl";
    document.title = t.title;
    printButton.textContent = t.print;
    backLink.textContent = t.back;
    receipt.textContent = "";

    const header = node("header", "receipt-header");
    const logo = node("img", "receipt-logo");
    logo.src = "assets/images/logo/logo.svg.png";
    logo.alt = t.store;
    header.append(
      logo,
      node("h1", "store-name", t.store),
      node("p", "store-phone", "052-330-5309")
    );

    const meta = node("section", "meta");
    const date = new Date(invoice.createdAt);
    const locale = lang === "he" ? "he-IL" : "ar";
    const validDate = !Number.isNaN(date.getTime());
    const dateText = validDate
      ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(date)
      : "";
    const timeText = validDate
      ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(date)
      : "";
    meta.append(
      metaRow(t.invoice, invoice.number || ""),
      metaRow(t.date, dateText),
      metaRow(t.time, timeText),
      metaRow(t.customer, invoice.customer || ""),
      metaRow(t.orderType, invoice.orderType === "delivery" ? t.delivery : t.pickup)
    );
    if (invoice.orderType === "delivery" && invoice.location) meta.append(metaRow(t.location, invoice.location));
    if (invoice.orderType === "delivery" && invoice.deliveryArea) {
      const areas = {
        sandala: lang === "he" ? "סנדלה" : "صندلة",
        muqeible: lang === "he" ? "מוקייבלה" : "مقيبلة"
      };
      meta.append(metaRow(t.area, areas[invoice.deliveryArea] || invoice.deliveryArea));
    }

    const itemsSection = node("section", "items-section");
    itemsSection.append(node("h2", "items-title", t.products));
    const itemsHead = node("div", "items-head");
    itemsHead.append(node("span", "", t.product), node("span", "", t.qty), node("span", "", t.price));
    itemsSection.append(itemsHead);

    (invoice.items || []).forEach(item => {
      const wrapper = node("article", "invoice-item");
      const main = node("div", "item-main");
      main.append(
        node("span", "item-name", item.name || ""),
        node("span", "item-qty", String(item.qty || 1)),
        node("span", "item-price", money(item.line))
      );
      wrapper.append(main, node("div", "item-detail", t.weight + ": " + weightText(item, lang)));
      (item.components || []).forEach(component => {
        wrapper.append(node("div", "item-component", componentText(component, lang)));
      });
      const note = item.userNotes || (!item.components?.length ? item.notes : "");
      if (note) wrapper.append(node("div", "item-note", t.notes + ": " + note));
      itemsSection.append(wrapper);
    });

    const totals = node("section", "totals");
    const grossTotal = Number(invoice.version) >= 2
      ? Number(invoice.total)
      : Number(invoice.beforeTax || invoice.total || 0);
    const beforeTax = Math.round((grossTotal / 1.18) * 100) / 100;
    const tax = Math.round((grossTotal - beforeTax) * 100) / 100;
    if (Number(invoice.discount) > 0) totals.append(row(t.discount, "-" + money(invoice.discount)));
    if (invoice.orderType === "delivery") totals.append(row(t.deliveryFee, money(invoice.delivery)));
    totals.append(
      row(t.subtotal, money(beforeTax)),
      row(t.tax, money(tax)),
      row(t.total, money(grossTotal), "grand")
    );

    const receiptParts = [
      header,
      node("hr", "rule"),
      meta,
      node("hr", "rule"),
      itemsSection,
      node("hr", "rule"),
      totals,
      node("p", "receipt-footer", t.thanks)
    ];
    if (invoice.notes) receiptParts.splice(receiptParts.length - 1, 0, node("div", "item-note", t.notes + ": " + invoice.notes));
    receipt.append(...receiptParts);
  }

  function load() {
    const hash = location.hash.startsWith("#i=")
      ? location.hash.slice(3)
      : (location.hash.startsWith("#invoice=") ? location.hash.slice(9) : "");
    if (hash) {
      try {
        const normalized = hash.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        const invoice = expandCompact(JSON.parse(new TextDecoder().decode(bytes)));
        if (invoice && Array.isArray(invoice.items) && invoice.items.length) {
          try { localStorage.setItem(KEY, JSON.stringify(invoice)); } catch (_) {}
          return invoice;
        }
      } catch (_) {}
    }
    try {
      const invoice = JSON.parse(localStorage.getItem(KEY));
      if (!invoice || !Array.isArray(invoice.items) || !invoice.items.length) return null;
      return invoice;
    } catch (_) {
      return null;
    }
  }

  const invoice = load();
  if (invoice) {
    render(invoice);
  } else {
    receipt.append(node("div", "invoice-empty", TEXT.ar.empty));
  }

  printButton.addEventListener("click", function () {
    window.print();
  });
})();
