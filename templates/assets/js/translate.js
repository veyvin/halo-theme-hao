/* eslint-disable no-undef */
/* 简繁转换：对外暴露 translateFn.translate() 供导航栏/右键菜单调用 */

(function () {
    // 等待 translateCore 就绪
    function waitForCore() {
        return new Promise((resolve) => {
            if (window.translateCore) return resolve();
            const check = setInterval(() => {
                if (window.translateCore) {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
        });
    }

    async function init() {
        await waitForCore();
        const core = window.translateCore;
        if (!core) return;

        const msgToTraditionalChinese = core.getMsgToTraditionalChinese();
        const msgToSimplifiedChinese = core.getMsgToSimplifiedChinese();
        const rightMenuMsgToTraditionalChinese = core.getRightMenuMsgToTraditionalChinese();
        const rightMenuMsgToSimplifiedChinese = core.getRightMenuMsgToSimplifiedChinese();
        const isSnackbar = core.isSnackbar();
        const snackbarData = core.getSnackbarData();
        const targetEncodingCookie = core.getTargetEncodingCookie();
        const saveToLocal = core.getSaveToLocal();

        let currentEncodingRef = core.getCurrentEncoding();
        let targetEncodingRef = core.getTargetEncoding();

        function translatePage() {
            if (core.getTargetEncoding() === 1) {
                core.setCurrentEncoding(1);
                core.setTargetEncoding(2);
                if (core.isSnackbar()) btf.snackbarShow(core.getSnackbarData().chs_to_cht || '你已切换为繁体');
            } else {
                core.setCurrentEncoding(2);
                core.setTargetEncoding(1);
                if (core.isSnackbar()) btf.snackbarShow(core.getSnackbarData().cht_to_chs || '你已切换为简体');
            }
            saveToLocal.set('translate-chn-cht', core.getTargetEncoding(), 2);
            core.setLang();
            core.translateBody();
            // 更新导航栏按钮
            const btn = document.getElementById("translateLink");
            if (btn) btn.innerHTML = core.getTargetEncoding() === 1 ? core.getMsgToSimplifiedChinese() : core.getMsgToTraditionalChinese();
            // 更新右键菜单按钮
            const rmBtn = document.getElementById("menu-translate");
            if (rmBtn) rmBtn.innerHTML = core.getTargetEncoding() === 1 ? core.getRightMenuMsgToSimplifiedChinese() : core.getRightMenuMsgToTraditionalChinese();
            if (GLOBAL_CONFIG.rightMenuEnable && window.rm) rm.hideRightMenu();
        }

        // 对外暴露的接口
        window.translateFn = {
            translate: translatePage,
            getTargetEncoding: () => core.getTargetEncoding(),
            isTraditional: () => core.getTargetEncoding() === 1
        };

        // 初始化：页面加载时应用保存的语言设置
        function initTranslate() {
            const btn = document.getElementById("translateLink");
            const rmBtn = document.getElementById("menu-translate");
            if (btn) btn.innerHTML = core.getTargetEncoding() === 1 ? core.getMsgToSimplifiedChinese() : core.getMsgToTraditionalChinese();
            if (rmBtn) rmBtn.innerHTML = core.getTargetEncoding() === 1 ? core.getRightMenuMsgToSimplifiedChinese() : core.getRightMenuMsgToTraditionalChinese();
            document.documentElement.lang = core.getTargetEncoding() === 1 ? "zh-TW" : "zh-CN";
        }

        // 页面加载时初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initTranslate);
        } else {
            initTranslate();
        }
        // pjax 后重新初始化
        document.addEventListener('pjax:complete', initTranslate);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();