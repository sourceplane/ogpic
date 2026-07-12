import { validatePlayerBody } from "@matchmaker-worker/handlers/create-player";
import { validateEmail } from "@matchmaker-worker/handlers/player-email";

describe("validatePlayerBody — default strength + email", () => {
  it("seeds a default OVR-60 attribute set when attributes are omitted", () => {
    const r = validatePlayerBody({ name: "Rookie", position: "MID" });
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.value.rating).toBe(60);
      expect(r.value.attributes).toEqual({ PAC: 60, SHO: 60, PAS: 60, DRI: 60, DEF: 60, PHY: 60 });
      expect(r.value.email).toBeNull();
    }
  });

  it("uses the GK attribute set for a goalkeeper default", () => {
    const r = validatePlayerBody({ name: "Keeper", position: "GK" });
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(Object.keys(r.value.attributes).sort()).toEqual(["DIV", "HAN", "KIC", "POS", "REF", "SPD"]);
    }
  });

  it("normalises a provided email", () => {
    const r = validatePlayerBody({ name: "Sam", position: "FWD", email: "  Sam@Example.COM " });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.value.email).toBe("sam@example.com");
  });

  it("rejects a malformed email", () => {
    const r = validatePlayerBody({ name: "Sam", position: "FWD", email: "not-an-email" });
    expect(r.valid).toBe(false);
  });

  it("still honours an explicit attribute set", () => {
    const r = validatePlayerBody({
      name: "Star",
      position: "FWD",
      attributes: { PAC: 90, SHO: 90, PAS: 80, DRI: 88, DEF: 40, PHY: 82 },
    });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.value.rating).toBe(78);
  });
});

describe("validateEmail", () => {
  it("treats absent / empty as null without error", () => {
    const fields: Record<string, string[]> = {};
    expect(validateEmail(undefined, fields)).toBeNull();
    expect(validateEmail("", fields)).toBeNull();
    expect(fields).toEqual({});
  });

  it("flags an invalid address", () => {
    const fields: Record<string, string[]> = {};
    expect(validateEmail("nope", fields)).toBeNull();
    expect(fields.email).toBeDefined();
  });
});
