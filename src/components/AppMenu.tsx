import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type AppMenuProps = {
  visible: boolean;
  onClose: () => void;
  onAbout: () => void;
  onLegal: () => void;
  onShare: () => void | Promise<void>;
};

export function AppMenu({
  visible,
  onClose,
  onAbout,
  onLegal,
  onShare,
}: AppMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.menuBackdrop}>
        <Pressable style={styles.menuOverlay} onPress={onClose} />
        <View style={styles.menuPanel}>
          <Text style={styles.menuTitle}>Menu</Text>
          <Pressable style={styles.menuItem} onPress={onAbout}>
            <Text style={styles.menuItemText}>A propos</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={onLegal}>
            <Text style={styles.menuItemText}>Mentions legales</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => void onShare()}>
            <Text style={styles.menuItemText}>Partager cette app</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menuBackdrop: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  menuPanel: {
    width: 220,
    marginTop: 72,
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: "#0b79bf",
    padding: 10,
    gap: 8,
    elevation: 6,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
  },
  menuItem: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
});
