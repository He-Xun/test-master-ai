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
    const fs = require('fs');
    
    // 详细的路径调试信息
    console.log('=== Electron 路径调试信息 ===');
    console.log('app.isPackaged:', app.isPackaged);
    console.log('process.resourcesPath:', process.resourcesPath);
    console.log('__dirname:', __dirname);
    console.log('process.cwd():', process.cwd());
    console.log('app.getPath("userData"):', app.getPath('userData'));
    console.log('app.getAppPath():', app.getAppPath());
    
    // 尝试多种路径组合
    const possiblePaths = [
      // asar.unpacked 路径（我们配置的）
      path.join(process.resourcesPath, 'app.asar.unpacked', 'build', 'index.html'),
      // 直接在resources下
      path.join(process.resourcesPath, 'build', 'index.html'),
      // app路径下
      path.join(app.getAppPath(), 'build', 'index.html'),
      // 相对于主进程的路径
      path.join(__dirname, '..', 'build', 'index.html'),
      // 开发时的路径
      path.join(__dirname, '../build/index.html'),
    ];
    
    let foundPath: string | null = null;
    console.log('=== 检查可能的HTML路径 ===');
    
    for (const testPath of possiblePaths) {
      console.log(`检查路径: ${testPath}`);
      try {
        if (fs.existsSync(testPath)) {
          console.log(`✓ 找到文件: ${testPath}`);
          foundPath = testPath;
          break;
        } else {
          console.log(`✗ 文件不存在: ${testPath}`);
        }
      } catch (error) {
        console.log(`✗ 检查路径时出错: ${testPath}`, (error as Error).message);
      }
    }
    
    if (!foundPath) {
      console.error('❌ 所有路径都找不到 index.html 文件！');
      // 作为最后的手段，尝试第一个路径
      foundPath = possiblePaths[0];
    }
    
    console.log(`最终使用路径: ${foundPath}`);
    console.log('=============================');
    
    // 尝试加载文件
    mainWindow.loadFile(foundPath!).catch(error => {
      console.error('loadFile 失败:', error);
      
      // 如果loadFile失败，尝试loadURL
      const fileUrl = `file://${foundPath}`;
      console.log(`尝试使用 loadURL: ${fileUrl}`);
      mainWindow.loadURL(fileUrl).catch(urlError => {
        console.error('loadURL 也失败:', urlError);
      });
    });
    
    // 添加更多的错误处理
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      console.error('页面加载失败:', {
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame
      });
    });
    
    mainWindow.webContents.on('dom-ready', () => {
      console.log('DOM 已准备就绪');
    });
    
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('页面加载完成');
    });
    
    // 生产环境不自动打开开发者工具
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