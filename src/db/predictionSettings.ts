import * as SQLite from "expo-sqlite";

import type { PredictionSettings } from "../types/period";

const DATABASE_NAME = "period-tracker.db";
const TABLE_NAME = "app_settings";
const CYCLE_LENGTH_KEY = "prediction_cycle_length_days";

type SettingRow = {
  value: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let databaseInstance: SQLite.SQLiteDatabase | null = null;

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME).then((db) => {
    databaseInstance = db;

    return db;
  });

  return databasePromise;
}

// 初始化应用设置表，预测设置读写都依赖这张本地 key-value 表。
export async function initPredictionSettingsDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

// 读取周期设置；没有保存值时使用智能预测。
export async function getPredictionSettings(): Promise<PredictionSettings> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<SettingRow>(
    `SELECT value FROM ${TABLE_NAME} WHERE key = ?`,
    CYCLE_LENGTH_KEY,
  );

  return {
    cycleLengthDays: row ? Number(row.value) : null,
  };
}

// 保存用户自定义周期长度，用固定周期替代智能预测。
export async function saveCycleLengthDays(cycleLengthDays: number): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT OR REPLACE INTO ${TABLE_NAME} (key, value) VALUES (?, ?)`,
    CYCLE_LENGTH_KEY,
    String(cycleLengthDays),
  );
}

// 关闭数据库连接并重置内部状态，供备份/恢复模块在文件操作前使用。
export async function closePredictionSettingsDatabase(): Promise<void> {
  if (databaseInstance) {
    await databaseInstance.closeAsync();
    databaseInstance = null;
    databasePromise = null;
  }
}

// 删除自定义周期长度，恢复智能预测。
export async function clearCycleLengthDays(): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `DELETE FROM ${TABLE_NAME} WHERE key = ?`,
    CYCLE_LENGTH_KEY,
  );
}
