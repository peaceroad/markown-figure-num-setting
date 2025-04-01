import assert from 'assert'
import fs from 'fs'
import path from 'path'
import setMarkdownFigureNum from '../index.js'
import setMarkdownFigureNumWithNoSetAlt from '../index.js'

let __dirname = path.dirname(new URL(import.meta.url).pathname)
const isWindows = (process.platform === 'win32')
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\')
}

let pass = true

const check = (name, ex) => {
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
    let h
    let option = {}
    if (name === 'default') {
      h = setMarkdownFigureNum(m)
    }
    if (name === 'noSetAlt') {
      option.noSetAlt = true
      h = setMarkdownFigureNumWithNoSetAlt(m, option)
    }

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


const example = {
  default: __dirname + path.sep + 'examples.txt',
  noSetAlt: __dirname + path.sep + 'examples-no-set-alt.txt',
}
for (let ex in example) {
  console.log('[' + ex + '] >>> ' + example[ex])
  check(ex, example[ex])
}

if (pass) console.log('\nAll tests passed.')
