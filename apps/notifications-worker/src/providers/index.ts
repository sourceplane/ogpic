import type { NotificationProvider, ProviderSendContext } from "@saas/contracts/notifications";
import type { Env } from "../env.js";
import { createLocalDebugProvider } from "./local-debug.js";
import { createCloudflareEmailProvider } from "./cloudflare-email.js";
import { createWhatsAppProvider } from "./whatsapp.js";

/**
 * Resolve the email-channel provider.
 *   - "cloudflare-email" (with EMAIL + EMAIL_FROM_ADDRESS) → real email;
 *   - anything else, or a misconfigured cloudflare-email → local-debug.
 */
function resolveEmailProvider(env: Env): NotificationProvider {
  const name = (env.NOTIFICATIONS_PROVIDER ?? "local-debug").toLowerCase();
  if (name === "cloudflare-email") {
    if (!env.EMAIL || !env.EMAIL_FROM_ADDRESS) {
      console.warn(
        "[notifications-worker] NOTIFICATIONS_PROVIDER=cloudflare-email but the EMAIL binding or EMAIL_FROM_ADDRESS is not configured; falling back to local-debug.",
      );
      return createLocalDebugProvider();
    }
    return createCloudflareEmailProvider({
      email: env.EMAIL,
      fromAddress: env.EMAIL_FROM_ADDRESS,
      ...(env.EMAIL_FROM_NAME ? { fromName: env.EMAIL_FROM_NAME } : {}),
    });
  }
  if (name !== "local-debug") {
    console.warn(`[notifications-worker] Unknown NOTIFICATIONS_PROVIDER=${name}; falling back to local-debug.`);
  }
  return createLocalDebugProvider();
}

/**
 * Resolve the WhatsApp-channel provider. Credential-gated: only real when both
 * WHATSAPP_API_URL and WHATSAPP_API_TOKEN are configured; otherwise local-debug
 * so the worker stays deployable without WhatsApp secrets.
 */
function resolveWhatsAppProvider(env: Env): NotificationProvider {
  if (env.WHATSAPP_API_URL && env.WHATSAPP_API_TOKEN) {
    return createWhatsAppProvider({
      apiUrl: env.WHATSAPP_API_URL,
      apiToken: env.WHATSAPP_API_TOKEN,
      ...(env.WHATSAPP_FROM ? { from: env.WHATSAPP_FROM } : {}),
      ...(env.EMAIL_FROM_NAME ? { brandName: env.EMAIL_FROM_NAME } : {}),
    });
  }
  return createLocalDebugProvider();
}

/**
 * Resolve the channel-dispatching NotificationProvider for this worker.
 *
 * A single provider is returned whose `send()` routes by the notification's
 * recipient channel: `whatsapp` → the WhatsApp provider, everything else → the
 * email provider. Each underlying channel independently degrades to local-debug
 * when its real adapter is unconfigured, so the worker always has a working
 * adapter for every channel.
 */
export function resolveProvider(env: Env): NotificationProvider {
  const email = resolveEmailProvider(env);
  const whatsapp = resolveWhatsAppProvider(env);
  return {
    name: `dispatch(email=${email.name},whatsapp=${whatsapp.name})`,
    send(ctx: ProviderSendContext) {
      return (ctx.recipient.channel === "whatsapp" ? whatsapp : email).send(ctx);
    },
  };
}
