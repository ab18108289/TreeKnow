# Chrome 扩展上架全流程指南

> 基于树知 TreeKnow 扩展的实际上架经验整理，适用于 Manifest V3 扩展。
> 最后更新：2026-02-10

---

## 目录

- [一、前置准备](#一前置准备)
  - [1.1 开发者账号注册](#11-开发者账号注册)
  - [1.2 两步验证](#12-两步验证)
  - [1.3 代码准备](#13-代码准备)
- [二、Manifest.json 合规检查](#二manifestjson-合规检查)
  - [2.1 必需字段](#21-必需字段)
  - [2.2 权限最小化原则](#22-权限最小化原则)
  - [2.3 web_accessible_resources](#23-web_accessible_resources)
  - [2.4 常见 manifest 问题](#24-常见-manifest-问题)
- [三、代码清理](#三代码清理)
  - [3.1 移除调试日志](#31-移除调试日志)
  - [3.2 移除死代码](#32-移除死代码)
  - [3.3 安全检查](#33-安全检查)
- [四、图标和素材准备](#四图标和素材准备)
  - [4.1 扩展图标](#41-扩展图标)
  - [4.2 商店截图](#42-商店截图)
  - [4.3 可选素材](#43-可选素材)
- [五、隐私政策](#五隐私政策)
  - [5.1 为什么需要](#51-为什么需要)
  - [5.2 内容模板](#52-内容模板)
  - [5.3 部署方式](#53-部署方式)
- [六、打包发布文件](#六打包发布文件)
  - [6.1 应包含的文件](#61-应包含的文件)
  - [6.2 应排除的文件](#62-应排除的文件)
  - [6.3 打包方法](#63-打包方法)
- [七、提交到 Chrome Web Store](#七提交到-chrome-web-store)
  - [7.1 上传扩展包](#71-上传扩展包)
  - [7.2 Store listing 填写](#72-store-listing-填写)
  - [7.3 Privacy practices 填写](#73-privacy-practices-填写)
  - [7.4 Distribution 设置](#74-distribution-设置)
  - [7.5 提交审核](#75-提交审核)
- [八、审核流程](#八审核流程)
  - [8.1 审核时间](#81-审核时间)
  - [8.2 常见拒绝原因及解决方案](#82-常见拒绝原因及解决方案)
  - [8.3 申诉流程](#83-申诉流程)
- [九、上架后维护](#九上架后维护)
  - [9.1 版本更新流程](#91-版本更新流程)
  - [9.2 用户反馈处理](#92-用户反馈处理)
  - [9.3 数据统计](#93-数据统计)
- [十、常见问题 FAQ](#十常见问题-faq)
- [附录：实用链接](#附录实用链接)

---

## 一、前置准备

### 1.1 开发者账号注册

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 使用 Google 账号登录
3. 支付一次性注册费 **$5 美元**（信用卡/借记卡）
4. 身份验证：
   - **个人用户**：需要提供法定姓名、身份证正反面照片、住址证明文件、联系电话
   - **组织用户**：需要组织名称、营业执照或邓白氏编码（DUNS，可能需要 30 天申请）
   - **建议**：个体开发者或个体工商户选择「个人用户」注册，更简单快速

> **身份验证注意事项：**
> - Legal name（法定姓名）来自你的 Google Payments Profile，如果与身份证不一致，Google 可能会自动更新
> - 住址证明可以直接用身份证正面（上面有地址信息），属于 "government-issued document"
> - 如果 Legal name 无法修改，前往 https://pay.google.com/ 的设置中更改

### 1.2 两步验证

Chrome Web Store **强制要求**开启 Google 账号的两步验证（2-Step Verification），否则无法上传扩展。

设置方法：
1. 打开 https://myaccount.google.com/security
2. 找到「两步验证」并开启
3. 绑定手机号，选择短信验证码或 Google Authenticator
4. 完成后刷新 Developer Dashboard 即可

### 1.3 代码准备

确保你的扩展：
- 使用 **Manifest V3**（V2 已不再接受新提交）
- 在本地测试通过（Chrome → 扩展程序 → 开发者模式 → 加载已解压的扩展程序）
- 所有功能正常工作
- 没有报错或未处理的异常

---

## 二、Manifest.json 合规检查

### 2.1 必需字段

```json
{
  "manifest_version": 3,
  "name": "扩展名称",
  "short_name": "简称",
  "version": "1.0.0",
  "description": "扩展描述（最长 132 字符）",
  "author": "作者名",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

| 字段 | 说明 | 限制 |
|------|------|------|
| `name` | 扩展全名，显示在商店和浏览器中 | 最长 75 字符 |
| `short_name` | 简称，空间不足时使用 | 最长 12 字符 |
| `version` | 版本号，每次更新必须递增 | 1-4 段点分数字，如 `1.0.1` |
| `description` | 扩展简介 | 最长 132 字符 |
| `icons` | 4 种尺寸的 PNG 图标 | 16/32/48/128 px |

### 2.2 权限最小化原则

Chrome Web Store 审核会严格检查权限，原则是**只申请你确实需要的权限**：

| 权限 | 风险等级 | 说明 |
|------|---------|------|
| `storage` | 低 | 本地存储，几乎不会被拒 |
| `activeTab` | 低 | 用户主动点击时获取当前标签页信息 |
| `scripting` | 中 | 注入脚本，审核员会检查用途 |
| `host_permissions`（具体域名） | 中 | 在特定网站运行，需要说明理由 |
| `host_permissions`（`<all_urls>`） | 高 | 在所有网站运行，审核更严格，尽量避免 |
| `tabs` | 中 | 可以读取所有标签页 URL 和标题 |
| `webRequest` | 高 | 可以拦截/修改网络请求 |
| `downloads` | 中 | 可以管理下载 |

**建议**：`host_permissions` 只写你确实需要的域名，不要用 `<all_urls>`。

### 2.3 web_accessible_resources

如果你的扩展需要向网页暴露资源（如 CSS、图片），`matches` 也应该缩窄到特定域名：

```json
"web_accessible_resources": [
  {
    "resources": ["styles/*", "icons/*"],
    "matches": ["https://specific-site.com/*"]
  }
]
```

**不要**使用 `"matches": ["<all_urls>"]`，这会增加审核摩擦。

### 2.4 常见 manifest 问题

| 问题 | 说明 |
|------|------|
| 引用了不存在的文件 | 如 `web_accessible_resources` 中写了不存在的 HTML，会报错 |
| `default_popup` 与 `onClicked` 冲突 | 设置了 popup 后 `chrome.action.onClicked` 不再触发，二选一 |
| 版本号未递增 | 更新时 version 必须大于上一版 |
| description 超过 132 字符 | 商店会截断或报错 |
| 缺少 icons | 某些尺寸缺失会导致显示异常 |

---

## 三、代码清理

### 3.1 移除调试日志

生产版本应该清理 `console.log`，推荐方案：

```javascript
const DEBUG = false;

// 开发时：DEBUG = true
// 发布时：DEBUG = false
DEBUG && console.log('[MyExt] 调试信息');

// console.error 保留，用于真实错误
console.error('[MyExt] 严重错误:', error);
```

### 3.2 移除死代码

- 未使用的函数和变量
- 功能已注释但未删除的代码块
- manifest 中未列出的域名对应的 handler 代码
- 不可达的 UI 文件（如 manifest 中没有 `default_popup` 但存在 popup 文件）

### 3.3 安全检查

| 检查项 | 说明 |
|--------|------|
| 无硬编码 API Key | 任何密钥、token 都不应出现在代码中 |
| 无 `eval()` | Manifest V3 禁止使用 `eval()` 和类似方法 |
| 无远程代码加载 | 不能通过 `<script src="外部URL">` 加载代码 |
| 无 localhost 引用 | 发布版本中不应包含 localhost URL |
| innerHTML 安全 | 使用 innerHTML 时确保内容已转义，防止 XSS |

---

## 四、图标和素材准备

### 4.1 扩展图标

| 尺寸 | 用途 | 格式 |
|------|------|------|
| 16x16 | 浏览器工具栏 | PNG |
| 32x32 | Windows 任务栏 | PNG |
| 48x48 | 扩展管理页面 | PNG |
| 128x128 | Chrome Web Store 商店页面 | PNG |

**设计建议：**
- 图标要在 16px 下也清晰可辨——线条要粗、形状要大、细节要少
- 背景铺满整个图标空间，不要留过多内边距
- 使用与品牌一致的颜色

### 4.2 商店截图

| 要求 | 说明 |
|------|------|
| 数量 | 至少 1 张，最多 5 张 |
| 尺寸 | 1280x800 或 640x400 |
| 格式 | JPEG 或 PNG（不支持透明通道） |

**内容建议：**
- 截取扩展在实际使用场景中的效果图
- 展示核心功能（如侧边栏、主界面等）
- 如果有多个功能，每张截图展示一个

### 4.3 可选素材

| 素材 | 尺寸 | 说明 |
|------|------|------|
| Small promo tile | 440x280 | 商店搜索结果推广位，可选 |
| Marquee promo tile | 1400x560 | 商店首页轮播推荐位，可选 |
| Promo video | YouTube URL | 宣传视频，可选 |

这些素材对新扩展不是必需的，后续有需要再补充。

---

## 五、隐私政策

### 5.1 为什么需要

Chrome Web Store **强制要求**以下情况提供隐私政策：
- 使用了 `host_permissions`
- 收集任何用户数据
- 使用了敏感权限（如 `tabs`、`webRequest` 等）

### 5.2 内容模板

隐私政策至少应包含：

1. **概述** — 扩展做什么
2. **数据收集** — 收集/不收集哪些数据
3. **数据存储** — 存储在哪里（本地/服务器）
4. **数据共享** — 是否与第三方共享
5. **权限说明** — 每个权限的用途
6. **联系方式** — 用户如何联系你

如果扩展不收集任何数据（纯本地存储），重点强调：
- 不收集个人信息
- 不上传任何数据到服务器
- 不使用分析/追踪工具
- 所有数据仅存储在用户浏览器本地

### 5.3 部署方式

隐私政策需要一个**公开可访问的 URL**，常见方式：

| 方式 | 优点 | 缺点 |
|------|------|------|
| GitHub 仓库中的 md 文件 | 最简单，和代码一起管理 | URL 较长 |
| GitHub Pages | 可以自定义域名 | 需要额外配置 |
| 个人网站/博客 | 专业 | 需要维护 |
| Google Sites | 免费 | 不够专业 |

**最简单的方式**：把 `privacy-policy.md` 放在 GitHub 仓库根目录，URL 格式为：
```
https://github.com/用户名/仓库名/blob/main/privacy-policy.md
```

---

## 六、打包发布文件

### 6.1 应包含的文件

只包含扩展运行时必需的文件：

```
extension-release/
├── manifest.json          # 必需
├── background/            # Service Worker
│   └── background.js
├── content/               # 内容脚本
│   └── content-script.js
├── lib/                   # 库文件
│   ├── db.js
│   ├── tree.js
│   └── ...
├── styles/                # 样式
│   └── panel.css
└── icons/                 # 图标（仅 PNG）
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### 6.2 应排除的文件

| 文件类型 | 示例 |
|---------|------|
| 开发工具脚本 | `scripts/`、`generate-icons.html` |
| 源文件 | `icon.svg`、`source-icon.png` |
| 文档 | `README.md`、`INSTALL.md`、`privacy-policy.md` |
| Git 相关 | `.git/`、`.gitignore` |
| IDE 配置 | `.vscode/`、`.idea/` |
| 系统文件 | `.DS_Store`、`Thumbs.db` |
| 构建输出 | `dist/`、`node_modules/` |
| 打包文件自身 | `*.zip` |

### 6.3 打包方法

**方法一：PowerShell 脚本（Windows）**

创建 `scripts/package.ps1`：

```powershell
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outputDir = Join-Path $projectRoot "dist"
$zipPath = Join-Path $projectRoot "extension.zip"

# 清理
if (Test-Path $outputDir) { Remove-Item -Recurse -Force $outputDir }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

# 创建目录结构
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
# ... 创建子目录 ...

# 复制文件
Copy-Item "$projectRoot\manifest.json" "$outputDir\"
# ... 复制其他文件 ...

# 创建 zip
Compress-Archive -Path "$outputDir\*" -DestinationPath $zipPath -Force

# 清理临时目录
Remove-Item -Recurse -Force $outputDir
```

运行：
```powershell
powershell -ExecutionPolicy Bypass -File scripts/package.ps1
```

**方法二：手动打包**

1. 创建一个临时文件夹
2. 只复制运行时文件进去
3. 选中所有文件 → 右键 → 发送到 → 压缩文件夹
4. **注意**：zip 根目录必须直接包含 `manifest.json`，不能嵌套在子文件夹中

---

## 七、提交到 Chrome Web Store

### 7.1 上传扩展包

1. 打开 [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 点击「新建内容」（New Item）
3. 拖入或选择你的 `.zip` 文件
4. 上传成功后进入编辑页面

### 7.2 Store listing 填写

| 字段 | 是否必填 | 说明 |
|------|---------|------|
| Title | 自动读取 | 来自 manifest.json 的 name |
| Summary | 自动读取 | 来自 manifest.json 的 description |
| Description | **必填** | 详细描述，最长 16000 字符 |
| Category | **必填** | 选择最匹配的分类 |
| Language | **必填** | 扩展的主要语言 |
| Store Icon | **必填** | 128x128 PNG |
| Screenshots | **必填** | 至少 1 张 |
| Small promo tile | 可选 | 440x280 |
| Marquee promo tile | 可选 | 1400x560 |
| Promo video | 可选 | YouTube URL |
| Homepage URL | 建议填 | 项目主页（如 GitHub） |
| Support URL | 建议填 | 支持页面（如 GitHub Issues） |

**Description 写作建议：**

```
[扩展名] 是一款 [一句话说明功能]。

[2-3 句话详细说明使用场景和解决的问题]

主要功能：
• 功能1
• 功能2
• 功能3

支持平台：
• 平台1 (域名)
• 平台2 (域名)

[隐私/安全说明]
```

### 7.3 Privacy practices 填写

这是审核中最关键的部分：

**Single purpose description（单一用途描述）：**
- 用一句话说清楚扩展做什么
- 示例："Captures user questions from AI chat pages and organizes them as a mind tree."

**Permission justification（权限用途说明）：**
- 每个权限都需要单独解释为什么需要它
- 用英文填写，简洁明了
- 示例：
  - `storage`: "Stores user preferences and data locally in the browser."
  - `activeTab`: "Detects if the current tab is a supported platform."
  - `scripting`: "Injects the extension UI into supported web pages."
  - `host_permissions`: "Runs on specific websites to provide [具体功能]."

**Remote code（远程代码）：**
- 如果所有代码都打包在扩展中，选 **No**
- 如果使用了 CDN 或外部脚本（Manifest V3 一般不允许），需要说明理由

**Data usage（数据使用）：**
- 勾选你实际收集的数据类型（如果不收集，全部不勾选）
- 底部三个合规声明**必须全部勾选**

**Privacy policy URL：**
- 填入你部署好的隐私政策链接

### 7.4 Distribution 设置

| 设置 | 说明 |
|------|------|
| Visibility | Public（公开）或 Unlisted（不公开，只有链接能访问） |
| Distribution regions | 选择发布的国家/地区（通常选所有地区） |

### 7.5 提交审核

1. 所有标签页填写完毕后，点击 **"Submit for review"**
2. 如果按钮不可点击，点 **"Why can't I submit?"** 查看缺少什么
3. 提交后状态变为 **"Pending review"**

---

## 八、审核流程

### 8.1 审核时间

| 情况 | 预计时间 |
|------|---------|
| 简单扩展（少权限） | 1-2 个工作日 |
| 使用 host_permissions | 2-5 个工作日（可能触发深度审核） |
| 使用 `<all_urls>` | 3-7 个工作日 |
| 首次提交 | 可能比更新慢 |
| 版本更新 | 通常比首次快 |

### 8.2 常见拒绝原因及解决方案

#### 1. 权限过度（Excessive Permissions）

**原因**：申请了不必要的权限。

**解决方案**：
- 移除未使用的权限
- `host_permissions` 只保留确实需要的域名
- 不要使用 `<all_urls>` 除非真的需要

#### 2. 违反单一用途原则（Single Purpose Violation）

**原因**：扩展功能太多、太杂，不符合"单一明确用途"要求。

**解决方案**：
- 确保扩展有一个清晰的核心功能
- Single purpose description 要精确
- 移除与核心功能无关的特性

#### 3. 缺少或不合格的隐私政策（Missing/Inadequate Privacy Policy）

**原因**：隐私政策 URL 无法访问、内容不完整、或与实际行为不符。

**解决方案**：
- 确保 URL 公开可访问
- 内容覆盖数据收集、存储、共享
- 与扩展实际行为一致

#### 4. 误导性功能描述（Deceptive Functionality）

**原因**：描述中声称的功能与实际不符。

**解决方案**：
- 描述要如实反映扩展功能
- 不要夸大效果
- 截图展示真实界面

#### 5. 远程代码执行（Remote Code Execution）

**原因**：加载了外部 JavaScript 代码。

**解决方案**：
- 所有代码必须打包在扩展内
- 不使用 `eval()`、`new Function()` 等动态执行
- 不通过 `<script src="外部URL">` 加载脚本

#### 6. 无法验证功能（Unable to Verify Functionality）

**原因**：审核员无法测试你的扩展功能（如需要登录、需要特定环境）。

**解决方案**：
- 在 Dashboard 的 "Test Instructions" 中提供测试步骤
- 如需登录，提供测试账号
- 说明在哪个网站测试

#### 7. 品牌侵权（Trademark Violation）

**原因**：扩展名称、图标或描述中使用了其他公司的品牌。

**解决方案**：
- 不要在扩展名中包含其他产品名（如不要叫 "ChatGPT Helper"）
- 在描述中提及支持的平台时，说明是兼容性而非官方产品

### 8.3 申诉流程

如果你认为被拒是误判：
1. 查看拒绝邮件中的具体原因
2. 修改问题后重新提交
3. 如果仍有疑问，通过 [Chrome Web Store Support](https://support.google.com/chrome_webstore/contact/one_stop_support) 提交申诉
4. 申诉时提供：扩展 ID、拒绝原因、你的解释

---

## 九、上架后维护

### 9.1 版本更新流程

1. 修改代码
2. 在 `manifest.json` 中递增 `version`（如 `1.0.1` → `1.0.2`）
3. 重新打包 zip
4. 在 Developer Dashboard 中找到你的扩展
5. 点击「Package」→ 上传新的 zip
6. 更新 Store listing（如果需要）
7. 点击 **"Submit for review"**

**版本号规则**：
- 必须递增（不能回退）
- 格式：1-4 段数字，用点分隔
- 示例：`1.0.0` → `1.0.1` → `1.1.0` → `2.0.0`

### 9.2 用户反馈处理

- 商店页面的评论可以在 Dashboard 中查看和回复
- 在 Support URL（如 GitHub Issues）中处理 bug 报告
- 定期检查并修复用户反馈的问题

### 9.3 数据统计

Developer Dashboard 提供：
- 安装量 / 活跃用户数
- 用户评分和评论
- 按国家/地区的分布
- Chrome 版本分布

---

## 十、常见问题 FAQ

### Q: 注册费 $5 可以用什么支付？
A: 信用卡或借记卡（Visa/Mastercard）。不支持支付宝/微信。

### Q: 个体工商户应该选个人还是组织？
A: 建议选**个人**。组织注册需要邓白氏编码（DUNS Number），申请周期长。个人注册只需要身份证。

### Q: 扩展上架后多久能在商店搜到？
A: 通常审核通过后几小时内就能搜到，但搜索排名需要时间积累。

### Q: 可以发布多少个扩展？
A: 每个开发者账号最多 **20 个已发布的扩展**（主题不限数量）。

### Q: 上架后可以改名吗？
A: 可以。在 Store listing 中修改名称后重新提交审核即可。

### Q: 扩展包大小有限制吗？
A: 最大 **2GB**，但建议尽量精简。

### Q: 审核没通过怎么办？
A: 根据拒绝原因修改后重新提交。每次重新提交都会进入新的审核队列。

### Q: 可以同时在 Edge 商店发布吗？
A: 可以。Microsoft Edge 插件商店（Edge Add-ons）也支持 Manifest V3 扩展，大部分情况下同一个 zip 包可以直接提交，地址是 https://partner.microsoft.com/en-us/dashboard/microsoftedge/

### Q: 发布后源代码会公开吗？
A: 扩展的代码在用户安装后是可以被查看的（Chrome 会解压到本地），但商店不会展示源代码。这是浏览器扩展的特性，无法避免。

### Q: 两步验证必须用手机吗？
A: 可以用手机短信、Google Authenticator、或安全密钥（如 YubiKey）。短信方式最简单。

### Q: host_permissions 会导致审核更慢吗？
A: 是的。Dashboard 会提示 "Due to the Host Permission, your extension may require an in-depth review which will delay publishing"。这是正常的，耐心等待即可。

---

## 附录：实用链接

| 资源 | 链接 |
|------|------|
| Chrome Developer Dashboard | https://chrome.google.com/webstore/devconsole |
| 发布文档 | https://developer.chrome.com/docs/webstore/publish |
| 准备扩展指南 | https://developer.chrome.com/docs/webstore/prepare |
| 商店政策 | https://developer.chrome.com/docs/webstore/program-policies |
| Manifest V3 要求 | https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements |
| 图片要求 | https://developer.chrome.com/docs/webstore/images |
| 上架最佳实践 | https://developer.chrome.com/docs/webstore/best_listing |
| 客服支持 | https://support.google.com/chrome_webstore/contact/one_stop_support |
| Google Pay 设置 | https://pay.google.com/ |
| Google 账号安全 | https://myaccount.google.com/security |
| Edge 插件商店 | https://partner.microsoft.com/en-us/dashboard/microsoftedge/ |

---

> 本文档基于 2026 年 2 月的实际上架经验编写。Chrome Web Store 的政策和流程可能会更新，请以官方文档为准。
