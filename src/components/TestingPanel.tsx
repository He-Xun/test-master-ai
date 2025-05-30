import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Form,
  Select,
  InputNumber,
  Table,
  Progress,
  message,
  Space,
  Tag,
  Tooltip,
  Input,
  Divider,
  Collapse,
  Alert,
  Modal,
  List,
  Typography,
  notification,
  Checkbox,
  Popconfirm,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  DownloadOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  MessageOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  EditOutlined,
  AppstoreOutlined,
  TableOutlined,
  SaveOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { TestParams, TestResult, TestSession, Prompt, DefaultTestInput, TestConfigDraft } from '../types';
import { promptStorage, apiConfigStorage, defaultTestInputStorage } from '../utils/storage-simple';
import { storageAdapter } from '../utils/storage-adapter';
import { useConfigDraft, useAutoSave } from '../hooks/useConfigDraft';
import { callAPI, delay } from '../utils/api';
import { exportToExcel, exportToCSV, copyResultsToClipboard, copySingleResultToClipboard } from '../utils/export';

const { TextArea } = Input;
const { Panel } = Collapse;
const { Text } = Typography;

// 获取通知状态的持久化存储
const getNotificationDismissed = () => {
  const dismissed = localStorage.getItem('configNotificationDismissed');
  return dismissed === 'true';
};

// 设置通知状态的持久化存储
const setNotificationDismissed = (dismissed: boolean) => {
  localStorage.setItem('configNotificationDismissed', dismissed.toString());
};

// 检查是否需要显示通知
const shouldShowNotification = (prompts: Prompt[], models: any[]) => {
  // 如果用户已经关闭过通知，并且配置仍然为空，则不显示
  const dismissed = getNotificationDismissed();
  const hasNoConfig = prompts.length === 0 || models.length === 0;
  
  // 如果有配置了，重置通知状态，下次没配置时可以再次显示
  if (!hasNoConfig) {
    setNotificationDismissed(false);
  }
  
  return hasNoConfig && !dismissed;
};

// 添加一个全局变量来追踪通知状态
let globalNotificationShown = false;

