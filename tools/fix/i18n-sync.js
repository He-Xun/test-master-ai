// i18n-sync.js
// 用于同步 zh-CN.json 和 en-US.json，保证结构、顺序、内容一致，并补齐缺失字段
const fs = require('fs');
const path = require('path');

const zhPath = path.resolve(__dirname, '../../src/i18n/locales/zh-CN.json');
const enPath = path.resolve(__dirname, '../../src/i18n/locales/en-US.json');

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// 递归同步结构和顺序
function syncKeys(zhObj, enObj, parentKey = '') {
  let result = Array.isArray(zhObj) ? [] : {};
  for (const key of Object.keys(zhObj)) {
    if (typeof zhObj[key] === 'object' && zhObj[key] !== null && !Array.isArray(zhObj[key])) {
      result[key] = syncKeys(zhObj[key], enObj && enObj[key] ? enObj[key] : {}, parentKey + key + '.');
    } else {
      // 优先用英文原有翻译，否则用中文
      result[key] = (enObj && enObj[key] !== undefined) ? enObj[key] : zhObj[key];
    }
  }
  return result;
}

// 递归补齐英文缺失的 key
function fillMissingKeys(zhObj, enObj) {
  for (const key of Object.keys(zhObj)) {
    if (!(key in enObj)) {
      enObj[key] = zhObj[key];
    } else if (typeof zhObj[key] === 'object' && zhObj[key] !== null && !Array.isArray(zhObj[key])) {
      fillMissingKeys(zhObj[key], enObj[key]);
    }
  }
}

// 递归去除英文多余的 key
function removeExtraKeys(zhObj, enObj) {
  for (const key of Object.keys(enObj)) {
    if (!(key in zhObj)) {
      delete enObj[key];
    } else if (typeof enObj[key] === 'object' && enObj[key] !== null && !Array.isArray(enObj[key])) {
      removeExtraKeys(zhObj[key], enObj[key]);
    }
  }
}

// 检查并补齐 admin.confirmPassword
function ensureAdminConfirmPassword(zhObj, enObj) {
  if (zhObj.admin && zhObj.admin.confirmPassword) {
    if (!enObj.admin) enObj.admin = {};
    if (!enObj.admin.confirmPassword) {
      enObj.admin.confirmPassword = 'Confirm Password';
      console.log('已补充 en-US.json 的 admin.confirmPassword 字段');
    }
  }
}

function main() {
  const zh = readJSON(zhPath);
  const en = readJSON(enPath);

  // 先补齐英文缺失的 key
  fillMissingKeys(zh, en);
  // 再去除英文多余的 key
  removeExtraKeys(zh, en);
  // 保证顺序和结构一致
  const enSynced = syncKeys(zh, en);
  // 检查并补齐 admin.confirmPassword
  ensureAdminConfirmPassword(zh, enSynced);
  // 写回英文文件
  writeJSON(enPath, enSynced);
  console.log('en-US.json 已同步并补齐，顺序与 zh-CN.json 完全一致');
}

if (require.main === module) {
  main();
}
