import MarkdownIt from 'markdown-it'
import frontMatter from 'markdown-it-front-matter'
import {
  analyzeCaptionParagraph,
  analyzeCaptionStart,
} from 'p7d-markdown-it-p-captions'
import {
  createFigureCaptionNumberCodec,
  createFigureCaptionScopeTimeline,
} from '@peaceroad/markdown-it-figure-with-p-caption/caption-numbering.js'
import {
  isPlainFrontmatterObject,
  normalizeTransformOptions,
} from './options.js'
import {
  extendLineStartOffsets,
  locateCaptionLabelInsertion,
  rebuildSource,
} from './source-edits.js'

const invocationKey = Symbol('markownFigureNumberingInvocation')
const collectorRuleName = 'markown_collect_figure_caption_edits'
const emptyCandidates = Object.freeze([])
const numberCodec = createFigureCaptionNumberCodec()
const parser = new MarkdownIt({ html: true })
  .use(frontMatter, () => {})

const isThenable = (value) => (
  value &&
  (
    typeof value === 'object' ||
    typeof value === 'function'
  ) &&
  typeof value.then === 'function'
)

const assertMatchingAnalysis = (leadingAnalysis, decision) => (
  decision &&
  decision.mark === leadingAnalysis.mark &&
  decision.labelText === leadingAnalysis.labelText &&
  decision.matchedText === leadingAnalysis.matchedText
)

const ensureLineOffsetsThrough = (invocation, line) => {
  if (!Number.isSafeInteger(line) || line < 0) return false
  if (!invocation.lineStarts) invocation.lineStarts = [0]
  extendLineStartOffsets(invocation.source, invocation.lineStarts, line)
  return invocation.lineStarts.length > line
}

const getSourceLineEnd = (source, start) => {
  let end = start
  while (end < source.length) {
    const code = source.charCodeAt(end)
    if (code === 0x0a || code === 0x0d) break
    end++
  }
  return end
}

const getHyphenDelimiterLength = (source, start, end) => {
  while (
    start < end &&
    (
      source.charCodeAt(start) === 0x20 ||
      source.charCodeAt(start) === 0x09
    )
  ) {
    start++
  }
  while (
    end > start &&
    (
      source.charCodeAt(end - 1) === 0x20 ||
      source.charCodeAt(end - 1) === 0x09
    )
  ) {
    end--
  }
  const markerStart = start
  while (start < end && source.charCodeAt(start) === 0x2d) start++
  return start === end ? end - markerStart : 0
}

const hasClosingFrontmatterDelimiter = (source, lineStarts, sourceMap) => {
  if (
    !Array.isArray(sourceMap) ||
    sourceMap.length !== 2 ||
    !Number.isSafeInteger(sourceMap[1]) ||
    sourceMap[1] < 2
  ) {
    return false
  }
  const openingStart = source.charCodeAt(0) === 0xfeff ? 1 : 0
  const openingEnd = getSourceLineEnd(source, openingStart)
  const openingLength = getHyphenDelimiterLength(
    source,
    openingStart,
    openingEnd,
  )
  if (openingLength < 3) return false

  const closingLine = sourceMap[1] - 1
  if (closingLine >= lineStarts.length) return false
  const start = lineStarts[closingLine]
  const end = getSourceLineEnd(source, start)
  return getHyphenDelimiterLength(source, start, end) >= openingLength
}

const parseFrontmatter = (state, invocation) => {
  const token = state.tokens[0]
  if (!token || token.type !== 'front_matter') return
  if (
    !Array.isArray(token.map) ||
    !ensureLineOffsetsThrough(invocation, token.map[1] - 1) ||
    !hasClosingFrontmatterDelimiter(
      invocation.source,
      invocation.lineStarts,
      token.map,
    )
  ) {
    throw new SyntaxError('Frontmatter must have a closing delimiter.')
  }
  const raw = typeof token.meta === 'string' ? token.meta : ''
  const parsed = invocation.options.frontmatterParser(raw)
  if (isThenable(parsed)) {
    throw new TypeError('options.frontmatter.parse must return synchronously, not a Promise or thenable.')
  }
  if (!isPlainFrontmatterObject(parsed)) {
    throw new TypeError('options.frontmatter.parse must return a plain object.')
  }
  state.env.frontmatter = parsed
}

const getMarkAnalysisState = (invocation, mark) => {
  if (!invocation.analysisStateByMark) {
    invocation.analysisStateByMark = Object.create(null)
  }
  let analysisState = invocation.analysisStateByMark[mark]
  if (analysisState) return analysisState
  analysisState = {
    generatedOptions: {
      markRegState: invocation.options.markRegState,
      preferredMark: mark,
    },
    paragraphContext: { captionName: mark },
  }
  invocation.analysisStateByMark[mark] = analysisState
  return analysisState
}

