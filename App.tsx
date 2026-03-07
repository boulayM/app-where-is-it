import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { letterImages } from "./src/introAssets";

type SavedCarSpot = {
  id: string;
  latitude: number;
  longitude: number;
  savedAt: string;
  note?: string;
  photoUri?: string;
};

const STORAGE_KEY = "saved_car_spot_v1";
const MAX_CAPTURE_SAMPLES = 4;
const CAPTURE_DELAY_MS = 300;
const TARGET_ACCURACY_METERS = 12;
const EXTRA_SAMPLES_AFTER_TARGET = 1;
const ACCURACY_FILTER_METERS = 30;
const INTRO_MIN_DURATION_MS = 4200;
const INTRO_STAGE2_HOLD_MS = 500;
const INTRO_STAGE3_HOLD_MS = 1100;
const INTRO_STAGGER_MS = 70;

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

function formatDistance(meters: number | null) {
  if (meters === null) return "--";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

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

type IntroLetterLayout = {
  image: number;
  size: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startRotate: number;
  targetRotate: number;
};

function buildIntroLayouts(): IntroLetterLayout[] {
  const { width, height } = Dimensions.get("window");
  const centerX = width / 2;
  const centerY = height / 2;
  const offscreenBase = Math.max(width, height) * 0.92;
  const margin = 18;
  const count = letterImages.length;
  const cols = Math.ceil(Math.sqrt(count * (width / height)));
  const rows = Math.ceil(count / cols);
  const cellW = (width - margin * 2) / cols;
  const cellH = (height - margin * 2) / rows;
  const logoClearW = 260;
  const logoClearH = 220;
  const logoClearRect = {
    left: centerX - logoClearW / 2,
    right: centerX + logoClearW / 2,
    top: centerY - logoClearH / 2,
    bottom: centerY + logoClearH / 2,
  };

  const seeded = (seed: number) => {
    const x = Math.sin(seed * 999.13) * 10000;
    return x - Math.floor(x);
  };

  const allSlots = Array.from({ length: rows * cols }, (_, i) => i);
  const slotsOutsideLogo = allSlots.filter((slot) => {
    const row = Math.floor(slot / cols);
    const col = slot % cols;
    const cellCenterX = margin + cellW * (col + 0.5);
    const cellCenterY = margin + cellH * (row + 0.5);
    return !(
      cellCenterX >= logoClearRect.left &&
      cellCenterX <= logoClearRect.right &&
      cellCenterY >= logoClearRect.top &&
      cellCenterY <= logoClearRect.bottom
    );
  });

  const baseSlots =
    slotsOutsideLogo.length >= count ? slotsOutsideLogo : allSlots;
  const shuffledIndices = [...baseSlots];
  for (let i = shuffledIndices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(seeded(i + 700) * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [
      shuffledIndices[j],
      shuffledIndices[i],
    ];
  }

  return letterImages.map((image, index) => {
    const p1 = seeded(index + 1);
    const p2 = seeded(index + 101);
    const p3 = seeded(index + 201);
    const p4 = seeded(index + 301);
    const p5 = seeded(index + 401);

    const slot = shuffledIndices[index % shuffledIndices.length];
    const row = Math.floor(slot / cols);
    const col = slot % cols;
    const jitterX = (p1 - 0.5) * cellW * 0.45;
    const jitterY = (p2 - 0.5) * cellH * 0.45;
    const targetCenterX = margin + cellW * (col + 0.5) + jitterX;
    const targetCenterY = margin + cellH * (row + 0.5) + jitterY;

    const angle = Math.atan2(targetCenterY - centerY, targetCenterX - centerX);
    const offscreenRadius = offscreenBase + p3 * 160;
    const size = 24 + Math.round(p4 * 30);
    const targetRotate = -25 + p5 * 50;
    const startRotate = targetRotate + (p1 - 0.5) * 220;

    const targetX = Math.max(
      margin,
      Math.min(width - margin - size, targetCenterX - size / 2),
    );
    const targetY = Math.max(
      margin,
      Math.min(height - margin - size, targetCenterY - size / 2),
    );
    const clearPadding = 10;
    const clearRect = {
      left: logoClearRect.left - clearPadding,
      right: logoClearRect.right + clearPadding,
      top: logoClearRect.top - clearPadding,
      bottom: logoClearRect.bottom + clearPadding,
    };
    let finalX = targetX;
    let finalY = targetY;
    const intersectsLogoArea = !(
      finalX + size < clearRect.left ||
      finalX > clearRect.right ||
      finalY + size < clearRect.top ||
      finalY > clearRect.bottom
    );
    if (intersectsLogoArea) {
      const currentCenterX = finalX + size / 2;
      const currentCenterY = finalY + size / 2;
      const dx = currentCenterX - centerX;
      const dy = currentCenterY - centerY;
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx >= 0) {
          finalX = clearRect.right + 4;
        } else {
          finalX = clearRect.left - size - 4;
        }
      } else if (dy >= 0) {
        finalY = clearRect.bottom + 4;
      } else {
        finalY = clearRect.top - size - 4;
      }
      finalX = Math.max(margin, Math.min(width - margin - size, finalX));
      finalY = Math.max(margin, Math.min(height - margin - size, finalY));
    }
    const startX = centerX + Math.cos(angle) * offscreenRadius - size / 2;
    const startY = centerY + Math.sin(angle) * offscreenRadius - size / 2;

    return {
      image,
      size,
      startX,
      startY,
      targetX: finalX,
      targetY: finalY,
      startRotate,
      targetRotate,
    };
  });
}

