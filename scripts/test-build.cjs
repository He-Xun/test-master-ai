#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 测试构建配置...');

// 检查必要文件
const requiredFiles = [
  'package.json',
  'electron/icon.ico',
  'electron/icon.icns',
  'dist/main.js'
];

console.log('\n📁 检查必要文件:');
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
  }
}

// 检查构建目录
console.log('\n📂 检查构建目录:');
if (fs.existsSync('build')) {
  const buildFiles = fs.readdirSync('build');
  console.log(`✅ build/ (${buildFiles.length} 个文件)`);
  console.log(`   主要文件: ${buildFiles.slice(0, 5).join(', ')}${buildFiles.length > 5 ? '...' : ''}`);
} else {
  console.log('❌ build/ 目录不存在');
}

// 测试electron-builder配置
console.log('\n🔧 测试electron-builder配置:');
exec('npx electron-builder --help', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ electron-builder 不可用:', error.message);
    return;
  }
  console.log('✅ electron-builder 可用');
  
  // 验证Windows配置
  console.log('\n🪟 验证Windows构建配置:');
  const env = {
    ...process.env,
    CSC_LINK: '',
    WIN_CSC_LINK: '',
    CSC_KEY_PASSWORD: '',
    CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    DEBUG: 'electron-builder'
  };
  
  exec('npx electron-builder --win --dir --publish never', { env }, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Windows构建测试失败:', error.message);
      console.log('stderr:', stderr);
    } else {
      console.log('✅ Windows构建配置有效');
    }
  });
});

console.log('\n💡 如果遇到问题，请检查:');
console.log('   1. Node版本是否 >= 20');
console.log('   2. 是否已运行 npm run build');
console.log('   3. 环境变量配置是否正确'); 