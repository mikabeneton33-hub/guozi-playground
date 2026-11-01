import { BOOK, LESSONS, CHARS, lessonOf, learnedThrough, allChars } from "./data.js";
import { voice, sfx, tts } from "./audio.js";
import { store, TASK_POOL } from "./store.js";
import { rubyHTML, plain, wordHTML } from "./ruby.js";
import { $, el, icon, tzg, pic, shuffle, toast } from "./ui.js";
import { makeQuestions, runQuiz, runPassage, starsFor, SEAL } from "./quiz.js";
import { runWrite } from "./write.js";
import { renderDictation } from "./dictation.js";
import { runMatch } from "./match.js";

// ================================================================= 外殼
const TABS = [["chars", "生字", "grid"], ["lessons", "課程", "book"], ["games", "遊戲", "game"], ["dict", "聽寫", "headphone"], ["me", "我的", "me"]];
const RENDER = { chars: viewChars, lessons: viewLessons, games: viewGames, dict: viewDict, me: viewMe };

const tabbar = $(".tabbar");
for (const [id, label, ic] of TABS) {
  const b = el("button", "tab", icon(ic) + label); b.dataset.v = id;
  b.onclick = () => { sfx.tap(); tab(id); };
  tabbar.append(b);
}
let curTab = "chars";
function show(id, { highlight = curTab, back = null } = {}) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "v-" + id));
  tabbar.querySelectorAll(".tab").forEach(t => { t.classList.toggle("on", t.dataset.v === highlight); t.toggleAttribute("aria-current", t.dataset.v === highlight); });
  const bb = $("#backbar");
  bb.hidden = !back;
  if (back) { const b = bb.querySelector(".back"); b.innerHTML = icon("back") + back.label; b.onclick = () => { voice.stop(); back.to(); }; }
  scrollTo(0, 0);
}
function tab(id) { curTab = id; closeSheet(); RENDER[id](); show(id === "dict" ? "dict" : id, { highlight: id }); }

