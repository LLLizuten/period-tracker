import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";

import {
  DangerButton,
  LabelText,
  ScreenSection,
  SectionCard,
} from "../../src/components/ui";
import {
  clearPeriodRecords,
  initPeriodDatabase,
  listPeriodRecords,
} from "../../src/db/periodRecords";
import { colors, fontSizes, spacing } from "../../src/theme";

export default function SettingsScreen() {
  const [recordCount, setRecordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const loadRecordCount = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      // 进入页面时先确保本地表存在，再读取记录数量用于展示当前状态。
      await initPeriodDatabase();
      const records = await listPeriodRecords();

      if (isActive()) {
        setRecordCount(records.length);
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
      void loadRecordCount(() => isActive);

      return () => {
        isActive = false;
      };
    }, [loadRecordCount]),
  );

  const handleClearRecords = () => {
    Alert.alert("清空所有记录", "确认清空本机保存的全部经期记录吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "清空",
        style: "destructive",
        onPress: () => {
          void clearAllRecords();
        },
      },
    ]);
  };

  const clearAllRecords = async () => {
    try {
      setIsClearing(true);
      // 清空前再次初始化表结构，保证首次进入设置页也能执行重置操作。
      await initPeriodDatabase();
      await clearPeriodRecords();
      setRecordCount(0);
      Alert.alert("清空成功", "本机经期记录已全部清空。");
    } catch {
      Alert.alert("清空失败", "请稍后重试");
    } finally {
      setIsClearing(false);
    }
  };

  const isClearDisabled = isLoading || isClearing || recordCount === 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenSection style={styles.headerSection}>
        <Text style={styles.title}>设置</Text>
        <Text style={styles.subtleText}>本地数据与隐私</Text>
      </ScreenSection>

      <ScreenSection>
        <SectionCard style={styles.infoCard}>
          <LabelText>数据保存说明</LabelText>
        <Text style={styles.bodyText}>
          数据仅保存在本机 SQLite，不需要账号、不上传、不同步、不调用远程服务。
        </Text>
        </SectionCard>

        <SectionCard style={styles.infoCard}>
          <LabelText>当前本地记录</LabelText>
        <Text style={styles.countText}>{isLoading ? "加载中..." : `${recordCount} 条`}</Text>
        </SectionCard>
      </ScreenSection>

      <SectionCard style={styles.dangerCard}>
        <LabelText style={styles.dangerTitle}>数据操作</LabelText>
        <DangerButton
          onPress={handleClearRecords}
          disabled={isClearDisabled}
        >
          {isClearing ? "清空中..." : "清空所有记录"}
        </DangerButton>
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
  infoCard: {
    gap: spacing.sm,
  },
  bodyText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    lineHeight: 24,
  },
  countText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  dangerCard: {
    backgroundColor: colors.roseSurface,
    borderColor: colors.rose,
    gap: spacing.md,
  },
  dangerTitle: {
    color: colors.rose,
  },
});
