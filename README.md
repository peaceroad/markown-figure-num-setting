# markown-figure-num-setting

Number p-captions-compatible caption paragraphs directly in Markdown source.

Version 0.4.0 is a breaking rewrite. It uses markdown-it structure,
`p7d-markdown-it-p-captions` decisions, and the public numbering API from
`@peaceroad/markdown-it-figure-with-p-caption`.

## Install

```bash
npm install @peaceroad/markown-figure-num-setting
```

## Basic API

```js
import {
  setFigureCaptionNumbers,
} from '@peaceroad/markown-figure-num-setting'

const output = setFigureCaptionNumbers(markdownSource, options)
```

The default export references the same function:

```js
import setFigureCaptionNumbers from '@peaceroad/markown-figure-num-setting'
```

The first argument must be a string. Non-string input throws `TypeError`.
Options must be an object when provided, and unknown properties are rejected.

## Default behavior

The default enabled marks are:

```js
{ marks: ['img'] }
```

Numbering uses automatic Chapter/Appendix scope by default. Parsed frontmatter
titles and top-level H1 headings are scope sources, `.` is the separator, and
repeated scopes continue their existing sequence.

Input:

```md
# Chapter 1: Introduction

Figure. First caption

Figure. Second caption
```

Output:

```md
# Chapter 1: Introduction

Figure 1.1. First caption

Figure 1.2. Second caption
```

Without a recognized scope, captions use document-style decimal numbers:
`Figure 1.`, `Figure 2.`, and so on.

## Options

```js
setFigureCaptionNumbers(source, {
  languages: ['en', 'ja'],
  marks: ['img', 'table', 'code', 'samp', 'video'],
  numbering: {
    separator: '.',
    scope: 'auto',
  },
  frontmatter: {
    parse: parseFrontmatter,
  },
  imageAlt: false,
})
```

### `marks`

Supported user-facing values:

- `img`
- `table`
- `code` / `pre-code`
- `samp` / `pre-samp`
- `video`

`code` and `samp` are normalized to the canonical p-captions marks
`pre-code` and `pre-samp`. Duplicates are removed while preserving input
order. That order is also the priority for labels that match multiple enabled
marks.

```js
setFigureCaptionNumbers(source, {
  marks: ['samp', 'img'],
})
```

An empty array explicitly disables numbering:

```js
setFigureCaptionNumbers(source, { marks: [] })
```

When `marks: []` is used and `numbering` is omitted, the function validates
options and returns the original source without parsing Markdown.

### `languages`

`languages` selects p-captions recognition catalogs. Label dictionaries are
owned by p-captions and are not duplicated by this package.

```js
setFigureCaptionNumbers(source, {
  languages: ['ja'],
})
```

### `numbering`

Numbering policy is normalized by the public figure numbering API.

Use document-wide counters regardless of headings or frontmatter:

```js
setFigureCaptionNumbers(source, {
  numbering: { scope: 'document' },
})
```

Explicit `numbering: null` is accepted as a compatibility form of the same
document-wide opt-out. It does not disable numbering; use `marks: []` for that.

Use `-` between a scope and local sequence:

```js
setFigureCaptionNumbers(source, {
  numbering: { separator: '-' },
})
```

`# Chapter 2` then produces `Figure 2-1.`.

Customize automatic heading sources:

```js
setFigureCaptionNumbers(source, {
  numbering: {
    scope: {
      sources: ['heading'],
      headingLevels: [2],
      repeatScope: 'reset',
    },
  },
})
```

Supported `scope` sources are `frontmatter` and `heading`. Heading levels must
be integers from 1 through 6. Repeated semantic scopes may `continue` or
`reset`.

### Frontmatter

Document-leading YAML frontmatter is separated with
`markdown-it-front-matter` and parsed with `js-yaml` by default.

```yaml
---
title: "Chapter 1: Introduction"
figure-caption-numbering:
  scope: auto
  separator: "."
---
```

Dotted fields are also supported:

```yaml
---
figure-caption-numbering.scope: document
figure-caption-numbering.separator: "-"
---
```

Nested and dotted forms may configure different fields. Defining the same
logical field twice throws.

Supply a custom synchronous parser when another metadata format or YAML policy
is required:

```js
setFigureCaptionNumbers(source, {
  frontmatter: {
    parse(rawMetadata) {
      return parseMetadata(rawMetadata)
    },
  },
})
```

