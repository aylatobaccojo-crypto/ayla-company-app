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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type AdminTab = "summary" | string;

export default function CashScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, cashEntries, vans, addCashEntry, getVanBalance } = useApp();
  const isAdmin = currentUser?.role === "admin";
  const vanId = currentUser?.vanId || "";
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [adminTab, setAdminTab] = useState<AdminTab>("summary");
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState<"collect" | "pay">("collect");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedVanId, setSelectedVanId] = useState(vans[0]?.id || "");

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح"); return; }
    if (!description.trim()) { Alert.alert("خطأ", "يرجى إدخال وصف للحركة"); return; }
    const targetVan = isAdmin ? selectedVanId : vanId;
    if (!targetVan) { Alert.alert("خطأ", "يرجى تحديد الفان"); return; }
    addCashEntry({ vanId: targetVan, type: entryType, amount: amt, description: description.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setAmount("");
    setDescription("");
  };

  const getVanEntries = (vid: string) =>
    cashEntries.filter((e) => e.vanId === vid).slice().reverse();

  const getVanCollected = (vid: string) =>
    cashEntries.filter((e) => e.vanId === vid && e.type === "collect").reduce((s, e) => s + e.amount, 0);

  const getVanPaid = (vid: string) =>
    cashEntries.filter((e) => e.vanId === vid && e.type === "pay").reduce((s, e) => s + e.amount, 0);

  const totalBalance = vans.reduce((s, v) => s + getVanBalance(v.id), 0);
  const totalCollected = vans.reduce((s, v) => s + getVanCollected(v.id), 0);
  const totalPaid = vans.reduce((s, v) => s + getVanPaid(v.id), 0);

  const myEntries = getVanEntries(vanId);
  const myCollected = getVanCollected(vanId);
  const myPaid = getVanPaid(vanId);
  const myBalance = getVanBalance(vanId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={isAdmin ? "الصندوق — جميع المندوبين" : "صندوقي"}
        showBack
        rightAction2={!isAdmin ? { icon: "moon", onPress: () => router.push("/daily-close"), label: "إغلاق" } : { icon: "calendar", onPress: () => router.push("/daily-close"), label: "إغلاق" }}
        rightAction={{ icon: "plus", onPress: () => setShowModal(true), label: "إضافة" }}
      />

      {/* ══════════ عرض المندوب ══════════ */}
      {!isAdmin && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>
          <View style={[styles.balanceBanner, { backgroundColor: colors.secondary }]}>
            <Text style={styles.balanceBannerSub}>رصيد صندوقي</Text>
            <Text style={styles.balanceBannerAmt}>{myBalance.toFixed(2)} د.أ</Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/daily-close")}
            style={[styles.closeDayBanner, { backgroundColor: "#dc262618", borderColor: "#dc2626" }]}
            activeOpacity={0.8}
          >
            <Feather name="moon" size={20} color="#dc2626" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.closeDayTitle, { color: "#dc2626" }]}>إغلاق اليوم</Text>
              <Text style={[styles.closeDaySub, { color: colors.mutedForeground }]}>
                إرسال الحرد اليومي والنقدية للمدير
              </Text>
            </View>
            <Feather name="chevron-left" size={18} color="#dc2626" />
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: "#22c55e18", borderRadius: 12 }]}>
              <Feather name="arrow-down-circle" size={20} color="#22c55e" />
              <Text style={[styles.statVal, { color: "#22c55e" }]}>{myCollected.toFixed(2)}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>مقبوضات</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: "#ef444418", borderRadius: 12 }]}>
              <Feather name="arrow-up-circle" size={20} color="#ef4444" />
              <Text style={[styles.statVal, { color: "#ef4444" }]}>{myPaid.toFixed(2)}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>مدفوعات</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.primary + "18", borderRadius: 12 }]}>
              <Feather name="layers" size={20} color={colors.primary} />
              <Text style={[styles.statVal, { color: colors.primary }]}>{myEntries.length}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>حركة</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>حركات الصندوق</Text>

          {myEntries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="dollar-sign" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد حركات بعد</Text>
            </View>
          ) : (
            myEntries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} colors={colors} showVan={false} vans={vans} />
            ))
          )}
        </ScrollView>
      )}

      {/* ══════════ عرض المدير ══════════ */}
      {isAdmin && (
        <>
          {/* شريط التبويبات */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.tabBarWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
            contentContainerStyle={styles.tabBarContent}
          >
            <TouchableOpacity
              onPress={() => setAdminTab("summary")}
              style={[styles.tabItem, adminTab === "summary" && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
            >
              <Feather name="pie-chart" size={15} color={adminTab === "summary" ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.tabLabel, { color: adminTab === "summary" ? colors.primary : colors.mutedForeground }]}>
                الإجمالي
              </Text>
            </TouchableOpacity>
            {vans.map((van) => (
              <TouchableOpacity
                key={van.id}
                onPress={() => setAdminTab(van.id)}
                style={[styles.tabItem, adminTab === van.id && { borderBottomWidth: 2, borderBottomColor: "#e8531d" }]}
              >
                <Feather name="truck" size={15} color={adminTab === van.id ? "#e8531d" : colors.mutedForeground} />
                <Text style={[styles.tabLabel, { color: adminTab === van.id ? "#e8531d" : colors.mutedForeground }]}>
                  {van.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* تبويب الإجمالي */}
          {adminTab === "summary" && (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>
              <View style={[styles.balanceBanner, { backgroundColor: colors.secondary }]}>
                <Text style={styles.balanceBannerSub}>إجمالي رصيد جميع المندوبين</Text>
                <Text style={styles.balanceBannerAmt}>{totalBalance.toFixed(2)} د.أ</Text>
                <View style={styles.totalSubRow}>
                  <Text style={styles.totalSubText}>↓ {totalCollected.toFixed(2)} مقبوضات</Text>
                  <Text style={[styles.totalSubText, { color: "#fca5a5" }]}>↑ {totalPaid.toFixed(2)} مدفوعات</Text>
                </View>
              </View>

              {vans.map((van) => {
                const bal = getVanBalance(van.id);
                const coll = getVanCollected(van.id);
                const paid = getVanPaid(van.id);
                const entries = getVanEntries(van.id);
                return (
                  <Card key={van.id} style={[styles.vanSummaryCard, { borderRightWidth: 3, borderRightColor: "#e8531d" }]}>
                    <View style={styles.vanSummaryHeader}>
                      <View style={[styles.vanAvatar, { backgroundColor: "#e8531d22" }]}>
                        <Feather name="truck" size={20} color="#e8531d" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.vanSummaryName, { color: colors.foreground }]}>{van.name}</Text>
                        <Text style={[styles.vanSummaryDriver, { color: colors.mutedForeground }]}>{van.driverName}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setAdminTab(van.id)}
                        style={[styles.viewVanBtn, { backgroundColor: colors.accent }]}
                      >
                        <Text style={[styles.viewVanText, { color: colors.primary }]}>التفاصيل</Text>
                        <Feather name="chevron-left" size={14} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.vanStatsRow}>
                      <View style={styles.vanStatItem}>
                        <Text style={[styles.vanStatVal, { color: "#22c55e" }]}>{coll.toFixed(2)}</Text>
                        <Text style={[styles.vanStatLbl, { color: colors.mutedForeground }]}>مقبوضات</Text>
                      </View>
                      <View style={[styles.vanStatSep, { backgroundColor: colors.border }]} />
                      <View style={styles.vanStatItem}>
                        <Text style={[styles.vanStatVal, { color: "#ef4444" }]}>{paid.toFixed(2)}</Text>
                        <Text style={[styles.vanStatLbl, { color: colors.mutedForeground }]}>مدفوعات</Text>
                      </View>
                      <View style={[styles.vanStatSep, { backgroundColor: colors.border }]} />
                      <View style={styles.vanStatItem}>
                        <Text style={[styles.vanStatVal, { color: colors.mutedForeground }]}>{entries.length}</Text>
                        <Text style={[styles.vanStatLbl, { color: colors.mutedForeground }]}>حركة</Text>
                      </View>
                      <View style={[styles.vanStatSep, { backgroundColor: colors.border }]} />
                      <View style={styles.vanStatItem}>
                        <Text style={[styles.vanStatVal, { color: bal >= 0 ? colors.primary : "#ef4444" }]}>
                          {bal.toFixed(2)}
                        </Text>
                        <Text style={[styles.vanStatLbl, { color: colors.mutedForeground }]}>الرصيد</Text>
                      </View>
                    </View>

                    {entries.slice(0, 2).map((entry) => (
                      <EntryRow key={entry.id} entry={entry} colors={colors} showVan={false} vans={vans} compact />
                    ))}
                    {entries.length > 2 && (
                      <TouchableOpacity onPress={() => setAdminTab(van.id)} style={styles.moreBtn}>
                        <Text style={[styles.moreBtnText, { color: colors.primary }]}>
                          + {entries.length - 2} حركة أخرى — عرض الكل
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                );
              })}

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>آخر الحركات (جميع المندوبين)</Text>
              {cashEntries.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Feather name="dollar-sign" size={40} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد حركات</Text>
                </View>
              ) : (
                [...cashEntries].reverse().slice(0, 20).map((entry) => (
                  <EntryRow key={entry.id} entry={entry} colors={colors} showVan vans={vans} />
                ))
              )}
            </ScrollView>
          )}

          {/* تبويب كل فان */}
          {vans.map((van) => {
            if (adminTab !== van.id) return null;
            const bal = getVanBalance(van.id);
            const coll = getVanCollected(van.id);
            const paid = getVanPaid(van.id);
            const entries = getVanEntries(van.id);
            return (
              <ScrollView key={van.id} contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>
                <View style={[styles.balanceBanner, { backgroundColor: "#1a2744" }]}>
                  <View style={styles.vanBannerTop}>
                    <Feather name="truck" size={22} color="rgba(255,255,255,0.8)" />
                    <View>
                      <Text style={styles.balanceBannerSub}>{van.name} — {van.driverName}</Text>
                      <Text style={[styles.balanceBannerSub, { fontSize: 11, opacity: 0.6 }]}>{van.plate}</Text>
                    </View>
                  </View>
                  <Text style={styles.balanceBannerAmt}>{bal.toFixed(2)} د.أ</Text>
                  <Text style={styles.balanceBannerSub}>رصيد الصندوق</Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: "#22c55e18", borderRadius: 12 }]}>
                    <Feather name="arrow-down-circle" size={20} color="#22c55e" />
                    <Text style={[styles.statVal, { color: "#22c55e" }]}>{coll.toFixed(2)}</Text>
                    <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>مقبوضات</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: "#ef444418", borderRadius: 12 }]}>
                    <Feather name="arrow-up-circle" size={20} color="#ef4444" />
                    <Text style={[styles.statVal, { color: "#ef4444" }]}>{paid.toFixed(2)}</Text>
                    <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>مدفوعات</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: colors.primary + "18", borderRadius: 12 }]}>
                    <Feather name="layers" size={20} color={colors.primary} />
                    <Text style={[styles.statVal, { color: colors.primary }]}>{entries.length}</Text>
                    <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>حركة</Text>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  حركات صندوق {van.name}
                </Text>

                {entries.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Feather name="dollar-sign" size={40} color={colors.mutedForeground} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد حركات لهذا المندوب</Text>
                  </View>
                ) : (
                  entries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} colors={colors} showVan={false} vans={vans} />
                  ))
                )}
              </ScrollView>
            );
          })}
        </>
      )}

      {/* ═══ مودال إضافة حركة ═══ */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>إضافة حركة نقدية</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.typeRow}>
              <TouchableOpacity
                onPress={() => setEntryType("collect")}
                style={[styles.typeBtn, { backgroundColor: entryType === "collect" ? "#22c55e" : colors.accent }]}
              >
                <Feather name="arrow-down-circle" size={18} color={entryType === "collect" ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.typeBtnText, { color: entryType === "collect" ? "#fff" : colors.mutedForeground }]}>قبض</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEntryType("pay")}
                style={[styles.typeBtn, { backgroundColor: entryType === "pay" ? "#ef4444" : colors.accent }]}
              >
                <Feather name="arrow-up-circle" size={18} color={entryType === "pay" ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.typeBtnText, { color: entryType === "pay" ? "#fff" : colors.mutedForeground }]}>دفع</Text>
              </TouchableOpacity>
            </View>

            {isAdmin && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>اختر المندوب</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {vans.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => setSelectedVanId(v.id)}
                        style={[styles.vanChip, {
                          backgroundColor: selectedVanId === v.id ? colors.primary : colors.accent,
                          borderColor: selectedVanId === v.id ? colors.primary : colors.border,
                        }]}
                      >
                        <Feather name="truck" size={13} color={selectedVanId === v.id ? "#fff" : colors.mutedForeground} />
                        <Text style={[styles.vanChipText, { color: selectedVanId === v.id ? "#fff" : colors.foreground }]}>
                          {v.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <Input label="المبلغ (د.أ)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
            <Input label="الوصف" value={description} onChangeText={setDescription} placeholder="قبض من عميل / دفع مصروف..." />
            <Button title="حفظ الحركة" icon="check" onPress={handleSave} style={{ marginTop: 4, marginBottom: 20 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EntryRow({
  entry, colors, showVan, vans, compact = false,
}: {
  entry: any;
  colors: any;
  showVan: boolean;
  vans: any[];
  compact?: boolean;
}) {
  const isCollect = entry.type === "collect";
  return (
    <View style={[
      styles.entryCard,
      { backgroundColor: colors.card, borderRadius: 12, borderRightWidth: 3, borderRightColor: isCollect ? "#22c55e" : "#ef4444" },
      compact && { paddingVertical: 8 },
    ]}>
      <View style={[styles.entryIcon, { backgroundColor: isCollect ? "#22c55e18" : "#ef444418" }]}>
        <Feather
          name={isCollect ? "arrow-down-circle" : "arrow-up-circle"}
          size={compact ? 18 : 22}
          color={isCollect ? "#22c55e" : "#ef4444"}
        />
      </View>
      <View style={styles.entryInfo}>
        <Text style={[styles.entryDesc, { color: colors.foreground, fontSize: compact ? 13 : 14 }]} numberOfLines={1}>
          {entry.description}
        </Text>
        <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
          {new Date(entry.date).toLocaleDateString("ar-SA")} {new Date(entry.date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
        </Text>
        {showVan && (
          <Text style={[styles.entryVanTag, { color: colors.primary, backgroundColor: colors.primary + "18" }]}>
            {vans.find((v) => v.id === entry.vanId)?.name || "—"}
          </Text>
        )}
      </View>
      <Text style={[styles.entryAmount, { color: isCollect ? "#22c55e" : "#ef4444", fontSize: compact ? 14 : 16 }]}>
        {isCollect ? "+" : "-"}{entry.amount.toFixed(2)}
        {"\n"}
        <Text style={{ fontSize: 10, color: colors.mutedForeground }}>د.أ</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBarWrap: { maxHeight: 52, borderBottomWidth: 1 },
  tabBarContent: { flexDirection: "row", paddingHorizontal: 8 },
  tabItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 14 },
  tabLabel: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  balanceBanner: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  balanceBannerSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Inter_400Regular" },
  balanceBannerAmt: { color: "#fff", fontSize: 38, fontWeight: "800", fontFamily: "Inter_700Bold" },
  totalSubRow: { flexDirection: "row", gap: 20, marginTop: 4 },
  totalSubText: { color: "#86efac", fontSize: 13, fontFamily: "Inter_500Medium" },
  vanBannerTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, alignItems: "center", gap: 4, padding: 12 },
  statVal: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  vanSummaryCard: { gap: 12 },
  vanSummaryHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  vanAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  vanSummaryName: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vanSummaryDriver: { fontSize: 12, fontFamily: "Inter_400Regular" },
  viewVanBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  viewVanText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  vanStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  vanStatItem: { flex: 1, alignItems: "center", gap: 4 },
  vanStatVal: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vanStatLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  vanStatSep: { width: 1, height: 30 },
  moreBtn: { alignItems: "center", paddingVertical: 6 },
  moreBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginBottom: 2,
  },
  entryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  entryInfo: { flex: 1 },
  entryDesc: { fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  entryDate: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  entryVanTag: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  entryAmount: { fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyBox: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 13, gap: 8, borderRadius: 12 },
  typeBtnText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8, textAlign: "right" },
  vanChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  vanChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  closeDayBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  closeDayTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  closeDaySub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
