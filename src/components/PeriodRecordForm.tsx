import { useRef, useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";

import { colors, fontSizes, radii, spacing } from "../theme";
import type { DateKey } from "../types/period";
import {
  LabelText,
  PrimaryButton,
  ScreenSection,
  SecondaryButton,
} from "./ui";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface PeriodRecordFormProps {
  initialStartDate?: DateKey;
  initialEndDate?: DateKey;
  submitLabel: string;
  onSubmit(input: { startDate: DateKey; endDate: DateKey }): Promise<void> | void;
  onCancel?: () => void;
}

export function PeriodRecordForm({
  initialStartDate = "",
  initialEndDate = "",
  submitLabel,
  onSubmit,
  onCancel,
}: PeriodRecordFormProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    const normalizedStartDate = startDate.trim();
    const normalizedEndDate = endDate.trim();

    // 保存前按顺序完成基础校验，确保字符串日期比较的前提成立。
    if (!normalizedStartDate || !normalizedEndDate) {
      Alert.alert("请填写完整日期");
      return;
    }

    if (
      !DATE_KEY_PATTERN.test(normalizedStartDate) ||
      !DATE_KEY_PATTERN.test(normalizedEndDate)
    ) {
      Alert.alert("日期格式错误", "请使用 YYYY-MM-DD 格式");
      return;
    }

    if (normalizedStartDate > normalizedEndDate) {
      Alert.alert("开始日期不能晚于结束日期");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit({
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      Alert.alert("保存失败", message);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenSection>
      <View style={styles.field}>
        <LabelText>开始日期</LabelText>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          editable={!isSubmitting}
          style={[styles.input, isSubmitting ? styles.disabledInput : null]}
        />
      </View>

      <View style={styles.field}>
        <LabelText>结束日期</LabelText>
        <TextInput
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          editable={!isSubmitting}
          style={[styles.input, isSubmitting ? styles.disabledInput : null]}
        />
      </View>

      <View style={styles.actions}>
        {onCancel ? (
          <SecondaryButton onPress={onCancel} disabled={isSubmitting}>
            取消
          </SecondaryButton>
        ) : null}

        <PrimaryButton onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : submitLabel}
        </PrimaryButton>
      </View>
    </ScreenSection>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.lg,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  disabledInput: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "flex-end",
  },
});
