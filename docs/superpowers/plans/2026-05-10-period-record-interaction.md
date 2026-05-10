# 经期开始/结束记录交互改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首页的经期新增与编辑交互改造成显式两步流程，降低开始/结束日期记录的心智负担，并统一新增与编辑的区间规则。

**Architecture:** 继续以 `app/(tabs)/index.tsx` 作为单页交互容器，不新增页面。日期区间合法性统一复用 `src/utils/calendar.ts` 的重叠判断和 `src/utils/date.ts` 的排序能力；首页负责新增流程、放弃确认和就地反馈，`src/components/PeriodRecordForm.tsx` 负责编辑态的区间预览和统一保存规则。

**Tech Stack:** Expo Router、React Native、TypeScript、expo-sqlite、Jest。

---

## 协作约束

- 统筹 agent 只负责计划和审阅，不直接承担业务实现。
- 实现阶段不要执行 `git commit`、`git push`、`git reset --hard`；仓库规则要求只有主人明确要求时才处理 git。
- 保持现有中文注释风格，核心逻辑补充简短中文注释。
- 不引入新依赖；成功反馈用现有页面内文本或轻提示状态实现，不增加 toast 库。

## 文件结构

- Modify: `src/utils/calendar.ts`
  - 让重叠校验支持“编辑时排除当前记录自身”，统一新增/编辑约束。
- Modify: `src/utils/calendar.test.ts`
  - 为排除当前记录 id 的重叠校验补充单元测试。
- Modify: `src/components/PeriodRecordForm.tsx`
  - 统一编辑态的日期排序规则，补充区间预览和就地错误文案。
- Modify: `app/(tabs)/index.tsx`
  - 落地“设为开始日期 / 设为结束日期”两步流程、放弃确认、就地反馈、保存中禁用规则。

## Task 1: 统一重叠校验能力

**Files:**
- Modify: `src/utils/calendar.ts`
- Modify: `src/utils/calendar.test.ts`

- [ ] **Step 1: 先写失败测试，覆盖“排除当前记录自身”场景**

在 [src/utils/calendar.test.ts](/Users/marin/code/period-tracker/src/utils/calendar.test.ts:57) 的 `describe("calendar utilities", ...)` 末尾追加：

```ts
  test("hasOverlappingRecord 支持排除当前编辑记录自身", () => {
    expect(
      hasOverlappingRecord(
        records,
        {
          startDate: "2026-05-01",
          endDate: "2026-05-05",
        },
        1,
      ),
    ).toBe(false);

    expect(
      hasOverlappingRecord(
        records,
        {
          startDate: "2026-05-04",
          endDate: "2026-05-08",
        },
        1,
      ),
    ).toBe(true);
  });
```

- [ ] **Step 2: 运行单测，确认新增断言当前会失败**

Run: `npm test -- --runInBand src/utils/calendar.test.ts`

Expected: FAIL，错误表现为 `hasOverlappingRecord` 参数数量不匹配或断言失败。

- [ ] **Step 3: 修改重叠校验函数签名并实现排除逻辑**

将 [src/utils/calendar.ts](/Users/marin/code/period-tracker/src/utils/calendar.ts:33) 的函数更新为：

```ts
// 判断新区间是否与已有记录相交，编辑时允许排除当前记录自身。
export function hasOverlappingRecord(
  records: PeriodRecord[],
  input: DateRangeInput,
  excludedRecordId?: number,
): boolean {
  return records
    .filter((record) => record.id !== excludedRecordId)
    .some(
      (record) =>
        isDateInRange(input.startDate, record.startDate, record.endDate) ||
        isDateInRange(input.endDate, record.startDate, record.endDate) ||
        isDateInRange(record.startDate, input.startDate, input.endDate),
    );
}
```

- [ ] **Step 4: 重新运行单测，确认校验能力通过**

Run: `npm test -- --runInBand src/utils/calendar.test.ts`

Expected: PASS。

## Task 2: 调整编辑表单的区间规则与就地反馈

**Files:**
- Modify: `src/components/PeriodRecordForm.tsx`

- [ ] **Step 1: 先阅读表单现状，确认会受影响的点**

Run:

```bash
sed -n '1,260p' "src/components/PeriodRecordForm.tsx"
```

Expected: 确认当前问题包括 `startDate > endDate` 直接弹窗失败、没有区间预览、没有就地错误区域。

- [ ] **Step 2: 扩展 props，允许父层下发保存错误文案**

把 [src/components/PeriodRecordForm.tsx](/Users/marin/code/period-tracker/src/components/PeriodRecordForm.tsx:23) 的 props 改成：

