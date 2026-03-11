import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EditSpotModalProps = {
  visible: boolean;
  styles: any;
  name: string;
  description: string;
  photoUri: string | null;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onOpenCamera: () => void;
  onRemovePhoto: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onClose: () => void;
};

export function EditSpotModal({
  visible,
  styles,
  name,
  description,
  photoUri,
  onChangeName,
  onChangeDescription,
  onOpenCamera,
  onRemovePhoto,
  onSave,
  onClose,
}: EditSpotModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={["top", "left", "right", "bottom"]}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Editer l emplacement</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom de l'emplacement"
            value={name}
            onChangeText={onChangeName}
          />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Description"
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
              <Text style={styles.buttonText}>
                {photoUri ? "Modifier la photo" : "Ajouter une photo"}
              </Text>
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
            <Pressable style={[styles.button, styles.primary]} onPress={() => void onSave()}>
              <Text style={styles.buttonText}>Enregistrer</Text>
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
