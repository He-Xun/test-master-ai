import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Tabs,
  message,
  Divider,
  Alert,
  Space,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  LoginOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { LoginForm, RegisterForm, User } from '../types';
import { userStorage } from '../utils/storage-simple';

const { TabPane } = Tabs;

interface UserAuthProps {
  visible?: boolean;
  onClose?: () => void;
  onLogin: (user: User) => void;
  defaultTab?: string;
  inline?: boolean;
}

const UserAuth: React.FC<UserAuthProps> = ({ visible = true, onClose, onLogin, defaultTab = 'login', inline = false }) => {
  const [loginForm] = Form.useForm<LoginForm>();
  const [registerForm] = Form.useForm<RegisterForm>();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);

  // 当defaultTab改变时，更新activeTab
  useEffect(() => {
    if (visible || inline) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, visible, inline]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const values = await loginForm.validateFields();
      
      const session = userStorage.login(values.username, values.password);
      if (session) {
        message.success('登录成功！');
        onLogin(session.user);
        onClose?.();
        loginForm.resetFields();
      } else {
        message.error('用户名或密码错误');
      }
    } catch (error) {
      console.error('登录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      const values = await registerForm.validateFields();
      
      // 检查用户名是否已存在
      const existingUser = userStorage.getUserByUsername(values.username);
      if (existingUser) {
        message.error('用户名已存在');
        return;
      }

      // 检查邮箱是否已存在
      const existingEmail = userStorage.getUserByEmail(values.email);
      if (existingEmail) {
        message.error('邮箱已被注册');
        return;
      }

      // 创建用户
      const user = userStorage.createUser({
        username: values.username,
        email: values.email,
      });

      // 存储密码
      userStorage.storeUserPassword(user.id, values.password);

      // 自动登录
      const session = userStorage.login(values.username, values.password);
      if (session) {
        message.success('注册成功并已自动登录！');
        onLogin(session.user);
        onClose?.();
        registerForm.resetFields();
      }
    } catch (error) {
      console.error('注册失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose?.();
    loginForm.resetFields();
    registerForm.resetFields();
    setActiveTab(defaultTab);
  };

  // 内联模式下的内容
  const authContent = (
    <div>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        centered
        size="small"
      >
        <TabPane
          tab={
            <span className="text-sm">
              <LoginOutlined />
              登录
            </span>
          }
          key="login"
        >
          <Form
            form={loginForm}
            layout="vertical"
            onFinish={handleLogin}
            size="middle"
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="请输入用户名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
              style={{ marginBottom: 20 }}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="请输入密码"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="bg-blue-500 hover:bg-blue-600 h-10"
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </TabPane>

        <TabPane
          tab={
            <span className="text-sm">
              <UserAddOutlined />
              注册
            </span>
          }
          key="register"
        >
          <Form
            form={registerForm}
            layout="vertical"
            onFinish={handleRegister}
            size="middle"
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
                { max: 20, message: '用户名最多20个字符' },
                { pattern: /^[a-zA-Z0-9_-]+$/, message: '用户名只能包含字母、数字、下划线和横线' },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="请输入用户名"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<MailOutlined className="text-gray-400" />}
                placeholder="请输入邮箱"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="请输入密码"
              />
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
              style={{ marginBottom: 20 }}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="请再次输入密码"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="bg-green-500 hover:bg-green-600 h-10"
              >
                注册
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
    </div>
  );

  // 如果是内联模式，直接返回内容
  if (inline) {
    return authContent;
  }

  // 否则返回模态框模式
  return (
    <Modal
      title={
        <div className="flex items-center space-x-2">
          <UserOutlined className="text-blue-500" />
          <span>用户认证</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={420}
      centered
      bodyStyle={{ 
        maxHeight: '80vh', 
        overflowY: 'auto',
        padding: '16px 24px 24px 24px'
      }}
      style={{ top: 20 }}
    >
      <Alert
        message="数据隔离保护"
        description="注册后您的配置将会独立保存，不同用户之间的数据相互隔离。"
        type="info"
        showIcon
        className="mb-4"
        style={{ fontSize: '12px' }}
      />
      {authContent}
    </Modal>
  );
};

export default UserAuth; 