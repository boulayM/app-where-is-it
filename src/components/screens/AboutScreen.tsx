import { Image, Pressable, Text, View } from "react-native";

type AboutScreenProps = {
  styles: any;
  onBackHome: () => void;
  aboutImageSource: number;
};

export function AboutScreen({ styles, onBackHome, aboutImageSource }: AboutScreenProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>À propos</Text>
      <Image source={aboutImageSource} style={styles.aboutPhoto} />
      <Text style={styles.infoLine}>
        Marc Boulay, développeur web full-stack. Je conçois des applications web et
        mobiles utiles, orientées experience utilisateur, performance et simplicité
        d&apos;usage.
      </Text>
      <Pressable style={[styles.button, styles.secondary]} onPress={onBackHome}>
        <Text style={styles.buttonText}>Retour à l&apos;accueil</Text>
      </Pressable>
    </View>
  );
}
