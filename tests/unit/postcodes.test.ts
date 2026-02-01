import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateDistance,
  estimateDrivingTimeMinutes,
  getPostcodeArea,
  getPostcodeDistrict,
} from "@/lib/postcodes";

describe("Postcode Utilities", () => {
  describe("calculateDistance (Haversine)", () => {
    it("should calculate distance between two points correctly", () => {
      // London to Manchester (approx 262km)
      const distance = calculateDistance(51.5074, -0.1278, 53.4808, -2.2426);
      expect(distance).toBeGreaterThan(250);
      expect(distance).toBeLessThan(280);
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(51.5074, -0.1278, 51.5074, -0.1278);
      expect(distance).toBe(0);
    });

    it("should handle negative coordinates", () => {
      const distance = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);
      expect(distance).toBeGreaterThan(700); // Sydney to Melbourne
      expect(distance).toBeLessThan(900);
    });

    it("should be symmetric (A to B = B to A)", () => {
      const distanceAB = calculateDistance(51.5074, -0.1278, 53.4808, -2.2426);
      const distanceBA = calculateDistance(53.4808, -2.2426, 51.5074, -0.1278);
      expect(distanceAB).toBeCloseTo(distanceBA, 5);
    });
  });

  describe("estimateDrivingTimeMinutes", () => {
    it("should estimate driving time for short distances (urban)", () => {
      const time = estimateDrivingTimeMinutes(6);
      // 6km at 30km/h = 12 minutes
      expect(time).toBe(12);
    });

    it("should estimate driving time for medium distances (mixed)", () => {
      const time = estimateDrivingTimeMinutes(25);
      // 25km at 40km/h = 37.5 minutes (rounded to 38)
      expect(time).toBe(38);
    });

    it("should estimate driving time for long distances (motorway)", () => {
      const time = estimateDrivingTimeMinutes(100);
      // 100km at 50km/h = 120 minutes
      expect(time).toBe(120);
    });

    it("should handle 0 distance", () => {
      const time = estimateDrivingTimeMinutes(0);
      expect(time).toBe(0);
    });

    it("should round to nearest minute", () => {
      const time = estimateDrivingTimeMinutes(17);
      expect(Number.isInteger(time)).toBe(true);
    });
  });

  describe("getPostcodeArea", () => {
    // Function strips digits and takes first 2 chars
    it("should extract area from full postcode", () => {
      expect(getPostcodeArea("SW1A 1AA")).toBe("SW");
      expect(getPostcodeArea("EC1A 1BB")).toBe("EC");
      expect(getPostcodeArea("W1A 0AX")).toBe("WA"); // W + A (after digits removed)
      expect(getPostcodeArea("M1 1AE")).toBe("MA"); // M + A (after digits removed)
    });

    it("should handle postcodes without space", () => {
      expect(getPostcodeArea("SW1A1AA")).toBe("SW");
      expect(getPostcodeArea("EC1A1BB")).toBe("EC");
    });

    it("should handle lowercase postcodes", () => {
      expect(getPostcodeArea("sw1a 1aa")).toBe("SW");
      expect(getPostcodeArea("ec1a1bb")).toBe("EC");
    });

    it("should handle partial postcodes", () => {
      expect(getPostcodeArea("SW1")).toBe("SW");
      expect(getPostcodeArea("EC")).toBe("EC");
    });
  });

  describe("getPostcodeDistrict", () => {
    it("should extract district from full postcode", () => {
      expect(getPostcodeDistrict("SW1A 1AA")).toBe("SW1A");
      expect(getPostcodeDistrict("EC1A 1BB")).toBe("EC1A");
      expect(getPostcodeDistrict("W1A 0AX")).toBe("W1A");
      expect(getPostcodeDistrict("M1 1AE")).toBe("M1");
    });

    it("should handle postcodes without space", () => {
      expect(getPostcodeDistrict("SW1A1AA")).toBe("SW1A");
      expect(getPostcodeDistrict("EC1A1BB")).toBe("EC1A");
    });

    it("should handle lowercase postcodes", () => {
      expect(getPostcodeDistrict("sw1a 1aa")).toBe("SW1A");
      expect(getPostcodeDistrict("ec1a1bb")).toBe("EC1A");
    });
  });
});

describe("Postcode API Integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should handle API errors gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { lookupPostcode } = await import("@/lib/postcodes");
    const result = await lookupPostcode("SW1A 1AA");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should handle invalid postcode response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 404, result: null }),
    });

    const { lookupPostcode } = await import("@/lib/postcodes");
    const result = await lookupPostcode("INVALID");

    expect(result.success).toBe(false);
  });
});
