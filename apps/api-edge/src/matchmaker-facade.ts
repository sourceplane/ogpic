import type { Env } from "./env.js";
import { errorResponse, withEdgeTimings } from "./http.js";
import { replayOrExecute } from "./idempotency.js";
import { resolveActor } from "./resolve-actor.js";
import { createTimings } from "@saas/contracts/timing";

const ORG_PLAYERS_RE = /^\/v1\/organizations\/[^/]+\/players(?:\/[^/]+(?:\/captain|\/votes|\/claim)?)?$/;
const ORG_ROSTER_SUMMARY_RE = /^\/v1\/organizations\/[^/]+\/roster\/summary$/;
const ORG_RATING_ROUND_RE = /^\/v1\/organizations\/[^/]+\/rating-round(?:\/(?:open|close))?$/;
const ORG_DRAFT_RE = /^\/v1\/organizations\/[^/]+\/draft$/;
const ORG_MATCHES_RE = /^\/v1\/organizations\/[^/]+\/matches(?:\/[^/]+(?:\/share|\/payments(?:\/[^/]+)?)?)?$/;
const ORG_AVAILABILITY_RE = /^\/v1\/organizations\/[^/]+\/availability(?:\/[^/]+)?$/;
// v5 (docs/design/rondo-v5-spec.md §4): polls, finalize, dropouts, chat, settings.
const ORG_MATCH_POLL_RE = /^\/v1\/organizations\/[^/]+\/matches\/[^/]+\/(?:poll(?:\/(?:votes|close))?|finalize|dropout|dropouts\/[^/]+\/resolve)$/;
const ORG_CHAT_RE = /^\/v1\/organizations\/[^/]+\/chat(?:\/[^/]+\/reactions)?$/;
const ORG_SETTINGS_RE = /^\/v1\/organizations\/[^/]+\/settings$/;

const FORWARDED_HEADERS = [
  "content-type",
  "x-request-id",
  "traceparent",
  "idempotency-key",
];

export function isMatchmakerRoute(pathname: string): boolean {
  return (
    ORG_PLAYERS_RE.test(pathname) ||
    ORG_ROSTER_SUMMARY_RE.test(pathname) ||
    ORG_RATING_ROUND_RE.test(pathname) ||
    ORG_DRAFT_RE.test(pathname) ||
    ORG_MATCHES_RE.test(pathname) ||
    ORG_AVAILABILITY_RE.test(pathname) ||
    ORG_MATCH_POLL_RE.test(pathname) ||
    ORG_CHAT_RE.test(pathname) ||
    ORG_SETTINGS_RE.test(pathname)
  );
}

export async function handleMatchmakerRoute(
  request: Request,
  env: Env,
  requestId: string,
  pathname: string,
): Promise<Response> {
  return replayOrExecute(request, requestId, env, "matchmaker", async () => {
    if (!env.IDENTITY_WORKER) {
      return errorResponse("internal_error", "Authentication service unavailable", 503, requestId);
    }
    if (!env.MATCHMAKER_WORKER) {
      return errorResponse("internal_error", "Matchmaker service unavailable", 503, requestId);
    }

    const timings = createTimings();
    const endTotal = timings.start("edge_total");
    const sessionResult = await timings.measure("edge_auth", () => resolveActor(request, env, requestId));
    if ("error" in sessionResult) {
      return sessionResult.error;
    }

    const headers = new Headers();
    headers.set("x-request-id", requestId);
    headers.set("x-actor-subject-id", sessionResult.subjectId);
    headers.set("x-actor-subject-type", sessionResult.subjectType);
    headers.set("x-actor-email", sessionResult.email);
    for (const name of FORWARDED_HEADERS) {
      if (name === "x-request-id") continue;
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    const url = new URL(request.url);
    const target = new URL(pathname + url.search, "https://matchmaker.internal");

    const init: RequestInit = {
      method: request.method,
      headers,
    };
    // Forward the body for every method that carries one. PUT matters here:
    // availability.set and match-payment.set are PUT-with-JSON-body, and
    // dropping the body silently no-ops the write ("changes don't persist").
    if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
      init.body = request.body;
    }

    try {
      const downstream = await timings.measure("edge_downstream", () =>
        env.MATCHMAKER_WORKER!.fetch(target.toString(), init),
      );
      const res = new Response(downstream.body, {
        status: downstream.status,
        headers: downstream.headers,
      });
      endTotal();
      return withEdgeTimings(res, requestId, "edge.matchmaker", timings);
    } catch {
      return errorResponse("internal_error", "Matchmaker service unavailable", 503, requestId);
    }
  });
}
