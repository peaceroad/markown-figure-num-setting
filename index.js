import { analyzeCaptionStart, getMarkRegStateForLanguages } from "p7d-markdown-it-p-captions"


const markRegState = getMarkRegStateForLanguages()
const markOrder = Object.freeze([
  'img',
  'video',
  'table',
  'pre-code',
  'pre-samp',
  'blockquote',
  'slide',
  'audio',
])
const lineSplitReg = /\r\n|\n/
const lineBreakReg = /\r\n|\n/g
const defaultOption = Object.freeze({
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
})
const defaultActiveMarks = Object.freeze(markOrder.filter((mark) => defaultOption[mark]))

const isAsciiAlphaStart = (text) => {
  if (!text) {
    return false
  }
  const code = text.charCodeAt(0)
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

const isBlankLine = (line) => {
  let i = 0
  while (i < line.length) {
    const code = line.charCodeAt(i)
    if (code !== 32 && code !== 9) {
      return false
    }
    i++
  }
  return true
}

const buildLabel = (analysis, counter, isAlt) => {
  let label = analysis.labelText + (isAsciiAlphaStart(analysis.labelText) ? ' ' : '') + counter
  if (!isAlt && analysis.joint) {
    label += analysis.joint
  }
  return label
}


const parseImageLine = (line) => {
  let i = 0
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
    i++
  }
  if (line[i] !== '!' || line[i + 1] !== '[') {
    return null
  }

  const altStart = i + 2
  let altEnd = altStart
  let escaped = false
  while (altEnd < line.length) {
    const ch = line[altEnd]
    if (escaped) {
      escaped = false
    } else if (ch === '\\') {
      escaped = true
    } else if (ch === ']') {
      break
    }
    altEnd++
  }
  if (altEnd >= line.length || line[altEnd + 1] !== '(') {
    return null
  }

  let n = altEnd + 2
  let parenDepth = 1
  let inSingleQuote = false
  let inDoubleQuote = false
  escaped = false
  while (n < line.length) {
    const ch = line[n]
    if (escaped) {
      escaped = false
    } else if (ch === '\\') {
      escaped = true
    } else if (inSingleQuote) {
      if (ch === "'") inSingleQuote = false
    } else if (inDoubleQuote) {
      if (ch === '"') inDoubleQuote = false
    } else if (ch === "'") {
      inSingleQuote = true
    } else if (ch === '"') {
      inDoubleQuote = true
    } else if (ch === '(') {
      parenDepth++
    } else if (ch === ')') {
      parenDepth--
      if (parenDepth === 0) {
        return {
          altStart,
          altEnd,
        }
      }
    }
    n++
  }

  return null
}

const replaceImageAlt = (line, altLabel, parsedImage) => {
  return line.slice(0, parsedImage.altStart) + altLabel + line.slice(parsedImage.altEnd)
}

const parseFenceSequence = (line) => {
  let i = 0
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
    i++
  }
  const marker = line[i]
  if (marker !== '`' && marker !== '~') {
    return null
  }
  let j = i
  while (line[j] === marker) {
    j++
  }
  const length = j - i
  if (length < 3) {
    return null
  }
  return {
    marker,
    length,
    rest: line.slice(j),
  }
}

const parseCodeFenceOpen = (line) => {
  const fence = parseFenceSequence(line)
  if (!fence) {
    return null
  }
  // CommonMark-style guard: backtick fence info text cannot contain backticks.
  if (fence.marker === '`' && fence.rest.includes('`')) {
    return null
  }
  return {
    marker: fence.marker,
    length: fence.length,
  }
}

const isCodeFenceClose = (line, fenceOpen) => {
  const fence = parseFenceSequence(line)
  if (!fence) {
    return false
  }
  if (fence.marker !== fenceOpen.marker || fence.length < fenceOpen.length) {
    return false
  }
  return isBlankLine(fence.rest)
}

const getMathFenceLength = (line) => {
  let i = 0
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
    i++
  }
  const start = i
  while (line[i] === '$') {
    i++
  }
  const length = i - start
  if (length < 2) {
    return 0
  }
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
    i++
  }
  return i === line.length ? length : 0
}

