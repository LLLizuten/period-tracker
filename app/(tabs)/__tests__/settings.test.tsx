import { Alert, Modal } from "react-native";
import { act, create, type ReactTestInstance } from "react-test-renderer";

import SettingsScreen from "../settings";
import {
  clearCycleLengthDays,
  getPredictionSettings,
  initPredictionSettingsDatabase,
  saveCycleLengthDays,
} from "../../../src/db/predictionSettings";
import {
  clearPeriodRecords,
  initPeriodDatabase,
  listPeriodRecords,
} from "../../../src/db/periodRecords";

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");

    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock("../../../src/db/periodRecords", () => ({
  clearPeriodRecords: jest.fn().mockResolvedValue(undefined),
  initPeriodDatabase: jest.fn().mockResolvedValue(undefined),
  listPeriodRecords: jest.fn(),
}));

jest.mock("../../../src/db/predictionSettings", () => ({
  clearCycleLengthDays: jest.fn().mockResolvedValue(undefined),
  getPredictionSettings: jest.fn(),
  initPredictionSettingsDatabase: jest.fn().mockResolvedValue(undefined),
  saveCycleLengthDays: jest.fn().mockResolvedValue(undefined),
}));

type PressableTestProps = {
  onPress?: () => void;
};

type TextInputTestProps = {
  onChangeText: (text: string) => void;
};

const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
const mockInitPeriodDatabase = jest.mocked(initPeriodDatabase);
const mockListPeriodRecords = jest.mocked(listPeriodRecords);
const mockClearPeriodRecords = jest.mocked(clearPeriodRecords);
const mockInitPredictionSettingsDatabase = jest.mocked(initPredictionSettingsDatabase);
const mockGetPredictionSettings = jest.mocked(getPredictionSettings);
const mockSaveCycleLengthDays = jest.mocked(saveCycleLengthDays);
const mockClearCycleLengthDays = jest.mocked(clearCycleLengthDays);

type TestNode = ReactTestInstance & {
  find: (predicate: (node: TestNode) => boolean) => TestNode;
  findAllByType: (type: string) => TestNode[];
  findByType: (type: unknown) => TestNode;
  findByProps: (props: Record<string, unknown>) => TestNode;
};

function getTextContent(node: TestNode): string {
  return node.findAllByType("Text")
    .map((textNode) => textNode.children.join(""))
    .join("");
}

function findPressableByText(root: TestNode, label: string) {
  return root.find(
    (node) =>
      typeof node.props.onPress === "function" &&
      getTextContent(node as TestNode).includes(label),
  );
}

function findAllTextByChildren(root: TestNode, children: string) {
  return root.findAllByType("Text").filter((textNode) => textNode.props.children === children);
}

function findTextInputByPlaceholder(root: TestNode, placeholder: string) {
  return root.find(
    (node) =>
      node.type === "TextInput" &&
      node.props.placeholder === placeholder,
  ) as TestNode & { props: TextInputTestProps };
}

async function renderSettingsScreen() {
  let renderer: ReturnType<typeof create>;

  await act(async () => {
    renderer = create(<SettingsScreen />);
  });

  return renderer!;
}

