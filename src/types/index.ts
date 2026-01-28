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

// Time slots available for booking
export type TimeSlot =
  | "08:00"
  | "09:00"
  | "10:00"
  | "11:00"
  | "12:00"
  | "13:00"
  | "14:00"
  | "15:00"
  | "16:00";

export const TIME_SLOTS: { value: TimeSlot; label: string; period: string }[] = [
  { value: "08:00", label: "8:00 AM", period: "Early Morning" },
  { value: "09:00", label: "9:00 AM", period: "Morning" },
  { value: "10:00", label: "10:00 AM", period: "Mid-Morning" },
  { value: "11:00", label: "11:00 AM", period: "Late Morning" },
  { value: "12:00", label: "12:00 PM", period: "Midday" },
  { value: "13:00", label: "1:00 PM", period: "Early Afternoon" },
  { value: "14:00", label: "2:00 PM", period: "Afternoon" },
  { value: "15:00", label: "3:00 PM", period: "Mid-Afternoon" },
  { value: "16:00", label: "4:00 PM", period: "Late Afternoon" },
];

export type CreateBookingInput = {
  siteId: string;
  serviceId: string;
  scheduledDate: Date;
  slot: TimeSlot;
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
  slot?: TimeSlot;
  notes?: string;
};

// Pricing info for calendar display
export type DatePricingInfo = {
  date: Date;
  discountPercent: number;
  discountReason?: string;
  hasNearbyBooking: boolean;
};
