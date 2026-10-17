/**
 * 把 Halo 渲染出的 HTML 页面转成给 Agent 用的 Markdown 文档。
 * 依赖 edge/lib/html-to-markdown.mjs，独立成模块以便在 Node 里测试。
 */
import { htmlToMarkdown } from './html-to-markdown.mjs';

// 主题里正文容器：文章页与独立页面共用 #article-container
const CONTENT_SELECTOR = /<(\w+)[^>]*id="article-container"[\s\S]*?<\/\1>/;
// 首页 / 归档页的文章卡片链接
const ARCHIVE_LINK = /<a\s[^>]*href="(\/archives\/[^"#?]*)"[^>]*>([\s\S]*?)<\/a>/g;
const MAX_INDEX_ITEMS = 30;

function decode(s) {
  return String(s)
    .replace(/<[^>]*>/g, '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function pickTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return decode(h1[1]);
  const t = html.match(/<title>([\s\S]*?)<\/title>/i);
  return t ? decode(t[1]) : '';
}

/** 首页 / 归档页没有正文容器，退化成「站点信息 + 文章链接清单」 */
export function renderIndex(html, title) {
  const seen = new Set();
  const items = [];
  ARCHIVE_LINK.lastIndex = 0;
  let m;
  while ((m = ARCHIVE_LINK.exec(html))) {
    const [, href, inner] = m;
    const text = decode(inner);
    // 「未读」是徽标链接，会和卡片标题重复
    if (!text || text === '未读' || seen.has(href)) continue;
    seen.add(href);
    items.push(`- [${text}](${href})`);
    if (items.length >= MAX_INDEX_ITEMS) break;
  }
  const head = [`# ${title || '站点索引'}`, ''];
  if (!items.length) return head.join('\n') + '\n\n本页未提取到文章链接。';
  return head.join('\n') + '## 近期文章\n\n' + items.join('\n') + '\n';
}

/**
 * 生成 Markdown 文档
 * @param {string} html 完整页面 HTML
 * @param {string} url  请求 URL（写进来源标注）
 */
export function renderMarkdown(html, url) {
  const title = pickTitle(html);
  const slice = html.match(CONTENT_SELECTOR);

  let body;
  if (slice) {
    body = htmlToMarkdown(slice[1]);
    // 部分编辑器会把标题一起写进正文，去掉与页面标题重复的首行
    if (title && body.startsWith('# ' + title)) {
      const rest = body.slice(('# ' + title).length).trim();
      body = rest.startsWith('#') ? body : rest;
    }
  } else {
    body = renderIndex(html, title);
  }

  return `# ${title || url}\n\n> 来源：${url}\n\n${body}\n`;
}