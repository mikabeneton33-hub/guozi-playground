// 共用的小工具：DOM、圖示、田字格。
export const $ = (s, r = document) => r.querySelector(s);
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const wait = ms => new Promise(r => setTimeout(r, ms));

// 插圖：OpenMoji（CC BY-SA 4.0）。檔名 = 去掉 FE0F 的 codepoint。
const emojiHex = e => [...e].map(c => c.codePointAt(0)).filter(cp => cp !== 0xFE0F).map(cp => cp.toString(16).toUpperCase()).join("-");
export const pic = (emoji, cls = "") => `<img class="pic ${cls}" src="img/openmoji/${emojiHex(emoji)}.svg" alt="" draggable="false">`;

const P = {
  grid: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M12 4v16M4 12h16" stroke-dasharray="2 2.4"/>',
  book: '<path d="M12 6.5C10.4 5.3 8 4.8 4 5v13c4-.2 6.4.3 8 1.5 1.6-1.2 4-1.7 8-1.5V5c-4-.2-6.4.3-8 1.5zM12 6.5v13"/>',
  game: '<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 11v4M6 13h4"/><circle cx="16" cy="12" r=".7"/><circle cx="18" cy="14.2" r=".7"/>',
  headphone: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  me: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
  volume: '<path d="M4 10v4h4l5 4V6L8 10zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 10v4h4l5 4V6L8 10zM17 9.5l4 5M21 9.5l-4 5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', left: '<path d="M14 6l-6 6 6 6"/>', right: '<path d="M10 6l6 6-6 6"/>',
  pen: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19zM14 7l3 3"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  text: '<path d="M5 5h14M5 10h14M5 15h9M5 20h6"/>',
};
export const icon = name => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ""}</svg>`;

/** 田字格（字用楷體）。 */
export const tzg = (ch, cls = "") => `<div class="tzg ${cls}"><span class="ch">${ch}</span></div>`;

let toastT;
export function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2000);
}
