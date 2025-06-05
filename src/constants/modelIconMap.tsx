// 模型图标自动匹配映射表
import OpenAIIcon from '@/assets/model-icon/openai.svg?react';
import ClaudeIcon from '@/assets/model-icon/claude-color.svg?react';
import AnthropicIcon from '@/assets/model-icon/anthropic.svg?react';
import QwenIcon from '@/assets/model-icon/qwen-color.svg?react';
import DeepSeekIcon from '@/assets/model-icon/deepseek-color.svg?react';
import GeminiIcon from '@/assets/model-icon/gemini-color.svg?react';
import GemmaIcon from '@/assets/model-icon/gemma-color.svg?react';
import GoogleIcon from '@/assets/model-icon/google-color.svg?react';
import MoonshotIcon from '@/assets/model-icon/ai360-color.svg?react';
import GrokIcon from '@/assets/model-icon/grok.svg?react';
import KimiIcon from '@/assets/model-icon/kimi-color.svg?react';
import HunyuanIcon from '@/assets/model-icon/hunyuan-color.svg?react';
import ZhipuIcon from '@/assets/model-icon/zhipu-color.svg?react';
import DoubaoIcon from '@/assets/model-icon/doubao-color.svg?react';
import JinaIcon from '@/assets/model-icon/jina.svg?react';
import DefaultAIIcon from '@/assets/model-icon/default-ai.svg?react';
import React from 'react';

const iconMap: Array<{ keyword: string | RegExp; icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>> }> = [
  { keyword: /openai|gpt|davinci|babbage|curie/i, icon: OpenAIIcon },
  { keyword: /claude/i, icon: ClaudeIcon },
  { keyword: /anthropic/i, icon: AnthropicIcon },
  { keyword: /qwen/i, icon: QwenIcon },
  { keyword: /deepseek/i, icon: DeepSeekIcon },
  { keyword: /gemini/i, icon: GeminiIcon },
  { keyword: /gemma/i, icon: GemmaIcon },
  { keyword: /google/i, icon: GoogleIcon },
  { keyword: /moonshot|ai360/i, icon: MoonshotIcon },
  { keyword: /grok/i, icon: GrokIcon },
  { keyword: /kimi/i, icon: KimiIcon },
  { keyword: /hunyuan/i, icon: HunyuanIcon },
  { keyword: /zhipu/i, icon: ZhipuIcon },
  { keyword: /doubao/i, icon: DoubaoIcon },
  { keyword: /jina/i, icon: JinaIcon },
];

export function getModelIcon(modelNameOrId: string): React.ReactNode {
  for (const { keyword, icon: Icon } of iconMap) {
    if (typeof keyword === 'string') {
      if (modelNameOrId.toLowerCase().includes(keyword.toLowerCase())) {
        return <Icon style={{ width: 20, height: 20 }} />;
      }
    } else if (keyword instanceof RegExp) {
      if (keyword.test(modelNameOrId)) {
        return <Icon style={{ width: 20, height: 20 }} />;
      }
    }
  }
  // 兜底
  return <DefaultAIIcon style={{ width: 20, height: 20, color: '#888888' }} />;
}

export default getModelIcon; 