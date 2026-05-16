# 原生弹窗统一为页内确认与状态反馈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首页、设置页和记录表单里的原生 `Alert.alert` 统一替换为与现有卡片式界面一致的页内确认面板和状态消息。

**Architecture:** 保持现有单页结构，不引入新的弹窗库，也不新增全局 modal 系统。复用 `src/components/ui.tsx` 里的基础按钮与卡片风格，补两个轻量承载组件 `StatusMessage` 和 `InlineConfirmPanel`，然后分别接入 `app/(tabs)/index.tsx`、`app/(tabs)/settings.tsx` 和 `src/components/PeriodRecordForm.tsx`。

**Tech Stack:** Expo Router、React Native、TypeScript、Jest、react-test-renderer。

---

## 协作约束

- 统筹 agent 只负责计划、分发、审阅，不直接承担业务实现。
- 按仓库约定，不安排 `git commit`、`git push`、`git reset --hard`。
- 不引入新依赖，不增加 toast 库，不新增完整 modal 系统。
- 注释保持现有中文风格；核心方法和关键状态流转补简短中文注释。
- 每一步优先复用现有 `SectionCard`、`PrimaryButton`、`SecondaryButton`、`DangerButton` 与主题色。

## 文件结构

- Modify: `src/components/ui.tsx`
  - 新增页内状态消息和页内确认面板两个轻量组件。
- Modify: `src/components/PeriodRecordForm.tsx`
  - 去掉原生保存失败弹窗，统一为表单内错误展示。
- Modify: `app/(tabs)/index.tsx`
  - 把放弃新增、放弃编辑、删除记录、加载失败改为页内确认/消息。
- Modify: `app/(tabs)/settings.tsx`
  - 把清空确认、清空结果、加载失败改为页内确认/消息。
- Modify: `app/(tabs)/__tests__/index.test.tsx`
  - 补首页内联确认的交互测试。
- Create: `app/(tabs)/__tests__/settings.test.tsx`
  - 新增设置页清空确认与状态消息测试。
- Create: `src/components/__tests__/PeriodRecordForm.test.tsx`
  - 新增表单保存失败走页内错误而非原生弹窗的测试。

## Task 1: 补齐可复用的页内反馈组件

**Files:**
- Modify: `src/components/ui.tsx`

- [ ] **Step 1: 在 `ui.tsx` 里新增 `StatusMessage` 组件接口**

在 [src/components/ui.tsx](/Users/marin/code/period-tracker/src/components/ui.tsx:1) 的 `TextProps` 下方追加：

```ts
interface StatusMessageProps {
  children: ReactNode;
  tone?: "neutral" | "success" | "error";
  style?: StyleProp<ViewStyle>;
}

interface InlineConfirmPanelProps {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: "primary" | "danger";
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  style?: StyleProp<ViewStyle>;
}
```

- [ ] **Step 2: 实现 `StatusMessage`，统一成功/失败/普通文案容器**

在 [src/components/ui.tsx](/Users/marin/code/period-tracker/src/components/ui.tsx:32) 的 `LabelText` 下方追加：

