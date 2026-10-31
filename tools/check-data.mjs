// 資料檢查：node tools/check-data.mjs
// 有錯（✗）會讓 exit code = 1；提醒（·）不影響結果。
import { existsSync } from "node:fs";
import { LESSONS, CHARS, learnedThrough, lessonOf } from "../js/data.js";
import { tokens } from "../js/ruby.js";
import { MOE } from "../js/voice_map.js";

const errors = [], notes = [];
const err = m => errors.push(m), note = m => notes.push(m);
const ZY = /^˙?[ㄅ-ㄩ]+[ˊˇˋ]?$/;
const emojiHex = e => [...e].map(c => c.codePointAt(0)).filter(cp => cp !== 0xFE0F).map(cp => cp.toString(16).toUpperCase()).join("-");
const normZy = z => z.trim().split(/\s+/).map(x => x.endsWith("˙") ? "˙" + x.slice(0, -1) : x).join(" ");

// 1. 課次與生字表一致
const seen = new Map();
for (const l of LESSONS) for (const c of l.chars) {
  if (seen.has(c)) err(`生字重複：${c} 同時在 ${seen.get(c)} 和 ${l.id}`);
  seen.set(c, l.id);
  if (!CHARS[c]) err(`${l.id} 的生字「${c}」在 CHARS 裡沒有資料`);
}
for (const c of Object.keys(CHARS)) if (!seen.has(c)) err(`CHARS 有「${c}」但沒有任何一課收它`);

// 2. 每個字
function checkMarked(str, lessonId, where) {
  const known = learnedThrough(lessonId);
  for (const t of tokens(str)) {
    if (!t.han) continue;
    if (t.zy != null && !t.zy.split(/\s+/).every(s => ZY.test(s))) err(`${where}：「${t.c}」的注音格式不對：${t.zy}`);
    // 已學過的字只有在讀「非主要讀音」時才該標（例如「睡著」），標成主要讀音就是多餘
    if (known.has(t.c) && t.zy && CHARS[t.c] && t.zy === CHARS[t.c].zy) note(`${where}：「${t.c}」已學過，不需要標注音`);
    if (!known.has(t.c) && !t.zy) err(`${where}：「${t.c}」在 ${lessonId} 前還沒學過，必須標注音`);
  }
}
for (const [c, d] of Object.entries(CHARS)) {
  const L = lessonOf(c); if (!L) continue;
  if (!ZY.test(d.zy)) err(`${c}：讀音格式不對 ${d.zy}`);
  if (!(d.strokes > 0)) err(`${c}：缺筆畫數`);
  if (!d.radical) err(`${c}：缺部首`);
  if (!d.words?.length) err(`${c}：沒有造詞`);
  for (const [w, zy] of d.words || []) {
    const n = [...w].length, m = zy.trim().split(/\s+/).length;
    if (n !== m) err(`${c}：詞「${w}」有 ${n} 字但注音 ${m} 個音節`);
    if (!w.includes(c)) err(`${c}：詞「${w}」不含這個字`);
    if (!zy.split(/\s+/).every(s => ZY.test(s))) err(`${c}：詞「${w}」注音格式不對：${zy}`);
  }
  if (!d.sentence) err(`${c}：缺例句`);
  else {
    if (!tokens(d.sentence).some(t => t.c === c)) err(`${c}：例句沒有用到這個字`);
    checkMarked(d.sentence, L.id, `${c} 例句`);
  }
  if (!d.emoji) note(`${c}：沒有插圖`);
  else if (!existsSync(new URL(`../img/openmoji/${emojiHex(d.emoji)}.svg`, import.meta.url))) err(`${c}：找不到插圖 img/openmoji/${emojiHex(d.emoji)}.svg`);
}

// 3. 短文與題目
for (const L of LESSONS) {
  if (!L.passage) { note(`${L.id}：還沒有短文`); continue; }
  checkMarked(L.passage.title, L.id, `${L.id} 短文標題`);
  checkMarked(L.passage.text, L.id, `${L.id} 短文`);
  L.passage.questions.forEach((q, i) => {
    checkMarked(q.q, L.id, `${L.id} 題${i + 1}`);
    q.options.forEach((o, j) => checkMarked(o, L.id, `${L.id} 題${i + 1}選項${j + 1}`));
    if (!(q.answer >= 0 && q.answer < q.options.length)) err(`${L.id} 題${i + 1}：答案編號超出選項`);
  });
}

// 4. 真人錄音覆蓋率（只提醒，沒有錄音會改用合成語音）
const hasHuman = (text, zy) => {
  const z = normZy(zy);
  if (MOE[text + "|" + z]) return true;
  const cs = [...text], ss = z.split(" ");
  return cs.length > 1 && cs.length === ss.length && !ss.some(x => x.startsWith("˙")) && cs.every((c, i) => MOE[c + "|" + ss[i]]);
};
let total = 0, ok = 0; const miss = [];
for (const [c, d] of Object.entries(CHARS)) {
  for (const [w, zy] of [[c, d.zy], ...(d.words || [])]) { total++; hasHuman(w, zy) ? ok++ : miss.push(`${w}（${zy}）`); }
}
note(`真人錄音覆蓋 ${ok}/${total}（${total ? Math.round(ok / total * 100) : 0}%）${miss.length ? "；缺：" + [...new Set(miss)].join("、") : ""}`);

for (const m of notes) console.log("·", m);
for (const m of errors) console.log("✗", m);
console.log(errors.length ? `\n${errors.length} 個錯誤` : "\n資料檢查通過");
process.exit(errors.length ? 1 : 0);
