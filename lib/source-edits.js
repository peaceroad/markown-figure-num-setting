const hasValidRange = (source, edit) => (
  edit &&
  Number.isSafeInteger(edit.start) &&
  Number.isSafeInteger(edit.end) &&
  edit.start >= 0 &&
  edit.start <= edit.end &&
  edit.end <= source.length &&
  typeof edit.expected === 'string' &&
  typeof edit.replacement === 'string' &&
  source.slice(edit.start, edit.end) === edit.expected
)

export const extendLineStartOffsets = (source, offsets, lastLine) => {
  if (offsets.length > lastLine) return offsets
  let index = offsets[offsets.length - 1]
  while (index < source.length && offsets.length <= lastLine) {
    const code = source.charCodeAt(index)
    if (code === 0x0d) {
      if (source.charCodeAt(index + 1) === 0x0a) index++
      offsets.push(index + 1)
    } else if (code === 0x0a) {
      offsets.push(index + 1)
    }
    index++
  }
  return offsets
}

export const createLineStartOffsets = (source) => (
  extendLineStartOffsets(source, [0], Number.POSITIVE_INFINITY)
)

const getLineEnd = (source, start) => {
  let end = start
  while (end < source.length) {
    const code = source.charCodeAt(end)
    if (code === 0x0a || code === 0x0d) break
    end++
  }
  return end
}

export const locateCaptionLabelInsertion = (
  source,
  lineStarts,
  sourceMap,
  decision,
) => {
  if (
    !Array.isArray(sourceMap) ||
    sourceMap.length !== 2 ||
    !Number.isSafeInteger(sourceMap[0]) ||
    !Number.isSafeInteger(sourceMap[1]) ||
    sourceMap[0] < 0 ||
    sourceMap[1] <= sourceMap[0] ||
    sourceMap[0] >= lineStarts.length ||
    sourceMap[1] > lineStarts.length ||
    decision.prefixMarker
  ) {
    return null
  }

  let position = lineStarts[sourceMap[0]]
  const lineEnd = getLineEnd(source, position)
  if (position === 0 && source.charCodeAt(0) === 0xfeff) position++

  while (position < lineEnd) {
    while (
      position < lineEnd &&
      (source.charCodeAt(position) === 0x20 || source.charCodeAt(position) === 0x09)
    ) {
      position++
    }
    if (source.charCodeAt(position) !== 0x3e) break
    position++
  }

  if (
    position + decision.matchedText.length > lineEnd ||
    !source.startsWith(decision.matchedText, position) ||
    !source.startsWith(decision.labelText, position)
  ) {
    return null
  }
  return position + decision.labelText.length
}

export const validateAndSortEdits = (source, edits) => {
  const sorted = edits.slice().sort((left, right) => (
    left.start - right.start || left.end - right.end
  ))
  let previous = null

  for (let index = 0; index < sorted.length; index++) {
    const edit = sorted[index]
    if (!hasValidRange(source, edit)) {
      throw new RangeError('A planned source edit has an invalid or stale range.')
    }
    if (
      previous &&
      edit.start === previous.start &&
      edit.end === previous.end
    ) {
      throw new RangeError('Multiple source edits target the same range.')
    }
    if (
      previous &&
      (
        edit.start < previous.end ||
        (
          edit.start === previous.start &&
          (edit.start === edit.end || previous.start === previous.end)
        )
      )
    ) {
      throw new RangeError('Planned source edits overlap.')
    }
    previous = edit
  }
  return sorted
}

export const rebuildSource = (source, edits) => {
  if (edits.length === 0) return source
  if (edits.length === 1) {
    const edit = edits[0]
    if (!hasValidRange(source, edit)) {
      throw new RangeError('A planned source edit has an invalid or stale range.')
    }
    return (
      source.slice(0, edit.start) +
      edit.replacement +
      source.slice(edit.end)
    )
  }
  const sorted = validateAndSortEdits(source, edits)
  const output = []
  let cursor = 0
  for (let index = 0; index < sorted.length; index++) {
    const edit = sorted[index]
    output.push(source.slice(cursor, edit.start), edit.replacement)
    cursor = edit.end
  }
  output.push(source.slice(cursor))
  return output.join('')
}