const collectCaptionCandidates = (state, invocation, timeline) => {
  let candidates = null
  const boundaries = timeline.boundaries
  let boundaryIndex = 0
  let context = timeline.initialContext

  for (let tokenIndex = 0; tokenIndex < state.tokens.length; tokenIndex++) {
    while (
      boundaryIndex < boundaries.length &&
      boundaries[boundaryIndex].tokenIndex < tokenIndex
    ) {
      context = boundaries[boundaryIndex].context
      boundaryIndex++
    }

    const paragraph = state.tokens[tokenIndex]
    if (
      !paragraph ||
      paragraph.type !== 'paragraph_open' ||
      paragraph.hidden
    ) {
      continue
    }
    const inline = state.tokens[tokenIndex + 1]
    if (
      !inline ||
      inline.type !== 'inline' ||
      inline.hidden ||
      typeof inline.content !== 'string'
    ) {
      continue
    }

    const leadingAnalysis = analyzeCaptionStart(
      inline.content,
      invocation.analysisOptions,
    )
    if (!leadingAnalysis) continue

    const analysisState = getMarkAnalysisState(
      invocation,
      leadingAnalysis.mark,
    )
    const decision = analyzeCaptionParagraph(
      tokenIndex,
      state,
      analysisState.paragraphContext,
      invocation.paragraphAnalysisOptions,
    )
    if (!assertMatchingAnalysis(leadingAnalysis, decision)) continue

    if (
      !Array.isArray(paragraph.map) ||
      !ensureLineOffsetsThrough(invocation, paragraph.map[1] - 1)
    ) {
      continue
    }
    const insertion = locateCaptionLabelInsertion(
      invocation.source,
      invocation.lineStarts,
      paragraph.map,
      decision,
    )
    if (insertion === null) continue

    if (!candidates) candidates = []
    candidates.push({
      context,
      decision,
      generatedAnalysisOptions: analysisState.generatedOptions,
      inlineContent: inline.content,
      insertion,
    })
    if (!decision.hasExplicitNumber) invocation.needsCounterPlan = true
  }
  return candidates || emptyCandidates
}

const collectFromState = (state) => {
  const invocation = state.env && state.env[invocationKey]
  if (!invocation) return
  parseFrontmatter(state, invocation)
  const timeline = createFigureCaptionScopeTimeline(
    state,
    invocation.options.timelinePolicy,
  )
  if (!timeline || timeline.hasUnmappableBoundaries) {
    invocation.result = { candidates: emptyCandidates, unsafe: true }
    return
  }
  invocation.result = {
    candidates: collectCaptionCandidates(state, invocation, timeline),
    unsafe: false,
  }
}

parser.core.ruler.after('inline', collectorRuleName, collectFromState)

const getCounterPartition = (counters, counterKey) => {
  let partition = counters.get(counterKey)
  if (!partition) {
    partition = new Map()
    counters.set(counterKey, partition)
  }
  return partition
}

const buildGeneratedNumberInsertion = (candidate, number) => {
  const label = candidate.decision.labelText
  const code = label.charCodeAt(0)
  const asciiAlphabetic = (
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a)
  )
  const replacement = (asciiAlphabetic ? ' ' : '') + number
  const relativeInsertion = label.length
  const content = (
    candidate.inlineContent.slice(0, relativeInsertion) +
    replacement +
    candidate.inlineContent.slice(relativeInsertion)
  )
  const analysis = analyzeCaptionStart(
    content,
    candidate.generatedAnalysisOptions,
  )
  if (
    !analysis ||
    analysis.mark !== candidate.decision.mark ||
    analysis.labelText !== label ||
    !analysis.hasExplicitNumber ||
    analysis.number !== number
  ) {
    throw new RangeError('The generated caption replacement is not valid p-captions syntax.')
  }
  return {
    end: candidate.insertion,
    expected: '',
    replacement,
    start: candidate.insertion,
  }
}

const planEdits = (source, candidates, resolveCounterKey) => {
  const counters = new Map()
  const edits = []

  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index]
    const partition = getCounterPartition(
      counters,
      resolveCounterKey(candidate.decision),
    )
    const sequenceKey = candidate.context.sequenceKey
    const current = partition.get(sequenceKey) || 0

    if (candidate.decision.hasExplicitNumber) {
      const explicit = numberCodec.parseExplicit(
        candidate.decision.number,
        candidate.context,
      )
      if (explicit !== null && explicit > current) {
        partition.set(sequenceKey, explicit)
      }
      continue
    }

    const next = current + 1
    if (!Number.isSafeInteger(next)) {
      throw new RangeError('The next caption counter is not a safe integer.')
    }
    const number = numberCodec.format(next, candidate.context)
    edits.push(buildGeneratedNumberInsertion(candidate, number))
    partition.set(sequenceKey, next)
  }

  return rebuildSource(source, edits)
}

export const setFigureCaptionNumbers = (source, options) => {
  if (typeof source !== 'string') {
    throw new TypeError('source must be a string.')
  }
  const normalized = normalizeTransformOptions(options)
  if (normalized.marks.length === 0 || source.length === 0) return source

  const invocation = {
    analysisOptions: normalized.analysisOptions,
    analysisStateByMark: null,
    lineStarts: null,
    options: normalized,
    paragraphAnalysisOptions: normalized.paragraphAnalysisOptions,
    resolveCounterKey: normalized.resolveCounterKey,
    needsCounterPlan: false,
    result: null,
    source,
  }
  const env = { [invocationKey]: invocation }
  const parseSource = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source
  parser.parse(parseSource, env)

  if (!invocation.result) {
    throw new Error('The markdown-it collector did not produce a result.')
  }
  if (invocation.result.unsafe || !invocation.needsCounterPlan) {
    return source
  }
  return planEdits(
    source,
    invocation.result.candidates,
    invocation.resolveCounterKey,
  )
}
