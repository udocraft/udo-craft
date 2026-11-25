import { jsPDF } from "jspdf";

export interface InvoiceItem {
  productName: string;
  productImage?: string;
  size: string;
  color: string;
  quantity: number;
  /** Final price per unit, discount and print included. */
  unitPriceCents: number;
  /** Price per unit before the volume discount, for the "було" line. */
  listPriceCents?: number;
  printAreaLabel?: string;
  printUrl?: string;
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

function fmt(cents: number): string {
  return `${(cents / 100).toFixed(2)} UAH`;
}

async function loadFontAsBase64(path: string): Promise<string> {
  const res = await fetch(path);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

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
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("");
    };
    img.src = url;
  });
}

export async function generateInvoicePDF(data: InvoiceData): Promise<void> {
  const [fontRegular, fontBold] = await Promise.all([
    loadFontAsBase64("/fonts/cousine-regular.ttf"),
    loadFontAsBase64("/fonts/cousine-bold.ttf"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  doc.addFileToVFS("Cousine-Regular.ttf", fontRegular);
  doc.addFont("Cousine-Regular.ttf", "Cousine", "normal");
  doc.addFileToVFS("Cousine-Bold.ttf", fontBold);
  doc.addFont("Cousine-Bold.ttf", "Cousine", "bold");
  doc.setFont("Cousine", "normal");

  const PAGE_W = 210;
  const PAGE_H = 297;
  const M = 14;
  const CW = PAGE_W - M * 2;
  const BLUE = [27, 24, 172] as [number, number, number];
  const BLUE_PDF = [27, 59, 255] as [number, number, number];
  const LGRAY = [245, 245, 248] as [number, number, number];
  const MGRAY = [120, 120, 130] as [number, number, number];
  const BLACK = [18, 18, 22] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];
  const GREEN = [22, 163, 74] as [number, number, number];

  let y = 0;

  doc.setFillColor(...BLUE);
  doc.rect(0, 0, PAGE_W, 30, "F");

  const logoPng = await logoToPng("#ffffff", 390, 120);
  if (logoPng) doc.addImage(logoPng, "PNG", M, 5, 32.5, 10);

  doc.setFont("Cousine", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("РАХУНОК-ФАКТУРА", PAGE_W - M, 12, { align: "right" });

  const invoiceDate = (data.createdAt ?? new Date()).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.setFont("Cousine", "normal");
  doc.setFontSize(8);
  doc.text(`Дата: ${invoiceDate}`, PAGE_W - M, 20, { align: "right" });

  y = 36;

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

  doc.setFillColor(...LGRAY);
  doc.roundedRect(M, y, CW, 34, 2, 2, "F");

  const half = CW / 2 - 4;

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
  clientLines.forEach((line, index) => doc.text(line, M + 4, y + 13 + index * 5));

  doc.setDrawColor(...MGRAY);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(M + half + 4, y + 4, M + half + 4, y + 31);
  doc.setLineDashPattern([], 0);

  const sx = M + half + 8;
  doc.setFont("Cousine", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLUE_PDF);
  doc.text("ВИКОНАВЕЦЬ", sx, y + 6);
  doc.setFont("Cousine", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  [
    "ФОП Рибак Назарій",
    "ЄДРПОУ: 1234567890",
    "IBAN: UA123456789012345678901234567",
    "Телефон: +380 67 000 00 00",
  ].forEach((line, index) => doc.text(line, sx, y + 13 + index * 5));

  y += 42;

  doc.setFont("Cousine", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("ПОЗИЦІЇ ЗАМОВЛЕННЯ", M, y);
  y += 4;

  const colX = {
    item: M,
    details: M + 16,
    qty: PAGE_W - M - 55,
    price: PAGE_W - M - 30,
    sum: PAGE_W - M,
  };

  doc.setFillColor(...LGRAY);
  doc.roundedRect(M, y, CW, 8, 1.5, 1.5, "F");
  doc.setFont("Cousine", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MGRAY);
  doc.text("№", colX.item + 2, y + 5.3);
  doc.text("ОПИС", colX.details, y + 5.3);
  doc.text("К-СТЬ", colX.qty, y + 5.3, { align: "right" });
  doc.text("ЦІНА", colX.price, y + 5.3, { align: "right" });
  doc.text("СУМА", colX.sum, y + 5.3, { align: "right" });
  y += 10;

  let grand = 0;

  for (let i = 0; i < data.items.length; i++) {
    const it = data.items[i];
    // unitPriceCents is the final per-unit price (volume discount and print already
    // applied by the order builder); discounting it again here double-counted.
    const unitAfter = Math.round(it.unitPriceCents);
    const listPrice = it.listPriceCents && it.listPriceCents > unitAfter ? Math.round(it.listPriceCents) : null;
    const discPct = listPrice ? Math.round((1 - unitAfter / listPrice) * 100) : 0;
    const lineSum = unitAfter * it.quantity;
    grand += lineSum;

    const rowTop = y;
    const rowH = 26;

    doc.setDrawColor(230, 230, 235);
    doc.roundedRect(M, rowTop, CW, rowH, 2, 2, "S");

    doc.setFont("Cousine", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(String(i + 1).padStart(2, "0"), colX.item + 2, rowTop + 6);

    const imgX = colX.details;
    const imgY = rowTop + 3;
    const imgW = 18;
    const imgH = 18;
    if (it.printUrl || it.productImage) {
      const img = await loadImageBase64(it.printUrl || it.productImage || "");
      if (img) {
        doc.addImage(img, "PNG", imgX, imgY, imgW, imgH);
      } else {
        doc.setDrawColor(220, 220, 225);
        doc.rect(imgX, imgY, imgW, imgH);
      }
    }

    const tx = imgX + 22;
    doc.setFont("Cousine", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    const nameLines = doc.splitTextToSize(it.productName, 68);
    doc.text(nameLines.slice(0, 2), tx, rowTop + 6);

    doc.setFont("Cousine", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...MGRAY);
    const meta = [`Розмір: ${it.size}`, `Колір: ${it.color}`];
    if (it.printAreaLabel) meta.push(`Зона: ${it.printAreaLabel}`);
    doc.text(meta.join("   ·   "), tx, rowTop + 13);

    if (discPct > 0) {
      doc.setTextColor(...GREEN);
      doc.text(`Знижка: −${discPct}%`, tx, rowTop + 18.5);
    }

    doc.setFont("Cousine", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(String(it.quantity), colX.qty, rowTop + 10, { align: "right" });
    doc.text(fmt(unitAfter), colX.price, rowTop + 10, { align: "right" });
    doc.text(fmt(lineSum), colX.sum, rowTop + 10, { align: "right" });

    if (discPct > 0) {
      doc.setFont("Cousine", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...MGRAY);
      doc.text(`було ${fmt(listPrice ?? unitAfter)}`, colX.price, rowTop + 15, { align: "right" });
    }

    y += rowH + 4;
    if (y > PAGE_H - 35 && i < data.items.length - 1) {
      doc.addPage();
      y = 20;
    }
  }

  doc.setFillColor(...BLUE_PDF);
  doc.roundedRect(PAGE_W - M - 70, y, 70, 18, 2, 2, "F");
  doc.setFont("Cousine", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text("ЗАГАЛЬНА СУМА", PAGE_W - M - 35, y + 6, { align: "center" });
  doc.setFont("Cousine", "bold");
  doc.setFontSize(14);
  doc.text(fmt(grand), PAGE_W - M - 35, y + 13, { align: "center" });

  doc.setFont("Cousine", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MGRAY);
  doc.text("Фінальна ціна може бути скоригована після перевірки макетів менеджером.", M, PAGE_H - 14);

  const fileName = `invoice-${(data.createdAt ?? new Date()).toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
