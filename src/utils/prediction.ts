import type { PeriodPrediction, PeriodRecord, PredictionSettings } from "../types/period";
import { addDays, daysBetween } from "./date";

const DEFAULT_CYCLE_LENGTH = 28;

function sortRecordsByStartDate(records: PeriodRecord[]): PeriodRecord[] {
  return [...records].sort((first, second) => first.startDate.localeCompare(second.startDate));
}

// 获取开始日期最新的记录，预测逻辑统一以它作为下一次周期基准。
export function getLatestRecord(records: PeriodRecord[]): PeriodRecord | null {
  if (records.length === 0) {
    return null;
  }

  const sortedRecords = sortRecordsByStartDate(records);

  return sortedRecords[sortedRecords.length - 1];
}

// 根据历史开始日期间隔预测下一次经期开始日期。
export function predictNextPeriod(
  records: PeriodRecord[],
  settings?: PredictionSettings,
): PeriodPrediction | null {
  const latestRecord = getLatestRecord(records);

  if (latestRecord === null) {
    return null;
  }

  if (typeof settings?.cycleLengthDays === "number") {
    return {
      nextStartDate: addDays(latestRecord.startDate, settings.cycleLengthDays),
      cycleLength: settings.cycleLengthDays,
      basedOnRecordCount: records.length,
    };
  }

  if (records.length === 1) {
    return {
      nextStartDate: addDays(latestRecord.startDate, DEFAULT_CYCLE_LENGTH),
      cycleLength: DEFAULT_CYCLE_LENGTH,
      basedOnRecordCount: 1,
    };
  }

  const sortedRecords = sortRecordsByStartDate(records);
  const intervalTotal = sortedRecords.slice(1).reduce((total, record, index) => {
    const previousRecord = sortedRecords[index];

    return total + daysBetween(previousRecord.startDate, record.startDate);
  }, 0);
  const cycleLength = Math.round(intervalTotal / (sortedRecords.length - 1));

  return {
    nextStartDate: addDays(latestRecord.startDate, cycleLength),
    cycleLength,
    basedOnRecordCount: records.length,
  };
}
