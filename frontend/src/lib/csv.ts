export function encodeCsv(columns: string[], rows: unknown[][]): string {
  const cell = (value: unknown) => {
    let text = value == null ? '' : String(value);
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"','""') + '"';
  };
  return '\uFEFF' + [columns,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function downloadCsv(filename:string,columns:string[],rows:unknown[][]) {
  const url = URL.createObjectURL(new Blob([encodeCsv(columns,rows)],{type:'text/csv;charset=utf-8'}));
  const anchor = document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();URL.revokeObjectURL(url);
}
