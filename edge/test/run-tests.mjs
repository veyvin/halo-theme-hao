/**
 * 用真实页面快照验证 edge/lib/html-to-markdown.mjs。
 *
 *   node edge/test/run-tests.mjs
 *
 * 快照是 veyvin.com 的真实渲染结果，仓库里已附：
 *   fixture-post.html  文章页 #article-container 片段（表格 / shiki 代码块 / 引用 / 列表）
 *   fixture-home.html  首页的站点标题 + 文章卡片链接
 *
 * 刷新快照（走 curl，站点有 Cloudflare 人机校验，Node fetch 会被 403）：
 *   node edge/test/run-tests.mjs --update
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { htmlToMarkdown } from '../lib/html-to-markdown.mjs';
import { prefersMarkdown, explicitQ } from '../lib/accept-negotiation.mjs';
import { renderMarkdown, renderIndex, pickTitle } from '../lib/render-markdown.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const POST_FIXTURE = join(HERE, 'fixture-post.html');
const HOME_FIXTURE = join(HERE, 'fixture-home.html');

const POST_URL = 'https://veyvin.com/archives/postgresql-18-17-6-18-20251108025904';
const HOME_URL = 'https://veyvin.com/';

let failures = 0;
let checks = 0;

function ok(cond, label, extra = '') {
  checks++;
  if (cond) {
    console.log(`  \u2713 ${label}`);
  } else {
    failures++;
    console.log(`  \u2717 ${label}${extra ? `\n      ${extra}` : ''}`);
  }
}

function section(name) {
  console.log(`\n${name}`);
}

// ── 单元用例：直接给片段，锁住边界行为 ──
function unitTests() {
  section('单元用例');

  ok(htmlToMarkdown('<p>hello <strong>world</strong></p>') === 'hello **world**', '段落 + 粗体');
  ok(htmlToMarkdown('<h2>标题</h2>') === '## 标题', 'h2 保留层级');
  ok(
    htmlToMarkdown('<a href="/x">t</a>') === '[t](/x)',
    '链接保留 href',
    htmlToMarkdown('<a href="/x">t</a>')
  );
  ok(htmlToMarkdown('<code>x</code>') === '`x`', '行内代码');
  ok(!/<[a-z]/i.test(htmlToMarkdown('<script>alert(1)</script><p>ok</p>')), 'script 被丢弃');
  ok(htmlToMarkdown('<script>alert(1)</script><p>ok</p>') === 'ok', 'script 内容不泄漏');

  const li = htmlToMarkdown('<ul><li>a</li><li>b</li></ul>');
  ok(li === '- a\n- b', '无序列表', JSON.stringify(li));

  const ol = htmlToMarkdown('<ol><li>a</li><li>b</li></ol>');
  ok(ol === '1. a\n2. b', '有序列表编号', JSON.stringify(ol));

  const nested = htmlToMarkdown('<ul><li>a<ul><li>b</li></ul></li></ul>');
  ok(nested === '- a\n  - b', '嵌套列表缩进且不空行', JSON.stringify(nested));

  const code = htmlToMarkdown('<pre><code class="language-bash">echo 1</code></pre>');
  ok(code === '```bash\necho 1\n```', '代码块围栏 + 语言', JSON.stringify(code));

  const shiki = htmlToMarkdown('<pre class="shiki"><code><span>ls</span><span> -la</span></code></pre>');
  ok(shiki === '```\nls -la\n```', 'shiki span 被还原成纯代码', JSON.stringify(shiki));

  const bq = htmlToMarkdown('<blockquote><p>q1</p><p>q2</p></blockquote>');
  ok(bq === '> q1\n>\n> q2', '引用块逐行加 >', JSON.stringify(bq));

  const tbl = htmlToMarkdown('<table><tr><th>h1</th><th>h2</th></tr><tr><td>a</td><td>b</td></tr></table>');
  ok(tbl.split('\n').length === 3 && tbl.includes('| h1 | h2 |') && tbl.includes('| a | b |'), '表格转 GFM', JSON.stringify(tbl));

  ok(htmlToMarkdown('<hr>') === '---', 'hr');
  ok(htmlToMarkdown('<img src="/a.png" alt="图">') === '![图](/a.png)', '图片 alt/src', htmlToMarkdown('<img src="/a.png" alt="图">'));
  ok(htmlToMarkdown('a &amp; b &#65; &#x42;') === 'a & b A B', '实体解码', JSON.stringify(htmlToMarkdown('a &amp; b &#65; &#x42;')));
  ok(htmlToMarkdown('<div class="note">tip</div><p>body</p>') === 'body', '主题提示块被剔除', htmlToMarkdown('<div class="note">tip</div><p>body</p>'));
  ok(htmlToMarkdown('<ai>summary</ai><p>body</p>') === 'body', 'Halo AI 摘要块被剔除');
  ok(htmlToMarkdown('') === '' && htmlToMarkdown(null) === '', '空输入不抛异常');
  ok(htmlToMarkdown('<p>未闭合') === '未闭合', '未闭合标签不吞内容', htmlToMarkdown('<p>未闭合'));
}

// ── 集成用例：真实页面快照 ──
function snapshotTests() {
  section('真实快照');

  const postHtml = readFileSync(POST_FIXTURE, 'utf8');
  const md = htmlToMarkdown(postHtml);

  ok(md.length > 400, `转换出足够正文（${md.length} 字符）`);
  ok(!/<[a-z/][a-z0-9]*>/i.test(md), '输出里没有残留 HTML 标签', (md.match(/<[a-z/][a-z0-9]*>/i) || [])[0]);
  ok(!/&(amp|lt|gt|quot|#\d+);/.test(md), '输出里没有残留实体');
  ok(!md.includes('alert('), '脚本内容未泄漏');

  const fences = (md.match(/^```/gm) || []).length;
  ok(fences % 2 === 0, `代码围栏成对（${fences} 个）`);
  ok(/^#{1,6}\s/m.test(md), '保留了标题层级');

  const tableRows = (md.match(/^\| .* \|$/gm) || []).length;
  ok(tableRows > 3, `表格已转 GFM（${tableRows} 行）`);

  ok(/^- \S/m.test(md), '存在无序列表');
  ok(/^> /m.test(md), '存在引用块');
  ok(md.includes('PostgreSQL'), '保留了正文关键词');

  section('真实快照 · 首页');
  const homeHtml = readFileSync(HOME_FIXTURE, 'utf8');
  const links = [...homeHtml.matchAll(/<a\s[^>]*href="(\/archives\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
  ok(links.length >= 5, `抓到 ${links.length} 个文章链接`);
}

// ── --update：重新抓取快照（站点有 Cloudflare 人机校验，必须用 curl） ──
function update() {
  console.log('抓取快照…');
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  const postRaw = join(tmpdir(), 'hao-fixture-post.html');
  execFileSync('curl.exe', ['-sS', '-L', '--compressed', '-A', UA, '-o', postRaw, POST_URL], { stdio: 'inherit' });
  const ph = readFileSync(postRaw, 'utf8');
  const art = ph.match(/<article[^>]*id="article-container"[\s\S]*?<\/article>/);
  if (!art) throw new Error('未找到 #article-container，主题结构可能变了');
  const h1 = ph.match(/<h1[^>]*>[\s\S]*?<\/h1>/);
  writeFileSync(POST_FIXTURE, (h1 ? h1[0] : '') + '\n' + art[0], 'utf8');
  console.log(`  ✓ ${POST_FIXTURE}`);

  const homeRaw = join(tmpdir(), 'hao-fixture-home.html');
  execFileSync('curl.exe', ['-sS', '-L', '--compressed', '-A', UA, '-o', homeRaw, HOME_URL], { stdio: 'inherit' });
  const hh = readFileSync(homeRaw, 'utf8');
  const t = hh.match(/<title>([^<]*)<\/title>/);
  const anchors = [...hh.matchAll(/<a\s[^>]*href="\/archives\/[^"]*"[\s\S]*?<\/a>/g)].map((m) => m[0]);
  writeFileSync(HOME_FIXTURE, `<title>${t ? t[1] : ''}</title>\n` + anchors.join('\n'), 'utf8');
  console.log(`  ✓ ${HOME_FIXTURE} (${anchors.length} 个链接)`);
}

// ── Accept 协商：不能误伤浏览器 ──
function acceptTests() {
  section('Accept 协商');

  ok(explicitQ('text/markdown', 'text/markdown') === 1, '裸 media type 记为 q=1');
  ok(explicitQ('text/markdown;q=0.5', 'text/markdown') === 0.5, '解析 q 值');
  ok(explicitQ('*/*', 'text/markdown') === 0, '*/* 不算显式请求 text/markdown');

  ok(prefersMarkdown('text/markdown') === true, 'Agent 只发 text/markdown → 切换');
  ok(prefersMarkdown('text/markdown, text/plain') === true, 'markdown + plain → 切换');

  const browser = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
  ok(prefersMarkdown(browser) === false, '浏览器 Accept 不被切换');
  ok(prefersMarkdown('*/*') === false, '裸 */* 不切换');
  ok(prefersMarkdown('') === false, '无 Accept 头不切换');
  ok(prefersMarkdown('text/html;q=0.9,text/markdown;q=1') === true, 'markdown 权重更高 → 切换');
  ok(prefersMarkdown('text/html, text/markdown') === true, '同权重时倾向 markdown');
}

// ── Worker 文档渲染 ──
function workerTests() {
  section('Worker 文档渲染');

  const postHtml = readFileSync(POST_FIXTURE, 'utf8');
  const doc = renderMarkdown(postHtml, 'https://example.com/archives/x');

  ok(doc.startsWith('# '), '文档以 H1 开头');
  ok(doc.includes('> 来源：https://example.com/archives/x'), '写明来源 URL');
  ok(!/<[a-z/][a-z0-9]*>/i.test(doc), '文档里没有残留 HTML 标签');
  ok(doc.includes('PostgreSQL'), '保留了正文内容');

  // 首行标题不应重复出现两次
  const title = pickTitle(postHtml);
  const occurrences = doc.split(`# ${title}`).length - 1;
  ok(occurrences === 1, `标题只出现一次（实际 ${occurrences} 次）`);

  section('Worker 文档渲染 · 首页');
  const homeHtml = readFileSync(HOME_FIXTURE, 'utf8');
  const idx = renderIndex(homeHtml, '测试站');
  const linkCount = (idx.match(/^- \[/gm) || []).length;
  ok(linkCount > 3, `首页提取到 ${linkCount} 条文章链接`);
  ok(!idx.includes('未读'), '「未读」徽标链接被跳过');

  const fallback = renderMarkdown('<html><head><title>只有标题</title></head><body><p>x</p></body></html>', 'https://e.com/');
  ok(fallback.startsWith('# 只有标题'), '无正文容器时退回索引模式');
}

const arg = process.argv[2];
if (arg === '--update') {
  update();
} else {
  unitTests();
  acceptTests();
  workerTests();
  snapshotTests();
  console.log(`\n${failures ? '\u2717' : '\u2713'} ${checks - failures}/${checks} 通过`);
  process.exit(failures ? 1 : 0);
}