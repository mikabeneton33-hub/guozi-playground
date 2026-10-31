#!/usr/bin/env python3
"""真人發音：從教育部《國語辭典簡編本》官方聲音檔挑出本站用到的字詞。

  python3 tools/build-voice-map.py

來源：教育部國語辭典公眾授權網（CC BY-ND 3.0 TW）
  https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_concised_download.html
做法：
  1. 下載簡編本文字資料庫，用「字詞名＋注音」找字詞號（＝聲音檔編號）。只收讀音和本站注音完全一致的。
  2. 聲音檔包很大（單字 1.5 GB、詞目 14.7 GB），用 HTTP Range 只抓需要的檔。
  3. 每個聲音檔先唸詞目、再唸釋義；只擷取開頭朗讀詞目的那一段（偵測第一個停頓），內容不更動，轉成 mp3。
  4. 寫 audio/moe/<編號>.mp3 與 js/voice_map.js。
需要：curl、ffmpeg、pip install openpyxl
"""
import json, os, pathlib, re, subprocess, sys, zipfile
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from rzip import Remote, central_dir, extract

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / ".cache" / "concised"; CACHE.mkdir(parents=True, exist_ok=True)
B = "https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/download/"
VER = "2014_20260929"
DB_ZIP, WORD_ZIP = f"dict_concised_{VER}.zip", f"dict_concised_music_word_{VER}.zip"
WWW_PARTS = [f"dict_concised_music_www_{VER}.zip.00{i}" for i in range(1, 6)]

def norm(z):  # 輕聲記號一律放音節前，空白統一
    return " ".join(("˙" + x[:-1]) if x.endswith("˙") else x for x in z.replace("　", " ").split())

# ---- 1. 本站需要的字詞 ----
need = json.loads(subprocess.run(["node", "--input-type=module", "-e", """
import { CHARS } from './js/data.js';
const out = new Set();
for (const [c, d] of Object.entries(CHARS)) { out.add(c + '|' + d.zy); for (const [w, z] of d.words) out.add(w + '|' + z); }
console.log(JSON.stringify([...out]));
"""], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
need = sorted({f"{k.split('|')[0]}|{norm(k.split('|')[1])}" for k in need})
# 詞沒有整詞錄音時，前端會逐字接著唸（不含輕聲時），所以每個字也要找
for k in list(need):
    w, z = k.split("|"); syl = z.split()
    if len(w) > 1 and len(w) == len(syl) and not any(s.startswith("˙") for s in syl):
        need += [f"{c}|{s}" for c, s in zip(w, syl)]
need = sorted(set(need))

# ---- 2. 簡編本文字資料庫：字詞名＋注音 → 字詞號 ----
db = CACHE / DB_ZIP
if not db.exists(): subprocess.run(["curl", "-sS", "-f", "-o", str(db), B + DB_ZIP], check=True)
import openpyxl
with zipfile.ZipFile(db) as z:
    name = [n for n in z.namelist() if n.endswith(".xlsx")][0]; z.extract(name, CACHE)
ws = openpyxl.load_workbook(CACHE / name, read_only=True).active
idmap = {}
for r in ws.iter_rows(min_row=2, values_only=True):
    if not r[0] or not r[6]: continue
    wid = re.sub(r'[="]', "", str(r[1]))
    idmap.setdefault(f"{r[0]}|{norm(r[6])}", wid)

found = {k: idmap[k] for k in need if k in idmap}
print(f"需要 {len(need)} 條，簡編本讀音相符 {len(found)} 條")

# ---- 3. 抓聲音檔、擷取詞目段 ----
outdir = ROOT / "audio" / "moe"; outdir.mkdir(parents=True, exist_ok=True)
def cd(key, urls):
    p = CACHE / f"cd_{key}.json"
    if p.exists(): return Remote(urls), json.loads(p.read_text())
    R = Remote(urls); e = central_dir(R); p.write_text(json.dumps(e)); return R, e
Rw, ew = cd("word", [B + WORD_ZIP])
Rx, ex = cd("www", [B + p for p in WWW_PARTS])
def locate(wid):
    for R, e in ((Rw, ew), (Rx, ex)):
        for n in e:
            if n.endswith("/" + wid + ".wav"): return R, e[n]
    return None, None
def head_segment(wav, mp3):
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", "silencedetect=n=-35dB:d=0.28", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
    speech_from = ends[0] if starts and starts[0] < 0.05 and ends else 0.0      # 開頭若有靜音先跳過
    cut = next((s for s in starts if s > speech_from + 0.1), None)
    if cut is None: return False
    a, b = max(0, speech_from - 0.05), cut + 0.08
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-ss", f"{a:.3f}", "-to", f"{b:.3f}",
                    "-ac", "1", "-ar", "22050", "-b:a", "40k", str(mp3)], check=True)
    return True
vmap, miss = {}, []
for k, wid in sorted(found.items()):
    mp3 = outdir / f"{wid}.mp3"
    if not mp3.exists():
        R, ent = locate(wid)
        if not R: miss.append(k + "（聲音檔不在包裡）"); continue
        wav = CACHE / f"{wid}.wav"
        if not wav.exists(): wav.write_bytes(extract(R, tuple(ent)))
        if not head_segment(wav, mp3): miss.append(k + "（找不到詞目段）"); continue
    vmap[k] = wid
for f in outdir.glob("*.mp3"):
    if f.stem not in set(vmap.values()): f.unlink()

head = """// 真人發音對照：「字詞|注音」→ 教育部《國語辭典簡編本》聲音檔編號（audio/moe/<編號>.mp3）。
// 由 tools/build-voice-map.py 產生，請勿手改。只收讀音與本站注音完全一致者，只擷取開頭朗讀詞目的段落。
// 來源：中華民國教育部《國語辭典簡編本》，CC BY-ND 3.0 TW（國語辭典公眾授權網）。
"""
(ROOT / "js" / "voice_map.js").write_text(head + "export const MOE = " + json.dumps(vmap, ensure_ascii=False) + ";\n", encoding="utf8")
print(f"收錄 {len(vmap)} 條；略過 {len(miss)} 條")
for m in miss[:30]: print("  -", m)
