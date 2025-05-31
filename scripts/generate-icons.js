const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 图标生成脚本启动...');

// 项目根目录
const projectRoot = path.resolve(__dirname, '..');
const iconDir = path.join(projectRoot, 'electron');
const pngIcon = path.join(iconDir, 'icon.png');
const icoIcon = path.join(iconDir, 'icon.ico');

// 检查PNG文件是否存在
if (!fs.existsSync(pngIcon)) {
  console.error('❌ PNG图标文件不存在:', pngIcon);
  process.exit(1);
}

console.log('📂 找到PNG图标文件:', pngIcon);

// 备份原有的ico文件（如果存在）
if (fs.existsSync(icoIcon)) {
  const backupPath = icoIcon + '.backup.' + Date.now();
  fs.copyFileSync(icoIcon, backupPath);
  console.log('💾 备份原有ico文件到:', backupPath);
}

try {
  // 方案1: 尝试使用convert (ImageMagick)
  console.log('🔄 尝试使用ImageMagick转换...');
  execSync(`convert "${pngIcon}" -define icon:auto-resize=256,128,64,48,32,16 "${icoIcon}"`, { stdio: 'ignore' });
  console.log('✅ 使用ImageMagick成功生成ICO文件');
} catch (error) {
  try {
    // 方案2: 尝试使用sips (macOS)
    console.log('🔄 尝试使用sips转换...');
    execSync(`sips -s format microsoft-icon "${pngIcon}" --out "${icoIcon}"`, { stdio: 'ignore' });
    console.log('✅ 使用sips成功生成ICO文件');
  } catch (error2) {
    try {
      // 方案3: 使用在线工具的方式，创建简单的ICO文件
      console.log('🔄 使用备用方案生成ICO...');
      
      // 创建一个简单的ICO文件头（基于PNG数据）
      const pngData = fs.readFileSync(pngIcon);
      const icoHeader = Buffer.alloc(22); // ICO header + directory entry
      
      // ICO header
      icoHeader.writeUInt16LE(0, 0);     // Reserved (0)
      icoHeader.writeUInt16LE(1, 2);     // Type (1 = ICO)
      icoHeader.writeUInt16LE(1, 4);     // Number of images
      
      // Directory entry  
      icoHeader.writeUInt8(0, 6);        // Width (0 = 256)
      icoHeader.writeUInt8(0, 7);        // Height (0 = 256)
      icoHeader.writeUInt8(0, 8);        // Colors (0 = auto)
      icoHeader.writeUInt8(0, 9);        // Reserved
      icoHeader.writeUInt16LE(1, 10);    // Planes
      icoHeader.writeUInt16LE(32, 12);   // Bits per pixel
      icoHeader.writeUInt32LE(pngData.length, 14); // Size of PNG data
      icoHeader.writeUInt32LE(22, 18);   // Offset to PNG data
      
      // 组合ICO文件
      const icoData = Buffer.concat([icoHeader, pngData]);
      fs.writeFileSync(icoIcon, icoData);
      
      console.log('✅ 使用备用方案成功生成ICO文件');
    } catch (error3) {
      console.error('❌ 所有方案都失败了，暂时复制PNG文件为ICO:');
      console.error('  ImageMagick:', error.message);
      console.error('  sips:', error2.message);
      console.error('  备用方案:', error3.message);
      
      // 最后的备用方案：复制PNG文件
      fs.copyFileSync(pngIcon, icoIcon);
      console.log('⚠️  暂时使用PNG文件作为ICO（可能有兼容性问题）');
    }
  }
}

// 验证生成的文件
if (fs.existsSync(icoIcon)) {
  const stats = fs.statSync(icoIcon);
  console.log(`📊 生成的ICO文件大小: ${stats.size} bytes`);
  
  // 简单验证ICO文件头
  const buffer = fs.readFileSync(icoIcon);
  const isValidIco = buffer.length >= 6 && 
                     buffer.readUInt16LE(0) === 0 && 
                     buffer.readUInt16LE(2) === 1;
  
  if (isValidIco) {
    console.log('✅ ICO文件格式验证通过');
  } else {
    console.log('⚠️  ICO文件格式可能不正确，但文件已生成');
  }
} else {
  console.error('❌ ICO文件生成失败');
  process.exit(1);
}

console.log('🎉 图标生成完成！'); 