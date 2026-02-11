/**
 * 树知 TreeKnow - AI对话捕获模块
 * 
 * 每个平台有独立的 handler，互不影响
 */

const TreeKnowCapture = (function() {
  'use strict';

  const DEBUG = false;

  let state = {
    enabled: false,
    currentTreeId: null,
    platform: null,
    observer: null,
    capturedMessages: new Set(),
    messageElements: new Map()
  };

  let callbacks = { onCapture: null };

  // UI文本黑名单 —— 仅精确匹配（文本 trim 后完全等于时才过滤）
  const UI_BLACKLIST = new Set([
    '复制成功', '编辑', '删除', '保存', '取消', '确定', '发送消息',
    '登录', '注册', '返回', '展开', '收起', '加载中', '正在生成',
    '新对话', '历史对话', '复制代码', '重新生成', '停止生成',
    '复制', '点赞', '分享', '收藏'
  ]);

  // ==================== 平台处理器 ====================
  // 每个平台完全独立，包含自己的所有选择器和逻辑
  // 新增平台只需添加一个新 handler，不会影响其他平台

  const platformHandlers = {

    // -------------------- 豆包 --------------------
    doubao: {
      name: '豆包',
      hostPatterns: ['doubao.com'],

      extractElements() {
        const results = [];
        const all = document.querySelectorAll('[data-testid="message_text_content"]');
        all.forEach(el => {
          if (el.closest('#treeknow-sidebar')) return;
          if (el.classList.contains('flow-markdown-body') || el.closest('.flow-markdown-body')) return;
          results.push(el);
        });
        return results;
      },

      findElement(searchText) {
        const all = document.querySelectorAll('[data-testid="message_text_content"]');
        for (const el of all) {
          if (el.closest('#treeknow-sidebar')) continue;
          if (el.closest('.flow-markdown-body')) continue;
          const text = (el.textContent || '').trim();
          if (text.includes(searchText) || searchText.includes(text.substring(0, 30))) {
            return el;
          }
        }
        return null;
      },

      findScrollContainer() {
        return null; // 豆包不需要特殊滚动容器处理
      },

      lazyLoading: false
    },

    // -------------------- DeepSeek --------------------
    deepseek: {
      name: 'DeepSeek',
      hostPatterns: ['chat.deepseek.com'],

      extractElements() {
        const results = [];
        // 策略1: 通过消息容器查找用户消息
        const allMessages = document.querySelectorAll('.father-msg-wrap, [class*="message"]');
        allMessages.forEach(msgContainer => {
          if (msgContainer.closest('#treeknow-sidebar')) return;
          const hasAiMarkdown = msgContainer.querySelector('.ds-markdown, .markdown-body');
          const userText = msgContainer.querySelector('.fbb737a4, .whitespace-pre-wrap');
          if (userText && !hasAiMarkdown) {
            results.push(userText);
          }
        });
        // 策略2: 备用选择器
        if (results.length === 0) {
          document.querySelectorAll('.whitespace-pre-wrap').forEach(el => {
            if (el.closest('#treeknow-sidebar')) return;
            if (el.closest('.ds-markdown') || el.closest('.markdown-body')) return;
            results.push(el);
          });
        }
        return results;
      },

      findElement(searchText) {
        const all = document.querySelectorAll('.whitespace-pre-wrap, .fbb737a4');
        for (const el of all) {
          if (el.closest('#treeknow-sidebar')) continue;
          if (el.closest('.ds-markdown') || el.closest('.markdown-body')) continue;
          const text = (el.textContent || '').trim();
          if (text.includes(searchText) || searchText.includes(text.substring(0, 30))) {
            return el;
          }
        }
        return null;
      },

      findScrollContainer() {
        return null; // DeepSeek 不需要特殊处理
      },

      lazyLoading: false
    },

    // -------------------- 通义千问 --------------------
    tongyi: {
      name: '通义千问',
      hostPatterns: ['tongyi.aliyun.com', 'qianwen.aliyun.com', 'tongyi.com', 'chat.qwen.ai', 'qianwen.com'],

      // DOM 结构 (www.qianwen.com):
      // [class*="questionItem-"] [data-msgid="..."]  ← 用户消息容器
      //   └── 文本内容
      // [class*="answerItem-"] [data-msgid="..."]    ← AI 回复容器
      //   └── .qk-markdown
      // .message-list-scroll-container               ← 滚动容器

      extractElements() {
        const results = [];
        // 精确选择器：用户问题项（CSS Module hash 会变，用前缀匹配）
        const all = document.querySelectorAll('[class*="questionItem-"]');
        all.forEach(el => {
          if (el.closest('#treeknow-sidebar')) return;
          results.push(el);
        });

        // 备用：旧版 tongyi.aliyun.com 可能用不同的 class
        if (results.length === 0) {
          document.querySelectorAll('[class*="userContent"], [class*="user-content"], [class*="human"]').forEach(el => {
            if (el.closest('#treeknow-sidebar')) return;
            // 排除侧栏智能体卡片（class 含 item-user）
            const cls = (el.className || '').toString();
            if (cls.includes('item-user')) return;
            results.push(el);
          });
        }

        return results;
      },

      findElement(searchText) {
        // 优先在 questionItem 中查找
        const all = document.querySelectorAll('[class*="questionItem-"]');
        for (const el of all) {
          if (el.closest('#treeknow-sidebar')) continue;
          const text = (el.textContent || '').trim();
          if (text.includes(searchText) || searchText.includes(text.substring(0, 30))) {
            return el;
          }
        }
        // 备用：旧版选择器
        const fallback = document.querySelectorAll('[class*="userContent"], [class*="user-content"]');
        for (const el of fallback) {
          if (el.closest('#treeknow-sidebar')) continue;
          const text = (el.textContent || '').trim();
          if (text.includes(searchText) || searchText.includes(text.substring(0, 30))) {
            return el;
          }
        }
        return null;
      },

      findScrollContainer() {
        const container = document.querySelector('.message-list-scroll-container');
        if (container && container.scrollHeight > container.clientHeight + 10) {
          return container;
        }
        return null;
      },

      lazyLoading: false
    },

    // -------------------- Kimi --------------------
    kimi: {
      name: 'Kimi',
      hostPatterns: ['kimi.moonshot.cn', 'kimi.com'],

      extractElements() {
        const results = [];
        const allUserContent = document.querySelectorAll('.chat-content-item-user .user-content');
        allUserContent.forEach(el => {
          if (el.closest('#treeknow-sidebar')) return;
          // 排除不可见元素（Kimi SPA 会缓存其他会话的 DOM）
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          results.push(el);
        });
        return results;
      },

      findElement(searchText) {
        const all = document.querySelectorAll('.chat-content-item-user .user-content');
        for (const el of all) {
          if (el.closest('#treeknow-sidebar')) continue;
          const text = (el.textContent || '').trim();
          if (text.includes(searchText) || searchText.includes(text.substring(0, 30))) {
            return el;
          }
        }
        return null;
      },

      findScrollContainer() {
        const chatItem = document.querySelector('.chat-content-item');
        if (!chatItem) return null;
        let container = chatItem.parentElement;
        while (container && container !== document.body) {
          if (container.scrollHeight > container.clientHeight + 10) {
            return container;
          }
          container = container.parentElement;
        }
        return null;
      },

      // Kimi 使用虚拟滚动/懒加载，需要滚动触发 DOM 加载
      lazyLoading: true
    },

    // -------------------- 腾讯元宝 --------------------
    yuanbao: {
      name: '腾讯元宝',
      hostPatterns: ['yuanbao.tencent.com'],

      // DOM 结构:
      // .agent-chat__list__item--human [data-conv-speaker="human"]
      //   └── .agent-chat__bubble--human .agent-chat__conv--human
      //         ├── .agent-chat__bubble__prefix
      //         ├── .agent-chat__bubble__content  ← 用户消息文本
      //         └── .agent-chat__bubble__suffix
      // AI 回复: .agent-chat__bubble--ai 内含 .hyc-common-markdown

      extractElements() {
        const results = [];
        // 精确选择器：用户气泡内的内容区域
        const all = document.querySelectorAll('.agent-chat__bubble--human .agent-chat__bubble__content');
        all.forEach(el => {
          if (el.closest('#treeknow-sidebar')) return;
          results.push(el);
        });

        // 备用：用 data 属性定位用户消息
        if (results.length === 0) {
          document.querySelectorAll('[data-conv-speaker="human"] .agent-chat__bubble__content').forEach(el => {
            if (el.closest('#treeknow-sidebar')) return;
            results.push(el);
          });
        }

        // 兜底：直接取用户气泡
        if (results.length === 0) {
          document.querySelectorAll('.agent-chat__bubble--human').forEach(el => {
            if (el.closest('#treeknow-sidebar')) return;
            results.push(el);
          });
        }

        return results;
      },

      findElement(searchText) {
        // 优先在 bubble__content 里查找
        const all = document.querySelectorAll('.agent-chat__bubble--human .agent-chat__bubble__content');
        for (const el of all) {
          if (el.closest('#treeknow-sidebar')) continue;
          const text = (el.textContent || '').trim();
          if (text.includes(searchText) || searchText.includes(text.substring(0, 30))) {
            return el;
          }
        }
        // 备用：直接在 bubble 上查找
        const bubbles = document.querySelectorAll('.agent-chat__bubble--human');
        for (const el of bubbles) {
          if (el.closest('#treeknow-sidebar')) continue;
          const text = (el.textContent || '').trim();
          if (text.includes(searchText) || searchText.includes(text.substring(0, 30))) {
            return el;
          }
        }
        return null;
      },

      findScrollContainer() {
        // 元宝的滚动容器是 .agent-chat__list__content 或其父级
        const listContent = document.querySelector('.agent-chat__list__content');
        if (listContent) {
          // 自身就是滚动容器
          if (listContent.scrollHeight > listContent.clientHeight + 10) {
            return listContent;
          }
          // 向上查找
          let container = listContent.parentElement;
          while (container && container !== document.body) {
            if (container.scrollHeight > container.clientHeight + 10) {
              return container;
            }
            container = container.parentElement;
          }
        }
        return null;
      },

      lazyLoading: false
    },

    // -------------------- 文心一言 --------------------
    yiyan: {
      name: '文心一言',
      hostPatterns: ['yiyan.baidu.com'],

      // DOM 结构 (yiyan.baidu.com):
      // .dialogue_card_item [data-chat-id="..."]
      //   └── [class*="questionBox__"]       ← 用户消息容器
      //         ├── [class*="roleUser__"]
      //         └── [class*="questionText__"] ← 用户消息文本
      // AI 回复: [class*="answerBox__"]
      // 对话列表: [class*="dialogueCardList__"]

      extractElements() {
        const results = [];

        // 通过 dialogue_card_item 按 data-chat-id 排序，确保节点顺序正确
        const items = document.querySelectorAll('.dialogue_card_item[data-chat-id]');
        if (items.length > 0) {
          const sortedItems = Array.from(items).sort((a, b) => {
            const idA = parseInt(a.dataset.chatId) || 0;
            const idB = parseInt(b.dataset.chatId) || 0;
            return idA - idB; // 按 ID 升序 = 时间顺序
          });

          sortedItems.forEach(item => {
            if (item.closest('#treeknow-sidebar')) return;
            const questionText = item.querySelector('[class*="questionText__"]');
            if (questionText) {
              results.push(questionText);
            }
          });
        }

        // 备用：直接查找 questionText（无卡片结构时）
        if (results.length === 0) {
          document.querySelectorAll('[class*="questionText__"]').forEach(el => {
            if (el.closest('#treeknow-sidebar')) return;
            results.push(el);
          });
        }

        // 备用：用户问题容器
        if (results.length === 0) {
          document.querySelectorAll('[class*="questionBox__"]').forEach(el => {
            if (el.closest('#treeknow-sidebar')) return;
            results.push(el);
          });
        }

        return results;
      },

      findElement(searchText) {
        // 优先在 questionText 中查找
        const all = document.querySelectorAll('[class*="questionText__"]');
        for (const el of all) {
          if (el.closest('#treeknow-sidebar')) continue;
          const text = (el.textContent || '').trim();
          if (text.includes(searchText) || searchText.includes(text.substring(0, 30))) {
            return el;
          }
        }
        // 备用：questionBox
        const boxes = document.querySelectorAll('[class*="questionBox__"]');
        for (const el of boxes) {
          if (el.closest('#treeknow-sidebar')) continue;
          const text = (el.textContent || '').trim();
          if (text.includes(searchText) || searchText.includes(text.substring(0, 30))) {
            return el;
          }
        }
        return null;
      },

      findScrollContainer() {
        // 文心一言的滚动容器
        const viewer = document.querySelector('[class*="chatViewer__"]');
        if (viewer && viewer.scrollHeight > viewer.clientHeight + 10) {
          return viewer;
        }
        const list = document.querySelector('[class*="dialogueCardList__"]');
        if (list) {
          let container = list;
          while (container && container !== document.body) {
            if (container.scrollHeight > container.clientHeight + 10) {
              return container;
            }
            container = container.parentElement;
          }
        }
        return null;
      },

      lazyLoading: false
    },

    // ChatGPT 支持暂未启用（域名未加入 manifest）
    // 如需启用，在 manifest.json 的 host_permissions 和 content_scripts.matches 中添加对应域名
  };

  // ==================== 通用回退处理器 ====================
  const fallbackHandler = {
    name: '未知平台',
    hostPatterns: [],

    extractElements() {
      const results = [];
      // 使用词边界正则，避免 "ai" 匹配 "container"、"bot" 匹配 "bottom" 等
      const userPattern = /\buser\b|\bhuman\b/;
      const botPattern = /\bbot\b|\bassistant\b|\bmarkdown\b/;
      document.querySelectorAll('[class]').forEach(el => {
        if (el.closest('#treeknow-sidebar')) return;
        const cls = (el.className || '').toString().toLowerCase();
        if (!userPattern.test(cls)) return;
        if (botPattern.test(cls)) return;
        results.push(el);
      });
      return results;
    },

    findElement(searchText) {
      const all = document.querySelectorAll('[class*="user"] div');
      for (const el of all) {
        if (el.closest('#treeknow-sidebar')) continue;
        const text = (el.textContent || '').trim();
        if (text.includes(searchText) || searchText.includes(text.substring(0, 30))) {
          return el;
        }
      }
      return null;
    },

    findScrollContainer() { return null; },
    lazyLoading: false
  };

  // ==================== 获取当前平台的 handler ====================
  function getHandler() {
    const key = state.platform?.key;
    return (key && platformHandlers[key]) || fallbackHandler;
  }

  // ==================== 核心工具函数 ====================

  function isUIText(text) {
    // 精确匹配：只有文本完全等于黑名单中的词才过滤，避免误杀用户消息
    return UI_BLACKLIST.has(text.trim());
  }

  function truncateText(text, max) {
    return text.length <= max ? text : text.substring(0, max - 3) + '...';
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  function generateMessageId(content) {
    return `msg_${simpleHash(content.substring(0, 100))}`;
  }

  // ==================== 平台检测 ====================

  function detectPlatform() {
    const hostname = window.location.hostname;
    for (const [key, handler] of Object.entries(platformHandlers)) {
      if (handler.hostPatterns.some(p => hostname.includes(p))) {
        state.platform = { key, name: handler.name, hostPatterns: handler.hostPatterns };
        return;
      }
    }
    state.platform = null;
  }

  // ==================== 公共 API ====================

  function init(options = {}) {
    Object.assign(callbacks, options);
    detectPlatform();
  }

  function setTreeId(treeId) {
    state.currentTreeId = treeId;
    state.capturedMessages.clear();
  }

  function getPlatform() { return state.platform; }
  function isSupportedPlatform() { return state.platform !== null; }
  function isEnabled() { return state.enabled; }

  async function enable(treeId) {
    state.enabled = true;
    state.currentTreeId = treeId;
    state.capturedMessages.clear();
    await captureExistingMessages();
    return true;
  }

  function disable() {
    state.enabled = false;
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }
  }

  // ==================== 消息提取（调用平台 handler） ====================

  function extractUserMessages() {
    const handler = getHandler();
    const elements = handler.extractElements();
    
    const messages = [];
    const seen = new Set();

    Array.from(elements).forEach(el => {
      const text = (el.textContent || '').trim();
      if (text.length < 1 || text.length > 2000) return;

      const fullKey = text.toLowerCase().replace(/\s+/g, '');
      if (seen.has(fullKey)) return;
      seen.add(fullKey);

      // key 用前47字符（与 truncateText 截断后去掉 '...' 对齐）
      const key = text.substring(0, 47).toLowerCase().replace(/\s+/g, '');
      state.messageElements.set(key, el);

      messages.push({
        id: generateMessageId(text),
        content: text,
        title: truncateText(text, 50),
        el: el
      });
    });

    return messages;
  }

  // ==================== 捕获并保存 ====================

  async function captureExistingMessages() {
    if (!state.currentTreeId) return 0;

    const messages = extractUserMessages();
    if (messages.length === 0) return 0;

    const userMessages = messages.filter(m => m.content && !isUIText(m.content));
    if (userMessages.length === 0) return 0;

    const existingNodes = await TreeKnowDB.getNodesByTree(state.currentTreeId);

    const existingContents = new Set();
    existingNodes.forEach(n => {
      const content = (n.content || n.title || '').toLowerCase().replace(/\s+/g, '');
      existingContents.add(content);
    });

    const toSave = [];
    const seen = new Set();

    for (const msg of userMessages) {
      const fullKey = msg.content.toLowerCase().replace(/\s+/g, '');
      if (existingContents.has(fullKey) || seen.has(fullKey)) continue;
      seen.add(fullKey);
      toSave.push(msg);
    }

    if (toSave.length === 0) return 0;

    let saved = 0;
    const startOrder = existingNodes.length;

    for (let i = 0; i < toSave.length; i++) {
      try {
        await TreeKnowDB.createNode({
          treeId: state.currentTreeId,
          parentId: null,
          title: toSave[i].title,
          content: toSave[i].content,
          type: 'main',
          role: 'user',
          order: startOrder + i
        });
        saved++;
        state.capturedMessages.add(toSave[i].content.toLowerCase().replace(/\s+/g, ''));
        existingContents.add(toSave[i].content.toLowerCase().replace(/\s+/g, ''));
      } catch (e) {
        console.warn('[TreeKnow] 保存节点失败:', e);
      }
    }

    if (saved > 0 && callbacks.onCapture) {
      callbacks.onCapture(saved);
    }

    return saved;
  }

  async function manualCapture() {
    if (!state.platform) detectPlatform();
    if (!state.currentTreeId) return false;
    state.capturedMessages.clear();
    await captureExistingMessages();
    return true;
  }

  async function incrementalCapture() {
    if (!state.currentTreeId) return 0;
    const count = await captureExistingMessages();
    return count || 0;
  }

  // ==================== 消息定位（调用平台 handler） ====================

  /**
   * 在 DOM 中查找匹配的消息元素
   */
  function findMessageElement(key, searchText) {
    // 检查缓存
    let el = state.messageElements.get(key);
    if (el && !document.body.contains(el)) el = null;

    if (!el) {
      const handler = getHandler();
      el = handler.findElement(searchText);
      if (el) {
        state.messageElements.set(key, el);
      }
    }
    return el;
  }

  /**
   * 高亮并滚动到目标元素
   */
  function highlightAndScroll(el) {
    el.scrollIntoView({ block: 'center' });
    const orig = el.style.backgroundColor;
    el.style.transition = 'background-color 0.3s';
    el.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
    setTimeout(() => { el.style.backgroundColor = orig; }, 2000);
  }

  /**
   * 滚动到指定消息（懒加载平台自动重试）
   */
  async function scrollToMessage(nodeTitle) {
    if (!nodeTitle) return false;

    // 移除截断省略号，还原原始文本前缀来生成缓存 key
    const searchText = nodeTitle.replace(/\.{3}$/, '').trim();
    const key = searchText.toLowerCase().replace(/\s+/g, '').substring(0, 47);

    // 第一次尝试：直接查找
    let el = findMessageElement(key, searchText);
    if (el) {
      highlightAndScroll(el);
      return true;
    }

    // 懒加载平台：滚动容器触发 DOM 重新加载后重试
    const handler = getHandler();
    if (handler.lazyLoading) {
      const container = handler.findScrollContainer();
      if (container) {
        const savedScroll = container.scrollTop;
        const positions = [container.scrollHeight, 0, container.scrollHeight / 2];

        for (const pos of positions) {
          container.scrollTop = pos;
          await new Promise(r => setTimeout(r, 350));
          el = findMessageElement(key, searchText);
          if (el) {
            highlightAndScroll(el);
            return true;
          }
        }

        // 全部尝试失败，恢复原始位置
        container.scrollTop = savedScroll;
      }
    }

    return false;
  }

  // ==================== 状态 ====================

  function getState() {
    return {
      enabled: state.enabled,
      platform: state.platform,
      treeId: state.currentTreeId,
      capturedCount: state.capturedMessages.size
    };
  }

  return {
    init,
    enable,
    disable,
    isEnabled,
    isSupportedPlatform,
    getPlatform,
    setTreeId,
    manualCapture,
    incrementalCapture,
    getState,
    scrollToMessage
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeKnowCapture;
}
