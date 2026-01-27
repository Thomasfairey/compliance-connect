import type {
  User,
  Site,
  Service,
  Booking,
  Asset,
  Role,
  BookingStatus
} from "@prisma/client";

export type { User, Site, Service, Booking, Asset, Role, BookingStatus };

// Extended types with relations
export type BookingWithRelations = Booking & {
  customer: User;
  site: Site;
  service: Service;
  engineer: User | null;
  assets: Asset[];
};

export type SiteWithBookings = Site & {
  bookings: Booking[];
};

export type UserWithSites = User & {
  sites: Site[];
};

// Form types
export type CreateSiteInput = {
  name: string;
  address: string;
  postcode: string;
  accessNotes?: string;
};

export type CreateBookingInput = {
  siteId: string;
  serviceId: string;
  scheduledDate: Date;
  slot: "AM" | "PM";
  estimatedQty: number;
  notes?: string;
};

export type CreateAssetInput = {
  name: string;
  location: string;
  status: "PASS" | "FAIL" | "N/A";
  assetTag?: string;
  notes?: string;
  imageUrl?: string;
};

// Dashboard stats
export type DashboardStats = {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalSites: number;
};

export type EngineerStats = {
  assignedJobs: number;
  inProgressJobs: number;
  completedToday: number;
  completedThisWeek: number;
};

// Booking wizard steps
export type BookingStep =
  | "service"
  | "site"
  | "details"
  | "schedule"
  | "review";

export type BookingWizardData = {
  serviceId?: string;
  siteId?: string;
  estimatedQty?: number;
  scheduledDate?: Date;
  slot?: "AM" | "PM";
  notes?: string;
};
