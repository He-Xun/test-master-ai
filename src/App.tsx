import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Layout from 'antd/es/layout';
import Menu from 'antd/es/menu';
import Breadcrumb from 'antd/es/breadcrumb';
import Badge from 'antd/es/badge';
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import message from 'antd/es/message';
import Card from 'antd/es/card';
import Typography from 'antd/es/typography';
import Modal from 'antd/es/modal';
import Tooltip from 'antd/es/tooltip';
import {
  ExperimentOutlined,
  MessageOutlined,
  ApiOutlined,
  BugOutlined,
  HomeOutlined,
  UserOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  LoginOutlined,
  LockOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CloudDownloadOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import { User } from './types';
import { userStorage } from './utils/storage-adapter';
import { storageAdapter } from './utils/storage-adapter';
import { useConfigDraft } from './hooks/useConfigDraft';
import { APP_VERSION, APP_NAME, UPDATE_CHECK_URL } from './constants/version';
import './App.css';

// 使用React.lazy进行代码分割
const TestingPanel = React.lazy(() => import('./components/TestingPanel'));
const PromptsManagement = React.lazy(() => import('./components/PromptsManagement'));
const ApiConfigManagement = React.lazy(() => import('./components/ApiConfigManagement'));
const DebugPanel = React.lazy(() => import('./components/DebugPanel'));
const UserAuth = React.lazy(() => import('./components/UserAuth'));
const UserProfile = React.lazy(() => import('./components/UserProfile'));
const TestSessionHistory = React.lazy(() => import('./components/TestSessionHistory'));
const TestSessionDetail = React.lazy(() => import('./components/TestSessionDetail'));

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

// 主应用布局组件
const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'register'>('login');
  const [dataLoading, setDataLoading] = useState(true);
  
  // 配置暂存相关
  const { hasDraft, restoreDraft, clearDraft } = useConfigDraft();

  // 根据当前路径获取选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/' || path === '/testing') return 'testing';
    if (path === '/prompts') return 'prompts';
    if (path === '/api-config') return 'api-config';
    if (path === '/test-history') return 'test-history';
    if (path.startsWith('/test-session-detail')) return 'test-history';
    if (path === '/debug') return 'debug';
    return 'testing';
  };

  // 初始化存储适配器
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        await storageAdapter.initialize();
        console.log('[App] 存储系统初始化完成');
      } catch (error) {
        console.error('[App] 存储系统初始化失败:', error);
      }
    };

    initializeStorage();
  }, []);

  // 检查用户登录状态
  useEffect(() => {
    const checkUserSession = () => {
      if (userStorage.isSessionValid()) {
        const session = userStorage.getCurrentSession();
        if (session) {
          setCurrentUser(session.user);
          console.log('[App] 用户已登录:', session.user.username);
        }
      } else {
        // 会话已过期，清除会话
        userStorage.logout();
        setCurrentUser(null);
        console.log('[App] 用户会话已过期');
      }
      setDataLoading(false);
    };

    checkUserSession();
    
    // 定期检查会话状态
    const interval = setInterval(checkUserSession, 60000); // 每分钟检查一次
    
    return () => clearInterval(interval);
  }, []);

  // 检查配置暂存并提示恢复
  useEffect(() => {
    if (currentUser && hasDraft) {
      Modal.confirm({
        title: '发现未保存的配置',
        content: '检测到您有未完成的测试配置，是否要恢复？',
        icon: <ExclamationCircleOutlined />,
        okText: '恢复配置',
        cancelText: '忽略',
        onOk: async () => {
          const draft = await restoreDraft();
          if (draft) {
            // 这里可以触发配置恢复的回调
            console.log('[App] 配置已恢复:', draft);
          }
        },
        onCancel: () => {
          clearDraft();
        },
      });
    }
  }, [currentUser, hasDraft, restoreDraft, clearDraft]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAuthModalVisible(false);
    message.success(t('auth.loginSuccess'));
  };

  const handleLogout = () => {
    // 检查是否有未保存的配置
    if (hasDraft) {
      Modal.confirm({
        title: '确认退出',
        content: '您有未保存的测试配置，退出后将丢失。确定要退出吗？',
        icon: <ExclamationCircleOutlined />,
        okText: '确定退出',
        cancelText: '取消',
        onOk: () => {
          clearDraft();
          setCurrentUser(null);
          navigate('/testing'); // 重置到首页
          message.info('您已安全登出');
        },
      });
    } else {
      setCurrentUser(null);
      navigate('/testing'); // 重置到首页
      message.info('您已安全登出');
    }
  };

  // 菜单点击处理
  const handleMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'testing':
        navigate('/testing');
        break;
      case 'prompts':
        navigate('/prompts');
        break;
      case 'api-config':
        navigate('/api-config');
        break;
      case 'test-history':
        navigate('/test-history');
        break;
      case 'debug':
        navigate('/debug');
        break;
      default:
        navigate('/testing');
    }
  };

  // 检查更新功能
  const handleCheckUpdate = async () => {
    try {
      message.loading('正在检查更新...', 1);
      
      // 模拟检查更新（实际应该调用API）
      setTimeout(() => {
        Modal.info({
          title: '版本信息',
          content: (
            <div>
              <p><strong>当前版本</strong>: v{APP_VERSION}</p>
              <p><strong>发布日期</strong>: 2025-05-29</p>
              <p><strong>状态</strong>: 已是最新版本</p>
              <div className="mt-4">
                <p className="text-gray-600 text-sm">
                  如需查看更新历史，请访问发布说明页面。
                </p>
              </div>
            </div>
          ),
          okText: '确定',
          width: 400,
        });
      }, 1000);
      
      // TODO: 实际的更新检查逻辑
      // const response = await fetch(UPDATE_CHECK_URL);
      // const updateInfo = await response.json();
      // 处理更新信息...
      
    } catch (error) {
      console.error('检查更新失败:', error);
      message.error('检查更新失败，请稍后重试');
    }
  };

  // 获取页面标题
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/testing') return t('menu.testing');
    if (path === '/prompts') return t('menu.prompts');
    if (path === '/api-config') return t('menu.api');
    if (path === '/test-history') return t('menu.history');
    if (path.startsWith('/test-session-detail')) return t('history.testDetails');
    if (path === '/debug') return t('menu.debug');
    return t('app.title');
  };

  // 如果正在加载，显示加载界面
  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <RocketOutlined className="text-white text-2xl" />
          </div>
          <Text className="text-lg text-gray-600">{t('common.loading')}</Text>
        </div>
      </div>
    );
  }

  // 如果用户未登录，显示登录界面
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Card className="shadow-lg border-0">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <RocketOutlined className="text-white text-2xl" />
              </div>
              <Title level={2} className="mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {t('app.title')}
              </Title>
              <Text type="secondary" className="text-base">
                {t('app.subtitle')}
              </Text>
            </div>
            
            <Suspense fallback={<div>Loading...</div>}>
              <UserAuth
                onLogin={handleLogin}
                defaultTab={authDefaultTab}
                inline={true}
              />
            </Suspense>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start space-x-3">
                <LockOutlined className="text-green-600 text-lg mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-green-800 mb-1">
                    {t('auth.dataProtection')}
                  </div>
                  <div className="text-xs text-green-700">
                    {t('auth.dataProtectionDesc')}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      key: 'testing',
      icon: <ExperimentOutlined />,
      label: (
        <Tooltip title={t('menu.testing')} placement="right" getPopupContainer={() => document.body}>
          <span className="truncate block max-w-[180px]">{t('menu.testing')}</span>
        </Tooltip>
      ),
    },
    {
      key: 'test-history',
      icon: <HistoryOutlined />,
      label: (
        <Tooltip title={t('menu.history')} placement="right" getPopupContainer={() => document.body}>
          <span className="truncate block max-w-[180px]">{t('menu.history')}</span>
        </Tooltip>
      ),
    },
    {
      key: 'prompts',
      icon: <MessageOutlined />,
      label: (
        <Tooltip title={t('menu.prompts')} placement="right" getPopupContainer={() => document.body}>
          <span className="truncate block max-w-[180px]">{t('menu.prompts')}</span>
        </Tooltip>
      ),
    },
    {
      key: 'api-config',
      icon: <ApiOutlined />,
      label: (
        <Tooltip title={t('menu.api')} placement="right" getPopupContainer={() => document.body}>
          <span className="truncate block max-w-[180px]">{t('menu.api')}</span>
        </Tooltip>
      ),
    },
    {
      key: 'debug',
      icon: <BugOutlined />,
      label: (
        <Tooltip title={t('menu.debug')} placement="right" getPopupContainer={() => document.body}>
          <span className="truncate block max-w-[180px]">{t('menu.debug')}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen">
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={280}
        collapsedWidth={56}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          if (broken) {
            setCollapsed(true);
          }
        }}
        className="bg-white border-r border-gray-200 shadow-sm"
        style={{
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo区域 */}
        <div className="logo-container">
          <div 
            className="logo-content"
            onClick={() => navigate('/testing')}
          >
            <div className="logo-icon">
              <RocketOutlined className="text-white text-lg" />
            </div>
            {!collapsed && (
              <div className="logo-text">
                <div className="logo-title">{t('app.title')}</div>
                <div className="logo-subtitle">{t('app.subtitle')}</div>
              </div>
            )}
          </div>
        </div>

        {/* 菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          className="border-none mt-4 sidebar-menu"
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
          }}
        />

        {/* 底部信息区域 */}
        {!collapsed && (
          <div className="absolute bottom-4 left-4 right-4">
            {/* 用户状态指示器 */}
            <div className="p-3 rounded-lg text-center text-xs bg-green-50 border border-green-200 text-green-700">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="font-medium">{t('footer.status')}</span>
              </div>
              <div>{t('footer.dataIsolated')}</div>
              <div className="text-xs text-gray-500 mt-1">{t('app.version')} {APP_VERSION}</div>
            </div>
          </div>
        )}
      </Sider>

      {/* 主要布局 */}
      <Layout 
        style={{ 
          marginLeft: collapsed ? 56 : 280, 
          transition: 'margin-left 0.2s',
          minHeight: '100vh'
        }}
        className="responsive-layout"
      >
        {/* 顶部导航 */}
        <Header className="bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <Button
              type="text"
              size="small"
              onClick={() => setCollapsed(!collapsed)}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              className="text-gray-600 hover:text-blue-500"
            />
            
            <Breadcrumb
              items={[
                {
                  href: '',
                  title: <HomeOutlined />,
                },
                {
                  title: getPageTitle(),
                },
              ]}
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* 语言切换 */}
            <LanguageSwitcher style="select" size="small" />

            {/* 检查更新 */}
            <Tooltip title={t('notification.checkForUpdates')}>
              <Button
                type="text"
                size="small"
                icon={<CloudDownloadOutlined />}
                onClick={handleCheckUpdate}
                className="text-gray-600 hover:text-blue-500"
              />
            </Tooltip>

            {/* 通知 */}
            <Badge count={0} size="small">
              <Button
                type="text"
                size="small"
                icon={<BellOutlined />}
                className="text-gray-600 hover:text-blue-500"
              />
            </Badge>

            {/* 用户区域 */}
            <Suspense fallback={<div>Loading...</div>}>
              <UserProfile user={currentUser} onLogout={handleLogout} />
            </Suspense>
          </div>
        </Header>

        {/* 内容区域 */}
        <Content className="bg-gray-50 min-h-[calc(100vh-64px)]">
          <div className="p-6 fade-in">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <RocketOutlined className="text-white text-xl" />
                  </div>
                  <Text className="text-gray-600">Loading...</Text>
                </div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<TestingPanel />} />
                <Route path="/testing" element={<TestingPanel />} />
                <Route path="/prompts" element={<PromptsManagement />} />
                <Route path="/api-config" element={<ApiConfigManagement />} />
                <Route path="/test-history" element={<TestSessionHistory asPage={true} />} />
                <Route path="/test-session-detail/:sessionId" element={<TestSessionDetail />} />
                <Route path="/debug" element={<DebugPanel />} />
              </Routes>
            </Suspense>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

// 主App组件
const App: React.FC = () => {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
};

export default App;