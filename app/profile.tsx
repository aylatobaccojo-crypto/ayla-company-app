import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser, vans, logout } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!currentUser) return null;

  const van = vans.find((v) => v.id === currentUser.vanId);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="الملف الشخصي" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>
        <View style={[styles.profileHeader, { backgroundColor: colors.secondary, borderRadius: colors.radius * 2 }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{currentUser.name.slice(0, 1)}</Text>
          </View>
          <Text style={styles.name}>{currentUser.name}</Text>
          <Badge label={currentUser.role === "admin" ? "مدير" : "مندوب مبيعات"} variant="primary" />
          {van && <Text style={styles.vanName}>{van.name} • {van.plate}</Text>}
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Feather name="user" size={18} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>الاسم</Text>
            <Text style={[styles.infoVal, { color: colors.foreground }]}>{currentUser.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="shield" size={18} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>الدور</Text>
            <Text style={[styles.infoVal, { color: colors.foreground }]}>
              {currentUser.role === "admin" ? "مدير" : "مندوب مبيعات"}
            </Text>
          </View>
          {currentUser.phone && (
            <View style={styles.infoRow}>
              <Feather name="phone" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>الهاتف</Text>
              <Text style={[styles.infoVal, { color: colors.foreground }]}>{currentUser.phone}</Text>
            </View>
          )}
        </Card>

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: colors.destructive + "12", borderRadius: colors.radius, borderColor: colors.destructive, borderWidth: 1 }]}
        >
          <Feather name="log-out" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { padding: 28, alignItems: "center", gap: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "700", fontFamily: "Inter_700Bold" },
  name: { color: "#fff", fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vanName: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "Inter_400Regular" },
  infoCard: { gap: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right" },
  infoVal: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, gap: 10 },
  logoutText: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
