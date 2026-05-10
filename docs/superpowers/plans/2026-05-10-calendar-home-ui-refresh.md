# 日历首页 UI 重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有经期记录逻辑的前提下，重做首页的视觉层级、色彩与状态表达，让用户继续只靠日历完成记录和查看。

**Architecture:** 保留 `app/(tabs)/index.tsx` 里现有的记录、查看、编辑状态机，只调整主题色、摘要区、月历区和底部操作卡的 UI 表达。公共视觉令牌收敛到 `src/theme.ts` 和 `src/components/ui.tsx`，首页和编辑表单分别在自己的组件里完成局部样式改造，避免把纯视觉变更和业务逻辑混在一起。

**Tech Stack:** Expo Router、React Native、TypeScript、Jest。

---

## 协作约束

- 统筹 agent 不直接编写业务代码，只负责派发任务、审阅结果和维护计划。
- 每个实现子 agent 必须说明自己修改的文件路径。
- 子 agent 不要执行 `git commit`、`git push`、`git reset --hard`，除非主人另行明确要求。
- 子 agent 不能回退其他 agent 或用户已有改动。
- 代码注释使用中文，核心逻辑需要简短注释。
- 按项目约定，本计划不包含任何 `git commit` 步骤。

## 文件结构

- Modify: `src/theme.ts`
  - 收敛首页 UI 重设计所需的暖色背景、豆沙玫瑰主色、危险色与更大的圆角。
- Modify: `src/components/ui.tsx`
  - 统一主按钮、次按钮、危险按钮和通用卡片的视觉风格，供首页和设置页复用。
- Modify: `app/(tabs)/index.tsx`
  - 保留现有记录逻辑，重做顶部主状态区、月历容器、日期状态表达和底部操作卡样式。
- Modify: `src/components/PeriodRecordForm.tsx`
  - 让编辑表单和首页新视觉保持一致，避免切入编辑态后出现第二套设计语言。

## Task 1: 主题令牌改成暖色、克制的健康产品风格

**Files:**
- Modify: `src/theme.ts`
- Test: `npm run typecheck`

- [ ] **Step 1: 先阅读当前主题文件**

Run:

```bash
sed -n '1,220p' "src/theme.ts"
```

Expected: 看到当前 `primary` 仍是冷蓝色，`surfaceMuted`、`teal`、`tealSurface` 还保留旧版工具风格配色。

- [ ] **Step 2: 更新主题色和圆角令牌**

将 `src/theme.ts` 替换为下面这组暖色令牌，保留现有导出结构不变：

```ts
export const colors = {
  background: "#fbf6f4",
  surface: "#ffffff",
  surfaceMuted: "#f7ecef",
  surfaceSoft: "#fff6f8",
  surfaceWarm: "#faeee7",
  border: "#eadfe1",
  borderStrong: "#dbc7cc",
  text: "#201a1c",
  textMuted: "#6f6165",
  textSubtle: "#8e7f84",
  primary: "#c97f8d",
  primaryPressed: "#b86d7c",
  onPrimary: "#ffffff",
  rose: "#b56b7d",
  roseSurface: "#fff1f3",
  success: "#8f6f77",
  successSurface: "#f8edf0",
  disabled: "#b4a7ab",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 28,
} as const;

export const fontSizes = {
  sm: 13,
  md: 15,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
```

- [ ] **Step 3: 运行类型检查确认没有主题导出报错**

Run: `npm run typecheck`

Expected: PASS，没有 `Property 'surfaceSoft' does not exist` 之类的新旧令牌不一致错误。

## Task 2: 统一公共按钮和卡片风格

**Files:**
- Modify: `src/components/ui.tsx`
- Test: `npm run typecheck`

- [ ] **Step 1: 先阅读当前通用 UI 组件**

Run:

```bash
sed -n '1,260p' "src/components/ui.tsx"
```

Expected: 看到 `PrimaryButton`、`SecondaryButton`、`DangerButton` 都已经是统一入口，但主按钮仍直接吃旧版蓝色，卡片圆角和边框也偏硬。

