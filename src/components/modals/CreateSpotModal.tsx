import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CreateSpotModalProps = {
  visible: boolean;
  styles: any;
  name: string;
  description: string;
  photoUri: string | null;
  saving: boolean;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onOpenCamera: () => void;
  onRemovePhoto: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onClose: () => void;
};

export function CreateSpotModal({
  visible,
  styles,
  name,
  description,
  photoUri,
  saving,
  onChangeName,
  onChangeDescription,
  onOpenCamera,
  onRemovePhoto,
  onSave,
  onClose,
}: CreateSpotModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={["top", "left", "right", "bottom"]}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Nouvel emplacement</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom de l'emplacement (voiture, pic-nic, spot peche ...)"
            value={name}
            onChangeText={onChangeName}
          />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Description (niveau, place, region ...)"
            value={description}
            onChangeText={onChangeDescription}
            multiline
          />
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photo</Text>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.spotPhoto} />
            ) : (
              <Text style={styles.infoLine}>Aucune photo.</Text>
            )}
          </View>
          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.photo]} onPress={onOpenCamera}>
              <Text style={styles.buttonText}>{photoUri ? "Modifier la photo" : "Photo"}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.secondary,
                !photoUri && styles.disabledButton,
              ]}
              onPress={() => void onRemovePhoto()}
              disabled={!photoUri}
            >
              <Text style={styles.buttonText}>Supprimer la photo</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primary, saving && styles.disabledButton]}
              onPress={() => void onSave()}
              disabled={saving}
            >
              <Text style={styles.buttonText}>{saving ? "Enregistrement..." : "Enregistrer"}</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.danger]} onPress={onClose}>
              <Text style={styles.buttonText}>Annuler</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
