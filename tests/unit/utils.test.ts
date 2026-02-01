import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatDate,
  getSlotTime,
  cn,
  calculateQuote,
  getStatusColor,
  generateBookingReference,
} from "@/lib/utils";

describe("Utility Functions", () => {
  describe("formatPrice", () => {
    it("should format prices with GBP currency", () => {
      expect(formatPrice(100)).toBe("£100.00");
      expect(formatPrice(1234.56)).toBe("£1,234.56");
      expect(formatPrice(0)).toBe("£0.00");
    });

    it("should handle decimal prices", () => {
      expect(formatPrice(99.99)).toBe("£99.99");
      expect(formatPrice(0.45)).toBe("£0.45");
    });

    it("should handle large numbers", () => {
      expect(formatPrice(10000)).toBe("£10,000.00");
      expect(formatPrice(1000000)).toBe("£1,000,000.00");
    });

    it("should round to 2 decimal places", () => {
      expect(formatPrice(99.999)).toBe("£100.00");
      expect(formatPrice(99.994)).toBe("£99.99");
    });
  });

  describe("formatDate", () => {
    it("should format dates in UK format", () => {
      const date = new Date("2024-03-15");
      const formatted = formatDate(date);
      expect(formatted).toContain("15");
      expect(formatted).toContain("Mar");
      expect(formatted).toContain("2024");
    });

    it("should handle string dates", () => {
      const formatted = formatDate("2024-03-15");
      expect(formatted).toContain("15");
      expect(formatted).toContain("Mar");
    });

    it("should handle Date objects", () => {
      const date = new Date(2024, 2, 15); // March 15, 2024
      const formatted = formatDate(date);
      expect(formatted).toBeDefined();
    });
  });

  describe("getSlotTime", () => {
    it("should return morning time for AM slot", () => {
      const time = getSlotTime("AM");
      expect(time).toContain("8");
      expect(time.toLowerCase()).toContain("am");
    });

    it("should return afternoon time for PM slot", () => {
      const time = getSlotTime("PM");
      expect(time).toContain("1");
      expect(time.toLowerCase()).toContain("pm");
    });

    it("should handle specific time slots", () => {
      const time = getSlotTime("10:00");
      expect(time).toContain("10");
    });
  });

  describe("cn (classnames)", () => {
    it("should merge class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should handle conditional classes", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
      expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz");
    });

    it("should handle undefined and null", () => {
      expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });

    it("should merge Tailwind classes correctly", () => {
      expect(cn("p-4", "p-2")).toBe("p-2"); // Later class wins
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("should handle arrays", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });
  });

  describe("calculateQuote", () => {
    // Function signature: calculateQuote(basePrice, minCharge, quantity)
    it("should calculate quote based on quantity and base price", () => {
      const quote = calculateQuote(0.45, 50, 50);
      expect(quote).toBe(50); // max(0.45 * 50, 50) = max(22.5, 50) = 50
    });

    it("should apply minimum charge", () => {
      const quote = calculateQuote(0.45, 50, 10);
      expect(quote).toBe(50); // 0.45 * 10 = 4.5, min is 50
    });

    it("should exceed minimum when quantity is high", () => {
      const quote = calculateQuote(0.45, 50, 200);
      expect(quote).toBe(90); // 0.45 * 200 = 90 > 50
    });

    it("should handle zero quantity", () => {
      const quote = calculateQuote(0.45, 50, 0);
      expect(quote).toBe(50); // Min charge applies
    });
  });

  describe("getStatusColor", () => {
    it("should return correct color for PENDING", () => {
      expect(getStatusColor("PENDING")).toContain("amber");
    });

    it("should return correct color for CONFIRMED", () => {
      expect(getStatusColor("CONFIRMED")).toContain("blue");
    });

    it("should return correct color for COMPLETED", () => {
      expect(getStatusColor("COMPLETED")).toContain("green");
    });

    it("should return correct color for CANCELLED", () => {
      expect(getStatusColor("CANCELLED")).toContain("gray");
    });

    it("should return default for unknown status", () => {
      const color = getStatusColor("UNKNOWN");
      expect(color).toBeDefined();
    });
  });

  describe("generateBookingReference", () => {
    it("should generate unique references", () => {
      const ref1 = generateBookingReference();
      const ref2 = generateBookingReference();
      expect(ref1).not.toBe(ref2);
    });

    it("should have correct format", () => {
      const ref = generateBookingReference();
      expect(ref).toMatch(/^CC-[A-Z0-9]+$/);
    });

    it("should be a reasonable length", () => {
      const ref = generateBookingReference();
      expect(ref.length).toBeGreaterThan(5);
      expect(ref.length).toBeLessThan(20);
    });
  });
});

describe("Edge Cases", () => {
  describe("formatPrice edge cases", () => {
    it("should handle negative prices", () => {
      const result = formatPrice(-50);
      expect(result).toContain("50");
    });

    it("should handle very small decimals", () => {
      const result = formatPrice(0.01);
      expect(result).toBe("£0.01");
    });
  });

  describe("Date edge cases", () => {
    it("should handle end of year dates", () => {
      const date = new Date("2024-12-31");
      const formatted = formatDate(date);
      expect(formatted).toContain("31");
      expect(formatted).toContain("Dec");
    });

    it("should handle leap year dates", () => {
      const date = new Date("2024-02-29");
      const formatted = formatDate(date);
      expect(formatted).toContain("29");
      expect(formatted).toContain("Feb");
    });
  });
});
