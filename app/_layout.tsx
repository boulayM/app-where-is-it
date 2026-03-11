import { Stack } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Une erreur est survenue</Text>
        <Text style={styles.message}>{error.message}</Text>
        <Pressable style={styles.button} onPress={retry}>
          <Text style={styles.buttonText}>Reessayer</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  message: {
    fontSize: 14,
    color: "#334155",
  },
  button: {
    backgroundColor: "#0d9488",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
});