```tsx
export function StatusMessage({
  children,
  tone = "neutral",
  style,
}: StatusMessageProps) {
  return (
    <View
      style={[
        styles.statusMessage,
        tone === "success" ? styles.statusMessageSuccess : null,
        tone === "error" ? styles.statusMessageError : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.statusMessageText,
          tone === "success" ? styles.statusMessageSuccessText : null,
          tone === "error" ? styles.statusMessageErrorText : null,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: 实现 `InlineConfirmPanel`，统一二次确认承载**

在 [src/components/ui.tsx](/Users/marin/code/period-tracker/src/components/ui.tsx:32) 的 `StatusMessage` 下方追加：

```tsx
export function InlineConfirmPanel({
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmTone = "danger",
  disabled = false,
  onConfirm,
  onCancel,
  style,
}: InlineConfirmPanelProps) {
  const ConfirmButton = confirmTone === "danger" ? DangerButton : PrimaryButton;

  return (
    <View style={[styles.inlineConfirmPanel, style]}>
      <Text style={styles.inlineConfirmTitle}>{title}</Text>
      {description ? (
        <Text style={styles.inlineConfirmDescription}>{description}</Text>
      ) : null}
      <View style={styles.inlineConfirmActions}>
        <SecondaryButton onPress={onCancel} disabled={disabled} style={styles.inlineActionButton}>
          {cancelLabel}
        </SecondaryButton>
        <ConfirmButton onPress={onConfirm} disabled={disabled} style={styles.inlineActionButton}>
          {confirmLabel}
        </ConfirmButton>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: 补充样式，保持现有暖色卡片体系**

在 [src/components/ui.tsx](/Users/marin/code/period-tracker/src/components/ui.tsx:92) 的 `StyleSheet.create` 中追加：

```ts
  statusMessage: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusMessageSuccess: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  statusMessageError: {
    backgroundColor: colors.roseSurface,
    borderColor: colors.rose,
  },
  statusMessageText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  statusMessageSuccessText: {
    color: colors.text,
  },
  statusMessageErrorText: {
    color: colors.rose,
  },
  inlineConfirmPanel: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  inlineConfirmTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: "700",
  },
  inlineConfirmDescription: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  inlineConfirmActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  inlineActionButton: {
    flex: 1,
  },
```

- [ ] **Step 5: 运行类型检查，确认共享 UI 组件可被页面直接消费**

Run: `npm run typecheck`

Expected: PASS。

## Task 2: 设置页改成卡片内确认与状态消息

**Files:**
- Modify: `app/(tabs)/settings.tsx`
- Create: `app/(tabs)/__tests__/settings.test.tsx`

- [ ] **Step 1: 先写失败测试，覆盖“清空确认改为页内面板”和“加载失败不弹原生框”**

创建 [app/(tabs)/__tests__/settings.test.tsx](/Users/marin/code/period-tracker/app/(tabs)/__tests__/settings.test.tsx:1)：

```tsx
import { act, create } from "react-test-renderer";

import SettingsScreen from "../settings";

const mockInitPeriodDatabase = jest.fn().mockResolvedValue(undefined);
const mockListPeriodRecords = jest.fn().mockResolvedValue([
  { id: 1, startDate: "2026-05-04", endDate: "2026-05-09" },
]);
const mockClearPeriodRecords = jest.fn().mockResolvedValue(undefined);
const mockAlert = jest.fn();

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");

    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");

  return {
    ...actual,
    Alert: {
      alert: mockAlert,
    },
  };
});

jest.mock("../../../src/db/periodRecords", () => ({
  clearPeriodRecords: (...args: unknown[]) => mockClearPeriodRecords(...args),
  initPeriodDatabase: (...args: unknown[]) => mockInitPeriodDatabase(...args),
  listPeriodRecords: (...args: unknown[]) => mockListPeriodRecords(...args),
}));

function findPressableByText(root: ReturnType<typeof create>["root"], text: string) {
  const label = root.find(
    (node) => node.type === "Text" && node.props.children === text,
  );

  return label.parent?.parent;
}

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("点击清空按钮后在卡片内展示二次确认，而不是调用原生 Alert", async () => {
    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    await act(async () => {
      findPressableByText(renderer!.root, "清空所有记录")?.props.onPress();
    });

    expect(
      renderer!.root.find(
        (node) =>
          node.type === "Text" &&
          node.props.children === "确认清空本机保存的全部经期记录吗？",
      ),
    ).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("加载失败时展示页内错误文案", async () => {
    mockListPeriodRecords.mockRejectedValueOnce(new Error("读取失败"));

    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<SettingsScreen />);
    });

    expect(
      renderer!.root.find(
        (node) => node.type === "Text" && node.props.children === "读取失败",
      ),
    ).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试，确认当前因为仍使用 `Alert.alert` 而失败**

Run: `npm test -- --runInBand "app/(tabs)/__tests__/settings.test.tsx"`

Expected: FAIL，表现为找不到页内确认文案，或 `mockAlert` 被调用。

- [ ] **Step 3: 把设置页状态改成页内数据流**

把 [app/(tabs)/settings.tsx](/Users/marin/code/period-tracker/app/(tabs)/settings.tsx:1) 的 state 与 import 调整为：

```tsx
import { ScrollView, StyleSheet, Text } from "react-native";

import {
  DangerButton,
  InlineConfirmPanel,
  LabelText,
  ScreenSection,
  SectionCard,
  StatusMessage,
} from "../../src/components/ui";

const [isConfirmingClear, setIsConfirmingClear] = useState(false);
const [loadError, setLoadError] = useState<string | null>(null);
const [statusMessage, setStatusMessage] = useState<{
  tone: "success" | "error";
  text: string;
} | null>(null);
```

- [ ] **Step 4: 去掉所有原生 `Alert.alert`，改成卡片内确认和消息**

把 [app/(tabs)/settings.tsx](/Users/marin/code/period-tracker/app/(tabs)/settings.tsx:23) 到 [app/(tabs)/settings.tsx](/Users/marin/code/period-tracker/app/(tabs)/settings.tsx:83) 的核心逻辑改成：

```tsx
  const loadRecordCount = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      await initPeriodDatabase();
      const records = await listPeriodRecords();

      if (isActive()) {
        setRecordCount(records.length);
        setLoadError(null);
      }
    } catch (error) {
      if (isActive()) {
        const message = error instanceof Error ? error.message : "请稍后重试";
        setLoadError(message);
      }
    } finally {
      if (isActive()) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleClearRecords = () => {
    if (isClearDisabled) {
      return;
    }

    setStatusMessage(null);
    setIsConfirmingClear(true);
  };

  const handleCancelClear = () => {
    setIsConfirmingClear(false);
  };

  const clearAllRecords = async () => {
    try {
      setIsClearing(true);
      setStatusMessage(null);
      await initPeriodDatabase();
      await clearPeriodRecords();
      setRecordCount(0);
      setIsConfirmingClear(false);
      setLoadError(null);
      setStatusMessage({
        tone: "success",
        text: "本机经期记录已全部清空。",
      });
    } catch {
      setStatusMessage({
        tone: "error",
        text: "请稍后重试",
      });
    } finally {
      setIsClearing(false);
    }
  };
```

- [ ] **Step 5: 在危险卡片和页面顶部接入反馈组件**

把 [app/(tabs)/settings.tsx](/Users/marin/code/period-tracker/app/(tabs)/settings.tsx:87) 起的 JSX 调整为：

```tsx
      {loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : null}

      <SectionCard style={styles.dangerCard}>
        <LabelText style={styles.dangerTitle}>数据操作</LabelText>
        {statusMessage ? (
          <StatusMessage tone={statusMessage.tone}>{statusMessage.text}</StatusMessage>
        ) : null}
        {isConfirmingClear ? (
          <InlineConfirmPanel
            title="清空所有记录"
            description="确认清空本机保存的全部经期记录吗？"
            cancelLabel="先保留"
            confirmLabel={isClearing ? "清空中..." : "确认清空"}
            confirmTone="danger"
            disabled={isClearing}
            onCancel={handleCancelClear}
            onConfirm={() => {
              void clearAllRecords();
            }}
          />
        ) : (
          <DangerButton onPress={handleClearRecords} disabled={isClearDisabled}>
            {isClearing ? "清空中..." : "清空所有记录"}
          </DangerButton>
        )}
      </SectionCard>
```

- [ ] **Step 6: 重新运行测试与类型检查**

Run:

```bash
npm test -- --runInBand "app/(tabs)/__tests__/settings.test.tsx"
npm run typecheck
```

Expected: PASS。

## Task 3: 首页改成页内中断确认与页内加载错误

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/__tests__/index.test.tsx`

- [ ] **Step 1: 先补失败测试，覆盖“删除记录时出现页内确认”**

在 [app/(tabs)/__tests__/index.test.tsx](/Users/marin/code/period-tracker/app/(tabs)/__tests__/index.test.tsx:1) 末尾追加：

```tsx
  test("删除记录时在详情卡片内展示确认面板，而不是调用原生 Alert", async () => {
    const mockAlert = jest.spyOn(require("react-native").Alert, "alert");
    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<HomeScreen />);
    });

    await act(async () => {
      renderer!.root.find(
        (node) => node.type === "Text" && node.props.children === "删除",
      ).parent?.parent?.props.onPress();
    });

    expect(
      renderer!.root.find(
        (node) =>
          node.type === "Text" &&
          node.props.children === "确认删除这条经期记录吗？",
      ),
    ).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
    mockAlert.mockRestore();
  });
```

- [ ] **Step 2: 运行首页测试，确认当前仍依赖原生 `Alert`**

Run: `npm test -- --runInBand "app/(tabs)/__tests__/index.test.tsx"`

Expected: FAIL，表现为找不到页内确认文案，或 `Alert.alert` 被调用。

- [ ] **Step 3: 为首页增加统一的内联确认状态**

在 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:1) 的类型区与 state 区补充：

```tsx
type InlineConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: "primary" | "danger";
  onConfirm: () => void;
} | null;

const [loadError, setLoadError] = useState<string | null>(null);
const [inlineConfirm, setInlineConfirm] = useState<InlineConfirmState>(null);
```

并把 import 改成：

```tsx
import {
  DangerButton,
  EmptyText,
  InlineConfirmPanel,
  LabelText,
  PrimaryButton,
  ScreenSection,
  SecondaryButton,
  SectionCard,
  StatusMessage,
} from "../../src/components/ui";
```

- [ ] **Step 4: 用状态驱动替换 `confirmAbandonPendingRange`、`confirmLeaveEditing` 与 `handleDeleteRecord`**

把 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:149) 到 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:190) 改成：

