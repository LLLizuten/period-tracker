# 日历首页新增记录优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页和日历页合并为一个日历优先首页，并让用户通过“选中日期 + 大姨妈开始/结束开关”自动新增经期记录。

**Architecture:** 首页 `app/(tabs)/index.tsx` 成为唯一主页面，承载摘要、月历和日期详情面板。新增流程只用本地 `pendingStartDate` 表达待完成状态，开始开关只更新本地状态，结束开关调用现有 `createPeriodRecord` 自动保存。日期范围排序沉到 `src/utils/date.ts`，保持页面逻辑简洁。

**Tech Stack:** Expo Router、React Native、TypeScript、expo-sqlite、Jest。

---

## 协作约束

- 统筹 agent 不直接编写业务代码，只负责派发任务、审阅结果和维护计划。
- 每个实现子 agent 必须说明自己修改的文件路径。
- 子 agent 不要执行 `git commit`、`git push`、`git reset --hard`，除非主人另行明确要求。
- 子 agent 不能回退其他 agent 或用户已有改动。
- 代码注释使用中文，核心逻辑需要简短注释。

## 文件结构

- Modify: `src/utils/date.ts`
  - 新增日期范围排序工具，给自动保存开始/结束区间使用。
- Modify: `src/utils/date.test.ts`
  - 为日期范围排序补充单元测试。
- Modify: `app/(tabs)/index.tsx`
  - 合并首页摘要、月历、日期详情和新增开关流程。
- Modify: `app/(tabs)/_layout.tsx`
  - 隐藏独立日历 tab，保留首页和设置。
- Optional Modify: `app/(tabs)/calendar.tsx`
  - 如果实现 agent 认为保留直接路由会造成歧义，可改成轻量重定向或复用首页说明；不要删除文件。

## Task 1: 日期范围排序工具

**Files:**
- Modify: `src/utils/date.ts`
- Modify: `src/utils/date.test.ts`

- [ ] **Step 1: 写失败测试**

在 `src/utils/date.test.ts` 的 `jest.requireActual` 解构里加入 `sortDateRange`：

```ts
const {
  addDays,
  daysBetween,
  formatDisplayDate,
  getMonthMatrix,
  isDateInRange,
  parseDateKey,
  sortDateRange,
  toDateKey,
} = jest.requireActual<typeof import("./date")>("./date");
```

在 `describe("date utilities", () => { ... })` 内追加：

```ts
test("sortDateRange 按自然日期返回有序区间", () => {
  expect(sortDateRange("2026-05-09", "2026-05-13")).toEqual({
    startDate: "2026-05-09",
    endDate: "2026-05-13",
  });
  expect(sortDateRange("2026-05-13", "2026-05-09")).toEqual({
    startDate: "2026-05-09",
    endDate: "2026-05-13",
  });
  expect(sortDateRange("2026-05-09", "2026-05-09")).toEqual({
    startDate: "2026-05-09",
    endDate: "2026-05-09",
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand src/utils/date.test.ts`

Expected: FAIL，错误包含 `sortDateRange is not a function` 或等价的导出缺失信息。

- [ ] **Step 3: 实现最小工具函数**

在 `src/utils/date.ts` 的 `isDateInRange` 后加入：

```ts
// 将任意两个日期整理为有序闭区间，降低用户先选结束日期的操作成本。
export function sortDateRange(
  firstDate: DateKey,
  secondDate: DateKey,
): { startDate: DateKey; endDate: DateKey } {
  if (daysBetween(firstDate, secondDate) >= 0) {
    return {
      startDate: firstDate,
      endDate: secondDate,
    };
  }

  return {
    startDate: secondDate,
    endDate: firstDate,
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand src/utils/date.test.ts`

Expected: PASS。

## Task 2: 合并首页与日历新增交互

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: 先阅读现有页面**

Run:

```bash
sed -n '1,260p' "app/(tabs)/index.tsx"
sed -n '1,360p' "app/(tabs)/calendar.tsx"
```

Expected: 明确首页摘要逻辑来自 `index.tsx`，月历、编辑、删除逻辑来自 `calendar.tsx`。

- [ ] **Step 2: 更新 `index.tsx` imports**

将 `app/(tabs)/index.tsx` 顶部 imports 调整为包含日历需要的组件和数据库方法。实现后应至少包含：

```ts
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { getRecordForDate, isPeriodDate } from "../../src/utils/calendar";
import {
  daysBetween,
  formatDisplayDate,
  getMonthMatrix,
  parseDateKey,
  sortDateRange,
  toDateKey,
} from "../../src/utils/date";
import { getLatestRecord, predictNextPeriod } from "../../src/utils/prediction";
```

- [ ] **Step 3: 添加首页状态**

