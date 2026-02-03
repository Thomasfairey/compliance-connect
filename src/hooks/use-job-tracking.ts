"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { haversineDistanceMeters } from "@/lib/geo";

export type TrackingStatus =
  | "idle"
  | "traveling"
  | "approaching"
  | "arrived"
  | "working";

interface UseJobTrackingOptions {
  bookingId: string;
  status: string;
  siteLatitude: number | null;
  siteLongitude: number | null;
  onStatusChange: (newStatus: string) => void;
}

interface UseJobTrackingReturn {
  isTracking: boolean;
  trackingStatus: TrackingStatus;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  hasSiteCoords: boolean;
  manualArrive: () => Promise<void>;
  manualStartWork: () => Promise<void>;
  currentDistance: number | null;
  error: string | null;
}

const PROXIMITY_THRESHOLD = 200; // meters
const APPROACHING_THRESHOLD = 500; // meters
const STATIONARY_RADIUS = 30; // meters
const STATIONARY_DURATION = 120_000; // 2 minutes in ms

export function useJobTracking({
  bookingId,
  status,
  siteLatitude,
  siteLongitude,
  onStatusChange,
}: UseJobTrackingOptions): UseJobTrackingReturn {
  const [isTracking, setIsTracking] = useState(
    ["EN_ROUTE", "ON_SITE"].includes(status)
  );
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>(() => {
    if (status === "ON_SITE") return "arrived";
    if (status === "EN_ROUTE") return "traveling";
    return "idle";
  });
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const transitionInFlightRef = useRef(false);
  const statusRef = useRef(status);
  const stationaryStartRef = useRef<number | null>(null);
  const anchorPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const hasSiteCoords = siteLatitude !== null && siteLongitude !== null;

  // Keep status ref in sync
  useEffect(() => {
    statusRef.current = status;
    if (status === "IN_PROGRESS") {
      setTrackingStatus("working");
      stopWatching();
    }
  }, [status]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const callStatusAPI = useCallback(
    async (action: string): Promise<boolean> => {
      if (transitionInFlightRef.current) return false;
      transitionInFlightRef.current = true;

      try {
        const response = await fetch(`/api/engineer/jobs/${bookingId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (!response.ok) {
          const data = await response.json();
          // If wrong status error, the transition already happened
          if (response.status === 400) return false;
          throw new Error(data.error || "Failed to update status");
        }

        const data = await response.json();
        onStatusChange(data.status);
        return true;
      } catch (err) {
        console.error("Tracking API error:", err);
        return false;
      } finally {
        transitionInFlightRef.current = false;
      }
    },
    [bookingId, onStatusChange]
  );

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const handlePosition = useCallback(
    async (position: GeolocationPosition) => {
      const { latitude: engLat, longitude: engLng } = position.coords;

      if (!hasSiteCoords) return;

      const distance = haversineDistanceMeters(
        engLat,
        engLng,
        siteLatitude!,
        siteLongitude!
      );
      setCurrentDistance(Math.round(distance));

      const currentStatus = statusRef.current;

      // EN_ROUTE: check for arrival
      if (currentStatus === "EN_ROUTE") {
        if (distance <= PROXIMITY_THRESHOLD) {
          setTrackingStatus("arrived");
          const success = await callStatusAPI("ARRIVE");
          if (success) {
            // Reset stationary tracking for ON_SITE phase
            anchorPositionRef.current = { lat: engLat, lng: engLng };
            stationaryStartRef.current = Date.now();
          }
        } else if (distance <= APPROACHING_THRESHOLD) {
          setTrackingStatus("approaching");
        } else {
          setTrackingStatus("traveling");
        }
      }

      // ON_SITE: check for stationary (auto-start work)
      if (currentStatus === "ON_SITE") {
        if (!anchorPositionRef.current) {
          anchorPositionRef.current = { lat: engLat, lng: engLng };
          stationaryStartRef.current = Date.now();
          return;
        }

        const driftFromAnchor = haversineDistanceMeters(
          engLat,
          engLng,
          anchorPositionRef.current.lat,
          anchorPositionRef.current.lng
        );

        if (driftFromAnchor > STATIONARY_RADIUS) {
          // Reset — engineer moved
          anchorPositionRef.current = { lat: engLat, lng: engLng };
          stationaryStartRef.current = Date.now();
        } else if (
          stationaryStartRef.current &&
          Date.now() - stationaryStartRef.current >= STATIONARY_DURATION
        ) {
          // Stationary long enough — auto-start work
          setTrackingStatus("working");
          await callStatusAPI("START_WORK");
          stopWatching();
          setIsTracking(false);
        }
      }
    },
    [hasSiteCoords, siteLatitude, siteLongitude, callStatusAPI, stopWatching]
  );

  const handleError = useCallback((posError: GeolocationPositionError) => {
    if (posError.code === posError.PERMISSION_DENIED) {
      setError("Location permission denied — use manual controls");
      stopWatching();
    } else {
      setError("Location unavailable — use manual controls");
    }
  }, [stopWatching]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported — use manual controls");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      }
    );
  }, [handlePosition, handleError]);

  const startTracking = useCallback(async () => {
    setError(null);
    setIsTracking(true);
    setTrackingStatus("traveling");

    // Transition to EN_ROUTE
    const success = await callStatusAPI("START_TRAVEL");
    if (!success) {
      // May already be EN_ROUTE — still start watching
    }

    if (hasSiteCoords) {
      startWatching();
    }
  }, [callStatusAPI, hasSiteCoords, startWatching]);

  const stopTracking = useCallback(() => {
    stopWatching();
    setIsTracking(false);
    setTrackingStatus("idle");
    setCurrentDistance(null);
  }, [stopWatching]);

  const manualArrive = useCallback(async () => {
    const success = await callStatusAPI("ARRIVE");
    if (success) {
      setTrackingStatus("arrived");
    }
  }, [callStatusAPI]);

  const manualStartWork = useCallback(async () => {
    const success = await callStatusAPI("START_WORK");
    if (success) {
      setTrackingStatus("working");
      stopWatching();
      setIsTracking(false);
    }
  }, [callStatusAPI, stopWatching]);

  // Auto-resume tracking if page loads while EN_ROUTE or ON_SITE
  useEffect(() => {
    if (
      (status === "EN_ROUTE" || status === "ON_SITE") &&
      hasSiteCoords &&
      watchIdRef.current === null
    ) {
      startWatching();
    }
  }, [status, hasSiteCoords, startWatching]);

  return {
    isTracking,
    trackingStatus,
    startTracking,
    stopTracking,
    hasSiteCoords,
    manualArrive,
    manualStartWork,
    currentDistance,
    error,
  };
}
