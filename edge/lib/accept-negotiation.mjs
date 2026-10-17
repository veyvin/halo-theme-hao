/**
 * Accept 头协商：判断客户端是否明确要求 text/markdown。
 * 独立成模块是为了能在 Node 里直接测试（Workers 运行时才能跑）。
 */

/** 取某个 media type 的显式 q 值；未出现返回 0（通配的 accept-all 不算显式请求） */
export function explicitQ(accept, type) {
  if (!accept) return 0;
  for (const part of accept.split(',')) {
    const [rawType, ...params] = part.trim().split(';');
    if (rawType.trim().toLowerCase() !== type) continue;
    for (const p of params) {
      const m = p.trim().match(/^q\s*=\s*([\d.]+)$/i);
      if (m) return Number(m[1]);
    }
    return 1;
  }
  return 0;
}

/**
 * 只有「明确点名 text/markdown」才切换成 Markdown。
 * 浏览器发的是 `text/html,...,` 加一个通配类型（q=0.8），不含 text/markdown，因此永远不受影响。
 */
export function prefersMarkdown(accept) {
  const md = explicitQ(accept, 'text/markdown');
  if (md <= 0) return false;
  const html = explicitQ(accept, 'text/html');
  return html <= 0 || md >= html;
}