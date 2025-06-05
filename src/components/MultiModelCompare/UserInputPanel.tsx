import React from 'react';
import { Card, Input, Typography } from 'antd';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface UserInputPanelProps {
  questions: string[];
  onQuestionsChange: (questions: string[]) => void;
}

const UserInputPanel: React.FC<UserInputPanelProps> = ({ questions, onQuestionsChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split('\n').map(q => q.trim()).filter(Boolean);
    onQuestionsChange(lines);
  };

  return (
    <Card
      title={<Title level={5} style={{ margin: 0 }}>用户输入</Title>}
      bordered={false}
      style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2' }}
      bodyStyle={{ padding: '24px 32px 16px 32px' }}
    >
      <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
        请输入或粘贴批量测试问题，每行一个问题
      </Text>
      <TextArea
        rows={6}
        value={questions.join('\n')}
        onChange={handleChange}
        placeholder="请输入或粘贴批量测试问题，每行一个问题"
        style={{ resize: 'vertical', fontSize: 15 }}
      />
    </Card>
  );
};

export default UserInputPanel;