The callback must be synchronous and should be pure. It must return a plain
object. Thrown errors propagate, and Promise/thenable results are rejected
before source edits are planned.

## Explicit numbers

Existing caption numbers are preserved.

```md
# Chapter 1

Figure 1.5. Explicit

Figure. Generated
```

becomes:

```md
# Chapter 1

Figure 1.5. Explicit

Figure 1.6. Generated
```

Only a positive decimal sequence compatible with the current scope seeds the
counter. Scope-mismatched, compound, and alphanumeric values such as `A.5`,
`1-5` under a `.` policy, or `A-1` are preserved but do not seed an
incompatible sequence. Smaller explicit numbers never roll a counter back.

## Shared counter series

Counter grouping is resolved by the public figure API:

- `img` uses the `figure` series.
- `pre-code` uses the `listing` series.
- `video` uses the `video` series.
- `table` uses the `table` series.
- `pre-samp` may share `figure` or `listing` for overlapping labels such as
  Japanese `図` or `リスト`; otherwise it uses `samp`.

Disabled marks do not advance a shared series.

## Source preservation and safety

The implementation follows:

```text
normalize -> parse -> collect -> plan -> validate -> rebuild once
```

- markdown-it supplies block and inline structure.
- p-captions supplies caption-start and paragraph decisions.
- figure supplies scope, series, and number-codec semantics.
- Every source edit uses offsets in the original string.
- All edits are range-checked and overlap-checked before output is rebuilt.
- Unmappable or ambiguous structures fail closed.
- A no-op returns the original source value.

Untouched slices preserve:

- LF and CRLF, including mixed line endings
- BOM
- final newline presence
- frontmatter bytes
- caption body markup, links, attrs, and whitespace

Fenced code, indented code, HTML blocks, and inline code are not numbered.
The formal p-captions list guards remain authoritative; for example, a guarded
first list-item paragraph is not edited.

This package selects structurally valid caption paragraphs. It does not require
or prove adjacency to an image, table, fence, or other figure candidate.

Production modules do not use Node-only APIs, so bundlers can target browser
and VS Code web environments.

## Image alt text

Version 0.4.0 does not rewrite image alt text. The old nearest-line heuristic
was intentionally removed because it could not prove a one-to-one structural
relationship between a caption and an image.

`imageAlt: false` is accepted as an explicit future-facing setting.
`imageAlt: true` throws until a structural source-span implementation is
available.

## Migration from 0.3

| 0.3 option/behavior | 0.4 replacement |
| --- | --- |
| `img: true` | `marks: ['img']` |
| `table: true` | Include `table` in `marks` |
| `'pre-code': true` | Include `code` or `pre-code` in `marks` |
| `'pre-samp': true` | Include `samp` or `pre-samp` in `marks` |
| `video: true` | Include `video` in `marks` |
| `labelMarkMap` | Put the preferred mark earlier in `marks` |
| `setNumberAlt`, `setImgAlt`, `noSetAlt` | Removed; alt text is not rewritten |
| `blockquote`, `slide`, `audio` marks | Not supported by the initial 0.4 source editor |
| Non-string input returned unchanged | Non-string input throws `TypeError` |
| Existing numbers were renumbered | Existing numbers are preserved and may seed counters |
| Document-wide default | Automatic frontmatter/H1 scope by default |

Legacy and unknown options throw with migration guidance rather than being
silently ignored.

## Responsibility boundaries

`p7d-markdown-it-p-captions` owns:

- caption labels and number grammar
- canonical caption decisions
- paragraph/list guards

`@peaceroad/markdown-it-figure-with-p-caption` owns:

- Chapter/Appendix scope interpretation
- semantic counter series
- scoped number parsing and formatting

This package owns:

- source parsing and frontmatter input
- caption selection
- source offsets and edit validation
- counter planning and one-time source reconstruction

It imports only the public figure subpath:

```js
import {
  normalizeFigureCaptionNumberingPolicy,
  createFigureCaptionScopeTimeline,
  createFigureCaptionCounterKeyResolver,
  createFigureCaptionNumberCodec,
} from '@peaceroad/markdown-it-figure-with-p-caption/caption-numbering.js'
```

Renderer walkers, wrapper generation, and private figure candidate detection
are intentionally not imported.
