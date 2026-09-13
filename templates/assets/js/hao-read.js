/* 文章朗读 + 陪读 + 电台模式（Web Speech API，无依赖，pjax 安全）
 * P1-4：dock 底栏（全文朗读/播客陪读/电台模式）+ 电台随机文章队列
 * 电台模式：从 window.HAO_RADIO_LIST（后端注入最新 N 篇）打乱顺序，
 * 播完当前文章自动 pjax 跳下一篇继续朗读；切页/手动停止即退出电台。
 */
var haoRead = (function () {
  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  var speaking = false, companion = false, idx = 0, paras = [];
  var radioOn = false, radioQueue = [], radioPos = 0;

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
  function syncDock() {
    var tts = document.querySelector('#dock-tts');
    var pod = document.querySelector('#dock-podcast');
    var radio = document.querySelector('#dock-radio');
    if (tts) { tts.classList.toggle('playing', speaking && !companion); }
    if (pod) { pod.classList.toggle('playing', speaking && companion && !radioOn); }
    if (radio) { radio.classList.toggle('playing', radioOn); }
    var title = document.querySelector('#dock-radio-title');
    if (title && radioQueue.length) {
      title.textContent = radioOn ? ('电台 · ' + Math.min(radioPos + 1, radioQueue.length) + '/' + radioQueue.length) : '电台模式';
    }
    updateBtn();
  }
  function updateBtn() {
    var icon = document.querySelector('#hao-read-btn i');
    if (icon) { icon.className = 'haofont ' + (speaking ? 'hao-icon-pause' : 'hao-icon-play'); }
    var btn = document.querySelector('#hao-read-btn');
    if (btn) { btn.title = speaking ? (companion ? '停止陪读' : '停止朗读') : '朗读文章'; }
  }
  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function currentText() {
    var el = paras[idx];
    return el ? el.innerText.trim() : '';
  }
  function speak(i) {
    if (!speaking || i >= paras.length) {
      // 本篇播完：电台模式自动跳下一篇
      if (radioOn) { radioNext(true); return; }
      stop(); return;
    }
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
    syncDock();
    snack(companion ? '陪读开始' : '朗读开始');
    speak(0);
    // 空壳 speechSynthesis 兜底（如无语音环境的 headless/服务器浏览器）：只在首段检查，避免换段间隙误杀
    setTimeout(function () {
      try {
        if (speaking && idx === 0 && synth && !synth.speaking && !synth.pending) {
          stop(true);
          snack('当前环境无语音播报能力，请用真机浏览器试听');
        }
      } catch (e) { /* ignore */ }
    }, 1500);
  }
  function stop(silent) {
    speaking = false;
    companion = false;
    radioOn = false;
    try { if (synth) { synth.cancel(); } } catch (e) { /* ignore */ }
    clearMark();
    syncDock();
    if (!silent) { snack('已停止'); }
  }
  // 电台：打乱队列，从第一篇开始（若已在某篇文章内则直接朗读本篇）
  function radioStart() {
    if (!synth) { snack('当前浏览器不支持朗读'); return; }
    var list = window.HAO_RADIO_LIST || [];
    if (!list.length) { snack('暂无电台文章'); return; }
    stop(true);
    radioQueue = shuffle(list);
    radioPos = 0;
    // 若当前就在队列中的文章页，原地开播
    var here = window.location.pathname;
    for (var k = 0; k < radioQueue.length; k++) {
      if (radioQueue[k].url === here) { radioPos = k; break; }
    }
    radioOn = true;
    companion = true;
    if (document.querySelector('#article-container')) {
      snack('电台模式：' + radioQueue[radioPos].title);
      collect();
      if (!paras.length) { radioNext(true); return; }
      speaking = true;
      syncDock();
      speak(0);
    } else {
      radioGoto(radioPos);
    }
  }
  function radioGoto(pos) {
    var item = radioQueue[pos];
    if (!item) { stop(); return; }
    snack('电台下一曲：' + item.title);
    try { sessionStorage.setItem('hao-radio', '1'); } catch (e) { /* ignore */ }
    if (typeof pjax !== 'undefined' && typeof pjax.loadUrl === 'function') { pjax.loadUrl(item.url); }
    else { window.location.href = item.url; }
  }
  function radioNext(auto) {
    if (!radioOn) return;
    radioPos++;
    if (radioPos >= radioQueue.length) {
      radioQueue = shuffle(window.HAO_RADIO_LIST || []);
      radioPos = 0;
      if (!radioQueue.length) { stop(); return; }
      snack('电台列表已播完，重新打乱继续');
    }
    if (auto) { radioGoto(radioPos); }
    else {
      // 手动下一曲：若在文章页则直接跳
      radioGoto(radioPos);
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pjax:send', function () { stop(true); });
    window.addEventListener('beforeunload', function () { stop(true); });
    // pjax 到达新文章页：若电台 session 标记存在则自动续播
    document.addEventListener('pjax:complete', function () {
      var flag = false;
      try { flag = sessionStorage.getItem('hao-radio') === '1'; sessionStorage.removeItem('hao-radio'); } catch (e) { /* ignore */ }
      if (flag && radioQueue.length) {
        radioOn = true;
        companion = true;
        collect();
        if (!paras.length) { radioNext(true); return; }
        speaking = true;
        syncDock();
        snack('电台模式：' + (radioQueue[radioPos] ? radioQueue[radioPos].title : ''));
        speak(0);
      } else if (flag) {
        // 队列丢失（如整页刷新）：重建队列后从当前页续播
        var list = window.HAO_RADIO_LIST || [];
        if (list.length) {
          radioQueue = shuffle(list);
          radioPos = 0;
          radioOn = true;
          companion = true;
          collect();
          if (paras.length) {
            speaking = true;
            syncDock();
            speak(0);
          }
        }
      }
      syncDock();
    });
    document.addEventListener('DOMContentLoaded', function () { syncDock(); });
  }
  return {
    toggle: function (comp) {
      if (speaking && companion === !!comp && !radioOn) { stop(); }
      else { radioOn = false; start(comp); }
    },
    stop: stop,
    radio: {
      toggle: function () { if (radioOn) { stop(); } else { radioStart(); } },
      next: function () { radioNext(false); },
      isOn: function () { return radioOn; }
    },
    text: currentText
  };
})();

var haoRadio = {
  toggle: function () { haoRead.radio.toggle(); },
  next: function () { haoRead.radio.next(); }
};

function haoReadAloud() { haoRead.toggle(false); }
function haoCompanion() { haoRead.toggle(true); }
