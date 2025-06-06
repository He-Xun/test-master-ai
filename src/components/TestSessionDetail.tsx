import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Typography, 
  Tag,
  Input,
  Modal,
  message,
  Tooltip,
  Popconfirm,
  Checkbox,
  Drawer,
  Collapse
} from 'antd';
import { 
  ArrowLeftOutlined,
  SearchOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  TableOutlined
} from '@ant-design/icons';
import { TestSessionHistory, TestResult } from '../types';
import { storageAdapter } from '../utils/storage-adapter';
import { exportToExcel, exportToCSV, copyResultsToClipboard, copySingleResultToClipboard } from '../utils/export';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const { Title, Text } = Typography;
const { Search } = Input;

// 复制到剪贴板的工具函数
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  });
};

const TestSessionDetail: React.FC = () => {
  const { t } = useTranslation();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<TestSessionHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [showInputRaw, setShowInputRaw] = useState(false);
  const [showMetaRaw, setShowMetaRaw] = useState(false);

  // 返回上一页
  const goBack = () => {
    // 使用React Router导航回到测试记录页面
    navigate('/test-history');
  };

  // 加载测试记录详情
  const loadSessionDetail = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      // 只通过storageAdapter查找所有会话
      const allHistory = await storageAdapter.getTestSessionHistory(1000);
      const targetSession = allHistory.find(h => h.id === sessionId);
      if (targetSession) {
        setSession(targetSession);
      } else {
        message.error(t('history.sessionNotFound'));
        goBack();
      }
    } catch (error) {
      console.error('加载测试记录详情失败:', error);
      message.error(t('history.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 更新测试会话历史的工具函数
  const updateTestSessionHistory = async (sessionId: string, updatedSession: TestSessionHistory) => {
    try {
      const userId = (storageAdapter as any).getCurrentUserId();
      if (!userId) return false;
      
      const historyKey = `${userId}_test_session_history`;
      const stored = localStorage.getItem(historyKey);
      if (!stored) return false;
      
      const existingHistory: TestSessionHistory[] = JSON.parse(stored);
      const sessionIndex = existingHistory.findIndex(h => h.id === sessionId);
      
      if (sessionIndex === -1) return false;
      
      existingHistory[sessionIndex] = updatedSession;
      localStorage.setItem(historyKey, JSON.stringify(existingHistory));
      return true;
    } catch (error) {
      console.error('更新测试会话历史失败:', error);
      return false;
    }
  };

  // 过滤测试结果
  const filteredResults = session?.results.filter(result => 
    result.userInput?.toLowerCase().includes(searchText.toLowerCase()) ||
    result.output?.toLowerCase().includes(searchText.toLowerCase()) ||
    result.errorMessage?.toLowerCase().includes(searchText.toLowerCase())
  ) || [];

  // 删除单个结果
  const handleDeleteSingle = async (resultId: string) => {
    if (!session) return;
    
    try {
      const updatedResults = session.results.filter(r => r.id !== resultId);
      const updatedSession = { ...session, results: updatedResults };
      
      // 更新本地存储
      await updateTestSessionHistory(session.id, updatedSession);
      setSession(updatedSession);
      message.success(t('common.deleteSuccess'));
    } catch (error) {
      console.error('删除结果失败:', error);
      message.error(t('common.deleteFailed'));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (!session || selectedRowKeys.length === 0) return;
    
    try {
      const updatedResults = session.results.filter(r => !selectedRowKeys.includes(r.id));
      const updatedSession = { ...session, results: updatedResults };
      
      await updateTestSessionHistory(session.id, updatedSession);
      setSession(updatedSession);
      setSelectedRowKeys([]);
      message.success(t('common.batchDeleteSuccess', { count: selectedRowKeys.length }));
    } catch (error) {
      console.error('批量删除失败:', error);
      message.error(t('common.batchDeleteFailed'));
    }
  };

  // 复制结果
  const handleCopy = (result: TestResult) => {
    copySingleResultToClipboard(result);
    message.success(t('testing.contentCopied'));
  };

  // 复制所有结果
  const handleCopyAllResults = () => {
    if (!session?.results || session.results.length === 0) {
      message.warning(t('testing.noDataToCopy'));
      return;
    }
    copyResultsToClipboard(session.results);
    message.success(t('testing.resultsCopied'));
  };

  // 导出Excel
  const handleExportExcel = () => {
    if (!session?.results || session.results.length === 0) {
      message.warning(t('testing.noDataToExport'));
      return;
    }
    exportToExcel(session.results);
    message.success(t('testing.excelExportSuccess'));
  };

  // 导出CSV
  const handleExportCSV = () => {
    if (!session?.results || session.results.length === 0) {
      message.warning(t('testing.noDataToExport'));
      return;
    }
    exportToCSV(session.results);
    message.success(t('testing.csvExportSuccess'));
  };

  // 查看详情
  const handleViewDetail = (result: TestResult) => {
    setSelectedResult(result);
    setDetailVisible(true);
  };

  useEffect(() => {
    loadSessionDetail();
  }, [sessionId]);

  if (loading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  if (!session) {
    return <div className="p-6">{t('history.sessionNotFound')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={goBack}
              size="large"
            >
              {t('common.back')}
            </Button>
            <div>
              <Title level={2} style={{ margin: 0 }}>{session.sessionName}</Title>
              <Space className="mt-2">
                <Tag color={session.status === 'completed' ? 'green' : session.status === 'stopped' ? 'orange' : 'red'}>
                  {t(`status.${session.status}`)}
                </Tag>
                <Text type="secondary">
                  {new Date(session.startTime).toLocaleString()} - {new Date(session.endTime).toLocaleString()}
                </Text>
              </Space>
            </div>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{session.totalTests}{t('unit.times')}</div>
            <div className="text-sm text-gray-500">{t('history.totalTests')}</div>
          </div>
        </Card>
        <Card className="border-green-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{session.successCount}{t('unit.times')}</div>
            <div className="text-sm text-gray-500">{t('history.successCount')}</div>
          </div>
        </Card>
        <Card className="border-red-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{session.errorCount}{t('unit.times')}</div>
            <div className="text-sm text-gray-500">{t('history.errorCount')}</div>
          </div>
        </Card>
        <Card className="border-purple-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(session.averageDuration)}{t('unit.ms')}</div>
            <div className="text-sm text-gray-500">{t('history.averageDuration')}</div>
          </div>
        </Card>
      </div>

      {/* 测试结果表格 */}
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <TableOutlined className="text-white text-lg" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 m-0">{t('testing.results')}</h3>
                <p className="text-sm text-gray-500 m-0">{t('testing.detailedResults')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">{t('results.success')}</span>
                <span className="text-sm font-semibold text-green-600">{session.successCount}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">{t('results.failed')}</span>
                <span className="text-sm font-semibold text-red-600">{session.errorCount}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-600">{t('status.total')}</span>
                <span className="text-sm font-semibold text-gray-800">{session.totalTests}</span>
              </div>
            </div>
          </div>
        }
        className="shadow-sm border-gray-200"
        bodyStyle={{ padding: '0 12px 24px 12px' }}
      >
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 -mx-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {t('testing.showResults')} {session?.results.length} {t('testing.resultsCount')}
              </span>
              {selectedRowKeys.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-600">
                    {t('results.selected')} {selectedRowKeys.length} {t('results.items')}
                  </span>
                  <Popconfirm
                    title={`${t('testing.confirmBatchDelete')} ${selectedRowKeys.length} ${t('testing.confirmDeleteItems')}`}
                    onConfirm={handleBatchDelete}
                    okText={t('testing.confirmDeleteBtn')}
                    cancelText={t('common.cancel')}
                  >
                    <Button
                      type="primary"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    >
                      {t('results.batchDelete')}
                    </Button>
                  </Popconfirm>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                icon={<DownloadOutlined />}
                size="small"
                onClick={handleExportExcel}
              >
                Excel
              </Button>
              <Button
                icon={<CopyOutlined />}
                size="small"
                onClick={handleCopyAllResults}
              >
                {t('testing.copy')}
              </Button>
            </div>
          </div>
        </div>
        <Table
          columns={[
            {
              title: (
                <Checkbox
                  checked={selectedRowKeys.length === session.results.length && session.results.length > 0}
                  indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < session.results.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRowKeys(session.results.map(r => r.id));
                    } else {
                      setSelectedRowKeys([]);
                    }
                  }}
                />
              ),
              key: 'select',
              width: 50,
              fixed: 'left',
              render: (_: any, record?: TestResult) => record ? (
                <Checkbox
                  checked={selectedRowKeys.includes(record.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRowKeys([...selectedRowKeys, record.id]);
                    } else {
                      setSelectedRowKeys(selectedRowKeys.filter(id => id !== record.id));
                    }
                  }}
                />
              ) : null,
            },
            {
              title: '#',
              key: 'index',
              width: 60,
              fixed: 'left',
              render: (_: any, __: any, index: number) => index + 1,
            },
            {
              title: t('testing.userInput'),
              dataIndex: 'userInput',
              key: 'userInput',
              width: 200,
              ellipsis: { showTitle: false },
              render: (text: string) => (
                <Tooltip title={text} placement="topLeft">
                  <Text>{text}</Text>
                </Tooltip>
              ),
            },
            {
              title: t('testing.prompt'),
              dataIndex: 'promptName',
              key: 'promptName',
              width: 120,
            },
            {
              title: t('testing.model'),
              dataIndex: 'modelName',
              key: 'modelName',
              width: 150,
            },
            {
              title: t('testing.repetitionCount'),
              dataIndex: 'repetitionIndex',
              key: 'repetitionIndex',
              width: 80,
              align: 'center',
            },
            {
              title: t('testing.output'),
              dataIndex: 'output',
              key: 'output',
              width: 350,
              ellipsis: { showTitle: false },
              render: (text: string, record?: TestResult) => record ? (
                <Tooltip title={record.status === 'error' ? record.errorMessage : text} placement="topLeft">
                  <Text>
                    {record.status === 'error' ? record.errorMessage : text}
                  </Text>
                </Tooltip>
              ) : null,
            },
            {
              title: t('testing.requestDuration'),
              dataIndex: 'requestDuration',
              key: 'requestDuration',
              width: 90,
              render: (duration?: number) => duration ? `${duration}ms` : '-',
            },
            {
              title: t('testing.processingDuration'),
              dataIndex: 'processingDuration',
              key: 'processingDuration',
              width: 90,
              render: (duration?: number, record?: TestResult) => {
                if (!record) return '-';
                if (duration && duration > 0) {
                  return `${duration}ms`;
                }
                const totalDuration = record.duration || 0;
                const requestDuration = record.requestDuration || 0;
                const calculatedProcessingTime = totalDuration - requestDuration;
                return calculatedProcessingTime > 0 ? `${calculatedProcessingTime}ms` : '-';
              },
            },
            {
              title: t('testing.timestampField'),
              dataIndex: 'timestamp',
              key: 'timestamp',
              width: 120,
              render: (timestamp: string) => new Date(timestamp).toLocaleTimeString(),
            },
            {
              title: t('testing.statusField'),
              dataIndex: 'status',
              key: 'status',
              width: 80,
              fixed: 'right',
              render: (status: string) => (
                <Tag color={status === 'success' ? 'green' : status === 'error' ? 'red' : 'blue'}>
                  {status === 'success' ? t('status.success') : status === 'error' ? t('status.failed') : t('status.pending')}
                </Tag>
              ),
            },
            {
              title: t('testing.actionField'),
              key: 'action',
              width: 150,
              fixed: 'right',
              render: (_: any, record?: TestResult) => record ? (
                <Space size="small">
                  <Tooltip title={t('results.viewDetails')}>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      size="small"
                      onClick={() => handleViewDetail(record)}
                      className="text-blue-500 hover:bg-blue-50"
                    />
                  </Tooltip>
                  <Tooltip title={record.status === 'error' ? t('testing.copyError') : t('testing.copyOutput')}>
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={() => handleCopy(record)}
                      disabled={record.status === 'pending'}
                      className="text-green-500 hover:bg-green-50"
                    />
                  </Tooltip>
                  <Popconfirm
                    title={t('results.confirmDeleteSingle')}
                    onConfirm={() => handleDeleteSingle(record.id)}
                    okText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                  >
                    <Tooltip title={t('results.delete')}>
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        size="small"
                        className="text-red-500 hover:bg-red-50"
                      />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ) : null,
            },
          ]}
          dataSource={session?.results || []}
          rowKey="id"
          pagination={{ 
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => t('common.pagination', { start: range[0], end: range[1], total })
          }}
          scroll={{ x: 1200, y: 600 }}
          size="small"
          className="custom-table"
          rowClassName={(record?: TestResult) => {
            const baseClass = "hover:bg-blue-50 transition-colors";
            if (!record) return baseClass;
            if (record.status === 'success') return `${baseClass} border-l-4 border-l-green-500`;
            if (record.status === 'error') return `${baseClass} border-l-4 border-l-red-500`;
            if (record.status === 'pending') return `${baseClass} border-l-4 border-l-blue-500`;
            return baseClass;
          }}
        />
      </Card>

      {/* 详情 Drawer */}
      <Drawer
        title={
          <div className="flex items-center space-x-2">
            <EyeOutlined className="text-blue-500" />
            <span>{t('testing.resultDetails')}</span>
          </div>
        }
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={1000}
        extra={
          <div style={{ display: 'flex', gap: 10, marginRight: 12 }}>
            <Button key="copy" icon={<CopyOutlined />} onClick={() => selectedResult && handleCopy(selectedResult)}>
              {t('testing.copyResult')}
            </Button>
            <Button key="close" onClick={() => setDetailVisible(false)}>
              {t('common.close')}
            </Button>
          </div>
        }
        bodyStyle={{ paddingBottom: 80 }}
      >
        {selectedResult && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Text strong className="text-gray-700">{t('testing.statusField')}:</Text>
                <div className="mt-2">
                  <Tag color={selectedResult.status === 'success' ? 'green' : selectedResult.status === 'error' ? 'red' : 'blue'} className="text-sm">
                    {selectedResult.status === 'success' ? t('status.success') : selectedResult.status === 'error' ? t('status.failed') : t('status.pending')}
                  </Tag>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <Text strong className="text-gray-700">{t('testing.duration')}:</Text>
                <div className="mt-2 text-lg font-semibold text-blue-600">
                  {selectedResult.duration ? `${selectedResult.duration}ms` : '-'}
                </div>
              </div>
            </div>

            {/* 测试配置 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Text strong className="text-gray-700 block mb-3">{t('testing.testConfig')}:</Text>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('testing.promptField')}:</span>
                  <span className="ml-2 font-medium">{selectedResult.promptName}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('testing.modelField')}:</span>
                  <span className="ml-2 font-medium">{selectedResult.modelName}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('testing.repetitionField')}:</span>
                  <span className="ml-2 font-medium">{t('testing.repetitionIndex', { index: selectedResult.repetitionIndex })}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('testing.executionTime')}:</span>
                  <span className="ml-2 font-medium">
                    {new Date(selectedResult.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            {/* 用户输入 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <Text strong className="text-gray-700">{t('testing.userInputField')}:</Text>
                <Button
                  size="small"
                  icon={showInputRaw ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => setShowInputRaw(v => !v)}
                  style={{ marginLeft: 10 }}
                >
                  {showInputRaw ? t('common.rawText') : t('common.visualize')}
                </Button>
              </div>
              <div className="mt-3 p-4 bg-white rounded border whitespace-pre-wrap shadow-sm">
                {showInputRaw
                  ? <pre className="whitespace-pre-wrap" style={{ margin: 0, background: 'none' }}>{selectedResult.userInput}</pre>
                  : <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedResult.userInput}</ReactMarkdown></div>
                }
              </div>
            </div>

            {/* 输出结果或错误信息 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <Text strong className="text-gray-700">
                  {selectedResult.status === 'error' ? t('testing.errorMessage') + ':' : t('testing.outputField') + ':'}
                </Text>
                {selectedResult.status !== 'error' && (
                  <Button
                    size="small"
                    icon={showRaw ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setShowRaw(v => !v)}
                    style={{ marginLeft: 10 }}
                  >
                    {showRaw ? t('common.rawText') : t('common.visualize')}
                  </Button>
                )}
              </div>
              <div className={`mt-3 p-4 rounded border whitespace-pre-wrap shadow-sm ${
                selectedResult.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-white'
              }`}>
                {selectedResult.status === 'error'
                  ? selectedResult.errorMessage
                  : showRaw
                    ? <pre className="whitespace-pre-wrap" style={{ margin: 0, background: 'none' }}>{selectedResult.output}</pre>
                    : <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedResult.output}</ReactMarkdown></div>
                }
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default TestSessionDetail; 