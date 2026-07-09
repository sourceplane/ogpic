import { jest } from "@jest/globals";
import type * as ReactTypes from "react";

/**
 * PX1 acceptance: unit tests for the dirty-guard primitive. The hook's whole
 * contract is effect wiring — register `beforeunload` only while dirty, make
 * the handler trigger the browser prompt, and unregister on cleanup. The React
 * module namespace is frozen under ESM, so `react` is module-mocked with a
 * `useEffect` that runs synchronously and collects cleanups, letting the hook
 * execute against a stubbed `window` without a renderer.
 */

type Handler = (e: BeforeUnloadEvent) => void;

const cleanups: Array<() => void> = [];

jest.unstable_mockModule("react", () => {
  const actual = jest.requireActual("react") as typeof ReactTypes;
  return {
    ...actual,
    default: actual,
    useEffect: (effect: ReactTypes.EffectCallback) => {
      const cleanup = effect();
      if (typeof cleanup === "function") cleanups.push(cleanup);
    },
  };
});

const { useUnsavedChangesGuard } = await import("@web-console-next/lib/use-unsaved-guard");

interface WindowStub {
  addEventListener: ReturnType<typeof jest.fn>;
  removeEventListener: ReturnType<typeof jest.fn>;
}

const g = globalThis as unknown as { window?: WindowStub | undefined };

describe("useUnsavedChangesGuard", () => {
  let windowStub: WindowStub;

  beforeEach(() => {
    windowStub = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    g.window = windowStub;
    cleanups.length = 0;
  });

  afterEach(() => {
    delete g.window;
  });

  it("registers a beforeunload listener while dirty", () => {
    useUnsavedChangesGuard(true);
    expect(windowStub.addEventListener).toHaveBeenCalledTimes(1);
    expect(windowStub.addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("registers nothing while clean", () => {
    useUnsavedChangesGuard(false);
    expect(windowStub.addEventListener).not.toHaveBeenCalled();
    expect(cleanups).toHaveLength(0);
  });

  it("arms the browser prompt: preventDefault + legacy returnValue", () => {
    useUnsavedChangesGuard(true);
    const handler = windowStub.addEventListener.mock.calls[0]![1] as Handler;
    const event = {
      preventDefault: jest.fn(),
      returnValue: "unset",
    } as unknown as BeforeUnloadEvent;
    handler(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    // Chrome ignores preventDefault alone; returnValue must be set.
    expect(event.returnValue).toBe("");
  });

  it("cleanup removes exactly the listener it added", () => {
    useUnsavedChangesGuard(true);
    const handler = windowStub.addEventListener.mock.calls[0]![1] as Handler;
    expect(cleanups).toHaveLength(1);
    cleanups[0]!();
    expect(windowStub.removeEventListener).toHaveBeenCalledTimes(1);
    expect(windowStub.removeEventListener).toHaveBeenCalledWith("beforeunload", handler);
  });
});