在 `HomeScreen` 内保留 `records`、`isLoading`，并加入以下状态：

```ts
const today = new Date();
const todayKey = toDateKey(today);
const [selectedDate, setSelectedDate] = useState<DateKey>(todayKey);
const [visibleMonth, setVisibleMonth] = useState(
  () => new Date(today.getFullYear(), today.getMonth(), 1, 12),
);
const [isEditing, setIsEditing] = useState(false);
const [pendingStartDate, setPendingStartDate] = useState<DateKey | null>(null);
const [isSavingMark, setIsSavingMark] = useState(false);
const isFocusedRef = useRef(false);
```

保留并调整已有派生数据：

```ts
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
const isTodayInPeriod = useMemo(
  () => isPeriodDate(records, todayKey),
  [records, todayKey],
);
const daysUntilNextPeriod = prediction
  ? daysBetween(todayKey, prediction.nextStartDate)
  : null;
```

- [ ] **Step 4: 复用并调整加载逻辑**

将 `loadRecords` 改成与日历页一致的聚焦安全写法：

```ts
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
```

`useFocusEffect` 使用：

```ts
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
```

- [ ] **Step 5: 实现月份与日期选择行为**

加入：

```ts
const changeMonth = (offset: number) => {
  setVisibleMonth(
    (currentMonth) =>
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1, 12),
  );
  setIsEditing(false);
};

const goToToday = () => {
  const nextToday = new Date();

  setSelectedDate(toDateKey(nextToday));
  setVisibleMonth(new Date(nextToday.getFullYear(), nextToday.getMonth(), 1, 12));
  setIsEditing(false);
};

const handleSelectDate = (dateKey: DateKey) => {
  setSelectedDate(dateKey);
  setIsEditing(false);
};
```

- [ ] **Step 6: 实现开始/结束开关逻辑**

加入：

```ts
const handleTogglePeriodMark = async (value: boolean) => {
  if (isSavingMark) {
    return;
  }

  if (!value) {
    setPendingStartDate(null);
    return;
  }

  if (!pendingStartDate) {
    setPendingStartDate(selectedDate);
    return;
  }

  const nextRecordInput = sortDateRange(pendingStartDate, selectedDate);

  setIsSavingMark(true);
  try {
    await initPeriodDatabase();
    await createPeriodRecord(nextRecordInput);
    await loadRecords();
    if (isFocusedRef.current) {
      setPendingStartDate(null);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "请稍后重试";
    Alert.alert("保存失败", message);
  } finally {
    if (isFocusedRef.current) {
      setIsSavingMark(false);
    }
  }
};
```

- [ ] **Step 7: 保留编辑和删除已有记录能力**

从 `calendar.tsx` 迁移 `handleSaveRecord`、`handleDeleteRecord`、`deleteSelectedRecord`，目标行为：

```ts
const handleSaveRecord = async (input: { startDate: DateKey; endDate: DateKey }) => {
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
```

删除确认沿用现有文案 `删除记录`、`确认删除这条经期记录吗？`，删除成功后清空 `isEditing`。

- [ ] **Step 8: 实现日历日期渲染**

从 `calendar.tsx` 迁移 `WEEK_DAYS` 和 `renderDay`，并额外标记待完成开始日期：

```ts
const isPendingStart = day.dateKey === pendingStartDate;
```

样式数组中加入：

```ts
isPendingStart && styles.pendingStartDay,
```

文本样式中加入：

```ts
isPendingStart && styles.pendingStartDayText,
```

日期格底部圆点继续按 `dayRecord` 显示，已有记录仍优先使用经期样式。

- [ ] **Step 9: 实现详情面板渲染**

新增 `renderSelectedDetail`，逻辑顺序必须是：

1. `isLoading` 时显示 `加载中...`
2. `selectedRecord` 存在时展示已有记录详情、编辑、删除
3. 无记录时展示新增开关

新增开关区域代码结构：

```tsx
<View style={styles.markRow}>
  <View style={styles.markLabelGroup}>
    <Text style={styles.markIcon}>💧</Text>
    <View style={styles.markTextGroup}>
      <Text style={styles.valueText}>
        {pendingStartDate ? "大姨妈结束" : "大姨妈开始"}
      </Text>
      <Text style={styles.helperText}>
        {pendingStartDate
          ? `开始日期：${formatDisplayDate(pendingStartDate)}`
          : `当前选择：${formatDisplayDate(selectedDate)}`}
      </Text>
    </View>
  </View>
  <Switch
    value={pendingStartDate === selectedDate || isSavingMark}
    onValueChange={handleTogglePeriodMark}
    disabled={isLoading || isSavingMark}
    trackColor={{ false: colors.borderStrong, true: colors.rose }}
    thumbColor={colors.surface}
  />
</View>
```

