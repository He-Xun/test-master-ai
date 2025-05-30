import React, { useState } from 'react';
import {
  Dropdown,
  Avatar,
  Menu,
  Modal,
  Card,
  Descriptions,
  Button,
  Space,
  message,
  Upload,
  Typography,
  Tag,
  Divider,
  Tooltip
} from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  CameraOutlined,
  EditOutlined,
  InfoCircleOutlined,
  MailOutlined,
  CalendarOutlined,
  KeyOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { storageAdapter } from '../utils/storage-adapter';

const { Text } = Typography;

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  onEdit?: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, onEdit }) => {
  const { t } = useTranslation();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar);
  const [loading, setLoading] = useState(false);

  // 默认头像URL（本地图片）
  const defaultAvatarUrl = '/avatar/default.svg';
  
  // 获取实际显示的头像URL
  const getDisplayAvatarUrl = () => {
    return avatarUrl || user.avatar || defaultAvatarUrl;
  };

  const handleLogout = () => {
    Modal.confirm({
      title: t('auth.confirmLogout'),
      icon: <ExclamationCircleOutlined />,
      content: t('auth.confirmLogoutMessage'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setLoading(true);
          storageAdapter.logout();
          onLogout();
          message.success(t('auth.logoutSuccess'));
        } catch (error) {
          console.error('退出登录失败:', error);
          message.error(t('auth.logoutFailed'));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleAvatarChange = async (info: any) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done' || info.file.status === 'success') {
      try {
        // 读取文件为base64
        const reader = new FileReader();
        reader.addEventListener('load', async () => {
          const base64Url = reader.result as string;
          
          // 更新用户头像到数据库
          const success = await storageAdapter.updateUserInfo(
            user.id,
            { avatar: base64Url },
            user.id // 用户可以更新自己的头像
          );
          
          if (success) {
            setAvatarUrl(base64Url);
            message.success(t('profile.avatarUploadSuccess'));
            
            // 触发用户信息更新
            const updatedUser = await storageAdapter.getUserById(user.id);
            if (updatedUser) {
              // 更新当前会话中的用户信息
              const currentSession = storageAdapter.getCurrentSession();
              if (currentSession) {
                storageAdapter.setSession({
                  ...currentSession,
                  user: updatedUser
                });
              }
            }
          } else {
            message.error(t('profile.avatarUploadFailed'));
          }
          
          setLoading(false);
        });
        reader.readAsDataURL(info.file.originFileObj);
      } catch (error) {
        console.error('头像上传失败:', error);
        message.error(t('profile.avatarUploadFailed'));
        setLoading(false);
      }
    } else if (info.file.status === 'error') {
      message.error(t('profile.avatarUploadFailed'));
      setLoading(false);
    }
  };

  const beforeUpload = (file: File) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error(t('profile.avatarFormatError'));
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error(t('profile.avatarSizeError'));
      return false;
    }
    return true;
  };

  const menu = (
    <Menu>
      <Menu.Item 
        key="profile" 
        icon={<UserOutlined />}
        onClick={() => setProfileModalVisible(true)}
      >
        {t('profile.myProfile')}
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        {t('profile.accountSettings')}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="logout" 
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        className="text-red-600"
      >
        {t('auth.logout')}
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} placement="bottomRight" arrow>
        <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
          <Avatar 
            src={getDisplayAvatarUrl()} 
            icon={<UserOutlined />} 
            size="large"
            className="border-2 border-blue-200"
          />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">{user.username}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
        </div>
      </Dropdown>

      <Modal
        title={
          <div className="flex items-center space-x-2">
            <UserOutlined className="text-blue-500" />
            <span>{t('profile.myProfile')}</span>
          </div>
        }
        open={profileModalVisible}
        onCancel={() => setProfileModalVisible(false)}
        footer={null}
        width={500}
      >
        <Card className="border-0 shadow-none">
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <Avatar 
                src={getDisplayAvatarUrl()} 
                icon={<UserOutlined />} 
                size={80}
                className="border-4 border-gray-200"
              />
              <Upload
                name="avatar"
                listType="picture"
                className="avatar-uploader"
                showUploadList={false}
                beforeUpload={beforeUpload}
                onChange={handleAvatarChange}
                accept="image/*"
              >
                <Button
                  type="primary"
                  icon={<CameraOutlined />}
                  size="small"
                  className="absolute -bottom-1 -right-1 rounded-full bg-blue-500 border-white"
                  loading={loading}
                >
                </Button>
              </Upload>
            </div>
            <div className="mt-3">
              <Text strong className="text-lg">{user.username}</Text>
              <div className="text-gray-500 text-sm">{user.email}</div>
            </div>
          </div>

          <Descriptions
            title={t('profile.accountInfo')}
            column={1}
            bordered
            size="small"
            className="mb-6"
          >
            <Descriptions.Item label={t('profile.userId')}>
              <Text code>{user.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('profile.username')}>
              <Space>
                {user.username}
                <Button type="link" size="small" icon={<EditOutlined />}>
                  {t('common.edit')}
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={t('profile.email')}>
              <Space>
                {user.email}
                <Button type="link" size="small" icon={<EditOutlined />}>
                  {t('common.edit')}
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={t('profile.registrationTime')}>
              {new Date(user.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label={t('profile.lastUpdated')}>
              {new Date(user.updatedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <InfoCircleOutlined className="text-blue-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 mb-1">{t('profile.dataIsolationTitle')}</div>
                <div className="text-xs text-blue-700">
                  {t('profile.dataIsolationDesc')}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6 space-x-3">
            <Button onClick={() => setProfileModalVisible(false)}>
              {t('common.close')}
            </Button>
            <Button type="primary" icon={<SettingOutlined />}>
              {t('profile.accountSettings')}
            </Button>
          </div>
        </Card>
      </Modal>
    </>
  );
};

export default UserProfile; 