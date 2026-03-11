import { Pressable, StyleSheet, Text, View } from "react-native";

type AppFooterProps = {
  onOpenExternal: (url: string, errorMessage: string) => void;
};

export function AppFooter({ onOpenExternal }: AppFooterProps) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Application créée par Marc Boulay</Text>
      <Text style={styles.footerText}>développeur Web</Text>
      <Pressable
        onPress={() =>
          onOpenExternal("https://mabdev.onrender.com", "Impossible d ouvrir le site.")
        }
      >
        <Text style={styles.footerLink}>https://mabdev.onrender.com</Text>
      </Pressable>
      <Text style={styles.footerText}>Siret: 92866412700034</Text>
      <Pressable
        onPress={() =>
          onOpenExternal(
            "mailto:macboulay2@gmail.com",
            "Impossible d ouvrir le client email.",
          )
        }
      >
        <Text style={styles.footerLink}>Contact : macboulay2@gmail.com</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 18,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#0B79BF",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  footerLink: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
