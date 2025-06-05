import React from 'react';
import { Card, Statistic, Row, Col, Divider, Typography } from 'antd';

const { Title, Paragraph } = Typography;

interface StatisticsPanelProps {
  tasks: import('./types').TaskItem[];
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ tasks }) => {
  const total = tasks.length;
  const success = tasks.filter(t => t.status === 'success').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  const avgDuration = success > 0 ? Math.round(tasks.filter(t => t.status === 'success').reduce((sum, t) => sum + (t.duration || 0), 0) / success) : 0;

  return (
    <Card title="统计与引导" bordered={false} bodyStyle={{ padding: '24px 32px 24px 32px' }}>
      <Row gutter={16}>
        <Col span={12}>
          <Statistic title="总任务数" value={total} />
        </Col>
        <Col span={12}>
          <Statistic title="成功数" value={success} valueStyle={{ color: '#3f8600' }} />
        </Col>
        <Col span={12} style={{ marginTop: 16 }}>
          <Statistic title="失败数" value={failed} valueStyle={{ color: '#cf1322' }} />
        </Col>
        <Col span={12} style={{ marginTop: 16 }}>
          <Statistic title="平均耗时(ms)" value={avgDuration} />
        </Col>
      </Row>
      <Divider />
      <div style={{ width: '100%', margin: '24px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: 320, height: 160, background: '#f5f5f5', borderRadius: 8, lineHeight: '160px', color: '#bbb', fontSize: 16 }}>
          图示占位
        </div>
      </div>
      <Title level={5} style={{ marginTop: 24 }}>使用引导</Title>
      <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 8 }}>
        1. 在左侧配置区输入问题、选择提示词和模型，设置参数后点击“生成任务”<br />
        2. 在中部任务区点击“开始执行”，可实时查看进度和结果<br />
        3. 支持多维度对比、筛选和导出结果，右侧可查看统计与分析
      </Paragraph>
    </Card>
  );
};

export default StatisticsPanel;
