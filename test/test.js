import assert from 'assert'
import fs from 'fs'
import path from 'path'
import setMarkdownFigureNum from '../index.js'

let __dirname = path.dirname(new URL(import.meta.url).pathname)
const isWindows = (process.platform === 'win32')
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\')
}

let pass = true

const check = (name, ex, option) => {
  const exCont = fs.readFileSync(ex, 'utf-8').trim()
  let ms = [];
  let ms0 = exCont.split(/\n*\[Input\]\n/)
  let n = 1;
  while(n < ms0.length) {
    let mhs = ms0[n].split(/\n+\[Output[^\]]*?\]\n/)
    let i = 1
    while (i < 2) {
      if (mhs[i] === undefined) {
        mhs[i] = ''
      } else {
        mhs[i] = mhs[i].replace(/$/,'\n')
      }
      i++
    }
    ms[n] = {
      inputMarkdown: mhs[0].trim(),
      outputMarkdown: mhs[1].trim(),
    };
    n++
  }

  n = 1
  while(n < ms.length) {
    //if (n !== 11) {n++; continue }
    console.log('Test: ' + n + ' >>>')
    const m = ms[n].inputMarkdown
    const h = setMarkdownFigureNum(m, option)

    try {
      assert.strictEqual(h, ms[n].outputMarkdown)
    } catch(e) {
      pass = false
      console.log('incorrect: ')
      console.log(m)
      console.log('::convert ->')
      console.log('H: ' + h +'\n\nC: ' + ms[n].outputMarkdown)
    }
    n++
  }
}


const testCases = {
  default: {
    file: __dirname + path.sep + 'examples-no-set-alt.txt',
    option: undefined,
  },
  setNumberAlt: {
    file: __dirname + path.sep + 'examples.txt',
    option: { setNumberAlt: true },
  },
  setNumberAltPreSamp: {
    file: __dirname + path.sep + 'examples-pre-samp.txt',
    option: { setNumberAlt: true, 'pre-samp': true },
  },
  setNumberAltLabelMarkMap: {
    file: __dirname + path.sep + 'examples-label-mark-map.txt',
    option: { setNumberAlt: true, 'pre-samp': true, labelMarkMap: { '図': 'pre-samp' } },
  },
}
for (let name in testCases) {
  console.log('[' + name + '] >>> ' + testCases[name].file)
  check(name, testCases[name].file, testCases[name].option)
}

const mixedLineBreakInput =
  'Figure. A\r\n' +
  '\r\n' +
  '![](a.jpg)\n' +
  '\n' +
  'Figure. B\r\n' +
  '\r\n' +
  '![](b.jpg)'
const mixedLineBreakOutput =
  'Figure 1. A\r\n' +
  '\r\n' +
  '![Figure 1](a.jpg)\n' +
  '\n' +
  'Figure 2. B\r\n' +
  '\r\n' +
  '![Figure 2](b.jpg)'
assert.strictEqual(setMarkdownFigureNum(mixedLineBreakInput, { setNumberAlt: true }), mixedLineBreakOutput)

assert.strictEqual(setMarkdownFigureNum(null), null)
assert.strictEqual(setMarkdownFigureNum(undefined), undefined)
assert.strictEqual(setMarkdownFigureNum(123), 123)

if (pass) console.log('\nAll tests passed.')
