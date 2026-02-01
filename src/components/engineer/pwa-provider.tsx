"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { registerServiceWorker, isOnline, getPendingRequestCount } from "@/lib/offline";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Download, WifiOff, Check } from "lucide-react";

interface PWAContextValue {
  isOnline: boolean;
  pendingSyncCount: number;
  updateAvailable: boolean;
  isInstallable: boolean;
  installApp: () => Promise<void>;
  updateApp: () => void;
}

const PWAContext = createContext<PWAContextValue | null>(null);

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWA must be used within PWAProvider");
  }
  return context;
}

interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [online, setOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);

  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Check initial online state
    setOnline(isOnline());

    // Online/offline handlers
    const handleOnline = () => {
      setOnline(true);
      setShowOfflineBanner(false);
      // Trigger sync check
      updatePendingCount();
    };

    const handleOffline = () => {
      setOnline(false);
      setShowOfflineBanner(true);
    };

    // Update available handler
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
      setShowUpdateBanner(true);
    };

    // Sync complete handler
    const handleSyncComplete = (event: CustomEvent) => {
      const { count } = event.detail;
      if (count > 0) {
        setSyncedCount(count);
        setShowSyncBanner(true);
        setTimeout(() => setShowSyncBanner(false), 5000);
      }
      updatePendingCount();
    };

    // Install prompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("sw-update-available", handleUpdateAvailable);
    window.addEventListener("offline-sync-complete", handleSyncComplete as EventListener);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Initial pending count
    updatePendingCount();

    // Poll for pending count
    const interval = setInterval(updatePendingCount, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("sw-update-available", handleUpdateAvailable);
      window.removeEventListener("offline-sync-complete", handleSyncComplete as EventListener);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    const count = await getPendingRequestCount();
    setPendingSyncCount(count);
  };

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstallable(false);
    }

    setDeferredPrompt(null);
  };

  const updateApp = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      });
    }
    window.location.reload();
  };

  const value: PWAContextValue = {
    isOnline: online,
    pendingSyncCount,
    updateAvailable,
    isInstallable,
    installApp,
    updateApp,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}

      {/* Update Available Banner */}
      {showUpdateBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">New version available</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                onClick={updateApp}
              >
                Update
              </Button>
              <button
                onClick={() => setShowUpdateBanner(false)}
                className="p-1 hover:bg-blue-500 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2">
          <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm">You're offline</span>
            {pendingSyncCount > 0 && (
              <span className="text-xs bg-amber-600 px-2 py-0.5 rounded-full">
                {pendingSyncCount} pending
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sync Complete Banner */}
      {showSyncBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-2">
          <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
            <Check className="w-4 h-4" />
            <span className="text-sm">
              Synced {syncedCount} action{syncedCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Install Prompt (shown in profile) */}
    </PWAContext.Provider>
  );
}

// Install Prompt Component for use in Profile page
export function InstallPrompt() {
  const { isInstallable, installApp } = usePWA();

  if (!isInstallable) return null;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">Install App</h3>
          <p className="text-sm text-blue-100 mt-1">
            Add to your home screen for quick access and offline support.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={installApp}
          >
            Install Now
          </Button>
        </div>
      </div>
    </div>
  );
}
