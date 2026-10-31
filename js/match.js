// 字音配對：翻兩張牌，國字和它的注音配成一對。
import { CHARS } from "./data.js";
import { voice, sfx } from "./audio.js";
import { store } from "./store.js";
import { el, shuffle, wait } from "./ui.js";
import { zyCol } from "./ruby.js";
import { stamp } from "./confetti.js";

export function runMatch(host, pool, { again, exit }) {
  // 讀音重複的字不能同場出現，否則同一個注音會對到兩個字
  const picked = [], used = new Set();
  for (const c of shuffle(pool)) { if (picked.length >= 6) break; if (!used.has(CHARS[c].zy)) { picked.push(c); used.add(CHARS[c].zy); } }
  const pairs = picked.length;
  const cards = shuffle(picked.flatMap(c => [{ c, side: "char" }, { c, side: "zy" }]));
  let open = [], found = 0, moves = 0, lock = false;

  host.innerHTML = "";
  const top = el("div", "qtop", `<span>字音配對</span><span class="mv">翻了 0 次</span>`);
  const grid = el("div", "mgrid"); grid.style.setProperty("--cols", pairs > 4 ? 4 : 3);
  host.append(top, el("p", "sub", "把國字和它的注音配成一對。"), grid);

  cards.forEach((card, k) => {
    const face = card.side === "char" ? `<span class="mch">${card.c}</span>` : zyCol(CHARS[card.c].zy, "solo");
    const b = el("button", "mcard", `<span class="mback" aria-hidden="true"></span><span class="mface">${face}</span>`);
    b.setAttribute("aria-label", `第 ${k + 1} 張牌`);
    b.onclick = () => flip(b, card);
    grid.append(b);
  });

  async function flip(b, card) {
    if (lock || b.classList.contains("up")) return;
    b.classList.add("up"); sfx.tap();
    b.setAttribute("aria-label", card.side === "char" ? card.c : CHARS[card.c].zy);
    if (card.side === "char") voice.word(card.c, CHARS[card.c].zy);
    open.push({ b, card });
    if (open.length < 2) return;
    moves++; top.querySelector(".mv").textContent = `翻了 ${moves} 次`;
    const [a, z] = open; open = [];
    if (a.card.c === z.card.c) {
      a.b.classList.add("done"); z.b.classList.add("done"); sfx.correct();
      voice.word(a.card.c, CHARS[a.card.c].zy);
      if (++found === pairs) finish();
    } else {
      lock = true; await wait(900);
      for (const x of [a, z]) { x.b.classList.remove("up"); x.b.setAttribute("aria-label", "蓋著的牌"); }
      lock = false;
    }
  }

  async function finish() {
    store.count("match", "games"); store.matchBest(moves); store.event("match");
    await wait(700);
    host.innerHTML = "";
    const great = moves <= Math.ceil(pairs * 1.5);
    const r = el("div", "result");
    r.innerHTML = `${great ? '<div class="seal s3">優</div>' : ""}<div class="score">${moves}<small> 次</small></div>
      <p>${pairs} 對全部配好了！${great ? "翻得又少又準。" : "下次試試看用更少的次數。"}</p><div class="actions"></div>`;
    const b1 = el("button", "btn red", "再玩一次"); b1.onclick = again;
    const b2 = el("button", "btn ghost", "回去"); b2.onclick = exit;
    r.querySelector(".actions").append(b2, b1); host.append(r);
    sfx.win(); if (great) stamp(r, "優");
  }
}
