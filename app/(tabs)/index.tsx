import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
  createPeriodRecord,
  initPeriodDatabase,
  listPeriodRecords,
} from "../../src/db/periodRecords";
import type { DateKey, PeriodRecord } from "../../src/types/period";
import { isPeriodDate } from "../../src/utils/calendar";
import { daysBetween, formatDisplayDate, toDateKey } from "../../src/utils/date";
import { getLatestRecord, predictNextPeriod } from "../../src/utils/prediction";

export default function HomeScreen() {
  const [records, setRecords] = useState<PeriodRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const todayKey = toDateKey(new Date());
  const latestRecord = useMemo(() => getLatestRecord(records), [records]);
  const prediction = useMemo(() => predictNextPeriod(records), [records]);
  const isTodayInPeriod = useMemo(
    () => isPeriodDate(records, todayKey),
    [records, todayKey],
  );
  const daysUntilNextPeriod = prediction
    ? daysBetween(todayKey, prediction.nextStartDate)
    : null;

  const loadRecords = useCallback(async (isActive: () => boolean = () => true) => {
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      setIsLoading(true);
      void loadRecords(() => isActive);

      return () => {
        isActive = false;
      };
    }, [loadRecords]),
  );

  const handleCreateRecord = async (input: { startDate: DateKey; endDate: DateKey }) => {
    await initPeriodDatabase();
    await createPeriodRecord(input);
    await loadRecords();

    // 保存成功后卸载表单并更新 key，下一次展开获得干净输入状态。
    setIsAdding(false);
    setFormKey((currentKey) => currentKey + 1);
  };

  const renderLatestRecord = () => {
    if (!latestRecord) {
      return <Text style={styles.emptyText}>暂无记录</Text>;
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
      return <Text style={styles.emptyText}>暂无预计日期</Text>;
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>首页</Text>
        <Text style={styles.subtleText}>今天：{formatDisplayDate(todayKey)}</Text>
      </View>

      <View style={styles.statusPanel}>
        <Text style={styles.label}>今日状态</Text>
        <Text style={styles.statusText}>
          {isTodayInPeriod ? "处于已记录经期内" : "不在已记录经期内"}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>最近一次经期记录</Text>
        {isLoading ? <Text style={styles.emptyText}>加载中...</Text> : renderLatestRecord()}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>预计下一次开始日期</Text>
        {isLoading ? <Text style={styles.emptyText}>加载中...</Text> : renderPrediction()}
      </View>

      <View style={styles.section}>
        {isAdding ? (
          <PeriodRecordForm
            key={formKey}
            submitLabel="保存记录"
            onSubmit={handleCreateRecord}
            onCancel={() => setIsAdding(false)}
          />
        ) : (
          <View style={styles.addSection}>
            {records.length === 0 && !isLoading ? (
              <Text style={styles.emptyText}>添加第一条记录</Text>
            ) : null}
            <Pressable
              onPress={() => {
                if (!isLoading) {
                  setIsAdding(true);
                }
              }}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.addButton,
                (pressed || isLoading) && styles.pressedButton,
              ]}
            >
              <Text style={styles.addButtonText}>新增记录</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    padding: 20,
  },
  section: {
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
  statusPanel: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  label: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  statusText: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "700",
  },
  valueText: {
    color: "#111827",
    fontSize: 18,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 16,
  },
  predictionGroup: {
    gap: 4,
  },
  helperText: {
    color: "#4b5563",
    fontSize: 16,
  },
  addSection: {
    gap: 12,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  pressedButton: {
    opacity: 0.7,
  },
});
