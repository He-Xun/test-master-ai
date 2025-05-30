import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译文件
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

// 获取存储的语言设置
const getStoredLanguage = (): string => {
  const stored = localStorage.getItem('app-language');
  return stored || 'zh-CN'; // 默认中文
};

// 保存语言设置
export const setStoredLanguage = (language: string): void => {
  localStorage.setItem('app-language', language);
};

const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLanguage(), // 使用存储的语言或默认语言
    fallbackLng: 'zh-CN', // 后备语言
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React已经进行了XSS保护
    },
    
    detection: {
      // 语言检测配置
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n; 