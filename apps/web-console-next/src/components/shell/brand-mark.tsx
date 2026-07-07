"use client";

import * as React from "react";
import { Aperture } from "lucide-react";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/app-config";

/**
 * The Ogpic brand mark: a camera-aperture glyph in a rounded gradient tile, the
 * product's single visual identity. Used wherever the console needs to say who
 * it is — the sign-in card, the sidebar (Solo profile), the empty overview hero.
 *
 * Keeping it in one component means a rebrand touches the glyph once, not the
 * five places a hardcoded initial used to live. Copy (name, tagline) comes from
 * `app-config.ts`, the instance-identity seam.
 */

const TILE_SIZES = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-lg",
  lg: "h-12 w-12 rounded-xl",
} as const;

const ICON_SIZES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

/** The gradient aperture tile on its own (no wordmark). */
export function BrandTile({
  size = "md",
  className,
}: {
  size?: keyof typeof TILE_SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center bg-gradient-to-br from-primary to-primary/40 text-primary-foreground shadow-sm",
        TILE_SIZES[size],
        className,
      )}
      aria-hidden
    >
      <Aperture className={ICON_SIZES[size]} strokeWidth={2.25} />
    </span>
  );
}

/**
 * The full lockup: aperture tile + wordmark, with an optional tagline line.
 * `href`-less by design — callers wrap it in a link where navigation is wanted.
 */
export function BrandMark({
  size = "md",
  tagline = false,
  subtitle,
  className,
}: {
  size?: keyof typeof TILE_SIZES;
  /** Show the product tagline under the name. */
  tagline?: boolean;
  /** Override the second line (e.g. the API target) instead of the tagline. */
  subtitle?: string;
  className?: string;
}) {
  const second = subtitle ?? (tagline ? PRODUCT_TAGLINE : null);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandTile size={size} />
      <div className="min-w-0">
        <div
          className={cn(
            "truncate font-semibold tracking-tight",
            size === "lg" ? "text-lg" : "text-base",
          )}
        >
          {PRODUCT_NAME}
        </div>
        {second ? (
          <div className="truncate text-xs text-muted-foreground">{second}</div>
        ) : null}
      </div>
    </div>
  );
}
