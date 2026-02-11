# TreeKnow Icon Generator
# Run: powershell -ExecutionPolicy Bypass -File scripts\create-icons.ps1

Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$iconsDir = Join-Path $rootDir "icons"

$iconSizes = @(16, 32, 48, 128)

foreach ($iconSize in $iconSizes) {
    $bmp = New-Object System.Drawing.Bitmap($iconSize, $iconSize)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Blue background (#1677FF)
    $blueColor = [System.Drawing.Color]::FromArgb(255, 22, 119, 255)
    $blueFill = New-Object System.Drawing.SolidBrush($blueColor)
    $gfx.FillRectangle($blueFill, 0, 0, $iconSize, $iconSize)
    
    # White circle in center
    $whiteColor = [System.Drawing.Color]::White
    $whiteFill = New-Object System.Drawing.SolidBrush($whiteColor)
    $cX = $iconSize / 2
    $cY = $iconSize / 2
    $rad = $iconSize * 0.3
    $gfx.FillEllipse($whiteFill, [int]($cX - $rad), [int]($cY - $rad), [int]($rad * 2), [int]($rad * 2))
    
    # Save PNG
    $outPath = Join-Path $iconsDir ("icon" + $iconSize + ".png")
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $gfx.Dispose()
    $bmp.Dispose()
    $blueFill.Dispose()
    $whiteFill.Dispose()
    
    Write-Host "Created: icon$iconSize.png"
}

Write-Host "All icons generated successfully!"
