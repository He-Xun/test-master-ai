import axios, { AxiosResponse } from 'axios';
import { ApiConfig, OpenAIRequest, OpenAIResponse, ModelConfig } from '../types';

// 自定义错误类
export class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// 延迟函数，支持中止信号
export const delay = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('操作已中止'));
      return;
    }
    
    const timeout = setTimeout(resolve, ms);
    
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('操作已中止'));
      });
    }
  });
};

// 构建OpenAI格式的请求
export const buildOpenAIRequest = (
  model: string,
  systemPrompt: string,
  userInput: string,
  temperature: number = 0.7,
  maxTokens: number = 2000
): OpenAIRequest => {
  return {
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userInput,
      },
    ],
    temperature,
    max_tokens: maxTokens,
  };
};

// 定义API调用结果类型，包含详细的耗时信息
export interface ApiCallResult {
  output: string;
  requestDuration: number; // 请求耗时（网络传输时间）
  processingDuration?: number; // 模型处理耗时（从响应中提取，如果可用）
  totalDuration: number; // 总耗时
}

// URL模式请求
export const callDirectUrlAPI = async (
  config: ApiConfig,
  model: string,
  prompt: string,
  userInput: string,
  signal?: AbortSignal
): Promise<ApiCallResult> => {
  if (!config.directUrl) {
    throw new ApiError('URL模式下必须配置请求URL');
  }

  const startTime = Date.now();
  
  try {
    const requestData = {
      model,
      prompt,
      user_input: userInput,
      temperature: 0.7,
      max_tokens: 2000,
    };

    const requestStartTime = Date.now();
    const response = await axios.post(config.directUrl, requestData, {
      timeout: 30000, // 30秒超时
      signal, // 添加中止信号支持
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const requestEndTime = Date.now();

    const requestDuration = requestEndTime - requestStartTime;
    const totalDuration = Date.now() - startTime;

    // 假设直接URL返回的是简单的文本响应或者包含content字段的对象
    let output: string;
    let processingDuration: number | undefined;

    if (typeof response.data === 'string') {
      output = response.data;
    } else if (response.data && response.data.content) {
      output = response.data.content;
      // 尝试从响应中提取处理时间
      processingDuration = response.data.processing_time || response.data.processingTime;
    } else if (response.data && response.data.response) {
      output = response.data.response;
      processingDuration = response.data.processing_time || response.data.processingTime;
    } else if (response.data && response.data.text) {
      output = response.data.text;
      processingDuration = response.data.processing_time || response.data.processingTime;
    } else {
      output = JSON.stringify(response.data);
    }

    return {
      output,
      requestDuration,
      processingDuration,
      totalDuration
    };
  } catch (error: any) {
    if (axios.isCancel(error) || error.name === 'AbortError') {
      throw new ApiError('请求已被取消');
    }
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      throw new ApiError('请求超时（30秒），请检查网络连接或稍后重试');
    }
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 
                     error.response.data?.message || 
                     `HTTP ${status} 错误`;
      throw new ApiError(message, status);
    } else if (error.request) {
      throw new ApiError('网络请求失败，请检查网络连接');
    } else {
      throw new ApiError(`请求配置错误: ${error.message}`);
    }
  }
};

// API模式请求（兼容OpenAI和第三方API）
export const callOpenAIAPI = async (
  config: ApiConfig,
  request: OpenAIRequest,
  signal?: AbortSignal
): Promise<{ response: OpenAIResponse; requestDuration: number }> => {
  if (!config.baseUrl || !config.apiKey) {
    throw new ApiError('API模式下必须配置baseUrl和apiKey');
  }

  try {
    // 判断是否使用代理
    const useProxy = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
    let requestUrl: string;
    
    if (useProxy && config.baseUrl.includes('yunwu.ai')) {
      // 开发环境且是yunwu.ai的请求，使用代理
      requestUrl = '/api-proxy/v1/chat/completions';
      console.log('🔍 [API调试] API调用使用代理模式');
    } else {
      // 构建直连URL
      if (!config.baseUrl.includes('/chat/completions') && !config.baseUrl.includes('/v1')) {
        requestUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
      } else if (config.baseUrl.includes('/v1') && !config.baseUrl.includes('/chat/completions')) {
        requestUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
      } else {
        requestUrl = config.baseUrl;
      }
      console.log('🔍 [API调试] API调用使用直连模式');
    }
    
    console.log('🔍 [API调试] API请求URL:', requestUrl);
    console.log('🔍 [API调试] API请求数据:', request);

    const requestStartTime = Date.now();
    const response: AxiosResponse<OpenAIResponse> = await axios.post(
      requestUrl,
      request,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30秒超时
        signal, // 添加中止信号支持
      }
    );
    const requestEndTime = Date.now();

    const requestDuration = requestEndTime - requestStartTime;
    console.log('🔍 [API调试] API调用成功，耗时:', requestDuration + 'ms');

    return {
      response: response.data,
      requestDuration
    };
  } catch (error: any) {
    if (axios.isCancel(error) || error.name === 'AbortError') {
      throw new ApiError('请求已被取消');
    }
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      throw new ApiError('请求超时（30秒），请检查网络连接或稍后重试');
    }
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 
                     error.response.data?.message || 
                     `HTTP ${status} 错误`;
      throw new ApiError(message, status);
    } else if (error.request) {
      throw new ApiError('网络请求失败，请检查网络连接');
    } else {
      throw new ApiError(`请求配置错误: ${error.message}`);
    }
  }
};

