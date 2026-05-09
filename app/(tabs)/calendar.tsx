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
  deletePeriodRecord,
  initPeriodDatabase,
  listPeriodRecords,
  updatePeriodRecord,
} from "../../src/db/periodRecords";
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
          <Pressable
            onPress={() => setIsEditing(true)}
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryButton,
              pressed && styles.pressedButton,
            ]}
          >
            <Text style={styles.primaryButtonText}>编辑</Text>
          </Pressable>
          <Pressable
            onPress={handleDeleteRecord}
            style={({ pressed }) => [
              styles.actionButton,
              styles.dangerButton,
              pressed && styles.pressedButton,
            ]}
          >
            <Text style={styles.dangerButtonText}>删除</Text>
          </Pressable>
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

      <View style={styles.detailSection}>
        <Text style={styles.label}>
          {selectedDateObject.getMonth() + 1}月{selectedDateObject.getDate()}日
        </Text>
        {renderSelectedDetail()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    padding: 20,
  },
  header: {
    gap: 8,
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "700",
  },
  subtleText: {
    color: "#6b7280",
    fontSize: 15,
  },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  monthButton: {
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },
  monthTitle: {
    color: "#111827",
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  calendar: {
    gap: 8,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekText: {
    color: "#6b7280",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    alignItems: "center",
    aspectRatio: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: 6,
    marginHorizontal: "0.7%",
    width: "12.88%",
  },
  otherMonthDay: {
    backgroundColor: "#f9fafb",
  },
  periodDay: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  selectedDay: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  pressedDay: {
    opacity: 0.72,
  },
  dayText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
  otherMonthText: {
    color: "#9ca3af",
  },
  periodDayText: {
    color: "#991b1b",
  },
  selectedDayText: {
    color: "#ffffff",
  },
  periodDot: {
    borderRadius: 3,
    height: 6,
    marginTop: 4,
    width: 6,
  },
  visiblePeriodDot: {
    backgroundColor: "#dc2626",
  },
  hiddenPeriodDot: {
    backgroundColor: "transparent",
  },
  detailSection: {
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  detailContent: {
    gap: 10,
  },
  label: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  valueText: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "600",
  },
  helperText: {
    color: "#4b5563",
    fontSize: 16,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 4,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 8,
    minWidth: 88,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: "#fee2e2",
  },
  dangerButtonText: {
    color: "#991b1b",
    fontSize: 16,
    fontWeight: "600",
  },
  pressedButton: {
    opacity: 0.7,
  },
});