```tsx
  const openInlineConfirm = useCallback(
    ({
      title,
      description,
      confirmLabel,
      cancelLabel,
      confirmTone = "danger",
      onConfirm,
    }: NonNullable<InlineConfirmState>) => {
      setInlineConfirm({
        title,
        description,
        confirmLabel,
        cancelLabel,
        confirmTone,
        onConfirm: () => {
          setInlineConfirm(null);
          onConfirm();
        },
      });
    },
    [],
  );

  const confirmAbandonPendingRange = useCallback(
    (onConfirm?: () => void) => {
      openInlineConfirm({
        title: "取消本次记录",
        description: "确认放弃当前这次经期记录吗？",
        cancelLabel: "继续选择",
        confirmLabel: "放弃记录",
        confirmTone: "danger",
        onConfirm: () => {
          setPendingStartDate(null);
          clearPanelFeedback();
          onConfirm?.();
        },
      });
    },
    [clearPanelFeedback, openInlineConfirm],
  );

  const confirmLeaveEditing = useCallback(
    (onConfirm?: () => void) => {
      openInlineConfirm({
        title: "放弃本次编辑",
        description: "确认放弃当前对这条经期记录的修改吗？",
        cancelLabel: "继续编辑",
        confirmLabel: "放弃修改",
        confirmTone: "danger",
        onConfirm: () => {
          setIsEditing(false);
          setEditorError(null);
          clearPanelFeedback();
          onConfirm?.();
        },
      });
    },
    [clearPanelFeedback, openInlineConfirm],
  );
```

