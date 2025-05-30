import { storage as localStorageManager, userStorage as localUserStorage, promptStorage, apiConfigStorage } from './storage-simple';
import { 
  User, 
  UserSession, 
  Prompt, 
  ApiConfig, 
  TestSessionHistory, 
  TestConfigDraft,
  TestParams,
  TestResult
} from '../types';

// 存储适配器类
class StorageAdapter {
  private useIndexedDB = false;
  private isInitialized = false;

  // 初始化存储系统
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 暂时只使用localStorage
      this.useIndexedDB = false;
      console.log('[StorageAdapter] 使用localStorage存储');
    } catch (error) {
      console.warn('[StorageAdapter] 存储初始化失败:', error);
      this.useIndexedDB = false;
    }

    this.isInitialized = true;
  }

  // 获取当前用户ID
  private getCurrentUserId(): string | null {
    try {
      const session = this.getCurrentSession();
      return session?.user?.id || null;
    } catch {
      return null;
    }
  }

  // 用户管理
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return localUserStorage.createUser(userData);
  }

  async getAllUsers(): Promise<User[]> {
    return localUserStorage.getAllUsers();
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return localUserStorage.getUserByUsername(username) || null;
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    return localUserStorage.validateUser(username, password);
  }

  async storeUserPassword(userId: string, password: string): Promise<void> {
    localUserStorage.storeUserPassword(userId, password);
  }

  getCurrentSession(): UserSession | null {
    return localUserStorage.getCurrentSession();
  }

  setSession(session: UserSession | null): void {
    localUserStorage.setSession(session);
  }

  login(username: string, password: string): UserSession | null {
    return localUserStorage.login(username, password);
  }

  logout(): void {
    localUserStorage.logout();
  }

  isSessionValid(): boolean {
    return localUserStorage.isSessionValid();
  }

  // 提示词管理
  async getPrompts(): Promise<Prompt[]> {
    return promptStorage.getAll();
  }

  async createPrompt(promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    return promptStorage.create(promptData);
  }

  async updatePrompt(promptId: string, updates: Partial<Prompt>): Promise<boolean> {
    const result = promptStorage.update(promptId, updates);
    return result !== null;
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    return promptStorage.delete(promptId);
  }

  // API配置管理
  async getApiConfigs(): Promise<ApiConfig[]> {
    return apiConfigStorage.getAll();
  }

  async createApiConfig(configData: Omit<ApiConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiConfig> {
    return apiConfigStorage.create(configData);
  }

  async updateApiConfig(configId: string, updates: Partial<ApiConfig>): Promise<boolean> {
    const result = apiConfigStorage.update(configId, updates);
    return result !== null;
  }

  async deleteApiConfig(configId: string): Promise<boolean> {
    return apiConfigStorage.delete(configId);
  }

  // 测试会话历史管理
  async getTestSessionHistory(limit: number = 50): Promise<TestSessionHistory[]> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return [];
      
      const historyKey = `${userId}_test_session_history`;
      const stored = localStorage.getItem(historyKey);
      if (!stored) return [];
      
      const allHistory: TestSessionHistory[] = JSON.parse(stored);
      // 按创建时间降序排列，返回最新的限制数量
      return allHistory
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('[StorageAdapter] 获取测试历史失败:', error);
      return [];
    }
  }

  async saveTestSessionHistory(sessionData: {
    sessionName: string;
    testParams: TestParams;
    results: TestResult[];
    status: 'completed' | 'stopped' | 'error';
    startTime: string;
    endTime: string;
    totalTests: number;
    successCount: number;
    errorCount: number;
    averageDuration: number;
  }): Promise<TestSessionHistory | null> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        console.error('[StorageAdapter] 无法保存测试历史：用户未登录');
        return null;
      }
      
      const historyKey = `${userId}_test_session_history`;
      const historyRecord: TestSessionHistory = {
        id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: userId,
        createdAt: new Date().toISOString(),
        ...sessionData
      };

      // 获取现有历史记录
      const stored = localStorage.getItem(historyKey);
      const existingHistory: TestSessionHistory[] = stored ? JSON.parse(stored) : [];
      
      // 添加新记录到开头
      existingHistory.unshift(historyRecord);
      
      // 保持最多100条记录
      const maxRecords = 100;
      if (existingHistory.length > maxRecords) {
        existingHistory.splice(maxRecords);
      }
      
      // 保存到localStorage
      localStorage.setItem(historyKey, JSON.stringify(existingHistory));
      
      console.log('[StorageAdapter] 测试历史记录已保存:', historyRecord.id);
      return historyRecord;
    } catch (error) {
      console.error('[StorageAdapter] 保存测试历史失败:', error);
      return null;
    }
  }

  async deleteTestSessionHistory(sessionId: string): Promise<boolean> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return false;
      
      const historyKey = `${userId}_test_session_history`;
      const stored = localStorage.getItem(historyKey);
      if (!stored) return false;
      
      const existingHistory: TestSessionHistory[] = JSON.parse(stored);
      const filteredHistory = existingHistory.filter(record => record.id !== sessionId);
      
      if (filteredHistory.length === existingHistory.length) {
        return false; // 没有找到要删除的记录
      }
      
      localStorage.setItem(historyKey, JSON.stringify(filteredHistory));
      console.log('[StorageAdapter] 测试历史记录已删除:', sessionId);
      return true;
    } catch (error) {
      console.error('[StorageAdapter] 删除测试历史失败:', error);
      return false;
    }
  }

  // 配置暂存管理
  async saveTestConfigDraft(configData: TestConfigDraft): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    try {
      localStorage.setItem(`${userId}_test_config_draft`, JSON.stringify(configData));
    } catch (error) {
      console.error('[StorageAdapter] 保存测试配置暂存失败:', error);
    }
  }

  async getTestConfigDraft(): Promise<TestConfigDraft | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    try {
      const draft = localStorage.getItem(`${userId}_test_config_draft`);
      return draft ? JSON.parse(draft) : null;
    } catch (error) {
      console.error('[StorageAdapter] 获取测试配置暂存失败:', error);
      return null;
    }
  }

  async clearTestConfigDraft(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    try {
      localStorage.removeItem(`${userId}_test_config_draft`);
    } catch (error) {
      console.error('[StorageAdapter] 清除测试配置暂存失败:', error);
    }
  }

  // 其他localStorage兼容方法
  getModels() {
    return localStorageManager.getModels();
  }

  setModels(models: any[]) {
    return localStorageManager.setModels(models);
  }

  getDefaultTestInputs() {
    return localStorageManager.getDefaultTestInputs();
  }

  setDefaultTestInputs(inputs: any[]) {
    return localStorageManager.setDefaultTestInputs(inputs);
  }
}

