import { execSync } from 'child_process';
import {
  insertUsageRecord,
  finishUsageRecord,
  getCategoryForApp,
} from './database';
import { getMainWindow } from './main';
import { onUserStateChanged } from './reminder';

// 当前正在记录的使用记录
let currentRecordId: number | null = null;
let currentAppName: string = '';
let currentStartTime: Date | null = null;
let monitorTimer: ReturnType<typeof setInterval> | null = null;

// 空闲检测
let lastInputTime: Date = new Date();
let isIdle: boolean = false;
const IDLE_THRESHOLD_SEC = 60; // 60 秒无操作视为空闲

// 轮询间隔（毫秒）
const POLL_INTERVAL_MS = 5000;

/**
 * 获取当前前台窗口的进程名和窗口标题
 * 使用 PowerShell 调用 Win32 API
 */
function getForegroundWindowInfo(): { appName: string; title: string } | null {
  try {
    const psScript = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class WinAPI {
          [DllImport("user32.dll")]
          public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll", SetLastError=true)]
          public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
          [DllImport("user32.dll")]
          public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        }
"@
      $hwnd = [WinAPI]::GetForegroundWindow()
      $sb = New-Object System.Text.StringBuilder 256
      [WinAPI]::GetWindowText($hwnd, $sb, 256) | Out-Null
      $title = $sb.ToString()
      $pid = 0
      [WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
      $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Output "$($proc.ProcessName)|$title"
      }
    `.trim();

    const result = execSync(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
    }).trim();

    if (!result) return null;
    const [appName, ...titleParts] = result.split('|');
    return {
      appName: appName?.trim() || 'unknown',
      title: titleParts.join('|').trim() || '',
    };
  } catch {
    return null;
  }
}

/**
 * 获取用户空闲时间（秒）
 * 使用 Windows GetLastInputInfo
 */
function getIdleTimeSeconds(): number {
  try {
    const psScript = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public struct LASTINPUTINFO {
          public uint cbSize;
          public uint dwTime;
        }
        public class IdleDetector {
          [DllImport("user32.dll")]
          public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
          [DllImport("kernel32.dll")]
          public static extern uint GetTickCount();
        }
"@
      $lii = New-Object LASTINPUTINFO
      $lii.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($lii)
      [IdleDetector]::GetLastInputInfo([ref]$lii) | Out-Null
      $tick = [IdleDetector]::GetTickCount()
      $idle = ($tick - $lii.dwTime) / 1000
      Write-Output $idle
    `.trim();

    const result = execSync(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
    }).trim();

    return parseFloat(result) || 0;
  } catch {
    return 0;
  }
}

/**
 * 结束当前记录
 */
function finishCurrentRecord(): void {
  if (currentRecordId !== null && currentStartTime) {
    const now = new Date();
    const duration = Math.floor((now.getTime() - currentStartTime.getTime()) / 1000);
    if (duration > 0) {
      finishUsageRecord(currentRecordId, now.toISOString(), duration);
    }
    currentRecordId = null;
    currentAppName = '';
    currentStartTime = null;
  }
}

/**
 * 轮询前台窗口
 */
function poll(): void {
  // 空闲检测
  const idleSec = getIdleTimeSeconds();
  if (idleSec >= IDLE_THRESHOLD_SEC) {
    if (!isIdle) {
      isIdle = true;
      finishCurrentRecord();
      onUserStateChanged(false); // 通知提醒服务用户空闲
      notifyRenderer('idle');
    }
    return;
  }

  // 用户活跃
  if (isIdle) {
    isIdle = false;
    onUserStateChanged(true); // 通知提醒服务用户活跃
    notifyRenderer('active');
  }

  const info = getForegroundWindowInfo();
  if (!info) return;

  const { appName, title } = info;

  // 如果窗口没变化，不做任何事
  if (appName === currentAppName) return;

  // 窗口切换：结束旧记录，开始新记录
  finishCurrentRecord();

  const category = getCategoryForApp(appName);
  const now = new Date();
  currentRecordId = insertUsageRecord(appName, title, category, now.toISOString());
  currentAppName = appName;
  currentStartTime = now;

  // 通知渲染进程当前应用变化
  notifyRenderer('app-changed', { appName, title, category });
}

/**
 * 通知渲染进程
 */
function notifyRenderer(event: string, data?: unknown): void {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('monitor:event', { event, data, time: new Date().toISOString() });
  }
}

/**
 * 启动监控
 */
export function startMonitor(): void {
  if (monitorTimer) return;
  console.log('Starting usage monitor...');
  monitorTimer = setInterval(poll, POLL_INTERVAL_MS);
  // 立即执行一次
  poll();
}

/**
 * 停止监控
 */
export function stopMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  finishCurrentRecord();
  console.log('Usage monitor stopped.');
}

/**
 * 获取当前前台应用信息
 */
export function getCurrentApp(): { appName: string; title: string; category: string; startTime: string | null } {
  return {
    appName: currentAppName,
    title: '',
    category: currentAppName ? getCategoryForApp(currentAppName) : 'other',
    startTime: currentStartTime?.toISOString() || null,
  };
}
