/* 文章朗读 + 陪读（Web Speech API，无依赖，pjax 安全） */
var haoRead = (function () {
  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  var speaking = false, companion = false, idx = 0, paras = [];

  function snack(msg) {
    if (window.btf && typeof window.btf.snackbarShow === 'function') { window.btf.snackbarShow(msg, false, 2000); }
  }
  function collect() {
    paras = Array.prototype.filter.call(
      document.querySelectorAll('#article-container p, #article-container h1, #article-container h2, #article-container h3, #article-container li'),
      function (el) { return el.innerText.trim().length > 1; }
    );
  }
  function clearMark() {
    Array.prototype.forEach.call(document.querySelectorAll('#article-container .hc-reading'), function (el) {
      el.classList.remove('hc-reading');
    });
  }
  function updateBtn() {
    var icon = document.querySelector('#hao-read-btn i');
    if (icon) { icon.className = 'haofont ' + (speaking ? 'hao-icon-pause' : 'hao-icon-play'); }
    var btn = document.querySelector('#hao-read-btn');
    if (btn) { btn.title = speaking ? (companion ? '停止陪读' : '停止朗读') : '朗读文章'; }
  }
  function speak(i) {
    if (!speaking || i >= paras.length) { stop(); return; }
    idx = i;
    var el = paras[i];
    clearMark();
    el.classList.add('hc-reading');
    try {
      if (companion) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      else {
        var r = el.getBoundingClientRect();
        if (r.top < 80 || r.bottom > window.innerHeight - 40) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }
    } catch (e) { /* ignore */ }
    var u = new SpeechSynthesisUtterance(el.innerText.trim());
    u.lang = 'zh-CN';
    u.rate = companion ? 0.95 : 1;
    u.onend = function () { speak(idx + 1); };
    u.onerror = function () { speak(idx + 1); };
    synth.speak(u);
  }
  function start(comp) {
    if (!synth) { snack('当前浏览器不支持朗读'); return; }
    stop(true);
    collect();
    if (!paras.length) { snack('没有可朗读的正文'); return; }
    speaking = true;
    companion = !!comp;
    updateBtn();
    snack(companion ? '陪读开始' : '朗读开始');
    speak(0);
  }
  function stop(silent) {
    speaking = false;
    companion = false;
    try { if (synth) { synth.cancel(); } } catch (e) { /* ignore */ }
    clearMark();
    updateBtn();
    if (!silent) { snack('已停止'); }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pjax:send', function () { stop(true); });
    window.addEventListener('beforeunload', function () { stop(true); });
  }
  return {
    toggle: function (comp) {
      if (speaking && companion === !!comp) { stop(); }
      else { start(comp); }
    },
    stop: stop
  };
})();

function haoReadAloud() { haoRead.toggle(false); }
function haoCompanion() { haoRead.toggle(true); }
