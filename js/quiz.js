// 測驗引擎：聽音選字、看字選音，以及短文理解題。
import { CHARS } from "./data.js";
import { voice, sfx, tts } from "./audio.js";
import { store } from "./store.js";
import { el, icon, tzg, shuffle, wait } from "./ui.js";
import { rubyHTML, plain } from "./ruby.js";
import { stamp } from "./confetti.js";

// ---- 出題 ----
const symbols = zy => [...zy.replace(/[ˊˇˋ˙]/g, "")];
const tone = zy => (zy.match(/[ˊˇˋ˙]/) || [""])[0];
/** 兩個讀音有多像：共用符號越多、聲調相同，越容易混淆，當作干擾選項。 */
function sim(a, b) {
  const A = new Set(symbols(a)); let n = 0;
  for (const s of symbols(b)) if (A.has(s)) n++;
  return n + (tone(a) === tone(b) ? 0.5 : 0);
}
function distract(target, pool, k) {
  const zy = CHARS[target].zy;
  return pool.filter(c => c !== target && CHARS[c].zy !== zy)
    .map(c => ({ c, s: sim(CHARS[c].zy, zy) + Math.random() * 0.9 }))
    .sort((a, b) => b.s - a.s).slice(0, k).map(x => x.c);
}
/** targets：要考的字；pool：干擾選項的來源（已學過的字）；kinds：題型輪流出。 */
export function makeQuestions({ targets, pool, kinds, n }) {
  const order = [];
  while (order.length < n) { let batch = shuffle(targets); if (order.length && batch[0] === order.at(-1) && batch.length > 1) batch.push(batch.shift()); order.push(...batch); }
  return order.slice(0, n).map((c, i) => {
    const kind = kinds[i % kinds.length];
    const opts = shuffle([c, ...distract(c, pool, 3)]);
    return { kind, c, options: opts.map(x => ({ label: kind === "listen" ? x : CHARS[x].zy, ok: x === c })) };
  });
}
export const starsFor = (correct, total) => { const p = correct / total; return p === 1 ? 3 : p >= 0.8 ? 2 : p >= 0.6 ? 1 : 0; };
export const SEAL = ["", "可", "良", "優"];

// ---- 作答畫面 ----
export function runQuiz(host, { title, questions, onFinish, again, exit }) {
  let i = 0, correct = 0, busy = false;
  const total = questions.length;
  const say = q => voice.word(q.c, CHARS[q.c].zy);

  function render() {
    const q = questions[i]; busy = false;
    host.innerHTML = "";
    host.append(
      el("div", "qtop", `<span>${title}</span><span>${i + 1} / ${total}</span>`),
      el("div", "bar", `<i style="width:${(i / total) * 100}%"></i>`),
    );
    const prompt = el("div", "prompt");
    if (q.kind === "listen") {
      const sp = el("button", "speaker", icon("volume")); sp.setAttribute("aria-label", "再聽一次");
      sp.onclick = () => { tts.warmup(); say(q); };
      prompt.append(sp, el("div", "hint", "聽一聽，是哪一個字？"));
    } else {
      prompt.innerHTML = tzg(q.c) + `<div class="hint">這個字怎麼唸？</div>`;
    }
    host.append(prompt);
    const opts = el("div", "opts");
    q.options.forEach(o => {
      const b = el("button", "opt " + (q.kind === "read" ? "zy" : ""), o.label);
      b.onclick = () => pick(b, o, opts);
      opts.append(b);
    });
    host.append(opts);
    requestAnimationFrame(() => host.scrollIntoView({ block: "start" }));
    if (q.kind === "listen") setTimeout(() => say(q), 250);
  }

  async function pick(btn, o, opts) {
    if (busy) return; busy = true;
    const q = questions[i];
    for (const b of opts.children) b.disabled = true;
    store.count(q.kind, "played");
    if (o.ok) { correct++; btn.classList.add("right"); sfx.correct(); store.count(q.kind, "correct"); store.event(q.kind); }
    else {
      btn.classList.add("wrong"); sfx.wrong();
      [...opts.children].forEach((b, k) => { if (q.options[k].ok) b.classList.add("right"); });
    }
    if (q.kind === "read") say(q);          // 看字選音：答完唸一次標準讀音
    await wait(o.ok ? 900 : 1500);
    if (++i < total) render(); else finish();
  }

  function finish() {
    const stars = starsFor(correct, total);
    const extra = onFinish?.({ correct, total, stars }) || "";
    host.innerHTML = "";
    const r = el("div", "result");
    r.innerHTML = `${stars ? `<div class="seal s${stars}">${SEAL[stars]}</div>` : ""}
      <div class="score">${correct}<small> / ${total}</small></div>
      <p>${stars === 3 ? "全部答對，太棒了！" : stars ? "過關了，再練一次會更熟。" : "再聽一聽、看一看，再來一次吧。"}</p>${extra}
      <div class="actions"></div>`;
    const act = r.querySelector(".actions");
    const b1 = el("button", "btn red", "再玩一次"); b1.onclick = again;
    const b2 = el("button", "btn ghost", "回去"); b2.onclick = exit;
    act.append(b2, b1);
    host.append(r);
    if (stars) { sfx.win(); stamp(r, SEAL[stars]); } else sfx.tap();
  }
  render();
}

// ---- 短文 ----
export function runPassage(host, lesson, { exit }) {
  const p = lesson.passage;
  host.innerHTML = "";
  const card = el("div", "passage");
  card.innerHTML = `<h3>${rubyHTML(p.title)}</h3><div class="body">${rubyHTML(p.text)}</div>`;
  const listen = el("button", "btn ghost listen", icon("volume") + "唸給我聽");
  listen.onclick = () => { tts.warmup(); voice.sentence(plain(p.text)); };
  card.append(listen);
  host.append(card);
  let answered = 0, right = 0;
  const done = el("div", "actions"); done.style.display = "none";
  p.questions.forEach(q => {
    const blk = el("div", "qblock");
    blk.append(el("div", "q", rubyHTML(q.q)));
    const opts = el("div", "opts");
    q.options.forEach((o, k) => {
      const b = el("button", "opt text", rubyHTML(o));
      b.onclick = () => {
        for (const x of opts.children) x.disabled = true;
        const ok = k === q.answer;
        b.classList.add(ok ? "right" : "wrong"); ok ? sfx.correct() : sfx.wrong();
        if (!ok) opts.children[q.answer].classList.add("right"); else right++;
        if (++answered === p.questions.length) {
          if (right === p.questions.length) store.addStars(1);
          done.style.display = "flex"; sfx.win();
        }
      };
      opts.append(b);
    });
    blk.append(opts); host.append(blk);
  });
  const back = el("button", "btn red", "讀完了"); back.onclick = exit;
  done.append(back); host.append(done);
}