- [ ] **Step 2: 调整按钮和通用卡片样式**

在 `src/components/ui.tsx` 中把 `styles` 里的关键块更新成下面的样式值：

```ts
const styles = StyleSheet.create({
  screenSection: {
    gap: spacing.lg,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: fontSizes.md,
    lineHeight: 22,
    textAlign: "center",
  },
  labelText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  button: {
    alignItems: "center",
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 88,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonText: {
    fontSize: fontSizes.lg,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  primaryButtonText: {
    color: colors.onPrimary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  secondaryButtonText: {
    color: colors.text,
  },
  dangerButton: {
    backgroundColor: colors.roseSurface,
    borderColor: colors.roseSurface,
    borderWidth: 1,
  },
  dangerButtonPressed: {
    opacity: 0.82,
  },
  dangerButtonText: {
    color: colors.rose,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
```

- [ ] **Step 3: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS，且没有 `textTransform`、`letterSpacing` 等样式字段类型错误。

## Task 3: 首页顶部摘要区改成单一主状态区

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Test: `npm run typecheck`

- [ ] **Step 1: 先阅读首页当前结构**

Run:

```bash
sed -n '1,260p' "app/(tabs)/index.tsx"
sed -n '260,760p' "app/(tabs)/index.tsx"
```

Expected: 看到首页目前仍是三个摘要卡片 + 月历 + 详情卡的结构，`renderPrediction` 和 `renderLatestRecord` 仍返回旧版文字块。

- [ ] **Step 2: 重写摘要区渲染，保留现有数据派生**

在 `app/(tabs)/index.tsx` 中新增一个摘要渲染函数，替代旧的 `summaryGrid` 三卡片布局：

```ts
const renderHeroSummary = () => {
  const statusTitle = isTodayInPeriod ? "今天处于经期中" : "今天不在经期内";
  const predictionText =
    daysUntilNextPeriod === null
      ? "继续记录后会生成更稳定的预测"
      : daysUntilNextPeriod > 0
        ? `距离下一次预计开始还有 ${daysUntilNextPeriod} 天`
        : daysUntilNextPeriod === 0
          ? "预计今天开始"
          : `预计开始日已过 ${Math.abs(daysUntilNextPeriod)} 天`;

  return (
    <SectionCard style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <LabelText>Today</LabelText>
        <Text style={styles.heroDate}>今天：{formatDisplayDate(todayKey)}</Text>
      </View>
      <Text style={styles.heroTitle}>{statusTitle}</Text>
      <Text style={styles.heroSubtitle}>{predictionText}</Text>
      <View style={styles.heroMetaGrid}>
        <View style={styles.heroMetaCard}>
          <Text style={styles.heroMetaLabel}>最近记录</Text>
          <Text style={styles.heroMetaValue}>
            {latestRecord
              ? `${formatDisplayDate(latestRecord.startDate)} - ${formatDisplayDate(latestRecord.endDate)}`
              : "暂无记录"}
          </Text>
        </View>
        <View style={styles.heroMetaCard}>
          <Text style={styles.heroMetaLabel}>预计开始</Text>
          <Text style={styles.heroMetaValue}>
            {prediction ? formatDisplayDate(prediction.nextStartDate) : "暂无预计日期"}
          </Text>
        </View>
      </View>
      <Text style={styles.heroFootnote}>预测基于历史记录，仅供参考。</Text>
    </SectionCard>
  );
};
```

- [ ] **Step 3: 用摘要函数替换旧的三卡片布局**

把首页 JSX 里的这段：

```tsx
<View style={styles.summaryGrid}>
  ...
</View>
```

替换为：

```tsx
{isLoading ? (
  <SectionCard>
    <EmptyText style={styles.cardEmptyText}>加载中...</EmptyText>
  </SectionCard>
) : (
  renderHeroSummary()
)}
```

- [ ] **Step 4: 添加摘要区样式**

在 `StyleSheet.create` 中新增这些样式：

