import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

let db: Database;

const DB_PATH = path.join(app.getPath('userData'), 'pet.db');

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // V0: 设置表
  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // V1: 使用记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS usage_records (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name     TEXT NOT NULL,
      window_title TEXT,
      category     TEXT NOT NULL DEFAULT 'other',
      start_time   TEXT NOT NULL,
      end_time     TEXT,
      duration     INTEGER NOT NULL DEFAULT 0
    )
  `);

  // V1: 软件分类映射表
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      app_name  TEXT PRIMARY KEY,
      category  TEXT NOT NULL
    )
  `);

  // 预置默认分类（仅首次）
  const count = db.exec("SELECT COUNT(*) FROM categories")[0]?.values[0]?.[0] as number || 0;
  if (count === 0) {
    const defaults: [string, string][] = [
      ['chrome', 'browsing'], ['msedge', 'browsing'], ['firefox', 'browsing'],
      ['code', 'learning'], ['idea64', 'learning'], ['pycharm64', 'learning'],
      ['wechat', 'chat'], ['qq', 'chat'], ['dingtalk', 'chat'], ['feishu', 'chat'],
      ['slack', 'chat'], ['telegram', 'chat'],
      ['steam', 'gaming'], ['epicgameslauncher', 'gaming'],
      ['neteasecloudmusic', 'music'], ['spotify', 'music'], ['qqmusic', 'music'],
      ['explorer', 'work'], ['winword', 'work'], ['excel', 'work'],
      ['powerpnt', 'work'], ['wps', 'work'], ['notion', 'work'],
      ['bilibili', 'video'], ['youku', 'video'], ['iqiyi', 'video'],
    ];
    const stmt = db.prepare('INSERT OR IGNORE INTO categories (app_name, category) VALUES (?, ?)');
    for (const [app, cat] of defaults) {
      stmt.run([app, cat]);
    }
    stmt.free();
  }

  saveDatabase();
  console.log('Database initialized at:', DB_PATH);
}

export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ========== V1: 使用记录 CRUD ==========

export interface UsageRecord {
  id: number;
  app_name: string;
  window_title: string | null;
  category: string;
  start_time: string;
  end_time: string | null;
  duration: number;
}

export interface CategoryStat {
  category: string;
  total_duration: number; // 秒
  record_count: number;
}

export function insertUsageRecord(
  appName: string,
  windowTitle: string,
  category: string,
  startTime: string
): number {
  const db = getDatabase();
  db.run(
    'INSERT INTO usage_records (app_name, window_title, category, start_time) VALUES (?, ?, ?, ?)',
    [appName, windowTitle, category, startTime]
  );
  saveDatabase();
  // 返回刚插入的 id
  const result = db.exec('SELECT last_insert_rowid()');
  return result[0]?.values[0]?.[0] as number || 0;
}

export function finishUsageRecord(id: number, endTime: string, duration: number): void {
  const db = getDatabase();
  db.run(
    'UPDATE usage_records SET end_time = ?, duration = ? WHERE id = ?',
    [endTime, duration, id]
  );
  saveDatabase();
}

export function getCategoryForApp(appName: string): string {
  const db = getDatabase();
  const result = db.exec(
    'SELECT category FROM categories WHERE app_name = ?',
    [appName.toLowerCase()]
  );
  return (result[0]?.values[0]?.[0] as string) || 'other';
}

export function setCategoryForApp(appName: string, category: string): void {
  const db = getDatabase();
  db.run(
    'INSERT OR REPLACE INTO categories (app_name, category) VALUES (?, ?)',
    [appName.toLowerCase(), category]
  );
  saveDatabase();
}

export function getTodayStats(): CategoryStat[] {
  const db = getDatabase();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const result = db.exec(`
    SELECT category,
           COALESCE(SUM(duration), 0) as total_duration,
           COUNT(*) as record_count
    FROM usage_records
    WHERE start_time LIKE '${today}%'
    GROUP BY category
    ORDER BY total_duration DESC
  `);
  if (!result[0]) return [];
  return result[0].values.map((row) => ({
    category: row[0] as string,
    total_duration: row[1] as number,
    record_count: row[2] as number,
  }));
}

export function getTodayRecords(): UsageRecord[] {
  const db = getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const result = db.exec(`
    SELECT id, app_name, window_title, category, start_time, end_time, duration
    FROM usage_records
    WHERE start_time LIKE '${today}%'
    ORDER BY start_time DESC
  `);
  if (!result[0]) return [];
  return result[0].values.map((row) => ({
    id: row[0] as number,
    app_name: row[1] as string,
    window_title: row[2] as string | null,
    category: row[3] as string,
    start_time: row[4] as string,
    end_time: row[5] as string | null,
    duration: row[6] as number,
  }));
}