function IntroOverlay({ onDone }: { onDone: () => void }) {
  const layouts = useMemo(() => buildIntroLayouts(), []);
  const introStartedAt = useRef(Date.now());
  const [showLogo, setShowLogo] = useState(false);
  const letters = useRef(
    layouts.map((layout) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(layout.startRotate),
    })),
  ).current;
  const lettersOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1.12)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    introStartedAt.current = Date.now();
    setShowLogo(false);
    lettersOpacity.setValue(1);
    logoOpacity.setValue(0);
    logoScale.setValue(1.12);
    overlayOpacity.setValue(1);
    letters.forEach((anim, i) => {
      anim.x.setValue(0);
      anim.y.setValue(0);
      anim.opacity.setValue(0);
      anim.rotate.setValue(layouts[i].startRotate);
    });

    const letterDurations = letters.map((_, i) =>
      Math.max(
        980 + (i % 5) * 150,
        1020 + (i % 4) * 160,
        920 + (i % 5) * 130,
        520 + (i % 3) * 100,
      ),
    );
    const maxLetterDuration = Math.max(...letterDurations, 0);
    const fullLettersTimelineMs =
      INTRO_STAGGER_MS * Math.max(letters.length - 1, 0) + maxLetterDuration;

    const letterAnimations = letters.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim.x, {
          toValue: layouts[i].targetX - layouts[i].startX,
          duration: 980 + (i % 5) * 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim.y, {
          toValue: layouts[i].targetY - layouts[i].startY,
          duration: 1020 + (i % 4) * 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotate, {
          toValue: layouts[i].targetRotate,
          duration: 920 + (i % 5) * 130,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 520 + (i % 3) * 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.stagger(INTRO_STAGGER_MS, letterAnimations).start();

    const stage3StartTimeout = setTimeout(() => {
      setShowLogo(true);
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        const elapsed = Date.now() - introStartedAt.current;
        const minRemaining = Math.max(INTRO_MIN_DURATION_MS - elapsed, 0);
        const hold = Math.max(minRemaining, INTRO_STAGE3_HOLD_MS);
        setTimeout(() => {
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 420,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }).start(onDone);
        }, hold);
      });
    }, fullLettersTimelineMs + INTRO_STAGE2_HOLD_MS);

    return () => {
      clearTimeout(stage3StartTimeout);
    };
  }, [
    layouts,
    letters,
    lettersOpacity,
    logoOpacity,
    logoScale,
    overlayOpacity,
    onDone,
  ]);

  return (
    <Animated.View style={[styles.introOverlay, { opacity: overlayOpacity }]}>
      <Animated.View style={styles.introLayer}>
        <Animated.View style={{ opacity: lettersOpacity }}>
          {layouts.map((layout, i) => {
            const rotation = letters[i].rotate.interpolate({
              inputRange: [-180, 180],
              outputRange: ["-180deg", "180deg"],
            });

            return (
              <Animated.Image
                key={`${i}-${layout.size}`}
                source={layout.image}
                resizeMode="contain"
                style={{
                  position: "absolute",
                  width: layout.size,
                  height: layout.size,
                  left: layout.startX,
                  top: layout.startY,
                  opacity: letters[i].opacity,
                  transform: [
                    { translateX: letters[i].x },
                    { translateY: letters[i].y },
                    { rotate: rotation },
                  ],
                }}
              />
            );
          })}
        </Animated.View>

        {showLogo ? (
          <Animated.Image
            source={require("./assets/where-is-it-logo-center.png")}
            resizeMode="contain"
            style={[
              styles.introLogo,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          />
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [savedSpots, setSavedSpots] = useState<SavedCarSpot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [savingSpot, setSavingSpot] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    void boot();
  }, []);

  async function boot() {
    try {
      setLoading(true);

      const [savedRaw, fgPermissions] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        Location.requestForegroundPermissionsAsync(),
      ]);

      setPermissionStatus(fgPermissions.status);

      if (savedRaw) {
        const parsed = JSON.parse(savedRaw) as SavedCarSpot | SavedCarSpot[];
        const normalized = (Array.isArray(parsed) ? parsed : [parsed]).map(
          (spot) => ({
            ...spot,
            id: spot.id ?? createSpotId(),
          }),
        );
        setSavedSpots(normalized);
        setSelectedSpotId(null);
        setNote("");
        setPhotoUri(null);
      }

      if (fgPermissions.status !== "granted") {
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentLocation(current.coords);
    } catch (error) {
      Alert.alert(
        "Erreur",
        "Impossible de charger les donnees de localisation.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshCurrentLocation() {
    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(current.coords);
    } catch {
      Alert.alert("Erreur", "Impossible de recuperer votre position actuelle.");
    }
  }

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
      weighted.weight > 0
        ? weighted.lon / weighted.weight
        : ranked[0].longitude;

    return {
      ...best,
      latitude: centerLat,
      longitude: centerLon,
    };
  }

  async function saveCarSpot() {
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
        latitude: current.latitude,
        longitude: current.longitude,
        savedAt: new Date().toISOString(),
        note: note.trim() || undefined,
        photoUri: photoUri ?? undefined,
      };

      const updatedSpots = [spot, ...savedSpots];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSpots));
      setSavedSpots(updatedSpots);
      setSelectedSpotId(spot.id);
      setCurrentLocation(current);
      setNote("");
      setPhotoUri(null);
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

  const selectedSpot = useMemo(
    () => savedSpots.find((spot) => spot.id === selectedSpotId) ?? null,
    [savedSpots, selectedSpotId],
  );

  async function deleteSelectedSpot() {
    if (!selectedSpot) return;

    if (selectedSpot.photoUri) {
      await FileSystem.deleteAsync(selectedSpot.photoUri, {
        idempotent: true,
      }).catch(() => undefined);
    }

    const next = savedSpots.filter((spot) => spot.id !== selectedSpot.id);
    if (next.length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSavedSpots([]);
      setSelectedSpotId(null);
      setNote("");
      setPhotoUri(null);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedSpots(next);
    setSelectedSpotId(null);
    setNote("");
    setPhotoUri(null);
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
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSavedSpots([]);
    setSelectedSpotId(null);
    setNote("");
    setPhotoUri(null);
  }

  async function persistPhotoUri(nextPhotoUri: string | null) {
    if (!selectedSpot) {
      setPhotoUri(nextPhotoUri);
      return;
    }

    const updatedSpot: SavedCarSpot = {
      ...selectedSpot,
      note: note.trim() || undefined,
      photoUri: nextPhotoUri ?? undefined,
    };
    const next = savedSpots.map((spot) =>
      spot.id === updatedSpot.id ? updatedSpot : spot,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedSpots(next);
  }

  async function takeReferencePhoto() {
    try {
      let granted = cameraPermission?.granted ?? false;
      if (!granted) {
        const requested = await requestCameraPermission();
        granted = requested.granted;
      }

      if (!granted) {
        Alert.alert(
          "Permission requise",
          "Autorise la camera pour enregistrer une photo de l'emplacement.",
        );
        return;
      }
      setCameraOpen(true);
    } catch {
      Alert.alert("Erreur", "Impossible de prendre une photo.");
    }
  }

  async function capturePhotoFromCamera() {
    if (!cameraRef.current || capturingPhoto) {
      return;
    }

    try {
      setCapturingPhoto(true);
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.75,
      });

      if (!captured?.uri) {
        Alert.alert("Erreur", "La photo n a pas pu etre recuperee.");
        return;
      }

      await persistPhotoUri(captured.uri);
      setCameraOpen(false);
    } catch {
      Alert.alert("Erreur", "Capture photo impossible.");
    } finally {
      setCapturingPhoto(false);
    }
  }

  async function removeReferencePhoto() {
    const targetPhotoUri = selectedSpot?.photoUri ?? photoUri;
    if (targetPhotoUri) {
      await FileSystem.deleteAsync(targetPhotoUri, { idempotent: true }).catch(
        () => undefined,
      );
    }
    await persistPhotoUri(null);
  }

  async function openInMaps() {
    if (!selectedSpot) return;

    const { latitude, longitude } = selectedSpot;
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Erreur", "Impossible d'ouvrir l'application de navigation.");
      return;
    }

    await Linking.openURL(url);
  }

  async function openExternal(url: string, fallbackMessage: string) {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Erreur", fallbackMessage);
      return;
    }
    await Linking.openURL(url);
  }

  const distanceToCar = useMemo(() => {
    if (!selectedSpot || !currentLocation) return null;
    return distanceInMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      selectedSpot.latitude,
      selectedSpot.longitude,
    );
  }, [selectedSpot, currentLocation]);

  const mapRegion = useMemo(() => {
    if (selectedSpot) {
      return {
        latitude: selectedSpot.latitude,
        longitude: selectedSpot.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }

    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };
    }

    return {
      latitude: 48.8566,
      longitude: 2.3522,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [selectedSpot, currentLocation]);

  if (showIntro) {
    return <IntroOverlay onDone={() => setShowIntro(false)} />;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={styles.loadingText}>Initialisation...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 12) + 20 },
        ]}
      >
        <Image
          source={require("./assets/car-logo-horizontal.png")}
          resizeMode="contain"
          style={styles.headerLogo}
        />

        <View style={styles.card}>
          <View style={styles.modeRow}>
            <Text style={styles.cardTitle}>Afficher la carte</Text>
            <Switch value={showMap} onValueChange={setShowMap} />
          </View>
          <Text style={styles.infoLine}>
            Mode sans carte: tu gardes la distance, les coordonnees et le
            guidage.
          </Text>
        </View>

        {showMap ? (
          <MapView
            style={styles.map}
            initialRegion={mapRegion}
            region={mapRegion}
          >
            {currentLocation ? (
              <Marker
                coordinate={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                title="Vous"
                pinColor="#2563eb"
              />
            ) : null}

            {selectedSpot ? (
              <Marker
                coordinate={{
                  latitude: selectedSpot.latitude,
                  longitude: selectedSpot.longitude,
                }}
                title="Emplacement"
                description={selectedSpot.note || "Position enregistree"}
                pinColor="#dc2626"
              />
            ) : null}
          </MapView>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Infos</Text>
          <Text style={styles.infoLine}>
            Distance: {formatDistance(distanceToCar)}
          </Text>
          <Text style={styles.infoLine}>
            Enregistre le:{" "}
            {selectedSpot
              ? new Date(selectedSpot.savedAt).toLocaleString()
              : "--"}
          </Text>
          <Text style={styles.infoLine}>
            Position enregistree:{" "}
            {selectedSpot
              ? `${selectedSpot.latitude.toFixed(6)}, ${selectedSpot.longitude.toFixed(6)}`
              : "--"}
          </Text>
          <Text style={styles.infoLine}>
            Ma position:{" "}
            {currentLocation
              ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
              : "--"}
          </Text>
          <Text style={styles.infoLine}>
            Precision GPS actuelle:{" "}
            {currentLocation?.accuracy
              ? `~${Math.round(currentLocation.accuracy)} m`
              : "--"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Emplacements enregistres ({savedSpots.length})
          </Text>
          {savedSpots.length === 0 ? (
            <Text style={styles.infoLine}>Aucun emplacement enregistre.</Text>
          ) : (
            savedSpots.map((spot, index) => (
              <View key={spot.id} style={styles.spotRow}>
                <Pressable
                  style={styles.spotMain}
                  onPress={() => {
                    setSelectedSpotId(spot.id);
                  }}
                >
                  <Text
                    style={[
                      styles.spotTitle,
                      selectedSpotId === spot.id && styles.spotTitleActive,
                    ]}
                  >
                    {`#${savedSpots.length - index} - ${new Date(spot.savedAt).toLocaleString()}`}
                  </Text>
                  <Text style={styles.spotMeta}>
                    {spot.note ? spot.note : "Sans note"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.rowDelete]}
                  onPress={async () => {
                    if (spot.photoUri) {
                      await FileSystem.deleteAsync(spot.photoUri, {
                        idempotent: true,
                      }).catch(() => undefined);
                    }
                    const next = savedSpots.filter(
                      (item) => item.id !== spot.id,
                    );
                    if (next.length === 0) {
                      await AsyncStorage.removeItem(STORAGE_KEY);
                      setSavedSpots([]);
                      setSelectedSpotId(null);
                      setNote("");
                      setPhotoUri(null);
                      return;
                    }
                    await AsyncStorage.setItem(
                      STORAGE_KEY,
                      JSON.stringify(next),
                    );
                    setSavedSpots(next);
                    if (selectedSpotId === spot.id) {
                      setSelectedSpotId(null);
                    }
                  }}
                >
                  <Text style={styles.rowDeleteText}>Effacer</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Note emplacement (etage, zone, repere)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Niveau -2, rangee B, place 27"
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Photo de reference</Text>
          {selectedSpot?.photoUri || photoUri ? (
            <Image
              source={{ uri: selectedSpot?.photoUri ?? photoUri ?? undefined }}
              style={styles.spotPhoto}
            />
          ) : (
            <Text style={styles.infoLine}>Aucune photo enregistree.</Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[
              styles.button,
              styles.primary,
              savingSpot && styles.disabledButton,
            ]}
            onPress={saveCarSpot}
            disabled={savingSpot}
          >
            <Text style={styles.buttonText}>
              {savingSpot ? "Enregistrement GPS..." : "Nouvel emplacement"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.secondary]}
            onPress={refreshCurrentLocation}
          >
            <Text style={styles.buttonText}>Actualiser ma position</Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.success,
              !selectedSpot && styles.disabledButton,
            ]}
            onPress={openInMaps}
            disabled={!selectedSpot}
          >
            <Text style={styles.buttonText}>Y aller (Maps)</Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.danger,
              !selectedSpot && styles.disabledButton,
            ]}
            onPress={deleteSelectedSpot}
            disabled={!selectedSpot}
          >
            <Text style={styles.buttonText}>Effacer l'emplacement actif</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.photo]}
            onPress={takeReferencePhoto}
          >
            <Text style={styles.buttonText}>
              {selectedSpot?.photoUri || photoUri
                ? "Modifier la photo"
                : "Prendre une photo"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.secondary,
              !(selectedSpot?.photoUri || photoUri) && styles.disabledButton,
            ]}
            onPress={removeReferencePhoto}
            disabled={!(selectedSpot?.photoUri || photoUri)}
          >
            <Text style={styles.buttonText}>Supprimer la photo</Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.danger,
              savedSpots.length === 0 && styles.disabledButton,
            ]}
            onPress={deleteAllSpots}
            disabled={savedSpots.length === 0}
          >
            <Text style={styles.buttonText}>Tout effacer</Text>
          </Pressable>
        </View>

        {permissionStatus !== "granted" ? (
          <Text style={styles.warning}>
            La permission de localisation n'est pas accordee. Active-la dans les
            reglages du telephone.
          </Text>
        ) : null}

        {captureStatus ? (
          <Text style={styles.captureStatus}>{captureStatus}</Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Application creee par Marc Boulay
          </Text>
          <Text style={styles.footerText}>Developpeur Web</Text>
          <Pressable
            onPress={() =>
              openExternal(
                "https://mabdev.onrender.com",
                "Impossible d ouvrir le site.",
              )
            }
          >
            <Text style={styles.footerLink}>https://mabdev.onrender.com</Text>
          </Pressable>
          <Text style={styles.footerText}>Siret: 92866412700034</Text>
          <Pressable
            onPress={() =>
              openExternal(
                "mailto:macboulay2@gmail.com",
                "Impossible d ouvrir le client email.",
              )
            }
          >
            <Text style={styles.footerLink}>
              Contact : macboulay2@gmail.com
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={cameraOpen}
        animationType="slide"
        onRequestClose={() => setCameraOpen(false)}
      >
        <SafeAreaView
          style={styles.cameraSafe}
          edges={["top", "left", "right", "bottom"]}
        >
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing="back"
          />
          <View style={styles.cameraActions}>
            <Pressable
              style={[styles.button, styles.danger, styles.cameraButton]}
              onPress={() => setCameraOpen(false)}
            >
              <Text style={styles.buttonText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.photo,
                styles.cameraButton,
                capturingPhoto && styles.disabledButton,
              ]}
              onPress={capturePhotoFromCamera}
              disabled={capturingPhoto}
            >
              <Text style={styles.buttonText}>
                {capturingPhoto ? "Capture..." : "Capturer"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  introOverlay: {
    flex: 1,
    backgroundColor: "#ececec",
  },
  introLayer: {
    flex: 1,
  },
  introLogo: {
    position: "absolute",
    width: 220,
    height: 220,
    left: "50%",
    top: "50%",
    marginLeft: -110,
    marginTop: -110,
  },
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 10,
    color: "#334155",
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  headerLogo: {
    width: "100%",
    height: 74,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 6,
  },
  map: {
    width: "100%",
    height: 320,
    borderRadius: 12,
    overflow: "hidden",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  spotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  spotMain: {
    flex: 1,
    gap: 2,
  },
  spotTitle: {
    color: "#1e293b",
    fontSize: 13,
    fontWeight: "500",
  },
  spotTitleActive: {
    color: "#0d9488",
    fontWeight: "700",
  },
  spotMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  rowDelete: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rowDeleteText: {
    color: "#b91c1c",
    fontWeight: "600",
    fontSize: 12,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLine: {
    color: "#334155",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  actions: {
    gap: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primary: {
    backgroundColor: "#0d9488",
  },
  secondary: {
    backgroundColor: "#1d4ed8",
  },
  success: {
    backgroundColor: "#15803d",
  },
  danger: {
    backgroundColor: "#b91c1c",
  },
  photo: {
    backgroundColor: "#ca8a04",
  },
  disabledButton: {
    opacity: 0.5,
  },
  spotPhoto: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },
  cameraSafe: {
    flex: 1,
    backgroundColor: "#020617",
  },
  cameraPreview: {
    flex: 1,
  },
  cameraActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#0f172a",
  },
  cameraButton: {
    flex: 1,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  warning: {
    color: "#991b1b",
    fontSize: 13,
  },
  captureStatus: {
    color: "#0f172a",
    fontSize: 13,
  },
  footer: {
    marginTop: 10,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#000000",
    gap: 4,
    alignItems: "center",
  },
  footerText: {
    color: "#ffffff",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  footerLink: {
    color: "#ffffff",
    fontSize: 14,
    textDecorationLine: "underline",
    textAlign: "center",
    lineHeight: 22,
  },
});
