// 進度：存瀏覽器本機，不用登入、不上傳。
const KEY = "gz.progress.v1";
const def = () => ({
  stars: 0,
  seen: {},                 // { 字: 看過幾次 }
  lessons: {},              // { T1: 最高星數 }
  daily: null,              // { date, tasks:[{id,goal,n}], rewarded }
  streak: { count: 0, last: null },
  unlockAll: false,
  listen: { played: 0, correct: 0 }, read: { played: 0, correct: 0 },
  write: { count: 0 }, dictation: { count: 0 },
});
let data = def();
try { data = { ...def(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} dispatchEvent(new CustomEvent("gz:progress")); }

// ---- 每日任務 ----
export const TASK_POOL = [
  { id: "card",   goal: 3, label: "看 3 張生字卡",      go: "chars" },
  { id: "listen", goal: 5, label: "聽音選字答對 5 題",  go: "listen" },
  { id: "read",   goal: 5, label: "看字選音答對 5 題",  go: "read" },
  { id: "write",  goal: 2, label: "描寫 2 個字",        go: "write" },
  { id: "lesson", goal: 1, label: "完成 1 次課程闖關",  go: "lessons" },
];
const pad = n => String(n).padStart(2, "0");
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => fmt(new Date());
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return fmt(d); };
function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
function ensureDaily() {
  const t = today();
  if (data.daily?.date === t) return data.daily;
  const rnd = seeded(t), pool = [...TASK_POOL], tasks = [];
  while (tasks.length < 3) { const i = Math.floor(rnd() * pool.length); tasks.push({ id: pool[i].id, goal: pool[i].goal, n: 0 }); pool.splice(i, 1); }
  data.daily = { date: t, tasks, rewarded: false };
  return data.daily;
}

export const store = {
  get() { return data; },
  addStars(n) { data.stars += n; save(); },
  seen(c) { data.seen[c] = (data.seen[c] || 0) + 1; save(); },
  seenCount() { return Object.keys(data.seen).length; },
  count(key, field, n = 1) { data[key][field] = (data[key][field] || 0) + n; save(); },
  /** 課程闖關結果；回傳 { firstPass, better } */
  lessonResult(id, stars) {
    const prev = data.lessons[id] || 0;
    data.lessons[id] = Math.max(prev, stars); save();
    return { firstPass: prev < 1 && stars >= 1, better: stars > prev };
  },
  lessonStars(id) { return data.lessons[id] || 0; },
  setUnlockAll(v) { data.unlockAll = !!v; save(); },
  daily() { const d = ensureDaily(); save(); return d; },
  event(type, n = 1) {
    const d = ensureDaily(); let changed = false;
    for (const t of d.tasks) if (t.id === type && t.n < t.goal) { t.n = Math.min(t.goal, t.n + n); changed = true; }
    if (changed && !d.rewarded && d.tasks.every(t => t.n >= t.goal)) {
      d.rewarded = true;
      data.streak.count = data.streak.last === yesterday() ? data.streak.count + 1 : (data.streak.last === today() ? data.streak.count : 1);
      data.streak.last = today();
      save();
      dispatchEvent(new CustomEvent("gz:daily-done"));
      return;
    }
    if (changed) save();
  },
  reset() { data = def(); save(); },
};
