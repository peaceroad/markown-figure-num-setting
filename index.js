import { getMarkRegForLanguages, joint as jointStr } from "p7d-markdown-it-p-captions"


const markReg = getMarkRegForLanguages()
const markRegEntries = Object.entries(markReg)
const jointSuffixCaptureReg = new RegExp('(' + jointStr + ')$')
const asciiAlphaStartReg = /^[A-Za-z]/
const blankLineReg = /^[ \t]*$/
const trailingDigitsReg = /([0-9]*)$/
const lineSplitReg = /\r\n|\n/
const lineBreakReg = /\r\n|\n/g
const mathFenceFullLineReg = /^[ \t]*(\${2,})[ \t]*$/
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

const getMarkLabelFromMatch = (hasMarkLabel) => {
  for (let i = 1; i < hasMarkLabel.length; i++) {
    if (hasMarkLabel[i] !== undefined) {
      return hasMarkLabel[i]
    }
  }
  return hasMarkLabel[0]
}

const getLabelInfo = (hasMarkLabel) => {
  const markLabel = getMarkLabelFromMatch(hasMarkLabel)
  const jointMatch = hasMarkLabel[0].match(jointSuffixCaptureReg)
  return {
    markLabel,
    joint: jointMatch ? jointMatch[1] : '',
    needsSpace: asciiAlphaStartReg.test(markLabel),
  }
}

const buildLabel = (labelInfo, counter, isAlt) => {
  let label = labelInfo.markLabel + (labelInfo.needsSpace ? ' ' : '') + counter
  if (!isAlt && labelInfo.joint) {
    label += labelInfo.joint
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
        const alt = line.slice(altStart, altEnd)
        const trailingDigitsMatch = alt.match(trailingDigitsReg)
        return {
          alt,
          altStart,
          altEnd,
          trailingDigits: trailingDigitsMatch ? trailingDigitsMatch[1] : '',
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
  return blankLineReg.test(fence.rest)
}

const getMathFenceLength = (line) => {
  const match = line.match(mathFenceFullLineReg)
  return match ? match[1].length : 0
}

const setImageAltNumber = (lines, n, currentNumber, altLabel) => {
  const prevNumber = (currentNumber - 1).toString()
  let i = n - 1
  while (i >= 0 && blankLineReg.test(lines[i])) {
    i--
  }
  if (i >= 0) {
    const parsedImage = parseImageLine(lines[i])
    if (parsedImage) {
      if (parsedImage.trailingDigits !== prevNumber) {
        lines[i] = replaceImageAlt(lines[i], altLabel, parsedImage)
        return
      }
    }
  }

  i = n + 1
  while (i < lines.length && blankLineReg.test(lines[i])) {
    i++
  }
  if (i < lines.length) {
    const parsedImage = parseImageLine(lines[i])
    if (parsedImage) {
      lines[i] = replaceImageAlt(lines[i], altLabel, parsedImage)
    }
  }
}

const joinLinesWithOriginalLineBreaks = (lines, lineBreaks) => {
  if (lineBreaks.length === 0) {
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

const selectCaptionCandidate = (line, activeMarkEntries, labelMarkMap) => {
  let firstCandidate = null
  for (let i = 0; i < activeMarkEntries.length; i++) {
    const mark = activeMarkEntries[i][0]
    const hasMarkLabel = line.match(activeMarkEntries[i][1])
    if (!hasMarkLabel) {
      continue
    }
    const labelInfo = getLabelInfo(hasMarkLabel)
    const candidate = {
      mark,
      hasMarkLabel,
      labelInfo,
    }
    if (!firstCandidate) {
      firstCandidate = candidate
    }
    if (labelMarkMap && labelMarkMap[labelInfo.markLabel] === mark) {
      return candidate
    }
  }
  return firstCandidate
}

const setMarkdownFigureNum = (markdown, option) => {
  if (typeof markdown !== 'string') {
    return markdown
  }

  const opt = option ? { ...defaultOption, ...option } : defaultOption
  const shouldSetAlt = opt.setNumberAlt || opt.setImgAlt || opt.noSetAlt === false
  const labelMarkMap = opt.labelMarkMap && typeof opt.labelMarkMap === 'object'
    ? opt.labelMarkMap
    : null
  const activeMarkEntries = markRegEntries.filter(([mark]) => opt[mark])
  if (activeMarkEntries.length === 0) {
    return markdown
  }

  const lines = markdown.split(lineSplitReg)
  const lineBreaks = markdown.match(lineBreakReg) || []
  const counter = {}
  for (let i = 0; i < activeMarkEntries.length; i++) {
    counter[activeMarkEntries[i][0]] = 0
  }

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

    const selectedCandidate = selectCaptionCandidate(lines[n], activeMarkEntries, labelMarkMap)
    if (selectedCandidate) {
      const mark = selectedCandidate.mark
      counter[mark]++
      const labelInfo = selectedCandidate.labelInfo
      const captionLabel = buildLabel(labelInfo, counter[mark], false)
      lines[n] = lines[n].replace(selectedCandidate.hasMarkLabel[0], () => captionLabel)
      if (mark === 'img' && shouldSetAlt) {
        const altLabel = buildLabel(labelInfo, counter[mark], true)
        setImageAltNumber(lines, n, counter[mark], altLabel)
      }
    }
    n++
  }
  return joinLinesWithOriginalLineBreaks(lines, lineBreaks)
}

export default setMarkdownFigureNum
