const setMarkdownFigureNum = (markdown, option) => {

  let opt = {
    img: true,
    table: true,
    code: false,
    samp: false,
    blockquote: false,
  }

  opt["pre-code"] = opt.code
  opt["pre-samp"] = opt.samp

  const markAfterNum = '[A-Z0-9]{1,6}(?:[.-][A-Z0-9]{1,6}){0,5}';
  const markAfterNumAfterJoint = '[.:．。：　]';

  const markAfterEn = '(?:' +
    '[ 　]*' + markAfterNumAfterJoint + '(?:(?=[ ]+)|$)|' +
    '[ 　]*' + markAfterNum + markAfterNumAfterJoint + '(?:(?=[ ]+)|$)|' +
    '[ 　]*' + markAfterNum + '(?:(?=[ 　]+[^a-z])|$)|' +
    '[.]' + markAfterNum + '(?:(?=[ 　]+[^a-z])|$)' +
  ')';
  const markAfterJa = '(?:' +
    '[ 　]*(?:' + markAfterNumAfterJoint + '|(?=[ ]))|' +
    '[ 　]*' + markAfterNum + '(?:' + markAfterNumAfterJoint + '(?:(?=[ ])|$))|' +
    '[ 　]*' + markAfterNum + '(?:[:。．:：　]|(?=[ ])|$)' +
  ')';


  const markReg = {
    //fig(ure)?, illust, photo
    "img": new RegExp('^(?:' +
      '(?:[fF][iI][gG](:?[uU][rR][eE])?|[iI][lL]{2}[uU][sS][tT]|[pP][hH][oO[tT][oO])'+ markAfterEn + '|' +
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
      '(?:(?:ソース)?コード|命令|プログラム|算譜|アルゴリズム|算法)' + markAfterJa +
    ')'),
    //terminal, prompt, command
    "pre-samp": new RegExp('^(?:' +
      '(?:[cC][oO][nN][sS][oO][lL][eE]|[tT][eE][rR][mM][iI][nN][aA][lL]|[pP][rR][oO][mM][pP][tT]|[cC][oO][mM]{2}[aA][nN][dD])'+ markAfterEn + '|' +
      '(?:端末|ターミナル|コマンド|(?:コマンド)?プロンプト)' + markAfterJa +
    ')'),
    //quote, blockquote
    "blockquote": new RegExp('^(?:' +
      '(?:(?:[bB][lL][oO][cC][kK])?[qQ][uU][oO][tT][eE])'+ markAfterEn + '|' +
      '(?:引用(?:元)?|出典)' + markAfterJa +
    ')')
  }
  
  const label = (hasMarkLabel, hasFigureImageReg) => {
    if (/ */.test(hasFigureImageReg[2])) {
      if (/[^a-zA-Z]/.test(hasMarkLabel[0])) {
        return hasMarkLabel[0].replace(new RegExp(markAfterNum + '$'), '')
      }
     return hasMarkLabel[0]
    }
    return ''
  }

  let n = 0
  let lines = []
  let lineBreaks = []
  const hasFigureImageReg = /^( *\!\[ *)(.*?)( *\]\(.*?\))/
  const counter = {
    img: 0,
    table: 0,
    "pre-code": 0,
    "pre-samp": 0,
    blockquote: 0,
  }
  lines = markdown.split(/\r\n|\n/)
  lineBreaks = markdown.match(/\r\n|\n/g);

  if(lines.length === 0) {
    lines.push(markdown)
  }
  while (n < lines.length) {
    lines[n]
    for (let mark of Object.keys(markReg)) {
      const hasMarkLabel = lines[n].match(markReg[mark]);
      //console.log(hasMarkLabel)
      if (hasMarkLabel) {
        counter[mark]++
        lines[n] = lines[n].replace(new RegExp('^([ 　]*)' + hasMarkLabel[0]), '$1' + label(hasMarkLabel, hasFigureImageReg) + counter[mark])

        let hasNextFigureImage = false
        //let hasPrevFigureImage = false
        let i = n + 1
        while (i < lines.length) {
          if (/^\s*$/.test(lines[i])) {
            i++
            continue
          }
          if (lines[i].match(new RegExp(hasFigureImageReg))) {
            lines[i] = lines[i].replace(new RegExp(hasFigureImageReg), '$1$2' + label(hasMarkLabel, hasFigureImageReg) + counter[mark] + '$3')
            hasNextFigureImage = true
          }
          break
        }
        if (!hasNextFigureImage) {
          i = n -1
          while (i >= 0) {
            if (/^\s$/.test(lines[i])) {
            i--
            continue
            }
            if (lines[i].match(new RegExp(hasFigureImageReg))) {
              lines[i] = lines[i].replace(new RegExp(hasFigureImageReg), '$1$2' + label(hasMarkLabel, hasFigureImageReg) + counter[mark] + '$3')
            }
            break
          }
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
