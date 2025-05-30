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
  Checkbox
} from 'antd';
import { 
  ArrowLeftOutlined,
  SearchOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { TestSessionHistory, TestResult } from '../types';
import { storageAdapter } from '../utils/storage-adapter';
import { exportToExcel, exportToCSV, copyResultsToClipboard, copySingleResultToClipboard } from '../utils/export';

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
      // 如果是临时会话，从localStorage获取
      if (sessionId.startsWith('temp-')) {
        const tempSession = localStorage.getItem('temp_session_detail');
        if (tempSession) {
          const parsedSession: TestSessionHistory = JSON.parse(tempSession);
          setSession(parsedSession);
          return;
        }
      }
      
      // 从历史记录中获取
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

  // 表格列定义
  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: t('testing.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'success' ? 'green' : 'red'} icon={
          status === 'success' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />
        }>
          {status === 'success' ? t('status.success') : t('status.failed')}
        </Tag>
      ),
    },
    {
      title: t('testing.input'),
      dataIndex: 'userInput',
      key: 'userInput',
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          <Text style={{ maxWidth: 200 }}>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: t('testing.output'),
      dataIndex: 'output',
      key: 'output',
      ellipsis: {
        showTitle: false,
      },
      render: (text: string, record: TestResult) => {
        if (record.status === 'success') {
          return (
            <Tooltip placement="topLeft" title={text}>
              <Text style={{ maxWidth: 300 }}>{text}</Text>
            </Tooltip>
          );
        } else {
          return (
            <Tooltip placement="topLeft" title={record.errorMessage}>
              <Text type="danger" style={{ maxWidth: 300 }}>{record.errorMessage}</Text>
            </Tooltip>
          );
        }
      },
    },
    {
      title: '请求耗时',
      dataIndex: 'requestDuration',
      key: 'requestDuration',
      width: 90,
      render: (duration?: number) => duration ? `${duration}ms` : '-',
    },
    {
      title: '处理耗时',
      dataIndex: 'processingDuration',
      key: 'processingDuration',
      width: 90,
      render: (duration?: number, record?: TestResult) => {
        // 如果有直接的处理耗时，使用它；否则计算 总耗时 - 请求耗时
        if (duration && duration > 0) {
          return `${duration}ms`;
        }
        const totalDuration = record?.duration || 0;
        const requestDuration = record?.requestDuration || 0;
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
      title: t('common.actions'),
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (text: any, record: TestResult) => (
        <Space size="small">
          <Tooltip title={t('common.viewDetails')}>
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewDetail(record)}
              className="text-blue-500 hover:bg-blue-50"
            />
          </Tooltip>
          <Tooltip title={t('common.copy')}>
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              size="small"
              onClick={() => handleCopy(record)}
              className="text-green-500 hover:bg-green-50"
            />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Popconfirm
              title={t('common.confirmDelete')}
              onConfirm={() => handleDeleteSingle(record.id)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                size="small"
                className="text-red-500 hover:bg-red-50"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[]);
    },
    onSelectAll: (selected: boolean, selectedRows: TestResult[], changeRows: TestResult[]) => {
      if (selected) {
        setSelectedRowKeys(filteredResults.map(r => r.id));
      } else {
        setSelectedRowKeys([]);
      }
    },
  };

  useEffect(() => {
    loadSessionDetail();
  }, [sessionId]);

  if (loading) {
    return <div className="p-6">加载中...</div>;
  }

  if (!session) {
    return <div className="p-6">测试记录不存在</div>;
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
        <Card className="bg-blue-50 border-blue-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{session.totalTests}</div>
            <div className="text-sm text-gray-500">{t('history.totalTests')}</div>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{session.successCount}</div>
            <div className="text-sm text-gray-500">{t('history.successCount')}</div>
          </div>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{session.errorCount}</div>
            <div className="text-sm text-gray-500">{t('history.errorCount')}</div>
          </div>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(session.averageDuration)}</div>
            <div className="text-sm text-gray-500">{t('history.averageDuration')}(ms)</div>
          </div>
        </Card>
      </div>

      {/* 测试结果表格 */}
      <Card title={t('testing.results')} className="shadow-sm border-gray-200">
        <div className="space-y-4">
          {/* 工具栏 */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* 左侧：搜索 */}
            <Search
              placeholder={t('common.searchPlaceholder')}
              allowClear
              style={{ width: 300 }}
              onChange={(e) => setSearchText(e.target.value)}
            />
            
            {/* 右侧：操作按钮 */}
            <div className="flex flex-wrap items-center gap-3">
              {/* 批量删除 */}
              {selectedRowKeys.length > 0 && (
                <Popconfirm
                  title={t('common.confirmBatchDelete', { count: selectedRowKeys.length })}
                  onConfirm={handleBatchDelete}
                  okText={t('common.confirm')}
                  cancelText={t('common.cancel')}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    {t('common.batchDelete')} ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              )}
              
              {/* 导出功能 */}
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
              >
                {t('testing.exportExcel')}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportCSV}
                className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              >
                {t('testing.exportCSV')}
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopyAllResults}
                className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
              >
                {t('testing.copyResults')}
              </Button>
            </div>
          </div>
          
          {/* 表格 */}
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={filteredResults}
            rowKey="id"
            size="middle"
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} / ${total} ${t('common.items')}`,
            }}
            className="custom-table"
            rowClassName={(record) => {
              const baseClass = "hover:bg-blue-50 transition-colors";
              if (record.status === 'success') return `${baseClass} border-l-4 border-l-green-500`;
              if (record.status === 'error') return `${baseClass} border-l-4 border-l-red-500`;
              return baseClass;
            }}
          />
        </div>
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={t('common.viewDetails')}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => selectedResult && handleCopy(selectedResult)}>
            {t('common.copy')}
          </Button>,
          <Button key="close" onClick={() => setDetailVisible(false)}>
            {t('common.close')}
          </Button>
        ]}
        width={800}
      >
        {selectedResult && (
          <div className="space-y-4">
            <Card title={t('testing.input')} size="small">
              <Text>{selectedResult.userInput}</Text>
            </Card>
            {selectedResult.status === 'success' ? (
              <Card title={t('testing.output')} size="small">
                <Text>{selectedResult.output}</Text>
              </Card>
            ) : (
              <Card title={t('common.error')} size="small">
                <Text type="danger">{selectedResult.errorMessage}</Text>
              </Card>
            )}
            <Card title={t('testing.metadata')} size="small">
              <Space direction="vertical">
                <div><strong>{t('testing.status')}:</strong> {selectedResult.status}</div>
                <div><strong>{t('testing.duration')}:</strong> {selectedResult.duration}ms</div>
                <div><strong>{t('testing.timestamp')}:</strong> {new Date(selectedResult.timestamp).toLocaleString()}</div>
              </Space>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TestSessionDetail; 