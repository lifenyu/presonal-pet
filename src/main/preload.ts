import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  ElectronAPI,
  CategoryStat,
  UsageRecord,
  CurrentAppInfo,
  ReminderData,
} from '../shared/types';

const electronAPI: ElectronAPI = {
  // V0
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  quitApp: () => ipcRenderer.send(IPC_CHANNELS.APP_QUIT),
  toggleSettings: (visible: boolean) =>
    ipcRenderer.send(IPC_CHANNELS.WINDOW_TOGGLE_SETTINGS, visible),

  // V1: 使用监控
  getTodayStats: () => ipcRenderer.invoke(IPC_CHANNELS.USAGE_GET_TODAY_STATS),
  getTodayRecords: () => ipcRenderer.invoke(IPC_CHANNELS.USAGE_GET_TODAY_RECORDS),
  getCurrentApp: () => ipcRenderer.invoke(IPC_CHANNELS.MONITOR_GET_CURRENT_APP),
  updateCategory: (appName: string, category: string) =>
    ipcRenderer.send(IPC_CHANNELS.USAGE_UPDATE_CATEGORY, appName, category),

  // V1: 提醒
  dismissReminder: (ruleId: string, delayMinutes?: number) =>
    ipcRenderer.send(IPC_CHANNELS.REMINDER_DISMISS, ruleId, delayMinutes),

  // V1: 事件监听
  onMonitorEvent: (callback: (data: { event: string; data?: unknown; time: string }) => void) => {
    const handler = (_event: unknown, data: { event: string; data?: unknown; time: string }) => callback(data);
    ipcRenderer.on('monitor:event', handler);
    return () => ipcRenderer.removeListener('monitor:event', handler);
  },
  onReminderShow: (callback: (data: ReminderData) => void) => {
    const handler = (_event: unknown, data: ReminderData) => callback(data);
    ipcRenderer.on('reminder:show', handler);
    return () => ipcRenderer.removeListener('reminder:show', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
