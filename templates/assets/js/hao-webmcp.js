/* WebMCP 工具集：按 WebMCP 规范把站内能力暴露给 AI Agent
 * 规范：https://webmachinelearning.github.io/webmcp
 * polyfill：assets/libs/webmcp/webmcp-polyfill.js（Chrome 未原生支持前用于本地验证）
 * 开关：主题设置 → 14 高级与其他 → WebMCP（默认关闭）
 *
 * 三个必须遵守的约束，改代码前先读：
 *   1. 没有 unregisterTool()，注销只能靠注册时传入的 AbortSignal，故自持 AbortController；
 *   2. registerTool 同名会抛 InvalidStateError，重建前必须先 abort 掉整批旧工具；
 *   3. execute 闭包捕获的 DOM 在 pjax 换页后失效，故 pjax:send 时注销、pjax:complete 时按新页面重建。
 *
 * 工具名统一带 hao_ 前缀：注册表是全页共享的，避免与评论插件等第三方脚本抢注同名工具。
 */
var haoWebmcp = (function () {
  var POSTS_PAGE_SIZE = 100;
  var POSTS_MAX_PAGES = 5;
  var POSTS_TTL = 30 * 60 * 1000;
  var POSTS_CACHE_KEY = 'hao-webmcp-posts-v1';

  var controllers = {};
  var postsCache = null;
  var postsPromise = null;

  function modelContext() {
    return document.modelContext || navigator.modelContext || null;
  }

  function unregisterAll() {
    Object.keys(controllers).forEach(function (name) {
      try { controllers[name].abort(); } catch (e) { /* ignore */ }
    });
    controllers = {};
  }

  function register(mc, tool) {
    var ac = new AbortController();
    controllers[tool.name] = ac;
    // 原生实现可能在同步阶段就抛（参数校验），Promise.resolve 接不住，统一兜住
    try {
      Promise.resolve(mc.registerTool(tool, { signal: ac.signal })).catch(function (e) {
        delete controllers[tool.name];
        console.warn('[webmcp] 注册失败', tool.name, e);
      });
    } catch (e) {
      delete controllers[tool.name];
      console.warn('[webmcp] 注册失败', tool.name, e);
    }
  }

  /* ---------- 工具实现 ---------- */

  // 读取当前页面：Agent 拿到的是「用户正在看什么」，而不是自己猜 URL
  function readPage(input) {
    var maxChars = Math.min(Math.max(parseInt(input && input.maxChars, 10) || 4000, 200), 20000);
    var cfg = window.GLOBAL_CONFIG || {};
    var root = document.querySelector('#article-container') ||
      document.querySelector('main') || document.body;
    if (!root) return { pageType: cfg.htmlType || 'unknown', title: document.title || '', url: location.href, theme: 'light', content: '', truncated: false };
    var text = String(root.innerText || root.textContent || '')
      .replace(/\s+/g, ' ').trim();
    var truncated = text.length > maxChars;
    return {
      pageType: cfg.htmlType || 'unknown',
      title: cfg.postTitle || document.title || '',
      url: location.href,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      content: truncated ? text.slice(0, maxChars) : text,
      truncated: truncated
    };
  }

  // 文章检索：走 Halo 公开内容接口，与聚合搜索同一数据源，但只取回结构化结果不碰 DOM
  function fetchPosts() {
    if (postsCache) return Promise.resolve(postsCache);
    if (postsPromise) return postsPromise;

    postsPromise = new Promise(function (resolve) {
      try {
        var cached = JSON.parse(sessionStorage.getItem(POSTS_CACHE_KEY) || 'null');
        if (cached && cached.t && cached.items && Date.now() - cached.t < POSTS_TTL) {
          postsCache = cached.items;
          return resolve(postsCache);
        }
      } catch (e) { /* ignore */ }

      var items = [];
      function fetchPage(page) {
        return fetch('/apis/api.content.halo.run/v1alpha1/posts?size=' + POSTS_PAGE_SIZE +
          '&page=' + page + '&sort=spec.publishTime,desc')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (!data || !data.items) return items;
            data.items.forEach(function (p) {
              if (!p.metadata || !p.spec) return;
              items.push({
                title: p.spec.title || '',
                permalink: (p.status && p.status.permalink) || '',
                excerpt: (p.status && p.status.excerpt) || '',
                publishTime: p.spec.publishTime || ''
              });
            });
            var total = data.total || items.length;
            if (page < POSTS_MAX_PAGES && items.length < total) return fetchPage(page + 1);
            return items;
          })
          .catch(function () { return items; });
      }
      fetchPage(1).then(function (list) {
        postsCache = list;
        try {
          sessionStorage.setItem(POSTS_CACHE_KEY, JSON.stringify({ t: Date.now(), items: list }));
        } catch (e) { /* ignore */ }
        resolve(list);
      });
    }).finally(function () { postsPromise = null; });

    return postsPromise;
  }

  function searchPosts(input) {
    var q = String((input && input.query) || '').trim().toLowerCase();
    var limit = Math.min(Math.max(parseInt(input && input.limit, 10) || 5, 1), 20);
    if (!q) return Promise.resolve({ query: '', total: 0, results: [] });

    return fetchPosts().then(function (items) {
      var hits = items.filter(function (p) {
        return (p.title || '').toLowerCase().indexOf(q) > -1 ||
          (p.excerpt || '').toLowerCase().indexOf(q) > -1;
      });
      return { query: q, total: hits.length, results: hits.slice(0, limit) };
    });
  }

  // 深浅色切换：走 head.html 里注入的 activateDarkMode / activateLightMode，与右键菜单同一套
  function setThemeMode(input) {
    var mode = String((input && input.mode) || 'toggle').toLowerCase();
    if (mode !== 'dark' && mode !== 'light' && mode !== 'toggle') {
      return { ok: false, error: "mode 仅支持 'dark' / 'light' / 'toggle'" };
    }
    var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = mode === 'toggle' ? (current === 'dark' ? 'light' : 'dark') : mode;
    if (typeof window.activateDarkMode === 'function' && next === 'dark') window.activateDarkMode();
    if (typeof window.activateLightMode === 'function' && next === 'light') window.activateLightMode();
    if (window.saveToLocal) window.saveToLocal.set('theme', next, 2);
    if (window.heo && typeof window.heo.darkModeStatus === 'function') window.heo.darkModeStatus();
    return { ok: true, mode: next };
  }

  // 随机文章：复用 layout.html 输出的 __haoRandomPosts，并排除当前页避免原地打转
  function randomPost() {
    var list = Array.isArray(window.__haoRandomPosts) ? window.__haoRandomPosts : [];
    if (!list.length) return { ok: false, error: '随机文章列表为空' };
    var cur = (location.pathname || '/').replace(/\/$/, '') || '/';
    var pool = list.filter(function (p) {
      return (String(p || '').replace(/\/$/, '') || '/') !== cur;
    });
    if (!pool.length) pool = list;
    var permalink = pool[Math.floor(Math.random() * pool.length)];
    if (typeof pjax !== 'undefined' && typeof pjax.loadUrl === 'function') pjax.loadUrl(permalink);
    else location.href = permalink;
    return { ok: true, permalink: permalink };
  }

  /* ---------- 工具声明 ---------- */

  function buildTools() {
    var d = (window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.webmcp) || {};
    return [
      {
        name: 'hao_read_page',
        description: d.readPage || 'Read the content of the page the user is currently viewing.',
        inputSchema: {
          type: 'object',
          properties: {
            maxChars: {
              type: 'number',
              description: 'Maximum number of characters of body text to return. Default 4000, max 20000.'
            }
          }
        },
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        execute: function (input) { return readPage(input || {}); }
      },
      {
        name: 'hao_search_posts',
        description: d.searchPosts || 'Search posts published on this blog by keyword.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Keyword matched against post title and summary.' },
            limit: { type: 'number', description: 'Maximum number of results to return. Default 5, max 20.' }
          },
          required: ['query']
        },
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        execute: function (input) { return searchPosts(input || {}); }
      },
      {
        name: 'hao_set_theme_mode',
        description: d.setThemeMode || 'Switch this site between dark and light colour scheme.',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['dark', 'light', 'toggle'],
              description: 'Target colour scheme. "toggle" flips the current one. Default "toggle".'
            }
          }
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        execute: function (input) { return setThemeMode(input || {}); }
      },
      {
        name: 'hao_random_post',
        description: d.randomPost || 'Open a random post from this blog.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        execute: function () { return randomPost(); }
      }
    ];
  }

  /* ---------- 生命周期 ---------- */

  function sync() {
    var mc = modelContext();
    if (!mc || typeof mc.registerTool !== 'function') return;
    // 先整批注销再注册：同名注册会抛 InvalidStateError，且工具描述依赖本页 GLOBAL_CONFIG
    unregisterAll();
    buildTools().forEach(function (tool) { register(mc, tool); });
  }

  function start() {
    // WebMCP 需安全上下文；非 HTTPS（如 http://localhost）直接不注册，避免脚本白跑
    if (!window.isSecureContext) return;
    if (!modelContext()) {
      // 排查提示：没开 origin trial、浏览器版本太低、或 polyfill 开关没打开
      console.info('[webmcp] 未检测到 document.modelContext，本页不会注册任何工具。' +
        '请确认已启用 WebMCP 开关、已填 Origin Trial Token，且浏览器支持原生 WebMCP。');
      return;
    }

    sync();

    // pjax:send 先注销：换页过程中 Agent 触发的 execute 会拿到已销毁的 DOM
    document.addEventListener('pjax:send', unregisterAll);
    // GLOBAL_CONFIG 在 pjax:complete 前已被 Pjax 换掉，此刻读到的就是新页面信息
    document.addEventListener('pjax:complete', sync);
  }

  if (typeof document !== 'undefined') {
    // 必须等 DOMContentLoaded：defer 脚本执行时 readyState 是 'interactive' 而非 'loading'，
    // 此时排在后面的 polyfill 还没跑，直接 start() 会误判成「浏览器不支持」
    if (document.readyState === 'loading' || document.readyState === 'interactive') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  return {
    sync: sync,
    // 控制台自查入口：haoWebmcp.listTools().then(console.log)
    listTools: function () {
      var mc = modelContext();
      return mc && typeof mc.getTools === 'function' ? mc.getTools() : Promise.resolve([]);
    }
  };
})();