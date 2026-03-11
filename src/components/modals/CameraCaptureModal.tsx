import { CameraView } from "expo-camera";
import type { RefObject } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CameraCaptureModalProps = {
  visible: boolean;
  styles: any;
  cameraRef: RefObject<CameraView | null>;
  capturingPhoto: boolean;
  onClose: () => void;
  onCapture: () => void | Promise<void>;
};

export function CameraCaptureModal({
  visible,
  styles,
  cameraRef,
  capturingPhoto,
  onClose,
  onCapture,
}: CameraCaptureModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.cameraSafe} edges={["top", "left", "right", "bottom"]}>
        <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
        <View style={styles.cameraActions}>
          <Pressable style={[styles.button, styles.danger, styles.cameraButton]} onPress={onClose}>
            <Text style={styles.buttonText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[
              styles.button,
              styles.photo,
              styles.cameraButton,
              capturingPhoto && styles.disabledButton,
            ]}
            onPress={() => void onCapture()}
            disabled={capturingPhoto}
          >
            <Text style={styles.buttonText}>{capturingPhoto ? "Capture..." : "Capturer"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
