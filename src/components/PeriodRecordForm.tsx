import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontSizes, radii, spacing } from "../theme";
import type { DateKey } from "../types/period";
import {
  formatDisplayDate,
  getMonthMatrix,
  parseDateKey,
  sortDateRange,
  toDateKey,
} from "../utils/date";
import {
  LabelText,
  PrimaryButton,
  ScreenSection,
  SecondaryButton,
} from "./ui";

const WEEK_DAYS = ["日", "一", "二", "三", "四", "五", "六"];

type EditingField = "start" | "end";

interface PeriodRecordFormProps {
  initialStartDate?: DateKey;
  initialEndDate?: DateKey;
  submitError?: string | null;
  submitLabel: string;
  onSubmit(input: { startDate: DateKey; endDate: DateKey }): Promise<void> | void;
  onCancel?: () => void;
}

export function PeriodRecordForm({
  initialStartDate,
  initialEndDate,
  submitError,
  submitLabel,
  onSubmit,
  onCancel,
}: PeriodRecordFormProps) {
  const todayKey = toDateKey(new Date());
  const [startDate, setStartDate] = useState<DateKey>(initialStartDate ?? todayKey);
  const [endDate, setEndDate] = useState<DateKey>(initialEndDate ?? todayKey);
  const [editingField, setEditingField] = useState<EditingField>("start");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialDate = parseDateKey(initialStartDate ?? todayKey);

    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const monthDays = useMemo(
    () => getMonthMatrix(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );
  // 统一整理当前表单区间，避免开始和结束选择顺序影响最终结果。
  const sortedDateRange = useMemo(
    () => sortDateRange(startDate, endDate),
    [endDate, startDate],
  );
  const visibleMonthLabel = `${visibleMonth.getFullYear()}年${
    visibleMonth.getMonth() + 1
  }月`;

  const changeMonth = (offset: number) => {
    setVisibleMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1, 12),
    );
  };

  const focusDateField = (field: EditingField, dateKey: DateKey) => {
    const nextVisibleDate = parseDateKey(dateKey);

    setEditingField(field);
    setVisibleMonth(
      new Date(nextVisibleDate.getFullYear(), nextVisibleDate.getMonth(), 1, 12),
    );
  };

  const handleSelectDate = (dateKey: DateKey) => {
    if (isSubmitting) {
      return;
    }

    // 当前编辑哪个字段，就把日历选中日期写入对应字段。
    if (editingField === "start") {
      setStartDate(dateKey);
      // 选完开始日期后直接切到结束日期，减少一次额外点击。
      setEditingField("end");
      return;
    }

    setEndDate(dateKey);
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      // 提交前统一使用有序区间，兼容用户任意选择开始和结束日期的顺序。
      await onSubmit({
        startDate: sortedDateRange.startDate,
        endDate: sortedDateRange.endDate,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      Alert.alert("保存失败", message);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const renderDay = (day: (typeof monthDays)[number]) => {
    const isStartDate = day.dateKey === startDate;
    const isEndDate = day.dateKey === endDate;
    const isSelected =
      editingField === "start" ? day.dateKey === startDate : day.dateKey === endDate;

    return (
      <Pressable
        key={day.dateKey}
        onPress={() => handleSelectDate(day.dateKey)}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.dayCell,
          !day.isCurrentMonth && styles.otherMonthDay,
          isStartDate && styles.startDay,
          isEndDate && styles.endDay,
          isSelected && styles.selectedDay,
          pressed && !isSubmitting ? styles.pressedDay : null,
          isSubmitting ? styles.disabledDay : null,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            !day.isCurrentMonth && styles.otherMonthText,
            isStartDate && !isSelected ? styles.startDayText : null,
            isEndDate && !isSelected ? styles.endDayText : null,
            isSelected && styles.selectedDayText,
          ]}
          numberOfLines={1}
        >
          {day.dayOfMonth}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScreenSection>
      <View style={styles.fieldTabs}>
        <DateFieldButton
          label="开始日期"
          dateKey={startDate}
          isActive={editingField === "start"}
          disabled={isSubmitting}
          onPress={() => focusDateField("start", startDate)}
        />
        <DateFieldButton
          label="结束日期"
          dateKey={endDate}
          isActive={editingField === "end"}
          disabled={isSubmitting}
          onPress={() => focusDateField("end", endDate)}
        />
      </View>

      <View style={styles.calendarPanel}>
        <View style={styles.monthHeader}>
          <Pressable
            onPress={() => changeMonth(-1)}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.monthButton,
              pressed && !isSubmitting ? styles.pressedButton : null,
              isSubmitting ? styles.disabledDay : null,
            ]}
          >
            <Text style={styles.monthButtonText}>上个月</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{visibleMonthLabel}</Text>
          <Pressable
            onPress={() => changeMonth(1)}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.monthButton,
              pressed && !isSubmitting ? styles.pressedButton : null,
              isSubmitting ? styles.disabledDay : null,
            ]}
          >
            <Text style={styles.monthButtonText}>下个月</Text>
          </Pressable>
        </View>

        <LabelText>
          正在调整{editingField === "start" ? "开始日期" : "结束日期"}
        </LabelText>
        <View style={styles.feedbackPanel}>
          <View style={styles.rangePreview}>
            <Text style={styles.feedbackLabel}>当前经期区间</Text>
            <Text style={styles.rangePreviewText}>
              {formatDisplayDate(sortedDateRange.startDate)} -{" "}
              {formatDisplayDate(sortedDateRange.endDate)}
            </Text>
          </View>
          {submitError ? (
            <View style={styles.errorMessageBox}>
              <Text style={styles.errorMessageText}>{submitError}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.weekRow}>
          {WEEK_DAYS.map((weekDay) => (
            <Text key={weekDay} style={styles.weekText}>
              {weekDay}
            </Text>
          ))}
        </View>
        <View style={styles.daysGrid}>{monthDays.map(renderDay)}</View>
      </View>

      <View style={styles.actions}>
        {onCancel ? (
          <SecondaryButton onPress={onCancel} disabled={isSubmitting}>
            取消
          </SecondaryButton>
        ) : null}

        <PrimaryButton onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : submitLabel}
        </PrimaryButton>
      </View>
    </ScreenSection>
  );
}

