import { storage as localStorageManager, userStorage as localUserStorage, promptStorage, apiConfigStorage } from './storage-simple';
import { 
  User, 
  UserSession, 
  Prompt, 
  ApiConfig, 
  TestSessionHistory, 
  TestConfigDraft,
  TestParams,
  TestResult,
  DefaultTestInput
} from '../types';
import { SQLiteStorage, sqliteStorage } from './sqlite-storage';

// 环境检测
const isElectron = (): boolean => {
  return !!(window as any).electron || navigator.userAgent.includes('Electron');
};

const isWebBrowser = (): boolean => {
  return !isElectron() && typeof window !== 'undefined' && typeof localStorage !== 'undefined';
};

// 存储适配器类 - 桌面优先架构
class StorageAdapter {
  private useIndexedDB = false;
  private isInitialized = false;
  private usingSQLite = false;
  private initializationStarted = false;
  private preferredStorage: 'sqlite' | 'localStorage' | 'indexedDB' = 'sqlite';
  private environment: 'electron' | 'browser' = 'browser';
  private initializationPromise: Promise<void> | null = null;
  private sqliteStorage: SQLiteStorage;

  constructor() {
    // 环境检测
    this.environment = isElectron() ? 'electron' : 'browser';
    // 所有环境都优先sqlite
    this.preferredStorage = 'sqlite';
    this.sqliteStorage = sqliteStorage;
    console.log(`[StorageAdapter] 🔍 检测到运行环境: ${this.environment}`);
  }

