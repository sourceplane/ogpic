import { buildShareText, buildShareLinks, formatKickoff } from "@matchmaker-worker/engine/share";

const MATCH = {
  scheduledAt: new Date("2026-07-12T14:30:00.000Z"),
  ratingA: 90,
  ratingB: 89,
  teamA: { name: "Home Team", players: [{ name: "L. Messi", position: "FWD" as const, rating: 94 }] },
  teamB: { name: "Away Team", players: [{ name: "V. van Dijk", position: "DEF" as const, rating: 90 }] },
};

describe("formatKickoff", () => {
  it("renders a deterministic UTC date and time", () => {
    const { date, time } = formatKickoff(MATCH.scheduledAt);
    expect(date).toBe("Sunday, July 12, 2026");
    expect(time).toBe("14:30 UTC");
  });
});

describe("buildShareText", () => {
  it("includes both team blocks with OVR and each player line", () => {
    const text = buildShareText(MATCH);
    expect(text).toContain("🏆 MATCHMAKER FIXTURE DETAILS 🏆");
    expect(text).toContain("🔵 Home Team (OVR 90)");
    expect(text).toContain("🔴 Away Team (OVR 89)");
    expect(text).toContain("• [FWD] L. Messi (OVR: 94)");
    expect(text).toContain("• [DEF] V. van Dijk (OVR: 90)");
  });
});

describe("buildShareLinks", () => {
  it("builds URL-encoded WhatsApp and mailto links", () => {
    const { whatsappUrl, mailtoUrl } = buildShareLinks("hello world & more");
    expect(whatsappUrl).toBe("https://api.whatsapp.com/send?text=hello%20world%20%26%20more");
    expect(mailtoUrl).toContain("mailto:?subject=");
    expect(mailtoUrl).toContain("body=hello%20world%20%26%20more");
  });
});
