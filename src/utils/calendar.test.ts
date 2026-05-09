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

const { getRecordForDate, isPeriodDate } = jest.requireActual<typeof import("./calendar")>(
  "./calendar",
);

import type { PeriodRecord } from "../types/period";

function createRecord(id: number, startDate: string, endDate: string): PeriodRecord {
  return {
    id,
    startDate,
    endDate,
    createdAt: startDate,
    updatedAt: endDate,
  };
}

describe("calendar utilities", () => {
  test("开始日、结束日、中间日都标记为经期日", () => {
    const records = [createRecord(1, "2026-05-09", "2026-05-13")];

    expect(isPeriodDate(records, "2026-05-09")).toBe(true);
    expect(isPeriodDate(records, "2026-05-11")).toBe(true);
    expect(isPeriodDate(records, "2026-05-13")).toBe(true);
  });

  test("区间外日期不是经期日", () => {
    const records = [createRecord(1, "2026-05-09", "2026-05-13")];

    expect(isPeriodDate(records, "2026-05-08")).toBe(false);
    expect(isPeriodDate(records, "2026-05-14")).toBe(false);
  });

  test("点击日期能解析到对应记录", () => {
    const record = createRecord(2, "2026-06-01", "2026-06-05");
    const records = [createRecord(1, "2026-05-09", "2026-05-13"), record];

    expect(getRecordForDate(records, "2026-06-03")).toBe(record);
    expect(getRecordForDate(records, "2026-06-06")).toBeNull();
  });

  test("重叠记录返回开始日期较新的记录", () => {
    const olderRecord = createRecord(1, "2026-05-09", "2026-05-14");
    const newerRecord = createRecord(2, "2026-05-12", "2026-05-16");

    expect(getRecordForDate([olderRecord, newerRecord], "2026-05-13")).toBe(newerRecord);
    expect(getRecordForDate([newerRecord, olderRecord], "2026-05-13")).toBe(newerRecord);
  });

  test("查询日期不修改传入记录顺序", () => {
    const newerRecord = createRecord(2, "2026-05-12", "2026-05-16");
    const olderRecord = createRecord(1, "2026-05-09", "2026-05-14");
    const unrelatedRecord = createRecord(3, "2026-06-01", "2026-06-05");
    const records = [newerRecord, olderRecord, unrelatedRecord];

    expect(getRecordForDate(records, "2026-05-13")).toBe(newerRecord);
    expect(records.map((record) => record.id)).toEqual([2, 1, 3]);

    expect(isPeriodDate(records, "2026-05-13")).toBe(true);
    expect(records.map((record) => record.id)).toEqual([2, 1, 3]);
  });
});
