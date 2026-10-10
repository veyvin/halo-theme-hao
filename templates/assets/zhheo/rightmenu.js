// 初始化函数
let rm = {};

//禁止图片拖拽
rm.stopdragimg = $("img");
rm.stopdragimg.on("dragstart", function () {
    return false;
});

// 显示菜单
rm.showRightMenu = function (isTrue, x = 0, y = 0) {
    let $rightMenu = $('#rightMenu');
    $rightMenu.css('top', x + 'px').css('left', y + 'px');
    if (isTrue) {
        $rightMenu.show();
        stopMaskScroll()
    } else {
        $rightMenu.hide();
    }
}

// 隐藏菜单
rm.hideRightMenu = function () {
    rm.showRightMenu(false);
    $('#rightmenu-mask').attr('style', 'display: none');
}

// 尺寸
let rmWidth = $('#rightMenu').width();
let rmHeight = $('#rightMenu').height();

// 重新定义尺寸
rm.reloadrmSize = function () {
    rmWidth = $('#rightMenu').width();
    rmHeight = $('#rightMenu').height();
}

// 获取点击的href
let domhref = '';
let domImgSrc = '';
let globalEvent = null;

// 监听右键初始化
window.oncontextmenu = function (event) {
    if (document.body.clientWidth > 768) {
        let pageX = event.clientX + 10;	//加10是为了防止显示时鼠标遮在菜单上
        let pageY = event.clientY;
        // console.log(event);

        //其他额外菜单
        let $rightMenuOther = $('.rightMenuOther');
        let $rightMenuPlugin = $('.rightMenuPlugin');
        let $rightMenuCopyText = $('#menu-copytext');
        let $rightMenuPasteText = $('#menu-pastetext');
        let $rightMenuCommentText = $('#menu-commenttext');
        let $rightMenuNewWindow = $('#menu-newwindow');
        let $rightMenuNewWindowImg = $('#menu-newwindowimg');
        let $rightMenuCopyLink = $('#menu-copylink');
        let $rightMenuCopyImg = $('#menu-copyimg');
        let $rightMenuDownloadImg = $('#menu-downloadimg');
        let $rightMenuSearch = $('#menu-search');
        let $rightMenuSearchBaidu = $('#menu-searchBaidu');
        let href = event.target.href;
        let imgsrc = event.target.currentSrc;

        // 判断模式 扩展模式为有事件
        let pluginMode = false;
        $rightMenuOther.show();
        globalEvent = event;

        // 检查是否需要复制 是否有选中文本
        if (selectTextNow && window.getSelection()) {
            pluginMode = true;
            $rightMenuCopyText.show();
            $rightMenuCommentText.show();
            $rightMenuSearch.show();
            $rightMenuSearchBaidu.show();
        } else {
            $rightMenuCopyText.hide();
            $rightMenuCommentText.hide();
            $rightMenuSearchBaidu.hide();
            $rightMenuSearch.hide();
        }

        //检查是否右键点击了链接a标签
        if (href) {
            pluginMode = true;
            $rightMenuNewWindow.show();
            $rightMenuCopyLink.show();
            domhref = href;
        } else {
            $rightMenuNewWindow.hide();
            $rightMenuCopyLink.hide();
        }

        //检查是否需要复制图片
        if (imgsrc) {
            pluginMode = true;
            $rightMenuCopyImg.show();
            $rightMenuDownloadImg.show();
            $rightMenuNewWindowImg.show();
            domImgSrc = imgsrc;
        } else {
            $rightMenuCopyImg.hide();
            $rightMenuDownloadImg.hide();
            $rightMenuNewWindowImg.hide();
        }

        // 判断是否为输入框
        if (event.target.tagName.toLowerCase() === 'input' || event.target.tagName.toLowerCase() === 'textarea') {
            console.log('这是一个输入框')
            pluginMode = true;
            $rightMenuPasteText.show();
        } else {
            $rightMenuPasteText.hide();
        }

        // 如果不是扩展模式则隐藏扩展模块
        if (pluginMode) {
            $rightMenuOther.hide();
            $rightMenuPlugin.show();
        } else {
            $rightMenuPlugin.hide()
        }

        rm.reloadrmSize()

        // 鼠标默认显示在鼠标右下方，当鼠标靠右或考下时，将菜单显示在鼠标左方\上方
        if (pageX + rmWidth > window.innerWidth) {
            pageX -= rmWidth + 10;
        }
        if (pageY + rmHeight > window.innerHeight) {
            pageY -= pageY + rmHeight - window.innerHeight;
        }

        rm.showRightMenu(true, pageY, pageX);
        $('#rightmenu-mask').attr('style', 'display: flex');
        return false;
    }
};

