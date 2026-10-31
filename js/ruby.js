// 標注音文字：`字{ㄗˋ}` → 國字上方加注音；沒有 {} 的字視為已學過，不加注音。
const RE = /([㐀-鿿豈-﫿])(?:\{([^}]*)\})?/gu;
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** 回傳 [{ c, zy }]，非國字（標點、換行）zy 為 null。 */
export function tokens(str) {
  const out = []; let last = 0;
  for (const m of str.matchAll(RE)) {
    if (m.index > last) for (const ch of str.slice(last, m.index)) out.push({ c: ch, zy: null, han: false });
    out.push({ c: m[1], zy: m[2] || null, han: true });
    last = m.index + m[0].length;
  }
  if (last < str.length) for (const ch of str.slice(last)) out.push({ c: ch, zy: null, han: false });
  return out;
}

/** 去掉標注，只留純文字（給語音、比對用）。 */
export const plain = str => tokens(str).map(t => t.c).join("");

/** 轉成 HTML。換行 → <br>。 */
export function rubyHTML(str) {
  return tokens(str).map(t => {
    if (t.c === "\n") return "<br>";
    if (t.zy) return `<ruby>${esc(t.c)}<rt>${esc(t.zy)}</rt></ruby>`;
    return esc(t.c);
  }).join("");
}

/** 「字 + 注音」成對（造詞用）：word 國字、zy 以空格分音節。 */
export function wordHTML(word, zy) {
  const syl = zy.split(/\s+/);
  const cs = [...word];
  return cs.map((c, i) => `<ruby>${esc(c)}<rt>${esc(syl[i] || "")}</rt></ruby>`).join("");
}
