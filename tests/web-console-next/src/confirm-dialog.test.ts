import { jest } from "@jest/globals";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * PX1 acceptance: unit tests for the confirm-dialog primitive. The real Radix
 * dialog mounts through a portal, which `react-dom/server` renders as nothing,
 * so the dialog shell is mocked with pass-through containers that also record
 * the interaction props ConfirmDialog wires up (open-change guard, escape /
 * outside-pointer suppression, initial-focus override). The Button stays real:
 * the destructive/ghost variants and label text are part of the contract.
 */

interface RecordedProps {
  dialog?:
    | { open?: boolean; onOpenChange?: (open: boolean) => void }
    | undefined;
  content?:
    | {
        onOpenAutoFocus?: (e: { preventDefault: () => void }) => void;
        onEscapeKeyDown?: (e: { preventDefault: () => void }) => boolean | void;
        onPointerDownOutside?: (e: { preventDefault: () => void }) => boolean | void;
      }
    | undefined;
}

const recorded: RecordedProps = {};

const passthrough =
  (tag: string, record?: (props: Record<string, unknown>) => void) =>
  ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => {
    record?.(props);
    return React.createElement("div", { "data-mock": tag }, children);
  };

jest.unstable_mockModule("@web-console-next/components/ui/dialog", () => ({
  Dialog: passthrough("dialog", (p) => {
    recorded.dialog = p as RecordedProps["dialog"];
  }),
  DialogContent: passthrough("content", (p) => {
    recorded.content = p as RecordedProps["content"];
  }),
  DialogHeader: passthrough("header"),
  DialogTitle: passthrough("title"),
  DialogDescription: passthrough("description"),
  DialogFooter: passthrough("footer"),
}));

const { ConfirmDialog } = await import("@web-console-next/components/ui/confirm-dialog");

const render = (overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) => {
  const props: React.ComponentProps<typeof ConfirmDialog> = {
    open: true,
    onOpenChange: jest.fn<(open: boolean) => void>(),
    title: "Delete webhook endpoint",
    description: "Deliveries stop immediately and the signing secret is revoked.",
    onConfirm: jest.fn<() => void>(),
    ...overrides,
  };
  const html = renderToStaticMarkup(React.createElement(ConfirmDialog, props));
  return { html, props };
};

describe("ConfirmDialog", () => {
  beforeEach(() => {
    delete recorded.dialog;
    delete recorded.content;
  });

  it("renders the consequence sentence and both actions", () => {
    const { html } = render();
    expect(html).toContain("Delete webhook endpoint");
    expect(html).toContain("Deliveries stop immediately and the signing secret is revoked.");
    expect(html).toContain("Cancel");
    expect(html).toContain("Confirm");
  });

  it("echoes the resource name verbatim so the user can verify the target", () => {
    const { html } = render({ resourceName: "wh_prod_7f3a — payments.example.com" });
    expect(html).toContain("wh_prod_7f3a — payments.example.com");
    expect(html).toContain("font-mono");
  });

  it("omits the echo block when no resource name is given", () => {
    const { html } = render();
    expect(html).not.toContain("font-mono");
  });

  it("styles the confirm action destructively by default", () => {
    const { html } = render({ confirmLabel: "Delete endpoint" });
    expect(html).toContain("Delete endpoint");
    expect(html).toContain("bg-destructive");
  });

  it("drops destructive styling when destructive=false", () => {
    const { html } = render({ destructive: false });
    expect(html).not.toContain("bg-destructive");
  });

  it("honors custom labels", () => {
    const { html } = render({ confirmLabel: "Revoke key", cancelLabel: "Keep it" });
    expect(html).toContain("Revoke key");
    expect(html).toContain("Keep it");
  });

  it("proxies close requests to the caller while idle", () => {
    const { props } = render();
    recorded.dialog?.onOpenChange?.(false);
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("overrides Radix auto-focus so initial focus can land on Cancel", () => {
    render();
    const e = { preventDefault: jest.fn() };
    recorded.content?.onOpenAutoFocus?.(e);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("leaves escape and outside-pointer dismissal enabled while idle", () => {
    render();
    const escape = { preventDefault: jest.fn() };
    const pointer = { preventDefault: jest.fn() };
    recorded.content?.onEscapeKeyDown?.(escape);
    recorded.content?.onPointerDownOutside?.(pointer);
    expect(escape.preventDefault).not.toHaveBeenCalled();
    expect(pointer.preventDefault).not.toHaveBeenCalled();
  });
});
