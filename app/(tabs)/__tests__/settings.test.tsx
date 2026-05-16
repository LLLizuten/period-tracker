import { Alert, Modal } from "react-native";
import { act, create, type ReactTestInstance } from "react-test-renderer";

import SettingsScreen from "../settings";
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

type PressableTestProps = {
  onPress?: () => void;
};

const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
const mockInitPeriodDatabase = jest.mocked(initPeriodDatabase);
const mockListPeriodRecords = jest.mocked(listPeriodRecords);
const mockClearPeriodRecords = jest.mocked(clearPeriodRecords);

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
