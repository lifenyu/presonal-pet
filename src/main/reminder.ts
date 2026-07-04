import { BrowserWindow } from 'electron';
import { getMainWindow } from './main';

// 提醒规则
interface ReminderRule {
  id: string;
  intervalMinutes: number; // 触发间隔（分钟）
  message: string;
  emoji: string;
  lastTriggered: Date | null;
}

const rules: ReminderRule[] = [
  {
    id: 'water',
    intervalMinutes: 45,
    message: '该喝水啦！保持水分充足有助于集中注意力 💧',
    emoji: '💧',
    lastTriggered: null,
  },
  {
    id: 'eyes',
    intervalMinutes: 20,
    message: '20-20-20 护眼法则：看 20 英尺外的物体 20 秒 👁️',
    emoji: '👁️',
    lastTriggered: null,
  },
  {
    id: 'rest',
    intervalMinutes: 90,
    message: '已经连续工作很久了，站起来活动一下吧！🏃',
    emoji: '🏃',
    lastTriggered: null,
  },
];

let reminderTimer: ReturnType<typeof setInterval> | null = null;
let userActiveSince: Date = new Date(); // 用户最近一次活跃时间
let isUserIdle: boolean = false;

/**
 * 通知渲染进程显示提醒
 */
function sendReminder(rule: ReminderRule): void {
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return;

  win.webContents.send('reminder:show', {
    id: rule.id,
    emoji: rule.emoji,
    message: rule.message,
    time: new Date().toISOString(),
  });
}

/**
 * 检查是否需要触发提醒
 */
function checkReminders(): void {
  if (isUserIdle) return; // 用户空闲时不提醒

  const now = new Date();
  const activeMinutes = (now.getTime() - userActiveSince.getTime()) / 60000;

  for (const rule of rules) {
    // 检查是否达到间隔
    const minutesSinceLastTrigger = rule.lastTriggered
      ? (now.getTime() - rule.lastTriggered.getTime()) / 60000
      : Infinity;

    if (minutesSinceLastTrigger >= rule.intervalMinutes && activeMinutes >= rule.intervalMinutes) {
      sendReminder(rule);
      rule.lastTriggered = now;
    }
  }
}

/**
 * 启动提醒服务
 */
export function startReminder(): void {
  if (reminderTimer) return;
  console.log('Starting reminder service...');
  userActiveSince = new Date();
  reminderTimer = setInterval(checkReminders, 30000); // 每 30 秒检查一次
}

/**
 * 停止提醒服务
 */
export function stopReminder(): void {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
  console.log('Reminder service stopped.');
}

/**
 * 通知用户状态变化（由 monitor 调用）
 */
export function onUserStateChanged(active: boolean): void {
  if (active) {
    if (isUserIdle) {
      // 从空闲恢复，重置活跃时间
      userActiveSince = new Date();
    }
    isUserIdle = false;
  } else {
    isUserIdle = true;
  }
}

/**
 * 用户关闭提醒时调用
 */
export function dismissReminder(ruleId: string, delayMinutes?: number): void {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return;

  if (delayMinutes) {
    // 延迟：将 lastTriggered 设为现在，相当于延迟 delayMinutes 后再提醒
    rule.lastTriggered = new Date();
  } else {
    // 直接关闭：将 lastTriggered 设为现在
    rule.lastTriggered = new Date();
  }
}

/**
 * 获取所有规则（用于设置页展示）
 */
export function getReminderRules(): Array<{ id: string; intervalMinutes: number; message: string; emoji: string }> {
  return rules.map(({ id, intervalMinutes, message, emoji }) => ({
    id,
    intervalMinutes,
    message,
    emoji,
  }));
}

/**
 * 更新规则间隔
 */
export function updateReminderInterval(ruleId: string, minutes: number): void {
  const rule = rules.find((r) => r.id === ruleId);
  if (rule) {
    rule.intervalMinutes = minutes;
  }
}
