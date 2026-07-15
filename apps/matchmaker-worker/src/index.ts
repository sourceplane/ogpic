import type { Env } from "./env.js";
import { route } from "./router.js";
import { runAutoStartDueMatches, runAvailabilityReminders } from "./scheduled.js";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return route(request, env);
  },

  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    await runAutoStartDueMatches(env);
    await runAvailabilityReminders(env);
  },
} satisfies ExportedHandler<Env>;
