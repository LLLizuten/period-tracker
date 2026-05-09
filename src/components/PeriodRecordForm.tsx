import { useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { DateKey } from "../types/period";

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
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>开始日期</Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          editable={!isSubmitting}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>结束日期</Text>
        <TextInput
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          editable={!isSubmitting}
          style={styles.input}
        />
      </View>

      <View style={styles.actions}>
        {onCancel ? (
          <Pressable
            onPress={onCancel}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              (pressed || isSubmitting) && styles.mutedButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>取消</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.button,
            styles.primaryButton,
            (pressed || isSubmitting) && styles.mutedButton,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? "保存中..." : submitLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    borderColor: "#d1d5db",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  button: {
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
  secondaryButton: {
    backgroundColor: "#f3f4f6",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  mutedButton: {
    opacity: 0.6,
  },
});