如果实现 agent 担心 emoji 与项目风格不一致，可以把 `markIcon` 改成纯文本 `"水滴"` 或不显示图标，但不要引入新依赖。

- [ ] **Step 10: 重组 JSX 页面**

页面结构按以下顺序组织：

```tsx
<ScrollView contentContainerStyle={styles.container}>
  <ScreenSection style={styles.headerSection}>...</ScreenSection>
  <View style={styles.summaryGrid}>今日状态 / 最近记录 / 预计下一次开始日期</View>
  <View style={styles.monthHeader}>上个月 / 月份标题 / 下个月 / 回今天</View>
  <View style={styles.calendar}>星期行 + 日期格</View>
  <SectionCard style={styles.detailSection}>选中日期标题 + renderSelectedDetail()</SectionCard>
</ScrollView>
```

不要保留旧的“新增记录”按钮和首页中的 `isAdding`、`formKey` 状态。

- [ ] **Step 11: 样式整理**

在 `StyleSheet.create` 中合并首页和日历样式，至少包含：

```ts
summaryGrid: {
  gap: spacing.md,
},
summaryCard: {
  gap: spacing.sm,
},
monthHeader: {
  alignItems: "center",
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: radii.lg,
  borderWidth: 1,
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.md,
  justifyContent: "space-between",
  padding: spacing.md,
},
pendingStartDay: {
  backgroundColor: colors.tealSurface,
  borderColor: colors.teal,
},
pendingStartDayText: {
  color: colors.teal,
},
markRow: {
  alignItems: "center",
  flexDirection: "row",
  gap: spacing.md,
  justifyContent: "space-between",
},
markLabelGroup: {
  alignItems: "center",
  flex: 1,
  flexDirection: "row",
  gap: spacing.md,
},
markIcon: {
  color: colors.text,
  fontSize: 28,
},
markTextGroup: {
  flex: 1,
  gap: spacing.xs,
},
```

保留日历已有的 `dayCell` 固定宽度和 `aspectRatio: 1`，避免月历布局跳动。

- [ ] **Step 12: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS。若失败，优先修正 `DateKey`、`PeriodRecordForm` props、`Switch` props 和样式类型。

## Task 3: Tab 路由合并与日历入口清理

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Optional Modify: `app/(tabs)/calendar.tsx`

- [ ] **Step 1: 隐藏独立日历 tab**

修改 `app/(tabs)/_layout.tsx`：

```tsx
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "首页" }} />
      <Tabs.Screen
        name="calendar"
        options={{
          href: null,
          title: "日历",
        }}
      />
      <Tabs.Screen name="settings" options={{ title: "设置" }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: 判断是否需要处理直接访问日历路由**

如果 `href: null` 类型检查失败，改用不隐藏路由的最小方案：

```tsx
<Tabs.Screen name="calendar" options={{ title: "日历" }} />
```

并在最终说明中记录“日历 tab 暂未隐藏，需要后续确认 Expo Router 当前版本的隐藏写法”。不要为隐藏 tab 引入新依赖。

- [ ] **Step 3: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS。

## Task 4: 全量验证

**Files:**
- No production file ownership unless修复验证发现的小问题。

- [ ] **Step 1: 运行单元测试**

Run: `npm test -- --runInBand`

Expected: PASS。

- [ ] **Step 2: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS。

- [ ] **Step 3: 启动 Expo Web 做人工冒烟**

Run: `npm run web`

Expected: Expo Web server starts successfully and prints a local URL.

手动验证清单：

- 首页打开后顶部摘要、月历和详情面板同时存在。
- 点击无记录日期，底部显示 `大姨妈开始`。
- 打开开始开关后，当前日期以待完成开始样式高亮。
- 再点击另一个无记录日期，底部显示 `大姨妈结束`。
- 打开结束开关后自动保存记录，月历对应区间显示经期样式。
- 先选较晚日期作为开始、再选较早日期作为结束，也能保存为正确有序区间。
- 点击已有记录日期，底部展示记录范围、编辑、删除，不展示新增开关。
- 编辑已有记录仍可使用原日期表单保存。

- [ ] **Step 4: 停止开发服务器**

如果 `npm run web` 仍在运行，结束该进程，避免留下长期会话。

## Self-Review

- Spec coverage: 页面合并、开关新增、自动保存、已有记录编辑删除、错误处理和测试验证均有对应任务。
- Placeholder scan: 无 `TBD`、`TODO` 或未定义的“后续实现”占位。
- Type consistency: 计划中使用的 `DateKey`、`PeriodRecord`、`pendingStartDate`、`selectedDate`、`sortDateRange` 命名保持一致。
