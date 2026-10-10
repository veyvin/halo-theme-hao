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

    /**
     * 登录用户信息挂在 GLOBAL_CONFIG.source.user 下（见 modules/variables/site-config.html），
     * 顶层 GLOBAL_CONFIG.user 并不存在；这里做一次解析，兼容两种位置。
     */
    const haloUser = () => {
        const cfg = (typeof GLOBAL_CONFIG !== 'undefined' && GLOBAL_CONFIG) || null
        if (!cfg) return null
        return cfg.source && cfg.source.user ? cfg.source.user : (cfg.user || null)
    }

    const readSavedMeta = () => {
        try {
            const raw = JSON.parse(localStorage.getItem('twikoo') || '{}')
            return raw && typeof raw === 'object' ? raw : {}
        } catch (e) {
            return {}
        }
    }

    /**
     * Twikoo 的 convertedLink 走 wc()：只要前 4 个字符不是 "http" 就无脑拼 `http://`。
 * Halo 的 permalink 是站内相对路径（/authors/xxx），直接传进去会被拼成 http:///authors/xxx，
 * 昵称链接直接废掉。这里统一转成绝对地址。
     */
    const absoluteUrl = (path) => {
        const p = String(path || '').trim()
        if (!p) return ''
        if (/^https?:\/\//i.test(p)) return p
        return location.origin + (p.charAt(0) === '/' ? p : '/' + p)
    }

    /**
     * Twikoo 的 COMMENT_SUBMIT 请求体里没有 avatar 字段：
     *   t = { nick, mail, link, ua, url, href, title, pageSummary, comment, pid, rid }
     * 也就是说评论头像由服务端拿 mail 的 md5 去 gravatar 取，客户端传什么都不影响。
     * 所以这里绝不伪造邮箱 —— 只沿用用户自己填过的真实邮箱（填一次即长期保存在 localStorage），
     * 昵称/网站则直接取 Halo 账号资料。
     */
    const buildHaloMeta = () => {
        const user = haloUser()
        if (!user || !user.loggedIn) return null
        const saved = readSavedMeta()
        return {
            nick: user.displayName || user.name || saved.nick || '',
            mail: saved.mail || '',
            link: absoluteUrl(user.permalink || saved.link),
            avatar: user.avatar || saved.avatar || ''
        }
    }

    /**
     * 必须在 twikoo.init() 之前调用：Twikoo 的 initMeta() 只在组件挂载时读一次
     * localStorage，之后主题再写 localStorage 不会同步进 Vue 的 metaData。
     */
    const seedHaloMeta = () => {
        const meta = buildHaloMeta()
        if (!meta) return null
        const saved = readSavedMeta()
        // 只比对昵称/网站：邮箱由用户自己填，主题不碰，避免把他正在输入的值冲掉
        const same = (saved.nick || '') === meta.nick && (saved.link || '') === meta.link
        if (!same) {
            const payload = { nick: meta.nick, mail: meta.mail, link: meta.link, avatar: meta.avatar }
            setTwikooMeta(payload)
        }
        return meta
    }

    /** 深度遍历找 tk-meta-input 组件实例（按根节点 class 判定，不依赖组件名） */
    const findMetaInputVm = () => {
        const el = document.getElementById('twikoo') || document.getElementById('twikoo-wrap')
        const vm = el && el.__vue__
        if (!vm) return null
        const stack = [vm]
        while (stack.length) {
            const c = stack.shift()
            if (!c) continue
            const node = c.$el
            if (node && node.classList && node.classList.contains('tk-meta-input')) return c
            if (c.$options && c.$options.name === 'TkMetaInput') return c
            if (c.$children && c.$children.length) stack.push(...c.$children)
        }
        return null
    }

    /**
     * 昵称来自 Halo 账号资料，不能让 Twikoo 的「QQ 号自动补全邮箱」逻辑插手：
     * checkQQ() 命中 /^[1-9][0-9]{4,10}$/ 就会把 mail 覆写成 <nick>@qq.com 并去接口改写昵称，
     * 纯数字昵称的用户（比如 "123456"）会被整条劫持。Vue 初始化时把方法 bind 成实例自有属性，
     * 所以这里直接覆盖实例上的引用即可生效。
     */
    const disableCheckQQ = (vm) => {
        if (vm._haloCheckQQPatched) return
        vm._haloCheckQQPatched = true
        vm.checkQQ = function () {}
    }

    /**
     * 登录用户豁免「邮箱必填」。
     *
     * 背景：Halo 前端拿不到用户邮箱，而 Twikoo 的 checkValid() 默认要求 nick + mail 都非空；
     * 服务端配置加载失败时（this.config 为 undefined）REQUIRED_FIELDS 回退成 {nick,mail}，
     * 邮箱会变成硬性必填，登录用户因此永远发不出。
     * 这里在登录态把校验放宽到「有昵称即可」，输入框又被 CSS 隐藏，访客无感知。
     * Vue 初始化时把方法 bind 成实例自有属性，覆盖实例引用即可生效。
     */
    const relaxMetaValidation = (vm) => {
        if (vm._haloValidPatched) return
        const orig = vm.checkValid
        if (typeof orig !== 'function') return
        vm._haloValidPatched = true
        vm.checkValid = function () {
            try {
                const u = haloUser()
                if (u && u.loggedIn && (this.metaData.nick || '').trim()) return true
            } catch (e) {}
            return orig.call(this)
        }
        // 立刻重算一次，让 isMetaValid / canSend 同步恢复
        if (typeof vm.updateMeta === 'function') vm.updateMeta()
    }

    /**
     * 直接驱动 Vue 组件把评论身份切到「其他方式」。
     *
     * 为什么不能只靠点 DOM：Twikoo 的 initConfig() 是异步的，拿到服务端配置后才 emit('initMeta')，
     * initMeta() 会无条件把 mode 重置为 'default' —— 也就是发送按钮刚出现又被收走。
     * 靠 MutationObserver 再点一次属于时序赌博，这里改成直接调组件方法，确定性执行。
     */
    const forceHaloMetaMode = (meta) => {
        const vm = findMetaInputVm()
        if (!vm) return false
        disableCheckQQ(vm)
        relaxMetaValidation(vm)
        // initMeta/applyModeSwitch 都不搬 avatar，Halo 头像只能直接塞进组件数据
        if (meta && meta.avatar && vm.metaData) vm.metaData.avatar = meta.avatar
        if (vm.mode === 'other') return true
        if (vm.forceHeoid || vm.commentLevelRule) return false
        if (typeof vm.applyModeSwitch === 'function') {
            vm.applyModeSwitch('other')
            return vm.mode === 'other'
        }
        return false
    }

    const applyHaloUserToTwikoo = () => {
        clearHeoID()

        const meta = seedHaloMeta()
        const wrap = getWrap()
        const root = wrap || document

        if (!meta) {
            if (wrap) wrap.classList.remove('tk-halo-user')
            return
        }

        fillField(root, ['nick', '昵称'], meta.nick, true)
        fillField(root, ['link', '网址', 'url', '网站'], meta.link, true)
        fillField(root, ['mail', '邮箱', 'email'], meta.mail, true)

        if (!wrap) return
        // 登录态：昵称/邮箱/网站三项全部由本站账号带出且已锁定，配合 CSS 整行隐藏
        wrap.classList.add('tk-halo-user')
        const metaBox = wrap.querySelector('.tk-meta-input')
        if (metaBox) metaBox.setAttribute('data-halo-nick', meta.nick)

        forceHaloMetaMode(meta)
    }

    /**
     * DOM 点击兜底：Vue 实例还没接管（__vue__ 拿不到）时，直接点「其他方式」。
     * 标记打在模式栏节点上——同一个节点只点一次，避免点击无效时与 MutationObserver 互刷；
     * Vue 重建出的新节点没有标记，仍可再点。
     */
    const ensureHaloMetaMode = () => {
        const wrap = getWrap()
        if (!wrap) return false
        let clicked = false
        wrap.querySelectorAll('.tk-meta-mode-buttons').forEach((bar) => {
            if (bar._haloSwitched) return
            const otherBtn = Array.from(bar.querySelectorAll('button'))
                .find((b) => !b.classList.contains('tk-heoid-mode-btn'))
            if (!otherBtn) return
            bar._haloSwitched = true
            otherBtn.click()
            clicked = true
        })
        return clicked
    }

    /** 复用 HeoID 按钮样式：只改文案 + 跳转本站登录；已登录则隐藏该入口 */
    const patchHaloLoginButton = () => {
        const wrap = getWrap()
        if (!wrap) return

        const cfg = (GLOBAL_CONFIG && GLOBAL_CONFIG.source && GLOBAL_CONFIG.source.twikoo) || {}
        const user = haloUser()
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

        if (user && user.loggedIn) {
            // 已登录：tk-send 只在 metaMode !== 'default' 时渲染，必须把身份切到「其他方式」。
            // 主路径走 forceHaloMetaMode（直接调组件，扛得住 initMeta 的异步重置），
            // 这里补一次 DOM 点击兜底。切不过去就保留模式栏，让访客仍可手动选，不要把路堵死。
            if (!forceHaloMetaMode()) ensureHaloMetaMode()
            return
        }

        const btn = wrap.querySelector('.tk-heoid-mode-btn')
        if (!btn) return

        const modeBar = btn.closest('.tk-meta-mode-buttons') || btn.parentElement

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
        overrideOwnCommentAvatar()
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
            // 防重必须按「任意后代」查：按钮挂进了 .tk-extras-row，用 :scope > 查永远命中不了，
            // 结果就是每次 enhance() 都再插一个。
            if (card.querySelector('.tk-halo-comment-admin')) return
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
            // 挂在底部信息行（系统/浏览器标签那一行）右端，跟「举报」图标排在一起。
            // 原来的做法是绝对定位到卡片右上角，正好压在点赞/回复按钮上。
            // 真实评论必然带 os/browser，.tk-extras-row 一定存在；兜底才退回卡片根节点。
            const host = card.querySelector('.tk-extras-row') || card
            host.appendChild(btn)
        })
    }

    /**
     * 评论头像由服务端拿 mail 的 md5 去 gravatar 取（COMMENT_SUBMIT 请求体里没有 avatar 字段），
     * 所以登录用户即使填了邮箱，列表里也未必显示自己的 Halo 头像。
     * 这里在渲染后把「当前登录用户自己」的评论头像换回 Halo 头像：按昵称匹配，
     * 并排除机器人评论（isBotComment 的昵称也可能撞车）。
     */
    const overrideOwnCommentAvatar = () => {
        const user = haloUser()
        if (!user || !user.loggedIn || !user.avatar) return
        const wrap = getWrap()
        if (!wrap) return
        const nick = String(user.displayName || user.name || '').trim()
        if (!nick) return

        wrap.querySelectorAll('.tk-comment').forEach(card => {
            if (card.querySelector('.tk-bot-icon')) return
            const nameEl = card.querySelector('.tk-meta-head .tk-nick, .tk-meta-head .tk-nick-link')
            if (!nameEl || nameEl.textContent.trim() !== nick) return
            const img = card.querySelector('img.tk-avatar-img')
            if (!img || img.src === user.avatar) return
            img.src = user.avatar
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
        // twikoo.init() 会把 #twikoo-wrap 替换成 #twikoo。若首帧就 observer 到了占位节点，
        // 替换后它变成游离节点、不会再有 mutation —— 只看 observedWrap 非空会让重试提前结束，
        // 这里改成「observer 还没落在真正的 #twikoo 上」才继续重试。
        const mounted = document.getElementById('twikoo')
        if (retry > 0 && !(mounted && observedWrap === mounted)) {
            setTimeout(() => watchTwikoo(retry - 1), 200)
        }
    }

    /** 兜底：按钮已出现但 observer 尚未接管时的点击拦截 */
    const bindDocumentLogin = () => {
        if (document._haloTwikooLoginBound) return
        document._haloTwikooLoginBound = true
        document.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest && e.target.closest('.tk-heoid-mode-btn')
            if (!btn) return
            const cfg = (GLOBAL_CONFIG && GLOBAL_CONFIG.source && GLOBAL_CONFIG.source.twikoo) || {}
            const user = haloUser()
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
        // 先播种 Halo 身份：Twikoo 挂载时的 initMeta() 只读一次 localStorage
        seedHaloMeta()
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
