import assert from 'assert'
import fs from 'fs'
import path from 'path'
import setMarkdownFigureNum from '../index.js'

let __dirname = path.dirname(new URL(import.meta.url).pathname)
const isWindows = (process.platform === 'win32')
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\')
}
const example = __dirname + path.sep + 'examples.txt'
const exampleCont = fs.readFileSync(example, 'utf-8').trim()
let ms = [];
let ms0 = exampleCont.split(/\n*\[Input\]\n/)
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

n = 1;
while(n < ms.length) {
  if (n !== 1) { n++; continue }
  console.log('Test: ' + n + ' >>>')
  const m = ms[n].inputMarkdown
  const h = setMarkdownFigureNum(m)
  try {
    assert.strictEqual(h, ms[n].outputMarkdown)
  } catch(e) {
    console.log('incorrect: ')
    console.log('H: ' + h +'\n\nC: ' + ms[n].outputMarkdown)
  }
  n++
}