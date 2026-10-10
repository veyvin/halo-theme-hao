(() => {
    if (!document.getElementById('post-comment')) return

    /**
     * Twikoo 2.x 挂载时会用自身根节点替换传入的容器：
     *   <div id="twikoo-wrap"></div>  →  <div id="twikoo" class="twikoo">…</div>
     * 因此一切操作都必须挂在「当前真实存在」的那个节点上，不能写死 #twikoo-wrap。
     */
    const getWrap = () => document.getElementById('twikoo')
        || document.getElementById('twikoo-wrap')
        || document.querySelector('.twikoo')

    const clearHeoID = () => {
        try {
            localStorage.removeItem('twikoo-heoid')
            localStorage.removeItem('twikoo-heoid-refresh-lock')
            if (localStorage.getItem('twikoo-comment-mode') === 'heoid') {
                localStorage.setItem('twikoo-comment-mode', 'default')
            }
        } catch (e) {}
    }

    const setTwikooMeta = (meta) => {
        try {
            localStorage.setItem('twikoo', JSON.stringify(meta))
            localStorage.setItem('twikoo-comment-mode', 'default')
        } catch (e) {}
    }

    const fillField = (root, names, value, lock) => {
        if (!value) return
        const inputs = root.querySelectorAll('.tk-meta-input input, .tk-meta-input-wrapper input, input.tk-input__inner')
        inputs.forEach((input) => {
            const name = (input.getAttribute('name') || '').toLowerCase()
            const ph = (input.getAttribute('placeholder') || '').toLowerCase()
            const hit = names.some((n) => name === n || ph.includes(n))
            if (!hit) return
            if (input.value !== value) {
                input.value = value
                input.dispatchEvent(new Event('input', { bubbles: true }))
                input.dispatchEvent(new Event('change', { bubbles: true }))
            }
            if (lock) {
                input.readOnly = true
                input.classList.add('tk-halo-user-locked')
            }
        })
    }

    const applyHaloUserToTwikoo = () => {
        clearHeoID()

        const user = GLOBAL_CONFIG && GLOBAL_CONFIG.user
        if (!user || !user.loggedIn) return

        let meta = { nick: '', mail: '', link: '', avatar: '' }
        try {
            meta = Object.assign(meta, JSON.parse(localStorage.getItem('twikoo') || '{}'))
        } catch (e) {}

        meta.nick = user.displayName || user.name || meta.nick || ''
        meta.link = user.permalink || meta.link || ''
        meta.avatar = user.avatar || meta.avatar || ''
        // 邮箱前端通常无法取得，保留本地已填；Twikoo 后台建议将邮箱设为选填
        setTwikooMeta(meta)

        const root = getWrap() || document
        fillField(root, ['nick', '昵称'], meta.nick, true)
        fillField(root, ['link', '网址', 'url', '网站'], meta.link, true)
        fillField(root, ['mail', '邮箱', 'email'], meta.mail, false)
    }

    /** 复用 HeoID 按钮样式：只改文案 + 跳转本站登录；已登录则隐藏该入口 */
    const patchHaloLoginButton = () => {
        const wrap = getWrap()
        if (!wrap) return

        const cfg = (GLOBAL_CONFIG && GLOBAL_CONFIG.source && GLOBAL_CONFIG.source.twikoo) || {}
        const user = GLOBAL_CONFIG && GLOBAL_CONFIG.user
        const loginText = cfg.loginText || '使用本站账号登录发表评论'
        const loginUrl = cfg.loginUrl || '/login'

        // 关闭 HeoID 弹层（若已被点开）；:has() 在旧内核不可用，故单独 try
        try {
            wrap.querySelectorAll('.tk-heoid-dialog, .tk-dialog__wrapper:has(.tk-heoid-dialog)').forEach((el) => {
                el.style.display = 'none'
            })
        } catch (e) {
            wrap.querySelectorAll('.tk-heoid-dialog').forEach((el) => {
                el.style.display = 'none'
            })
        }

        const btn = wrap.querySelector('.tk-heoid-mode-btn')
        if (!btn) return

        const modeBar = btn.closest('.tk-meta-mode-buttons') || btn.parentElement

        if (user && user.loggedIn) {
            if (modeBar) modeBar.style.display = 'none'
            return
        }

        if (modeBar && modeBar.style.display === 'none') modeBar.style.display = ''

        const textEl = btn.querySelector('.tk-heoid-mode-text')
        if (textEl) {
            if (textEl.textContent !== loginText) textEl.textContent = loginText
        } else if (!btn.textContent.includes(loginText)) {
            btn.appendChild(document.createTextNode(loginText))
        }

        btn.setAttribute('title', loginText)
        btn.setAttribute('aria-label', loginText)
    }

    /**
     * Twikoo 2.x 是 Vue 组件，HeoID 按钮要等评论加载完才渲染，
     * 且文案由渲染函数生成，手工改 DOM 会被下一次 patch 覆盖。
     * 这里持续观察挂载点，出现即改写，保证文案与跳转始终生效。
     */
    /**
     * Heo 版在切换到「其他方式 / 匿名」时会弹出 tk-mode-confirm 引导弹窗
     *（内部 switchToMode 把 showModeConfirm 置 true，必须经过弹窗才会 applyModeSwitch）。
     * 弹窗里的「继续使用…」就是 confirmModeProceed，等价于直接应用模式，
     * 这里在弹层渲染出来的瞬间自动点掉。
     */
    const autoSkipModeConfirm = () => {
        const overlay = document.querySelector('#twikoo .tk-mode-confirm-overlay')
        if (!overlay) return
        const skip = overlay.querySelector('.tk-mode-confirm-skip')
        if (!skip || skip._haloAutoSkipped) return
        skip._haloAutoSkipped = true
        skip.click()
    }

    const enhance = () => {
        ensureObserver()
        applyHaloUserToTwikoo()
        patchHaloLoginButton()
        renderAdminTools()
        autoSkipModeConfirm()
        typeof Prism === 'object' && Prism.highlightAll()
        if (typeof $ === 'function') {
            const sel = '#twikoo input, #twikoo textarea, #twikoo [contenteditable="true"]'
            $(sel).off('.heoType')
            $(sel)
                .on('focus.heoType', function () { heo_intype = true })
                .on('focusout.heoType', function () { heo_intype = false })
        }
    }

    /* ---------------- 评论管理：Halo 超级管理员可直接删除评论 ---------------- */

    const TRASH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13a2 2 0 0 1-2 1.8H9A2 2 0 0 1 7 20L6 7Zm3.5-3h5a1 1 0 0 1 1 1v1h-7V5a1 1 0 0 1 1-1Zm-4.2 2h12.4a1 1 0 1 1 0 2H4.3a1 1 0 0 1 0-2Z"/></svg>'

    const adminCfg = () => (GLOBAL_CONFIG && GLOBAL_CONFIG.source && GLOBAL_CONFIG.source.twikoo) || {}

    const isHaloAdmin = () => !!(adminCfg().haloAdmin && adminCfg().adminPassword)

    const notify = (text) => {
        if (typeof btf !== 'undefined' && btf.snackbarShow) btf.snackbarShow(text)
        else window.alert(text)
    }

    const twikooCall = (event, payload) => new Promise((resolve, reject) => {
        const cfg = adminCfg()
        const xhr = new XMLHttpRequest()
        xhr.open('POST', cfg.twikooUrl)
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return
            let res = null
            try { res = JSON.parse(xhr.responseText) } catch (e) {}
            if (!res) return reject(new Error('评论服务器无响应'))
            if (res.code === 0) resolve(res)
            else reject(new Error(res.message || ('错误码 ' + res.code)))
        }
        try {
            xhr.send(JSON.stringify(Object.assign({ event, envId: cfg.twikooUrl }, payload)))
        } catch (e) {
            reject(e)
        }
    })

    const refreshComments = () => {
        const btn = document.querySelector('#twikoo .tk-icon.__footer, .twikoo .tk-icon.__footer')
        if (btn) { btn.click(); return }
        const el = document.getElementById('twikoo-count')
        if (el && typeof twikoo !== 'undefined' && twikoo.getCommentsCount === 'function') {
            twikoo.getCommentsCount({
                envId: adminCfg().twikooUrl,
                region: '',
                urls: [location.pathname],
                includeReply: true
            }).then(res => { if (res && res[0]) el.innerText = res[0].count }).catch(() => {})
        }
    }

    const deleteComment = (id, btn, card) => {
        if (!window.confirm('确认删除这条评论？')) return
        btn.classList.add('is-loading')
        twikooCall('COMMENT_DELETE_FOR_ADMIN', { accessToken: adminCfg().adminPassword, id })
            .then(() => {
                notify('评论已删除')
                if (card && card.parentNode) card.parentNode.removeChild(card)
                refreshComments()
            })
            .catch(err => {
                btn.classList.remove('is-loading')
                notify('删除失败：' + err.message)
            })
    }

    const renderAdminTools = () => {
        const wrap = getWrap()
        if (!wrap) return
        if (!isHaloAdmin()) {
            if (wrap.classList.contains('tk-halo-admin')) {
                wrap.classList.remove('tk-halo-admin')
                wrap.querySelectorAll('.tk-halo-comment-admin').forEach(el => el.remove())
            }
            return
        }
        wrap.classList.add('tk-halo-admin')
        wrap.querySelectorAll('.tk-comment[id]').forEach(card => {
            if (card.querySelector(':scope > .tk-halo-comment-admin')) return
            const btn = document.createElement('button')
            btn.type = 'button'
            btn.className = 'tk-halo-comment-admin'
            btn.title = '删除这条评论'
            btn.setAttribute('aria-label', '删除这条评论')
            btn.innerHTML = TRASH_SVG
            btn.addEventListener('click', e => {
                e.preventDefault()
                e.stopPropagation()
                deleteComment(card.id, btn, card)
            })
            card.appendChild(btn)
        })
    }

    let enhanceTimer = null
    const scheduleEnhance = () => {
        if (enhanceTimer) return
        enhanceTimer = requestAnimationFrame(() => {
            enhanceTimer = null
            enhance()
        })
    }

    let observedWrap = null

    /** 挂载点会被 Twikoo 替换（#twikoo-wrap → #twikoo），节点换了就重新接管 */
    const ensureObserver = () => {
        const wrap = getWrap()
        if (!wrap || wrap === observedWrap) return
        if (observedWrap && observedWrap._haloObserver) observedWrap._haloObserver.disconnect()
        // 直接同步关掉模式引导弹层（rAF 合并会让它多闪一帧），其余改动仍走合并调度
        const mo = new MutationObserver(() => {
            autoSkipModeConfirm()
            scheduleEnhance()
        })
        mo.observe(wrap, { childList: true, subtree: true, characterData: true })
        observedWrap = wrap
        wrap._haloObserver = mo
        scheduleEnhance()
    }

    const watchTwikoo = (retry) => {
        ensureObserver()
        if (!observedWrap && retry > 0) setTimeout(() => watchTwikoo(retry - 1), 200)
    }

    /** 兜底：按钮已出现但 observer 尚未接管时的点击拦截 */
    const bindDocumentLogin = () => {
        if (document._haloTwikooLoginBound) return
        document._haloTwikooLoginBound = true
        document.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest && e.target.closest('.tk-heoid-mode-btn')
            if (!btn) return
            const cfg = (GLOBAL_CONFIG && GLOBAL_CONFIG.source && GLOBAL_CONFIG.source.twikoo) || {}
            const user = GLOBAL_CONFIG && GLOBAL_CONFIG.user
            if (user && user.loggedIn) return
            e.preventDefault()
            e.stopPropagation()
            const loginUrl = cfg.loginUrl || '/login'
            location.href = loginUrl + (loginUrl.indexOf('?') >= 0 ? '&' : '?') + 'redirect_uri=' + encodeURIComponent(location.href)
        }, true)
    }

    const init = () => {
        clearHeoID()
        observedWrap = null
        try { twikoo.destroy && twikoo.destroy() } catch (e) {}
        twikoo.init({
            el: '#twikoo-wrap',
            envId: GLOBAL_CONFIG.source.twikoo.twikooUrl,
            region: '',
            path: location.pathname.replace(/\/page\/\d$/, "")
        })
        bindDocumentLogin()
        watchTwikoo(20)
    }

    const getCount = () => {
        const el = document.getElementById('twikoo-count')
        if (!el || typeof twikoo.getCommentsCount !== 'function') return
        twikoo.getCommentsCount({
            envId: GLOBAL_CONFIG.source.twikoo.twikooUrl,
            region: '',
            urls: [window.location.pathname],
            includeReply: true
        }).then(function (res) {
            if (res && res[0]) el.innerText = res[0].count
        }).catch(function () {})
    }

    const runFn = () => {
        init()
        getCount()
    }

    const loadTwikoo = () => {
        if (typeof twikoo === 'object') {
            runFn()
            return
        }
        getScript(GLOBAL_CONFIG.source.twikoo.js).then(runFn)
    }

    const anchor = document.getElementById('post-comment') || document.getElementById('twikoo-wrap')

    if (GLOBAL_CONFIG.source.comments.lazyload && typeof btf !== 'undefined' && btf.loadComment && anchor) {
        btf.loadComment(anchor, loadTwikoo)
    } else {
        loadTwikoo()
    }
})()
