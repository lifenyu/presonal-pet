import { ipcMain, app, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import { getMainWindow } from './main';
import { getTodayStats, getTodayRecords, setCategoryForApp } from './database';
import { getCurrentApp } from './monitor';
import { dismissReminder } from './reminder';

export function registerIpcHandlers(): void {
  // ========== V0 ==========

  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.on(IPC_CHANNELS.APP_QUIT, () => {
    app.quit();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_TOGGLE_SETTINGS, (_event, visible: boolean) => {
    const win = getMainWindow();
    if (!win) return;
    if (visible) {
      win.setSize(400, 500);
      win.setResizable(true);
      win.center();
    } else {
      win.setSize(200, 280);
      win.setResizable(false);
    }
  });

  // ========== V1: 使用监控 ==========

  ipcMain.handle(IPC_CHANNELS.USAGE_GET_TODAY_STATS, () => {
    return getTodayStats();
  });

  ipcMain.handle(IPC_CHANNELS.USAGE_GET_TODAY_RECORDS, () => {
    return getTodayRecords();
  });

  ipcMain.handle(IPC_CHANNELS.MONITOR_GET_CURRENT_APP, () => {
    return getCurrentApp();
  });

  ipcMain.on(IPC_CHANNELS.USAGE_UPDATE_CATEGORY, (_event, appName: string, category: string) => {
    setCategoryForApp(appName, category);
  });

  // ========== V1: 提醒 ==========

  ipcMain.on(IPC_CHANNELS.REMINDER_DISMISS, (_event, ruleId: string, delayMinutes?: number) => {
    dismissReminder(ruleId, delayMinutes);
  });
}