const TestingPanel: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [session, setSession] = useState<TestSession | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Array<{ id: string; name: string; apiConfigName: string }>>([]);
  const [defaultInputs, setDefaultInputs] = useState<DefaultTestInput[]>([]);
  const [userInputs, setUserInputs] = useState<string[]>(['']);
  const [isDefaultInputModalVisible, setIsDefaultInputModalVisible] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [notificationShown, setNotificationShown] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<TestSession | null>(null);
  
  // 添加响应式状态
  const [repetitions, setRepetitions] = useState<number>(1);
  const [validInputsCount, setValidInputsCount] = useState<number>(0);
  const [totalTestsCount, setTotalTestsCount] = useState<number>(0);
  
  // 结果详情相关状态
  const [resultDetailVisible, setResultDetailVisible] = useState(false);
  const [viewingResult, setViewingResult] = useState<TestResult | null>(null);
  
  // 批量选择相关状态
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // 配置暂存相关
  const { saveDraft, clearDraft } = useConfigDraft();
  const [currentConfig, setCurrentConfig] = useState<TestConfigDraft | null>(null);
  
  // 启用自动保存
  useAutoSave(currentConfig, true, 3000);

  // 监听表单repetitions字段变化
  useEffect(() => {
    const currentRepetitions = form.getFieldValue('repetitions') || 1;
    setRepetitions(currentRepetitions);
  }, [form]);

  // 监听userInputs和repetitions变化，更新计数
  useEffect(() => {
    const validCount = userInputs.filter(input => input.trim()).length;
    setValidInputsCount(validCount);
    setTotalTestsCount(validCount * repetitions);
  }, [userInputs, repetitions]);

  // 监听表单字段变化
  const handleFormChange = () => {
    const currentRepetitions = form.getFieldValue('repetitions') || 1;
    setRepetitions(currentRepetitions);
  };

  // 添加session状态同步到sessionRef
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // 从localStorage恢复session状态
  const restoreSessionFromStorage = () => {
    const currentSession = storageAdapter.getCurrentSession();
    const userId = currentSession?.user?.id;
    if (userId) {
      try {
        const savedSession = localStorage.getItem(`${userId}_current_test_session`);
        if (savedSession) {
          const parsedSession: TestSession = JSON.parse(savedSession);
          // 只恢复已完成或已停止的session，不恢复运行中的session
          if (parsedSession.status === 'completed' || parsedSession.status === 'stopped') {
            console.log('[TestingPanel] 恢复session状态:', parsedSession.id);
            setSession(parsedSession);
            return true;
          }
        }
      } catch (error) {
        console.error('[TestingPanel] 恢复session状态失败:', error);
      }
    }
    return false;
  };

  // 清除持久化的session状态
  const clearPersistedSession = () => {
    const currentSession = storageAdapter.getCurrentSession();
    const userId = currentSession?.user?.id;
    if (userId) {
      try {
        localStorage.removeItem(`${userId}_current_test_session`);
      } catch (error) {
        console.error('[TestingPanel] 清除持久化session失败:', error);
      }
    }
  };

  // 监听表单变化，更新配置暂存
  useEffect(() => {
    const formValues = form.getFieldsValue();
    const selectedPrompt = prompts.find(p => p.id === formValues.promptId);
    const selectedModel = models.find(m => m.id === formValues.modelId);
    
    if (formValues.promptId || formValues.modelId || userInputs.some(input => input.trim())) {
      const config: TestConfigDraft = {
        userInputs: userInputs.filter(input => input.trim()),
        promptId: formValues.promptId || '',
        modelId: formValues.modelId || '',
        repetitions: formValues.repetitions || 1,
        interval: formValues.interval || 1000,
        selectedPromptName: selectedPrompt?.name,
        selectedModelName: selectedModel?.name,
      };
      setCurrentConfig(config);
    } else {
      setCurrentConfig(null);
    }
  }, [form, userInputs, prompts, models]);

  // 恢复配置的函数
  const restoreConfig = (config: TestConfigDraft) => {
    try {
      form.setFieldsValue({
        promptId: config.promptId,
        modelId: config.modelId,
        repetitions: config.repetitions,
        interval: config.interval,
      });
      
      if (config.userInputs.length > 0) {
        setUserInputs(config.userInputs);
      }
      
      message.success(t('testing.configRestored'));
    } catch (error) {
      console.error('恢复配置失败:', error);
      message.error(t('testing.configRestoreFailed'));
    }
  };

  // 保存测试历史
  const saveTestHistory = async (testSession: TestSession, status: 'completed' | 'stopped' | 'error') => {
    try {
      console.log('[TestingPanel] saveTestHistory 调用参数:', {
        testSession: testSession,
        status: status,
        params: testSession.params,
        results: testSession.results,
        resultsLength: testSession.results?.length || 0
      });
      
      if (!testSession.params || !testSession.results || testSession.results.length === 0) {
        console.log('[TestingPanel] 没有有效的测试数据，跳过保存历史');
        console.log('[TestingPanel] 详细检查:', {
          hasParams: !!testSession.params,
          hasResults: !!testSession.results,
          resultsLength: testSession.results?.length || 0,
          results: testSession.results
        });
        return;
      }

      // 基于testSession.results计算统计信息，而不是使用getResultStats()
      const stats = {
        total: testSession.results.length,
        success: testSession.results.filter(r => r.status === 'success').length,
        error: testSession.results.filter(r => r.status === 'error').length,
        pending: testSession.results.filter(r => r.status === 'pending').length
      };
      
      const durations = testSession.results
        .filter(r => r.duration && r.duration > 0)
        .map(r => r.duration!);
      
      const averageDuration = durations.length > 0 
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
        : 0;

      const selectedPrompt = prompts.find(p => p.id === testSession.params.promptId);
      const selectedModel = models.find(m => m.id === testSession.params.modelId);

      const sessionName = `${selectedPrompt?.name || '未知提示词'} - ${selectedModel?.name || '未知模型'} (${new Date().toLocaleString()})`;

      const historyData = {
        sessionName,
        testParams: testSession.params,
        results: testSession.results,
        status,
        startTime: testSession.startTime || new Date().toISOString(),
        endTime: testSession.endTime || new Date().toISOString(),
        totalTests: stats.total,
        successCount: stats.success,
        errorCount: stats.error,
        averageDuration,
      };

      console.log('[TestingPanel] 准备保存的历史数据:', {
        sessionName: historyData.sessionName,
        resultsCount: historyData.results.length,
        status: historyData.status,
        stats: { total: stats.total, success: stats.success, error: stats.error },
        firstResult: historyData.results[0],
        lastResult: historyData.results[historyData.results.length - 1]
      });

      const savedHistory = await storageAdapter.saveTestSessionHistory(historyData);
      if (savedHistory) {
        console.log('[TestingPanel] 测试历史已保存:', savedHistory.id);
      } else {
        console.error('[TestingPanel] 测试历史保存失败');
      }
    } catch (error) {
      console.error('[TestingPanel] 保存测试历史失败:', error);
      // 不显示错误消息，避免影响用户体验
    }
  };

  useEffect(() => {
    console.log('[TestingPanel] 组件挂载，开始加载数据');
    
    // 数据迁移：从旧用户ID迁移数据到当前用户ID
    const migrateUserData = () => {
      const currentSession = storageAdapter.getCurrentSession();
      const currentUserId = currentSession?.user?.id;
      const targetUserId = 'mb7t2ui1tq0hjniy7ap'; // 您提供的用户ID
      
      if (currentUserId && currentUserId !== targetUserId) {
        console.log(`[TestingPanel] 尝试从 ${targetUserId} 迁移数据到 ${currentUserId}`);
        
        // 迁移提示词数据
        const oldPrompts = localStorage.getItem(`${targetUserId}_prompts`);
        if (oldPrompts && !localStorage.getItem(`${currentUserId}_prompts`)) {
          localStorage.setItem(`${currentUserId}_prompts`, oldPrompts);
          console.log('[TestingPanel] 提示词数据已迁移');
        }
        
        // 迁移API配置数据  
        const oldApiConfigs = localStorage.getItem(`${targetUserId}_apiConfigs`);
        if (oldApiConfigs && !localStorage.getItem(`${currentUserId}_apiConfigs`)) {
          localStorage.setItem(`${currentUserId}_apiConfigs`, oldApiConfigs);
          console.log('[TestingPanel] API配置数据已迁移');
        }
        
        // 迁移测试历史数据
        const oldHistory = localStorage.getItem(`${targetUserId}_test_session_history`);
        if (oldHistory && !localStorage.getItem(`${currentUserId}_test_session_history`)) {
          localStorage.setItem(`${currentUserId}_test_session_history`, oldHistory);
          console.log('[TestingPanel] 测试历史数据已迁移');
        }
      }
      
      // 如果当前用户没有任何数据，创建一些测试数据
      if (currentUserId && !localStorage.getItem(`${currentUserId}_prompts`)) {
        console.log('[TestingPanel] 创建测试数据');
        const testPrompts = [{
          id: 'prompt-test-1',
          name: '测试提示词1',
          content: '你是一个AI助手，请根据用户输入回答问题：{{userInput}}',
          description: '用于测试的基础提示词',
          category: '测试',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }];
        localStorage.setItem(`${currentUserId}_prompts`, JSON.stringify(testPrompts));
        
        const testApiConfigs = [{
          id: 'api-yunwu-1',
          name: '云雾AI配置',
          baseUrl: 'http://yunwu.ai/v1',
          apiKey: '',
          type: 'openai',
          models: [{
            id: 'o4-mini-model',
            modelId: 'o4-mini',
            name: 'o4-mini',
            displayName: 'o4-mini',
            description: '云雾AI的o4-mini模型',
            enabled: true
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }];
        localStorage.setItem(`${currentUserId}_apiConfigs`, JSON.stringify(testApiConfigs));
        console.log('[TestingPanel] 测试数据已创建');
      }
      
      // 强制重建API配置数据（确保模型格式正确）
      // 注释掉这个逻辑，因为它会覆盖用户在API配置管理中保存的配置
      /*
      if (currentUserId) {
        const testApiConfigs = [{
          id: 'api-yunwu-1',
          name: '云雾AI配置',
          baseUrl: 'http://yunwu.ai/v1',
          apiKey: '',
          type: 'openai',
          models: [{
            id: 'o4-mini-model',
            modelId: 'o4-mini',
            name: 'o4-mini',
            displayName: 'o4-mini',
            description: '云雾AI的o4-mini模型',
            enabled: true
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }];
        localStorage.setItem(`${currentUserId}_apiConfigs`, JSON.stringify(testApiConfigs));
        console.log('[TestingPanel] API配置数据已重建');
      }
      */
    };
    
    migrateUserData();
    loadData();
    
    // 尝试恢复session状态
    const restored = restoreSessionFromStorage();
    if (restored) {
      console.log('[TestingPanel] session状态已恢复');
    }
    
    // 移除定时刷新，避免影响session状态
    // 如果需要刷新数据，用户可以手动点击刷新按钮
    
    return () => {
      console.log('[TestingPanel] 组件卸载');
    };
  }, []);

  const loadData = () => {
    console.log('[TestingPanel] 开始加载数据...');
    setDataLoading(true);
    setNotificationShown(false);
    
    try {
      // 获取当前用户ID以构造正确的键名
      const userSession = localStorage.getItem('userSession');
      const userId = userSession ? JSON.parse(userSession).user?.id : null;
      
      // 直接从localStorage读取数据进行调试
      const rawPrompts = localStorage.getItem(userId ? `${userId}_prompts` : 'prompts');
      const rawApiConfigs = localStorage.getItem(userId ? `${userId}_apiConfigs` : 'apiConfigs');
      const rawDefaultInputs = localStorage.getItem(userId ? `${userId}_defaultTestInputs` : 'defaultTestInputs');
      
      console.log('[TestingPanel] 原始数据:', {
        userId: userId,
        prompts: rawPrompts,
        apiConfigs: rawApiConfigs,
        defaultInputs: rawDefaultInputs
      });
      
      // 使用存储函数加载数据
      const loadedPrompts = promptStorage.getAll();
      const loadedModels = apiConfigStorage.getAllModels();
      const loadedDefaultInputs = defaultTestInputStorage.getAll();
      
      console.log('[TestingPanel] 加载的数据:', {
        prompts: loadedPrompts.length,
        models: loadedModels.length,
        defaultInputs: loadedDefaultInputs.length
      });
      
      console.log('[TestingPanel] 详细数据:', {
        prompts: loadedPrompts,
        models: loadedModels,
        defaultInputs: loadedDefaultInputs
      });
      
      // 专门调试模型数据
      console.log('[TestingPanel] 模型数据详细调试:');
      console.log('[TestingPanel] - 获取到的模型数量:', loadedModels.length);
      console.log('[TestingPanel] - 模型详细列表:', loadedModels);
      
      // 调试API配置
      const allApiConfigs = apiConfigStorage.getAll();
      console.log('[TestingPanel] - API配置数量:', allApiConfigs.length);
      allApiConfigs.forEach((config, index) => {
        console.log(`[TestingPanel] - 配置${index + 1}: ${config.name}, 模型数量: ${config.models?.length || 0}`);
        if (config.models) {
          config.models.forEach((model, modelIndex) => {
            console.log(`[TestingPanel]   - 模型${modelIndex + 1}: ${model.name || model.modelId} (enabled: ${model.enabled})`);
          });
        }
      });
      
      setPrompts(loadedPrompts);
      setModels(loadedModels);
      setDefaultInputs(loadedDefaultInputs);
      
      // 如果有配置了，重置全局通知状态
      if (loadedPrompts.length > 0 && loadedModels.length > 0) {
        globalNotificationShown = false;
        setNotificationShown(false);
      }
      
      // 如果没有数据，尝试初始化
      if (loadedPrompts.length === 0 && loadedModels.length === 0) {
        console.log('[TestingPanel] 没有数据，尝试初始化...');
        initializeDefaultData(loadedPrompts, loadedModels);
      }
      
    } catch (error) {
      console.error('[TestingPanel] 加载数据失败:', error);
      message.error('加载数据失败，请检查存储状态');
    } finally {
      setDataLoading(false);
    }
  };

  // 初始化默认数据
  const initializeDefaultData = (currentPrompts: Prompt[], currentModels: any[]) => {
    console.log('[TestingPanel] 初始化默认数据...');
    
    try {
      // 检查并初始化默认测试输入
      const currentDefaultInputs = defaultTestInputStorage.getAll();
      if (currentDefaultInputs.length === 0) {
        console.log('[TestingPanel] 初始化默认测试输入');
        // 默认测试输入会在storage-simple.ts中自动初始化
        const newDefaultInputs = defaultTestInputStorage.getAll();
        setDefaultInputs(newDefaultInputs);
      }
      
      // 检查是否需要显示配置提醒
      if (shouldShowNotification(currentPrompts, currentModels) && !notificationShown && !globalNotificationShown) {
        console.log('[TestingPanel] 显示配置提醒通知');
        setNotificationShown(true);
        globalNotificationShown = true;
        notification.warning({
          key: 'config-reminder', // 添加key避免重复
          message: '配置提醒',
          description: (
            <div>
              {currentPrompts.length === 0 && <div>• 请先在"提示词管理"中添加提示词</div>}
              {currentModels.length === 0 && <div>• 请先在"API配置"中添加API配置和模型</div>}
              <div className="mt-2 text-gray-500">
                配置完成后此提醒将不再显示
              </div>
            </div>
          ),
          duration: 0, // 不自动关闭
          placement: 'topRight',
          onClose: () => {
            // 用户手动关闭时，标记为已关闭，直到用户配置完成
            setNotificationDismissed(true);
            setNotificationShown(false);
            globalNotificationShown = false;
          }
        });
      }
      
    } catch (error) {
      console.error('[TestingPanel] 初始化默认数据失败:', error);
    }
  };

  // 手动刷新数据
  const handleRefreshData = () => {
    console.log('[TestingPanel] 手动刷新数据');
    loadData();
    message.success('数据已刷新');
  };

  const handleAddUserInput = () => {
    setUserInputs([...userInputs, '']);
  };

  const handleRemoveUserInput = (index: number) => {
    if (userInputs.length > 1) {
      const newInputs = userInputs.filter((_, i) => i !== index);
      setUserInputs(newInputs);
    }
  };

  const handleUserInputChange = (index: number, value: string) => {
    const newInputs = [...userInputs];
    newInputs[index] = value;
    setUserInputs(newInputs);
  };

  const handleUseDefaultInput = (input: DefaultTestInput) => {
    setUserInputs([...userInputs, input.content]);
    setIsDefaultInputModalVisible(false);
    message.success(`已添加默认输入: ${input.name}`);
  };

  const handleStartTest = async () => {
    console.log('[TestingPanel] 🚀 handleStartTest 被调用');
    console.log('[TestingPanel] 📊 当前状态:', {
      session: session?.status,
      prompts: prompts.length,
      models: models.length,
      userInputs: userInputs.length,
      form: form.getFieldsValue()
    });
    
    try {
      console.log('[TestingPanel] 📝 开始表单验证...');
      const values = await form.validateFields();
      console.log('[TestingPanel] ✅ 表单验证通过:', values);
      
      const validInputs = userInputs.filter(input => input.trim());
      console.log('[TestingPanel] 📝 有效输入数量:', validInputs.length);
      
      if (validInputs.length === 0) {
        console.log('[TestingPanel] ❌ 没有有效输入');
        message.error(t('testing.pleaseInputAtLeastOne'));
        return;
      }

      const prompt = prompts.find(p => p.id === values.promptId);
      const modelInfo = apiConfigStorage.getModelInfo(values.modelId);
      
      console.log('[TestingPanel] 🔍 查找结果:', {
        promptId: values.promptId,
        modelId: values.modelId,
        prompt: prompt ? `${prompt.name} (找到)` : '未找到',
        modelInfo: modelInfo ? `${(modelInfo.model as any).name || modelInfo.model.modelId} (${modelInfo.apiConfig.name})` : '未找到'
      });
      
      if (!prompt) {
        console.log('[TestingPanel] ❌ 提示词未找到');
        message.error('请选择提示词');
        return;
      }
      
      if (!modelInfo) {
        console.log('[TestingPanel] ❌ 模型信息未找到');
        message.error('请选择模型');
        return;
      }

      console.log('[TestingPanel] 🎯 准备开始测试...');
      const params: TestParams = {
        userInputs: validInputs,
        promptId: values.promptId,
        modelId: values.modelId,
        repetitions: values.repetitions || 1,
        interval: values.interval || 1000,
      };

      const totalTests = validInputs.length * params.repetitions;
      console.log('[TestingPanel] 📈 测试参数:', {
        userInputs: params.userInputs.length,
        promptId: params.promptId,
        modelId: params.modelId,
        repetitions: params.repetitions,
        interval: params.interval,
        totalTests
      });

      const newSession: TestSession = {
        id: `session-${Date.now()}`,
        params,
        results: [],
        status: 'running',
        startTime: new Date().toISOString(),
        progress: {
          current: 0,
          total: totalTests,
        },
      };

      console.log('[TestingPanel] 🏁 设置新session:', newSession.id);
      setSession(newSession);
      abortControllerRef.current = new AbortController();
      
      console.log('[TestingPanel] 🚀 开始执行测试...');
      // 开始执行测试
      await executeTests(newSession, prompt, modelInfo);
    } catch (error) {
      console.error('[TestingPanel] ❌ 启动测试失败:', error);
      console.error('[TestingPanel] 错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      message.error(`启动测试失败: ${error.message}`);
    }
  };

  const executeTests = async (
    testSession: TestSession,
    prompt: Prompt,
    modelInfo: { apiConfig: any; model: any }
  ) => {
    const { params } = testSession;
    const { apiConfig, model } = modelInfo;

    try {
      // 创建所有任务
      const allTasks: Array<{
        userInput: string;
        repetitionIndex: number;
        resultId: string;
        taskIndex: number;
      }> = [];

      let taskIndex = 0;
      for (let inputIndex = 0; inputIndex < params.userInputs.length; inputIndex++) {
        const userInput = params.userInputs[inputIndex];
        for (let rep = 0; rep < params.repetitions; rep++) {
          allTasks.push({
            userInput,
            repetitionIndex: rep + 1,
            resultId: `result-${Date.now()}-${taskIndex}`,
            taskIndex: taskIndex++
          });
        }
      }

      // 初始化所有待处理的结果
      const pendingResults: TestResult[] = allTasks.map(task => ({
        id: task.resultId,
        userInput: task.userInput,
        promptName: prompt.name,
        modelName: `${(model as any).name || model.modelId} (${apiConfig.name})`,
        repetitionIndex: task.repetitionIndex,
        output: '',
        status: 'pending',
        timestamp: new Date().toISOString(),
      }));

      // 一次性添加所有待处理结果
      setSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          results: [...prev.results, ...pendingResults],
        };
      });

      // 异步执行所有任务
      const executeTask = async (task: typeof allTasks[0], delay: number) => {
        // 先等待延迟时间
        if (delay > 0) {
          try {
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, delay);
              if (abortControllerRef.current) {
                abortControllerRef.current.signal.addEventListener('abort', () => {
                  clearTimeout(timer);
                  reject(new Error('操作已中止'));
                });
              }
            });
          } catch (delayError) {
            console.log(`[TestingPanel] 任务 ${task.taskIndex} 延迟期间被中止`);
            return;
          }
        }

        // 检查是否被中止
        if (abortControllerRef.current?.signal.aborted) {
          console.log(`[TestingPanel] 任务 ${task.taskIndex} 检测到中止信号，跳过执行`);
          return;
        }

        // 检查是否暂停（这里只检查一次，不循环等待）
        const currentSession = sessionRef.current;
        if (currentSession?.status === 'paused') {
          console.log(`[TestingPanel] 任务 ${task.taskIndex} 检测到暂停状态，跳过执行`);
          return;
        }

        if (currentSession?.status === 'stopped') {
          console.log(`[TestingPanel] 任务 ${task.taskIndex} 检测到停止状态，跳过执行`);
          return;
        }

        const startTime = Date.now();

        try {
          console.log(`[TestingPanel] 开始API调用 ${task.taskIndex + 1}/${allTasks.length}`);
          
          // 调用API
          const modelId = (model as any).modelId || model.name;
          const apiResult = await callAPI(
            apiConfig, 
            modelId, 
            prompt.content, 
            task.userInput, 
            abortControllerRef.current?.signal
          );
          
          console.log(`[TestingPanel] 任务 ${task.taskIndex} API调用成功，总耗时 ${apiResult.totalDuration}ms，请求耗时 ${apiResult.requestDuration}ms${apiResult.processingDuration ? `，处理耗时 ${apiResult.processingDuration}ms` : ''}`);

          // 检查是否在执行期间被中止
          if (abortControllerRef.current?.signal.aborted) {
            console.log(`[TestingPanel] 任务 ${task.taskIndex} API调用完成后检测到中止信号`);
            return;
          }

          // 更新成功结果
          setSession(prev => {
            if (!prev) return null;
            const updatedResults = prev.results.map(r =>
              r.id === task.resultId
                ? { 
                    ...r, 
                    output: apiResult.output, 
                    status: 'success' as const, 
                    duration: apiResult.totalDuration,
                    requestDuration: apiResult.requestDuration,
                    processingDuration: apiResult.processingDuration
                  }
                : r
            );
            
            // 更新进度
            const completedCount = updatedResults.filter(r => r.status !== 'pending').length;
            return { 
              ...prev, 
              results: updatedResults,
              progress: {
                ...prev.progress,
                current: completedCount,
              },
            };
          });

        } catch (error: any) {
          const duration = Date.now() - startTime;
          
          console.log(`[TestingPanel] 任务 ${task.taskIndex} API调用失败:`, error.message);
          
          // 如果是中止错误，直接返回
          if (error.message === '请求已被取消' || error.message === '操作已中止') {
            console.log(`[TestingPanel] 任务 ${task.taskIndex} 请求被取消`);
            return;
          }
          
          // 更新失败结果
          setSession(prev => {
            if (!prev) return null;
            const updatedResults = prev.results.map(r =>
              r.id === task.resultId
                ? { 
                    ...r, 
                    status: 'error' as const, 
                    errorMessage: error.message || '未知错误',
                    duration,
                    requestDuration: duration // 失败时使用总时间作为请求时间
                  }
                : r
            );
            
            // 更新进度
            const completedCount = updatedResults.filter(r => r.status !== 'pending').length;
            return { 
              ...prev, 
              results: updatedResults,
              progress: {
                ...prev.progress,
                current: completedCount,
              },
            };
          });
        }
      };

      // 启动所有任务（按间隔时间延迟启动）
      const taskPromises = allTasks.map((task, index) => 
        executeTask(task, index * params.interval)
      );

      // 等待所有任务完成
      await Promise.allSettled(taskPromises);

      // 检查是否所有任务都已完成或被中止
      if (!abortControllerRef.current?.signal.aborted) {
        console.log('[TestingPanel] 所有测试任务已启动完成');
        
        // 等待一小段时间确保所有结果都已更新
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 获取当前最新的session状态
        const currentSession = sessionRef.current;
        if (!currentSession) {
          console.error('[TestingPanel] 当前session为空，无法完成测试');
          return;
        }
        
        // 检查是否所有结果都已完成（非pending状态）
        const pendingResults = currentSession.results.filter(r => r.status === 'pending');
        if (pendingResults.length === 0) {
          console.log('[TestingPanel] 所有测试完成');
          
          const completedSession = {
            ...currentSession,
            status: 'completed' as const,
            endTime: new Date().toISOString()
          };
          
          setSession(completedSession);
          
          // 保存测试历史
          await saveTestHistory(completedSession, 'completed');
          
          // 清除配置暂存
          clearDraft();
          
          message.success('测试完成！');
        } else {
          console.log(`[TestingPanel] 还有 ${pendingResults.length} 个任务未完成，继续等待...`);
        }
      }

    } catch (error: any) {
      console.error('[TestingPanel] 测试执行失败:', error);
      setSession(prev => prev ? { 
        ...prev, 
        status: 'stopped', 
        endTime: new Date().toISOString() 
      } : null);
      
      if (error.message !== '请求已被取消' && error.message !== '操作已中止') {
        message.error(`测试失败: ${error.message}`);
      }
    }
  };

  const handlePauseTest = () => {
    if (session?.status === 'running') {
      setSession(prev => prev ? { ...prev, status: 'paused' } : null);
      message.info(t('testing.testPaused'));
    }
  };

  const handleResumeTest = () => {
    if (session?.status === 'paused') {
      setSession(prev => prev ? { ...prev, status: 'running' } : null);
    }
  };

  const handleStopTest = async () => {
    console.log('[TestingPanel] 用户点击停止测试');
    
    // 立即更新状态为停止
    if (sessionRef.current) {
      const updatedSession = { ...sessionRef.current, status: 'stopped' as const };
      setSession(updatedSession);
      sessionRef.current = updatedSession;
    }

    // 取消正在进行的请求
    if (abortControllerRef.current) {
      console.log('[TestingPanel] 取消正在进行的请求');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 保存测试历史
    if (sessionRef.current && sessionRef.current.results.length > 0) {
      try {
        await saveTestHistory(sessionRef.current, 'stopped');
      } catch (error) {
        console.error('[TestingPanel] 保存测试历史失败:', error);
      }
    }
    
    message.info(t('testing.testStopped'));
  };

  const handleClearResults = () => {
    setSession(null);
    clearDraft(); // 清除配置暂存
    clearPersistedSession(); // 清除持久化的session状态
    message.success('结果已清空');
  };

  const handleExportExcel = () => {
    if (!session?.results || session.results.length === 0) {
      message.warning(t('testing.noDataToExport'));
      return;
    }
    exportToExcel(session.results);
    message.success(t('testing.excelExportSuccess'));
  };

  const handleExportCSV = () => {
    if (!session?.results || session.results.length === 0) {
      message.warning(t('testing.noDataToExport'));
      return;
    }
    exportToCSV(session.results);
    message.success(t('testing.csvExportSuccess'));
  };

  const handleCopyResults = () => {
    if (!session?.results || session.results.length === 0) {
      message.warning(t('testing.noDataToCopy'));
      return;
    }
    copyResultsToClipboard(session.results);
    message.success(t('testing.resultsCopied'));
  };

  const handleCopySingleResult = (result: TestResult) => {
    copySingleResultToClipboard(result);
    message.success(t('testing.contentCopied'));
  };

  // 查看结果详情
  const handleViewResult = (result: TestResult) => {
    // 不再使用URL路由，直接显示详情Modal
    setViewingResult(result);
    setResultDetailVisible(true);
  };

  // 删除单个结果
  const handleDeleteResult = (resultId: string) => {
    if (!session) return;
    
    const updatedResults = session.results.filter(r => r.id !== resultId);
    setSession({
      ...session,
      results: updatedResults
    });
    
    // 如果删除的结果在选中列表中，也要移除
    setSelectedResultIds(prev => prev.filter(id => id !== resultId));
    
    message.success('结果已删除');
  };

  // 批量选择处理
  const handleSelectResult = (resultId: string, checked: boolean) => {
    if (checked) {
      setSelectedResultIds(prev => [...prev, resultId]);
    } else {
      setSelectedResultIds(prev => prev.filter(id => id !== resultId));
    }
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked && session) {
      setSelectedResultIds(session.results.map(r => r.id));
    } else {
      setSelectedResultIds([]);
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (!session || selectedResultIds.length === 0) return;
    
    const updatedResults = session.results.filter(r => !selectedResultIds.includes(r.id));
    setSession({
      ...session,
      results: updatedResults
    });
    
    setSelectedResultIds([]);
    setSelectAll(false);
    
    message.success(`已删除 ${selectedResultIds.length} 条结果`);
  };

  // 监听选中状态变化，更新全选状态
  useEffect(() => {
    if (session && session.results.length > 0) {
      const allSelected = session.results.every(r => selectedResultIds.includes(r.id));
      setSelectAll(allSelected);
    }
  }, [selectedResultIds, session?.results]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'processing';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '处理中';
      case 'success': return '成功';
      case 'error': return '失败';
      default: return '未知';
    }
  };

  // 计算结果统计
  const getResultStats = () => {
    if (!session || session.results.length === 0) {
      return { total: 0, success: 0, error: 0, pending: 0 };
    }
    
    const total = session.results.length;
    const success = session.results.filter(r => r.status === 'success').length;
    const error = session.results.filter(r => r.status === 'error').length;
    const pending = session.results.filter(r => r.status === 'pending').length;
    
    return { total, success, error, pending };
  };

  const resultColumns = [
    {
      title: (
        <Checkbox
          checked={selectAll}
          indeterminate={selectedResultIds.length > 0 && !selectAll}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      key: 'select',
      width: 50,
      fixed: 'left' as const,
      render: (_: any, record: TestResult) => (
        <Checkbox
          checked={selectedResultIds.includes(record.id)}
          onChange={(e) => handleSelectResult(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: '#',
      key: 'index',
      width: 60,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: t('testing.userInput'),
      dataIndex: 'userInput',
      key: 'userInput',
      width: 200,
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft">
          <Text>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: t('testing.prompt'),
      dataIndex: 'promptName',
      key: 'promptName',
      width: 120,
    },
    {
      title: t('testing.model'),
      dataIndex: 'modelName',
      key: 'modelName',
      width: 150,
    },
    {
      title: t('testing.repetitionCount'),
      dataIndex: 'repetitionIndex',
      key: 'repetitionIndex',
      width: 80,
      align: 'center' as const,
    },
    {
      title: t('testing.output'),
      dataIndex: 'output',
      key: 'output',
      width: 350,
      ellipsis: { showTitle: false },
      render: (text: string, record: TestResult) => (
        <Tooltip title={record.status === 'error' ? record.errorMessage : text} placement="topLeft">
          <Text>
            {record.status === 'error' ? record.errorMessage : text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '请求耗时',
      dataIndex: 'requestDuration',
      key: 'requestDuration',
      width: 90,
      render: (duration?: number) => duration ? `${duration}ms` : '-',
    },
    {
      title: '处理耗时',
      dataIndex: 'processingDuration',
      key: 'processingDuration',
      width: 90,
      render: (duration?: number, record?: TestResult) => {
        // 如果有直接的处理耗时，使用它；否则计算 总耗时 - 请求耗时
        if (duration && duration > 0) {
          return `${duration}ms`;
        }
        const totalDuration = record?.duration || 0;
        const requestDuration = record?.requestDuration || 0;
        const calculatedProcessingTime = totalDuration - requestDuration;
        return calculatedProcessingTime > 0 ? `${calculatedProcessingTime}ms` : '-';
      },
    },
    {
      title: t('testing.timestampField'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (timestamp: string) => new Date(timestamp).toLocaleTimeString(),
    },
    {
      title: t('testing.statusField'),
      dataIndex: 'status',
      key: 'status',
      width: 80,
      fixed: 'right' as const,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: t('testing.actionField'),
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: TestResult) => (
        <Space size="small">
          <Tooltip title={t('results.viewDetails')}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewResult(record)}
              className="text-blue-500 hover:bg-blue-50"
            />
          </Tooltip>
          <Tooltip title={record.status === 'error' ? t('testing.copyError') : t('testing.copyOutput')}>
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={() => handleCopySingleResult(record)}
              disabled={record.status === 'pending'}
              className="text-green-500 hover:bg-green-50"
            />
          </Tooltip>
          <Popconfirm
            title={t('results.confirmDeleteSingle')}
            onConfirm={() => handleDeleteResult(record.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Tooltip title={t('results.delete')}>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                className="text-red-500 hover:bg-red-50"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isRunning = session?.status === 'running';
  const isPaused = session?.status === 'paused';
  const canStart = !session || session.status === 'completed' || session.status === 'stopped';

  // 监听localStorage变化，当API配置更新时重新加载数据
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // 检查是否是API配置相关的键（支持用户前缀）
      if (event.key && (event.key.endsWith('_apiConfigs') || event.key === 'apiConfigs')) {
        console.log('[TestingPanel] 检测到API配置变化，重新加载模型列表');
        // 只重新加载模型，避免影响其他状态
        const loadedModels = apiConfigStorage.getAllModels();
        console.log('[TestingPanel] 重新加载的模型数量:', loadedModels.length);
        setModels(loadedModels);
        message.success('模型列表已更新');
      }
    };

    const handleApiConfigsUpdated = () => {
      console.log('[TestingPanel] 收到API配置更新事件，重新加载模型列表');
      const loadedModels = apiConfigStorage.getAllModels();
      console.log('[TestingPanel] 重新加载的模型数量:', loadedModels.length);
      setModels(loadedModels);
      message.success('模型列表已更新');
    };

    // 监听同一页面内的localStorage变化
    window.addEventListener('storage', handleStorageChange);
    
    // 监听自定义事件（用于同一页面内的更新）
    window.addEventListener('apiConfigsUpdated', handleApiConfigsUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('apiConfigsUpdated', handleApiConfigsUpdated);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* 配置区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 数据概览卡片 */}
        <Card className="col-span-1">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {prompts.length + models.length}
            </div>
            <div className="text-sm text-gray-500 mb-4">{t('testing.configTotal')}</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="font-semibold text-green-700">{prompts.length}</div>
                <div className="text-green-600">{t('testing.prompts')}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-semibold text-blue-700">{models.length}</div>
                <div className="text-blue-600">{t('testing.models')}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* 配置选择 */}
        <Card className="col-span-2" title={t('testing.config')}>
          <Form 
            form={form} 
            layout="vertical"
            onValuesChange={handleFormChange}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="promptId"
                label={
                  <div className="flex items-center space-x-2">
                    <MessageOutlined className="text-blue-500 flex-shrink-0" />
                    <Tooltip title={t('testing.selectPrompt')} placement="top">
                      <span className="truncate">{t('testing.selectPrompt')}</span>
                    </Tooltip>
                    <Tag color="blue" className="flex-shrink-0">{prompts.length} {t('status.available')}</Tag>
                  </div>
                }
                rules={[{ required: true, message: t('testing.pleaseSelectPrompt') }]}
              >
                <Select 
                  placeholder={
                    dataLoading ? t('testing.loading') : 
                    prompts.length > 0 ? t('testing.pleaseSelectPrompt') : t('testing.noPrompts')
                  } 
                  size="large"
                  showSearch
                  disabled={dataLoading || prompts.length === 0}
                  loading={dataLoading}
                  notFoundContent={prompts.length === 0 ? t('testing.noPrompts') : t('testing.notFoundContent')}
                >
                  {prompts.map(prompt => (
                    <Select.Option key={prompt.id} value={prompt.id}>
                      <div className="flex items-center space-x-2">
                        <MessageOutlined className="text-blue-500 flex-shrink-0" />
                        <span className="truncate">{prompt.name}</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="modelId"
                label={
                  <div className="flex items-center space-x-2">
                    <ApiOutlined className="text-green-500 flex-shrink-0" />
                    <Tooltip title={t('testing.selectModel')} placement="top">
                      <span className="truncate">{t('testing.selectModel')}</span>
                    </Tooltip>
                    <Tag color="green" className="flex-shrink-0">{models.length} {t('status.available')}</Tag>
                  </div>
                }
                rules={[{ required: true, message: t('testing.pleaseSelectModel') }]}
              >
                <Select 
                  placeholder={
                    dataLoading ? t('testing.loading') :
                    models.length > 0 ? t('testing.pleaseSelectModel') : t('testing.noModels')
                  } 
                  size="large"
                  showSearch
                  disabled={dataLoading || models.length === 0}
                  loading={dataLoading}
                  notFoundContent={models.length === 0 ? t('testing.noModels') : t('testing.notFoundContent')}
                >
                  {models.map(model => (
                    <Select.Option key={model.id} value={model.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <ApiOutlined className="text-green-500 flex-shrink-0" />
                          <span className="truncate">{model.name}</span>
                        </div>
                        <Tag color="default" className="flex-shrink-0 ml-2">{model.apiConfigName}</Tag>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="repetitions"
                label={
                  <div className="flex items-center space-x-2">
                    <ReloadOutlined className="text-orange-500 flex-shrink-0" />
                    <Tooltip title={t('testing.repetitions')} placement="top">
                      <span className="truncate">{t('testing.repetitions')}</span>
                    </Tooltip>
                  </div>
                }
                initialValue={1}
                rules={[{ required: true, message: t('testing.pleaseInputRepetitions') }]}
              >
                <InputNumber 
                  min={1} 
                  max={10} 
                  size="large"
                  style={{ width: '100%' }} 
                />
              </Form.Item>

              <Form.Item
                name="interval"
                label={
                  <div className="flex items-center space-x-2">
                    <ClockCircleOutlined className="text-purple-500 flex-shrink-0" />
                    <Tooltip title={t('testing.interval')} placement="top">
                      <span className="truncate">{t('testing.interval')}</span>
                    </Tooltip>
                  </div>
                }
                initialValue={3000}
                rules={[{ required: true, message: t('testing.pleaseInputInterval') }]}
              >
                <InputNumber 
                  min={100} 
                  max={10000} 
                  size="large"
                  style={{ width: '100%' }} 
                />
              </Form.Item>
            </div>

            {/* 配置状态提示 */}
            {!dataLoading && (prompts.length === 0 || models.length === 0) && (
              <Alert
                message={t('testing.configIncomplete')}
                description={
                  <div className="space-y-1">
                    {prompts.length === 0 && <div>{t('testing.addPromptsFirst')}</div>}
                    {models.length === 0 && <div>{t('testing.addModelsFirst')}</div>}
                  </div>
                }
                type="warning"
                showIcon
                className="mt-4"
                action={
                  <Button 
                    size="small" 
                    onClick={handleRefreshData}
                    icon={<ReloadOutlined />}
                  >
                    {t('testing.refreshData')}
                  </Button>
                }
              />
            )}
          </Form>
        </Card>
      </div>

      {/* 测试输入 */}
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <EditOutlined className="text-blue-500" />
            <span>{t('testing.inputs')}</span>
            <Tooltip 
              title={t('testing.batchInputTooltip')}
              placement="right"
            >
              <InfoCircleOutlined className="text-gray-400 hover:text-blue-500 cursor-help flex-shrink-0" />
            </Tooltip>
          </div>
        }
        extra={
          <Space wrap>
            <Tooltip title={t('testing.useTemplate')} placement="top">
              <Button 
                type="dashed" 
                icon={<AppstoreOutlined />}
                onClick={() => setIsDefaultInputModalVisible(true)}
                size="large"
                className="min-w-0"
              >
                <span className="hidden sm:inline">{t('testing.useTemplate')}</span>
              </Button>
            </Tooltip>
            <Tooltip title={t('testing.addInput')} placement="top">
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddUserInput}
                size="large"
                className="min-w-0"
              >
                <span className="hidden sm:inline">{t('testing.addInput')}</span>
              </Button>
            </Tooltip>
          </Space>
        }
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
      >
        <div className="space-y-4">
          {userInputs.map((input, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{t('testing.testInput')} {index + 1}</span>
                  <Tag color="blue">
                    {t('testing.willTest')} {repetitions} {t('testing.times')}
                  </Tag>
                </div>
                {userInputs.length > 1 && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveUserInput(index)}
                    size="small"
                  />
                )}
              </div>
              <div className="p-4">
                <TextArea
                  value={input}
                  onChange={(e) => handleUserInputChange(index, e.target.value)}
                  placeholder={`${t('testing.inputPlaceholder')} ${index + 1}...`}
                  rows={4}
                  className="border-0 shadow-none resize-none"
                  style={{ padding: 0 }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 测试控制 */}
      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <div className="space-y-6">
          {/* 第一行：统计信息卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 有效输入数 */}
            <div className="bg-white rounded-lg px-4 py-4 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {validInputsCount}
                </div>
                <div className="text-sm text-gray-500">{t('testing.validInputs')}</div>
              </div>
            </div>

            {/* 每次重复数 */}
            <div className="bg-white rounded-lg px-4 py-4 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {repetitions}
                </div>
                <div className="text-sm text-gray-500">{t('testing.eachTest')}</div>
              </div>
            </div>

            {/* 总测试数 */}
            <div className="bg-white rounded-lg px-4 py-4 border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {totalTestsCount}
                </div>
                <div className="text-sm text-gray-500">{t('testing.totalTests')}</div>
              </div>
            </div>
          </div>

          {/* 第二行：控制按钮和导出功能 */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* 左侧：主要控制按钮 */}
            <div className="flex flex-wrap items-center gap-3">
              {canStart && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartTest}
                  size="large"
                  className="bg-green-500 hover:bg-green-600 border-green-500 shadow-lg"
                >
                  {t('testing.startTest')}
                </Button>
              )}
              
              {isRunning && (
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={handlePauseTest}
                  size="large"
                  className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                >
                  {t('testing.pauseTest')}
                </Button>
              )}
              
              {isPaused && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleResumeTest}
                  size="large"
                  className="bg-blue-500 hover:bg-blue-600 border-blue-500"
                >
                  {t('testing.resumeTest')}
                </Button>
              )}
              
              {(isRunning || isPaused) && (
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={handleStopTest}
                  size="large"
                  className="shadow-lg"
                >
                  {t('testing.stopTest')}
                </Button>
              )}

              {session && session.results.length > 0 && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleClearResults}
                  size="large"
                  className="border-gray-300"
                >
                  {t('testing.clearResults')}
                </Button>
              )}
            </div>

            {/* 右侧：导出按钮 */}
            {session && session.results.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportExcel}
                  size="large"
                  className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                >
                  {t('testing.exportExcel')}
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportCSV}
                  size="large"
                  className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                >
                  {t('testing.exportCSV')}
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCopyResults}
                  size="large"
                  className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                >
                  {t('testing.copyResults')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 进度显示 */}
      {session && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <Text className="font-medium text-lg">{t('testing.progress')}</Text>
                </div>
                <Tag color="blue" className="text-base px-3 py-1">
                  {session.progress.current} / {session.progress.total}
                </Tag>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  session.status === 'running' ? 'bg-green-500 animate-pulse' : 
                  session.status === 'paused' ? 'bg-orange-500' :
                  session.status === 'completed' ? 'bg-green-500' : 'bg-gray-500'
                }`}></div>
                <Text type="secondary" className="text-base">
                  {session.status === 'running' ? t('testing.statusRunning') : 
                   session.status === 'paused' ? t('testing.statusPaused') :
                   session.status === 'completed' ? t('testing.statusCompleted') : t('testing.statusStopped')}
                </Text>
              </div>
            </div>
            <Progress
              percent={Math.round((session.progress.current / session.progress.total) * 100)}
              status={session.status === 'running' ? 'active' : 
                     session.status === 'completed' ? 'success' : 'normal'}
              strokeColor={session.status === 'completed' ? '#22c55e' : 
                          session.status === 'running' ? '#1890ff' : '#d9d9d9'}
              trailColor={session.status === 'completed' ? '#dcfce7' : '#f5f5f5'}
              strokeWidth={12}
              className="mb-2"
              showInfo={true}
              format={(percent) => (
                <span style={{ 
                  color: session.status === 'completed' ? '#16a34a' : 
                         session.status === 'running' ? '#1890ff' : '#8c8c8c',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>
                  {percent}%
                </span>
              )}
            />
            <div className="text-sm text-gray-600 text-center font-medium">
              {session.status === 'running' && t('testing.executing')}
              {session.status === 'paused' && t('testing.testPausedMessage')}
              {session.status === 'completed' && t('testing.allCompleted')}
              {session.status === 'stopped' && t('testing.testStoppedMessage')}
            </div>
          </div>
        </Card>
      )}

      {/* 测试结果 */}
      {session && session.results.length > 0 && (
        <Card 
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <TableOutlined className="text-white text-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 m-0">{t('testing.results')}</h3>
                  <p className="text-sm text-gray-500 m-0">{t('testing.detailedResults')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {(() => {
                  const stats = getResultStats();
                  return (
                    <>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">{t('results.success')}</span>
                        <span className="text-sm font-semibold text-green-600">{stats.success}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">{t('results.failed')}</span>
                        <span className="text-sm font-semibold text-red-600">{stats.error}</span>
                      </div>
                      {stats.pending > 0 && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-gray-600">{t('status.pending')}</span>
                          <span className="text-sm font-semibold text-blue-600">{stats.pending}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-600">{t('status.total')}</span>
                        <span className="text-sm font-semibold text-gray-800">{stats.total}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          }
          className="shadow-sm border-gray-200"
          bodyStyle={{ padding: '0 12px 24px 12px' }}
        >
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 -mx-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {t('testing.showResults')} {session?.results.length} {t('testing.resultsCount')}
                </span>
                {selectedResultIds.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-blue-600">
                      {t('results.selected')} {selectedResultIds.length} {t('results.items')}
                    </span>
                    <Popconfirm
                      title={`${t('testing.confirmBatchDelete')} ${selectedResultIds.length} ${t('testing.confirmDeleteItems')}`}
                      onConfirm={handleBatchDelete}
                      okText={t('testing.confirmDeleteBtn')}
                      cancelText={t('common.cancel')}
                    >
                      <Button
                        type="primary"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      >
                        {t('results.batchDelete')}
                      </Button>
                    </Popconfirm>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={handleExportExcel}
                >
                  Excel
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={handleCopyResults}
                >
                  {t('testing.copy')}
                </Button>
              </div>
            </div>
          </div>
          <Table
            columns={resultColumns}
            dataSource={session?.results || []}
            rowKey="id"
            pagination={{ 
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => t('common.pagination', { start: range[0], end: range[1], total })
            }}
            scroll={{ x: 1200, y: 600 }}
            size="small"
            className="custom-table"
            rowClassName={(record) => {
              const baseClass = "hover:bg-blue-50 transition-colors";
              if (record.status === 'success') return `${baseClass} border-l-4 border-l-green-500`;
              if (record.status === 'error') return `${baseClass} border-l-4 border-l-red-500`;
              if (record.status === 'pending') return `${baseClass} border-l-4 border-l-blue-500`;
              return baseClass;
            }}
          />
        </Card>
      )}

      {/* 默认输入选择模态框 */}
      <Modal
        title={t('testing.selectDefaultInput')}
        open={isDefaultInputModalVisible}
        onCancel={() => setIsDefaultInputModalVisible(false)}
        footer={null}
        width={600}
      >
        <List
          dataSource={defaultInputs}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  onClick={() => handleUseDefaultInput(item)}
                >
                  {t('common.use')}
                </Button>
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={
                  <div>
                    <Tag color="blue">{item.category}</Tag>
                    <div className="mt-2">{item.content}</div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* 结果详情查看模态框 */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <EyeOutlined className="text-blue-500" />
            <span>{t('testing.resultDetails')}</span>
          </div>
        }
        open={resultDetailVisible}
        onCancel={() => setResultDetailVisible(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => viewingResult && handleCopySingleResult(viewingResult)}>
            {t('testing.copyResult')}
          </Button>,
          <Button key="close" onClick={() => setResultDetailVisible(false)}>
            {t('common.close')}
          </Button>,
        ]}
        width={800}
      >
        {viewingResult && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Text strong className="text-gray-700">{t('testing.statusField')}:</Text>
                <div className="mt-2">
                  <Tag color={getStatusColor(viewingResult.status)} className="text-sm">
                    {getStatusText(viewingResult.status)}
                  </Tag>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <Text strong className="text-gray-700">{t('testing.duration')}:</Text>
                <div className="mt-2 text-lg font-semibold text-blue-600">
                  {viewingResult.duration ? `${viewingResult.duration}ms` : '-'}
                </div>
              </div>
            </div>

            {/* 测试配置 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Text strong className="text-gray-700 block mb-3">{t('testing.testConfig')}:</Text>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('testing.promptField')}:</span>
                  <span className="ml-2 font-medium">{viewingResult.promptName}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('testing.modelField')}:</span>
                  <span className="ml-2 font-medium">{viewingResult.modelName}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('testing.repetitionField')}:</span>
                  <span className="ml-2 font-medium">{t('testing.repetitionIndex', { index: viewingResult.repetitionIndex })}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('testing.executionTime')}:</span>
                  <span className="ml-2 font-medium">
                    {new Date(viewingResult.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            {/* 用户输入 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Text strong className="text-gray-700">{t('testing.userInputField')}:</Text>
              <div className="mt-3 p-4 bg-white rounded border whitespace-pre-wrap shadow-sm">
                {viewingResult.userInput}
              </div>
            </div>

            {/* 输出结果或错误信息 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Text strong className="text-gray-700">
                {viewingResult.status === 'error' ? t('testing.errorMessage') + ':' : t('testing.outputField') + ':'}
              </Text>
              <div className={`mt-3 p-4 rounded border whitespace-pre-wrap shadow-sm ${
                viewingResult.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-white'
              }`}>
                {viewingResult.status === 'error' ? viewingResult.errorMessage : viewingResult.output}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TestingPanel; 