(() => {
    const cfg = () => (window.GLOBAL_CONFIG && GLOBAL_CONFIG.source && GLOBAL_CONFIG.source.twikoo) || {}

    const isReady = () => {
        const c = cfg()
        return !!(c.twikooUrl && c.adminPassword)
    }

    const call = (event, payload) => new Promise((resolve, reject) => {
        const c = cfg()
        const xhr = new XMLHttpRequest()
        xhr.open('POST', c.twikooUrl)
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.timeout = 30000
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return
            if (xhr.status === 0) return reject(new Error('评论服务器无法连接'))
            let res = null
            try { res = JSON.parse(xhr.responseText) } catch (e) {}
            if (!res) return reject(new Error('评论服务器无响应'))
            if (res.code === 0) resolve(res)
            else reject(new Error(res.message || ('错误码 ' + res.code)))
        }
        try {
            xhr.send(JSON.stringify(Object.assign({ event, envId: c.twikooUrl }, payload)))
        } catch (e) {
            reject(e)
        }
    })

    const state = { page: 1, per: 30, type: '', keyword: '', curUrl: location.pathname, only: '' }
    const $ = (sel) => document.querySelector(sel)
    const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel))

    const notify = (text) => {
        if (typeof btf !== 'undefined' && btf.snackbarShow) btf.snackbarShow(text)
        else window.alert(text)
    }

    const fmtTime = (ts) => {
        if (!ts) return ''
        const d = new Date(Number(ts))
        const p = (n) => String(n).padStart(2, '0')
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
            + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    }

    const stripHtml = (html) => {
        const el = document.createElement('div')
        el.innerHTML = html || ''
        return (el.textContent || '').replace(/\s+/g, ' ').trim()
    }

    const setStatus = (text, isError) => {
        const el = $('#twka-status')
        if (!el) return
        el.textContent = text
        el.classList.toggle('is-error', !!isError)
    }

    const buildPayload = () => {
        const body = { accessToken: cfg().adminPassword, per: state.per, page: state.page }
        if (state.type) body.type = state.type
        if (state.keyword) body.keyword = state.keyword
        return body
    }

    const renderRow = (c, checkbox) => {
        const tr = document.createElement('tr')
        if (c.isSpam) tr.classList.add('is-spam')

        const tdSel = document.createElement('td')
        const box = document.createElement('input')
        box.type = 'checkbox'
        box.value = c._id
        box.className = 'twka-check'
        tdSel.appendChild(box)

        const tdUser = document.createElement('td')
        const nick = document.createElement('div')
        nick.className = 'twka-nick'
        nick.textContent = c.nick || '(匿名)'
        const meta = document.createElement('div')
        meta.className = 'twka-meta'
        meta.textContent = [c.mail, c.ip, c.ua].filter(Boolean).join(' · ')
        tdUser.appendChild(nick)
        tdUser.appendChild(meta)

        const tdBody = document.createElement('td')
        const content = document.createElement('div')
        content.className = 'twka-content'
        content.textContent = stripHtml(c.comment)
        const url = document.createElement('a')
        url.className = 'twka-url'
        url.href = c.href || c.url || '#'
        url.target = '_blank'
        url.rel = 'noopener noreferrer'
        url.textContent = c.url || ''
        tdBody.appendChild(content)
        tdBody.appendChild(url)

        const tdTime = document.createElement('td')
        tdTime.className = 'twka-time'
        tdTime.textContent = fmtTime(c.created)

        const tdAct = document.createElement('td')
        tdAct.className = 'twka-actions'
        const bSpam = document.createElement('button')
        bSpam.type = 'button'
        bSpam.textContent = c.isSpam ? '取消垃圾' : '标记垃圾'
        bSpam.dataset.act = 'spam'
        bSpam.dataset.id = c._id
        bSpam.dataset.val = c.isSpam ? '0' : '1'
        const bDel = document.createElement('button')
        bDel.type = 'button'
        bDel.className = 'is-danger'
        bDel.textContent = '删除'
        bDel.dataset.act = 'del'
        bDel.dataset.id = c._id
        tdAct.appendChild(bSpam)
        tdAct.appendChild(bDel)

        tr.appendChild(tdSel)
        tr.appendChild(tdUser)
        tr.appendChild(tdBody)
        tr.appendChild(tdTime)
        tr.appendChild(tdAct)
        if (checkbox) checkbox.checked = false
        return tr
    }

    const render = (res) => {
        const tbody = $('#twka-body')
        tbody.innerHTML = ''
        let list = res.data || []
        if (state.only === 'cur') list = list.filter(c => c.url === state.curUrl)
        if (!list.length) {
            const tr = document.createElement('tr')
            const td = document.createElement('td')
            td.colSpan = 5
            td.className = 'twka-empty'
            td.textContent = '没有评论'
            tr.appendChild(td)
            tbody.appendChild(tr)
        } else {
            list.forEach(c => tbody.appendChild(renderRow(c)))
        }
        const total = res.count || 0
        const pages = Math.max(1, Math.ceil(total / state.per))
        $('#twka-total').textContent = String(total)
        $('#twka-page').textContent = state.page + ' / ' + pages
        $('#twka-prev').disabled = state.page <= 1
        $('#twka-next').disabled = state.page >= pages
    }

    const load = () => {
        setStatus('加载中…')
        call('COMMENT_GET_FOR_ADMIN', buildPayload())
            .then(render)
            .then(() => setStatus(''))
            .catch(err => {
                setStatus('加载失败：' + err.message, true)
                $('#twka-body').innerHTML = ''
            })
    }

    const setSpam = (id, isSpam) => call('COMMENT_SET_FOR_ADMIN', { accessToken: cfg().adminPassword, id, set: { isSpam: !!isSpam } })
    const remove = (id) => call('COMMENT_DELETE_FOR_ADMIN', { accessToken: cfg().adminPassword, id })

    const onBodyClick = (e) => {
        const btn = e.target.closest('[data-act]')
        if (!btn) return
        const id = btn.dataset.id
        if (btn.dataset.act === 'spam') {
            btn.disabled = true
            setSpam(id, btn.dataset.val === '1')
                .then(() => { notify('已更新'); load() })
                .catch(err => { btn.disabled = false; notify('操作失败：' + err.message) })
            return
        }
        if (!window.confirm('确认删除这条评论？删除后无法恢复。')) return
        btn.disabled = true
        remove(id)
            .then(() => { notify('评论已删除'); load() })
            .catch(err => { btn.disabled = false; notify('删除失败：' + err.message) })
    }

    const selectedIds = () => $$('#twka-body .twka-check:checked').map(el => el.value)

    const onBatchDelete = () => {
        const ids = selectedIds()
        if (!ids.length) { notify('请先勾选要删除的评论'); return }
        if (!window.confirm('确认删除选中的 ' + ids.length + ' 条评论？删除后无法恢复。')) return
        setStatus('批量删除中…')
        Promise.all(ids.map(remove))
            .then(() => { notify('已删除 ' + ids.length + ' 条'); load() })
            .catch(err => setStatus('批量删除失败：' + err.message, true))
    }

    let bound = false

    const bind = () => {
        if (bound) return
        bound = true
        $('#twka-close').addEventListener('click', close)
        $('#twka-mask').addEventListener('click', close)
        $('#hao-twikoo-admin .twka-search').addEventListener('click', () => {
            state.keyword = $('#twka-keyword').value.trim()
            state.page = 1
            load()
        })
        $('#twka-keyword').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') $('#hao-twikoo-admin .twka-search').click()
        })
        $$('#hao-twikoo-admin .twka-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                $$('#hao-twikoo-admin .twka-tab').forEach(t => t.classList.remove('active'))
                tab.classList.add('active')
                state.type = tab.dataset.type || ''
                state.only = ''
                state.page = 1
                load()
            })
        })
        $('#twka-only-cur').addEventListener('click', () => {
            state.only = state.only === 'cur' ? '' : 'cur'
            $('#twka-only-cur').classList.toggle('active', state.only === 'cur')
            state.page = 1
            load()
        })
        $('#twka-prev').addEventListener('click', () => { if (state.page > 1) { state.page--; load() } })
        $('#twka-next').addEventListener('click', () => { state.page++; load() })
        $('#twka-batch-del').addEventListener('click', onBatchDelete)
        $('#twka-check-all').addEventListener('change', (e) => {
            $$('#twka-body .twka-check').forEach(el => { el.checked = e.target.checked })
        })
        $('#twka-body').addEventListener('click', onBodyClick)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen()) close()
        })
    }

    const isOpen = () => {
        const el = $('#hao-twikoo-admin')
        return !!el && el.style.display === 'flex'
    }

    function open() {
        const el = $('#hao-twikoo-admin')
        if (!el) return
        if (!isReady()) { notify('请先在主题设置里填写 Twikoo 管理密码'); return }
        el.style.display = 'flex'
        bind()
        state.curUrl = location.pathname
        load()
    }

    function close() {
        const el = $('#hao-twikoo-admin')
        if (el) el.style.display = 'none'
    }

    window.haoTwikooAdmin = { open, close, load, isReady }
})()
