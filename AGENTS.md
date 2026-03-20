# AGENTS Notes

## Scope
This memo is for implementing and maintaining `index.js` in this repository.

## `index.js` workflow
1. Confirm behavior first:
   - Figure labels are detected via `p7d-markdown-it-p-captions` helper APIs, currently `getMarkRegStateForLanguages()` and `analyzeCaptionStart()`.
   - Mixed line endings (`\n` / `\r\n`) must be preserved exactly per original line break.
   - Code/math fence lines (` ``` `, `~~~`, `$$`) must be skipped.
   - Indented code blocks (4 spaces/tab) are currently out of scope unless explicitly changed.
2. Make the smallest safe change:
   - Prefer compatibility-first edits (avoid changing output format unless required).
   - Remove dead/debug code while editing.
3. Validate locally:
   - Run `npm test`.
   - Run at least one direct Node import/run check for `index.js`.
4. Compatibility checks:
   - Keep `index.js` free of Node-only APIs (`fs`, `path`, `process`) so browser/VSCode web usage remains possible.
   - Watch upstream `p7d-markdown-it-p-captions` export changes (for example helper API migrations).
   - Do not assume `getMarkRegForLanguages()` returns a plain `RegExp`; matcher objects may expose only `exec()` / `test()`.
   - Keep this package's default mark priority explicit (`img -> video -> table -> pre-code -> pre-samp -> blockquote -> slide -> audio`) instead of inheriting helper-internal entry order.
5. Performance checks (when touching hot paths):
   - Benchmark before/after with a fixed corpus.
   - Prioritize simple optimizations (fewer regex calls, fewer loops, precomputed constants).
   - Prefer `analyzeCaptionStart(..., { allowedMarks })` over per-mark repeated analysis when behavior stays the same.
   - Avoid micro-optimizations that make logic hard to maintain without measurable gain.

## Test data maintenance
- Keep active cases in `test/examples.txt`, `test/examples-no-set-alt.txt`, `test/examples-pre-samp.txt`, and `test/examples-label-mark-map.txt`.
- Remove obsolete standalone test files only after migrating useful scenarios into active test files.
- Keep the mixed line-ending regression check as an inline assertion in `test/test.js` (not fixture files).
