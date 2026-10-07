import "server-only";
export function csvCell(value:unknown){const s=String(value??"");const safe=/^[\s]*[=+@\-\t\r]/.test(s)?`'${s}`:s;return `"${safe.replaceAll('"','""')}"`;}
export function csv(rows:unknown[][]){return "\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n")+"\r\n";}
