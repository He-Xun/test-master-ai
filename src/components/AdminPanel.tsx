import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Popconfirm,
  Tag,
  Avatar,
  Typography,
  Divider,
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  Drawer,
  Dropdown,
  Checkbox,
  Alert,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  KeyOutlined,
  ExclamationCircleOutlined,
  CrownOutlined,
  TeamOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  DownOutlined,
  UsergroupDeleteOutlined,
  LockOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { User, UserRole } from '../types';
import { storageAdapter } from '../utils/storage-adapter';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { Option } = Select;

interface AdminPanelProps {
  currentUser: User;
}

interface UserFormData {
  username: string;
  email: string;
  role: UserRole;
  password?: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [batchPasswordModalVisible, setBatchPasswordModalVisible] = useState(false);
  const [currentEditUser, setCurrentEditUser] = useState<User | null>(null);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [form] = Form.useForm<UserFormData>();
  const [passwordForm] = Form.useForm<{ password: string; confirmPassword: string }>();
  const [batchPasswordForm] = Form.useForm<{ password: string; confirmPassword: string }>();

  // 检查权限
  useEffect(() => {
    if (!storageAdapter.isSuperAdmin(currentUser)) {
      message.error('您没有权限访问管理面板');
      return;
    }
    loadUsers();
  }, [currentUser]);

