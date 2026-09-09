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

## 📷 预览

![Hao 主题预览](./screenshot.webp)

## ✨ 特性

- 🎨 **暗色 / 亮色双配色** — 后台一键切换，基于 CSS 设计令牌构建
- 🔄 **PJAX 无刷新跳转** — 站内跳转淡入淡出，支持后退 / 前进恢复阅读位置
- 🖼️ **图片灯箱** — 文章封面、正文插图均可全屏预览
- 📱 **响应式布局** — 完美适配桌面端与移动端
- 🎵 **内置音乐播放器** — APlayer + Meting2，支持网易云 / QQ 音乐歌单
- 💬 **多评论系统** — 支持 Twikoo、Waline、Artalk 与 Halo 原生评论
- 🗂️ **丰富页面** — 首页、归档、分类、标签、作者、瞬间、友链、相册、装备等
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
| 当前版本（1.7.2） | >= 2.22.1 |

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
- 友链页面 [plugin-links](https://www.halo.run/store/apps/app-hfbQg)
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
3. 部分页面（友链、关于、音乐、留言板、相册等）需在 **页面** 中创建并选择对应的页面模板
4. 主题设置项较多，建议逐项浏览后再进行个性化配置

## 📄 新页面模板

以下页面需在 Halo 后台 → **页面** → 新建自定义页面 → 右侧 **模板** 下拉框选择对应模板，发布后把地址加到菜单：

| 模板 | 建议 slug | 说明 |
| --- | --- | --- |
| 友情链接页面模版 | `links` | 含友链列表 + 鱼塘，需安装友链插件 |
| 关于页面模版 | `about` | 个人介绍小部件流 |
| 音乐页面模版 | `music` | 音乐馆，需在设置中填写歌单 |
| 留言板页面模版 | `comments` | 信笺样式留言引导 + 评论 |
| 待办清单页面模版 | `todolist` | 配置见设置 → 页面-待办 |
| 相册页面模版 | `album` | 分组封面墙，需安装图库插件 |
| 最近评论页面模版 | `new_comment` | 全站最新评论时间线 |
| 热门文章页面模版 | `hot` | 按访问量排行，数量见设置 → 页面-热榜 |
| 数据统计页面模版 | `stats` | 文章 / 分类 / 评论 / 访问 / 建站天数大盘 |

> 改动设置或模板后，记得在主题管理页点 **重载主题配置**。

## 🐟 鱼塘 API 配置

- 友链页鱼塘：设置 → 页面-友链 → **鱼塘数据 API**（留空则鱼塘无数据）。
- 朋友圈页：设置 → 页面-友链 → **朋友圈数据 API**（默认内置地址）+ **友链每页数量**。
- 图库分组页：设置 → 页面-图库 → **返回地址**填图库分组页地址（如 `/album`）。

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
| Shift + L | 友链（地址跟随设置） |
| Shift + K | 关闭快捷键 |
| Ctrl/⌘ + F | 站内搜索（需搜索插件） |

## 💬 讨论

如果你对主题有什么建议或者意见，欢迎提 PR 或 Issue。

- [提交 Issue](../../issues/new)
- [提交 Pull Request](../../compare)

## 📄 许可

本项目使用 [GPL-3.0](./LICENSE) 协议开源，请遵守开源协议。