const setImageAltNumber = (lines, n, altLabel, usedImageLineIndexes) => {
  let i = n - 1
  while (i >= 0 && isBlankLine(lines[i])) {
    i--
  }
  if (i >= 0) {
    const parsedImage = parseImageLine(lines[i])
    if (parsedImage && !usedImageLineIndexes.has(i)) {
      lines[i] = replaceImageAlt(lines[i], altLabel, parsedImage)
      usedImageLineIndexes.add(i)
      return
    }
  }

  i = n + 1
  while (i < lines.length && isBlankLine(lines[i])) {
    i++
  }
  if (i < lines.length) {
    const parsedImage = parseImageLine(lines[i])
    if (parsedImage && !usedImageLineIndexes.has(i)) {
      lines[i] = replaceImageAlt(lines[i], altLabel, parsedImage)
      usedImageLineIndexes.add(i)
    }
  }
}

const joinLinesWithOriginalLineBreaks = (lines, lineBreaks) => {
  if (!lineBreaks || lineBreaks.length === 0) {
    return lines[0]
  }

  let markdown = lines[0]
  let n = 1
  while (n < lines.length) {
    markdown += lineBreaks[n - 1] + lines[n]
    n++
  }
  return markdown
}

const selectCaptionAnalysis = (line, activeMarks, activeMarkLookup, labelMarkMap) => {
  const analysis = analyzeCaptionStart(line, {
    markRegState,
    allowedMarks: activeMarks,
  })
  if (!analysis || !labelMarkMap) {
    return analysis
  }

  const mappedMark = labelMarkMap[analysis.labelText]
  if (!mappedMark || mappedMark === analysis.mark || !activeMarkLookup[mappedMark]) {
    return analysis
  }

  const mappedAnalysis = analyzeCaptionStart(line, {
    markRegState,
    preferredMark: mappedMark,
  })
  if (
    mappedAnalysis &&
    mappedAnalysis.labelText === analysis.labelText &&
    mappedAnalysis.matchedText === analysis.matchedText
  ) {
    return mappedAnalysis
  }
  return analysis
}

const setMarkdownFigureNum = (markdown, option) => {
  if (typeof markdown !== 'string') {
    return markdown
  }

  const opt = option && typeof option === 'object'
    ? { ...defaultOption, ...option }
    : defaultOption
  const shouldSetAlt = opt.setNumberAlt || opt.setImgAlt || opt.noSetAlt === false
  const labelMarkMap = opt.labelMarkMap && typeof opt.labelMarkMap === 'object'
    ? opt.labelMarkMap
    : null
  const activeMarks = opt === defaultOption
    ? defaultActiveMarks
    : markOrder.filter((mark) => opt[mark])
  if (activeMarks.length === 0) {
    return markdown
  }

  const lines = markdown.split(lineSplitReg)
  const lineBreaks = lines.length > 1 ? markdown.match(lineBreakReg) : null
  const counter = Object.create(null)
  for (let i = 0; i < activeMarks.length; i++) {
    counter[activeMarks[i]] = 0
  }
  const activeMarkLookup = labelMarkMap ? Object.create(null) : null
  if (activeMarkLookup) {
    for (let i = 0; i < activeMarks.length; i++) {
      activeMarkLookup[activeMarks[i]] = true
    }
  }
  const usedImageLineIndexes = shouldSetAlt ? new Set() : null

  let codeFenceOpen = null
  let mathFenceLength = 0

  let n = 0
  while (n < lines.length) {
    if (codeFenceOpen) {
      if (isCodeFenceClose(lines[n], codeFenceOpen)) {
        codeFenceOpen = null
      }
      n++
      continue
    }
    if (mathFenceLength > 0) {
      if (getMathFenceLength(lines[n]) >= mathFenceLength) {
        mathFenceLength = 0
      }
      n++
      continue
    }

    const codeFenceStart = parseCodeFenceOpen(lines[n])
    if (codeFenceStart) {
      codeFenceOpen = codeFenceStart
      n++
      continue
    }
    const mathFenceStartLength = getMathFenceLength(lines[n])
    if (mathFenceStartLength > 0) {
      mathFenceLength = mathFenceStartLength
      n++
      continue
    }

    const analysis = selectCaptionAnalysis(lines[n], activeMarks, activeMarkLookup, labelMarkMap)
    if (analysis) {
      const mark = analysis.mark
      counter[mark]++
      const captionLabel = buildLabel(analysis, counter[mark], false)
      lines[n] = lines[n].replace(analysis.matchedText, () => captionLabel)
      if (mark === 'img' && shouldSetAlt) {
        const altLabel = buildLabel(analysis, counter[mark], true)
        setImageAltNumber(lines, n, altLabel, usedImageLineIndexes)
      }
    }
    n++
  }
  return joinLinesWithOriginalLineBreaks(lines, lineBreaks)
}

export default setMarkdownFigureNum
