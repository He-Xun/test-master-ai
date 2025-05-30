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
} from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  CameraOutlined,
  EditOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { User } from '../types';
import { userStorage } from '../utils/storage-simple';

const { Text } = Typography;

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar);

  // 默认头像URL（卡通风格的可爱头像）
  const defaultAvatarUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=happy&backgroundColor=b6e3f4&eyes=happy&mouth=smile&top=shortHair&topChance=100&accessories=glasses&accessoriesChance=30';
  
  // 获取实际显示的头像URL
  const getDisplayAvatarUrl = () => {
    return avatarUrl || user.avatar || defaultAvatarUrl;
  };

  const handleLogout = () => {
    Modal.confirm({
      title: '确认登出',
      content: '确定要登出当前账户吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        userStorage.logout();
        onLogout();
        message.success('已成功登出');
      },
    });
  };

  const handleAvatarChange = (info: any) => {
    if (info.file.status === 'uploading') {
      return;
    }
    if (info.file.status === 'done') {
      // 这里应该上传到服务器，现在只是演示
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setAvatarUrl(reader.result as string);
        message.success('头像上传成功');
      });
      reader.readAsDataURL(info.file.originFileObj);
    }
  };

  const beforeUpload = (file: File) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('只能上传 JPG/PNG 文件!');
      return false;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片必须小于 2MB!');
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
        个人资料
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        账户设置
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="logout" 
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        className="text-red-600"
      >
        登出
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
            <span>个人资料</span>
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
            title="账户信息"
            column={1}
            bordered
            size="small"
            className="mb-6"
          >
            <Descriptions.Item label="用户ID">
              <Text code>{user.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="用户名">
              <Space>
                {user.username}
                <Button type="link" size="small" icon={<EditOutlined />}>
                  修改
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              <Space>
                {user.email}
                <Button type="link" size="small" icon={<EditOutlined />}>
                  修改
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {new Date(user.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="最后更新">
              {new Date(user.updatedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <InfoCircleOutlined className="text-blue-500 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 mb-1">数据隔离说明</div>
                <div className="text-xs text-blue-700">
                  您的所有配置数据（提示词、API配置、测试记录等）都与您的账户绑定，
                  与其他用户完全隔离，确保数据安全和隐私。
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6 space-x-3">
            <Button onClick={() => setProfileModalVisible(false)}>
              关闭
            </Button>
            <Button type="primary" icon={<SettingOutlined />}>
              账户设置
            </Button>
          </div>
        </Card>
      </Modal>
    </>
  );
};

export default UserProfile; 