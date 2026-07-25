import { performance } from 'node:perf_hooks'

const importStart = performance.now()
const { setFigureCaptionNumbers: transform } = await import('../../index.js')
const importDuration = performance.now() - importStart

const percentile = (sorted, value) => (
  sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)]
)

const buildCorpus = ({
  captions = false,
  chapters = false,
  count = 500,
  explicit = false,
  frontmatter = false,
  mixedLineEndings = false,
  samp = false,
} = {}) => {
  const parts = frontmatter ? ['---\ntitle: Notes\n---\n'] : []
  for (let index = 0; index < count; index++) {
    const eol = mixedLineEndings && index % 3 === 0 ? '\r\n' : '\n'
    if (chapters && index % 50 === 0) {
      parts.push(`# Chapter ${index / 50 + 1}${eol}${eol}`)
    }
    if (captions) {
      const label = samp && index % 2 === 0 ? '図' : 'Figure.'
      const number = explicit ? String(index + 1) : ''
      const numberedLabel = label === '図'
        ? label + number
        : `Figure${number ? ` ${number}` : ''}.`
      parts.push(`${numberedLabel} Caption ${index}${eol}${eol}`)
    } else {
      parts.push(`Paragraph ${index}.${eol}${eol}`)
    }
  }
  return parts.join('')
}

const scenarios = [
  {
    name: 'no-caption/automatic',
    options: undefined,
    source: buildCorpus(),
  },
  {
    name: 'frontmatter-no-caption/automatic',
    options: undefined,
    source: buildCorpus({ count: 5000, frontmatter: true }),
  },
  {
    name: 'dense-caption/document',
    options: { numbering: { scope: 'document' } },
    source: buildCorpus({ captions: true }),
  },
  {
    name: 'many-chapters/automatic',
    options: undefined,
    source: buildCorpus({ captions: true, chapters: true }),
  },
  {
    name: 'shared-samp/automatic',
    options: { marks: ['samp', 'img'] },
    source: buildCorpus({ captions: true, chapters: true, samp: true }),
  },
  {
    name: 'mixed-line-endings/automatic',
    options: undefined,
    source: buildCorpus({
      captions: true,
      chapters: true,
      mixedLineEndings: true,
    }),
  },
  {
    name: 'explicit-only/document',
    options: { numbering: { scope: 'document' } },
    source: buildCorpus({ captions: true, explicit: true }),
  },
  {
    name: 'marks-disabled',
    options: { marks: [] },
    source: buildCorpus({ captions: true, chapters: true }),
  },
]

console.log(`module-import: ${importDuration.toFixed(2)} ms`)
for (const scenario of scenarios) {
  for (let index = 0; index < 5; index++) {
    transform(scenario.source, scenario.options)
  }
  const samples = []
  for (let sample = 0; sample < 15; sample++) {
    const start = performance.now()
    transform(scenario.source, scenario.options)
    samples.push(performance.now() - start)
  }
  samples.sort((left, right) => left - right)
  console.log(
    `${scenario.name}: ` +
    `median=${percentile(samples, 0.5).toFixed(2)} ms ` +
    `p95=${percentile(samples, 0.95).toFixed(2)} ms ` +
    `size=${scenario.source.length}`,
  )
}
