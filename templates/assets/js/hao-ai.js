/* 文章页 AI 助手面板：复用站内已有能力（AI 摘要 / 页内查找 / 朗读选中），无外部依赖 */
var haoAi = (function () {
  var panel = null;

  function snack(msg) {
    if (window.btf && typeof window.btf.snackbarShow === 'function') { window.btf.snackbarShow(msg, false, 2000); }
  }
  function copyText(t, okMsg) {
    function done() { snack(okMsg || '已复制'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
    }
  }
  function summaryText() {
    var el = document.querySelector('.ai-explanation');
    return el ? el.innerText.trim() : '';
  }
  function gotoSummary() {
    var box = document.querySelector('.post-ai');
    if (!box) { snack('本文未开启 AI 摘要'); return; }
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function clearMarks() {
    var c = document.querySelector('#article-container');
    if (!c) { return; }
    Array.prototype.forEach.call(c.querySelectorAll('.hc-mark'), function (m) {
      var t = document.createTextNode(m.textContent);
      m.parentNode.replaceChild(t, m);
    });
    c.normalize();
  }
  function findInPage() {
    var input = document.querySelector('#hao-ai-find-input');
    var kw = input ? input.value.trim() : '';
    clearMarks();
    if (!kw) { return; }
    if (!document.querySelector('#article-container')) { snack('当前页面没有可查找的正文'); return; }
    var count = 0;
    var walker = document.createTreeWalker(
      document.querySelector('#article-container'), NodeFilter.SHOW_TEXT,
      { acceptNode: function (n) { return n.nodeValue.indexOf(kw) > -1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } }
    );
    var nodes = [];
    while (walker.nextNode()) { nodes.push(walker.currentNode); }
    nodes.forEach(function (n) {
      var frag = document.createDocumentFragment();
      var rest = n.nodeValue, at;
      while ((at = rest.indexOf(kw)) > -1) {
        frag.appendChild(document.createTextNode(rest.slice(0, at)));
        var mark = document.createElement('mark');
        mark.className = 'hc-mark';
        mark.textContent = kw;
        frag.appendChild(mark);
        count++;
        rest = rest.slice(at + kw.length);
      }
      frag.appendChild(document.createTextNode(rest));
      n.parentNode.replaceChild(frag, n);
    });
    snack(count ? ('找到 ' + count + ' 处') : '未找到匹配');
    var first = document.querySelector('#article-container .hc-mark');
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  function readSelection() {
    var t = (window.getSelection() || '').toString().trim();
    if (!t) { snack('请先选中一段文字'); return; }
    if (!('speechSynthesis' in window)) { snack('当前浏览器不支持朗读'); return; }
    if (window.haoRead) { haoRead.stop(true); }
    var u = new SpeechSynthesisUtterance(t);
    u.lang = 'zh-CN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    snack('正在朗读选中内容');
  }
  // pjax 换页不替换 head 链接：面板打开前确保样式已加载（仅在实际使用时补挂）
  function ensureCss() {
    if (document.querySelector('link[href*="hao-post-tools.css"]')) return;
    var s = document.querySelector('script[src*="hao-ai.js"]');
    if (!s || !s.src) return;
    var href = s.src.replace(/\/js\/hao-ai\.js(\?.*)?$/, '/css/hao-post-tools.css$1');
    if (href === s.src) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }
  // 功能项卡片：图标 + 主标题 + 副标题
  function itemHtml(id, icon, title, sub) {
    return '<button type="button" class="hao-ai-item" id="' + id + '">' +
      '<span class="hao-ai-ic"><i class="haofont hao-icon-' + icon + '"></i></span>' +
      '<span class="hao-ai-tx">' + title + '<b>' + sub + '</b></span></button>';
  }
  function ensure() {
    ensureCss();
    if (panel) { return panel; }
    panel = document.createElement('div');
    panel.id = 'hao-ai-panel';
    panel.innerHTML =
      '<div class="hao-ai-h">' +
        '<span class="hao-ai-h-left">' +
          '<span class="hao-ai-logo"><i class="haofont hao-icon-message"></i></span>' +
          '<span class="hao-ai-tt">AI 助手<span class="hao-ai-st">阅读辅助工具</span></span>' +
        '</span>' +
        '<button type="button" id="hao-ai-close" title="关闭"><i class="haofont hao-icon-xmark"></i></button>' +
      '</div>' +
      '<div class="hao-ai-b">' +
        '<div class="hao-ai-sec">摘要</div>' +
        itemHtml('hao-ai-goto', 'bolt', '查看 AI 摘要', '定位到本文摘要') +
        itemHtml('hao-ai-copy', 'copy', '复制摘要', '复制摘要全文') +
        '<div class="hao-ai-sec">查找</div>' +
        '<div class="hao-ai-find">' +
          '<input id="hao-ai-find-input" type="text" placeholder="输入关键词，正文内查找">' +
          '<button type="button" class="hao-ai-btn" id="hao-ai-find" title="查找"><i class="haofont hao-icon-search--line"></i></button>' +
        '</div>' +
        itemHtml('hao-ai-clear', 'circle-xmark', '清除标记', '清除正文查找高亮') +
        '<div class="hao-ai-sec">朗读</div>' +
        itemHtml('hao-ai-readsel', 'play', '朗读选中', '选中正文后朗读') +
        '<div class="hao-ai-keys"><i class="haofont hao-icon-keyboard"></i>' +
        '<kbd>Shift</kbd>+<kbd>T</kbd> 朗读 <kbd>Shift</kbd>+<kbd>P</kbd> 陪读 <kbd>Shift</kbd>+<kbd>C</kbd> 助手 ' +
        '<kbd>Shift</kbd>+<kbd>A</kbd> 中控台 <kbd>Shift</kbd>+<kbd>M</kbd> 音乐 <kbd>Shift</kbd>+<kbd>D</kbd> 深浅色 <kbd>Shift</kbd>+<kbd>H</kbd> 首页 <kbd>Shift</kbd>+<kbd>L</kbd> 友链</div>' +
      '</div>';
    document.body.appendChild(panel);
    document.querySelector('#hao-ai-close').addEventListener('click', toggle);
    document.querySelector('#hao-ai-goto').addEventListener('click', gotoSummary);
    document.querySelector('#hao-ai-copy').addEventListener('click', function () {
      var t = summaryText();
      if (!t) { snack('暂无可复制的摘要'); return; }
      copyText(t, '摘要已复制');
    });
    document.querySelector('#hao-ai-find').addEventListener('click', findInPage);
    document.querySelector('#hao-ai-find-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { findInPage(); }
    });
    document.querySelector('#hao-ai-readsel').addEventListener('click', readSelection);
    document.querySelector('#hao-ai-clear').addEventListener('click', function () { clearMarks(); snack('已清除'); });
    // 点击面板外部关闭
    document.addEventListener('mousedown', function (e) {
      if (!panel.classList.contains('show')) return;
      if (panel.contains(e.target)) return;
      // 排除右侧悬浮栏按钮（点它是 toggle，避免双触发关闭）
      var btn = document.querySelector('#hao-ai-btn');
      if (btn && btn.contains(e.target)) return;
      close();
    });
    return panel;
  }
  function toggle() {
    ensure().classList.toggle('show');
  }
  function close() {
    if (panel) { panel.classList.remove('show'); }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pjax:send', function () {
      clearMarks();
      if (panel) { panel.classList.remove('show'); }
    });
  }
  return { toggle: toggle, close: close };
})();

function haoAiToggle() { haoAi.toggle(); }
