/**
 * 树知 TreeKnow - IndexedDB 数据库模块
 * 负责思维树数据的本地持久化存储
 * 支持：思维树列表、节点数据、层级关系、折叠状态
 */

const TreeKnowDB = (function() {
  'use strict';
  const DEBUG = false;

  // 数据库配置
  const DB_NAME = 'TreeKnowDB';
  const DB_VERSION = 1;
  
  // 存储表名
  const STORES = {
    TREES: 'trees',      // 思维树列表
    NODES: 'nodes',      // 节点数据
    SETTINGS: 'settings' // 设置
  };

  let db = null;

  /**
   * 初始化数据库
   * @returns {Promise<IDBDatabase>}
   */
  function initDB() {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('[TreeKnow] 数据库打开失败:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        DEBUG && console.log('[TreeKnow] 数据库初始化成功');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        
        // 创建思维树存储表
        if (!database.objectStoreNames.contains(STORES.TREES)) {
          const treeStore = database.createObjectStore(STORES.TREES, { 
            keyPath: 'id' 
          });
          treeStore.createIndex('createdAt', 'createdAt', { unique: false });
          treeStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 创建节点存储表
        if (!database.objectStoreNames.contains(STORES.NODES)) {
          const nodeStore = database.createObjectStore(STORES.NODES, { 
            keyPath: 'id' 
          });
          nodeStore.createIndex('treeId', 'treeId', { unique: false });
          nodeStore.createIndex('parentId', 'parentId', { unique: false });
          nodeStore.createIndex('order', 'order', { unique: false });
        }

        // 创建设置存储表
        if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
          database.createObjectStore(STORES.SETTINGS, { 
            keyPath: 'key' 
          });
        }

        DEBUG && console.log('[TreeKnow] 数据库结构创建完成');
      };
    });
  }

  /**
   * 生成唯一ID
   * @returns {string}
   */
  function generateId() {
    return 'tk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取当前时间戳
   * @returns {number}
   */
  function getTimestamp() {
    return Date.now();
  }

  // ==================== 思维树操作 ====================

  /**
   * 创建新思维树
   * @param {string} name - 树名称
   * @param {string} source - 来源（如：doubao, tongyi, deepseek）
   * @returns {Promise<Object>}
   */
  async function createTree(options) {
    await initDB();
    
    // 支持旧的调用方式 createTree(name, source) 和新的 createTree({name, conversationId})
    let name, source, conversationId;
    if (typeof options === 'string') {
      name = options;
      source = arguments[1] || 'manual';
      conversationId = null;
    } else {
      name = options.name;
      source = options.source || 'auto';
      conversationId = options.conversationId || null;
    }
    
    const tree = {
      id: generateId(),
      name: name || '新建思维树',
      source: source,
      conversationId: conversationId,
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
      nodeCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TREES], 'readwrite');
      const store = transaction.objectStore(STORES.TREES);
      const request = store.add(tree);

      request.onsuccess = () => {
        DEBUG && console.log('[TreeKnow] 思维树创建成功:', tree.id);
        resolve(tree);
      };

      request.onerror = (event) => {
        console.error('[TreeKnow] 思维树创建失败:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * 获取所有思维树
   * @returns {Promise<Array>}
   */
  async function getAllTrees() {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TREES], 'readonly');
      const store = transaction.objectStore(STORES.TREES);
      const request = store.getAll();

      request.onsuccess = (event) => {
        const trees = event.target.result || [];
        // 按更新时间倒序排列
        trees.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(trees);
      };

      request.onerror = (event) => {
        console.error('[TreeKnow] 获取思维树列表失败:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * 获取单个思维树
   * @param {string} treeId
   * @returns {Promise<Object>}
   */
  async function getTree(treeId) {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TREES], 'readonly');
      const store = transaction.objectStore(STORES.TREES);
      const request = store.get(treeId);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 更新思维树
   * @param {string} treeId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async function updateTree(treeId, updates) {
    await initDB();

    const tree = await getTree(treeId);
    if (!tree) {
      throw new Error('思维树不存在');
    }

    const updatedTree = {
      ...tree,
      ...updates,
      updatedAt: getTimestamp()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TREES], 'readwrite');
      const store = transaction.objectStore(STORES.TREES);
      const request = store.put(updatedTree);

      request.onsuccess = () => {
        resolve(updatedTree);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 删除思维树及其所有节点
   * @param {string} treeId
   * @returns {Promise<void>}
   */
  async function deleteTree(treeId) {
    await initDB();

    // 先删除所有关联节点
    const nodes = await getNodesByTree(treeId);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TREES, STORES.NODES], 'readwrite');
      
      // 删除节点
      const nodeStore = transaction.objectStore(STORES.NODES);
      nodes.forEach(node => {
        nodeStore.delete(node.id);
      });

      // 删除树
      const treeStore = transaction.objectStore(STORES.TREES);
      treeStore.delete(treeId);

      transaction.oncomplete = () => {
        DEBUG && console.log('[TreeKnow] 思维树删除成功:', treeId);
        resolve();
      };

      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  // ==================== 节点操作 ====================

  /**
   * 创建节点
   * @param {Object} nodeData
   * @returns {Promise<Object>}
   */
  async function createNode(nodeData) {
    await initDB();

    const node = {
      id: generateId(),
      treeId: nodeData.treeId,
      parentId: nodeData.parentId || null,
      title: nodeData.title || '新节点',
      content: nodeData.content || '',
      type: nodeData.type || 'child', // 'main' | 'child'
      role: nodeData.role || 'user',  // 'user' | 'ai'
      order: nodeData.order || 0,
      collapsed: false,
      createdAt: getTimestamp(),
      updatedAt: getTimestamp()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.NODES, STORES.TREES], 'readwrite');
      const nodeStore = transaction.objectStore(STORES.NODES);
      const request = nodeStore.add(node);

      request.onsuccess = () => {
        // 更新树的节点数量
        const treeStore = transaction.objectStore(STORES.TREES);
        const treeRequest = treeStore.get(node.treeId);
        
        treeRequest.onsuccess = (e) => {
          const tree = e.target.result;
          if (tree) {
            tree.nodeCount = (tree.nodeCount || 0) + 1;
            tree.updatedAt = getTimestamp();
            treeStore.put(tree);
          }
        };

        resolve(node);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 批量创建节点
   * @param {Array} nodesData
   * @returns {Promise<Array>}
   */
  async function createNodes(nodesData) {
    await initDB();

    const nodes = nodesData.map(data => ({
      id: data.id || generateId(),
      treeId: data.treeId,
      parentId: data.parentId || null,
      title: data.title || '新节点',
      content: data.content || '',
      type: data.type || 'child',
      role: data.role || 'user',
      order: data.order || 0,
      collapsed: data.collapsed || false,
      createdAt: getTimestamp(),
      updatedAt: getTimestamp()
    }));

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.NODES], 'readwrite');
      const store = transaction.objectStore(STORES.NODES);

      nodes.forEach(node => {
        store.add(node);
      });

      transaction.oncomplete = () => {
        resolve(nodes);
      };

      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 获取思维树的所有节点
   * @param {string} treeId
   * @returns {Promise<Array>}
   */
  async function getNodesByTree(treeId) {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.NODES], 'readonly');
      const store = transaction.objectStore(STORES.NODES);
      const index = store.index('treeId');
      const request = index.getAll(treeId);

      request.onsuccess = (event) => {
        const nodes = event.target.result || [];
        // 按order排序
        nodes.sort((a, b) => a.order - b.order);
        resolve(nodes);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 获取节点的子节点
   * @param {string} parentId
   * @returns {Promise<Array>}
   */
  async function getChildNodes(parentId) {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.NODES], 'readonly');
      const store = transaction.objectStore(STORES.NODES);
      const index = store.index('parentId');
      const request = index.getAll(parentId);

      request.onsuccess = (event) => {
        const nodes = event.target.result || [];
        nodes.sort((a, b) => a.order - b.order);
        resolve(nodes);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 获取单个节点
   * @param {string} nodeId
   * @returns {Promise<Object>}
   */
  async function getNode(nodeId) {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.NODES], 'readonly');
      const store = transaction.objectStore(STORES.NODES);
      const request = store.get(nodeId);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 更新节点
   * @param {string} nodeId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async function updateNode(nodeId, updates) {
    await initDB();

    const node = await getNode(nodeId);
    if (!node) {
      throw new Error('节点不存在');
    }

    const updatedNode = {
      ...node,
      ...updates,
      updatedAt: getTimestamp()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.NODES], 'readwrite');
      const store = transaction.objectStore(STORES.NODES);
      const request = store.put(updatedNode);

      request.onsuccess = () => {
        resolve(updatedNode);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 批量更新节点（用于拖拽排序）
   * @param {Array} updates - [{id, parentId, order}, ...]
   * @returns {Promise<void>}
   */
  async function updateNodes(updates) {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.NODES], 'readwrite');
      const store = transaction.objectStore(STORES.NODES);
      
      let pending = updates.length;
      if (pending === 0) {
        resolve();
        return;
      }

      updates.forEach(update => {
        const getRequest = store.get(update.id);
        
        getRequest.onsuccess = () => {
          const node = getRequest.result;
          if (node) {
            const updatedNode = {
              ...node,
              parentId: update.parentId !== undefined ? update.parentId : node.parentId,
              order: update.order !== undefined ? update.order : node.order,
              collapsed: update.collapsed !== undefined ? update.collapsed : node.collapsed,
              updatedAt: getTimestamp()
            };
            store.put(updatedNode);
          }
          pending--;
        };
        
        getRequest.onerror = () => {
          pending--;
        };
      });

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 删除节点及其所有子节点
   * @param {string} nodeId
   * @returns {Promise<void>}
   */
  async function deleteNode(nodeId) {
    await initDB();

    // 获取所有需要删除的节点（包括子节点）
    const nodesToDelete = await getAllDescendants(nodeId);
    nodesToDelete.push(nodeId);

    const node = await getNode(nodeId);
    const treeId = node?.treeId;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.NODES, STORES.TREES], 'readwrite');
      const nodeStore = transaction.objectStore(STORES.NODES);

      nodesToDelete.forEach(id => {
        nodeStore.delete(id);
      });

      // 更新树的节点数量
      if (treeId) {
        const treeStore = transaction.objectStore(STORES.TREES);
        const treeRequest = treeStore.get(treeId);
        
        treeRequest.onsuccess = (e) => {
          const tree = e.target.result;
          if (tree) {
            tree.nodeCount = Math.max(0, (tree.nodeCount || 0) - nodesToDelete.length);
            tree.updatedAt = getTimestamp();
            treeStore.put(tree);
          }
        };
      }

      transaction.oncomplete = () => {
        DEBUG && console.log('[TreeKnow] 节点删除成功:', nodeId);
        resolve();
      };

      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 获取节点的所有后代节点ID
   * @param {string} nodeId
   * @returns {Promise<Array<string>>}
   */
  async function getAllDescendants(nodeId) {
    const descendants = [];
    const children = await getChildNodes(nodeId);

    for (const child of children) {
      descendants.push(child.id);
      const childDescendants = await getAllDescendants(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  /**
   * 检查是否为后代节点（防止循环层级）
   * @param {string} ancestorId - 可能的祖先节点
   * @param {string} descendantId - 可能的后代节点
   * @returns {Promise<boolean>}
   */
  async function isDescendant(ancestorId, descendantId) {
    const descendants = await getAllDescendants(ancestorId);
    return descendants.includes(descendantId);
  }

  // ==================== 设置操作 ====================

  /**
   * 获取设置
   * @param {string} key
   * @param {any} defaultValue
   * @returns {Promise<any>}
   */
  async function getSetting(key, defaultValue = null) {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SETTINGS], 'readonly');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.get(key);

      request.onsuccess = (event) => {
        const result = event.target.result;
        resolve(result ? result.value : defaultValue);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 保存设置
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  async function setSetting(key, value) {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
      const store = transaction.objectStore(STORES.SETTINGS);
      const request = store.put({ key, value });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  // ==================== 导入导出 ====================

  /**
   * 导出思维树为JSON
   * @param {string} treeId
   * @returns {Promise<Object>}
   */
  async function exportTree(treeId) {
    const tree = await getTree(treeId);
    if (!tree) {
      throw new Error('思维树不存在');
    }

    const nodes = await getNodesByTree(treeId);

    return {
      version: '1.0',
      exportedAt: getTimestamp(),
      tree: tree,
      nodes: nodes
    };
  }

  /**
   * 导出所有数据
   * @returns {Promise<Object>}
   */
  async function exportAll() {
    const trees = await getAllTrees();
    const allData = {
      version: '1.0',
      exportedAt: getTimestamp(),
      trees: []
    };

    for (const tree of trees) {
      const nodes = await getNodesByTree(tree.id);
      allData.trees.push({
        tree: tree,
        nodes: nodes
      });
    }

    return allData;
  }

  /**
   * 导入思维树数据
   * @param {Object} data - 导入的JSON数据
   * @returns {Promise<Object>}
   */
  async function importTree(data) {
    await initDB();

    if (!data || !data.tree) {
      throw new Error('无效的导入数据');
    }

    // 生成新ID避免冲突
    const idMap = {};
    const newTreeId = generateId();
    idMap[data.tree.id] = newTreeId;

    const newTree = {
      ...data.tree,
      id: newTreeId,
      createdAt: getTimestamp(),
      updatedAt: getTimestamp()
    };

    // 创建节点ID映射
    const nodes = data.nodes || [];
    nodes.forEach(node => {
      idMap[node.id] = generateId();
    });

    // 创建新节点
    const newNodes = nodes.map(node => ({
      ...node,
      id: idMap[node.id],
      treeId: newTreeId,
      parentId: node.parentId ? idMap[node.parentId] : null,
      createdAt: getTimestamp(),
      updatedAt: getTimestamp()
    }));

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TREES, STORES.NODES], 'readwrite');
      
      const treeStore = transaction.objectStore(STORES.TREES);
      treeStore.add(newTree);

      const nodeStore = transaction.objectStore(STORES.NODES);
      newNodes.forEach(node => {
        nodeStore.add(node);
      });

      transaction.oncomplete = () => {
        DEBUG && console.log('[TreeKnow] 导入成功:', newTreeId);
        resolve({ tree: newTree, nodes: newNodes });
      };

      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * 清空所有数据
   * @returns {Promise<void>}
   */
  async function clearAll() {
    await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.TREES, STORES.NODES, STORES.SETTINGS], 'readwrite');
      
      transaction.objectStore(STORES.TREES).clear();
      transaction.objectStore(STORES.NODES).clear();
      transaction.objectStore(STORES.SETTINGS).clear();

      transaction.oncomplete = () => {
        DEBUG && console.log('[TreeKnow] 所有数据已清空');
        resolve();
      };

      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  // ==================== 构建树形结构 ====================

  /**
   * 将平铺节点构建为树形结构
   * @param {Array} nodes - 平铺的节点数组
   * @returns {Array}
   */
  function buildTreeStructure(nodes) {
    const nodeMap = {};
    const roots = [];

    // 创建节点映射
    nodes.forEach(node => {
      nodeMap[node.id] = { ...node, children: [] };
    });

    // 构建树形结构
    nodes.forEach(node => {
      if (node.parentId && nodeMap[node.parentId]) {
        nodeMap[node.parentId].children.push(nodeMap[node.id]);
      } else {
        roots.push(nodeMap[node.id]);
      }
    });

    // 对子节点排序
    const sortChildren = (nodes) => {
      nodes.sort((a, b) => a.order - b.order);
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(roots);

    return roots;
  }

  // 公开API
  return {
    // 初始化
    init: initDB,
    generateId,
    
    // 思维树操作
    createTree,
    getAllTrees,
    getTree,
    updateTree,
    deleteTree,
    
    // 节点操作
    createNode,
    createNodes,
    getNodesByTree,
    getChildNodes,
    getNode,
    updateNode,
    updateNodes,
    deleteNode,
    getAllDescendants,
    isDescendant,
    
    // 设置操作
    getSetting,
    setSetting,
    
    // 导入导出
    exportTree,
    exportAll,
    importTree,
    clearAll,
    
    // 工具函数
    buildTreeStructure
  };
})();

// 兼容模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeKnowDB;
}
