/**
 * 树知 TreeKnow - Content Script
 * 注入侧边栏到AI对话页面
 */

(function() {
  'use strict';

  // 防止重复注入
  if (window.__TREEKNOW_INJECTED__) {
    DEBUG && console.log('[TreeKnow] 已经注入，跳过');
    return;
  }
  window.__TREEKNOW_INJECTED__ = true;
  const DEBUG = false;

  // 状态管理
  let state = {
    isCollapsed: false,
    captureEnabled: false,
    currentTreeId: null,
    trees: []
  };

  // SVG图标（只保留使用的）
  const icons = {
    clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`
  };

  /**
   * 初始化
   */
  async function init() {
    DEBUG && console.log('%c[TreeKnow] 插件初始化', 'color: green;');

    // 初始化数据库
    await TreeKnowDB.init();

    // 初始化捕获模块
    TreeKnowCapture.init({
      onCapture: (count) => {
        DEBUG && console.log('[TreeKnow] 捕获了', count, '条消息');
        refreshTree();
      }
    });

    // 初始化拖拽模块
    TreeKnowDrag.init({
      onDrop: () => {
        refreshTree();
      }
    });

    // 初始化树渲染模块
    TreeKnowTree.init({
      onNodeClick: async (node) => {
        DEBUG && console.log('[TreeKnow] 点击节点:', node.id, node.title);
        // 点击节点时跳转到对应的问话位置
        if (node.title) {
          const success = await TreeKnowCapture.scrollToMessage(node.title);
          if (success) {
            TreeKnowTree.showToast('已定位到问话', 'success');
          } else {
            TreeKnowTree.showToast('未找到对应消息，可能不在当前页面中', 'warning');
          }
        }
      }
    });

    // 创建侧边栏
    createSidebar();

    // 加载数据
    await loadData();

    DEBUG && console.log('[TreeKnow] 初始化完成');
  }

  // ==================== 页面边距管理 ====================

  /**
   * 更新页面右边距，让侧边栏不遮挡页面内容
   * 通过注入 <style> 标签强制约束页面宽度，兼容 position:fixed 布局
   * @param {number|null} width - 侧边栏宽度(px)，null表示移除边距
   */
  function updatePageMargin(width) {
    let style = document.getElementById('treeknow-page-push');
    if (!style) {
      style = document.createElement('style');
      style.id = 'treeknow-page-push';
      (document.head || document.documentElement).appendChild(style);
    }

    if (width) {
      style.textContent = `
        html {
          overflow-x: hidden !important;
        }
        body {
          margin-right: ${width}px !important;
          overflow-x: hidden !important;
          min-width: 0 !important;
        }
        /* 强制所有 body 直接子元素（除侧边栏外）不超过可用宽度 */
        body > *:not(#treeknow-sidebar):not(script):not(style):not(link):not(noscript) {
          max-width: calc(100vw - ${width}px) !important;
          overflow-x: hidden !important;
        }
      `;
    } else {
      style.textContent = '';
    }
  }

  /**
   * 创建侧边栏
   */
  function createSidebar() {
    // 创建侧边栏容器
    const sidebar = document.createElement('div');
    sidebar.id = 'treeknow-sidebar';
    sidebar.innerHTML = getSidebarHTML();

    document.body.appendChild(sidebar);

    // 推开页面内容
    updatePageMargin(300);

    // 绑定事件
    bindEvents();

    DEBUG && console.log('[TreeKnow] 侧边栏已创建');
  }

  /**
   * 获取侧边栏HTML
   */
  function getSidebarHTML() {
    return `
      <!-- 头部 -->
      <div class="tk-header">
        <div class="tk-header-left">
          <div class="tk-logo">
            <svg viewBox="0 0 128 128">
              <defs>
                <linearGradient id="treeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#059669"/>
                  <stop offset="100%" style="stop-color:#34d399"/>
                </linearGradient>
              </defs>
              <rect width="128" height="128" rx="28" fill="url(#treeGrad)"/>
              <line x1="64" y1="38" x2="30" y2="90" stroke="white" stroke-width="12" stroke-linecap="round"/>
              <line x1="64" y1="38" x2="98" y2="90" stroke="white" stroke-width="12" stroke-linecap="round"/>
              <circle cx="64" cy="30" r="22" fill="white"/>
              <circle cx="26" cy="96" r="18" fill="white"/>
              <circle cx="102" cy="96" r="18" fill="white"/>
            </svg>
          </div>
          <span class="tk-header-title">树知</span>
        </div>
        <div class="tk-header-actions">
          <button class="tk-action-btn" id="tk-clear-btn" data-tooltip="清空">
            ${icons.clear}
          </button>
          <button class="tk-action-btn" id="tk-refresh-btn" data-tooltip="刷新">
            ${icons.refresh}
          </button>
          <button class="tk-action-btn" id="tk-close-btn" data-tooltip="关闭">
            ${icons.close}
          </button>
        </div>
      </div>

      <!-- 搜索框 -->
      <div class="tk-search-container">
        <div class="tk-search-box">
          <span class="tk-search-icon">${icons.search}</span>
          <input type="text" class="tk-search-input" id="tk-search-input" placeholder="搜索节点...">
        </div>
      </div>


      <!-- 思维树主体 -->
      <div class="tk-tree-container">
        <ul class="tk-tree-list" id="tk-tree-list">
          <!-- 思维树节点将在这里渲染 -->
        </ul>
      </div>

      <!-- 隐藏的导入input -->
      <input type="file" id="tk-import-file" accept=".json" style="display:none;">
    `;
  }

  /**
   * 绑定事件
   */
  function bindEvents() {
    // 清空按钮
    document.getElementById('tk-clear-btn').addEventListener('click', clearCurrentTree);
    
    // 刷新按钮
    document.getElementById('tk-refresh-btn').addEventListener('click', refreshCurrentTree);
    
    // 关闭按钮
    document.getElementById('tk-close-btn').addEventListener('click', closeSidebar);

    // 搜索框
    document.getElementById('tk-search-input').addEventListener('input', handleSearch);

    // 隐藏的导入功能
    const importEl = document.getElementById('tk-import-file');
    if (importEl) importEl.addEventListener('change', importTree);
  }

  /**
   * 获取当前对话ID和标题 - 多平台支持
   */
  function getCurrentConversation() {
    const url = window.location.href;
    const hostname = window.location.hostname;
    let conversationId = null;
    let conversationTitle = '新对话';
    
    // 通用：从URL获取对话ID（/chat/xxx 格式，适用于豆包、DeepSeek等）
    const chatMatch = url.match(/\/chat\/([^/?]+)/);
    if (chatMatch) {
      conversationId = chatMatch[1];
    }
    
    // DeepSeek 特殊处理：/a/chat/s/xxx 格式
    const deepseekMatch = url.match(/\/chat\/s\/([^/?]+)/);
    if (deepseekMatch) {
      conversationId = deepseekMatch[1];
    }
    
    // 尝试获取对话标题
    const titleSelectors = [
      '[class*="active"] [class*="title"]',
      '[class*="selected"] [class*="name"]',
      '.conversation-item.active',
      '[class*="chat-item"][class*="active"]',
      '.active .chat-title',
      '[class*="session"][class*="active"]'
    ];
    
    for (const selector of titleSelectors) {
      const activeChat = document.querySelector(selector);
      if (activeChat && activeChat.textContent.trim()) {
        conversationTitle = activeChat.textContent.trim().substring(0, 50);
        break;
      }
    }
    
    // 如果URL没有对话ID，用页面标题生成
    if (!conversationId) {
      let pageTitle = document.title;
      
      // 移除平台名称后缀
      pageTitle = pageTitle
        .replace(' - 豆包', '')
        .replace(' - DeepSeek', '')
        .replace(' - 通义千问', '')
        .replace(' | DeepSeek', '')
        .replace(' - Kimi', '')
        .replace(' | Kimi', '')
        .replace(' - 腾讯元宝', '')
        .replace(' | 腾讯元宝', '')
        .replace(' - 通义千问', '')
        .replace(' | 通义', '')
        .replace(' - Qwen', '')
        .replace('千问-Qwen最新模型体验-通义千问官网', '')
        .replace(' - 千问', '')
        .replace(' | 千问', '')
        .replace(' - 文心一言', '')
        .replace(' | 文心一言', '')
        .trim();
      
      if (pageTitle && pageTitle.length > 2) {
        conversationTitle = pageTitle.substring(0, 50);
        conversationId = 'conv_' + simpleHash(pageTitle);
      }
    }
    
    // 兜底：基于当前URL的稳定ID（同一页面始终返回同一ID）
    if (!conversationId) {
      conversationId = 'page_' + simpleHash(window.location.origin + window.location.pathname);
    }
    
    return { id: conversationId, title: conversationTitle };
  }
  
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 加载数据
   */
  async function loadData() {
    try {
      // 加载思维树列表
      state.trees = await TreeKnowDB.getAllTrees();
      
      // 始终展开侧边栏
      state.isCollapsed = false;
      document.getElementById('treeknow-sidebar').classList.remove('collapsed');

      // 根据当前对话自动选择/创建思维树
      await syncWithCurrentConversation();

      // 监听对话切换（URL变化）
      startConversationMonitor();
        
      // 持续监听新消息
      startMessageObserver();

    } catch (error) {
      console.error('[TreeKnow] 加载数据失败:', error);
    }
  }

  let messageObserver = null;
  let captureTimeout = null;
  let lastConversationId = null;
  let urlCheckInterval = null;
  let titleObserver = null;
  let titleDebounceTimer = null;
  
  /**
   * 同步当前对话 - 保留用户修改，只添加新消息
   */
  let isSyncing = false; // 互斥锁，防止并发创建重复树

  async function syncWithCurrentConversation() {
    if (isSyncing) return; // 已有同步进行中，跳过

    const conv = getCurrentConversation();
    
    // 如果没有对话ID，等待页面加载
    if (!conv.id) {
      setTimeout(() => syncWithCurrentConversation(), 500);
      return;
    }
    
    // 如果对话没变，不处理
    if (conv.id === lastConversationId) {
      return;
    }
    
    isSyncing = true;
    try {
    lastConversationId = conv.id;
    
    // 查找是否已有这个对话的思维树
    state.trees = await TreeKnowDB.getAllTrees();
    let tree = state.trees.find(t => t.conversationId === conv.id);
    
    if (!tree) {
      // 创建新的思维树
      tree = await TreeKnowDB.createTree({
        name: conv.title,
        conversationId: conv.id
      });
      state.trees.push(tree);
    }
    // 不再清空节点，保留用户的修改
    
    // 选择思维树
    state.currentTreeId = tree.id;
    updateTreeSelector();
    TreeKnowCapture.setTreeId(tree.id);
    
    // 先显示已有内容
    await refreshTree();
    
    // 启用捕获
    state.captureEnabled = true;
    
    // 增量抓取新消息（不会重复）
    await TreeKnowCapture.manualCapture();
    await refreshTree();
    } catch (e) {
      console.error('[TreeKnow] 同步对话失败:', e);
    } finally {
      isSyncing = false;
    }
  }
  
  /**
   * 监听对话切换
   */
  function startConversationMonitor() {
    // 防止重复调用
    if (urlCheckInterval) return;

    // 监听URL变化
    let lastUrl = window.location.href;
    
    urlCheckInterval = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        DEBUG && console.log('[TreeKnow] URL变化，同步对话...');
        syncWithCurrentConversation();
      }
    }, 500);
    
    // 监听页面标题变化（带防抖，避免频繁触发）
    titleObserver = new MutationObserver(() => {
      if (titleDebounceTimer) clearTimeout(titleDebounceTimer);
      titleDebounceTimer = setTimeout(() => {
        titleDebounceTimer = null;
        syncWithCurrentConversation();
      }, 300);
    });
    
    const titleEl = document.querySelector('title');
    if (titleEl) {
      titleObserver.observe(titleEl, { childList: true });
    }
    
    // 监听左侧对话列表点击（豆包和其他平台）
    document.addEventListener('click', async (e) => {
      // 豆包的对话项选择器
      const chatItem = e.target.closest(
        '[class*="conversation"], [class*="chat-item"], [class*="session"], ' +
        '[class*="history-item"], [class*="dialogue"], [class*="chat_item"], ' +
        '[data-testid*="conversation"], [data-testid*="chat"], ' +
        'aside li, nav li, [class*="sidebar"] li'
      );
      
      if (chatItem && !chatItem.closest('#treeknow-sidebar')) {
        lastConversationId = null; // 强制重新同步
        
        // 立即同步，然后延迟再同步一次（等待内容加载）
        await syncWithCurrentConversation();
        setTimeout(() => {
          lastConversationId = null;
          syncWithCurrentConversation();
        }, 1000);
      }
    });
  }
  
  /**
   * 启动消息监听器 - 实时监听新消息（节流）
   */
  function startMessageObserver() {
    if (messageObserver) return;
    
    const sidebar = document.getElementById('treeknow-sidebar');
    messageObserver = new MutationObserver((mutations) => {
      // 忽略侧边栏内部的DOM变动，避免渲染循环
      if (sidebar && mutations.every(m => sidebar.contains(m.target))) return;
      // 节流：500ms内只触发一次
      if (captureTimeout) return;
      captureTimeout = setTimeout(() => {
        captureTimeout = null;
        // 增量抓取，不清空记录
        incrementalCapture();
      }, 500);
    });
    
    messageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    DEBUG && console.log('[TreeKnow] 消息监听已启动');
  }
  
  /**
   * 增量抓取 - 只抓取新消息，不清空记录
   */
  async function incrementalCapture() {
    if (!state.currentTreeId) return;
    
    // 不再重复调用 setTreeId（会清空已捕获集合）
    // 刷新由 onCapture 回调自动触发
    await TreeKnowCapture.incrementalCapture();
  }

  /**
   * 自动抓取（页面加载时）
   */
  async function autoCapture() {
    DEBUG && console.log('%c[TreeKnow] 开始抓取...', 'color: blue;');
    
    if (!state.currentTreeId) {
      DEBUG && console.log('%c[TreeKnow] 错误：没有当前树ID', 'color: red;');
      return;
    }

    try {
      TreeKnowCapture.setTreeId(state.currentTreeId);
      const success = await TreeKnowCapture.manualCapture();
      
      DEBUG && console.log('%c[TreeKnow] manualCapture 返回:', 'color: blue;', success);
      
      if (success) {
        await refreshTree();
        const treeState = TreeKnowTree.getState();
        DEBUG && console.log('%c[TreeKnow] 自动抓取完成！节点数:', 'color: green; font-weight: bold;', treeState.nodes?.length || 0);
      } else {
        DEBUG && console.log('%c[TreeKnow] 未抓取到内容', 'color: orange;');
      }
    } catch (error) {
      console.error('%c[TreeKnow] 自动抓取失败:', 'color: red; font-weight: bold;', error);
    }
  }

  /**
   * 更新思维树选择器
   */
  function updateTreeSelector() {
    const select = document.getElementById('tk-tree-select');
    if (!select) return;
    
    select.innerHTML = '';

    // 只显示已有的思维树，不显示额外选项
    state.trees.forEach(tree => {
      const option = document.createElement('option');
      option.value = tree.id;
      option.textContent = tree.name;
      if (tree.id === state.currentTreeId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  /**
   * 处理思维树选择
   */
  async function handleTreeSelect(e) {
    const treeId = e.target.value;
    if (treeId) {
      await selectTree(treeId);
    }
  }

  /**
   * 选择思维树
   */
  async function selectTree(treeId) {
    state.currentTreeId = treeId;
    await TreeKnowDB.setSetting('lastTreeId', treeId);

    // 更新捕获模块的树ID
    TreeKnowCapture.setTreeId(treeId);

    // 加载思维树
    await TreeKnowTree.loadTree(treeId);

    DEBUG && console.log('[TreeKnow] 已选择思维树:', treeId);

    // 如果捕获已开启，自动抓取
    if (state.captureEnabled) {
      TreeKnowCapture.enable(treeId);
    }
  }

  /**
   * 刷新思维树
   */
  async function refreshTree() {
    if (state.currentTreeId) {
      // 必须用 loadTree 传入 treeId，因为 TreeKnowTree 有自己的 state
      await TreeKnowTree.loadTree(state.currentTreeId);
    }
  }

  /**
   * 创建新思维树
   */
  async function createNewTree(silent = false) {
    let name = '新建思维树';
    
    if (!silent) {
      name = prompt('请输入思维树名称：', name);
      if (!name) return;
    }

    try {
      const platform = TreeKnowCapture.getPlatform();
      const source = platform?.key || 'manual';
      
      const tree = await TreeKnowDB.createTree(name, source);
      
      // 刷新列表
      state.trees = await TreeKnowDB.getAllTrees();
      updateTreeSelector();

      // 选择新创建的树
      await selectTree(tree.id);

      if (!silent) {
        TreeKnowTree.showToast('思维树已创建', 'success');
      }

      DEBUG && console.log('[TreeKnow] 创建思维树:', tree.id);
    } catch (error) {
      console.error('[TreeKnow] 创建思维树失败:', error);
      TreeKnowTree.showToast('创建失败', 'error');
    }
  }

  /**
   * 清空当前思维树
   */
  async function clearCurrentTree() {
    if (!state.currentTreeId) {
      TreeKnowTree.showToast('没有选中的思维树', 'warning');
      return;
    }
    
    if (!confirm('确定要清空当前思维树的所有节点吗？')) {
      return;
    }
    
    const nodes = await TreeKnowDB.getNodesByTree(state.currentTreeId);
    await Promise.all(nodes.map(node => TreeKnowDB.deleteNode(node.id)));
    
    await refreshTree();
    TreeKnowTree.showToast('已清空', 'success');
  }
  
  /**
   * 刷新当前思维树（重新抓取）
   */
  async function refreshCurrentTree() {
    if (!state.currentTreeId) return;
    
    lastConversationId = null; // 强制重新同步
    await syncWithCurrentConversation();
    TreeKnowTree.showToast('已刷新', 'success');
  }
  
  /**
   * 关闭侧边栏
   */
  function closeSidebar() {
    const sidebar = document.getElementById('treeknow-sidebar');
    if (!sidebar) return;
    sidebar.style.display = 'none';
    updatePageMargin(null);

    // 清理观察者和定时器，释放资源
    if (messageObserver) {
      messageObserver.disconnect();
      messageObserver = null;
    }
    if (captureTimeout) {
      clearTimeout(captureTimeout);
      captureTimeout = null;
    }
    if (urlCheckInterval) {
      clearInterval(urlCheckInterval);
      urlCheckInterval = null;
    }
    if (titleObserver) {
      titleObserver.disconnect();
      titleObserver = null;
    }
    if (titleDebounceTimer) {
      clearTimeout(titleDebounceTimer);
      titleDebounceTimer = null;
    }
  }

  /**
   * 切换侧边栏显示/隐藏
   */
  function toggleSidebar() {
    const sidebar = document.getElementById('treeknow-sidebar');
    if (!sidebar) {
      DEBUG && console.log('[TreeKnow] 侧边栏不存在');
      return;
    }
    
    // 检查当前是否隐藏
    const isHidden = sidebar.style.display === 'none' || 
                     window.getComputedStyle(sidebar).display === 'none';
    
    if (isHidden) {
      sidebar.style.display = 'flex';
      updatePageMargin(state.isCollapsed ? 48 : 300);
      // 重新启动监听器
      startConversationMonitor();
      startMessageObserver();
      DEBUG && console.log('[TreeKnow] 显示侧边栏');
    } else {
      sidebar.style.display = 'none';
      updatePageMargin(null);
      DEBUG && console.log('[TreeKnow] 隐藏侧边栏');
    }
  }

  /**
   * 手动抓取当前页面对话
   */
  async function manualCapture() {
    if (!state.currentTreeId) {
      TreeKnowTree.showToast('请先选择或创建思维树', 'warning');
      return;
    }

    const platform = TreeKnowCapture.getPlatform();
    if (!platform) {
      TreeKnowTree.showToast('当前页面不支持抓取', 'error');
      return;
    }

    TreeKnowTree.showToast('正在抓取...', 'info');

    try {
      // 设置树ID并执行手动抓取
      TreeKnowCapture.setTreeId(state.currentTreeId);
      const success = await TreeKnowCapture.manualCapture();
      
      if (success) {
        // 刷新树显示
        await refreshTree();
        const captureState = TreeKnowCapture.getState();
        TreeKnowTree.showToast(`抓取成功！共 ${captureState.capturedCount} 条`, 'success');
      } else {
        TreeKnowTree.showToast('未发现可抓取的对话内容', 'warning');
      }
    } catch (error) {
      console.error('[TreeKnow] 手动抓取失败:', error);
      TreeKnowTree.showToast('抓取失败: ' + error.message, 'error');
    }
  }

  /**
   * 搜索
   */
  function handleSearch(e) {
    const keyword = e.target.value;
    TreeKnowTree.search(keyword);
  }

  /**
   * 导出思维树
   */
  async function exportTree() {
    if (!state.currentTreeId) {
      TreeKnowTree.showToast('请先选择思维树', 'warning');
      return;
    }

    try {
      const data = await TreeKnowDB.exportTree(state.currentTreeId);
      const tree = await TreeKnowDB.getTree(state.currentTreeId);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tree.name}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      TreeKnowTree.showToast('导出成功', 'success');
    } catch (error) {
      console.error('[TreeKnow] 导出失败:', error);
      TreeKnowTree.showToast('导出失败', 'error');
    }
  }

  /**
   * 导入思维树
   */
  async function importTree(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const result = await TreeKnowDB.importTree(data);

      // 刷新列表
      state.trees = await TreeKnowDB.getAllTrees();
      updateTreeSelector();

      // 选择导入的树
      await selectTree(result.tree.id);

      TreeKnowTree.showToast('导入成功', 'success');
    } catch (error) {
      console.error('[TreeKnow] 导入失败:', error);
      TreeKnowTree.showToast('导入失败，请检查文件格式', 'error');
    }

    // 清空文件输入
    e.target.value = '';
  }

  /**
   * 清空所有数据
   */
  async function clearAllData() {
    const confirmed = confirm('确定要清空所有数据吗？此操作不可恢复！');
    if (!confirmed) return;

    const doubleConfirmed = confirm('再次确认：所有思维树数据将被永久删除！');
    if (!doubleConfirmed) return;

    try {
      await TreeKnowDB.clearAll();
      
      state.trees = [];
      state.currentTreeId = null;
      updateTreeSelector();

      // 清空树显示
      document.getElementById('tk-tree-list').innerHTML = '';

      // 创建新的默认树
      await createNewTree(true);

      TreeKnowTree.showToast('数据已清空', 'success');
    } catch (error) {
      console.error('[TreeKnow] 清空数据失败:', error);
      TreeKnowTree.showToast('清空失败', 'error');
    }
  }

  // 监听来自 background 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    DEBUG && console.log('[TreeKnow] 收到消息:', message);
    
    if (message.type === 'TOGGLE_SIDEBAR') {
      toggleSidebar();
      sendResponse({ success: true });
    }
    
    return true;
  });

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
