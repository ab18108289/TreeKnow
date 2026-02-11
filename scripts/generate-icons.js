/**
 * 图标生成脚本
 * 使用方法：在项目根目录执行 node scripts/generate-icons.js
 * 需要安装 canvas 库：npm install canvas
 */

const fs = require('fs');
const path = require('path');

// 尝试使用 canvas 库（如果已安装）
let createCanvas;
try {
  createCanvas = require('canvas').createCanvas;
} catch (e) {
  console.log('canvas 库未安装，将生成简单的占位图标。');
  console.log('如需生成完整图标，请运行：npm install canvas');
  console.log('或者在浏览器中打开 icons/generate-icons.html 手动生成。\n');
  createCanvas = null;
}

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '..', 'icons');

function drawIcon(ctx, size) {
  const scale = size / 128;
  
  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1677FF');
  gradient.addColorStop(1, '#4096FF');
  
  // 圆角矩形背景
  const radius = 24 * scale;
  const margin = 8 * scale;
  
  ctx.beginPath();
  ctx.moveTo(margin + radius, margin);
  ctx.lineTo(size - margin - radius, margin);
  ctx.quadraticCurveTo(size - margin, margin, size - margin, margin + radius);
  ctx.lineTo(size - margin, size - margin - radius);
  ctx.quadraticCurveTo(size - margin, size - margin, size - margin - radius, size - margin);
  ctx.lineTo(margin + radius, size - margin);
  ctx.quadraticCurveTo(margin, size - margin, margin, size - margin - radius);
  ctx.lineTo(margin, margin + radius);
  ctx.quadraticCurveTo(margin, margin, margin + radius, margin);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // 绘制树形图标
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';
  ctx.lineWidth = 6 * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 主干
  ctx.beginPath();
  ctx.moveTo(64 * scale, 100 * scale);
  ctx.lineTo(64 * scale, 50 * scale);
  ctx.stroke();
  
  // 顶部圆
  ctx.beginPath();
  ctx.arc(64 * scale, 38 * scale, 14 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // 左分支
  ctx.beginPath();
  ctx.moveTo(64 * scale, 65 * scale);
  ctx.lineTo(40 * scale, 55 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(32 * scale, 50 * scale, 10 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // 右分支
  ctx.beginPath();
  ctx.moveTo(64 * scale, 65 * scale);
  ctx.lineTo(88 * scale, 55 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(96 * scale, 50 * scale, 10 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // 左下分支
  ctx.beginPath();
  ctx.moveTo(64 * scale, 80 * scale);
  ctx.lineTo(45 * scale, 85 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(38 * scale, 88 * scale, 8 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // 右下分支
  ctx.beginPath();
  ctx.moveTo(64 * scale, 80 * scale);
  ctx.lineTo(83 * scale, 85 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(90 * scale, 88 * scale, 8 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function generateSimpleIcon(size) {
  // 生成简单的蓝色方块作为占位符
  // PNG文件头 + IHDR + IDAT + IEND
  // 这是一个非常简单的纯蓝色PNG
  
  const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // 简化处理：创建一个最小的有效PNG
  // 使用zlib压缩的蓝色像素数据
  
  const width = size;
  const height = size;
  
  // 对于简单占位符，我们返回null，让用户使用HTML生成器
  return null;
}

async function main() {
  console.log('=== TreeKnow 图标生成器 ===\n');
  
  // 确保icons目录存在
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  if (createCanvas) {
    // 使用canvas生成图标
    for (const size of sizes) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      drawIcon(ctx, size);
      
      const buffer = canvas.toBuffer('image/png');
      const filename = path.join(iconsDir, `icon${size}.png`);
      
      fs.writeFileSync(filename, buffer);
      console.log(`✓ 已生成 icon${size}.png`);
    }
    
    console.log('\n所有图标生成完成！');
  } else {
    console.log('请使用以下方法之一生成图标：\n');
    console.log('方法1：在浏览器中打开 icons/generate-icons.html');
    console.log('方法2：安装canvas库后重新运行此脚本');
    console.log('       npm install canvas');
    console.log('       node scripts/generate-icons.js');
  }
}

main().catch(console.error);