```ts
interface PeriodRecordFormProps {
  initialStartDate?: DateKey;
  initialEndDate?: DateKey;
  submitLabel: string;
  submitError?: string | null;
  onSubmit(input: { startDate: DateKey; endDate: DateKey }): Promise<void> | void;
  onCancel?: () => void;
}
```

并在组件解构中接收 `submitError`：

```ts
export function PeriodRecordForm({
  initialStartDate,
  initialEndDate,
  submitLabel,
  submitError,
  onSubmit,
  onCancel,
}: PeriodRecordFormProps) {
```

- [ ] **Step 3: 用排序后的区间替代“开始日期不能晚于结束日期”的失败分支**

先补 import：

```ts
import {
  formatDisplayDate,
  getMonthMatrix,
  parseDateKey,
  sortDateRange,
  toDateKey,
} from "../utils/date";
```

在组件内新增派生值：

```ts
  const orderedRange = useMemo(
    () => sortDateRange(startDate, endDate),
    [endDate, startDate],
  );
```

然后把 [src/components/PeriodRecordForm.tsx](/Users/marin/code/period-tracker/src/components/PeriodRecordForm.tsx:88) 的提交逻辑替换为：

```ts
  const handleSubmit = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit({
        startDate: orderedRange.startDate,
        endDate: orderedRange.endDate,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      Alert.alert("保存失败", message);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };
```

- [ ] **Step 4: 让“选开始日期”后自动切到“结束日期”编辑态**

把 [src/components/PeriodRecordForm.tsx](/Users/marin/code/period-tracker/src/components/PeriodRecordForm.tsx:74) 的 `handleSelectDate` 改成：

```ts
  const handleSelectDate = (dateKey: DateKey) => {
    if (isSubmitting) {
      return;
    }

    // 选完开始日期后自动切到结束日期，减少用户额外理解成本。
    if (editingField === "start") {
      setStartDate(dateKey);
      setEditingField("end");
      return;
    }

    setEndDate(dateKey);
  };
```

- [ ] **Step 5: 在表单里新增区间预览和就地错误文案**

在 [src/components/PeriodRecordForm.tsx](/Users/marin/code/period-tracker/src/components/PeriodRecordForm.tsx:171) 的 `calendarPanel` 后、按钮区前插入：

```tsx
      <View style={styles.summaryCard}>
        <LabelText>当前记录区间</LabelText>
        <Text style={styles.summaryValue}>
          {formatDisplayDate(orderedRange.startDate)} 至{" "}
          {formatDisplayDate(orderedRange.endDate)}
        </Text>
        <Text style={styles.summaryHint}>
          正在编辑{editingField === "start" ? "开始日期" : "结束日期"}
        </Text>
        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
      </View>
```

并补充样式：

```ts
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  summaryValue: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: "700",
  },
  summaryHint: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  errorText: {
    color: colors.rose,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
```

- [ ] **Step 6: 运行类型检查，确认表单改动没有破坏现有引用**

Run: `npm run typecheck`

Expected: PASS。

## Task 3: 落地首页两步记录流程与放弃确认

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: 新增首页交互状态，承接就地错误和成功反馈**

在 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:53) 的状态区追加：

```ts
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
```

再补充派生值：

```ts
  const pendingRange = useMemo(() => {
    if (!pendingStartDate) {
      return null;
    }

    return sortDateRange(pendingStartDate, selectedDate);
  }, [pendingStartDate, selectedDate]);

  const pendingOverlapMessage = useMemo(() => {
    if (!pendingRange) {
      return null;
    }

    return hasOverlappingRecord(records, pendingRange)
      ? "该日期区间与已有记录重叠，请重新选择"
      : null;
  }, [pendingRange, records]);
```

- [ ] **Step 2: 统一日期点击和切月的“放弃确认”入口**

在 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:124) 前新增两个 helper：

```ts
  const confirmDiscardPendingRecord = (onConfirm: () => void) => {
    Alert.alert("放弃当前操作？", "当前操作尚未完成，放弃后本次选择将丢失", [
      { text: "继续当前操作", style: "cancel" },
      {
        text: "确认放弃",
        style: "destructive",
        onPress: () => {
          setPendingStartDate(null);
          setPanelError(null);
          onConfirm();
        },
      },
    ]);
  };

  const confirmLeaveEditing = (onConfirm: () => void) => {
    Alert.alert("放弃当前操作？", "当前修改尚未保存，确认放弃吗？", [
      { text: "继续编辑", style: "cancel" },
      {
        text: "确认放弃",
        style: "destructive",
        onPress: () => {
          setEditorError(null);
          setIsEditing(false);
          onConfirm();
        },
      },
    ]);
  };
```

