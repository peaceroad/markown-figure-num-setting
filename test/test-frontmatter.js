import assert from 'node:assert/strict'
import test from 'node:test'
import { setFigureCaptionNumbers as transform } from '../index.js'

test('default YAML parser supplies a frontmatter title to figure scope', () => {
  const source = [
    '---',
    'title: "Chapter 2: Intro"',
    '---',
    'Figure. Caption',
  ].join('\n')
  assert.equal(
    transform(source),
    source.replace('Figure. Caption', 'Figure 2.1. Caption'),
  )
})

test('BOM, frontmatter bytes, and mixed line endings remain untouched', () => {
  const source = (
    '\uFEFF---\r\n' +
    'title: "Appendix A: Data"\n' +
    '---\r\n' +
    'Figure. Caption'
  )
  const expected = source.replace('Figure. Caption', 'Figure A.1. Caption')
  assert.equal(transform(source), expected)
})

test('nested and dotted frontmatter fields may configure different values', () => {
  const source = [
    '---',
    'title: "Chapter 3: Intro"',
    'figure-caption-numbering:',
    '  scope: auto',
    'figure-caption-numbering.separator: "-"',
    '---',
    'Figure. Caption',
  ].join('\n')
  assert.equal(
    transform(source),
    source.replace('Figure. Caption', 'Figure 3-1. Caption'),
  )
})

test('frontmatter may opt out to document scope', () => {
  const source = [
    '---',
    'title: "Chapter 3: Intro"',
    'figure-caption-numbering.scope: document',
    '---',
    'Figure. Caption',
  ].join('\n')
  assert.equal(
    transform(source),
    source.replace('Figure. Caption', 'Figure 1. Caption'),
  )
})

test('duplicate and unknown numbering fields fail before editing', () => {
  assert.throws(
    () => transform([
      '---',
      'figure-caption-numbering:',
      '  scope: auto',
      'figure-caption-numbering.scope: document',
      '---',
      'Figure. Caption',
    ].join('\n')),
    /defined more than once/,
  )
  assert.throws(
    () => transform([
      '---',
      'figure-caption-numbering:',
      '  typo: auto',
      '---',
      'Figure. Caption',
    ].join('\n')),
    /\.typo is not supported/,
  )
})

test('invalid YAML and non-object parser results fail before editing', () => {
  assert.throws(
    () => transform('---\ninvalid: [\n---\nFigure. Caption'),
  )
  assert.throws(
    () => transform('---\ntitle: x\n---\nFigure. Caption', {
      frontmatter: { parse: () => 'not an object' },
    }),
    /must return a plain object/,
  )
  assert.throws(
    () => transform('---\ntitle: one\ntitle: two\n---\nFigure. Caption'),
  )
  assert.throws(
    () => transform('---\ntitle: "Chapter 1"'),
    /must have a closing delimiter/,
  )
  assert.throws(
    () => transform('----\ntitle: "Chapter 1"\n---'),
    /must have a closing delimiter/,
  )
  assert.equal(
    transform('----\ntitle: "Chapter 1"\n----\nFigure. Caption'),
    '----\ntitle: "Chapter 1"\n----\nFigure 1.1. Caption',
  )
})

test('custom parser errors and async results propagate before editing', () => {
  const source = '---\ntitle: x\n---\nFigure. Caption'
  assert.throws(
    () => transform(source, {
      frontmatter: {
        parse() {
          throw new Error('custom failure')
        },
      },
    }),
    /custom failure/,
  )
  assert.throws(
    () => transform(source, {
      frontmatter: { parse: () => Promise.resolve({ title: 'Chapter 1' }) },
    }),
    /must return synchronously/,
  )
})

test('custom parser receives raw metadata and may provide a title', () => {
  let received = null
  const source = '---\ncustom title\n---\nFigure. Caption'
  const result = transform(source, {
    frontmatter: {
      parse(raw) {
        received = raw
        return { title: 'Chapter 7' }
      },
    },
  })
  assert.equal(received, 'custom title')
  assert.equal(result, source.replace('Figure. Caption', 'Figure 7.1. Caption'))
})
