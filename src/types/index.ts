// 提示词类型
export interface Prompt {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// 请求模式类型
export type RequestMode = 'url' | 'api';

// 模型配置类型
export interface ModelConfig {
  id: string;
  modelId: string; // API调用时使用的实际模型ID
  name: string; // 显示名称
  enabled: boolean;
}

// API配置类型
export interface ApiConfig {
  id: string;
  name: string;
  requestMode: RequestMode;
  // URL模式配置
  directUrl?: string;
  // API模式配置
  apiKey?: string;
  baseUrl?: string;
  // 模型配置
  models: ModelConfig[];
  createdAt: string;
  updatedAt: string;
}

// 保持向后兼容的模型类型
export interface Model {
  id: string;
  name: string;
  apiConfigId: string;
  createdAt: string;
  updatedAt: string;
}

// 测试参数类型
export interface TestParams {
  userInputs: string[];
  promptId: string;
  modelId: string;
  repetitions: number;
  interval: number;
}

// 测试结果类型
export interface TestResult {
  id: string;
  userInput: string;
  promptName: string;
  modelName: string;
  repetitionIndex: number;
  output: string;
  status: 'pending' | 'success' | 'error';
  errorMessage?: string;
  timestamp: string;
  duration?: number; // 总耗时（毫秒）
  requestDuration?: number; // 请求耗时（毫秒）- 从发送请求到收到响应
  processingDuration?: number; // 模型处理耗时（毫秒）- 模型实际处理时间
}

// 测试会话类型
export interface TestSession {
  id: string;
  params: TestParams;
  results: TestResult[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'stopped';
  startTime?: string;
  endTime?: string;
  pausedTime?: string;
  progress: {
    current: number;
    total: number;
  };
}

// OpenAI API请求类型
export interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

// OpenAI API响应类型
export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 默认测试输入
export interface DefaultTestInput {
  id: string;
  name: string;
  content: string;
  category: string;
  createdAt: string;
}

// 用户类型
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// 用户会话类型
export interface UserSession {
  user: User;
  token: string;
  expiresAt: string;
}

// 登录表单类型
export interface LoginForm {
  username: string;
  password: string;
}

// 注册表单类型
export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// 测试会话历史记录
export interface TestSessionHistory {
  id: string;
  userId: string;
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
  createdAt: string;
}

// 配置暂存（用于页面刷新恢复）
export interface ConfigDraft {
  id: string;
  userId: string;
  draftType: 'test_config' | 'prompt_edit' | 'api_config_edit';
  data: any; // 存储具体的配置数据
  lastModified: string;
  autoSaved: boolean;
}

// 测试配置暂存
export interface TestConfigDraft {
  userInputs: string[];
  promptId: string;
  modelId: string;
  repetitions: number;
  interval: number;
  selectedPromptName?: string;
  selectedModelName?: string;
}

// 数据库表结构
export interface DatabaseSchema {
  users: User;
  prompts: Prompt;
  api_configs: ApiConfig;
  test_session_history: TestSessionHistory;
  config_drafts: ConfigDraft;
  user_sessions: UserSession;
} 