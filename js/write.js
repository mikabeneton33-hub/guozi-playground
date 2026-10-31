// 田字格描寫：跟著淡色字描，覆蓋夠多、沒亂塗就算完成。
// 目前判斷「覆蓋率」，不判斷筆順（筆順資料確認標準後做第二階段）。
import { CHARS } from "./data.js";
import { voice, sfx } from "./audio.js";
import { store } from "./store.js";
import { el, icon, wait } from "./ui.js";
import { circle } from "./confetti.js";

const PASS_COVER = 0.8;    // 字的筆畫至少要描到這麼多
const MAX_STRAY = 0.3;     // 畫到字以外的筆畫不能超過這個比例
const kaiFont = () => getComputedStyle(document.documentElement).getPropertyValue("--kai").trim() || "serif";

function glyphCanvas(ch, px, dpr, dilate = 0) {
  const c = document.createElement("canvas"); c.width = c.height = Math.round(px * dpr);
  const g = c.getContext("2d"); g.scale(dpr, dpr);
  g.font = `400 ${px * 0.8}px ${kaiFont()}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = g.strokeStyle = "#000"; g.lineJoin = "round";
  const y = px / 2 + px * 0.03;
  if (dilate) { g.lineWidth = px * dilate; g.strokeText(ch, px / 2, y); }
  g.fillText(ch, px / 2, y);
  return c;
}
const alpha = c => c.getContext("2d").getImageData(0, 0, c.width, c.height).data;

export function runWrite(host, chars, { again, exit }) {
  let i = 0, done = 0;
  const total = chars.length;

  async function step() {
    const ch = chars[i];
    host.innerHTML = "";
    host.append(
      el("div", "qtop", `<span>描寫</span><span>${i + 1} / ${total}</span>`),
      el("div", "bar", `<i style="width:${(i / total) * 100}%"></i>`),
    );
    const stage = el("div", "wstage");
    const box = el("div", "tzg");
    const guide = el("canvas"), ink = el("canvas");
    box.append(guide, ink); stage.append(box); host.append(stage);
    const msg = el("div", "wmsg", `${CHARS[ch].zy}　跟著淡淡的字描一描`); msg.setAttribute("role", "status");
    const tools = el("div", "wtools");
    const clear = el("button", "btn ghost", "清除"), hear = el("button", "btn ghost", icon("volume") + "聽讀音");
    tools.append(clear, hear); host.append(msg, tools);
    host.scrollIntoView({ block: "start" });

    if (!box.clientWidth) await new Promise(r => requestAnimationFrame(r));
    const px = Math.round(box.clientWidth), dpr = Math.min(devicePixelRatio || 1, 3), N = Math.round(px * dpr);
    for (const c of [guide, ink]) { c.width = c.height = N; }
    try { await document.fonts.load(`400 ${px * 0.8}px ${kaiFont()}`, ch); } catch {}

    // 淡色底字
    const gg = guide.getContext("2d"); gg.drawImage(glyphCanvas(ch, px, dpr), 0, 0);
    gg.globalCompositeOperation = "source-in"; gg.fillStyle = "#D3CCBA"; gg.fillRect(0, 0, N, N);
    const mask = alpha(glyphCanvas(ch, px, dpr)), maskWide = alpha(glyphCanvas(ch, px, dpr, 0.11));

    const g = ink.getContext("2d"); g.scale(dpr, dpr);
    g.lineCap = g.lineJoin = "round"; g.lineWidth = px * 0.06; g.strokeStyle = "#1B2A41";
    let drawing = false, last = null, strokes = 0, finished = false;
    const pos = e => { const r = ink.getBoundingClientRect(); return [(e.clientX - r.left) * px / r.width, (e.clientY - r.top) * px / r.height]; };
    ink.onpointerdown = e => { if (finished) return; ink.setPointerCapture(e.pointerId); drawing = true; last = pos(e); g.beginPath(); g.moveTo(...last); g.lineTo(last[0] + .01, last[1]); g.stroke(); };
    ink.onpointermove = e => { if (!drawing) return; const p = pos(e); g.beginPath(); g.moveTo(...last); g.lineTo(...p); g.stroke(); last = p; };
    const up = () => { if (!drawing) return; drawing = false; strokes++; judge(); };
    ink.onpointerup = up; ink.onpointercancel = up;

    function score() {
      const u = alpha(ink); let glyph = 0, hit = 0, inkPx = 0, stray = 0;
      for (let k = 3; k < u.length; k += 4) {
        const inGlyph = mask[k] > 128, inWide = maskWide[k] > 128, inked = u[k] > 128;
        if (inGlyph) { glyph++; if (inked) hit++; }
        if (inked) { inkPx++; if (!inWide) stray++; }
      }
      return { cover: glyph ? hit / glyph : 0, stray: inkPx ? stray / inkPx : 1 };
    }
    async function judge() {
      const { cover, stray } = score();
      if (cover >= PASS_COVER && stray <= MAX_STRAY) {
        finished = true; done++;
        msg.textContent = "寫得好！"; circle(box); sfx.correct();
        store.count("write", "count"); store.event("write");
        await wait(1500);
        if (++i < total) step(); else finish();
      } else if (stray > MAX_STRAY) msg.textContent = "有些筆畫畫到格子外面了，按「清除」再描一次。";
      else msg.textContent = "還有一些地方沒描到，再描一描。";
    }
    clear.onclick = () => { g.clearRect(0, 0, px, px); strokes = 0; msg.textContent = `${CHARS[ch].zy}　跟著淡淡的字描一描`; };
    hear.onclick = () => voice.word(ch, CHARS[ch].zy);
  }

  function finish() {
    host.innerHTML = "";
    const r = el("div", "result");
    r.innerHTML = `<div class="score">${done}<small> / ${total}</small></div><p>寫好了 ${done} 個字。</p><div class="actions"></div>`;
    const b1 = el("button", "btn red", "再寫一次"); b1.onclick = again;
    const b2 = el("button", "btn ghost", "回去"); b2.onclick = exit;
    r.querySelector(".actions").append(b2, b1); host.append(r); sfx.win();
  }
  step();
}
