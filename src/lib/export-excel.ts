/** สร้างไฟล์ Excel (.xls SpreadsheetML) ที่เปิดด้วย Excel / Google Sheets ได้ */

type CellValue = string | number | boolean | null | undefined;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellXml(value: CellValue): string {
  if (value == null || value === "") {
    return `<Cell><Data ss:Type="String"></Data></Cell>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  if (typeof value === "boolean") {
    return `<Cell><Data ss:Type="Boolean">${value ? 1 : 0}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

export interface ExcelSheet {
  name: string;
  rows: CellValue[][];
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*\[\]:]/g, " ").trim() || "Sheet";
  return cleaned.slice(0, 31);
}

/** สร้าง XML workbook แล้วดาวน์โหลดเป็น .xls */
export function downloadExcel(sheets: ExcelSheet[], filename: string) {
  const worksheets = sheets
    .filter((s) => s.rows.length > 0)
    .map((sheet) => {
      const name = sanitizeSheetName(sheet.name);
      const rowsXml = sheet.rows
        .map((row) => `<Row>${row.map(cellXml).join("")}</Row>`)
        .join("");
      return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${rowsXml}</Table></Worksheet>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${worksheets}
</Workbook>`;

  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
