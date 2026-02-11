/**
 * 树知 TreeKnow - Background Service Worker
 */

const DEBUG = false;

// 支持的AI平台列表
const SUPPORTED_PLATFORMS = [
  'doubao.com',
  'tongyi.aliyun.com',
  'qianwen.aliyun.com',
  'tongyi.com',
  'chat.qwen.ai',
  'qianwen.com',
  'chat.deepseek.com',
  'deepseek.com',
  'kimi.moonshot.cn',
  'kimi.com',
  'yuanbao.tencent.com',
  'yiyan.baidu.com'
];

// 检查URL是否为支持的平台
function isSupportedPlatform(url) {
  return url && SUPPORTED_PLATFORMS.some(platform => url.includes(platform));
}

// 监听插件安装
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    DEBUG && console.log('[TreeKnow] 首次安装');
  } else if (details.reason === 'update') {
    DEBUG && console.log('[TreeKnow] 已更新到版本', chrome.runtime.getManifest().version);
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_TAB_INFO':
      sendResponse(sender.tab ? {
        tabId: sender.tab.id,
        url: sender.tab.url,
        title: sender.tab.title
      } : { tabId: null, url: null, title: null });
      break;

    case 'TOGGLE_SIDEBAR':
      if (message.tabId) {
        chrome.tabs.sendMessage(message.tabId, { type: 'TOGGLE_SIDEBAR' }).catch(() => {});
      }
      sendResponse({ success: true });
      break;

    case 'REFRESH_TREE':
      if (message.tabId) {
        chrome.tabs.sendMessage(message.tabId, { type: 'REFRESH_TREE' }).catch(() => {});
      }
      sendResponse({ success: true });
      break;

    case 'CHECK_PLATFORM':
      sendResponse(sender.tab && sender.tab.url ? { 
        isSupported: isSupportedPlatform(sender.tab.url), 
        url: sender.tab.url 
      } : { isSupported: false, url: null });
      break;

    default:
      sendResponse({ error: 'unknown message type' });
      break;
  }
  return true;
});

// 监听标签页更新 - 显示badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (isSupportedPlatform(tab.url)) {
      chrome.action.setBadgeText({ tabId, text: '✓' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#22c55e' });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  }
});

// 监听插件图标点击 - 切换侧边栏
chrome.action.onClicked.addListener(async (tab) => {
  if (isSupportedPlatform(tab.url)) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
    } catch (error) {
      DEBUG && console.log('[TreeKnow] Content script 未加载');
    }
  }
});

DEBUG && console.log('[TreeKnow] Background Service Worker 已启动');
