/*
 * /rondo/demo — the token-free interactive Rondo preview. Runs the full product
 * loop on the seed roster so the experience is demoable and pixel-verifiable
 * without an API session. The real, authenticated app lives at /rondo → /rondo/:orgSlug.
 */
"use client";

import * as React from "react";
import "../../../styles/rondo.css";
import { RondoApp } from "@/components/rondo/rondo-app";

export default function RondoDemoPage() {
  return <RondoApp />;
}
