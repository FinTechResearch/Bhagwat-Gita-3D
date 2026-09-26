#!/usr/bin/env python3
"""Fast integrity checks for the generated browser content projection."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "src" / "data" / "gita.json"


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    chapters = data["chapters"]
    verses = data["verses"]
    assert len(chapters) == 18, f"expected 18 chapters, got {len(chapters)}"
    assert len(verses) == 701, f"expected 701 verses, got {len(verses)}"
    assert len({verse["id"] for verse in verses}) == len(verses), "duplicate verse id"
    assert len({verse["externalId"] for verse in verses}) == len(verses), "duplicate external id"

    chapter_counts = {chapter["chapterNumber"]: chapter["verseCount"] for chapter in chapters}
    actual_counts = {number: 0 for number in chapter_counts}
    for verse in verses:
        assert verse["translations"]["hindi"], f"missing Hindi: {verse['id']}"
        assert verse["translations"]["english"], f"missing English: {verse['id']}"
        assert verse["sanskrit"], f"missing Sanskrit: {verse['id']}"
        assert verse["editorialSummary"], f"missing editorial summary: {verse['id']}"
        assert verse["audioUrl"].startswith("https://"), f"missing recitation URL: {verse['id']}"
        languages = {option["language"] for option in verse["translationOptions"]}
        assert languages == {"hindi", "english"}, f"missing translation options: {verse['id']}"
        assert len(verse["commentaryOptions"]) >= 1, f"missing commentary options: {verse['id']}"
        assert verse["chapterNumber"] in actual_counts, f"unknown chapter: {verse['chapterNumber']}"
        actual_counts[verse["chapterNumber"]] += 1

    assert actual_counts == chapter_counts, f"chapter count mismatch: {actual_counts} != {chapter_counts}"
    print(f"OK: {len(verses)} verses, {len(chapters)} chapters, all required translations present")


if __name__ == "__main__":
    main()
