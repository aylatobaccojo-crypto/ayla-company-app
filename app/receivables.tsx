import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ReceivablesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { customers, invoices, vans, addCashEntry, updateCustomer, currentUser } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [search, setSearch] = useState("");
  const [filterVan, setFilterVan] = useState<string>("all");
  const [collectModal, setCollectModal] = useState<{ customer: any; maxAmount: number } | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectNote, setCollectNote] = useState("");

  // العملاء الذين عليهم ديون
  const debtCustomers = customers.filter((c) => c.balance > 0);

  const filtered = debtCustomers.filter((c) => {
    const matchSearch = c.name.includes(search) || c.phone.includes(search);
    const matchVan = filterVan === "all" || c.vanId === filterVan;
    return matchSearch && matchVan;
  });

  // إجماليات
  const totalDebt = debtCustomers.reduce((s, c) => s + c.balance, 0);
  const totalDebtByVan: Record<string, number> = {};
  for (const c of debtCustomers) {
    const vid = c.vanId || "unassigned";
    totalDebtByVan[vid] = (totalDebtByVan[vid] || 0) + c.balance;
  }

  // آخر فاتورة آجل لكل عميل
  const getLastCreditInvoice = (customerId: string) => {
    return [...invoices]
      .filter((inv) => inv.customerId === customerId && inv.remaining > 0 && inv.status !== "cancelled")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  // تحصيل مبلغ
  const handleCollect = () => {
    if (!collectModal) return;
    const amt = parseFloat(collectAmount);
    if (!amt || amt <= 0) {
      Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح");
      return;
    }
    if (amt > collectModal.maxAmount) {
      Alert.alert("خطأ", `المبلغ أكبر من الرصيد المستحق (${collectModal.maxAmount.toFixed(2)} د.أ)`);
      return;
    }

    const customer = collectModal.customer;
    const van = vans.find((v) => v.id === customer.vanId);

    // إضافة حركة نقدية
    addCashEntry({
      vanId: customer.vanId || vans[0]?.id || "",
      type: "collect",
      amount: amt,
      description: `تحصيل ذمة — ${customer.name}${collectNote ? ` (${collectNote})` : ""}`,
    });

    // تخفيض رصيد العميل
    const newBalance = Math.max(0, customer.balance - amt);
    updateCustomer(customer.id, { balance: newBalance });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCollectModal(null);
    setCollectAmount("");
    setCollectNote("");
    Alert.alert("تم التحصيل", `تم تسجيل ${amt.toFixed(2)} د.أ من ${customer.name}\nالرصيد المتبقي: ${newBalance.toFixed(2)} د.أ`);
  };

  const sortedFiltered = [...filtered].sort((a, b) => b.balance - a.balance);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="الذمم والمديونيات" subtitle={`${debtCustomers.length} عميل`} showBack />

      {/* إجمالي الذمم */}
      <View style={[styles.totalBanner, { backgroundColor: colors.secondary }]}>
        <View style={styles.totalMain}>
          <Feather name="alert-circle" size={22} color="#fff" />
          <View>
            <Text style={styles.totalLabel}>إجمالي الذمم</Text>
            <Text style={styles.totalAmount}>{totalDebt.toFixed(2)} د.أ</Text>
          </View>
        </View>
        <View style={styles.totalSub}>
          <Text style={styles.totalSubText}>{debtCustomers.length} عميل مدين</Text>
        </View>
      </View>

      {/* ملخص بالفان */}
      {vans.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vanFilterRow}
        >
          <TouchableOpacity
            onPress={() => setFilterVan("all")}
            style={[styles.vanChip, filterVan === "all" && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.vanChipText, { color: filterVan === "all" ? "#fff" : colors.foreground }]}>
              الكل ({debtCustomers.length})
            </Text>
          </TouchableOpacity>
          {vans.map((van) => {
            const count = debtCustomers.filter((c) => c.vanId === van.id).length;
            const amt = totalDebtByVan[van.id] || 0;
            return (
              <TouchableOpacity
                key={van.id}
                onPress={() => setFilterVan(van.id === filterVan ? "all" : van.id)}
                style={[styles.vanChip, filterVan === van.id && { backgroundColor: "#e8531d" }]}
              >
                <Text style={[styles.vanChipText, { color: filterVan === van.id ? "#fff" : colors.foreground }]}>
                  {van.name}: {amt.toFixed(0)} د.أ
                </Text>
                <Text style={[styles.vanChipSub, { color: filterVan === van.id ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>
                  ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* شريط البحث */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="بحث باسم العميل أو الهاتف..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          textAlign="right"
        />
      </View>

      {/* قائمة العملاء */}
      <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: botPad + 20 }}>
        {sortedFiltered.length === 0 && (
          <View style={styles.empty}>
            <Feather name="check-circle" size={52} color="#22c55e" />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا يوجد ذمم</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {search || filterVan !== "all" ? "لا توجد نتائج مطابقة" : "جميع العملاء سددوا مستحقاتهم"}
            </Text>
          </View>
        )}

        {sortedFiltered.map((customer) => {
          const lastInv = getLastCreditInvoice(customer.id);
          const van = vans.find((v) => v.id === customer.vanId);
          const daysSince = lastInv
            ? Math.floor((Date.now() - new Date(lastInv.date).getTime()) / 86400000)
            : null;
          const isOverdue = daysSince !== null && daysSince > 30;

          return (
            <Card
              key={customer.id}
              style={[styles.debtCard, {
                borderRightWidth: 4,
                borderRightColor: isOverdue ? "#dc2626" : customer.balance > 500 ? "#f59e0b" : "#22c55e",
              }]}
            >
              {/* رأس البطاقة */}
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.customerName, { color: colors.foreground }]}>{customer.name}</Text>
                  <View style={styles.customerMeta}>
                    {customer.phone ? (
                      <View style={styles.metaItem}>
                        <Feather name="phone" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{customer.phone}</Text>
                      </View>
                    ) : null}
                    {van && (
                      <View style={styles.metaItem}>
                        <Feather name="truck" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{van.driverName}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.balanceBox}>
                  <Text style={[styles.balanceAmount, { color: isOverdue ? "#dc2626" : colors.warning }]}>
                    {customer.balance.toFixed(2)}
                  </Text>
                  <Text style={[styles.balanceUnit, { color: colors.mutedForeground }]}>د.أ</Text>
                  {isOverdue && <Badge label="متأخر" variant="destructive" />}
                </View>
              </View>

              {/* آخر فاتورة */}
              {lastInv && (
                <View style={[styles.lastInvRow, { backgroundColor: colors.accent, borderRadius: 8 }]}>
                  <Feather name="file-text" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.lastInvText, { color: colors.mutedForeground }]}>
                    آخر فاتورة: #{lastInv.id.slice(-6).toUpperCase()}
                    {" • "}
                    {new Date(lastInv.date).toLocaleDateString("ar-SA")}
                    {daysSince !== null ? ` (منذ ${daysSince} يوم)` : ""}
                  </Text>
                  <TouchableOpacity onPress={() => router.push({ pathname: "/invoice-detail", params: { id: lastInv.id } })}>
                    <Feather name="chevron-left" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* أزرار */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/customers` as any)}
                  style={[styles.actionBtn, { backgroundColor: colors.accent, borderColor: colors.border }]}
                >
                  <Feather name="user" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>الملف</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setCollectModal({ customer, maxAmount: customer.balance });
                    setCollectAmount(customer.balance.toFixed(2));
                    setCollectNote("");
                  }}
                  style={[styles.actionBtn, { backgroundColor: "#22c55e18", borderColor: "#22c55e" }]}
                >
                  <Feather name="dollar-sign" size={14} color="#22c55e" />
                  <Text style={[styles.actionBtnText, { color: "#22c55e" }]}>تحصيل</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {/* مودال التحصيل */}
      <Modal visible={!!collectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>تحصيل ذمة</Text>
              <TouchableOpacity onPress={() => setCollectModal(null)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {collectModal && (
              <>
                <View style={[styles.collectInfo, { backgroundColor: colors.accent, borderRadius: 12 }]}>
                  <Text style={[styles.collectCustomer, { color: colors.foreground }]}>
                    {collectModal.customer.name}
                  </Text>
                  <Text style={[styles.collectDebt, { color: colors.warning }]}>
                    الرصيد المستحق: {collectModal.maxAmount.toFixed(2)} د.أ
                  </Text>
                </View>

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>المبلغ المحصّل</Text>
                <TextInput
                  value={collectAmount}
                  onChangeText={setCollectAmount}
                  keyboardType="decimal-pad"
                  style={[styles.textInput, {
                    backgroundColor: colors.accent,
                    color: colors.foreground,
                    borderColor: "#22c55e",
                  }]}
                  textAlign="right"
                />

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ملاحظة (اختياري)</Text>
                <TextInput
                  value={collectNote}
                  onChangeText={setCollectNote}
                  placeholder="مثال: دفع نقداً..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.textInput, {
                    backgroundColor: colors.accent,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }]}
                  textAlign="right"
                />

                <Button
                  title={`تسجيل تحصيل ${parseFloat(collectAmount || "0").toFixed(2)} د.أ`}
                  icon="check"
                  onPress={handleCollect}
                  style={{ marginTop: 8, marginBottom: 16, backgroundColor: "#22c55e" }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  totalBanner: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  totalLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular" },
  totalAmount: { color: "#fff", fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold" },
  totalSub: { alignItems: "flex-end" },
  totalSubText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  vanFilterRow: { gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  vanChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  vanChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  vanChipSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  debtCard: { gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  customerName: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  customerMeta: { flexDirection: "row", gap: 12, marginTop: 4, flexWrap: "wrap", justifyContent: "flex-end" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  balanceBox: { alignItems: "flex-end", gap: 4 },
  balanceAmount: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold" },
  balanceUnit: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  lastInvRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
  },
  lastInvText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  cardActions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  collectInfo: { padding: 14, gap: 4, marginBottom: 12 },
  collectCustomer: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  collectDebt: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right", marginBottom: 6, marginTop: 4 },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
});
