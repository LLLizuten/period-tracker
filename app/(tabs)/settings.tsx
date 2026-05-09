import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  clearPeriodRecords,
  initPeriodDatabase,
  listPeriodRecords,
} from "../../src/db/periodRecords";

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
      <View style={styles.section}>
        <Text style={styles.title}>设置</Text>
        <Text style={styles.subtleText}>本地数据与隐私</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>数据保存说明</Text>
        <Text style={styles.bodyText}>
          数据仅保存在本机 SQLite，不需要账号、不上传、不同步、不调用远程服务。
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>当前本地记录</Text>
        <Text style={styles.countText}>{isLoading ? "加载中..." : `${recordCount} 条`}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>数据操作</Text>
        <Pressable
          onPress={handleClearRecords}
          disabled={isClearDisabled}
          style={({ pressed }) => [
            styles.clearButton,
            isClearDisabled && styles.disabledButton,
            pressed && !isClearDisabled && styles.pressedButton,
          ]}
        >
          <Text
            style={[
              styles.clearButtonText,
              isClearDisabled && styles.disabledButtonText,
            ]}
          >
            {isClearing ? "清空中..." : "清空所有记录"}
          </Text>
        </Pressable>
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
  panel: {
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
  bodyText: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 24,
  },
  countText: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "700",
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#e5e7eb",
  },
  disabledButtonText: {
    color: "#6b7280",
  },
  pressedButton: {
    opacity: 0.7,
  },
});
