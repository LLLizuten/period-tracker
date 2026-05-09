import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PeriodRecordForm } from "../../src/components/PeriodRecordForm";
import {
  EmptyText,
  LabelText,
  PrimaryButton,
  ScreenSection,
  SectionCard,
} from "../../src/components/ui";
import {
  createPeriodRecord,
  initPeriodDatabase,
  listPeriodRecords,
} from "../../src/db/periodRecords";
import { colors, fontSizes, radii, spacing } from "../../src/theme";
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenSection style={styles.headerSection}>
        <Text style={styles.title}>首页</Text>
        <Text style={styles.subtleText}>今天：{formatDisplayDate(todayKey)}</Text>
      </ScreenSection>

      <SectionCard
        style={[
          styles.statusCard,
          isTodayInPeriod ? styles.periodStatusCard : styles.normalStatusCard,
        ]}
      >
        <LabelText>今日状态</LabelText>
        <Text style={styles.statusText}>
          {isTodayInPeriod ? "处于已记录经期内" : "不在已记录经期内"}
        </Text>
      </SectionCard>

      <ScreenSection>
        <SectionCard style={styles.infoCard}>
          <LabelText>最近一次经期记录</LabelText>
          {isLoading ? (
            <EmptyText style={styles.cardEmptyText}>加载中...</EmptyText>
          ) : (
            renderLatestRecord()
          )}
        </SectionCard>

        <SectionCard style={styles.infoCard}>
          <LabelText>预计下一次开始日期</LabelText>
          {isLoading ? (
            <EmptyText style={styles.cardEmptyText}>加载中...</EmptyText>
          ) : (
            renderPrediction()
          )}
        </SectionCard>
      </ScreenSection>

      <ScreenSection>
        {isAdding ? (
          <PeriodRecordForm
            key={formKey}
            submitLabel="保存记录"
            onSubmit={handleCreateRecord}
            onCancel={() => setIsAdding(false)}
          />
        ) : (
          <SectionCard style={styles.addCard}>
            {records.length === 0 && !isLoading ? (
              <EmptyText>添加第一条记录</EmptyText>
            ) : null}
            <PrimaryButton
              onPress={() => {
                if (!isLoading) {
                  setIsAdding(true);
                }
              }}
              disabled={isLoading}
            >
              新增记录
            </PrimaryButton>
          </SectionCard>
        )}
      </ScreenSection>
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
  statusCard: {
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
  infoCard: {
    gap: spacing.sm,
  },
  statusText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  valueText: {
    color: colors.text,
    fontSize: 18,
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
  addCard: {
    gap: spacing.md,
  },
});
