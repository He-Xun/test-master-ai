const fs = require('fs');
const path = require('path');

console.log('🔧 构建优化脚本启动...');

// 项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 需要清理的大文件和目录
const filesToCleanup = [
  // node_modules中的大文件
  'node_modules/playwright',
  'node_modules/puppeteer',
  'node_modules/@playwright',
  'node_modules/@types/puppeteer',
  'node_modules/chromium-bidi',
  
  // 开发依赖的文件
  'node_modules/electron/dist',
  'node_modules/electron-builder',
  
  // 测试和文档文件
  'node_modules/**/test',
  'node_modules/**/tests', 
  'node_modules/**/example',
  'node_modules/**/examples',
  'node_modules/**/*.md',
  'node_modules/**/README*',
  'node_modules/**/CHANGELOG*',
  
  // 缓存和临时文件
  'node_modules/**/.cache',
  'node_modules/**/coverage',
  'node_modules/**/*.log',
];

// 递归删除函数
function removeRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  try {
    const stats = fs.statSync(dirPath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        removeRecursive(path.join(dirPath, file));
      });
      fs.rmdirSync(dirPath);
      console.log(`🗑️  删除目录: ${dirPath}`);
    } else {
      fs.unlinkSync(dirPath);
      console.log(`🗑️  删除文件: ${dirPath}`);
    }
  } catch (error) {
    console.log(`⚠️  跳过: ${dirPath} (${error.message})`);
  }
}

// glob模式匹配
function glob(pattern, baseDir = projectRoot) {
  const regex = new RegExp(pattern.replace(/\*/g, '[^/]*').replace(/\*\*/g, '.*'));
  const results = [];
  
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (regex.test(relativePath)) {
        results.push(fullPath);
      }
      
      if (!fs.existsSync(fullPath)) return;
      
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory() && !relativePath.includes('node_modules/.bin')) {
          walk(fullPath);
        }
      } catch (error) {
        console.log(`⚠️  跳过文件访问: ${fullPath} (${error.message})`);
      }
    });
  }
  
  walk(baseDir);
  return results;
}

console.log('📊 构建前大小统计...');
function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  
  let size = 0;
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        
        // 检查文件是否仍然存在
        if (!fs.existsSync(fullPath)) return;
        
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            walk(fullPath);
          } else {
            size += stats.size;
          }
        } catch (error) {
          // 忽略无法访问的文件
          console.log(`⚠️  无法计算文件大小: ${fullPath}`);
        }
      });
    } catch (error) {
      console.log(`⚠️  无法读取目录: ${dir}`);
    }
  }
  
  try {
    walk(dirPath);
  } catch (error) {
    console.log(`无法计算目录大小: ${dirPath}`);
  }
  
  return size;
}

const beforeSize = getDirectorySize(path.join(projectRoot, 'node_modules'));
console.log(`构建前 node_modules 大小: ${(beforeSize / 1024 / 1024).toFixed(2)} MB`);

// 执行清理
console.log('🧹 开始清理不必要的文件...');
let cleanedCount = 0;

filesToCleanup.forEach(pattern => {
  if (pattern.includes('*')) {
    // 处理通配符模式
    const matches = glob(pattern);
    matches.forEach(match => {
      removeRecursive(match);
      cleanedCount++;
    });
  } else {
    // 处理具体路径
    const fullPath = path.join(projectRoot, pattern);
    if (fs.existsSync(fullPath)) {
      removeRecursive(fullPath);
      cleanedCount++;
    }
  }
});

const afterSize = getDirectorySize(path.join(projectRoot, 'node_modules'));
const savedSize = beforeSize - afterSize;

console.log(`\n📊 清理完成！`);
console.log(`清理后 node_modules 大小: ${(afterSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`节省空间: ${(savedSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`清理文件/目录数量: ${cleanedCount}`);

// 创建.electron-builder-cleanup标记文件
fs.writeFileSync(path.join(projectRoot, '.electron-builder-cleanup'), 'cleaned');
console.log('✅ 构建优化完成！'); 