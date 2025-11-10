import { describe, expect, it } from "vitest";
import { timeAgo } from "../timeAgo";

describe("timeAgo", () => {
  const now = new Date("2024-04-01T12:00:00Z");

  it("returns 'just now' for future dates", () => {
    const result = timeAgo("2024-04-02T00:00:00Z", { now });
    expect(result).toBe("just now");
  });

  it("returns 'just now' for the same moment", () => {
    const result = timeAgo(now.toISOString(), { now });
    expect(result).toBe("just now");
  });

  it("formats minutes", () => {
    const result = timeAgo("2024-04-01T11:45:00Z", { now });
    expect(result).toBe("15m ago");
  });

  it("formats hours", () => {
    const result = timeAgo("2024-04-01T08:00:00Z", { now });
    expect(result).toBe("4h ago");
  });

  it("formats days", () => {
    const result = timeAgo("2024-03-29T12:00:00Z", { now });
    expect(result).toBe("3d ago");
  });

  it("formats months", () => {
    const result = timeAgo("2024-01-15T12:00:00Z", { now });
    expect(result).toBe("2mo ago");
  });

  it("formats years", () => {
    const result = timeAgo("2021-04-01T12:00:00Z", { now });
    expect(result).toBe("3y ago");
  });

  it("returns 'Invalid date' for invalid input", () => {
    expect(timeAgo("invalid", { now })).toBe("Invalid date");
  });

  it("handles edge cases at boundaries", () => {
    // Exactly 1 minute
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    expect(timeAgo(oneMinuteAgo.toISOString(), { now })).toBe("1m ago");

    // Exactly 1 hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    expect(timeAgo(oneHourAgo.toISOString(), { now })).toBe("1h ago");

    // Exactly 1 day
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(timeAgo(oneDayAgo.toISOString(), { now })).toBe("1d ago");
  });

  it("supports Japanese locale", () => {
    const result = timeAgo("2024-04-01T11:45:00Z", { now, locale: "ja" });
    expect(result).toBe("15分前");
  });
});
