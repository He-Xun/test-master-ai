import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Tooltip } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { storageAdapter } from '../utils/storage-adapter';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [todayTestCount, setTodayTestCount] = useState(0);
  const [totalTestCount, setTotalTestCount] = useState(0);
  const [totalRecordCount, setTotalRecordCount] = useState(0);
  const [promptsCount, setPromptsCount] = useState(0);
  const [modelsCount, setModelsCount] = useState(0);

  useEffect(() => {
    (async () => {
      const history = await storageAdapter.getTestSessionHistory(100);
      let today = 0;
      let total = 0;
      let recordCount = history.length;
      const todayStr = new Date().toISOString().slice(0, 10);
      history.forEach(h => {
        total += h.totalTests || 0;
        if (h.startTime && h.startTime.slice(0, 10) === todayStr) {
          today += h.totalTests || 0;
        }
      });
      setTodayTestCount(today);
      setTotalTestCount(total);
      setTotalRecordCount(recordCount);
      const prompts = await storageAdapter.getPrompts();
      setPromptsCount(prompts.length);
      const models = await storageAdapter.getAllModels();
      setModelsCount(models.length);
    })();
  }, []);

  return (
    <>
      <div className="space-y-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-green-50">
          <div className="flex flex-col gap-2 py-6">
            <div className="flex items-center gap-2 mb-4">
              <AppstoreOutlined className="text-2xl text-blue-500 bg-white/80 rounded-full p-2 shadow" />
              <span className="text-lg font-bold text-blue-700">{t('testing.statistics') || '测试统计'}</span>
            </div>
            <div className="flex flex-row gap-4 justify-between items-stretch">
              <div className="flex-1 bg-white rounded-xl shadow p-4 flex flex-col items-center border-t-4 border-blue-400">
                <div className="text-2xl font-bold text-blue-600">{todayTestCount}</div>
                <div className="text-xs text-gray-500 mt-1 text-center">{t('testing.todayTestCount') || '今日测试次数'}</div>
              </div>
              <div className="flex-1 bg-white rounded-xl shadow p-4 flex flex-col items-center border-t-4 border-green-400">
                <div className="text-2xl font-bold text-green-600">{totalTestCount}</div>
                <div className="text-xs text-gray-500 mt-1 text-center">{t('testing.totalTestCount') || '累计测试次数'}</div>
              </div>
              <div className="flex-1 bg-white rounded-xl shadow p-4 flex flex-col items-center border-t-4 border-purple-400">
                <div className="text-2xl font-bold text-purple-600">{totalRecordCount}</div>
                <div className="text-xs text-gray-500 mt-1 text-center">{t('testing.testRecords') || '测试记录数'}</div>
              </div>
              <div className="flex-1 bg-white rounded-xl shadow p-4 flex flex-col items-center border-t-4 border-cyan-400">
                <div className="text-2xl font-bold text-cyan-600">{promptsCount}</div>
                <div className="text-xs text-gray-500 mt-1 text-center">{t('testing.prompts') || '提示词'}</div>
              </div>
              <div className="flex-1 bg-white rounded-xl shadow p-4 flex flex-col items-center border-t-4 border-indigo-400">
                <div className="text-2xl font-bold text-indigo-600">{modelsCount}</div>
                <div className="text-xs text-gray-500 mt-1 text-center">{t('testing.models') || '模型'}</div>
              </div>
            </div>
          </div>
        </Card>
        <Card className="mt-6" title={t('home.guideTitle') || '如何使用本应用？'}>
          <div className="space-y-3 text-base text-gray-700">
            <div>{t('home.guideStep1') || '1. 在左侧菜单栏选择"接口测试"进入测试页面。'}</div>
            <div>{t('home.guideStep2') || '2. 在"提示词管理"中添加或编辑你的提示词。'}</div>
            <div>{t('home.guideStep3') || '3. 在"API配置"中配置你的模型API和参数。'}</div>
            <div>{t('home.guideStep4') || '4. 回到"接口测试"页面，选择提示词和模型，输入测试内容，点击开始测试。'}</div>
            <div>{t('home.guideStep5') || '5. 在"测试历史"中查看和导出你的测试结果。'}</div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default HomePage;
