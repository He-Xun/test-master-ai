import { Prompt, ApiConfig, Model } from '../types';

// 检查是否在Electron环境中
const isElectron = () => {
  return typeof window !== 'undefined' && 
         typeof (window as any).require !== 'undefined' &&
         typeof (window as any).process !== 'undefined';
};

// 浏览器存储实现
class BrowserStorage {
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
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

  getSettings(): { theme: 'light' | 'dark'; language: 'zh' | 'en' } {
    return this.getItem('settings', { theme: 'light', language: 'zh' });
  }

  setSettings(settings: { theme: 'light' | 'dark'; language: 'zh' | 'en' }): void {
    this.setItem('settings', settings);
  }
}

// Electron存储实现
class ElectronStorage {
  private store: any;

  constructor() {
    // 动态导入electron-store，只在Electron环境中使用
    if (isElectron()) {
      try {
        const Store = (window as any).require('electron-store');
        this.store = new Store();
      } catch (error) {
        console.error('Failed to initialize electron-store:', error);
        // 降级到浏览器存储
        return new BrowserStorage() as any;
      }
    }
  }

  getPrompts(): Prompt[] {
    return this.store?.get('prompts', []) || [];
  }

  setPrompts(prompts: Prompt[]): void {
    this.store?.set('prompts', prompts);
  }

  getApiConfigs(): ApiConfig[] {
    return this.store?.get('apiConfigs', []) || [];
  }

  setApiConfigs(configs: ApiConfig[]): void {
    this.store?.set('apiConfigs', configs);
  }

  getModels(): Model[] {
    return this.store?.get('models', []) || [];
  }

  setModels(models: Model[]): void {
    this.store?.set('models', models);
  }

  getSettings(): { theme: 'light' | 'dark'; language: 'zh' | 'en' } {
    return this.store?.get('settings', { theme: 'light', language: 'zh' }) || { theme: 'light', language: 'zh' };
  }

  setSettings(settings: { theme: 'light' | 'dark'; language: 'zh' | 'en' }): void {
    this.store?.set('settings', settings);
  }
}

// 创建存储实例
const createStorage = () => {
  if (isElectron()) {
    return new ElectronStorage();
  } else {
    return new BrowserStorage();
  }
};

export const storage = createStorage();

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 提示词管理
export const promptStorage = {
  getAll: (): Prompt[] => storage.getPrompts(),
  
  getById: (id: string): Prompt | undefined => {
    const prompts = storage.getPrompts();
    return prompts.find(p => p.id === id);
  },
  
  create: (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Prompt => {
    const prompt: Prompt = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const prompts = storage.getPrompts();
    prompts.push(prompt);
    storage.setPrompts(prompts);
    
    return prompt;
  },
  
  update: (id: string, data: Partial<Omit<Prompt, 'id' | 'createdAt'>>): Prompt | null => {
    const prompts = storage.getPrompts();
    const index = prompts.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    const updatedPrompt: Prompt = {
      ...prompts[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedPrompts = prompts.map((p, i) => i === index ? updatedPrompt : p);
    storage.setPrompts(updatedPrompts);
    
    return updatedPrompt;
  },
  
  delete: (id: string): boolean => {
    const prompts = storage.getPrompts();
    const filteredPrompts = prompts.filter(p => p.id !== id);
    
    if (filteredPrompts.length === prompts.length) return false;
    
    storage.setPrompts(filteredPrompts);
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
  getAll: (): ApiConfig[] => storage.getApiConfigs(),
  
  getById: (id: string): ApiConfig | undefined => {
    const configs = storage.getApiConfigs();
    return configs.find(c => c.id === id);
  },
  
  create: (data: Omit<ApiConfig, 'id' | 'createdAt' | 'updatedAt'>): ApiConfig => {
    const config: ApiConfig = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const configs = storage.getApiConfigs();
    configs.push(config);
    storage.setApiConfigs(configs);
    
    return config;
  },
  
  update: (id: string, data: Partial<Omit<ApiConfig, 'id' | 'createdAt'>>): ApiConfig | null => {
    const configs = storage.getApiConfigs();
    const index = configs.findIndex(c => c.id === id);
    
    if (index === -1) return null;
    
    const updatedConfig: ApiConfig = {
      ...configs[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    const updatedConfigs = configs.map((c, i) => i === index ? updatedConfig : c);
    storage.setApiConfigs(updatedConfigs);
    
    return updatedConfig;
  },
  
  delete: (id: string): boolean => {
    const configs = storage.getApiConfigs();
    const filteredConfigs = configs.filter(c => c.id !== id);
    
    if (filteredConfigs.length === configs.length) return false;
    
    storage.setApiConfigs(filteredConfigs);
    return true;
  },
};

// 模型管理
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

// 设置管理
export const settingsStorage = {
  get: () => storage.getSettings(),
  
  update: (settings: Partial<{ theme: 'light' | 'dark'; language: 'zh' | 'en' }>) => {
    const current = storage.getSettings();
    storage.setSettings({ ...current, ...settings });
  },
};

export default storage; 