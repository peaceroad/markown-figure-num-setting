const setMarkdownFigureNum = (markdown, option) => {

  let opt = {
    img: true,
    table: false,
    code: false,
    samp: false,
    blockquote: false,
    slide: false,
  }
  opt["pre-code"] = opt.code
  opt["pre-samp"] = opt.samp
  if (option !== undefined) {
    for (let o in option) {
      opt[o] = option[o];
    }
  }


  const markAfterNum = '[A-Z0-9]{1,6}(?:[.-][A-Z0-9]{1,6}){0,5}';
  const joint = '[.:．。：　]';
  const jointFullWidth = '[．。：　]';
  const jointHalfWidth = '[.:]';

  const markAfterEn = '(?:' +
    ' *(?:' +
      jointHalfWidth + '(?:(?=[ ]+)|$)|' +
      jointFullWidth + '|' +
      '(?=[ ]+[^0-9a-zA-Z])' +
    ')|' +
    ' *' + '(' + markAfterNum + ')(?:' +
      jointHalfWidth + '(?:(?=[ ]+)|$)|' +
      jointFullWidth + '|' +
      '(?=[ ]+[^a-z])|$' +
    ')|' +
    '[.](' + markAfterNum + ')(?:' +
      joint + '|(?=[ ]+[^a-z])|$' +
    ')' +
  ')';

  const markAfterJa = '(?:' +
    ' *(?:' +
      jointHalfWidth + '(?:(?=[ ]+)|$)|' +
      jointFullWidth + '|' +
      '(?=[ ]+)' +
    ')|' +
    ' *' + '(' + markAfterNum + ')(?:' +
      jointHalfWidth + '(?:(?=[ ]+)|$)|' +
      jointFullWidth + '|' +
      '(?=[ ]+)|$' +
    ')' +
  ')';

  const markReg = {
    //fig(ure)?, illust, photo
    "img": new RegExp('^(?:' +
      '(?:[fF][iI][gG](?:[uU][rR][eE])?|[iI][lL]{2}[uU][sS][tT]|[pP][hH][oO[tT][oO])'+ markAfterEn + '|' +
      '(?:図|イラスト|写真)' + markAfterJa +
    ')'),
    //movie, video
    "video": new RegExp('^(?:' +
      '(?:[mM][oO][vV][iI][eE]|[vV][iI][dD][eE][oO])'+ markAfterEn + '|' +
      '(?:動画|ビデオ)' + markAfterJa +
    ')'),
    //table
    "table": new RegExp('^(?:' +
      '(?:[tT][aA][bB][lL][eE])'+ markAfterEn + '|' +
      '(?:表)' + markAfterJa +
    ')'),
    //code(block)?, program
    "pre-code": new RegExp('^(?:' +
      '(?:[cC][oO][dD][eE](?:[bB][lL][oO][cC][kK])?|[pP][rR][oO][gG][rR][aA][mM]|[aA][lL][gG][oO][rR][iI[tT][hH][mM])'+ markAfterEn + '|' +
      '(?:(?:ソース)?コード|リスト|命令|プログラム|算譜|アルゴリズム|算法)' + markAfterJa +
    ')'),
    //terminal, prompt, command
    "pre-samp": new RegExp('^(?:' +
      '(?:[cC][oO][nN][sS][oO][lL][eE]|[tT][eE][rR][mM][iI][nN][aA][lL]|[pP][rR][oO][mM][pP][tT]|[cC][oO][mM]{2}[aA][nN][dD])'+ markAfterEn + '|' +
      '(?:端末|ターミナル|コマンド|(?:コマンド)?プロンプト)' + markAfterJa +
    ')'),
    //quote, blockquote, source
    "blockquote": new RegExp('^(?:' +
      '(?:(?:[bB][lL][oO][cC][kK])?[qQ][uU][oO][tT][eE]|[sS][oO][uU][rR][cC][eE])'+ markAfterEn + '|' +
      '(?:引用(?:元)?|出典)' + markAfterJa +
    ')'),
    //slide
    "slide": new RegExp('^(?:' +
      '(?:[sS][lL][iI][dD][eE])'+ markAfterEn + '|' +
      '(?:スライド)' + markAfterJa +
    ')')
  };

  const label = (hasMarkLabel, counter, isAlt) => {

    let label = hasMarkLabel[0]

    if (hasMarkLabel[3]) {
      label = hasMarkLabel[0].replace(new RegExp(hasMarkLabel[3] + '$'), '')
    }
    let isLabelLastJoint = label.match(new RegExp('(' + joint +')$'))
    if (isLabelLastJoint) {
      if (isAlt) {
        label = label.replace(new RegExp(joint +'$'), '') + ' ' + counter
      } else {
        label = label.replace(new RegExp(joint +'$'), '') + ' ' + counter + isLabelLastJoint[1]
      }
    } else {
      label += counter
    }
    return label
  }


  const setImageAltNumber = (lines, n,  mark, hasMarkLabel, counter) => {
    let isFigureImage
    const isFigureImageReg = /^([ \t]*\!\[) *?(.*?([0-9]*)) *?(\]\(.*?\))/
    let hasPrevCaption
    let i
    i = n - 1
    while (i >= 0) {
      if (/^[ \t]*$/.test(lines[i])) {
        i--
        continue
      }
      isFigureImage =  lines[i].match(new RegExp(isFigureImageReg))
      if (isFigureImage) {
        let j =  i - 1
        while (j >= 0) {
          if (/^[ \t]*$/.test(lines[j])) {
            j--
            continue
          }
          if (lines[j].match(new RegExp(isFigureImageReg[2]))) {
            hasPrevCaption  = true
          }
          if (!hasPrevCaption) {
            lines[i] = lines[i].replace(new RegExp(isFigureImageReg), '$1' + label(hasMarkLabel, counter[mark], true) + '$4')
          }
          break
        }
      }
      break
    }

    if (isFigureImage) return

    i = n + 1
    while (i < lines.length) {
      if (/^[\t ]*$/.test(lines[i])) {
        i++
        continue
      }
      isFigureImage =  lines[i].match(new RegExp(isFigureImageReg))
      if (isFigureImage) {
        lines[i] = lines[i].replace(new RegExp(isFigureImageReg), '$1' + label(hasMarkLabel, counter[mark], true) + '$4')
      }
      break
    }
    return
  }

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
    if (isBackquoteCodeBlock || isTildeCodeBlock) {
      n++
      continue
    }

    for (let mark of Object.keys(markReg)) {
      const hasMarkLabel = lines[n].match(markReg[mark]);
      //if (hasMarkLabel) console.log(hasMarkLabel)
      if (hasMarkLabel && opt[mark]) {
        counter[mark]++
        console.log('lines[n]: ' + lines[n])
        lines[n] = lines[n].replace(new RegExp('^([ \t]*)' + hasMarkLabel[0]), '$1' + label(hasMarkLabel, counter[mark]))
        if (mark === 'img') {
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
