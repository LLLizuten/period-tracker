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

const {
  getPeriodRangePosition,
  getRecordForDate,
  hasOverlappingRecord,
  isPeriodDate,
} = jest.requireActual<
  typeof import("./calendar")
>("./calendar");

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

  test("getPeriodRangePosition 返回开始日位置", () => {
    const records = [createRecord(1, "2026-05-09", "2026-05-13")];

    expect(getPeriodRangePosition(records, "2026-05-09")).toEqual({
      isEnd: false,
      isStart: true,
    });
  });

  test("getPeriodRangePosition 返回结束日位置", () => {
    const records = [createRecord(1, "2026-05-09", "2026-05-13")];

    expect(getPeriodRangePosition(records, "2026-05-13")).toEqual({
      isEnd: true,
      isStart: false,
    });
  });

  test("getPeriodRangePosition 返回中间日位置", () => {
    const records = [createRecord(1, "2026-05-09", "2026-05-13")];

    expect(getPeriodRangePosition(records, "2026-05-11")).toEqual({
      isEnd: false,
      isStart: false,
    });
  });

  test("getPeriodRangePosition 单日区间同时是开始和结束", () => {
    const records = [createRecord(1, "2026-05-09", "2026-05-09")];

    expect(getPeriodRangePosition(records, "2026-05-09")).toEqual({
      isEnd: true,
      isStart: true,
    });
  });

  test("getPeriodRangePosition 非经期日返回 null", () => {
    const records = [createRecord(1, "2026-05-09", "2026-05-13")];

    expect(getPeriodRangePosition(records, "2026-05-08")).toBeNull();
  });

  test("getPeriodRangePosition 重叠记录优先使用开始日期较新的记录", () => {
    const olderRecord = createRecord(1, "2026-05-09", "2026-05-14");
    const newerRecord = createRecord(2, "2026-05-12", "2026-05-16");

    expect(getPeriodRangePosition([olderRecord, newerRecord], "2026-05-13")).toEqual({
      isEnd: false,
      isStart: false,
    });
    expect(getPeriodRangePosition([olderRecord, newerRecord], "2026-05-12")).toEqual({
      isEnd: false,
      isStart: true,
    });
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

  test("hasOverlappingRecord 判断新区间是否与已有记录相交", () => {
    const records = [createRecord(1, "2026-05-10", "2026-05-12")];

    expect(
      hasOverlappingRecord(records, {
        startDate: "2026-05-08",
        endDate: "2026-05-09",
      }),
    ).toBe(false);
    expect(
      hasOverlappingRecord(records, {
        startDate: "2026-05-13",
        endDate: "2026-05-14",
      }),
    ).toBe(false);
    expect(
      hasOverlappingRecord(records, {
        startDate: "2026-05-08",
        endDate: "2026-05-14",
      }),
    ).toBe(true);
    expect(
      hasOverlappingRecord(records, {
        startDate: "2026-05-11",
        endDate: "2026-05-11",
      }),
    ).toBe(true);
    expect(
      hasOverlappingRecord(records, {
        startDate: "2026-05-12",
        endDate: "2026-05-14",
      }),
    ).toBe(true);
  });

  test("hasOverlappingRecord 编辑时排除当前记录自身", () => {
    const records = [
      createRecord(1, "2026-05-10", "2026-05-12"),
      createRecord(2, "2026-05-15", "2026-05-18"),
    ];

    expect(
      hasOverlappingRecord(
        records,
        {
          startDate: "2026-05-10",
          endDate: "2026-05-12",
        },
        1,
      ),
    ).toBe(false);
    expect(
      hasOverlappingRecord(
        records,
        {
          startDate: "2026-05-11",
          endDate: "2026-05-16",
        },
        1,
      ),
    ).toBe(true);
  });
});
