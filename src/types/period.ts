export type DateKey = string;

export interface PeriodRecord {
  id: number;
  startDate: DateKey;
  endDate: DateKey;
  createdAt: DateKey;
  updatedAt: DateKey;
}

export interface PeriodPrediction {
  nextStartDate: DateKey;
  cycleLength: number;
  basedOnRecordCount: number;
}

export interface PredictionSettings {
  cycleLengthDays: number | null;
}
