/*
 * /rondo — the Rondo football-community experience (rondo-experience epic).
 * Standalone and token-free (like /demo): renders the full product loop on the
 * seed roster so it is demoable and pixel-verifiable without an API session.
 * Live-data wiring into org scope is a follow-on increment (RX2+).
 */
"use client";

import * as React from "react";
import "../../styles/rondo.css";
import { RondoApp } from "@/components/rondo/rondo-app";

export default function RondoPage() {
  return <RondoApp />;
}