// 右上角：發音來源、音效
function renderTop() {
  document.querySelectorAll("#voicetoggle button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === voice.mode)));
  $("#mute").innerHTML = icon(sfx.muted ? "mute" : "volume");
}
document.querySelectorAll("#voicetoggle button").forEach(b => b.onclick = () => { voice.mode = b.dataset.mode; renderTop(); sfx.tap(); });
$("#mute").onclick = () => { sfx.toggle(); renderTop(); };
$("#home").innerHTML = icon("home");
renderTop();

const placeholderNote = () => BOOK.placeholder ? el("div", "notice", `<span><b>示範資料</b>　目前的生字和課次是版型示範，正式內容製作中。</span>`) : null;
/** 課次範圍選單：課很多時用下拉選單，不用一長串按鈕。 */
export function rangePicker(max, value, onChange) {
  const wrap = el("label", "picker", `<span>練習到</span>`);
  const sel = el("select");
  LESSONS.forEach((L, i) => { if (i > max) return; const o = el("option", "", `${L.no}　${L.title}`); o.value = i; if (i === value) o.selected = true; sel.append(o); });
  sel.onchange = () => onChange(Number(sel.value));
  wrap.append(sel); return wrap;
}

// ================================================================= 進度判斷
const unlocked = i => store.get().unlockAll || i === 0 || store.lessonStars(LESSONS[i - 1].id) >= 1;
const maxUnlocked = () => { let m = 0; LESSONS.forEach((_, i) => { if (unlocked(i)) m = i; }); return m; };

// ================================================================= 生字
function viewChars() {
  const v = $("#v-chars"); v.innerHTML = "";
  v.append(el("h2", "h2", "生字"), el("p", "sub", "點一個字，聽讀音、看造詞和例句。"));
  const n = placeholderNote(); if (n) v.append(n);
  LESSONS.forEach((L, li) => {
    if (L.term && L.term !== LESSONS[li - 1]?.term) v.append(termHead(L.term));
    v.append(el("div", "group-title", `<b>${L.no}　${L.title}</b><span>${L.chars.length} 個字</span>`));
    const grid = el("div", "cgrid");
    for (const c of L.chars) {
      const t = el("button", "ctile" + (store.get().seen[c] ? " seen" : ""), `${tzg(c)}<span class="zy">${CHARS[c].zy}</span>`);
      t.setAttribute("aria-label", `${c}，${CHARS[c].zy}`);
      t.onclick = () => { sfx.tap(); openSheet(c, L.chars); };
      grid.append(t);
    }
    v.append(grid);
  });
}

// ---- 生字卡 ----
let sheetOpener = null;
function openSheet(c, list) {
  const sh = $("#sheet"), d = CHARS[c], idx = list.indexOf(c);
  store.seen(c); store.event("card");
  sh.innerHTML = `<div class="grab"></div>
    <div class="nav"><button aria-label="上一個字" ${idx <= 0 ? "disabled" : ""} data-d="-1">${icon("left")}</button><span>${idx + 1} / ${list.length}</span><button aria-label="下一個字" ${idx >= list.length - 1 ? "disabled" : ""} data-d="1">${icon("right")}</button></div>
    <div class="stage">${tzg(c)}<div class="meta"><div class="zy">${d.zy}</div>
      <div class="facts"><span class="fact">${d.radical}部</span><span class="fact">${d.strokes} 畫</span>${d.poly ? '<span class="fact">多音字</span>' : ""}</div>${d.emoji ? pic(d.emoji) : ""}</div></div>
    <h4>造詞</h4><div class="words"></div>
    <h4>例句</h4><button class="sentence" aria-label="唸出例句">${rubyHTML(d.sentence)}</button>
    <div class="actions"><button class="btn ghost" data-act="hear">${icon("volume")}聽讀音</button><button class="btn red" data-act="write">${icon("pen")}描寫這個字</button></div>`;
  const words = sh.querySelector(".words");
  for (const [w, zy] of d.words) {
    const b = el("button", "wordchip", wordHTML(w, zy)); b.setAttribute("aria-label", `唸出${w}`);
    b.onclick = () => { tts.warmup(); voice.word(w, zy); };
    words.append(b);
  }
  sh.querySelector(".sentence").onclick = () => { tts.warmup(); voice.sentence(plain(d.sentence)); };
  sh.querySelector('[data-act="hear"]').onclick = () => { tts.warmup(); voice.word(c, d.zy); };
  sh.querySelector('[data-act="write"]').onclick = () => { closeSheet(); startWrite([c], { back: () => tab(curTab) }); };
  sh.querySelectorAll(".nav button").forEach(b => b.onclick = () => { sfx.tap(); openSheet(list[idx + Number(b.dataset.d)], list); });
  if (!sh.classList.contains("open")) sheetOpener = document.activeElement;
  sh.classList.add("open"); $("#backdrop").classList.add("open");
  sh.scrollTop = 0; sh.tabIndex = -1; sh.focus({ preventScroll: true });
  tts.warmup(); voice.word(c, d.zy);
  if (curTab === "chars") viewCharsSoft();
}
function viewCharsSoft() { // 更新「看過」外框，不動捲動位置
  document.querySelectorAll("#v-chars .ctile").forEach(t => { const c = t.getAttribute("aria-label")[0]; t.classList.toggle("seen", !!store.get().seen[c]); });
}
function closeSheet() {
  $("#sheet").classList.remove("open"); $("#backdrop").classList.remove("open"); voice.stop();
  if (sheetOpener?.focus) sheetOpener.focus({ preventScroll: true }); sheetOpener = null;
}
$("#backdrop").onclick = closeSheet;
addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

// ================================================================= 課程
function viewLessons() {
  const v = $("#v-lessons"); v.innerHTML = "";
  v.append(el("h2", "h2", BOOK.name), el("p", "sub", `${BOOK.grade}，共 ${LESSONS.length} 課、${allChars().length} 個字。過關就能解鎖下一課。`));
  if (BOOK.note) v.append(el("div", "notice", `<span>${BOOK.note}</span>`));
  const n = placeholderNote(); if (n) v.append(n);
  let list = null;
  LESSONS.forEach((L, i) => {
    if (!list || (L.term && L.term !== LESSONS[i - 1]?.term)) { if (L.term) v.append(termHead(L.term)); list = el("div", "lessons"); v.append(list); }
    const open = unlocked(i), st = store.lessonStars(L.id);
    const card = el("button", "lcard" + (open ? "" : " locked"),
      `<span class="no">${L.no}</span><span><h3>${L.title}</h3><span class="preview">${L.chars.join("")}</span></span>` +
      (open ? `<span class="seal s${st}">${SEAL[st]}</span>` : `<span class="seal">${icon("lock")}</span>`));
    card.setAttribute("aria-label", `${L.no} ${L.title}${open ? "" : "，尚未解鎖"}`);
    card.onclick = () => { if (!open) return toast("先通過上一課，就能解鎖這一課"); sfx.tap(); viewLesson(i); };
    list.append(card);
  });
}
function termHead(t) {
  const n = LESSONS.filter(l => l.term === t), chars = n.reduce((a, l) => a + l.chars.length, 0);
  return el("h3", "term", `一年級${t}學期<span>${n.length} 課・${chars} 字</span>`);
}
function viewLesson(i) {
  const L = LESSONS[i], v = $("#v-lesson"); v.innerHTML = "";
  v.append(el("h2", "h2", `${L.no}　${L.title}`), el("p", "sub", `本課生字 ${L.chars.length} 個。`));
  const grid = el("div", "cgrid");
  for (const c of L.chars) {
    const t = el("button", "ctile" + (store.get().seen[c] ? " seen" : ""), `${tzg(c)}<span class="zy">${CHARS[c].zy}</span>`);
    t.setAttribute("aria-label", `${c}，${CHARS[c].zy}`);
    t.onclick = () => { sfx.tap(); openSheet(c, L.chars); };
    grid.append(t);
  }
  v.append(grid);
  const hub = el("div", "hub");
  const item = (ic, t, d, fn) => { const b = el("button", "hubitem", `<span class="ico">${icon(ic)}</span><span><b>${t}</b><span class="d">${d}</span></span>`); b.onclick = () => { sfx.tap(); fn(); }; hub.append(b); };
  item("pen", "描寫生字", "跟著淡淡的字，在田字格裡描一描", () => startWrite(L.chars, { back: () => viewLesson(i) , lesson: i }));
  item("game", "課程闖關", "8 題：聽音選字、看字選音，答對 6 成過關", () => startLessonQuiz(i));
  if (L.passage) item("text", "讀短文", "讀一讀、聽一聽，再回答問題", () => startPassage(i));
  v.append(el("div", "group-title", "<b>練習</b>"), hub);
  show("lesson", { highlight: "lessons", back: { label: "全部課程", to: () => tab("lessons") } });
}
function startLessonQuiz(i) {
  const L = LESSONS[i], v = $("#v-play"), pool = [...learnedThrough(L.id)];
  const again = () => startLessonQuiz(i), exit = () => viewLesson(i);
  show("play", { highlight: "lessons", back: { label: "離開闖關", to: exit } });
  runQuiz(v, {
    title: `${L.no}　闖關`, again, exit,
    questions: makeQuestions({ targets: L.chars, pool, kinds: ["listen", "read"], n: 8 }),
    onFinish: ({ stars }) => {
      const r = store.lessonResult(L.id, stars);
      if (stars) store.event("lesson");
      if (r.firstPass) { store.addStars(stars); return LESSONS[i + 1] ? `<p><b>已解鎖下一課：${LESSONS[i + 1].no}</b></p>` : ""; }
      return "";
    },
  });
}
function startPassage(i) {
  const L = LESSONS[i], v = $("#v-play");
  show("play", { highlight: "lessons", back: { label: L.no, to: () => viewLesson(i) } });
  runPassage(v, L, { exit: () => viewLesson(i) });
}
function startWrite(chars, { back }) {
  const v = $("#v-play");
  const again = () => startWrite(chars, { back });
  show("play", { back: { label: "返回", to: back } });
  runWrite(v, chars, { again, exit: back });
}

// ================================================================= 遊戲
const gs = { upto: null };
function viewGames() {
  const v = $("#v-games"); v.innerHTML = "";
  const top = maxUnlocked(); if (gs.upto == null || gs.upto > top) gs.upto = top;
  v.append(el("h2", "h2", "遊戲"), el("p", "sub", "選好範圍，玩已經學過的字。"));
  v.append(rangePicker(top, gs.upto, i => { gs.upto = i; viewGames(); }));
  const pool = [...learnedThrough(LESSONS[gs.upto].id)];
  const cards = el("div", "gcards");
  const card = (ic, t, d, fn) => { const b = el("button", "hubitem", `<span class="ico">${icon(ic)}</span><span><b>${t}</b><span class="d">${d}</span></span>`); b.onclick = () => { sfx.tap(); fn(); }; cards.append(b); };
  card("volume", "聽音選字", "聽讀音，從四個字裡選出來", () => startGame("listen", pool));
  card("grid", "看字選音", "看國字，選出正確的注音", () => startGame("read", pool));
  card("pen", "寫寫看", "隨機抽 5 個字，在田字格裡描寫", () => startWrite(shuffle(pool).slice(0, 5), { back: () => tab("games") }));
  card("list", "字音配對", "翻牌，把國字和注音配成一對", () => startMatch(pool));
  v.append(cards);
}
function startGame(kind, pool) {
  const v = $("#v-play");
  const again = () => startGame(kind, pool), exit = () => tab("games");
  show("play", { highlight: "games", back: { label: "遊戲", to: exit } });
  runQuiz(v, { title: kind === "listen" ? "聽音選字" : "看字選音", again, exit, questions: makeQuestions({ targets: pool, pool, kinds: [kind], n: 10 }) });
}

function startMatch(pool) {
  const v = $("#v-play"), exit = () => tab("games");
  show("play", { highlight: "games", back: { label: "遊戲", to: exit } });
  runMatch(v, pool, { again: () => startMatch(pool), exit });
}

// ================================================================= 聽寫
function viewDict() { renderDictation($("#v-dict")); }

// ================================================================= 我的
function viewMe() {
  const v = $("#v-me"), d = store.get(); v.innerHTML = "";
  v.append(el("h2", "h2", "我的"));
  v.append(el("div", "stat", `<div><b>${d.stars}</b><span>星星</span></div><div><b>${d.streak.count}</b><span>連續天數</span></div><div><b>${store.seenCount()}<small style="font-size:15px;color:var(--ink-3)"> / ${allChars().length}</small></b><span>看過的字</span></div>`));
  v.append(el("div", "group-title", "<b>今日任務</b>"));
  const tasks = el("div", "tasks");
  for (const t of store.daily().tasks) {
    const def = TASK_POOL.find(x => x.id === t.id), done = t.n >= t.goal;
    const b = el("button", "task" + (done ? " done" : ""), `<span class="ck">${done ? "✓" : ""}</span><span class="t">${def.label}</span><span class="p">${t.n} / ${t.goal}</span>`);
    b.onclick = () => ({ chars: () => tab("chars"), lessons: () => tab("lessons"), listen: () => tab("games"), read: () => tab("games"), write: () => tab("games"), match: () => tab("games") }[def.go]?.());
    tasks.append(b);
  }
  v.append(tasks);
  v.append(el("div", "group-title", "<b>家長設定</b>"));
  const lab = el("label", "switch", `<input type="checkbox" ${d.unlockAll ? "checked" : ""}><span>解鎖全部課程（不用依序過關）</span>`);
  lab.querySelector("input").onchange = e => store.setUnlockAll(e.target.checked);
  v.append(lab);
  const reset = el("button", "btn ghost", "清除這台裝置上的所有進度"); reset.style.cssText = "width:100%;margin-top:10px";
  reset.onclick = () => { if (confirm("確定要清除所有進度嗎？清除後無法復原。")) { store.reset(); viewMe(); toast("已清除"); } };
  v.append(reset);
  v.append(el("div", "group-title", "<b>關於</b>"), el("p", "sub", "進度只存在這台裝置的瀏覽器，不登入、不上傳。真人發音：教育部《國語辭典簡編本》（CC BY-ND 3.0 TW）。插圖：OpenMoji（CC BY-SA 4.0）。字體：霞鶩文楷（OFL）、思源黑體（OFL）。"));
}
addEventListener("gz:daily-done", () => { store.addStars(3); sfx.win(); toast("今日任務全部完成，+3 星"); if ($("#v-me").classList.contains("active")) viewMe(); });

// ================================================================= 啟動
tab("chars");
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
