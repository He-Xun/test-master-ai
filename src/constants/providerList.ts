// 服务商列表常量
export const PROVIDERS = [
  {
    key: 'yunwu',
    label: '云雾',
    baseUrl: 'https://yunwu.ai/v1',
    desc: '云雾API是OpenAI官方中转服务，支持200+模型',
  },
  {
    key: 'qwen',
    label: '通义千问',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    desc: '阿里云百炼，支持OpenAI兼容或DashScope方式调用',
  },
  {
    key: 'siliconflow',
    label: '硅基流动',
    baseUrl: 'https://cloud.siliconflow.cn/v1',
    desc: '专业的大模型托管平台，支持DeepSeek、Gemini等多种模型',
  },
  {
    key: 'gemini',
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
    desc: 'Google官方API，需要Google API Key',
  },
  {
    key: 'moonshot',
    label: '月之暗面',
    baseUrl: 'https://api.moonshot.cn/v1',
    desc: 'Moonshot AI出品的智能助手 Kimi',
  },
  {
    key: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    desc: 'AI模型聚合平台，整合了全球200多种主流AI模型',
  },
  {
    key: 'jina',
    label: 'Jina',
    baseUrl: 'https://api.jina.ai/v1',
    desc: 'Jina AI的API服务',
  },
  {
    key: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    desc: 'DeepSeek官方API，也可通过硅基流动等平台调用',
  },
  {
    key: 'ollama',
    label: 'Ollama（本地）',
    baseUrl: 'http://localhost:11434',
    desc: '本地Ollama客户端',
  },
  {
    key: 'lmstudio',
    label: 'LM Studio（本地）',
    baseUrl: 'http://localhost:1234/v1',
    desc: '本地LM Studio客户端',
  },
  {
    key: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    desc: 'OpenAI官方API',
  },
  {
    key: 'custom',
    label: '自定义',
    baseUrl: '',
    desc: '自定义服务商，可手动填写Base URL',
  },
]; 