并把删除逻辑改成：

```tsx
  const handleDeleteRecord = () => {
    if (!selectedRecord || isInteractionLocked) {
      return;
    }

    openInlineConfirm({
      title: "删除记录",
      description: "确认删除这条经期记录吗？",
      cancelLabel: "先保留",
      confirmLabel: isDeletingRecord ? "删除中..." : "确认删除",
      confirmTone: "danger",
      onConfirm: () => {
        void deleteSelectedRecord(selectedRecord.id);
      },
    });
  };
```

- [ ] **Step 5: 把加载失败和确认面板渲染到现有详情卡片上下文里**

在 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:110) 的 `loadRecords` catch 中改成：

```tsx
      } catch (error) {
        if (isActive()) {
          const message = error instanceof Error ? error.message : "请稍后重试";
          setLoadError(message);
        }
      } finally {
```

在 `try` 成功分支里补：

```tsx
        if (isActive()) {
          setRecords(nextRecords);
          setLoadError(null);
        }
```

然后把 [app/(tabs)/index.tsx](/Users/marin/code/period-tracker/app/(tabs)/index.tsx:552) 的 `feedbackText` 与详情区 JSX 调整为：

```tsx
    const feedbackNode = panelError ? (
      <StatusMessage tone="error">{panelError}</StatusMessage>
    ) : panelMessage ? (
      <StatusMessage tone="success">{panelMessage}</StatusMessage>
    ) : loadError ? (
      <StatusMessage tone="error">{loadError}</StatusMessage>
    ) : null;
```

