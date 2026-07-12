import { parseVenueInput, EMPTY_VENUE } from "@matchmaker-worker/handlers/venue";

describe("parseVenueInput", () => {
  it("returns null when the venue is absent", () => {
    const fields: Record<string, string[]> = {};
    expect(parseVenueInput(undefined, fields)).toBeNull();
    expect(parseVenueInput(null, fields)).toBeNull();
    expect(fields).toEqual({});
  });

  it("trims a provided venue and defaults booked to false", () => {
    const fields: Record<string, string[]> = {};
    expect(parseVenueInput({ name: "  Riverside Astro  " }, fields)).toEqual({
      name: "Riverside Astro",
      address: null,
      booked: false,
    });
    expect(fields).toEqual({});
  });

  it("carries address and the booked flag", () => {
    const fields: Record<string, string[]> = {};
    expect(parseVenueInput({ name: "The Cage", address: "5-a-side", booked: true }, fields)).toEqual({
      name: "The Cage",
      address: "5-a-side",
      booked: true,
    });
  });

  it("coerces blank strings to null", () => {
    const fields: Record<string, string[]> = {};
    expect(parseVenueInput({ name: "   ", address: "" }, fields)).toEqual(EMPTY_VENUE);
  });

  it("flags an over-long name and a non-boolean booked", () => {
    const fields: Record<string, string[]> = {};
    parseVenueInput({ name: "x".repeat(81), booked: "yes" }, fields);
    expect(fields["venue.name"]).toBeDefined();
    expect(fields["venue.booked"]).toBeDefined();
  });

  it("flags a non-object venue", () => {
    const fields: Record<string, string[]> = {};
    expect(parseVenueInput("nope", fields)).toBeNull();
    expect(fields.venue).toBeDefined();
  });
});
