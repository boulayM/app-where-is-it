import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import type { SavedCarSpot } from "../types/spots";

type UseGuidanceParams = {
  guidanceEnabled: boolean;
  isActiveScreen: boolean;
  selectedSpot: SavedCarSpot | null;
  showMap: boolean;
  currentLocation: Location.LocationObjectCoords | null;
  setCurrentLocation: (coords: Location.LocationObjectCoords) => void;
};

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function bearingInDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const lambdaDiff = toRad(lon2 - lon1);
  const y = Math.sin(lambdaDiff) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambdaDiff);
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  return normalizeDegrees(angle);
}

export function useGuidance({
  guidanceEnabled,
  isActiveScreen,
  selectedSpot,
  showMap,
  currentLocation,
  setCurrentLocation,
}: UseGuidanceParams) {
  const [heading, setHeading] = useState<number | null>(null);

  const distanceToSpot = useMemo(() => {
    if (!selectedSpot || !currentLocation) return null;
    return distanceInMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      selectedSpot.latitude,
      selectedSpot.longitude,
    );
  }, [selectedSpot, currentLocation]);

  const targetBearing = useMemo(() => {
    if (!selectedSpot || !currentLocation) return null;
    return bearingInDegrees(
      currentLocation.latitude,
      currentLocation.longitude,
      selectedSpot.latitude,
      selectedSpot.longitude,
    );
  }, [selectedSpot, currentLocation]);

  const turnAngle = useMemo(() => {
    if (targetBearing === null || heading === null) return null;
    const raw = normalizeDegrees(targetBearing - heading);
    return raw > 180 ? raw - 360 : raw;
  }, [targetBearing, heading]);

  useEffect(() => {
    if (!guidanceEnabled || !isActiveScreen || !selectedSpot || showMap) {
      return;
    }

    let headingSub: Location.LocationSubscription | null = null;
    let positionSub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        headingSub = await Location.watchHeadingAsync((result) => {
          if (cancelled) return;
          const nextHeading = Number.isFinite(result.trueHeading)
            ? result.trueHeading
            : result.magHeading;
          setHeading(nextHeading ?? null);
        });
      } catch {
        setHeading(null);
      }

      try {
        positionSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 1,
            timeInterval: 1500,
          },
          (loc) => {
            if (cancelled) return;
            setCurrentLocation(loc.coords);
          },
        );
      } catch {
        // noop: fallback to last known location
      }
    })();

    return () => {
      cancelled = true;
      headingSub?.remove();
      positionSub?.remove();
    };
  }, [
    guidanceEnabled,
    isActiveScreen,
    selectedSpot,
    showMap,
    setCurrentLocation,
  ]);

  return { distanceToSpot, targetBearing, turnAngle, heading };
}
