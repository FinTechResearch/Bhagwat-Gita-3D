#!/usr/bin/env python3
"""Project BhagwatGita.db into the typed JSON consumed by the web client.

The SQLite file remains the source of truth. This deliberately uses Python's
standard-library sqlite3 module so contributors do not need native Node SQLite
bindings just to refresh the content projection.
"""

from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "BhagwatGita.db"
OUT_PATH = ROOT / "src" / "data" / "gita.json"

PALETTES = {
    "battlefield": {"primary": "#f06b4f", "secondary": "#27142e", "accent": "#f4c56a", "fog": "#120c21"},
    "sankhya": {"primary": "#7184ff", "secondary": "#161a46", "accent": "#9de7ff", "fog": "#080b24"},
    "karma": {"primary": "#f3a856", "secondary": "#352119", "accent": "#ffe3a1", "fog": "#17101a"},
    "knowledge": {"primary": "#49d6c0", "secondary": "#102c3d", "accent": "#d4fff1", "fog": "#071a28"},
    "renunciation": {"primary": "#b995ff", "secondary": "#241447", "accent": "#f5d7ff", "fog": "#100b2a"},
    "meditation": {"primary": "#6dd9ec", "secondary": "#152849", "accent": "#e0fff5", "fog": "#07152b"},
    "wisdom": {"primary": "#8e9cff", "secondary": "#20215b", "accent": "#d6e0ff", "fog": "#0a0d2a"},
    "akshara": {"primary": "#c18cff", "secondary": "#2c1556", "accent": "#f4d7ff", "fog": "#130b2c"},
    "royal": {"primary": "#5b9cff", "secondary": "#101e4c", "accent": "#d1e7ff", "fog": "#060d28"},
    "vibhuti": {"primary": "#ff966b", "secondary": "#3b1732", "accent": "#ffe1ae", "fog": "#1a0c22"},
    "vishvarupa": {"primary": "#dc6dff", "secondary": "#211653", "accent": "#ffd88e", "fog": "#0c0824"},
    "bhakti": {"primary": "#ff83ad", "secondary": "#451a42", "accent": "#ffe2b5", "fog": "#1a0b23"},
    "field": {"primary": "#69b9ff", "secondary": "#173d55", "accent": "#ffc981", "fog": "#071725"},
    "guṇa": {"primary": "#e69a6b", "secondary": "#342238", "accent": "#9de7ff", "fog": "#140d23"},
    "purushottama": {"primary": "#ffd36b", "secondary": "#39234f", "accent": "#fff0bd", "fog": "#160d28"},
    "daivasura": {"primary": "#ab7bff", "secondary": "#291548", "accent": "#ff8e9b", "fog": "#100923"},
    "shraddha": {"primary": "#f2b774", "secondary": "#2a2947", "accent": "#a5eaff", "fog": "#0d1028"},
    "moksha": {"primary": "#b7b1ff", "secondary": "#252153", "accent": "#f7e4ad", "fog": "#090a24"},
}

CHAPTER_PALETTES = {
    1: "battlefield", 2: "sankhya", 3: "karma", 4: "knowledge", 5: "renunciation",
    6: "meditation", 7: "wisdom", 8: "akshara", 9: "royal", 10: "vibhuti",
    11: "vishvarupa", 12: "bhakti", 13: "field", 14: "guṇa", 15: "purushottama",
    16: "daivasura", 17: "shraddha", 18: "moksha",
}

THEME_RULES = [
    ("war", ("war", "battle", "kuru", "weapon", "army", "fight", "killed", "warrior", "dharmakshetra")),
    ("soul", ("soul", "atman", "jiva", "immortal", "eternal", "changeless", "individual", "purusha")),
    ("meditation", ("meditation", "meditate", "dhyana", "yoga", "stillness", "concentrate", "lotus")),
    ("divine", ("krishna", "lord", "divine", "vishvarupa", "universal", "supreme", "bhagavan", "grace")),
    ("knowledge", ("knowledge", "jnana", "truth", "wisdom", "understand", "discern", "light of knowledge")),
    ("action", ("karma", "action", "work", "duty", "perform", "fruit", "detached")),
    ("devotion", ("bhakti", "devotion", "worship", "love", "surrender", "remember me")),
    ("nature", ("guna", "sattva", "rajas", "tamas", "nature", "quality")),
]

KEYWORD_LABELS = {
    "war": "Battlefield resonance",
    "soul": "Soul current",
    "meditation": "Lotus meditation",
    "divine": "Divine radiance",
    "knowledge": "Inner knowing",
    "action": "Sacred action",
    "devotion": "Devotional field",
    "nature": "Threefold nature",
    "cosmos": "Cosmic revelation",
}

SYMBOLS = ["✦", "◈", "☼", "⌁", "◌", "❋", "◇", "✧", "◒", "♢", "✺", "❂", "◉", "☽", "✵", "⚝", "✣", "∞"]

TRANSLATION_AUTHORS = {
    "english": ["Swami Adidevananda", "Swami Gambirananda"],
    "hindi": ["Swami Tejomayananda", "Swami Ramsukhdas"],
}

COMMENTARY_AUTHORS = ["Swami Sivananda", "Swami Ramsukhdas"]


