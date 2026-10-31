import json, re, sys
import pathlib, os
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import content_src as M
from moedict import readings, get
ROOT = pathlib.Path(__file__).resolve().parent.parent
# 讀音以《國語辭典簡編本》為準（給國中小學生用，依《國語一字多音審訂表》），簡編本沒有才查《重編國語辭典修訂本》
def _load_concised():
    import openpyxl, glob
    xs = sorted(glob.glob(str(ROOT/'tools'/'.cache'/'concised'/'dict_concised_*.xlsx')))
    if not xs: sys.exit("找不到簡編本資料庫，請先跑 python3 tools/build-voice-map.py（會下載到 tools/.cache/concised/）")
    out = {}
    for r in openpyxl.load_workbook(xs[-1], read_only=True).active.iter_rows(min_row=2, values_only=True):
        if r[0] and r[6]:
            z = ' '.join(('˙'+x[:-1]) if x.endswith('˙') else x for x in str(r[6]).replace('\u3000',' ').split())
            out.setdefault(str(r[0]), [])
            if z not in out[str(r[0])]: out[str(r[0])].append(z)
    return out
CONCISED = _load_concised()
_moe_readings = readings
def readings(w):
    return CONCISED.get(w) or _moe_readings(w)
def info_of(c):
    d = get(c) or {}
    return {'radical': d.get('radical'), 'strokes': d.get('stroke_count')}
HAN=re.compile(r'[㐀-鿿]')
TOK=re.compile(r'([㐀-鿿])(\{[^}]*\})?')
order=[c for L in M.LESSONS for c in L[2]]
lesson_of={c:i for i,L in enumerate(M.LESSONS) for c in L[2]}
errors=[]; notes=[]
def known(i): return set(c for L in M.LESSONS[:i+1] for c in L[2])
# 語氣詞、代名詞等查詞也判不出的，用一年級語境的預設讀音
DEFAULT={'啊':'˙ㄚ','吧':'˙ㄅㄚ','牠':'ㄊㄚ','誰':'ㄕㄟˊ','玩':'ㄨㄢˊ','的':'˙ㄉㄜ','了':'˙ㄌㄜ','那':'ㄋㄚˋ','什':'ㄕㄣˊ','麼':'˙ㄇㄜ',
 '要':'ㄧㄠˋ','會':'ㄏㄨㄟˋ','鳥':'ㄋㄧㄠˇ','車':'ㄔㄜ','吃':'ㄔ','白':'ㄅㄞˊ','寫':'ㄒㄧㄝˇ','讀':'ㄉㄨˊ','洗':'ㄒㄧˇ','顆':'ㄎㄜ','間':'ㄐㄧㄢ',
 '先':'ㄒㄧㄢ','排':'ㄆㄞˊ','怎':'ㄗㄣˇ','龜':'ㄍㄨㄟ','湯':'ㄊㄤ','中':'ㄓㄨㄥ','午':'ㄨˇ','期':'ㄑㄧˊ','同':'ㄊㄨㄥˊ','蘋':'ㄆㄧㄥˊ','蕉':'ㄐㄧㄠ',
 '有':'ㄧㄡˇ','我':'ㄨㄛˇ','他':'ㄊㄚ','這':'ㄓㄜˋ','好':'ㄏㄠˇ','可':'ㄎㄜˇ','看':'ㄎㄢˋ','說':'ㄕㄨㄛ','家':'ㄐㄧㄚ','多':'ㄉㄨㄛ','都':'ㄉㄡ','還':'ㄏㄞˊ',
 '頭':'ㄊㄡˊ','教':'ㄐㄧㄠ','來':'ㄌㄞˊ','上':'ㄕㄤˋ','大':'ㄉㄚˋ','打':'ㄉㄚˇ','給':'ㄍㄟˇ','比':'ㄅㄧˇ','放':'ㄈㄤˋ','跑':'ㄆㄠˇ','喝':'ㄏㄜ',
 '拍':'ㄆㄞ','追':'ㄓㄨㄟ','抓':'ㄓㄨㄚ','掃':'ㄙㄠˇ','暖':'ㄋㄨㄢˇ','綠':'ㄌㄩˋ','紅':'ㄏㄨㄥˊ','遠':'ㄩㄢˇ','亮':'ㄌㄧㄤˋ','冊':'ㄘㄜˋ','校':'ㄒㄧㄠˋ',
 '見':'ㄐㄧㄢˋ','把':'ㄅㄚˇ','三':'ㄙㄢ','六':'ㄌㄧㄡˋ','日':'ㄖˋ','兒':'ㄦˊ','麗':'ㄌㄧˋ','聽':'ㄊㄧㄥ','不':'ㄅㄨˋ','足':'ㄗㄨˊ','倒':'ㄉㄠˇ',
 '個':'ㄍㄜˋ','們':'˙ㄇㄣ','子':'ㄗˇ','地':'ㄉㄧˋ','過':'ㄍㄨㄛˋ','沒':'ㄇㄟˊ','哪':'ㄋㄚˇ','更':'ㄍㄥˋ','難':'ㄋㄢˊ','興':'ㄒㄧㄥˋ','乾':'ㄍㄢ','腳':'ㄐㄧㄠˇ','黑':'ㄏㄟ','頁':'ㄧㄝˋ','次':'ㄘˋ','弟':'ㄉㄧˋ','荷':'ㄏㄜˊ','葉':'ㄧㄝˋ','請':'ㄑㄧㄥˇ','雨':'ㄩˇ',
 '分':'ㄈㄣ','從':'ㄘㄨㄥˊ','張':'ㄓㄤ','騎':'ㄑㄧˊ','風':'ㄈㄥ','吹':'ㄔㄨㄟ','幅':'ㄈㄨˊ','滑':'ㄏㄨㄚˊ','幾':'ㄐㄧˇ','臺':'ㄊㄞˊ',
 '和':'ㄏㄢˋ','羊':'ㄧㄤˊ','殼':'ㄎㄜˊ','夾':'ㄐㄧㄚˊ','縫':'ㄈㄥˊ','百':'ㄅㄞˇ','忘':'ㄨㄤˋ','累':'ㄌㄟˋ','蓋':'ㄍㄞˋ','喔':'ㄛ',
 '錢':'ㄑㄧㄢˊ','場':'ㄔㄤˇ','北':'ㄅㄟˇ','聞':'ㄨㄣˊ','它':'ㄊㄚ','被':'ㄅㄟˋ','當':'ㄉㄤ','數':'ㄕㄨˇ'}
