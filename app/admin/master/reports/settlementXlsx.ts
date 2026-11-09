type XLSXApi = {
  read(data: ArrayBuffer, options: object): { SheetNames: string[]; Sheets: Record<string, Record<string, { v?: unknown; f?: string }>> };
  writeFile(workbook: unknown, filename: string): void;
  utils: {
    decode_range(ref: string): { s: { c: number }; e: { c: number; r: number } };
    encode_col(index: number): string;
    book_new(): unknown;
    book_append_sheet(workbook: unknown, sheet: unknown, name: string): void;
    aoa_to_sheet(data: unknown[][]): Record<string, unknown>;
  };
};
declare global { interface Window { XLSX?: XLSXApi } }

export async function loadXlsx() {
  if (window.XLSX) return window.XLSX;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.integrity = 'sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM+kK6VEJq/rLcJq88PQJ0VYNSm8O2VYdOXsKjHDQw==';
    script.crossOrigin = 'anonymous'; script.onload = () => resolve(); script.onerror = () => reject(new Error('xlsx'));
    document.head.appendChild(script);
  });
  if (!window.XLSX) throw new Error('xlsx');
  return window.XLSX;
}