def clean(value: str) -> str:
    value = value.replace("\xa0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def shorten(value: str, limit: int = 1500) -> str:
    value = clean(value)
    if len(value) <= limit:
        return value
    return value[:limit].rsplit(" ", 1)[0] + "…"


def editorial_summary(text: str) -> str:
    """Create a compact interpretive lead for the reading panel."""
    cleaned = clean(text)
    if not cleaned:
        return ""
    first_sentence = re.split(r"(?<=[.!?])\s+", cleaned)[0]
    return shorten(first_sentence, 280)


def choose_theme(chapter: int, text: str) -> tuple[str, list[str]]:
    lower = text.lower()
    scores: dict[str, int] = {}
    found: dict[str, list[str]] = {}
    for theme, words in THEME_RULES:
        hits = [word for word in words if word in lower]
        if hits:
            scores[theme] = len(hits) + (2 if theme in {"war", "soul", "divine"} and chapter in {1, 11, 18} else 0)
            found[theme] = hits
    if chapter == 11:
        return "cosmos", found.get("divine", []) + ["cosmic form"]
    if scores:
        theme = max(scores, key=scores.get)
        return theme, found[theme][:4]
    return "cosmos", ["sacred field"]


def main() -> None:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row

    chapters: list[dict[str, Any]] = []
    for row in con.execute("SELECT * FROM chapters ORDER BY chapter_number"):
        number = row["chapter_number"]
        palette_name = CHAPTER_PALETTES.get(number, "moksha")
        chapters.append({
            "id": row["id"],
            "chapterNumber": number,
            "name": row["name"],
            "nameMeaning": row["name_meaning"],
            "nameTranslation": row["name_translation"],
            "nameTransliterated": row["name_transliterated"],
            "summary": clean(row["chapter_summary"]),
            "summaryHindi": clean(row["chapter_summary_hindi"]),
            "verseCount": row["verses_count"],
            "scene": PALETTES[palette_name],
            "symbol": SYMBOLS[(number - 1) % len(SYMBOLS)],
        })

    verses: list[dict[str, Any]] = []
    for row in con.execute("SELECT * FROM verses ORDER BY verse_order"):
        translation_rows = list(con.execute(
            "SELECT lang, author_name, description FROM translations WHERE verse_id = ? AND lang IN ('english', 'hindi')",
            (row["id"],),
        ))
        translation_options = [
            {
                "language": translation["lang"],
                "author": translation["author_name"],
                "text": clean(translation["description"]),
            }
            for translation in translation_rows
            if translation["author_name"] in TRANSLATION_AUTHORS.get(translation["lang"], [])
        ]
        translations = {
            language: next(
                (option["text"] for option in translation_options if option["language"] == language and option["author"] == author),
                "",
            )
            for language, author in (("english", "Swami Adidevananda"), ("hindi", "Swami Tejomayananda"))
        }

        commentary_rows = list(con.execute(
            "SELECT lang, author_name, description FROM commentaries WHERE verse_id = ? AND author_name IN (?, ?)",
            (row["id"], *COMMENTARY_AUTHORS),
        ))
        commentary_options = [
            {
                "language": commentary["lang"],
                "author": commentary["author_name"],
                "text": shorten(commentary["description"], 900),
            }
            for commentary in commentary_rows
        ]
        default_commentary = next(
            (option for option in commentary_options if option["language"] == "english"),
            commentary_options[0] if commentary_options else None,
        )
        recitation_row = con.execute(
            "SELECT audio_url FROM verse_recitations WHERE verse_id = ?",
            (row["id"],),
        ).fetchone()
        searchable = " ".join((row["text"], row["transliteration"], translations.get("english", ""), translations.get("hindi", "")))
        theme, keywords = choose_theme(row["chapter_number"], searchable)
        chapter_palette = PALETTES[CHAPTER_PALETTES.get(row["chapter_number"], "moksha")]
        palette_name = {
            "war": "battlefield", "soul": "sankhya", "meditation": "meditation", "divine": "vishvarupa",
            "knowledge": "knowledge", "action": "karma", "devotion": "bhakti", "nature": "guṇa",
        }.get(theme, CHAPTER_PALETTES.get(row["chapter_number"], "moksha"))
        verses.append({
            "id": row["id"],
            "externalId": row["external_id"],
            "chapterId": row["chapter_id"],
            "chapterNumber": row["chapter_number"],
            "verseNumber": row["verse_number"],
            "verseOrder": row["verse_order"],
            "title": row["title"],
            "sanskrit": clean(row["text"]),
            "transliteration": clean(row["transliteration"]),
            "wordMeanings": clean(row["word_meanings"]),
            "translations": {"hindi": translations.get("hindi", ""), "english": translations.get("english", "")},
            "translationOptions": translation_options,
            "editorialSummary": editorial_summary(translations.get("english", "")),
            "commentary": shorten(default_commentary["text"], 420) if default_commentary else "",
            "commentaryAuthor": default_commentary["author"] if default_commentary else "",
            "commentaryOptions": commentary_options,
            "audioUrl": recitation_row["audio_url"] if recitation_row else "",
            "theme": theme,
            "keywords": keywords,
            "scene": PALETTES[palette_name],
        })

    payload = {
        "chapters": chapters,
        "verses": verses,
        "metadata": {
            "title": "Bhagavad Gita",
            "source": "BhagwatGita.db",
            "verseCount": len(verses),
            "chapterCount": len(chapters),
        },
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(verses)} verses across {len(chapters)} chapters to {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
