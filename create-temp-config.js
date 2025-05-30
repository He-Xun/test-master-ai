// 临时配置脚本：添加真实API配置到应用
console.log('正在创建API配置...');

// 准备API配置数据
const apiConfig = {
  id: `api-config-${Date.now()}`,
  name: "云雾AI (真实配置)",
  requestMode: "api",
  baseUrl: "http://yunwu.ai",
  apiKey: "",
  models: [
    {
      id: `model-${Date.now()}-1`,
      modelId: "gpt-4o-mini",
      name: "GPT-4o Mini",
      enabled: true
    },
    {
      id: `model-${Date.now()}-2`,
      modelId: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      enabled: true
    },
    {
      id: `model-${Date.now()}-3`,
      modelId: "claude-3-5-sonnet-20241022",
      name: "Claude 3.5 Sonnet",
      enabled: true
    },
    {
      id: `model-${Date.now()}-4`,
      modelId: "qwen-plus",
      name: "Qwen Plus",
      enabled: true
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// 获取现有配置
const existingConfigs = JSON.parse(localStorage.getItem('apiConfigs') || '[]');

// 检查是否已存在相同的配置
const existingIndex = existingConfigs.findIndex(config => 
  config.baseUrl === apiConfig.baseUrl && config.apiKey === apiConfig.apiKey
);

if (existingIndex >= 0) {
  // 更新现有配置
  existingConfigs[existingIndex] = apiConfig;
  console.log('更新现有API配置');
} else {
  // 添加新配置
  existingConfigs.push(apiConfig);
  console.log('添加新API配置');
}

// 保存到localStorage
localStorage.setItem('apiConfigs', JSON.stringify(existingConfigs));

console.log('API配置已保存！');
console.log('配置详情:', apiConfig);
console.log('总配置数量:', existingConfigs.length);

// 自动刷新页面以应用新配置
if (typeof window !== 'undefined') {
  setTimeout(() => {
    window.location.reload();
  }, 1000);
} 