// 统一的API调用接口
export const callAPI = async (
  config: ApiConfig,
  model: string,
  prompt: string,
  userInput: string,
  signal?: AbortSignal
): Promise<ApiCallResult> => {
  const startTime = Date.now();
  
  if (config.requestMode === 'url') {
    return await callDirectUrlAPI(config, model, prompt, userInput, signal);
  } else {
    const request = buildOpenAIRequest(model, prompt, userInput);
    const { response, requestDuration } = await callOpenAIAPI(config, request, signal);
    const output = extractResponseContent(response);
    const totalDuration = Date.now() - startTime;
    
    // 从OpenAI响应中提取处理时间信息（如果可用）
    const processingDuration = extractProcessingDuration(response);
    
    return {
      output,
      requestDuration,
      processingDuration,
      totalDuration
    };
  }
};

// 提取响应内容
export const extractResponseContent = (response: OpenAIResponse): string => {
  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message.content || '';
  }
  return '';
};

// 提取模型处理耗时（从OpenAI响应中，如果可用）
export const extractProcessingDuration = (response: OpenAIResponse): number | undefined => {
  // OpenAI标准响应通常不包含处理时间，但第三方API可能会包含
  // 尝试从响应的自定义字段中提取
  const responseData = response as any;
  return responseData.processing_time || responseData.processingTime || responseData.model_processing_time;
};

