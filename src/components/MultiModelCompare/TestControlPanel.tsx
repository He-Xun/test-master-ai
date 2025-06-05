import React from 'react';
import { Space, Button, Card } from 'antd';

interface TestControlPanelProps {
  onGenerateTasks: () => void;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  running: boolean;
  hasTasks: boolean;
}

const TestControlPanel: React.FC<TestControlPanelProps> = ({ onGenerateTasks, onStart, onPause, onStop, running, hasTasks }) => {
  return (
    <Card bordered={false} style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2' }} bodyStyle={{ padding: '16px 32px', textAlign: 'right' }}>
      <Space>
        <Button type="primary" onClick={onGenerateTasks} style={{ minWidth: 96 }}>生成任务</Button>
        <Button onClick={onStart} type="default" disabled={running || !hasTasks} style={{ minWidth: 96 }}>开始执行</Button>
        <Button onClick={onPause} disabled={!running} style={{ minWidth: 96 }}>暂停</Button>
        <Button onClick={onStop} danger disabled={!running} style={{ minWidth: 96 }}>停止</Button>
      </Space>
    </Card>
  );
};

export default TestControlPanel;
