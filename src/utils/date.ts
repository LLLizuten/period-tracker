export type DateKey = string;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type MonthDay = {
  dateKey: DateKey;
  dayOfMonth: number;
  isCurrentMonth: boolean;
};

// 使用本地中午解析日期，避开午夜附近的 DST 和时区边界问题。
export function parseDateKey(dateKey: DateKey): Date {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day, 12);
}

// 将 Date 统一格式化为 YYYY-MM-DD，作为全项目日期 key。
export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 基于本地中午日期加减天数，避免跨月和 DST 边界造成日期偏移。
export function addDays(dateKey: DateKey, days: number): DateKey {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);

  return toDateKey(date);
}

// 返回 endDate 相对 startDate 的自然日差值。
export function daysBetween(startDate: DateKey, endDate: DateKey): number {
  const start = parseDateKey(startDate).getTime();
  const end = parseDateKey(endDate).getTime();

  return Math.round((end - start) / DAY_IN_MS);
}

// 判断日期是否落在闭区间内，包含起止日期。
export function isDateInRange(
  dateKey: DateKey,
  startDate: DateKey,
  endDate: DateKey,
): boolean {
  return daysBetween(startDate, dateKey) >= 0 && daysBetween(dateKey, endDate) >= 0;
}

// 生成 6 行 7 列月历矩阵，包含前后月份补齐日期。
export function getMonthMatrix(year: number, monthIndex: number): MonthDay[] {
  const firstDay = new Date(year, monthIndex, 1, 12);
  const startDate = toDateKey(firstDay);
  const matrixStart = addDays(startDate, -firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const dateKey = addDays(matrixStart, index);
    const date = parseDateKey(dateKey);

    return {
      dateKey,
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === monthIndex,
    };
  });
}

// 输出面向用户展示的中文日期。
export function formatDisplayDate(dateKey: DateKey): string {
  const date = parseDateKey(dateKey);

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
