/**
 * 去掉 twikoo.heo.min.js 对 zhheo 图床的硬依赖（头像失败回退会打 p.zhheo.com）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const jsPath = path.join(root, 'templates/assets/libs/twikoo/twikoo.heo.min.js')
let js = fs.readFileSync(jsPath, 'utf8')

const replacements = [
  // 空评论插图 / 默认头像失败回退（会触发 onAvatarError 死循环）
  [
    'https://p.zhheo.com/4PDxal20590581778557685079.png!cover',
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
        <rect width="80" height="80" rx="40" fill="#e5e7eb"/>
        <circle cx="40" cy="32" r="14" fill="#9ca3af"/>
        <path d="M16 68c4-14 16-22 24-22s20 8 24 22" fill="#9ca3af"/>
      </svg>`.replace(/\s+/g, ' ')
    )
  ],
  [
    'https://p.zhheo.com/hk2bxF23390681781176773395.webp',
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">
        <rect width="160" height="120" fill="#f3f4f6"/>
        <text x="80" y="64" text-anchor="middle" fill="#9ca3af" font-size="14" font-family="sans-serif">No comments</text>
      </svg>`.replace(/\s+/g, ' ')
    )
  ],
  [
    'https://p.zhheo.com/DGGd4a22890681781176648513.webp',
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">
        <rect width="160" height="120" fill="#1f2937"/>
        <text x="80" y="64" text-anchor="middle" fill="#9ca3af" font-size="14" font-family="sans-serif">No comments</text>
      </svg>`.replace(/\s+/g, ' ')
    )
  ],
  // HeoID 相关图：不可用时用本地占位，避免额外外网依赖
  [
    'https://id.zhheo.com/heoid.webp',
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="12" fill="#425aef"/>
        <text x="32" y="38" text-anchor="middle" fill="#fff" font-size="12" font-family="sans-serif">ID</text>
      </svg>`.replace(/\s+/g, ' ')
    )
  ],
  [
    'https://p.zhheo.com/HDqRA922690381773720566272.png',
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="12" fill="#10b981"/>
        <text x="32" y="38" text-anchor="middle" fill="#fff" font-size="12" font-family="sans-serif">OK</text>
      </svg>`.replace(/\s+/g, ' ')
    )
  ],
  [
    'https://zhheo.com/img/%E5%8D%9A%E5%AE%A2.webp',
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="6" fill="#425aef"/>
        <text x="16" y="21" text-anchor="middle" fill="#fff" font-size="10" font-family="sans-serif">博</text>
      </svg>`.replace(/\s+/g, ' ')
    )
  ],
  [
    'https://zhheo.com/img/%E7%88%B1%E5%8F%91%E7%94%B5.webp',
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="6" fill="#ef4444"/>
        <text x="16" y="21" text-anchor="middle" fill="#fff" font-size="10" font-family="sans-serif">赞</text>
      </svg>`.replace(/\s+/g, ' ')
    )
  ],
]

let changed = 0
for (const [from, to] of replacements) {
  if (!js.includes(from)) {
    console.warn('missing:', from)
    continue
  }
  const n = js.split(from).length - 1
  js = js.split(from).join(to)
  changed += n
  console.log(`patched x${n}: ${from.slice(0, 60)}...`)
}

fs.writeFileSync(jsPath, js)
console.log('done, replacements:', changed)