// 创建全局实例
export const storageAdapter = new StorageAdapter();

// 导出兼容接口
export const storage = {
  // 提示词管理
  getPrompts: () => storageAdapter.getPrompts(),
  createPrompt: (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) => storageAdapter.createPrompt(data),
  updatePrompt: (id: string, updates: Partial<Prompt>) => storageAdapter.updatePrompt(id, updates),
  deletePrompt: (id: string) => storageAdapter.deletePrompt(id),

  // API配置管理
  getApiConfigs: () => storageAdapter.getApiConfigs(),
  createApiConfig: (data: Omit<ApiConfig, 'id' | 'createdAt' | 'updatedAt'>) => storageAdapter.createApiConfig(data),
  updateApiConfig: (id: string, updates: Partial<ApiConfig>) => storageAdapter.updateApiConfig(id, updates),
  deleteApiConfig: (id: string) => storageAdapter.deleteApiConfig(id),

  // 其他方法
  getModels: () => storageAdapter.getModels(),
  setModels: (models: any[]) => storageAdapter.setModels(models),
  getDefaultTestInputs: () => storageAdapter.getDefaultTestInputs(),
  setDefaultTestInputs: (inputs: any[]) => storageAdapter.setDefaultTestInputs(inputs),
};

export const userStorage = {
  // 用户管理
  getAllUsers: () => storageAdapter.getAllUsers(),
  getUserByUsername: (username: string) => storageAdapter.getUserByUsername(username),
  getUserByEmail: (email: string) => localUserStorage.getUserByEmail(email), // 暂时使用原实现
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => storageAdapter.createUser(data),
  validateUser: (username: string, password: string) => storageAdapter.validateUser(username, password),
  storeUserPassword: (userId: string, password: string) => storageAdapter.storeUserPassword(userId, password),

  // 会话管理
  getCurrentSession: () => storageAdapter.getCurrentSession(),
  setSession: (session: UserSession | null) => storageAdapter.setSession(session),
  login: (username: string, password: string) => storageAdapter.login(username, password),
  logout: () => storageAdapter.logout(),
  isSessionValid: () => storageAdapter.isSessionValid(),
}; 