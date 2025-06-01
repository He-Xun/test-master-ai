/**
 * 发布前数据清理脚本
 * 此脚本用于在构建发布版本前清理测试数据和默认配置
 */

const fs = require('fs');
const path = require('path');
const SQL = require('sql.js');

console.log('🧹 开始清理发布版本数据...');

// 清理 SQLite 数据库模板
async function cleanSQLiteTemplate() {
  try {
    console.log('正在清理 SQLite 数据库模板...');
    
    // 加载 SQL.js
    const SQL = require('sql.js');
    const sqlPromise = SQL();
    const sql = await sqlPromise;
    
    // 创建一个全新的空数据库
    const db = new sql.Database();
    
    // 创建必要的表结构但不包含任何数据
    const tables = [
      // 用户表
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        avatar TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      
      // 用户会话表
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // 用户密码表
      `CREATE TABLE IF NOT EXISTS user_passwords (
        user_id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // 提示词表
      `CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // API配置表
      `CREATE TABLE IF NOT EXISTS api_configs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        request_mode TEXT NOT NULL,
        direct_url TEXT,
        api_key TEXT,
        base_url TEXT,
        models TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // 测试会话历史表
      `CREATE TABLE IF NOT EXISTS test_session_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_name TEXT NOT NULL,
        test_params TEXT NOT NULL,
        results TEXT NOT NULL,
        status TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        total_tests INTEGER NOT NULL,
        success_count INTEGER NOT NULL,
        error_count INTEGER NOT NULL,
        average_duration REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // 配置暂存表
      `CREATE TABLE IF NOT EXISTS config_drafts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        draft_type TEXT NOT NULL,
        data TEXT NOT NULL,
        last_modified TEXT NOT NULL,
        auto_saved INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    // 创建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_configs_user_id ON api_configs (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON test_session_history (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_history_created_at ON test_session_history (created_at)',
      'CREATE INDEX IF NOT EXISTS idx_config_drafts_user_id ON config_drafts (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_config_drafts_type ON config_drafts (draft_type)'
    ];

    // 创建表结构
    tables.forEach(sql => db.run(sql));
    indexes.forEach(sql => db.run(sql));
    
    // 导出空数据库
    const data = db.export();
    const buffer = Buffer.from(data);
    
    // 确保build目录存在
    const buildDir = path.join(__dirname, '../build');
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(path.join(buildDir, 'api_test_tool.db'), buffer);
    console.log('✅ SQLite 数据库模板已清理');
  } catch (error) {
    console.error('❌ 清理 SQLite 数据库失败:', error);
  }
}

// 清理版本常量文件中的版本历史
function updateVersionConstants() {
  try {
    console.log('正在更新版本信息...');
    const versionFilePath = path.join(__dirname, '../src/constants/version.ts');
    
    if (fs.existsSync(versionFilePath)) {
      // 读取package.json获取当前版本
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
      const currentVersion = packageJson.version;
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // 创建新的版本文件内容
      const versionContent = `// 应用版本信息
export const APP_VERSION = '${currentVersion}';
export const BUILD_DATE = '${currentDate}';
export const APP_NAME = '智测师 TestMaster AI';

// 更新检查配置
export const UPDATE_CHECK_URL = 'https://api.github.com/repos/your-repo/releases/latest'; // 示例URL
export const RELEASE_NOTES_URL = 'https://github.com/your-repo/releases'; // 待配置

// 版本历史
export const VERSION_HISTORY = [
  { version: '${currentVersion}', date: '${currentDate}', type: '正式版' },
];
`;
      
      // 写入文件
      fs.writeFileSync(versionFilePath, versionContent, 'utf8');
      console.log(`✅ 版本信息已更新为 ${currentVersion} (${currentDate})`);
    } else {
      console.log('⚠️ 版本文件不存在，跳过更新');
    }
  } catch (error) {
    console.error('❌ 更新版本信息失败:', error);
  }
}

// 执行所有清理任务
async function runCleanupTasks() {
  try {
    await cleanSQLiteTemplate();
    updateVersionConstants();
    
    console.log('✅ 所有数据清理任务已完成');
  } catch (error) {
    console.error('❌ 数据清理过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行清理脚本
runCleanupTasks(); 