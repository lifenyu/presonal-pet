# 架构设计文档

## 进程模型

```
┌─────────────────────────────────────────────────────┐
│                    Electron App                      │
│                                                      │
│  ┌──────────────────────┐  ┌───────────────────────┐ │
│  │     Main Process     │  │   Renderer Process    │ │
│  │     (Node.js)        │  │   (Chromium)          │ │
│  │                      │  │                       │ │
│  │  ┌──────────────┐    │  │  ┌─────────────────┐  │ │
│  │  │ Window Mgr   │    │  │  │  React App      │  │ │
│  │  │ Tray Mgr     │    │  │  │  ┌───────────┐  │  │ │
│  │  │ IPC Handlers │◄───┼──┼──┤  │PetWindow  │  │  │ │
│  │  │ Database     │    │  │  │  │Settings   │  │  │ │
│  │  │ Monitor Svc  │    │  │  │  └───────────┘  │  │ │
│  │  │ AI Service   │    │  │  └─────────────────┘  │ │
│  │  └──────────────┘    │  └───────────────────────┘ │
│  └──────────────────────┘                            │
│                      ▲                               │
│                      │ preload.ts                    │
│                  (contextBridge)                      │
└─────────────────────────────────────────────────────┘
```

## 职责边界

### 主进程 (src/main/)
| 模块 | 职责 |
|------|------|
| `main.ts` | app 生命周期、窗口创建与管理 |
| `tray.ts` | 系统托盘图标与菜单 |
| `ipc.ts` | 集中注册所有 IPC handler |
| `database.ts` | SQLite 数据库初始化、CRUD 操作 |
| `preload.ts` | contextBridge 安全暴露 API |

### 渲染进程 (src/renderer/)
| 模块 | 职责 |
|------|------|
| `App.tsx` | 根组件，页面路由 |
| `components/PetWindow.tsx` | 桌宠 UI、交互 |
| `pages/Settings.tsx` | 设置页面 |

### 共享层 (src/shared/)
| 模块 | 职责 |
|------|------|
| `types.ts` | IPC channel 常量、共享接口类型 |

## 数据流

```
用户操作 → React 组件 → window.electronAPI.xxx()
  → preload.ts (contextBridge)
  → ipcMain.handle() → 主进程业务逻辑
  → database.ts (读写 SQLite)
  → 返回结果 → 渲染进程更新 UI
```

## 安全模型
- `contextIsolation: true` — 渲染进程无法直接访问 Node.js
- `nodeIntegration: false` — 禁止渲染进程使用 require
- 所有通信通过 preload 暴露的有限 API
- 预加载脚本是唯一的桥梁

## 技术选型

| 技术 | 选择 | 理由 |
|------|------|------|
| 框架 | Electron | 跨平台桌面应用，生态成熟 |
| UI | React 19 | 组件化、生态丰富 |
| 类型 | TypeScript | 类型安全，减少运行时错误 |
| 数据库 | sql.js | 纯 JS SQLite，无需编译原生模块 |
| 构建 | Webpack + ts-loader | 成熟稳定，HMR 支持 |
| 样式 | CSS | V0 阶段保持简单，后续可迁移 |

## 目录结构
```
pet/
├── docs/                # 文档
├── assets/              # 静态资源（图标）
├── src/
│   ├── main/            # Electron 主进程
│   ├── renderer/        # React 渲染进程
│   │   ├── components/  # 通用组件
│   │   ├── pages/       # 页面
│   │   └── styles/      # 样式
│   └── shared/          # 共享类型
└── dist/                # 构建输出（gitignore）
```
