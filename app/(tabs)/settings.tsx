import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  DangerButton,
  InlineConfirmPanel,
  LabelText,
  PrimaryButton,
  ScreenSection,
  SecondaryButton,
  SectionCard,
  StatusMessage,
} from "../../src/components/ui";
import {
  clearCycleLengthDays,
  getPredictionSettings,
  initPredictionSettingsDatabase,
  saveCycleLengthDays,
} from "../../src/db/predictionSettings";
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
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [cycleLengthDays, setCycleLengthDays] = useState<number | null>(null);
  const [cycleLengthInput, setCycleLengthInput] = useState("");
  const [predictionStatusMessage, setPredictionStatusMessage] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);

  const loadSettings = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      // 进入页面时先确保本地表存在，再读取记录数量和预测设置用于展示当前状态。
      await initPeriodDatabase();
      await initPredictionSettingsDatabase();
      const records = await listPeriodRecords();
      const predictionSettings = await getPredictionSettings();

      if (isActive()) {
        setRecordCount(records.length);
        setCycleLengthDays(predictionSettings.cycleLengthDays);
        setCycleLengthInput(
          predictionSettings.cycleLengthDays === null
            ? ""
            : String(predictionSettings.cycleLengthDays),
        );
        setLoadError("");
      }
    } catch (error) {
      if (isActive()) {
        const message = error instanceof Error ? error.message : "请稍后重试";
        setLoadError(`加载失败：${message}`);
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
      void loadSettings(() => isActive);

      return () => {
        isActive = false;
      };
    }, [loadSettings]),
  );

  const isClearDisabled = isLoading || isClearing || recordCount === 0;

  const handleSaveCycleLength = async () => {
    const parsedCycleLength = Number(cycleLengthInput);

    if (
      cycleLengthInput.trim() === "" ||
      !Number.isInteger(parsedCycleLength) ||
      parsedCycleLength < 21 ||
      parsedCycleLength > 35
    ) {
      setPredictionStatusMessage({
        text: "周期长度需为 21-35 天的整数。",
        tone: "error",
      });
      return;
    }

    try {
      await initPredictionSettingsDatabase();
      await saveCycleLengthDays(parsedCycleLength);
      setCycleLengthDays(parsedCycleLength);
      setCycleLengthInput(String(parsedCycleLength));
      setPredictionStatusMessage({
        text: "周期设置已保存。",
        tone: "success",
      });
    } catch {
      setPredictionStatusMessage({
        text: "保存失败，请稍后重试。",
        tone: "error",
      });
    }
  };

  const handleClearCycleLength = async () => {
    try {
      await initPredictionSettingsDatabase();
      await clearCycleLengthDays();
      setCycleLengthDays(null);
      setCycleLengthInput("");
      setPredictionStatusMessage({
        text: "已恢复智能预测。",
        tone: "success",
      });
    } catch {
      setPredictionStatusMessage({
        text: "恢复失败，请稍后重试。",
        tone: "error",
      });
    }
  };

  const handleClearRecords = () => {
    if (isClearDisabled) {
      return;
    }

    setStatusMessage(null);
    setIsConfirmingClear(true);
  };

  const clearAllRecords = async () => {
    if (isClearDisabled) {
      return;
    }

    try {
      setIsClearing(true);
      // 清空前再次初始化表结构，保证首次进入设置页也能执行重置操作。
      await initPeriodDatabase();
      await clearPeriodRecords();
      setRecordCount(0);
      setIsConfirmingClear(false);
      setStatusMessage({
        text: "清空成功，本机经期记录已全部清空。",
        tone: "success",
      });
    } catch {
      setStatusMessage({
        text: "清空失败，请稍后重试。",
        tone: "error",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenSection style={styles.headerSection}>
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
        {loadError ? (
          <StatusMessage tone="error">{loadError}</StatusMessage>
        ) : null}
        </SectionCard>
      </ScreenSection>

      <SectionCard style={styles.infoCard}>
        <LabelText>经期预测设置</LabelText>
        <Text style={styles.countText}>
          {cycleLengthDays === null ? "智能预测" : `固定周期：${cycleLengthDays} 天`}
        </Text>
        <Text style={styles.bodyText}>未设置周期长度时，将根据历史记录自动估算。</Text>
        <TextInput
          value={cycleLengthInput}
          onChangeText={setCycleLengthInput}
          placeholder="21-35"
          keyboardType="number-pad"
          style={styles.input}
        />
        <View style={styles.predictionActions}>
          <PrimaryButton
            onPress={() => {
              void handleSaveCycleLength();
            }}
            style={styles.predictionActionButton}
          >
            保存周期
          </PrimaryButton>
          <SecondaryButton
            onPress={() => {
              void handleClearCycleLength();
            }}
            style={styles.predictionActionButton}
          >
            使用智能预测
          </SecondaryButton>
        </View>
        {predictionStatusMessage ? (
          <StatusMessage tone={predictionStatusMessage.tone}>
            {predictionStatusMessage.text}
          </StatusMessage>
        ) : null}
      </SectionCard>

      <SectionCard style={styles.dangerCard}>
        <LabelText style={styles.dangerTitle}>数据操作</LabelText>
        {isConfirmingClear ? (
          <InlineConfirmPanel
            title="清空所有记录"
            description="确认清空本机保存的全部经期记录吗？"
            confirmLabel={isClearing ? "清空中..." : "确认清空"}
            cancelLabel="取消"
            confirmTone="danger"
            disabled={isClearDisabled}
            onConfirm={() => {
              void clearAllRecords();
            }}
            onCancel={() => {
              setIsConfirmingClear(false);
            }}
          />
        ) : (
          <DangerButton
            onPress={handleClearRecords}
            disabled={isClearDisabled}
          >
            {isClearing ? "清空中..." : "清空所有记录"}
          </DangerButton>
        )}
        {statusMessage ? (
          <StatusMessage tone={statusMessage.tone}>{statusMessage.text}</StatusMessage>
        ) : null}
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
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  predictionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  predictionActionButton: {
    flexGrow: 1,
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
