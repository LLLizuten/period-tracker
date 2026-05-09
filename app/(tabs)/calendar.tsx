import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PeriodRecordForm } from "../../src/components/PeriodRecordForm";
import { DangerButton, PrimaryButton, SectionCard } from "../../src/components/ui";
import {
  deletePeriodRecord,
  initPeriodDatabase,
  listPeriodRecords,
  updatePeriodRecord,
} from "../../src/db/periodRecords";
import { colors, fontSizes, radii, spacing } from "../../src/theme";
import type { DateKey, PeriodRecord } from "../../src/types/period";
import { getRecordForDate, isPeriodDate } from "../../src/utils/calendar";
import {
  formatDisplayDate,
  getMonthMatrix,
  parseDateKey,
  toDateKey,
} from "../../src/utils/date";

const WEEK_DAYS = ["日", "一", "二", "三", "四", "五", "六"];

type RecordInput = {
  startDate: DateKey;
  endDate: DateKey;
};

export default function CalendarScreen() {
  const today = new Date();
  const [records, setRecords] = useState<PeriodRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<DateKey>(toDateKey(today));
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1, 12),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const isFocusedRef = useRef(false);

  const monthDays = useMemo(
    () => getMonthMatrix(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );
  const selectedRecord = useMemo(
    () => getRecordForDate(records, selectedDate),
    [records, selectedDate],
  );

  const loadRecords = useCallback(
    async (isActive: () => boolean = () => isFocusedRef.current) => {
      try {
        // 聚焦进入页面时先初始化表结构，再读取最新记录，避免冷启动读表失败。
        await initPeriodDatabase();
        const nextRecords = await listPeriodRecords();

        if (isActive()) {
          setRecords(nextRecords);
        }
      } catch (error) {
        if (isActive()) {
          const message = error instanceof Error ? error.message : "请稍后重试";
          Alert.alert("加载失败", message);
        }
      } finally {
        if (isActive()) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      isFocusedRef.current = true;
      setIsLoading(true);
      void loadRecords(() => isActive);

      return () => {
        isActive = false;
        isFocusedRef.current = false;
      };
    }, [loadRecords]),
  );

  const changeMonth = (offset: number) => {
    setVisibleMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1, 12),
    );
    setIsEditing(false);
  };

  const handleSelectDate = (dateKey: DateKey) => {
    setSelectedDate(dateKey);
    setIsEditing(false);
  };

  const handleSaveRecord = async (input: RecordInput) => {
    if (!selectedRecord) {
      return;
    }

    try {
      await initPeriodDatabase();
      await updatePeriodRecord(selectedRecord.id, input);
      await loadRecords();
      if (isFocusedRef.current) {
        setIsEditing(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      Alert.alert("保存失败", message);
    }
  };

  const handleDeleteRecord = () => {
    if (!selectedRecord) {
      return;
    }

    Alert.alert("删除记录", "确认删除这条经期记录吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => {
          void deleteSelectedRecord(selectedRecord.id);
        },
      },
    ]);
  };

  const deleteSelectedRecord = async (recordId: number) => {
    try {
      await initPeriodDatabase();
      await deletePeriodRecord(recordId);
      await loadRecords();
      if (isFocusedRef.current) {
        setIsEditing(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      Alert.alert("删除失败", message);
    }
  };

  const renderDay = (day: (typeof monthDays)[number]) => {
    const dayRecord = getRecordForDate(records, day.dateKey);
    const isSelected = day.dateKey === selectedDate;
    const isMarked = isPeriodDate(records, day.dateKey);

    return (
      <Pressable
        key={day.dateKey}
        onPress={() => handleSelectDate(day.dateKey)}
        style={({ pressed }) => [
          styles.dayCell,
          !day.isCurrentMonth && styles.otherMonthDay,
          isMarked && styles.periodDay,
          isSelected && styles.selectedDay,
          pressed && styles.pressedDay,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            !day.isCurrentMonth && styles.otherMonthText,
            isMarked && styles.periodDayText,
            isSelected && styles.selectedDayText,
          ]}
          numberOfLines={1}
        >
          {day.dayOfMonth}
        </Text>
        <View
          style={[
            styles.periodDot,
            dayRecord ? styles.visiblePeriodDot : styles.hiddenPeriodDot,
          ]}
        />
      </Pressable>
    );
  };

  const renderSelectedDetail = () => {
    if (isLoading) {
      return <Text style={styles.emptyText}>加载中...</Text>;
    }

    if (!selectedRecord) {
      return (
        <View style={styles.detailContent}>
          <Text style={styles.valueText}>不属于已记录经期</Text>
        </View>
      );
    }

    if (isEditing) {
      return (
        <PeriodRecordForm
          key={selectedRecord.id}
          initialStartDate={selectedRecord.startDate}
          initialEndDate={selectedRecord.endDate}
          submitLabel="保存修改"
          onSubmit={handleSaveRecord}
          onCancel={() => setIsEditing(false)}
        />
      );
    }

    return (
      <View style={styles.detailContent}>
        <Text style={styles.valueText}>属于已记录经期</Text>
        <Text style={styles.helperText}>
          {formatDisplayDate(selectedRecord.startDate)} 至{" "}
          {formatDisplayDate(selectedRecord.endDate)}
        </Text>

        <View style={styles.actions}>
          <PrimaryButton onPress={() => setIsEditing(true)} style={styles.actionButton}>
            编辑
          </PrimaryButton>
          <DangerButton onPress={handleDeleteRecord} style={styles.actionButton}>
            删除
          </DangerButton>
        </View>
      </View>
    );
  };

  const visibleMonthLabel = `${visibleMonth.getFullYear()}年${
    visibleMonth.getMonth() + 1
  }月`;
  const selectedDateObject = parseDateKey(selectedDate);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>日历</Text>
          <Text style={styles.subtleText}>当前月份：{visibleMonthLabel}</Text>
        </View>
      </View>

      <View style={styles.monthHeader}>
        <Pressable
          onPress={() => changeMonth(-1)}
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressedButton]}
        >
          <Text style={styles.monthButtonText}>上个月</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{visibleMonthLabel}</Text>
        <Pressable
          onPress={() => changeMonth(1)}
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressedButton]}
        >
          <Text style={styles.monthButtonText}>下个月</Text>
        </Pressable>
      </View>

      <View style={styles.calendar}>
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((weekDay) => (
            <Text key={weekDay} style={styles.weekText}>
              {weekDay}
            </Text>
          ))}
        </View>
        <View style={styles.daysGrid}>{monthDays.map(renderDay)}</View>
      </View>

      <SectionCard style={styles.detailSection}>
        <Text style={styles.label}>
          {selectedDateObject.getMonth() + 1}月{selectedDateObject.getDate()}日
        </Text>
        {renderSelectedDetail()}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    gap: spacing.xl,
    padding: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  subtleText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
  },
  monthHeader: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  monthButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
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
    fontSize: fontSizes.xl,
    fontWeight: "700",
    textAlign: "center",
  },
  calendar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    width: "14.2857%",
  },
  otherMonthDay: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  periodDay: {
    backgroundColor: colors.roseSurface,
    borderColor: colors.rose,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressedDay: {
    opacity: 0.72,
  },
  dayText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: "600",
  },
  otherMonthText: {
    color: colors.disabled,
  },
  periodDayText: {
    color: colors.rose,
  },
  selectedDayText: {
    color: colors.onPrimary,
  },
  periodDot: {
    borderRadius: 3,
    height: 6,
    marginTop: 4,
    width: 6,
  },
  visiblePeriodDot: {
    backgroundColor: colors.rose,
  },
  hiddenPeriodDot: {
    backgroundColor: "transparent",
  },
  detailSection: {
    gap: spacing.md,
  },
  detailContent: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.lg,
    fontWeight: "600",
  },
  valueText: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: "600",
  },
  helperText: {
    color: colors.textMuted,
    fontSize: fontSizes.lg,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: fontSizes.lg,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "flex-end",
    marginTop: spacing.xs,
  },
  actionButton: {
    minWidth: 88,
  },
  pressedButton: {
    opacity: 0.7,
  },
});
