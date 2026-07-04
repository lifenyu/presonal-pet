import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initDatabase } from './database';
import { createTray } from './tray';
import { registerIpcHandlers } from './ipc';
import { startMonitor, stopMonitor } from './monitor';
import { startReminder, stopReminder, onUserStateChanged } from './reminder';

let mainWindow: BrowserWindow | null = null;

const PET_WINDOW_WIDTH = 200;
const PET_WINDOW_HEIGHT = 280;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: PET_WINDOW_WIDTH,
    height: PET_WINDOW_HEIGHT,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:9000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

app.whenReady().then(async () => {
  // 初始化数据库（必须 await）
  await initDatabase();

  // 注册 IPC handler
  registerIpcHandlers();

  // 创建窗口
  createWindow();

  // 创建系统托盘
  if (mainWindow) {
    createTray(mainWindow);
  }

  // 启动 V1: 使用监控
  startMonitor();

  // 启动 V1: 休息提醒
  startReminder();

  // 监听 monitor 事件，转发给 reminder 服务
  const { getMainWindow: getWin } = await import('./main');
  // monitor.ts 内部已经通过 notifyRenderer 通知渲染进程
  // reminder.ts 内部已经通过 sendReminder 通知渲染进程

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 桌宠应用关闭窗口不退出
});

app.on('before-quit', () => {
  stopMonitor();
  stopReminder();
});
