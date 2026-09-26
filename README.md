# Gita — Cosmic Journey

An immersive, scroll-based reading experience for the Bhagavad Gita. The source database is `BhagwatGita.db`; the browser receives a typed, compact projection of its 18 chapters and 701 verses.

The 33 MB source database is not committed here — see [Content pipeline](#content-pipeline) for how to supply it. The `npm run dev` client and the offline checks work without it.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts both the Vite client and the SQLite/TTS API. To run only the web client, use `npm run dev:web`.

## Production checks and deployment

The full check suite:

```bash
npm run check
```

`api:check` queries `BhagwatGita.db` live, so the full suite needs the source database. On a fresh clone without it, use the offline subset, which validates the committed content projection, the TypeScript build, and the production bundle:

```bash
npm run check:offline
```

The repository includes `vercel.json` and `netlify.toml` for static Vite deployments.

Browser-based quality checks use Playwright:

```bash
npm run a11y:check
npm run perf:check
npm run visual:check
npm run visual:update
npm run tts:check
```

`visual:check` captures hero, verse, chapter, and cosmic-mode screenshots under `artifacts/visual-baseline/`. See [`docs/DEVICE_TESTING.md`](./docs/DEVICE_TESTING.md) for the physical-device matrix.

## Content pipeline

The database is intentionally not shipped to the browser or committed to this repository. It is a 33 MB binary, so it is listed in `.gitignore`; the browser instead receives `src/data/gita.json`, a typed projection of the same 18 chapters and 701 verses.

**On a fresh clone, `npm run check:offline` and the browser checks work as-is.** The full `npm run check`, the live SQLite API (`npm run api`), and the content generator additionally need the source database.

To regenerate the client projection, place your own copy of `BhagwatGita.db` in the project root (or set `GITA_DB_PATH` to its location), then run:

```bash
npm run content:generate
npm run content:check
```

`content:check` validates the committed `src/data/gita.json` only, so it needs no database.

The generator uses Python's standard-library `sqlite3` module and writes `src/data/gita.json`. It projects Sanskrit, transliteration, two Hindi and two English translation sources, recitation URLs, editorial summaries, and curated commentary options while assigning visual themes from verse keywords. The repository-style browser loader lives in `lib/gita-loader.ts`:

- `getAllVerses()`
- `getChapterVerses(chapterNumber)`
- `getVerse(idOrExternalId)`
- `getTranslations(verseId, language?)`
- `getTranslationOptions(verseId, language?)`
- `getCommentaryOptions(verseId, language?)`
- `getAudioUrl(verseId)`
- `getMeaning(verseId)`

## Live SQLite API

The `api/` functions and local server read `BhagwatGita.db` directly with Node's built-in `node:sqlite` module. Because the database is not committed, supply your own copy first (see [Content pipeline](#content-pipeline)):

```bash
npm run api
```

Endpoints:

- `GET /api/health`
- `GET /api/chapters`
- `GET /api/verses?chapter=1&offset=0&limit=50`
- `GET /api/verses/:id`
- `GET /api/tts?lang=hindi|english&text=...`

Hindi and English meaning audio is generated on demand with female neural voices (`hi-IN-SwaraNeural` and `en-IN-NeerjaNeural`) and cached under `.cache/tts/`. Install the optional TTS dependency with:

```bash
python3 -m pip install --user -r requirements-tts.txt
```

Set `GITA_DB_PATH` to point at a different SQLite file.

## Current experience

- ScrollTrigger maps the long-form document to a 701-verse camera journey.
- The default reading surface is clean and centered with a white, black, and purple editorial palette; the 3D field is opt-in through `K`.
- The verse window streams only the current verse plus five neighbors on either side.
- Chapter atmospheres, palettes, and keyword themes are generated from the content.
- Chapter index, chapter gates, chapter transition sequences, and verse jump controls are available.
- Bookmarking, recent reading, shareable `#verse-chapter-verse` deep links, and full-text search are available.
- Audio controls include the database Sanskrit recitation plus cached female neural voices for Hindi and English meanings; language tracks stay aligned to the active verse.
- Guided chapter tours use verse recitation audio with optional auto-advance.
- Chapter transitions include constellation paths between chapter symbols.
- Adaptive quality profiles tune the optional 3D field for mobile, reduced-motion, and low-power devices.
- `K` opens Cosmic Krishna mode, where all 701 verses are rendered as a connected star constellation.
- Mobile layout stacks Sanskrit, Hindi, and English readings into a scrollable panel.
- `prefers-reduced-motion`, skip navigation, live verse announcements, focus-managed dialogs, and keyboard controls (`K`, `/`, `Escape`, arrow keys, `Home`, `End`) are included in the first pass.

All milestones in [`TODO.md`](./TODO.md) are complete. Known follow-ups:

- Physical-device verification from the matrix in [`docs/DEVICE_TESTING.md`](./docs/DEVICE_TESTING.md) still needs a small hardware lab; only the throttled iPhone 13 emulation is automated.
- The main bundle inlines the whole `gita.json` projection (~1 MB gzipped, ~5.3 MB raw), which trips Vite's 500 kB chunk warning. It clears the throttled-mobile budget (first contentful paint around 2.1 s against a 5 s target), but code-splitting the content payload is the main remaining performance win.
