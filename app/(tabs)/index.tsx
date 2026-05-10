import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  PanResponder,
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
  getPeriodRangePosition,
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
  const isVisibleMonthTodayMonth =
    visibleMonth.getFullYear() === today.getFullYear() &&
    visibleMonth.getMonth() === today.getMonth();
  const isSelectedDateToday = selectedDate === todayKey;
  const shouldShowBackToToday =
    !isVisibleMonthTodayMonth || !isSelectedDateToday;
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

  const changeMonth = useCallback(
    (offset: number) => {
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
    },
    [isEditing, isInteractionLocked, pendingStartDate, runWithInterruptConfirmation],
  );

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

  // 顶部主状态区集中展示当天状态、最近记录与预测结果，替代原来的三张摘要卡。
  const renderHeroSummary = () => {
    const statusTitle = isTodayInPeriod ? "今天处于经期中" : "今天不在经期内";
    const predictionText =
      daysUntilNextPeriod === null
        ? "继续记录后会生成更稳定的预测"
        : daysUntilNextPeriod > 0
          ? `距离下一次预计开始还有 ${daysUntilNextPeriod} 天`
          : daysUntilNextPeriod === 0
            ? "预计今天开始"
            : `预计开始日已过 ${Math.abs(daysUntilNextPeriod)} 天`;

    return (
      <SectionCard style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <LabelText>Today</LabelText>
          <Text style={styles.heroDate}>今天：{formatDisplayDate(todayKey)}</Text>
        </View>
        <Text style={styles.heroTitle}>{statusTitle}</Text>
        <Text style={styles.heroSubtitle}>{predictionText}</Text>
        <View style={styles.heroMetaGrid}>
          <View style={styles.heroMetaCard}>
            <Text style={styles.heroMetaLabel}>最近记录</Text>
            <Text style={styles.heroMetaValue}>
              {latestRecord
                ? `${formatDisplayDate(latestRecord.startDate)} - ${formatDisplayDate(latestRecord.endDate)}`
                : "暂无记录"}
            </Text>
          </View>
          <View style={styles.heroMetaCard}>
            <Text style={styles.heroMetaLabel}>预计开始</Text>
            <Text style={styles.heroMetaValue}>
              {prediction ? formatDisplayDate(prediction.nextStartDate) : "暂无预计日期"}
            </Text>
          </View>
        </View>
        {/* <Text style={styles.heroFootnote}>预测基于历史记录，仅供参考。</Text> */}
      </SectionCard>
    );
  };

  const renderDay = (day: (typeof monthDays)[number]) => {
    const dayRecord = getRecordForDate(records, day.dateKey);
    const periodRangePosition = getPeriodRangePosition(records, day.dateKey);
    const isSelected = day.dateKey === selectedDate;
    const isMarked = isPeriodDate(records, day.dateKey);
    const isPendingStart = day.dateKey === pendingStartDate;
    const isSingleDayPeriod =
      periodRangePosition?.isStart === true && periodRangePosition?.isEnd === true;

    return (
      <Pressable
        key={day.dateKey}
        onPress={() => handleSelectDate(day.dateKey)}
        disabled={isInteractionLocked}
        style={({ pressed }) => [
          styles.dayCell,
          !day.isCurrentMonth && styles.otherMonthDay,
          pressed && !isInteractionLocked ? styles.pressedDay : null,
          isInteractionLocked ? styles.disabledInteractiveItem : null,
        ]}
      >
        <View style={styles.dayTrack}>
          <View
            style={[
              styles.periodRangeBand,
              isMarked ? styles.visiblePeriodRangeBand : null,
              periodRangePosition?.isStart ? styles.periodRangeBandStart : null,
              periodRangePosition?.isEnd ? styles.periodRangeBandEnd : null,
              isSingleDayPeriod ? styles.periodRangeBandSingleDay : null,
            ]}
          />
          <View
            style={[
              styles.dayContent,
              isPendingStart && styles.pendingStartDay,
              isSelected && styles.selectedDay,
              isSelected && isPendingStart ? styles.selectedPendingStartDay : null,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                !day.isCurrentMonth && styles.otherMonthText,
                dayRecord && styles.periodDayText,
                isPendingStart && styles.pendingStartDayText,
                isSelected && styles.selectedDayText,
              ]}
              numberOfLines={1}
            >
              {day.dayOfMonth}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderSelectedDetail = () => {
    if (isLoading) {
      return <Text style={styles.emptyText}>加载中...</Text>;
    }

    if (isEditing && selectedRecord) {
      return (
        <PeriodRecordForm
          key={selectedRecord.id}
          initialStartDate={selectedRecord.startDate}
          initialEndDate={selectedRecord.endDate}
          submitError={editorError}
          submitLabel="保存修改"
          onSubmit={handleSaveRecord}
          onCancel={() => confirmLeaveEditing()}
        />
      );
    }

    const feedbackText = panelError ? (
      <Text style={styles.errorText}>{panelError}</Text>
    ) : panelMessage ? (
      <Text style={styles.panelMessageText}>{panelMessage}</Text>
    ) : null;

    if (pendingStartDate && pendingRange) {
      return (
        <View style={styles.markPanel}>
          <Text style={styles.valueText}>将这一天设为结束日期</Text>
          <Text style={styles.helperText}>
            当前已选区间会在保存时自动按时间顺序整理。
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
          <Text style={styles.valueText}>这一天属于已记录经期</Text>
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
        <Text style={styles.valueText}>将这一天设为开始日期</Text>
        <Text style={styles.helperText}>
          选中开始日后，再点另一日期并确认结束，即可保存整段经期。
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
  const calendarPanResponder = useMemo(
    () =>
      PanResponder.create({
        // 只在明显横向滑动时接管手势，避免影响纵向滚动和普通点击。
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -40) {
            changeMonth(1);
            return;
          }

          if (gestureState.dx >= 40) {
            changeMonth(-1);
          }
        },
      }),
    [changeMonth],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {isLoading ? (
        <SectionCard>
          <EmptyText style={styles.cardEmptyText}>加载中...</EmptyText>
        </SectionCard>
      ) : (
        renderHeroSummary()
      )}

      <View style={styles.calendar} {...calendarPanResponder.panHandlers}>
        <View style={styles.calendarHeader}>
          <Text style={styles.monthTitle}>{visibleMonthLabel}</Text>
          <View style={styles.calendarHeaderAction}>
            {shouldShowBackToToday ? (
              <Pressable
                onPress={goToToday}
                disabled={isInteractionLocked}
                style={({ pressed }) => [
                  styles.backToTodayButton,
                  pressed && !isInteractionLocked ? styles.pressedButton : null,
                  isInteractionLocked ? styles.disabledInteractiveItem : null,
                ]}
              >
                <Text style={styles.backToTodayText}>回今天</Text>
              </Pressable>
            ) : null}
          </View>
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
  valueText: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    gap: spacing.md,
    shadowColor: "#b97b88",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  heroHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroDate: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
  },
  heroTitle: {
    color: colors.text,
    fontSize: fontSizes.xxl,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.lg,
    lineHeight: 24,
  },
  heroMetaGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  heroMetaCard: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: radii.md,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  heroMetaLabel: {
    color: colors.textSubtle,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  heroMetaValue: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "700",
  },
  heroFootnote: {
    color: colors.textSubtle,
    fontSize: fontSizes.sm,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  cardEmptyText: {
    textAlign: "left",
  },
  calendar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  calendarHeader: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
    position: "relative",
    width: "100%",
  },
  calendarHeaderAction: {
    alignItems: "flex-end",
    justifyContent: "center",
    position: "absolute",
    right: 0,
  },
  monthTitle: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: "700",
    textAlign: "center",
  },
  backToTodayButton: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  backToTodayText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: "600",
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
    aspectRatio: 1,
    minHeight: 42,
    paddingVertical: spacing.xs,
    width: "14.2857%",
  },
  otherMonthDay: {
    opacity: 0.45,
  },
  dayTrack: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    position: "relative",
  },
  periodRangeBand: {
    backgroundColor: "transparent",
    height: 28,
    left: 4,
    overflow: "hidden",
    position: "absolute",
    right: 4,
  },
  visiblePeriodRangeBand: {
    backgroundColor: colors.surfaceSoft,
  },
  periodRangeBandStart: {
    left: 8,
    borderBottomLeftRadius: radii.md,
    borderTopLeftRadius: radii.md,
  },
  periodRangeBandEnd: {
    right: 8,
    borderBottomRightRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  periodRangeBandSingleDay: {
    height: 34,
    left: 2,
    borderRadius: radii.md,
    right: 2,
  },
  dayContent: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    justifyContent: "center",
    maxWidth: 42,
    width: "100%",
  },
  pendingStartDay: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  selectedPendingStartDay: {
    borderColor: colors.onPrimary,
    borderWidth: 2,
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
    color: colors.primary,
  },
  selectedDayText: {
    color: colors.onPrimary,
  },
  detailSection: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    gap: spacing.md,
  },
  detailContent: {
    gap: spacing.md,
  },
  label: {
    color: colors.textSubtle,
    fontSize: fontSizes.sm,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: fontSizes.lg,
  },
  markPanel: {
    gap: spacing.md,
  },
  rangeSummary: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: radii.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  rangeText: {
    color: colors.text,
    fontSize: fontSizes.md,
  },
  panelMessageText: {
    color: colors.accent,
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
    justifyContent: "flex-start",
    marginTop: spacing.xs,
  },
  actionStack: {
    gap: spacing.md,
  },
  actionButton: {
    flexGrow: 1,
  },
  pressedButton: {
    opacity: 0.7,
  },
  disabledInteractiveItem: {
    opacity: 0.55,
  },
});
