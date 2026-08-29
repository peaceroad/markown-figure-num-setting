# AGENTS Notes

## Scope

These notes cover the 0.4+ Markdown source editor implementation.

## Responsibility boundaries

- Use p-captions for label grammar, canonical marks, `analyzeCaptionStart()`,
  and frozen `analyzeCaptionParagraph()` decisions.
- Use only
  `@peaceroad/markdown-it-figure-with-p-caption/caption-numbering.js` for
  Chapter/Appendix scope, semantic counter keys, and scoped number codecs.
- Do not import figure renderer walkers, wrapper logic, private candidate
  detectors, or private caption-numbering modules.
- Keep Markdown parsing, source offsets, edit validation, frontmatter input,
  counter planning, and source reconstruction in this package.
- Declare every package imported by production code as a direct dependency.

## Processing workflow

1. Normalize and validate the source and all options before parsing.
2. Use the stable markdown-it instance and its one-shot post-inline core
   collector.
3. Store invocation-local data in the private `env` entry; never use
   module-global mutable parse or render state. Keep normalized options as the
   invocation's single source of truth instead of copying immutable analyzer
   options or resolvers into per-call state.
4. Parse document-leading raw frontmatter with a safe parser and place the
   plain-object result in `state.env.frontmatter` before creating the figure
   scope timeline. Keep the js-yaml schema and alias/depth limits explicit.
5. Select enabled marks in configured order with
   `analyzeCaptionStart(..., { allowedMarks })`.
6. Confirm each paragraph with `analyzeCaptionParagraph()` and require the two
   analyses to agree on mark, label, and matched text.
7. Collect source-relative candidates without mutating tokens, inline
   children, decisions, contexts, or user env data.
8. Plan counters by `counterKey` and branded `sequenceKey`. Preserve explicit
   numbers and seed only compatible positive decimal sequences with max
   semantics.
9. Validate every generated number and edit range, reject duplicates and
   overlaps, then rebuild the original source once.
10. Return the original source on a no-op or structurally unsafe mapping.

## Source safety

- Preserve BOM, LF, CRLF, mixed line endings, final newline state,
  frontmatter, inline markup, attrs, and untouched whitespace.
- Treat `token.map` as 0-based and end-exclusive.
- Require the caption label to exist as leading plain source text after a
  safely recognized container prefix.
- Fail closed for hidden paragraphs, tight-list guards, invalid maps,
  ambiguous prefixes, or unmappable scope boundaries.
- Do not reconstruct Markdown from renderer output.
- Do not restore the 0.3 nearest-line image-alt heuristic.
- Keep production modules free of Node-only APIs for browser and VS Code web
  compatibility.

## Options and API

- Keep the named `setFigureCaptionNumbers` export and the same-function default
  export.
- Reject non-string source, legacy options, and unknown properties.
- Delegate `marks` alias normalization to p-captions.
- Delegate numbering values and semantics to the figure public normalizer.
- Keep `marks: []` as the only numbering-disable switch.
- Require custom frontmatter parsers to be synchronous, pure, and
  plain-object-returning.

## Tests and performance

- Keep responsibility-focused tests for numbering, source edits, frontmatter,
  options, dependency contracts, and figure-runtime differentials.
- Keep every ordinary suite in the default `npm test` aggregate.
- Keep dependency-contract and differential scripts directly runnable.
- Keep the markdown-it 15 contract test for the post-inline `StateCore`,
  stripped reference definitions, and reference-label metadata; keep linkify
  disabled unless source-mapping behavior is re-audited.
- Keep the mixed CRLF/LF regression as an inline string assertion.
- Benchmark caption-free input, dense captions, many scopes, shared samp
  series, mixed line endings, document scope, automatic scope, and disabled
  marks. Report median and p95.
- Verify that disabled marks skip parsing, no-op output is not rebuilt, source
  is reconstructed once, regexes are not compiled per caption, and dependency
  caches are reused.

## Final validation

- Run `npm test`.
- Run `npm run test:dependency-contract`.
- Run `npm run test:differential`.
- Run `npm run benchmark`.
- Run a direct ESM import and transform.
- Run `npm pack --dry-run`.
- Run `git diff --check`.
- Confirm the figure repository Git state did not change.
- Run the required LF checker for every text file changed in the task.
