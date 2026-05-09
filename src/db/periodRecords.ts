import * as SQLite from "expo-sqlite";

import type { DateKey, PeriodRecord } from "../types/period";

const DATABASE_NAME = "period-tracker.db";
const TABLE_NAME = "period_records";

type PeriodRecordRow = {
  id: number;
  start_date: DateKey;
  end_date: DateKey;
  created_at: DateKey;
  updated_at: DateKey;
};

type PeriodRecordInput = {
  startDate: DateKey;
  endDate: DateKey;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getTodayDateKey(): DateKey {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);

  return databasePromise;
}

function validateDateRange(input: PeriodRecordInput): void {
  if (input.startDate > input.endDate) {
    throw new Error("开始日期不能晚于结束日期");
  }
}

// 将数据库蛇形字段映射为业务层 PeriodRecord，隔离持久化字段命名。
function mapPeriodRecordRow(row: PeriodRecordRow): PeriodRecord {
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getPeriodRecordById(id: number): Promise<PeriodRecord | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<PeriodRecordRow>(
    `SELECT id, start_date, end_date, created_at, updated_at
     FROM ${TABLE_NAME}
     WHERE id = ?`,
    id,
  );

  return row ? mapPeriodRecordRow(row) : null;
}

// 初始化经期记录表，所有公开读写方法都会依赖这张本地表。
export async function initPeriodDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

// 按开始日期倒序读取记录，保证最新经期优先展示。
export async function listPeriodRecords(): Promise<PeriodRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<PeriodRecordRow>(
    `SELECT id, start_date, end_date, created_at, updated_at
     FROM ${TABLE_NAME}
     ORDER BY start_date DESC`,
  );

  return rows.map(mapPeriodRecordRow);
}

// 创建记录前校验日期区间，并返回数据库实际插入后的完整记录。
export async function createPeriodRecord(input: PeriodRecordInput): Promise<PeriodRecord> {
  validateDateRange(input);

  const database = await getDatabase();
  const today = getTodayDateKey();
  const result = await database.runAsync(
    `INSERT INTO ${TABLE_NAME} (start_date, end_date, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    input.startDate,
    input.endDate,
    today,
    today,
  );

  const record = await getPeriodRecordById(result.lastInsertRowId);

  if (!record) {
    throw new Error("记录不存在");
  }

  return record;
}

// 更新记录时用 changes 判断目标是否存在，避免额外预查询。
export async function updatePeriodRecord(
  id: number,
  input: PeriodRecordInput,
): Promise<PeriodRecord> {
  validateDateRange(input);

  const database = await getDatabase();
  const result = await database.runAsync(
    `UPDATE ${TABLE_NAME}
     SET start_date = ?, end_date = ?, updated_at = ?
     WHERE id = ?`,
    input.startDate,
    input.endDate,
    getTodayDateKey(),
    id,
  );

  if (result.changes === 0) {
    throw new Error("记录不存在");
  }

  const record = await getPeriodRecordById(id);

  if (!record) {
    throw new Error("记录不存在");
  }

  return record;
}

// 删除单条记录：不存在时 SQLite changes 为 0，按规格不额外报错。
export async function deletePeriodRecord(id: number): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, id);
}

// 清空全部本地经期记录，用于重置本地数据。
export async function clearPeriodRecords(): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(`DELETE FROM ${TABLE_NAME}`);
}
