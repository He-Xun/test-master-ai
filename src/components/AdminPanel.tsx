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
      message.error(t('admin.noPermission'));
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
      message.error(t('admin.loadUsersFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 创建用户
  const handleCreateUser = () => {
    if (!storageAdapter.getStorageInfo().sqliteEnabled) {
      message.warning('系统正在初始化数据库，请稍后再试');
      return;
    }
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
    if (!storageAdapter.getStorageInfo().sqliteEnabled) {
      message.warning('系统正在初始化数据库，请稍后再试');
      return;
    }
    try {
      const success = await storageAdapter.deleteUser(user.id, currentUser.id);
      if (success) {
        message.success(t('admin.userDeleteSuccess'));
        loadUsers();
      } else {
        message.error(t('admin.deleteUserFailed'));
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error(t('admin.deleteUserFailed'));
    }
  };

  // 批量删除用户
  const handleBatchDelete = () => {
    if (!storageAdapter.getStorageInfo().sqliteEnabled) {
      message.warning('系统正在初始化数据库，请稍后再试');
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.warning(t('admin.selectUsersFirst'));
      return;
    }

    // 检查是否选择了超级管理员
    const hasSuperAdmin = selectedUsers.some(user => user.role === 'superadmin');
    if (hasSuperAdmin) {
      message.error(t('admin.cannotDeleteSuperAdmin'));
      return;
    }

    Modal.confirm({
      title: t('admin.confirmBatchDelete'),
      content: t('admin.confirmBatchDeleteDesc', { count: selectedRowKeys.length }),
      icon: <ExclamationCircleOutlined />,
      okText: t('admin.confirmDelete'),
      cancelText: t('common.cancel'),
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
            message.success(t('admin.batchDeleteSuccess', { count: successCount }));
          }
          if (failCount > 0) {
            message.error(t('admin.batchDeleteFailed', { count: failCount }));
          }

          setSelectedRowKeys([]);
          setSelectedUsers([]);
          loadUsers();
        } catch (error) {
          console.error('批量删除失败:', error);
          message.error(t('admin.batchDeleteFailed'));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 批量重置密码
  const handleBatchResetPassword = () => {
    if (!storageAdapter.getStorageInfo().sqliteEnabled) {
      message.warning('系统正在初始化数据库，请稍后再试');
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.warning(t('admin.selectUsersForPassword'));
      return;
    }
    batchPasswordForm.resetFields();
    setBatchPasswordModalVisible(true);
  };

  // 提交用户表单
  const handleSubmitUser = async () => {
    if (!storageAdapter.getStorageInfo().sqliteEnabled) {
      message.warning('系统正在初始化数据库，请稍后再试');
      return;
    }
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
          message.success(t('admin.userUpdateSuccess'));
          setEditModalVisible(false);
          loadUsers();
        } else {
          message.error(t('admin.updateUserFailed'));
        }
      } else {
        // 创建新用户
        const newUser = await storageAdapter.createUser({
          username: values.username,
          email: values.email,
          role: values.role,
        }, values.password);
        
        message.success(t('admin.userCreateSuccess'));
        setEditModalVisible(false);
        loadUsers();
      }
    } catch (error) {
      console.error('保存用户失败:', error);
      message.error(t('admin.saveUserFailed'));
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
          message.success(t('admin.passwordResetSuccess'));
          setPasswordModalVisible(false);
        } else {
          message.error(t('admin.resetPasswordFailed'));
        }
      }
    } catch (error) {
      console.error('重置密码失败:', error);
      message.error(t('admin.resetPasswordFailed'));
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
        message.success(t('admin.passwordBatchResetSuccess', { count: successCount }));
      }
      if (failCount > 0) {
        message.error(t('admin.passwordBatchResetFailed', { count: failCount }));
      }

      setBatchPasswordModalVisible(false);
      setSelectedRowKeys([]);
      setSelectedUsers([]);
    } catch (error) {
      console.error('批量重置密码失败:', error);
      message.error(t('admin.batchPasswordResetFailed'));
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
        label: t('admin.batchResetPasswordLabel'),
        icon: <LockOutlined />,
        disabled: selectedRowKeys.length === 0,
      },
      {
        key: 'delete',
        label: t('admin.batchDeleteUsersLabel'),
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
      title: t('admin.avatar'),
      dataIndex: 'avatar',
      key: 'avatar',
      width: 60,
      render: (avatar: string, record: User) => (
        <Avatar src={avatar || '/avatar/default.png'} icon={<UserOutlined />} />
      ),
    },
    {
      title: t('admin.username'),
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
      title: t('admin.email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('admin.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => {
        const roleConfig = {
          superadmin: { color: 'gold', text: t('admin.superAdmin'), icon: <CrownOutlined /> },
          admin: { color: 'blue', text: t('admin.admin'), icon: <SafetyCertificateOutlined /> },
          user: { color: 'green', text: t('admin.normalUser'), icon: <UserOutlined /> },
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
      title: t('admin.registrationTime'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t('admin.operations'),
      key: 'actions',
      width: 200,
      render: (_, record: User) => (
        <Space size="small">
          <Tooltip title={t('admin.viewDetails')}>
            <Button 
              type="link" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewUser(record)}
            />
          </Tooltip>
          
          <Tooltip title={t('admin.editUser')}>
            <Button 
              type="link" 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEditUser(record)}
              disabled={record.role === 'superadmin' && record.id !== currentUser.id}
            />
          </Tooltip>
          
          <Tooltip title={t('admin.resetPassword')}>
            <Button 
              type="link" 
              size="small" 
              icon={<KeyOutlined />}
              onClick={() => handleResetPassword(record)}
            />
          </Tooltip>
          
          {record.role !== 'superadmin' && (
            <Popconfirm
              title={t('admin.deleteConfirmation')}
              description={t('admin.deleteWarning')}
              onConfirm={() => handleDeleteUser(record)}
              okText={t('common.ok')}
              cancelText={t('common.cancel')}
            >
              <Tooltip title={t('admin.deleteUser')}>
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
      <div className="mb-8">
        <Title level={2} className="flex items-center mb-4">
          <SettingOutlined className="mr-2 text-blue-500" />
          {t('admin.title')}
        </Title>
        <Text type="secondary">{t('admin.subtitle')}</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title={t('admin.totalUsers')}
              value={stats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('admin.superAdmins')}
              value={stats.superadmin}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('admin.admins')}
              value={stats.admin}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('admin.users')}
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
              {t('admin.createUser')}
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={loadUsers}
              loading={loading}
            >
              {t('admin.refresh')}
            </Button>
          </Space>

          <Space>
            {selectedRowKeys.length > 0 && (
              <Alert
                message={t('admin.selectedUsers', { count: selectedRowKeys.length })}
                type="info"
                showIcon
                className="mr-2"
              />
            )}
            <Dropdown menu={batchActionMenu} disabled={selectedRowKeys.length === 0}>
              <Button icon={<MoreOutlined />}>
                {t('admin.batchOperations')} <DownOutlined />
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
            showTotal: (total, range) => t('admin.paginationDesc', { 
              start: range[0], 
              end: range[1], 
              total: total 
            }),
          }}
        />
      </Card>

      {/* 编辑用户模态框 */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            {currentEditUser ? t('admin.editUserModal') : t('admin.createUserModal')}
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
            label={t('admin.username')}
            rules={[
              { required: true, message: t('admin.enterUsername') },
              { min: 3, max: 20, message: t('admin.usernameLength') },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: t('admin.usernamePattern') },
            ]}
          >
            <Input placeholder={t('admin.enterUsername')} />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('admin.email')}
            rules={[
              { required: true, message: t('admin.enterEmail') },
              { type: 'email', message: t('admin.validEmail') },
            ]}
          >
            <Input placeholder={t('admin.enterEmail')} />
          </Form.Item>

          <Form.Item
            name="role"
            label={t('admin.selectRole')}
            rules={[{ required: true, message: t('admin.selectRole') }]}
          >
            <Select placeholder={t('admin.selectRolePlaceholder')}>
              <Option value="user">{t('admin.normalUser')}</Option>
              <Option value="admin">{t('admin.admin')}</Option>
              {currentUser.role === 'superadmin' && (
                <Option value="superadmin">{t('admin.superAdmin')}</Option>
              )}
            </Select>
          </Form.Item>

          {!currentEditUser && (
            <Form.Item
              name="password"
              label={t('admin.password')}
              rules={[
                { required: true, message: t('admin.enterPassword') },
                { min: 6, message: t('admin.minPasswordLength') },
              ]}
            >
              <Input.Password placeholder={t('admin.enterPassword')} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 重置密码模态框 */}
      <Modal
        title={
          <Space>
            <KeyOutlined />
            {t('admin.resetPasswordModal')} - {currentEditUser?.username}
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
            label={t('admin.newPassword')}
            rules={[
              { required: true, message: t('admin.enterNewPassword') },
              { min: 6, message: t('admin.minPasswordLength') },
            ]}
          >
            <Input.Password placeholder={t('admin.enterNewPassword')} />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t('admin.confirmNewPassword')}
            dependencies={['password']}
            rules={[
              { required: true, message: t('admin.confirmPassword') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('admin.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password placeholder={t('admin.confirmNewPasswordPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量重置密码模态框 */}
      <Modal
        title={
          <Space>
            <LockOutlined />
            {t('admin.batchPasswordModal')} ({selectedRowKeys.length} {t('admin.usersSelected')})
          </Space>
        }
        open={batchPasswordModalVisible}
        onCancel={() => setBatchPasswordModalVisible(false)}
        onOk={handleSubmitBatchPassword}
        width={400}
      >
        <div className="mb-4">
          <Text type="secondary">{t('admin.willResetPasswordFor')}</Text>
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
            label={t('admin.newPassword')}
            rules={[
              { required: true, message: t('admin.enterNewPassword') },
              { min: 6, message: t('admin.minPasswordLength') },
            ]}
          >
            <Input.Password placeholder={t('admin.enterNewPassword')} />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t('admin.confirmNewPassword')}
            dependencies={['password']}
            rules={[
              { required: true, message: t('admin.confirmPassword') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('admin.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password placeholder={t('admin.confirmNewPasswordPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 用户详情抽屉 */}
      <Drawer
        title={
          <Space>
            <UserOutlined />
            {t('admin.userDetails')} - {selectedUser?.username}
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
                      {selectedUser.role === 'superadmin' ? t('admin.superAdminShort') : 
                       selectedUser.role === 'admin' ? t('admin.adminShort') : t('admin.userShort')}
                    </div>
                    <div className="text-gray-500">{t('admin.roleLabel')}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {Math.floor((Date.now() - new Date(selectedUser.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-gray-500">{t('admin.registrationDaysLabel')}</div>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card title={t('admin.detailsTitle')}>
              <Space direction="vertical" className="w-full">
                <div>
                  <Text strong>{t('admin.userId')}</Text>
                  <Text code>{selectedUser.id}</Text>
                </div>
                <div>
                  <Text strong>{t('admin.registrationTimeLabel')}</Text>
                  <Text>{new Date(selectedUser.createdAt).toLocaleString()}</Text>
                </div>
                <div>
                  <Text strong>{t('admin.lastUpdated')}</Text>
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