import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(price)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "d MMM yyyy")
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "d MMM yyyy, HH:mm")
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function calculateQuote(
  basePrice: number,
  minCharge: number,
  quantity: number
): number {
  const calculated = basePrice * quantity
  return Math.max(calculated, minCharge)
}

export function generateBookingReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let result = "CC-"
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
    IN_PROGRESS: "bg-purple-100 text-purple-800 border-purple-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
    PASS: "bg-green-100 text-green-800 border-green-200",
    FAIL: "bg-red-100 text-red-800 border-red-200",
    "N/A": "bg-gray-100 text-gray-800 border-gray-200",
  }
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200"
}

export function getSlotTime(slot: string): string {
  return slot === "AM" ? "8:00 AM - 12:00 PM" : "1:00 PM - 5:00 PM"
}