  // 加载用户列表
  const loadUsers = async () => {
    try {
      setLoading(true);
      const userList = await storageAdapter.getAllUsers();
      setUsers(userList);
    } catch (error) {
      console.error('加载用户失败:', error);
      message.error('加载用户失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建用户
  const handleCreateUser = () => {
    setCurrentEditUser(null);
    form.resetFields();
    setEditModalVisible(true);
  };

  // 编辑用户
  const handleEditUser = (user: User) => {
    setCurrentEditUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
    });
    setEditModalVisible(true);
  };

  // 重置密码
  const handleResetPassword = (user: User) => {
    setCurrentEditUser(user);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  // 查看用户详情
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setUserDetailVisible(true);
  };

  // 删除用户
  const handleDeleteUser = async (user: User) => {
    try {
      const success = await storageAdapter.deleteUser(user.id, currentUser.id);
      if (success) {
        message.success('用户删除成功');
        loadUsers();
      } else {
        message.error('删除用户失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error('删除用户失败');
    }
  };

  // 批量删除用户
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的用户');
      return;
    }

    // 检查是否选择了超级管理员
    const hasSuperAdmin = selectedUsers.some(user => user.role === 'superadmin');
    if (hasSuperAdmin) {
      message.error('不能删除超级管理员账户');
      return;
    }

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？此操作无法撤销。`,
      icon: <ExclamationCircleOutlined />,
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          setLoading(true);
          let successCount = 0;
          let failCount = 0;

          for (const user of selectedUsers) {
            const success = await storageAdapter.deleteUser(user.id, currentUser.id);
            if (success) {
              successCount++;
            } else {
              failCount++;
            }
          }

          if (successCount > 0) {
            message.success(`成功删除 ${successCount} 个用户`);
          }
          if (failCount > 0) {
            message.error(`删除失败 ${failCount} 个用户`);
          }

          setSelectedRowKeys([]);
          setSelectedUsers([]);
          loadUsers();
        } catch (error) {
          console.error('批量删除失败:', error);
          message.error('批量删除失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 批量重置密码
  const handleBatchResetPassword = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要重置密码的用户');
      return;
    }
    batchPasswordForm.resetFields();
    setBatchPasswordModalVisible(true);
  };

  // 提交用户表单
  const handleSubmitUser = async () => {
    try {
      const values = await form.validateFields();
      
      if (currentEditUser) {
        // 更新用户
        const success = await storageAdapter.updateUserInfo(
          currentEditUser.id,
          values,
          currentUser.id
        );
        if (success) {
          message.success('用户更新成功');
          setEditModalVisible(false);
          loadUsers();
        } else {
          message.error('更新用户失败');
        }
      } else {
        // 创建新用户
        const newUser = await storageAdapter.createUser({
          username: values.username,
          email: values.email,
          role: values.role,
        });
        
        // 设置密码
        if (values.password) {
          await storageAdapter.storeUserPassword(newUser.id, values.password);
        }
        
        message.success('用户创建成功');
        setEditModalVisible(false);
        loadUsers();
      }
    } catch (error) {
      console.error('保存用户失败:', error);
      message.error('保存用户失败');
    }
  };

  // 提交密码重置
  const handleSubmitPassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      if (currentEditUser) {
        const success = await storageAdapter.resetUserPassword(
          currentEditUser.id,
          values.password,
          currentUser.id
        );
        if (success) {
          message.success('密码重置成功');
          setPasswordModalVisible(false);
        } else {
          message.error('重置密码失败');
        }
      }
    } catch (error) {
      console.error('重置密码失败:', error);
      message.error('重置密码失败');
    }
  };

  // 提交批量密码重置
  const handleSubmitBatchPassword = async () => {
    try {
      const values = await batchPasswordForm.validateFields();
      setLoading(true);
      
      let successCount = 0;
      let failCount = 0;

      for (const user of selectedUsers) {
        const success = await storageAdapter.resetUserPassword(
          user.id,
          values.password,
          currentUser.id
        );
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        message.success(`成功重置 ${successCount} 个用户的密码`);
      }
      if (failCount > 0) {
        message.error(`重置失败 ${failCount} 个用户的密码`);
      }

      setBatchPasswordModalVisible(false);
      setSelectedRowKeys([]);
      setSelectedUsers([]);
    } catch (error) {
      console.error('批量重置密码失败:', error);
      message.error('批量重置密码失败');
    } finally {
      setLoading(false);
    }
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[], newSelectedUsers: User[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[]);
      setSelectedUsers(newSelectedUsers);
    },
    getCheckboxProps: (record: User) => ({
      disabled: record.role === 'superadmin' && record.id === currentUser.id, // 禁止选择当前超级管理员
    }),
  };

  // 批量操作菜单
  const batchActionMenu = {
    items: [
      {
        key: 'resetPassword',
        label: '批量重置密码',
        icon: <LockOutlined />,
        disabled: selectedRowKeys.length === 0,
      },
      {
        key: 'delete',
        label: '批量删除用户',
        icon: <UsergroupDeleteOutlined />,
        disabled: selectedRowKeys.length === 0,
        danger: true,
      },
    ],
    onClick: ({ key }: { key: string }) => {
      switch (key) {
        case 'resetPassword':
          handleBatchResetPassword();
          break;
        case 'delete':
          handleBatchDelete();
          break;
      }
    },
  };

  // 表格列定义
  const columns = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 60,
      render: (avatar: string, record: User) => (
        <Avatar src={avatar || '/avatar/default.png'} icon={<UserOutlined />} />
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: User) => (
        <Space>
          <Text strong>{username}</Text>
          {record.role === 'superadmin' && <CrownOutlined className="text-yellow-500" />}
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => {
        const roleConfig = {
          superadmin: { color: 'gold', text: '超级管理员', icon: <CrownOutlined /> },
          admin: { color: 'blue', text: '管理员', icon: <SafetyCertificateOutlined /> },
          user: { color: 'green', text: '普通用户', icon: <UserOutlined /> },
        };
        const config = roleConfig[role];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: User) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              type="link" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewUser(record)}
            />
          </Tooltip>
          
          <Tooltip title="编辑用户">
            <Button 
              type="link" 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEditUser(record)}
              disabled={record.role === 'superadmin' && record.id !== currentUser.id}
            />
          </Tooltip>
          
          <Tooltip title="重置密码">
            <Button 
              type="link" 
              size="small" 
              icon={<KeyOutlined />}
              onClick={() => handleResetPassword(record)}
            />
          </Tooltip>
          
          {record.role !== 'superadmin' && (
            <Popconfirm
              title="确定要删除这个用户吗？"
              description="删除后将无法恢复，用户的所有数据都将被清除。"
              onConfirm={() => handleDeleteUser(record)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除用户">
                <Button 
                  type="link" 
                  size="small" 
                  icon={<DeleteOutlined />}
                  danger
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: users.length,
    superadmin: users.filter(u => u.role === 'superadmin').length,
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => u.role === 'user').length,
  };

  return (
    <div className="admin-panel">
      {/* 页面标题 */}
      <div className="mb-6">
        <Title level={2} className="flex items-center mb-2">
          <SettingOutlined className="mr-2 text-blue-500" />
          用户管理面板
        </Title>
        <Text type="secondary">管理系统用户、权限和安全设置</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="超级管理员"
              value={stats.superadmin}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="管理员"
              value={stats.admin}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="普通用户"
              value={stats.user}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作区域 */}
      <Card className="mb-4">
        <div className="flex justify-between items-center">
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateUser}
            >
              创建用户
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={loadUsers}
              loading={loading}
            >
              刷新
            </Button>
          </Space>

          <Space>
            {selectedRowKeys.length > 0 && (
              <Alert
                message={`已选择 ${selectedRowKeys.length} 个用户`}
                type="info"
                showIcon
                className="mr-2"
              />
            )}
            <Dropdown menu={batchActionMenu} disabled={selectedRowKeys.length === 0}>
              <Button icon={<MoreOutlined />}>
                批量操作 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div>
      </Card>

      {/* 用户列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 个用户`,
          }}
        />
      </Card>

