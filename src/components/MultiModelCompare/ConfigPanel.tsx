import React from 'react';
import { Card, Form, Select, InputNumber, Row, Col, Space, Typography } from 'antd';
import { TaskConfig } from './types';

const { Option } = Select;
const { Title } = Typography;

interface ConfigPanelProps {
  onConfigChange: (config: Omit<TaskConfig, 'questions'>) => void;
  config: Omit<TaskConfig, 'questions'>;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onConfigChange, config }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    form.setFieldsValue(config);
  }, [config, form]);

  const handleValuesChange = (_: any, values: any) => {
    onConfigChange(values);
  };

  return (
    <Card
      title={<Title level={5} style={{ margin: 0 }}>测试配置</Title>}
      bordered={false}
      style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2' }}
      bodyStyle={{ padding: '24px 32px 8px 32px' }}
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={config}
        onValuesChange={handleValuesChange}
      >
        {/* 第一行：提示词、模型选择 */}
        <Row gutter={32} align="bottom">
          <Col xs={24} md={8}>
            <Form.Item label={<b>提示词</b>} name="prompt" rules={[{ required: true, message: '请选择提示词' }]}> 
              <Select placeholder="请选择提示词">
                {/* TODO: 动态加载提示词选项 */}
                <Option value="prompt1">提示词1</Option>
                <Option value="prompt2">提示词2</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label={<b>模型选择</b>} name="models" rules={[{ required: true, message: '请选择模型' }]}> 
              <Select mode="multiple" placeholder="请选择模型（可多选）">
                {/* TODO: 动态加载模型选项 */}
                <Option value="model1">模型1</Option>
                <Option value="model2">模型2</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        {/* 第二行：轮次数/并发数/超时时间 横向排列，单独成行 */}
        <Row gutter={32} style={{ marginTop: 0 }} align="bottom">
          <Col xs={24} md={24}>
            <Space size={16} style={{ width: '100%' }}>
              <Form.Item label={<b>轮次数</b>} name="rounds" initialValue={1} rules={[{ required: true, message: '请输入轮次数' }]} style={{ marginBottom: 0, width: 90 }}>
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label={<b>并发数</b>} name="concurrency" initialValue={1} rules={[{ required: true, message: '请输入并发数' }]} style={{ marginBottom: 0, width: 90 }}>
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label={<b>超时时间(秒)</b>} name="timeout" initialValue={60} rules={[{ required: true, message: '请输入超时时间' }]} style={{ marginBottom: 0, width: 120 }}>
                <InputNumber min={10} max={600} style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default ConfigPanel;
