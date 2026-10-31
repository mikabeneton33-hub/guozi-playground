# 遠端 zip 讀取工具（build-voice-map.py 使用）。
# 用 HTTP Range 讀遠端 zip（含 7-zip 式分卷 .001…），只抓需要的檔。
import struct, subprocess, zlib, json, os, sys, re, time
class Remote:
    def __init__(self, urls):
        self.urls = urls; self.sizes = []
        for u in urls:
            for k in range(5):
                r = subprocess.run(["curl", "-sSI", "-m", "60", u], capture_output=True, text=True)
                if r.returncode == 0: h = r.stdout; break
                time.sleep(3 * (k + 1))
            else: raise RuntimeError("HEAD failed " + u)
            self.sizes.append(int(re.findall(r"(?i)content-length:\s*(\d+)", h)[-1]))
        self.total = sum(self.sizes)
    def read(self, off, n):
        out = b""; base = 0
        for u, sz in zip(self.urls, self.sizes):
            if off < base + sz and off + n > base:
                a = max(off, base) - base; b = min(off + n, base + sz) - base - 1
                for k in range(4):
                    r = subprocess.run(["curl", "-sS", "-f", "-m", "300", "-r", f"{a}-{b}", u], capture_output=True)
                    if r.returncode == 0 and len(r.stdout) == b - a + 1: out += r.stdout; break
                    if k == 3: raise RuntimeError(f"range failed {u} {a}-{b}: {r.stderr[:200]}")
                    time.sleep(2 * (k + 1))
            base += sz
        return out
def central_dir(R):
    tail = R.read(R.total - 70000, 70000); i = tail.rfind(b"PK\x05\x06")
    eocd = tail[i:]
    cd_n, cd_size, cd_off = struct.unpack("<HII", eocd[10:20])
    if cd_off == 0xFFFFFFFF or cd_n == 0xFFFF:
        j = tail.rfind(b"PK\x06\x07"); loc_off = struct.unpack("<Q", tail[j+8:j+16])[0]
        z = R.read(loc_off, 56); cd_n, cd_size, cd_off = struct.unpack("<QQQ", z[32:56])
    cd = R.read(cd_off, cd_size); p = 0; ents = {}
    while p < len(cd) and cd[p:p+4] == b"PK\x01\x02":
        method, = struct.unpack("<H", cd[p+10:p+12]); csize, usize = struct.unpack("<II", cd[p+20:p+28])
        nl, el, cl = struct.unpack("<HHH", cd[p+28:p+34]); lho, = struct.unpack("<I", cd[p+42:p+46])
        name = cd[p+46:p+46+nl]; extra = cd[p+46+nl:p+46+nl+el]
        q = 0
        while q < len(extra):
            hid, hl = struct.unpack("<HH", extra[q:q+4])
            if hid == 1:
                vals = extra[q+4:q+4+hl]; k = 0
                if usize == 0xFFFFFFFF: usize, = struct.unpack("<Q", vals[k:k+8]); k += 8
                if csize == 0xFFFFFFFF: csize, = struct.unpack("<Q", vals[k:k+8]); k += 8
                if lho == 0xFFFFFFFF: lho, = struct.unpack("<Q", vals[k:k+8]); k += 8
            q += 4 + hl
        try: name = name.decode("utf8")
        except: name = name.decode("cp950", "replace")
        ents[name] = (method, csize, usize, lho)
        p += 46 + nl + el + cl
    return ents
def extract(R, ent):
    method, csize, usize, lho = ent
    h = R.read(lho, 30); nl, el = struct.unpack("<HH", h[26:30])
    data = R.read(lho + 30 + nl + el, csize)
    return data if method == 0 else zlib.decompress(data, -15)
