#!/usr/bin/env python3
"""Generate one neural MP3 using edge-tts.

The Node API calls this script with a JSON payload on stdin so verse text is
never interpolated into a shell command.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import edge_tts


async def main() -> None:
    payload = json.loads(sys.stdin.read())
    text = str(payload.get("text", "")).strip()
    voice = str(payload.get("voice", ""))
    output = Path(str(payload["output"]))
    rate = str(payload.get("rate", "+0%"))

    if not text or not voice or not output.name:
        raise ValueError("text, voice, and output are required")

    output.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    temporary = output.with_suffix(output.suffix + ".part")
    await communicate.save(str(temporary))
    temporary.replace(output)
    print(json.dumps({"ok": True, "output": str(output), "bytes": output.stat().st_size}))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(error)}), file=sys.stderr)
        raise SystemExit(1)
