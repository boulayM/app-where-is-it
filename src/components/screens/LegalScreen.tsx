import { Pressable, Text, View } from "react-native";

type LegalScreenProps = {
  styles: any;
  onBackHome: () => void;
};

export function LegalScreen({ styles, onBackHome }: LegalScreenProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mentions légales</Text>
      <Text style={styles.infoLine}>
        Éditeur: Marc Boulay - Contact: macboulay2@gmail.com
      </Text>
      <Text style={styles.infoLine}>SIRET: 92866412700034</Text>
      <Text style={styles.infoLine}>Site: https://mabdev.onrender.com</Text>
      <Text style={styles.infoLine}>
        Données: les emplacements (coordonnées, nom, description, photo) sont stockés
        localement sur l&apos;appareil pour fournir les fonctionnalités de sauvegarde, guidage
        et partage.
      </Text>
      <Text style={styles.infoLine}>
        Permissions: localisation et camera utilisées uniquement pour les fonctions
        explicites de l&apos;application.
      </Text>
      <Text style={styles.infoLine}>
        Responsabilité: l&apos;utilisateur reste responsable de l&apos;usage des données et du
        respect des règles locales.
      </Text>
      <Pressable style={[styles.button, styles.secondary]} onPress={onBackHome}>
        <Text style={styles.buttonText}>Retour à l&apos;accueil</Text>
      </Pressable>
    </View>
  );
}
