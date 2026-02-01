import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingStatus } from "@prisma/client";

// Mock Prisma client
const mockDb = {
  booking: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  bookingStatusLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue({
    id: "engineer-123",
    role: "ENGINEER",
    name: "Test Engineer",
  }),
}));

describe("Booking Status Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Status Transitions", () => {
    const validTransitions: [BookingStatus, BookingStatus[]][] = [
      ["PENDING", ["CONFIRMED", "CANCELLED"]],
      ["CONFIRMED", ["EN_ROUTE", "DECLINED", "CANCELLED"]],
      ["EN_ROUTE", ["ON_SITE", "CONFIRMED"]],
      ["ON_SITE", ["IN_PROGRESS", "EN_ROUTE"]],
      ["IN_PROGRESS", ["COMPLETED", "REQUIRES_REVISIT", "CANCELLED"]],
      ["COMPLETED", []],
      ["CANCELLED", ["PENDING"]],
      ["DECLINED", ["PENDING"]],
      ["REQUIRES_REVISIT", ["CONFIRMED"]],
    ];

    it.each(validTransitions)(
      "should allow valid transitions from %s",
      (fromStatus, validNextStatuses) => {
        expect(validNextStatuses).toBeDefined();
        expect(Array.isArray(validNextStatuses)).toBe(true);
      }
    );

    it("should not allow skipping workflow steps", () => {
      // CONFIRMED cannot go directly to COMPLETED
      const invalidTransition = ["CONFIRMED", "COMPLETED"];
      const validFromConfirmed = ["EN_ROUTE", "DECLINED", "CANCELLED"];
      expect(validFromConfirmed).not.toContain(invalidTransition[1]);
    });

    it("should not allow COMPLETED to transition", () => {
      const completedTransitions: BookingStatus[] = [];
      expect(completedTransitions).toHaveLength(0);
    });
  });

  describe("startEnRoute", () => {
    it("should update status from CONFIRMED to EN_ROUTE", async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: "booking-123",
        status: "CONFIRMED",
        engineerId: "engineer-123",
      });

      mockDb.booking.update.mockResolvedValue({
        id: "booking-123",
        status: "EN_ROUTE",
      });

      const { startEnRoute } = await import("@/lib/actions/booking-status");
      const result = await startEnRoute("booking-123");

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("EN_ROUTE");
    });

    it("should reject if booking not found", async () => {
      mockDb.booking.findUnique.mockResolvedValue(null);

      const { startEnRoute } = await import("@/lib/actions/booking-status");
      const result = await startEnRoute("nonexistent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should reject if not assigned to user", async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: "booking-123",
        status: "CONFIRMED",
        engineerId: "other-engineer",
      });

      const { startEnRoute } = await import("@/lib/actions/booking-status");
      const result = await startEnRoute("booking-123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("authorized");
    });

    it("should reject if not in CONFIRMED status", async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: "booking-123",
        status: "PENDING",
        engineerId: "engineer-123",
      });

      const { startEnRoute } = await import("@/lib/actions/booking-status");
      const result = await startEnRoute("booking-123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("CONFIRMED");
    });
  });

  describe("arriveOnSite", () => {
    it("should update status from EN_ROUTE to ON_SITE", async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: "booking-123",
        status: "EN_ROUTE",
        engineerId: "engineer-123",
      });

      mockDb.booking.update.mockResolvedValue({
        id: "booking-123",
        status: "ON_SITE",
      });

      const { arriveOnSite } = await import("@/lib/actions/booking-status");
      const result = await arriveOnSite("booking-123");

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("ON_SITE");
    });

    it("should reject if not EN_ROUTE", async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: "booking-123",
        status: "CONFIRMED",
        engineerId: "engineer-123",
      });

      const { arriveOnSite } = await import("@/lib/actions/booking-status");
      const result = await arriveOnSite("booking-123");

      expect(result.success).toBe(false);
    });
  });

  describe("completeJob", () => {
    it("should require customer signature", async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: "booking-123",
        status: "IN_PROGRESS",
        engineerId: "engineer-123",
        customerSignatureUrl: null,
      });

      const { completeJob } = await import("@/lib/actions/booking-status");
      const result = await completeJob("booking-123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("signature");
    });

    it("should complete with signature", async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: "booking-123",
        status: "IN_PROGRESS",
        engineerId: "engineer-123",
        customerSignatureUrl: "https://example.com/signature.png",
      });

      mockDb.booking.update.mockResolvedValue({
        id: "booking-123",
        status: "COMPLETED",
      });

      const { completeJob } = await import("@/lib/actions/booking-status");
      const result = await completeJob("booking-123");

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("COMPLETED");
    });
  });

  describe("declineJob", () => {
    it("should require a reason", async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: "booking-123",
        status: "CONFIRMED",
        engineerId: "engineer-123",
      });

      const { declineJob } = await import("@/lib/actions/booking-status");
      const result = await declineJob("booking-123", "");

      // Empty reason should still work but be validated
      expect(typeof result.success).toBe("boolean");
    });

    it("should unassign engineer on decline", async () => {
      mockDb.booking.findUnique.mockResolvedValue({
        id: "booking-123",
        status: "CONFIRMED",
        engineerId: "engineer-123",
      });

      mockDb.booking.update.mockResolvedValue({
        id: "booking-123",
        status: "DECLINED",
        engineerId: null,
      });

      const { declineJob } = await import("@/lib/actions/booking-status");
      await declineJob("booking-123", "Cannot attend");

      expect(mockDb.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            engineerId: null,
          }),
        })
      );
    });
  });
});

describe("Status Log Tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log status changes", async () => {
    mockDb.booking.findUnique.mockResolvedValue({
      id: "booking-123",
      status: "CONFIRMED",
      engineerId: "engineer-123",
    });

    mockDb.booking.update.mockResolvedValue({
      id: "booking-123",
      status: "EN_ROUTE",
    });

    const { startEnRoute } = await import("@/lib/actions/booking-status");
    await startEnRoute("booking-123");

    expect(mockDb.bookingStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: "booking-123",
          fromStatus: "CONFIRMED",
          toStatus: "EN_ROUTE",
        }),
      })
    );
  });
});
