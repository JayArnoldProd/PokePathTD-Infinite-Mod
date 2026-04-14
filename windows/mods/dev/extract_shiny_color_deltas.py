#!/usr/bin/env python3
from __future__ import annotations

import colorsys
import json
import math
import re
import statistics
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(r"C:\Users\jayar\Documents\GitHub\PokePath-TD-Mods\windows\mods")
DEV_DIR = ROOT / "dev"
PATCH_DIR = ROOT / "patches" / "shiny_sprites"
POKEMON_DATA_FILE = DEV_DIR / "pokemon_data.json"
REPORT_FILE = DEV_DIR / "shiny_color_extraction_report.json"
SOURCE_URL = "https://pokemondb.net/pokedex/shiny"

HTML_PAIR_RE = re.compile(
    r'src="(?P<normal>https://img\.pokemondb\.net/sprites/home/normal/2x/(?P<slug>[^"/]+)\.jpg)"[^>]*?>\s*<img class="img-fixed shinydex-sprite shinydex-sprite-shiny" src="(?P<shiny>https://img\.pokemondb\.net/sprites/home/shiny/2x/[^"/]+\.jpg)"',
    re.S,
)

DB_SLUG_MAP = {
    "aegislash": "aegislash-shield",
    "aegislashSword": "aegislash-blade",
    "lycanrocDay": "lycanroc-midday",
    "lycanrocNight": "lycanroc-midnight",
    "nidoranF": "nidoran-f",
    "nidoranM": "nidoran-m",
    "farfetchd": "farfetchd",
    "sirfetchd": "sirfetchd",
    "mrMime": "mr-mime",
    "mimeJr": "mime-jr",
    "missingNo": None,
}


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as response:
        return response.read().decode("utf-8", errors="replace")


def fetch_image(url: str) -> Image.Image:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as response:
        return Image.open(BytesIO(response.read())).convert("RGB")


def circular_mean_degrees(values: list[float]) -> float | None:
    if not values:
        return None
    sin_sum = sum(math.sin(math.radians(v)) for v in values)
    cos_sum = sum(math.cos(math.radians(v)) for v in values)
    if abs(sin_sum) < 1e-9 and abs(cos_sum) < 1e-9:
        return None
    angle = math.degrees(math.atan2(sin_sum, cos_sum))
    return (angle + 360.0) % 360.0


def hue_delta_degrees(source: float | None, target: float | None) -> float | None:
    if source is None or target is None:
        return None
    delta = (target - source + 180.0) % 360.0 - 180.0
    return round(delta, 2)


def analyze_image(img: Image.Image) -> dict:
    kept_rgb: list[tuple[int, int, int]] = []
    hues: list[float] = []
    sats: list[float] = []
    vals: list[float] = []

    for r, g, b in img.getdata():
        if r >= 245 and g >= 245 and b >= 245:
            continue
        if r <= 15 and g <= 15 and b <= 15:
            continue
        h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
        if v >= 0.97 and s <= 0.08:
            continue
        if v <= 0.07:
            continue
        if s <= 0.06 and (v >= 0.92 or v <= 0.12):
            continue
        kept_rgb.append((r, g, b))
        sats.append(s)
        vals.append(v)
        if s > 0.08:
            hues.append(h * 360.0)

    if not kept_rgb:
        raise RuntimeError("No usable pixels after filtering")

    avg_r = round(sum(px[0] for px in kept_rgb) / len(kept_rgb))
    avg_g = round(sum(px[1] for px in kept_rgb) / len(kept_rgb))
    avg_b = round(sum(px[2] for px in kept_rgb) / len(kept_rgb))
    avg_h = circular_mean_degrees(hues)
    avg_s = round(statistics.fmean(sats), 4)
    avg_v = round(statistics.fmean(vals), 4)

    return {
        "pixel_count": len(kept_rgb),
        "average_rgb": [avg_r, avg_g, avg_b],
        "average_hex": f"#{avg_r:02X}{avg_g:02X}{avg_b:02X}",
        "average_hue_deg": None if avg_h is None else round(avg_h, 2),
        "average_saturation": avg_s,
        "average_value": avg_v,
    }


def extract_pairs(html: str) -> dict[str, dict[str, str]]:
    pairs: dict[str, dict[str, str]] = {}
    for match in HTML_PAIR_RE.finditer(html):
        slug = match.group("slug")
        pairs[slug] = {
            "normal": match.group("normal"),
            "shiny": match.group("shiny"),
        }
    return pairs


def load_missing_nonfinal_keys() -> list[str]:
    data = json.loads(POKEMON_DATA_FILE.read_text(encoding="utf-8"))
    shiny_files = {p.stem for p in PATCH_DIR.glob("*.png")}
    keys: list[str] = []
    for key in data.get("allKeys", []):
        evo = data.get("evolutions", {}).get(key)
        if not evo or not evo.get("evolves_to"):
            continue
        if key in shiny_files:
            continue
        keys.append(key)
    return keys


def main() -> None:
    html = fetch_text(SOURCE_URL)
    pairs = extract_pairs(html)
    keys = load_missing_nonfinal_keys()

    report = {
        "source": SOURCE_URL,
        "selection_rule": "pokemon_data.json keys that still evolve and do not yet have a bundled shiny sprite in windows/mods/patches/shiny_sprites",
        "pokemon_count": len(keys),
        "pokemon": {},
    }

    for key in keys:
        slug = DB_SLUG_MAP.get(key, key)
        if slug is None:
            report["pokemon"][key] = {"error": "No external slug mapping available"}
            continue
        if slug not in pairs:
            report["pokemon"][key] = {"error": f"No Pokémon DB sprite pair found for slug '{slug}'"}
            continue

        normal_img = fetch_image(pairs[slug]["normal"])
        shiny_img = fetch_image(pairs[slug]["shiny"])
        normal = analyze_image(normal_img)
        shiny = analyze_image(shiny_img)
        report["pokemon"][key] = {
            "pokemondb_slug": slug,
            "normal_url": pairs[slug]["normal"],
            "shiny_url": pairs[slug]["shiny"],
            "normal": normal,
            "shiny": shiny,
            "hue_shift_deg": hue_delta_degrees(normal["average_hue_deg"], shiny["average_hue_deg"]),
        }

    REPORT_FILE.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote {REPORT_FILE}")


if __name__ == "__main__":
    main()
