// 聽寫模式（給家長）：站台唸詞語，孩子寫在紙上，最後對答案、自己打勾。
import { LESSONS, CHARS, learnedThrough } from "./data.js";
import { voice, sfx, tts } from "./audio.js";
import { store } from "./store.js";
import { el, icon, shuffle, toast } from "./ui.js";
import { wordHTML } from "./ruby.js";

const cfg = { upto: 0, count: 5, slow: false };

function pool(upto) {
  const known = learnedThrough(LESSONS[upto].id), seen = new Map();
  for (const c of known) for (const [w, zy] of CHARS[c].words || []) if ([...w].every(x => known.has(x))) seen.set(w, zy);
  return [...seen].map(([w, zy]) => ({ w, zy }));
}

export function renderDictation(host) {
  host.innerHTML = "";
  host.append(el("h2", "h2", "聽寫"), el("p", "sub", "給家長用：選好範圍後，由網站唸詞語，孩子把字寫在紙上。全部唸完再一起對答案。"));
  const words = pool(cfg.upto);

  const mk = (label, items, get, set) => {
    host.append(el("div", "group-title", `<b>${label}</b>`));
    const row = el("div", "pillrow");
    items.forEach(([text, val]) => {
      const b = el("button", "pill", text); b.setAttribute("aria-pressed", String(get() === val));
      b.onclick = () => { set(val); renderDictation(host); };
      row.append(b);
    });
    host.append(row);
  };
  host.append(el("div", "group-title", "<b>範圍（含之前學過的字）</b>"));
  const sel = el("select"); LESSONS.forEach((l, k) => { const o = el("option", "", `${l.no}　${l.title}`); o.value = k; if (k === cfg.upto) o.selected = true; sel.append(o); });
  sel.onchange = () => { cfg.upto = Number(sel.value); renderDictation(host); };
  const picker = el("label", "picker", "<span>練習到</span>"); picker.append(sel); host.append(picker);
  mk("題數", [["5 個", 5], ["10 個", 10], ["全部", 999]], () => cfg.count, v => cfg.count = v);
  mk("唸的速度", [["正常", false], ["放慢", true]], () => cfg.slow, v => cfg.slow = v);

  const n = Math.min(cfg.count, words.length);
  host.append(el("p", "sub", words.length ? `這個範圍有 ${words.length} 個詞，這次考 ${n} 個。` : "這個範圍還沒有可以聽寫的詞語。"));
  const go = el("button", "btn red", "開始聽寫"); go.disabled = !words.length;
  go.onclick = () => { tts.warmup(); run(host, shuffle(words).slice(0, n)); };
  const wrap = el("div", "actions"); wrap.style.display = "flex"; wrap.append(go); host.append(wrap);
}

function run(host, items) {
  let i = 0;
  const rate = cfg.slow ? 0.75 : 1;
  const say = () => voice.word(items[i].w, items[i].zy, { rate });

  function ask() {
    host.innerHTML = "";
    const box = el("div", "dictbox");
    box.innerHTML = `<div class="count">第 ${i + 1} 個，共 ${items.length} 個</div>`;
    const sp = el("button", "speaker", icon("volume")); sp.setAttribute("aria-label", "再唸一次");
    sp.onclick = say;
    const hint = el("p", "sub", "沒聽清楚可以再按一次。寫好了就按「下一個」。");
    const next = el("button", "btn red", i + 1 < items.length ? "下一個" : "對答案");
    next.onclick = () => { sfx.tap(); if (++i < items.length) { ask(); say(); } else answers(); };
    const quit = el("button", "btn ghost", "結束"); quit.onclick = () => { voice.stop(); renderDictation(host); };
    const act = el("div", "actions"); act.style.cssText = "display:flex;gap:10px;margin-top:8px"; act.append(quit, next);
    box.append(sp, hint, act); host.append(box);
  }

  function answers() {
    voice.stop(); sfx.win();
    host.innerHTML = "";
    host.append(el("h2", "h2", "對答案"), el("p", "sub", "請孩子自己對照，寫對的打勾。"));
    const list = el("div", "answers");
    items.forEach((it, k) => {
      const row = el("label", "arow");
      row.innerHTML = `<span class="n">${k + 1}</span><span class="w">${wordHTML(it.w, it.zy)}</span><input type="checkbox" aria-label="寫對了">`;
      list.append(row);
    });
    host.append(list);
    const done = el("button", "btn red", "完成"); done.style.marginTop = "18px"; done.style.width = "100%";
    done.onclick = () => {
      const ok = list.querySelectorAll("input:checked").length;
      store.count("dictation", "count");
      renderDictation(host);
      toast(`寫對 ${ok} / ${items.length} 個`);
    };
    host.append(done);
  }
  ask(); say();
}