describe("SettingsScreen", () => {
  beforeEach(() => {
    mockAlert.mockClear();
    mockInitPeriodDatabase.mockResolvedValue(undefined);
    mockListPeriodRecords.mockResolvedValue([
      {
        id: 1,
        startDate: "2026-05-04",
        endDate: "2026-05-09",
        createdAt: "2026-05-04",
        updatedAt: "2026-05-09",
      },
    ]);
    mockClearPeriodRecords.mockResolvedValue(undefined);
    mockInitPredictionSettingsDatabase.mockClear();
    mockGetPredictionSettings.mockReset();
    mockSaveCycleLengthDays.mockClear();
    mockClearCycleLengthDays.mockClear();
    mockInitPredictionSettingsDatabase.mockResolvedValue(undefined);
    mockGetPredictionSettings.mockResolvedValue({ cycleLengthDays: null });
    mockSaveCycleLengthDays.mockResolvedValue(undefined);
    mockClearCycleLengthDays.mockResolvedValue(undefined);
  });

  test("默认展示智能预测设置并在加载时初始化预测设置表", async () => {
    const renderer = await renderSettingsScreen();
    const root = renderer.root as TestNode;

    expect(mockInitPeriodDatabase).toHaveBeenCalled();
    expect(mockInitPredictionSettingsDatabase).toHaveBeenCalled();
    expect(mockListPeriodRecords).toHaveBeenCalled();
    expect(mockGetPredictionSettings).toHaveBeenCalled();
    expect(root.findByProps({ children: "经期预测设置" })).toBeDefined();
    expect(root.findByProps({ children: "智能预测" })).toBeDefined();
    expect(
      root.findByProps({
        children: "未设置周期长度时，将根据历史记录自动估算。",
      }),
    ).toBeDefined();
    expect(findTextInputByPlaceholder(root, "21-35")).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("保存合法固定周期后更新设置状态并展示成功消息", async () => {
    const renderer = await renderSettingsScreen();
    mockInitPredictionSettingsDatabase.mockClear();

    await act(async () => {
      const input = findTextInputByPlaceholder(renderer.root as TestNode, "21-35");

      input.props.onChangeText("30");
    });

    await act(async () => {
      const saveButton = findPressableByText(renderer.root as TestNode, "保存周期");

      (saveButton.props as PressableTestProps).onPress?.();
    });

    const root = renderer.root as TestNode;

    expect(mockInitPredictionSettingsDatabase).toHaveBeenCalledTimes(1);
    expect(mockInitPredictionSettingsDatabase.mock.invocationCallOrder[0]).toBeLessThan(
      mockSaveCycleLengthDays.mock.invocationCallOrder[0],
    );
    expect(mockSaveCycleLengthDays).toHaveBeenCalledWith(30);
    expect(root.findByProps({ children: "固定周期：30 天" })).toBeDefined();
    expect(root.findByProps({ children: "周期设置已保存。" })).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("保存固定周期失败时展示页内错误", async () => {
    mockSaveCycleLengthDays.mockRejectedValue(new Error("保存失败"));
    const renderer = await renderSettingsScreen();
    mockInitPredictionSettingsDatabase.mockClear();

    await act(async () => {
      const input = findTextInputByPlaceholder(renderer.root as TestNode, "21-35");

      input.props.onChangeText("30");
    });

    await act(async () => {
      const saveButton = findPressableByText(renderer.root as TestNode, "保存周期");

      (saveButton.props as PressableTestProps).onPress?.();
    });

    const root = renderer.root as TestNode;

    expect(mockInitPredictionSettingsDatabase).toHaveBeenCalledTimes(1);
    expect(mockInitPredictionSettingsDatabase.mock.invocationCallOrder[0]).toBeLessThan(
      mockSaveCycleLengthDays.mock.invocationCallOrder[0],
    );
    expect(root.findByProps({ children: "保存失败，请稍后重试。" })).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("非法周期输入展示页内错误且不保存", async () => {
    const renderer = await renderSettingsScreen();

    await act(async () => {
      const input = findTextInputByPlaceholder(renderer.root as TestNode, "21-35");

      input.props.onChangeText("20");
    });

    await act(async () => {
      const saveButton = findPressableByText(renderer.root as TestNode, "保存周期");

      (saveButton.props as PressableTestProps).onPress?.();
    });

    expect(mockSaveCycleLengthDays).not.toHaveBeenCalled();
    expect(
      (renderer.root as TestNode).findByProps({
        children: "周期长度需为 21-35 天的整数。",
      }),
    ).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("清空固定周期后恢复智能预测并清空输入", async () => {
    mockGetPredictionSettings.mockResolvedValue({ cycleLengthDays: 28 });
    const renderer = await renderSettingsScreen();
    mockInitPredictionSettingsDatabase.mockClear();

    await act(async () => {
      const clearButton = findPressableByText(renderer.root as TestNode, "使用智能预测");

      (clearButton.props as PressableTestProps).onPress?.();
    });

    const root = renderer.root as TestNode;
    const input = findTextInputByPlaceholder(root, "21-35");

    expect(mockInitPredictionSettingsDatabase).toHaveBeenCalledTimes(1);
    expect(mockInitPredictionSettingsDatabase.mock.invocationCallOrder[0]).toBeLessThan(
      mockClearCycleLengthDays.mock.invocationCallOrder[0],
    );
    expect(mockClearCycleLengthDays).toHaveBeenCalled();
    expect(root.findByProps({ children: "智能预测" })).toBeDefined();
    expect(root.findByProps({ children: "已恢复智能预测。" })).toBeDefined();
    expect(input.props.value).toBe("");
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("恢复智能预测失败时展示页内错误", async () => {
    mockGetPredictionSettings.mockResolvedValue({ cycleLengthDays: 28 });
    mockClearCycleLengthDays.mockRejectedValue(new Error("恢复失败"));
    const renderer = await renderSettingsScreen();
    mockInitPredictionSettingsDatabase.mockClear();

    await act(async () => {
      const clearButton = findPressableByText(renderer.root as TestNode, "使用智能预测");

      (clearButton.props as PressableTestProps).onPress?.();
    });

    const root = renderer.root as TestNode;

    expect(mockInitPredictionSettingsDatabase).toHaveBeenCalledTimes(1);
    expect(mockInitPredictionSettingsDatabase.mock.invocationCallOrder[0]).toBeLessThan(
      mockClearCycleLengthDays.mock.invocationCallOrder[0],
    );
    expect(root.findByProps({ children: "恢复失败，请稍后重试。" })).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("点击清空所有记录后以应用内弹窗展示确认文案，不调用原生 Alert", async () => {
    const renderer = await renderSettingsScreen();

    await act(async () => {
      const clearButton = findPressableByText(renderer.root as TestNode, "清空所有记录");

      (clearButton.props as PressableTestProps).onPress?.();
    });

    const root = renderer.root as TestNode;
    const confirmModal = root.findByType(Modal);

    expect(confirmModal.props.visible).toBe(true);
    expect(root.findByProps({ children: "清空所有记录" })).toBeDefined();
    expect(
      root.findByProps({
        children: "确认清空本机保存的全部经期记录吗？",
      }),
    ).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("记录数为 0 时点击清空所有记录不会进入确认态", async () => {
    mockListPeriodRecords.mockResolvedValue([]);

    const renderer = await renderSettingsScreen();

    await act(async () => {
      const clearButton = findPressableByText(renderer.root as TestNode, "清空所有记录");

      expect(clearButton.props.disabled).toBe(true);
      (clearButton.props as PressableTestProps).onPress?.();
    });

    const root = renderer.root as TestNode;

    expect(findAllTextByChildren(root, "确认清空本机保存的全部经期记录吗？")).toHaveLength(0);
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("清空失败后展示页内错误并停留在确认态", async () => {
    mockClearPeriodRecords.mockRejectedValue(new Error("删除失败"));

    const renderer = await renderSettingsScreen();

    await act(async () => {
      const clearButton = findPressableByText(renderer.root as TestNode, "清空所有记录");

      (clearButton.props as PressableTestProps).onPress?.();
    });

    await act(async () => {
      const confirmButton = findPressableByText(renderer.root as TestNode, "确认清空");

      (confirmButton.props as PressableTestProps).onPress?.();
    });

    const root = renderer.root as TestNode;

    expect(root.findByProps({ children: "清空失败，请稍后重试。" })).toBeDefined();
    expect(root.findByProps({ children: "确认清空本机保存的全部经期记录吗？" })).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test("加载失败时展示页内错误文案，不调用原生 Alert", async () => {
    mockListPeriodRecords.mockRejectedValue(new Error("数据库读取失败"));

    const renderer = await renderSettingsScreen();

    expect((renderer.root as TestNode).findByProps({ children: "加载失败：数据库读取失败" })).toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });
});
