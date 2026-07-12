/*
 * /rondo/demo — the token-free interactive Rondo preview, now running the
 * Pitchside v2 app (UI revamp). Shows the manager and player surfaces on the
 * seed roster so the whole loop is demoable without an API session. The real,
 * authenticated app lives at /rondo → /rondo/:orgSlug.
 */
"use client";

import "../../../styles/rondo-kit.css";
import { PitchsideDemo } from "@/components/rondo/pitchside-demo";

export default function RondoDemoPage() {
  return <PitchsideDemo />;
}
