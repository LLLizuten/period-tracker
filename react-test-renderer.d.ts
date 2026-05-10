declare module "react-test-renderer" {
  import * as React from "react";

  export type ReactTestRendererNode = ReactTestInstance | string | number;

  export interface ReactTestInstance {
    type: unknown;
    props: Record<string, unknown>;
    children: ReactTestRendererNode[];
    parent: ReactTestInstance | null;
    find(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance;
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
  }

  export function create(element: React.ReactElement): ReactTestRenderer;
  export function act<T>(callback: () => T | Promise<T>): T | Promise<T>;
}
