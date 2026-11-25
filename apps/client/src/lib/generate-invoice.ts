import { PRINT_TYPES } from "@udo-craft/shared";
export interface InvoiceItem {
  productName: string;
  productImage?: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceCents: number;
  printCostCents?: number;
  printAreaLabel?: string;
  printUrl?: string;
  layers?: {
    type: string;
    sizeLabel?: string;
    sizeMinCm?: number;
    sizeMaxCm?: number;
    priceCents?: number;
    kind?: string;
    textContent?: string;
  }[];
}

export interface InvoiceData {
  items: InvoiceItem[];
  contact: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  createdAt?: Date;
}

const DISCOUNT_TIERS = [
  { min: 100, pct: 15 },
  { min: 50,  pct: 12 },
  { min: 10,  pct: 5  },
];

function getDiscount(qty: number): number {
  return DISCOUNT_TIERS.find((t) => qty >= t.min)?.pct ?? 0;
}

function fmt(cents: number): string {
  return `${(cents / 100).toFixed(2)} UAH`;
}

// ── Font loader ────────────────────────────────────────────────────────────
async function loadFontAsBase64(path: string): Promise<string> {
  const res = await fetch(path);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ── Image loader ───────────────────────────────────────────────────────────
async function loadImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── SVG logo → PNG via canvas ──────────────────────────────────────────────
function logoToPng(fillColor: string, width: number, height: number): Promise<string> {
  return new Promise((resolve) => {
    const svgStr = `<svg width="${width}" height="${height}" viewBox="0 0 780 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 0H87.2727V109.091H109.091V0H196.364V141.818C196.364 204.545 152.406 240 98.1818 240C43.9575 240 0 201.818 0 141.818V0Z" fill="${fillColor}"/>
      <path d="M278.182 70.9091C278.182 88.9841 263.529 103.636 245.454 103.636C227.379 103.636 212.727 88.9841 212.727 70.9091C212.727 52.8343 227.379 38.1818 245.454 38.1818C263.529 38.1818 278.182 52.8343 278.182 70.9091Z" fill="${fillColor}"/>
      <path d="M278.182 169.091C278.182 187.166 263.529 201.818 245.454 201.818C227.379 201.818 212.727 187.166 212.727 169.091C212.727 151.016 227.379 136.364 245.454 136.364C263.529 136.364 278.182 151.016 278.182 169.091Z" fill="${fillColor}"/>
      <path d="M403.636 109.091H294.545V0H402.424C479.091 0 522.424 53.7258 522.424 120C522.424 186.274 475.758 240 402.424 240H294.545V130.909H403.636V109.091Z" fill="${fillColor}"/>
      <path d="M778.786 120.244C778.786 182.841 730.861 234.244 669.695 239.756V131.154H647.878V239.756C586.717 234.244 538.788 182.841 538.788 120.244C538.788 53.9703 592.513 0.244446 658.788 0.244446C725.059 0.244446 778.786 53.9703 778.786 120.244Z" fill="${fillColor}"/>
    </svg>`;
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(""); };
    img.src = url;
  });
}

// ── Main export ────────────────────────────────────────────────────────────
/**
 * Print type names for the invoice: built-in names, overridden by the admin's list
 * (including hidden types, so older orders still show a name). Falls back to the
 * built-in names if the request fails.
 */
