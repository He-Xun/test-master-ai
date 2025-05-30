"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const isDev = process.env.NODE_ENV === 'development';
// 设置用户数据目录，确保数据持久化
if (isDev) {
    // 开发模式下使用固定的数据目录
    const userDataPath = path.join(__dirname, '../userData');
    electron_1.app.setPath('userData', userDataPath);
}
// 存储数据
let storeData = {};
function createWindow() {
    // 创建浏览器窗口
    const mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
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
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }
    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // 在开发模式下显示数据目录信息
        if (isDev) {
            console.log('用户数据目录:', electron_1.app.getPath('userData'));
            console.log('应用数据目录:', electron_1.app.getPath('appData'));
        }
    });
}
// 设置IPC处理程序
electron_1.ipcMain.handle('electron-store-get-data', () => {
    return storeData;
});
electron_1.ipcMain.handle('electron-store-set', (event, key, value) => {
    storeData[key] = value;
    return true;
});
electron_1.ipcMain.handle('electron-store-get', (event, key, defaultValue) => {
    return storeData[key] !== undefined ? storeData[key] : defaultValue;
});
electron_1.ipcMain.handle('electron-store-delete', (event, key) => {
    delete storeData[key];
    return true;
});
// 这个方法将在 Electron 完成初始化并准备创建浏览器窗口时调用
electron_1.app.whenReady().then(createWindow);
// 当所有窗口都关闭时退出应用
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// 设置应用菜单
const template = [
    {
        label: '文件',
        submenu: [
            {
                label: '退出',
                accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                click: () => {
                    electron_1.app.quit();
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
const menu = electron_1.Menu.buildFromTemplate(template);
electron_1.Menu.setApplicationMenu(menu);
