/**
 * Agent 发现 Worker —— 补齐 Halo 主题无法提供的两件事。
 *
 * 背景：Halo 主题只能输出 text/html。
 *  - SinglePageRoute 要求 Accept: text/html，渲染的也是 Thymeleaf 模板，
 *    所以主题永远无法提供 text/markdown 或 application/linkset+json。
 *  - Thymeleaf 也无法设置 HTTP 响应头。
 * 这个 Worker 在 Cloudflare 边缘补上这两件事，源站零改动。
 *
 * 做：
 *  1. Markdown 内容协商：客户端 Accept 明确要 text/markdown 时，返回正文 Markdown。
 *  2. Link 响应头（RFC 8288）：只指向站上真实存在的资源。
 *
 * 不做（故意的）：
 *  - 不伪造 API Catalog / OAuth / OIDC / A2A / MCP / Web Bot Auth / DNS-AID。
 *    那是给真有这套基础设施的服务用的；博客发布这些等于对外声明一个自己
 *    并不控制的 issuer 和端点，只会让 Agent 在鉴权或调用中途失败。
 *
 * 纯逻辑放在 edge/lib/*.mjs，可直接用 node 跑测试；本文件只做 fetch 与响应改写。
 * 部署见 README「🤖 robots.txt 与 AI 内容信号」一节。
 */
import { prefersMarkdown } from './lib/accept-negotiation.mjs';
import { renderMarkdown } from './lib/render-markdown.mjs';

// 只声明真实存在的资源。没有 API，所以不给 api-catalog / service-desc。
const LINK_HEADERS = [
  '</rss.xml>; rel="alternate"; type="application/rss+xml"',
  '</sitemap.xml>; rel="related"; type="application/xml"',
];

function markdownResponse(body, origin) {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      // 关键：让 CDN 按 Accept 分开缓存，否则浏览器可能被喂到 Markdown
      vary: 'Accept',
      'x-markdown-source': origin.url,
      'cache-control': 'public, max-age=300',
      link: LINK_HEADERS.join(', '),
    },
  });
}

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return fetch(request);
    }

    const response = await fetch(request);
    const contentType = response.headers.get('content-type') || '';

    // 非 HTML（robots.txt / sitemap / 静态资源 / problem+json）原样透传
    if (!contentType.includes('text/html')) return response;

    if (prefersMarkdown(request.headers.get('accept') || '') && response.status === 200) {
      return markdownResponse(renderMarkdown(await response.text(), request.url), response);
    }

    // 其余情况只补 Link 头，不动正文
    const headers = new Headers(response.headers);
    headers.append('link', LINK_HEADERS.join(', '));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};