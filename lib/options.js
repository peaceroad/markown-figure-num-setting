import { loadAll as parseYamlDocuments } from 'js-yaml'
import {
  getMarkRegStateForLanguages,
  normalizeAutoLabelNumberSets,
} from 'p7d-markdown-it-p-captions'
import {
  createFigureCaptionCounterKeyResolver,
  normalizeFigureCaptionNumberingPolicy,
} from '@peaceroad/markdown-it-figure-with-p-caption/caption-numbering.js'

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)
const defaultMarks = Object.freeze(['img'])
const topLevelOptionNames = new Set([
  'frontmatter',
  'imageAlt',
  'languages',
  'marks',
  'numbering',
])
const numberingOptionNames = new Set(['scope', 'separator'])
const numberingScopeOptionNames = new Set([
  'headingLevels',
  'repeatScope',
  'sources',
])
const frontmatterOptionNames = new Set(['parse'])
const yamlParseOptions = Object.freeze({ maxAliases: 100 })
const legacyOptionMigrations = Object.freeze({
  img: 'Use marks: ["img"].',
  video: 'Use marks: ["video"].',
  table: 'Use marks: ["table"].',
  'pre-code': 'Use marks: ["code"] or marks: ["pre-code"].',
  'pre-samp': 'Use marks: ["samp"] or marks: ["pre-samp"].',
  blockquote: 'The blockquote mark is not supported by the 0.4 source editor.',
  slide: 'The slide mark is not supported by the 0.4 source editor.',
  audio: 'The audio mark is not supported by the 0.4 source editor.',
  labelMarkMap: 'Order marks to define ambiguous-label priority.',
  noSetAlt: 'Image alt rewriting is not supported in 0.4.0.',
  setNumberAlt: 'Image alt rewriting is not supported in 0.4.0.',
  setImgAlt: 'Image alt rewriting is not supported in 0.4.0.',
})
let defaultTransformOptions = null

const isPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const assertKnownProperties = (value, allowed, optionName) => {
  const keys = Object.keys(value)
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index]
    if (!allowed.has(key)) {
      throw new TypeError(`${optionName} property "${key}" is not supported.`)
    }
  }
}

const validateNumberingInput = (value) => {
  if (value === undefined || value === null) return
  if (!isPlainObject(value)) {
    throw new TypeError('options.numbering must be an object, null, or undefined.')
  }
  assertKnownProperties(value, numberingOptionNames, 'options.numbering')
  if (!hasOwn(value, 'scope')) return
  const scope = value.scope
  if (
    scope === undefined ||
    scope === null ||
    scope === 'auto' ||
    scope === 'document'
  ) {
    return
  }
  if (!isPlainObject(scope)) {
    throw new TypeError(
      'options.numbering.scope must be "auto", "document", a plain object, null, or undefined.',
    )
  }
  assertKnownProperties(
    scope,
    numberingScopeOptionNames,
    'options.numbering.scope',
  )
}

const defaultFrontmatterParser = (raw) => {
  const documents = parseYamlDocuments(raw, yamlParseOptions)
  if (documents.length > 1) {
    throw new TypeError('frontmatter YAML must contain a single document.')
  }
  return documents[0] ?? {}
}

const normalizeFrontmatterParser = (value) => {
  if (value === undefined) return defaultFrontmatterParser
  if (!isPlainObject(value)) {
    throw new TypeError('options.frontmatter must be an object.')
  }
  assertKnownProperties(value, frontmatterOptionNames, 'options.frontmatter')
  if (!hasOwn(value, 'parse') || typeof value.parse !== 'function') {
    throw new TypeError('options.frontmatter.parse must be a synchronous function.')
  }
  return value.parse
}

export const isPlainFrontmatterObject = isPlainObject

export const normalizeTransformOptions = (value) => {
  if (value === undefined && defaultTransformOptions) {
    return defaultTransformOptions
  }
  const options = value === undefined ? {} : value
  if (!isPlainObject(options)) {
    throw new TypeError('options must be an object or undefined.')
  }

  const keys = Object.keys(options)
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index]
    if (hasOwn(legacyOptionMigrations, key)) {
      throw new TypeError(
        `Legacy option "${key}" is not supported. ${legacyOptionMigrations[key]}`,
      )
    }
    if (!topLevelOptionNames.has(key)) {
      throw new TypeError(`options property "${key}" is not supported.`)
    }
  }

  const marks = hasOwn(options, 'marks')
    ? normalizeAutoLabelNumberSets(options.marks)
    : defaultMarks
  const hasMarks = marks.length > 0

  if (hasOwn(options, 'languages') && !Array.isArray(options.languages)) {
    throw new TypeError('options.languages must be an array when provided.')
  }
  const markRegState = getMarkRegStateForLanguages(
    hasOwn(options, 'languages') ? options.languages : undefined,
  )
  const languages = markRegState.languages

  const numberingProvided = hasOwn(options, 'numbering')
  const numberingInput = numberingProvided ? options.numbering : undefined
  validateNumberingInput(numberingInput)
  let numberingPolicy = null
  if (hasMarks || numberingProvided) {
    numberingPolicy = normalizeFigureCaptionNumberingPolicy(numberingInput)
  }
  const timelinePolicy = hasMarks
    ? numberingPolicy || normalizeFigureCaptionNumberingPolicy({ scope: 'document' })
    : null
  const analysisOptions = hasMarks
    ? Object.freeze(marks.length === 1
      ? {
          markRegState,
          preferredMark: marks[0],
        }
      : {
          allowedMarks: marks,
          markRegState,
        })
    : null

  if (hasOwn(options, 'imageAlt')) {
    if (options.imageAlt !== false) {
      throw new TypeError(
        'options.imageAlt currently accepts only false; structural image-alt rewriting is not implemented.',
      )
    }
  }

  const normalized = Object.freeze({
    analysisOptions,
    frontmatterParser: normalizeFrontmatterParser(options.frontmatter),
    markRegState,
    marks,
    paragraphAnalysisOptions: hasMarks
      ? Object.freeze({ markRegState })
      : null,
    resolveCounterKey: hasMarks
      ? createFigureCaptionCounterKeyResolver({ languages })
      : null,
    timelinePolicy,
  })
  if (value === undefined) defaultTransformOptions = normalized
  return normalized
}
