// 從注音樂園（zhuyin-playground）已整理好的真人錄音裡，挑出本站用得到的字詞：
//   node tools/build-voice-map.mjs ../zhuyin-playground
// 做三件事：複製用到的 mp3 到 audio/moe/、重寫 js/voice_map.js、列出沒有錄音的字詞。
// 錄音來源：中華民國教育部《國語辭典簡編本》，CC BY-ND 3.0 TW，內容不更動，只用原本已擷取好的朗讀段落。
import { copyFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { CHARS } from "../js/data.js";

const src = resolve(process.argv[2] || "../zhuyin-playground");
const srcMap = (await import(pathToFileURL(join(src, "js/voice_map.js")).href)).MOE;
const root = new URL("..", import.meta.url).pathname;
mkdirSync(join(root, "audio/moe"), { recursive: true });

const norm = z => z.trim().split(/\s+/).map(x => x.endsWith("˙") ? "˙" + x.slice(0, -1) : x).join(" ");
const want = new Set();
for (const [c, d] of Object.entries(CHARS)) {
  want.add(`${c}|${norm(d.zy)}`);
  for (const [w, zy] of d.words || []) {
    want.add(`${w}|${norm(zy)}`);
    const cs = [...w], ss = norm(zy).split(" ");
    if (cs.length === ss.length) cs.forEach((ch, i) => want.add(`${ch}|${ss[i]}`));
  }
}
const out = {}, missing = [];
for (const k of [...want].sort()) {
  const id = srcMap[k];
  if (!id) { missing.push(k); continue; }
  const from = join(src, "audio/moe", id + ".mp3");
  if (!existsSync(from)) { missing.push(k + "（對照表有、檔案不在）"); continue; }
  copyFileSync(from, join(root, "audio/moe", id + ".mp3"));
  out[k] = id;
}
const head = `// 真人發音對照：「字詞|注音」→ 教育部辭典錄音編號（audio/moe/<id>.mp3）。
// 由 tools/build-voice-map.mjs 產生，請勿手改。
// 錄音來源：中華民國教育部《國語辭典簡編本》，CC BY-ND 3.0 TW；檔案經萌典 moedict.tw 取得。
`;
writeFileSync(join(root, "js/voice_map.js"), head + `export const MOE = ${JSON.stringify(out)};\n`);
console.log(`收錄 ${Object.keys(out).length}/${want.size} 條；沒有真人錄音（會改用合成語音）：`);
for (const m of missing) console.log("  -", m);
