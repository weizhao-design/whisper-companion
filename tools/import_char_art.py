"""Turn five generated portrait frames into the app's animated portrait files.

Put five images for one character in a folder, named (jpg or png):
    base        eyes open, gentle closed-mouth smile
    half        same picture, eyelids half closed
    closed      same picture, eyes closed
    talk_small  same picture, mouth slightly open
    talk_open   same picture, mouth open

Then run (from the whisper-companion folder):
    python tools/import_char_art.py wenxu "D:/path/to/wenxu_frames"

It writes chars/<id>/ (base, eye patches, talk frames) and prints the `look`
line to paste into js/data.js. The eye box is found automatically by
comparing the open-eye and closed-eye frames, so the five frames must share
exactly the same framing (generate the variants by editing the base image).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent.parent
NAMES = ["base", "half", "closed", "talk_small", "talk_open"]
OUT_SIZE = 360  # files are 360 px; boxes are expressed on a 480 px canvas


def load(folder, name):
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        p = folder / (name + ext)
        if p.exists():
            im = Image.open(p).convert("RGB")
            s = min(im.size)
            im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
            return im.resize((480, 480), Image.LANCZOS)
    raise SystemExit(f"missing {name}.png/.jpg in {folder}")


def diff_box(a, b, pad=8, thresh=40, region=None):
    d = np.abs(np.asarray(a, dtype=int) - np.asarray(b, dtype=int)).sum(2)
    if region:  # only look inside (x0, y0, x1, y1)
        m = np.zeros_like(d); x0, y0, x1, y1 = region; m[y0:y1, x0:x1] = 1; d = d * m
    ys, xs = np.where(d > thresh)
    if not len(xs):
        raise SystemExit("open- and closed-eye frames look identical")
    # ignore stray noise: keep the central 96% of changed pixels
    x0, x1 = np.percentile(xs, [2, 98]).astype(int)
    y0, y1 = np.percentile(ys, [2, 98]).astype(int)
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(479, x1 + pad), min(479, y1 + pad)
    return x0, y0, x1 - x0, y1 - y0


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    cid, folder = sys.argv[1], Path(sys.argv[2])
    f = {n: load(folder, n) for n in NAMES}
    ex, ey, ew, eh = diff_box(f["base"], f["closed"])
    # the mouth sits just below the eyes: search only that band so lighting or
    # hair differences elsewhere in the talking frame don't blow the box up
    band = (max(0, ex - 30), ey + eh + 6, min(480, ex + ew + 30), min(480, ey + eh + 150))
    mx, my, mw, mh = diff_box(f["base"], f["talk_open"], region=band)
    out = HERE / "chars" / cid
    out.mkdir(parents=True, exist_ok=True)
    k = OUT_SIZE / 480

    def save_full(img, name):
        img.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS).save(out / name, quality=86)

    def save_patch(img, box, name):
        x, y, w, h = box
        img.crop((x, y, x + w, y + h)).resize((round(w * k), round(h * k)), Image.LANCZOS).save(out / name, quality=88)

    save_full(f["base"], "base.jpg")
    save_full(f["talk_small"], "talk0.jpg")
    save_full(f["talk_open"], "talk2.jpg")
    eye_box = (ex, ey, ew, eh)
    mouth_box = (mx, my, mw, mh)
    save_patch(f["closed"], eye_box, "eye4.jpg")   # blink
    save_patch(f["half"], eye_box, "eye2.jpg")     # thinking
    save_patch(f["base"], eye_box, "eyeL2.jpg")    # listening: open eyes (no brow frame)
    save_patch(f["base"], mouth_box, "mouth4.jpg")  # calm mouth
    print(f"wrote {out}")
    print("paste into js/data.js for this character:")
    print(f"    look: {{ img: 'chars/{cid}/', eyeBox: [{ex}, {ey}, {ew}], mouthBox: [{mx}, {my}, {mw}], bg: ['#A898C2', '#4B3A63'] }},")


if __name__ == "__main__":
    main()
