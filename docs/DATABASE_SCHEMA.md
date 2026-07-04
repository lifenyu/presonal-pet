# 数据库设计

## 数据库引擎
sql.js (WebAssembly SQLite)，数据文件存储在 Electron userData 目录。

## V0 表

### app_settings — 应用设置
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```
存储键值对配置，如 AI API 配置、提醒设置等。

## V1 预留表

### usage_records — 软件使用记录
```sql
CREATE TABLE IF NOT EXISTS usage_records (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name   TEXT NOT NULL,        -- 应用名称
  window_title TEXT,               -- 窗口标题
  category   TEXT NOT NULL DEFAULT 'other', -- 分类
  start_time TEXT NOT NULL,        -- 开始时间 ISO8601
  end_time   TEXT,                 -- 结束时间
  duration   INTEGER NOT NULL DEFAULT 0 -- 时长(秒)
);
```

### categories — 软件分类
```sql
CREATE TABLE IF NOT EXISTS categories (
  app_name  TEXT PRIMARY KEY,
  category  TEXT NOT NULL -- learning/gaming/video/chat/work/browsing/other
);
```

### chat_history — 对话历史
```sql
CREATE TABLE IF NOT EXISTS chat_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  role       TEXT NOT NULL,  -- 'user' | 'assistant'
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 分类枚举
| 值 | 含义 |
|------|------|
| `learning` | 学习 |
| `gaming` | 游戏 |
| `video` | 看剧 |
| `chat` | 聊天 |
| `work` | 工作 |
| `browsing` | 浏览 |
| `other` | 其他 |
