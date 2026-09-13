/* 聚合搜索面板：对标原站 heosearch（综合/文章/友链/评论）
 * 文章走搜索插件 SearchWidget.open()；友链/评论由后端注入候选，前端过滤。
 * 未装搜索插件时，文章 Tab 退化为提示。
 */
var haoAggSearch = (function () {
  var activeTab = 'all';

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function open() {
    var box = el('hao-aggsearch');
    if (!box) { fallbackArticle(); return; }
    box.style.display = 'block';
    document.body.style.overflow = 'hidden';
    var input = el('aggsearch-input');
    if (input) { setTimeout(function () { input.focus(); }, 50); }
    render('');
  }
  function close() {
    var box = el('hao-aggsearch');
    if (box) { box.style.display = 'none'; }
    document.body.style.overflow = '';
  }
  function fallbackArticle() {
    if (typeof SearchWidget !== 'undefined' && SearchWidget && typeof SearchWidget.open === 'function') {
      SearchWidget.open();
    } else if (window.btf && typeof window.btf.snackbarShow === 'function') {
      window.btf.snackbarShow('请先安装搜索插件', false, 2000);
    }
  }
  function toArticle() {
    var input = el('aggsearch-input');
    var kw = input ? input.value.trim() : '';
    close();
    fallbackArticle();
    // 搜索插件弹窗打开后尝试把关键词带过去（尽力而为）
    if (kw) {
      setTimeout(function () {
        var target = document.querySelector('.halo-search-widget input, [class*=search-widget] input');
        if (target) {
          target.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, kw);
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 400);
    }
  }
  function match(q, s) {
    return String(s || '').toLowerCase().indexOf(q) > -1;
  }
  function render(q) {
    q = (q || '').trim().toLowerCase();
    var hits = el('aggsearch-hits');
    var stats = el('aggsearch-stats');
    if (!hits) return;
    var friends = window.HAO_FRIENDS || [];
    var comments = window.HAO_COMMENTS || [];
    var friendHits = friends.filter(function (f) { return !q || match(q, f.name) || match(q, f.desc) || match(q, f.url); });
    var commentHits = comments.filter(function (c) { return !q || match(q, c.text) || match(q, c.author); });
    var html = '';
    var showFriend = activeTab === 'all' || activeTab === 'friend';
    var showComment = activeTab === 'all' || activeTab === 'comment';
    if (activeTab === 'post') {
      html = '<div class="aggsearch-row aggsearch-goto"><a href="javascript:void(0);" onclick="haoAggSearch.toArticle()">在全文搜索中查找“' +
        esc(q || '') + '” →</a></div>';
    } else {
      if (showFriend) {
        friendHits.slice(0, 8).forEach(function (f) {
          html += '<div class="aggsearch-row"><span class="aggsearch-tag">友链</span>' +
            '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a>' +
            '<span class="aggsearch-desc">' + esc(f.desc) + '</span></div>';
        });
      }
      if (showComment) {
        commentHits.slice(0, 8).forEach(function (c) {
          html += '<div class="aggsearch-row"><span class="aggsearch-tag">评论</span>' +
            '<span class="aggsearch-text">' + esc(c.text).slice(0, 80) + '</span>' +
            '<span class="aggsearch-desc">— ' + esc(c.author) + '</span></div>';
        });
      }
      if (!html) { html = '<div class="aggsearch-empty">没有匹配结果，换个关键词试试</div>'; }
    }
    hits.innerHTML = html;
    if (stats) {
      stats.textContent = activeTab === 'post' ? '' :
        ('友链 ' + friendHits.length + ' · 评论 ' + commentHits.length);
    }
  }
  function bindTabs() {
    var tabs = document.querySelectorAll('#hao-aggsearch .aggsearch-tab');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        activeTab = t.getAttribute('data-type') || 'all';
        var input = el('aggsearch-input');
        render(input ? input.value : '');
      });
    });
    var input = el('aggsearch-input');
    if (input && !input.dataset.bound) {
      input.dataset.bound = 'true';
      input.addEventListener('input', function () { render(input.value); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { toArticle(); }
        if (e.key === 'Escape') { close(); }
      });
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', bindTabs);
    document.addEventListener('pjax:complete', bindTabs);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); }
    });
  }
  return { open: open, close: close, toArticle: toArticle, render: render };
})();

// 劫持导航栏搜索按钮：聚合面板优先，关闭聚合则直调插件
(function () {
  function hijack() {
    var btn = document.querySelector('#search-button a');
    if (!btn || btn.dataset.aggBound) return;
    btn.dataset.aggBound = 'true';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      haoAggSearch.open();
    }, true);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', hijack);
    document.addEventListener('pjax:complete', hijack);
  }
})();
