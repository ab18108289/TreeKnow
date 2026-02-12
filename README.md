<p align="center">
  <img src="icons/icon.svg" width="80" height="80" alt="TreeKnow">
</p>

<h1 align="center">树知 TreeKnow</h1>

<p align="center"><b>让每一次 AI 对话，都长成知识树。</b></p>

<p align="center">自动捕获 AI 对话内容，以思维树形式组织管理，数据 100% 本地存储。</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-10b981.svg" alt="MIT License"></a>
  <a href="https://github.com/ab18108289/TreeKnow"><img src="https://img.shields.io/badge/Chrome-Extension-4285f4?logo=googlechrome&logoColor=white" alt="Chrome Extension"></a>
  <a href="https://github.com/ab18108289/TreeKnow/stargazers"><img src="https://img.shields.io/github/stars/ab18108289/TreeKnow?style=flat&color=10b981" alt="GitHub stars"></a>
</p>

<p align="center">
  <a href="#-安装">安装使用</a> · <a href="#-功能特性">功能特性</a> · <a href="#-支持平台">支持平台</a> · <a href="privacy-policy.md">隐私政策</a>
</p>

---

## ✨ 功能特性

🔄 **自动捕获** — 打开 AI 对话页面即自动工作，实时捕获每一个提问，无需手动操作

🌳 **思维树管理** — 对话自动组织为树形结构，层次清晰，一目了然

🖱️ **拖拽排序** — 自由拖拽节点调整位置和层级，右键编辑、重命名

📦 **导入导出** — 一键导出 JSON 数据，支持跨设备导入，知识永不丢失

🔒 **隐私优先** — 所有数据使用 IndexedDB 存储在浏览器本地，零上传、零追踪

🎨 **优雅设计** — 极简侧边栏，页面内容自动推移，不遮挡原页面

## 🌐 支持平台

| | 平台 | 网址 |
|:---:|------|------|
| <img src="docs/logos/deepseek.png" width="20"> | **DeepSeek** | chat.deepseek.com |
| <img src="docs/logos/doubao.png" width="20"> | **豆包** | doubao.com |
| <img src="docs/logos/tongyi.png" width="20"> | **通义千问** | tongyi.aliyun.com |
| <img src="docs/logos/kimi.ico" width="20"> | **Kimi** | kimi.moonshot.cn |
| <img src="docs/logos/yuanbao.ico" width="20"> | **腾讯元宝** | yuanbao.tencent.com |
| <img src="docs/logos/yiyan.png" width="20"> | **文心一言** | yiyan.baidu.com |

> 更多平台持续接入中，欢迎 [提交 Issue](https://github.com/ab18108289/TreeKnow/issues) 告诉我们你想支持的平台。

## 📦 安装

### 从 Chrome 应用商店安装（推荐）

> 审核上架中，敬请期待。

### 手动安装

```bash
git clone https://github.com/ab18108289/TreeKnow.git
```

1. 打开浏览器扩展页面
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择克隆下来的项目根目录
5. 完成 ✅

## 🚀 使用方法

1. 访问任意支持的 AI 对话平台
2. 点击浏览器工具栏的 TreeKnow 图标，侧边栏会在页面右侧展开
3. 正常与 AI 对话，提问会自动捕获为思维树节点
4. 拖拽节点调整结构，双击编辑标题，右键查看更多操作

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| Manifest V3 | Chrome 扩展最新标准 |
| 原生 JavaScript | 零框架依赖，轻量高性能 |
| IndexedDB | 浏览器本地持久化存储 |
| MutationObserver | 实时监听页面 DOM 变化 |

## 📁 项目结构

```
TreeKnow/
├── manifest.json            # 扩展配置
├── background/
│   └── background.js        # Service Worker
├── content/
│   └── content-script.js    # 内容脚本（侧边栏 + 对话监听）
├── lib/
│   ├── capture.js           # AI 平台适配 & 对话捕获
│   ├── tree.js              # 思维树渲染
│   ├── drag.js              # 拖拽交互
│   └── db.js                # IndexedDB 存储
├── styles/
│   └── panel.css            # 侧边栏样式
├── icons/                   # 扩展图标
└── docs/                    # 产品官网 (GitHub Pages)
```

## 🗺️ 路线图

- [x] 支持豆包、通义千问、DeepSeek
- [x] 支持 Kimi、腾讯元宝、文心一言
- [x] 侧边栏推移页面（不遮挡）
- [x] 导入导出 JSON
- [ ] 节点内容预览
- [ ] 标签分类
- [ ] 导出为 Markdown / XMind 格式
- [ ] 快捷键支持
- [ ] 云端同步（可选）

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/your-feature`)
3. 提交修改 (`git commit -m 'Add your feature'`)
4. 推送分支 (`git push origin feature/your-feature`)
5. 创建 Pull Request

## 📄 许可证

[MIT License](LICENSE) © 2026 TreeKnow

---

<p align="center"><b>如果觉得有用，请给个 ⭐ Star 支持一下！</b></p>

<p align="center">
  <a href="https://github.com/ab18108289/TreeKnow/issues">报告问题</a> · <a href="https://github.com/ab18108289/TreeKnow/issues">功能建议</a>
</p>
