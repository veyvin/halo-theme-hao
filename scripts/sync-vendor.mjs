// 将 node_modules 中的第三方库同步到 templates/assets/libs
// 用法：npm run sync-vendor            （按 package.json 版本同步）
//      npm run update-vendor          （npm update 后同步）
//
// 未进 npm 的库（手动维护）：
//   fancybox 3.5.7  — npm 只有 3.0.1，从 GitHub releases 手动更新
//   qrcodejs        — 已进 npm（qrcodejs@1.0.0）
//   waterfall       — raphamorim/waterfall.js 无 npm 包，保留本地
//   view-image      — tokinx/ViewImage 无有效 npm 包，保留本地
//   prism 全语言包  — npm 只有 core，需官网 download.html 定制，保持本地 prism.min.js
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = (p) => join(root, "node_modules", p);
const lib = (p) => join(root, "templates/assets/libs", p);

// [npm 源路径, 主题目标路径]
const MAP = [
  ["jquery/dist/jquery.min.js", "jquery/jquery.min.js"],
  ["pjax/pjax.min.js", "pjax/pjax.min.js"],
  ["swiper/swiper-bundle.min.js", "swiper/swiper-bundle.min.js"],
  ["swiper/swiper-bundle.min.css", "swiper/swiper-bundle.min.css"],
  // highlight.js：npm 包无浏览器 min 构建，用 cdn-release 手动同步，见下
  ["vanilla-lazyload/dist/lazyload.iife.min.js", "vanilla-lazyload/lazyload.iife.min.js"],
  ["tocbot/dist/tocbot.min.js", "tocbot/4.18.2/tocbot.min.js"],
  ["tocbot/dist/tocbot.css", "tocbot/4.18.2/tocbot.css"],
  ["gsap/dist/gsap.min.js", "gsap/gsap.min.js"],
  // instant.page：npm 包无 min 构建，手动从 jsdelivr 同步 min 版
  ["meting/dist/Meting.min.js", "aplayer/Meting2.min.js"],
  ["aplayer/dist/APlayer.min.js", "aplayer/APlayer.min.js"],
  ["aplayer/dist/APlayer.min.css", "aplayer/APlayer.min.css"],
  ["dplayer/dist/DPlayer.min.js", "dplayer/DPlayer.min.js"],
  ["hls.js/dist/hls.min.js", "hls/hls.min.js"],
  ["clipboard/dist/clipboard.min.js", "clipboard/clipboard.min.js"],
  ["qrcodejs/qrcode.min.js", "qrcode/qrcode.min.js"],
  ["pace-js/pace.min.js", "pace/pace.min.js"],
  ["node-snackbar/dist/snackbar.min.js", "node-snackbar/snackbar.min.js"],
  ["node-snackbar/dist/snackbar.min.css", "node-snackbar/snackbar.min.css"],
  ["countup.js/dist/countUp.min.js", "countup/countup.js"],
  ["fast-average-color/dist/index.browser.min.js", "fast-average-color/index.browser.min.js"],
  ["twikoo/dist/twikoo.all.min.js", "twikoo/twikoo.all.min.js"],
  ["artalk/dist/Artalk.js", "artalk/Artalk.js"],
  ["artalk/dist/Artalk.css", "artalk/Artalk.css"],
  ["vue/dist/vue.min.js", "vue/vue.min.js"],
];

let ok = 0;
for (const [from, to] of MAP) {
  const src = nm(from);
  const dst = lib(to);
  if (!existsSync(src)) {
    console.error(`MISS ${from} （先 npm install）`);
    continue;
  }
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  console.log(`OK ${to}`);
  ok++;
}
console.log(`\ndone ${ok}/${MAP.length}`);