然后改造 `changeMonth`、`goToToday`、`handleSelectDate`：

```ts
  const changeMonth = (offset: number) => {
    if (isSavingMark || isDeletingRecord) {
      return;
    }

    const applyChange = () => {
      setVisibleMonth(
        (currentMonth) =>
          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1, 12),
      );
    };

    if (isEditing) {
      confirmLeaveEditing(applyChange);
      return;
    }

    applyChange();
  };
```

`goToToday` 和 `handleSelectDate` 用同样模式包装：  
- 编辑中先确认离开。  
- 新增第二步中若点击到已有记录日期，先确认是否放弃当前新增流程。  
- 每次正常切换日期时清空 `panelMessage`、`panelError`、`editorError`。

- [ ] **Step 3: 把“开始记录 / 保存记录”改成显式两步按钮流程**

将 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:151) 到 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:187) 的新增逻辑调整为：

```ts
  const handleSetStartDate = () => {
    setPendingStartDate(selectedDate);
    setPanelMessage(null);
    setPanelError(null);
  };

  const handleResetStartDate = () => {
    setPendingStartDate(selectedDate);
    setPanelError(null);
  };

  const handleCancelRecordRange = () => {
    setPendingStartDate(null);
    setPanelError(null);
    setPanelMessage(null);
  };

  const handleSaveRecordRange = async () => {
    if (isSavingMark || !pendingRange) {
      return;
    }

    if (pendingOverlapMessage) {
      setPanelError(pendingOverlapMessage);
      return;
    }

    setIsSavingMark(true);
    setPanelError(null);
    try {
      await initPeriodDatabase();
      await createPeriodRecord(pendingRange);
      setPendingStartDate(null);
      setPanelMessage("经期记录已保存");
      await loadRecords();
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      setPanelError(message);
    } finally {
      setIsSavingMark(false);
    }
  };
```

- [ ] **Step 4: 统一编辑保存逻辑，接入排序与重叠校验**

将 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:189) 的 `handleSaveRecord` 更新为：

```ts
  const handleSaveRecord = async (input: RecordInput) => {
    if (!selectedRecord) {
      return;
    }

    const nextRange = sortDateRange(input.startDate, input.endDate);

    if (hasOverlappingRecord(records, nextRange, selectedRecord.id)) {
      setEditorError("该日期区间与已有记录重叠，请重新选择");
      return;
    }

    try {
      setEditorError(null);
      await initPeriodDatabase();
      await updatePeriodRecord(selectedRecord.id, nextRange);
      setPanelMessage("经期记录已保存");
      await loadRecords();
      if (isFocusedRef.current) {
        setIsEditing(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      setEditorError(message);
    }
  };
```

删除逻辑也要改成就地状态，至少在删除前后加：

```ts
      setIsDeletingRecord(true);
      setPanelMessage(null);
```

以及 finally 里：

```ts
      setIsDeletingRecord(false);
```

删除成功后设置：

```ts
      setPanelMessage("经期记录已删除");
```

- [ ] **Step 5: 重写详情面板渲染文案，匹配 spec 的四种主要状态**

在 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:314) 的 `renderSelectedDetail` 中，按以下结构调整：

默认态：

```tsx
      <View style={styles.markPanel}>
        <Text style={styles.valueText}>记录经期</Text>
        <Text style={styles.helperText}>已选日期：{formatDisplayDate(selectedDate)}</Text>
        <Text style={styles.helperText}>
          点击下方按钮，将这一天设为经期开始日期
        </Text>
        {panelMessage ? <Text style={styles.successText}>{panelMessage}</Text> : null}
        <PrimaryButton
          onPress={handleSetStartDate}
          disabled={isLoading || isSavingMark || isDeletingRecord}
          style={styles.actionButton}
        >
          设为开始日期
        </PrimaryButton>
      </View>
```

结束日期选择态：

