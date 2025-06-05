const fs = require('fs');
const path = require('path');

console.log('🔧 构建优化脚本启动...');

// 项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 需要清理的大文件和目录
const filesToCleanup = [
  // 大型测试和浏览器下载工具（完全删除）
  'node_modules/playwright',
  'node_modules/puppeteer',
  'node_modules/@playwright',
  'node_modules/@types/puppeteer',
  'node_modules/chromium-bidi',
  
  // 清理electron的dist文件但保留主要文件
  'node_modules/electron/dist',
  
  // 只清理文档文件，保留所有.js文件
  'node_modules/**/README*',
  'node_modules/**/CHANGELOG*',
  'node_modules/**/CONTRIBUTING*',
  'node_modules/**/HISTORY*',
  'node_modules/**/LICENSE*',
  'node_modules/**/SECURITY*',
  'node_modules/**/*.md',
  
  // 清理测试目录但保留src和lib
  'node_modules/**/test',
  'node_modules/**/tests', 
  'node_modules/**/example',
  'node_modules/**/examples',
  
  // 缓存和临时文件
  'node_modules/**/.cache',
  'node_modules/**/coverage',
  'node_modules/**/*.log',
];

// 严格保护的构建关键目录 - 这些目录中的.js文件绝对不能删除
const protectedDirs = [
  'node_modules/electron-builder',
  'node_modules/builder-util',
  'node_modules/app-builder-lib',
  'node_modules/electron-publish',
  'node_modules/electron-builder-squirrel-windows',
  'node_modules/dmg-builder',
  'node_modules/nsis-builder',
];

// 递归删除函数 - 增加保护检查
function removeRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  // 检查是否在保护目录中且是.js文件
  const isProtected = protectedDirs.some(protectedDir => {
    const fullProtectedPath = path.join(projectRoot, protectedDir);
    return dirPath.startsWith(fullProtectedPath) && 
           (dirPath.endsWith('.js') || dirPath.endsWith('.js.map'));
  });
  
  if (isProtected) {
    console.log(`🛡️  保护文件跳过删除: ${dirPath}`);
    return;
  }
  
  try {
    const stats = fs.statSync(dirPath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        removeRecursive(path.join(dirPath, file));
      });
      // 只删除空目录
      try {
        fs.rmdirSync(dirPath);
        console.log(`🗑️  删除空目录: ${dirPath}`);
      } catch (error) {
        // 目录不为空，跳过
        console.log(`⚠️  目录不为空，跳过: ${dirPath}`);
      }
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