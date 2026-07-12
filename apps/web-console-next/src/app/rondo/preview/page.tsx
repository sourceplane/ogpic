/*
 * /rondo/preview — developer alias for the Pitchside v2 demo. Renders the same
 * seed-driven manager/player surfaces as /rondo/demo (via PitchsideDemo). Kept
 * as a stable review URL for the UI revamp.
 */
"use client";

import "../../../styles/rondo-kit.css";
import { PitchsideDemo } from "@/components/rondo/pitchside-demo";

export default function RondoPreviewPage() {
  return <PitchsideDemo />;
}
