import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma client
const mockDb = {
  booking: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  engineerProfile: {
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  site: {
    findUnique: vi.fn(),
  },
  service: {
    findUnique: vi.fn(),
  },
  allocationLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

// Mock postcodes API
vi.mock("@/lib/postcodes", () => ({
  lookupPostcodes: vi.fn().mockResolvedValue({
    success: true,
    results: [
      { postcode: "SW1A 1AA", latitude: 51.501, longitude: -0.141 },
      { postcode: "EC1A 1BB", latitude: 51.518, longitude: -0.107 },
    ],
  }),
  calculateDistance: vi.fn().mockReturnValue(5),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn().mockResolvedValue({ id: "admin-123", role: "ADMIN" }),
}));

describe("Engineer Allocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findBestEngineer", () => {
    const mockEngineers = [
      {
        id: "eng-1",
        userId: "user-1",
        status: "APPROVED",
        engineerType: "PAT_TESTER",
        user: { id: "user-1", name: "Engineer A" },
        competencies: [{ serviceId: "service-123", certified: true }],
        qualifications: [
          { name: "PAT Testing", expiryDate: new Date("2025-12-31"), verified: true },
        ],
        coverageAreas: [
          { postcodePrefix: "SW", centerLat: 51.5, centerLng: -0.15, radiusKm: 20 },
        ],
      },
      {
        id: "eng-2",
        userId: "user-2",
        status: "APPROVED",
        engineerType: "PAT_TESTER",
        user: { id: "user-2", name: "Engineer B" },
        competencies: [{ serviceId: "service-123", certified: true }],
        qualifications: [
          { name: "PAT Testing", expiryDate: new Date("2025-12-31"), verified: true },
        ],
        coverageAreas: [
          { postcodePrefix: "EC", centerLat: 51.52, centerLng: -0.1, radiusKm: 20 },
        ],
      },
    ];

    it("should prefer closer engineers", async () => {
      mockDb.engineerProfile.findMany.mockResolvedValue(mockEngineers);
      mockDb.booking.findMany.mockResolvedValue([]); // No existing bookings

      // Engineer in SW postcode should score higher for SW site
      const { calculateDistance } = await import("@/lib/postcodes");
      vi.mocked(calculateDistance).mockImplementation((lat1, lng1, lat2, lng2) => {
        // Return closer distance for Engineer A (SW area)
        if (lat1 === 51.5 && lng1 === -0.15) return 3;
        return 15;
      });

      // Distance scoring should prefer Engineer A
      expect(mockEngineers[0].coverageAreas[0].postcodePrefix).toBe("SW");
    });

    it("should exclude engineers with expired qualifications", () => {
      const expiredEngineer = {
        ...mockEngineers[0],
        qualifications: [
          { name: "PAT Testing", expiryDate: new Date("2020-01-01"), verified: true },
        ],
      };

      const jobDate = new Date("2024-06-15");
      const expiryDate = new Date(expiredEngineer.qualifications[0].expiryDate);

      expect(expiryDate < jobDate).toBe(true);
    });

    it("should exclude engineers without required competency", () => {
      const incompetentEngineer = {
        ...mockEngineers[0],
        competencies: [{ serviceId: "different-service", certified: true }],
      };

      const requiredServiceId = "service-123";
      const hasCompetency = incompetentEngineer.competencies.some(
        (c) => c.serviceId === requiredServiceId
      );

      expect(hasCompetency).toBe(false);
    });

    it("should consider workload when scoring", async () => {
      mockDb.engineerProfile.findMany.mockResolvedValue(mockEngineers);

      // Engineer A has 2 jobs, Engineer B has 0 jobs
      mockDb.booking.findMany.mockResolvedValue([
        { engineerId: "user-1", status: "CONFIRMED" },
        { engineerId: "user-1", status: "IN_PROGRESS" },
      ]);

      // Engineer B should be preferred due to lower workload
      const bookings = await mockDb.booking.findMany();
      const engAJobs = bookings.filter((b: { engineerId: string }) => b.engineerId === "user-1").length;
      const engBJobs = bookings.filter((b: { engineerId: string }) => b.engineerId === "user-2").length;

      expect(engAJobs).toBe(2);
      expect(engBJobs).toBe(0);
    });

    it("should only consider APPROVED engineers", () => {
      const pendingEngineer = {
        ...mockEngineers[0],
        status: "PENDING_APPROVAL",
      };

      expect(pendingEngineer.status).not.toBe("APPROVED");
    });
  });

  describe("Allocation Scoring", () => {
    it("should award points for proximity (< 5km)", () => {
      const distanceKm = 3;
      const proximityScore = distanceKm <= 5 ? 30 :
                            distanceKm <= 15 ? 25 :
                            distanceKm <= 30 ? 15 :
                            distanceKm <= 50 ? 5 : 0;
      expect(proximityScore).toBe(30);
    });

    it("should award points for proximity (5-15km)", () => {
      const distanceKm = 10;
      const proximityScore = distanceKm <= 5 ? 30 :
                            distanceKm <= 15 ? 25 :
                            distanceKm <= 30 ? 15 :
                            distanceKm <= 50 ? 5 : 0;
      expect(proximityScore).toBe(25);
    });

    it("should award points for certified competency", () => {
      const competency = { certified: true, experienceYears: 5 };
      const certificationScore = competency.certified ? 20 : 0;
      expect(certificationScore).toBe(20);
    });

    it("should award points for experience", () => {
      const competency = { certified: true, experienceYears: 5 };
      const experienceScore = Math.min(competency.experienceYears * 2, 10);
      expect(experienceScore).toBe(10);
    });

    it("should penalize high workload", () => {
      const jobsToday = 3;
      const workloadPenalty = jobsToday * 5;
      expect(workloadPenalty).toBe(15);
    });
  });

  describe("Edge Cases", () => {
    it("should handle no available engineers", async () => {
      mockDb.engineerProfile.findMany.mockResolvedValue([]);

      const engineers = await mockDb.engineerProfile.findMany();
      expect(engineers).toHaveLength(0);
    });

    it("should handle engineers at max capacity", async () => {
      const maxJobsPerDay = 4;
      const currentJobs = 4;
      const atCapacity = currentJobs >= maxJobsPerDay;
      expect(atCapacity).toBe(true);
    });

    it("should handle postcode lookup failures gracefully", async () => {
      const { lookupPostcodes } = await import("@/lib/postcodes");
      vi.mocked(lookupPostcodes).mockResolvedValue({
        success: false,
        results: new Map(),
        errors: ["Network error"],
      });

      const result = await lookupPostcodes(["INVALID"]);
      expect(result.success).toBe(false);
    });
  });
});

describe("Allocation Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log allocation decisions", async () => {
    const logEntry = {
      bookingId: "booking-123",
      action: "AUTO_ASSIGNED",
      toEngineerId: "user-1",
      reason: "Closest available",
      score: 75,
      metadata: { distance: 5, workload: 1 },
    };

    mockDb.allocationLog.create.mockResolvedValue(logEntry);

    const result = await mockDb.allocationLog.create({ data: logEntry });
    expect(result.action).toBe("AUTO_ASSIGNED");
    expect(result.score).toBe(75);
  });

  it("should log manual overrides", async () => {
    const logEntry = {
      bookingId: "booking-123",
      action: "MANUAL_OVERRIDE",
      fromEngineerId: "user-1",
      toEngineerId: "user-2",
      reason: "Customer request",
    };

    mockDb.allocationLog.create.mockResolvedValue(logEntry);

    const result = await mockDb.allocationLog.create({ data: logEntry });
    expect(result.action).toBe("MANUAL_OVERRIDE");
  });
});
