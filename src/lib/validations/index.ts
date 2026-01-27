import { z } from "zod";

export const siteSchema = z.object({
  name: z
    .string()
    .min(2, "Site name must be at least 2 characters")
    .max(100, "Site name must be less than 100 characters"),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(200, "Address must be less than 200 characters"),
  postcode: z
    .string()
    .min(5, "Please enter a valid postcode")
    .max(10, "Postcode must be less than 10 characters")
    .regex(
      /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
      "Please enter a valid UK postcode"
    ),
  accessNotes: z
    .string()
    .max(500, "Access notes must be less than 500 characters")
    .optional(),
});

export const bookingSchema = z.object({
  serviceId: z.string().min(1, "Please select a service"),
  siteId: z.string().min(1, "Please select a site"),
  scheduledDate: z.date({ error: "Please select a date" }),
  slot: z.enum(["AM", "PM"], { error: "Please select a time slot" }),
  estimatedQty: z
    .number()
    .min(1, "Quantity must be at least 1")
    .max(10000, "Quantity must be less than 10,000"),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

export const assetSchema = z.object({
  name: z
    .string()
    .min(1, "Asset name is required")
    .max(100, "Name must be less than 100 characters"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(100, "Location must be less than 100 characters"),
  status: z.enum(["PASS", "FAIL", "N/A"]),
  assetTag: z
    .string()
    .max(50, "Asset tag must be less than 50 characters")
    .optional(),
  notes: z
    .string()
    .max(500, "Notes must be less than 500 characters")
    .optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const userProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  companyName: z
    .string()
    .max(100, "Company name must be less than 100 characters")
    .optional(),
  phone: z
    .string()
    .regex(/^(\+44|0)\d{10,11}$/, "Please enter a valid UK phone number")
    .optional()
    .or(z.literal("")),
});

export type SiteFormData = z.infer<typeof siteSchema>;
export type BookingFormData = z.infer<typeof bookingSchema>;
export type AssetFormData = z.infer<typeof assetSchema>;
export type UserProfileFormData = z.infer<typeof userProfileSchema>;
