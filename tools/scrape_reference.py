#!/usr/bin/env python3
"""
One-off content extraction helper.

Reads the legacy TPI Homes WordPress site and writes a normalised JSON payload
(`backend/data/seed-data.json`) that the Strapi seed script consumes.

This is a migration/bootstrap tool only. It is not part of the runtime app and
is safe to delete once content is managed in Strapi.

Usage:
    python3 tools/scrape_reference.py [--limit 40]
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any

BASE = "https://www.tpihomes.com.ng"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
)
OUT = Path(__file__).resolve().parents[1] / "backend" / "data" / "seed-data.json"

SPEC_LABELS = {
    "Property type:": "propertyTypes",
    "Offer type:": "offerTypes",
    "City:": "cities",
    "Bedrooms:": "bedrooms",
    "Bathrooms:": "bathrooms",
    "Toilets:": "toilets",
    "Plot size:": "plotSize",
    "Area:": "areaSize",
}


def fetch(url: str, timeout: int = 40) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
        return resp.read().decode("utf-8", "ignore")


def fetch_json(url: str) -> Any:
    return json.loads(fetch(url))


def strip_tags(raw: str) -> str:
    raw = re.sub(r"(?s)<(script|style)[^>]*>.*?</\1>", "", raw or "")
    return html.unescape(re.sub(r"<[^>]+>", " ", raw))


def collapse(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def text_lines(raw_html: str) -> list[str]:
    """Flatten HTML into de-duplicated visible text lines."""
    flat = html.unescape(
        re.sub(r"<[^>]+>", "\n", re.sub(r"(?s)<(script|style)[^>]*>.*?</\1>", "", raw_html))
    )
    lines: list[str] = []
    for line in flat.split("\n"):
        line = collapse(line)
        if line and (not lines or lines[-1] != line):
            lines.append(line)
    return lines


def parse_price(lines: list[str]) -> tuple[int | None, str | None]:
    """First standalone naira amount on the page is the headline price."""
    for line in lines[:80]:
        m = re.fullmatch(r"₦\s?([\d,]+(?:\.\d+)?)", line)
        if m:
            digits = m.group(1).replace(",", "")
            try:
                return int(float(digits)), line
            except ValueError:
                return None, line
    return None, None


def parse_specs(lines: list[str]) -> dict[str, Any]:
    """Read `Label:` followed by one or more value lines (commas are separators)."""
    specs: dict[str, Any] = {}
    for idx, line in enumerate(lines):
        key = SPEC_LABELS.get(line)
        if not key:
            continue
        values: list[str] = []
        for nxt in lines[idx + 1 : idx + 12]:
            if nxt == ",":
                continue
            if nxt in SPEC_LABELS or nxt.endswith(":") or len(nxt) > 60:
                break
            values.append(nxt)
            if key in {"bedrooms", "bathrooms", "toilets", "plotSize", "areaSize"}:
                break
        if not values:
            continue
        if key in {"bedrooms", "bathrooms", "toilets"}:
            digits = re.sub(r"\D", "", values[0])
            if digits:
                specs[key] = int(digits)
        elif key in {"plotSize", "areaSize"}:
            specs[key] = values[0]
        else:
            specs[key] = values
    return specs


def parse_gallery(raw_html: str, featured: str | None) -> list[str]:
    """Collect large uploaded images, de-duplicating WP size variants."""
    urls = re.findall(
        r"https://www\.tpihomes\.com\.ng/wp-content/uploads/[^\"'\\ >]+?\.(?:jpg|jpeg|png|webp)",
        raw_html,
        re.I,
    )
    seen: dict[str, str] = {}
    for url in urls:
        if re.search(r"(logo|icon|avatar|placeholder|favicon|trustindex|flag)", url, re.I):
            continue
        # normalise "name-1024x683.jpg" -> "name.jpg" so variants collapse
        base = re.sub(r"-\d{2,4}x\d{2,4}(?=\.[a-z]+$)", "", url)
        seen.setdefault(base, base)
    gallery = list(seen.values())
    if featured:
        featured_base = re.sub(r"-\d{2,4}x\d{2,4}(?=\.[a-z]+$)", "", featured)
        if featured_base in gallery:
            gallery.remove(featured_base)
        gallery.insert(0, featured_base)
    return gallery[:12]


def parse_description(raw_html: str) -> str:
    """Extract the body copy that follows the 'Property Details' heading."""
    marker = raw_html.find("Property Details")
    segment = raw_html[marker:] if marker != -1 else raw_html
    paragraphs = re.findall(r"(?s)<p[^>]*>(.*?)</p>", segment)
    chunks: list[str] = []
    for para in paragraphs:
        text = collapse(strip_tags(para))
        if len(text) < 40:
            continue
        if re.search(r"(cookie|subscribe|Trustindex|©|All rights reserved)", text, re.I):
            continue
        chunks.append(text)
        if len(chunks) >= 12:
            break
    return "\n\n".join(chunks)


def parse_features(lines: list[str]) -> list[str]:
    """Bullet-ish landmark/feature lines (the site prefixes them with emoji)."""
    features: list[str] = []
    for line in lines:
        m = re.match(r"^[📍✅▶️🔥🏡🏠•]\s*(.{3,70})$", line)
        if m:
            value = collapse(m.group(1)).lstrip("-–— ")
            if value and value not in features:
                features.append(value)
    return features[:14]


def taxonomy(rest_base: str) -> list[dict[str, Any]]:
    try:
        terms = fetch_json(f"{BASE}/wp-json/wp/v2/{rest_base}?per_page=100&orderby=count&order=desc")
    except Exception as exc:  # noqa: BLE001
        print(f"  ! taxonomy {rest_base} failed: {exc}", file=sys.stderr)
        return []
    return [
        {
            "name": html.unescape(t["name"]),
            "slug": t["slug"],
            "count": t.get("count", 0),
            "description": collapse(strip_tags(t.get("description", ""))),
        }
        for t in terms
        if isinstance(t, dict) and t.get("count", 0) > 0
    ]


def scrape_properties(limit: int) -> list[dict[str, Any]]:
    listing = fetch_json(
        f"{BASE}/wp-json/wp/v2/estate?per_page={limit}&_embed=wp:featuredmedia&orderby=date&order=desc"
    )
    results: list[dict[str, Any]] = []
    for i, item in enumerate(listing, start=1):
        slug = item["slug"]
        title = collapse(html.unescape(item["title"]["rendered"]))
        print(f"  [{i}/{len(listing)}] {slug[:64]}")
        try:
            page = fetch(item["link"])
        except Exception as exc:  # noqa: BLE001
            print(f"      ! skipped: {exc}", file=sys.stderr)
            continue

        lines = text_lines(page)
        featured = None
        try:
            featured = item["_embedded"]["wp:featuredmedia"][0]["source_url"]
        except Exception:  # noqa: BLE001
            pass

        price, price_label = parse_price(lines)
        specs = parse_specs(lines)
        yoast = item.get("yoast_head_json") or {}
        excerpt = collapse(strip_tags(item.get("excerpt", {}).get("rendered", "")))
        excerpt = re.sub(r"\[…\]$|\[\.\.\.\]$", "", excerpt).strip()

        results.append(
            {
                "slug": slug,
                "title": title,
                "price": price,
                "priceLabel": price_label,
                "excerpt": excerpt[:400],
                "metaDescription": (yoast.get("og_description") or excerpt)[:300],
                "description": parse_description(page) or excerpt,
                "featuredImage": featured,
                "gallery": parse_gallery(page, featured),
                "features": parse_features(lines),
                "publishedAt": item.get("date"),
                **specs,
            }
        )
    return results


def scrape_posts(limit: int = 8) -> list[dict[str, Any]]:
    posts = fetch_json(
        f"{BASE}/wp-json/wp/v2/posts?per_page={limit}&_embed=wp:featuredmedia&orderby=date&order=desc"
    )
    out: list[dict[str, Any]] = []
    for post in posts:
        featured = None
        try:
            featured = post["_embedded"]["wp:featuredmedia"][0]["source_url"]
        except Exception:  # noqa: BLE001
            pass
        body = "\n\n".join(
            collapse(strip_tags(p))
            for p in re.findall(r"(?s)<p[^>]*>(.*?)</p>", post["content"]["rendered"])
            if len(collapse(strip_tags(p))) > 40
        )
        out.append(
            {
                "slug": post["slug"],
                "title": collapse(html.unescape(post["title"]["rendered"])),
                "excerpt": collapse(strip_tags(post["excerpt"]["rendered"]))[:300],
                "content": body,
                "coverImage": featured,
                "publishedAt": post.get("date"),
            }
        )
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=40, help="number of properties to pull")
    args = ap.parse_args()

    print("Scraping taxonomies…")
    payload: dict[str, Any] = {
        "source": BASE,
        "propertyTypes": taxonomy("property-type"),
        "offerTypes": taxonomy("offer-type"),
        "cities": taxonomy("city"),
        "features": taxonomy("features"),
    }
    for key in ("propertyTypes", "offerTypes", "cities", "features"):
        print(f"  {key}: {len(payload[key])}")

    print("Scraping properties…")
    payload["properties"] = scrape_properties(args.limit)

    print("Scraping posts…")
    payload["posts"] = scrape_posts()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    priced = sum(1 for p in payload["properties"] if p.get("price"))
    print(
        f"\nWrote {OUT}\n"
        f"  properties: {len(payload['properties'])} ({priced} with price)\n"
        f"  posts: {len(payload['posts'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
