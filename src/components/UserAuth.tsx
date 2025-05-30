import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Tabs,
  message,
  Modal,
  Alert,
  Typography
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  LoginOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { storageAdapter } from '../utils/storage-adapter';

const { TabPane } = Tabs;
const { Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface UserAuthProps {
  visible?: boolean;
  onClose?: () => void;
  onLogin: (user: User) => void;
  defaultTab?: 'login' | 'register';
  inline?: boolean;
}

const UserAuth: React.FC<UserAuthProps> = ({ visible = true, onClose, onLogin, defaultTab = 'login', inline = false }) => {
  const { t } = useTranslation();
  const [loginForm] = Form.useForm<LoginForm>();
  const [registerForm] = Form.useForm<RegisterForm>();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
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
      
      console.log('[UserAuth] 尝试登录:', values.username);
      const session = storageAdapter.login(values.username, values.password);
      if (session) {
        console.log('[UserAuth] 登录成功:', session.user.username);
        message.success(t('auth.loginSuccess'));
        onLogin(session.user);
        onClose?.();
        loginForm.resetFields();
      } else {
        console.log('[UserAuth] 登录失败: 用户名或密码错误');
        message.error(t('auth.loginFailed'));
      }
    } catch (error) {
      console.error('[UserAuth] 登录失败:', error);
      message.error(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      const values = await registerForm.validateFields();
      
      console.log('[UserAuth] 尝试注册:', values.username);
      
      // 检查用户名是否已存在
      const existingUser = await storageAdapter.getUserByUsername(values.username);
      if (existingUser) {
        message.error(t('auth.usernameExists'));
        return;
      }

      // 创建用户
      const user = await storageAdapter.createUser({
        username: values.username,
        email: values.email,
        role: 'user', // 默认角色为普通用户
      });

      // 存储密码
      await storageAdapter.storeUserPassword(user.id, values.password);

      console.log('[UserAuth] 注册成功，尝试自动登录');
      // 自动登录
      const session = storageAdapter.login(values.username, values.password);
      if (session) {
        console.log('[UserAuth] 注册并登录成功:', session.user.username);
        message.success(t('auth.registerSuccess'));
        onLogin(session.user);
        onClose?.();
        registerForm.resetFields();
      } else {
        console.log('[UserAuth] 注册成功但自动登录失败');
        message.success(t('auth.registerSuccessAutoLogin'));
        setActiveTab('login');
      }
    } catch (error) {
      console.error('[UserAuth] 注册失败:', error);
      message.error(t('auth.registerFailed'));
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

  // 处理Tabs的onChange，确保类型安全
  const handleTabChange = (key: string) => {
    if (key === 'login' || key === 'register') {
      setActiveTab(key);
    }
  };

  // 内联模式下的内容
  const authContent = (
    <div>
      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange} 
        centered
        size="small"
      >
        <TabPane
          tab={
            <span className="text-sm">
              <LoginOutlined />
              {t('auth.login')}
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
              label={t('auth.username')}
              rules={[{ required: true, message: t('auth.usernameRequired') }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder={t('auth.usernamePlaceholder')}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('auth.password')}
              rules={[{ required: true, message: t('auth.passwordRequired') }]}
              style={{ marginBottom: 20 }}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder={t('auth.passwordPlaceholder')}
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
                {t('auth.loginNow')}
              </Button>
            </Form.Item>
          </Form>
        </TabPane>

        <TabPane
          tab={
            <span className="text-sm">
              <UserAddOutlined />
              {t('auth.register')}
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
              label={t('auth.username')}
              rules={[
                { required: true, message: t('auth.usernameRequired') },
                { min: 3, message: t('auth.usernameMinLength') },
                { max: 20, message: t('auth.usernameMaxLength') },
                { pattern: /^[a-zA-Z0-9_-]+$/, message: t('auth.usernamePattern') },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder={t('auth.usernamePlaceholder')}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={t('auth.email')}
              rules={[
                { required: true, message: t('auth.emailRequired') },
                { type: 'email', message: t('auth.emailValid') },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<MailOutlined className="text-gray-400" />}
                placeholder={t('auth.emailPlaceholder')}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('auth.password')}
              rules={[
                { required: true, message: t('auth.passwordRequired') },
                { min: 6, message: t('auth.passwordMinLength') },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder={t('auth.passwordPlaceholder')}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={t('auth.confirmPassword')}
              dependencies={['password']}
              rules={[
                { required: true, message: t('auth.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('auth.passwordMismatch')));
                  },
                }),
              ]}
              style={{ marginBottom: 20 }}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder={t('auth.confirmPasswordPlaceholder')}
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
                {t('auth.registerNow')}
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
          <span>{t('auth.userAuthentication')}</span>
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
        message={t('auth.dataProtection')}
        description={t('auth.dataProtectionRegisterDesc')}
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