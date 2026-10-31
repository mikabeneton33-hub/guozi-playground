# 萌典（教育部《重編國語辭典修訂本》）查詢與快取。
import json, os, re, time, urllib.request, urllib.parse, sys
import pathlib
D=str(pathlib.Path(__file__).resolve().parent/'.cache'/'moedict'); os.makedirs(D,exist_ok=True)  # 萌典查詢快取（不進 repo）
def get(w):
    p=f"{D}/{w}.json"
    if os.path.exists(p):
        t=open(p,encoding='utf8').read(); return json.loads(t) if t.strip() and t.strip()!='null' else None
    for k in range(3):
        try:
            with urllib.request.urlopen("https://www.moedict.tw/uni/"+urllib.parse.quote(w)+".json",timeout=20) as f: b=f.read()
            open(p,'wb').write(b); time.sleep(0.12); return json.loads(b)
        except urllib.error.HTTPError as e:
            if e.code==404: open(p,'w').write('null'); return None
            time.sleep(2)
        except Exception: time.sleep(2)
    return None
def readings(w):
    d=get(w)
    if not d: return []
    out=[]
    for h in d.get('heteronyms',[]):
        b=h.get('bopomofo')
        if b: out.append(re.sub(r'（.*?）','',b).replace('　',' ').strip())
    return out
