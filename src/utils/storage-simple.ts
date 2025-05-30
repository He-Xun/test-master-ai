import { Prompt, ApiConfig, Model, ModelConfig, DefaultTestInput, User, UserSession } from '../types';

// 简化的存储实现，只使用localStorage
class SimpleStorage {
  // 获取当前用户ID
  private getCurrentUserId(): string | null {
    try {
      const session = localStorage.getItem('userSession');
      if (session) {
        const userSession = JSON.parse(session);
        return userSession.user?.id || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  // 获取用户特定的存储键
  private getUserKey(key: string): string {
    const userId = this.getCurrentUserId();
    return userId ? `${userId}_${key}` : key;
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const userKey = this.getUserKey(key);
      const item = localStorage.getItem(userKey);
      console.log(`[Storage] 读取 ${userKey}:`, item ? '有数据' : '无数据');
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`[Storage] 读取 ${key} 失败:`, error);
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      const userKey = this.getUserKey(key);
      const jsonString = JSON.stringify(value);
      localStorage.setItem(userKey, jsonString);
      console.log(`[Storage] 保存 ${userKey} 成功:`, Array.isArray(value) ? `${value.length} 项` : '1 项');
      
      // 验证保存是否成功
      const saved = localStorage.getItem(userKey);
      if (saved !== jsonString) {
        console.error(`[Storage] 保存验证失败 ${userKey}`);
      }
    } catch (error) {
      console.error(`[Storage] 保存 ${key} 失败:`, error);
      throw error;
    }
  }

  getPrompts(): Prompt[] {
    return this.getItem('prompts', []);
  }

  setPrompts(prompts: Prompt[]): void {
    this.setItem('prompts', prompts);
  }

  getApiConfigs(): ApiConfig[] {
    return this.getItem('apiConfigs', []);
  }

  setApiConfigs(configs: ApiConfig[]): void {
    this.setItem('apiConfigs', configs);
  }

  getModels(): Model[] {
    return this.getItem('models', []);
  }

  setModels(models: Model[]): void {
    this.setItem('models', models);
  }

  getDefaultTestInputs(): DefaultTestInput[] {
    return this.getItem('defaultTestInputs', this.getInitialDefaultInputs());
  }

  setDefaultTestInputs(inputs: DefaultTestInput[]): void {
    this.setItem('defaultTestInputs', inputs);
  }

  getSettings(): { theme: 'light' | 'dark'; language: 'zh' | 'en' } {
    return this.getItem('settings', { theme: 'light', language: 'zh' });
  }

  setSettings(settings: { theme: 'light' | 'dark'; language: 'zh' | 'en' }): void {
    this.setItem('settings', settings);
  }

  // 用户管理方法
  getUsers(): User[] {
    return this.getItem('allUsers', []);
  }

  setUsers(users: User[]): void {
    this.setItem('allUsers', users);
  }

  getUserSession(): UserSession | null {
    try {
      const session = localStorage.getItem('userSession');
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  }

  setUserSession(session: UserSession | null): void {
    try {
      if (session) {
        localStorage.setItem('userSession', JSON.stringify(session));
      } else {
        localStorage.removeItem('userSession');
      }
    } catch (error) {
      console.error('[Storage] 保存用户会话失败:', error);
    }
  }

  // 获取初始默认测试输入
  private getInitialDefaultInputs(): DefaultTestInput[] {
    return [
      {
        id: 'default-1',
        name: '简单问候',
        content: '你好，请介绍一下你自己。',
        category: '基础测试',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'default-2',
        name: '逻辑推理',
        content: '如果所有的猫都是动物，而小花是一只猫，那么小花是什么？',
        category: '逻辑测试',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'default-3',
        name: '创意写作',
        content: '请写一个关于机器人学会做饭的短故事，不超过100字。',
        category: '创意测试',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'default-4',
        name: '数学计算',
        content: '计算 25 × 34 + 156 ÷ 12 的结果。',
        category: '计算测试',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'default-5',
        name: '知识问答',
        content: '请解释什么是人工智能，并举一个实际应用的例子。',
        category: '知识测试',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'default-6',
        name: '英文翻译',
        content: '请将以下英文翻译成中文：The quick brown fox jumps over the lazy dog.',
        category: '翻译测试',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'default-7',
        name: '中文翻译',
        content: '请将以下中文翻译成英文：科技改变了我们的生活方式，使得工作和学习变得更加高效。',
        category: '翻译测试',
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

export const storage = new SimpleStorage();

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 提示词管理
export const promptStorage = {
  getAll: (): Prompt[] => {
    const prompts = storage.getPrompts();
    console.log(`[PromptStorage] 获取所有提示词: ${prompts.length} 个`);
    return prompts;
  },
  
  getById: (id: string): Prompt | undefined => {
    const prompts = storage.getPrompts();
    return prompts.find(p => p.id === id);
  },
  
  create: (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Prompt => {
    console.log(`[PromptStorage] 创建提示词:`, data.name);
    const prompt: Prompt = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const prompts = storage.getPrompts();
    prompts.push(prompt);
    storage.setPrompts(prompts);
    
    console.log(`[PromptStorage] 提示词创建成功，总数: ${prompts.length}`);
    return prompt;
  },
  
  update: (id: string, data: Partial<Omit<Prompt, 'id' | 'createdAt'>>): Prompt | null => {
    console.log(`[PromptStorage] 更新提示词: ${id}`);
    const prompts = storage.getPrompts();
    const index = prompts.findIndex(p => p.id === id);
    
    if (index === -1) {
      console.warn(`[PromptStorage] 未找到提示词: ${id}`);
      return null;
    }
    
    const updatedPrompt: Prompt = {
      ...prompts[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedPrompts = prompts.map((p, i) => i === index ? updatedPrompt : p);
    storage.setPrompts(updatedPrompts);
    
    console.log(`[PromptStorage] 提示词更新成功: ${updatedPrompt.name}`);
    return updatedPrompt;
  },
  
  delete: (id: string): boolean => {
    console.log(`[PromptStorage] 删除提示词: ${id}`);
    const prompts = storage.getPrompts();
    const filteredPrompts = prompts.filter(p => p.id !== id);
    
    if (filteredPrompts.length === prompts.length) {
      console.warn(`[PromptStorage] 未找到要删除的提示词: ${id}`);
      return false;
    }
    
    storage.setPrompts(filteredPrompts);
    console.log(`[PromptStorage] 提示词删除成功，剩余: ${filteredPrompts.length}`);
    return true;
  },
  
  search: (query: string): Prompt[] => {
    const prompts = storage.getPrompts();
    const lowerQuery = query.toLowerCase();
    return prompts.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.content.toLowerCase().includes(lowerQuery)
    );
  },
};

// API配置管理
export const apiConfigStorage = {
  getAll: (): ApiConfig[] => {
    const configs = storage.getApiConfigs();
    console.log(`[ApiConfigStorage] 获取所有API配置: ${configs.length} 个`);
    return configs;
  },
  
  getById: (id: string): ApiConfig | undefined => {
    const configs = storage.getApiConfigs();
    return configs.find(c => c.id === id);
  },
  
  create: (data: Omit<ApiConfig, 'id' | 'createdAt' | 'updatedAt'>): ApiConfig => {
    console.log(`[ApiConfigStorage] 创建API配置:`, data.name);
    const config: ApiConfig = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const configs = storage.getApiConfigs();
    configs.push(config);
    storage.setApiConfigs(configs);
    
    console.log(`[ApiConfigStorage] API配置创建成功，总数: ${configs.length}`);
    return config;
  },
  
  update: (id: string, data: Partial<Omit<ApiConfig, 'id' | 'createdAt'>>): ApiConfig | null => {
    console.log(`[ApiConfigStorage] 更新API配置: ${id}`);
    const configs = storage.getApiConfigs();
    const index = configs.findIndex(c => c.id === id);
    
    if (index === -1) {
      console.warn(`[ApiConfigStorage] 未找到API配置: ${id}`);
      return null;
    }
    
    const updatedConfig: ApiConfig = {
      ...configs[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedConfigs = configs.map((c, i) => i === index ? updatedConfig : c);
    storage.setApiConfigs(updatedConfigs);
    
    console.log(`[ApiConfigStorage] API配置更新成功: ${updatedConfig.name}`);
    return updatedConfig;
  },
  
  delete: (id: string): boolean => {
    console.log(`[ApiConfigStorage] 删除API配置: ${id}`);
    const configs = storage.getApiConfigs();
    const filteredConfigs = configs.filter(c => c.id !== id);
    
    if (filteredConfigs.length === configs.length) {
      console.warn(`[ApiConfigStorage] 未找到要删除的API配置: ${id}`);
      return false;
    }
    
    storage.setApiConfigs(filteredConfigs);
    console.log(`[ApiConfigStorage] API配置删除成功，剩余: ${filteredConfigs.length}`);
    return true;
  },

  // 获取所有可用的模型（从所有API配置中）
  getAllModels: (): Array<{ id: string; name: string; apiConfigName: string }> => {
    const configs = storage.getApiConfigs();
    const models: Array<{ id: string; name: string; apiConfigName: string }> = [];
    
    console.log(`[ApiConfigStorage] 从 ${configs.length} 个API配置中提取模型`);
    
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
    
    console.log(`[ApiConfigStorage] 提取到 ${models.length} 个可用模型`);
    return models;
  },

  // 根据模型ID获取API配置和模型信息
  getModelInfo: (modelId: string): { apiConfig: ApiConfig; model: ModelConfig } | null => {
    console.log(`[ApiConfigStorage] 获取模型信息: ${modelId}`);
    const [apiConfigId, modelConfigId] = modelId.split('_');
    const apiConfig = storage.getApiConfigs().find(c => c.id === apiConfigId);
    
    if (!apiConfig) {
      console.warn(`[ApiConfigStorage] 未找到API配置: ${apiConfigId}`);
      return null;
    }
    
    const model = apiConfig.models.find(m => m.id === modelConfigId);
    if (!model) {
      console.warn(`[ApiConfigStorage] 未找到模型: ${modelConfigId}`);
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
    
    console.log(`[ApiConfigStorage] 找到模型: ${displayName} (API调用ID: ${modelIdForApi}) (${apiConfig.name})`);
    console.log(`[ApiConfigStorage] 增强后的模型对象:`, enhancedModel);
    return { apiConfig, model: enhancedModel };
  },
};

// 保持向后兼容的模型管理
export const modelStorage = {
  getAll: (): Model[] => storage.getModels(),
  
  getById: (id: string): Model | undefined => {
    const models = storage.getModels();
    return models.find(m => m.id === id);
  },
  
  getByApiConfigId: (apiConfigId: string): Model[] => {
    const models = storage.getModels();
    return models.filter(m => m.apiConfigId === apiConfigId);
  },
  
  create: (data: Omit<Model, 'id' | 'createdAt' | 'updatedAt'>): Model => {
    const model: Model = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const models = storage.getModels();
    models.push(model);
    storage.setModels(models);
    
    return model;
  },
  
  update: (id: string, data: Partial<Omit<Model, 'id' | 'createdAt'>>): Model | null => {
    const models = storage.getModels();
    const index = models.findIndex(m => m.id === id);
    
    if (index === -1) return null;
    
    const updatedModel: Model = {
      ...models[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedModels = models.map((m, i) => i === index ? updatedModel : m);
    storage.setModels(updatedModels);
    
    return updatedModel;
  },
  
  delete: (id: string): boolean => {
    const models = storage.getModels();
    const filteredModels = models.filter(m => m.id !== id);
    
    if (filteredModels.length === models.length) return false;
    
    storage.setModels(filteredModels);
    return true;
  },
};

// 默认测试输入管理
export const defaultTestInputStorage = {
  getAll: (): DefaultTestInput[] => storage.getDefaultTestInputs(),
  
  getById: (id: string): DefaultTestInput | undefined => {
    const inputs = storage.getDefaultTestInputs();
    return inputs.find(i => i.id === id);
  },
  
  getByCategory: (category: string): DefaultTestInput[] => {
    const inputs = storage.getDefaultTestInputs();
    return inputs.filter(i => i.category === category);
  },
  
  create: (data: Omit<DefaultTestInput, 'id' | 'createdAt'>): DefaultTestInput => {
    const input: DefaultTestInput = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    
    const inputs = storage.getDefaultTestInputs();
    inputs.push(input);
    storage.setDefaultTestInputs(inputs);
    
    return input;
  },
  
  update: (id: string, data: Partial<Omit<DefaultTestInput, 'id' | 'createdAt'>>): DefaultTestInput | null => {
    const inputs = storage.getDefaultTestInputs();
    const index = inputs.findIndex(i => i.id === id);
    
    if (index === -1) return null;
    
    const updatedInput: DefaultTestInput = {
      ...inputs[index],
      ...data,
    };
    
    const updatedInputs = inputs.map((i, idx) => idx === index ? updatedInput : i);
    storage.setDefaultTestInputs(updatedInputs);
    
    return updatedInput;
  },
  
  delete: (id: string): boolean => {
    const inputs = storage.getDefaultTestInputs();
    const filteredInputs = inputs.filter(i => i.id !== id);
    
    if (filteredInputs.length === inputs.length) return false;
    
    storage.setDefaultTestInputs(filteredInputs);
    return true;
  },
  
  getCategories: (): string[] => {
    const inputs = storage.getDefaultTestInputs();
    const categories = Array.from(new Set(inputs.map(i => i.category)));
    return categories.sort();
  },
};

// 设置管理
export const settingsStorage = {
  get: () => storage.getSettings(),
  
  update: (settings: Partial<{ theme: 'light' | 'dark'; language: 'zh' | 'en' }>) => {
    const current = storage.getSettings();
    storage.setSettings({ ...current, ...settings });
  },
};

// 用户管理
export const userStorage = {
  // 获取所有用户
  getAllUsers: (): User[] => {
    return storage.getUsers();
  },

  // 根据用户名查找用户
  getUserByUsername: (username: string): User | undefined => {
    const users = storage.getUsers();
    return users.find(u => u.username === username);
  },

  // 根据邮箱查找用户
  getUserByEmail: (email: string): User | undefined => {
    const users = storage.getUsers();
    return users.find(u => u.email === email);
  },

  // 创建用户
  createUser: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
    console.log(`[UserStorage] 创建用户:`, userData.username);
    const user: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const users = storage.getUsers();
    users.push(user);
    storage.setUsers(users);
    
    console.log(`[UserStorage] 用户创建成功，总数: ${users.length}`);
    return user;
  },

  // 验证用户密码（简单实现，实际应用中应该使用加密）
  validateUser: (username: string, password: string): User | null => {
    const users = storage.getUsers();
    const user = users.find(u => u.username === username);
    
    if (user) {
      // 这里简化处理，实际应用中应该比较加密后的密码
      // 临时存储密码用于验证（仅用于演示）
      const storedPassword = localStorage.getItem(`pwd_${user.id}`);
      if (storedPassword === password) {
        return user;
      }
    }
    return null;
  },

  // 存储用户密码（简化实现）
  storeUserPassword: (userId: string, password: string): void => {
    localStorage.setItem(`pwd_${userId}`, password);
  },

  // 获取当前用户会话
  getCurrentSession: (): UserSession | null => {
    return storage.getUserSession();
  },

  // 设置用户会话
  setSession: (session: UserSession | null): void => {
    storage.setUserSession(session);
  },

  // 登录
  login: (username: string, password: string): UserSession | null => {
    const user = userStorage.validateUser(username, password);
    if (user) {
      const session: UserSession = {
        user,
        token: generateId(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时
      };
      storage.setUserSession(session);
      console.log(`[UserStorage] 用户登录成功: ${user.username}`);
      return session;
    }
    return null;
  },

  // 登出
  logout: (): void => {
    storage.setUserSession(null);
    console.log(`[UserStorage] 用户已登出`);
  },

  // 检查会话是否有效
  isSessionValid: (): boolean => {
    const session = storage.getUserSession();
    if (!session) return false;
    
    const now = new Date();
    const expires = new Date(session.expiresAt);
    return now < expires;
  },
};

export default storage; 