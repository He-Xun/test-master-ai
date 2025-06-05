export interface TaskConfig {
  prompt: string;
  models: string[];
  rounds: number;
  concurrency: number;
  timeout: number;
  questions: string[];
}

export interface TaskItem {
  key: string;
  question: string;
  prompt: string;
  model: string;
  round: number;
  status: 'pending' | 'running' | 'success' | 'failed';
  duration?: number;
}
