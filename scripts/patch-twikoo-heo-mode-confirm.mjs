/**
 * 移除 Heo 版 Twikoo 切换「其他方式 / 匿名」时的引导弹窗。
 *
 * 上游 switchToMode 的实现：
 *   "anonymous"===t||"other"===t ? (this.pendingMode=t, this.showModeConfirm=true)
 *                                  : this.applyModeSwitch(t)
 * 即这两个模式必须先经过弹窗（tk-mode-confirm-dialog，讲 HeoID 推广）才会真正生效。
 * 本站已把首屏按钮接到 Halo 登录，弹窗与本站流程无关，直接把分支改成 applyModeSwitch。
 *
 * 幂等：重复执行不报错；上游升级导致特征串变化时会明确报错而不是静默失效。
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const TARGET = path.join('templates', 'assets', 'libs', 'twikoo', 'twikoo.heo.min.js')

const NEEDLE = '"anonymous"===t||"other"===t?(this.pendingMode=t,void(this.showModeConfirm=!0)):void this.applyModeSwitch(t)'
const REPLACEMENT = '"anonymous"===t||"other"===t?void this.applyModeSwitch(t):void this.applyModeSwitch(t)'

// 注意：marker 必须是注释，不能是裸标识符 —— 形如 `foo:bar-baz;` 会被解析成减法表达式
const MARKER = '/*hao:mode-confirm-removed*/'
// 早期版本误用 `hao:mode-confirm-removed;` 作前缀（会抛 ReferenceError），这里先剥掉
const BAD_PREFIX = /^hao:mode-confirm-removed;\s*/

if (!fs.existsSync(TARGET)) {
  console.error(`[twikoo-patch] 找不到 ${TARGET}，先执行 npm run sync-vendor`)
  process.exit(1)
}

let code = fs.readFileSync(TARGET, 'utf8')

const bad = BAD_PREFIX.test(code)
if (bad) {
  code = code.replace(BAD_PREFIX, '')
  fs.writeFileSync(TARGET, code, 'utf8')
  console.log('[twikoo-patch] 已清理早期版本的非法前缀')
}

if (code.includes(MARKER)) {
  console.log('[twikoo-patch] 已打过补丁，跳过')
  process.exit(0)
}

// 早前版本可能已替换过 needle 却没写 marker（marker 当时是非法前缀），先补 marker
if (code.includes(REPLACEMENT)) {
  fs.writeFileSync(TARGET, `${MARKER}${code}`, 'utf8')
  console.log('[twikoo-patch] 已补写 marker')
  process.exit(0)
}

const hits = code.split(NEEDLE).length - 1
if (hits !== 1) {
  console.error(
    `[twikoo-patch] 特征串命中 ${hits} 次（期望 1 次）。上游 twikoo.heo.min.js 已变化，` +
    '请重新确认 switchToMode 的实现后再更新本脚本。',
  )
  process.exit(1)
}

code = code.replace(NEEDLE, REPLACEMENT)
code = `${MARKER};${code}`

fs.writeFileSync(TARGET, code, 'utf8')
console.log('[twikoo-patch] 已移除「其他方式 / 匿名」引导弹窗')
