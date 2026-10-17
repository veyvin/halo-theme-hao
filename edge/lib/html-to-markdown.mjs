/**
 * HTML -> Markdown, 无依赖，可在 Cloudflare Workers 与 Node 中运行。
 *
 * 设计取舍：不用 HTMLRewriter（流式 API 在本地无法测试），改用「按块切片 + 递归」
 * 的方式处理 pre / table / blockquote / 列表，块内联元素走 token 流。
 * 这样可以在 Node 里用真实页面快照跑断言，转换逻辑改坏了能被测出来。
 *
 * 输入是 Halo 渲染出的服务端 HTML（片段），标签闭合良好，不需要容错解析器。
 */

// 需要整块丢弃的元素：其内容不是正文
const SKIP_TAGS = new Set(['script', 'style', 'svg', 'noscript', 'iframe', 'canvas', 'template', 'audio', 'video']);
// 主题注入的页面组件（阅读提示等），不属于文章正文
const SKIP_SELECTORS = ['div.note', 'div.toc', 'span.tocbot'];
// 块级元素：遇到就 flush 当前行缓冲
const BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'pre', 'table', 'blockquote',
  'hr', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'form', 'fieldset', 'details', 'summary',
]);

const TAG_RE = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const TEXT_RE = /[^<]+/g;

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', middot: '·', ldquo: '“', rdquo: '”',
  lsquo: '‘', rsquo: '’', copy: '©', reg: '®', trade: '™', times: '×', divide: '÷',
};

// </a> 需要拿到对应 href 才能补 ](url)，用栈维护
// 解析是单线程顺序的，不存在并发问题；递归调用共用同一个栈
const linkStack = [];

function decodeEntities(str) {
  return String(str)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) => {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(ENTITIES, key) ? ENTITIES[key] : m;
    });
}

/** 取标签属性，兼容双引号/单引号/无引号 */
function attr(attrs, name) {
  if (!attrs) return null;
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
  const m = attrs.match(re);
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
}

function attrClass(attrs) {
  return (attr(attrs, 'class') || '').split(/\s+/).filter(Boolean);
}

/**
 * 从 openIdx（指向开始标签）开始，找到同名标签的闭合位置。
 * 返回 inner 起点与闭合标签起点；找不到闭合标签时返回 null。
 */
function sliceBalanced(html, openIdx, tag) {
  const openRe = new RegExp(`<${tag}\\b`, 'gi');
  const closeRe = new RegExp(`</${tag}\\s*>`, 'gi');
  const innerStart = html.indexOf('>', openIdx) + 1;
  if (innerStart <= 0) return null;
  let depth = 1;
  let cursor = innerStart;
  while (depth > 0) {
    openRe.lastIndex = cursor;
    const nextOpen = openRe.exec(html);
    closeRe.lastIndex = cursor;
    const nextClose = closeRe.exec(html);
    if (!nextClose) return null;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      cursor = nextOpen.index + nextOpen[0].length;
      continue;
    }
    depth--;
    cursor = nextClose.index;
    if (depth === 0) {
      return { inner: html.slice(innerStart, cursor), end: nextClose.index + nextClose[0].length };
    }
    cursor = nextClose.index + nextClose[0].length;
  }
  return null;
}

/** 预解析出元素节点，便于跳过成对内容 */
function nextTag(html, from) {
  TAG_RE.lastIndex = from;
  const m = TAG_RE.exec(html);
  return m ? { index: m.index, raw: m[0], tag: (m[1] || '').toLowerCase(), attrs: m[2] || '', match: m } : null;
}

/** 清理内联文本：折叠空白、去首尾空格 */
function tidy(s) {
  return decodeEntities(String(s).replace(/\s+/g, ' ')).trim();
}

function isSkipped(tag, attrs) {
  if (SKIP_TAGS.has(tag)) return true;
  if (tag === 'ai') return true; // Halo 的 AI 摘要块，避免与正文重复
  const cls = attrClass(attrs);
  return SKIP_SELECTORS.some((sel) => {
    const [t, ...rest] = sel.split('.');
    return tag === t && rest.every((c) => cls.includes(c));
  });
}

