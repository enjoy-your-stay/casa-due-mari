#!/usr/bin/env python3
"""
Prepara le foto per la galleria della vetrina.

Uso:
    python3 tools/prepare_photos.py <cartella-con-le-foto>

Per ogni foto (jpg/jpeg/png/webp), in ordine alfabetico di nome file:
  - crea  assets/img/foto/NN-nome.jpg        (lato lungo max 1600 px)
  - crea  assets/img/foto/thumb/NN-nome.jpg  (lato lungo max 640 px)
    (nella pagina il browser sceglie tra le due con srcset)
  - rigenera la lista tra <!-- GALLERY:START --> e <!-- GALLERY:END --> in index.html

Didascalia = nome del file senza numeri iniziali, con i trattini come spazi:
  "03-camera-da-letto.jpg"  ->  "Camera da letto"
Rinominate i file per scegliere ordine e didascalie. La prima foto è quella in evidenza.

Le foto già presenti in assets/img/foto/ vengono sostituite.
Richiede Pillow (pip install pillow).
"""
import html
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "foto"
THUMBS = OUT / "thumb"
INDEX = ROOT / "index.html"
EXTS = {".jpg", ".jpeg", ".png", ".webp"}
FULL_SIZE = 1600
THUMB_SIZE = 640


def caption_from(name: str) -> str:
    stem = re.sub(r"^[\d\s._-]+", "", Path(name).stem)
    words = re.sub(r"[-_]+", " ", stem).strip()
    return (words[:1].upper() + words[1:]) if words else "La Casa dei Due Mari"


def slug(text: str) -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-") or "foto"


def save(img: Image.Image, path: Path, size: int, quality: int) -> int:
    """Salva ridimensionata e restituisce la larghezza ottenuta (serve per srcset)."""
    im = img.copy()
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    return im.width


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in EXTS)
    if not files:
        sys.exit(f"Nessuna foto trovata in {src}")

    THUMBS.mkdir(parents=True, exist_ok=True)
    for old in list(OUT.glob("*.jpg")) + list(THUMBS.glob("*.jpg")):
        old.unlink()

    rows = []
    for i, f in enumerate(files, 1):
        cap = caption_from(f.name)
        name = f"{i:02d}-{slug(cap)}.jpg"
        with Image.open(f) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            w_full = save(im, OUT / name, FULL_SIZE, 82)
            w_thumb = save(im, THUMBS / name, THUMB_SIZE, 78)
        c = html.escape(cap, quote=True)
        full, thumb = f"assets/img/foto/{name}", f"assets/img/foto/thumb/{name}"
        # nel nastro ogni foto occupa circa mezzo schermo: il browser sceglie la versione giusta
        srcset = f"{thumb} {w_thumb}w, {full} {w_full}w" if w_full > w_thumb else full
        rows.append(
            f'        <li><a href="{full}" data-caption="{c}">'
            f'<img src="{thumb}" srcset="{srcset}" sizes="50vw" alt="{c}" loading="lazy"></a></li>'
        )
        print(f"{f.name}  ->  {name}  ({cap})")

    page = INDEX.read_text(encoding="utf-8")
    block = "<!-- GALLERY:START -->\n" + "\n".join(rows) + "\n        <!-- GALLERY:END -->"
    page, n = re.subn(r"<!-- GALLERY:START -->.*?<!-- GALLERY:END -->", lambda _: block, page, flags=re.S)
    if n != 1:
        sys.exit("Marcatori GALLERY:START / GALLERY:END non trovati in index.html")

    # la prima foto diventa anche l'anteprima per i link condivisi e per Google
    first = f"https://enjoy-your-stay.github.io/casa-due-mari/assets/img/foto/{slug_first(files)}"
    page = re.sub(r'(<meta property="og:image" content=")[^"]*(")', lambda m: m.group(1) + first + m.group(2), page)
    page = re.sub(r'("image": ")[^"]*(")', lambda m: m.group(1) + first + m.group(2), page)

    INDEX.write_text(page, encoding="utf-8")
    print(f"\n{len(rows)} foto pronte, index.html aggiornato.")


def slug_first(files) -> str:
    return f"01-{slug(caption_from(files[0].name))}.jpg"


if __name__ == "__main__":
    main()