```ts
heroCard: {
  backgroundColor: colors.surfaceSoft,
  borderColor: colors.border,
  gap: spacing.md,
  shadowColor: "#b97b88",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
},
heroHeader: {
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
},
heroDate: {
  color: colors.textMuted,
  fontSize: fontSizes.md,
},
heroTitle: {
  color: colors.text,
  fontSize: fontSizes.xxl,
  fontWeight: "700",
},
heroSubtitle: {
  color: colors.textMuted,
  fontSize: fontSizes.lg,
  lineHeight: 24,
},
heroMetaGrid: {
  flexDirection: "row",
  gap: spacing.md,
},
heroMetaCard: {
  backgroundColor: "rgba(255,255,255,0.7)",
  borderRadius: radii.md,
  flex: 1,
  gap: spacing.xs,
  padding: spacing.md,
},
heroMetaLabel: {
  color: colors.textSubtle,
  fontSize: fontSizes.sm,
  fontWeight: "600",
},
heroMetaValue: {
  color: colors.text,
  fontSize: fontSizes.md,
  fontWeight: "700",
},
heroFootnote: {
  color: colors.textSubtle,
  fontSize: fontSizes.sm,
},
```

- [ ] **Step 5: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS，没有 `renderHeroSummary` 未定义或样式名缺失错误。

## Task 4: 月历主舞台化，统一日期状态色规则

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Test: `npm run typecheck`

- [ ] **Step 1: 保留现有逻辑，只改 `renderDay` 的视觉表达**

把 `renderDay` 中的状态组合保持为：

```ts
const dayRecord = getRecordForDate(records, day.dateKey);
const isSelected = day.dateKey === selectedDate;
const isMarked = isPeriodDate(records, day.dateKey);
const isPendingStart = day.dateKey === pendingStartDate;
```

不要改点击逻辑、不要改 `handleSelectDate`，只允许调整样式命名和视觉优先级。

- [ ] **Step 2: 更新月历头部和日期样式**

在 `StyleSheet.create` 中替换月历相关样式为：

```ts
monthHeader: {
  alignItems: "center",
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: radii.lg,
  borderWidth: 1,
  flexDirection: "row",
  gap: spacing.sm,
  justifyContent: "space-between",
  padding: spacing.lg,
},
monthButton: {
  alignItems: "center",
  backgroundColor: colors.surfaceMuted,
  borderRadius: 999,
  justifyContent: "center",
  minWidth: 42,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
},
monthButtonText: {
  color: colors.textMuted,
  fontSize: fontSizes.md,
  fontWeight: "600",
},
monthTitle: {
  color: colors.text,
  flex: 1,
  fontSize: fontSizes.xl,
  fontWeight: "700",
  textAlign: "center",
},
calendar: {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: radii.lg,
  borderWidth: 1,
  gap: spacing.sm,
  padding: spacing.lg,
},
dayCell: {
  alignItems: "center",
  aspectRatio: 1,
  backgroundColor: colors.surface,
  borderRadius: radii.md,
  justifyContent: "center",
  minHeight: 42,
  width: "14.2857%",
},
otherMonthDay: {
  opacity: 0.45,
},
periodDay: {
  backgroundColor: colors.surfaceSoft,
},
pendingStartDay: {
  borderColor: colors.primary,
  borderWidth: 2,
},
selectedDay: {
  backgroundColor: colors.primary,
},
dayText: {
  color: colors.text,
  fontSize: fontSizes.lg,
  fontWeight: "600",
},
periodDayText: {
  color: colors.rose,
},
pendingStartDayText: {
  color: colors.primary,
},
selectedDayText: {
  color: colors.onPrimary,
},
periodDot: {
  borderRadius: 3,
  height: 6,
  marginTop: 4,
  width: 6,
},
visiblePeriodDot: {
  backgroundColor: colors.rose,
},
hiddenPeriodDot: {
  backgroundColor: "transparent",
},
```

- [ ] **Step 3: 调整月历头部按钮文案层级**