// 获取可用模型列表
export const fetchAvailableModels = async (config: ApiConfig): Promise<Array<{id: string, name: string}>> => {
  if (!config.baseUrl || !config.apiKey) {
    throw new ApiError('获取模型列表需要配置baseUrl和apiKey');
  }

  try {
    // 判断是否开发环境
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let requestUrl: string;
    let base = config.baseUrl.replace(/\/$/, '');
    if (isDev) {
      // 走本地万能代理
      requestUrl = `/proxy/${encodeURIComponent(base)}/models`;
    } else {
      // 生产环境直连
      if (base.endsWith('/v1')) {
        requestUrl = `${base}/models`;
      } else {
        requestUrl = `${base}/v1/models`;
      }
    }
    
    console.log('🔍 [API调试] 开始获取模型列表');
    console.log('🔍 [API调试] 原始baseUrl:', config.baseUrl);
    console.log('🔍 [API调试] 构建的请求URL:', requestUrl);
    console.log('🔍 [API调试] API Key (前10字符):', config.apiKey.substring(0, 10) + '...');

    const requestHeaders = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
    
    console.log('🔍 [API调试] 请求头:', {
      'Authorization': `Bearer ${config.apiKey.substring(0, 10)}...`,
      'Content-Type': 'application/json',
    });

    const startTime = Date.now();
    console.log('🔍 [API调试] 开始发送请求...');

    const response = await axios.get(requestUrl, {
      headers: requestHeaders,
      timeout: 30000,
      // 添加更多调试选项
      validateStatus: function (status) {
        console.log('🔍 [API调试] 响应状态码:', status);
        return status >= 200 && status < 300; // 默认
      }
    });

    const requestTime = Date.now() - startTime;
    console.log('🔍 [API调试] 请求完成，耗时:', requestTime + 'ms');
    console.log('🔍 [API调试] 响应状态:', response.status, response.statusText);
    console.log('🔍 [API调试] 响应头:', response.headers);
    console.log('🔍 [API调试] 响应数据类型:', typeof response.data);
    console.log('🔍 [API调试] 响应数据键名:', Object.keys(response.data || {}));
    console.log('🔍 [API调试] 完整响应数据:', response.data);

    // 处理不同格式的响应
    let models: Array<{id: string, name: string}> = [];
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      // OpenAI格式: { data: [...] }
      console.log('🔍 [API调试] 检测到OpenAI格式响应');
      models = response.data.data.map((model: any) => ({
        id: model.id || model.name || model.model || '',
        name: model.id || model.name || model.model || '',
      }));
    } else if (response.data && Array.isArray(response.data.models)) {
      // 某些API格式: { models: [...] }
      console.log('🔍 [API调试] 检测到models数组格式响应');
      models = response.data.models.map((model: any) => ({
        id: model.id || model.name || model.model || '',
        name: model.id || model.name || model.model || '',
      }));
    } else if (response.data && Array.isArray(response.data)) {
      // 直接返回数组格式: [...]
      console.log('🔍 [API调试] 检测到直接数组格式响应');
      models = response.data.map((model: any) => ({
        id: model.id || model.name || model.model || model,
        name: model.id || model.name || model.model || model,
      }));
    } else {
      console.log('🔍 [API调试] 无法识别的响应格式');
      throw new ApiError('无法解析模型列表响应格式');
    }

    console.log('🔍 [API调试] 解析前的原始模型数量:', models.length);

    // 过滤掉空值并去重
    const validModels = models
      .filter((model: any) => model.id && model.name)
      .filter((model: any, index: number, self: any[]) => 
        self.findIndex(m => m.id === model.id) === index
      );

    console.log('🔍 [API调试] 过滤后的有效模型数量:', validModels.length);
    console.log('🔍 [API调试] 有效模型列表:', validModels);
    
    return validModels;
    
  } catch (error: any) {
    console.error('🔍 [API调试] 请求失败详情:');
    console.error('🔍 [API调试] 错误类型:', error.constructor.name);
    console.error('🔍 [API调试] 错误消息:', error.message);
    console.error('🔍 [API调试] 错误代码:', error.code);
    console.error('🔍 [API调试] 完整错误对象:', error);
    
    if (error.response) {
      console.error('🔍 [API调试] 响应错误详情:');
      console.error('🔍 [API调试] 状态码:', error.response.status);
      console.error('🔍 [API调试] 状态文本:', error.response.statusText);
      console.error('🔍 [API调试] 响应头:', error.response.headers);
      console.error('🔍 [API调试] 错误响应数据:', error.response.data);
      
      const status = error.response.status;
      const message = error.response.data?.error?.message || 
                     error.response.data?.message || 
                     `获取模型列表失败: HTTP ${status}`;
      throw new ApiError(message, status);
    } else if (error.request) {
      console.error('🔍 [API调试] 请求错误详情:');
      console.error('🔍 [API调试] 请求对象:', error.request);
      console.error('🔍 [API调试] 请求状态:', error.request.readyState);
      console.error('🔍 [API调试] 请求状态文本:', error.request.statusText);
      
      // 检查是否是CORS问题
      if (error.message.includes('Network Error') || error.message.includes('CORS')) {
        throw new ApiError('网络请求失败，可能是CORS问题或网络连接问题。请检查：1) API地址是否正确 2) 是否存在跨域限制 3) 网络连接是否正常');
      }
      
      throw new ApiError('网络请求失败，请检查网络连接');
    } else {
      console.error('🔍 [API调试] 配置错误详情:', error.message);
      throw new ApiError(`获取模型列表出错: ${error.message}`);
    }
  }
};

// 测试API配置
export const testApiConfig = async (config: ApiConfig): Promise<boolean> => {
  try {
    if (config.requestMode === 'url') {
      // 测试URL模式
      if (!config.directUrl) {
        throw new ApiError('URL模式下必须配置请求URL');
      }
      
      // 使用一个简单的测试请求
      const testModel = config.models.length > 0 ? config.models[0].name : 'test-model';
      await callDirectUrlAPI(config, testModel, '你好', '测试连接');
      return true;
    } else {
      // 测试API模式
      if (!config.baseUrl || !config.apiKey) {
        throw new ApiError('API模式下必须配置baseUrl和apiKey');
      }

      const testRequest = buildOpenAIRequest(
        'gpt-3.5-turbo',
        '你是一个有用的助手。',
        '请回复"连接测试成功"'
      );
      
      await callOpenAIAPI(config, testRequest);
      return true;
    }
  } catch (error) {
    console.error('API配置测试失败:', error);
    return false;
  }
}; 