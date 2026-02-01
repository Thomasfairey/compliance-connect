// Compliance Connect Service Worker
// Provides offline support for engineer mobile app

const CACHE_NAME = "cod-engineer-v1";
const OFFLINE_URL = "/engineer/offline";

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/engineer",
  "/engineer/calendar",
  "/engineer/earnings",
  "/engineer/profile",
  "/manifest.json",
];

// API routes that should use network-first strategy
const API_ROUTES = [
  "/api/engineer/",
  "/api/auth/",
];

// Install event - precache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Precaching assets");
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching (but queue them for offline sync)
  if (request.method !== "GET") {
    // Queue POST/PUT/DELETE requests when offline
    if (!navigator.onLine && isApiRoute(url.pathname)) {
      event.respondWith(queueOfflineRequest(request));
      return;
    }
    return;
  }

  // API routes - network first, fallback to cache
  if (isApiRoute(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Navigation requests - network first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request).catch(() => {
        return caches.match(OFFLINE_URL) || caches.match("/engineer");
      })
    );
    return;
  }

  // Static assets - cache first
  event.respondWith(cacheFirst(request));
});

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Try cache on network failure
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Return offline page for navigation
    if (request.mode === "navigate") {
      return caches.match(OFFLINE_URL);
    }
    throw error;
  }
}

// Check if URL is an API route
function isApiRoute(pathname) {
  return API_ROUTES.some((route) => pathname.startsWith(route));
}

// Queue offline request for later sync
async function queueOfflineRequest(request) {
  const db = await openOfflineDB();

  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now(),
  };

  const tx = db.transaction("requests", "readwrite");
  const store = tx.objectStore("requests");
  await store.add(requestData);

  // Register for background sync
  if ("sync" in self.registration) {
    await self.registration.sync.register("sync-offline-requests");
  }

  return new Response(
    JSON.stringify({
      success: true,
      queued: true,
      message: "Request queued for sync when online",
    }),
    {
      status: 202,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Open IndexedDB for offline queue
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("cod-offline", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

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

// Background sync event
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-requests") {
    event.waitUntil(syncOfflineRequests());
  }
});

// Sync queued requests when back online
async function syncOfflineRequests() {
  const db = await openOfflineDB();
  const tx = db.transaction("requests", "readwrite");
  const store = tx.objectStore("requests");
  const requests = await store.getAll();

  console.log("[SW] Syncing", requests.length, "offline requests");

  for (const requestData of requests) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body,
      });

      if (response.ok) {
        // Remove from queue on success
        await store.delete(requestData.id);
        console.log("[SW] Synced request:", requestData.url);
      }
    } catch (error) {
      console.error("[SW] Failed to sync request:", requestData.url, error);
    }
  }

  // Notify clients of sync completion
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: "SYNC_COMPLETE",
      count: requests.length,
    });
  });
}

// Push notification event
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/engineer",
    },
    actions: data.actions || [],
    tag: data.tag || "default",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/engineer";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url.includes("/engineer") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window if none exists
      return self.clients.openWindow(url);
    })
  );
});

// Message event - handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CACHE_JOBS") {
    // Cache job data for offline access
    cacheJobsForOffline(event.data.jobs);
  }
});

// Cache jobs in IndexedDB for offline access
async function cacheJobsForOffline(jobs) {
  const db = await openOfflineDB();
  const tx = db.transaction("jobs", "readwrite");
  const store = tx.objectStore("jobs");

  // Clear old jobs
  await store.clear();

  // Add new jobs
  for (const job of jobs) {
    await store.put(job);
  }

  console.log("[SW] Cached", jobs.length, "jobs for offline access");
}
