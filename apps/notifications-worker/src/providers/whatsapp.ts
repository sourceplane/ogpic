import type {
  NotificationProvider,
  ProviderSendContext,
  ProviderSendResult,
} from "@saas/contracts/notifications";
import { renderEmailTemplate } from "../templates/index.js";

/**
 * WhatsApp provider (credential-gated).
 *
 * Delivers the plain-text rendering of a template to a phone number over a
 * generic WhatsApp HTTP API: `POST {apiUrl}` with a Bearer token and a
 * `{ messaging_product, to, type: "text", text: { body } }` body (the shape the
 * WhatsApp Cloud API and most gateways accept). The adapter renders the
 * template itself so provider payloads stay behind the seam (spec 14).
 *
 * It is only constructed when both the API URL and token are configured; the
 * dispatcher otherwise routes WhatsApp notifications to local-debug, so the
 * worker is always deployable without WhatsApp credentials.
 */
export interface WhatsAppProviderOptions {
  apiUrl: string;
  apiToken: string;
  /** Optional sender phone-number id / from, forwarded as `from` when set. */
  from?: string;
  /** Product display name used for the message footer/branding. */
  brandName?: string;
}

function boundedErrorReason(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const cleaned = raw.replace(/\s+/g, " ").trim().slice(0, 160);
  return cleaned.length > 0 ? `whatsapp_send_failed: ${cleaned}` : "whatsapp_send_failed";
}

export function createWhatsAppProvider(opts: WhatsAppProviderOptions): NotificationProvider {
  return {
    name: "whatsapp",
    async send(ctx: ProviderSendContext): Promise<ProviderSendResult> {
      const rendered = renderEmailTemplate(ctx.templateKey, ctx.templateData, {
        ...(opts.brandName ? { brandName: opts.brandName } : {}),
      });
      if (!rendered) {
        return { ok: false, providerMessageId: null, errorReason: `unknown_template:${ctx.templateKey}` };
      }

      // WhatsApp is a text channel: send the subject + text body of the template.
      const body = rendered.subject ? `*${rendered.subject}*\n\n${rendered.text}` : rendered.text;

      try {
        const res = await fetch(opts.apiUrl, {
          method: "POST",
          headers: {
            authorization: `Bearer ${opts.apiToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            ...(opts.from ? { from: opts.from } : {}),
            to: ctx.recipient.address,
            type: "text",
            text: { body },
          }),
        });
        if (!res.ok) {
          return { ok: false, providerMessageId: null, errorReason: `whatsapp_http_${res.status}` };
        }
        let messageId = `whatsapp-${ctx.notificationId}`;
        try {
          const json = (await res.json()) as { messages?: { id?: string }[] };
          const id = json?.messages?.[0]?.id;
          if (typeof id === "string" && id.length > 0) messageId = id;
        } catch {
          // A 2xx with an unparseable body is still a successful send; keep the
          // synthetic id for traceability.
        }
        return { ok: true, providerMessageId: messageId };
      } catch (err) {
        return { ok: false, providerMessageId: null, errorReason: boundedErrorReason(err) };
      }
    },
  };
}
