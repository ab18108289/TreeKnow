# 树知 TreeKnow - Chrome Web Store 打包脚本
# 用法: 在项目根目录运行 powershell -ExecutionPolicy Bypass -File scripts/package.ps1

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outputDir = Join-Path $projectRoot "dist"
$zipName = "treeknow-chrome-store.zip"
$zipPath = Join-Path $projectRoot $zipName

Write-Host "[TreeKnow] 开始打包..." -ForegroundColor Green

# 清理旧的输出
if (Test-Path $outputDir) { Remove-Item -Recurse -Force $outputDir }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

# 创建输出目录结构
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
New-Item -ItemType Directory -Path "$outputDir\background" -Force | Out-Null
New-Item -ItemType Directory -Path "$outputDir\content" -Force | Out-Null
New-Item -ItemType Directory -Path "$outputDir\lib" -Force | Out-Null
New-Item -ItemType Directory -Path "$outputDir\styles" -Force | Out-Null
New-Item -ItemType Directory -Path "$outputDir\icons" -Force | Out-Null

# 复制运行时必需文件
Copy-Item "$projectRoot\manifest.json" "$outputDir\"

Copy-Item "$projectRoot\background\background.js" "$outputDir\background\"

Copy-Item "$projectRoot\content\content-script.js" "$outputDir\content\"

Copy-Item "$projectRoot\lib\db.js" "$outputDir\lib\"
Copy-Item "$projectRoot\lib\tree.js" "$outputDir\lib\"
Copy-Item "$projectRoot\lib\drag.js" "$outputDir\lib\"
Copy-Item "$projectRoot\lib\capture.js" "$outputDir\lib\"

Copy-Item "$projectRoot\styles\panel.css" "$outputDir\styles\"

Copy-Item "$projectRoot\icons\icon16.png" "$outputDir\icons\"
Copy-Item "$projectRoot\icons\icon32.png" "$outputDir\icons\"
Copy-Item "$projectRoot\icons\icon48.png" "$outputDir\icons\"
Copy-Item "$projectRoot\icons\icon128.png" "$outputDir\icons\"

# 创建 zip
Write-Host "[TreeKnow] 正在创建 $zipName ..." -ForegroundColor Cyan
Compress-Archive -Path "$outputDir\*" -DestinationPath $zipPath -Force

# 清理临时目录
Remove-Item -Recurse -Force $outputDir

# 显示结果
$size = [math]::Round((Get-Item $zipPath).Length / 1024, 1)
Write-Host ""
Write-Host "[TreeKnow] 打包完成!" -ForegroundColor Green
Write-Host "  文件: $zipPath" -ForegroundColor White
Write-Host "  大小: ${size} KB" -ForegroundColor White
Write-Host ""
Write-Host "下一步: 上传到 https://chrome.google.com/webstore/devconsole" -ForegroundColor Yellow
