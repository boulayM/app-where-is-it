import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AppFooter } from "./src/components/AppFooter";
import { AppMenu } from "./src/components/AppMenu";
import { IntroOverlay } from "./src/components/intro/IntroOverlay";
import { CameraCaptureModal } from "./src/components/modals/CameraCaptureModal";
import { CreateSpotModal } from "./src/components/modals/CreateSpotModal";
import { EditSpotModal } from "./src/components/modals/EditSpotModal";
import { ActiveScreen } from "./src/components/screens/ActiveScreen";
import { AboutScreen } from "./src/components/screens/AboutScreen";
import { HomeScreen } from "./src/components/screens/HomeScreen";
import { LegalScreen } from "./src/components/screens/LegalScreen";
import { useGuidance } from "./src/hooks/useGuidance";
import { useSpotCamera } from "./src/hooks/useSpotCamera";
import { useSpots } from "./src/hooks/useSpots";

const INTRO_SKIP_KEY = "intro_skip_v1";
const APP_SHARE_URL = "https://mabdev.onrender.com";

function formatDistance(meters: number | null) {
  if (meters === null) return "--";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [screen, setScreen] = useState<"home" | "active" | "about" | "legal">("home");
  const [showMenu, setShowMenu] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [guidanceEnabled, setGuidanceEnabled] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [introPreferenceReady, setIntroPreferenceReady] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);
  const {
    savedSpots,
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
  } = useSpots({
    permissionStatus,
    onSpotActivated: (spot, current) => {
      setSelectedSpotId(spot.id);
      setShowMap(false);
      setGuidanceEnabled(false);
      setScreen("active");
      setCurrentLocation(current);
    },
    onSelectionRemoved: () => {
      setGuidanceEnabled(false);
      setScreen("home");
    },
  });
  const {
    cameraRef,
    cameraOpen,
    capturingPhoto,
    openCameraForTarget,
    closeCamera,
    capturePhoto,
  } = useSpotCamera({
    onPhotoCaptured: (target, uri) => {
      if (target === "create") {
        setCreatePhotoUri(uri);
      } else {
        setEditPhotoUri(uri);
      }
    },
  });

  useEffect(() => {
    void loadIntroPreference();
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (mounted) {
          setLoading(true);
        }

        const [savedRaw, fgPermissions] = await Promise.all([
          AsyncStorage.getItem("saved_car_spot_v1"),
          Location.requestForegroundPermissionsAsync(),
        ]);

        if (!mounted) return;
        setPermissionStatus(fgPermissions.status);
        initializeSpots(savedRaw);

        if (fgPermissions.status !== "granted") {
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted) return;
        setCurrentLocation(current.coords);
      } catch {
        if (!mounted) return;
        Alert.alert("Erreur", "Impossible de charger les données de localisation.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [initializeSpots]);

  async function loadIntroPreference() {
    try {
      const skipIntro = await AsyncStorage.getItem(INTRO_SKIP_KEY);
      setShowIntro(skipIntro !== "1");
    } finally {
      setIntroPreferenceReady(true);
    }
  }

  async function handleIntroContinue(disableForNextLaunches: boolean) {
    if (disableForNextLaunches) {
      await AsyncStorage.setItem(INTRO_SKIP_KEY, "1");
    }
    setShowIntro(false);
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

  async function shareSpot() {
    if (!selectedSpot) return;
    const mapsUrl =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${selectedSpot.latitude},${selectedSpot.longitude}`
        : `https://www.google.com/maps/dir/?api=1&destination=${selectedSpot.latitude},${selectedSpot.longitude}`;
    const message = [
      `Emplacement: ${selectedSpot.name}`,
      selectedSpot.description ? `Description: ${selectedSpot.description}` : null,
      `Coordonnées: ${selectedSpot.latitude.toFixed(6)}, ${selectedSpot.longitude.toFixed(6)}`,
      `Navigation: ${mapsUrl}`,
    ]
      .filter(Boolean)
      .join("\n");
    await Share.share({ message });
  }

  async function shareAppLink() {
    await Share.share({
      message: `Découvrez WHERE IS IT ?\n${APP_SHARE_URL}`,
    });
  }

  const {
    distanceToSpot: distanceToCar,
    targetBearing,
    turnAngle,
  } = useGuidance({
    guidanceEnabled,
    isActiveScreen: screen === "active",
    selectedSpot,
    showMap,
    currentLocation,
    setCurrentLocation,
  });

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

  if (!introPreferenceReady) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0d9488" />
      </SafeAreaView>
    );
  }

  if (showIntro) {
    return <IntroOverlay onContinue={handleIntroContinue} />;
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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 12) + 20 },
        ]}
      >
        <View style={styles.headerBar}>
          <Image
            source={require("./assets/car-logo-horizontal.png")}
            resizeMode="contain"
            style={styles.headerLogo}
          />
          <Pressable style={styles.burgerButton} onPress={() => setShowMenu(true)}>
            <Text style={styles.burgerText}>☰</Text>
          </Pressable>
        </View>

        {screen === "home" ? (
          <HomeScreen
            styles={styles}
            savedSpots={savedSpots}
            onSelectSpot={(spot) => {
              setSelectedSpotId(spot.id);
              setShowMap(false);
              setGuidanceEnabled(false);
              setScreen("active");
            }}
            onEditSpot={openEditSpotModal}
            onDeleteSpot={deleteSpotById}
            onCreateSpot={openCreateSpotModal}
            onDeleteAll={deleteAllSpots}
          />
        ) : screen === "active" ? (
          <ActiveScreen
            styles={styles}
            selectedSpot={selectedSpot}
            currentLocation={currentLocation}
            showMap={showMap}
            guidanceEnabled={guidanceEnabled}
            turnAngle={turnAngle}
            targetBearing={targetBearing}
            distanceToSpot={distanceToCar}
            mapRegion={mapRegion}
            formatDistance={formatDistance}
            onToggleShowMap={(value) => {
              setShowMap(value);
              if (value) setGuidanceEnabled(false);
            }}
            onToggleGuidance={() => setGuidanceEnabled((value) => !value)}
            onOpenMaps={openInMaps}
            onShareSpot={shareSpot}
            onBackHome={() => {
              setGuidanceEnabled(false);
              setScreen("home");
            }}
            onEditSpot={openEditSpotModal}
          />
        ) : screen === "about" ? (
          <AboutScreen
            styles={styles}
            aboutImageSource={require("./assets/about-marc.jpg")}
            onBackHome={() => setScreen("home")}
          />
        ) : (
          <LegalScreen styles={styles} onBackHome={() => setScreen("home")} />
        )}

        {permissionStatus !== "granted" ? (
          <Text style={styles.warning}>
            La permission de localisation n est pas accordee. Active-la dans les reglages
            du telephone.
          </Text>
        ) : null}

        {captureStatus ? <Text style={styles.captureStatus}>{captureStatus}</Text> : null}

        <AppFooter onOpenExternal={openExternal} />
      </ScrollView>

      <AppMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onAbout={() => {
          setShowMenu(false);
          setScreen("about");
        }}
        onLegal={() => {
          setShowMenu(false);
          setScreen("legal");
        }}
        onShare={async () => {
          setShowMenu(false);
          await shareAppLink();
        }}
      />

      <CreateSpotModal
        visible={showCreateModal}
        styles={styles}
        name={createName}
        description={createDescription}
        photoUri={createPhotoUri}
        saving={savingSpot}
        onChangeName={setCreateName}
        onChangeDescription={setCreateDescription}
        onOpenCamera={() => openCameraForTarget("create")}
        onRemovePhoto={removePhotoForCreate}
        onSave={saveNewSpot}
        onClose={() => setShowCreateModal(false)}
      />

      <EditSpotModal
        visible={showEditModal}
        styles={styles}
        name={editName}
        description={editDescription}
        photoUri={editPhotoUri}
        onChangeName={setEditName}
        onChangeDescription={setEditDescription}
        onOpenCamera={() => openCameraForTarget("edit")}
        onRemovePhoto={removePhotoForEdit}
        onSave={saveEditedSpot}
        onClose={() => setShowEditModal(false)}
      />

      <CameraCaptureModal
        visible={cameraOpen}
        styles={styles}
        cameraRef={cameraRef}
        capturingPhoto={capturingPhoto}
        onClose={closeCamera}
        onCapture={capturePhoto}
      />
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
  introOverlaySafe: {
    flex: 1,
    backgroundColor: "#ececec",
  },
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
  introPresentation: {
    position: "absolute",
    left: 16,
    right: 16,
    top: "38%",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dbeafe",
    gap: 12,
  },
  introPresentationTitle: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  introPresentationText: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  introPresentationActions: {
    gap: 10,
  },
  introActionButton: {
    width: "100%",
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
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    flex: 1,
    height: 74,
    marginBottom: 4,
  },
  burgerButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#0b79bf",
    alignItems: "center",
    justifyContent: "center",
  },
  burgerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
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
  rowActions: {
    gap: 6,
    alignItems: "flex-end",
  },
  rowEdit: {
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rowEditText: {
    color: "#1d4ed8",
    fontWeight: "600",
    fontSize: 12,
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
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: "top",
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
  aboutPhoto: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignSelf: "center",
    marginVertical: 10,
  },
  guidanceArrow: {
    fontSize: 84,
    textAlign: "center",
    color: "#0d9488",
    fontWeight: "700",
    marginBottom: 8,
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
  modalSafe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
});
