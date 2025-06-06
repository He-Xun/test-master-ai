import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
const MultiModelCompare = React.lazy(() => import('./components/MultiModelCompare'));
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
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import { User } from './types';
import { storageAdapter } from './utils/storage-adapter';
import { useConfigDraft } from './hooks/useConfigDraft';
import { APP_VERSION, APP_NAME, UPDATE_CHECK_URL } from './constants/version';
import { AdminDebugger } from './utils/debug-admin';
import './App.css';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import enUS from 'antd/es/locale/en_US';
import MainLogo from '@/assets/main-logo.svg?react';

// 使用React.lazy进行代码分割
const TestingPanel = React.lazy(() => import('./components/TestingPanel'));
const PromptsManagement = React.lazy(() => import('./components/PromptsManagement'));
const ApiConfigManagement = React.lazy(() => import('./components/ApiConfigManagement'));
const DebugPanel = React.lazy(() => import('./components/DebugPanel'));
const UserAuth = React.lazy(() => import('./components/UserAuth'));
const UserProfile = React.lazy(() => import('./components/UserProfile'));
const TestSessionHistory = React.lazy(() => import('./components/TestSessionHistory'));
const TestSessionDetail = React.lazy(() => import('./components/TestSessionDetail'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const AccountSettings = React.lazy(() => import('./components/AccountSettings'));
const HomePage = React.lazy(() => import('./components/HomePage'));

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

// 独立的管理面板布局组件
const AdminLayout: React.FC<{ currentUser: User; onLogout: () => void }> = ({ currentUser, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 检查更新功能
  const handleCheckUpdate = () => {
    window.open('https://github.com/He-Xun/test-master-ai/releases', '_blank');
  };

  return (
    <Layout className="min-h-screen">
      {/* 管理面板顶部导航 */}
      <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm h-16">
        <div className="flex items-center space-x-[15px] h-full">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <SettingOutlined className="text-white text-sm" />
          </div>
          <Title level={4} className="mb-0 leading-none flex items-center h-full" style={{ margin: 0 }}>{t('admin.superAdminPanel')}</Title>
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
            <UserProfile user={currentUser} onLogout={onLogout} />
          </Suspense>
        </div>
      </Header>

      {/* 管理面板内容区域 */}
      <Content className="bg-gray-50">
        <div className="p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <SettingOutlined className="text-white text-xl" />
                </div>
                <Text className="text-gray-600">Loading...</Text>
              </div>
            </div>
          }>
            <AdminPanel currentUser={currentUser} />
          </Suspense>
        </div>
      </Content>
    </Layout>
  );
};

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
  const [isInitialized, setIsInitialized] = useState(false);
  // 新增：全局迁移进度
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationStatus, setMigrationStatus] = useState('');
  const [migrationDone, setMigrationDone] = useState(false);
  
  // 配置暂存相关
  const { hasDraft, restoreDraft, clearDraft } = useConfigDraft();

  // 根据当前路径获取选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/' || path === '/home') return 'home';
    if (path === '/testing') return 'testing';
    if (path === '/multi-model-compare') return 'multi-model-compare';
    if (path === '/prompts') return 'prompts';
    if (path === '/api-config') return 'api-config';
    if (path === '/test-history') return 'test-history';
    if (path.startsWith('/test-session-detail')) return 'test-history';
    if (path === '/debug') return 'debug';
    return 'home';
  };

  // 初始化存储适配器和数据迁移
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        setMigrationStatus('正在初始化存储系统...');
        setMigrationProgress(10);
        // 浏览器环境下强制串行SQLite初始化和迁移
        if (storageAdapter.getStorageInfo().environment === 'browser') {
          setMigrationStatus('正在初始化SQLite...');
          setMigrationProgress(20);
          await storageAdapter.forceEnableSQLiteAndMigrate?.();
          setMigrationStatus('SQLite初始化和数据迁移完成');
          setMigrationProgress(80);
        } else {
          await storageAdapter.initialize();
        }
        setMigrationStatus('正在加载用户数据...');
        setMigrationProgress(90);
        await storageAdapter.getPrompts?.();
        setMigrationProgress(100);
        setMigrationStatus('初始化完成');
        setTimeout(() => setMigrationDone(true), 300);
        setIsInitialized(true);
        setDataLoading(false);
        console.log('[App] ✅ 存储系统初始化和数据迁移完成');
      } catch (error) {
        setMigrationStatus('初始化失败');
        setMigrationProgress(100);
        setMigrationDone(true);
        setIsInitialized(true);
        setDataLoading(false);
        console.error('[App] ❌ 应用初始化失败:', error);
      }
    };
    initializeStorage();
  }, []);

  // 检查用户会话（独立于存储初始化）
  useEffect(() => {
    if (!isInitialized) return;

    const tryAutoLogin = () => {
      try {
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        const userId = localStorage.getItem('rememberUserId');
        const token = localStorage.getItem('rememberToken');
        if (rememberMe && userId && token) {
          // 直接用userId查找用户并恢复session
          storageAdapter.getUserById(userId).then(user => {
            if (user) {
              setCurrentUser(user);
              console.log('[App] 记住我自动登录:', user.username);
            } else {
              setCurrentUser(null);
            }
          });
          return;
        }
      } catch (e) {}
      // 正常session恢复
      const session = storageAdapter.getCurrentSession();
      if (session && storageAdapter.isSessionValid()) {
        setCurrentUser(session.user);
        console.log('[App] 用户已登录:', session.user.username);
      } else {
        setCurrentUser(null);
        console.log('[App] 用户未登录或会话已过期');
      }
    };

    // 立即检查会话
    tryAutoLogin();
    // 定期检查会话状态
    const sessionCheckInterval = setInterval(tryAutoLogin, 60000);
    return () => clearInterval(sessionCheckInterval);
  }, [isInitialized]);

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
    console.log('[App] 用户登录成功:', user.username);
    setCurrentUser(user);
    setAuthModalVisible(false);
    
    // 超级管理员自动跳转到管理面板
    if (storageAdapter.isSuperAdmin(user)) {
      console.log('[App] 超级管理员登录，跳转到管理面板');
      navigate('/admin');
    } else {
      navigate('/home');
    }
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
          storageAdapter.logout();
          setCurrentUser(null);
          navigate('/testing'); // 重置到首页
          message.info('您已安全登出');
        },
      });
    } else {
      storageAdapter.logout();
      setCurrentUser(null);
      navigate('/testing'); // 重置到首页
      message.info('您已安全登出');
    }
  };

  // 菜单点击处理
  const handleMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'home':
        navigate('/home');
        break;
      case 'testing':
        navigate('/testing');
        break;
      case 'multi-model-compare':
        navigate('/multi-model-compare');
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
      case 'admin':
        navigate('/admin');
        break;
      case 'debug':
        navigate('/debug');
        break;
      default:
        navigate('/testing');
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

  // 检查更新功能
  const handleCheckUpdate = () => {
    window.open('https://github.com/He-Xun/test-master-ai/releases', '_blank');
  };

  // 全局进度条提示
  if (!migrationDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <RocketOutlined className="text-white text-2xl" />
          </div>
          <Text className="text-lg text-gray-600 mb-2 block">{migrationStatus || t('common.loading')}</Text>
          <div style={{ width: 320, margin: '0 auto' }}>
            <div className="w-full mt-2">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${migrationProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-right">{migrationProgress}%</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 如果用户未登录，显示登录界面
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative">
        {/* 语言切换器 - 右上角 */}
        <div className="absolute top-4 right-4 z-10">
          <LanguageSwitcher style="select" size="large" />
        </div>
        
        <div className="max-w-md w-full mx-4">
          <Card className="shadow-lg border-0">
            <div className="text-center mb-6">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <MainLogo style={{ width: 48, height: 48, display: 'block' }} />
              </div>
              <Title level={2} className="mb-2 text-blue-600">
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

  // 如果是管理面板页面，使用独立布局
  if (location.pathname === '/admin') {
    if (!storageAdapter.isSuperAdmin(currentUser)) {
      // 非超级管理员访问管理面板，重定向到主页
      navigate('/testing');
      message.error('您没有权限访问管理面板');
      return null;
    }
    return <AdminLayout currentUser={currentUser} onLogout={handleLogout} />;
  }

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: (
        <Tooltip title={t('menu.home') || '首页'} placement="right" getPopupContainer={() => document.body}>
          <span className="truncate block max-w-[180px]">{t('menu.home') || '首页'}</span>
        </Tooltip>
      ),
    },
    // {
    //   key: 'multi-model-compare',
    //   icon: <ApiOutlined />,
    //   label: (
    //     <Tooltip title={t('menu.multiModelCompare') || '多模型对比'} placement="right" getPopupContainer={() => document.body}>
    //       <span className="truncate block max-w-[180px]">{t('menu.multiModelCompare') || '多模型对比'}</span>
    //     </Tooltip>
    //   ),
    // },
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

  // 为超级管理员添加管理面板入口菜单项
  if (storageAdapter.isSuperAdmin(currentUser)) {
    menuItems.splice(-1, 0, {
      key: 'admin',
      icon: <SettingOutlined />,
      label: (
        <Tooltip title={t('admin.managePanel')} placement="right" getPopupContainer={() => document.body}>
          <span className="truncate block max-w-[180px]">{t('admin.managePanel')}</span>
        </Tooltip>
      ),
    });
  }

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
            <div className="logo-icon" style={{ background: 'none' }}>
              <MainLogo style={{ width: 40, height: 40, display: 'block' }} />
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
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/testing" element={<TestingPanel />} />
                <Route path="/multi-model-compare" element={<React.Suspense fallback={<div>Loading...</div>}><MultiModelCompare /></React.Suspense>} />
                <Route path="/prompts" element={<PromptsManagement />} />
                <Route path="/api-config" element={<ApiConfigManagement />} />
                <Route path="/test-history" element={<TestSessionHistory asPage={true} />} />
                <Route path="/test-session-detail/:sessionId" element={<TestSessionDetail />} />
                <Route path="/debug" element={<DebugPanel />} />
                <Route path="/account-settings" element={<AccountSettings />} />
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
  const { i18n } = useTranslation();
  const antdLocale = i18n.language === 'zh-CN' ? zhCN : enUS;
  return (
    <ConfigProvider locale={antdLocale}>
      <Router>
        <AppLayout />
      </Router>
    </ConfigProvider>
  );
};

export default App;