// 下载图片状态
rm.downloadimging = false;

// 复制图片到剪贴板
rm.writeClipImg = function (imgsrc) {
    console.log('按下复制');
    rm.hideRightMenu();
    btf.snackbarShow('正在下载中，请稍后', false, 10000)
    if (rm.downloadimging == false) {
        rm.downloadimging = true;
        setTimeout(function () {
            copyImage(imgsrc);
            btf.snackbarShow('复制成功！图片已添加盲水印，请遵守版权协议');
            rm.downloadimging = false;
        }, "10000")
    }
}

function imageToBlob(imageURL) {
    const img = new Image;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    img.crossOrigin = "";
    img.src = imageURL;
    return new Promise(resolve => {
        img.onload = function () {
            c.width = this.naturalWidth;
            c.height = this.naturalHeight;
            ctx.drawImage(this, 0, 0);
            // 盲水印：右下角低透明度站点标识（对标原站）
            try {
                var mark = (window.location.hostname || '') + ' ' + (document.title || '').slice(0, 20);
                var fs = Math.max(12, Math.floor(c.width / 40));
                ctx.font = fs + 'px sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.textBaseline = 'bottom';
                var tw = ctx.measureText(mark).width;
                ctx.fillText(mark, c.width - tw - 12, c.height - 10);
                ctx.fillStyle = 'rgba(0,0,0,0.18)';
                ctx.fillText(mark, c.width - tw - 11, c.height - 9);
            } catch (e) { /* ignore watermark errors */ }
            c.toBlob((blob) => {
                // here the image is a blob
                resolve(blob)
            }, "image/png", 0.75);
        };
    })
}

async function copyImage(imageURL) {
    const blob = await imageToBlob(imageURL)
    const item = new ClipboardItem({"image/png": blob});
    navigator.clipboard.write([item]);
}

rm.switchDarkMode = function () {
    navFn.switchDarkMode();
    rm.hideRightMenu();

    //halo.darkComment();
}

rm.copyUrl = function (id) {
    var text = id;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {
            var input = document.createElement('input');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            input.setSelectionRange(0, input.value.length);
            document.execCommand("copy");
            input.remove();
        });
        return;
    }
    var input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, input.value.length);
    document.execCommand("copy");
    input.remove();
}

function stopMaskScroll() {
    if (window.__haoRightMenuWheelBound) return;
    window.__haoRightMenuWheelBound = true;
    var onWheel = function () { rm.hideRightMenu(); };
    var opts = { passive: true, capture: true };
    document.addEventListener("wheel", function (e) {
        if (e.target && (e.target.closest('#rightmenu-mask') || e.target.closest('#rightMenu'))) onWheel();
    }, opts);
}

rm.rightmenuCopyText = function (txt) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(txt);
    }
    rm.hideRightMenu();
}

rm.copyPageUrl = function () {
    var url = window.location.href;
    rm.copyUrl(url);
    if (window.btf && typeof btf.snackbarShow === 'function') {
        btf.snackbarShow('复制本页链接地址成功', false, 2000);
    }
    rm.hideRightMenu();
}

rm.sharePage = function () {
    var content = window.location.href;
    rm.copyUrl(url);
    btf.snackbarShow('复制本页链接地址成功', false, 2000);
    rm.hideRightMenu();
}

// 复制当前选中文本
var selectTextNow = '';
document.onmouseup = document.ondbclick = selceText;

function selceText() {
    var txt;
    if (document.selection) {
        txt = document.selection.createRange().text;
    } else {
        txt = window.getSelection() + '';
    }
    if (txt) {
        selectTextNow = txt;
        // console.log(selectTextNow);
    } else {
        selectTextNow = '';
    }
}

// 读取剪切板
rm.readClipboard = function () {
    if (navigator.clipboard) {
        navigator.clipboard.readText().then(clipText => rm.insertAtCaret(globalEvent.target, clipText));
    }
}

