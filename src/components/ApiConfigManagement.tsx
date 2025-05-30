import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Space,
  Tag,
  Radio,
  Switch,
  Divider,
  Collapse,
  InputNumber,
  Tooltip,
  Spin,
  Checkbox,
  Alert,
  Tabs,
  Badge,
  Empty,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  InfoCircleOutlined,
  ApiOutlined,
  LinkOutlined,
  CloudDownloadOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { ApiConfig, ModelConfig, RequestMode } from '../types';
import { storageAdapter } from '../utils/storage-adapter';
import { testApiConfig, fetchAvailableModels } from '../utils/api';

const { Panel } = Collapse;
const { TabPane } = Tabs;

const ApiConfigManagement: React.FC = () => {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);
  const [form] = Form.useForm();
  const [testing, setTesting] = useState<string | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<Array<{id: string, name: string}>>([]);
  const [cachedModels, setCachedModels] = useState<Record<string, Array<{id: string, name: string}>>>({});
  const [modelsPanelVisible, setModelsPanelVisible] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [activeTabKey, setActiveTabKey] = useState<string>('basic');
  const formListRef = useRef<any>(null);
  const [formDataBackup, setFormDataBackup] = useState<any>(null);

  // 添加压缩Tab样式
  const compactTabsStyle = `
    .compact-tabs .ant-tabs-content-holder {
      padding-top: 8px !important;
    }
    .compact-tabs .ant-tabs-tabpane {
      padding: 0 !important;
    }
    .compact-tabs .ant-tabs-tab-list {
      margin-bottom: 0 !important;
    }
  `;

  useEffect(() => {
    loadConfigs();
    
    // 动态添加样式
    const styleElement = document.createElement('style');
    styleElement.textContent = compactTabsStyle;
    document.head.appendChild(styleElement);
    
    return () => {
      // 清理样式
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  const loadConfigs = async () => {
    console.log('[ApiConfigManagement] 开始加载配置');
    const loadedConfigs = await storageAdapter.getApiConfigs();
    console.log('[ApiConfigManagement] 加载到的配置:', loadedConfigs);
    setConfigs(loadedConfigs);
  };

  const handleCreate = () => {
    setEditingConfig(null);
    form.resetFields();
    form.setFieldsValue({
      requestMode: 'api',
      models: [
        { id: 'model-1', modelId: 'gpt-4o', name: 'GPT-4o', enabled: true },
      ],
    });
    setAvailableModels([]);
    setModelsPanelVisible(false);
    setSelectedModels([]);
    setModelSearchTerm('');
    setActiveTabKey('basic');
    setIsModalVisible(true);
  };

  const handleEdit = (config: ApiConfig) => {
    setEditingConfig(config);
    console.log('[ApiConfigManagement] 编辑配置:', config);
    console.log('[ApiConfigManagement] requestMode值:', config.requestMode);
    
    const formValues = {
      ...config,
      models: config.models.length > 0 ? config.models : [
        { id: 'model-1', modelId: 'gpt-4o', name: 'GPT-4o', enabled: true },
      ],
    };
    
    console.log('[ApiConfigManagement] 设置表单值:', formValues);
    form.setFieldsValue(formValues);
    
    // 检查是否有缓存的模型数据
    if (config.requestMode === 'api' && config.baseUrl && config.apiKey) {
      const cacheKey = `${config.baseUrl}_${config.apiKey.substring(0, 10)}`;
      if (cachedModels[cacheKey]) {
        setAvailableModels(cachedModels[cacheKey]);
        setModelsPanelVisible(true);
      } else {
        setAvailableModels([]);
        setModelsPanelVisible(false);
      }
    } else {
      setAvailableModels([]);
      setModelsPanelVisible(false);
    }
    
    // 重置选择状态
    setSelectedModels([]);
    setModelSearchTerm('');
    setActiveTabKey('basic');
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    await storageAdapter.deleteApiConfig(id);
    loadConfigs();
    message.success(t('api.deleteSuccess'));
  };

  const handleTest = async (config: ApiConfig) => {
    setTesting(config.id);
    try {
      const success = await testApiConfig(config);
      if (success) {
        message.success(t('api.testSuccess'));
      } else {
        message.error(t('api.testFailed'));
      }
    } catch (error: any) {
      message.error(`${t('api.testFailed')}: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  // 获取可用模型列表
  const handleFetchModels = async () => {
    const baseUrl = form.getFieldValue('baseUrl');
    const apiKey = form.getFieldValue('apiKey');
    const requestMode = form.getFieldValue('requestMode');

    if (requestMode !== 'api') {
      message.warning(t('api.onlyApiModeSupport'));
      return;
    }

    if (!baseUrl || !apiKey) {
      message.warning(t('api.fillBaseUrlAndApiKey'));
      return;
    }

    // 创建缓存键
    const cacheKey = `${baseUrl}_${apiKey.substring(0, 10)}`;
    
    // 检查缓存
    if (cachedModels[cacheKey]) {
      setAvailableModels(cachedModels[cacheKey]);
      setModelsPanelVisible(true);
      message.success(t('api.fetchModelsSuccess', { count: cachedModels[cacheKey].length }) + ' (来自缓存)');
      return;
    }

    setFetchingModels(true);
    try {
      const tempConfig: ApiConfig = {
        id: 'temp',
        name: 'temp',
        requestMode: 'api',
        baseUrl,
        apiKey,
        models: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const models = await fetchAvailableModels(tempConfig);
      
      // 缓存模型数据
      setCachedModels(prev => ({
        ...prev,
        [cacheKey]: models
      }));
      
      setAvailableModels(models);
      setModelsPanelVisible(true);
      message.success(t('api.fetchModelsSuccess', { count: models.length }));
    } catch (error: any) {
      message.error(`${t('api.fetchModelsFailed')}: ${error.message}`);
      console.error('获取模型失败:', error);
    } finally {
      setFetchingModels(false);
    }
  };

  // 批量添加选中的模型 - 修复版本
  const handleAddSelectedModels = (selectedModelIds: string[]) => {
    console.log('[ApiConfigManagement] 开始添加选中的模型:', selectedModelIds);
    
    const selectedModelsData = availableModels.filter(model => 
      selectedModelIds.includes(model.id)
    );
    console.log('[ApiConfigManagement] 过滤后的模型数据:', selectedModelsData);

    const currentModels = form.getFieldValue('models') || [];
    console.log('[ApiConfigManagement] 当前表单中的模型:', currentModels);
    
    // 检查重复
    const existingIds = new Set(currentModels.map((m: any) => m.modelId));
    const newModels = selectedModelsData.filter(model => !existingIds.has(model.id));
    
    if (newModels.length === 0) {
      message.warning(t('api.modelAlreadyExists'));
      return;
    }
    
    // 创建新的模型对象
    const newModelObjects = newModels.map(model => ({
      id: `model-${Date.now()}-${Math.random()}`,
      modelId: model.id,
      name: model.name,
      enabled: true,
    }));
    
    // 合并现有模型和新模型
    const updatedModels = [...currentModels, ...newModelObjects];
    console.log('[ApiConfigManagement] 更新后的模型列表:', updatedModels);
    
    // 直接设置表单值（这是最可靠的方法）
    form.setFieldsValue({ models: updatedModels });
    
    // 强制更新表单以触发重渲染
    form.setFields([
      {
        name: 'models',
        value: updatedModels,
      }
    ]);
    
    message.success(t('api.modelsAdded', { count: newModels.length }));
    
    // 验证设置是否成功
    setTimeout(() => {
      const verifyModels = form.getFieldValue('models');
      console.log('[ApiConfigManagement] 验证表单设置结果:', verifyModels);
      console.log('[ApiConfigManagement] 模型数量 - 添加前:', currentModels.length, '添加后:', verifyModels?.length || 0);
      
      if (!verifyModels || verifyModels.length !== updatedModels.length) {
        console.warn('[ApiConfigManagement] 表单设置可能失败，尝试重新设置');
        form.setFieldsValue({ models: updatedModels });
      }
    }, 100);

    setSelectedModels([]);
    setModelsPanelVisible(false);
  };

  // 全选/取消全选
  const handleSelectAll = (groupModels: Array<{id: string, name: string}>) => {
    const groupIds = groupModels.map(m => m.id);
    const currentSelected = selectedModels;
    const allSelected = groupIds.every(id => currentSelected.includes(id));
    
    if (allSelected) {
      // 取消选择这个组的所有模型
      setSelectedModels(currentSelected.filter(id => !groupIds.includes(id)));
    } else {
      // 选择这个组的所有模型
      const newSelected = Array.from(new Set([...currentSelected, ...groupIds]));
      setSelectedModels(newSelected);
    }
  };

  const handleSubmit = async () => {
    try {
      console.log('[ApiConfigManagement] 开始表单验证...');
      
      // 先检查当前表单中的原始数据
      const rawValues = form.getFieldsValue();
      console.log('[ApiConfigManagement] 表单原始数据:', rawValues);
      console.log('[ApiConfigManagement] 原始模型数据:', rawValues.models);
      
      const values = await form.validateFields();
      console.log('[ApiConfigManagement] 表单验证通过，准备保存:', values);
      console.log('[ApiConfigManagement] 验证后的模型数据:', values.models);
      console.log('[ApiConfigManagement] 模型数量:', values.models?.length || 0);

      if (editingConfig) {
        const updated = { ...editingConfig, ...values, updatedAt: new Date().toISOString() };
        console.log('[ApiConfigManagement] 准备更新的配置:', updated);
        await storageAdapter.updateApiConfig(editingConfig.id, updated);
        message.success(t('api.updateSuccess'));
        console.log('[ApiConfigManagement] 配置更新成功');
      } else {
        const newConfig = {
          ...values,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        console.log('[ApiConfigManagement] 准备保存的新配置:', newConfig);
        await storageAdapter.createApiConfig(newConfig);
        message.success(t('api.saveSuccess'));
        console.log('[ApiConfigManagement] 新配置保存成功');
      }

      // 触发自定义事件，通知其他组件配置已更新
      window.dispatchEvent(new CustomEvent('apiConfigsUpdated'));
      console.log('[ApiConfigManagement] 已触发apiConfigsUpdated事件');

      setIsModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
      loadConfigs();
      
      // 重置状态
      setAvailableModels([]);
      setModelsPanelVisible(false);
      setSelectedModels([]);
      setModelSearchTerm('');
      setActiveTabKey('basic');
    } catch (error) {
      console.error('[ApiConfigManagement] 保存配置失败:', error);
      message.error(t('api.saveFailed'));
    }
  };

  const handleCancel = () => {
    console.log('[ApiConfigManagement] 取消操作，重置所有状态');
    setIsModalVisible(false);
    setEditingConfig(null);
    setAvailableModels([]);
    setModelsPanelVisible(false);
    setSelectedModels([]);
    setModelSearchTerm('');
    setActiveTabKey('basic');
    setFormDataBackup(null);
    form.resetFields();
  };

  // 模型分组逻辑
  const groupModels = (models: Array<{id: string, name: string}>) => {
    const groups: Record<string, Array<{id: string, name: string}>> = {
      'GPT系列': [],
      'Claude系列': [],
      'Qwen系列': [],
      'DeepSeek系列': [],
      'LLaMA系列': [],
      '开源模型': [],
      '其他模型': []
    };

    models.forEach(model => {
      const name = model.name.toLowerCase();
      const id = model.id.toLowerCase();
      
      if (name.includes('gpt') || name.includes('davinci') || name.includes('babbage') || name.includes('curie')) {
        groups['GPT系列'].push(model);
      } else if (name.includes('claude')) {
        groups['Claude系列'].push(model);
      } else if (name.includes('qwen') || id.includes('qwen')) {
        groups['Qwen系列'].push(model);
      } else if (name.includes('deepseek') || id.includes('deepseek')) {
        groups['DeepSeek系列'].push(model);
      } else if (name.includes('llama') || id.includes('llama') || name.includes('yi-') || id.includes('yi-')) {
        groups['LLaMA系列'].push(model);
      } else if (name.includes('mistral') || name.includes('chatglm') || name.includes('baichuan') || 
                 name.includes('moonshot') || name.includes('gemini') || name.includes('grok') ||
                 name.includes('internlm') || name.includes('aquila') || name.includes('falcon')) {
        groups['开源模型'].push(model);
      } else {
        groups['其他模型'].push(model);
      }
    });

    // 移除空分组
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  };

  // 过滤模型
  const filteredModels = availableModels.filter(model =>
    model.name.toLowerCase().includes(modelSearchTerm.toLowerCase()) ||
    model.id.toLowerCase().includes(modelSearchTerm.toLowerCase())
  );

  const groupedModels = groupModels(filteredModels);

  const columns = [
    {
      title: t('api.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ApiConfig) => (
        <Space>
          {record.requestMode === 'url' ? <LinkOutlined /> : <ApiOutlined />}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: t('api.requestMode'),
      dataIndex: 'requestMode',
      key: 'requestMode',
      render: (mode: RequestMode) => (
        <Tag color={mode === 'url' ? 'blue' : 'green'}>
          {mode === 'url' ? t('api.urlDirectRequest') : t('api.apiInterface')}
        </Tag>
      ),
    },
    {
      title: t('api.configInfo'),
      key: 'config',
      render: (record: ApiConfig) => (
        <div>
          {record.requestMode === 'url' ? (
            <div>
              <div>URL: {record.directUrl}</div>
            </div>
          ) : (
            <div>
              <div>Base URL: {record.baseUrl}</div>
              <div>API Key: {record.apiKey ? t('api.configured') : t('api.notConfigured')}</div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('api.modelCount'),
      key: 'modelCount',
      render: (record: ApiConfig) => (
        <Tag color="cyan">
          {record.models.filter(m => m.enabled).length} / {record.models.length}
        </Tag>
      ),
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: any, record: ApiConfig) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<ExperimentOutlined />}
            loading={testing === record.id}
            onClick={() => handleTest(record)}
            className="bg-green-500 hover:bg-green-600 border-green-500"
          >
            {t('api.test')}
          </Button>
          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            {t('api.edit')}
          </Button>
          <Popconfirm
            title={t('api.confirmDelete')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button 
              type="default" 
              danger 
              size="small"
              icon={<DeleteOutlined />}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {t('api.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <ApiOutlined className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('api.title')}</h1>
              <p className="text-gray-500 mt-1">{t('api.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{configs.length}</div>
              <div className="text-sm text-gray-500">{t('api.configurations')}</div>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreate}
              size="large"
              className="bg-gradient-to-r from-blue-500 to-indigo-500 border-none shadow-lg hover:shadow-xl"
            >
              {t('api.add')}
            </Button>
          </div>
        </div>
      </div>

      {/* 配置列表 */}
      <Card className="shadow-sm border-gray-200">
        <Table
          columns={columns}
          dataSource={configs}
          rowKey="id"
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => t('common.pagination', { start: range[0], end: range[1], total })
          }}
          className="custom-table"
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <ApiOutlined className="text-4xl text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">{t('api.noConfigurations')}</p>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 border-none"
                >
                  {t('api.createFirst')}
                </Button>
              </div>
            )
          }}
        />
      </Card>

      <Drawer
        title={
          <div className="flex items-center space-x-2">
            <ApiOutlined className="text-blue-500" />
            <span>{editingConfig ? t('api.editConfiguration') : t('api.addConfiguration')}</span>
          </div>
        }
        open={isModalVisible}
        onClose={handleCancel}
        width="70%"
        bodyStyle={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', padding: 0 }}
        footer={
          <div style={{ textAlign: 'right', padding: '16px 24px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }} size="large">{t('api.cancel')}</Button>
            <Button onClick={handleSubmit} type="primary" size="large" className="bg-gradient-to-r from-blue-500 to-indigo-500 border-none">{t('api.save')}</Button>
          </div>
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Tabs 
            activeKey={activeTabKey}
            onChange={(key) => {
              console.log('[ApiConfigManagement] Tab切换:', activeTabKey, '->', key);
              
              // 备份当前表单数据
              const currentFormData = form.getFieldsValue();
              console.log('[ApiConfigManagement] 备份表单数据:', currentFormData);
              setFormDataBackup(currentFormData);
              
              // 切换Tab
              setActiveTabKey(key);
              
              // 延迟恢复表单数据（确保Tab切换完成）
              setTimeout(() => {
                const afterSwitchData = form.getFieldsValue();
                console.log('[ApiConfigManagement] Tab切换后的表单数据:', afterSwitchData);
                
                // 如果模型数据丢失，从备份恢复
                if (currentFormData.models && currentFormData.models.length > 0) {
                  if (!afterSwitchData.models || afterSwitchData.models.length === 0) {
                    console.log('[ApiConfigManagement] 检测到模型数据丢失，从备份恢复');
                    form.setFieldsValue(currentFormData);
                  } else if (afterSwitchData.models.length < currentFormData.models.length) {
                    console.log('[ApiConfigManagement] 检测到模型数据部分丢失，从备份恢复');
                    form.setFieldsValue(currentFormData);
                  }
                }
              }, 50);
            }} 
            className="px-6 pt-4"
          >
            <TabPane tab="基本配置" key="basic">
              <div className="space-y-4">
                <Form.Item
                  name="name"
                  label={t('api.configName')}
                  rules={[{ required: true, message: t('api.pleaseEnterConfigName') }]}
                >
                  <Input placeholder={t('api.pleaseEnterConfigName')} size="large" />
                </Form.Item>

                <Form.Item
                  name="requestMode"
                  label={t('api.requestMode')}
                  rules={[{ required: true, message: t('api.pleaseSelectRequestMode') }]}
                >
                  <Radio.Group size="large">
                    <Radio.Button value="url">
                      <Space>
                        <LinkOutlined />
                        {t('api.urlDirectRequest')}
                        <Tooltip title={t('api.urlDirectRequestTooltip')}>
                          <InfoCircleOutlined />
                        </Tooltip>
                      </Space>
                    </Radio.Button>
                    <Radio.Button value="api">
                      <Space>
                        <ApiOutlined />
                        {t('api.apiInterface')}
                        <Tooltip title={t('api.apiInterfaceTooltip')}>
                          <InfoCircleOutlined />
                        </Tooltip>
                      </Space>
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
                  prevValues.requestMode !== currentValues.requestMode
                }>
                  {({ getFieldValue }) => {
                    const requestMode = getFieldValue('requestMode');
                    
                    if (requestMode === 'url') {
                      return (
                        <Form.Item
                          name="directUrl"
                          label={t('api.requestUrl')}
                          rules={[
                            { required: true, message: t('api.pleaseEnterRequestUrl') },
                            { type: 'url', message: t('api.pleaseEnterValidUrl') },
                          ]}
                        >
                          <Input placeholder="http://127.0.0.1:8008/req" size="large" />
                        </Form.Item>
                      );
                    } else {
                      return (
                        <>
                          <Form.Item
                            name="baseUrl"
                            label={t('api.baseUrl')}
                            rules={[
                              { required: true, message: t('api.pleaseEnterBaseUrl') },
                              { type: 'url', message: t('api.pleaseEnterValidUrl') },
                            ]}
                          >
                            <Input placeholder="https://api.openai.com/v1" size="large" />
                          </Form.Item>
                          <Form.Item
                            name="apiKey"
                            label={t('api.apiKey')}
                            rules={[{ required: true, message: t('api.pleaseEnterApiKey') }]}
                          >
                            <Input.Password placeholder={t('api.pleaseEnterApiKey')} size="large" visibilityToggle />
                          </Form.Item>
                        </>
                      );
                    }
                  }}
                </Form.Item>
              </div>
            </TabPane>
            
            <TabPane tab="模型配置" key="models">
              <div className="space-y-4">
                {/* 自动获取模型按钮 */}
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
                  prevValues.requestMode !== currentValues.requestMode ||
                  prevValues.baseUrl !== currentValues.baseUrl ||
                  prevValues.apiKey !== currentValues.apiKey
                }>
                  {({ getFieldValue }) => {
                    const requestMode = getFieldValue('requestMode');
                    const baseUrl = getFieldValue('baseUrl');
                    const apiKey = getFieldValue('apiKey');
                    
                    if (requestMode === 'api') {
                      return (
                        <div className="mb-3 p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-1">自动获取模型</h4>
                              <p className="text-xs text-gray-500">从API自动获取可用模型列表</p>
                            </div>
                            <Space size="small">
                              <Button
                                type="primary"
                                icon={<CloudDownloadOutlined />}
                                loading={fetchingModels}
                                onClick={handleFetchModels}
                                disabled={!baseUrl || !apiKey}
                                size="small"
                                className="bg-gradient-to-r from-green-500 to-blue-500 border-none"
                              >
                                {availableModels.length > 0 ? '重新获取' : '获取模型'}
                              </Button>
                              {availableModels.length > 0 && (
                                <Button
                                  icon={<ReloadOutlined />}
                                  onClick={() => {
                                    const cacheKey = `${baseUrl}_${apiKey.substring(0, 10)}`;
                                    setCachedModels(prev => {
                                      const newCache = { ...prev };
                                      delete newCache[cacheKey];
                                      return newCache;
                                    });
                                    handleFetchModels();
                                  }}
                                  disabled={!baseUrl || !apiKey || fetchingModels}
                                  size="small"
                                >
                                  强制刷新
                                </Button>
                              )}
                            </Space>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                </Form.Item>

                {/* 可用模型选择面板 */}
                {modelsPanelVisible && availableModels.length > 0 && (
                  <Card 
                    title={
                      <div className="flex items-center justify-between">
                        <Space>
                          <CloudDownloadOutlined className="text-green-500" />
                          <span>选择要添加的模型</span>
                          <Badge count={filteredModels.length} style={{ backgroundColor: '#52c41a' }} />
                        </Space>
                        <Button 
                          type="text" 
                          icon={<CloseOutlined />} 
                          onClick={() => {
                            setModelsPanelVisible(false);
                            setSelectedModels([]);
                            setModelSearchTerm('');
                          }}
                        />
                      </div>
                    }
                    className="mb-3 border-green-200 bg-green-50"
                    size="small"
                  >
                    {/* 搜索栏和操作按钮 */}
                    <div className="mb-3 space-y-2">
                      <Input
                        placeholder={t('api.searchModels')}
                        prefix={<SearchOutlined />}
                        value={modelSearchTerm}
                        onChange={(e) => setModelSearchTerm(e.target.value)}
                        size="small"
                        allowClear
                      />
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600">
                          已选择 {selectedModels.length} / {filteredModels.length} 个模型
                        </div>
                        <Space size="small">
                          <Button 
                            size="small" 
                            onClick={() => setSelectedModels([])}
                            disabled={selectedModels.length === 0}
                          >
                            清空选择
                          </Button>
                          <Button 
                            type="primary" 
                            size="small"
                            onClick={() => handleAddSelectedModels(selectedModels)}
                            disabled={selectedModels.length === 0}
                            className="bg-green-500 border-green-500"
                          >
                            添加选中 ({selectedModels.length})
                          </Button>
                        </Space>
                      </div>
                    </div>

                    {/* Tab形式显示模型分组 */}
                    {Object.keys(groupedModels).length > 0 ? (
                      <Tabs
                        size="small"
                        type="card"
                        className="compact-tabs"
                        items={Object.entries(groupedModels).map(([groupName, groupModels]) => ({
                          key: groupName,
                          label: (
                            <div className="flex items-center space-x-2">
                              <span>{groupName}</span>
                              <Badge count={groupModels.length} size="small" />
                            </div>
                          ),
                          children: (
                            <div className="space-y-2 -mt-2">
                              {/* 分组操作按钮 */}
                              <div className="flex justify-between items-center py-1">
                                <span className="text-xs text-gray-500">
                                  {groupModels.length} 个模型
                                </span>
                                <Button 
                                  size="small" 
                                  type="link"
                                  onClick={() => handleSelectAll(groupModels)}
                                  className="h-auto p-1 text-xs"
                                >
                                  {groupModels.every(model => selectedModels.includes(model.id)) ? '取消全选' : '全选'}
                                </Button>
                              </div>
                              
                              {/* 模型列表 - 更紧凑的布局 */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                {groupModels.map(model => (
                                  <div
                                    key={model.id}
                                    className={`p-2 border rounded cursor-pointer transition-all text-xs ${
                                      selectedModels.includes(model.id)
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                                    }`}
                                    onClick={() => {
                                      if (selectedModels.includes(model.id)) {
                                        setSelectedModels(selectedModels.filter(id => id !== model.id));
                                      } else {
                                        setSelectedModels([...selectedModels, model.id]);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={selectedModels.includes(model.id)}
                                        onChange={() => {}}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 truncate">
                                          {model.name}
                                        </div>
                                        {model.id !== model.name && (
                                          <div className="text-gray-500 truncate text-xs">
                                            {model.id}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }))}
                      />
                    ) : (
                      <Empty 
                        description={t('api.noMatchingModels')}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </Card>
                )}

                {/* 模型列表表头 */}
                <div className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                    <div className="flex-1">模型ID</div>
                    <div className="flex-1">模型名称</div>
                    <div className="flex items-center justify-center" style={{width: '44px'}}>启用</div>
                    <div className="flex items-center justify-center" style={{width: '32px'}}>操作</div>
                  </div>
                </div>

                <Form.List name="models">
                  {(fields, { add, remove }) => {
                    // 保存add和remove方法到ref中以便外部调用
                    formListRef.current = { add, remove };
                    
                    return (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <div
                            key={key}
                            className="mb-2 p-3 border border-gray-200 rounded-md bg-white"
                          >
                            <div className="flex items-center gap-3">
                              <Form.Item
                                {...restField}
                                name={[name, 'modelId']}
                                rules={[{ required: true, message: '请输入模型ID' }]}
                                className="mb-0 flex-1"
                              >
                                <Input placeholder="gpt-4o" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'name']}
                                rules={[{ required: true, message: '请输入模型名称' }]}
                                className="mb-0 flex-1"
                              >
                                <Input placeholder="GPT-4o" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'enabled']}
                                valuePropName="checked"
                                className="mb-0"
                              >
                                <Switch 
                                  size="small"
                                  checkedChildren={<CheckOutlined />}
                                  unCheckedChildren={<CloseOutlined />}
                                />
                              </Form.Item>
                              {fields.length > 1 && (
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(name)}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => add({
                            id: `model-${Date.now()}`,
                            modelId: '',
                            name: '',
                            enabled: true,
                          })}
                          block
                          icon={<PlusOutlined />}
                          size="small"
                          className="border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-500"
                        >
                          手动添加模型
                        </Button>
                      </>
                    );
                  }}
                </Form.List>
              </div>
            </TabPane>
          </Tabs>
        </Form>
      </Drawer>
    </div>
  );
};

export default ApiConfigManagement; 