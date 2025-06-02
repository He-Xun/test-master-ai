import { test, expect } from '@playwright/test';
import fs from 'fs';

const APP_URL = 'http://localhost:5678'; // 根据实际端口调整
const EXPORT_FILE = 'sqlite-export.bin';

// 浏览器端脚本：自动导出 IndexedDB 的 SQLite 数据库快照
const EXPORT_SCRIPT = `
(async function exportIndexedDB() {
  const dbName = 'ApiTestToolDB';
  const storeName = 'database';
  const key = 'api_test_tool.db';
  const request = indexedDB.open(dbName, 1);
  return await new Promise((resolve, reject) => {
    request.onsuccess = function () {
      const db = request.result;
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = function () {
        const data = getReq.result;
        if (!data) return reject('未找到数据库快照！');
        resolve(data);
      };
      getReq.onerror = function () { reject('读取数据库失败'); };
    };
    request.onerror = function () { reject('打开IndexedDB失败'); };
  });
})();
`;

test('注册用户-刷新-自动导出-验证SQLite用户', async ({ page, context }) => {
  // 1. 打开应用
  await page.goto(APP_URL);

  // 2. 注册新用户
  await page.getByText('注册').click();
  await page.getByPlaceholder('请输入用户名').fill('e2euser');
  await page.getByPlaceholder('请输入邮箱').fill('e2euser@test.com');
  await page.getByPlaceholder('请输入密码').fill('e2epass');
  await page.getByPlaceholder('请再次输入密码').fill('e2epass');
  await page.getByRole('button', { name: '立即注册' }).click();
  await expect(page.getByText('注册成功')).toBeVisible({ timeout: 5000 });

  // 3. 刷新页面
  await page.reload();

  // 4. 登录新用户
  await page.getByPlaceholder('请输入用户名').fill('e2euser');
  await page.getByPlaceholder('请输入密码').fill('e2epass');
  await page.getByRole('button', { name: '立即登录' }).click();
  await expect(page.getByText('e2euser')).toBeVisible({ timeout: 5000 });

  // 5. 浏览器端导出 IndexedDB
  const dbData = await page.evaluate(EXPORT_SCRIPT);
  // 保存为本地文件
  fs.writeFileSync(EXPORT_FILE, Buffer.from(dbData));

  // 6. 用 sql.js 验证 SQLite 用户表
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(EXPORT_FILE)));
  const users = db.exec('SELECT username, email FROM users');
  const userRows = users[0]?.values || [];
  const usernames = userRows.map(row => row[0]);
  expect(usernames).toContain('e2euser');

  const pw = db.exec('SELECT * FROM user_passwords');
  console.log('SQLite 密码表内容:');
  if (pw.length) {
    for (const row of pw[0].values) {
      console.log({
        user_id: row[0],
        password_hash: row[1],
      });
    }
  } else {
    console.log('没有密码数据！');
  }
});