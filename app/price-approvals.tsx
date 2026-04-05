import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

export default function PriceApprovalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { priceApprovalRequests, approvePriceRequest, rejectPriceRequest, products, currentUser } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (currentUser?.role !== "admin") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="طلبات السعر 1" showBack />
        <View style={styles.center}>
          <Feather name="lock" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>للمدير فقط</Text>
        </View>
      </View>
    );
  }

  const pending = priceApprovalRequests.filter((r) => r.status === "pending");
  const resolved = priceApprovalRequests.filter((r) => r.status !== "pending").slice().reverse().slice(0, 20);

  const handleApprove = (id: string) => {
    approvePriceRequest(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReject = (id: string) => {
    rejectPriceRequest(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const getProduct = (productId: string) => products.find((p) => p.id === productId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="طلبات سعر 1" showBack />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>
        {pending.length === 0 && resolved.length === 0 && (
          <View style={styles.center}>
            <Feather name="check-circle" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد طلبات</Text>
          </View>
        )}

        {pending.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Feather name="clock" size={18} color="#e67e22" />
              <Text style={[styles.sectionTitle, { color: "#e67e22" }]}>
                طلبات معلقة ({pending.length})
              </Text>
            </View>
            {pending.map((req) => {
              const product = getProduct(req.productId);
              return (
                <Card key={req.id} style={[styles.reqCard, { borderRightWidth: 3, borderRightColor: "#e67e22" }]}>
                  <View style={styles.reqTop}>
                    <View style={styles.reqInfo}>
                      <Text style={[styles.reqProduct, { color: colors.foreground }]}>{req.productName}</Text>
                      <Text style={[styles.reqDriver, { color: colors.mutedForeground }]}>
                        {req.driverName} → {req.customerName}
                      </Text>
                      <Text style={[styles.reqTime, { color: colors.mutedForeground }]}>
                        {new Date(req.date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <Badge label="معلق" variant="warning" />
                  </View>

                  <View style={[styles.priceCompare, { backgroundColor: colors.accent, borderRadius: 8 }]}>
                    <View style={styles.priceBox}>
                      <Text style={[styles.priceLbl, { color: colors.mutedForeground }]}>الكمية</Text>
                      <Text style={[styles.priceVal, { color: colors.foreground }]}>{req.quantity} علبة</Text>
                    </View>
                    <View style={[styles.priceSep, { backgroundColor: colors.border }]} />
                    <View style={styles.priceBox}>
                      <Text style={[styles.priceLbl, { color: colors.mutedForeground }]}>سعر 2 (عادي)</Text>
                      <Text style={[styles.priceVal, { color: colors.primary }]}>{product?.priceLow} د.أ</Text>
                    </View>
                    <View style={[styles.priceSep, { backgroundColor: colors.border }]} />
                    <View style={styles.priceBox}>
                      <Text style={[styles.priceLbl, { color: "#e67e22" }]}>سعر 1 (مطلوب)</Text>
                      <Text style={[styles.priceVal, { color: "#e67e22" }]}>{req.priceSpecial} د.أ</Text>
                    </View>
                  </View>

                  {product && (
                    <View style={styles.diffRow}>
                      <Feather name="trending-down" size={14} color={colors.destructive} />
                      <Text style={[styles.diffText, { color: colors.destructive }]}>
                        فرق الربح: {((product.priceLow - req.priceSpecial) * req.quantity).toFixed(2)} د.أ
                      </Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => handleReject(req.id)}
                      style={[styles.actionBtn, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive }]}
                    >
                      <Feather name="x" size={16} color={colors.destructive} />
                      <Text style={[styles.actionBtnText, { color: colors.destructive }]}>رفض</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleApprove(req.id)}
                      style={[styles.actionBtn, { backgroundColor: "#22c55e18", borderColor: "#22c55e" }]}
                    >
                      <Feather name="check" size={16} color="#22c55e" />
                      <Text style={[styles.actionBtnText, { color: "#22c55e" }]}>موافقة</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {resolved.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 4 }]}>السجل السابق</Text>
            {resolved.map((req) => (
              <Card key={req.id} style={[styles.resolvedCard, {
                borderRightWidth: 3,
                borderRightColor: req.status === "approved" ? "#22c55e" : colors.destructive,
              }]}>
                <View style={styles.reqTop}>
                  <View style={styles.reqInfo}>
                    <Text style={[styles.reqProduct, { color: colors.foreground }]}>{req.productName}</Text>
                    <Text style={[styles.reqDriver, { color: colors.mutedForeground }]}>{req.driverName} → {req.customerName}</Text>
                  </View>
                  <Badge
                    label={req.status === "approved" ? "موافق" : "مرفوض"}
                    variant={req.status === "approved" ? "success" : "destructive"}
                  />
                </View>
                <Text style={[styles.reqTime, { color: colors.mutedForeground }]}>
                  {new Date(req.date).toLocaleDateString("ar-SA")} — سعر 1: {req.priceSpecial} د.أ — {req.quantity} علبة
                </Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  reqCard: { gap: 10 },
  reqTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reqInfo: { flex: 1, gap: 2 },
  reqProduct: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  reqDriver: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  reqTime: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  priceCompare: { flexDirection: "row", padding: 10, gap: 4 },
  priceBox: { flex: 1, alignItems: "center", gap: 4 },
  priceLbl: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  priceVal: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  priceSep: { width: 1 },
  diffRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  diffText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  resolvedCard: { gap: 4 },
});
