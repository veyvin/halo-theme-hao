// 将 node_modules 中的第三方库同步到 templates/assets/libs
// 用法：npm run sync-vendor            （按 package.json 版本同步）
//      npm run update-vendor          （npm update 后同步）
//
// 未进 npm 的库（手动维护）：
//   view-image      — 已删除（全仓零调用，fancybox v6 接管图片灯箱）
//   waterfall       — 已替换为 masonry-layout（npm）
//   link/box2d      — 已删除（互动友链 iframe 死代码，无模板引用）
//   instant.page    — 已替换为 quicklink（npm）
//   highlight.js    — 已删除（与 prism 二选一，保留 prism 全语言包）
//   prism 全语言包  — npm 只有 core，需官网 download.html 定制，保持本地 prism.min.js
//   fcircle         — 无 npm 包，保留本地
//   no3d/vue.min.js — 已删除（与顶层 vue@2.6.14 重复）
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
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
  ["countup.js/dist/countUp.umd.js", "countup/countup.js"],
  ["masonry-layout/dist/masonry.pkgd.min.js", "masonry/masonry.pkgd.min.js"],
  ["quicklink/dist/quicklink.umd.js", "quicklink/quicklink.umd.js"],
  ["fast-average-color/dist/index.browser.min.js", "fast-average-color/index.browser.min.js"],
  ["twikoo/dist/twikoo.all.min.js", "twikoo/twikoo.all.min.js"],
  ["artalk/dist/Artalk.js", "artalk/Artalk.js"],
  ["artalk/dist/Artalk.css", "artalk/Artalk.css"],
  ["vue/dist/vue.min.js", "vue/vue.min.js"],
  ["@fancyapps/ui/dist/fancybox/fancybox.umd.js", "fancybox/fancybox.umd.js"],
  ["@fancyapps/ui/dist/fancybox/fancybox.css", "fancybox/fancybox.css"],
  ["@fancyapps/ui/dist/fancybox/l10n/zh_CN.umd.js", "fancybox/fancybox.zh_CN.umd.js"],
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

// 后处理：countup UMD 只导出 countUp.CountUp，主题用裸 `new CountUp`，追加全局别名
{
  const f = lib("countup/countup.js");
  if (existsSync(f)) {
    const tag = "\n;var CountUp = window.CountUp || (window.countUp && window.countUp.CountUp);\n";
    const cur = readFileSync(f, "utf8");
    if (!cur.includes("window.countUp && window.countUp.CountUp")) {
      appendFileSync(f, tag);
      console.log("OK countup/countup.js (+global alias)");
    }
  }
}
