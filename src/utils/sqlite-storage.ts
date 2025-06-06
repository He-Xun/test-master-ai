import { 
  User, 
  UserSession, 
  Prompt, 
  ApiConfig, 
  TestSessionHistory, 
  ConfigDraft,
  TestConfigDraft,
  TestParams,
  TestResult,
  UserRole,
  DefaultTestInput
} from '../types';

// 环境检测
const isElectron = (): boolean => {
  return !!(window as any).electron || navigator.userAgent.includes('Electron');
};

// SQLite数据库管理器 - 支持Electron和浏览器环境
class SQLiteStorage {
  private db: any = null;
  private isInitialized = false;
  private dbName = 'api_test_tool.db';
  private SQL: any = null;
  private initializePromise: Promise<void> | null = null;
  private environment: 'electron' | 'browser' = 'browser';

  constructor() {
    this.environment = isElectron() ? 'electron' : 'browser';
    console.log(`[SQLite] 🔍 检测到运行环境: ${this.environment}`);
  }

  // 初始化数据库 - 根据环境选择最佳策略
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializePromise) {
      console.log('[SQLite] 检测到重复初始化调用，等待现有初始化完成...');
      return this.initializePromise;
    }
    this.initializePromise = this._performInitialization();
    try {
      await this.initializePromise;
    } finally {
      this.initializePromise = null;
    }
  }

  // 实际的初始化逻辑 - 环境自适应
  private async _performInitialization(): Promise<void> {
    try {
      console.log(`[SQLite] 🚀 开始 ${this.environment} 环境数据库初始化...`);
      if (this.environment === 'electron') {
        await this.initializeElectronSQLite();
      } else {
        await this.initializeBrowserSQLite();
      }
      // 优先从IndexedDB加载快照
      let dbData = await this.loadDatabaseFromIndexedDB();
      if (dbData) {
        this.db = new this.SQL.Database(new Uint8Array(dbData));
        console.log('[SQLite] 已从IndexedDB加载数据库');
      } else {
        this.db = new this.SQL.Database();
        console.log('[SQLite] 新建空数据库');
      }
      await this.createTables();
      this.isInitialized = true;
      console.log(`[SQLite] 🎉 ${this.environment} 环境数据库初始化完成！`);
    } catch (error) {
      console.error(`[SQLite] ❌ ${this.environment} 环境数据库初始化失败:`, error);
      this.isInitialized = false;
      throw error;
    }
  }

  // Electron环境的SQLite初始化
  private async initializeElectronSQLite(): Promise<void> {
    console.log('[SQLite] 🖥️ 使用Electron原生SQLite初始化...');
    
    try {
      // 在Electron中，优先使用本地资源
      console.log('[SQLite] 📁 加载Electron本地sql.js资源...');
      
      // 方案1：直接引入sql.js（Electron打包时包含）
      const sqljs = await import('sql.js');
      if (sqljs.default) {
        this.SQL = await sqljs.default({
          locateFile: (file: string) => {
            // 优先使用 preload 注入的 wasmHelper
            if (typeof window !== 'undefined' && (window as any).wasmHelper && typeof (window as any).wasmHelper.getWasmPath === 'function') {
              const url = (window as any).wasmHelper.getWasmPath(file);
              console.log(`[SQLite] 🖥️ Electron环境定位文件 ${file} 到:`, url);
              return url;
            }
            // 彻底兼容 Electron 打包环境，优先用 process.resourcesPath
            if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
              try {
                const path = require('path');
                const wasmPath = path.join((process as any).resourcesPath, 'public', file);
                const url = `file://${wasmPath}`;
                console.log(`[SQLite] 🖥️ Electron环境定位文件 ${file} 到:`, url);
                return url;
              } catch (e) {
                console.warn('[SQLite] Electron wasm 路径自动适配失败，回退 /sql-wasm.wasm', e);
                return `/sql-wasm.wasm`;
              }
            }
            // 浏览器或 dev server
            const publicPath = `/sql-wasm.wasm`;
            console.log(`[SQLite] 🖥️ Electron环境定位文件 ${file} 到:`, publicPath);
            return publicPath;
          }
        });
        console.log('[SQLite] ✅ Electron原生sql.js加载成功');
        return;
      }
    } catch (electronError) {
      console.log('[SQLite] ⚠️ Electron原生方式失败，使用通用方式:', electronError);
    }

    // 回退到通用浏览器方式
    await this.initializeBrowserSQLite();
  }

  // 浏览器环境的SQLite初始化
  private async initializeBrowserSQLite(): Promise<void> {
    console.log('[SQLite] 🌐 使用浏览器通用SQLite初始化...');
    
    let initSqlJs: any;
    
    try {
      // 使用简化的CDN方式，避免复杂的本地文件加载
      console.log('[SQLite] 🌐 使用CDN方式加载sql.js...');
      
      // 动态加载sql.js
      const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js');
      if (!response.ok) {
        throw new Error(`CDN加载失败: ${response.status}`);
      }
      
      const jsCode = await response.text();
      
      // 安全地执行JavaScript代码
      const scriptElement = document.createElement('script');
      scriptElement.textContent = jsCode;
      document.head.appendChild(scriptElement);
      
      // 等待initSqlJs在全局作用域中可用
      let attempts = 0;
      const maxAttempts = 50; // 5秒超时
      
      while (attempts < maxAttempts) {
        // @ts-ignore
        if (typeof window.initSqlJs === 'function') {
          // @ts-ignore
          initSqlJs = window.initSqlJs;
          console.log('[SQLite] ✅ CDN方式加载成功');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!initSqlJs) {
        throw new Error('CDN加载超时，initSqlJs未在全局作用域中找到');
      }
      
    } catch (cdnError: any) {
      console.log('[SQLite] ❌ CDN加载失败，尝试npm包方式:', cdnError);
      
      try {
        // 备选方案：直接导入npm包（适用于开发环境）
        const sqljs = await import('sql.js');
        initSqlJs = sqljs.default || sqljs;
        console.log('[SQLite] ✅ npm包方式加载成功');
      } catch (npmError: any) {
        console.error('[SQLite] ❌ 所有加载方式都失败:', npmError);
        throw new Error(`SQL.js加载失败: CDN(${cdnError.message}) 和 NPM(${npmError.message})`);
      }
    }

    // 初始化SQL.js
    console.log('[SQLite] ⚙️ 开始初始化SQL.js...');
    
    const initPromise = initSqlJs({
      locateFile: (file: string) => {
        // 使用CDN地址
        const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`;
        console.log(`[SQLite] 🌐 定位文件 ${file} 到:`, cdnPath);
        return cdnPath;
      }
    });

    // 设置超时
    const timeoutMs = 20000; // 20秒超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`SQL.js初始化超时（${timeoutMs/1000}秒）`)), timeoutMs);
    });

    try {
      this.SQL = await Promise.race([initPromise, timeoutPromise]);
      console.log('[SQLite] ✅ SQL.js初始化成功');
    } catch (initError) {
      console.error('[SQLite] ❌ SQL.js初始化失败:', initError);
      throw initError;
    }
  }

  // 获取环境信息
  getEnvironmentInfo(): {
    environment: 'electron' | 'browser';
    isInitialized: boolean;
    dbName: string;
    performance: 'fast' | 'slow';
  } {
    return {
      environment: this.environment,
      isInitialized: this.isInitialized,
      dbName: this.dbName,
      performance: this.environment === 'electron' ? 'fast' : 'slow'
    };
  }

  // 创建数据库表
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

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
      
      // 用户密码表（简化实现）
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
        provider TEXT,
        models TEXT NOT NULL, -- JSON字符串
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // 测试会话历史表
      `CREATE TABLE IF NOT EXISTS test_session_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_name TEXT NOT NULL,
        test_params TEXT NOT NULL, -- JSON字符串
        results TEXT NOT NULL, -- JSON字符串
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
        data TEXT NOT NULL, -- JSON字符串
        last_modified TEXT NOT NULL,
        auto_saved INTEGER NOT NULL, -- 0 or 1
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      
      // 默认输入模板表
      `CREATE TABLE IF NOT EXISTS default_test_inputs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
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

    try {
      // 创建表
      for (const sql of tables) {
        this.db.run(sql);
      }
      
      // 创建索引
      for (const sql of indexes) {
        this.db.run(sql);
      }
      
      // 自动补充provider字段（兼容老表）
      try {
        const columns = this.db.exec("PRAGMA table_info(api_configs)")[0].values.map((row: any[]) => row[1]);
        if (!columns.includes('provider')) {
          this.db.run('ALTER TABLE api_configs ADD COLUMN provider TEXT');
          console.log('[SQLite] 自动补充provider字段成功');
        }
      } catch (e) {
        console.warn('[SQLite] 检查/补充provider字段失败', e);
      }
      
      console.log('[SQLite] 数据库表创建完成');
    } catch (error) {
      console.error('[SQLite] 创建表失败:', error);
      throw error;
    }
  }

  // 从localStorage迁移数据
  private async migrateFromLocalStorage(): Promise<void> {
    if (!this.db) return;

    try {
      console.log('[SQLite] 开始迁移localStorage数据...');
      
      // 检查是否已经迁移过
      const migrationCheck = this.db.exec("SELECT COUNT(*) as count FROM users");
      if (migrationCheck.length > 0 && migrationCheck[0].values[0] && Number(migrationCheck[0].values[0][0]) > 0) {
        console.log('[SQLite] 数据库已有数据，跳过迁移');
        return;
      }

      // 迁移用户数据
      const allUsers = localStorage.getItem('allUsers');
      if (allUsers) {
        const users = JSON.parse(allUsers);
        for (const user of users) {
          this.createUser(user);
          
          // 迁移密码
          const password = localStorage.getItem(`pwd_${user.id}`);
          if (password) {
            this.db.run(
              'INSERT OR REPLACE INTO user_passwords (user_id, password_hash) VALUES (?, ?)',
              [user.id, password]
            );
          }
        }
      }

      // 迁移当前用户的数据
      const currentSession = localStorage.getItem('userSession');
      if (currentSession) {
        const session = JSON.parse(currentSession);
        const userId = session.user?.id;
        
        if (userId) {
          // 迁移提示词
          const prompts = localStorage.getItem(`${userId}_prompts`) || localStorage.getItem('prompts');
          if (prompts) {
            const promptList = JSON.parse(prompts);
            for (const prompt of promptList) {
              this.createPrompt(userId, prompt);
            }
          }

          // 迁移API配置
          const apiConfigs = localStorage.getItem(`${userId}_apiConfigs`) || localStorage.getItem('apiConfigs');
          if (apiConfigs) {
            const configList = JSON.parse(apiConfigs);
            for (const config of configList) {
              this.createApiConfig(userId, config);
            }
          }
        }
      }

      await this.saveDatabaseToIndexedDB();
      console.log('[SQLite] localStorage数据迁移完成');
      
    } catch (error) {
      console.error('[SQLite] 数据迁移失败:', error);
    }
  }

  // 保存数据库到IndexedDB
  private async saveDatabaseToIndexedDB(): Promise<void> {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const request = indexedDB.open('ApiTestToolDB', 1);
      
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['database'], 'readwrite');
          const store = transaction.objectStore('database');
          store.put(data, this.dbName);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('database')) {
            db.createObjectStore('database');
          }
        };
      });
    } catch (error) {
      console.error('[SQLite] 保存数据库失败:', error);
    }
  }

  // 从IndexedDB加载数据库
  private async loadDatabaseFromIndexedDB(): Promise<Uint8Array | null> {
    try {
      const request = indexedDB.open('ApiTestToolDB', 1);
      
      return new Promise((resolve, reject) => {
        request.onerror = () => resolve(null);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('database')) {
            resolve(null);
            return;
          }
          
          const transaction = db.transaction(['database'], 'readonly');
          const store = transaction.objectStore('database');
          const getRequest = store.get(this.dbName);
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result || null);
          };
          getRequest.onerror = () => resolve(null);
        };
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('database')) {
            db.createObjectStore('database');
          }
        };
      });
    } catch (error) {
      console.error('[SQLite] 加载数据库失败:', error);
      return null;
    }
  }

  // 获取当前用户ID
  private getCurrentUserId(): string | null {
    if (!this.db) return null;
    
    try {
      const result = this.db.exec(`
        SELECT user_id FROM user_sessions 
        WHERE expires_at > datetime('now') 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0] as string;
      }
      return null;
    } catch {
      return null;
    }
  }

  // 生成ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 用户管理方法
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    if (!this.db) throw new Error('数据库未初始化');

    const user: User = {
      ...userData,
      role: userData.role || 'user', // 默认角色为普通用户
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.run(`
      INSERT INTO users (id, username, email, role, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user.id, user.username, user.email, user.role, user.avatar || null, user.createdAt, user.updatedAt]);

    await this.saveDatabaseToIndexedDB();
    return user;
  }

  getAllUsers(): User[] {
    if (!this.db) return [];

    try {
      const result = this.db.exec('SELECT * FROM users ORDER BY created_at DESC');
      if (result.length === 0) return [];

      return result[0].values.map((row: any[]) => ({
        id: row[0] as string,
        username: row[1] as string,
        email: row[2] as string,
        role: (row[3] as UserRole) || 'user',
        avatar: row[4] as string,
        createdAt: row[5] as string,
        updatedAt: row[6] as string,
      }));
    } catch (error) {
      console.error('[SQLite] 获取用户列表失败:', error);
      return [];
    }
  }

  getUserByUsername(username: string): User | null {
    if (!this.db) return null;

    try {
      const result = this.db.exec('SELECT * FROM users WHERE username = ?', [username]);
      if (result.length === 0 || result[0].values.length === 0) return null;

      const row: any[] = result[0].values[0];
      return {
        id: row[0] as string,
        username: row[1] as string,
        email: row[2] as string,
        role: (row[3] as UserRole) || 'user',
        avatar: row[4] as string,
        createdAt: row[5] as string,
        updatedAt: row[6] as string,
      };
    } catch (error) {
      console.error('[SQLite] 查找用户失败:', error);
      return null;
    }
  }

  // 提示词管理
  createPrompt(userId: string, promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Prompt {
    if (!this.db) throw new Error('数据库未初始化');

    const prompt: Prompt = {
      ...promptData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.run(`
      INSERT INTO prompts (id, user_id, name, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [prompt.id, userId, prompt.name, prompt.content, prompt.createdAt, prompt.updatedAt]);

    this.saveDatabaseToIndexedDB();
    return prompt;
  }

  getPrompts(userId: string): Prompt[] {
    if (!this.db) return [];

    try {
      const result = this.db.exec(`
        SELECT id, name, content, created_at, updated_at 
        FROM prompts 
        WHERE user_id = ? 
        ORDER BY updated_at DESC
      `, [userId]);
      
      if (result.length === 0) return [];

      return result[0].values.map((row: any[]) => ({
        id: row[0] as string,
        name: row[1] as string,
        content: row[2] as string,
        createdAt: row[3] as string,
        updatedAt: row[4] as string,
      }));
    } catch (error) {
      console.error('[SQLite] 获取提示词失败:', error);
      return [];
    }
  }

  updatePrompt(userId: string, promptId: string, updates: Partial<Prompt>): boolean {
    if (!this.db) return false;

    try {
      const setClause: string[] = [];
      const values: any[] = [];
      
      if (updates.name) {
        setClause.push('name = ?');
        values.push(updates.name);
      }
      if (updates.content) {
        setClause.push('content = ?');
        values.push(updates.content);
      }
      
      setClause.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(userId, promptId);

      this.db.run(`
        UPDATE prompts 
        SET ${setClause.join(', ')} 
        WHERE user_id = ? AND id = ?
      `, values);

      this.saveDatabaseToIndexedDB();
      return true;
    } catch (error) {
      console.error('[SQLite] 更新提示词失败:', error);
      return false;
    }
  }

  deletePrompt(userId: string, promptId: string): boolean {
    if (!this.db) return false;

    try {
      this.db.run('DELETE FROM prompts WHERE user_id = ? AND id = ?', [userId, promptId]);
      this.saveDatabaseToIndexedDB();
      return true;
    } catch (error) {
      console.error('[SQLite] 删除提示词失败:', error);
      return false;
    }
  }

  // API配置管理
  createApiConfig(userId: string, configData: Omit<ApiConfig, 'id' | 'createdAt' | 'updatedAt'>): ApiConfig {
    if (!this.db) throw new Error('数据库未初始化');

    const config: ApiConfig = {
      ...configData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.run(`
      INSERT INTO api_configs (id, user_id, name, request_mode, direct_url, api_key, base_url, provider, models, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      config.id, userId, config.name, config.requestMode,
      config.directUrl || null, config.apiKey || null, config.baseUrl || null,
      config.provider || '',
      JSON.stringify(config.models), config.createdAt, config.updatedAt
    ]);

    this.saveDatabaseToIndexedDB();
    return config;
  }

  getApiConfigs(userId: string): ApiConfig[] {
    if (!this.db) return [];

    try {
      const result = this.db.exec(`
        SELECT id, name, request_mode, direct_url, api_key, base_url, provider, models, created_at, updated_at
        FROM api_configs 
        WHERE user_id = ? 
        ORDER BY updated_at DESC
      `, [userId]);
      
      if (result.length === 0) return [];

      return result[0].values.map((row: any[]) => ({
        id: row[0] as string,
        name: row[1] as string,
        requestMode: row[2] as 'url' | 'api',
        directUrl: row[3] as string,
        apiKey: row[4] as string,
        baseUrl: row[5] as string,
        provider: row[6] ?? '',
        models: JSON.parse(row[7] as string),
        createdAt: row[8] as string,
        updatedAt: row[9] as string,
      }));
    } catch (error) {
      console.error('[SQLite] 获取API配置失败:', error);
      return [];
    }
  }

  updateApiConfig(userId: string, configId: string, updates: Partial<ApiConfig>): boolean {
    if (!this.db) return false;

    try {
      const setClause: string[] = [];
      const values: any[] = [];
      
      if (updates.name) {
        setClause.push('name = ?');
        values.push(updates.name);
      }
      if (updates.requestMode) {
        setClause.push('request_mode = ?');
        values.push(updates.requestMode);
      }
      if (updates.directUrl !== undefined) {
        setClause.push('direct_url = ?');
        values.push(updates.directUrl);
      }
      if (updates.apiKey !== undefined) {
        setClause.push('api_key = ?');
        values.push(updates.apiKey);
      }
      if (updates.baseUrl !== undefined) {
        setClause.push('base_url = ?');
        values.push(updates.baseUrl);
      }
      if (updates.provider !== undefined) {
        setClause.push('provider = ?');
        values.push(updates.provider);
      }
      if (updates.models) {
        setClause.push('models = ?');
        values.push(JSON.stringify(updates.models));
      }
      
      setClause.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(userId, configId);

      this.db.run(`
        UPDATE api_configs 
        SET ${setClause.join(', ')} 
        WHERE user_id = ? AND id = ?
      `, values);

      this.saveDatabaseToIndexedDB();
      return true;
    } catch (error) {
      console.error('[SQLite] 更新API配置失败:', error);
      return false;
    }
  }

  deleteApiConfig(userId: string, configId: string): boolean {
    if (!this.db) return false;

    try {
      this.db.run('DELETE FROM api_configs WHERE user_id = ? AND id = ?', [userId, configId]);
      this.saveDatabaseToIndexedDB();
      return true;
    } catch (error) {
      console.error('[SQLite] 删除API配置失败:', error);
      return false;
    }
  }

  // 测试会话历史管理
  saveTestSessionHistory(userId: string, sessionData: Omit<TestSessionHistory, 'id' | 'userId' | 'createdAt'>): TestSessionHistory {
    if (!this.db) throw new Error('数据库未初始化');

    const session: TestSessionHistory = {
      ...sessionData,
      id: this.generateId(),
      userId,
      createdAt: new Date().toISOString(),
    };

    this.db.run(`
      INSERT INTO test_session_history (
        id, user_id, session_name, test_params, results, status,
        start_time, end_time, total_tests, success_count, error_count,
        average_duration, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      session.id, session.userId, session.sessionName,
      JSON.stringify(session.testParams), JSON.stringify(session.results),
      session.status, session.startTime, session.endTime,
      session.totalTests, session.successCount, session.errorCount,
      session.averageDuration, session.createdAt
    ]);

    this.saveDatabaseToIndexedDB();
    return session;
  }

  getTestSessionHistory(userId: string, limit: number = 50): TestSessionHistory[] {
    if (!this.db) return [];

    try {
      const result = this.db.exec(`
        SELECT * FROM test_session_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [userId, limit]);
      
      if (result.length === 0) return [];

      return result[0].values.map((row: any[]) => ({
        id: row[0] as string,
        userId: row[1] as string,
        sessionName: row[2] as string,
        testParams: JSON.parse(row[3] as string),
        results: JSON.parse(row[4] as string),
        status: row[5] as 'completed' | 'stopped' | 'error',
        startTime: row[6] as string,
        endTime: row[7] as string,
        totalTests: row[8] as number,
        successCount: row[9] as number,
        errorCount: row[10] as number,
        averageDuration: row[11] as number,
        createdAt: row[12] as string,
      }));
    } catch (error) {
      console.error('[SQLite] 获取测试历史失败:', error);
      return [];
    }
  }

  deleteTestSessionHistory(userId: string, sessionId: string): boolean {
    if (!this.db) return false;

    try {
      this.db.run('DELETE FROM test_session_history WHERE user_id = ? AND id = ?', [userId, sessionId]);
      this.saveDatabaseToIndexedDB();
      return true;
    } catch (error) {
      console.error('[SQLite] 删除测试历史失败:', error);
      return false;
    }
  }

  // 配置暂存管理
  saveConfigDraft(userId: string, draftType: string, data: any): void {
    if (!this.db) return;

    try {
      // 先删除同类型的旧暂存
      this.db.run('DELETE FROM config_drafts WHERE user_id = ? AND draft_type = ?', [userId, draftType]);
      
      // 插入新暂存
      const draft: ConfigDraft = {
        id: this.generateId(),
        userId,
        draftType: draftType as any,
        data,
        lastModified: new Date().toISOString(),
        autoSaved: true,
      };

      this.db.run(`
        INSERT INTO config_drafts (id, user_id, draft_type, data, last_modified, auto_saved)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [draft.id, draft.userId, draft.draftType, JSON.stringify(draft.data), draft.lastModified, 1]);

      this.saveDatabaseToIndexedDB();
    } catch (error) {
      console.error('[SQLite] 保存配置暂存失败:', error);
    }
  }

  getConfigDraft(userId: string, draftType: string): any | null {
    if (!this.db) return null;

    try {
      const result = this.db.exec(`
        SELECT data FROM config_drafts 
        WHERE user_id = ? AND draft_type = ? 
        ORDER BY last_modified DESC 
        LIMIT 1
      `, [userId, draftType]);
      
      if (result.length === 0 || result[0].values.length === 0) return null;
      
      return JSON.parse(result[0].values[0][0] as string);
    } catch (error) {
      console.error('[SQLite] 获取配置暂存失败:', error);
      return null;
    }
  }

  clearConfigDraft(userId: string, draftType: string): void {
    if (!this.db) return;

    try {
      this.db.run('DELETE FROM config_drafts WHERE user_id = ? AND draft_type = ?', [userId, draftType]);
      this.saveDatabaseToIndexedDB();
    } catch (error) {
      console.error('[SQLite] 清除配置暂存失败:', error);
    }
  }

  // 用户会话管理
  getCurrentSession(): UserSession | null {
    if (!this.db) return null;
    try {
      const result = (this.db.exec('SELECT * FROM user_sessions ORDER BY created_at DESC LIMIT 1') as any);
      if (result.length === 0 || result[0].values.length === 0) return null;
      const row: any[] = result[0].values[0];
      const user = this.getUserById(row[1] as string);
      if (!user) return null;
      return {
        user,
        token: row[2] as string,
        expiresAt: row[3] as string,
      };
    } catch (error) {
      console.error('[SQLite] 获取当前会话失败:', error);
      return null;
    }
  }

  setSession(session: UserSession | null): void {
    if (!this.db) return;
    try {
      // 清空旧会话
      (this.db.run as any)('DELETE FROM user_sessions');
      if (session) {
        (this.db.run as any)(
          'INSERT INTO user_sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
          [session.user.id, session.user.id, session.token, session.expiresAt, new Date().toISOString()]
        );
      }
      this.saveDatabaseToIndexedDB();
    } catch (error) {
      console.error('[SQLite] 设置会话失败:', error);
    }
  }

  login(username: string, password: string): UserSession | null {
    if (!this.db) return null;
    try {
      // 验证用户密码
      const user = this.validateUser(username, password);
      if (!user) {
        console.log('[SQLite] 用户验证失败:', username);
        return null;
      }
      
      const session: UserSession = {
        user,
        token: this.generateId(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      };
      this.setSession(session);
      console.log('[SQLite] 用户登录成功:', user.username);
      return session;
    } catch (error) {
      console.error('[SQLite] 登录失败:', error);
      return null;
    }
  }

  logout(): void {
    if (!this.db) return;
    try {
      (this.db.run as any)('DELETE FROM user_sessions');
      this.saveDatabaseToIndexedDB();
    } catch (error) {
      console.error('[SQLite] 登出失败:', error);
    }
  }

  isSessionValid(): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;
    
    try {
      const now = new Date();
      const expires = new Date(session.expiresAt);
      const isValid = now < expires;
      
      console.log('[SQLite] 会话验证:', {
        now: now.toISOString(),
        expires: session.expiresAt,
        isValid: isValid,
        timeDiff: expires.getTime() - now.getTime()
      });
      
      return isValid;
    } catch (error) {
      console.error('[SQLite] 会话验证失败:', error);
      return false;
    }
  }

  getUserById(userId: string): User | null {
    if (!this.db) return null;
    try {
      const result = (this.db.exec('SELECT * FROM users WHERE id = ?', [userId]) as any);
      if (result.length === 0 || result[0].values.length === 0) return null;
      const row: any[] = result[0].values[0];
      return {
        id: row[0] as string,
        username: row[1] as string,
        email: row[2] as string,
        role: (row[3] as UserRole) || 'user',
        avatar: row[4] as string,
        createdAt: row[5] as string,
        updatedAt: row[6] as string,
      };
    } catch (error) {
      return null;
    }
  }

  // 用户密码校验
  validateUser(username: string, password: string): User | null {
    if (!this.db) return null;
    try {
      const user = this.getUserByUsername(username);
      if (!user) return null;
      const result = this.db.exec('SELECT password_hash FROM user_passwords WHERE user_id = ?', [user.id]);
      if (result.length === 0 || result[0].values.length === 0) return null;
      const hash = result[0].values[0][0] as string;
      // 简单明文比对，实际应加密
      if (hash === password) return user;
      return null;
    } catch (error) {
      return null;
    }
  }

  // 存储用户密码
  async storeUserPassword(userId: string, password: string): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');
    try {
      this.db.run('INSERT OR REPLACE INTO user_passwords (user_id, password_hash) VALUES (?, ?)', [userId, password]);
      await this.saveDatabaseToIndexedDB();
    } catch (error) {
      // 忽略
    }
  }

  // 更新用户信息
  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    if (!this.db) return false;

    try {
      const setClause: string[] = [];
      const values: any[] = [];
      
      if (updates.username) {
        setClause.push('username = ?');
        values.push(updates.username);
      }
      if (updates.email) {
        setClause.push('email = ?');
        values.push(updates.email);
      }
      if (updates.role) {
        setClause.push('role = ?');
        values.push(updates.role);
      }
      if (updates.avatar !== undefined) {
        setClause.push('avatar = ?');
        values.push(updates.avatar);
      }
      
      setClause.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(userId);

      this.db.run(`
        UPDATE users 
        SET ${setClause.join(', ')} 
        WHERE id = ?
      `, values);

      await this.saveDatabaseToIndexedDB();
      return true;
    } catch (error) {
      console.error('[SQLite] 更新用户失败:', error);
      return false;
    }
  }

  // 删除用户及其所有相关数据
  async deleteUser(userId: string): Promise<boolean> {
    if (!this.db) throw new Error('数据库未初始化');

    try {
      // 开始事务（模拟）
      this.db.run('DELETE FROM config_drafts WHERE user_id = ?', [userId]);
      this.db.run('DELETE FROM test_session_history WHERE user_id = ?', [userId]);
      this.db.run('DELETE FROM api_configs WHERE user_id = ?', [userId]);
      this.db.run('DELETE FROM prompts WHERE user_id = ?', [userId]);
      this.db.run('DELETE FROM user_passwords WHERE user_id = ?', [userId]);
      this.db.run('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
      this.db.run('DELETE FROM users WHERE id = ?', [userId]);

      await this.saveDatabaseToIndexedDB();
      return true;
    } catch (error) {
      console.error('[SQLite] 删除用户失败:', error);
      return false;
    }
  }

  // 默认输入模板管理
  createDefaultTestInput(userId: string, data: { name: string; content: string; category?: string }): DefaultTestInput {
    if (!this.db) throw new Error('数据库未初始化');
    const input: DefaultTestInput = {
      id: this.generateId(),
      name: data.name,
      content: data.content,
      category: data.category || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.run(
      `INSERT INTO default_test_inputs (id, user_id, name, content, category, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.id, userId, input.name, input.content, input.category, input.createdAt, input.updatedAt]
    );
    this.saveDatabaseToIndexedDB();
    return input;
  }

  getDefaultTestInputs(userId: string): DefaultTestInput[] {
    if (!this.db) return [];
    try {
      const result = this.db.exec(
        `SELECT id, name, content, category, created_at, updated_at FROM default_test_inputs WHERE user_id = ? ORDER BY updated_at DESC`,
        [userId]
      );
      if (result.length === 0) return [];
      return result[0].values.map((row: any[]) => ({
        id: row[0] as string,
        name: row[1] as string,
        content: row[2] as string,
        category: row[3] as string,
        createdAt: row[4] as string,
        updatedAt: row[5] as string,
      }));
    } catch (error) {
      console.error('[SQLite] 获取默认输入模板失败:', error);
      return [];
    }
  }

  updateDefaultTestInput(userId: string, id: string, updates: Partial<DefaultTestInput>): boolean {
    if (!this.db) return false;
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      if (updates.name) { setClause.push('name = ?'); values.push(updates.name); }
      if (updates.content) { setClause.push('content = ?'); values.push(updates.content); }
      if (updates.category) { setClause.push('category = ?'); values.push(updates.category); }
      setClause.push('updated_at = ?'); values.push(new Date().toISOString());
      values.push(userId, id);
      this.db.run(
        `UPDATE default_test_inputs SET ${setClause.join(', ')} WHERE user_id = ? AND id = ?`,
        values
      );
      this.saveDatabaseToIndexedDB();
      return true;
    } catch (error) {
      console.error('[SQLite] 更新默认输入模板失败:', error);
      return false;
    }
  }

  deleteDefaultTestInput(userId: string, id: string): boolean {
    if (!this.db) return false;
    try {
      this.db.run('DELETE FROM default_test_inputs WHERE user_id = ? AND id = ?', [userId, id]);
      this.saveDatabaseToIndexedDB();
      return true;
    } catch (error) {
      console.error('[SQLite] 删除默认输入模板失败:', error);
      return false;
    }
  }
}

// 创建全局实例
export const sqliteStorage = new SQLiteStorage();
export { SQLiteStorage };

// 调试：将sqliteStorage暴露到全局
if (typeof window !== 'undefined') {
  (window as any).sqliteStorage = sqliteStorage;
} 