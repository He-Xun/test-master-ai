import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import * as path from 'path';

const isDev = process.env.NODE_ENV === 'development';

// 设置用户数据目录，确保数据持久化
if (isDev) {
  // 开发模式下使用固定的数据目录
  const userDataPath = path.join(__dirname, '../userData');
  app.setPath('userData', userDataPath);
}

// 存储数据
let storeData: { [key: string]: any } = {};

function createWindow(): void {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // 确保localStorage可以正常工作
      partition: 'persist:main',
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    show: false,
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5678');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境下的资源加载
    const fs = require('fs');
    
    console.log('=== Electron 生产环境启动 ===');
    console.log('app.isPackaged:', app.isPackaged);
    console.log('process.resourcesPath:', process.resourcesPath);
    console.log('__dirname:', __dirname);
    
    // 简化路径查找逻辑
    let indexPath: string;
    
    if (app.isPackaged) {
      // 检查环境变量是否强制打开DevTools
      if (process.env.OPEN_DEVTOOLS === 'true') {
        mainWindow.webContents.openDevTools();
      }
      // 打包后的路径
      indexPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
    } else {
      // 开发构建的路径
      indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    }
    
    console.log('尝试加载文件:', indexPath);
    
    // 检查文件是否存在
    if (fs.existsSync(indexPath)) {
      console.log('✅ 文件存在，开始加载');
      
      mainWindow.loadFile(indexPath).catch(error => {
        console.error('❌ loadFile失败:', error);
        // 如果loadFile失败，显示错误页面
        mainWindow.loadURL(`data:text/html,<h1>应用加载失败</h1><p>文件路径: ${indexPath}</p><p>错误: ${error.message}</p>`);
      });
    } else {
      console.error('❌ 文件不存在:', indexPath);
      // 显示文件不存在的错误
      mainWindow.loadURL(`data:text/html,<h1>文件未找到</h1><p>路径: ${indexPath}</p><p>请检查应用是否正确构建</p>`);
    }
    
    // 添加错误监听
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('页面加载失败:', errorCode, errorDescription);
    });
    
    mainWindow.webContents.on('dom-ready', () => {
      console.log('✅ DOM加载完成');
    });
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 在开发模式下显示数据目录信息
    if (isDev) {
      console.log('用户数据目录:', app.getPath('userData'));
      console.log('应用数据目录:', app.getPath('appData'));
    }
  });
}

// 设置IPC处理程序
ipcMain.handle('electron-store-get-data', () => {
  return storeData;
});

ipcMain.handle('electron-store-set', (event, key: string, value: any) => {
  storeData[key] = value;
  return true;
});

ipcMain.handle('electron-store-get', (event, key: string, defaultValue?: any) => {
  return storeData[key] !== undefined ? storeData[key] : defaultValue;
});

ipcMain.handle('electron-store-delete', (event, key: string) => {
  delete storeData[key];
  return true;
});

// 这个方法将在 Electron 完成初始化并准备创建浏览器窗口时调用
app.whenReady().then(createWindow);

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 设置应用菜单
const template: Electron.MenuItemConstructorOptions[] = [
  {
    label: '文件',
    submenu: [
      {
        label: '退出',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: '编辑',
    submenu: [
      { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
      { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
      { type: 'separator' },
      { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
      { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
      { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
    ],
  },
  {
    label: '视图',
    submenu: [
      { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
      { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
      { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
      { type: 'separator' },
      { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
      { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
      { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
      { type: 'separator' },
      { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
    ],
  },
  {
    label: '帮助',
    submenu: [
      {
        label: '关于',
        click: () => {
          // 可以在这里添加关于对话框
        },
      },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

if (process.env.NODE_ENV === 'development') {
  // 只在开发环境加载dotenv
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} 