import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { PriceApprovalRequest } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export function PriceApprovalNotifier() {
  const { currentUser, priceApprovalRequests, approvePriceRequest, rejectPriceRequest, products } = useApp();
  const colors = useColors();
  const router = useRouter();
  const notifiedIds = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<PriceApprovalRequest[]>([]);
  const [current, setCurrent] = useState<PriceApprovalRequest | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    const newRequests = priceApprovalRequests.filter(
      (r) => r.status === "pending" && !notifiedIds.current.has(r.id)
    );
    if (newRequests.length > 0) {
      newRequests.forEach((r) => notifiedIds.current.add(r.id));
      setQueue((prev) => [...prev, ...newRequests]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [priceApprovalRequests, isAdmin]);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setCurrent(next);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [queue, current]);

  const dismiss = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setCurrent(null);
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    });
  };

  const handleApprove = () => {
    if (!current) return;
    approvePriceRequest(current.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dismiss();
  };

  const handleReject = () => {
    if (!current) return;
    rejectPriceRequest(current.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    dismiss();
  };

  const handleViewAll = () => {
    dismiss();
    router.push("/price-approvals" as any);
  };

  if (!isAdmin || !current) return null;

  const product = products.find((p) => p.id === current.productId);
  const profitDiff = product ? (product.priceLow - current.priceSpecial) * current.quantity : 0;

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: "#e67e22",
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={[styles.topBand, { backgroundColor: "#e67e22" }]}>
            <Feather name="bell" size={18} color="#fff" />
            <Text style={styles.topBandText}>طلب سعر 1 — موافقة مطلوبة</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.driverRow}>
              <View style={[styles.driverAvatar, { backgroundColor: "#e67e2222" }]}>
                <Feather name="user" size={22} color="#e67e22" />
              </View>
              <View>
                <Text style={[styles.driverName, { color: colors.foreground }]}>{current.driverName}</Text>
                <Text style={[styles.driverSub, { color: colors.mutedForeground }]}>يطلب سعر 1</Text>
              </View>
            </View>

            <View style={[styles.detailBox, { backgroundColor: colors.accent, borderRadius: 12 }]}>
              <View style={styles.detailRow}>
                <Feather name="package" size={14} color={colors.mutedForeground} />
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>المنتج</Text>
                <Text style={[styles.detailVal, { color: colors.foreground }]} numberOfLines={1}>
                  {current.productName}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Feather name="user" size={14} color={colors.mutedForeground} />
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>العميل</Text>
                <Text style={[styles.detailVal, { color: colors.foreground }]}>{current.customerName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Feather name="layers" size={14} color={colors.mutedForeground} />
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>الكمية</Text>
                <Text style={[styles.detailVal, { color: colors.foreground }]}>{current.quantity} علبة</Text>
              </View>
            </View>

            <View style={styles.priceCompare}>
              <View style={[styles.priceBox, { backgroundColor: colors.primary + "18", borderRadius: 10 }]}>
                <Text style={[styles.priceLbl, { color: colors.mutedForeground }]}>سعر 2 (عادي)</Text>
                <Text style={[styles.priceVal, { color: colors.primary }]}>
                  {product?.priceLow ?? "—"} د.أ
                </Text>
              </View>
              <Feather name="arrow-right" size={18} color={colors.mutedForeground} style={{ marginTop: 14 }} />
              <View style={[styles.priceBox, { backgroundColor: "#e67e2218", borderRadius: 10 }]}>
                <Text style={[styles.priceLbl, { color: "#e67e22" }]}>سعر 1 (مطلوب)</Text>
                <Text style={[styles.priceVal, { color: "#e67e22" }]}>
                  {current.priceSpecial} د.أ
                </Text>
              </View>
            </View>

            {profitDiff > 0 && (
              <View style={[styles.diffBanner, { backgroundColor: colors.destructive + "12", borderRadius: 8 }]}>
                <Feather name="trending-down" size={14} color={colors.destructive} />
                <Text style={[styles.diffText, { color: colors.destructive }]}>
                  فرق الربح: {profitDiff.toFixed(2)} د.أ على هذه العملية
                </Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleReject}
                style={[styles.btn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive }]}
              >
                <Feather name="x" size={18} color={colors.destructive} />
                <Text style={[styles.btnText, { color: colors.destructive }]}>رفض</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApprove}
                style={[styles.btn, { backgroundColor: "#22c55e18", borderColor: "#22c55e" }]}
              >
                <Feather name="check" size={18} color="#22c55e" />
                <Text style={[styles.btnText, { color: "#22c55e" }]}>موافقة</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleViewAll} style={styles.viewAllBtn}>
              <Text style={[styles.viewAllText, { color: colors.mutedForeground }]}>
                عرض كل الطلبات ←
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 2,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  topBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topBandText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  body: { padding: 16, gap: 14 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  driverSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  detailBox: { padding: 12, gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontSize: 12, fontFamily: "Inter_400Regular", width: 48 },
  detailVal: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  priceCompare: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  priceBox: { flex: 1, padding: 12, alignItems: "center", gap: 6 },
  priceLbl: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  priceVal: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  diffBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
  diffText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  actionRow: { flexDirection: "row", gap: 12 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  btnText: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  viewAllBtn: { alignItems: "center" },
  viewAllText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
