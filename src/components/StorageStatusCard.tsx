import React, { useState, useEffect } from 'react';
import { Card, Badge, Typography, Space, Button, Tooltip, Progress, Tag, message, Modal } from 'antd';
import {
  DatabaseOutlined,
  DesktopOutlined,
  GlobalOutlined,
  RocketOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { storageAdapter } from '../utils/storage-adapter';

const { Text, Title } = Typography;

interface StorageInfo {
  environment: 'electron' | 'browser';
  primaryStorage: string;
  sqliteEnabled: boolean;
  indexedDBEnabled: boolean;
  performance: 'fast' | 'medium' | 'slow';
  features: string[];
}

const StorageStatusCard: React.FC = () => {
  const { t } = useTranslation();
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [enhancing, setEnhancing] = useState(false);

  // 获取存储状态信息
  const fetchStorageInfo = () => {
    try {
      const info = storageAdapter.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('获取存储信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageInfo();
    
    // 定期更新状态
    const interval = setInterval(fetchStorageInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  // 获取性能状态颜色和图标
  const getPerformanceDisplay = (performance: string) => {
    switch (performance) {
      case 'fast':
        return {
          color: 'success',
          icon: <ThunderboltOutlined />,
          text: '高性能',
          description: '优化的存储性能'
        };
      case 'medium':
        return {
          color: 'warning',
          icon: <ClockCircleOutlined />,
          text: '标准',
          description: '平衡的存储性能'
        };
      case 'slow':
        return {
          color: 'error',
          icon: <CloseCircleOutlined />,
          text: '受限',
          description: '浏览器环境限制'
        };
      default:
        return {
          color: 'default',
          icon: <InfoCircleOutlined />,
          text: '未知',
          description: '状态未知'
        };
    }
  };

  // 获取环境显示信息
  const getEnvironmentDisplay = (environment: string) => {
    if (environment === 'electron') {
      return {
        icon: <DesktopOutlined className="text-blue-500" />,
        text: '桌面应用',
        description: 'Electron 原生环境',
        color: 'blue',
        advantages: ['原生SQLite性能', '无限存储空间', '文件系统访问', '高级查询功能']
      };
    } else {
      return {
        icon: <GlobalOutlined className="text-orange-500" />,
        text: '浏览器',
        description: '网页环境',
        color: 'orange',
        advantages: ['快速启动', '跨平台兼容', '无需安装', '实时同步']
      };
    }
  };

  // 启用高级功能
  const handleEnableAdvanced = async () => {
    if (storageInfo?.environment === 'electron') {
      message.info('桌面版已默认启用所有高级功能');
      return;
    }

    setEnhancing(true);
    try {
      const success = await storageAdapter.enableAdvancedFeatures();
      if (success) {
        message.success('高级功能启用成功！');
        fetchStorageInfo();
      } else {
        message.error('高级功能启用失败');
      }
    } catch (error) {
      console.error('启用高级功能失败:', error);
      message.error('启用高级功能时发生错误');
    } finally {
      setEnhancing(false);
    }
  };

  // 禁用高级功能
  const handleDisableAdvanced = async () => {
    if (storageInfo?.environment === 'electron') {
      message.info('桌面版不支持禁用高级功能');
      return;
    }

    Modal.confirm({
      title: '确认禁用高级功能',
      content: '禁用后将失去SQL查询和数据分析功能，确定继续吗？',
      onOk: async () => {
        setEnhancing(true);
        try {
          await storageAdapter.disableAdvancedFeatures();
          message.success('已切换到基础模式');
          fetchStorageInfo();
        } catch (error) {
          console.error('禁用高级功能失败:', error);
          message.error('操作失败');
        } finally {
          setEnhancing(false);
        }
      }
    });
  };

  if (loading || !storageInfo) {
    return (
      <Card title="存储状态" loading={true} className="mb-4">
        <div className="h-32"></div>
      </Card>
    );
  }

  const performanceDisplay = getPerformanceDisplay(storageInfo.performance);
  const environmentDisplay = getEnvironmentDisplay(storageInfo.environment);

  return (
    <Card 
      title={
        <Space>
          <DatabaseOutlined />
          <span>存储系统状态</span>
          <Badge 
            status={storageInfo.performance === 'fast' ? 'success' : 'warning'} 
            text={performanceDisplay.text}
          />
        </Space>
      }
      extra={
        <Tooltip title="刷新状态">
          <Button 
            type="text" 
            icon={<InfoCircleOutlined />} 
            size="small"
            onClick={fetchStorageInfo}
          />
        </Tooltip>
      }
      className="mb-4"
    >
      <div className="space-y-4">
        {/* 环境信息 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            {environmentDisplay.icon}
            <div>
              <Text strong>{environmentDisplay.text}</Text>
              <br />
              <Text type="secondary" className="text-sm">
                {environmentDisplay.description}
              </Text>
            </div>
          </div>
          <Tag color={environmentDisplay.color} className="ml-2">
            {storageInfo.environment === 'electron' ? '桌面端' : '网页端'}
          </Tag>
        </div>

        {/* 存储配置 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Text type="secondary" className="text-sm">主要存储</Text>
            <div className="flex items-center space-x-2 mt-1">
              <Badge 
                status="success" 
                dot={storageInfo.primaryStorage === 'sqlite'} 
              />
              <Text className="capitalize">{storageInfo.primaryStorage}</Text>
            </div>
          </div>
          
          <div>
            <Text type="secondary" className="text-sm">性能等级</Text>
            <div className="flex items-center space-x-2 mt-1">
              {performanceDisplay.icon}
              <Text>{performanceDisplay.text}</Text>
            </div>
          </div>
        </div>

        {/* 功能特性 */}
        {storageInfo.features && storageInfo.features.length > 0 && (
          <div>
            <Text type="secondary" className="text-sm mb-2 block">可用功能</Text>
            <div className="flex flex-wrap gap-1">
              {storageInfo.features.map((feature, index) => (
                <Tag key={index} color="blue" className="text-xs">
                  {feature}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* 高级功能控制 - 仅浏览器环境显示 */}
        {storageInfo.environment === 'browser' && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <Text strong className="text-sm">高级功能</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  启用SQL查询和高级数据分析
                </Text>
              </div>
              <div>
                {storageInfo.sqliteEnabled ? (
                  <Button
                    size="small"
                    type="default"
                    loading={enhancing}
                    onClick={handleDisableAdvanced}
                    className="text-xs"
                  >
                    切换到基础模式
                  </Button>
                ) : (
                  <Button
                    size="small"
                    type="primary"
                    icon={<RocketOutlined />}
                    loading={enhancing}
                    onClick={handleEnableAdvanced}
                    className="text-xs"
                  >
                    启用高级功能
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 桌面端优势提示 */}
        {storageInfo.environment === 'electron' && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <CheckCircleOutlined className="text-blue-500 mt-1" />
              <div>
                <Text className="text-blue-900 font-medium text-sm">
                  桌面端优化
                </Text>
                <div className="mt-1">
                  <Text className="text-blue-700 text-xs">
                    原生SQLite性能 • 无限存储空间 • 高级查询功能 • 文件系统访问
                  </Text>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StorageStatusCard; 