import { Alert } from "react-native";
import { act, create, type ReactTestInstance } from "react-test-renderer";

import { PeriodRecordForm } from "../PeriodRecordForm";

type AlertSpy = jest.SpiedFunction<typeof Alert.alert>;

type TestNode = ReactTestInstance & {
  find: (predicate: (node: TestNode) => boolean) => TestNode;
  findByProps: (props: Record<string, unknown>) => TestNode;
  findAllByType: (type: string) => TestNode[];
};

type PressableTestProps = {
  onPress?: () => void | Promise<void>;
};

let mockAlert: AlertSpy;

function getTextContent(node: TestNode): string {
  return node
    .findAllByType("Text")
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

describe("PeriodRecordForm", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 13, 12, 0, 0));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    mockAlert = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    mockAlert.mockRestore();
  });

  test("提交失败后展示表单内错误文案且不调用原生 Alert", async () => {
    const submitError = "保存到数据库失败";
    const onSubmit = jest.fn().mockRejectedValue(new Error(submitError));
    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(
        <PeriodRecordForm submitLabel="保存记录" onSubmit={onSubmit} />,
      );
    });

    await act(async () => {
      const submitButton = findPressableByText(
        renderer!.root as TestNode,
        "保存记录",
      );

      await (submitButton.props as PressableTestProps).onPress?.();
    });

    expect((renderer!.root as TestNode).findByProps({ children: submitError }))
      .toBeDefined();
    expect(mockAlert).not.toHaveBeenCalled();
  });
});