在 JSX 中把“上个月 / 下个月 / 回今天”的文本改成更轻的短文案：

```tsx
<Text style={styles.monthButtonText}>上月</Text>
...
<Text style={styles.monthButtonText}>下月</Text>
...
<Text style={styles.monthButtonText}>回今天</Text>
```

保持现有按钮数量不变，不新增逻辑。

- [ ] **Step 4: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS，且 `selectedDay`、`pendingStartDay` 仍按原逻辑同时可用。

## Task 5: 底部操作卡改成稳定的原生卡片表达

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Test: `npm run typecheck`

- [ ] **Step 1: 统一默认态、待结束态、已记录态文案**

在 `renderSelectedDetail` 里把三种标题改成下面这些结果导向文案：

```tsx
<Text style={styles.valueText}>将这一天设为开始日期</Text>
<Text style={styles.valueText}>将这一天设为结束日期</Text>
<Text style={styles.valueText}>这一天属于已记录经期</Text>
```

并把默认态说明改成：

```tsx
<Text style={styles.helperText}>
  选中开始日后，再点另一日期并确认结束，即可保存整段经期。
</Text>
```

把待结束态说明改成：

```tsx
<Text style={styles.helperText}>
  当前已选区间会在保存时自动按时间顺序整理。
</Text>
```

- [ ] **Step 2: 调整底部操作区按钮层级**

在待结束态中保留：

```tsx
<PrimaryButton ...>设为结束日期</PrimaryButton>
<SecondaryButton ...>重新选开始日期</SecondaryButton>
<SecondaryButton ...>取消本次记录</SecondaryButton>
```

在已记录态中保留：

```tsx
<PrimaryButton ...>编辑</PrimaryButton>
<DangerButton ...>{isDeletingRecord ? "删除中..." : "删除"}</DangerButton>
```

不要改变按钮行为，只改文案和布局优先级。

- [ ] **Step 3: 更新底部卡与反馈样式**

在 `StyleSheet.create` 中替换底部区域核心样式为：

```ts
detailSection: {
  backgroundColor: colors.surfaceSoft,
  borderColor: colors.border,
  gap: spacing.md,
},
label: {
  color: colors.textSubtle,
  fontSize: fontSizes.sm,
  fontWeight: "700",
  letterSpacing: 0.3,
  textTransform: "uppercase",
},
valueText: {
  color: colors.text,
  fontSize: fontSizes.xl,
  fontWeight: "700",
},
helperText: {
  color: colors.textMuted,
  fontSize: fontSizes.md,
  lineHeight: 22,
},
markPanel: {
  gap: spacing.md,
},
rangeSummary: {
  backgroundColor: "rgba(255,255,255,0.7)",
  borderRadius: radii.md,
  gap: spacing.xs,
  padding: spacing.md,
},
rangeText: {
  color: colors.text,
  fontSize: fontSizes.md,
},
panelMessageText: {
  color: colors.accent,
  fontSize: fontSizes.md,
  fontWeight: "600",
},
errorText: {
  color: colors.rose,
  fontSize: fontSizes.md,
  fontWeight: "600",
},
actions: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.md,
  justifyContent: "flex-start",
  marginTop: spacing.xs,
},
actionStack: {
  gap: spacing.md,
},
actionButton: {
  flexGrow: 1,
},
```

- [ ] **Step 4: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS，且 `detailSection` 仍可作为 `SectionCard` 样式使用。

## Task 6: 编辑表单和新首页视觉统一

**Files:**
- Modify: `src/components/PeriodRecordForm.tsx`
- Test: `npm run typecheck`

- [ ] **Step 1: 先阅读当前编辑表单**

Run:

```bash
sed -n '1,340p' "src/components/PeriodRecordForm.tsx"
```

Expected: 看到编辑表单已有完整交互逻辑，但月历、字段卡、错误信息盒子的视觉风格仍是旧版硬边框体系。

- [ ] **Step 2: 调整编辑表单文案和反馈区结构**

保留 `PeriodRecordForm` 的状态逻辑，只把中部文案统一成和首页一致的表达：

