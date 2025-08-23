export function toCSV(rows: any[], delim=",", header=true) { 
  if (!rows.length) return ""; 
  const cols = Object.keys(rows[0]); 
  const esc = (v:any) => { 
    if (v==null) return ""; 
    const s = String(v); 
    return s.includes(delim) || s.includes('"') || s.includes("\n") ? 
`"${s.replace(/"/g,'""')}"` : s; 
  }; 
  const head = header ? cols.join(delim) + "\n" : ""; 
  const body = rows.map(r => 
cols.map(c=>esc(r[c])).join(delim)).join("\n"); 
  return head + body + "\n"; 
} 