CTX_SKIP=set('的了')
def by_context(plain, i, c):
    found=set()
    for a,b in ((i-1,i+1),(i,i+2),(i-2,i+1),(i-1,i+2),(i,i+3)):
        if a<0 or b>len(plain): continue
        w=plain[a:b]
        if not all(HAN.match(x) for x in w): continue
        for r in readings(w):
            syl=norm(r).split()
            if len(syl)==len(w): found.add(syl[i-a])
    return found
def annotate(text, li, where):
    K=known(li); out=[]; pos=0
    plain=TOK.sub(lambda m:m.group(1), text)
    pi=0; idx=[]
    for m in TOK.finditer(text): pass
    # 對應：第 n 個國字在 plain 中的位置
    hanpos=[k for k,ch in enumerate(plain) if HAN.match(ch)]
    hi=-1
    for m in TOK.finditer(text):
        out.append(text[pos:m.start()]); pos=m.end(); hi+=1
        c, ann = m.group(1), m.group(2)
        if ann:
            z=ann[1:-1]; rs=readings(c)
            base=z.replace('˙','')
            if z not in rs and not any(r.replace('˙','')==base for r in rs): errors.append(f"{where}：「{c}」標 {z}，字典讀音 {rs}")
            if c in K: notes.append(f"{where}：「{c}」已學過但有標注音（保留，作為多音提示）")
            out.append(c+ann); continue
        if c in K: out.append(c); continue
        rs=list(dict.fromkeys(readings(c)))
        if len(rs)==1: out.append(f"{c}{{{rs[0]}}}"); continue
        if not rs: errors.append(f"{where}：「{c}」字典查不到"); out.append(c); continue
        ctx=by_context(plain, hanpos[hi], c) if c not in CTX_SKIP else set()
        ctx={z for z in ctx if z in rs or z.replace('˙','') in [r.replace('˙','') for r in rs]}
        if len(ctx)==1: out.append(f"{c}{{{ctx.pop()}}}"); continue
        if c in DEFAULT and (not ctx or DEFAULT[c] in ctx): out.append(f"{c}{{{DEFAULT[c]}}}"); continue
        errors.append(f"{where}：「{c}」多音 {rs}，前後文 {sorted(ctx)}，請指定"); out.append(c)
    out.append(text[pos:]); return ''.join(out)
