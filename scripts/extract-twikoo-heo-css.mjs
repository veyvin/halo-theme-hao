import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(__dirname, '../templates/assets/libs/twikoo/twikoo.min.js')
const z = fs.readFileSync(src, 'utf8')

function unescapeJsString(raw) {
  let out = ''
  for (let j = 0; j < raw.length; j++) {
    const ch = raw[j]
    if (ch === '\\') {
      const n = raw[j + 1]
      if (n === 'n') { out += '\n'; j++; continue }
      if (n === 'r') { out += '\r'; j++; continue }
      if (n === 't') { out += '\t'; j++; continue }
      if (n === "'" || n === '"' || n === '\\') { out += n; j++; continue }
      out += n; j++; continue
    }
    out += ch
  }
  return out
}

function extractQuoted(fromIndex) {
  const quoteChar = z[fromIndex]
  if (quoteChar !== '"' && quoteChar !== "'") return null
  let j = fromIndex + 1
  let raw = ''
  while (j < z.length) {
    const ch = z[j]
    if (ch === '\\') {
      raw += ch + (z[j + 1] || '')
      j += 2
      continue
    }
    if (ch === quoteChar) {
      return { css: unescapeJsString(raw), end: j + 1 }
    }
    raw += ch
    j++
  }
  return null
}

const chunks = []
let search = 0
while (true) {
  const pushAt = z.indexOf('push([t.id,', search)
  if (pushAt < 0) break
  const q = pushAt + 'push([t.id,'.length
  const extracted = extractQuoted(q)
  search = pushAt + 12
  if (!extracted) continue
  const css = extracted.css
  if (
    css.includes('HeoBlog Twikoo') ||
    css.includes('--heo-') ||
    css.includes('.tk-submit') ||
    css.includes('.tk-btn') ||
    css.includes('.tk-meta-input') ||
    css.includes('.tk-rich-text') ||
    css.includes('.OwO')
  ) {
    chunks.push(css.trim())
  }
}

if (!chunks.length) throw new Error('no twikoo css chunks found')

const header = `/* Twikoo 2.x Heo 皮肤 — 自 blog.zhheo.com/twikoo.min.js 抽取全部主题 CSS */\n\n`
const outPath = path.join(__dirname, '../templates/assets/zhheo/twikoo-v2-heo.css')
fs.writeFileSync(outPath, header + chunks.join('\n\n') + '\n')
console.log('chunks', chunks.length, 'bytes', fs.statSync(outPath).size)
