if (typeof window.FriendMomentsApp === 'undefined') {
    class FriendMomentsApp {
        constructor() {

            if (window._friendMomentsInstance) {
                // console.log('FriendMomentsApp instance already exists, destroying old one');
                window._friendMomentsInstance.destroy();
                // 等待销毁完成
                if (window._friendMomentsInstance) {
                    return window._friendMomentsInstance;
                }
            }

            window._friendMomentsInstance = this;

            this.articles = [];
            this.filteredArticles = [];
            this.displayedArticles = [];
            this.currentPage = 1;
            this.pageSize = window.fmomentsConfig?.pageSize || 12;
            this.sortField = 'pubDate';
            this.sortOrder = 'desc';
            this.authorFilter = '';
            this.searchKeyword = '';
            this.loading = false;
            this.errorCount = 0;
            this.maxRetries = 3;

            // 新增分页相关属性
            this.totalPages = 0;
            this.totalCount = 0;
            this.hasNext = false;
            this.hasPrevious = false;
            this.isFirst = true;
            this.isLast = false;

            // 存储事件监听器引用，用于清理
            this.eventListeners = [];
            this.initialized = false;
            this.destroyed = false; // 新增：标记是否已销毁
            this.initPromise = null; // 新增：防止重复初始化

            // 生成唯一实例ID
            this.instanceId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            // console.log(`Creating FriendMomentsApp instance: ${this.instanceId}`);

            // 不在构造函数中调用init，改为外部调用
        }

        async init() {
            // 防止重复初始化
            if (this.initPromise) {
                // console.log('Init already in progress, waiting...');
                return this.initPromise;
            }

            if (this.initialized) {
                // console.log('Already initialized');
                return;
            }

            if (this.destroyed) {
                // console.log('Instance has been destroyed, cannot initialize');
                return;
            }

            // console.log(`Initializing FriendMomentsApp instance: ${this.instanceId}`);

            this.initPromise = this._doInit();
            return this.initPromise;
        }

        async _doInit() {
            try {
                this.cleanup(); // 清理之前的状态
                this.showLoading();

                // 检查是否在初始化过程中被销毁
                if (this.destroyed) {
                    // console.log('Instance destroyed during initialization');
                    return;
                }

                // 重置分页状态
                this.currentPage = 1;
                this.articles = [];

                await this.loadArticles();

                // 再次检查是否被销毁
                if (this.destroyed) {
                    // console.log('Instance destroyed after loading articles');
                    return;
                }

                this.setupEventListeners();
                this.setupAuthorFilter();
                this.calculateStats();
                this.displayArticles(true);
                this.updateDisplayStatus();
                this.hideLoading();
                this.initialized = true;

                // console.log(`FriendMomentsApp instance ${this.instanceId} initialized successfully`);
            } catch (error) {
                if (!this.destroyed) {
                    this.handleError(error);
                }
            } finally {
                this.initPromise = null;
            }
        }

        // 清理方法
        cleanup() {
            if (this.destroyed) return;

            // console.log(`Cleaning up FriendMomentsApp instance: ${this.instanceId}`);

            // 清理事件监听器
            this.removeEventListeners();

            // 清理DOM内容
            const container = document.getElementById('fmomentsContainer');
            if (container) {
                container.innerHTML = '';
            }

            // 清理作者筛选选项
            const authorFilter = document.getElementById('authorFilter');
            if (authorFilter) {
                const defaultOption = authorFilter.querySelector('option[value=""]');
                authorFilter.innerHTML = '';
                if (defaultOption) {
                    authorFilter.appendChild(defaultOption);
                } else {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = (window.fmI18n && window.fmI18n.allAuthors) || 'All authors';
                    authorFilter.appendChild(option);
                }
            }

            // 重置搜索框
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
            }

            // 重置状态
            this.articles = [];
            this.filteredArticles = [];
            this.displayedArticles = [];
            this.currentPage = 1;
            this.authorFilter = '';
            this.searchKeyword = '';
            this.loading = false;
            this.errorCount = 0;

            // 重置分页状态
            this.totalPages = 0;
            this.totalCount = 0;
            this.hasNext = false;
            this.hasPrevious = false;
            this.isFirst = true;
            this.isLast = false;
        }

        // 销毁实例
        destroy() {
            if (this.destroyed) {
                // console.log(`Instance ${this.instanceId} already destroyed`);
                return;
            }

            // console.log(`Destroying FriendMomentsApp instance: ${this.instanceId}`);

            this.destroyed = true;
            this.initialized = false;

            // 取消进行中的初始化
            if (this.initPromise) {
                this.initPromise = null;
            }

            this.cleanup();

            // 清理全局引用
            if (window._friendMomentsInstance === this) {
                window._friendMomentsInstance = null;
            }

            // console.log(`FriendMomentsApp instance ${this.instanceId} destroyed`);
        }

        // 移除事件监听器
        removeEventListeners() {
            if (this.eventListeners.length > 0) {
                // console.log(`Removing ${this.eventListeners.length} event listeners for instance ${this.instanceId}`);
                this.eventListeners.forEach(({element, event, handler}) => {
                    if (element && element.removeEventListener) {
                        element.removeEventListener(event, handler);
                    }
                });
                this.eventListeners = [];
            }
        }

        // 添加事件监听器的辅助方法
        addEventListener(element, event, handler) {
            if (this.destroyed) return;

            if (element) {
                element.addEventListener(event, handler);
                this.eventListeners.push({element, event, handler});
                // console.log(`Added ${event} listener for instance ${this.instanceId}`);
            }
        }

        showLoading() {
            if (this.destroyed) return;

            const loading = document.getElementById('loadingIndicator');
            const container = document.getElementById('fmomentsContainer');
            const errorState = document.getElementById('errorState');

            if (loading) loading.style.display = 'block';
            if (container) container.style.display = 'none';
            if (errorState) errorState.style.display = 'none';
        }

        hideLoading() {
            if (this.destroyed) return;

            const loading = document.getElementById('loadingIndicator');
            const container = document.getElementById('fmomentsContainer');

            if (loading) loading.style.display = 'none';
            if (container) container.style.display = 'grid';
        }

        async loadArticles(page = 1) {
            if (this.destroyed) {
                // console.log('Instance destroyed, skipping loadArticles');
                return;
            }

            // console.log(`Loading articles for instance ${this.instanceId}, page: ${page}`);

            try {
                const baseUrl = window.fmomentsConfig?.apiUrl || '/apis/api.friend.moony.la/v1alpha1/friendposts';
                const url = new URL(baseUrl, window.location.origin);
                url.searchParams.set('page', page.toString());
                url.searchParams.set('size', this.pageSize.toString());

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                // 检查请求完成后实例是否还有效
                if (this.destroyed) {
                    // console.log('Instance destroyed after fetch, ignoring response');
                    return;
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                // 再次检查实例是否还有效
                if (this.destroyed) {
                    // console.log('Instance destroyed after parsing response, ignoring data');
                    return;
                }

                if (data.items && Array.isArray(data.items)) {
                    const newArticles = data.items.map(item => ({
                        id: item.metadata.name,
                        author: item.spec.author,
                        authorUrl: item.spec.authorUrl,
                        title: item.spec.title,
                        description: item.spec.description,
                        postLink: item.spec.postLink,
                        logo: item.spec.logo,
                        pubDate: new Date(item.spec.pubDate),
                        creationTime: new Date(item.metadata.creationTimestamp),
                        content: `${item.spec.title} ${item.spec.author} ${item.spec.description}`.toLowerCase()
                    }));

                    // 更新分页信息
                    this.totalPages = data.totalPages || 0;
                    this.totalCount = data.total || 0;
                    this.hasNext = data.hasNext || false;
                    this.hasPrevious = data.hasPrevious || false;
                    this.isFirst = data.first || false;
                    this.isLast = data.last || false;

                    // 如果是第一页，重置文章数组；否则追加
                    if (page === 1) {
                        this.articles = newArticles;
                    } else {
                        this.articles = this.articles.concat(newArticles);
                    }

                    // console.log(`Successfully loaded ${newArticles.length} articles for page ${page}, total articles: ${this.articles.length} for instance ${this.instanceId}`);
                    this.errorCount = 0;
                } else {
                    throw new Error('API 返回数据格式错误');
                }

            } catch (error) {
                if (this.destroyed) {
                    // console.log('Instance destroyed, ignoring loadArticles error');
                    return;
                }

                // console.error(`Loading articles failed for instance ${this.instanceId}:`, error);
                this.errorCount++;

                if (this.errorCount < this.maxRetries && !this.destroyed) {
                    // console.log(`Retry ${this.errorCount} for instance ${this.instanceId}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * this.errorCount));
                    return this.loadArticles(page);
                }

                throw error;
            }
        }

        calculateStats() {
            if (this.destroyed) return;

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

            const totalArticles = this.totalCount || this.articles.length; // 优先使用API返回的总数
            const totalAuthors = new Set(this.articles.map(a => a.author)).size;
            const todayCount = this.articles.filter(a => a.pubDate >= today).length;
            const weekCount = this.articles.filter(a => a.pubDate >= weekAgo).length;

            this.updateStatNumber('totalArticles', totalArticles);
            this.updateStatNumber('totalAuthors', totalAuthors);
            this.updateStatNumber('todayCount', todayCount);
            this.updateStatNumber('weekCount', weekCount);

            const lastUpdateTime = document.getElementById('lastUpdateTime');
            if (lastUpdateTime) {
                lastUpdateTime.textContent = new Date().toLocaleString('zh-CN');
            }
        }

        updateStatNumber(elementId, value) {
            if (this.destroyed) return;

            const element = document.getElementById(elementId);
            if (element) {
                const startValue = 0;
                const duration = 1000;
                const startTime = performance.now();

                const animate = (currentTime) => {
                    if (this.destroyed) return; // 动画过程中检查实例状态

                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const currentValue = Math.floor(startValue + (value - startValue) * progress);
                    element.textContent = currentValue;

                    if (progress < 1 && !this.destroyed) {
                        requestAnimationFrame(animate);
                    }
                };

                requestAnimationFrame(animate);
            }
        }

        setupEventListeners() {
            if (this.destroyed) return;

            // console.log(`Setting up event listeners for instance ${this.instanceId}`);

            // 搜索功能
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                let searchTimeout;
                const searchHandler = (e) => {
                    if (this.destroyed) return;
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        if (this.destroyed) return;
                        this.searchKeyword = e.target.value.toLowerCase();
                        this.resetAndDisplay();
                    }, 300);
                };
                this.addEventListener(searchInput, 'input', searchHandler);
            }

            // 作者筛选
            const authorFilter = document.getElementById('authorFilter');
            if (authorFilter) {
                const authorHandler = (e) => {
                    if (this.destroyed) return;
                    this.authorFilter = e.target.value;
                    this.resetAndDisplay();
                };
                this.addEventListener(authorFilter, 'change', authorHandler);
            }

            // 排序方式
            const sortSelect = document.getElementById('sortSelect');
            if (sortSelect) {
                const sortHandler = (e) => {
                    if (this.destroyed) return;
                    this.sortField = e.target.value;
                    this.resetAndDisplay();
                };
                this.addEventListener(sortSelect, 'change', sortHandler);
            }

            // 排序顺序
            const sortOrderSwitch = document.getElementById('sortOrderSwitch');
            if (sortOrderSwitch) {
                const sortOrderHandler = () => {
                    if (this.destroyed) return;
                    sortOrderSwitch.classList.toggle('active');
                    this.sortOrder = sortOrderSwitch.classList.contains('active') ? 'desc' : 'asc';
                    this.resetAndDisplay();
                };
                this.addEventListener(sortOrderSwitch, 'click', sortOrderHandler);
            }

            // 加载更多
            const moreBtn = document.getElementById('fmomentsMoreBtn');
            if (moreBtn) {
                const moreBtnHandler = () => {
                    if (this.destroyed) return;
                    this.loadMore();
                };
                this.addEventListener(moreBtn, 'click', moreBtnHandler);
            }

            // 重试按钮
            const retryBtn = document.getElementById('retryBtn');
            if (retryBtn) {
                const retryHandler = () => {
                    if (this.destroyed) return;
                    this.init();
                };
                this.addEventListener(retryBtn, 'click', retryHandler);
            }

            // 滚动加载
            const scrollHandler = this.throttle(() => {
                if (this.destroyed) return;
                if (this.isNearBottom() && !this.loading && this.hasMoreContent()) {
                    this.loadMore();
                }
            }, 200);
            this.addEventListener(window, 'scroll', scrollHandler);
        }

        setupAuthorFilter() {
            if (this.destroyed) return;

            const authorFilter = document.getElementById('authorFilter');
            if (!authorFilter) return;

            const existingOptions = Array.from(authorFilter.options).map(option => option.value);

            const authors = [...new Set(this.articles.map(article => article.author))].sort();
            authors.forEach(author => {
                if (this.destroyed) return;
                if (author && !existingOptions.includes(author)) {
                    const option = document.createElement('option');
                    option.value = author;
                    option.textContent = author;
                    authorFilter.appendChild(option);
                }
            });
        }

        filterAndSortArticles() {
            if (this.destroyed) return [];

            let filtered = this.articles.filter(article => {
                if (this.authorFilter && article.author !== this.authorFilter) {
                    return false;
                }

                if (this.searchKeyword && !article.content.includes(this.searchKeyword)) {
                    return false;
                }

                return true;
            });

            filtered.sort((a, b) => {
                let valueA, valueB;

                switch (this.sortField) {
                    case 'pubDate':
                        valueA = a.pubDate;
                        valueB = b.pubDate;
                        break;
                    case 'creationTime':
                        valueA = a.creationTime;
                        valueB = b.creationTime;
                        break;
                    case 'author':
                        valueA = a.author.toLowerCase();
                        valueB = b.author.toLowerCase();
                        break;
                    case 'title':
                        valueA = a.title.toLowerCase();
                        valueB = b.title.toLowerCase();
                        break;
                    default:
                        return 0;
                }

                if (valueA < valueB) {
                    return this.sortOrder === 'asc' ? -1 : 1;
                }
                if (valueA > valueB) {
                    return this.sortOrder === 'asc' ? 1 : -1;
                }
                return 0;
            });

            this.filteredArticles = filtered;
            return filtered;
        }

        displayArticles(isInitial = false) {
            if (this.destroyed) return;

            const container = document.getElementById('fmomentsContainer');
            if (!container) return;

            const filtered = this.filterAndSortArticles();

            if (filtered.length === 0) {
                this.showEmptyState();
                return;
            } else {
                this.hideEmptyState();
            }

            if (isInitial) {
                container.innerHTML = '';
                this.displayedArticles = [];
            }

            // 显示所有已筛选的文章
            const articlesToShow = filtered.slice(this.displayedArticles.length);

            articlesToShow.forEach((article, index) => {
                if (this.destroyed) return;
                const articleEl = this.createArticleElement(article);
                articleEl.style.animationDelay = `${index * 0.1}s`;
                container.appendChild(articleEl);
            });

            this.displayedArticles = filtered;
            this.updateDisplayStatus();
            this.updateLoadingStatus();
        }

        createArticleElement(article) {
            const articleEl = document.createElement('article');
            articleEl.className = 'fMomentsArticleItem';

            const safeLogoUrl = article.logo || window.fmomentsConfig?.errorImg || '/default-avatar.png';
            const safeAuthorUrl = article.authorUrl || '#';
            const safePostLink = article.postLink || '#';

            const pubDateStr = article.pubDate.toLocaleDateString('zh-CN');
            const pubTimeStr = article.pubDate.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            articleEl.innerHTML = `
        <div class="fMomentsArticleHeader">
            <img class="fMomentsAvatar" src="${safeLogoUrl}" alt="${article.author}" 
                 onerror="this.src='${window.fmomentsConfig?.errorImg || '/default-avatar.png'}'">
            <a href="${safeAuthorUrl}" target="_blank" rel="noopener nofollow" 
                   style="color: var(--heo-main); text-decoration: none;"><div class="fMomentsAuthorInfo">
                <div class="fMomentsAuthorName">${article.author}</div>
                <div class="fMomentsPublishTime">${pubTimeStr}</div>
            </div></a>
            
        </div>
        
        <div class="fMomentsArticleContent">
            <a class="fMomentsArticleTitle" href="${safePostLink}" target="_blank" rel="noopener nofollow" 
               title="${article.title}">${article.title}</a>
            <a class="fMomentsArticleTitle" href="${safePostLink}" target="_blank" rel="noopener nofollow" 
               title="${article.title}"><div class="fMomentsArticleDescription">${article.description}</div></a>
        </div>
        
        <div class="fMomentsArticleFooter">
            <span>📅 ${pubDateStr}</span>
            <span>🌐 <a href="${safeAuthorUrl}" target="_blank" rel="noopener nofollow">${article.author}</a></span>
        </div>
    `;

            return articleEl;
        }

        updateDisplayStatus() {
            if (this.destroyed) return;

            const displayedCount = document.getElementById('displayedCount');
            const totalCount = document.getElementById('totalCount');
            const filterStatus = document.getElementById('filterStatus');
            const filterText = document.getElementById('filterText');

            if (displayedCount) displayedCount.textContent = this.displayedArticles.length;
            if (totalCount) totalCount.textContent = this.totalCount || this.articles.length;

            const hasFilter = this.authorFilter || this.searchKeyword;
            if (filterStatus) {
                filterStatus.style.display = hasFilter ? 'flex' : 'none';
            }

            if (filterText && hasFilter) {
                let filterParts = [];
                if (this.authorFilter) filterParts.push(`作者: ${this.authorFilter}`);
                if (this.searchKeyword) filterParts.push(`搜索: ${this.searchKeyword}`);
                filterText.textContent = filterParts.join(' | ');
            }
        }

        resetAndDisplay() {
            if (this.destroyed) return;

            const container = document.getElementById('fmomentsContainer');
            if (container) {
                container.innerHTML = '';
            }
            this.displayedArticles = [];
            this.displayArticles(true);
        }

        hasMoreContent() {
            if (this.destroyed) return false;

            // 基于API返回的分页信息判断是否还有更多内容
            return this.hasNext && !this.isLast;
        }

        async loadMore() {
            if (this.destroyed || this.loading || !this.hasMoreContent()) {
                return;
            }

            this.loading = true;

            try {
                // 加载下一页
                const nextPage = Math.floor(this.articles.length / this.pageSize) + 1;
                await this.loadArticles(nextPage);

                // 重新设置作者筛选选项（可能有新作者）
                this.setupAuthorFilter();

                // 重新计算统计信息
                this.calculateStats();

                // 显示新加载的文章
                this.displayArticles();

            } catch (error) {
                if (!this.destroyed) {
                    console.error('Load more failed:', error);
                    // 可以选择显示错误提示，但不影响现有内容
                }
            } finally {
                this.loading = false;
            }
        }

        updateLoadingStatus() {
            if (this.destroyed) return;

            const moreBtn = document.getElementById('fmomentsMoreBtn');
            const noMoreTip = document.getElementById('noMoreTip');
            const loadingStatus = document.getElementById('loadingStatus');
            const finalCount = document.getElementById('finalCount');

            if (!loadingStatus) return;

            if (!this.hasMoreContent()) {
                if (moreBtn) moreBtn.style.display = 'none';
                if (noMoreTip) noMoreTip.style.display = 'block';
                if (finalCount) finalCount.textContent = this.displayedArticles.length;
                loadingStatus.style.display = 'block';
            } else {
                if (moreBtn) moreBtn.style.display = 'flex';
                if (noMoreTip) noMoreTip.style.display = 'none';
                loadingStatus.style.display = 'block';
            }
        }

        showEmptyState() {
            if (this.destroyed) return;

            const emptyState = document.getElementById('emptyState');
            const loadingStatus = document.getElementById('loadingStatus');

            if (emptyState) emptyState.style.display = 'block';
            if (loadingStatus) loadingStatus.style.display = 'none';
        }

        hideEmptyState() {
            if (this.destroyed) return;

            const emptyState = document.getElementById('emptyState');
            if (emptyState) emptyState.style.display = 'none';
        }

        handleError(error) {
            if (this.destroyed) return;

            console.error(`Friend Moments加载失败 for instance ${this.instanceId}:`, error);

            const loading = document.getElementById('loadingIndicator');
            const errorState = document.getElementById('errorState');
            const errorMessage = document.getElementById('errorMessage');
            const container = document.getElementById('fmomentsContainer');

            if (loading) loading.style.display = 'none';
            if (container) container.style.display = 'none';
            if (errorState) errorState.style.display = 'block';

            if (errorMessage) {
                // P2-4：JS 硬编码改为 i18n fallback
                var i18n = window.fmI18n || {};
                let message = (i18n.error || 'Failed to load, please try again later');
                if (error.message.includes('fetch')) {
                    message = (i18n.networkFail || 'Network error, please check your connection');
                } else if (error.message.includes('HTTP')) {
                    message = `${i18n.httpError || 'Server error'}: ${error.message}`;
                }
                errorMessage.textContent = message;
            }
        }

        throttle(func, limit) {
            let inThrottle;
            return function () {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            }
        }

        isNearBottom() {
            return window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000;
        }
    }

// 导出类
    window.FriendMomentsApp = FriendMomentsApp;
}