import type { DateKey, PeriodRecord } from "../types/period";
import { isDateInRange } from "./date";

type DateRangeInput = {
  startDate: DateKey;
  endDate: DateKey;
};

type PeriodRangePosition = {
  isStart: boolean;
  isEnd: boolean;
};

// 获取指定日期命中的经期记录；重叠时优先返回开始日期最新的记录。
export function getRecordForDate(
  records: PeriodRecord[],
  dateKey: DateKey,
): PeriodRecord | null {
  const matchedRecords = records.filter((record) =>
    isDateInRange(dateKey, record.startDate, record.endDate),
  );

  if (matchedRecords.length === 0) {
    return null;
  }

  // 编辑场景下更接近用户最近录入意图，重叠记录按开始日期倒序取第一条。
  return matchedRecords.sort((first, second) =>
    second.startDate.localeCompare(first.startDate),
  )[0];
}

// 判断指定日期在命中的经期区间中处于开始、结束还是中间位置。
export function getPeriodRangePosition(
  records: PeriodRecord[],
  dateKey: DateKey,
): PeriodRangePosition | null {
  const matchedRecord = getRecordForDate(records, dateKey);

  if (!matchedRecord) {
    return null;
  }

  return {
    isStart: matchedRecord.startDate === dateKey,
    isEnd: matchedRecord.endDate === dateKey,
  };
}

// 判断指定日期是否属于任意一条经期记录。
export function isPeriodDate(records: PeriodRecord[], dateKey: DateKey): boolean {
  return getRecordForDate(records, dateKey) !== null;
}

// 判断新区间是否与已有记录相交，避免自动新增产生重叠经期记录。
export function hasOverlappingRecord(
  records: PeriodRecord[],
  input: DateRangeInput,
  excludedRecordId?: number,
): boolean {
  return records.some((record) => {
    if (record.id === excludedRecordId) {
      return false;
    }

    return (
      isDateInRange(input.startDate, record.startDate, record.endDate) ||
      isDateInRange(input.endDate, record.startDate, record.endDate) ||
      isDateInRange(record.startDate, input.startDate, input.endDate)
    );
  });
}
