import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Descriptions, 
  Tag, 
  Space, 
  Typography, 
  Divider,
  Empty,
  Tooltip,
  message,
  Popconfirm,
  Input,
  Checkbox
} from 'antd';
import { 
  HistoryOutlined, 
  EyeOutlined, 
  DeleteOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { TestSessionHistory, TestResult } from '../types';
import { storageAdapter } from '../utils/storage-adapter';
import { exportToExcel, exportToCSV, copyResultsToClipboard } from '../utils/export';

const { Title, Text } = Typography;
const { Search } = Input;

interface TestSessionHistoryProps {
  visible?: boolean;
  onClose?: () => void;
  asPage?: boolean; // 是否作为独立页面显示
}

const TestSessionHistoryComponent: React.FC<TestSessionHistoryProps> = ({ 
  visible = true, 
  onClose, 
  asPage = false 
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [historyList, setHistoryList] = useState<TestSessionHistory[]>([]);
  const [filteredHistoryList, setFilteredHistoryList] = useState<TestSessionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TestSessionHistory | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 加载历史记录
  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await storageAdapter.getTestSessionHistory(100);
      setHistoryList(history);
      setFilteredHistoryList(history);
    } catch (error) {
      console.error('加载测试历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索过滤
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredHistoryList(historyList);
    } else {
      const filtered = historyList.filter(item => 
        item.sessionName.toLowerCase().includes(value.toLowerCase()) ||
        item.status.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredHistoryList(filtered);
    }
  };

  // 删除历史记录
  const handleDelete = async (sessionId: string) => {
    try {
      const success = await storageAdapter.deleteTestSessionHistory(sessionId);
      if (success) {
        await loadHistory(); // 重新加载
        message.success(t('history.deleteSuccess'));
      } else {
        message.error(t('history.deleteFailed'));
      }
    } catch (error) {
      console.error('删除历史记录失败:', error);
      message.error(t('history.deleteFailed'));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    try {
      setLoading(true);
      for (const sessionId of selectedRowKeys) {
        await storageAdapter.deleteTestSessionHistory(sessionId);
      }
      await loadHistory();
      setSelectedRowKeys([]);
      message.success(`已删除 ${selectedRowKeys.length} 条记录`);
    } catch (error) {
      console.error('批量删除失败:', error);
      message.error('批量删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 查看详情 - 跳转到详情页面
  const handleViewDetail = (session: TestSessionHistory) => {
    if (asPage) {
      // 使用React Router导航到详情页面
      navigate(`/test-session-detail/${session.id}`);
    } else {
      // 在模态框中显示详情
      setSelectedSession(session);
      setDetailVisible(true);
    }
  };

  // 格式化时间
  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap = {
      completed: { color: 'green', text: t('status.completed') },
      stopped: { color: 'orange', text: t('status.stopped') },
      error: { color: 'red', text: t('status.error') },
    };
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 表格列定义
  const tableColumns = [
    {
      title: t('history.sessionName'),
      dataIndex: 'sessionName',
      key: 'sessionName',
      ellipsis: true,
      render: (text: string, record: TestSessionHistory) => (
        <Space direction="vertical" size="small">
          <Text strong>{text}</Text>
          {getStatusTag(record.status)}
        </Space>
      ),
    },
    {
      title: t('history.testTime'),
      key: 'time',
      width: 180,
      render: (record: TestSessionHistory) => (
        <Space direction="vertical" size="small">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {formatTime(record.startTime)}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {formatTime(record.endTime)}
          </Text>
        </Space>
      ),
    },
    {
      title: t('history.statistics'),
      key: 'stats',
      width: 200,
      render: (record: TestSessionHistory) => (
        <Space size="small">
          <Tag color="blue">{t('history.total')}: {record.totalTests}</Tag>
          <Tag color="green">{t('history.success')}: {record.successCount}</Tag>
          <Tag color="red">{t('history.failed')}: {record.errorCount}</Tag>
        </Space>
      ),
    },
    {
      title: t('history.averageDuration'),
      dataIndex: 'averageDuration',
      key: 'averageDuration',
      width: 120,
      render: (duration: number) => `${Math.round(duration)}ms`,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 150,
      render: (record: TestSessionHistory) => (
        <Space size="small">
          <Tooltip title={t('history.viewDetails')}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Popconfirm
            title={t('history.confirmDelete')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Tooltip title={t('common.delete')}>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[]);
    },
  };

  useEffect(() => {
    if (asPage || visible) {
      loadHistory();
    }
  }, [visible, asPage]);

  // 主要内容组件 - 使用表格替代列表
  const MainContent = () => (
    <div className="space-y-4">
      {/* 搜索和操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <Search
          placeholder="搜索测试记录..."
          allowClear
          style={{ width: 300 }}
          onChange={(e) => handleSearch(e.target.value)}
          prefix={<SearchOutlined />}
        />
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadHistory}
            loading={loading}
          >
            {t('common.refresh')}
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`确认删除选中的 ${selectedRowKeys.length} 条记录？`}
              onConfirm={handleBatchDelete}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* 表格 */}
      {filteredHistoryList.length === 0 ? (
        <Empty 
          description={searchText ? '没有匹配的记录' : t('history.noRecords')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Table
          rowSelection={rowSelection}
          columns={tableColumns}
          dataSource={filteredHistoryList}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} / ${total} 条记录`,
          }}
          size="middle"
        />
      )}
    </div>
  );

  // 如果是作为独立页面显示
  if (asPage) {
    return (
      <div className="space-y-6">
        {/* 页面头部 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <HistoryOutlined className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('history.title')}</h1>
                <p className="text-gray-500 mt-1">{t('history.subtitle')}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{historyList.length}</div>
              <div className="text-sm text-gray-500">{t('history.records')}</div>
            </div>
          </div>
        </div>

        {/* 历史记录表格 */}
        <Card className="shadow-sm border-gray-200">
          <MainContent />
        </Card>

        {/* 详情弹窗 */}
        <Modal
          title={`${t('history.testDetails')} - ${selectedSession?.sessionName}`}
          open={detailVisible}
          onCancel={() => setDetailVisible(false)}
          footer={null}
          width={1000}
          destroyOnHidden
        >
          {selectedSession && (
            <div>
              {/* 添加调试信息 */}
              <div style={{ background: '#f0f0f0', padding: '8px', marginBottom: '16px', fontSize: '12px' }}>
                <strong>调试信息:</strong> 
                会话ID: {selectedSession.id}, 
                结果数量: {selectedSession.results?.length || 0}, 
                状态: {selectedSession.status}
                {selectedSession.results?.length > 0 && (
                  <div>第一个结果: {JSON.stringify(selectedSession.results[0], null, 2)}</div>
                )}
              </div>
              
              <Card title={t('history.testConfiguration')} size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>{t('history.promptId')}: </Text>
                    <Text>{selectedSession.testParams.promptId}</Text>
                  </div>
                  <div>
                    <Text strong>{t('history.modelId')}: </Text>
                    <Text>{selectedSession.testParams.modelId}</Text>
                  </div>
                  <div>
                    <Text strong>{t('history.repetitions')}: </Text>
                    <Text>{selectedSession.testParams.repetitions}</Text>
                  </div>
                  <div>
                    <Text strong>{t('history.interval')}: </Text>
                    <Text>{selectedSession.testParams.interval}ms</Text>
                  </div>
                  <div>
                    <Text strong>{t('history.testInputs')}: </Text>
                    <Text>{selectedSession.testParams.userInputs?.join(', ')}</Text>
                  </div>
                </Space>
              </Card>

              <Card title="测试结果" size="small">
                <div className="mb-4 flex justify-end space-x-2">
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      if (selectedSession?.results) {
                        exportToExcel(selectedSession.results);
                        message.success('Excel导出成功');
                      }
                    }}
                    className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                  >
                    导出Excel
                  </Button>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      if (selectedSession?.results) {
                        exportToCSV(selectedSession.results);
                        message.success('CSV导出成功');
                      }
                    }}
                    className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                  >
                    导出CSV
                  </Button>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      if (selectedSession?.results) {
                        copyResultsToClipboard(selectedSession.results);
                        message.success('结果已复制到剪贴板');
                      }
                    }}
                    className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                  >
                    复制结果
                  </Button>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {selectedSession.results && selectedSession.results.length > 0 ? (
                    <Table
                      size="small"
                      dataSource={selectedSession.results}
                      rowKey="id"
                      pagination={false}
                      columns={[
                        {
                          title: '#',
                          render: (_, record, index) => index + 1,
                          width: 50,
                        },
                        {
                          title: '状态',
                          dataIndex: 'status',
                          render: (status: string) => (
                            <Tag color={status === 'success' ? 'green' : 'red'}>
                              {status === 'success' ? '成功' : '失败'}
                            </Tag>
                          ),
                          width: 80,
                        },
                        {
                          title: '输入',
                          dataIndex: 'userInput',
                          ellipsis: true,
                          width: 200,
                        },
                        {
                          title: '输出',
                          dataIndex: 'output',
                          ellipsis: true,
                          render: (text: string, record?: TestResult) => (
                            record && record.status === 'success' ? text : record?.errorMessage
                          ),
                        },
                        {
                          title: '请求耗时',
                          dataIndex: 'requestDuration',
                          render: (duration?: number) => duration ? `${duration}ms` : '-',
                          width: 90,
                        },
                        {
                          title: '处理耗时',
                          dataIndex: 'processingDuration',
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
                          width: 90,
                        },
                        {
                          title: '时间戳',
                          dataIndex: 'timestamp',
                          render: (timestamp: string) => new Date(timestamp).toLocaleTimeString(),
                          width: 100,
                        },
                      ]}
                    />
                  ) : (
                    <Empty description="暂无测试结果数据" />
                  )}
                </div>
              </Card>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // 作为模态框显示
  return (
    <>
      <Modal
        title={t('history.title')}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={1200}
        destroyOnHidden
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <MainContent />
        </div>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title={`测试详情 - ${selectedSession?.sessionName}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={1000}
        destroyOnHidden
      >
        {selectedSession && (
          <div>
            {/* 添加调试信息 */}
            <div style={{ background: '#f0f0f0', padding: '8px', marginBottom: '16px', fontSize: '12px' }}>
              <strong>调试信息:</strong> 
              会话ID: {selectedSession.id}, 
              结果数量: {selectedSession.results?.length || 0}, 
              状态: {selectedSession.status}
              {selectedSession.results?.length > 0 && (
                <div>第一个结果: {JSON.stringify(selectedSession.results[0], null, 2)}</div>
              )}
            </div>
            
            <Card title={t('history.testConfiguration')} size="small" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>提示词ID: </Text>
                  <Text>{selectedSession.testParams.promptId}</Text>
                </div>
                <div>
                  <Text strong>模型ID: </Text>
                  <Text>{selectedSession.testParams.modelId}</Text>
                </div>
                <div>
                  <Text strong>重复次数: </Text>
                  <Text>{selectedSession.testParams.repetitions}</Text>
                </div>
                <div>
                  <Text strong>间隔时间: </Text>
                  <Text>{selectedSession.testParams.interval}ms</Text>
                </div>
                <div>
                  <Text strong>测试输入: </Text>
                  <Text>{selectedSession.testParams.userInputs?.join(', ')}</Text>
                </div>
              </Space>
            </Card>

            <Card title="测试结果" size="small">
              <div className="mb-4 flex justify-end space-x-2">
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    if (selectedSession?.results) {
                      exportToExcel(selectedSession.results);
                      message.success('Excel导出成功');
                    }
                  }}
                  className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                >
                  导出Excel
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    if (selectedSession?.results) {
                      exportToCSV(selectedSession.results);
                      message.success('CSV导出成功');
                    }
                  }}
                  className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                >
                  导出CSV
                </Button>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    if (selectedSession?.results) {
                      copyResultsToClipboard(selectedSession.results);
                      message.success('结果已复制到剪贴板');
                    }
                  }}
                  className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                >
                  复制结果
                </Button>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {selectedSession.results && selectedSession.results.length > 0 ? (
                  <Table
                    size="small"
                    dataSource={selectedSession.results}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      {
                        title: '#',
                        render: (_, record, index) => index + 1,
                        width: 50,
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        render: (status: string) => (
                          <Tag color={status === 'success' ? 'green' : 'red'}>
                            {status === 'success' ? '成功' : '失败'}
                          </Tag>
                        ),
                        width: 80,
                      },
                      {
                        title: '输入',
                        dataIndex: 'userInput',
                        ellipsis: true,
                        width: 200,
                      },
                      {
                        title: '输出',
                        dataIndex: 'output',
                        ellipsis: true,
                        render: (text: string, record?: TestResult) => (
                          record && record.status === 'success' ? text : record?.errorMessage
                        ),
                      },
                      {
                        title: '请求耗时',
                        dataIndex: 'requestDuration',
                        render: (duration?: number) => duration ? `${duration}ms` : '-',
                        width: 90,
                      },
                      {
                        title: '处理耗时',
                        dataIndex: 'processingDuration',
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
                        width: 90,
                      },
                      {
                        title: '时间戳',
                        dataIndex: 'timestamp',
                        render: (timestamp: string) => new Date(timestamp).toLocaleTimeString(),
                        width: 100,
                      },
                    ]}
                  />
                ) : (
                  <Empty description="暂无测试结果数据" />
                )}
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </>
  );
};

export default TestSessionHistoryComponent; 