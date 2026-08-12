import assert from 'node:assert/strict'
import test from 'node:test'
import transform, { setFigureCaptionNumbers } from '../index.js'
import { normalizeTransformOptions } from '../lib/options.js'

test('default and named exports reference the same function', () => {
  assert.equal(transform, setFigureCaptionNumbers)
})

test('default normalization reuses immutable analyzer state', () => {
  const first = normalizeTransformOptions()
  const second = normalizeTransformOptions()
  assert.equal(first, second)
  assert.equal(Object.isFrozen(first), true)
  assert.equal(Object.isFrozen(first.analysisOptions), true)
  assert.equal(Object.isFrozen(first.paragraphAnalysisOptions), true)
})

test('source must be a string', () => {
  for (const value of [null, undefined, 1, {}, []]) {
    assert.throws(() => transform(value), /source must be a string/)
  }
})

test('top-level options must be a plain object with known properties', () => {
  assert.throws(() => transform('Figure. A', null), /options must be an object/)
  assert.throws(() => transform('Figure. A', []), /options must be an object/)
  assert.throws(
    () => transform('Figure. A', { typo: true }),
    /options property "typo" is not supported/,
  )
})

test('no-op fast paths still normalize and validate options', () => {
  assert.throws(
    () => transform('', { typo: true }),
    /options property "typo" is not supported/,
  )
  assert.throws(
    () => transform('Figure. A', {
      marks: [],
      frontmatter: {},
    }),
    /options\.frontmatter\.parse must be a synchronous function/,
  )
})

test('legacy options fail with migration guidance', () => {
  assert.throws(
    () => transform('Figure. A', { img: true }),
    /Legacy option "img".*marks/,
  )
  assert.throws(
    () => transform('Figure. A', { labelMarkMap: {} }),
    /Legacy option "labelMarkMap".*Order marks/,
  )
  assert.throws(
    () => transform('Figure. A', { setNumberAlt: true }),
    /Image alt rewriting is not supported/,
  )
})

test('marks use p-captions aliases, stable dedupe, and strict validation', () => {
  assert.deepEqual(
    normalizeTransformOptions({
      marks: ['samp', 'img', 'pre-samp', 'code', 'pre-code'],
    }).marks,
    ['pre-samp', 'img', 'pre-code'],
  )
  for (const marks of [
    null,
    undefined,
    'img',
    [''],
    [' img'],
    ['img '],
    [null],
    ['unknown'],
  ]) {
    assert.throws(() => transform('Figure. A', { marks }))
  }
})

test('marks: [] skips Markdown parsing when numbering is omitted', () => {
  const source = '---\ninvalid: [\n---\nFigure. A'
  assert.equal(transform(source, { marks: [] }), source)
  const normalized = normalizeTransformOptions({ marks: [] })
  assert.equal(normalized.analysisOptions, null)
  assert.equal(normalized.paragraphAnalysisOptions, null)
  assert.equal(normalized.resolveCounterKey, null)
})

test('marks: [] does not invoke a valid custom frontmatter parser', () => {
  let calls = 0
  const source = '---\ntitle: x\n---\nFigure. A'
  assert.equal(
    transform(source, {
      marks: [],
      frontmatter: {
        parse() {
          calls++
          return { title: 'Chapter 2' }
        },
      },
    }),
    source,
  )
  assert.equal(calls, 0)
})

test('marks: [] still validates explicit numbering', () => {
  assert.throws(
    () => transform('Figure. A', {
      marks: [],
      numbering: { separator: '/' },
    }),
    /separator/,
  )
})

test('numbering rejects unknown properties before figure normalization', () => {
  assert.throws(
    () => transform('Figure. A', { numbering: { seperator: '.' } }),
    /property "seperator" is not supported/,
  )
  assert.throws(
    () => transform('Figure. A', {
      numbering: { scope: { headingLevel: [1] } },
    }),
    /property "headingLevel" is not supported/,
  )
  assert.throws(
    () => transform('Figure. A', {
      numbering: {
        scope: { resolveFrontmatterTitle: () => 'Chapter 1' },
      },
    }),
    /property "resolveFrontmatterTitle" is not supported/,
  )
  assert.throws(
    () => transform('Figure. A', {
      numbering: { scope: new Date() },
    }),
    /must be "auto", "document", a plain object/,
  )
})

test('languages must be an array when explicitly supplied', () => {
  assert.throws(
    () => transform('Figure. A', { languages: null }),
    /languages must be an array/,
  )
  assert.equal(
    transform('Figure. A', { languages: [] }),
    'Figure. A',
  )
})

test('imageAlt reserves only the safe disabled value', () => {
  assert.equal(
    transform('Figure. A', { imageAlt: false, numbering: { scope: 'document' } }),
    'Figure 1. A',
  )
  assert.throws(
    () => transform('Figure. A', { imageAlt: true }),
    /accepts only false/,
  )
})
