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
      subtotal: "قيمة الطلب",
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
      subtotal: "סכום ההזמנה",
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
    meta.append(
      metaRow(t.invoice, invoice.number || ""),
      metaRow(t.date, Number.isNaN(date.getTime()) ? "" : date.toLocaleString(lang === "he" ? "he-IL" : "ar", { dateStyle: "short", timeStyle: "short" })),
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
    totals.append(row(t.subtotal, money(invoice.subtotal)));
    if (Number(invoice.discount) > 0) totals.append(row(t.discount, "-" + money(invoice.discount)));
    if (invoice.orderType === "delivery") totals.append(row(t.deliveryFee, money(invoice.delivery)));
    totals.append(
      row(t.beforeTax, money(invoice.beforeTax)),
      row(t.tax, money(invoice.tax)),
      row(t.total, money(invoice.total), "grand")
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
    const hash = location.hash.startsWith("#invoice=") ? location.hash.slice(9) : "";
    if (hash) {
      try {
        const normalized = hash.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        const invoice = JSON.parse(new TextDecoder().decode(bytes));
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
