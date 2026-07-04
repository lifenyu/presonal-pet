import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  insertUsageRecord,
  finishUsageRecord,
  getCategoryForApp,
} from './database';
import { getMainWindow } from './main';
import { onUserStateChanged } from './reminder';

let currentRecordId: number | null = null;
let currentAppName: string = '';
let currentStartTime: Date | null = null;
let monitorTimer: ReturnType<typeof setInterval> | null = null;
let isIdle: boolean = false;
const IDLE_THRESHOLD_SEC = 60;
const POLL_INTERVAL_MS = 5000;

// 写入临时 .ps1 文件避免 here-string 解析问题
const PS_FOREGROUND = join(tmpdir(), 'pet-foreground.ps1');
const PS_IDLE = join(tmpdir(), 'pet-idle.ps1');

const foregroundScript = `Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
  public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
$hwnd = [WinAPI]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 512
[WinAPI]::GetWindowText($hwnd, $sb, 512) | Out-Null
$title = $sb.ToString()
$processId = 0
[WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
$proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
if ($proc) {
  Write-Output "$($proc.ProcessName)|$title"
}
`;

const idleScript = `Add-Type -TypeDefinition @"
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
`;

// 初始化时写入临时脚本文件
function initScripts(): void {
  writeFileSync(PS_FOREGROUND, foregroundScript, 'utf-8');
  writeFileSync(PS_IDLE, idleScript, 'utf-8');
}

function cleanupScripts(): void {
  try { unlinkSync(PS_FOREGROUND); } catch {}
  try { unlinkSync(PS_IDLE); } catch {}
}

function getForegroundWindowInfo(): { appName: string; title: string } | null {
  try {
    const result = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${PS_FOREGROUND}"`,
      { encoding: 'utf-8', timeout: 8000, windowsHide: true }
    ).trim();
    if (!result) return null;
    const parts = result.split('|');
    return {
      appName: parts[0]?.trim() || 'unknown',
      title: parts.slice(1).join('|').trim() || '',
    };
  } catch {
    return null;
  }
}

function getIdleTimeSeconds(): number {
  try {
    const result = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${PS_IDLE}"`,
      { encoding: 'utf-8', timeout: 5000, windowsHide: true }
    ).trim();
    return parseFloat(result) || 0;
  } catch {
    return 0;
  }
}

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

function notifyRenderer(event: string, data?: unknown): void {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('monitor:event', { event, data, time: new Date().toISOString() });
  }
}

function poll(): void {
  const idleSec = getIdleTimeSeconds();
  if (idleSec >= IDLE_THRESHOLD_SEC) {
    if (!isIdle) {
      isIdle = true;
      finishCurrentRecord();
      onUserStateChanged(false);
      notifyRenderer('idle');
    }
    return;
  }

  if (isIdle) {
    isIdle = false;
    onUserStateChanged(true);
    notifyRenderer('active');
  }

  const info = getForegroundWindowInfo();
  if (!info) return;
  if (info.appName === currentAppName) return;

  finishCurrentRecord();
  const category = getCategoryForApp(info.appName);
  const now = new Date();
  currentRecordId = insertUsageRecord(info.appName, info.title, category, now.toISOString());
  currentAppName = info.appName;
  currentStartTime = now;
  notifyRenderer('app-changed', { appName: info.appName, title: info.title, category });
}

export function startMonitor(): void {
  if (monitorTimer) return;
  initScripts();
  console.log('Starting usage monitor...');
  monitorTimer = setInterval(poll, POLL_INTERVAL_MS);
  poll();
}

export function stopMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  finishCurrentRecord();
  cleanupScripts();
  console.log('Usage monitor stopped.');
}

export function getCurrentApp(): { appName: string; title: string; category: string; startTime: string | null } {
  return {
    appName: currentAppName,
    title: '',
    category: currentAppName ? getCategoryForApp(currentAppName) : 'other',
    startTime: currentStartTime?.toISOString() || null,
  };
}
