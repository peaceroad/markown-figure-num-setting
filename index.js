import { markReg as markRegEx, joint as jointStr } from "p7d-markdown-it-p-captions"


const markReg = markRegEx
const markRegKeys = Object.keys(markReg)
const joint = jointStr
const jointSuffixCaptureReg = new RegExp('(' + joint + ')$')
const asciiAlphaStartReg = /^[A-Za-z]/
const blankLineReg = /^[ \t]*$/
const figureImageReg = /^([ \t]*\!\[) *?(.*?([0-9]*)) *?(\]\(.*?\))/
//console.log(markReg)
//console.log(joint)

const getLabelInfo = (hasMarkLabel) => {
  const markLabel = hasMarkLabel[1] !== undefined
    ? hasMarkLabel[1]
    : hasMarkLabel[4] !== undefined
      ? hasMarkLabel[4]
      : hasMarkLabel[0]
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


const setImageAltNumber = (lines, n, currentNumber, altLabel) => {
  const prevNumber = currentNumber - 1
  let i = n - 1
  //console.log('lines[n]: ' + lines[n])
  //console.log('CheckPrevLine')
  while (i >= 0 && blankLineReg.test(lines[i])) {
    i--
  }
  if (i >= 0) {
    const isFigureImage = lines[i].match(figureImageReg)
    if (isFigureImage) {
      //console.log(isFigureImage[3], prevNumber.toString())
      if (isFigureImage[3] !== prevNumber.toString()) {
        lines[i] = lines[i].replace(figureImageReg, '$1' + altLabel + '$4')
        //console.log('ChangePrevLine: ' + lines[i])
        return
      }
    }
  }

  //console.log('CheckNextLine')
  i = n + 1
  while (i < lines.length && blankLineReg.test(lines[i])) {
    i++
  }
  if (i < lines.length) {
    const isFigureImage = lines[i].match(figureImageReg)
    //console.log(isFigureImage)
    if (isFigureImage) {
      lines[i] = lines[i].replace(figureImageReg, '$1' + altLabel + '$4')
      //console.log('ChangeNextLine: ' + lines[i])
    }
  }
  return
}

const setMarkdownFigureNum = (markdown, option) => {
    let opt = {
      img: true,
      table: false,
      'pre-code': false,
      'pre-samp': false,
      blockquote: false,
      slide: false,
      noSetAlt: true,
      setNumberAlt: false,
      setImgAlt: false,
    }
    if (option) Object.assign(opt, option)
    const shouldSetAlt = opt.setNumberAlt || opt.setImgAlt || opt.noSetAlt === false

  let n = 0
  let lines = []
  let lineBreaks = []
  const counter = {
    img: 0,
    table: 0,
    "pre-code": 0,
    "pre-samp": 0,
    blockquote: 0,
    slide: 0,
  }

  lines = markdown.split(/\r\n|\n/)
  lineBreaks = markdown.match(/\r\n|\n/g);
  let isBackquoteCodeBlock = false
  let isTildeCodeBlock = false
  let isMathBlock = false

  if(lines.length === 0) return markdown

  while (n < lines.length) {
    if (lines[n].match(/^ *```/)) {
      if (isBackquoteCodeBlock) {
        isBackquoteCodeBlock = false
      } else {
        isBackquoteCodeBlock = true
      }
    }
    if (lines[n].match(/^ *~~~/)) {
      if (isTildeCodeBlock) {
        isTildeCodeBlock = false
      } else {
        isTildeCodeBlock = true
      }
    }
    if (lines[n].match(/^ *\$\$/)) {
      if (isMathBlock) {
        isMathBlock = false
      } else {
        isMathBlock = true
      }
    }
    if (isBackquoteCodeBlock || isTildeCodeBlock || isMathBlock) {
      n++
      continue
    }

    //console.log('====== n: ' + n + ' lines[n]: ' + lines[n])
    for (let mark of markRegKeys) {
      const hasMarkLabel = lines[n].match(markReg[mark])
      if (hasMarkLabel && opt[mark]) {
        //console.log(hasMarkLabel)
        counter[mark]++
        const labelInfo = getLabelInfo(hasMarkLabel)
        const captionLabel = buildLabel(labelInfo, counter[mark], false)
        lines[n] = lines[n].replace(hasMarkLabel[0], () => captionLabel)
        if (mark === 'img' && shouldSetAlt) {
          const altLabel = buildLabel(labelInfo, counter[mark], true)
          setImageAltNumber(lines, n, counter[mark], altLabel)
        }
      }
    }
    n++
  }
  n = 0
  markdown = ''
  while (n < lines.length) {
    if (n === lines.length - 1) {
      markdown += lines[n]
    } else {
      markdown += lines[n] + lineBreaks[n]
    }
    n++
  }

  return markdown
}

export default setMarkdownFigureNum
