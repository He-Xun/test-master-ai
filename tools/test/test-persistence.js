// 测试localStorage持久化的脚本
const { app, BrowserWindow } = require('electron');
const path = require('path');

// 设置用户数据目录
const userDataPath = path.join(__dirname, 'userData');
app.setPath('userData', userDataPath);

console.log('用户数据目录:', app.getPath('userData'));

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      partition: 'persist:main',
    },
    show: false
  });

  // 加载一个简单的HTML页面来测试localStorage
  win.loadURL('data:text/html,<html><body><script>' +
    'console.log("测试localStorage...");' +
    'localStorage.setItem("test", "hello world");' +
    'console.log("保存的数据:", localStorage.getItem("test"));' +
    'console.log("所有localStorage数据:", JSON.stringify(localStorage));' +
    '</script></body></html>'
  );

  win.webContents.openDevTools();
  win.show();

  // 5秒后关闭应用
  setTimeout(() => {
    console.log('测试完成，关闭应用');
    app.quit();
  }, 5000);
}); 