在 `pendingStartDate`、`selectedRecord`、默认开始记录三条分支里，都把原先的 `feedbackText` 渲染点替换为：

```tsx
          {feedbackNode}
          {inlineConfirm ? (
            <InlineConfirmPanel
              title={inlineConfirm.title}
              description={inlineConfirm.description}
              cancelLabel={inlineConfirm.cancelLabel}
              confirmLabel={inlineConfirm.confirmLabel}
              confirmTone={inlineConfirm.confirmTone}
              disabled={isInteractionLocked}
              onCancel={() => setInlineConfirm(null)}
              onConfirm={inlineConfirm.onConfirm}
            />
          ) : null}
```

- [ ] **Step 6: 重新运行首页测试和类型检查**

Run:

```bash
npm test -- --runInBand "app/(tabs)/__tests__/index.test.tsx"
npm run typecheck
```

Expected: PASS。

## Task 4: 记录表单保存失败改成表单内错误

**Files:**
- Modify: `src/components/PeriodRecordForm.tsx`
- Create: `src/components/__tests__/PeriodRecordForm.test.tsx`

- [ ] **Step 1: 先写失败测试，覆盖“保存失败显示页内错误，不调用原生 Alert”**

创建 [src/components/__tests__/PeriodRecordForm.test.tsx](/Users/marin/code/period-tracker/src/components/__tests__/PeriodRecordForm.test.tsx:1)：

```tsx
import { act, create } from "react-test-renderer";

import { PeriodRecordForm } from "../PeriodRecordForm";

const mockAlert = jest.fn();

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");

  return {
    ...actual,
    Alert: {
      alert: mockAlert,
    },
  };
});

describe("PeriodRecordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("提交失败时在表单内显示错误文案", async () => {
    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(
        <PeriodRecordForm
          initialStartDate="2026-05-10"
          initialEndDate="2026-05-12"
          submitLabel="保存修改"
          onSubmit={async () => {
            throw new Error("保存失败啦");
          }}
        />,
      );
    });

    await act(async () => {
      renderer!.root.find(
        (node) => node.type === "Text" && node.props.children === "保存修改",
      ).parent?.parent?.props.onPress();
    });

    expect(
      renderer!.root.find(
        (node) => node.type === "Text" && node.props.children === "保存失败啦",
      ),
    ).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行表单测试，确认当前因为仍调用原生 `Alert` 而失败**

Run: `npm test -- --runInBand "src/components/__tests__/PeriodRecordForm.test.tsx"`

Expected: FAIL，表现为找不到表单内错误文案，或 `mockAlert` 被调用。

- [ ] **Step 3: 去掉原生 `Alert` import，改成组件内错误状态**

把 [src/components/PeriodRecordForm.tsx](/Users/marin/code/period-tracker/src/components/PeriodRecordForm.tsx:1) 的 import 与 state 改成：

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";

const [localSubmitError, setLocalSubmitError] = useState<string | null>(null);
const visibleSubmitError = localSubmitError ?? submitError ?? null;
```

- [ ] **Step 4: 提交前清空旧错误，失败时回填到页内错误区域**