def norm(z): return ' '.join(('˙'+x[:-1]) if x.endswith('˙') else x for x in z.split())
fixed=[]
def check_word(w,z,where):
    rs=[norm(r) for r in readings(w)] if len(w)>1 else []
    rs=[r for r in rs if len(r.split())==len(w)]
    if rs:
        if norm(z) in rs: return norm(z)
        if len(rs) > 1: errors.append(f"{where}：詞「{w}」寫 {z}，辭典有多個讀音 {rs}，請指定"); return z
        fixed.append(f"{w}：{z} → {rs[0]}（依辭典）"); return rs[0]
    syl=z.split()
    for c,s in zip(w,syl):
        cr=readings(c)
        base=lambda x: re.sub('[˙ˊˇˋ]','',x)
        if s not in cr and not (s.startswith('˙') and base(s) in [base(r) for r in cr]):
            errors.append(f"{where}：詞「{w}」的「{c}」讀 {s} 不在字典 {cr}")
    if len(w)>1: notes.append(f"辭典沒有「{w}」這個詞條，已逐字核對")
    return z
chars={}
for c in order:
    zy,emo,words,sent=M.C[c]; li=lesson_of[c]
    rs=readings(c)
    if zy not in rs: errors.append(f"{c}：主讀音 {zy} 不在字典 {rs}")
    nw=[]
    for w,z in words:
        if c not in w: errors.append(f"{c}：詞「{w}」不含本字")
        if len(w)!=len(z.split()): errors.append(f"{c}：詞「{w}」音節數不符")
        nw.append([w,check_word(w,z,c)])
    words=nw
    if c not in sent: errors.append(f"{c}：例句沒有本字")
    chars[c]=dict(zy=zy,radical=info_of(c)['radical'],strokes=info_of(c)['strokes'],emoji=emo,words=words,sentence=annotate(sent,li,f"{c} 例句"),
                  poly=len(set(rs))>1)
def cn(n):
    D='零一二三四五六七八九'
    if n<10: return D[n]
    t,u=divmod(n,10)
    return (('' if t==1 else D[t])+'十'+(D[u] if u else ''))
lessons=[]
for i,(lid,title,cs,pt,ptext,qs) in enumerate(M.LESSONS):
    lessons.append(dict(id=lid,no=f"第{cn(i+1)}課",term="下" if lid>=getattr(M,'TERM_SPLIT','L99') else "上",title=title,chars=list(cs),
      passage=dict(title=annotate(pt,i,f"{lid} 標題"),text=annotate(ptext,i,f"{lid} 短文"),
        questions=[dict(q=annotate(q,i,f"{lid} 題目"),options=[annotate(o,i,f"{lid} 選項") for o in opts],answer=0) for q,opts in qs])))
for n in sorted(set(notes)): pass
print("依辭典修正的詞："); [print('  ',f) for f in fixed]
print(f"錯誤 {len(errors)}"); [print('✗',e) for e in errors]


if errors:
    sys.exit(1)
J=lambda x: json.dumps(x,ensure_ascii=False)
out=[open(ROOT/'tools'/'data_header.js',encoding='utf8').read().rstrip()+'\n', 'export const LESSONS = [']
for l in lessons:
    p=l['passage']
    out.append(f'  {{ id: {J(l["id"])}, no: {J(l["no"])}, term: {J(l["term"])}, title: {J(l["title"])}, chars: {J(l["chars"])},')
    out.append(f'    passage: {{ title: {J(p["title"])},')
    out.append(f'      text: {J(p["text"])},')
    out.append('      questions: [')
    for q in p['questions']: out.append(f'        {{ q: {J(q["q"])}, options: {J(q["options"])}, answer: 0 }},')
    out.append('      ] } },')
out.append('];\n')
out.append('export const CHARS = {')
for c,v in chars.items():
    out.append(f'  {c}: {{ zy: {J(v["zy"])}, radical: {J(v["radical"])}, strokes: {v["strokes"]}, emoji: {J(v["emoji"])}, poly: {J(v["poly"])},')
    out.append(f'    words: {J(v["words"])},')
    out.append(f'    sentence: {J(v["sentence"])} }},')
out.append('};\n')
out.append(open(ROOT/'tools'/'data_footer.js',encoding='utf8').read())
(ROOT/'js'/'data.js').write_text('\n'.join(out),encoding='utf8')
print('已寫入 js/data.js')
