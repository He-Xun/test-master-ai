import React, { useState } from 'react';
import { Card, Tabs } from 'antd';
import ConfigPanel from './ConfigPanel';
import UserInputPanel from './UserInputPanel';
import CompareTable from './CompareTable';
import TestControlPanel from './TestControlPanel';
import { TaskConfig, TaskItem } from './types';
import StatisticsPanel from './StatisticsPanel';

const defaultConfig: Omit<TaskConfig, 'questions'> = {
  prompt: '',
  models: [],
  rounds: 1,
  concurrency: 1,
  timeout: 60,
};

const MultiModelCompare: React.FC = () => {
  const [config, setConfig] = useState<Omit<TaskConfig, 'questions'>>(defaultConfig);
  const [questions, setQuestions] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [running, setRunning] = useState(false);
  const [percent, setPercent] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  // 生成任务矩阵
  const handleGenerateTasks = () => {
    if (!config.prompt || !config.models.length || !questions.length) return;
    const newTasks: TaskItem[] = [];
    let key = 1;
    for (const question of questions) {
      for (const model of config.models) {
        for (let round = 1; round <= config.rounds; round++) {
          newTasks.push({
            key: `${key++}`,
            question,
            prompt: config.prompt,
            model,
            round,
            status: 'pending',
          });
        }
      }
    }
    setTasks(newTasks);
    setPercent(0);
    setRunning(false);
    if (timer) clearInterval(timer);
  };

  // 模拟任务执行
  const handleStart = () => {
    if (tasks.length === 0) return;
    setRunning(true);
    let idx = 0;
    const newTasks = [...tasks];
    const total = newTasks.length;
    const t = setInterval(() => {
      if (idx >= total) {
        setRunning(false);
        setTimer(null);
        clearInterval(t);
        return;
      }
      // 模拟执行
      newTasks[idx].status = Math.random() > 0.1 ? 'success' : 'failed';
      newTasks[idx].duration = Math.floor(Math.random() * 1000) + 100;
      setTasks([...newTasks]);
      setPercent(Math.round((idx + 1) / total * 100));
      idx++;
    }, 200);
    setTimer(t);
  };

  const handlePause = () => {
    if (timer) clearInterval(timer);
    setRunning(false);
    setTimer(null);
  };

  const handleStop = () => {
    if (timer) clearInterval(timer);
    setRunning(false);
    setTimer(null);
    setTasks(tasks => tasks.map(t => (t.status === 'pending' || t.status === 'running') ? { ...t, status: 'pending' } : t));
    setPercent(Math.round(tasks.filter(t => t.status === 'success').length / (tasks.length || 1) * 100));
  };

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px', minHeight: '80vh' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: '32px 0 24px 0' }}>多模型对比测试</h1>
      {/* 参数设置区 */}
      <ConfigPanel config={config} onConfigChange={setConfig} />
      {/* 测试输入区 */}
      <UserInputPanel questions={questions} onQuestionsChange={setQuestions} />
      {/* 测试控制区 */}
      <TestControlPanel
        onGenerateTasks={handleGenerateTasks}
        onStart={handleStart}
        onPause={handlePause}
        onStop={handleStop}
        running={running}
        hasTasks={!!tasks.length}
      />
      {/* 结果与统计Tab区 */}
      <Card style={{ boxShadow: '0 2px 8px #f0f1f2', borderRadius: 12, marginTop: 24 }} bodyStyle={{ padding: 0 }}>
        <Tabs defaultActiveKey="compare" style={{ background: 'transparent', padding: 0 }}>
          <Tabs.TabPane tab="对比视图" key="compare">
            <div style={{ padding: 24 }}>
              <CompareTable tasks={tasks} />
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="进度与明细" key="result">
            <div style={{ padding: 24 }}>
              <CompareTable tasks={tasks} />
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="统计与引导" key="statistics">
            <div style={{ padding: 24 }}>
              <StatisticsPanel tasks={tasks} />
            </div>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default MultiModelCompare;
