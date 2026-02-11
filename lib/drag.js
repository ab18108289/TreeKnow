/**
 * 树知 TreeKnow - 拖拽交互核心模块
 * 实现丝滑的节点拖拽、排序、层级调整
 * 对标Megi思维树的交互体验
 */

const TreeKnowDrag = (function() {
  'use strict';
  const DEBUG = false;

  // 拖拽状态
  let dragState = {
    isDragging: false,
    dragNode: null,        // 被拖拽的节点DOM元素
    dragNodeId: null,      // 被拖拽的节点ID
    dragNodeData: null,    // 被拖拽的节点数据
    ghostElement: null,    // 拖拽幽灵元素
    dropIndicator: null,   // 放置指示器
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    dropTarget: null,      // 放置目标
    dropPosition: null,    // 放置位置: 'before' | 'after' | 'inside'
    invalidTarget: false,  // 是否为无效目标
    scrollInterval: null,  // 自动滚动定时器
    rafId: null            // requestAnimationFrame ID
  };

  // 配置
  const config = {
    dragThreshold: 5,       // 开始拖拽的最小移动距离
    scrollSpeed: 10,        // 自动滚动速度
    scrollZone: 50,         // 触发滚动的边缘区域大小
    animationDuration: 200  // 动画持续时间（ms）
  };

  // 回调函数
  let callbacks = {
    onDragStart: null,
    onDragMove: null,
    onDragEnd: null,
    onDrop: null,
    onOrderChange: null
  };

  /**
   * 初始化拖拽功能
   * @param {Object} options - 配置选项
   */
  function init(options = {}) {
    Object.assign(callbacks, options);
    
    // 绑定全局事件
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    DEBUG && console.log('[TreeKnow] 拖拽模块初始化完成');
  }

  /**
   * 销毁拖拽功能
   */
  function destroy() {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('keydown', handleKeyDown);
    cleanup();
  }

  /**
   * 绑定节点的拖拽事件
   * @param {HTMLElement} nodeElement - 节点DOM元素
   * @param {string} nodeId - 节点ID
   * @param {Object} nodeData - 节点数据
   */
  function bindDragEvents(nodeElement, nodeId, nodeData) {
    const contentElement = nodeElement.querySelector('.tk-node-content');
    if (!contentElement) return;

    contentElement.addEventListener('mousedown', (e) => {
      // 排除操作按钮区域
      if (e.target.closest('.tk-node-actions') || 
          e.target.closest('.tk-expand-btn') ||
          e.target.classList.contains('editing')) {
        return;
      }

      e.preventDefault();
      startDrag(e, nodeElement, nodeId, nodeData);
    });
  }

  /**
   * 开始拖拽
   */
  function startDrag(e, nodeElement, nodeId, nodeData) {
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.dragNode = nodeElement;
    dragState.dragNodeId = nodeId;
    dragState.dragNodeData = nodeData;

    const rect = nodeElement.getBoundingClientRect();
    dragState.offsetX = e.clientX - rect.left;
    dragState.offsetY = e.clientY - rect.top;
  }

  /**
   * 处理鼠标移动
   */
  function handleMouseMove(e) {
    if (!dragState.dragNode) return;

    const deltaX = Math.abs(e.clientX - dragState.startX);
    const deltaY = Math.abs(e.clientY - dragState.startY);

    // 超过阈值才开始拖拽
    if (!dragState.isDragging && (deltaX > config.dragThreshold || deltaY > config.dragThreshold)) {
      dragState.isDragging = true;
      createGhostElement();
      dragState.dragNode.classList.add('dragging');
      
      if (callbacks.onDragStart) {
        callbacks.onDragStart(dragState.dragNodeId, dragState.dragNodeData);
      }
    }

    if (dragState.isDragging) {
      e.preventDefault();
      
      // 取消之前的 RAF
      if (dragState.rafId) {
        cancelAnimationFrame(dragState.rafId);
      }
      
      // 使用 RAF 优化渲染
      const clientX = e.clientX;
      const clientY = e.clientY;
      
      dragState.rafId = requestAnimationFrame(() => {
        // 更新幽灵元素位置
        updateGhostPosition(clientX, clientY);
        
        // 检测放置目标
        detectDropTarget(clientX, clientY);
        
        // 自动滚动
        handleAutoScroll(clientY);

        if (callbacks.onDragMove) {
          callbacks.onDragMove(clientX, clientY, dragState.dropTarget, dragState.dropPosition);
        }
      });
    }
  }

  /**
   * 处理鼠标释放
   */
  function handleMouseUp(e) {
    if (!dragState.dragNode) return;

    if (dragState.isDragging && dragState.dropTarget && !dragState.invalidTarget) {
      // 执行放置操作
      performDrop();
    }

    cleanup();
  }

  /**
   * 处理键盘事件（ESC取消拖拽）
   */
  function handleKeyDown(e) {
    if (e.key === 'Escape' && dragState.isDragging) {
      cleanup();
    }
  }

  /**
   * 创建拖拽幽灵元素
   */
  function createGhostElement() {
    const ghost = dragState.dragNode.cloneNode(true);
    const content = dragState.dragNode.querySelector('.tk-node-content');
    
    ghost.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${content.offsetWidth}px;
      pointer-events: none;
      z-index: 10000;
      opacity: 0.9;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      backface-visibility: hidden;
      will-change: transform;
    `;
    ghost.className = 'tk-ghost-element';
    
    // 移除子节点列表，只保留节点内容
    const childList = ghost.querySelector('.tk-tree-children');
    if (childList) {
      childList.remove();
    }

    document.body.appendChild(ghost);
    dragState.ghostElement = ghost;
  }

  /**
   * 更新幽灵元素位置（使用 transform 提高性能）
   */
  function updateGhostPosition(clientX, clientY) {
    if (!dragState.ghostElement) return;

    const x = clientX - dragState.offsetX;
    const y = clientY - dragState.offsetY;
    
    // 使用 transform 而不是 left/top，性能更好
    dragState.ghostElement.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.02)`;
  }

  /**
   * 检测放置目标
   */
  function detectDropTarget(clientX, clientY) {
    // 隐藏幽灵元素以便检测下方元素
    if (dragState.ghostElement) {
      dragState.ghostElement.style.display = 'none';
    }

    const elementUnderCursor = document.elementFromPoint(clientX, clientY);
    
    if (dragState.ghostElement) {
      dragState.ghostElement.style.display = '';
    }

    // 清除之前的高亮
    clearDropHighlight();

    if (!elementUnderCursor) {
      dragState.dropTarget = null;
      dragState.dropPosition = null;
      return;
    }

    // 查找最近的节点容器
    const targetNode = elementUnderCursor.closest('.tk-tree-node');
    const targetContent = elementUnderCursor.closest('.tk-node-content');

    if (!targetNode || !targetContent) {
      dragState.dropTarget = null;
      dragState.dropPosition = null;
      removeDropIndicator();
      return;
    }

    const targetId = targetNode.dataset.nodeId;

    // 不能放到自己身上
    if (targetId === dragState.dragNodeId) {
      dragState.dropTarget = null;
      dragState.dropPosition = null;
      removeDropIndicator();
      return;
    }

    // 检查是否为非法目标（不能拖入自己的子节点）
    checkInvalidTarget(targetId).then(isInvalid => {
      if (isInvalid) {
        dragState.invalidTarget = true;
        targetContent.classList.add('drag-invalid');
        showErrorTip(clientX, clientY, '不能移动到子节点中');
        removeDropIndicator();
      } else {
        dragState.invalidTarget = false;
        hideErrorTip();
        
        // 确定放置位置
        const rect = targetContent.getBoundingClientRect();
        const relativeY = clientY - rect.top;
        const height = rect.height;

        if (relativeY < height * 0.25) {
          // 上方 - 放在目标之前
          dragState.dropPosition = 'before';
          showDropIndicator(targetContent, 'before');
        } else if (relativeY > height * 0.75) {
          // 下方 - 放在目标之后
          dragState.dropPosition = 'after';
          showDropIndicator(targetContent, 'after');
        } else {
          // 中间 - 放入目标内部
          dragState.dropPosition = 'inside';
          targetContent.classList.add('drag-over');
          removeDropIndicator();
        }

        dragState.dropTarget = {
          nodeElement: targetNode,
          nodeId: targetId,
          contentElement: targetContent
        };
      }
    });
  }

  /**
   * 检查是否为非法目标（防止循环层级）
   */
  async function checkInvalidTarget(targetId) {
    if (!TreeKnowDB) return false;
    
    try {
      return await TreeKnowDB.isDescendant(dragState.dragNodeId, targetId);
    } catch (e) {
      return false;
    }
  }

  /**
   * 显示放置指示器
   */
  function showDropIndicator(targetContent, position) {
    removeDropIndicator();

    const indicator = document.createElement('div');
    indicator.className = 'tk-drop-indicator';
    
    const rect = targetContent.getBoundingClientRect();
    const container = document.getElementById('treeknow-sidebar');
    const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };

    indicator.style.left = (rect.left - containerRect.left + 12) + 'px';
    indicator.style.width = (rect.width - 24) + 'px';

    if (position === 'before') {
      indicator.style.top = (rect.top - containerRect.top - 1) + 'px';
    } else {
      indicator.style.top = (rect.bottom - containerRect.top + 1) + 'px';
    }

    const treeContainer = document.querySelector('.tk-tree-container');
    if (treeContainer) {
      treeContainer.style.position = 'relative';
      treeContainer.appendChild(indicator);
    }

    dragState.dropIndicator = indicator;
  }

  /**
   * 移除放置指示器
   */
  function removeDropIndicator() {
    if (dragState.dropIndicator) {
      dragState.dropIndicator.remove();
      dragState.dropIndicator = null;
    }
  }

  /**
   * 清除放置高亮
   */
  function clearDropHighlight() {
    document.querySelectorAll('.drag-over, .drag-invalid').forEach(el => {
      el.classList.remove('drag-over', 'drag-invalid');
    });
  }

  /**
   * 显示错误提示
   */
  function showErrorTip(x, y, message) {
    hideErrorTip();

    const tip = document.createElement('div');
    tip.className = 'tk-drag-error-tip';
    tip.textContent = message;
    tip.style.left = (x + 10) + 'px';
    tip.style.top = (y + 10) + 'px';
    tip.id = 'tk-drag-error-tip';

    document.body.appendChild(tip);
  }

  /**
   * 隐藏错误提示
   */
  function hideErrorTip() {
    const tip = document.getElementById('tk-drag-error-tip');
    if (tip) {
      tip.remove();
    }
  }

  /**
   * 处理自动滚动
   */
  function handleAutoScroll(clientY) {
    const container = document.querySelector('.tk-tree-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scrollZone = config.scrollZone;

    clearInterval(dragState.scrollInterval);

    if (clientY - rect.top < scrollZone) {
      // 向上滚动
      dragState.scrollInterval = setInterval(() => {
        container.scrollTop -= config.scrollSpeed;
      }, 16);
    } else if (rect.bottom - clientY < scrollZone) {
      // 向下滚动
      dragState.scrollInterval = setInterval(() => {
        container.scrollTop += config.scrollSpeed;
      }, 16);
    }
  }

  /**
   * 执行放置操作
   */
  async function performDrop() {
    if (!dragState.dropTarget || dragState.invalidTarget) return;

    const { nodeId: targetId } = dragState.dropTarget;
    const sourceId = dragState.dragNodeId;
    const position = dragState.dropPosition;

    DEBUG && console.log('[TreeKnow] 执行放置:', { sourceId, targetId, position });

    try {
      const sourceNode = await TreeKnowDB.getNode(sourceId);
      const targetNode = await TreeKnowDB.getNode(targetId);

      if (!sourceNode || !targetNode) {
        console.error('[TreeKnow] 节点不存在');
        return;
      }

      let newParentId;
      let newOrder;
      const updates = [];

      if (position === 'inside') {
        // 放入目标内部，成为子节点
        newParentId = targetId;
        const children = await TreeKnowDB.getChildNodes(targetId);
        newOrder = children.length;
      } else {
        // 放在目标之前或之后
        newParentId = targetNode.parentId;
        
        // 获取同级节点（排除被拖拽的节点，避免同层拖拽时 index 偏移）
        const allSiblings = newParentId 
          ? await TreeKnowDB.getChildNodes(newParentId)
          : (await TreeKnowDB.getNodesByTree(sourceNode.treeId)).filter(n => !n.parentId);
        const siblings = allSiblings.filter(n => n.id !== sourceId);

        // 计算新排序
        const targetIndex = siblings.findIndex(n => n.id === targetId);
        
        if (position === 'before') {
          newOrder = targetIndex;
        } else {
          newOrder = targetIndex + 1;
        }

        // 更新其他节点的排序
        siblings.forEach((sibling, index) => {
          let order = index;
          if (index >= newOrder) {
            order = index + 1;
          }
          
          if (order !== sibling.order) {
            updates.push({ id: sibling.id, order });
          }
        });
      }

      // 添加源节点的更新
      updates.push({
        id: sourceId,
        parentId: newParentId,
        order: newOrder
      });

      // 批量更新节点
      await TreeKnowDB.updateNodes(updates);

      DEBUG && console.log('[TreeKnow] 节点位置更新成功');

      // 触发回调
      if (callbacks.onDrop) {
        callbacks.onDrop(sourceId, targetId, position);
      }

      if (callbacks.onOrderChange) {
        callbacks.onOrderChange();
      }

    } catch (error) {
      console.error('[TreeKnow] 放置操作失败:', error);
    }
  }

  /**
   * 清理拖拽状态
   */
  function cleanup() {
    // 移除拖拽样式
    if (dragState.dragNode) {
      dragState.dragNode.classList.remove('dragging');
    }

    // 移除幽灵元素
    if (dragState.ghostElement) {
      dragState.ghostElement.remove();
    }

    // 移除指示器
    removeDropIndicator();

    // 清除高亮
    clearDropHighlight();

    // 隐藏错误提示
    hideErrorTip();

    // 清除自动滚动
    clearInterval(dragState.scrollInterval);

    // 取消 RAF
    if (dragState.rafId) {
      cancelAnimationFrame(dragState.rafId);
    }

    // 触发拖拽结束回调
    if (dragState.isDragging && callbacks.onDragEnd) {
      callbacks.onDragEnd(dragState.dragNodeId);
    }

    // 重置状态
    dragState = {
      isDragging: false,
      dragNode: null,
      dragNodeId: null,
      dragNodeData: null,
      ghostElement: null,
      dropIndicator: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      dropTarget: null,
      dropPosition: null,
      invalidTarget: false,
      scrollInterval: null,
      rafId: null
    };
  }

  /**
   * 节点添加拖拽动画
   */
  function animateNodeMove(nodeElement, fromRect, toRect) {
    const deltaX = fromRect.left - toRect.left;
    const deltaY = fromRect.top - toRect.top;

    nodeElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    nodeElement.style.transition = 'none';

    requestAnimationFrame(() => {
      nodeElement.style.transition = `transform ${config.animationDuration}ms ease`;
      nodeElement.style.transform = '';
      
      setTimeout(() => {
        nodeElement.style.transition = '';
      }, config.animationDuration);
    });
  }

  /**
   * 获取当前拖拽状态
   */
  function getDragState() {
    return { ...dragState };
  }

  /**
   * 检查是否正在拖拽
   */
  function isDragging() {
    return dragState.isDragging;
  }

  // 公开API
  return {
    init,
    destroy,
    bindDragEvents,
    getDragState,
    isDragging,
    animateNodeMove
  };
})();

// 兼容模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeKnowDrag;
}
