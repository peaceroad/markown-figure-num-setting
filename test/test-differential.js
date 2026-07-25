import assert from 'node:assert/strict'
import test from 'node:test'
import MarkdownIt from 'markdown-it'
import figureWithCaption from '@peaceroad/markdown-it-figure-with-p-caption'
import { setFigureCaptionNumbers as transform } from '../index.js'

const labelReg = /<span class="f-[^"]+-label">([^<]+)<span class="f-[^"]+-label-joint">/g

const extractLabels = (html) => (
  Array.from(html.matchAll(labelReg), (match) => match[1])
)

const render = (source, options) => (
  new MarkdownIt({ html: true })
    .use(figureWithCaption, options)
    .render(source)
)

test('source numbering matches figure runtime scope and counter series', () => {
  const source = [
    '# Chapter 1: Intro',
    '',
    'Figure. Image',
    '',
    '![](image.png)',
    '',
    'Table. Data',
    '',
    '| A |',
    '| - |',
    '| 1 |',
    '',
    'Code. Example',
    '',
    '```js',
    'const value = 1',
    '```',
  ].join('\n')
  const marks = ['img', 'table', 'code']
  const transformed = transform(source, { marks })
  const sourceLabels = extractLabels(render(transformed, {}))
  const runtimeLabels = extractLabels(render(source, {
    autoLabelNumberSets: marks,
  }))
  assert.deepEqual(sourceLabels, runtimeLabels)
  assert.deepEqual(runtimeLabels, ['Figure 1.1', 'Table 1.1', 'Code 1.1'])
})

test('document scope and custom separator match figure runtime', () => {
  const source = [
    '# Chapter 2',
    '',
    'Figure. First',
    '',
    '![](first.png)',
    '',
    'Figure. Second',
    '',
    '![](second.png)',
  ].join('\n')
  const numbering = { scope: 'document', separator: '-' }
  const transformed = transform(source, { numbering })
  assert.deepEqual(
    extractLabels(render(transformed, {})),
    extractLabels(render(source, {
      autoLabelNumberSets: ['img'],
      autoLabelNumberPolicy: numbering,
    })),
  )
})
