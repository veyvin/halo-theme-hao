// 不依赖外链的表情。key 是面板上的名字，val 是插入评论的字符。
const ARTALK_LOCAL_EMOTICONS = [
    {
        name: '表情',
        type: 'emoji',
        items: ['😀','😁','😂','🤣','😊','😍','😘','😜','🤔','😎','😭','😡','👍','👎','👏','🙏','🎉','🔥','❤️','✨','🌟','💡','✅','❌'].map(function (ch) {
            return { key: ch, val: ch }
        })
    },
    {
        name: '颜文字',
        type: 'emoji',
        items: [
            ['开心', '(＾▽＾)'],
            ['笑哭', '(≧▽≦)'],
            ['无语', '(￣▽￣)"'],
            ['害羞', '(/ω＼)'],
            ['惊讶', '(°o°)'],
            ['生气', '(╯°□°）╯'],
            ['哭', '(T_T)'],
            ['赞', '(b￣▽￣)d']
        ].map(function (pair) {
            return { key: pair[0], val: pair[1] }
        })
    }
]

// Twikoo 的昵称/邮箱/网址是「加粗标签 + 输入框」合成一粒胶囊。
// Artalk 原生只有 placeholder，这里把三个 input 包进同一结构。输入节点本身不换，提交逻辑不受影响。
function dressArtalkMeta() {
    const fields = [
        ['atk-name', '昵称'],
        ['atk-email', '邮箱'],
        ['atk-link', '网址']
    ]
    document.querySelectorAll('.artalk .atk-main-editor > .atk-header').forEach(function (header) {
        fields.forEach(function (field) {
            const input = header.querySelector(':scope > input.' + field[0])
            if (!input) return
            const wrap = document.createElement('label')
            wrap.className = 'atk-meta-field'
            const label = document.createElement('span')
            label.className = 'atk-meta-label'
            label.textContent = field[1]
            // 有了标签就清掉 placeholder，避免「昵称 / 昵称」叠字
            input.removeAttribute('placeholder')
            header.insertBefore(wrap, input)
            wrap.append(label, input)
        })
    })
}

(() => {
    if (!document.getElementById('post-comment')) return
    const initArtalk = () => {

        window.artalkItem = Artalk.init(Object.assign({
            el: '#artalk-wrap',
            server: GLOBAL_CONFIG.source.artalk.artalkUrl,
            site: GLOBAL_CONFIG.source.artalk.siteName,
            pageKey: location.pathname.replace(/\/page\/\d$/, ""),
            // 暗色交给 zhheo/artalk-heo.css：所有 --at-color-* 都映射到 heo token，
            // 随 [data-theme] 自动切换，因此不启用 Artalk 自带的 atk-dark-mode
            //（一旦启用，其 .atk-dark-mode 变量会盖掉皮肤映射）。
            darkMode: false,
            countEl: '#ArtalkCount',
            // 后端默认表情包在 cdn.jsdelivr.net。国内和部分内网会 Failed to fetch，
            // Artalk 会把这条错误铺在评论区上。本地字符表情不发网络请求。
            // preferRemoteConf 默认 false，这里会盖过服务端下发的表情 URL。
            emoticons: ARTALK_LOCAL_EMOTICONS,
            noComment: '还没有评论，来坐下聊聊'
        }, null))

        dressArtalkMeta()
        // 回复态会把编辑器挪进评论；PJAX / 列表刷新后也可能重建 header
        window.artalkItem.on('list-loaded', dressArtalkMeta)
        window.artalkItem.on('editor-submit', () => setTimeout(dressArtalkMeta, 0))
        window.artalkItem.on('editor-close', () => setTimeout(dressArtalkMeta, 0))

        function versionOld(ctx){
            // 旧版本兼容性补丁
            ctx.getCommentList().forEach(comment => {
                const $content = comment.getRender().$content
                btf.loadLightbox($content.querySelectorAll('img:not([atk-emoticon])'))
            })
        }

        function version_2_7_3_WithUpper(ctx){
            // 2.7.3 版本及以后版本支持
            ctx.get('list').getCommentNodes().forEach(comment => {
                const $content = comment.getRender().$content
                btf.loadLightbox($content.querySelectorAll('img:not([atk-emoticon])'))
            })
        }

        function versionCheck(ctx){
            if (ctx.getCommentList != undefined) {
                // Artalk 版本小于 2.7.3
                versionOld(ctx)
            } else {
                version_2_7_3_WithUpper(ctx)
            }
        }

        window.artalkItem.on('list-loaded', () => {
            if (GLOBAL_CONFIG.lightbox === 'null') return
            versionCheck(window.artalkItem.ctx)
        })
    }

    const loadArtalk = async () => {
        if (typeof window.artalkItem === 'object') initArtalk()
        else {
            await getCSS(GLOBAL_CONFIG.source.artalk.css)
            // 皮肤必须晚于 Artalk.css：两者选择器权重相同，靠加载顺序决胜
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