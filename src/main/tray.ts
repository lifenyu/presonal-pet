import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';

let tray: Tray | null = null;

function findIconPath(): string {
  // 优先使用项目根目录下的 assets/icon.png
  const appPath = app.getAppPath();
  const candidates = [
    path.join(appPath, 'assets', 'icon.png'),
    path.join(appPath, '..', 'assets', 'icon.png'),
    path.join(__dirname, '..', '..', 'assets', 'icon.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // fallback: 返回第一个（后续 nativeImage.createFromPath 会返回空图）
  return candidates[0];
}

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = findIconPath();
  let icon = nativeImage.createFromPath(iconPath);
  // 如果图标为空（路径错误），创建一个简单的 fallback
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('桌宠学习陪伴');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示桌宠',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

export function getTray(): Tray | null {
  return tray;
}