```tsx
      <View style={styles.markPanel}>
        <Text style={styles.valueText}>请选择结束日期</Text>
        <Text style={styles.rangeText}>
          已选开始日期：{formatDisplayDate(pendingRange.startDate)}
        </Text>
        <Text style={styles.rangeText}>
          当前结束日期：{formatDisplayDate(selectedDate)}
        </Text>
        <Text style={styles.helperText}>
          将记录为：{formatDisplayDate(pendingRange.startDate)} 至{" "}
          {formatDisplayDate(pendingRange.endDate)}
        </Text>
        {panelError ?? pendingOverlapMessage ? (
          <Text style={styles.errorText}>{panelError ?? pendingOverlapMessage}</Text>
        ) : null}
        <View style={styles.actions}>
          <SecondaryButton
            onPress={handleResetStartDate}
            disabled={isSavingMark}
            style={styles.actionButton}
          >
            重新选开始日期
          </SecondaryButton>
          <SecondaryButton
            onPress={handleCancelRecordRange}
            disabled={isSavingMark}
            style={styles.actionButton}
          >
            取消本次记录
          </SecondaryButton>
          <PrimaryButton
            onPress={handleSaveRecordRange}
            disabled={isSavingMark || Boolean(pendingOverlapMessage)}
            style={styles.actionButton}
          >
            {isSavingMark ? "保存中..." : "设为结束日期"}
          </PrimaryButton>
        </View>
      </View>
```

编辑态传入新 prop：

```tsx
          <PeriodRecordForm
            key={selectedRecord.id}
            initialStartDate={selectedRecord.startDate}
            initialEndDate={selectedRecord.endDate}
            submitLabel="保存修改"
            submitError={editorError}
            onSubmit={handleSaveRecord}
            onCancel={() => {
              setEditorError(null);
              setIsEditing(false);
            }}
          />
```

- [ ] **Step 6: 为首页补充反馈样式并限制保存中交互**

在 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:455) 附近追加：

```ts
  successText: {
    color: colors.teal,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  errorText: {
    color: colors.rose,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
```

并确保以下控件都使用统一禁用条件：

```ts
const isInteractionLocked = isSavingMark || isDeletingRecord;
```

需要应用到：

- 月份切换按钮
- `回今天`
- 日历日期点击
- 新增按钮
- 编辑/删除按钮

- [ ] **Step 7: 运行类型检查，保证首页状态联动无类型错误**

Run: `npm run typecheck`

Expected: PASS。

## Task 4: 做一轮回归验证

**Files:**
- Verify only

- [ ] **Step 1: 运行单元测试，确认重叠校验没有回归**

Run:

```bash
npm test -- --runInBand src/utils/calendar.test.ts
npm test -- --runInBand src/utils/date.test.ts
```

Expected: PASS。

- [ ] **Step 2: 再跑一次完整类型检查**

Run: `npm run typecheck`

Expected: PASS。

- [ ] **Step 3: 启动 Expo 并手动验证新增流程**

Run: `npm start`

Manual checklist:

```text
1. 选中空白日期后，详情面板显示“记录经期”与“设为开始日期”。
2. 点击“设为开始日期”后，面板切到“请选择结束日期”。
3. 面板持续展示“已选开始日期”“当前结束日期”“将记录为”。
4. 若结束日期和已有记录重叠，面板内立即出现错误文案，主按钮不可提交。
5. 点击“取消本次记录”后，新增流程退出，面板回默认态。
```

Expected: 新增路径和中断路径都符合 spec。

- [ ] **Step 4: 手动验证编辑流程和离开确认**

Manual checklist:

```text
1. 点已有记录日期进入“已记录经期”，可见“编辑记录 / 删除记录”。
2. 进入编辑态后，表单显示“当前记录区间”。
3. 调整开始日期后自动切到结束日期编辑态。
4. 反向选择日期后仍能保存为正确区间。
5. 编辑中点顶部月历或切月时，会弹放弃确认，不再静默退出。
```

Expected: 编辑规则与新增规则一致，且不会无提示丢失输入。

- [ ] **Step 5: 手动验证成功/失败反馈**

Manual checklist:

```text
1. 新增成功后，面板出现“经期记录已保存”，月历标记刷新。
2. 删除成功后，面板出现“经期记录已删除”。
3. 保存期间顶部月历、切月、回今天都不可操作。
4. 若数据库刷新失败，界面保留当前错误文案，不误报为成功。
```

Expected: 成功/失败反馈与真实数据状态一致。

## 计划自检

- Spec coverage:
  - 两步新增流程：Task 3 Step 3 / Step 5
  - 区间预览：Task 2 Step 5 / Task 3 Step 5
  - 新增与编辑规则统一：Task 1 Step 3 / Task 2 Step 3 / Task 3 Step 4
  - 中断确认：Task 3 Step 2
  - 保存中禁用：Task 3 Step 6
  - 回归验证：Task 4
- Placeholder scan:
  - 无 `TODO`、`TBD`、`自行处理` 之类占位描述。
- Type consistency:
  - 统一使用 `pendingStartDate`、`panelError`、`editorError`、`hasOverlappingRecord(records, input, excludedRecordId?)`。
