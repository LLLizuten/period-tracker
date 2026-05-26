/**
 * @jest-environment node
 */

import {
  clearCycleLengthDays,
  getPredictionSettings,
  initPredictionSettingsDatabase,
  saveCycleLengthDays,
} from "./predictionSettings";

const mockExecAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockRunAsync = jest.fn();
const mockOpenDatabaseAsync = jest.fn(() => Promise.resolve({
  execAsync: mockExecAsync,
  getFirstAsync: mockGetFirstAsync,
  runAsync: mockRunAsync,
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: (...args: Parameters<typeof mockOpenDatabaseAsync>) => mockOpenDatabaseAsync(...args),
}));

describe("prediction settings database", () => {
  beforeEach(() => {
    mockExecAsync.mockClear();
    mockGetFirstAsync.mockReset();
    mockRunAsync.mockClear();
    mockOpenDatabaseAsync.mockClear();
  });

  test("默认读取智能预测设置", async () => {
    mockGetFirstAsync.mockResolvedValue(null);

    await expect(getPredictionSettings()).resolves.toEqual({
      cycleLengthDays: null,
    });
  });

  test("读取保存的周期字符串为数字", async () => {
    mockGetFirstAsync.mockResolvedValue({ value: "30" });

    await expect(getPredictionSettings()).resolves.toEqual({
      cycleLengthDays: 30,
    });
  });

  test("保存周期使用固定 key 写入设置表", async () => {
    await saveCycleLengthDays(30);

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO app_settings"),
      "prediction_cycle_length_days",
      "30",
    );
  });

  test("清空周期删除固定 key", async () => {
    await clearCycleLengthDays();

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM app_settings"),
      "prediction_cycle_length_days",
    );
  });

  test("初始化会创建设置表", async () => {
    await initPredictionSettingsDatabase();

    expect(mockExecAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS app_settings"),
    );
  });
});