function renderPre(html) {
  // shiki 会把代码拆成大量 span，class 里带 --shiki- 与 language-xxx
  let inner = html;
  let lang = '';
  const langMatch = inner.match(/language-([a-zA-Z0-9+#._-]+)/);
  if (langMatch) lang = langMatch[1];
  inner = inner.replace(/<[^>]*>/g, '');
  inner = decodeEntities(inner).replace(/\n+$/, '');
  // 去掉代码块常见的首尾空行
  inner = inner.replace(/^\n+/, '');
  return '```' + (lang || '') + '\n' + inner + '\n```';
}

function renderTable(html) {
  const rows = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html))) {
    const cells = [];
    const cellRe = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let cm;
    while ((cm = cellRe.exec(rm[1]))) {
      cells.push({
        header: cm[1].toLowerCase() === 'th',
        text: htmlToMarkdown(cm[3]).replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim(),
      });
    }
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) return '';

  const colCount = Math.max(...rows.map((r) => r.length));
  const pad = (r) => {
    const c = r.map((x) => x.text);
    while (c.length < colCount) c.push('');
    return c;
  };

  const first = rows[0];
  // 没有 th 时，GFM 仍要求首行当表头；用第一行并补一行分隔符
  const headerCells = first.some((c) => c.header) ? first.map((c) => c.text) : first.map((c) => c.text);
  const body = first.some((c) => c.header) ? rows.slice(1) : rows;

  const out = [];
  out.push(`| ${pad(first).join(' | ')} |`);
  out.push(`| ${headerCells.map(() => '---').join(' | ')} |`);
  for (const r of body) out.push(`| ${pad(r).join(' | ')} |`);
  return out.join('\n');
}

function renderList(html, ordered, depth) {
  const items = [];
  let cursor = 0;
  while (cursor < html.length) {
    const openIdx = html.indexOf('<li', cursor);
    if (openIdx === -1) break;
    const slice = sliceBalanced(html, openIdx, 'li');
    if (!slice) break;
    items.push(slice.inner);
    cursor = slice.end;
  }
  if (!items.length) return '';

  const indent = '  '.repeat(Math.max(0, depth));
  const rendered = items.map((item, i) => {
    const body = htmlToMarkdown(item).trim();
    // 子列表与父项之间不能有空行，否则 Markdown 会渲染成两个独立块
    const collapsed = body.replace(/\n{2,}(?=\s*(?:[-*+]|\d+\.)\s)/g, '\n');
    const lines = collapsed.split('\n');
    const bullet = ordered ? `${i + 1}. ` : '- ';
    const head = `${indent}${bullet}${lines[0] || ''}`;
    const rest = lines.slice(1).map((l) => (l.trim() ? `${indent}  ${l}` : ''));
    return [head, ...rest].join('\n');
  });
  return rendered.join('\n');
}

function renderBlockquote(inner) {
  const body = htmlToMarkdown(inner).trim();
  if (!body) return '';
  return body.split('\n').map((l) => (l.trim() ? `> ${l}` : '>')).join('\n');
}

/**
 * HTML 片段 -> Markdown
 * @param {string} html
 * @returns {string}
 */
