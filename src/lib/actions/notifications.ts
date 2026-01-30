"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type NotificationData = {
  id: string;
  type: string;
  title: string;
  body: string;
  bookingId: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  sentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
};

export async function getNotifications(): Promise<NotificationData[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const user = await getCurrentUser();
    if (!user) return 0;

    const count = await db.notification.count({
      where: {
        userId: user.id,
        readAt: null,
      },
    });

    return count;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

export async function markAsRead(notificationId: string): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    await db.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    revalidatePath("/engineer");
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false };
  }
}

export async function markAllAsRead(): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    await db.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    revalidatePath("/engineer");
    return { success: true };
  } catch (error) {
    console.error("Error marking all as read:", error);
    return { success: false };
  }
}

// Register push subscription
export async function registerPushSubscription(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  deviceInfo?: {
    deviceName?: string;
    userAgent?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if this endpoint already exists
    const existing = await db.pushSubscription.findFirst({
      where: {
        userId: user.id,
        endpoint: subscription.endpoint,
      },
    });

    if (existing) {
      // Update existing subscription
      await db.pushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isActive: true,
          deviceName: deviceInfo?.deviceName,
          userAgent: deviceInfo?.userAgent,
        },
      });
    } else {
      // Create new subscription
      await db.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          deviceName: deviceInfo?.deviceName,
          userAgent: deviceInfo?.userAgent,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error registering push subscription:", error);
    return { success: false, error: "Failed to register subscription" };
  }
}

export async function unregisterPushSubscription(
  endpoint: string
): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    await db.pushSubscription.updateMany({
      where: {
        userId: user.id,
        endpoint,
      },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error) {
    console.error("Error unregistering push subscription:", error);
    return { success: false };
  }
}

// Internal function to create and send notification
export async function createNotification({
  userId,
  type,
  title,
  body,
  bookingId,
  actionUrl,
  actionLabel,
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  bookingId?: string;
  actionUrl?: string;
  actionLabel?: string;
}): Promise<{ success: boolean; notificationId?: string }> {
  try {
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        bookingId,
        actionUrl,
        actionLabel,
        sentAt: new Date(),
      },
    });

    // TODO: Send actual push notification via web-push library
    // This would require VAPID keys and the web-push npm package
    // For now, we just create the in-app notification

    return { success: true, notificationId: notification.id };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false };
  }
}

// Notify engineer of new job assignment
export async function notifyNewJobAssignment(
  engineerId: string,
  bookingId: string
): Promise<{ success: boolean }> {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        site: true,
      },
    });

    if (!booking) return { success: false };

    const result = await createNotification({
      userId: engineerId,
      type: "NEW_JOB",
      title: "New Job Assigned",
      body: `${booking.service.name} at ${booking.site.name} on ${booking.scheduledDate.toLocaleDateString()}`,
      bookingId,
      actionUrl: `/engineer/jobs/${bookingId}`,
      actionLabel: "View Job",
    });

    return result;
  } catch (error) {
    console.error("Error notifying new job:", error);
    return { success: false };
  }
}

// Notify engineer of schedule change
export async function notifyScheduleChange(
  engineerId: string,
  bookingId: string,
  changeType: "RESCHEDULED" | "CANCELLED" | "UPDATED"
): Promise<{ success: boolean }> {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        site: true,
      },
    });

    if (!booking) return { success: false };

    const titles: Record<string, string> = {
      RESCHEDULED: "Job Rescheduled",
      CANCELLED: "Job Cancelled",
      UPDATED: "Job Updated",
    };

    const bodies: Record<string, string> = {
      RESCHEDULED: `${booking.service.name} at ${booking.site.name} has been rescheduled to ${booking.scheduledDate.toLocaleDateString()}`,
      CANCELLED: `${booking.service.name} at ${booking.site.name} has been cancelled`,
      UPDATED: `${booking.service.name} at ${booking.site.name} has been updated`,
    };

    const result = await createNotification({
      userId: engineerId,
      type: "SCHEDULE_CHANGE",
      title: titles[changeType],
      body: bodies[changeType],
      bookingId,
      actionUrl: `/engineer/jobs/${bookingId}`,
      actionLabel: "View Details",
    });

    return result;
  } catch (error) {
    console.error("Error notifying schedule change:", error);
    return { success: false };
  }
}

// Daily reminder for tomorrow's jobs
export async function sendDailyReminders(): Promise<{
  sent: number;
  errors: number;
}> {
  const stats = { sent: 0, errors: 0 };

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find all bookings for tomorrow
    const bookings = await db.booking.findMany({
      where: {
        scheduledDate: {
          gte: tomorrow,
          lt: dayAfter,
        },
        status: { in: ["CONFIRMED"] },
        engineerId: { not: null },
      },
      include: {
        service: true,
        site: true,
      },
    });

    // Group by engineer
    const byEngineer = new Map<string, typeof bookings>();
    for (const booking of bookings) {
      if (!booking.engineerId) continue;
      const existing = byEngineer.get(booking.engineerId) || [];
      existing.push(booking);
      byEngineer.set(booking.engineerId, existing);
    }

    for (const [engineerId, engineerBookings] of byEngineer) {
      try {
        const jobCount = engineerBookings.length;
        const firstJob = engineerBookings[0];

        await createNotification({
          userId: engineerId,
          type: "REMINDER",
          title: `${jobCount} Job${jobCount > 1 ? "s" : ""} Tomorrow`,
          body:
            jobCount === 1
              ? `${firstJob.service.name} at ${firstJob.site.name}`
              : `Starting with ${firstJob.service.name} at ${firstJob.site.name}`,
          bookingId: firstJob.id,
          actionUrl: "/engineer/jobs",
          actionLabel: "View Schedule",
        });

        stats.sent++;
      } catch (error) {
        console.error(`Error sending reminder to engineer ${engineerId}:`, error);
        stats.errors++;
      }
    }

    return stats;
  } catch (error) {
    console.error("Error in sendDailyReminders:", error);
    return stats;
  }
}