把 [src/components/PeriodRecordForm.tsx](/Users/marin/code/period-tracker/src/components/PeriodRecordForm.tsx:98) 的提交逻辑改成：

```tsx
  const handleSubmit = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setLocalSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        startDate: sortedDateRange.startDate,
        endDate: sortedDateRange.endDate,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "请稍后重试";
      setLocalSubmitError(message);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };
```

并把错误展示判断从：

```tsx
          {submitError ? (
            <View style={styles.errorMessageBox}>
              <Text style={styles.errorMessageText}>{submitError}</Text>
            </View>
          ) : null}
```

改成：

```tsx
          {visibleSubmitError ? (
            <View style={styles.errorMessageBox}>
              <Text style={styles.errorMessageText}>{visibleSubmitError}</Text>
            </View>
          ) : null}
```

- [ ] **Step 5: 在切换日期字段和重新提交前清掉本地错误**

把 [src/components/PeriodRecordForm.tsx](/Users/marin/code/period-tracker/src/components/PeriodRecordForm.tsx:62) 和 [src/components/PeriodRecordForm.tsx](/Users/marin/code/period-tracker/src/components/PeriodRecordForm.tsx:74) 的两个交互函数补成：

```tsx
  const focusDateField = (field: EditingField, dateKey: DateKey) => {
    const nextVisibleDate = parseDateKey(dateKey);

    setLocalSubmitError(null);
    setEditingField(field);
    setVisibleMonth(
      new Date(nextVisibleDate.getFullYear(), nextVisibleDate.getMonth(), 1, 12),
    );
  };

  const handleSelectDate = (dateKey: DateKey) => {
    if (isSubmitting) {
      return;
    }

    setLocalSubmitError(null);

    if (editingField === "start") {
      setStartDate(dateKey);
      setEditingField("end");
      return;
    }

    setEndDate(dateKey);
  };
```

- [ ] **Step 6: 重新运行表单测试与全量类型检查**

Run:

```bash
npm test -- --runInBand "src/components/__tests__/PeriodRecordForm.test.tsx"
npm run typecheck
```

Expected: PASS。

## Task 5: 做一次回归验证，确认运行时代码里已不再直接使用 `Alert.alert`

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/settings.tsx`
- Modify: `src/components/PeriodRecordForm.tsx`

- [ ] **Step 1: 搜索运行时代码中的 `Alert.alert`**

Run:

```bash
rg -n "Alert\\.alert" "app" "src/components"
```

Expected: 没有运行时代码命中；只允许文档或计划文件中继续出现旧示例。

- [ ] **Step 2: 运行受影响测试集合**

Run:

```bash
npm test -- --runInBand "app/(tabs)/__tests__/index.test.tsx" "app/(tabs)/__tests__/settings.test.tsx" "src/components/__tests__/PeriodRecordForm.test.tsx"
```

Expected: PASS。

- [ ] **Step 3: 运行全量测试与类型检查**

Run:

```bash
npm test -- --runInBand
npm run typecheck
```

Expected: PASS。

- [ ] **Step 4: 手工验收关键交互**

Run: `npm run start`

Expected:
- 首页点击“删除”后，详情卡片内出现确认面板。
- 首页新增记录中点击“取消本次记录”后，当前详情卡片内出现确认面板。
- 编辑记录后点击“取消”，表单上方或表单内出现确认面板，不跳系统框。
- 设置页点击“清空所有记录”后，危险卡片内出现确认区。
- 保存失败、加载失败、清空成功/失败都显示页内消息，不再跳系统原生弹窗。

## 自检

- 规格覆盖：已经覆盖首页二次确认、设置页危险确认、设置页状态消息、表单保存失败、加载失败统一反馈五类问题。
- 占位符检查：计划中未使用 “TODO / TBD / 类似 Task N” 这类占位写法。
- 类型一致性：统一使用 `StatusMessage`、`InlineConfirmPanel`、`inlineConfirm`、`loadError`、`localSubmitError` 这些命名，避免后续任务出现多套叫法。
