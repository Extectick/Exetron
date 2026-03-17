import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMemo, useState } from "react";
import { getMobileApiBaseUrl } from "./src/lib/api";

export default function App() {
  const apiBaseUrl = useMemo(() => getMobileApiBaseUrl(), []);
  const [email, setEmail] = useState("cashier@tenant.local");
  const [password, setPassword] = useState("ChangeMe123!");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Exetron Mobile</Text>
        <Text style={styles.title}>POS / kiosk scaffold</Text>
        <Text style={styles.copy}>
          This Expo app is intentionally thin in Phase 1. It keeps the shared API
          wiring, login surface and branding direction ready for POS and kiosk flows.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>API base URL</Text>
        <Text style={styles.code}>{apiBaseUrl}</Text>
        <Text style={styles.label}>Operator email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonLabel}>Auth wiring placeholder</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f5efe3",
    gap: 24
  },
  hero: {
    marginTop: 24,
    gap: 10
  },
  eyebrow: {
    color: "#8a4c2c",
    textTransform: "uppercase",
    letterSpacing: 3,
    fontSize: 12
  },
  title: {
    fontSize: 34,
    color: "#1f2e27",
    fontWeight: "700"
  },
  copy: {
    fontSize: 16,
    color: "#51605a",
    lineHeight: 24
  },
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "rgba(31, 46, 39, 0.12)",
    gap: 12
  },
  label: {
    fontSize: 13,
    color: "#7b675e",
    textTransform: "uppercase",
    letterSpacing: 1.8
  },
  code: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(196, 109, 56, 0.08)",
    color: "#1f2e27"
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(31, 46, 39, 0.12)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff"
  },
  button: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: "#c46d38"
  },
  buttonLabel: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "600"
  }
});
