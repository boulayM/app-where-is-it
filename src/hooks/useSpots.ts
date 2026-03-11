import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { Alert, Platform } from "react-native";
import { useCallback, useMemo, useState } from "react";
import type { SavedCarSpot } from "../types/spots";

const STORAGE_KEY = "saved_car_spot_v1";
const MAX_CAPTURE_SAMPLES = 4;
const CAPTURE_DELAY_MS = 300;
const TARGET_ACCURACY_METERS = 12;
const EXTRA_SAMPLES_AFTER_TARGET = 1;
const ACCURACY_FILTER_METERS = 30;

type UseSpotsParams = {
  permissionStatus: Location.PermissionStatus | null;
  onSpotActivated: (
    spot: SavedCarSpot,
    current: Location.LocationObjectCoords,
  ) => void;
  onSelectionRemoved: () => void;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAccuracyWeight(accuracy: number | null | undefined) {
  if (!accuracy || !Number.isFinite(accuracy) || accuracy <= 0) {
    return 1;
  }
  return 1 / Math.pow(Math.max(accuracy, 1), 2);
}

function createSpotId() {
  return `spot_${Date.now()}_${Math.round(Math.random() * 1_000_000)}`;
}

export function useSpots({
  permissionStatus,
  onSpotActivated,
  onSelectionRemoved,
}: UseSpotsParams) {
  const [savedSpots, setSavedSpots] = useState<SavedCarSpot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [savingSpot, setSavingSpot] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPhotoUri, setCreatePhotoUri] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSpotId, setEditSpotId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);

  const selectedSpot = useMemo(
    () => savedSpots.find((spot) => spot.id === selectedSpotId) ?? null,
    [savedSpots, selectedSpotId],
  );

  async function persistSpots(nextSpots: SavedCarSpot[]) {
    if (nextSpots.length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSpots));
  }

  const initializeSpots = useCallback((savedRaw: string | null) => {
    if (!savedRaw) {
      setSavedSpots([]);
      setSelectedSpotId(null);
      return;
    }

    const parsed = JSON.parse(savedRaw) as SavedCarSpot | SavedCarSpot[];
    const normalized = (Array.isArray(parsed) ? parsed : [parsed]).map(
      (spot, index) => ({
        ...spot,
        id: spot.id ?? createSpotId(),
        name:
          (spot as SavedCarSpot & { name?: string }).name ??
          `Emplacement ${index + 1}`,
        description:
          (spot as SavedCarSpot & { description?: string; note?: string })
            .description ?? (spot as SavedCarSpot & { note?: string }).note,
      }),
    );

    setSavedSpots(normalized);
    setSelectedSpotId(null);
  }, []);

  async function captureSmartLocation() {
    let best: Location.LocationObjectCoords | null = null;
    const samples: Location.LocationObjectCoords[] = [];
    let reachedTargetAt: number | null = null;

    await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    for (let i = 0; i < MAX_CAPTURE_SAMPLES; i += 1) {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      samples.push(current.coords);

      const currentAccuracy =
        current.coords.accuracy ?? Number.POSITIVE_INFINITY;
      const bestAccuracy = best?.accuracy ?? Number.POSITIVE_INFINITY;
      if (currentAccuracy < bestAccuracy) {
        best = current.coords;
      }

      const trackedCurrent = Number.isFinite(currentAccuracy)
        ? Math.round(currentAccuracy)
        : "?";
      const trackedBest = best?.accuracy ? Math.round(best.accuracy) : "?";
      setCaptureStatus(
        `Mesure ${i + 1}/${MAX_CAPTURE_SAMPLES} | Actuelle: ${trackedCurrent} m | Meilleure: ${trackedBest} m`,
      );

      if (
        currentAccuracy <= TARGET_ACCURACY_METERS &&
        reachedTargetAt === null
      ) {
        reachedTargetAt = i;
      }

      if (
        reachedTargetAt !== null &&
        i - reachedTargetAt >= EXTRA_SAMPLES_AFTER_TARGET
      ) {
        break;
      }

      if (i < MAX_CAPTURE_SAMPLES - 1) {
        await sleep(CAPTURE_DELAY_MS);
      }
    }

    if (!best) {
      throw new Error("No sample");
    }

    const ranked = [...samples].sort(
      (a, b) => (a.accuracy ?? 9999) - (b.accuracy ?? 9999),
    );
    const filtered = ranked.filter(
      (point) =>
        (point.accuracy ?? Number.POSITIVE_INFINITY) <= ACCURACY_FILTER_METERS,
    );
    const selected =
      filtered.length >= 2
        ? filtered
        : ranked.slice(0, Math.min(4, ranked.length));

    const weighted = selected.reduce(
      (acc, point) => {
        const weight = getAccuracyWeight(point.accuracy);
        return {
          lat: acc.lat + point.latitude * weight,
          lon: acc.lon + point.longitude * weight,
          weight: acc.weight + weight,
        };
      },
      { lat: 0, lon: 0, weight: 0 },
    );

    const centerLat =
      weighted.weight > 0 ? weighted.lat / weighted.weight : ranked[0].latitude;
    const centerLon =
      weighted.weight > 0 ? weighted.lon / weighted.weight : ranked[0].longitude;

    return {
      ...best,
      latitude: centerLat,
      longitude: centerLon,
    };
  }

  function openCreateSpotModal() {
    setCreateName("");
    setCreateDescription("");
    setCreatePhotoUri(null);
    setShowCreateModal(true);
  }

  function openEditSpotModal(spot: SavedCarSpot) {
    setEditSpotId(spot.id);
    setEditName(spot.name);
    setEditDescription(spot.description ?? "");
    setEditPhotoUri(spot.photoUri ?? null);
    setShowEditModal(true);
  }

  async function saveNewSpot() {
    const name = createName.trim();
    if (!name) {
      Alert.alert("Nom requis", "Le nom de l emplacement est obligatoire.");
      return;
    }

    if (permissionStatus !== "granted") {
      Alert.alert(
        "Permission requise",
        "Active la localisation pour enregistrer votre emplacement.",
      );
      return;
    }

    try {
      setSavingSpot(true);
      setCaptureStatus("Preparation GPS haute precision...");

      if (Platform.OS === "android") {
        await Location.enableNetworkProviderAsync().catch(() => undefined);
      }

      setCaptureStatus("Acquisition GPS en haute precision...");
      const current = await captureSmartLocation();

      const spot: SavedCarSpot = {
        id: createSpotId(),
        name,
        latitude: current.latitude,
        longitude: current.longitude,
        savedAt: new Date().toISOString(),
        description: createDescription.trim() || undefined,
        photoUri: createPhotoUri ?? undefined,
      };

      const updatedSpots = [spot, ...savedSpots];
      await persistSpots(updatedSpots);
      setSavedSpots(updatedSpots);
      setShowCreateModal(false);
      setCreateName("");
      setCreateDescription("");
      setCreatePhotoUri(null);
      onSpotActivated(spot, current);
      const quality = current.accuracy
        ? `Precision estimee: ~${Math.round(current.accuracy)} m`
        : "Precision non disponible";
      Alert.alert("OK", `Position enregistree.\n${quality}`);
    } catch {
      Alert.alert("Erreur", "Impossible d'enregistrer la position.");
    } finally {
      setSavingSpot(false);
      setCaptureStatus(null);
    }
  }

  async function saveEditedSpot() {
    if (!editSpotId) return;
    const name = editName.trim();
    if (!name) {
      Alert.alert("Nom requis", "Le nom de l emplacement est obligatoire.");
      return;
    }

    const original = savedSpots.find((spot) => spot.id === editSpotId);
    if (!original) return;

    if (original.photoUri && editPhotoUri !== original.photoUri) {
      await FileSystem.deleteAsync(original.photoUri, { idempotent: true }).catch(
        () => undefined,
      );
    }

    const next = savedSpots.map((spot) =>
      spot.id === editSpotId
        ? {
            ...spot,
            name,
            description: editDescription.trim() || undefined,
            photoUri: editPhotoUri ?? undefined,
          }
        : spot,
    );
    await persistSpots(next);
    setSavedSpots(next);
    setShowEditModal(false);
    setEditSpotId(null);
  }

  async function deleteSpotById(spot: SavedCarSpot) {
    if (spot.photoUri) {
      await FileSystem.deleteAsync(spot.photoUri, { idempotent: true }).catch(
        () => undefined,
      );
    }
    const next = savedSpots.filter((item) => item.id !== spot.id);
    await persistSpots(next);
    setSavedSpots(next);
    if (selectedSpotId === spot.id) {
      setSelectedSpotId(null);
      onSelectionRemoved();
    }
  }

  async function deleteAllSpots() {
    await Promise.all(
      savedSpots.map(async (spot) => {
        if (!spot.photoUri) return;
        await FileSystem.deleteAsync(spot.photoUri, {
          idempotent: true,
        }).catch(() => undefined);
      }),
    );
    await persistSpots([]);
    setSavedSpots([]);
    setSelectedSpotId(null);
    onSelectionRemoved();
  }

  async function removePhotoForCreate() {
    if (!createPhotoUri) return;
    await FileSystem.deleteAsync(createPhotoUri, { idempotent: true }).catch(
      () => undefined,
    );
    setCreatePhotoUri(null);
  }

  async function removePhotoForEdit() {
    const targetPhotoUri = editPhotoUri;
    if (targetPhotoUri) {
      await FileSystem.deleteAsync(targetPhotoUri, { idempotent: true }).catch(
        () => undefined,
      );
    }
    setEditPhotoUri(null);
  }

  return {
    savedSpots,
    selectedSpotId,
    selectedSpot,
    setSelectedSpotId,
    initializeSpots,
    savingSpot,
    showCreateModal,
    setShowCreateModal,
    createName,
    setCreateName,
    createDescription,
    setCreateDescription,
    createPhotoUri,
    setCreatePhotoUri,
    showEditModal,
    setShowEditModal,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    editPhotoUri,
    setEditPhotoUri,
    captureStatus,
    openCreateSpotModal,
    openEditSpotModal,
    saveNewSpot,
    saveEditedSpot,
    deleteSpotById,
    deleteAllSpots,
    removePhotoForCreate,
    removePhotoForEdit,
  };
}
