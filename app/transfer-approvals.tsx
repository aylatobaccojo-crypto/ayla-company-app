import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type FilterType = "pending" | "approved" | "rejected" | "all";

export default function TransferApprovalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vanTransferRequests, approveVanTransfer, rejectVanTransfer } = useApp();
  const [filter, setFilter] = useState<FilterType>("pending");
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const all = (vanTransferRequests || []).slice().reverse();
  const filtered = filter === "all" ? all : all.filter((r) => r.status === filter);

  const pendingCount = all.filter((r) => r.status === "pending").length;

  const handleApprove = (id: string) => {
    Alert.alert("تأكيد الموافقة", "هل توافق على تحويل البضاعة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "موافقة",
        onPress: () => {
          approveVanTransfer(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleReject = (id: string) => {
    Alert.alert("رفض الطلب", "هل تريد رفض هذا الطلب؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "رفض",
        style: "destructive",
        onPress: () => {
          rejectVanTransfer(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      },
    ]);
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: "pending", label: `بانتظار (${pendingCount})` },
    { key: "approved", label: "مقبولة" },
    { key: "rejected", label: "مرفوضة" },
    { key: "all", label: "الكل" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="طلبات التحويل بين الفانات"
        subtitle={pendingCount > 0 ? `${pendingCount} طلب بانتظار موافقتك` : undefined}
        showBack
      />

      {/* ─── فلتر ─── */}
      <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterBtn,
              filter === f.key && { borderBottomWidth: 2, borderBottomColor: colors.primary },
            ]}
          >
            <Text style={[
              styles.filterBtnText,
              { color: filter === f.key ? colors.primary : colors.mutedForeground },
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 12 }}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Feather name="check-circle" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {filter === "pending" ? "لا توجد طلبات بانتظار الموافقة" : "لا توجد طلبات"}
            </Text>
          </View>
        )}

        {filtered.map((req) => (
          <Card key={req.id} style={[
            styles.reqCard,
            req.status === "pending" && { borderWidth: 2, borderColor: "#f59e0b" },
          ]}>
            {/* ─── رأس البطاقة ─── */}
            <View style={styles.reqHeader}>
              <View style={{ gap: 3 }}>
                {req.transferRef ? (
                  <View style={{ backgroundColor: "#0891b2", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start" }}>
                    <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>{req.transferRef}</Text>
                  </View>
                ) : null}
                <Text style={[styles.reqDate, { color: colors.mutedForeground }]}>
                  {new Date(req.date).toLocaleDateString("ar-SA")}{" "}
                  {new Date(req.date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              {req.status === "pending" && <Badge label="بانتظار الموافقة" variant="warning" />}
              {req.status === "approved" && <Badge label="مقبول ✓" variant="success" />}
              {req.status === "rejected" && <Badge label="مرفوض ✗" variant="destructive" />}
            </View>

            {/* ─── اتجاه التحويل ─── */}
            <View style={[styles.transferFlow, { backgroundColor: colors.accent, borderRadius: 10 }]}>
              <View style={styles.vanBox}>
                <Feather name="truck" size={16} color="#e8531d" />
                <Text style={[styles.vanName, { color: colors.foreground }]}>{req.fromVanName}</Text>
                <Text style={[styles.driverName, { color: colors.mutedForeground }]}>{req.fromDriverName}</Text>
              </View>
              <View style={styles.arrowBox}>
                <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
                <Text style={[styles.arrowLabel, { color: colors.mutedForeground }]}>يُحوّل إلى</Text>
              </View>
              <View style={styles.vanBox}>
                <Feather name="truck" size={16} color={colors.primary} />
                <Text style={[styles.vanName, { color: colors.primary }]}>{req.toVanName}</Text>
                <Text style={[styles.driverName, { color: colors.mutedForeground }]}>{req.toDriverName}</Text>
              </View>
            </View>

            {/* ─── الأصناف ─── */}
            <View style={styles.itemsSection}>
              <Text style={[styles.itemsTitle, { color: colors.mutedForeground }]}>
                {req.items.length} صنف · {req.items.reduce((s, i) => s + i.quantity, 0)} كروز إجمالاً
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {req.items.map((item, idx) => (
                  <View key={idx} style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Text style={[styles.pillText, { color: colors.foreground }]}>
                      {item.productName}:{" "}
                      <Text style={{ color: "#e8531d", fontFamily: "Inter_700Bold" }}>{item.quantity}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {req.notes ? (
              <View style={[styles.noteBox, { backgroundColor: colors.accent, borderRadius: 8 }]}>
                <Feather name="message-circle" size={13} color={colors.mutedForeground} />
                <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{req.notes}</Text>
              </View>
            ) : null}

            {/* ─── أزرار الموافقة/الرفض ─── */}
            {req.status === "pending" && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => handleReject(req.id)}
                  style={[styles.rejectBtn, { backgroundColor: "#fee2e2", borderColor: "#fca5a5" }]}
                >
                  <Feather name="x-circle" size={16} color="#dc2626" />
                  <Text style={[styles.rejectBtnText, { color: "#dc2626" }]}>رفض</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleApprove(req.id)}
                  style={[styles.approveBtn, { backgroundColor: "#22c55e" }]}
                >
                  <Feather name="check-circle" size={16} color="#fff" />
                  <Text style={styles.approveBtnText}>موافقة وتنفيذ</Text>
                </TouchableOpacity>
              </View>
            )}

            {req.status !== "pending" && req.resolvedAt && (
              <Text style={[styles.resolvedAt, { color: colors.mutedForeground }]}>
                {req.status === "approved" ? "تمت الموافقة" : "تم الرفض"} في{" "}
                {new Date(req.resolvedAt).toLocaleDateString("ar-SA")}
              </Text>
            )}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    paddingBottom: 10,
  },
  filterBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", gap: 10, paddingVertical: 60 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  reqCard: { gap: 10 },
  reqHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reqDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  transferFlow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12,
  },
  vanBox: { alignItems: "center", gap: 4, flex: 1 },
  vanName: { fontSize: 13, fontFamily: "Inter_700Bold" },
  driverName: { fontSize: 11, fontFamily: "Inter_400Regular" },
  arrowBox: { alignItems: "center", gap: 2 },
  arrowLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  itemsSection: { gap: 0 },
  itemsTitle: { fontSize: 12, fontFamily: "Inter_500Medium" },
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  noteBox: { flexDirection: "row", gap: 6, padding: 8, alignItems: "flex-start" },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  actionRow: { flexDirection: "row", gap: 10 },
  rejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, padding: 10, borderRadius: 10, borderWidth: 1,
  },
  rejectBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  approveBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, padding: 10, borderRadius: 10,
  },
  approveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  resolvedAt: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
