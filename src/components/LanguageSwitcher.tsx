import React from 'react';
import { Select, Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { setStoredLanguage } from '../i18n';

const { Option } = Select;

interface LanguageSwitcherProps {
  style?: 'button' | 'select';
  size?: 'small' | 'middle' | 'large';
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  style = 'select', 
  size = 'middle',
  className = ''
}) => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setStoredLanguage(languageCode);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  if (style === 'button') {
    return (
      <Button
        type="text"
        icon={<GlobalOutlined />}
        size={size}
        className={`text-gray-600 hover:text-blue-500 ${className}`}
        onClick={() => {
          // 切换到下一个语言
          const currentIndex = languages.findIndex(lang => lang.code === i18n.language);
          const nextIndex = (currentIndex + 1) % languages.length;
          handleLanguageChange(languages[nextIndex].code);
        }}
      >
        {currentLanguage.flag} {currentLanguage.label}
      </Button>
    );
  }

  return (
    <Select
      value={i18n.language}
      onChange={handleLanguageChange}
      size={size}
      className={className}
      style={{ minWidth: 120 }}
      suffixIcon={<GlobalOutlined />}
    >
      {languages.map(lang => (
        <Option key={lang.code} value={lang.code}>
          <span className="flex items-center space-x-2">
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </span>
        </Option>
      ))}
    </Select>
  );
};

export default LanguageSwitcher; 