```tsx
<LabelText>
  正在调整{editingField === "start" ? "开始日期" : "结束日期"}
</LabelText>
```

把区间预览文案改成：

```tsx
<Text style={styles.feedbackLabel}>当前经期区间</Text>
```

错误盒保持占位，但背景改成更轻的暖色：

```ts
errorMessageBox: {
  backgroundColor: colors.roseSurface,
  borderRadius: radii.md,
  minHeight: 44,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
},
errorMessageText: {
  color: colors.rose,
  fontSize: fontSizes.sm,
  lineHeight: 18,
},
```

- [ ] **Step 3: 统一月历和字段卡视觉**

把字段卡、月历容器和日期样式调整为与首页接近的暖色体系，至少包含：

```ts
fieldTabs: {
  flexDirection: "row",
  gap: spacing.md,
},
fieldButton: {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: radii.md,
  borderWidth: 1,
  flex: 1,
  gap: spacing.xs,
  padding: spacing.md,
},
activeFieldButton: {
  backgroundColor: colors.surfaceSoft,
  borderColor: colors.primary,
},
calendarPanel: {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: radii.lg,
  borderWidth: 1,
  gap: spacing.md,
  padding: spacing.lg,
},
selectedDay: {
  backgroundColor: colors.primary,
},
selectedDayText: {
  color: colors.onPrimary,
},
```

保持 `startDay`、`endDay` 的区分，但不要再引入新的高饱和强调色。

- [ ] **Step 4: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS，没有表单局部样式名和 JSX 引用不一致错误。

## Task 7: 端到端视觉核对与人工验收

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `src/components/PeriodRecordForm.tsx`
- Modify: `src/components/ui.tsx`
- Modify: `src/theme.ts`
- Test: `npm run typecheck`

- [ ] **Step 1: 跑一次全量类型检查**

Run: `npm run typecheck`

Expected: PASS。

- [ ] **Step 2: 启动 Expo 手动验收首页**

Run: `npm run start -- --web`

Expected: 能在浏览器打开 Expo 页面，首页加载成功，没有红屏。

- [ ] **Step 3: 按下面清单人工验证**

在运行中的页面上逐项检查：

```text
1. 首页顶部只剩一个主状态区，不再是三个同级摘要卡。
2. “设为开始日期”主按钮使用豆沙玫瑰色，不再是冷蓝。
3. 月历默认、选中、已记录、待确认开始四种状态能一眼区分。
4. 点普通日期时，底部卡标题是“将这一天设为开始日期”。
5. 点“设为开始日期”后，再点另一日期时，底部卡标题是“将这一天设为结束日期”。
6. 点已记录日期时，只显示记录区间和编辑/删除操作，不出现新增按钮。
7. 进入编辑表单后，颜色、圆角、按钮风格与首页一致，没有出现旧版蓝色。
8. 设置页里的按钮和卡片也沿用了新的公共视觉风格，没有明显割裂。
```

- [ ] **Step 4: 如手动发现视觉回退，直接在对应文件最小修正后重新验证**

优先回到这些文件做最小修改：

```text
src/theme.ts
src/components/ui.tsx
app/(tabs)/index.tsx
src/components/PeriodRecordForm.tsx
```

修正后重复执行：

```bash
npm run typecheck
npm run start -- --web
```

Expected: 类型检查继续 PASS，手动验收问题消失。

## 自检结论

- Spec coverage:
  - 顶部主状态区：Task 3
  - 月历主舞台和状态色规则：Task 4
  - 底部操作卡文案与层级：Task 5
  - 豆沙玫瑰主按钮与整体暖色系统：Task 1、Task 2
  - 编辑态视觉统一：Task 6
  - 最终人工验收：Task 7
- Placeholder scan:
  - 已检查，无 `TODO`、`TBD`、`后续补充` 之类占位。
- Type consistency:
  - 新增颜色令牌统一使用 `surfaceSoft`、`surfaceWarm`、`success`、`successSurface`，任务内命名一致。
