import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { InvoiceEditRequest } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export function InvoiceEditNotifier() {
  const {
    currentUser, invoiceEditRequests,
    approveInvoiceEdit, rejectInvoiceEdit, invoices,
  } = useApp();
  const colors = useColors();
  const notifiedIds = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<InvoiceEditRequest[]>([]);
  const [current, setCurrent] = useState<InvoiceEditRequest | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    const pending = (invoiceEditRequests || []).filter(
      (r) => r.status === "pending" && !notifiedIds.current.has(r.id)
    );
    if (pending.length > 0) {
      pending.forEach((r) => notifiedIds.current.add(r.id));
      setQueue((prev) => [...prev, ...pending]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [invoiceEditRequests, isAdmin]);

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
    approveInvoiceEdit(current.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dismiss();
  };

  const handleReject = () => {
    if (!current) return;
    rejectInvoiceEdit(current.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    dismiss();
  };

  if (!isAdmin || !current) return null;

  const isCancel = current.type === "cancel";
  const accentColor = isCancel ? "#dc2626" : "#f59e0b";
  const inv = invoices.find((i) => i.id === current.invoiceId);

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: accentColor,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* شريط العنوان */}
          <View style={[styles.topBand, { backgroundColor: accentColor }]}>
            <Feather name={isCancel ? "trash-2" : "edit-2"} size={18} color="#fff" />
            <Text style={styles.topBandText}>
              {isCancel ? "طلب إلغاء فاتورة" : "طلب تعديل فاتورة"} — موافقة مطلوبة
            </Text>
            {queue.length > 0 && (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>+{queue.length}</Text>
              </View>
            )}
          </View>

          <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
            <View style={styles.body}>
              {/* المندوب */}
              <View style={styles.driverRow}>
                <View style={[styles.driverAvatar, { backgroundColor: accentColor + "22" }]}>
                  <Feather name="user" size={22} color={accentColor} />
                </View>
                <View>
                  <Text style={[styles.driverName, { color: colors.foreground }]}>{current.driverName}</Text>
                  <Text style={[styles.driverSub, { color: colors.mutedForeground }]}>
                    يطلب {isCancel ? "إلغاء" : "تعديل"} الفاتورة
                  </Text>
                </View>
              </View>

              {/* تفاصيل الفاتورة */}
              <View style={[styles.detailBox, { backgroundColor: colors.accent }]}>
                <DetailRow icon="hash" label="رقم الفاتورة" val={`#${current.invoiceRef}`} colors={colors} />
                <DetailRow icon="user" label="العميل" val={current.customerName} colors={colors} />
                <DetailRow icon="dollar-sign" label="إجمالي الفاتورة" val={`${current.originalTotal.toFixed(2)} د.أ`} colors={colors} />
                <DetailRow icon="check-circle" label="المدفوع" val={`${current.originalPaid.toFixed(2)} د.أ`} colors={colors} />
                {current.originalDiscount > 0 && (
                  <DetailRow icon="tag" label="الخصم" val={`${current.originalDiscount.toFixed(2)} د.أ`} colors={colors} />
                )}
              </View>

              {/* سبب الطلب */}
              <View style={[styles.reasonBox, { backgroundColor: accentColor + "12", borderRightColor: accentColor }]}>
                <Text style={[styles.reasonLabel, { color: accentColor }]}>السبب المذكور</Text>
                <Text style={[styles.reasonText, { color: colors.foreground }]}>{current.reason}</Text>
              </View>

              {/* التعديلات المطلوبة (للتعديل فقط) */}
              {!isCancel && current.requestedChanges && (
                <View style={[styles.changesBox, { backgroundColor: "#f59e0b12", borderRightColor: "#f59e0b" }]}>
                  <Text style={[styles.reasonLabel, { color: "#f59e0b" }]}>التعديلات المطلوبة</Text>
                  {current.requestedChanges.paid !== undefined && (
                    <View style={styles.changeRow}>
                      <Text style={[styles.changeLabel, { color: colors.mutedForeground }]}>المبلغ المدفوع:</Text>
                      <View style={styles.changeValues}>
                        <Text style={[styles.oldVal, { color: colors.mutedForeground }]}>{current.originalPaid.toFixed(2)}</Text>
                        <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.newVal, { color: "#22c55e" }]}>{current.requestedChanges.paid.toFixed(2)}</Text>
                        <Text style={[styles.changeUnit, { color: colors.mutedForeground }]}>د.أ</Text>
                      </View>
                    </View>
                  )}
                  {current.requestedChanges.discount !== undefined && (
                    <View style={styles.changeRow}>
                      <Text style={[styles.changeLabel, { color: colors.mutedForeground }]}>الخصم:</Text>
                      <View style={styles.changeValues}>
                        <Text style={[styles.oldVal, { color: colors.mutedForeground }]}>{current.originalDiscount.toFixed(2)}</Text>
                        <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.newVal, { color: "#f59e0b" }]}>{current.requestedChanges.discount.toFixed(2)}</Text>
                        <Text style={[styles.changeUnit, { color: colors.mutedForeground }]}>د.أ</Text>
                      </View>
                    </View>
                  )}
                  {current.requestedChanges.notes && (
                    <View style={styles.changeRow}>
                      <Text style={[styles.changeLabel, { color: colors.mutedForeground }]}>ملاحظات:</Text>
                      <Text style={[styles.newVal, { color: colors.foreground, flex: 1, textAlign: "right" }]}>
                        {current.requestedChanges.notes}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* تحذير الإلغاء */}
              {isCancel && inv && (
                <View style={[styles.warnBox, { backgroundColor: "#dc262612" }]}>
                  <Feather name="alert-triangle" size={15} color="#dc2626" />
                  <Text style={[styles.warnText, { color: "#dc2626" }]}>
                    سيتم استرجاع {inv.items.reduce((s, i) => s + i.quantity, 0)} علبة للفان
                    {inv.paid > 0 ? ` وتسجيل ${inv.paid.toFixed(2)} د.أ كمدفوعات راجعة` : ""}
                  </Text>
                </View>
              )}

              {/* أزرار القبول والرفض */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={handleReject}
                  style={[styles.btn, { backgroundColor: "#ef444415", borderColor: "#ef4444" }]}
                >
                  <Feather name="x" size={18} color="#ef4444" />
                  <Text style={[styles.btnText, { color: "#ef4444" }]}>رفض</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApprove}
                  style={[styles.btn, { backgroundColor: "#22c55e18", borderColor: "#22c55e" }]}
                >
                  <Feather name="check" size={18} color="#22c55e" />
                  <Text style={[styles.btnText, { color: "#22c55e" }]}>موافقة</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, val, colors }: { icon: string; label: string; val: string; colors: any }) {
  return (
    <View style={styles.detailRow}>
      <Feather name={icon as any} size={13} color={colors.mutedForeground} />
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailVal, { color: colors.foreground }]} numberOfLines={1}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 390,
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
  topBandText: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "800", fontFamily: "Inter_700Bold" },
  queueBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  queueBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  body: { padding: 16, gap: 14 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  driverName: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  driverSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  detailBox: { padding: 12, gap: 8, borderRadius: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontSize: 12, fontFamily: "Inter_400Regular", width: 70 },
  detailVal: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  reasonBox: {
    padding: 12, borderRadius: 10, borderRightWidth: 3, gap: 6,
  },
  changesBox: {
    padding: 12, borderRadius: 10, borderRightWidth: 3, gap: 8,
  },
  reasonLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  reasonText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 20 },
  changeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  changeLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  changeValues: { flexDirection: "row", alignItems: "center", gap: 6 },
  oldVal: { fontSize: 13, fontFamily: "Inter_400Regular", textDecorationLine: "line-through" },
  newVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  changeUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  warnBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 8 },
  warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "right" },
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
});
