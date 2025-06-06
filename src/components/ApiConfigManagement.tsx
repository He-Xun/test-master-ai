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
  Select,
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
import { MenuOutlined } from '@ant-design/icons';
import { ReactSortable } from 'react-sortablejs';
import { ApiConfig, ModelConfig, RequestMode } from '../types';
import { storageAdapter } from '../utils/storage-adapter';
import { testApiConfig, fetchAvailableModels } from '../utils/api';
import { getModelIcon } from '@/constants/modelIconMap.tsx';
import type { ColumnsType } from 'antd/es/table';
import { PROVIDERS } from '@/constants/providerList';

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
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [editingModelIndex, setEditingModelIndex] = useState<number | null>(null);
  const [modelForm] = Form.useForm();

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
      provider: undefined,
      models: [],
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
      provider: typeof config.provider === 'string' ? config.provider : '',
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
    message.success(t('api.deleteSuccess', { id }));
  };

  const handleTest = async (config: ApiConfig) => {
    setTesting(config.id);
    try {
      const success = await testApiConfig(config);
      if (success) {
        message.success(t('api.testSuccess', { id: config.id }));
      } else {
        message.error(t('api.testFailed', { id: config.id }));
      }
    } catch (error: any) {
      message.error(`${t('api.testFailed', { id: config.id })}: ${error.message}`);
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
      message.warning(t('api.onlyApiModeSupport', { requestMode }));
      return;
    }

    if (!baseUrl || !apiKey) {
      message.warning(t('api.fillBaseUrlAndApiKey', { baseUrl, apiKey }));
      return;
    }

    // 创建缓存键
    const cacheKey = `${baseUrl}_${apiKey.substring(0, 10)}`;
    
    // 检查缓存
    if (cachedModels[cacheKey]) {
      setAvailableModels(cachedModels[cacheKey]);
      setModelsPanelVisible(true);
      message.success(t('api.fetchModelsSuccess', { count: cachedModels[cacheKey].length }));
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
      message.error(`${t('api.fetchModelsFailed', { error: error.message })}`);
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
      message.warning(t('api.modelAlreadyExists', { count: selectedModelIds.length }));
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

      // 新增：保存前校验 models
      if (!values.models || !Array.isArray(values.models) || values.models.length === 0) {
        message.error(t('api.pleaseSelectAtLeastOneModel', { count: 1 }));
        return;
      }
      for (const m of values.models as any[]) {
        if (!m.modelId || !m.name) {
          message.error(t('api.modelIdAndNameCannotBeEmpty'));
          return;
        }
      }
      // 保证 models 字段无非法值
      values.models = (values.models as any[]).map((m: any) => ({
        id: m.id || `model-${Date.now()}-${Math.random()}`,
        modelId: m.modelId,
        name: m.name,
        enabled: m.enabled !== false,
      }));

      // 保证所有必填字段不为undefined
      values.requestMode = values.requestMode || form.getFieldValue('requestMode') || 'api';
      values.directUrl = values.directUrl || null;
      values.baseUrl = values.baseUrl || null;
      // 新增：保存前强制trim apiKey并打印日志
      values.apiKey = (values.apiKey || '').trim() || null;
      console.log('[ApiConfigManagement] 保存前的apiKey:', values.apiKey);

      // 新增：保存provider字段
      values.provider = values.provider || form.getFieldValue('provider') || undefined;

      if (editingConfig) {
        const updated = { ...editingConfig, ...values, updatedAt: new Date().toISOString() };
        console.log('[ApiConfigManagement] 准备更新的配置:', updated);
        await storageAdapter.updateApiConfig(editingConfig.id, updated);
        message.success(t('api.updateSuccess', { id: editingConfig.id }));
        console.log('[ApiConfigManagement] 配置更新成功');
      } else {
        const newConfig = {
          ...values,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        console.log('[ApiConfigManagement] 准备保存的新配置:', newConfig);
        await storageAdapter.createApiConfig(newConfig);
        message.success(t('api.saveSuccess', { id: newConfig.id }));
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
      console.error('[ApiConfigManagement] 保存配置失败:', error, (error as any)?.stack);
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
      gpt: [],
      claude: [],
      qwen: [],
      deepseek: [],
      llama: [],
      opensource: [],
      other: []
    };

    models.forEach(model => {
      const name = model.name.toLowerCase();
      const id = model.id.toLowerCase();
      
      if (name.includes('gpt') || name.includes('davinci') || name.includes('babbage') || name.includes('curie')) {
        groups['gpt'].push(model);
      } else if (name.includes('claude')) {
        groups['claude'].push(model);
      } else if (name.includes('qwen') || id.includes('qwen')) {
        groups['qwen'].push(model);
      } else if (name.includes('deepseek') || id.includes('deepseek')) {
        groups['deepseek'].push(model);
      } else if (name.includes('llama') || id.includes('llama') || name.includes('yi-') || id.includes('yi-')) {
        groups['llama'].push(model);
      } else if (name.includes('mistral') || name.includes('chatglm') || name.includes('baichuan') || 
                 name.includes('moonshot') || name.includes('gemini') || name.includes('grok') ||
                 name.includes('internlm') || name.includes('aquila') || name.includes('falcon')) {
        groups['opensource'].push(model);
      } else {
        groups['other'].push(model);
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

  // 拖拽排序相关
  const DragHandle = () => (
    <MenuOutlined style={{ cursor: 'grab', color: '#999', fontSize: 18, marginRight: 8 }} />
  );

  const handleSort = (order: string[], fields: any[]) => {
    const models = form.getFieldValue('models') || [];
    // order是key的顺序
    const keyToIndex = Object.fromEntries(fields.map((f: any, idx: number) => [f.key, idx]));
    const newModels = order.map((key) => models[keyToIndex[key]]);
    form.setFieldsValue({ models: newModels });
  };

  // 打开添加模型弹窗
  const openAddModelModal = () => {
    modelForm.resetFields();
    setEditingModelIndex(null);
    setIsAddingModel(true);
  };

  // 打开编辑模型弹窗
  const openEditModelModal = (index: number, model: any) => {
    modelForm.setFieldsValue({ modelId: model.modelId, name: model.name });
    setEditingModelIndex(index);
    setIsAddingModel(true);
  };

  // 关闭弹窗
  const closeModelModal = () => {
    setIsAddingModel(false);
    setEditingModelIndex(null);
    modelForm.resetFields();
  };

  // 新增或编辑模型
  const handleModelModalOk = () => {
    modelForm.validateFields().then(values => {
      const models = form.getFieldValue('models') || [];
      if (editingModelIndex !== null) {
        // 编辑
        const newModels = [...models];
        newModels[editingModelIndex] = {
          ...newModels[editingModelIndex],
          modelId: values.modelId,
          name: values.name,
        };
        form.setFieldsValue({ models: newModels });
      } else {
        // 新增
        const newModel = {
          id: `model-${Date.now()}`,
          modelId: values.modelId,
          name: values.name,
          enabled: true,
        };
        form.setFieldsValue({ models: [...models, newModel] });
      }
      setIsAddingModel(false);
      setEditingModelIndex(null);
      modelForm.resetFields();
    });
  };

  // 过滤可选模型，排除已选中的
  const selectedModelIds = (form.getFieldValue('models') || []).map((m: any) => m.modelId);
  const filteredAvailableModels = availableModels.filter((model: any) => !selectedModelIds.includes(model.id));

  const columns: ColumnsType<ApiConfig> = [
    {
      title: t('api.name'),
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as 'left',
      width: 180,
      ellipsis: true,
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
      width: 120,
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
      width: 100,
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
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      fixed: 'right' as 'right',
      width: 120,
      render: (_: any, record: ApiConfig) => (
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'nowrap' }}>
          <Tooltip title={t('api.test')}>
            <Button
              type="text"
              size="small"
              icon={<ExperimentOutlined />}
              loading={testing === record.id}
              onClick={() => handleTest(record)}
              className="text-green-500 hover:bg-green-50"
            />
          </Tooltip>
          <Tooltip title={t('api.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              className="text-blue-500 hover:bg-blue-50"
            />
          </Tooltip>
          <Tooltip title={t('api.delete')}>
            <Popconfirm
              title={t('api.confirmDelete', { id: record.id })}
              onConfirm={() => handleDelete(record.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button 
                type="text" 
                danger 
                size="small"
                icon={<DeleteOutlined />}
                className="text-red-500 hover:bg-red-50"
              />
            </Popconfirm>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <ApiOutlined className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('api.title')}</h1>
              <p className="text-gray-500 mt-1 flex items-center gap-2">
                {t('api.subtitle')}
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto', fontSize: 13 }}
                  onClick={() => window.open('https://yunwu.ai/register?aff=okdc', '_blank')}
                >
                  {t('api.recommendPlatform')}
                </Button>
              </p>
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
          scroll={{ x: 1200 }}
          bordered
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
        styles={{ body: { maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', padding: 0 } }}
        footer={
          <div style={{ textAlign: 'right', padding: '16px 24px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }} size="large">{t('api.cancel')}</Button>
            <Button onClick={handleSubmit} type="primary" size="large" className="bg-gradient-to-r from-blue-500 to-indigo-500 border-none">{t('api.save')}</Button>
          </div>
        }
        destroyOnHidden
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
            items={[
              {
                key: 'basic',
                label: t('api.basicConfig'),
                children: (
                  <div className="space-y-4">
                    <Form.Item
                      name="name"
                      label={t('api.configName')}
                      rules={[{ required: true, message: t('api.pleaseEnterConfigName') }]}
                    >
                      <Input placeholder={t('api.pleaseEnterConfigName')} size="large" />
                    </Form.Item>
                    <Form.Item
                      name="provider"
                      label={t('api.provider')}
                      rules={[{ required: true, message: t('api.pleaseSelectProvider') }]}
                    >
                      <Select
                        placeholder={t('api.pleaseSelectProvider')}
                        size="large"
                        className="w-full"
                        onChange={val => {
                          const provider = PROVIDERS.find(p => p.key === val);
                          if (provider) {
                            // 选择自定义时不自动填充
                            if (val !== 'custom') {
                              form.setFieldsValue({ baseUrl: provider.baseUrl });
                            }
                            // ollama/lmstudio特殊处理
                            if (val === 'ollama' || val === 'lmstudio') {
                              form.setFieldsValue({ requestMode: 'url', apiKey: undefined });
                            } else {
                              form.setFieldsValue({ requestMode: 'api' });
                            }
                          }
                          form.setFieldsValue({ provider: val });
                        }}
                        showSearch
                        optionFilterProp="children"
                      >
                        {PROVIDERS.map(p => (
                          <Select.Option key={p.key} value={p.key}>
                            {p.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, currentValues) => 
                        prevValues.requestMode !== currentValues.requestMode
                      }
                    >
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
                        } else if (requestMode === 'api') {
                          // ollama/lmstudio不显示API Key
                          const provider = form.getFieldValue('provider');
                          if (provider === 'ollama' || provider === 'lmstudio') {
                            return (
                              <Form.Item
                                name="baseUrl"
                                label={t('api.baseUrl')}
                                rules={[
                                  { required: true, message: t('api.pleaseEnterBaseUrl') },
                                  { type: 'url', message: t('api.pleaseEnterValidUrl') },
                                ]}
                              >
                                <Input placeholder="http://localhost:11434" size="large" />
                              </Form.Item>
                            );
                          }
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
                        return null;
                      }}
                    </Form.Item>
                  </div>
                )
              },
              {
                key: 'models',
                label: t('api.modelConfig'),
                children: (
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
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">{t('api.autoFetchModels')}</h4>
                                  <p className="text-xs text-gray-500">{t('api.autoFetchModelsDescription')}</p>
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
                                    {availableModels.length > 0 ? t('api.refetchModels') : t('api.fetchModels')}
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
                                      {t('api.forceRefresh')}
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
                              <span>{t('api.selectModels')}</span>
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
                            <span className="text-xs text-gray-600">
                              {t('api.selectedCount', { count: selectedModels.length })} / {filteredModels.length}
                            </span>
                            <Space size="small">
                              <Button 
                                size="small" 
                                onClick={() => setSelectedModels([])}
                                disabled={selectedModels.length === 0}
                              >
                                {t('api.clearSelection')}
                              </Button>
                              <Button 
                                type="primary" 
                                size="small"
                                onClick={() => handleAddSelectedModels(selectedModels)}
                                disabled={selectedModels.length === 0}
                                className="bg-green-500 border-green-500"
                              >
                                {t('api.addSelectedModels', { count: selectedModels.length })}
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
                                  <span>{t(`api.group.${groupName}`)}</span>
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
                                      {groupModels.every(model => selectedModels.includes(model.id)) ? t('api.unselectAll') : t('api.selectAll')}
                                    </Button>
                                  </div>
                                  
                                  {/* 模型列表 - 更紧凑的布局 */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                    {groupModels
                                      .filter(model => !selectedModelIds.includes(model.id))
                                      .map(model => (
                                        <div
                                          key={model.id}
                                          className={`p-2 border rounded cursor-pointer transition-all text-xs flex items-center space-x-2 ${
                                            selectedModels.includes(model.id)
                                              ? 'border-green-500 bg-green-100 shadow-sm'
                                              : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                                          }`}
                                          onClick={() => {
                                            if (selectedModels.includes(model.id)) {
                                              setSelectedModels(selectedModels.filter(id => id !== model.id));
                                            } else {
                                              setSelectedModels([...selectedModels, model.id]);
                                            }
                                          }}
                                        >
                                          {selectedModels.includes(model.id) && (
                                            <CheckOutlined className="text-green-500 mr-1" />
                                          )}
                                          {getModelIcon(model.name || model.id)}
                                          <span>{model.name}</span>
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

                    <Form.List name="models">
                      {(fields, { add, remove }) => {
                        // 保存add和remove方法到ref中以便外部调用
                        formListRef.current = { add, remove };
                        
                        // 拖拽排序用list
                        const models = form.getFieldValue('models') || [];
                        return (
                          <>
                            <ReactSortable
                              list={models}
                              setList={newList => form.setFieldsValue({ models: newList })}
                              handle=".drag-handle"
                              animation={200}
                            >
                              {models.map((modelData: any, index: number) => (
                                <div
                                  key={modelData.id || index}
                                  className={`mb-2 p-3 border rounded-md bg-white flex items-center gap-3 transition-all duration-150 ${modelData.selected ? 'border-green-600 bg-green-100/90 shadow-lg' : 'border-gray-200 hover:border-green-400 hover:bg-green-50'}`}
                                  style={modelData.selected ? { boxShadow: '0 0 0 2px #22c55e33, 0 2px 8px #22c55e22' } : {}}
                                >
                                  <span className="drag-handle"><DragHandle /></span>
                                  <div className="flex-1 flex items-center">
                                    {getModelIcon(modelData?.name)}
                                    <span className="ml-2">{modelData?.name || '-'}</span>
                                  </div>
                                  <Form.Item
                                    name={[index, 'enabled']}
                                    valuePropName="checked"
                                    className="mb-0"
                                  >
                                    <Switch size="small" />
                                  </Form.Item>
                                  <Space>
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<EditOutlined />}
                                      onClick={() => openEditModelModal(index, modelData)}
                                    />
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      onClick={() => remove(index)}
                                    />
                                  </Space>
                                </div>
                              ))}
                            </ReactSortable>
                            <Button
                              type="primary"
                              onClick={openAddModelModal}
                              block
                              icon={<PlusOutlined />}
                              size="large"
                              style={{ height: 48, fontSize: 18, marginTop: 12, background: 'linear-gradient(90deg,#e0f2fe,#bbf7d0)', border: 'none', color: '#1677ff' }}
                              className="shadow hover:shadow-lg"
                            >
                              {t('api.manualAddModel')}
                            </Button>
                          </>
                        );
                      }}
                    </Form.List>
                  </div>
                )
              }
            ]}
          />
        </Form>
      </Drawer>
      
      {/* 添加模型弹窗 */}
      <Modal
        title={editingModelIndex !== null ? t('api.editModel') : t('api.addModel')}
        open={isAddingModel}
        onCancel={closeModelModal}
        onOk={handleModelModalOk}
        destroyOnClose
      >
        <Form
          form={modelForm}
          layout="vertical"
        >
          <Form.Item
            name="modelId"
            label={t('api.modelId')}
            rules={[{ required: true, message: t('api.pleaseEnterModelId') }]}
          >
            <Input placeholder={t('api.pleaseEnterModelId')} />
          </Form.Item>
          <Form.Item
            name="name"
            label={t('api.modelName')}
            rules={[{ required: true, message: t('api.pleaseEnterModelName') }]}
          >
            <Input placeholder={t('api.pleaseEnterModelName')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ApiConfigManagement; 