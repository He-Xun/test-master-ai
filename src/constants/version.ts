import pkg from '../../package.json';

// 应用版本信息
export const APP_VERSION = pkg.version;
export const BUILD_DATE = '2024-05-31';
export const APP_NAME = '智测师 TestMaster AI';

// 更新检查配置
export const UPDATE_CHECK_URL = 'https://github.com/He-Xun/test-master-ai/releases/latest';
export const RELEASE_NOTES_URL = 'https://github.com/He-Xun/test-master-ai/releases';

// 版本历史
export const VERSION_HISTORY = [
  { version: '1.0.0', date: '2024-05-31', type: '首个正式版' },
];