import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type AdminFilter = "all" | string;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("ar-SA", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return `${date} ${time} UTC`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

export default function DailyCloseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    currentUser, vans, vanInventory, products,
    invoices, cashEntries, expenses,
    dailyCloses, dayOpenedAt,
    closeDailyInventory, getVanBalance,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";
  const vanId = currentUser?.vanId || "";
  const van = vans.find((v) => v.id === vanId);
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [lastClose, setLastClose] = useState<any>(null);
  const [adminFilter, setAdminFilter] = useState<AdminFilter>("all");

  const openedAt = dayOpenedAt[vanId] ||
    invoices.filter((i) => i.vanId === vanId).sort((a, b) => a.date.localeCompare(b.date))[0]?.date ||
    new Date(Date.now() - 86400000).toISOString();

  const dayInvoices = invoices.filter((i) => i.vanId === vanId && i.date >= openedAt);
  const dayCash = cashEntries.filter((e) => e.vanId === vanId && e.date >= openedAt);
  const dayExpenses = expenses.filter((e) => e.vanId === vanId && e.date >= openedAt);

  const totalSales = dayInvoices.reduce((s, i) => s + i.total, 0);
  const totalCollected = dayCash.filter((e) => e.type === "collect").reduce((s, e) => s + e.amount, 0);
  const totalPaid = dayCash.filter((e) => e.type === "pay").reduce((s, e) => s + e.amount, 0);
  const totalExpenses = dayExpenses.reduce((s, e) => s + e.amount, 0);
  const cashToHandOver = totalCollected - totalPaid;
  const vanInv = (vanInventory[vanId] || []).filter((vi) => vi.quantity > 0);

  const handleCloseDay = () => {
    const close = closeDailyInventory(vanId, notes.trim() || undefined);
    if (close) {
      setLastClose(close);
      setShowConfirmModal(false);
      setNotes("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const adminCloses = [...(dailyCloses || [])].reverse();
  const filteredCloses = adminFilter === "all"
    ? adminCloses
    : adminCloses.filter((c) => c.vanId === adminFilter);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={isAdmin ? "سجل إغلاق الأيام" : "إغلاق اليوم"} showBack />

      {/* ══════════ عرض المندوب ══════════ */}
      {!isAdmin && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>
          {/* بطاقة اليوم الحالي */}
          <View style={[styles.dayBanner, { backgroundColor: colors.secondary }]}>
            <Feather name="sun" size={22} color="rgba(255,255,255,0.8)" />
            <Text style={styles.dayBannerTitle}>اليوم الحالي</Text>
            <Text style={styles.dayBannerSub}>
              بدأ: {formatDateTime(openedAt)}
            </Text>
          </View>

          {/* ملخص اليوم */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCell, { backgroundColor: "#22c55e18", borderRadius: 12 }]}>
              <Feather name="file-text" size={18} color="#22c55e" />
              <Text style={[styles.statVal, { color: "#22c55e" }]}>{dayInvoices.length}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>فاتورة</Text>
            </View>
            <View style={[styles.statCell, { backgroundColor: colors.primary + "18", borderRadius: 12 }]}>
              <Feather name="trending-up" size={18} color={colors.primary} />
              <Text style={[styles.statVal, { color: colors.primary }]}>{totalSales.toFixed(2)}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>مبيعات</Text>
            </View>
            <View style={[styles.statCell, { backgroundColor: "#22c55e18", borderRadius: 12 }]}>
              <Feather name="arrow-down-circle" size={18} color="#22c55e" />
              <Text style={[styles.statVal, { color: "#22c55e" }]}>{totalCollected.toFixed(2)}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>مقبوضات</Text>
            </View>
            <View style={[styles.statCell, { backgroundColor: "#ef444418", borderRadius: 12 }]}>
              <Feather name="arrow-up-circle" size={18} color="#ef4444" />
              <Text style={[styles.statVal, { color: "#ef4444" }]}>{totalExpenses.toFixed(2)}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>مصروفات</Text>
            </View>
          </View>

          {/* المبلغ للتسليم */}
          <Card style={[styles.handoverCard, { borderRightWidth: 4, borderRightColor: "#f59e0b" }]}>
            <View style={styles.handoverRow}>
              <View style={[styles.handoverIcon, { backgroundColor: "#f59e0b22" }]}>
                <Feather name="dollar-sign" size={24} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.handoverLabel, { color: colors.mutedForeground }]}>
                  المبلغ الواجب تسليمه للمدير
                </Text>
                <Text style={[styles.handoverAmt, { color: "#f59e0b" }]}>
                  {cashToHandOver.toFixed(2)} د.أ
                </Text>
              </View>
            </View>
          </Card>

          {/* الكميات المتبقية في الفان */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            المخزون المتبقي في الفان ({vanInv.length} صنف)
          </Text>
          {vanInv.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="package" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>الفان فارغ</Text>
            </View>
          ) : (
            vanInv.map((vi) => {
              const prod = products.find((p) => p.id === vi.productId);
              return (
                <View key={vi.productId} style={[styles.invRow, { backgroundColor: colors.card, borderRadius: 10 }]}>
                  <View style={[styles.invQtyBadge, { backgroundColor: colors.primary + "18" }]}>
                    <Text style={[styles.invQty, { color: colors.primary }]}>{vi.quantity}</Text>
                    <Text style={[styles.invUnit, { color: colors.primary }]}>علبة</Text>
                  </View>
                  <Text style={[styles.invName, { color: colors.foreground }]} numberOfLines={1}>
                    {prod?.name || vi.productId}
                  </Text>
                </View>
              );
            })
          )}

          {/* سجلات الإغلاق السابقة */}
          {(dailyCloses || []).filter((c) => c.vanId === vanId).length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>إغلاقات سابقة</Text>
              {[...(dailyCloses || [])]
                .filter((c) => c.vanId === vanId)
                .reverse()
                .slice(0, 5)
                .map((dc) => (
                  <PastCloseCard key={dc.id} dc={dc} colors={colors} />
                ))}
            </>
          )}

          {/* بطاقة النجاح بعد الإغلاق */}
          {lastClose && (
            <Card style={[styles.successCard, { borderColor: "#22c55e", borderWidth: 1 }]}>
              <Feather name="check-circle" size={28} color="#22c55e" />
              <Text style={[styles.successTitle, { color: "#22c55e" }]}>تم إغلاق اليوم بنجاح</Text>
              <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
                {formatDateTime(lastClose.closedAt)}
              </Text>
              {lastClose.inventory.length > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eff6ff", padding: 8, borderRadius: 8 }}>
                  <Feather name="package" size={14} color="#2563eb" />
                  <Text style={{ fontSize: 13, color: "#2563eb", fontFamily: "Inter_600SemiBold", textAlign: "right" }}>
                    {lastClose.inventory.reduce((s: number, i: any) => s + i.closingQty, 0)} كروز رُحِّلت للمستودع الرئيسي
                  </Text>
                </View>
              )}
              <Text style={[styles.successSub, { color: colors.foreground }]}>
                يوم جديد بدأ تلقائياً
              </Text>
            </Card>
          )}

          {/* زر الإغلاق */}
          <TouchableOpacity
            onPress={() => setShowConfirmModal(true)}
            style={[styles.closeBtn, { backgroundColor: "#dc2626" }]}
            activeOpacity={0.85}
          >
            <Feather name="moon" size={20} color="#fff" />
            <Text style={styles.closeBtnText}>إغلاق اليوم وإرسال البيانات للمدير</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ══════════ عرض المدير ══════════ */}
      {isAdmin && (
        <>
          {/* فلتر الفانات */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
            contentContainerStyle={styles.filterContent}
          >
            <TouchableOpacity
              onPress={() => setAdminFilter("all")}
              style={[styles.filterChip, {
                backgroundColor: adminFilter === "all" ? colors.primary : colors.accent,
                borderColor: adminFilter === "all" ? colors.primary : colors.border,
              }]}
            >
              <Text style={[styles.filterChipText, { color: adminFilter === "all" ? "#fff" : colors.foreground }]}>
                الكل ({(dailyCloses || []).length})
              </Text>
            </TouchableOpacity>
            {vans.map((van) => {
              const cnt = (dailyCloses || []).filter((c) => c.vanId === van.id).length;
              return (
                <TouchableOpacity
                  key={van.id}
                  onPress={() => setAdminFilter(van.id)}
                  style={[styles.filterChip, {
                    backgroundColor: adminFilter === van.id ? "#e8531d" : colors.accent,
                    borderColor: adminFilter === van.id ? "#e8531d" : colors.border,
                  }]}
                >
                  <Feather name="truck" size={12} color={adminFilter === van.id ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.filterChipText, { color: adminFilter === van.id ? "#fff" : colors.foreground }]}>
                    {van.name} ({cnt})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filteredCloses.length === 0 ? (
            <View style={[styles.emptyBox, { flex: 1, justifyContent: "center" }]}>
              <Feather name="moon" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                لا يوجد إغلاقات بعد
              </Text>
              <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                يظهر هنا كل تقرير نهاية يوم يرسله المندوبون
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>
              {/* ملخص إجمالي */}
              <View style={[styles.totalSummary, { backgroundColor: colors.secondary }]}>
                <Text style={styles.totalSummaryTitle}>
                  إجمالي {filteredCloses.length} إغلاق
                </Text>
                <View style={styles.totalSummaryRow}>
                  <View style={styles.totalSummaryItem}>
                    <Text style={styles.totalSummaryVal}>
                      {filteredCloses.reduce((s, c) => s + c.totalSales, 0).toFixed(0)} د.أ
                    </Text>
                    <Text style={styles.totalSummaryLbl}>مبيعات</Text>
                  </View>
                  <View style={styles.totalSummaryItem}>
                    <Text style={[styles.totalSummaryVal, { color: "#fbbf24" }]}>
                      {filteredCloses.reduce((s, c) => s + c.cashToHandOver, 0).toFixed(0)} د.أ
                    </Text>
                    <Text style={styles.totalSummaryLbl}>نقد مُسلَّم</Text>
                  </View>
                  <View style={styles.totalSummaryItem}>
                    <Text style={styles.totalSummaryVal}>
                      {filteredCloses.reduce((s, c) => s + c.invoiceCount, 0)}
                    </Text>
                    <Text style={styles.totalSummaryLbl}>فاتورة</Text>
                  </View>
                </View>
              </View>

              {filteredCloses.map((dc) => (
                <AdminCloseCard key={dc.id} dc={dc} colors={colors} />
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* ═══ مودال تأكيد الإغلاق ═══ */}
      <Modal visible={showConfirmModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>تأكيد إغلاق اليوم</Text>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.warnBox, { backgroundColor: "#fef3c7", borderRadius: 10 }]}>
              <Feather name="alert-triangle" size={18} color="#d97706" />
              <Text style={styles.warnText}>
                سيتم إرسال تقرير نهاية اليوم للمدير وفتح يوم جديد تلقائياً.
              </Text>
            </View>

            {vanInv.length > 0 && (
              <View style={[styles.returnBox, { backgroundColor: "#eff6ff", borderRadius: 10, borderWidth: 1, borderColor: "#93c5fd" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Feather name="package" size={16} color="#2563eb" />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#1d4ed8", flex: 1, textAlign: "right" }}>
                    سيُرحَّل تلقائياً للمستودع الرئيسي:
                  </Text>
                </View>
                {vanInv.map((vi) => {
                  const prod = products.find((p) => p.id === vi.productId);
                  return (
                    <View key={vi.productId} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                      <Text style={{ fontSize: 12, color: "#1e40af", fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" }} numberOfLines={1}>
                        {prod?.name || vi.productId}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#2563eb", fontFamily: "Inter_700Bold", marginStart: 8 }}>
                        {vi.quantity} كروز
                      </Text>
                    </View>
                  );
                })}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#bfdbfe" }}>
                  <Text style={{ fontSize: 13, color: "#1d4ed8", fontFamily: "Inter_600SemiBold" }}>
                    {vanInv.reduce((s, vi) => s + vi.quantity, 0)} كروز إجمالي
                  </Text>
                  <Text style={{ fontSize: 11, color: "#3b82f6", fontFamily: "Inter_400Regular" }}>
                    يُعاد للمستودع
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.summaryBox, { backgroundColor: colors.accent, borderRadius: 10 }]}>
              <SummaryRow label="الفواتير" value={`${dayInvoices.length} فاتورة`} colors={colors} />
              <SummaryRow label="المبيعات" value={`${totalSales.toFixed(2)} د.أ`} colors={colors} />
              <SummaryRow label="المقبوضات" value={`${totalCollected.toFixed(2)} د.أ`} colors={colors} highlight />
              <SummaryRow label="المصروفات" value={`${totalExpenses.toFixed(2)} د.أ`} colors={colors} />
              <SummaryRow label="المبلغ للتسليم" value={`${cashToHandOver.toFixed(2)} د.أ`} colors={colors} highlight big />
              <SummaryRow label="المتبقي في الفان" value={`${vanInv.reduce((s, vi) => s + vi.quantity, 0)} علبة`} colors={colors} />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ملاحظات (اختياري)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="أي ملاحظات إضافية..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.notesInput, { backgroundColor: colors.accent, color: colors.foreground, borderColor: colors.border }]}
              multiline
              numberOfLines={3}
              textAlign="right"
            />

            <Button
              title="تأكيد الإغلاق وإرسال التقرير"
              icon="check-circle"
              onPress={() => {
                Alert.alert(
                  "هل أنت متأكد؟",
                  `ستُسلَّم ${cashToHandOver.toFixed(2)} د.أ للمدير ويبدأ يوم جديد`,
                  [
                    { text: "إلغاء", style: "cancel" },
                    { text: "تأكيد الإغلاق", style: "destructive", onPress: handleCloseDay },
                  ]
                );
              }}
              style={{ marginTop: 4, marginBottom: 20, backgroundColor: "#dc2626" }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryRow({
  label, value, colors, highlight = false, big = false,
}: {
  label: string; value: string; colors: any; highlight?: boolean; big?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[
        styles.summaryValue,
        { color: highlight ? "#f59e0b" : colors.foreground },
        big && { fontSize: 18, fontWeight: "800" },
      ]}>
        {value}
      </Text>
    </View>
  );
}

function PastCloseCard({ dc, colors }: { dc: any; colors: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={[styles.pastCard, { borderRightWidth: 3, borderRightColor: "#6366f1" }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.pastHeader}>
        <View>
          <Text style={[styles.pastDate, { color: colors.foreground }]}>{formatDate(dc.closedAt)}</Text>
          <Text style={[styles.pastTime, { color: colors.mutedForeground }]}>{formatDateTime(dc.closedAt)}</Text>
        </View>
        <View style={styles.pastRight}>
          <Text style={[styles.pastCash, { color: "#f59e0b" }]}>{dc.cashToHandOver.toFixed(2)} د.أ</Text>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.pastDetail, { borderTopColor: colors.border }]}>
          <PastRow label="فواتير" val={`${dc.invoiceCount}`} colors={colors} />
          <PastRow label="مبيعات" val={`${dc.totalSales.toFixed(2)} د.أ`} colors={colors} />
          <PastRow label="مقبوضات" val={`${dc.totalCollected.toFixed(2)} د.أ`} colors={colors} />
          <PastRow label="مصروفات" val={`${dc.totalExpenses.toFixed(2)} د.أ`} colors={colors} />
          {dc.notes && <PastRow label="ملاحظات" val={dc.notes} colors={colors} />}
          {dc.inventory.length > 0 && (
            <>
              <Text style={[styles.invSectionTitle, { color: colors.mutedForeground }]}>المخزون عند الإغلاق</Text>
              {dc.inventory.map((item: any) => (
                <View key={item.productId} style={styles.invDetailRow}>
                  <Text style={[styles.invDetailName, { color: colors.foreground }]}>{item.productName}</Text>
                  <Text style={[styles.invDetailQty, { color: colors.primary }]}>متبقي: {item.closingQty}</Text>
                  <Text style={[styles.invDetailSold, { color: colors.mutedForeground }]}>مبيع: {item.soldQty}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </Card>
  );
}

function AdminCloseCard({ dc, colors }: { dc: any; colors: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={[styles.adminCard, { borderRightWidth: 3, borderRightColor: "#e8531d" }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.adminCardHeader}>
        <View style={[styles.vanAva, { backgroundColor: "#e8531d22" }]}>
          <Feather name="truck" size={18} color="#e8531d" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.adminCardVan, { color: colors.foreground }]}>{dc.vanName}</Text>
          <Text style={[styles.adminCardDriver, { color: colors.mutedForeground }]}>{dc.driverName}</Text>
          <Text style={[styles.adminCardDate, { color: colors.mutedForeground }]}>{formatDate(dc.closedAt)}</Text>
        </View>
        <View style={styles.adminCardRight}>
          <View style={[styles.cashBadge, { backgroundColor: "#f59e0b22" }]}>
            <Text style={[styles.cashBadgeText, { color: "#f59e0b" }]}>
              {dc.cashToHandOver.toFixed(2)} د.أ
            </Text>
            <Text style={[styles.cashBadgeLbl, { color: "#f59e0b" }]}>للتسليم</Text>
          </View>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>

      <View style={styles.adminQuickStats}>
        <QuickStat label="فواتير" val={`${dc.invoiceCount}`} color="#22c55e" colors={colors} />
        <QuickStat label="مبيعات" val={`${dc.totalSales.toFixed(0)}`} color={colors.primary} colors={colors} />
        <QuickStat label="مقبوضات" val={`${dc.totalCollected.toFixed(0)}`} color="#22c55e" colors={colors} />
        <QuickStat label="مصروفات" val={`${dc.totalExpenses.toFixed(0)}`} color="#ef4444" colors={colors} />
      </View>

      {expanded && (
        <View style={[styles.adminExpanded, { borderTopColor: colors.border }]}>
          <View style={styles.timeRange}>
            <Feather name="clock" size={13} color={colors.mutedForeground} />
            <Text style={[styles.timeRangeText, { color: colors.mutedForeground }]}>
              {formatDateTime(dc.openedAt)}
            </Text>
            <Feather name="arrow-left" size={13} color={colors.mutedForeground} />
            <Text style={[styles.timeRangeText, { color: colors.mutedForeground }]}>
              {formatDateTime(dc.closedAt)}
            </Text>
          </View>
          {dc.notes && (
            <Text style={[styles.adminNotes, { color: colors.mutedForeground, backgroundColor: colors.accent }]}>
              ملاحظة: {dc.notes}
            </Text>
          )}
          {dc.inventory.length > 0 && (
            <>
              <Text style={[styles.invSectionTitle, { color: colors.mutedForeground }]}>
                المخزون عند الإغلاق ({dc.inventory.length} صنف)
              </Text>
              {dc.inventory.map((item: any) => (
                <View key={item.productId} style={[styles.invDetailRow, { backgroundColor: colors.accent, borderRadius: 8 }]}>
                  <Text style={[styles.invDetailName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <View style={styles.invDetailRight}>
                    <View style={[styles.invQtyTag, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.invQtyTagText, { color: colors.primary }]}>متبقي {item.closingQty}</Text>
                    </View>
                    <View style={[styles.invQtyTag, { backgroundColor: "#22c55e22" }]}>
                      <Text style={[styles.invQtyTagText, { color: "#22c55e" }]}>مبيع {item.soldQty}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </Card>
  );
}

function PastRow({ label, val, colors }: { label: string; val: string; colors: any }) {
  return (
    <View style={styles.pastRowItem}>
      <Text style={[styles.pastRowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.pastRowVal, { color: colors.foreground }]}>{val}</Text>
    </View>
  );
}

function QuickStat({ label, val, color, colors }: { label: string; val: string; color: string; colors: any }) {
  return (
    <View style={styles.quickStatItem}>
      <Text style={[styles.quickStatVal, { color }]}>{val}</Text>
      <Text style={[styles.quickStatLbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dayBanner: { borderRadius: 16, padding: 20, alignItems: "center", gap: 6 },
  dayBannerTitle: { color: "#fff", fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  dayBannerSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCell: { flex: 1, minWidth: "44%", alignItems: "center", gap: 4, padding: 14 },
  statVal: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  handoverCard: { gap: 0 },
  handoverRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  handoverIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  handoverLabel: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  handoverAmt: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold", textAlign: "right" },
  sectionTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  invRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  invQtyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: "center", minWidth: 54 },
  invQty: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  invUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  invName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  successCard: { alignItems: "center", gap: 8, padding: 20, borderRadius: 16 },
  successTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  closeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, padding: 16, borderRadius: 14, marginTop: 8,
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyBox: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  filterBar: { maxHeight: 52, borderBottomWidth: 1 },
  filterContent: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  totalSummary: { borderRadius: 16, padding: 20, gap: 10 },
  totalSummaryTitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  totalSummaryRow: { flexDirection: "row", justifyContent: "space-around" },
  totalSummaryItem: { alignItems: "center", gap: 4 },
  totalSummaryVal: { color: "#fff", fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  totalSummaryLbl: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_400Regular" },
  adminCard: { gap: 10 },
  adminCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  vanAva: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  adminCardVan: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  adminCardDriver: { fontSize: 12, fontFamily: "Inter_400Regular" },
  adminCardDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  adminCardRight: { alignItems: "flex-end", gap: 6 },
  cashBadge: { alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  cashBadgeText: { fontSize: 15, fontWeight: "800", fontFamily: "Inter_700Bold" },
  cashBadgeLbl: { fontSize: 9, fontFamily: "Inter_400Regular" },
  adminQuickStats: { flexDirection: "row", justifyContent: "space-around" },
  quickStatItem: { alignItems: "center", gap: 3 },
  quickStatVal: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  quickStatLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  adminExpanded: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  timeRange: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  timeRangeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  adminNotes: { padding: 10, borderRadius: 8, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  invSectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right", marginTop: 4 },
  invDetailRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, marginBottom: 4 },
  invDetailName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "right" },
  invDetailRight: { flexDirection: "row", gap: 6 },
  invQtyTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  invQtyTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  invDetailQty: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  invDetailSold: { fontSize: 11, fontFamily: "Inter_400Regular" },
  pastCard: { gap: 0 },
  pastHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pastDate: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  pastTime: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  pastRight: { alignItems: "flex-end", gap: 4 },
  pastCash: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  pastDetail: { borderTopWidth: 1, marginTop: 10, paddingTop: 10, gap: 6 },
  pastRowItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pastRowLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pastRowVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  warnBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 },
  warnText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#92400e", textAlign: "right" },
  returnBox: { padding: 12 },
  summaryBox: { padding: 14, gap: 8, marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", marginBottom: 6 },
  notesInput: {
    borderWidth: 1, borderRadius: 10, padding: 10,
    fontSize: 14, fontFamily: "Inter_400Regular",
    minHeight: 70, textAlignVertical: "top",
    marginBottom: 14,
  },
});
