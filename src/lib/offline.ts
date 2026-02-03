// Offline support utilities for Engineer PWA

const DB_NAME = "cod-offline";
const DB_VERSION = 1;

// Types
export interface OfflineRequest {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

export interface CachedJob {
  id: string;
  scheduledDate: string;
  slot: string;
  status: string;
  customerName: string;
  serviceName: string;
  postcode: string;
  address: string;
  phone?: string;
  notes?: string;
  estimatedDuration?: number;
}

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("requests")) {
        const store = db.createObjectStore("requests", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp");
      }

      if (!db.objectStoreNames.contains("jobs")) {
        const jobStore = db.createObjectStore("jobs", { keyPath: "id" });
        jobStore.createIndex("date", "scheduledDate");
      }
    };
  });
}

// Queue a request for offline sync
export async function queueOfflineRequest(
  url: string,
  method: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("requests", "readwrite");
  const store = tx.objectStore("requests");

  const requestData: OfflineRequest = {
    url,
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    timestamp: Date.now(),
  };

  await new Promise<void>((resolve, reject) => {
    const request = store.add(requestData);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Register for background sync if available
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    // Background Sync API - not available in all browsers
    if ("sync" in registration) {
      await (registration.sync as { register: (tag: string) => Promise<void> }).register("sync-offline-requests");
    }
  }
}

// Get pending offline requests count
export async function getPendingRequestCount(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction("requests", "readonly");
    const store = tx.objectStore("requests");

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return 0;
  }
}

// Cache jobs for offline access
export async function cacheJobsOffline(jobs: CachedJob[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("jobs", "readwrite");
  const store = tx.objectStore("jobs");

  // Clear existing
  await new Promise<void>((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Add new jobs
  for (const job of jobs) {
    await new Promise<void>((resolve, reject) => {
      const request = store.put(job);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Also tell the service worker
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: "CACHE_JOBS",
      jobs,
    });
  }
}

// Get cached jobs for offline display
export async function getCachedJobs(): Promise<CachedJob[]> {
  try {
    const db = await openDB();
    const tx = db.transaction("jobs", "readonly");
    const store = tx.objectStore("jobs");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as CachedJob[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

// Get cached job by ID
export async function getCachedJob(id: string): Promise<CachedJob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction("jobs", "readonly");
    const store = tx.objectStore("jobs");

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as CachedJob | null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

// Check if we're online
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/engineer",
    });

    console.log("[SW] Registered with scope:", registration.scope);

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version available
            console.log("[SW] New version available");
            dispatchEvent(new CustomEvent("sw-update-available"));
          }
        });
      }
    });

    // Listen for sync completion
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data.type === "SYNC_COMPLETE") {
        console.log("[SW] Sync complete:", event.data.count, "requests synced");
        dispatchEvent(
          new CustomEvent("offline-sync-complete", {
            detail: { count: event.data.count },
          })
        );
      }
    });

    return registration;
  } catch (error) {
    console.error("[SW] Registration failed:", error);
    return null;
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  return Notification.requestPermission();
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Get the VAPID public key from environment
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("[Push] VAPID key not configured");
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    return subscription;
  } catch (error) {
    console.error("[Push] Subscription failed:", error);
    return null;
  }
}

// Convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer as ArrayBuffer;
}

// Force update service worker
export async function updateServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  await registration.update();

  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
