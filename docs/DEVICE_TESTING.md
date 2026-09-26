# Device testing checklist

The automated quality pass runs a throttled iPhone 13 profile in `scripts/perf_check.mjs`. Physical-device verification still requires a small hardware lab because CPU, memory, audio codecs, and touch behavior cannot be fully reproduced by emulation.

## Minimum matrix

- iPhone SE (375 × 667, Safari iOS)
- iPhone 15 (393 × 852, Safari iOS)
- Pixel 7 (412 × 915, Chrome Android)
- Low-memory Android device with 4 GB RAM

## Checks

1. Load the hero and enter the reader.
2. Scroll through at least one chapter transition.
3. Play a recitation and confirm audio remains synchronized when changing verses.
4. Open chapter search with `/`.
5. Bookmark a verse, reload, and confirm it persists.
6. Open a `#verse-11-24` deep link directly.
7. Press `K` and confirm the cosmic field remains interactive.
8. Test reduced-motion mode and keyboard/screen-reader reading order.
9. Record load time, frame rate, audio failures, and any layout overflow.

## Performance targets

- Production load under 5 seconds on a throttled mobile profile.
- No horizontal overflow at 320px width.
- Reader remains responsive while scrolling.
- No more than one verse panel mounted in the normal reading view.
