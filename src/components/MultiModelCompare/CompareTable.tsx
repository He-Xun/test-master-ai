import React from 'react';
import { Table, Tag } from 'antd';
import { TaskItem } from './types';

interface CompareTableProps {
  tasks: TaskItem[];
}

const statusColor = {
  pending: 'default',
  running: 'processing',
  success: 'success',
  failed: 'error',
};

const CompareTable: React.FC<CompareTableProps> = ({ tasks }) => {
  const columns = [
    { title: '问题', dataIndex: 'question', key: 'question', width: 200 },
    { title: '提示词', dataIndex: 'prompt', key: 'prompt', width: 120 },
    { title: '模型', dataIndex: 'model', key: 'model', width: 120 },
    { title: '轮次', dataIndex: 'round', key: 'round', width: 80 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (status: TaskItem['status']) => <Tag color={statusColor[status]}>{status}</Tag> },
    { title: '耗时(ms)', dataIndex: 'duration', key: 'duration', width: 100 },
  ];

  return (
    <Table
      rowKey="key"
      columns={columns}
      dataSource={tasks}
      pagination={false}
      size="small"
      scroll={{ x: 800, y: 400 }}
      bordered
    />
  );
};

export default CompareTable;