export function htmlToMarkdown(html) {
  if (!html) return '';
  const blocks = [];
  let buf = '';

  const flush = () => {
    const t = tidy(buf);
    if (t) blocks.push(t);
    buf = '';
  };

  let i = 0;
  while (i < html.length) {
    const t = nextTag(html, i);
    if (!t) {
      TEXT_RE.lastIndex = i;
      const tm = TEXT_RE.exec(html);
      if (!tm) break;
      buf += tm[0];
      i = tm.index + tm[0].length;
      continue;
    }

    // 标签之间的文本
    if (t.index > i) buf += html.slice(i, t.index);
    i = t.raw.length ? t.index + t.raw.length : t.index + 1;

    // 注释
    if (t.raw.startsWith('<!--')) continue;

    const closing = t.raw.startsWith('</');
    const selfClosing = t.raw.endsWith('/>');

    if (isSkipped(t.tag, t.attrs)) {
      if (closing || selfClosing) continue;
      const slice = sliceBalanced(html, t.index, t.tag);
      if (slice) {
        i = slice.end;
        continue;
      }
      continue;
    }

    // ── 分隔线 ──
    // 放在 selfClosed 判断之外，<hr> 与 <hr/> 都要处理
    if (t.tag === 'hr' && !closing) {
      flush();
      blocks.push('---');
      continue;
    }

    // ── 整块元素：切片处理 ──
    if (!closing && !selfClosing) {
      switch (t.tag) {
        case 'pre': {
          const s = sliceBalanced(html, t.index, 'pre');
          flush();
          if (s) {
            blocks.push(renderPre(s.inner));
            i = s.end;
          }
          continue;
        }
        case 'table': {
          const s = sliceBalanced(html, t.index, 'table');
          flush();
          if (s) {
            const rendered = renderTable(s.inner);
            if (rendered) blocks.push(rendered);
            i = s.end;
          }
          continue;
        }
        case 'blockquote': {
          const s = sliceBalanced(html, t.index, 'blockquote');
          flush();
          if (s) {
            const rendered = renderBlockquote(s.inner);
            if (rendered) blocks.push(rendered);
            i = s.end;
          }
          continue;
        }
        case 'ul':
        case 'ol': {
          const s = sliceBalanced(html, t.index, t.tag);
          flush();
          if (s) {
            const rendered = renderList(s.inner, t.tag === 'ol', 0);
            if (rendered) blocks.push(rendered);
            i = s.end;
          }
          continue;
        }
        default:
          break;
      }

      // 标题
      const hMatch = t.tag.match(/^h([1-6])$/);
      if (hMatch) {
        const s = sliceBalanced(html, t.index, t.tag);
        flush();
        if (s) {
          const text = htmlToMarkdown(s.inner).replace(/\s+/g, ' ').trim();
          if (text) blocks.push('#'.repeat(Number(hMatch[1])) + ' ' + text);
          i = s.end;
        }
        continue;
      }

      // ── 内联元素 ──
      if (t.tag === 'br') {
        buf += '  \n';
        continue;
      }
      if (t.tag === 'img') {
        const src = attr(t.attrs, 'src');
        const alt = attr(t.attrs, 'alt') || '';
        if (src) buf += `![${tidy(alt)}](${src})`;
        continue;
      }
      if (t.tag === 'strong' || t.tag === 'b') {
        buf += '**';
        continue;
      }
      if (t.tag === 'em' || t.tag === 'i') {
        buf += '*';
        continue;
      }
      if (t.tag === 'del' || t.tag === 's' || t.tag === 'strike') {
        buf += '~~';
        continue;
      }
      if (t.tag === 'code') {
        buf += '`';
        continue;
      }
      if (t.tag === 'a') {
        // href 在 </a> 时才补全，压栈等待闭合
        linkStack.push(attr(t.attrs, 'href') || '');
        buf += '[';
        continue;
      }
    } else {
      // ── 内联闭合 ──
      if (t.tag === 'strong' || t.tag === 'b') buf += '**';
      else if (t.tag === 'em' || t.tag === 'i') buf += '*';
      else if (t.tag === 'del' || t.tag === 's' || t.tag === 'strike') buf += '~~';
      else if (t.tag === 'code') buf += '`';
      else if (t.tag === 'a') {
        const href = linkStack.pop() || '';
        buf += href ? `](${href})` : ']()';
      }
      continue;
    }

    // 块级：收尾当前行
    if (BLOCK_TAGS.has(t.tag) && !closing) flush();
    else if (closing && BLOCK_TAGS.has(t.tag)) flush();
  }

  flush();
  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

export default htmlToMarkdown;