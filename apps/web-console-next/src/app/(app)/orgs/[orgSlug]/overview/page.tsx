"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CreditCard,
  FolderKanban,
  Gauge,
  KeyRound,
  Receipt,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  User2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { OrgScope } from "@/components/shell/org-scope";
import { BrandTile } from "@/components/shell/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";
import { useApiQuery, qk } from "@/lib/query";
import { wrap } from "@/lib/api";
import { PRODUCT_TAGLINE } from "@/lib/app-config";
import { SOLO_MODE } from "@/lib/solo-mode";
import { cn } from "@/lib/cn";

/**
 * Overview — the console's default landing surface.
 *
 * Rather than dropping a returning user straight onto a settings form or a
 * projects table, the org home is a purpose-built dashboard: it greets them,
 * summarizes the account's plan at a glance, and offers one-tap jumps to the
 * surfaces they actually use. It is profile-aware — under the Solo profile the
 * platform plumbing (projects, usage, team) is suppressed, so those tiles fall
 * away and the personal-account surfaces take their place.
 */
export default function OverviewPage() {
  const params = useParams<{ orgSlug: string }>();
  const slug = params?.orgSlug ?? "";
  return <OrgScope slug={slug}>{(org) => <Inner orgId={org.id} orgSlug={org.slug} />}</OrgScope>;
}

function Inner({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const { client } = useSession();

  const profile = useApiQuery(qk.profile(), () =>
    wrap(async () => (await client.auth.getProfile()).user),
  );
  const greetName = profile.data?.displayName?.trim() || null;

  return (
    <div className="space-y-6">
      <HomeHero name={greetName} loading={profile.loading} />
      <PlanSummary orgId={orgId} />
      {!SOLO_MODE && <ProjectsSummary orgId={orgId} orgSlug={orgSlug} />}
      <QuickLinks orgSlug={orgSlug} />
    </div>
  );
}

function HomeHero({ name, loading }: { name: string | null; loading: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
      <BrandTile size="lg" className="hidden sm:grid" />
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {loading ? (
            <Skeleton className="h-7 w-56 max-w-full" />
          ) : name ? (
            `Welcome back, ${name}`
          ) : (
            "Welcome back"
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{PRODUCT_TAGLINE}</p>
      </div>
    </div>
  );
}

/**
 * Plan-at-a-glance. Billing is a kept surface under both profiles, but the
 * summary can legitimately be gated (precondition) before a plan is chosen — we
 * degrade to a neutral "No active plan" card rather than surfacing a raw error.
 */
function PlanSummary({ orgId }: { orgId: string }) {
  const { client } = useSession();
  const summary = useApiQuery(qk.billingSummary(orgId), () =>
    wrap(() => client.billing.getSummary(orgId)),
  );

  if (summary.loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const plan = summary.data?.plan ?? null;
  const sub = summary.data?.activeSubscription ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
              <CreditCard className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base">{plan ? plan.name : "No active plan"}</CardTitle>
              <CardDescription>
                {plan ? "Your current subscription plan" : "Choose a plan to unlock billing"}
              </CardDescription>
            </div>
          </div>
          {sub ? (
            <Badge variant={sub.status === "active" || sub.status === "trialing" ? "success" : "secondary"}>
              {sub.status}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
    </Card>
  );
}

/** Baseline-only: how many projects live under this org, with a jump in. */
function ProjectsSummary({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const { client } = useSession();
  const projects = useApiQuery(qk.projects(orgId), () =>
    wrap(async () => (await client.projects.list(orgId)).projects),
  );
  const count = projects.data?.length ?? 0;

  return (
    <Link
      href={`/orgs/${orgSlug}/projects`}
      className="block rounded-xl border bg-card transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex items-center gap-3 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <FolderKanban className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Projects</div>
          <div className="text-xs text-muted-foreground">
            {projects.loading
              ? "Loading…"
              : count === 0
                ? "No projects yet — create your first one"
                : `${count} ${count === 1 ? "project" : "projects"}`}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}

interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

function QuickLinks({ orgSlug }: { orgSlug: string }) {
  const base = `/orgs/${orgSlug}`;
  const links: QuickLink[] = SOLO_MODE
    ? [
        { href: `${base}/settings`, label: "Account", description: "Profile and workspace settings", icon: Settings },
        { href: `${base}/settings/billing`, label: "Billing & plan", description: "Subscription and invoices", icon: Receipt },
        { href: `${base}/settings/notifications`, label: "Notifications", description: "Email and alert preferences", icon: Bell },
        { href: `${base}/settings/config`, label: "Config", description: "Settings, flags and secrets", icon: SlidersHorizontal },
        { href: "/account", label: "Profile", description: "Your name and identity", icon: User2 },
        { href: "/account/security", label: "Security", description: "Sessions and recent activity", icon: ShieldCheck },
      ]
    : [
        { href: `${base}/projects`, label: "Projects", description: "Projects and environments", icon: FolderKanban },
        { href: `${base}/usage`, label: "Usage & quota", description: "Metering and limits", icon: Gauge },
        { href: `${base}/settings`, label: "Settings", description: "Organization settings", icon: Settings },
        { href: `${base}/settings/members`, label: "Members", description: "Team and invitations", icon: Users },
        { href: `${base}/settings/billing`, label: "Billing & plan", description: "Subscription and invoices", icon: Receipt },
        { href: `${base}/settings/api-keys`, label: "API keys", description: "Programmatic access", icon: KeyRound },
      ];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Jump to
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors",
                "hover:border-primary/40 hover:bg-accent/40",
              )}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{link.label}</div>
                <div className="truncate text-xs text-muted-foreground">{link.description}</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
