import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function InvoicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser, invoices, vans } = useApp();
  const isAdmin = currentUser?.role === "admin";
  const vanId = currentUser?.vanId;
  const [search, setSearch] = useState("");
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myInvoices = invoices
    .filter((inv) => isAdmin || inv.vanId === vanId)
    .filter((inv) =>
      inv.customerName.includes(search) ||
      inv.id.includes(search) ||
      (vans.find((v) => v.id === inv.vanId)?.driverName || "").includes(search)
    )
    .slice()
    .reverse();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="الفواتير"
        rightAction={!isAdmin ? { icon: "plus", onPress: () => router.push("/new-invoice"), label: "جديدة" } : undefined}
      />

      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <Input
          placeholder="بحث بالعميل أو المندوب..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { backgroundColor: "transparent", borderWidth: 0 }]}
        />
      </View>

      <FlatList
        data={myInvoices}
        keyExtractor={(inv) => inv.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: botPad + 20 }}
        renderItem={({ item }) => {
          const van = vans.find((v) => v.id === item.vanId);
          const d = new Date(item.date);
          const dateStr = d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
          const timeStr = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
          const totalBoxes = item.items.reduce((s, i) => s + i.quantity, 0);
          return (
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/invoice-detail", params: { id: item.id } })}
              activeOpacity={0.85}
            >
              <Card style={[styles.invCard, { borderRightWidth: 3, borderRightColor: item.remaining > 0 ? "#f59e0b" : "#22c55e" }]}>

                {/* الصف العلوي: رقم الفاتورة + حالة الدفع */}
                <View style={styles.invTopRow}>
                  {item.status === "cancelled" ? (
                    <Badge label="ملغاة" variant="destructive" />
                  ) : item.remaining > 0 ? (
                    <Badge label={`آجل ${item.remaining.toFixed(2)} د.أ`} variant="warning" />
                  ) : (
                    <Badge label="مدفوع" variant="success" />
                  )}
                  <Text style={[styles.invId, { color: colors.mutedForeground }]}>
                    #{item.id.slice(-6).toUpperCase()}
                  </Text>
                </View>

                {/* اسم العميل */}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoVal, { color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
                    {item.customerName}
                  </Text>
                  <View style={[styles.infoIcon, { backgroundColor: "#3b82f618" }]}>
                    <Feather name="user" size={13} color="#3b82f6" />
                    <Text style={[styles.infoLbl, { color: "#3b82f6" }]}>العميل</Text>
                  </View>
                </View>

                {/* اسم المندوب */}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoVal, { color: colors.foreground }]} numberOfLines={1}>
                    {van?.driverName || "—"}
                    {van ? `  (${van.name})` : ""}
                  </Text>
                  <View style={[styles.infoIcon, { backgroundColor: "#e8531d18" }]}>
                    <Feather name="truck" size={13} color="#e8531d" />
                    <Text style={[styles.infoLbl, { color: "#e8531d" }]}>المندوب</Text>
                  </View>
                </View>

                {/* التاريخ والوقت */}
                <View style={styles.infoRow}>
                  <View style={styles.dateTimeGroup}>
                    <View style={[styles.dateChip, { backgroundColor: colors.accent }]}>
                      <Feather name="calendar" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.dateChipText, { color: colors.foreground }]}>{dateStr}</Text>
                    </View>
                    <View style={[styles.dateChip, { backgroundColor: colors.accent }]}>
                      <Feather name="clock" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.dateChipText, { color: colors.foreground }]}>{timeStr}</Text>
                    </View>
                  </View>
                </View>

                {/* الصف السفلي: عدد العلب + الإجمالي */}
                <View style={[styles.invBottom, { borderTopColor: colors.border }]}>
                  <Text style={[styles.invItems, { color: colors.mutedForeground }]}>
                    {item.items.length} منتج · {totalBoxes} علبة
                  </Text>
                  <Text style={[styles.invTotal, { color: colors.primary }]}>
                    {item.total.toFixed(2)} د.أ
                  </Text>
                </View>

              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="file-text" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد فواتير</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, marginBottom: 0 },
  invCard: { gap: 10 },
  invTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  invId: { fontSize: 12, fontFamily: "Inter_500Medium" },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  infoIcon: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  infoLbl: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  infoVal: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  dateTimeGroup: { flexDirection: "row", gap: 8, flex: 1, justifyContent: "flex-end" },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dateChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  invBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 8 },
  invItems: { fontSize: 12, fontFamily: "Inter_400Regular" },
  invTotal: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
