/* eslint-disable no-undef */
/* 简繁转换核心转换表与函数：供 translate.js 调用 */
/* 原 tw_cn.js 逻辑，去除自动初始化，改为暴露函数供 translate.js 调用 */

(function () {
    const translate = GLOBAL_CONFIG.translate || {};
    const defaultEncoding = translate.defaultEncoding || 2;
    const translateDelay = translate.translateDelay || 0;
    const msgToTraditionalChinese = translate.msgToTraditionalChinese || '繁';
    const msgToSimplifiedChinese = translate.msgToSimplifiedChinese || '简';
    const rightMenuMsgToTraditionalChinese = '<i class="haofont hao-icon-fanti" style="font-size: 19px;"></i><span>轉為繁體</span>';
    const rightMenuMsgToSimplifiedChinese = '<i class="haofont hao-icon-jianti" style="font-size: 19px;"></i><span>转为简体</span>';

    let currentEncoding = 2;
    const targetEncodingCookie = 'translate-chn-cht';
    let targetEncoding = saveToLocal.get(targetEncodingCookie) === undefined ? 2 : Number(saveToLocal.get(targetEncodingCookie));
    let currentEncodingRef = 2;
    let targetEncodingRef = targetEncoding;

    const isSnackbar = GLOBAL_CONFIG.Snackbar !== undefined;
    const snackbarData = GLOBAL_CONFIG.Snackbar || {};

    const msgToTraditionalChineseVal = msgToTraditionalChinese;
    const msgToSimplifiedChineseVal = msgToSimplifiedChinese;
    const rightMenuMsgToTraditionalChineseVal = rightMenuMsgToTraditionalChinese;
    const rightMenuMsgToSimplifiedChineseVal = rightMenuMsgToSimplifiedChinese;
    const isSnackbarRef = isSnackbar;
    const snackbarDataRef = snackbarData;

    function setLang() {
        document.documentElement.lang = targetEncodingRef === 1 ? "zh-TW" : "zh-CN";
    }

    // 暴露给 translate.js 调用的核心函数
    window.translateCore = {
        getTargetEncoding: () => targetEncodingRef,
        setTargetEncoding: (val) => { targetEncodingRef = val; },
        getCurrentEncoding: () => currentEncodingRef,
        setCurrentEncoding: (val) => { currentEncodingRef = val; },
        getMsgToTraditionalChinese: () => msgToTraditionalChineseVal,
        getMsgToSimplifiedChinese: () => msgToSimplifiedChineseVal,
        getRightMenuMsgToTraditionalChinese: () => rightMenuMsgToTraditionalChineseVal,
        getRightMenuMsgToSimplifiedChinese: () => rightMenuMsgToSimplifiedChineseVal,
        isSnackbar: () => isSnackbarRef,
        getSnackbarData: () => snackbarDataRef,
        getTargetEncodingCookie: () => targetEncodingCookie,
        getSaveToLocal: () => saveToLocal,
        getDefaultEncoding: () => 2,
        getTranslateDelay: () => 0
    };

    // 保留原有转换逻辑供 translate.js 调用
    function translateText(txt) {
        if (txt === '' || txt == null) return '';
        if (currentEncodingRef === 1 && targetEncodingRef === 2) return Simplized(txt);
        else if (currentEncodingRef === 2 && targetEncodingRef === 1) return Traditionalized(txt);
        return txt;
    }

    function translateBody(fobj) {
        let objs = fobj ? fobj.childNodes : document.body.childNodes;
        for (let i = 0; i < objs.length; i++) {
            const obj = objs[i];
            if ('||BR|HR|'.indexOf('|' + obj.tagName + '|') > 0) continue;
            if (obj.title !== '' && obj.title != null) obj.title = translateText(obj.title);
            if (obj.alt !== '' && obj.alt != null) obj.alt = translateText(obj.alt);
            if (obj.placeholder !== '' && obj.placeholder != null) obj.placeholder = translateText(obj.placeholder);
            if (obj.tagName === 'INPUT' && obj.value !== '' && obj.type !== 'text' && obj.type !== 'hidden') obj.value = translateText(obj.value);
            if (obj.nodeType === 3) obj.data = translateText(obj.data);
            else translateBody(obj);
        }
    }

    // 供 translate.js 调用的核心转换函数
    window.translateCore.translateText = translateText;
    window.translateCore.translateBody = translateBody;
    window.translateCore.setLang = () => { document.documentElement.lang = targetEncodingRef === 1 ? "zh-TW" : "zh-CN"; };
    window.translateCore.Traditionalized = Traditionalized;
    window.translateCore.Simplized = Simplized;
    window.translateCore.JTPYStr = JTPYStr;
    window.translateCore.FTPYStr = FTPYStr;
})();