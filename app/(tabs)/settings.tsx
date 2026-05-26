import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import {
  DangerButton,
  InlineConfirmPanel,
  LabelText,
  PrimaryButton,
  ScreenSection,
  SecondaryButton,
  SectionCard,
  StatusMessage,
  Toast,
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
import {
  exportDatabase,
  importDatabaseFromPicker,
} from "../../src/utils/backup";
import { colors, fontSizes, spacing } from "../../src/theme";

export default function SettingsScreen() {
  const [recordCount, setRecordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [cycleLengthDays, setCycleLengthDays] = useState<number | null>(null);
  const [cycleLengthInput, setCycleLengthInput] = useState("");
  const [isIntelligentMode, setIsIntelligentMode] = useState(true);
  const [toastState, setToastState] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
        setIsIntelligentMode(predictionSettings.cycleLengthDays === null);
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
      setToastState({
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
      setToastState({
        text: "周期设置已保存。",
        tone: "success",
      });
    } catch {
      setToastState({
        text: "保存失败，请稍后重试。",
        tone: "error",
      });
    }
  };

  const handleModeSwitch = async (newValue: boolean) => {
    if (newValue === true) {
      // 切换到智能预测 → 清除固定周期数据
      if (isIntelligentMode) return;
      try {
        await initPredictionSettingsDatabase();
        await clearCycleLengthDays();
        setCycleLengthDays(null);
        setCycleLengthInput("");
        setIsIntelligentMode(true);
        setToastState({
          text: "已切换为智能预测模式。",
          tone: "success",
        });
      } catch {
        setToastState({
          text: "切换失败，请稍后重试。",
          tone: "error",
        });
      }
    } else {
      // 切换到固定周期 → 展开输入区
      if (!isIntelligentMode) return;
      setIsIntelligentMode(false);
      setCycleLengthInput(cycleLengthDays === null ? "" : String(cycleLengthDays));
    }
  };

  const handleClearRecords = () => {
    if (isClearDisabled) {
      return;
    }

    setIsConfirmingClear(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportDatabase();
      // 导出后重新加载数据，确保页面状态与数据库一致。
      await loadSettings();
      setToastState({ text: "备份导出成功，请妥善保管文件。", tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      setToastState({ text: `导出失败：${message}`, tone: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await importDatabaseFromPicker();
      await loadSettings();
      setToastState({ text: "数据恢复成功。", tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      if (message !== "User canceled") {
        setToastState({ text: `恢复失败：${message}`, tone: "error" });
      }
    } finally {
      setIsImporting(false);
    }
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
      setToastState({
        text: "清空成功，本机经期记录已全部清空。",
        tone: "success",
      });
    } catch {
      setToastState({
        text: "清空失败，请稍后重试。",
        tone: "error",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
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

        {/* Switch 行：控制智能预测 / 固定周期 */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>使用智能预测</Text>
          <Switch
            value={isIntelligentMode}
            onValueChange={(newValue) => {
              void handleModeSwitch(newValue);
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.border}
          />
        </View>

        {/* 智能预测模式 — 展示说明 */}
        {isIntelligentMode ? (
          <Text style={styles.bodyText}>
            {recordCount > 0
              ? `已启用，基于 ${recordCount} 条记录自动估算下次经期。`
              : "暂无记录，添加记录后将自动启用预测。"}
          </Text>
        ) : null}

        {/* 固定周期模式 — 输入 + 保存 */}
        {!isIntelligentMode ? (
          <>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>固定周期：</Text>
              <TextInput
                value={cycleLengthInput}
                onChangeText={setCycleLengthInput}
                placeholder="21-35"
                keyboardType="number-pad"
                style={styles.input}
              />
              <Text style={styles.inputUnit}>天</Text>
            </View>
            <PrimaryButton
              onPress={() => {
                void handleSaveCycleLength();
              }}
            >
              保存周期
            </PrimaryButton>
          </>
        ) : null}

      </SectionCard>

      <SectionCard style={styles.infoCard}>
        <LabelText>备份与恢复</LabelText>
        <Text style={styles.bodyText}>
          将数据导出为文件，或从之前导出的备份文件恢复数据。
        </Text>
        <View style={styles.predictionActions}>
          <PrimaryButton
            onPress={() => {
              void handleExport();
            }}
            disabled={isExporting || isImporting}
            style={styles.predictionActionButton}
          >
            {isExporting ? "导出中..." : "导出备份"}
          </PrimaryButton>
          <SecondaryButton
            onPress={() => {
              void handleImport();
            }}
            disabled={isExporting || isImporting}
            style={styles.predictionActionButton}
          >
            {isImporting ? "恢复中..." : "恢复备份"}
          </SecondaryButton>
        </View>
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
      </SectionCard>
    </ScrollView>
      {toastState && (
        <Toast
          key={toastState.text}
          message={toastState.text}
          tone={toastState.tone}
          onDismiss={() => setToastState(null)}
        />
      )}
    </View>
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
    flex: 1,
    fontSize: fontSizes.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    color: colors.text,
    flexShrink: 1,
    fontSize: fontSizes.lg,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inputLabel: {
    color: colors.text,
    fontSize: fontSizes.lg,
  },
  inputUnit: {
    color: colors.textMuted,
    fontSize: fontSizes.lg,
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
