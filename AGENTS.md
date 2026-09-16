# AGENTS.md

This file applies to the entire repository.

## Product intent

Chord Pocket is a small, dependency-free, phone-first guitar chord reference and practice app. Preserve fast loading, one-tap chord selection, offline support, and accessible keyboard/touch interactions.

## Architecture

- Treat `dist/` as both the source and the deployable static application.
- Keep the app framework-free unless a requested feature clearly requires otherwise.
- Store chord records in `dist/chords.json`; render diagrams from structured data in `dist/app.js`.
- Keep saved user selections device-local unless a task explicitly adds synchronization.
- Update the service-worker cache version whenever a cached asset changes.

## Chord-data rules

- Every chord record must contain exactly six fret entries and six finger entries, ordered from low E to high E.
- Use `"x"` for muted strings and `"0"` for open strings.
- Finger values are `1` through `4`; open and muted strings use `null`.
- A repeated finger on the same fret must have a matching barre definition.
- Keep enharmonic aliases searchable without duplicating voicings.
- Mark only one root occurrence in a diagram: the lowest-pitched played root.
- Run `node tools/audit-chords.mjs` after every chord-data change.

## Content cleanliness

- Commit only structured musical data and application-generated diagrams.
- Do not commit third-party scans, page captures, copied illustrations, publication page references, or extraction metadata.
- Do not add source-specific credits or provenance to chord records.
- Keep filenames, comments, documentation, tests, and Git history free of those materials and references.

## Development checks

Before committing:

```sh
node tools/audit-chords.mjs
node --check dist/app.js
node --check dist/sw.js
git diff --check
```

Also verify the Browse, My Chords, and Practice views at a narrow mobile viewport. Confirm that flashcards reveal after three seconds and that the manual reveal button still works.

## Editing guidance

- Preserve existing responsive styles and accessible names.
- Prefer small, focused changes over broad rewrites.
- Do not introduce remote fonts, analytics, trackers, or network dependencies without an explicit requirement.
- Do not commit generated caches, local runtime files, credentials, or temporary audit output.
