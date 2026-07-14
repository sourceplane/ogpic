/*
 * /rondo/demo — the token-free interactive Rondo preview: the Pitchside app on a
 * canned seed (manager/player toggle), running the same view-model the
 * authenticated app uses. The real app lives at /rondo → /rondo/:orgSlug.
 */
"use client";

import "../../../styles/rondo-kit.css";
import { PitchsideDemo } from "@/components/rondo/pitchside-app";

export default function RondoDemoPage() {
  return <PitchsideDemo />;
}
