// 發音有兩種模式（右上角切換）：
//  human = 教育部辭典真人錄音（audio/moe），沒有錄音的字詞自動改用合成語音
//  tts   = 瀏覽器內建 zh-TW 語音合成
// 音效：WebAudio 合成（免檔案）。
import { MOE } from "./voice_map.js";
const synth = globalThis.speechSynthesis;
let voices = [];
let ready = false;

function loadVoices() { if (!synth) return; voices = synth.getVoices(); ready = voices.length > 0; }
loadVoices();
synth?.addEventListener?.("voiceschanged", loadVoices);

function pickVoice() {
  const zh = voices.filter(v => /^zh([-_](TW|Hant))/i.test(v.lang));
  const score = v => (/^zh[-_]TW/i.test(v.lang) ? 4 : 0) + (v.localService ? 2 : 0) + (/Mei|Yating|Hanhan|國語|Taiwan/i.test(v.name) ? 1 : 0);
  return zh.sort((a, b) => score(b) - score(a))[0] || voices.find(v => /^zh/i.test(v.lang)) || null;
}

export const tts = {
  get supported() { return !!synth; },
  speak(text, { rate = 0.85, pitch = 1.05 } = {}) {
    return new Promise(resolve => {
      if (!synth || !text) return resolve(false);
      try { synth.cancel(); } catch {}
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-TW";
      const v = pickVoice(); if (v) u.voice = v;
      u.rate = rate; u.pitch = pitch;
      let done = false;
      const finish = ok => { if (!done) { done = true; resolve(ok); } };
      u.onend = () => finish(true); u.onerror = () => finish(false);
      setTimeout(() => finish(true), Math.max(1500, text.length * 600)); // Safari 偶爾不觸發 onend
      synth.speak(u);
    });
  },
  stop() { try { synth?.cancel(); } catch {} },
  /** iOS 需要在使用者手勢中「暖機」一次才會出聲。 */
  warmup() { if (!synth || ready) return; const u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth.speak(u); },
};

// ---- 音效（合成） ----
let ctx = null;
function ac() {
  if (!ctx) { const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
function tone(freq, t0, dur, type = "sine", gain = 0.16) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + t0);
  g.gain.setValueAtTime(0, c.currentTime + t0);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
}
let muted = false;
try { muted = localStorage.getItem("gz.muted") === "1"; } catch {}
export const sfx = {
  get muted() { return muted; },
  toggle() { muted = !muted; try { localStorage.setItem("gz.muted", muted ? "1" : "0"); } catch {} return muted; },
  tap()     { if (!muted) tone(880, 0, 0.07, "triangle", 0.07); },
  correct() { if (!muted) { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.2); } },
  wrong()   { if (!muted) { tone(220, 0, 0.18, "sawtooth", 0.07); tone(180, 0.15, 0.22, "sawtooth", 0.07); } },
  win()     { if (!muted) [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.18)); },
};

// ---- 真人發音（教育部辭典錄音） ----
const normZy = z => (z || "").trim().split(/\s+/).filter(Boolean).map(x => x.endsWith("˙") ? "˙" + x.slice(0, -1) : x).join(" ");
let mode = "human";
try { mode = localStorage.getItem("gz.voice") || "human"; } catch {}
let current = null;
function playFile(id, rate = 1) {
  return new Promise(resolve => {
    stopFile();
    const a = new Audio(`audio/moe/${id}.mp3`);
    a.playbackRate = rate;
    current = a;
    let done = false; const fin = ok => { if (!done) { done = true; resolve(ok); } };
    a.onended = () => fin(true); a.onerror = () => fin(false);
    setTimeout(() => fin(true), 4000);
    a.play().catch(() => fin(false));
  });
}
function stopFile() { if (current) { try { current.pause(); } catch {} current = null; } }
/** 找錄音：整個字詞 → 逐字（不含輕聲時） */
function findIds(text, zy) {
  const z = normZy(zy);
  if (!text || !z) return null;
  const whole = MOE[text + "|" + z];
  if (whole) return [whole];
  const cs = [...text], ss = z.split(" ");
  if (cs.length > 1 && cs.length === ss.length && !ss.some(x => x.startsWith("˙"))) {
    const ids = cs.map((c, i) => MOE[c + "|" + ss[i]]);
    if (ids.every(Boolean)) return ids;
  }
  return null;
}
export const voice = {
  get mode() { return mode; },
  set mode(v) { mode = v; try { localStorage.setItem("gz.voice", v); } catch {} },
  hasHuman(text, zy) { return !!findIds(text, zy); },
  /** 唸字詞：text 國字、zy 注音。opts.rate（0.5～1）放慢速度，聽寫用。 */
  async word(text, zy, opts = {}) {
    tts.stop(); stopFile();
    if (mode === "human") {
      const ids = findIds(text, zy);
      if (ids) { for (const id of ids) { const ok = await playFile(id, opts.rate || 1); if (!ok) break; } return true; }
    }
    return tts.speak(text, opts.rate ? { rate: 0.85 * opts.rate } : {});
  },
  /** 唸一整句（例句、短文）：只用合成語音。 */
  sentence(text, opts = {}) { stopFile(); return tts.speak(text, { rate: 0.8, ...opts }); },
  stop() { stopFile(); tts.stop(); },
};
