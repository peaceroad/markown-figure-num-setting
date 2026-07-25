import assert from 'node:assert/strict'
import test from 'node:test'
import { setFigureCaptionNumbers as transform } from '../index.js'

test('default numbering remains unscoped without a recognized scope', () => {
  assert.equal(
    transform('Figure. First\n\nFigure. Second'),
    'Figure 1. First\n\nFigure 2. Second',
  )
})

test('default H1 scopes use the figure automatic policy', () => {
  assert.equal(
    transform('# Chapter 1: Intro\n\nFigure. First\n\nFigure. Second'),
    '# Chapter 1: Intro\n\nFigure 1.1. First\n\nFigure 1.2. Second',
  )
  assert.equal(
    transform('# Appendix A: Data\n\nFigure. First'),
    '# Appendix A: Data\n\nFigure A.1. First',
  )
  assert.equal(
    transform('# 第3章 概要\n\n図 キャプション'),
    '# 第3章 概要\n\n図3.1 キャプション',
  )
})

test('H2 is opt-in through the figure policy', () => {
  const source = '## Chapter 2: Detail\n\nFigure. First'
  assert.equal(transform(source), '## Chapter 2: Detail\n\nFigure 1. First')
  assert.equal(
    transform(source, {
      numbering: { scope: { headingLevels: [2] } },
    }),
    '## Chapter 2: Detail\n\nFigure 2.1. First',
  )
})

test('document scope and null compatibility opt-out stay unscoped', () => {
  const source = '# Chapter 4\n\nFigure. First\n\nFigure. Second'
  const expected = '# Chapter 4\n\nFigure 1. First\n\nFigure 2. Second'
  assert.equal(transform(source, { numbering: { scope: 'document' } }), expected)
  assert.equal(transform(source, { numbering: null }), expected)
})

test('separator and repeated-scope policies come from figure', () => {
  const source = [
    '# Chapter 1',
    '',
    'Figure. First',
    '',
    '# Chapter 2',
    '',
    'Figure. Second',
    '',
    '# Chapter 1',
    '',
    'Figure. Third',
  ].join('\n')
  assert.match(transform(source), /Figure 1\.2\. Third$/)
  assert.match(
    transform(source, {
      numbering: {
        separator: '-',
        scope: { repeatScope: 'reset' },
      },
    }),
    /Figure 1-1\. Third$/,
  )
})

test('explicit compatible numbers seed with max semantics', () => {
  const source = [
    '# Chapter 1',
    '',
    'Figure 1.5. Explicit',
    '',
    'Figure 1.3. Smaller',
    '',
    'Figure. Generated',
  ].join('\n')
  assert.equal(
    transform(source),
    [
      '# Chapter 1',
      '',
      'Figure 1.5. Explicit',
      '',
      'Figure 1.3. Smaller',
      '',
      'Figure 1.6. Generated',
    ].join('\n'),
  )
})

test('scope-mismatched and compound numbers are preserved without seeding', () => {
  const source = [
    '# Chapter 1',
    '',
    'Figure A.5. Other scope',
    '',
    'Figure 1-5. Other separator',
    '',
    'Figure. Generated',
  ].join('\n')
  assert.equal(
    transform(source),
    [
      '# Chapter 1',
      '',
      'Figure A.5. Other scope',
      '',
      'Figure 1-5. Other separator',
      '',
      'Figure 1.1. Generated',
    ].join('\n'),
  )
})

test('matching dash-scoped explicit numbers seed their sequence', () => {
  const source = [
    '# Chapter 2',
    '',
    'Figure 2-4. Explicit',
    '',
    'Figure. Generated',
  ].join('\n')
  assert.equal(
    transform(source, { numbering: { separator: '-' } }),
    [
      '# Chapter 2',
      '',
      'Figure 2-4. Explicit',
      '',
      'Figure 2-5. Generated',
    ].join('\n'),
  )
})

test('generated-number overflow fails before returning partial edits', () => {
  assert.throws(
    () => transform('Figure 999999. Explicit\n\nFigure. Overflow', {
      numbering: { scope: 'document' },
    }),
    /exceeds the p-captions number grammar/,
  )
})

test('enabled aliases share figure and listing counter series', () => {
  assert.equal(
    transform('図 キャプション\n\nFigure. Caption', {
      marks: ['samp', 'img'],
      numbering: { scope: 'document' },
    }),
    '図1 キャプション\n\nFigure 2. Caption',
  )
  assert.equal(
    transform('リスト キャプション\n\nCode. Caption', {
      marks: ['samp', 'code'],
      numbering: { scope: 'document' },
    }),
    'リスト1 キャプション\n\nCode 2. Caption',
  )
})

test('disabled marks do not advance a shared series', () => {
  assert.equal(
    transform('Figure. Ignored\n\n図 キャプション', {
      marks: ['samp'],
      numbering: { scope: 'document' },
    }),
    'Figure. Ignored\n\n図1 キャプション',
  )
})