interface DateFieldButtonProps {
  label: string;
  dateKey: DateKey;
  isActive: boolean;
  disabled: boolean;
  onPress: () => void;
}

function DateFieldButton({
  label,
  dateKey,
  isActive,
  disabled,
  onPress,
}: DateFieldButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.fieldButton,
        isActive ? styles.activeFieldButton : null,
        pressed && !disabled ? styles.pressedButton : null,
        disabled ? styles.disabledDay : null,
      ]}
    >
      <Text style={[styles.fieldLabel, isActive ? styles.activeFieldText : null]}>
        {label}
      </Text>
      <Text style={[styles.fieldValue, isActive ? styles.activeFieldText : null]}>
        {formatDisplayDate(dateKey)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldTabs: {
    flexDirection: "row",
    gap: spacing.md,
  },
  fieldButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  activeFieldButton: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  fieldValue: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: "700",
  },
  activeFieldText: {
    color: colors.primary,
  },
  calendarPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  feedbackPanel: {
    gap: spacing.sm,
  },
  rangePreview: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedbackLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  rangePreviewText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "700",
  },
  errorMessageBox: {
    backgroundColor: colors.roseSurface,
    borderRadius: radii.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorMessageText: {
    color: colors.rose,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  monthButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    minWidth: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  monthButtonText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "600",
  },
  monthTitle: {
    color: colors.text,
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: "700",
    minWidth: 120,
    textAlign: "center",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekText: {
    color: colors.textSubtle,
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: "600",
    lineHeight: 18,
    paddingVertical: spacing.xs,
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    width: "14.2857%",
  },
  otherMonthDay: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
  },
  startDay: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.primary,
  },
  endDay: {
    backgroundColor: colors.roseSurface,
    borderColor: colors.rose,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressedButton: {
    opacity: 0.72,
  },
  pressedDay: {
    opacity: 0.72,
  },
  disabledDay: {
    opacity: 0.55,
  },
  dayText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "600",
  },
  otherMonthText: {
    color: colors.disabled,
  },
  selectedDayText: {
    color: colors.onPrimary,
  },
  startDayText: {
    color: colors.primary,
  },
  endDayText: {
    color: colors.rose,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "flex-end",
  },
});