      {/* 编辑用户模态框 */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            {currentEditUser ? '编辑用户' : '创建用户'}
          </Space>
        }
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleSubmitUser}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: 'user' }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度应在3-20字符之间' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '用户名只能包含字母、数字、下划线和横线' },
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="role"
            label="用户角色"
            rules={[{ required: true, message: '请选择用户角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
              {currentUser.role === 'superadmin' && (
                <Option value="superadmin">超级管理员</Option>
              )}
            </Select>
          </Form.Item>

          {!currentEditUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 重置密码模态框 */}
      <Modal
        title={
          <Space>
            <KeyOutlined />
            重置密码 - {currentEditUser?.username}
          </Space>
        }
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        onOk={handleSubmitPassword}
        width={400}
      >
        <Form
          form={passwordForm}
          layout="vertical"
        >
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量重置密码模态框 */}
      <Modal
        title={
          <Space>
            <LockOutlined />
            批量重置密码 ({selectedRowKeys.length} 个用户)
          </Space>
        }
        open={batchPasswordModalVisible}
        onCancel={() => setBatchPasswordModalVisible(false)}
        onOk={handleSubmitBatchPassword}
        width={400}
      >
        <div className="mb-4">
          <Text type="secondary">将为以下用户重置密码：</Text>
          <div className="mt-2 p-2 bg-gray-50 rounded">
            {selectedUsers.map(user => (
              <Tag key={user.id} className="mb-1">{user.username}</Tag>
            ))}
          </div>
        </div>
        
        <Form
          form={batchPasswordForm}
          layout="vertical"
        >
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 用户详情抽屉 */}
      <Drawer
        title={
          <Space>
            <UserOutlined />
            用户详情 - {selectedUser?.username}
          </Space>
        }
        open={userDetailVisible}
        onClose={() => setUserDetailVisible(false)}
        width={500}
      >
        {selectedUser && (
          <div>
            <Card className="mb-4">
              <div className="text-center mb-4">
                <Avatar 
                  src={selectedUser.avatar || '/avatar/default.png'} 
                  icon={<UserOutlined />} 
                  size={80}
                />
                <div className="mt-2">
                  <Title level={4}>{selectedUser.username}</Title>
                  <Text type="secondary">{selectedUser.email}</Text>
                </div>
              </div>
              
              <Divider />
              
              <Row gutter={16}>
                <Col span={12}>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {selectedUser.role === 'superadmin' ? '超管' : 
                       selectedUser.role === 'admin' ? '管理' : '用户'}
                    </div>
                    <div className="text-gray-500">角色</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {Math.floor((Date.now() - new Date(selectedUser.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-gray-500">注册天数</div>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card title="详细信息">
              <Space direction="vertical" className="w-full">
                <div>
                  <Text strong>用户ID：</Text>
                  <Text code>{selectedUser.id}</Text>
                </div>
                <div>
                  <Text strong>注册时间：</Text>
                  <Text>{new Date(selectedUser.createdAt).toLocaleString()}</Text>
                </div>
                <div>
                  <Text strong>最后更新：</Text>
                  <Text>{new Date(selectedUser.updatedAt).toLocaleString()}</Text>
                </div>
              </Space>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AdminPanel; 