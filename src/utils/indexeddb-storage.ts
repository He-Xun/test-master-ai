import { 
  User, 
  UserSession, 
  Prompt, 
  ApiConfig, 
  TestSessionHistory, 
  ConfigDraft,
  TestConfigDraft,
  TestParams,
  TestResult
} from '../types';

// IndexedDB数据库管理器
class IndexedDBStorage {
  private dbName = 'ApiTestToolDB';
  private version = 1;
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  // 初始化数据库
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[IndexedDB] 正在初始化数据库...');
      
      this.db = await this.openDatabase();
      
      // 迁移localStorage数据（如果存在）
      await this.migrateFromLocalStorage();
      
      this.isInitialized = true;
      console.log('[IndexedDB] 数据库初始化完成');
      
    } catch (error) {
      console.error('[IndexedDB] 数据库初始化失败:', error);
      throw error;
    }
  }

  // 打开数据库
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('email', 'email', { unique: true });
        }
        
        if (!db.objectStoreNames.contains('user_passwords')) {
          db.createObjectStore('user_passwords', { keyPath: 'userId' });
        }
        
        if (!db.objectStoreNames.contains('user_sessions')) {
          const sessionStore = db.createObjectStore('user_sessions', { keyPath: 'id' });
          sessionStore.createIndex('userId', 'userId');
        }
        
        if (!db.objectStoreNames.contains('prompts')) {
          const promptStore = db.createObjectStore('prompts', { keyPath: 'id' });
          promptStore.createIndex('userId', 'userId');
        }
        
        if (!db.objectStoreNames.contains('api_configs')) {
          const configStore = db.createObjectStore('api_configs', { keyPath: 'id' });
          configStore.createIndex('userId', 'userId');
        }
        
        if (!db.objectStoreNames.contains('test_session_history')) {
          const historyStore = db.createObjectStore('test_session_history', { keyPath: 'id' });
          historyStore.createIndex('userId', 'userId');
          historyStore.createIndex('createdAt', 'createdAt');
        }
        
        if (!db.objectStoreNames.contains('config_drafts')) {
          const draftStore = db.createObjectStore('config_drafts', { keyPath: 'id' });
          draftStore.createIndex('userId_type', ['userId', 'draftType'], { unique: true });
        }
      };
    });
  }

  // 从localStorage迁移数据
  private async migrateFromLocalStorage(): Promise<void> {
    if (!this.db) return;

    try {
      console.log('[IndexedDB] 开始迁移localStorage数据...');
      
      // 检查是否已经迁移过
      const userCount = await this.countRecords('users');
      if (userCount > 0) {
        console.log('[IndexedDB] 数据库已有数据，跳过迁移');
        return;
      }

      // 迁移用户数据
      const allUsers = localStorage.getItem('allUsers');
      if (allUsers) {
        const users = JSON.parse(allUsers);
        for (const user of users) {
          await this.createUser(user);
          
          // 迁移密码
          const password = localStorage.getItem(`pwd_${user.id}`);
          if (password) {
            await this.storeUserPassword(user.id, password);
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
              await this.createPrompt(userId, prompt);
            }
          }

          // 迁移API配置
          const apiConfigs = localStorage.getItem(`${userId}_apiConfigs`) || localStorage.getItem('apiConfigs');
          if (apiConfigs) {
            const configList = JSON.parse(apiConfigs);
            for (const config of configList) {
              await this.createApiConfig(userId, config);
            }
          }
        }
      }

      console.log('[IndexedDB] localStorage数据迁移完成');
      
    } catch (error) {
      console.error('[IndexedDB] 数据迁移失败:', error);
    }
  }

  // 通用方法：计算记录数
  private countRecords(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 通用方法：添加记录
  private addRecord(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 通用方法：更新记录
  private putRecord(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 通用方法：获取记录
  private getRecord(storeName: string, key: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 通用方法：删除记录
  private deleteRecord(storeName: string, key: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 通用方法：通过索引获取记录
  private getRecordsByIndex(storeName: string, indexName: string, value: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // 通用方法：获取所有记录
  private getAllRecords(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // 生成ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 用户管理方法
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.addRecord('users', user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await this.getAllRecords('users');
    } catch (error) {
      console.error('[IndexedDB] 获取用户列表失败:', error);
      return [];
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const users = await this.getRecordsByIndex('users', 'username', username);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('[IndexedDB] 查找用户失败:', error);
      return null;
    }
  }

  async storeUserPassword(userId: string, password: string): Promise<void> {
    try {
      await this.putRecord('user_passwords', { userId, passwordHash: password });
    } catch (error) {
      console.error('[IndexedDB] 存储密码失败:', error);
    }
  }

  // 提示词管理
  async createPrompt(userId: string, promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    const prompt: Prompt = {
      ...promptData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const promptWithUserId = { ...prompt, userId };
    await this.addRecord('prompts', promptWithUserId);
    return prompt;
  }

  async getPrompts(userId: string): Promise<Prompt[]> {
    try {
      const records = await this.getRecordsByIndex('prompts', 'userId', userId);
      return records.map(record => {
        const { userId: _, ...prompt } = record;
        return prompt;
      });
    } catch (error) {
      console.error('[IndexedDB] 获取提示词失败:', error);
      return [];
    }
  }

  async updatePrompt(userId: string, promptId: string, updates: Partial<Prompt>): Promise<boolean> {
    try {
      const existing = await this.getRecord('prompts', promptId);
      if (!existing || existing.userId !== userId) {
        return false;
      }

      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await this.putRecord('prompts', updated);
      return true;
    } catch (error) {
      console.error('[IndexedDB] 更新提示词失败:', error);
      return false;
    }
  }

  async deletePrompt(userId: string, promptId: string): Promise<boolean> {
    try {
      const existing = await this.getRecord('prompts', promptId);
      if (!existing || existing.userId !== userId) {
        return false;
      }

      await this.deleteRecord('prompts', promptId);
      return true;
    } catch (error) {
      console.error('[IndexedDB] 删除提示词失败:', error);
      return false;
    }
  }

  // API配置管理
  async createApiConfig(userId: string, configData: Omit<ApiConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiConfig> {
    const config: ApiConfig = {
      ...configData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const configWithUserId = { ...config, userId };
    await this.addRecord('api_configs', configWithUserId);
    return config;
  }

  async getApiConfigs(userId: string): Promise<ApiConfig[]> {
    try {
      const records = await this.getRecordsByIndex('api_configs', 'userId', userId);
      return records.map(record => {
        const { userId: _, ...config } = record;
        return config;
      });
    } catch (error) {
      console.error('[IndexedDB] 获取API配置失败:', error);
      return [];
    }
  }

  // 测试会话历史管理
  async saveTestSessionHistory(userId: string, sessionData: Omit<TestSessionHistory, 'id' | 'userId' | 'createdAt'>): Promise<TestSessionHistory> {
    const session: TestSessionHistory = {
      ...sessionData,
      id: this.generateId(),
      userId,
      createdAt: new Date().toISOString(),
    };

    await this.addRecord('test_session_history', session);
    return session;
  }

  async getTestSessionHistory(userId: string, limit: number = 50): Promise<TestSessionHistory[]> {
    try {
      const records = await this.getRecordsByIndex('test_session_history', 'userId', userId);
      return records
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('[IndexedDB] 获取测试历史失败:', error);
      return [];
    }
  }

  async deleteTestSessionHistory(userId: string, sessionId: string): Promise<boolean> {
    try {
      const existing = await this.getRecord('test_session_history', sessionId);
      if (!existing || existing.userId !== userId) {
        return false;
      }

      await this.deleteRecord('test_session_history', sessionId);
      return true;
    } catch (error) {
      console.error('[IndexedDB] 删除测试历史失败:', error);
      return false;
    }
  }

  // 配置暂存管理
  async saveConfigDraft(userId: string, draftType: string, data: any): Promise<void> {
    try {
      const draft: ConfigDraft = {
        id: this.generateId(),
        userId,
        draftType: draftType as any,
        data,
        lastModified: new Date().toISOString(),
        autoSaved: true,
      };

      // 先删除同类型的旧暂存
      const existing = await this.getRecordsByIndex('config_drafts', 'userId_type', [userId, draftType]);
      for (const old of existing) {
        await this.deleteRecord('config_drafts', old.id);
      }

      await this.addRecord('config_drafts', draft);
    } catch (error) {
      console.error('[IndexedDB] 保存配置暂存失败:', error);
    }
  }

  async getConfigDraft(userId: string, draftType: string): Promise<any | null> {
    try {
      const records = await this.getRecordsByIndex('config_drafts', 'userId_type', [userId, draftType]);
      if (records.length > 0) {
        return records[0].data;
      }
      return null;
    } catch (error) {
      console.error('[IndexedDB] 获取配置暂存失败:', error);
      return null;
    }
  }

  async clearConfigDraft(userId: string, draftType: string): Promise<void> {
    try {
      const records = await this.getRecordsByIndex('config_drafts', 'userId_type', [userId, draftType]);
      for (const record of records) {
        await this.deleteRecord('config_drafts', record.id);
      }
    } catch (error) {
      console.error('[IndexedDB] 清除配置暂存失败:', error);
    }
  }
}

// 创建全局实例
export const indexedDBStorage = new IndexedDBStorage(); 