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
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSavingMark, setIsSavingMark] = useState(false);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
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
  // 新增流程始终基于当前起止日期生成有序区间，避免选择顺序影响最终结果。
  const pendingRange = useMemo(
    () => (pendingStartDate ? sortDateRange(pendingStartDate, selectedDate) : null),
    [pendingStartDate, selectedDate],
  );
  const pendingOverlapMessage = useMemo(() => {
    if (!pendingRange || !hasOverlappingRecord(records, pendingRange)) {
      return null;
    }

    return "当前选择的日期范围与已有经期记录重叠，请重新选择。";
  }, [pendingRange, records]);
  const isTodayInPeriod = useMemo(
    () => isPeriodDate(records, todayKey),
    [records, todayKey],
  );
  const daysUntilNextPeriod = prediction
    ? daysBetween(todayKey, prediction.nextStartDate)
    : null;
  const isInteractionLocked = isSavingMark || isDeletingRecord;

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

  const clearPanelFeedback = useCallback(() => {
    setPanelMessage(null);
    setPanelError(null);
  }, []);

  const confirmAbandonPendingRange = useCallback(
    (onConfirm?: () => void) => {
      Alert.alert("取消本次记录", "确认放弃当前这次经期记录吗？", [
        { text: "继续选择", style: "cancel" },
        {
          text: "放弃记录",
          style: "destructive",
          onPress: () => {
            setPendingStartDate(null);
            clearPanelFeedback();
            onConfirm?.();
          },
        },
      ]);
    },
    [clearPanelFeedback],
  );

  const confirmLeaveEditing = useCallback(
    (onConfirm?: () => void) => {
      Alert.alert("放弃本次编辑", "确认放弃当前对这条经期记录的修改吗？", [
        { text: "继续编辑", style: "cancel" },
        {
          text: "放弃修改",
          style: "destructive",
          onPress: () => {
            setIsEditing(false);
            setEditorError(null);
            clearPanelFeedback();
            onConfirm?.();
          },
        },
      ]);
    },
    [clearPanelFeedback],
  );

  const runWithInterruptConfirmation = useCallback(
    (nextAction: () => void) => {
      if (isInteractionLocked) {
        return;
      }

      if (pendingStartDate) {
        confirmAbandonPendingRange(nextAction);
        return;
      }

      if (isEditing) {
        confirmLeaveEditing(nextAction);
        return;
      }

      clearPanelFeedback();
      setEditorError(null);
      nextAction();
    },
    [
      clearPanelFeedback,
      confirmAbandonPendingRange,
      confirmLeaveEditing,
      isEditing,
      isInteractionLocked,
      pendingStartDate,
    ],
  );

  const changeMonth = (offset: number) => {
    if (isInteractionLocked) {
      return;
    }

    if (pendingStartDate && !isEditing) {
      setVisibleMonth(
        (currentMonth) =>
          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1, 12),
      );
      return;
    }

    runWithInterruptConfirmation(() => {
      setVisibleMonth(
        (currentMonth) =>
          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1, 12),
      );
    });
  };

  const goToToday = () => {
    if (isInteractionLocked) {
      return;
    }

    if (pendingStartDate && !isEditing) {
      setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
      setSelectedDate(todayKey);
      return;
    }

    runWithInterruptConfirmation(() => {
      setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
      setSelectedDate(todayKey);
    });
  };

  const handleSelectDate = (dateKey: DateKey) => {
    if (isInteractionLocked) {
      return;
    }

    // 编辑态点击首页日历会离开当前编辑上下文，先确认再切换日期。
    if (isEditing) {
      confirmLeaveEditing(() => {
        setSelectedDate(dateKey);
      });
      return;
    }

    if (pendingStartDate) {
      const targetRecord = getRecordForDate(records, dateKey);

      // 新增第二步点击普通日期时继续选择结束日期；只有切去查看已有记录时才确认放弃。
      if (!targetRecord) {
        setSelectedDate(dateKey);
        return;
      }

      confirmAbandonPendingRange(() => {
        setSelectedDate(dateKey);
      });
      return;
    }

    clearPanelFeedback();
    setEditorError(null);
    setSelectedDate(dateKey);
  };

  const handleStartRecord = () => {
    clearPanelFeedback();
    setEditorError(null);
    setPendingStartDate(selectedDate);
  };

  const handleResetPendingStartDate = () => {
    clearPanelFeedback();
    setPendingStartDate(selectedDate);
  };

  const handleCancelRecordRange = () => {
    confirmAbandonPendingRange();
  };

  const handleSaveRecordRange = async () => {
    if (isInteractionLocked || !pendingRange) {
      return;
    }

    if (pendingOverlapMessage) {
      setPanelError(pendingOverlapMessage);
      setPanelMessage(null);
      return;
    }

    setPanelError(null);
    setPanelMessage(null);
    setIsSavingMark(true);
    try {
      await initPeriodDatabase();
      await createPeriodRecord(pendingRange);
      setPendingStartDate(null);
      await loadRecords();
      if (isFocusedRef.current) {
        setPanelMessage(
          `已记录 ${formatDisplayDate(pendingRange.startDate)} 至 ${formatDisplayDate(
            pendingRange.endDate,
          )}。`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      if (isFocusedRef.current) {
        setPanelError(message);
        setPanelMessage(null);
      }
    } finally {
      if (isFocusedRef.current) {
        setIsSavingMark(false);
      }
    }
  };

  const handleSaveRecord = async (input: RecordInput) => {
    if (!selectedRecord || isInteractionLocked) {
      return;
    }

    const nextRange = sortDateRange(input.startDate, input.endDate);

    if (hasOverlappingRecord(records, nextRange, selectedRecord.id)) {
      setEditorError("当前选择的日期范围与其他经期记录重叠，请重新调整。");
      return;
    }

    setEditorError(null);
    setPanelError(null);
    setPanelMessage(null);
    setIsSavingMark(true);
    try {
      await initPeriodDatabase();
      await updatePeriodRecord(selectedRecord.id, nextRange);
      await loadRecords();
      if (isFocusedRef.current) {
        setIsEditing(false);
        setPanelMessage(
          `已更新为 ${formatDisplayDate(nextRange.startDate)} 至 ${formatDisplayDate(
            nextRange.endDate,
          )}。`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      if (isFocusedRef.current) {
        setEditorError(message);
      }
    } finally {
      if (isFocusedRef.current) {
        setIsSavingMark(false);
      }
    }
  };

  const handleDeleteRecord = () => {
    if (!selectedRecord || isInteractionLocked) {
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
    if (isDeletingRecord) {
      return;
    }

    setIsDeletingRecord(true);
    setPanelError(null);
    setPanelMessage(null);
    try {
      await initPeriodDatabase();
      await deletePeriodRecord(recordId);
      await loadRecords();
      if (isFocusedRef.current) {
        setIsEditing(false);
        setEditorError(null);
        setPanelMessage("已删除这条经期记录。");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      if (isFocusedRef.current) {
        setPanelError(message);
      }
    } finally {
      if (isFocusedRef.current) {
        setIsDeletingRecord(false);
      }
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
        disabled={isInteractionLocked}
        style={({ pressed }) => [
          styles.dayCell,
          !day.isCurrentMonth && styles.otherMonthDay,
          isMarked && styles.periodDay,
          isPendingStart && styles.pendingStartDay,
          isSelected && styles.selectedDay,
          pressed && !isInteractionLocked ? styles.pressedDay : null,
          isInteractionLocked ? styles.disabledMonthButton : null,
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

    if (isEditing && selectedRecord) {
      return (
        <View style={styles.markPanel}>
          <Text style={styles.valueText}>编辑已记录经期</Text>
          <Text style={styles.helperText}>
            直接调整开始和结束日期，保存时会自动按时间顺序整理区间。
          </Text>
          <PeriodRecordForm
            key={selectedRecord.id}
            initialStartDate={selectedRecord.startDate}
            initialEndDate={selectedRecord.endDate}
            submitError={editorError}
            submitLabel="保存修改"
            onSubmit={handleSaveRecord}
            onCancel={() => confirmLeaveEditing()}
          />
        </View>
      );
    }

    const feedbackText = panelError ? (
      <Text style={styles.errorText}>{panelError}</Text>
    ) : panelMessage ? (
      <Text style={styles.successText}>{panelMessage}</Text>
    ) : null;

    if (pendingStartDate && pendingRange) {
      return (
        <View style={styles.markPanel}>
          <Text style={styles.valueText}>第二步：确认结束日期</Text>
          <Text style={styles.helperText}>
            当前选中的日期会作为结束日期；如果结束日期早于开始日期，保存时会自动排序。
          </Text>
          <View style={styles.rangeSummary}>
            <Text style={styles.rangeText}>
              开始日期：{formatDisplayDate(pendingStartDate)}
            </Text>
            <Text style={styles.rangeText}>结束日期：{formatDisplayDate(selectedDate)}</Text>
            <Text style={styles.helperText}>
              即将保存：{formatDisplayDate(pendingRange.startDate)} 至{" "}
              {formatDisplayDate(pendingRange.endDate)}
            </Text>
            {pendingOverlapMessage ? (
              <Text style={styles.errorText}>{pendingOverlapMessage}</Text>
            ) : null}
            {feedbackText}
          </View>
          <View style={styles.actionStack}>
            <PrimaryButton
              onPress={handleSaveRecordRange}
              disabled={isInteractionLocked}
              style={styles.actionButton}
            >
              {isSavingMark ? "保存中..." : "设为结束日期"}
            </PrimaryButton>
            <View style={styles.actions}>
              <SecondaryButton
                onPress={handleResetPendingStartDate}
                disabled={isInteractionLocked}
                style={styles.actionButton}
              >
                重新选开始日期
              </SecondaryButton>
              <SecondaryButton
                onPress={handleCancelRecordRange}
                disabled={isInteractionLocked}
                style={styles.actionButton}
              >
                取消本次记录
              </SecondaryButton>
            </View>
          </View>
        </View>
      );
    }

    if (selectedRecord) {
      return (
        <View style={styles.detailContent}>
          <Text style={styles.valueText}>查看已记录经期</Text>
          <Text style={styles.helperText}>
            当前日期属于 {formatDisplayDate(selectedRecord.startDate)} 至{" "}
            {formatDisplayDate(selectedRecord.endDate)} 的记录。
          </Text>
          {feedbackText}
          <View style={styles.actions}>
            <PrimaryButton
              onPress={() => {
                clearPanelFeedback();
                setEditorError(null);
                setIsEditing(true);
              }}
              disabled={isInteractionLocked}
              style={styles.actionButton}
            >
              编辑
            </PrimaryButton>
            <DangerButton
              onPress={handleDeleteRecord}
              disabled={isInteractionLocked}
              style={styles.actionButton}
            >
              {isDeletingRecord ? "删除中..." : "删除"}
            </DangerButton>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.markPanel}>
        <Text style={styles.valueText}>第一步：选择开始日期</Text>
        <Text style={styles.helperText}>
          先在日历中选中想记录的第一天，再把当前日期设为开始日期。
        </Text>
        <View style={styles.rangeSummary}>
          <Text style={styles.rangeText}>当前选择：{formatDisplayDate(selectedDate)}</Text>
          {feedbackText}
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            onPress={handleStartRecord}
            disabled={isLoading || isInteractionLocked}
            style={styles.actionButton}
          >
            设为开始日期
          </PrimaryButton>
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
          disabled={isInteractionLocked}
          style={({ pressed }) => [
            styles.monthButton,
            pressed && !isInteractionLocked ? styles.pressedButton : null,
            isInteractionLocked ? styles.disabledMonthButton : null,
          ]}
        >
          <Text style={styles.monthButtonText}>上个月</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{visibleMonthLabel}</Text>
        <Pressable
          onPress={() => changeMonth(1)}
          disabled={isInteractionLocked}
          style={({ pressed }) => [
            styles.monthButton,
            pressed && !isInteractionLocked ? styles.pressedButton : null,
            isInteractionLocked ? styles.disabledMonthButton : null,
          ]}
        >
          <Text style={styles.monthButtonText}>下个月</Text>
        </Pressable>
        <Pressable
          onPress={goToToday}
          disabled={isInteractionLocked}
          style={({ pressed }) => [
            styles.monthButton,
            pressed && !isInteractionLocked ? styles.pressedButton : null,
            isInteractionLocked ? styles.disabledMonthButton : null,
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
  actionStack: {
    gap: spacing.md,
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
  rangeSummary: {
    gap: spacing.xs,
  },
  rangeText: {
    color: colors.text,
    fontSize: fontSizes.lg,
  },
  successText: {
    color: colors.teal,
    fontSize: fontSizes.md,
    fontWeight: "600",
  },
  errorText: {
    color: colors.rose,
    fontSize: fontSizes.md,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
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