async function loadPrintTypeLabels(): Promise<Record<string, string>> {
  const labels: Record<string, string> = Object.fromEntries(PRINT_TYPES.map((t) => [t.id, t.label]));
  try {
    const res = await fetch("/api/print-types?all=1");
    if (res.ok) {
      const rows: { id: string; label: string }[] = await res.json();
      for (const r of rows) if (r?.id && r?.label) labels[r.id] = r.label;
    }
  } catch { /* keep built-in names */ }
  return labels;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const printTypeLabels = await loadPrintTypeLabels();

  // Load Cousine fonts (served from /public/fonts/)
  const [fontRegular, fontBold] = await Promise.all([
    loadFontAsBase64("/fonts/cousine-regular.ttf"),
    loadFontAsBase64("/fonts/cousine-bold.ttf"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // Register Cousine with jsPDF
  doc.addFileToVFS("Cousine-Regular.ttf", fontRegular);
  doc.addFont("Cousine-Regular.ttf", "Cousine", "normal");
  doc.addFileToVFS("Cousine-Bold.ttf", fontBold);
  doc.addFont("Cousine-Bold.ttf", "Cousine", "bold");

  // Use Cousine everywhere
  doc.setFont("Cousine", "normal");

  const PAGE_W   = 210;
  const PAGE_H   = 297;
  const M        = 14;          // margin
  const CW       = PAGE_W - M * 2;
  const BLUE     = [27, 24, 172]  as [number, number, number]; // #1B18AC brand
  const BLUE_PDF = [27, 59, 255]  as [number, number, number]; // accent blue
  const LGRAY    = [245, 245, 248] as [number, number, number];
  const MGRAY    = [120, 120, 130] as [number, number, number];
  const BLACK    = [18, 18, 22]   as [number, number, number];
  const WHITE    = [255, 255, 255] as [number, number, number];
  const GREEN    = [22, 163, 74]  as [number, number, number];

  let y = 0;

  // ── Header ─────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, PAGE_W, 30, "F");

  // Logo PNG (white version)
  const logoPng = await logoToPng("#ffffff", 390, 120);
  if (logoPng) doc.addImage(logoPng, "PNG", M, 5, 32.5, 10);

  // "РАХУНОК-ФАКТУРА" right
  doc.setFont("Cousine", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("РАХУНОК-ФАКТУРА", PAGE_W - M, 12, { align: "right" });

  const invoiceDate = (data.createdAt ?? new Date()).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "long", year: "numeric",
  });
  doc.setFont("Cousine", "normal");
  doc.setFontSize(8);
  doc.text(`Дата: ${invoiceDate}`, PAGE_W - M, 20, { align: "right" });

  y = 36;

  // ── Affirmation ────────────────────────────────────────────────────────
  const AFFIRMATIONS = [
    "Ваш бренд — це магніт. Люди тягнуться до того, що справжнє.",
    "Кожна деталь вашого мерчу розповідає історію, яку варто почути.",
    "Ви інвестуєте в культуру — і культура відповідає вам лояльністю.",
    "Ваша команда носитиме цей мерч з гордістю. Це вже перемога.",
    "Великі бренди починаються з маленьких, але сміливих рішень.",
    "Ви обрали якість — і ваші клієнти це відчують на дотик.",
    "Цей замовлення — крок до того, щоб вас впізнавали скрізь.",
    "Мерч, який носять — це реклама, яка ніколи не вимикається.",
    "Ваш логотип на якісній речі — це повага до тих, хто її отримає.",
    "Ви будуєте щось більше за бізнес. Ви будуєте спільноту.",
    "Кожна вишивка і кожен принт — це ваш підпис на світі.",
    "Сміливі бренди не бояться бути помітними. Ви на правильному шляху.",
    "Ваш мерч стане частиною чиїхось найкращих спогадів.",
    "Те, що ви робите сьогодні, завтра стане традицією вашої команди.",
    "Якість — це не витрата. Це інвестиція у враження, які залишаються.",
    "Ви вже виграли, бо обрали мерч, який говорить сам за себе.",
    "Ваш бренд заслуговує на речі, які хочеться носити щодня.",
    "Кожне замовлення — це довіра. Ми її цінуємо і бережемо.",
    "Успішні компанії знають: культура починається з дрібниць.",
    "Ви створюєте не просто одяг — ви створюєте відчуття приналежності.",
  ];
  const affirmation = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];

  doc.setFillColor(...BLUE_PDF);
  doc.roundedRect(M, y, CW, 14, 2, 2, "F");

  doc.setFont("Cousine", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 180);
  doc.text("ПЕРЕДБАЧЕННЯ ДНЯ", M + 4, y + 5);

  doc.setFont("Cousine", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text(`"${affirmation}"`, M + 4, y + 11, { maxWidth: CW - 8 });

  y += 20;

  // ── Client / Seller blocks ─────────────────────────────────────────────
  doc.setFillColor(...LGRAY);
  doc.roundedRect(M, y, CW, 34, 2, 2, "F");

  const half = CW / 2 - 4;

  // Client
  doc.setFont("Cousine", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLUE_PDF);
  doc.text("ЗАМОВНИК", M + 4, y + 6);

  doc.setFont("Cousine", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  const clientLines = [
    data.contact.company ? `Компанія: ${data.contact.company}` : null,
    `Контакт: ${data.contact.name}`,
    `Email: ${data.contact.email}`,
    `Телефон: ${data.contact.phone}`,
  ].filter(Boolean) as string[];
  clientLines.forEach((l, i) => doc.text(l, M + 4, y + 13 + i * 5));

  // Divider
  doc.setDrawColor(...MGRAY);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(M + half + 4, y + 4, M + half + 4, y + 31);
  doc.setLineDashPattern([], 0);

  // Seller
  const sx = M + half + 8;
  doc.setFont("Cousine", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLUE_PDF);
  doc.text("ПОСТАЧАЛЬНИК", sx, y + 6);

  doc.setFont("Cousine", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  [
    "ФОП Удовик Марина Григорівна",
    "ЄДРПОУ: ________________",
    "79000, м. Львів, вул. Джерельна, 69",
    "info@udocraft.com",
  ].forEach((l, i) => doc.text(l, sx, y + 13 + i * 5));

  y += 40;

  // ── Conditions ─────────────────────────────────────────────────────────
  doc.setFillColor(...LGRAY);
  doc.roundedRect(M, y, CW, 18, 2, 2, "F");

  doc.setFont("Cousine", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLUE_PDF);
  doc.text("УМОВИ ВИКОНАННЯ", M + 4, y + 6);

  doc.setFont("Cousine", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MGRAY);

  // icon + text pairs: emoji renders as-is in Cousine TTF
  const conds = [
    { icon: "💳", text: "Оплата: 50% передоплата, 50% після виробництва", x: M + 4 },
    { icon: "⏱", text: "Термін виробництва: 7–14 робочих днів",           x: M + CW / 2 + 4 },
  ];
  conds.forEach((c) => {
    doc.text(c.icon, c.x,      y + 13);
    doc.text(c.text, c.x + 6,  y + 13);
  });

  y += 24;

  // ── Table header ───────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(M, y, CW, 8, "F");

  doc.setFont("Cousine", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);

  // Column X positions
  const C = {
    num:   M + 3,
    img:   M + 10,
    name:  M + 24,
    param: M + 84,
    qty:   M + 116,
    price: M + 130,
    disc:  M + 148,
    total: PAGE_W - M - 2,
  };

  doc.text("#",         C.num,   y + 5.5);
  doc.text("Товар",     C.name,  y + 5.5);
  doc.text("Параметри", C.param, y + 5.5);
  doc.text("К-сть",     C.qty,   y + 5.5);
  doc.text("Ціна",      C.price, y + 5.5);
  doc.text("Знижка",    C.disc,  y + 5.5);
  doc.text("Сума",      C.total, y + 5.5, { align: "right" });

  y += 10;

  // ── Table rows ─────────────────────────────────────────────────────────
  let grandTotal = 0;
  const BASE_ROW_H = 18;

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const discPct  = getDiscount(item.quantity);
    const unitFinal = item.unitPriceCents * (1 - discPct / 100);
    const printCost = item.printCostCents ?? 0;
    const rowTotal  = (unitFinal + printCost / item.quantity) * item.quantity;
    grandTotal += rowTotal;

    const layerLines = (item.layers ?? []).map((l) => {
      const typeName = printTypeLabels[l.type] ?? l.type;
      if (l.kind === "text") return `Текст · ${typeName}${l.sizeLabel ? ` · ${l.sizeLabel}` : ""}`;
      return `${typeName}${l.sizeLabel ? ` · ${l.sizeLabel}` : ""}${l.sizeMinCm && l.sizeMaxCm ? ` (${l.sizeMinCm}–${l.sizeMaxCm}см)` : ""}${l.priceCents ? ` · ${(l.priceCents / 100).toFixed(0)}₴/шт` : ""}`;
    });
    const ROW_H = BASE_ROW_H + Math.max(0, layerLines.length - 1) * 4;

    // Row bg
    if (i % 2 === 0) {
      doc.setFillColor(...LGRAY);
      doc.rect(M, y, CW, ROW_H, "F");
    }

    // Row number
    doc.setFont("Cousine", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MGRAY);
    doc.text(`${i + 1}`, C.num + 1, y + 8);

    // Product thumbnail
    if (item.productImage) {
      const b64 = await loadImageBase64(item.productImage);
      if (b64) doc.addImage(b64, "JPEG", C.img, y + 1, 12, 12);
    }

    // Product name
    doc.setFont("Cousine", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    const nameLines = doc.splitTextToSize(item.productName, 56);
    doc.text(nameLines[0], C.name, y + 6.5);
    if (nameLines[1]) doc.text(nameLines[1], C.name, y + 11.5);

    if (item.printAreaLabel) {
      doc.setFont("Cousine", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MGRAY);
      doc.text(`Зона: ${item.printAreaLabel}`, C.name, y + 15.5);
    }

    // Params
    doc.setFont("Cousine", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MGRAY);
    doc.text(`Розмір: ${item.size}`,  C.param, y + 6.5);
    doc.text(`Колір: ${item.color}`,  C.param, y + 11.5);
    if (item.printUrl) {
      doc.setTextColor(...GREEN);
      doc.text("Принт: так", C.param, y + 15.5);
    }

    // Print layers detail
    if (layerLines.length > 0) {
      doc.setFont("Cousine", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...GREEN);
      layerLines.forEach((line, li) => {
        doc.text(`▸ ${line}`, C.name, y + 15.5 + li * 4);
      });
    }

    // Qty
    doc.setFont("Cousine", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(`${item.quantity}`, C.qty + 5, y + 8, { align: "center" });

    // Unit price
    doc.setFont("Cousine", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MGRAY);
    doc.text(fmt(item.unitPriceCents), C.price, y + 6.5);
    if (discPct > 0) {
      doc.setTextColor(...GREEN);
      doc.text(fmt(unitFinal), C.price, y + 11.5);
    }

    // Discount
    if (discPct > 0) {
      doc.setFont("Cousine", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...GREEN);
      doc.text(`-${discPct}%`, C.disc + 6, y + 8, { align: "center" });
    } else {
      doc.setTextColor(...MGRAY);
      doc.text("—", C.disc + 6, y + 8, { align: "center" });
    }

    // Row total
    doc.setFont("Cousine", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(fmt(rowTotal), C.total, y + 8, { align: "right" });

    // Row border
    doc.setDrawColor(220, 220, 225);
    doc.line(M, y + ROW_H, M + CW, y + ROW_H);

    y += ROW_H;
  }

  y += 6;

  // ── Totals ─────────────────────────────────────────────────────────────
  const TX = PAGE_W - M - 68;

  doc.setFillColor(...LGRAY);
  doc.roundedRect(TX, y, 68, 20, 2, 2, "F");

  doc.setFont("Cousine", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MGRAY);
  doc.text("Разом без ПДВ:", TX + 4, y + 7);
  doc.text("ПДВ (0%):",      TX + 4, y + 13);

  doc.setTextColor(...BLACK);
  doc.text(fmt(grandTotal), TX + 64, y + 7,  { align: "right" });
  doc.text("—",              TX + 64, y + 13, { align: "right" });

  y += 22;

  doc.setFillColor(...BLUE);
  doc.roundedRect(TX, y, 68, 12, 2, 2, "F");
  doc.setFont("Cousine", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text("ВСЬОГО:",   TX + 4,  y + 8);
  doc.text(fmt(grandTotal), TX + 64, y + 8, { align: "right" });

  y += 18;

  // ── Disclaimer ─────────────────────────────────────────────────────────
  doc.setFont("Cousine", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MGRAY);
  doc.text(
    "Цей документ є комерційною пропозицією. Остаточна вартість може змінитися після узгодження деталей з менеджером.",
    M, y, { maxWidth: CW }
  );

  // ── Footer ─────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, PAGE_H - 14, PAGE_W, 14, "F");

  // Small white logo in footer
  const footerLogo = await logoToPng("#ffffff", 195, 60);
  if (footerLogo) doc.addImage(footerLogo, "PNG", M, PAGE_H - 11, 16.25, 5);

  doc.setFont("Cousine", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(
    "udocraft.com  ·  info@udocraft.com  ·  +380 44 000 00 00",
    PAGE_W / 2, PAGE_H - 6, { align: "center" }
  );

  doc.save(`udocraft-invoice-${Date.now()}.pdf`);
  // Also open in new tab for mobile (where save may not work)
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, "_blank");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}
