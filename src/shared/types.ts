// IPC 通道名称常量
export const IPC_CHANNELS = {
  // V0
  APP_GET_VERSION: 'app:getVersion',
  APP_QUIT: 'app:quit',
  WINDOW_TOGGLE_SETTINGS: 'window:toggleSettings',

  // V1: 使用监控
  USAGE_GET_TODAY_STATS: 'usage:getTodayStats',
  USAGE_GET_TODAY_RECORDS: 'usage:getTodayRecords',
  USAGE_UPDATE_CATEGORY: 'usage:updateCategory',
  MONITOR_GET_CURRENT_APP: 'monitor:getCurrentApp',

  // V1: 提醒
  REMINDER_DISMISS: 'reminder:dismiss',
} as const;

// 桌宠视图类型
export type ViewType = 'pet' | 'settings' | 'stats';

// 分类统计
export interface CategoryStat {
  category: string;
  total_duration: number; // 秒
  record_count: number;
}

// 使用记录
export interface UsageRecord {
  id: number;
  app_name: string;
  window_title: string | null;
  category: string;
  start_time: string;
  end_time: string | null;
  duration: number;
}

// 当前应用信息
export interface CurrentAppInfo {
  appName: string;
  title: string;
  category: string;
  startTime: string | null;
}

// 提醒数据
export interface ReminderData {
  id: string;
  emoji: string;
  message: string;
  time: string;
}

// ElectronAPI 接口（preload 暴露给渲染进程的方法）
export interface ElectronAPI {
  // V0
  getAppVersion: () => Promise<string>;
  quitApp: () => void;
  toggleSettings: (visible: boolean) => void;

  // V1: 使用监控
  getTodayStats: () => Promise<CategoryStat[]>;
  getTodayRecords: () => Promise<UsageRecord[]>;
  getCurrentApp: () => Promise<CurrentAppInfo>;
  updateCategory: (appName: string, category: string) => void;

  // V1: 提醒
  dismissReminder: (ruleId: string, delayMinutes?: number) => void;

  // V1: 事件监听
  onMonitorEvent: (callback: (data: { event: string; data?: unknown; time: string }) => void) => () => void;
  onReminderShow: (callback: (data: ReminderData) => void) => () => void;
}

// 应用设置
export interface AppSettings {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  reminderEnabled: boolean;
  reminderInterval: number; // 分钟
}

// 分类枚举
export const CATEGORIES = [
  { key: 'work', label: '工作', emoji: '💼' },
  { key: 'learning', label: '学习', emoji: '📚' },
  { key: 'browsing', label: '浏览', emoji: '🌐' },
  { key: 'chat', label: '聊天', emoji: '💬' },
  { key: 'music', label: '音乐', emoji: '🎵' },
  { key: 'video', label: '看剧', emoji: '🎬' },
  { key: 'gaming', label: '游戏', emoji: '🎮' },
  { key: 'other', label: '其他', emoji: '📦' },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];
