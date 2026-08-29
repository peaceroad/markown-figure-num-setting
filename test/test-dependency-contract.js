import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import MarkdownIt from 'markdown-it'
import {
  createFigureCaptionCounterKeyResolver,
  createFigureCaptionNumberCodec,
  createFigureCaptionScopeTimeline,
  normalizeFigureCaptionNumberingPolicy,
} from '@peaceroad/markdown-it-figure-with-p-caption/caption-numbering.js'
import {
  analyzeCaptionParagraph,
  analyzeCaptionStart,
  getMarkRegStateForLanguages,
} from 'p7d-markdown-it-p-captions'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('markdown-it 15 exposes the required post-inline parser contract', () => {
  assert.equal(typeof MarkdownIt.StateCore, 'function')
  const md = new MarkdownIt({ html: true })
  assert.equal(md.options.linkify, false)

  let state = null
  md.core.ruler.after('inline', 'capture_markdown_it_15_state', (value) => {
    state = value
  })
  md.parse('[Caption][ref]\n\n[ref]: https://example.com', {})

  assert.equal(state instanceof MarkdownIt.StateCore, true)
  assert.equal(
    state.tokens.some((token) => token.type === 'reference_definition'),
    false,
  )
  const inline = state.tokens.find((token) => token.type === 'inline')
  assert.equal(inline.children[0].meta.label, 'REF')
})

test('figure 0.21 public numbering subpath exposes four frozen APIs', () => {
  for (const value of [
    createFigureCaptionCounterKeyResolver,
    createFigureCaptionNumberCodec,
    createFigureCaptionScopeTimeline,
    normalizeFigureCaptionNumberingPolicy,
  ]) {
    assert.equal(typeof value, 'function')
  }
  const policy = normalizeFigureCaptionNumberingPolicy(undefined)
  const codec = createFigureCaptionNumberCodec()
  const resolver = createFigureCaptionCounterKeyResolver()
  assert.equal(Object.isFrozen(policy), true)
  assert.equal(Object.isFrozen(codec), true)
  assert.equal(Object.isFrozen(resolver), true)
})

test('p-captions 0.26 provides frozen non-mutating paragraph decisions', () => {
  let state = null
  const md = new MarkdownIt()
  md.core.ruler.after('inline', 'capture_p_captions_026_state', (value) => {
    state = value
  })
  md.parse('Figure. First\n\nFigure. Second', {})

  const before = JSON.stringify(state.tokens)
  const options = Object.freeze({
    markRegState: getMarkRegStateForLanguages(),
  })
  for (const paragraphIndex of [0, 3]) {
    const decision = analyzeCaptionParagraph(
      paragraphIndex,
      state,
      { captionName: 'img' },
      options,
    )
    assert.equal(Object.isFrozen(decision), true)
    assert.equal(decision.paragraphIndex, paragraphIndex)
  }
  assert.equal(JSON.stringify(state.tokens), before)
})

test('timeline and codec reject look-alike policy and context objects', () => {
  let state = null
  const md = new MarkdownIt()
  md.core.ruler.after('inline', 'capture_dependency_contract_state', (value) => {
    state = value
  })
  md.parse('# Chapter 1', {})

  assert.throws(
    () => createFigureCaptionScopeTimeline(state, Object.freeze({})),
    /must be created by normalizeFigureCaptionNumberingPolicy/,
  )
  assert.throws(
    () => createFigureCaptionNumberCodec().format(1, Object.freeze({
      scoped: false,
      sequenceKey: null,
    })),
    /must be created by the figure caption-numbering API/,
  )
})

test('timeline policy and branded contexts are frozen and non-mutating', () => {
  let state = null
  const md = new MarkdownIt()
  md.core.ruler.after('inline', 'capture_timeline_contract_state', (value) => {
    state = value
  })
  md.parse('# Chapter 1\n\nFigure. Caption', {})
  const tokenSnapshot = state.tokens.slice()
  const timeline = createFigureCaptionScopeTimeline(
    state,
    normalizeFigureCaptionNumberingPolicy(undefined),
  )
  assert.equal(Object.isFrozen(timeline), true)
  assert.equal(Object.isFrozen(timeline.boundaries), true)
  assert.equal(Object.isFrozen(timeline.initialContext), true)
  assert.deepEqual(state.tokens, tokenSnapshot)
})

test('counter resolver consumes canonical p-captions decisions', () => {
  const markRegState = getMarkRegStateForLanguages(['ja', 'en'])
  const decision = analyzeCaptionStart('図 キャプション', {
    markRegState,
    preferredMark: 'pre-samp',
  })
  const resolve = createFigureCaptionCounterKeyResolver({
    languages: ['ja', 'en'],
  })
  assert.equal(resolve(decision), 'figure')
  assert.throws(() => resolve({ mark: 'samp', labelText: '図' }), /canonical/)
})

test('production imports only the public figure numbering subpath', () => {
  const productionFiles = [
    path.join(root, 'index.js'),
    ...fs.readdirSync(path.join(root, 'lib'))
      .filter((name) => name.endsWith('.js'))
      .map((name) => path.join(root, 'lib', name)),
  ]
  for (const file of productionFiles) {
    const source = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(
      source,
      /@peaceroad\/markdown-it-figure-with-p-caption\/caption-numbering\//,
    )
  }
})

test('every production import is a direct dependency', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  for (const dependency of [
    '@peaceroad/markdown-it-figure-with-p-caption',
    'js-yaml',
    'markdown-it',
    'markdown-it-front-matter',
    'p7d-markdown-it-p-captions',
  ]) {
    assert.equal(typeof pkg.dependencies[dependency], 'string')
  }
})

test('installed runtime dependency versions match the audited 0.4 contract', () => {
  const versions = [
    ['@peaceroad/markdown-it-figure-with-p-caption', '0.21.0'],
    ['js-yaml', '5.4.1'],
    ['markdown-it', '15.0.1'],
    ['markdown-it-front-matter', '0.2.4'],
    ['p7d-markdown-it-p-captions', '0.26.0'],
  ]
  for (const [packageName, expected] of versions) {
    const installed = JSON.parse(fs.readFileSync(
      path.join(root, 'node_modules', ...packageName.split('/'), 'package.json'),
      'utf8',
    ))
    assert.equal(installed.version, expected)
  }
})
