import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Popconfirm,
  Typography,
  Tag,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Model, ApiConfig } from '../types';
import { modelStorage, apiConfigStorage } from '../utils/storage-simple';
import { storageAdapter } from '../utils/storage-adapter';
import { useTranslation } from 'react-i18next';

const { Option } = Select;
const { Text } = Typography;

const ModelsManagement: React.FC = () => {
  const { t } = useTranslation();
  const [models, setModels] = useState<Model[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [form] = Form.useForm();

  // 加载数据
  const loadData = async () => {
    setModels(modelStorage.getAll());
    setApiConfigs(await storageAdapter.getApiConfigs());
  };

  useEffect(() => {
    loadData();
  }, []);

  // 获取API配置名称
  const getApiConfigName = (apiConfigId: string) => {
    const config = apiConfigs.find(c => c.id === apiConfigId);
    return config ? config.name : '未知配置';
  };

  // 打开新建/编辑模态框
  const openModal = (model?: Model) => {
    setEditingModel(model || null);
    setModalVisible(true);
    
    if (model) {
      form.setFieldsValue({
        name: model.name,
        apiConfigId: model.apiConfigId,
      });
    } else {
      form.resetFields();
    }
  };

  // 关闭模态框
  const closeModal = () => {
    setModalVisible(false);
    setEditingModel(null);
    form.resetFields();
  };

  // 保存模型
  const saveModel = async (values: any) => {
    try {
      if (editingModel) {
        // 更新
        modelStorage.update(editingModel.id, values);
        message.success('模型更新成功');
      } else {
        // 新建
        modelStorage.create(values);
        message.success('模型创建成功');
      }
      
      loadData();
      closeModal();
    } catch (error) {
      console.error('保存模型失败:', error);
      message.error('保存失败');
    }
  };

  // 删除模型
  const deleteModel = (id: string) => {
    try {
      modelStorage.delete(id);
      message.success('模型删除成功');
      loadData();
    } catch (error) {
      console.error('删除模型失败:', error);
      message.error('删除失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '模型名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => (
        <Text code>{name}</Text>
      ),
    },
    {
      title: '关联API配置',
      dataIndex: 'apiConfigId',
      key: 'apiConfigId',
      width: 200,
      render: (apiConfigId: string) => (
        <Tag color="blue">{getApiConfigName(apiConfigId)}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Model) => (
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'nowrap' }}>
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Popconfirm
              title={t('models.deleteConfirm')}
              onConfirm={() => deleteModel(record.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="模型管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
            disabled={apiConfigs.length === 0}
          >
            新建模型
          </Button>
        }
        className="shadow-sm"
      >
        {apiConfigs.length === 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <Text type="warning">
              {t('models.createApiConfigFirst')}
            </Text>
          </div>
        )}
        
        <Table
          columns={columns}
          dataSource={models}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => t('common.totalRecords', { total }),
          }}
        />
      </Card>

      {/* 新建/编辑模态框 */}
      <Modal
        title={editingModel ? '编辑模型' : '新建模型'}
        open={modalVisible}
        onCancel={closeModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveModel}
        >
          <Form.Item
            label={t('models.modelName')}
            name="name"
            rules={[
              { required: true, message: t('models.pleaseInputModelName') },
              { max: 100, message: t('models.nameMaxLength') },
            ]}
            extra={t('models.modelNameHint')}
          >
            <Input placeholder={t('models.modelNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            label={t('models.associatedApiConfig')}
            name="apiConfigId"
            rules={[
              { required: true, message: t('models.pleaseSelectApiConfig') },
            ]}
          >
            <Select placeholder={t('models.selectApiConfig')}>
              {apiConfigs.map(config => (
                <Option key={config.id} value={config.id}>
                  {config.name} ({config.baseUrl})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={closeModal}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelsManagement; 