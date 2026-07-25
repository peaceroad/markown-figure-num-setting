import assert from 'node:assert/strict'
import test from 'node:test'
import { setFigureCaptionNumbers as transform } from '../index.js'

import './test-dependency-contract.js'
import './test-differential.js'
import './test-frontmatter.js'
import './test-numbering.js'
import './test-options.js'
import './test-source-edits.js'

test('preserves mixed CRLF and LF line endings in an inline regression', () => {
  const input = (
    'Figure. A\r\n' +
    '\r\n' +
    'Paragraph.\n' +
    '\n' +
    'Figure. B\r\n'
  )
  const expected = (
    'Figure 1. A\r\n' +
    '\r\n' +
    'Paragraph.\n' +
    '\n' +
    'Figure 2. B\r\n'
  )
  assert.equal(
    transform(input, { numbering: { scope: 'document' } }),
    expected,
  )
})
