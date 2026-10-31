#!/usr/bin/env python3
"""把霞鶩文楷 TC 縮成只含本站用到的字，輸出 fonts/gzkai.woff2。

  python3 tools/build-font.py /path/to/LXGWWenKaiTC-Regular.ttf

字型來源：https://github.com/lxgw/LxgwWenkaiTC（SIL OFL 1.1，無保留字型名稱）。
收字範圍：js/ 底下所有檔案出現過的漢字、注音、標點，加上固定的介面用字。
每次增加生字、詞語、例句後都要重跑，否則新字會退回系統楷體。
需要：pip install fonttools brotli
"""
import re, sys, pathlib
from fontTools import subset

root = pathlib.Path(__file__).resolve().parent.parent
src = sys.argv[1] if len(sys.argv) > 1 else None
if not src:
    sys.exit(__doc__)

text = "".join(p.read_text(encoding="utf8") for p in sorted((root / "js").glob("*.js")) if p.name != "voice_map.js")
extra = "優良可第一二三四五六七八九十課冊上下　，。、？！：；「」『』（）—…0123456789"
chars = set(re.findall(r"[　-〿㄀-ㄯˇˊˋ˙㐀-鿿＀-￯]", text)) | set(extra)
out = root / "fonts" / "gzkai.woff2"
opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = ["kern", "vert", "vrt2"]
opts.name_IDs = ["*"]
opts.notdef_outline = True
font = subset.load_font(src, opts)
s = subset.Subsetter(opts)
s.populate(text="".join(sorted(chars)))
s.subset(font)
subset.save_font(font, str(out), opts)
print(f"{len(chars)} 字 → {out.relative_to(root)}（{out.stat().st_size // 1024} KB）")
