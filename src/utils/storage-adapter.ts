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
import { SQLiteStorage, sqliteStorage } from './sqlite-storage';

// 存储适配器类
class StorageAdapter {
  private useIndexedDB = false;
  private isInitialized = false;

  // 初始化存储系统
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 初始化SQLite数据库
      await sqliteStorage.initialize();
      console.log('[StorageAdapter] SQLite数据库初始化完成');
      this.isInitialized = true;
    } catch (error) {
      console.error('[StorageAdapter] SQLite初始化失败，回退到localStorage:', error);
      this.useIndexedDB = false;
      this.isInitialized = true;
    }
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
    const user = sqliteStorage.createUser(userData);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return sqliteStorage.getAllUsers();
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return sqliteStorage.getUserByUsername(username);
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    return sqliteStorage.validateUser(username, password);
  }

  async storeUserPassword(userId: string, password: string): Promise<void> {
    sqliteStorage.storeUserPassword(userId, password);
    // 确保数据库保存完成
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 超级管理员方法
  async createSuperAdmin(): Promise<User> {
    // 检查是否已存在超级管理员
    const existingSuperAdmin = await this.getUserByUsername('superadmin');
    if (existingSuperAdmin) {
      return existingSuperAdmin;
    }

    // 创建超级管理员账户
    const superAdmin = await this.createUser({
      username: 'superadmin',
      email: 'admin@testmaster.ai',
      role: 'superadmin',
      avatar: '/avatar/admin.svg'
    });

    // 设置默认密码
    await this.storeUserPassword(superAdmin.id, 'admin123');
    
    console.log('[StorageAdapter] 超级管理员账户已创建');
    return superAdmin;
  }

  // 重置用户密码（仅超级管理员可用）
  async resetUserPassword(userId: string, newPassword: string, operatorUserId: string): Promise<boolean> {
    try {
      const operator = await this.getUserById(operatorUserId);
      if (!operator || operator.role !== 'superadmin') {
        console.error('[StorageAdapter] 非超级管理员不能重置密码');
        return false;
      }

      await this.storeUserPassword(userId, newPassword);
      console.log(`[StorageAdapter] 用户 ${userId} 密码已重置`);
      return true;
    } catch (error) {
      console.error('[StorageAdapter] 重置密码失败:', error);
      return false;
    }
  }

  // 更新用户信息（仅超级管理员可用，或用户更新自己的基本信息）
  async updateUserInfo(userId: string, updates: Partial<User>, operatorUserId: string): Promise<boolean> {
    try {
      const operator = await this.getUserById(operatorUserId);
      if (!operator) {
        console.error('[StorageAdapter] 操作用户不存在');
        return false;
      }

      // 允许超级管理员修改任何用户信息，或用户修改自己的基本信息（头像、邮箱等，但不包括角色）
      const isSuperAdmin = operator.role === 'superadmin';
      const isSelfUpdate = userId === operatorUserId;
      
      if (!isSuperAdmin && !isSelfUpdate) {
        console.error('[StorageAdapter] 权限不足，不能修改其他用户信息');
        return false;
      }

      // 如果是自己更新，限制可更新的字段
      if (isSelfUpdate && !isSuperAdmin) {
        const allowedFields = ['avatar', 'email']; // 用户只能更新头像和邮箱
        const filteredUpdates: Partial<User> = {};
        
        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields.includes(key)) {
            (filteredUpdates as any)[key] = value;
          }
        }
        
        if (Object.keys(filteredUpdates).length === 0) {
          console.error('[StorageAdapter] 没有可更新的字段');
          return false;
        }
        
        console.log(`[StorageAdapter] 用户 ${userId} 更新自己的信息:`, filteredUpdates);
        return sqliteStorage.updateUser(userId, filteredUpdates);
      }

      // 超级管理员可以更新所有字段
      console.log(`[StorageAdapter] 超级管理员 ${operatorUserId} 更新用户 ${userId} 信息:`, updates);
      return sqliteStorage.updateUser(userId, updates);
    } catch (error) {
      console.error('[StorageAdapter] 更新用户信息失败:', error);
      return false;
    }
  }

  // 删除用户（仅超级管理员可用）
  async deleteUser(userId: string, operatorUserId: string): Promise<boolean> {
    try {
      const operator = await this.getUserById(operatorUserId);
      if (!operator || operator.role !== 'superadmin') {
        console.error('[StorageAdapter] 非超级管理员不能删除用户');
        return false;
      }

      // 防止删除超级管理员
      const targetUser = await this.getUserById(userId);
      if (targetUser && targetUser.role === 'superadmin') {
        console.error('[StorageAdapter] 不能删除超级管理员账户');
        return false;
      }

      return sqliteStorage.deleteUser(userId);
    } catch (error) {
      console.error('[StorageAdapter] 删除用户失败:', error);
      return false;
    }
  }

  // 获取用户详细信息（包含权限检查）
  async getUserById(userId: string): Promise<User | null> {
    return sqliteStorage.getUserById(userId);
  }

  // 检查用户是否为超级管理员
  isSuperAdmin(user: User | null): boolean {
    return user?.role === 'superadmin';
  }

  // 只切换会话相关方法为sqlite
  getCurrentSession(): UserSession | null {
    return sqliteStorage.getCurrentSession();
  }

  setSession(session: UserSession | null): void {
    sqliteStorage.setSession(session);
  }

  login(username: string, password: string): UserSession | null {
    return sqliteStorage.login(username, password);
  }

  logout(): void {
    // 同时清除SQLite和localStorage中的会话
    sqliteStorage.logout();
    // 也清除localStorage中的用户会话，防止不一致
    try {
      localStorage.removeItem('userSession');
    } catch (error) {
      console.error('[StorageAdapter] 清除localStorage会话失败:', error);
    }
  }

  isSessionValid(): boolean {
    return sqliteStorage.isSessionValid();
  }

  // 提示词管理
  async getPrompts(): Promise<Prompt[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];
    return sqliteStorage.getPrompts(userId);
  }

  async createPrompt(promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('用户未登录');
    return sqliteStorage.createPrompt(userId, promptData);
  }

  async updatePrompt(promptId: string, updates: Partial<Prompt>): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    return sqliteStorage.updatePrompt(userId, promptId, updates);
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    return sqliteStorage.deletePrompt(userId, promptId);
  }

  // API配置管理
  async getApiConfigs(): Promise<ApiConfig[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];
    return sqliteStorage.getApiConfigs(userId);
  }

  async createApiConfig(configData: Omit<ApiConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiConfig> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('用户未登录');
    return sqliteStorage.createApiConfig(userId, configData);
  }

  async updateApiConfig(configId: string, updates: Partial<ApiConfig>): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    return sqliteStorage.updateApiConfig(userId, configId, updates);
  }

  async deleteApiConfig(configId: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    return sqliteStorage.deleteApiConfig(userId, configId);
  }

  // 获取所有可用的模型（从所有API配置中）
  async getAllModels(): Promise<Array<{ id: string; name: string; apiConfigName: string }>> {
    const configs = await this.getApiConfigs();
    const models: Array<{ id: string; name: string; apiConfigName: string }> = [];
    
    console.log(`[StorageAdapter] 从 ${configs.length} 个API配置中提取模型`);
    
    configs.forEach(config => {
      if (config.models && Array.isArray(config.models)) {
        config.models.forEach(model => {
          if (model.enabled) {
            // 向后兼容处理：支持新的modelId字段和旧的displayName字段
            const modelAny = model as any;
            const displayName = modelAny.name || modelAny.displayName || 'Unknown Model';
            
            models.push({
              id: `${config.id}_${model.id}`,
              name: displayName, // TestingPanel用作显示名称
              apiConfigName: config.name,
            });
          }
        });
      }
    });
    
    console.log(`[StorageAdapter] 提取到 ${models.length} 个可用模型`);
    return models;
  }

  // 根据模型ID获取API配置和模型信息
  async getModelInfo(modelId: string): Promise<{ apiConfig: any; model: any } | null> {
    console.log(`[StorageAdapter] 获取模型信息: ${modelId}`);
    const [apiConfigId, modelConfigId] = modelId.split('_');
    const configs = await this.getApiConfigs();
    const apiConfig = configs.find(c => c.id === apiConfigId);
    
    if (!apiConfig) {
      console.warn(`[StorageAdapter] 未找到API配置: ${apiConfigId}`);
      return null;
    }
    
    const model = apiConfig.models.find(m => m.id === modelConfigId);
    if (!model) {
      console.warn(`[StorageAdapter] 未找到模型: ${modelConfigId}`);
      return null;
    }
    
    // 确保模型对象包含正确的字段用于API调用
    const modelAny = model as any;
    // 优先使用modelId字段，如果没有则使用name字段，最后使用默认值
    const modelIdForApi = modelAny.modelId || modelAny.name || 'gpt-4o-mini';
    const displayName = modelAny.name || modelAny.displayName || modelIdForApi || 'Unknown Model';
    
    // 创建一个包含所需字段的完整模型对象
    const enhancedModel = {
      ...model,
      modelId: modelIdForApi, // 确保有用于API调用的modelId
      name: displayName,      // 确保有显示名称
    };
    
    console.log(`[StorageAdapter] 找到模型: ${displayName} (API调用ID: ${modelIdForApi}) (${apiConfig.name})`);
    console.log(`[StorageAdapter] 增强后的模型对象:`, enhancedModel);
    return { apiConfig, model: enhancedModel };
  }

  // 测试会话历史管理
  async getTestSessionHistory(limit: number = 50): Promise<TestSessionHistory[]> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return [];
      
      return sqliteStorage.getTestSessionHistory(userId, limit);
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
      
      return sqliteStorage.saveTestSessionHistory(userId, sessionData);
    } catch (error) {
      console.error('[StorageAdapter] 保存测试历史失败:', error);
      return null;
    }
  }

  async deleteTestSessionHistory(sessionId: string): Promise<boolean> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return false;
      
      return sqliteStorage.deleteTestSessionHistory(userId, sessionId);
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
      sqliteStorage.saveConfigDraft(userId, 'test_config', configData);
    } catch (error) {
      console.error('[StorageAdapter] 保存测试配置暂存失败:', error);
    }
  }

  async getTestConfigDraft(): Promise<TestConfigDraft | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    try {
      return sqliteStorage.getConfigDraft(userId, 'test_config');
    } catch (error) {
      console.error('[StorageAdapter] 获取测试配置暂存失败:', error);
      return null;
    }
  }

  async clearTestConfigDraft(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    try {
      sqliteStorage.clearConfigDraft(userId, 'test_config');
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
  getAllModels: () => storageAdapter.getAllModels(),
  getModelInfo: (modelId: string) => storageAdapter.getModelInfo(modelId),

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