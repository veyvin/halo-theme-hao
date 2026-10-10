/**
 * 从 https://twikoo.zhheo.com/emoji/ 同步 Heo 版 Twikoo 内置表情包
 * 到 templates/assets/libs/twikoo/emoji/（与 twikoo.heo.min.js 的 publicPath 一致）
 */
import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const jsPath = path.join(root, 'templates/assets/libs/twikoo/twikoo.heo.min.js')
const outDir = path.join(root, 'templates/assets/libs/twikoo/emoji')
const base = 'https://twikoo.zhheo.com/'

const js = fs.readFileSync(jsPath, 'utf8')
const files = [...new Set([...js.matchAll(/emoji\/[a-zA-Z0-9._-]+\.webp/g)].map((m) => m[0]))]
if (!files.length) {
  console.error('No emoji/*.webp paths found in twikoo.heo.min.js')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

function fetchBin(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBin(res.headers.location).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`${url} -> ${res.statusCode}`))
        res.resume()
        return
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    }).on('error', reject)
  })
}

let ok = 0
let fail = 0
for (const rel of files) {
  const dest = path.join(root, 'templates/assets/libs/twikoo', rel)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    ok++
    continue
  }
  try {
    const buf = await fetchBin(base + rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, buf)
    ok++
    process.stdout.write(`ok ${rel} (${buf.length})\n`)
  } catch (e) {
    fail++
    console.error('fail', rel, e.message)
  }
}
console.log(`done ok=${ok} fail=${fail} total=${files.length} -> ${outDir}`)
if (fail) process.exit(1)