// 粘贴文本到焦点
rm.insertAtCaret = function (elemt, value) {
    const startPos = elemt.selectionStart,
        endPos = elemt.selectionEnd;
    if (document.selection) {
        elemt.focus();
        var sel = document.selection.createRange();
        sel.text = value;
        elemt.focus();
    } else {
        if (startPos || startPos == '0') {
            var scrollTop = elemt.scrollTop;
            elemt.value = elemt.value.substring(0, startPos) + value + elemt.value.substring(endPos, elemt.value.length);
            elemt.focus();
            elemt.selectionStart = startPos + value.length;
            elemt.selectionEnd = startPos + value.length;
            elemt.scrollTop = scrollTop;
        } else {
            elemt.value += value;
            elemt.focus();
        }
    }
}

//粘贴文本
rm.pasteText = function () {
    const result = rm.readClipboard() || '';
    rm.hideRightMenu();
}

//引用到评论
rm.rightMenuCommentText = function (txt) {
    rm.hideRightMenu();
    let inputValue = replaceAll(txt, '\n', '\n> ')
    var input = btf.fillCommentText('> ' + inputValue + '\n\n');
    var comment = document.querySelector("#post-comment");
    if (comment) window.scrollTo(0, comment.offsetTop - 80);
    if (document.getElementById("comment-tips")) {
        document.getElementById("comment-tips").classList.add("show");
    }
    if (input) input.focus();
}

//替换所有内容
function replaceAll(string, search, replace) {
    return string.split(search).join(replace);
}

// 百度搜索
rm.searchBaidu = function () {
    btf.snackbarShow('即将跳转到百度搜索', false, 2000);
    setTimeout(function () {
        window.open('https://www.baidu.com/s?wd=' + selectTextNow);
    }, "2000");
    rm.hideRightMenu();
}

//分享链接
rm.copyLink = function () {
    rm.rightmenuCopyText(domhref);
    btf.snackbarShow('已复制链接地址');
}

function addRightMenuClickEvent() {
    if (window.__haoRightMenuClickBound) return;
    window.__haoRightMenuClickBound = true;
    // 委托到 document：pjax 换掉菜单节点后点击仍有效
    var on = function (sel, fn) {
        document.addEventListener('click', function (e) {
            var el = e.target && e.target.closest && e.target.closest(sel);
            if (!el) return;
            fn(e, el);
        });
    };
    on('#menu-backward', function () { window.history.back(); rm.hideRightMenu(); });
    on('#menu-forward', function () { window.history.forward(); rm.hideRightMenu(); });
    on('#menu-refresh', function () { window.location.reload(); });
    on('#menu-top', function () {
        if (window.btf && typeof btf.scrollToDest === 'function') btf.scrollToDest(0, 500);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        rm.hideRightMenu();
    });
    on('.menu-link', function () { rm.hideRightMenu(); });
    on('#menu-home', function () { window.location.href = window.location.origin; });
    on('#menu-randomPost', function () { typeof toRandomPost === 'function' && toRandomPost(); });
    on('#menu-commentBarrage', function () { typeof heo !== 'undefined' && heo.switchCommentBarrage(); });
    on('#rightmenu-mask', function () { rm.hideRightMenu(); });
    on('#menu-copy', function () { rm.copyPageUrl(); });
    on('#menu-pastetext', function () { rm.pasteText(); });
    on('#menu-copytext', function () {
        rm.rightmenuCopyText(selectTextNow);
        btf.snackbarShow('复制成功，复制和转载请标注本文地址');
    });
    on('#menu-commenttext', function () { rm.rightMenuCommentText(selectTextNow); });
    on('#menu-newwindow', function () { window.open(domhref); rm.hideRightMenu(); });
    on('#menu-copylink', function () { rm.copyLink(); });
    on('#menu-downloadimg', function () { heo.downloadImage(domImgSrc, 'hao'); });
    on('#menu-newwindowimg', function () { window.open(domImgSrc, "_blank"); rm.hideRightMenu(); });
    on('#menu-copyimg', function () { rm.writeClipImg(domImgSrc); });
    on('#menu-searchBaidu', function () { rm.searchBaidu(); });
    document.addEventListener('contextmenu', function (e) {
        if (e.target && e.target.closest && e.target.closest('#rightmenu-mask')) {
            e.preventDefault();
            rm.hideRightMenu();
        }
    });
}

// 自身初始化：不依赖 blogex.js 的 defer 执行顺序（blogex 在文档中更靠前时会先跑 initBlog）
if (document.readyState !== 'loading') {
    addRightMenuClickEvent();
} else {
    document.addEventListener('DOMContentLoaded', addRightMenuClickEvent);
}
