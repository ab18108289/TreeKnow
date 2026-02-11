# 图标文件

## 生成图标

由于Chrome插件需要PNG格式的图标，请按以下步骤生成：

### 方法一：使用生成器（推荐）

1. 用浏览器打开 `generate-icons.html` 文件
2. 点击各尺寸下方的「下载」按钮
3. 将下载的PNG文件保存到此文件夹
4. 确保文件名正确：
   - `icon16.png` (16x16)
   - `icon32.png` (32x32)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)

### 方法二：在线转换

1. 使用在线SVG转PNG工具（如 https://svgtopng.com/）
2. 上传 `icon.svg` 文件
3. 分别导出16、32、48、128尺寸的PNG

### 方法三：使用命令行工具

如果安装了ImageMagick，可以执行：

```bash
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 32x32 icon32.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

## 图标规格

| 文件名 | 尺寸 | 用途 |
|--------|------|------|
| icon16.png | 16x16 | 工具栏图标 |
| icon32.png | 32x32 | Windows任务栏 |
| icon48.png | 48x48 | 扩展管理页面 |
| icon128.png | 128x128 | Chrome网上应用店 |
