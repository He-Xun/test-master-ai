import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Popconfirm,
  Typography,
  Tabs,
  Select,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MessageOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Prompt, DefaultTestInput } from '../types';
import { storageAdapter } from '../utils/storage-adapter';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const PromptsManagement: React.FC = () => {
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [defaultInputs, setDefaultInputs] = useState<DefaultTestInput[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<Prompt | null>(null);
  
  // 默认输入模板相关状态
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [inputViewModalVisible, setInputViewModalVisible] = useState(false);
  const [editingInput, setEditingInput] = useState<DefaultTestInput | null>(null);
  const [viewingInput, setViewingInput] = useState<DefaultTestInput | null>(null);
  
  const [form] = Form.useForm();
  const [inputForm] = Form.useForm();

  // 加载提示词列表
  const loadPrompts = async () => {
    const prompts = await storageAdapter.getPrompts();
    setPrompts(prompts);
  };

  // 加载默认输入模板
  const loadDefaultInputs = async () => {
    const inputs = await storageAdapter.getDefaultTestInputs();
    setDefaultInputs(inputs);
  };

  useEffect(() => {
    loadPrompts();
    loadDefaultInputs();
  }, []);

  // 提示词相关方法
  const openModal = (prompt?: Prompt) => {
    setEditingPrompt(prompt || null);
    setModalVisible(true);
    
    if (prompt) {
      form.setFieldsValue({
        name: prompt.name,
        content: prompt.content,
      });
    } else {
      form.resetFields();
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingPrompt(null);
    form.resetFields();
  };

  const savePrompt = async (values: any) => {
    try {
      if (editingPrompt) {
        await storageAdapter.updatePrompt(editingPrompt.id, values);
        message.success(t('prompts.promptUpdateSuccess'));
      } else {
        await storageAdapter.createPrompt(values);
        message.success(t('prompts.promptCreateSuccess'));
      }
      
      loadPrompts();
      closeModal();
    } catch (error) {
      console.error('保存提示词失败:', error);
      message.error(t('prompts.saveFailed'));
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      await storageAdapter.deletePrompt(id);
      message.success(t('prompts.promptDeleteSuccess'));
      loadPrompts();
    } catch (error) {
      console.error('删除提示词失败:', error);
      message.error(t('prompts.deleteFailed'));
    }
  };

  const viewPrompt = (prompt: Prompt) => {
    setViewingPrompt(prompt);
    setViewModalVisible(true);
  };

  // 默认输入模板相关方法
  const openInputModal = (input?: DefaultTestInput) => {
    setEditingInput(input || null);
    setInputModalVisible(true);
    
    if (input) {
      inputForm.setFieldsValue({
        name: input.name,
        content: input.content,
        category: input.category,
      });
    } else {
      inputForm.resetFields();
    }
  };

  const closeInputModal = () => {
    setInputModalVisible(false);
    setEditingInput(null);
    inputForm.resetFields();
  };

  const saveDefaultInput = async (values: any) => {
    try {
      if (editingInput) {
        await storageAdapter.updateDefaultTestInput(editingInput.id, values);
        message.success(t('prompts.templateUpdateSuccess'));
      } else {
        await storageAdapter.createDefaultTestInput(values);
        message.success(t('prompts.templateCreateSuccess'));
      }
      await loadDefaultInputs();
      closeInputModal();
    } catch (error) {
      console.error('保存测试模板失败:', error);
      message.error(t('prompts.saveFailed'));
    }
  };

  const deleteDefaultInput = async (id: string) => {
    try {
      await storageAdapter.deleteDefaultTestInput(id);
      message.success(t('prompts.templateDeleteSuccess'));
      await loadDefaultInputs();
    } catch (error) {
      console.error('删除测试模板失败:', error);
      message.error(t('prompts.deleteFailed'));
    }
  };

  const viewDefaultInput = (input: DefaultTestInput) => {
    setViewingInput(input);
    setInputViewModalVisible(true);
  };

  // 提示词表格列定义
  const promptColumns = [
    {
      title: t('prompts.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: t('prompts.contentPreview'),
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => (
        <div className="text-ellipsis-2" style={{ maxHeight: '48px' }}>
          {content}
        </div>
      ),
    },
    {
      title: t('prompts.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: t('prompts.updatedAt'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: t('prompts.actions'),
      key: 'action',
      width: 200,
      render: (_: any, record: Prompt) => (
        <Space size="small">
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewPrompt(record)}
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
{t('prompts.view')}
          </Button>
          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
            className="border-green-300 text-green-600 hover:bg-green-50"
          >
{t('prompts.edit')}
          </Button>
          <Popconfirm
            title={t('prompts.confirmDeletePrompt')}
            onConfirm={() => deletePrompt(record.id)}
            okText={t('prompts.confirmText')}
            cancelText={t('prompts.cancelText')}
          >
            <Button
              type="default"
              size="small"
              danger
              icon={<DeleteOutlined />}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
  {t('prompts.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 默认输入模板表格列定义
  const inputColumns = [
    {
      title: t('prompts.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: t('prompts.category'),
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
          {category}
        </span>
      ),
    },
    {
      title: t('prompts.contentPreview'),
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => (
        <div className="text-ellipsis-2" style={{ maxHeight: '48px' }}>
          {content}
        </div>
      ),
    },
    {
      title: t('prompts.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: t('prompts.actions'),
      key: 'action',
      width: 200,
      render: (_: any, record: DefaultTestInput) => (
        <Space size="small">
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewDefaultInput(record)}
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
{t('prompts.view')}
          </Button>
          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openInputModal(record)}
            className="border-green-300 text-green-600 hover:bg-green-50"
          >
{t('prompts.edit')}
          </Button>
          <Popconfirm
            title={t('prompts.confirmDeleteTemplate')}
            onConfirm={() => deleteDefaultInput(record.id)}
            okText={t('prompts.confirmText')}
            cancelText={t('prompts.cancelText')}
          >
            <Button
              type="default"
              size="small"
              danger
              icon={<DeleteOutlined />}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
  {t('prompts.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <MessageOutlined className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('prompts.title')}</h1>
              <p className="text-gray-500 mt-1">{t('prompts.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{prompts.length + defaultInputs.length}</div>
              <div className="text-sm text-gray-500">{t('prompts.totalTemplates')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页内容 */}
      <Card className="shadow-sm border-gray-200">
        <Tabs
          defaultActiveKey="prompts"
          size="large"
          items={[
            {
              key: 'prompts',
              label: (
                <span>
                  <MessageOutlined />
                  {t('prompts.promptTemplates')} ({prompts.length})
                </span>
              ),
              children: (
                <>
                  <div className="mb-4 flex justify-end">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => openModal()}
                      size="large"
                      className="bg-gradient-to-r from-purple-500 to-pink-500 border-none shadow-lg hover:shadow-xl"
                    >
                      {t('prompts.addPrompt')}
                    </Button>
                  </div>
                  <Table
                    columns={promptColumns}
                    dataSource={prompts}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => t('common.pagination', { start: range[0], end: range[1], total }),
                    }}
                    className="custom-table"
                    locale={{
                      emptyText: (
                        <div className="py-12 text-center">
                          <MessageOutlined className="text-4xl text-gray-300 mb-4" />
                          <p className="text-gray-500 mb-4">{t('prompts.noPrompts')}</p>
                          <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
                            onClick={() => openModal()}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 border-none"
                          >
                            {t('prompts.createFirstPrompt')}
                          </Button>
                        </div>
                      )
                    }}
                  />
                </>
              )
            },
            {
              key: 'inputs',
              label: (
                <span>
                  <AppstoreOutlined />
                  {t('prompts.testInputTemplates')} ({defaultInputs.length})
                </span>
              ),
              children: (
                <>
                  <div className="mb-4 flex justify-end">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => openInputModal()}
                      size="large"
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 border-none shadow-lg hover:shadow-xl"
                    >
                      {t('prompts.addTestTemplate')}
                    </Button>
                  </div>
                  <Table
                    columns={inputColumns}
                    dataSource={defaultInputs}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => t('common.pagination', { start: range[0], end: range[1], total }),
                    }}
                    className="custom-table"
                    locale={{
                      emptyText: (
                        <div className="py-12 text-center">
                          <AppstoreOutlined className="text-4xl text-gray-300 mb-4" />
                          <p className="text-gray-500 mb-4">{t('prompts.noTestTemplates')}</p>
                          <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
                            onClick={() => openInputModal()}
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 border-none"
                          >
                            {t('prompts.createFirstTemplate')}
                          </Button>
                        </div>
                      )
                    }}
                  />
                </>
              )
            }
          ]}
        />
      </Card>

      {/* 新建/编辑模态框 */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <MessageOutlined className="text-purple-500" />
            <span>{editingPrompt ? t('prompts.editPrompt') : t('prompts.addPrompt')}</span>
          </div>
        }
        open={modalVisible}
        onCancel={closeModal}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={savePrompt}
        >
          <Form.Item
            label={t('prompts.promptName')}
            name="name"
            rules={[
              { required: true, message: t('prompts.nameRequired') },
              { max: 100, message: t('prompts.nameMaxLength') },
            ]}
          >
            <Input placeholder={t('prompts.promptNamePlaceholder')} size="large" onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                (e.target as HTMLInputElement).select();
                e.preventDefault();
              }
            }} />
          </Form.Item>

          <Form.Item
            label={t('prompts.promptContent')}
            name="content"
            rules={[
              { required: true, message: t('prompts.contentRequired') },
              { max: 5000, message: t('prompts.contentMaxLength') },
            ]}
          >
            <TextArea
              rows={12}
              placeholder={t('prompts.promptContentPlaceholder')}
              showCount
              maxLength={5000}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                  (e.target as HTMLTextAreaElement).select();
                  e.preventDefault();
                }
              }}
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                size="large"
                className="bg-gradient-to-r from-purple-500 to-pink-500 border-none"
              >
{t('prompts.save')}
              </Button>
              <Button onClick={closeModal} size="large">
                {t('prompts.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建/编辑默认输入模板模态框 */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <AppstoreOutlined className="text-blue-500" />
            <span>{editingInput ? t('prompts.editTestTemplate') : t('prompts.addTestTemplate')}</span>
          </div>
        }
        open={inputModalVisible}
        onCancel={closeInputModal}
        footer={null}
        width={800}
      >
        <Form
          form={inputForm}
          layout="vertical"
          onFinish={saveDefaultInput}
        >
          <Form.Item
            label={t('prompts.templateName')}
            name="name"
            rules={[
              { required: true, message: t('prompts.templateNameRequired') },
              { max: 100, message: t('prompts.nameMaxLength') },
            ]}
          >
            <Input placeholder={t('prompts.templateNamePlaceholder')} size="large" onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                (e.target as HTMLInputElement).select();
                e.preventDefault();
              }
            }} />
          </Form.Item>

          <Form.Item
            label={t('prompts.category')}
            name="category"
            rules={[
              { required: true, message: t('prompts.categoryRequired') },
            ]}
          >
            <Select
              placeholder={t('prompts.categoryPlaceholder')}
              size="large"
              mode="tags"
              maxTagCount={1}
              options={[
                { label: t('prompts.categories.textGeneration'), value: t('prompts.categories.textGeneration') },
                { label: t('prompts.categories.codeGeneration'), value: t('prompts.categories.codeGeneration') },
                { label: t('prompts.categories.translation'), value: t('prompts.categories.translation') },
                { label: t('prompts.categories.qa'), value: t('prompts.categories.qa') },
                { label: t('prompts.categories.creativeWriting'), value: t('prompts.categories.creativeWriting') },
                { label: t('prompts.categories.analysis'), value: t('prompts.categories.analysis') },
                { label: t('prompts.categories.other'), value: t('prompts.categories.other') },
              ]}
            />
          </Form.Item>

          <Form.Item
            label={t('prompts.testContent')}
            name="content"
            rules={[
              { required: true, message: t('prompts.testContentRequired') },
              { max: 2000, message: t('prompts.testContentMaxLength') },
            ]}
          >
            <TextArea
              rows={8}
              placeholder={t('prompts.testContentPlaceholder')}
              showCount
              maxLength={2000}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                  (e.target as HTMLTextAreaElement).select();
                  e.preventDefault();
                }
              }}
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                size="large"
                className="bg-gradient-to-r from-blue-500 to-indigo-500 border-none"
              >
{t('prompts.save')}
              </Button>
              <Button onClick={closeInputModal} size="large">
                {t('prompts.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看详情模态框 */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <EyeOutlined className="text-blue-500" />
            <span>{t('prompts.promptDetails')}</span>
          </div>
        }
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)} size="large">
{t('prompts.close')}
          </Button>,
        ]}
        width={800}
      >
        {viewingPrompt && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <Text strong className="text-gray-700">{t('prompts.name')}:</Text>
              <Text className="ml-2 text-lg">{viewingPrompt.name}</Text>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <Text strong className="text-gray-700">{t('prompts.content')}:</Text>
              <Paragraph className="mt-3 p-4 bg-white rounded border whitespace-pre-wrap shadow-sm">
                {viewingPrompt.content}
              </Paragraph>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Text strong className="text-gray-700">{t('prompts.createdAt')}:</Text>
                <div className="mt-1 text-sm text-gray-600">
                  {new Date(viewingPrompt.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <Text strong className="text-gray-700">{t('prompts.updatedAt')}:</Text>
                <div className="mt-1 text-sm text-gray-600">
                  {new Date(viewingPrompt.updatedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 查看默认输入模板详情模态框 */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <EyeOutlined className="text-blue-500" />
            <span>{t('prompts.testTemplateDetails')}</span>
          </div>
        }
        open={inputViewModalVisible}
        onCancel={() => setInputViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setInputViewModalVisible(false)} size="large">
{t('prompts.close')}
          </Button>,
        ]}
        width={800}
      >
        {viewingInput && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <Text strong className="text-gray-700">{t('prompts.name')}:</Text>
              <Text className="ml-2 text-lg">{viewingInput.name}</Text>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <Text strong className="text-gray-700">{t('prompts.content')}:</Text>
              <Paragraph className="mt-3 p-4 bg-white rounded border whitespace-pre-wrap shadow-sm">
                {viewingInput.content}
              </Paragraph>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Text strong className="text-gray-700">{t('prompts.category')}:</Text>
                <div className="mt-1 text-sm text-gray-600">
                  {viewingInput.category}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <Text strong className="text-gray-700">{t('prompts.createdAt')}:</Text>
                <div className="mt-1 text-sm text-gray-600">
                  {new Date(viewingInput.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PromptsManagement;