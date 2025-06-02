import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Typography, Space, Collapse, Tag, Alert } from 'antd';
import { ReloadOutlined, BugOutlined, InfoCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { promptStorage, apiConfigStorage, defaultTestInputStorage } from '../utils/storage-simple';
import { storageAdapter } from '../utils/storage-adapter';
import StorageStatusCard from './StorageStatusCard';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

const DebugPanel: React.FC = () => {
  const { t } = useTranslation();
  const [debugData, setDebugData] = useState<any>({});

  const loadDebugData = async () => {
    const prompts = await storageAdapter.getPrompts();
    const apiConfigs = await storageAdapter.getApiConfigs();
    const models = await storageAdapter.getAllModels();
    const defaultInputs = storageAdapter.getDefaultTestInputs();

    setDebugData({
      prompts,
      apiConfigs,
      models,
      defaultInputs,
      timestamp: new Date().toLocaleString(),
    });
  };

  useEffect(() => {
    loadDebugData();
  }, []);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <BugOutlined className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('debug.title')}</h1>
              <p className="text-gray-500 mt-1">{t('debug.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">{t('debug.lastUpdate')}</div>
              <div className="text-sm font-medium text-gray-700">{debugData.timestamp}</div>
            </div>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadDebugData}
              size="large"
              className="bg-gradient-to-r from-red-500 to-orange-500 border-none text-white shadow-lg hover:shadow-xl"
            >
              {t('debug.refreshData')}
            </Button>
          </div>
        </div>
      </div>

      {/* 存储系统状态 */}
      <StorageStatusCard />

      {/* 数据统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{debugData.prompts?.length || 0}</div>
          <div className="text-sm text-gray-600">{t('debug.prompts')}</div>
        </Card>
        <Card className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{debugData.apiConfigs?.length || 0}</div>
          <div className="text-sm text-gray-600">{t('debug.apiConfigurations')}</div>
        </Card>
        <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="text-2xl font-bold text-green-600">{debugData.models?.length || 0}</div>
          <div className="text-sm text-gray-600">{t('debug.availableModels')}</div>
        </Card>
        <Card className="text-center bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{debugData.defaultInputs?.length || 0}</div>
          <div className="text-sm text-gray-600">{t('debug.defaultInputs')}</div>
        </Card>
      </div>

      {/* 调试信息 */}
      <Card className="shadow-sm border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <DatabaseOutlined className="text-blue-500" />
          <span className="text-lg font-semibold">{t('debug.detailedData')}</span>
        </div>
        
        <Alert
          message={t('debug.developerTools')}
          description={t('debug.toolDescription')}
          type="info"
          icon={<InfoCircleOutlined />}
          className="mb-4"
        />
        
        <Collapse className="bg-gray-50 border-0">
          <Panel 
            header={
              <div className="flex items-center justify-between">
                <span>{t('debug.promptData')}</span>
                <Tag color="purple">{t('common.countItems', { count: debugData.prompts?.length || 0 })}</Tag>
              </div>
            } 
            key="prompts"
            className="bg-white mb-2 rounded-lg border border-gray-200"
          >
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(debugData.prompts, null, 2)}
            </pre>
          </Panel>
          
          <Panel 
            header={
              <div className="flex items-center justify-between">
                <span>{t('debug.apiConfigData')}</span>
                <Tag color="blue">{t('common.countItems', { count: debugData.apiConfigs?.length || 0 })}</Tag>
              </div>
            } 
            key="apiConfigs"
            className="bg-white mb-2 rounded-lg border border-gray-200"
          >
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(debugData.apiConfigs, null, 2)}
            </pre>
          </Panel>
          
          <Panel 
            header={
              <div className="flex items-center justify-between">
                <span>{t('debug.modelData')}</span>
                <Tag color="green">{t('common.countItems', { count: debugData.models?.length || 0 })}</Tag>
              </div>
            } 
            key="models"
            className="bg-white mb-2 rounded-lg border border-gray-200"
          >
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(debugData.models, null, 2)}
            </pre>
          </Panel>
          
          <Panel 
            header={
              <div className="flex items-center justify-between">
                <span>{t('debug.defaultInputData')}</span>
                <Tag color="orange">{t('common.countItems', { count: debugData.defaultInputs?.length || 0 })}</Tag>
              </div>
            } 
            key="defaultInputs"
            className="bg-white mb-2 rounded-lg border border-gray-200"
          >
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(debugData.defaultInputs, null, 2)}
            </pre>
          </Panel>
          
          <Panel 
            header={
              <div className="flex items-center justify-between">
                <span>{t('debug.localStorageData')}</span>
                <Tag color="default">
                  {(() => {
                    try {
                      const storageSize = JSON.stringify(localStorage).length;
                      const itemCount = localStorage.length;
                      return t('debug.localStorageStat', { count: itemCount, size: (storageSize/1024).toFixed(1) });
                    } catch {
                      return t('debug.unknownSize');
                    }
                  })()}
                </Tag>
              </div>
            } 
            key="localStorage"
            className="bg-white rounded-lg border border-gray-200"
          >
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify({
                prompts: localStorage.getItem('prompts'),
                apiConfigs: localStorage.getItem('apiConfigs'),
                models: localStorage.getItem('models'),
                defaultTestInputs: localStorage.getItem('defaultTestInputs'),
              }, null, 2)}
            </pre>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
};

export default DebugPanel; 