import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { closePeriodDatabase } from "../db/periodRecords";
import { closePredictionSettingsDatabase } from "../db/predictionSettings";

const DB_FILENAME = "period-tracker.db";

// expo-sqlite 将数据库文件存放在应用文档目录的 SQLite/ 子目录下。
function getDatabaseFile(): File {
  return new File(Paths.document, "SQLite", DB_FILENAME);
}

// 在导出导入前关闭全部数据库连接，确保 WAL 日志合并到主文件。
async function closeAllDatabases(): Promise<void> {
  await closePredictionSettingsDatabase();
  await closePeriodDatabase();
}

// 导出数据库文件到系统分享面板，用户可存到本地或云盘。
export async function exportDatabase(): Promise<void> {
  // 先关闭数据库，确保 WAL checkpoint 完成，避免备份不完整。
  await closeAllDatabases();

  const dbFile = getDatabaseFile();

  if (!dbFile.exists) {
    throw new Error("数据库文件不存在，请先记录经期数据再尝试导出。");
  }

  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    throw new Error("当前设备不支持文件分享，无法导出。");
  }

  await Sharing.shareAsync(dbFile.uri, {
    mimeType: "application/octet-stream",
    dialogTitle: "导出经期数据备份",
    UTI: "public.data",
  });
}

// 从系统文件选择器选中备份文件，覆盖当前数据库完成恢复。
export async function importDatabaseFromPicker(): Promise<void> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/octet-stream",
      "application/x-sqlite3",
      "application/vnd.sqlite3",
      "*/*",
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return;
  }

  const pickedAsset = result.assets[0];

  // 关闭数据库连接，避免覆盖时文件被占用。
  await closeAllDatabases();

  const dbFile = getDatabaseFile();
  const pickedFile = new File(pickedAsset.uri);

  // 读取选中文件内容并直接覆盖写入数据库路径。
  const content = await pickedFile.bytes();

  dbFile.write(content);
}
