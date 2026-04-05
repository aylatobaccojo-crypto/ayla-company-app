import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useApp();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم المستخدم وكلمة السر");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const success = login(username.trim(), password);
      setLoading(false);
      if (success) {
        router.replace("/(tabs)");
      } else {
        Alert.alert("خطأ في الدخول", "اسم المستخدم أو كلمة السر غير صحيحة");
      }
    }, 300);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 40, paddingBottom: botPad + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoArea}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Feather name="truck" size={40} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>Ayla Company</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            نظام إدارة مبيعات متكامل
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>تسجيل الدخول</Text>

          <Input
            label="اسم المستخدم"
            value={username}
            onChangeText={setUsername}
            placeholder="أدخل اسم المستخدم"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.passwordField}>
            <Input
              label="كلمة السر"
              value={password}
              onChangeText={setPassword}
              placeholder="أدخل كلمة السر"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          <Button
            title="دخول"
            icon="log-in"
            onPress={handleLogin}
            loading={loading}
            disabled={!username || !password}
            style={styles.loginBtn}
          />
        </View>

        <View style={[styles.hint, { backgroundColor: colors.accent, borderRadius: colors.radius }]}>
          <Feather name="info" size={15} color={colors.primary} />
          <View style={styles.hintText}>
            <Text style={[styles.hintTitle, { color: colors.primary }]}>بيانات تجريبية للتجربة:</Text>
            <Text style={[styles.hintRow, { color: colors.mutedForeground }]}>
              المدير: <Text style={{ color: colors.foreground }}>admin</Text> / <Text style={{ color: colors.foreground }}>admin123</Text>
            </Text>
            <Text style={[styles.hintRow, { color: colors.mutedForeground }]}>
              مندوب 1: <Text style={{ color: colors.foreground }}>ahmed</Text> / <Text style={{ color: colors.foreground }}>1234</Text>
            </Text>
            <Text style={[styles.hintRow, { color: colors.mutedForeground }]}>
              مندوب 2: <Text style={{ color: colors.foreground }}>mohammed</Text> / <Text style={{ color: colors.foreground }}>1234</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  logoArea: { alignItems: "center", marginBottom: 32 },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#e8531d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: { fontSize: 32, fontWeight: "800", fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 4 },
  formCard: {
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    marginBottom: 16,
  },
  passwordField: { position: "relative" },
  eyeBtn: {
    position: "absolute",
    left: 12,
    bottom: 14,
  },
  loginBtn: { marginTop: 8 },
  hint: { padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  hintText: { flex: 1, gap: 4 },
  hintTitle: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 4 },
  hintRow: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
});
