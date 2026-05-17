#!/usr/bin/env python3
"""
Performance Lab — Descargador de fotos de acts desde Supabase
Crea una carpeta por cada act/personaje con todas sus imágenes.
"""

import os
import re
import json
import urllib.request
import urllib.parse
import urllib.error

# ── Config ────────────────────────────────────────────────────────────────────
# NOTE: Update these with your NEW Supabase credentials from .env
SUPABASE_URL = "https://szckmpiboisngkgeukga.supabase.co"
SUPABASE_KEY = "sb_publishable_lgiYJfsIQPseUmggHG7IeQ_8hyxXwMj"

# Destino: carpeta en tu escritorio
DEST = os.path.expanduser("~/Desktop/Performance Lab — Acts Backup")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def safe_name(name: str) -> str:
    """Convierte un nombre en un nombre de carpeta válido."""
    name = name.strip()
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    return name[:80] or "unnamed"


def supabase_get(table: str, select: str) -> list:
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={urllib.parse.quote(select)}&limit=1000"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def parse_gallery(gallery) -> list:
    if not gallery:
        return []
    if isinstance(gallery, str):
        try:
            gallery = json.loads(gallery)
        except Exception:
            return []
    if not isinstance(gallery, list):
        return []
    urls = []
    for item in gallery:
        if isinstance(item, str):
            urls.append(item)
        elif isinstance(item, dict) and item.get("url"):
            urls.append(item["url"])
    return urls


def is_image_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    if re.search(r'\.(mp4|webm|mov|avi)(\?|$)', url, re.I):
        return False
    if "youtube" in url or "youtu.be" in url:
        return False
    return True


def download(url: str, dest_path: str) -> bool:
    """Descarga una URL a dest_path. Devuelve True si tuvo éxito."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        with open(dest_path, "wb") as f:
            f.write(data)
        return True
    except Exception as e:
        print(f"    ⚠️  Error descargando {url[:60]}... → {e}")
        return False


def ext_from_url(url: str, idx: int) -> str:
    """Extrae la extensión del archivo de la URL, o usa .jpg por defecto."""
    path = urllib.parse.urlparse(url).path
    _, ext = os.path.splitext(path)
    ext = ext.split("?")[0].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"):
        ext = ".jpg"
    return ext


def download_act(folder: str, cover_url: str, gallery_urls: list):
    os.makedirs(folder, exist_ok=True)
    downloaded = 0

    # Cover photo
    if cover_url and is_image_url(cover_url):
        ext = ext_from_url(cover_url, 0)
        path = os.path.join(folder, f"cover{ext}")
        if not os.path.exists(path):
            if download(cover_url, path):
                print(f"    ✓ cover{ext}")
                downloaded += 1
        else:
            print(f"    – cover{ext} (ya existe)")

    # Gallery
    for i, url in enumerate(gallery_urls, 1):
        if not is_image_url(url):
            continue
        ext = ext_from_url(url, i)
        path = os.path.join(folder, f"gallery_{i:02d}{ext}")
        if not os.path.exists(path):
            if download(url, path):
                print(f"    ✓ gallery_{i:02d}{ext}")
                downloaded += 1
        else:
            print(f"    – gallery_{i:02d}{ext} (ya existe)")

    return downloaded

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Performance Lab — Descargador de Fotos")
    print(f"  Destino: {DEST}")
    print("=" * 60)

    total_acts = 0
    total_photos = 0

    # ── Acts ──────────────────────────────────────────────────────
    print("\n📂 Descargando ACTS…")
    try:
        acts = supabase_get(
            "acts",
            "id,name,web_custom_title,image_url,web_cover_image,web_gallery"
        )
        print(f"   {len(acts)} acts encontrados\n")

        for act in acts:
            name = act.get("web_custom_title") or act.get("name") or "sin-nombre"
            cover = act.get("web_cover_image") or act.get("image_url") or ""
            gallery = parse_gallery(act.get("web_gallery"))

            folder = os.path.join(DEST, "acts", safe_name(name))
            print(f"  🎭 {name}")
            n = download_act(folder, cover, gallery)
            total_acts += 1
            total_photos += n

    except Exception as e:
        print(f"  ❌ Error obteniendo acts: {e}")

    # ── Characters ────────────────────────────────────────────────
    print("\n📂 Descargando CHARACTERS (pld_characters)…")
    try:
        chars = supabase_get(
            "pld_characters",
            "id,name,web_custom_title,image,web_cover_image,web_gallery"
        )
        print(f"   {len(chars)} characters encontrados\n")

        for char in chars:
            name = char.get("web_custom_title") or char.get("name") or "sin-nombre"
            cover = char.get("web_cover_image") or char.get("image") or ""
            gallery = parse_gallery(char.get("web_gallery"))

            folder = os.path.join(DEST, "characters", safe_name(name))
            print(f"  🎭 {name}")
            n = download_act(folder, cover, gallery)
            total_acts += 1
            total_photos += n

    except Exception as e:
        print(f"  ❌ Error obteniendo characters: {e}")

    # ── Resumen ───────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"  ✅ Completado: {total_acts} acts · {total_photos} fotos nuevas")
    print(f"  📁 Carpeta: {DEST}")
    print("=" * 60)


if __name__ == "__main__":
    main()
