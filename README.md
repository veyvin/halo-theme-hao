# Hao (Fork)

> 本主题是 [Hao](https://github.com/chengzhongxue/halo-theme-hao) 的 Fork 版本。

Fork 自: [https://github.com/chengzhongxue/halo-theme-hao](https://github.com/chengzhongxue/halo-theme-hao)

---

<div align="center">
<!-- 主题 Logo -->
<img width="100px" src="./templates/assets/images/hao-logo.jpg" alt="Hao">
<!-- 主题名称 -->
<h1>Hao</h1>
<!-- 主题简介 -->
<p>一款基于 Thymeleaf 的 Halo 2.x 博客主题，参考 Butterfly 与 Heo 设计风格。</p>
<!-- 快捷导航 -->
<p>
  <a href="#-预览">主题预览</a> · <a href="#-安装">快速上手</a> · <a href="#-使用">使用文档</a> · <a href="#-讨论">加入讨论</a>
</p>
</div>

## ℹ️ 简介

Hao 是一款适用于 [Halo 2.x](https://github.com/halo-dev/halo) 的博客主题，基于 Thymeleaf 模板引擎开发，参考 Butterfly 与 Heo 的设计风格，融合 PJAX 无刷新跳转、暗色模式、代码高亮、音乐播放器、评论弹幕、瞬间、友链等丰富的博客特性。

本 Fork 版本在原主题基础上进行调整和优化。

## 📷 预览

![Hao 主题预览](./screenshot.webp)

## ✨ 特性

- 🎨 **暗色 / 亮色双配色** — 后台一键切换，基于 CSS 设计令牌构建
- 🔄 **PJAX 无刷新跳转** — 站内跳转淡入淡出，支持后退 / 前进恢复阅读位置
- 🖼️ **图片灯箱** — 文章封面、正文插图均可全屏预览
- 📱 **响应式布局** — 完美适配桌面端与移动端
- 🎵 **内置音乐播放器** — APlayer + Meting2，支持网易云 / QQ 音乐歌单
- 💬 **多评论系统** — 支持 Twikoo、Waline、Artalk 与 Halo 原生评论
- 🗂️ **丰富页面** — 首页、归档、分类、标签、作者、瞬间、装备等
- 🔍 **目录与搜索** — 文章自动生成 TOC 目录，配合搜索插件快速检索
- 📝 **代码高亮** — PrismJS 多主题高亮，行号 / 复制按钮一应俱全
- 🧭 **面包屑导航** — 分类、标签、作者等页面层级清晰

## 🚀 安装

### 方式一：应用市场（推荐）

1. 进入 Halo 后台 → **主题管理** → **应用市场**
2. 搜索 **Hao** 主题
3. 点击 **安装**，安装完成后 **启用** 即可

### 方式二：手动安装

1. 在 [Release](../../releases) 页面下载最新版本的 `zip` 安装包
2. 进入 Halo 后台 → **主题管理** → **上传主题**
3. 选择下载的 `zip` 文件上传，安装完成后 **启用**

### 环境要求

| 主题版本 | 最低 Halo 版本 |
| --- | --- |
| 1.5.5 及以上 | >= 2.17.0 |
| 1.6.0 及以上 | >= 2.20.0（自定义登录页兼容） |
| 当前版本（1.9.4） | >= 2.22.8 |

## ⚠️ 注意事项

1. **建站时间为必填项**，启用主题前请在主题设置中填写
2. 若安装主题后报错，请仔细查阅主题说明与 [Release 更新日志](../../releases)
3. 若安装后出现 **500 错误**，请进入主题设置页面，将每个设置项逐一保存一次
4. 若问题仍未解决，可在 [Issue](../../issues) 区提问，提问前请先搜索是否已有相同问题

## 🔌 插件依赖

> 所有插件均为可选，不安装则不会出现对应功能。
> 部分插件可能已预置在 Halo 内，部分插件主题可能尚未适配。

- 评论功能 [plugin-comment-widget](https://www.halo.run/store/apps/app-YXyaD)
- 搜索功能 [plugin-search-widget](https://www.halo.run/store/apps/app-DlacW)
- 页脚友链 [plugin-links](https://www.halo.run/store/apps/app-hfbQg)
- 瞬间页面 [plugin-moments](https://www.halo.run/store/apps/app-SnwWD)
- 追番插件 [plugin-bilibili-bangumi](https://www.halo.run/store/apps/app-OTFPN)
- 图库插件 [plugin-photos](https://www.halo.run/store/apps/app-BmQJW)
- KaTeX 插件 [plugin-katex](https://www.halo.run/store/apps/app-ISCsX)
- 我的装备 [plugin-equipment](https://www.halo.run/store/apps/app-ytygyqml)
- Markdown / HTML 内容块插件 [plugin-hybrid-edit-block](https://www.halo.run/store/apps/app-NgHnY)
- 爱发电 [plugin-afdian](https://www.halo.run/store/apps/app-oXvZp)

> 更多插件请参见 [awesome-halo](https://github.com/halo-sigs/awesome-halo)。

## 📖 使用

1. 安装并启用主题后，进入 **主题管理** → 对应主题 → **设置**
2. 按需配置基础信息（建站时间、ICP 备案等）与各功能模块
3. 部分页面（如热门文章）需在 **页面** 中创建并选择对应的页面模板
4. 主题设置项较多，建议逐项浏览后再进行个性化配置

## 📄 新页面模板

以下页面需在 Halo 后台 → **页面** → 新建自定义页面 → 右侧 **模板** 下拉框选择对应模板，发布后把地址加到菜单：

| 模板 | 建议 slug | 说明 |
| --- | --- | --- |
| 热门文章页面模版 | `hot` | 按访问量排行，数量见设置 → 页面-热榜 |

> 改动设置或模板后，记得在主题管理页点 **重载主题配置**。

## 🔗 朋友圈与图库配置

- 朋友圈页：设置 → 页面-朋友圈 → **朋友圈数据 API**（默认内置地址）+ **友链每页数量**。
- 图库页：设置 → 页面-图库 → **返回地址**（默认 `/album`，相册页已移除，可按需改为任意地址）。

## 🤖 robots.txt 与 AI 内容信号

主题在 `templates/assets/robots.txt` 提供了一份开箱即用的 `robots.txt`，启用主题后即可访问：

```
https://你的域名/themes/theme-hao/assets/robots.txt
```

**注意：Halo 主题无法在站点根路径注册路由**，所以这个地址不会自动变成 `https://你的域名/robots.txt`。需要在反向代理或 CDN 层做一次映射，搜索引擎和 AI 爬虫只会读根路径那一份。

### 1. 修改偏好

编辑 `templates/assets/robots.txt` 里的一行，三个字段逗号分隔，取值 `yes` / `no`：

```
Content-Signal: ai-train=no, search=yes, ai-input=no
```

| 字段 | 含义 | 默认值 |
| --- | --- | --- |
| `ai-train` | 是否允许把本站内容用于 AI 模型训练或微调 | `no` |
| `search` | 是否允许被搜索引擎收录并展示标题、摘要 | `yes` |
| `ai-input` | 是否允许被 AI 检索 / RAG 实时取用来生成答案 | `no` |

规范见 [contentsignals.org](https://contentsignals.org/) 与 IETF draft `draft-ietf-aipref-vocab`。默认策略是**允许被搜索引擎收录，但禁止训练和 RAG 实时取用**。

> 内容信号是给 AI 爬虫的**声明**，对不遵守的爬虫不具强制力。若要硬性拦截（如 `GPTBot`、`CCBot`），仍需额外加对应的 `User-agent` + `Disallow` 段。

### 2. 映射到根路径

**Nginx**（放在 `server` 块内，且要早于转发到 Halo 的 `location /`）：

```nginx
location = /robots.txt {
    alias /path/to/halo/themes/theme-hao/templates/assets/robots.txt;
    default_type text/plain;
    add_header Cache-Control "public, max-age=3600";
}
```

> `alias` 指向**服务器磁盘上**的路径。容器部署时路径要用容器内路径，或改用 `proxy_pass http://127.0.0.1:8090/themes/theme-hao/assets/robots.txt;` 让 Halo 自己返回。

**Caddy**：

```caddyfile
example.com {
    @robots path /robots.txt
    rewrite @robots /themes/theme-hao/assets/robots.txt
    reverse_proxy 127.0.0.1:8090
}
```

**Apache**（`.htaccess`）：

```apache
RewriteEngine On
RewriteRule ^robots\.txt$ /themes/theme-hao/assets/robots.txt [L]
```

**Cloudflare**：不用改源站，直接在 **Rules → Transform Rules → Modify Response Header**，或 **Workers** 里对 `/robots.txt` 请求回源到主题资源地址即可；也可以在 **AI Crawl Control** 面板里直接配置 Content Signals。

**Docker**：把文件挂进容器，或用上面任一反向代理方案。Halo 官方镜像不含 Web 服务器，根路径的 `robots.txt` 需要你在前面那层解决。

改完记得清掉 CDN 与浏览器缓存。

### 3. 校验 Content Signals

```bash
curl -fsSL https://你的域名/robots.txt | grep -i 'content-signal'
```

期望输出 `Content-Signal: ai-train=no, search=yes, ai-input=no`。

再用 [isitagentready.com](https://isitagentready.com/) 扫一下站点，确认 `checks.botAccessControl.contentSignals.status` 为 `pass`：

```bash
curl -X POST https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://你的域名"}'
```

### 4. Agent 发现：Link 头与 Markdown 协商

有两件事主题做不到，只能在边缘补：

- **HTTP 响应头**：Thymeleaf 没有设置响应头的能力，主题发不了 `Link` 头。
- **`text/markdown` 协商**：Halo 的 `SinglePageRoute` 要求 `Accept: text/html`，
  且渲染出来的一定是 HTML，主题无法按内容协商返回 Markdown。

仓库里带了一个 Cloudflare Worker（`edge/agent-discovery-worker.js`），源站零改动：

1. 客户端 `Accept` 明确带 `text/markdown` 时，返回正文 Markdown。
   浏览器发的是 `text/html` 加通配类型，不含 `text/markdown`，**不受影响**。
2. 其它 HTML 响应补上 `Link` 头，只指向真实存在的资源：

```
Link: </rss.xml>; rel="alternate"; type="application/rss+xml"
Link: </sitemap.xml>; rel="related"; type="application/xml"
```

Markdown 响应带 `Vary: Accept`，避免 CDN 把 Markdown 喂给浏览器。

主题本身已在 `<head>` 输出 RSS 的 `rel="alternate"` 链接
（受 `设置 → SEO → 输出 canonical 和社交分享标签` 控制，检测到 `PluginFeed` 才输出），
未装订阅插件时不会暴露 404 地址。

**本地先跑测试**（纯逻辑都在 `edge/lib/*.mjs`，不依赖 Workers 运行时）：

```bash
npm run test:edge                            # 49 项断言
node edge/test/run-tests.mjs --update        # 刷新真实页面快照
```

快照取自 `veyvin.com` 的真实渲染结果，覆盖标题层级、表格、shiki 代码块、
嵌套列表、引用块、脚本不泄漏，以及「浏览器 Accept 不被切换」这类回归。

**部署**（Workers & Pages → Create → Worker）。Worker 名和配置都在
`edge/wrangler.jsonc` 里，直接在该目录执行：

```bash
cd edge
npx wrangler deploy
```

再到该 Worker 的 **Settings → Triggers → Routes** 绑定到 `你的域名/*`。

**校验**：

```bash
curl -I https://你的域名/                        # 应有 Link 头
curl -s -H 'Accept: text/markdown' https://你的域名/ | head -30
curl -sI https://你的域名/ | grep -i vary       # 应含 Vary: Accept
```

`edge/wrangler.jsonc` 里开了 `observability.traces`（默认全量采样），
调试回源与内容协商时到 Worker 的 **Observability → Traces** 看请求级链路。
注意这里记的是 HTTP 请求，不含任何 LLM 消息或工具载荷 —— 本 Worker 不发模型请求。

> ⚠️ Worker **不会**替你生成 API Catalog、OAuth / OIDC discovery、
> A2A Agent Card、MCP Server Card、Web Bot Auth 或 DNS-AID。
> 那些端点是「我提供这套基础设施」的对外声明；博客发布它们等于宣告一个
> 自己并不控制的 issuer 和端点，只会让 Agent 在鉴权或调用中途失败。
> 站上真有 OAuth 服务端或 MCP Server 时，再按对应规范补。

## ⌨️ 快捷键

需先在中控台开启快捷键（默认关闭）。输入框聚焦时不触发。

| 按键 | 功能 |
| --- | --- |
| Shift + T | 朗读文章（文章页，需开启朗读） |
| Shift + P | 陪读模式（文章页，需开启朗读） |
| Shift + C | AI 助手（文章页，需开启 AI 助手） |
| Shift + A | 中控台 |
| Shift + M | 音乐播放 |
| Shift + D | 深浅色切换 |
| Shift + R | 随机文章 |
| Shift + H | 首页 |
| Shift + F | 瞬间 |
| Shift + K | 关闭快捷键 |
| Ctrl/⌘ + F | 站内搜索（需搜索插件） |

## 💬 讨论

如果你对主题有什么建议或者意见，欢迎提 PR 或 Issue。

- [提交 Issue](../../issues/new)
- [提交 Pull Request](../../compare)

## 致谢

- [chengzhongxue/halo-theme-hao](https://github.com/chengzhongxue/halo-theme-hao) — 原主题作者
