import { markReg as markRegEx, joint as jointStr } from "p7d-markdown-it-p-captions"


const markReg = markRegEx
const joint = jointStr
//console.log(markReg)
//console.log(joint)

const label = (hasMarkLabel, counter, isAlt) => {
  let label = hasMarkLabel[0]
  //console.log('label: ' + label + ' counter: ' + counter)
  let LabelIsEn = /^[a-zA-Z]/.test(label)
  const spaceBeforeCounter = LabelIsEn ? ' ' : ''

  //console.log(hasMarkLabel)
  if (hasMarkLabel[3]) {
    label = hasMarkLabel[0].replace(new RegExp(hasMarkLabel[3] + '$'), '')
  } else if (hasMarkLabel[4]) {
    label = hasMarkLabel[4]
  }
  let hasLabelLastJoint = hasMarkLabel[0].match(new RegExp('(' + joint +')$'))

  if (hasLabelLastJoint) {
    if (isAlt) {
      label = label.replace(new RegExp(joint +'$'), '') + spaceBeforeCounter + counter
    } else {
      label = label.replace(new RegExp(joint +'$'), '') + spaceBeforeCounter + counter + hasLabelLastJoint[1]
    }
  } else {
    label += counter
  }
  //console.log('label: ' + label)
  return label
}


  const setImageAltNumber = (lines, n,  mark, hasMarkLabel, counter) => {
    let hasPrevFigureImage = false
    let isFigureImage
    const figureImageReg = /^([ \t]*\!\[) *?(.*?([0-9]*)) *?(\]\(.*?\))/
    let i
    i = n - 1
    //console.log('lines[n]: ' + lines[n])
    //console.log('CheckPrevLine')
    while (i >= 0) {
      if (/^[ \t]*$/.test(lines[i])) {
        i--
        continue
      }
      isFigureImage =  lines[i].match(new RegExp(figureImageReg))
      if (!isFigureImage) break

      let j =  i
      while (j >= 0) {
        if (/^[ \t]*$/.test(lines[j])) {
          j--
          continue
        }
        //console.log(isFigureImage[3], (counter.img - 1).toString())
        if (isFigureImage[3] === (counter.img - 1).toString()) {
          hasPrevFigureImage = false
          break
        }
        lines[i] = lines[i].replace(new RegExp(figureImageReg), '$1' + label(hasMarkLabel, counter[mark], true) + '$4')
        //console.log('ChangePrevLine: ' + lines[i])
        hasPrevFigureImage = true
        break
      }
      break
    }

    if (hasPrevFigureImage) return

    //console.log('CheckNextLine')
    i = n + 1
    while (i < lines.length) {
      if (/^[\t ]*$/.test(lines[i])) {
        i++
        continue
      }
      isFigureImage =  lines[i].match(new RegExp(figureImageReg))
      //console.log(isFigureImage)
      if (isFigureImage) {
        lines[i] = lines[i].replace(new RegExp(figureImageReg), '$1' + label(hasMarkLabel, counter[mark], true) + '$4')
        //console.log('ChangeNextLine: ' + lines[i])
      }
      break
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
      noSetAlt: false,
      setImgAlt: false,
    }
    if (option) Object.assign(opt, option)

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
    for (let mark of Object.keys(markReg)) {
      const hasMarkLabel = lines[n].match(markReg[mark])
      if (hasMarkLabel && opt[mark]) {
        //console.log(hasMarkLabel)
        counter[mark]++
        lines[n] = lines[n].replace(new RegExp('^([ \t]*)' + hasMarkLabel[0]), '$1' + label(hasMarkLabel, counter[mark]))
        if (mark === 'img' && !opt.noSetAlt) {
          setImageAltNumber(lines, n, mark, hasMarkLabel, counter)
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
