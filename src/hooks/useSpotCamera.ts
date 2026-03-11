import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Alert } from "react-native";

type CameraTarget = "create" | "edit";

type UseSpotCameraParams = {
  onPhotoCaptured: (target: CameraTarget, uri: string) => void;
};

export function useSpotCamera({ onPhotoCaptured }: UseSpotCameraParams) {
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  async function openCameraForTarget(target: CameraTarget) {
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

      setCameraTarget(target);
      setCameraOpen(true);
    } catch {
      Alert.alert("Erreur", "Impossible de prendre une photo.");
    }
  }

  function closeCamera() {
    setCameraOpen(false);
    setCameraTarget(null);
  }

  async function capturePhoto() {
    if (!cameraRef.current || capturingPhoto || !cameraTarget) {
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

      onPhotoCaptured(cameraTarget, captured.uri);
      setCameraOpen(false);
    } catch {
      Alert.alert("Erreur", "Capture photo impossible.");
    } finally {
      setCameraTarget(null);
      setCapturingPhoto(false);
    }
  }

  return {
    cameraRef,
    cameraOpen,
    cameraTarget,
    capturingPhoto,
    openCameraForTarget,
    closeCamera,
    capturePhoto,
  };
}
