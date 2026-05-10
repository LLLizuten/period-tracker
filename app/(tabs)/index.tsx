import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { PeriodRecordForm } from "../../src/components/PeriodRecordForm";
import {
  DangerButton,
  EmptyText,
  LabelText,
  PrimaryButton,
  ScreenSection,
  SecondaryButton,
  SectionCard,
} from "../../src/components/ui";
import {
  createPeriodRecord,
  deletePeriodRecord,
  initPeriodDatabase,
  listPeriodRecords,
  updatePeriodRecord,
} from "../../src/db/periodRecords";
import { colors, fontSizes, radii, spacing } from "../../src/theme";
import type { DateKey, PeriodRecord } from "../../src/types/period";
import {
  getRecordForDate,
  hasOverlappingRecord,
  isPeriodDate,
} from "../../src/utils/calendar";
import {
  daysBetween,
  formatDisplayDate,
  getMonthMatrix,
  parseDateKey,
  sortDateRange,
  toDateKey,
} from "../../src/utils/date";
import { getLatestRecord, predictNextPeriod } from "../../src/utils/prediction";

const WEEK_DAYS = ["日", "一", "二", "三", "四", "五", "六"];

type RecordInput = {
  startDate: DateKey;
  endDate: DateKey;
};

export default function HomeScreen() {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [records, setRecords] = useState<PeriodRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<DateKey>(todayKey);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1, 12),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingStartDate, setPendingStartDate] = useState<DateKey | null>(null);
  const [isMarkSwitchOn, setIsMarkSwitchOn] = useState(false);
  const [isSavingMark, setIsSavingMark] = useState(false);
  const isFocusedRef = useRef(false);

  const monthDays = useMemo(
    () => getMonthMatrix(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );
  const latestRecord = useMemo(() => getLatestRecord(records), [records]);
  const prediction = useMemo(() => predictNextPeriod(records), [records]);
  const selectedRecord = useMemo(
    () => getRecordForDate(records, selectedDate),
    [records, selectedDate],
  );
  const isTodayInPeriod = useMemo(
    () => isPeriodDate(records, todayKey),
    [records, todayKey],
  );
  const daysUntilNextPeriod = prediction
    ? daysBetween(todayKey, prediction.nextStartDate)
    : null;

  const loadRecords = useCallback(
    async (isActive: () => boolean = () => isFocusedRef.current) => {
      try {
        // 页面聚焦时先确保本地表存在，再读取最新记录，避免冷启动读表失败。
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
    setIsMarkSwitchOn(false);
  };

  const goToToday = () => {
    if (isSavingMark) {
      return;
    }

    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
    setSelectedDate(todayKey);
    setIsEditing(false);
    setIsMarkSwitchOn(false);
  };

  const handleSelectDate = (dateKey: DateKey) => {
    if (isSavingMark) {
      return;
    }

    setSelectedDate(dateKey);
    setIsEditing(false);
    setIsMarkSwitchOn(false);
  };

  const handleCancelPendingStart = () => {
    setPendingStartDate(null);
    setIsMarkSwitchOn(false);
  };

  const handleTogglePeriodMark = async (value: boolean) => {
    if (isSavingMark) {
      return;
    }

    if (!value) {
      setPendingStartDate(null);
      setIsMarkSwitchOn(false);
      return;
    }

    if (!pendingStartDate) {
      setPendingStartDate(selectedDate);
      setIsMarkSwitchOn(false);
      return;
    }

    const nextRecordInput = sortDateRange(pendingStartDate, selectedDate);

    if (hasOverlappingRecord(records, nextRecordInput)) {
      Alert.alert("保存失败", "选择的日期范围与已有经期记录重叠");
      setIsMarkSwitchOn(false);
      return;
    }

    setIsMarkSwitchOn(true);
    setIsSavingMark(true);
    try {
      await initPeriodDatabase();
      await createPeriodRecord(nextRecordInput);
      setPendingStartDate(null);
      await loadRecords();
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      Alert.alert("保存失败", message);
    } finally {
      setIsSavingMark(false);
      setIsMarkSwitchOn(false);
    }
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

  const renderLatestRecord = () => {
    if (!latestRecord) {
      return <EmptyText style={styles.cardEmptyText}>暂无记录</EmptyText>;
    }

    return (
      <Text style={styles.valueText}>
        {formatDisplayDate(latestRecord.startDate)} 至{" "}
        {formatDisplayDate(latestRecord.endDate)}
      </Text>
    );
  };

  const renderPrediction = () => {
    if (!prediction || daysUntilNextPeriod === null) {
      return <EmptyText style={styles.cardEmptyText}>暂无预计日期</EmptyText>;
    }

    const dayText =
      daysUntilNextPeriod > 0
        ? `还有 ${daysUntilNextPeriod} 天`
        : daysUntilNextPeriod === 0
          ? "预计今天开始"
          : `已过 ${Math.abs(daysUntilNextPeriod)} 天`;

    return (
      <View style={styles.predictionGroup}>
        <Text style={styles.valueText}>
          {formatDisplayDate(prediction.nextStartDate)}
        </Text>
        <Text style={styles.helperText}>{dayText}</Text>
      </View>
    );
  };

  const renderDay = (day: (typeof monthDays)[number]) => {
    const dayRecord = getRecordForDate(records, day.dateKey);
    const isSelected = day.dateKey === selectedDate;
    const isMarked = isPeriodDate(records, day.dateKey);
    const isPendingStart = day.dateKey === pendingStartDate;

    return (
      <Pressable
        key={day.dateKey}
        onPress={() => handleSelectDate(day.dateKey)}
        style={({ pressed }) => [
          styles.dayCell,
          !day.isCurrentMonth && styles.otherMonthDay,
          isMarked && styles.periodDay,
          isPendingStart && styles.pendingStartDay,
          isSelected && styles.selectedDay,
          pressed && styles.pressedDay,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            !day.isCurrentMonth && styles.otherMonthText,
            isMarked && styles.periodDayText,
            isPendingStart && styles.pendingStartDayText,
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

    if (selectedRecord) {
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
    }

    return (
      <View style={styles.markPanel}>
        <View style={styles.markRow}>
          <View style={styles.markLabelGroup}>
            <Text style={styles.markIcon}>水滴</Text>
            <View style={styles.markTextGroup}>
              <Text style={styles.valueText}>
                {pendingStartDate ? "大姨妈结束" : "大姨妈开始"}
              </Text>
              <Text style={styles.helperText}>
                {pendingStartDate
                  ? `开始日期：${formatDisplayDate(pendingStartDate)}`
                  : `当前选择：${formatDisplayDate(selectedDate)}`}
              </Text>
            </View>
          </View>
          <Switch
            value={isSavingMark || isMarkSwitchOn}
            onValueChange={handleTogglePeriodMark}
            disabled={isLoading || isSavingMark}
            trackColor={{ false: colors.borderStrong, true: colors.rose }}
            thumbColor={colors.surface}
          />
        </View>
        {pendingStartDate ? (
          <SecondaryButton
            onPress={handleCancelPendingStart}
            disabled={isSavingMark}
            style={styles.cancelMarkButton}
          >
            取消开始标记
          </SecondaryButton>
        ) : null}
      </View>
    );
  };

  const visibleMonthLabel = `${visibleMonth.getFullYear()}年${
    visibleMonth.getMonth() + 1
  }月`;
  const selectedDateObject = parseDateKey(selectedDate);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenSection style={styles.headerSection}>
        <Text style={styles.title}>首页</Text>
        <Text style={styles.subtleText}>今天：{formatDisplayDate(todayKey)}</Text>
      </ScreenSection>

      <View style={styles.summaryGrid}>
        <SectionCard
          style={[
            styles.summaryCard,
            isTodayInPeriod ? styles.periodStatusCard : styles.normalStatusCard,
          ]}
        >
          <LabelText>今日状态</LabelText>
          <Text style={styles.statusText}>
            {isTodayInPeriod ? "处于已记录经期内" : "不在已记录经期内"}
          </Text>
        </SectionCard>

        <SectionCard style={styles.summaryCard}>
          <LabelText>最近记录</LabelText>
          {isLoading ? (
            <EmptyText style={styles.cardEmptyText}>加载中...</EmptyText>
          ) : (
            renderLatestRecord()
          )}
        </SectionCard>

        <SectionCard style={styles.summaryCard}>
          <LabelText>预计下一次开始日期</LabelText>
          {isLoading ? (
            <EmptyText style={styles.cardEmptyText}>加载中...</EmptyText>
          ) : (
            renderPrediction()
          )}
        </SectionCard>
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
        <Pressable
          onPress={goToToday}
          disabled={isSavingMark}
          style={({ pressed }) => [
            styles.monthButton,
            pressed && styles.pressedButton,
            isSavingMark && styles.disabledMonthButton,
          ]}
        >
          <Text style={styles.monthButtonText}>回今天</Text>
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
  headerSection: {
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
  summaryGrid: {
    gap: spacing.md,
  },
  summaryCard: {
    borderRadius: radii.lg,
    gap: spacing.sm,
  },
  periodStatusCard: {
    backgroundColor: colors.roseSurface,
    borderColor: colors.rose,
  },
  normalStatusCard: {
    backgroundColor: colors.tealSurface,
    borderColor: colors.teal,
  },
  statusText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  valueText: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: "600",
  },
  predictionGroup: {
    gap: spacing.xs,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: fontSizes.lg,
  },
  cardEmptyText: {
    textAlign: "left",
  },
  monthHeader: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
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
    minWidth: 120,
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
  pendingStartDay: {
    backgroundColor: colors.tealSurface,
    borderColor: colors.teal,
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
  pendingStartDayText: {
    color: colors.teal,
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
  emptyText: {
    color: colors.textSubtle,
    fontSize: fontSizes.lg,
  },
  markPanel: {
    gap: spacing.md,
  },
  markRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  markLabelGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
  },
  markIcon: {
    backgroundColor: colors.roseSurface,
    borderColor: colors.rose,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.rose,
    fontSize: fontSizes.sm,
    fontWeight: "700",
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: "center",
  },
  markTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  cancelMarkButton: {
    alignSelf: "flex-start",
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
  disabledMonthButton: {
    opacity: 0.55,
  },
});
