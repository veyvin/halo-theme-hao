;(() => {
    // 顶层 const 放 IIFE 内：脚本在 .js-pjax 里，换页会再执行，全局 const 会报 already been declared
    // 不依赖外链的表情。key 是面板上的名字，val 是插入评论的字符。
    const ARTALK_LOCAL_EMOTICONS = [
        {
            name: '表情',
            type: 'emoji',
            items: ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😜', '🤔', '😎', '😭', '😡', '👍', '👎', '👏', '🙏', '🎉', '🔥', '❤️', '✨', '🌟', '💡', '✅', '❌'].map(function (ch) {
                return { key: ch, val: ch }
            })
        },
        {
            name: '颜文字',
            type: 'emoji',
            items: [
                ['开心', '(^▽^)'],
                ['笑哭', '(≧▽≦)'],
                ['无语', '(￣▽￣)"'],
                ['害羞', '(/ω＼)'],
                ['惊讶', '(°o°)'],
                ['生气', '(╯°□°)╯'],
                ['哭', '(T_T)'],
                ['赞', '(b￣▽￣)d']
            ].map(function (pair) {
                return { key: pair[0], val: pair[1] }
            })
        }
    ]

    const ATK_MODE_KEY = 'artalk-heo-mode'
    const ATK_USER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>'
    const ATK_REFRESH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 13.65-6.65z"/></svg>'

    // 与 heo.js 匿名评论同一套词表（精简副本）
    const ATK_ADJ = ['美丽的', '聪明的', '可爱的', '开朗的', '有趣的', '温柔的', '幽默的', '有创新能力的', '善良的', '活泼的', '机智的', '真诚的']
    const ATK_NOUN = ['茄子', '萝卜', '白菜', '苹果', '香蕉', '草莓', '西瓜', '蘑菇', '柠檬', '桃子', '樱桃', '黄瓜']

    if (!document.getElementById('post-comment')) return

    const cfg = () => (GLOBAL_CONFIG && GLOBAL_CONFIG.source && GLOBAL_CONFIG.source.artalk) || {}
    const haloUser = () => {
        const g = (typeof GLOBAL_CONFIG !== 'undefined' && GLOBAL_CONFIG) || null
        if (!g) return null
        return (g.source && g.source.user) || g.user || null
    }

    const absoluteUrl = (path) => {
        const p = String(path || '').trim()
        if (!p) return ''
        if (/^https?:\/\//i.test(p)) return p
        return location.origin + (p.charAt(0) === '/' ? p : '/' + p)
    }

    const getMode = () => {
        try { return localStorage.getItem(ATK_MODE_KEY) || 'default' } catch (e) { return 'default' }
    }
    const setMode = (mode) => {
        try { localStorage.setItem(ATK_MODE_KEY, mode) } catch (e) {}
    }

    const editors = () => document.querySelectorAll('#artalk-wrap .atk-main-editor, .artalk .atk-main-editor')

    const findInput = (editor, cls) => {
        if (!editor) return null
        return editor.querySelector('.atk-header input.' + cls) || editor.querySelector('input.' + cls)
    }

    const setInputValue = (input, value, lock) => {
        if (!input) return
        if (value != null && input.value !== value) {
            input.value = value
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
        }
        if (lock) {
            input.readOnly = true
            input.classList.add('atk-halo-locked')
        } else {
            input.readOnly = false
            input.classList.remove('atk-halo-locked')
        }
    }

    const randomAnonymousNick = () => ATK_ADJ[Math.floor(Math.random() * ATK_ADJ.length)]
        + ATK_NOUN[Math.floor(Math.random() * ATK_NOUN.length)]

    // Twikoo：昵称/邮箱/网址 = 加粗标签 + 输入框 一粒胶囊
    const dressMetaFields = (editor) => {
        const header = editor && editor.querySelector(':scope > .atk-header')
        if (!header) return
        ;[
            ['atk-name', '昵称', '必填'],
            ['atk-email', '邮箱', '必填'],
            ['atk-link', '网址', '选填']
        ].forEach(function (field) {
            const input = header.querySelector(':scope > input.' + field[0])
            if (!input) return
            const wrap = document.createElement('label')
            wrap.className = 'atk-meta-field'
            const label = document.createElement('span')
            label.className = 'atk-meta-label'
            label.textContent = field[1]
            input.setAttribute('placeholder', field[2])
            header.insertBefore(wrap, input)
            wrap.append(label, input)
        })
    }

    const ensureHeoChrome = (editor) => {
        if (!editor) return
        // Artalk 刷新编辑器时会把 .atk-header 重新挂回编辑器根上，这里把它挪回身份行
        if (editor._atkHeoReady) {
            const stray = editor.querySelector(':scope > .atk-header')
            const identity = editor.querySelector(':scope > .atk-heo-identity')
            if (stray && identity) {
                dressMetaFields(editor)
                identity.insertBefore(stray, identity.querySelector('.atk-heo-actions'))
            }
            return
        }
        editor._atkHeoReady = true
        editor.classList.add('atk-heo-editor')

        dressMetaFields(editor)

        const modeBar = document.createElement('div')
        modeBar.className = 'atk-heo-mode-bar'
        modeBar.innerHTML = [
            '<button type="button" class="atk-heo-mode-btn atk-heo-mode-login" data-mode="login">',
            '<span class="atk-heo-mode-logo" aria-hidden="true"></span>',
            '<span class="atk-heo-mode-text"></span>',
            '</button>',
            '<button type="button" class="atk-heo-mode-btn" data-mode="other">其他方式</button>',
            '<button type="button" class="atk-heo-mode-btn" data-mode="anonymous">匿名</button>'
        ].join('')

        const identity = document.createElement('div')
        identity.className = 'atk-heo-identity'
        identity.innerHTML = [
            '<div class="atk-heo-avatar" aria-hidden="true">', ATK_USER_SVG, '</div>',
            '<div class="atk-heo-identity-main"></div>',
            '<div class="atk-heo-actions"></div>'
        ].join('')

        const header = editor.querySelector(':scope > .atk-header')
        // 结构对标 Twikoo：头像 | 字段/昵称 | 切换/注销 | 发送 同一行
        editor.prepend(modeBar)
        editor.insertBefore(identity, modeBar.nextSibling)
        if (header) {
            const actions = identity.querySelector('.atk-heo-actions')
            identity.insertBefore(header, actions)
        }

        modeBar.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-mode]')
            if (!btn) return
            const mode = btn.getAttribute('data-mode')
            if (mode === 'login') {
                location.href = cfg().loginUrl || '/login'
                return
            }
            applyMode(mode)
        })

        identity.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]')
            if (!btn) return
            const action = btn.getAttribute('data-action')
            if (action === 'switch' || action === 'logout') applyMode('default')
            else if (action === 'refresh') {
                fillAnonymous(editor, true)
                const nickEl = editor.querySelector('.atk-heo-nick')
                const nickInput = findInput(editor, 'atk-name')
                if (nickEl && nickInput) nickEl.textContent = nickInput.value
            }
        })
    }

    const fillAnonymous = (editor, force) => {
        const nickInput = findInput(editor, 'atk-name')
        const mailInput = findInput(editor, 'atk-email')
        const linkInput = findInput(editor, 'atk-link')
        if (force || !(nickInput && nickInput.value)) {
            setInputValue(nickInput, randomAnonymousNick(), true)
        } else {
            setInputValue(nickInput, nickInput.value, true)
        }
        const visitor = (typeof visitorMail !== 'undefined' && visitorMail) || ''
        setInputValue(mailInput, visitor, true)
        setInputValue(linkInput, '', true)
    }

    const fillHaloUser = (editor) => {
        const user = haloUser()
        if (!user || !user.loggedIn) return false
        const nick = user.displayName || user.name || ''
        const link = absoluteUrl(user.permalink || '')
        setInputValue(findInput(editor, 'atk-name'), nick, true)
        setInputValue(findInput(editor, 'atk-link'), link, true)
        const mailInput = findInput(editor, 'atk-email')
        if (mailInput) {
            // 登录态邮箱：保留用户已填；若 Artalk 必填且为空，用 visitorMail 兜底以便能发出
            if (!mailInput.value && mailInput.required) {
                const visitor = (typeof visitorMail !== 'undefined' && visitorMail) || ''
                if (visitor) setInputValue(mailInput, visitor, true)
                else setInputValue(mailInput, mailInput.value, true)
            } else {
                setInputValue(mailInput, mailInput.value, true)
            }
        }
        const avatar = editor.querySelector('.atk-heo-avatar')
        if (avatar) {
            avatar.innerHTML = user.avatar
                ? '<img alt="" src="' + String(user.avatar).replace(/"/g, '&quot;') + '">'
                : ATK_USER_SVG
        }
        return true
    }

    const relocateSend = (editor, actions) => {
        const send = editor.querySelector('.atk-bottom .atk-send-btn')
            || editor.querySelector('.atk-heo-actions .atk-send-btn')
        if (!send || !actions) return
        if (!editor._atkSendHome) {
            editor._atkSendHome = send.parentElement
            editor._atkSendNext = send.nextSibling
        }
        send.classList.add('atk-heo-send')
        if (send.parentElement !== actions) actions.appendChild(send)
    }

    const restoreSend = (editor) => {
        const send = editor.querySelector('.atk-heo-actions .atk-send-btn')
        if (!send || !editor._atkSendHome) return
        send.classList.remove('atk-heo-send')
        if (editor._atkSendNext && editor._atkSendNext.parentNode === editor._atkSendHome) {
            editor._atkSendHome.insertBefore(send, editor._atkSendNext)
        } else {
            editor._atkSendHome.appendChild(send)
        }
    }

    const renderIdentity = (editor, mode) => {
        const main = editor.querySelector('.atk-heo-identity-main')
        const actions = editor.querySelector('.atk-heo-actions')
        const avatar = editor.querySelector('.atk-heo-avatar')
        if (!main || !actions) return

        if (mode === 'other') {
            if (avatar) avatar.innerHTML = ATK_USER_SVG
            main.innerHTML = ''
            actions.innerHTML = '<button type="button" class="atk-heo-action-btn" data-action="switch">切换</button>'
            relocateSend(editor, actions)
            return
        }

        if (mode === 'anonymous') {
            if (avatar) avatar.innerHTML = ATK_USER_SVG
            const nick = (findInput(editor, 'atk-name') || {}).value || ''
            main.innerHTML = [
                '<span class="atk-heo-nick"></span>',
                '<button type="button" class="atk-heo-text-btn" data-action="refresh" title="换一个">',
                ATK_REFRESH_SVG,
                '<span>换一个</span>',
                '</button>'
            ].join('')
            main.querySelector('.atk-heo-nick').textContent = nick
            actions.innerHTML = '<button type="button" class="atk-heo-action-btn" data-action="logout">注销</button>'
            relocateSend(editor, actions)
            return
        }

        if (mode === 'halo') {
            const user = haloUser() || {}
            const nick = user.displayName || user.name || ''
            main.innerHTML = '<span class="atk-heo-nick"></span><span class="atk-heo-identity-tip">以本站账号发表</span>'
            main.querySelector('.atk-heo-nick').textContent = nick
            actions.innerHTML = ''
            relocateSend(editor, actions)
            return
        }

        restoreSend(editor)
        main.innerHTML = ''
        actions.innerHTML = ''
    }

    const applyMode = (mode) => {
        const user = haloUser()
        const loggedIn = !!(user && user.loggedIn)

        if (loggedIn) mode = 'halo'
        else if (mode === 'halo') mode = 'default'

        if (mode !== 'halo') setMode(mode)

        editors().forEach((editor) => {
            ensureHeoChrome(editor)

            ;['atk-name', 'atk-email', 'atk-link'].forEach((cls) => {
                const input = findInput(editor, cls)
                if (input) {
                    input.readOnly = false
                    input.classList.remove('atk-halo-locked')
                }
            })

            editor.setAttribute('data-atk-mode', mode)
            const loginText = cfg().loginText || '使用本站账号登录发表评论'
            const loginBtn = editor.querySelector('.atk-heo-mode-login .atk-heo-mode-text')
            if (loginBtn) loginBtn.textContent = loginText

            if (mode === 'other') {
                renderIdentity(editor, 'other')
            } else if (mode === 'anonymous') {
                fillAnonymous(editor, true)
                renderIdentity(editor, 'anonymous')
            } else if (mode === 'halo') {
                fillHaloUser(editor)
                renderIdentity(editor, 'halo')
            } else {
                renderIdentity(editor, 'default')
            }
        })
    }

    // 对标 Twikoo 自定义弯角把手（不是浏览器原生 resize）
    const dressResizeHandle = (editor) => {
        const wrap = editor.querySelector(':scope > .atk-textarea-wrap')
        const textarea = wrap && wrap.querySelector(':scope > .atk-textarea')
        if (!wrap || !textarea) return
        if (wrap.querySelector(':scope > .atk-heo-resize-handle')) return

        const handle = document.createElement('div')
        handle.className = 'atk-heo-resize-handle'
        handle.setAttribute('aria-hidden', 'true')
        wrap.appendChild(handle)

        let startY = 0
        let startH = 0
        const onMove = (e) => {
            const y = e.touches ? e.touches[0].clientY : e.clientY
            const next = Math.max(100, startH + (y - startY))
            textarea.style.height = next + 'px'
            if (e.cancelable) e.preventDefault()
        }
        const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
            document.removeEventListener('touchmove', onMove)
            document.removeEventListener('touchend', onUp)
        }
        const onDown = (e) => {
            startY = e.touches ? e.touches[0].clientY : e.clientY
            startH = textarea.getBoundingClientRect().height
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
            document.addEventListener('touchmove', onMove, { passive: false })
            document.addEventListener('touchend', onUp)
            e.preventDefault()
        }
        handle.addEventListener('mousedown', onDown)
        handle.addEventListener('touchstart', onDown, { passive: false })
    }

    // 发送按钮补 Twikoo 同款「Ctrl + ↵」提示
    const dressSendHint = (editor) => {
        const send = editor.querySelector('.atk-send-btn')
        if (!send || send.querySelector('.atk-heo-send-shortcut')) return
        const tip = document.createElement('span')
        tip.className = 'atk-heo-send-shortcut'
        tip.innerHTML = 'Ctrl&nbsp;<span class="atk-heo-send-enter" aria-hidden="true">↵</span>'
        send.appendChild(tip)
    }

    // 对标 Twikoo：表情 / 图片收成正文框左下角白色胶囊图标，不再用底部文字按钮
    const dressToolbar = (editor) => {
        const wrap = editor.querySelector(':scope > .atk-textarea-wrap')
        const plugWrap = editor.querySelector('.atk-plug-btn-wrap')
        if (!wrap || !plugWrap) return

        dressResizeHandle(editor)

        let pill = wrap.querySelector(':scope > .atk-heo-toolbar-pill')
        if (!pill) {
            pill = document.createElement('div')
            pill.className = 'atk-heo-toolbar-pill'
            wrap.appendChild(pill)
        }

        const keep = []
        plugWrap.querySelectorAll('.atk-plug-btn').forEach((btn) => {
            const label = ((btn.querySelector('[aria-label]') || btn).getAttribute('aria-label') || btn.textContent || '').trim()
            const isEmoji = /表情|emoji|emoticon/i.test(label)
            const isUpload = /上传|图片|image|upload/i.test(label)
            if (isEmoji || isUpload) {
                btn.classList.add('atk-heo-tool-icon')
                if (isEmoji) btn.classList.add('atk-heo-tool-emoji')
                if (isUpload) btn.classList.add('atk-heo-tool-upload')
                pill.appendChild(btn)
                keep.push(btn)
            } else {
                // 预览 / Markdown 等文字插件：Heo 风格输入框里不展示
                btn.classList.add('atk-heo-tool-hidden')
            }
        })

        if (keep.length) {
            editor.classList.add('atk-heo-has-toolbar')
            // 插件都搬走后，收起底部左侧空槽（只留「正在回复」等状态）
            const left = editor.querySelector('.atk-bottom-left')
            if (left) {
                const hasState = !!left.querySelector('.atk-state-btn')
                const hasLeftover = !!plugWrap.querySelector('.atk-plug-btn:not(.atk-heo-tool-hidden)')
                left.classList.toggle('atk-heo-bottom-empty', !hasState && !hasLeftover)
            }
        }
    }

    // 把 Artalk 排序下拉挪到标题行右侧，并保持常显（对标 Twikoo 底栏）
    const dressListHeader = () => {
        const header = document.querySelector('.artalk > .atk-list > .atk-list-header')
        if (!header) return
        const countWrap = header.querySelector('.atk-comment-count')
        const dropdown = countWrap && countWrap.querySelector('.atk-dropdown')
        if (dropdown && dropdown.parentElement === countWrap) {
            header.appendChild(dropdown)
            dropdown.classList.add('atk-heo-sort-pills')
        }
        // Artalk 点开/收起会改 display，强制保持胶囊可见
        if (dropdown) {
            dropdown.style.display = 'inline-flex'
            dropdown.style.visibility = 'visible'
            dropdown.style.opacity = '1'
            dropdown.style.pointerEvents = 'auto'
        }
        const arrow = countWrap && countWrap.querySelector('.atk-arrow-down-icon')
        if (arrow) arrow.style.display = 'none'
    }

    const enhanceEditors = () => {
        editors().forEach((editor) => {
            ensureHeoChrome(editor)
            dressToolbar(editor)
            dressSendHint(editor)
        })
        dressListHeader()
        const user = haloUser()
        if (user && user.loggedIn) applyMode('halo')
        else applyMode(getMode())
    }

    const initArtalk = () => {
        window.artalkItem = Artalk.init(Object.assign({
            el: '#artalk-wrap',
            server: GLOBAL_CONFIG.source.artalk.artalkUrl,
            site: GLOBAL_CONFIG.source.artalk.siteName,
            pageKey: location.pathname.replace(/\/page\/\d$/, ''),
            darkMode: false,
            countEl: '#ArtalkCount',
            emoticons: ARTALK_LOCAL_EMOTICONS,
            noComment: '还没有评论哦，快来抢首评',
            placeholder: '说点什么...'
        }, null))

        enhanceEditors()
        window.artalkItem.on('list-loaded', () => setTimeout(enhanceEditors, 0))
        window.artalkItem.on('editor-submit', () => setTimeout(enhanceEditors, 0))
        window.artalkItem.on('editor-close', () => setTimeout(enhanceEditors, 0))
        window.artalkItem.on('editor-open', () => setTimeout(enhanceEditors, 0))

        function versionOld(ctx) {
            ctx.getCommentList().forEach(comment => {
                const $content = comment.getRender().$content
                btf.loadLightbox($content.querySelectorAll('img:not([atk-emoticon])'))
            })
        }

        function version_2_7_3_WithUpper(ctx) {
            ctx.get('list').getCommentNodes().forEach(comment => {
                const $content = comment.getRender().$content
                btf.loadLightbox($content.querySelectorAll('img:not([atk-emoticon])'))
            })
        }

        window.artalkItem.on('list-loaded', () => {
            if (GLOBAL_CONFIG.lightbox === 'null') return
            const ctx = window.artalkItem.ctx
            if (ctx.getCommentList != undefined) versionOld(ctx)
            else version_2_7_3_WithUpper(ctx)
        })
    }

    const loadArtalk = async () => {
        if (typeof window.artalkItem === 'object') initArtalk()
        else {
            await getCSS(GLOBAL_CONFIG.source.artalk.css)
            await getCSS(GLOBAL_CONFIG.source.artalk.skin)
            await getScript(GLOBAL_CONFIG.source.artalk.js)
            initArtalk()
        }
    }

    if ('Artalk' === 'Artalk' || !GLOBAL_CONFIG.source.comments.lazyload) {
        if (GLOBAL_CONFIG.source.comments.lazyload) btf.loadComment(document.getElementById('artalk-wrap'), loadArtalk)
        else loadArtalk()
    } else {
        window.loadOtherComment = loadArtalk
    }
})()
