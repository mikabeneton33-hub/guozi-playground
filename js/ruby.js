// 注音標示：照課本的樣子，注音直排在國字右側，聲調符號在最後一個符號的右邊，輕聲點在最上面。
//
// 標注音寫法：`字{ㄗˋ}`。沒有 {} 的字視為已學過，不加注音（只注生字，不留空欄）。
const RE = /([㐀-鿿豈-﫿])(?:\{([^}]*)\})?/gu;
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** 回傳 [{ c, zy, han }]，非國字（標點、換行）zy 為 null。 */
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

/** 一個音節的直排注音。cls="solo" 時單獨顯示（不跟著國字）。 */
export function zyCol(zy = "", cls = "") {
  let s = zy.trim();
  const light = s.includes("˙"); s = s.replace("˙", "");
  const tone = (s.match(/[ˊˇˋ]/) || [""])[0]; s = s.replace(/[ˊˇˋ]/g, "");
  const syms = [...s];
  const body = syms.map((c, i) => `<b>${esc(c)}${i === syms.length - 1 && tone ? `<i class="tn">${tone}</i>` : ""}</b>`).join("");
  return `<span class="zyc ${cls}" aria-hidden="true">${light ? '<i class="dot">˙</i>' : ""}${body}</span>`;
}

/** 一格字：國字＋右側注音；沒有注音的字和標點不佔注音欄。 */
const cell = (c, zy) => zy ? `<span class="zc"><span class="h">${esc(c)}</span>${zyCol(zy)}</span>` : `<span class="zc bare"><span class="h">${esc(c)}</span></span>`;

/** 標注音文字轉 HTML。換行 → <br>。整段的讀法以 aria-label 交給螢幕報讀。 */
export function rubyHTML(str) {
  const html = tokens(str).map(t => t.c === "\n" ? "<br>" : cell(t.c, t.zy)).join("");
  return `<span class="zt" aria-label="${esc(plain(str).replace(/\n/g, ""))}">${html}</span>`;
}

/** 詞語：每個字都標注音。zy 以空格分音節。 */
export function wordHTML(word, zy) {
  const syl = zy.trim().split(/\s+/);
  return `<span class="zt" aria-label="${esc(word)}">${[...word].map((c, i) => cell(c, syl[i])).join("")}</span>`;
}
