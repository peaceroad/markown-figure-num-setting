import assert from 'node:assert/strict'
import test from 'node:test'
import { setFigureCaptionNumbers as transform } from '../index.js'
import {
  extendLineStartOffsets,
  rebuildSource,
  validateAndSortEdits,
} from '../lib/source-edits.js'

test('preserves LF, final newline, and caption body markup', () => {
  const source = 'Figure. *Emphasis* and [link](target)\n'
  assert.equal(
    transform(source, { numbering: { scope: 'document' } }),
    'Figure 1. *Emphasis* and [link](target)\n',
  )
})

test('preserves BOM and edits only the caption label', () => {
  const source = '\uFEFFFigure. Caption'
  assert.equal(
    transform(source, { numbering: { scope: 'document' } }),
    '\uFEFFFigure 1. Caption',
  )
})

test('does not treat fenced, indented, HTML, or inline code as captions', () => {
  const source = [
    '```md',
    'Figure. fenced',
    '```',
    '',
    '    Figure. indented',
    '',
    '<div>',
    'Figure. html',
    '</div>',
    '',
    '`Figure.` inline code',
    '',
    'Figure. real',
  ].join('\n')
  assert.equal(
    transform(source, { numbering: { scope: 'document' } }),
    source.replace('Figure. real', 'Figure 1. real'),
  )
})

test('supports a structurally parsed blockquote caption', () => {
  assert.equal(
    transform('> Figure. Quoted', { numbering: { scope: 'document' } }),
    '> Figure 1. Quoted',
  )
})

test('leaves image alt text unchanged', () => {
  const source = 'Figure. Caption\n\n![Original alt](image.png)'
  assert.equal(
    transform(source, {
      imageAlt: false,
      numbering: { scope: 'document' },
    }),
    'Figure 1. Caption\n\n![Original alt](image.png)',
  )
})

test('preserves v15 reference, image-alt, and entity source syntax', () => {
  const source = [
    '[caption]: https://example.com',
    '',
    'Figure. [Linked caption][caption] &copy text &copy;',
    '',
    '![Original `code` alt][image]',
    '',
    '[image]: image.png',
  ].join('\n')
  assert.equal(
    transform(source, { numbering: { scope: 'document' } }),
    source.replace('Figure.', 'Figure 1.'),
  )
})

test('preserves markdown-it 15.0.1 code-span and IPv6 link source syntax', () => {
  const source = [
    'Figure. [foo `bar` baz`',
    '',
    'Figure. `   `',
    '',
    'Figure. [IPv6](http://[::1]/)',
  ].join('\n')
  assert.equal(
    transform(source, { numbering: { scope: 'document' } }),
    [
      'Figure 1. [foo `bar` baz`',
      '',
      'Figure 2. `   `',
      '',
      'Figure 3. [IPv6](http://[::1]/)',
    ].join('\n'),
  )
})

test('fails closed for the guarded first list paragraph', () => {
  const source = '- Figure. List item'
  assert.equal(
    transform(source, { numbering: { scope: 'document' } }),
    source,
  )
})

test('supports an unambiguous later paragraph inside a loose list item', () => {
  const source = [
    '- Intro',
    '',
    '    Figure. Later paragraph',
  ].join('\n')
  assert.equal(
    transform(source, { numbering: { scope: 'document' } }),
    [
      '- Intro',
      '',
      '    Figure 1. Later paragraph',
    ].join('\n'),
  )
})

test('no-op documents are returned without content reconstruction', () => {
  const source = '# Heading\n\nOrdinary prose.\n'
  assert.equal(transform(source), source)
})

test('line offset table preserves CRLF, LF, and bare CR coordinates', () => {
  const offsets = [0]
  extendLineStartOffsets(
    'A\r\nB\nC\rD',
    offsets,
    Number.POSITIVE_INFINITY,
  )
  assert.deepEqual(
    offsets,
    [0, 3, 5, 7],
  )
})

test('line offset table can be extended without scanning trailing source', () => {
  const offsets = [0]
  assert.equal(extendLineStartOffsets('A\r\nB\nC\rD', offsets, 1), offsets)
  assert.deepEqual(offsets, [0, 3])
  extendLineStartOffsets('A\r\nB\nC\rD', offsets, 2)
  assert.deepEqual(offsets, [0, 3, 5])
})

test('edit validation rejects stale, duplicate, overlapping, and out-of-range edits', () => {
  assert.throws(
    () => validateAndSortEdits('abc', [{
      start: 1,
      end: 2,
      expected: 'x',
      replacement: 'B',
    }]),
    /invalid or stale/,
  )
  assert.throws(
    () => validateAndSortEdits('abc', [
      { start: 1, end: 1, expected: '', replacement: 'x' },
      { start: 1, end: 1, expected: '', replacement: 'y' },
    ]),
    /same range/,
  )
  assert.throws(
    () => validateAndSortEdits('abc', [
      { start: 0, end: 2, expected: 'ab', replacement: 'x' },
      { start: 1, end: 3, expected: 'bc', replacement: 'y' },
    ]),
    /overlap/,
  )
  assert.throws(
    () => rebuildSource('abc', [{
      start: 4,
      end: 4,
      expected: '',
      replacement: 'x',
    }]),
    /invalid or stale/,
  )
})
