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
  function ensure() {
    if (panel) { return panel; }
    panel = document.createElement('div');
    panel.id = 'hao-ai-panel';
    panel.innerHTML =
      '<div class="hao-ai-h"><span><i class="haofont hao-icon-message"></i> AI 助手</span>' +
      '<button type="button" id="hao-ai-close" title="关闭">✕</button></div>' +
      '<div class="hao-ai-b">' +
      '<div class="hao-ai-row">' +
      '<button type="button" class="hao-ai-btn" id="hao-ai-goto">查看 AI 摘要</button>' +
      '<button type="button" class="hao-ai-btn" id="hao-ai-copy">复制摘要</button>' +
      '</div>' +
      '<div class="hao-ai-find">' +
      '<input id="hao-ai-find-input" type="text" placeholder="页内查找关键词">' +
      '<button type="button" class="hao-ai-btn" id="hao-ai-find">查找</button>' +
      '</div>' +
      '<div class="hao-ai-row">' +
      '<button type="button" class="hao-ai-btn" id="hao-ai-readsel">朗读选中</button>' +
      '<button type="button" class="hao-ai-btn" id="hao-ai-clear">清除标记</button>' +
      '</div>' +
      '<div class="hao-ai-keys">快捷键 <kbd>Shift+T</kbd> 朗读 <kbd>Shift+P</kbd> 陪读 <kbd>Shift+C</kbd> 助手 ' +
      '<kbd>Shift+A</kbd> 中控台 <kbd>Shift+M</kbd> 音乐 <kbd>Shift+D</kbd> 深浅色 <kbd>Shift+H</kbd> 首页 <kbd>Shift+L</kbd> 友链</div>' +
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
    return panel;
  }
  function toggle() {
    ensure().classList.toggle('show');
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pjax:send', function () {
      clearMarks();
      if (panel) { panel.classList.remove('show'); }
    });
  }
  return { toggle: toggle };
})();

function haoAiToggle() { haoAi.toggle(); }
