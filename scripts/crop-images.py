"""Generate responsive WebP crops from source photos.
Usage: python3 scripts/crop-images.py <office.webp> <consultation.webp>
Crop boxes are (left, top, right, bottom) in source pixels."""
import sys
from PIL import Image

office, consult = sys.argv[1], sys.argv[2]
JOBS = {
    # name: (source, box, widths)
    "hero":        (office,  (0, 0, 1216, 832),    [640, 960, 1216]),
    "intro":       (consult, (60, 0, 1080, 900),   [560, 900]),
    "service-ira": (office,  (250, 200, 850, 650), [480, 600]),
    "service-401k":(office,  (590, 300, 1216, 770),[480, 626]),
    "service-setup":(consult,(130, 480, 770, 900), [480, 640]),
    "about":       (office,  (0, 150, 600, 832),   [480, 600]),
}
for name, (src, box, widths) in JOBS.items():
    img = Image.open(src).convert("RGB").crop(box)
    for w in widths:
        h = round(img.height * w / img.width)
        img.resize((w, h), Image.LANCZOS).save(f"assets/img/{name}-{w}.webp", "WEBP", quality=78, method=6)
        print(name, w, h)
