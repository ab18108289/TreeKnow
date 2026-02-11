# 树知 TreeKnow - 安装指南

## 快速安装

### 第一步：生成图标

1. 用浏览器打开 `icons/generate-icons.html` 文件
2. 依次点击每个尺寸下方的「下载 PNG」按钮
3. 将4个PNG文件保存到 `icons/` 文件夹中

需要的图标文件：
- `icon16.png` (16×16)
- `icon32.png` (32×32)
- `icon48.png` (48×48)
- `icon128.png` (128×128)

### 第二步：加载插件

#### Chrome浏览器

1. 打开Chrome，地址栏输入：`chrome://extensions/`
2. 开启右上角「**开发者模式**」
3. 点击「**加载已解压的扩展程序**」
4. 选择本项目的根目录（包含 `manifest.json` 的文件夹）
5. 完成！

#### Edge浏览器

1. 打开Edge，地址栏输入：`edge://extensions/`
2. 开启左侧「**开发人员模式**」
3. 点击「**加载解压缩的扩展**」
4. 选择本项目的根目录
5. 完成！

### 第三步：开始使用

1. 访问支持的AI平台：
   - 豆包：https://www.doubao.com
   - 通义千问：https://tongyi.aliyun.com
   - DeepSeek：https://chat.deepseek.com

2. 页面右侧会自动出现「树知」侧边栏

3. 点击头部的开关按钮开启对话捕获

4. 与AI对话，内容会自动生成为思维树节点

## 常见问题

### 图标无法生成？

确保使用现代浏览器（Chrome/Edge/Firefox）打开 `generate-icons.html`。

如果仍有问题，可以：
1. 手动创建任意16×16, 32×32, 48×48, 128×128的PNG图片
2. 命名为 icon16.png, icon32.png, icon48.png, icon128.png
3. 放入 icons 文件夹

### 插件加载失败？

1. 检查是否缺少图标文件
2. 确认 manifest.json 语法正确
3. 查看Chrome开发者工具控制台的错误信息

### 侧边栏不显示？

1. 确保当前页面是支持的AI平台
2. 刷新页面重试
3. 检查插件是否已启用

## 文件清单

确保以下文件存在：

```
Tree/
├── manifest.json ✓
├── background/
│   └── background.js ✓
├── content/
│   └── content-script.js ✓
├── popup/
│   ├── popup.html ✓
│   └── popup.js ✓
├── lib/
│   ├── db.js ✓
│   ├── tree.js ✓
│   ├── drag.js ✓
│   └── capture.js ✓
├── styles/
│   └── panel.css ✓
└── icons/
    ├── icon16.png （需生成）
    ├── icon32.png （需生成）
    ├── icon48.png （需生成）
    └── icon128.png （需生成）
```

## 更新插件

修改代码后，在Chrome扩展程序页面点击「刷新」按钮或按 Ctrl+R 即可更新。
