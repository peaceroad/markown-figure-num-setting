# markown-figure-num-setting

Set sequential numbers for Markdown caption labels (and optionally image alt text).

Caption label detection is based on `p7d-markdown-it-p-captions` language regex rules.

## Install

```bash
npm i @peaceroad/markown-figure-num-setting
```

## Usage

```js
import setMarkdownFigureNum from '@peaceroad/markown-figure-num-setting'

// The first argument must be Markdown content text (not a file path).
const outputMarkdown = setMarkdownFigureNum(markdownText, option)
```

If you have a file path, read the file content first:

```js
import fs from 'node:fs'
import setMarkdownFigureNum from '@peaceroad/markown-figure-num-setting'

const markdownText = fs.readFileSync(markdownPath, 'utf8')
const outputMarkdown = setMarkdownFigureNum(markdownText)
```

## Basic behavior

Input:

```md
Paragraph.

Figure. A caption

![A alt text.](image.jpg)

Paragraph.

Figure. A caption

![A alt text.](image.jpg)
```

Output (default option):

```md
Paragraph.

Figure 1. A caption

![A alt text.](image.jpg)

Paragraph.

Figure 2. A caption

![A alt text.](image.jpg)
```

## Options

Default options:

```js
{
  img: true,
  video: false,
  table: false,
  'pre-code': false,
  'pre-samp': false,
  blockquote: false,
  slide: false,
  audio: false,
  labelMarkMap: null,
  noSetAlt: true,
  setNumberAlt: false,
  setImgAlt: false,
}
```

- `img`, `video`, `table`, `pre-code`, `pre-samp`, `blockquote`, `slide`, `audio`:
  Enable numbering for each caption type.
- `setNumberAlt: true`:
  Also set numbered label text to related image alt text.
- `setImgAlt: true`:
  Alias behavior for alt-text numbering.
- `noSetAlt: false`:
  Legacy-compatible switch to enable alt-text numbering.
- `labelMarkMap`:
  Optional map to resolve overlapping labels by mark name.
  Example: `{ '図': 'pre-samp', 'リスト': 'pre-samp' }`.

All type options above are active in the current implementation.

When multiple type options are enabled, counters are maintained per type.

Label overlap note (from `p7d-markdown-it-p-captions` dictionaries):
- Japanese `図` can match both `img` and `pre-samp`.
- Japanese `リスト` can match both `pre-code` and `pre-samp`.

If an input label can match multiple enabled types, the first matched type wins in this order:
`img` -> `video` -> `table` -> `pre-code` -> `pre-samp` -> `blockquote` -> `slide` -> `audio`.

You can override this default with `labelMarkMap`.

## Alt text numbering example

Input:

```md
図 キャプション

![ALT-A](image.jpg)

図 キャプション

![ALT-B](image.jpg)
```

Output (`{ setNumberAlt: true }`):

```md
図1 キャプション

![図1](image.jpg)

図2 キャプション

![図2](image.jpg)
```

## Notes

- Original line endings are preserved, including mixed `\r\n` and `\n`.
- Fenced code blocks are skipped:
  - Backtick/tilde fences with 3+ markers (including variable-length fences like `````).
  - Full-line math fences (`$$`, `$$$`, ...).
- Indented code blocks (4 spaces or tab) are currently out of scope. Use fenced code blocks if you need guaranteed skip behavior.
- Non-string input is returned as-is.
- Alt-text rewriting targets inline image syntax such as `![alt](url "title")` (including escaped chars and trailing attrs).
- Reference-style image links are out of scope.
- If caption-to-image pairing is ambiguous in dense sections, separate blocks explicitly (for example with `<!---->`).
