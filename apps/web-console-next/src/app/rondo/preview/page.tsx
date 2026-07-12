/*
 * /rondo/preview — developer harness for the Pitchside v2 manager app (phase 3).
 * Renders the seed-driven manager surface (Home · Schedule · Draft · Manage
 * squad) so it is reviewable and screenshot-able before it is wired to live data
 * (phase 5). Not linked from the app.
 */
"use client";

import "../../../styles/rondo-kit.css";
import { ManagerApp } from "@/components/rondo/manager-app";

export default function RondoPreviewPage() {
  return <ManagerApp />;
}