  // 异步初始化存储系统（支持环境自适应）
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    if (this.isInitialized || this.initializationStarted) return;
    this.initializationStarted = true;
    console.log(`[StorageAdapter] 🚀 开始 ${this.environment} 环境存储系统初始化...`);
    try {
      if (this.environment === 'electron') {
        await this.initializeElectronStorage();
      } else {
        await this.initializeBrowserStorage();
      }
      this.isInitialized = true;
      console.log(`[StorageAdapter] ✅ ${this.environment} 存储系统初始化完成`);
    } catch (error) {
      console.error(`[StorageAdapter] ❌ ${this.environment} 存储系统初始化失败:`, error);
      throw error; // 失败直接抛出，不降级
    }
  }

  // Electron环境存储初始化
  private async initializeElectronStorage(): Promise<void> {
    console.log('[StorageAdapter] 🖥️ 初始化Electron桌面端存储...');
    
    try {
      // 在Electron中，SQLite是原生性能，应该快速初始化
      console.log('[StorageAdapter] 🔄 启动SQLite数据库...');
      await this.sqliteStorage.initialize();
      
      this.usingSQLite = true;
      this.preferredStorage = 'sqlite';
      
      // 确保超级管理员存在
      await this.ensureSuperAdmin();
      
      console.log('[StorageAdapter] ✅ Electron SQLite存储已就绪 - 原生性能模式');
      
      // 可选：启用IndexedDB作为备份
      this.tryInitializeIndexedDB();
      
    } catch (error) {
      console.error('[StorageAdapter] ❌ Electron SQLite初始化失败:', error);
      throw error; // 让它进入回退策略
    }
  }

  // 浏览器环境存储初始化
  private async initializeBrowserStorage(): Promise<void> {
    console.log('[StorageAdapter] 🌐 初始化浏览器端存储...');
    try {
      await this.sqliteStorage.initialize();
      this.usingSQLite = true;
      this.preferredStorage = 'sqlite';
      await this.ensureSuperAdmin();
      console.log('[StorageAdapter] ✅ 浏览器SQLite存储已就绪');
    } catch (error) {
      console.error('[StorageAdapter] ❌ 浏览器SQLite初始化失败:', error);
      throw error; // 失败直接抛出，不降级
    }
  }

  // 尝试在浏览器中启用SQLite（异步，不阻塞）
  private tryInitializeBrowserSQLite(): void {
    setTimeout(async () => {
      const userPrefersAdvanced = localStorage.getItem('enableAdvancedFeatures') === 'true';
      
      if (userPrefersAdvanced) {
        console.log('[StorageAdapter] 🔄 用户选择启用浏览器SQLite增强...');
        try {
          await this.sqliteStorage.initialize();
          this.usingSQLite = true;
          console.log('[StorageAdapter] ✅ 浏览器SQLite增强已启用');
        } catch (error) {
          console.log('[StorageAdapter] ⚠️ 浏览器SQLite增强启用失败:', error);
        }
      } else {
        console.log('[StorageAdapter] 💡 高级功能可用（包括SQLite增强），可在设置中启用');
      }
    }, 3000); // 浏览器环境延迟启动SQLite
  }

  // 尝试初始化IndexedDB增强（非阻塞）
  private async tryInitializeIndexedDB(): Promise<void> {
    try {
      if ('indexedDB' in window) {
        console.log('[StorageAdapter] 🔄 尝试启用IndexedDB增强...');
        this.useIndexedDB = true;
        console.log('[StorageAdapter] ✅ IndexedDB增强已启用');
      }
    } catch (error) {
      console.log('[StorageAdapter] ⚠️ IndexedDB增强启用失败:', error);
    }
  }

  // 异步初始化超级管理员
  private async ensureSuperAdmin(): Promise<void> {
    try {
      console.log('[StorageAdapter] 🔐 检查超级管理员账户...');
      const existingAdmin = this.usingSQLite 
        ? this.sqliteStorage.getUserByUsername('superadmin')
        : localUserStorage.getUserByUsername('superadmin');
      if (!existingAdmin) {
        console.log('[StorageAdapter] 👤 创建超级管理员账户...');
        const adminUser = this.usingSQLite
          ? await this.sqliteStorage.createUser({
              username: 'superadmin',
              email: 'admin@testmaster.ai',
              role: 'superadmin',
              avatar: undefined
            })
          : localUserStorage.createUser({
              username: 'superadmin',
              email: 'admin@testmaster.ai',
              role: 'superadmin',
              avatar: undefined
            });
        // 设置密码
        if (this.usingSQLite) {
          await this.sqliteStorage.storeUserPassword(adminUser.id, 'admin123');
        } else {
          localUserStorage.storeUserPassword(adminUser.id, 'admin123');
        }
        console.log('[StorageAdapter] ✅ 超级管理员账户创建完成');
      } else {
        console.log('[StorageAdapter] ✅ 超级管理员账户已存在');
      }
    } catch (error) {
      console.error('[StorageAdapter] ❌ 超级管理员初始化失败:', error);
    }
  }

  // 存储切换方法 - 仅在浏览器环境可用
  async enableAdvancedFeatures(): Promise<boolean> {
    if (this.environment === 'electron') {
      console.log('[StorageAdapter] 桌面端默认已启用所有高级功能');
      return true;
    }

    if (this.usingSQLite) {
      console.log('[StorageAdapter] 高级功能已经启用');
      return true;
    }

    try {
      console.log('[StorageAdapter] 🔄 正在启用高级功能...');
      await this.sqliteStorage.initialize();
      
      // 迁移现有数据
      await this.migrateToSQLite();
      
      this.usingSQLite = true;
      localStorage.setItem('enableAdvancedFeatures', 'true');
      
      console.log('[StorageAdapter] ✅ 高级功能启用成功');
      return true;
    } catch (error) {
      console.error('[StorageAdapter] ❌ 高级功能启用失败:', error);
      return false;
    }
  }

  // 禁用高级功能 - 仅在浏览器环境可用
  async disableAdvancedFeatures(): Promise<void> {
    if (this.environment === 'electron') {
      console.log('[StorageAdapter] 桌面端不支持禁用高级功能');
      return;
    }

    if (!this.usingSQLite) return;

    try {
      console.log('[StorageAdapter] 🔄 正在禁用高级功能...');
      
      await this.migrateFromSQLite();
      
      this.usingSQLite = false;
      localStorage.setItem('enableAdvancedFeatures', 'false');
      
      console.log('[StorageAdapter] ✅ 已切换到基础模式');
    } catch (error) {
      console.error('[StorageAdapter] ❌ 切换存储方式失败:', error);
    }
  }

  // 手动切换到SQLite - 主要用于开发调试
  async enableSQLiteEnhancement(): Promise<boolean> {
    return this.enableAdvancedFeatures();
  }

  async disableSQLiteEnhancement(): Promise<void> {
    return this.disableAdvancedFeatures();
  }

  // 数据迁移：从localStorage到SQLite
  private async migrateToSQLite(): Promise<void> {
    try {
      console.log('[StorageAdapter] 🔄 开始数据迁移到SQLite...');
      // 迁移用户数据
      const users = localUserStorage.getAllUsers();
      console.log(`[StorageAdapter] 📊 发现 ${users.length} 个localStorage用户需要迁移`);
      for (const user of users) {
        try {
          // 检查SQLite中是否已存在
          const existingUser = this.sqliteStorage.getUserByUsername(user.username);
          if (existingUser) {
            console.log(`[StorageAdapter] 👤 用户 ${user.username} 已存在，跳过`);
            continue;
          }
          const newUser = await this.sqliteStorage.createUser(user);
          console.log(`[StorageAdapter] ✅ 用户 ${user.username} 迁移成功`);
          // 迁移密码
          const password = localStorage.getItem(`pwd_${user.id}`);
          if (password) {
            await this.sqliteStorage.storeUserPassword(newUser.id, password);
            console.log(`[StorageAdapter] 🔑 用户 ${user.username} 密码迁移成功`);
          }
        } catch (error) {
          console.warn('[StorageAdapter] ⚠️ 用户迁移失败:', user.username, error);
        }
      }
      // 迁移当前会话
      const session = localUserStorage.getCurrentSession();
      if (session) {
        try {
          this.sqliteStorage.setSession(session);
          console.log('[StorageAdapter] 🔄 当前会话迁移成功');
        } catch (error) {
          console.warn('[StorageAdapter] ⚠️ 会话迁移失败:', error);
        }
      }
      console.log('[StorageAdapter] ✅ 数据迁移到SQLite完成');
    } catch (error) {
      console.error('[StorageAdapter] ❌ 数据迁移失败:', error);
      throw error;
    }
  }

  // 数据迁移：从SQLite到localStorage
  private async migrateFromSQLite(): Promise<void> {
    try {
      console.log('[StorageAdapter] 🔄 开始数据迁移到localStorage...');
      // 1. 导出所有用户
      const users = this.sqliteStorage.getAllUsers();
      localStorageManager.setUsers(users);
      console.log(`[StorageAdapter] 📊 发现 ${users.length} 个SQLite用户需要迁移`);

      // 2. 导出所有用户密码、提示词、API配置、测试历史、配置草稿
      for (const user of users) {
        // 密码（如无hash导出方法则跳过）
        // 提示词
        try {
          const prompts = this.sqliteStorage.getPrompts(user.id);
          localStorage.setItem(`${user.id}_prompts`, JSON.stringify(prompts));
        } catch (e) {
          console.warn(`[StorageAdapter] ⚠️ 用户${user.username}提示词迁移失败`, e);
        }
        // API配置
        try {
          const apiConfigs = this.sqliteStorage.getApiConfigs(user.id);
          localStorage.setItem(`${user.id}_apiConfigs`, JSON.stringify(apiConfigs));
        } catch (e) {
          console.warn(`[StorageAdapter] ⚠️ 用户${user.username}API配置迁移失败`, e);
        }
        // 测试历史
        try {
          const testHistory = this.sqliteStorage.getTestSessionHistory(user.id, 1000);
          localStorage.setItem(`${user.id}_testHistory`, JSON.stringify(testHistory));
        } catch (e) {
          console.warn(`[StorageAdapter] ⚠️ 用户${user.username}测试历史迁移失败`, e);
        }
        // 配置草稿
        try {
          const draft = this.sqliteStorage.getConfigDraft(user.id, 'test_config');
          if (draft) {
            localStorage.setItem(`${user.id}_testConfigDraft`, JSON.stringify(draft));
          }
        } catch (e) {
          console.warn(`[StorageAdapter] ⚠️ 用户${user.username}配置草稿迁移失败`, e);
        }
      }
      // 3. 会话
      try {
        const session = this.sqliteStorage.getCurrentSession();
        if (session) {
          localStorageManager.setUserSession(session);
        }
      } catch (e) {
        console.warn('[StorageAdapter] ⚠️ 会话迁移失败', e);
      }
      console.log('[StorageAdapter] ✅ 数据迁移到localStorage完成');
    } catch (error) {
      console.error('[StorageAdapter] ❌ 数据迁移失败:', error);
    }
  }

  // 获取当前存储状态信息
  getStorageInfo(): {
    environment: 'electron' | 'browser';
    primaryStorage: string;
    sqliteEnabled: boolean;
    indexedDBEnabled: boolean;
    performance: 'fast' | 'medium' | 'slow';
    features: string[];
  } {
    let performance: 'fast' | 'medium' | 'slow' = 'fast';
    const features: string[] = [];
    
    if (this.environment === 'electron') {
      performance = 'fast';
      features.push('sqlite', 'filesystem', 'highPerformanceQuery', 'unlimitedStorage');
    } else {
      if (this.usingSQLite) {
        performance = 'slow';
        features.push('advancedQuery', 'complexAnalysis', 'sqlSupport');
      } else if (this.useIndexedDB) {
        performance = 'medium';
        features.push('结构化存储', '大容量');
      } else {
        performance = 'fast';
        features.push('快速访问');
      }
    }
    
    return {
      environment: this.environment,
      primaryStorage: this.preferredStorage,
      sqliteEnabled: this.usingSQLite,
      indexedDBEnabled: this.useIndexedDB,
      performance,
      features
    };
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

  // 用户管理方法 - 支持SQLite和localStorage回退
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, password?: string): Promise<User> {
    let user: User;
    if (this.usingSQLite) {
      user = await this.sqliteStorage.createUser(userData);
      if (password) {
        await this.sqliteStorage.storeUserPassword(user.id, password);
      }
    } else {
      user = localUserStorage.createUser(userData);
      if (password) {
        localUserStorage.storeUserPassword(user.id, password);
      }
    }
    // 同步更新localStorage的allUsers（兜底迁移用）
    try {
      const allUsersStr = localStorage.getItem('allUsers');
      let allUsers: User[] = allUsersStr ? JSON.parse(allUsersStr) : [];
      if (!allUsers.find(u => u.username === user.username)) {
        allUsers.push(user);
        localStorage.setItem('allUsers', JSON.stringify(allUsers));
      }
    } catch (e) {}
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    if (this.usingSQLite) {
      return this.sqliteStorage.getAllUsers();
    } else {
      return localUserStorage.getAllUsers();
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    if (this.usingSQLite) {
      return this.sqliteStorage.getUserByUsername(username);
    } else {
      return localUserStorage.getUserByUsername(username) || null;
    }
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    if (this.usingSQLite) {
      return this.sqliteStorage.validateUser(username, password);
    } else {
      return localUserStorage.validateUser(username, password);
    }
  }

  async storeUserPassword(userId: string, password: string): Promise<void> {
    if (this.usingSQLite) {
      await this.sqliteStorage.storeUserPassword(userId, password);
    } else {
      localUserStorage.storeUserPassword(userId, password);
    }
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
            filteredUpdates[key as keyof Partial<User>] = value as any;
          }
        }
        
        if (Object.keys(filteredUpdates).length === 0) {
          console.error('[StorageAdapter] 没有可更新的字段');
          return false;
        }
        
        console.log(`[StorageAdapter] 用户 ${userId} 更新自己的信息:`, filteredUpdates);
        if (this.usingSQLite) {
          return await this.sqliteStorage.updateUser(userId, filteredUpdates);
        } else {
          // localStorage版本暂不支持用户更新，返回false
          return false;
        }
      }

      // 超级管理员可以更新所有字段
      console.log(`[StorageAdapter] 超级管理员 ${operatorUserId} 更新用户 ${userId} 信息:`, updates);
      if (this.usingSQLite) {
        return await this.sqliteStorage.updateUser(userId, updates);
      } else {
        // localStorage版本暂不支持用户更新，返回false
        return false;
      }
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

      if (this.usingSQLite) {
        return await this.sqliteStorage.deleteUser(userId);
      } else {
        // localStorage版本暂不支持用户删除，返回false
        return false;
      }
    } catch (error) {
      console.error('[StorageAdapter] 删除用户失败:', error);
      return false;
    }
  }

  // 获取用户详细信息（包含权限检查）
  async getUserById(userId: string): Promise<User | null> {
    if (this.usingSQLite) {
      return this.sqliteStorage.getUserById(userId);
    } else {
      // localStorage版本中没有getUserById，需要通过getAllUsers来实现
      const users = localUserStorage.getAllUsers();
      return users.find(u => u.id === userId) || null;
    }
  }

  // 检查用户是否为超级管理员
  isSuperAdmin(user: User | null): boolean {
    return user?.role === 'superadmin';
  }

  // 会话相关方法
  getCurrentSession(): UserSession | null {
    if (this.usingSQLite) {
      return this.sqliteStorage.getCurrentSession();
    } else {
      return localUserStorage.getCurrentSession();
    }
  }

  setSession(session: UserSession | null): void {
    if (this.usingSQLite) {
      this.sqliteStorage.setSession(session);
    } else {
      localUserStorage.setSession(session);
    }
  }

  /**
   * 登录，区分用户不存在和密码错误，返回详细错误
   */
  async loginWithDetail(username: string, password: string): Promise<{ session: UserSession | null; error: 'not_found' | 'wrong_password' | null }> {
    if (this.usingSQLite) {
      const user = await this.sqliteStorage.getUserByUsername(username);
      if (!user) {
        return { session: null, error: 'not_found' };
      }
      const valid = await this.sqliteStorage.validateUser(username, password);
      if (!valid) {
        return { session: null, error: 'wrong_password' };
      }
      const session = this.sqliteStorage.login(username, password);
      return { session, error: null };
    } else {
      const user = await localUserStorage.getUserByUsername(username);
      if (!user) {
        return { session: null, error: 'not_found' };
      }
      const valid = await localUserStorage.validateUser(username, password);
      if (!valid) {
        return { session: null, error: 'wrong_password' };
      }
      const session = localUserStorage.login(username, password);
      return { session, error: null };
    }
  }

  // 提示词管理
  async getPrompts(): Promise<Prompt[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];
    if (this.usingSQLite) {
      return this.sqliteStorage.getPrompts(userId);
    } else {
      return promptStorage.getAll();
    }
  }

  async createPrompt(promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('用户未登录');
    if (this.usingSQLite) {
      return this.sqliteStorage.createPrompt(userId, promptData);
    } else {
      return promptStorage.create(promptData);
    }
  }

  async updatePrompt(promptId: string, updates: Partial<Prompt>): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    if (this.usingSQLite) {
      return this.sqliteStorage.updatePrompt(userId, promptId, updates);
    } else {
      const result = promptStorage.update(promptId, updates);
      return result !== null;
    }
  }

  async deletePrompt(promptId: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    if (this.usingSQLite) {
      return this.sqliteStorage.deletePrompt(userId, promptId);
    } else {
      return promptStorage.delete(promptId);
    }
  }

  // API配置管理
  async getApiConfigs(): Promise<ApiConfig[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];
    if (this.usingSQLite) {
      return this.sqliteStorage.getApiConfigs(userId);
    } else {
      return apiConfigStorage.getAll();
    }
  }

  async createApiConfig(configData: Omit<ApiConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiConfig> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('用户未登录');
      if (this.usingSQLite) {
        return this.sqliteStorage.createApiConfig(userId, configData);
      } else {
        return apiConfigStorage.create(configData);
      }
    } catch (error) {
      console.error('[StorageAdapter] 创建API配置失败:', error, (error as any)?.stack, configData);
      throw error;
    }
  }

  async updateApiConfig(configId: string, updates: Partial<ApiConfig>): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    if (this.usingSQLite) {
      return this.sqliteStorage.updateApiConfig(userId, configId, updates);
    } else {
      const result = apiConfigStorage.update(configId, updates);
      return result !== null;
    }
  }

  async deleteApiConfig(configId: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    if (this.usingSQLite) {
      return this.sqliteStorage.deleteApiConfig(userId, configId);
    } else {
      return apiConfigStorage.delete(configId);
    }
  }

  // 获取所有可用的模型（从所有API配置中）
  async getAllModels(): Promise<Array<{ id: string; name: string; apiConfigName: string }>> {
    const apiConfigs = await this.getApiConfigs();
    const models: Array<{ id: string; name: string; apiConfigName: string }> = [];
    for (const config of apiConfigs) {
      for (const model of config.models) {
        if (model.enabled) {
          models.push({
            id: `${config.id}_${model.id}`,
            name: model.name,
            apiConfigName: config.name,
          });
        }
      }
    }
    return models;
  }

  // 根据模型ID获取API配置和模型信息
  async getModelInfo(modelId: string): Promise<{ apiConfig: any; model: any } | null> {
    try {
      const [configId, modelConfigId] = modelId.split('_');
      const apiConfigs = await this.getApiConfigs();
      const apiConfig = apiConfigs.find(c => c.id === configId);
      if (!apiConfig) return null;
      const model = apiConfig.models.find(m => m.id === modelConfigId);
      if (!model) return null;
      return { apiConfig, model };
    } catch (error) {
      console.error('[StorageAdapter] 获取模型信息失败:', error);
      return null;
    }
  }

  // 测试会话历史管理
  async getTestSessionHistory(limit: number = 50): Promise<TestSessionHistory[]> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return [];
      
      if (this.usingSQLite) {
        return this.sqliteStorage.getTestSessionHistory(userId, limit);
      } else {
        // localStorage版本暂时返回空数组
        return [];
      }
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
        console.warn('[StorageAdapter] 用户未登录，无法保存测试历史');
        return null;
      }
      
      if (this.usingSQLite) {
        return this.sqliteStorage.saveTestSessionHistory(userId, sessionData);
      } else {
        // localStorage版本暂时返回null
        return null;
      }
    } catch (error) {
      console.error('[StorageAdapter] 保存测试历史失败:', error);
      return null;
    }
  }

  async deleteTestSessionHistory(sessionId: string): Promise<boolean> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return false;
      
      if (this.usingSQLite) {
        return this.sqliteStorage.deleteTestSessionHistory(userId, sessionId);
      } else {
        // localStorage版本暂时返回false
        return false;
      }
    } catch (error) {
      console.error('[StorageAdapter] 删除测试历史失败:', error);
      return false;
    }
  }

  // 配置暂存管理
  async saveTestConfigDraft(configData: TestConfigDraft): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    if (this.usingSQLite) {
      this.sqliteStorage.saveConfigDraft(userId, 'test_config', configData);
    } else {
      // localStorage版本暂时不实现
      return;
    }
  }

  async getTestConfigDraft(): Promise<TestConfigDraft | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    if (this.usingSQLite) {
      return this.sqliteStorage.getConfigDraft(userId, 'test_config');
    } else {
      // localStorage版本暂时返回null
      return null;
    }
  }

  async clearTestConfigDraft(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    if (this.usingSQLite) {
      this.sqliteStorage.clearConfigDraft(userId, 'test_config');
    } else {
      // localStorage版本暂时不实现
      return;
    }
  }

  // 其他localStorage兼容方法
  getModels() {
    return localStorageManager.getModels();
  }

  setModels(models: any[]) {
    return localStorageManager.setModels(models);
  }

  // 默认输入模板管理
  async getDefaultTestInputs(): Promise<DefaultTestInput[]> {
    if (this.usingSQLite) {
      const userId = this.getCurrentUserId();
      if (!userId) return [];
      return this.sqliteStorage.getDefaultTestInputs(userId);
    }
    // 降级兜底（理论上不会再用到）
    return [];
  }

  async createDefaultTestInput(data: { name: string; content: string; category?: string }): Promise<DefaultTestInput | null> {
    if (this.usingSQLite) {
      const userId = this.getCurrentUserId();
      if (!userId) return null;
      return this.sqliteStorage.createDefaultTestInput(userId, data);
    }
    return null;
  }

  async updateDefaultTestInput(id: string, updates: Partial<DefaultTestInput>): Promise<boolean> {
    if (this.usingSQLite) {
      const userId = this.getCurrentUserId();
      if (!userId) return false;
      return this.sqliteStorage.updateDefaultTestInput(userId, id, updates);
    }
    return false;
  }

  async deleteDefaultTestInput(id: string): Promise<boolean> {
    if (this.usingSQLite) {
      const userId = this.getCurrentUserId();
      if (!userId) return false;
      return this.sqliteStorage.deleteDefaultTestInput(userId, id);
    }
    return false;
  }

  private async tryInitializeSQLite(): Promise<void> {
    try {
      console.log('[StorageAdapter] 💡 尝试初始化SQLite增强功能...');
      await this.sqliteStorage.initialize();
      
      // 成功初始化SQLite后，需要迁移现有数据
      console.log('[StorageAdapter] 🔄 SQLite初始化成功，开始数据迁移...');
      await this.migrateToSQLite();
      
      this.usingSQLite = true;
      console.log('[StorageAdapter] ✅ SQLite增强功能已启用');
      console.log('[StorageAdapter] 💡 高级功能可用（包括SQLite增强），可在设置中启用');
      
      // 确保SQLite中有超级管理员（迁移后再次检查）
      await this.ensureSuperAdmin();
      
    } catch (error) {
      console.warn('[StorageAdapter] ⚠️ SQLite初始化失败，但不影响基本功能:', error);
      this.usingSQLite = false;
      // 不抛出错误，让应用继续运行
      console.log('[StorageAdapter] 💡 将继续使用localStorage，功能略有限制');
    }
  }

  /**
   * 浏览器环境下强制串行初始化SQLite并迁移数据，迁移完成后才切换usingSQLite=true
   */
  async forceEnableSQLiteAndMigrate(): Promise<void> {
    if (this.environment !== 'browser') return;
    if (this.usingSQLite) return;
    // 1. 初始化SQLite
    await this.sqliteStorage.initialize();
    // 2. 迁移localStorage数据到SQLite
    await this.migrateToSQLite();
    // 3. 切换为SQLite
    this.usingSQLite = true;
    localStorage.setItem('enableAdvancedFeatures', 'true');
    console.log('[StorageAdapter] ✅ 浏览器环境下已强制启用SQLite并完成数据迁移');
  }

  /**
   * 兼容原有login方法，内部调用loginWithDetail
   */
  login(username: string, password: string, rememberMe?: boolean): UserSession | null {
    // 注意：此方法同步返回，实际只用于兼容老代码
    // 新代码请用loginWithDetail
    let session: UserSession | null = null;
    if (this.usingSQLite) {
      const user = this.sqliteStorage.getUserByUsername(username);
      if (user && this.sqliteStorage.validateUser(username, password)) {
        session = this.sqliteStorage.login(username, password);
      }
    } else {
      const user = localUserStorage.getUserByUsername(username);
      if (user && localUserStorage.validateUser(username, password)) {
        session = localUserStorage.login(username, password);
      }
    }
    if (session && rememberMe) {
      try {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberUserId', session.user.id);
        localStorage.setItem('rememberToken', session.token);
      } catch (e) {}
    }
    return session;
  }

  logout(): void {
    if (this.usingSQLite) {
      this.sqliteStorage.logout();
    } else {
      localUserStorage.logout();
    }
    try {
      localStorage.removeItem('userSession');
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberUserId');
      localStorage.removeItem('rememberToken');
    } catch (error) {
      console.error('[StorageAdapter] 清除localStorage会话失败:', error);
    }
  }

  isSessionValid(): boolean {
    if (this.usingSQLite) {
      return this.sqliteStorage.isSessionValid();
    } else {
      return localUserStorage.isSessionValid();
    }
  }

  // 用户配置导出
  async exportUserData(userId: string): Promise<any> {
    // 支持SQLite和localStorage
    let prompts = [];
    let apiConfigs = [];
    let testHistory = [];
    let configDraft = null;
    if (this.usingSQLite) {
      prompts = await this.sqliteStorage.getPrompts(userId);
      apiConfigs = await this.sqliteStorage.getApiConfigs(userId);
      testHistory = await this.sqliteStorage.getTestSessionHistory(userId, 1000);
      configDraft = await this.sqliteStorage.getConfigDraft(userId, 'test_config');
    } else {
      prompts = JSON.parse(localStorage.getItem(`${userId}_prompts`) || '[]');
      apiConfigs = JSON.parse(localStorage.getItem(`${userId}_apiConfigs`) || '[]');
      testHistory = JSON.parse(localStorage.getItem(`${userId}_testHistory`) || '[]');
      configDraft = JSON.parse(localStorage.getItem(`${userId}_testConfigDraft`) || 'null');
    }
    return { prompts, apiConfigs, testHistory, configDraft };
  }

  // 用户配置导入
  async importUserData(userId: string, data: any): Promise<void> {
    if (!data) return;
    if (this.usingSQLite) {
      if (Array.isArray(data.prompts)) {
        for (const prompt of data.prompts) {
          await this.sqliteStorage.createPrompt(userId, prompt);
        }
      }
      if (Array.isArray(data.apiConfigs)) {
        for (const config of data.apiConfigs) {
          await this.sqliteStorage.createApiConfig(userId, config);
        }
      }
      if (Array.isArray(data.testHistory)) {
        for (const history of data.testHistory) {
          await this.sqliteStorage.saveTestSessionHistory(userId, history);
        }
      }
      if (data.configDraft) {
        await this.sqliteStorage.saveConfigDraft(userId, 'test_config', data.configDraft);
      }
    } else {
      if (Array.isArray(data.prompts)) {
        localStorage.setItem(`${userId}_prompts`, JSON.stringify(data.prompts));
      }
      if (Array.isArray(data.apiConfigs)) {
        localStorage.setItem(`${userId}_apiConfigs`, JSON.stringify(data.apiConfigs));
      }
      if (Array.isArray(data.testHistory)) {
        localStorage.setItem(`${userId}_testHistory`, JSON.stringify(data.testHistory));
      }
      if (data.configDraft) {
        localStorage.setItem(`${userId}_testConfigDraft`, JSON.stringify(data.configDraft));
      }
    }
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
  createDefaultTestInput: (data: { name: string; content: string; category?: string }) => storageAdapter.createDefaultTestInput(data),
  updateDefaultTestInput: (id: string, updates: Partial<DefaultTestInput>) => storageAdapter.updateDefaultTestInput(id, updates),
  deleteDefaultTestInput: (id: string) => storageAdapter.deleteDefaultTestInput(id),
};

export const userStorage = {
  // 用户管理
  getAllUsers: () => storageAdapter.getAllUsers(),
  getUserByUsername: (username: string) => storageAdapter.getUserByUsername(username),
  getUserByEmail: (email: string) => localUserStorage.getUserByEmail(email), // 暂时使用原实现
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, password?: string) => storageAdapter.createUser(data, password),
  validateUser: (username: string, password: string) => storageAdapter.validateUser(username, password),
  storeUserPassword: (userId: string, password: string) => storageAdapter.storeUserPassword(userId, password),

  // 会话管理
  getCurrentSession: () => storageAdapter.getCurrentSession(),
  setSession: (session: UserSession | null) => storageAdapter.setSession(session),
  login: (username: string, password: string) => storageAdapter.login(username, password),
  logout: () => storageAdapter.logout(),
  isSessionValid: () => storageAdapter.isSessionValid(),
}; 

// 调试：将storageAdapter暴露到全局
if (typeof window !== 'undefined') {
  (window as any).storageAdapter = storageAdapter;
} 