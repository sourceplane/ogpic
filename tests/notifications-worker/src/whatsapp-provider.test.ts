import { resolveProvider } from "@notifications-worker/providers/index";
import { createWhatsAppProvider } from "@notifications-worker/providers/whatsapp";
import type { Env } from "@notifications-worker/env";
import type { ProviderSendContext } from "@saas/contracts/notifications";

const baseEnv = { ENVIRONMENT: "test" } as Env;

function ctx(channel: "email" | "whatsapp", address: string): ProviderSendContext {
  return {
    notificationId: "ntf_1",
    orgId: "org_1",
    category: "product",
    templateKey: "match.availability_request",
    templateData: { scheduledAt: "2026-08-01T18:30:00.000Z", venue: "The Dome", matchId: "mtc_1" },
    recipient: { channel, address },
  };
}

describe("resolveProvider dispatch", () => {
  test("routes whatsapp to local-debug when unconfigured", async () => {
    const provider = resolveProvider(baseEnv);
    expect(provider.name).toContain("whatsapp=local-debug");
    const res = await provider.send(ctx("whatsapp", "+441234567890"));
    expect(res.ok).toBe(true);
  });

  test("uses the real whatsapp provider when credentials are configured", () => {
    const provider = resolveProvider({ ...baseEnv, WHATSAPP_API_URL: "https://wa.example/send", WHATSAPP_API_TOKEN: "tok" });
    expect(provider.name).toContain("whatsapp=whatsapp");
  });
});

describe("createWhatsAppProvider", () => {
  const origFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  test("posts the rendered text and returns the provider message id", async () => {
    let captured: { url: string; body: unknown; auth: string | null } | null = null;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      captured = { url, body: JSON.parse(init.body as string), auth: new Headers(init.headers).get("authorization") };
      return new Response(JSON.stringify({ messages: [{ id: "wamid.123" }] }), { status: 200 });
    }) as never;

    const provider = createWhatsAppProvider({ apiUrl: "https://wa.example/send", apiToken: "tok", from: "999" });
    const res = await provider.send(ctx("whatsapp", "+441234567890"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.providerMessageId).toBe("wamid.123");
    expect(captured!.url).toBe("https://wa.example/send");
    expect(captured!.auth).toBe("Bearer tok");
    expect((captured!.body as { to: string }).to).toBe("+441234567890");
    expect((captured!.body as { text: { body: string } }).text.body).toContain("available");
  });

  test("reports a bounded error on a non-2xx response", async () => {
    globalThis.fetch = (async () => new Response("nope", { status: 500 })) as never;
    const provider = createWhatsAppProvider({ apiUrl: "https://wa.example/send", apiToken: "tok" });
    const res = await provider.send(ctx("whatsapp", "+441234567890"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errorReason).toBe("whatsapp_http_500");
  });

  test("fails cleanly for an unknown template", async () => {
    const provider = createWhatsAppProvider({ apiUrl: "https://wa.example/send", apiToken: "tok" });
    const res = await provider.send({ ...ctx("whatsapp", "+441234567890"), templateKey: "nope.nope" });
    expect(res.ok).toBe(false);
  });
});
