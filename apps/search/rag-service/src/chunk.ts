
/** Chunking por oraciones con solape */
export function chunkText(text: string, opts?: { maxChars?: number; overlap?: number }) {
  const maxChars = opts?.maxChars ?? 800;
  const overlap = opts?.overlap ?? 200;
  const sentences = splitSentences(text);
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).trim().length > maxChars) {
      if (cur.trim()) chunks.push(cur.trim());
      // iniciar nuevo con solape
      const tail = cur.slice(Math.max(0, cur.length - overlap));
      cur = (tail + " " + s).trim();
    } else {
      cur = (cur + " " + s).trim();
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

function splitSentences(t: string) {
  return t.split(/(?<=[\.\!\?…])\s+/);
}


