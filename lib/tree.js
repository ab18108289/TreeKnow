/**
 * 树知 TreeKnow - 思维树渲染模块
 * 负责思维树的DOM渲染、节点操作、搜索功能
 */

const TreeKnowTree = (function() {
  'use strict';
  const DEBUG = false;

  // 当前状态
  let state = {
    currentTreeId: null,
    nodes: [],
    treeData: [],  // 树形结构数据
    searchKeyword: '',
    expandedNodes: new Set()
  };

  // 回调函数
  let callbacks = {
    onNodeClick: null,
    onNodeEdit: null,
    onNodeDelete: null,
    onTreeChange: null
  };

  // SVG图标
  const icons = {
    expand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    add: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    ai: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`,
    tree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`
  };

  /**
   * 初始化思维树渲染器
   * @param {Object} options - 配置选项
   */
  function init(options = {}) {
    Object.assign(callbacks, options);
    DEBUG && console.log('[TreeKnow] 思维树渲染器初始化完成');
  }

  /**
   * 加载思维树
   * @param {string} treeId
   */
  async function loadTree(treeId) {
    try {
      state.currentTreeId = treeId;
      state.nodes = await TreeKnowDB.getNodesByTree(treeId);
      state.treeData = TreeKnowDB.buildTreeStructure(state.nodes);
      
      // 恢复展开状态
      await loadExpandedState();
      
      render();
      
      DEBUG && console.log('[TreeKnow] 思维树加载完成:', treeId, '节点数:', state.nodes.length);
    } catch (error) {
      console.error('[TreeKnow] 加载思维树失败:', error);
    }
  }

  /**
   * 刷新当前思维树
   */
  async function refresh() {
    if (state.currentTreeId) {
      await loadTree(state.currentTreeId);
    }
  }

  /**
   * 渲染思维树
   */
  function render() {
    const container = document.querySelector('.tk-tree-list');
    if (!container) return;

    if (state.treeData.length === 0) {
      renderEmptyState(container);
      return;
    }

    container.innerHTML = '';
    
    state.treeData.forEach(node => {
      const nodeElement = createNodeElement(node, 0);
      container.appendChild(nodeElement);
    });

    // 绑定拖拽事件
    bindAllDragEvents();

    // 应用搜索高亮
    if (state.searchKeyword) {
      applySearchHighlight();
    }
  }

  /**
   * 渲染空状态
   */
  function renderEmptyState(container) {
    container.innerHTML = `
      <div class="tk-empty-state">
        <svg class="tk-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
        <p class="tk-empty-title">暂无对话记录</p>
        <p class="tk-empty-desc">开启抓取后，对话将自动生成思维树</p>
      </div>
    `;
  }

  /**
   * 创建节点DOM元素
   * @param {Object} node - 节点数据
   * @param {number} level - 层级深度
   * @returns {HTMLElement}
   */
  function createNodeElement(node, level) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = state.expandedNodes.has(node.id);
    const isMainNode = node.type === 'main' || level === 0;
    const li = document.createElement('li');
    li.className = 'tk-tree-node';
    li.dataset.nodeId = node.id;

    // 节点内容 - 简洁样式
    const content = document.createElement('div');
    content.className = `tk-node-content ${isMainNode ? 'main-node' : 'child-node'}`;

    // 展开/折叠按钮
    if (hasChildren) {
      const expandBtn = document.createElement('button');
      expandBtn.className = `tk-expand-btn ${isExpanded ? 'expanded' : ''}`;
      expandBtn.innerHTML = icons.expand;
      expandBtn.onclick = (e) => {
        e.stopPropagation();
        toggleExpand(node.id);
      };
      content.appendChild(expandBtn);
    } else {
      // 占位符，保持对齐
      const placeholder = document.createElement('span');
      placeholder.style.width = '22px';
      placeholder.style.marginRight = '8px';
      placeholder.style.flexShrink = '0';
      content.appendChild(placeholder);
    }


    // 节点标题
    const title = document.createElement('span');
    title.className = 'tk-node-title';
    title.textContent = node.title || '未命名节点';
    title.ondblclick = (e) => {
      e.stopPropagation();
      startEditTitle(node.id, title);
    };
    content.appendChild(title);

    // 操作按钮（只保留编辑和删除）
    const actions = document.createElement('div');
    actions.className = 'tk-node-actions';

    // 编辑按钮
    const editBtn = document.createElement('button');
    editBtn.innerHTML = icons.edit;
    editBtn.title = '编辑';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      startEditTitle(node.id, title);
    };
    actions.appendChild(editBtn);

    // 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete';
    deleteBtn.innerHTML = icons.delete;
    deleteBtn.title = '删除';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteNode(node.id);
    };
    actions.appendChild(deleteBtn);

    content.appendChild(actions);

    // 点击事件
    content.onclick = () => {
      if (callbacks.onNodeClick) {
        callbacks.onNodeClick(node);
      }
    };

    // 右键菜单
    content.oncontextmenu = (e) => {
      e.preventDefault();
      showContextMenu(e, node);
    };

    li.appendChild(content);

    // 子节点容器
    if (hasChildren) {
      const childrenContainer = document.createElement('ul');
      childrenContainer.className = `tk-tree-children ${isExpanded ? 'expanded' : 'collapsed'}`;

      node.children.forEach(child => {
        const childElement = createNodeElement(child, level + 1);
        childrenContainer.appendChild(childElement);
      });

      li.appendChild(childrenContainer);
    }

    return li;
  }

  /**
   * 绑定所有节点的拖拽事件
   */
  function bindAllDragEvents() {
    document.querySelectorAll('.tk-tree-node').forEach(nodeEl => {
      const nodeId = nodeEl.dataset.nodeId;
      const nodeData = findNodeById(nodeId);
      if (nodeData) {
        TreeKnowDrag.bindDragEvents(nodeEl, nodeId, nodeData);
      }
    });
  }

  /**
   * 查找节点数据
   */
  function findNodeById(nodeId, nodes = state.treeData) {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNodeById(nodeId, node.children);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 切换节点展开/折叠
   */
  async function toggleExpand(nodeId) {
    if (state.expandedNodes.has(nodeId)) {
      state.expandedNodes.delete(nodeId);
    } else {
      state.expandedNodes.add(nodeId);
    }

    // 保存展开状态
    await saveExpandedState();

    // 更新DOM
    const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (nodeElement) {
      const expandBtn = nodeElement.querySelector('.tk-expand-btn');
      const childrenContainer = nodeElement.querySelector('.tk-tree-children');

      if (expandBtn) {
        expandBtn.classList.toggle('expanded');
      }
      if (childrenContainer) {
        childrenContainer.classList.toggle('expanded');
        childrenContainer.classList.toggle('collapsed');
      }
    }
  }

  /**
   * 保存展开状态
   */
  async function saveExpandedState() {
    if (state.currentTreeId) {
      await TreeKnowDB.setSetting(
        `expanded_${state.currentTreeId}`,
        Array.from(state.expandedNodes)
      );
    }
  }

  /**
   * 加载展开状态（默认展开所有节点）
   */
  async function loadExpandedState() {
    // 优先从 DB 恢复用户保存的折叠状态
    if (state.currentTreeId) {
      const saved = await TreeKnowDB.getSetting(`expanded_${state.currentTreeId}`);
      if (saved && Array.isArray(saved) && saved.length > 0) {
        state.expandedNodes = new Set(saved);
        return;
      }
    }
    // 首次使用或无保存状态时，默认展开所有节点
    state.expandedNodes.clear();
    state.nodes.forEach(node => {
      state.expandedNodes.add(node.id);
    });
  }

  /**
   * 展开所有节点
   */
  async function expandAll() {
    state.nodes.forEach(node => {
      state.expandedNodes.add(node.id);
    });
    await saveExpandedState();
    render();
  }

  /**
   * 折叠所有节点
   */
  async function collapseAll() {
    state.expandedNodes.clear();
    await saveExpandedState();
    render();
  }

  /**
   * 开始编辑节点标题
   */
  function startEditTitle(nodeId, titleElement) {
    const originalText = titleElement.textContent;
    
    titleElement.contentEditable = 'true';
    titleElement.classList.add('editing');
    titleElement.focus();

    // 选中全部文字
    const range = document.createRange();
    range.selectNodeContents(titleElement);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const finishEdit = async () => {
      titleElement.contentEditable = 'false';
      titleElement.classList.remove('editing');

      const newText = titleElement.textContent.trim();
      if (newText && newText !== originalText) {
        await TreeKnowDB.updateNode(nodeId, { title: newText });
        showToast('节点已更新', 'success');
        
        if (callbacks.onNodeEdit) {
          callbacks.onNodeEdit(nodeId, newText);
        }
      } else {
        titleElement.textContent = originalText;
      }
    };

    titleElement.onblur = finishEdit;
    titleElement.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleElement.blur();
      } else if (e.key === 'Escape') {
        titleElement.textContent = originalText;
        titleElement.blur();
      }
    };
  }

  /**
   * 添加子节点
   */
  async function addChildNode(parentId) {
    try {
      const parentNode = await TreeKnowDB.getNode(parentId);
      if (!parentNode) return;

      const siblings = await TreeKnowDB.getChildNodes(parentId);
      
      const newNode = await TreeKnowDB.createNode({
        treeId: parentNode.treeId,
        parentId: parentId,
        title: '新节点',
        type: 'child',
        order: siblings.length
      });

      // 确保父节点展开
      state.expandedNodes.add(parentId);
      await saveExpandedState();

      // 刷新树
      await refresh();

      // 自动开始编辑新节点
      setTimeout(() => {
        const nodeEl = document.querySelector(`[data-node-id="${newNode.id}"]`);
        if (nodeEl) {
          const titleEl = nodeEl.querySelector('.tk-node-title');
          if (titleEl) {
            startEditTitle(newNode.id, titleEl);
          }
        }
      }, 100);

      showToast('节点已创建', 'success');
    } catch (error) {
      console.error('[TreeKnow] 添加子节点失败:', error);
      showToast('添加失败', 'error');
    }
  }

  /**
   * 添加主节点
   */
  async function addMainNode(title = '新主题') {
    if (!state.currentTreeId) return null;

    try {
      const rootNodes = state.treeData;
      
      const newNode = await TreeKnowDB.createNode({
        treeId: state.currentTreeId,
        parentId: null,
        title: title,
        type: 'main',
        order: rootNodes.length
      });

      await refresh();
      return newNode;
    } catch (error) {
      console.error('[TreeKnow] 添加主节点失败:', error);
      return null;
    }
  }

  /**
   * 删除节点
   */
  async function deleteNode(nodeId) {
    const node = findNodeById(nodeId);
    if (!node) return;

    const hasChildren = node.children && node.children.length > 0;
    const message = hasChildren 
      ? `确定删除「${node.title}」及其所有子节点吗？`
      : `确定删除「${node.title}」吗？`;

    if (confirm(message)) {
      try {
        await TreeKnowDB.deleteNode(nodeId);
        await refresh();
        showToast('节点已删除', 'success');

        if (callbacks.onNodeDelete) {
          callbacks.onNodeDelete(nodeId);
        }
      } catch (error) {
        console.error('[TreeKnow] 删除节点失败:', error);
        showToast('删除失败', 'error');
      }
    }
  }

  /**
   * 显示右键菜单
   */
  function showContextMenu(e, node) {
    // 移除已有菜单
    hideContextMenu();

    const menu = document.createElement('div');
    menu.className = 'tk-context-menu';
    menu.id = 'tk-context-menu';

    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = state.expandedNodes.has(node.id);

    const menuItems = [
      { icon: icons.edit, text: '重命名', action: () => {
        const nodeEl = document.querySelector(`[data-node-id="${node.id}"]`);
        const titleEl = nodeEl?.querySelector('.tk-node-title');
        if (titleEl) startEditTitle(node.id, titleEl);
      }},
      ...(hasChildren ? [
        { divider: true },
        {
          icon: icons.expand,
          text: isExpanded ? '折叠' : '展开',
          action: () => toggleExpand(node.id)
        }
      ] : []),
      { divider: true },
      { icon: icons.delete, text: '删除', class: 'danger', action: () => deleteNode(node.id) }
    ];

    menuItems.forEach(item => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'tk-context-menu-divider';
        menu.appendChild(divider);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = `tk-context-menu-item ${item.class || ''}`;
        menuItem.innerHTML = `${item.icon}<span>${item.text}</span>`;
        menuItem.onclick = () => {
          hideContextMenu();
          item.action();
        };
        menu.appendChild(menuItem);
      }
    });

    // 定位菜单
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    document.body.appendChild(menu);

    // 确保菜单在视口内
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (e.clientX - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (e.clientY - rect.height) + 'px';
    }

    // 点击其他地方关闭菜单
    setTimeout(() => {
      document.addEventListener('click', hideContextMenu, { once: true });
    }, 0);
  }

  /**
   * 隐藏右键菜单
   */
  function hideContextMenu() {
    const menu = document.getElementById('tk-context-menu');
    if (menu) {
      menu.remove();
    }
  }

  /**
   * 搜索节点
   */
  function search(keyword) {
    state.searchKeyword = keyword.toLowerCase().trim();
    
    if (!state.searchKeyword) {
      // 清除搜索高亮
      document.querySelectorAll('.tk-node-content.search-match').forEach(el => {
        el.classList.remove('search-match');
      });
      document.querySelectorAll('.tk-node-title .highlight').forEach(el => {
        el.outerHTML = el.textContent;
      });
      return;
    }

    applySearchHighlight();
  }

  /**
   * 应用搜索高亮
   */
  function applySearchHighlight() {
    if (!state.searchKeyword) return;

    const matchedNodes = [];

    // 查找匹配的节点
    state.nodes.forEach(node => {
      if (node.title && node.title.toLowerCase().includes(state.searchKeyword)) {
        matchedNodes.push(node.id);
      }
    });

    // 展开匹配节点的所有祖先
    matchedNodes.forEach(nodeId => {
      expandToNode(nodeId);
    });

    // 应用高亮
    document.querySelectorAll('.tk-tree-node').forEach(nodeEl => {
      const nodeId = nodeEl.dataset.nodeId;
      const content = nodeEl.querySelector('.tk-node-content');
      const title = nodeEl.querySelector('.tk-node-title');

      if (matchedNodes.includes(nodeId)) {
        content.classList.add('search-match');
        
        // 高亮匹配文字（安全方式：先转义 HTML，再插入 highlight span）
        const regex = new RegExp(`(${escapeRegex(state.searchKeyword)})`, 'gi');
        const safeText = title.textContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        title.innerHTML = safeText.replace(regex, '<span class="highlight">$1</span>');
      } else {
        content.classList.remove('search-match');
      }
    });

    // 滚动到第一个匹配项
    if (matchedNodes.length > 0) {
      const firstMatch = document.querySelector('.tk-node-content.search-match');
      if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  /**
   * 展开到指定节点
   */
  function expandToNode(nodeId) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node || !node.parentId) return;

    let currentId = node.parentId;
    while (currentId) {
      state.expandedNodes.add(currentId);
      const parent = state.nodes.find(n => n.id === currentId);
      currentId = parent?.parentId;
    }

    // 更新DOM
    state.expandedNodes.forEach(id => {
      const nodeEl = document.querySelector(`[data-node-id="${id}"]`);
      if (nodeEl) {
        const childrenContainer = nodeEl.querySelector('.tk-tree-children');
        const expandBtn = nodeEl.querySelector('.tk-expand-btn');
        if (childrenContainer) {
          childrenContainer.classList.add('expanded');
          childrenContainer.classList.remove('collapsed');
        }
        if (expandBtn) {
          expandBtn.classList.add('expanded');
        }
      }
    });
  }

  /**
   * 转义正则表达式特殊字符
   */
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 显示Toast提示
   */
  function showToast(message, type = 'info') {
    // 移除已有toast
    const existingToast = document.querySelector('.tk-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `tk-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  /**
   * 获取当前状态
   */
  function getState() {
    return { ...state };
  }

  /**
   * 获取当前树ID
   */
  function getCurrentTreeId() {
    return state.currentTreeId;
  }

  // 公开API
  return {
    init,
    loadTree,
    refresh,
    render,
    addMainNode,
    addChildNode,
    deleteNode,
    search,
    expandAll,
    collapseAll,
    toggleExpand,
    getState,
    getCurrentTreeId,
    showToast,
    findNodeById
  };
})();

// 兼容模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeKnowTree;
}
