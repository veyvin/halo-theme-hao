/* 聚合搜索面板：对标 blog.zhheo.com heosearch
 * 文章搜索走 Halo 核心索引接口 POST /apis/api.halo.run/v1alpha1/indices/-/search
 * （公开接口，title/description 带 <mark> 高亮），封面由公开文章列表按 metadataName 联出；
 * 索引不可用时退化为对文章列表（标题+摘要）本地过滤。
 * 友链/评论为后端注入候选，前端按关键词过滤。回车在面板内出结果，不再调起搜索插件弹窗。
 */
var haoAggSearch = (function () {
  var activeTab = 'all';
  var debounceTimer = null;
  var renderSeq = 0; // 竞态守卫：仅渲染最后一次请求的结果
  var postsCache = null;
  var postsPromise = null;
  var POSTS_TTL = 30 * 60 * 1000;
  var POSTS_PAGE_SIZE = 100;
  var POSTS_MAX_PAGES = 10;

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 服务端返回的 title 含 <mark> 高亮：先整体转义再还原 mark 标签，防注入
  function safeMark(s) {
    return esc(s).replace(/&lt;(\/?)mark&gt;/g, '<$1mark>');
  }

  function contains(s, q) {
    return String(s || '').toLowerCase().indexOf(q.toLowerCase()) > -1;
  }

  // 本地匹配高亮
  function wrapMark(text, q) {
    var raw = String(text == null ? '' : text);
    if (!q) return esc(raw);
    var idx = raw.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return esc(raw);
    return esc(raw.slice(0, idx)) + '<mark>' + esc(raw.slice(idx, idx + q.length)) + '</mark>' + esc(raw.slice(idx + q.length));
  }

  function open() {
    var box = el('hao-aggsearch');
    if (!box) return;
    box.style.display = 'block';
    document.body.style.overflow = 'hidden';
    var input = el('aggsearch-input');
    if (input) { setTimeout(function () { input.focus(); }, 50); }
    render(input ? input.value : '');
  }

  function close() {
    var box = el('hao-aggsearch');
    if (box) { box.style.display = 'none'; }
    document.body.style.overflow = '';
  }

  /* ---------- 文章候选：公开文章列表（封面联出 + 索引不可用时的本地兜底） ---------- */

  function loadPosts() {
    if (postsCache) return Promise.resolve(postsCache);
    if (postsPromise) return postsPromise;
    postsPromise = new Promise(function (resolve) {
      try {
        var cached = JSON.parse(sessionStorage.getItem('hao-aggsearch-posts-v1') || 'null');
        if (cached && cached.t && cached.items && Date.now() - cached.t < POSTS_TTL) {
          postsCache = cached.items;
          return resolve(postsCache);
        }
      } catch (e) { /* ignore */ }
      var items = [];
      function fetchPage(page) {
        return fetch('/apis/api.content.halo.run/v1alpha1/posts?size=' + POSTS_PAGE_SIZE + '&page=' + page + '&sort=spec.publishTime,desc')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (!data || !data.items) return items;
            data.items.forEach(function (p) {
              if (!p.metadata || !p.spec) return;
              items.push({
                name: p.metadata.name || '',
                title: p.spec.title || '',
                cover: p.spec.cover || '',
                excerpt: (p.status && p.status.excerpt) || '',
                permalink: (p.status && p.status.permalink) || ''
              });
            });
            var total = data.total || items.length;
            if (page < POSTS_MAX_PAGES && items.length < total) return fetchPage(page + 1);
            postsCache = items;
            try { sessionStorage.setItem('hao-aggsearch-posts-v1', JSON.stringify({ t: Date.now(), items: items })); } catch (e) { /* ignore */ }
            return items;
          });
      }
      fetchPage(1).catch(function () { return items; }).then(resolve);
    }).then(function (items) {
      postsPromise = null;
      return items;
    });
    return postsPromise;
  }

  function localSearchPosts(posts, q) {
    return posts.filter(function (p) {
      return contains(p.title, q) || contains(p.excerpt, q);
    }).slice(0, 20);
  }

  // 核心索引搜索：仅文章类型，<mark> 高亮
  function searchIndices(q) {
    return fetch('/apis/api.halo.run/v1alpha1/indices/-/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: q,
        limit: 20,
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        includeTypes: ['post.content.halo.run']
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('indices search unavailable');
      return r.json();
    }).then(function (data) {
      var hits = (data && data.hits) || [];
      var seen = {};
      return hits.filter(function (h) {
        var key = h.metadataName || h.permalink;
        if (!key || seen[key]) return false;
        seen[key] = true;
        return true;
      });
    });
  }

  /* ---------- 友链/评论本地过滤 ---------- */

  function match(q, s) {
    return String(s || '').toLowerCase().indexOf(q) > -1;
  }

  function filterFriends(q) {
    var friends = window.HAO_FRIENDS || [];
    return friends.filter(function (f) {
      return !q || match(q, f.name) || match(q, f.desc) || match(q, f.url);
    }).slice(0, (window.HAO_AGGSEARCH && window.HAO_AGGSEARCH.friendCount) || 20);
  }

  function filterComments(q) {
    var comments = window.HAO_COMMENTS || [];
    return comments.filter(function (c) {
      return !q || match(q, c.text) || match(q, c.author);
    });
  }

  /* ---------- 渲染 ---------- */

  function loadingHtml() {
    return '<div class="aggsearch-loading"><i></i><i></i><i></i></div>';
  }

  function sectionHead(title, moreHref) {
    var more = moreHref ? '<a class="aggsearch-more" href="' + esc(moreHref) + '">更多 ↗</a>' : '';
    return '<div class="aggsearch-section-head"><div class="aggsearch-section-title">' + esc(title) + '</div>' + more + '</div>';
  }

  function friendCardHtml(f, q) {
    var logo = f.logo
      ? '<img class="aggsearch-friend-avatar" src="' + esc(f.logo) + '" alt="' + esc(f.name) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">'
      : '';
    var fallback = '<span class="aggsearch-friend-avatar aggsearch-friend-avatar-text" style="display:' + (f.logo ? 'none' : 'flex') + ';">' + esc((f.name || '?').slice(0, 1)) + '</span>';
    return '<a class="aggsearch-friend-card" href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' +
      logo + fallback +
      '<span class="aggsearch-friend-info">' +
      '<span class="aggsearch-friend-name">' + wrapMark(f.name, q) + '</span>' +
      '<span class="aggsearch-friend-desc">' + wrapMark(f.desc, q) + '</span>' +
      '</span></a>';
  }

  function postCardHtml(p) {
    var cover = p.cover
      ? '<img class="aggsearch-post-cover" src="' + esc(p.cover) + '" alt="" loading="lazy">'
      : '<span class="aggsearch-post-cover aggsearch-post-cover-empty">' + esc((p.title || '文').slice(0, 1)) + '</span>';
    return '<a class="aggsearch-post-card" href="' + esc(p.permalink) + '">' +
      '<span class="aggsearch-post-cover-wrap">' + cover + '</span>' +
      '<span class="aggsearch-post-title">' + (p.titleHtml || esc(p.title)) + '</span>' +
      '</a>';
  }

  function commentRowHtml(c, q) {
    return '<div class="aggsearch-row"><span class="aggsearch-tag">评论</span>' +
      '<span class="aggsearch-text">' + wrapMark(String(c.text).slice(0, 80), q) + '</span>' +
      '<span class="aggsearch-desc">— ' + esc(c.author) + '</span></div>';
  }

  function friendSection(friends, q) {
    if (!friends.length) return '';
    var html = sectionHead('友链', (window.HAO_AGGSEARCH || {}).linksUri || '');
    html += '<div class="aggsearch-friend-grid">';
    friends.forEach(function (f) { html += friendCardHtml(f, q); });
    html += '</div>';
    return html;
  }

  function postSection(title, posts, moreHref) {
    if (!posts.length) return '';
    var html = sectionHead(title, moreHref);
    html += '<div class="aggsearch-post-grid">';
    posts.forEach(function (p) { html += postCardHtml(p); });
    html += '</div>';
    return html;
  }

  function commentSection(comments, q) {
    if (!comments.length) return '';
    var html = sectionHead('评论', '');
    comments.forEach(function (c) { html += commentRowHtml(c, q); });
    return html;
  }

  function renderWithPosts(q, postsPart) {
    var hits = el('aggsearch-hits');
    if (!hits) return;
    var friends = filterFriends(q);
    var comments = filterComments(q);
    var showFriend = activeTab === 'all' || activeTab === 'friend';
    var showComment = activeTab === 'all' || activeTab === 'comment';
    var html = '';
    if (showFriend) html += friendSection(friends, q);
    html += '<div id="aggsearch-post-area">' + postsPart + '</div>';
    if (showComment) html += commentSection(comments, q);
    if (!html.replace(/<div id="aggsearch-post-area"><\/div>/, '').trim()) {
      html = '<div class="aggsearch-empty">没有找到相关内容，换个关键词试试</div>';
    }
    hits.innerHTML = html;
  }

  function render(q) {
    q = (q || '').trim();
    var seq = ++renderSeq;
    var postsPart;
    if (!q) {
      // 默认视图：最新文章
      postsPart = loadPosts().then(function (posts) {
        return postSection('最新文章', posts.slice(0, 10), (window.HAO_AGGSEARCH || {}).archivesUri || '');
      });
    } else if (activeTab === 'friend' || activeTab === 'comment') {
      postsPart = Promise.resolve('');
    } else {
      postsPart = searchPosts(q, activeTab === 'post');
    }
    renderWithPosts(q, loadingHtml());
    postsPart.then(function (part) {
      if (seq !== renderSeq) return; // 已有更新的搜索/切换接管
      renderWithPosts(q, part);
    });
  }

  // 文章搜索：优先核心索引，无命中或不可用时退化本地过滤（标题+摘要）
  function searchPosts(q, showEmptyWhenMiss) {
    return loadPosts().then(function (posts) {
      var toCards = function (list) {
        return list.map(function (p) {
          return { title: p.title, titleHtml: wrapMark(p.title, q), permalink: p.permalink, cover: p.cover };
        });
      };
      var archivesUri = (window.HAO_AGGSEARCH || {}).archivesUri || '';
      return searchIndices(q).then(function (hits) {
        var cards;
        if (hits.length) {
          var map = {};
          posts.forEach(function (p) { map[p.name] = p; });
          cards = hits.map(function (h) {
            var post = map[h.metadataName];
            return {
              titleHtml: safeMark(h.title || ''),
              permalink: h.permalink || (post && post.permalink) || '',
              cover: (post && post.cover) || ''
            };
          });
        } else {
          cards = toCards(localSearchPosts(posts, q));
        }
        var html = postSection('博客内文章', cards, archivesUri);
        if (!html && showEmptyWhenMiss) html = '<div class="aggsearch-empty">没有找到相关文章</div>';
        return html;
      }).catch(function () {
        var html = postSection('博客内文章', toCards(localSearchPosts(posts, q)), archivesUri);
        if (!html && showEmptyWhenMiss) html = '<div class="aggsearch-empty">没有找到相关文章</div>';
        return html;
      });
    });
  }

  function run() {
    var input = el('aggsearch-input');
    if (input) render(input.value);
  }

  /* ---------- 事件绑定 ---------- */

  function bindTabs() {
    var tabs = document.querySelectorAll('#hao-aggsearch .aggsearch-tab');
    tabs.forEach(function (t) {
      if (t.dataset.aggBound) return;
      t.dataset.aggBound = 'true';
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        activeTab = t.getAttribute('data-type') || 'all';
        var input = el('aggsearch-input');
        render(input ? input.value : '');
      });
    });
    var input = el('aggsearch-input');
    if (input && !input.dataset.aggBound) {
      input.dataset.aggBound = 'true';
      input.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { render(input.value); }, 300);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { clearTimeout(debounceTimer); run(); }
        if (e.key === 'Escape') { close(); }
      });
    }
  }

  function bindGlobal() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); }
      // Ctrl/Cmd + K 打开搜索
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        open();
      }
    });
    // 右键菜单「站内搜索」入口
    var rmSearch = el('menu-search');
    if (rmSearch && !rmSearch.dataset.aggBound) {
      rmSearch.dataset.aggBound = 'true';
      rmSearch.addEventListener('click', function () {
        if (typeof rm !== 'undefined' && rm && typeof rm.hideRightMenu === 'function') rm.hideRightMenu();
        open();
      });
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () { bindTabs(); bindGlobal(); });
    document.addEventListener('pjax:complete', bindTabs);
  }

  return { open: open, close: close, run: run, render: render };
})();
