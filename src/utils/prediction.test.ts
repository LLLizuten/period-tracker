/**
 * @jest-environment node
 */

// 纯工具测试不依赖 Expo Web API polyfill，先恢复 preset 备份的 Node 原生实现。
const nodeGlobal = globalThis as typeof globalThis & {
  originalStructuredClone: typeof structuredClone;
  originalTextDecoder: typeof TextDecoder;
  originalURL: typeof URL;
  originalURLSearchParams: typeof URLSearchParams;
};

Object.defineProperties(globalThis, {
  __ExpoImportMetaRegistry: {
    configurable: true,
    value: {},
    writable: true,
  },
  structuredClone: {
    configurable: true,
    value: nodeGlobal.originalStructuredClone,
    writable: true,
  },
  TextDecoder: {
    configurable: true,
    value: nodeGlobal.originalTextDecoder,
    writable: true,
  },
  URL: {
    configurable: true,
    value: nodeGlobal.originalURL,
    writable: true,
  },
  URLSearchParams: {
    configurable: true,
    value: nodeGlobal.originalURLSearchParams,
    writable: true,
  },
});

const { getLatestRecord, predictNextPeriod } = jest.requireActual<
  typeof import("./prediction")
>("./prediction");

import type { PeriodRecord } from "../types/period";

function createRecord(id: number, startDate: string): PeriodRecord {
  return {
    id,
    startDate,
    endDate: startDate,
    createdAt: startDate,
    updatedAt: startDate,
  };
}

describe("prediction utilities", () => {
  test("无记录时返回 null", () => {
    expect(getLatestRecord([])).toBeNull();
    expect(predictNextPeriod([])).toBeNull();
  });

  test("单条记录使用默认 28 天周期预测", () => {
    expect(predictNextPeriod([createRecord(1, "2026-05-09")])).toEqual({
      nextStartDate: "2026-06-06",
      cycleLength: 28,
      basedOnRecordCount: 1,
    });
  });

  test("固定周期设置有值时使用固定周期预测", () => {
    expect(
      predictNextPeriod([createRecord(1, "2026-05-09")], {
        cycleLengthDays: 30,
      }),
    ).toEqual({
      nextStartDate: "2026-06-08",
      cycleLength: 30,
      basedOnRecordCount: 1,
    });
  });

  test("固定周期设置为空时继续使用智能预测", () => {
    const records = [
      createRecord(1, "2026-01-01"),
      createRecord(2, "2026-01-29"),
      createRecord(3, "2026-02-28"),
    ];

    expect(predictNextPeriod(records, { cycleLengthDays: null })).toEqual({
      nextStartDate: "2026-03-29",
      cycleLength: 29,
      basedOnRecordCount: 3,
    });
  });

  test("无记录时即使设置固定周期也不预测", () => {
    expect(predictNextPeriod([], { cycleLengthDays: 30 })).toBeNull();
  });

  test("多条记录使用相邻开始日期平均间隔预测", () => {
    const records = [
      createRecord(1, "2026-01-01"),
      createRecord(2, "2026-01-29"),
      createRecord(3, "2026-02-28"),
    ];

    expect(predictNextPeriod(records)).toEqual({
      nextStartDate: "2026-03-29",
      cycleLength: 29,
      basedOnRecordCount: 3,
    });
  });

  test("输入乱序时仍使用最新记录作为预测基准", () => {
    const records = [
      createRecord(3, "2026-02-28"),
      createRecord(1, "2026-01-01"),
      createRecord(2, "2026-01-30"),
    ];

    expect(getLatestRecord(records)).toEqual(createRecord(3, "2026-02-28"));
    expect(predictNextPeriod(records)).toEqual({
      nextStartDate: "2026-03-29",
      cycleLength: 29,
      basedOnRecordCount: 3,
    });
  });
});
