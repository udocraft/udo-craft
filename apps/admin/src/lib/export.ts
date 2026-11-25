// Client-side export of table rows to CSV and PDF.

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function stamp() {
  return new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV with a UTF-8 BOM so Excel opens Cyrillic correctly. Cells starting with =,+,-,@ are prefixed to block formula injection. */
export function exportCsv<T>(name: string, columns: ExportColumn<T>[], rows: T[]) {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => cell(c.header)).join(","), ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(","))];
  save(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${name}_${stamp()}.csv`);
}

async function fontBase64(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Font ${path}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Landscape A4 table PDF with a Cyrillic font; long cells are wrapped, pages break automatically. */
export async function exportPdf<T>(name: string, title: string, columns: ExportColumn<T>[], rows: T[]) {
  const { jsPDF } = await import("jspdf");
  const [regular, bold] = await Promise.all([fontBase64("/fonts/cousine-regular.ttf"), fontBase64("/fonts/cousine-bold.ttf")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.addFileToVFS("Cousine-Regular.ttf", regular);
  doc.addFont("Cousine-Regular.ttf", "Cousine", "normal");
  doc.addFileToVFS("Cousine-Bold.ttf", bold);
  doc.addFont("Cousine-Bold.ttf", "Cousine", "bold");

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const colW = (pageW - margin * 2) / columns.length;
  const lineH = 4;
  let y = margin;

  doc.setFont("Cousine", "bold");
  doc.setFontSize(13);
  doc.text(title, margin, y + 4);
  doc.setFont("Cousine", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(`${rows.length} записів · ${new Date().toLocaleString("uk-UA")}`, margin, y + 9);
  doc.setTextColor(0);
  y += 16;

  const drawHeader = () => {
    doc.setFont("Cousine", "bold");
    doc.setFontSize(8);
    columns.forEach((c, i) => doc.text(doc.splitTextToSize(c.header, colW - 2)[0], margin + i * colW, y));
    y += 2;
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
    doc.setFont("Cousine", "normal");
  };
  drawHeader();

  for (const row of rows) {
    const cells = columns.map((c) => doc.splitTextToSize(String(c.value(row) ?? ""), colW - 2) as string[]);
    const h = Math.max(1, ...cells.map((l) => l.length)) * lineH + 2;
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin + 4;
      drawHeader();
    }
    cells.forEach((lines, i) => doc.text(lines, margin + i * colW, y));
    y += h;
    doc.setDrawColor(235);
    doc.line(margin, y - 3, pageW - margin, y - 3);
  }

  doc.save(`${name}_${stamp()}.pdf`);
}
