import React, { useRef } from 'react';
import { Card, Button, Progress, Table, Tag } from 'antd';
import { TaskItem } from './types';

const columns = [
  { title: '问题', dataIndex: 'question', key: 'question', width: 120 },
  { title: '提示词', dataIndex: 'prompt', key: 'prompt', width: 100 },
  { title: '模型', dataIndex: 'model', key: 'model', width: 100 },
  { title: '轮次', dataIndex: 'round', key: 'round', width: 60 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (status: string) => {
    if (status === 'success') return <Tag color="green">成功</Tag>;
    if (status === 'running') return <Tag color="blue">运行中</Tag>;
    if (status === 'failed') return <Tag color="red">失败</Tag>;
    if (status === 'pending') return <Tag color="default">待执行</Tag>;
    return <Tag>{status}</Tag>;
  } },
  { title: '耗时(ms)', dataIndex: 'duration', key: 'duration', width: 80 },
  { title: '操作', key: 'action', width: 80, render: () => <Button size="small">详情</Button> },
];

interface TaskResultPanelProps {
  tasks: TaskItem[];
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  running: boolean;
  percent: number;
}

const TaskResultPanel: React.FC<TaskResultPanelProps> = ({ tasks, onStart, onPause, onStop, running, percent }) => {
  const startBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <Card title="任务与结果区" bordered={false}>
      {/* 进度与控制区 */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Progress percent={percent} style={{ width: 200 }} />
        <Button type="primary" onClick={onStart} disabled={running || tasks.length === 0} ref={startBtnRef}>开始执行</Button>
        <Button onClick={onPause} disabled={!running}>暂停</Button>
        <Button danger onClick={onStop} disabled={!running}>停止</Button>
      </div>
      {/* 结果表格区 */}
      <Table
        columns={columns}
        dataSource={tasks}
        size="small"
        scroll={{ x: 600 }}
        pagination={false}
        bordered
        rowKey="key"
      />
    </Card>
  );
};

export default TaskResultPanel;
