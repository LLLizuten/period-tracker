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
  addDays,
  daysBetween,
  formatDisplayDate,
  getMonthMatrix,
  isDateInRange,
  parseDateKey,
  sortDateRange,
  toDateKey,
} = jest.requireActual<typeof import("./date")>("./date");

describe("date utilities", () => {
  test("toDateKey 输出 YYYY-MM-DD 格式", () => {
    const date = new Date(2026, 4, 9, 23, 30);

    expect(toDateKey(date)).toBe("2026-05-09");
  });

  test("parseDateKey 使用本地中午时间解析日期", () => {
    const date = parseDateKey("2026-05-09");

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(4);
    expect(date.getDate()).toBe(9);
    expect(date.getHours()).toBe(12);
  });

  test("addDays 跨月计算正确", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("daysBetween 返回开始日到结束日差值", () => {
    expect(daysBetween("2026-05-09", "2026-05-12")).toBe(3);
    expect(daysBetween("2026-05-12", "2026-05-09")).toBe(-3);
  });

  test("isDateInRange 包含起止日期", () => {
    expect(isDateInRange("2026-05-09", "2026-05-09", "2026-05-12")).toBe(true);
    expect(isDateInRange("2026-05-12", "2026-05-09", "2026-05-12")).toBe(true);
    expect(isDateInRange("2026-05-08", "2026-05-09", "2026-05-12")).toBe(false);
  });

  test("getMonthMatrix 返回 42 天并正确标记当前月", () => {
    const matrix = getMonthMatrix(2026, 4);

    expect(matrix).toHaveLength(42);
    expect(matrix[0]).toEqual({
      dateKey: "2026-04-26",
      dayOfMonth: 26,
      isCurrentMonth: false,
    });
    expect(matrix[5]).toEqual({
      dateKey: "2026-05-01",
      dayOfMonth: 1,
      isCurrentMonth: true,
    });
    expect(matrix[35]).toEqual({
      dateKey: "2026-05-31",
      dayOfMonth: 31,
      isCurrentMonth: true,
    });
    expect(matrix[41]).toEqual({
      dateKey: "2026-06-06",
      dayOfMonth: 6,
      isCurrentMonth: false,
    });
  });

  test("formatDisplayDate 输出易读中文日期", () => {
    expect(formatDisplayDate("2026-05-09")).toBe("2026年5月9日");
  });

  test("sortDateRange 按自然日期返回有序区间", () => {
    expect(sortDateRange("2026-05-09", "2026-05-13")).toEqual({
      startDate: "2026-05-09",
      endDate: "2026-05-13",
    });
    expect(sortDateRange("2026-05-13", "2026-05-09")).toEqual({
      startDate: "2026-05-09",
      endDate: "2026-05-13",
    });
    expect(sortDateRange("2026-05-09", "2026-05-09")).toEqual({
      startDate: "2026-05-09",
      endDate: "2026-05-09",
    });
  });
});
