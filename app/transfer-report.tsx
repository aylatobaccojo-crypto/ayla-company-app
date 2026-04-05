import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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
import { StatCard } from "@/components/StatCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Period = "today" | "week" | "month" | "all";
type DirectionFilter = "all" | "out" | "in" | "main";

interface UnifiedEntry {
  id: string;
  transferRef?: string;
  date: string;
  type: "main_to_van" | "van_to_van";
  fromLabel: string;
  toLabel: string;
  fromVanId?: string;
  toVanId?: string;
  items: { productName: string; quantity: number }[];
  totalBoxes: number;
  notes?: string;
  status: "done" | "approved";
}

export default function TransferReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, vans, transfers, vanTransferRequests } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isAdmin = currentUser?.role === "admin";
  const myVanId = currentUser?.vanId || "";
  const [period, setPeriod] = useState<Period>("all");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [vanFilter, setVanFilter] = useState<string>("all");

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    if (period === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    if (period === "month") { const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
    return null;
  }, [period]);

  const inPeriod = (dateStr: string) => {
    if (!periodStart) return true;
    return new Date(dateStr) >= periodStart;
  };

  // بناء القائمة الموحّدة
  const allEntries: UnifiedEntry[] = useMemo(() => {
    const result: UnifiedEntry[] = [];

    // تحويلات المستودع → الفانات
    for (const t of transfers) {
      result.push({
        id: t.id,
        transferRef: t.transferRef,
        date: t.date,
        type: "main_to_van",
        fromLabel: "المستودع الرئيسي",
        toLabel: t.vanName,
        toVanId: t.vanId,
        items: t.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
        totalBoxes: t.items.reduce((s, i) => s + i.quantity, 0),
        notes: t.notes,
        status: "done",
      });
    }

    // تحويلات فان → فان (المقبولة فقط)
    for (const r of (vanTransferRequests || [])) {
      if (r.status !== "approved") continue;
      result.push({
        id: r.id,
        transferRef: r.transferRef,
        date: r.date,
        type: "van_to_van",
        fromLabel: r.fromVanName,
        toLabel: r.toVanName,
        fromVanId: r.fromVanId,
        toVanId: r.toVanId,
        items: r.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
        totalBoxes: r.items.reduce((s, i) => s + i.quantity, 0),
        notes: r.notes,
        status: "approved",
      });
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transfers, vanTransferRequests]);

  // فلترة حسب الدور
  const visibleEntries = useMemo(() => {
    return allEntries.filter((e) => {
      // فلتر الفترة
      if (!inPeriod(e.date)) return false;

      // للمندوب: يرى فقط ما يخصه
      if (!isAdmin) {
        const isReceiver = e.toVanId === myVanId;
        const isSender = e.fromVanId === myVanId;
        const isMainToMe = e.type === "main_to_van" && e.toVanId === myVanId;
        if (!isReceiver && !isSender && !isMainToMe) return false;

        // فلتر الاتجاه
        if (direction === "out" && !isSender) return false;
        if (direction === "in" && !isReceiver && !isMainToMe) return false;
        if (direction === "main" && e.type !== "main_to_van") return false;
      } else {
        // للمدير: فلتر الفان
        if (vanFilter !== "all") {
          if (e.toVanId !== vanFilter && e.fromVanId !== vanFilter) return false;
        }
        // فلتر الاتجاه للمدير
        if (direction === "main" && e.type !== "main_to_van") return false;
        if (direction === "out" && e.type !== "van_to_van") return false;
        if (direction === "in" && e.type !== "van_to_van") return false;
      }

      return true;
    });
  }, [allEntries, period, direction, vanFilter, isAdmin, myVanId, periodStart]);

  const totalBoxes = visibleEntries.reduce((s, e) => s + e.totalBoxes, 0);
  const totalTransfers = visibleEntries.length;
  const mainToVanCount = visibleEntries.filter((e) => e.type === "main_to_van").length;
  const vanToVanCount = visibleEntries.filter((e) => e.type === "van_to_van").length;

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "اليوم" },
    { key: "week", label: "أسبوع" },
    { key: "month", label: "الشهر" },
    { key: "all", label: "الكل" },
  ];

  const dirFilters = isAdmin
    ? [
        { key: "all" as DirectionFilter, label: "الكل" },
        { key: "main" as DirectionFilter, label: "مستودع→فان" },
        { key: "out" as DirectionFilter, label: "فان→فان" },
      ]
    : [
        { key: "all" as DirectionFilter, label: "الكل" },
        { key: "in" as DirectionFilter, label: "وارد" },
        { key: "out" as DirectionFilter, label: "صادر" },
        { key: "main" as DirectionFilter, label: "من المستودع" },
      ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="تقرير التحويلات"
        subtitle={isAdmin ? "جميع الحركات" : "حركاتي"}
        showBack
      />

      <ScrollView contentContainerStyle={{ paddingBottom: botPad + 20 }} stickyHeaderIndices={[0]}>
        {/* ─── فلاتر (ثابتة أعلى) ─── */}
        <View style={[styles.filtersContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {/* الفترة */}
          <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPeriod(p.key)}
                style={[styles.filterChip, {
                  backgroundColor: period === p.key ? colors.primary : colors.muted,
                  borderColor: period === p.key ? colors.primary : colors.border,
                }]}
              >
                <Text style={[styles.filterChipText, { color: period === p.key ? "#fff" : colors.foreground }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* الاتجاه */}
          <View style={styles.filterRow}>
            {dirFilters.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setDirection(f.key)}
                style={[styles.filterChip, {
                  backgroundColor: direction === f.key ? "#0891b2" : colors.muted,
                  borderColor: direction === f.key ? "#0891b2" : colors.border,
                }]}
              >
                <Text style={[styles.filterChipText, { color: direction === f.key ? "#fff" : colors.foreground }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* فلتر الفان — للمدير فقط */}
          {isAdmin && (
            <View style={[styles.filterRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setVanFilter("all")}
                style={[styles.filterChip, {
                  backgroundColor: vanFilter === "all" ? "#7c3aed" : colors.muted,
                  borderColor: vanFilter === "all" ? "#7c3aed" : colors.border,
                }]}
              >
                <Text style={[styles.filterChipText, { color: vanFilter === "all" ? "#fff" : colors.foreground }]}>
                  جميع الفانات
                </Text>
              </TouchableOpacity>
              {vans.map((van) => (
                <TouchableOpacity
                  key={van.id}
                  onPress={() => setVanFilter(van.id)}
                  style={[styles.filterChip, {
                    backgroundColor: vanFilter === van.id ? "#7c3aed" : colors.muted,
                    borderColor: vanFilter === van.id ? "#7c3aed" : colors.border,
                  }]}
                >
                  <Text style={[styles.filterChipText, { color: vanFilter === van.id ? "#fff" : colors.foreground }]}>
                    {van.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          {/* ─── بطاقات الملخص ─── */}
          <View style={styles.statsRow}>
            <StatCard
              label="إجمالي التحويلات"
              value={String(totalTransfers)}
              icon="repeat"
              style={{ flex: 1 }}
            />
            <StatCard
              label="إجمالي الكروز"
              value={String(totalBoxes)}
              icon="package"
              style={{ flex: 1 }}
            />
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.miniStat, { backgroundColor: "#e8531d12", borderColor: "#e8531d30", borderRadius: colors.radius }]}>
              <Text style={[styles.miniStatVal, { color: "#e8531d" }]}>{mainToVanCount}</Text>
              <Text style={[styles.miniStatLbl, { color: colors.mutedForeground }]}>مستودع → فان</Text>
            </View>
            <View style={[styles.miniStat, { backgroundColor: "#0891b212", borderColor: "#0891b230", borderRadius: colors.radius }]}>
              <Text style={[styles.miniStatVal, { color: "#0891b2" }]}>{vanToVanCount}</Text>
              <Text style={[styles.miniStatLbl, { color: colors.mutedForeground }]}>فان → فان</Text>
            </View>
          </View>

          {/* ─── القائمة ─── */}
          {visibleEntries.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="inbox" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد تحويلات في هذه الفترة</Text>
            </View>
          ) : (
            visibleEntries.map((entry) => {
              const isVanToVan = entry.type === "van_to_van";
              const iAmSender = entry.fromVanId === myVanId;
              const iAmReceiver = entry.toVanId === myVanId;

              // لون البطاقة حسب الاتجاه بالنسبة للمندوب
              let cardAccentColor = "#e8531d"; // مستودع→فان (نارنجي)
              if (isVanToVan) cardAccentColor = iAmSender ? "#dc2626" : "#22c55e";

              return (
                <Card key={entry.id} style={[styles.entryCard, { borderRightWidth: 3, borderRightColor: cardAccentColor }]}>
                  {/* ─── رأس البطاقة ─── */}
                  <View style={styles.entryHeader}>
                    <View style={styles.entryMeta}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        {entry.transferRef ? (
                          <View style={{ backgroundColor: cardAccentColor, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>{entry.transferRef}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>
                        {new Date(entry.date).toLocaleDateString("ar-SA", { day: "2-digit", month: "short", year: "numeric" })}
                      </Text>
                      <Text style={[styles.entryTime, { color: colors.mutedForeground }]}>
                        {new Date(entry.date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <View style={styles.entryBadges}>
                      {isVanToVan ? (
                        <Badge label="فان → فان" variant="primary" />
                      ) : (
                        <Badge label="مستودع" variant="warning" />
                      )}
                      {!isAdmin && (
                        iAmSender
                          ? <Badge label="صادر ↑" variant="destructive" />
                          : <Badge label="وارد ↓" variant="success" />
                      )}
                    </View>
                  </View>

                  {/* ─── اتجاه التحويل ─── */}
                  <View style={[styles.flowRow, { backgroundColor: colors.accent, borderRadius: 10 }]}>
                    {/* المُرسِل */}
                    <View style={styles.flowSide}>
                      <View style={[styles.flowIcon, { backgroundColor: isVanToVan ? "#dc262618" : "#e8531d18" }]}>
                        <Feather
                          name={isVanToVan ? "truck" : "home"}
                          size={15}
                          color={isVanToVan ? "#dc2626" : "#e8531d"}
                        />
                      </View>
                      <Text style={[styles.flowLabel, { color: colors.foreground }]} numberOfLines={1}>
                        {entry.fromLabel}
                      </Text>
                      {!isAdmin && iAmSender && (
                        <Text style={[styles.youLabel, { color: "#dc2626" }]}>أنت</Text>
                      )}
                    </View>

                    {/* السهم + عدد الكروز */}
                    <View style={styles.flowArrow}>
                      <Feather name="arrow-left" size={18} color={colors.mutedForeground} />
                      <View style={[styles.boxesBubble, { backgroundColor: cardAccentColor }]}>
                        <Text style={styles.boxesBubbleText}>{entry.totalBoxes} كروز</Text>
                      </View>
                    </View>

                    {/* المُستلم */}
                    <View style={styles.flowSide}>
                      <View style={[styles.flowIcon, { backgroundColor: "#22c55e18" }]}>
                        <Feather name="truck" size={15} color="#22c55e" />
                      </View>
                      <Text style={[styles.flowLabel, { color: colors.primary }]} numberOfLines={1}>
                        {entry.toLabel}
                      </Text>
                      {!isAdmin && iAmReceiver && (
                        <Text style={[styles.youLabel, { color: "#22c55e" }]}>أنت</Text>
                      )}
                    </View>
                  </View>

                  {/* ─── الأصناف ─── */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {entry.items.map((item, idx) => (
                      <View key={idx} style={[styles.itemPill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                        <Text style={[styles.itemPillName, { color: colors.foreground }]}>{item.productName}</Text>
                        <View style={[styles.itemPillQty, { backgroundColor: cardAccentColor }]}>
                          <Text style={styles.itemPillQtyText}>{item.quantity}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* ─── ملاحظات ─── */}
                  {entry.notes ? (
                    <View style={[styles.notesRow, { backgroundColor: colors.accent, borderRadius: 8 }]}>
                      <Feather name="message-circle" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.notesText, { color: colors.mutedForeground }]}>{entry.notes}</Text>
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // فلاتر
  filtersContainer: { borderBottomWidth: 1, gap: 0 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 10 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // ملخص
  statsRow: { flexDirection: "row", gap: 12 },
  miniStat: {
    flex: 1, alignItems: "center", padding: 12,
    borderWidth: 1, gap: 4,
  },
  miniStatVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  miniStatLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // قائمة فارغة
  empty: { alignItems: "center", gap: 12, paddingVertical: 60 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  // بطاقة التحويل
  entryCard: { gap: 10, overflow: "hidden" },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  entryMeta: { gap: 2 },
  entryDate: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  entryTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  entryBadges: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },

  // تدفق التحويل
  flowRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", padding: 10,
  },
  flowSide: { flex: 1, alignItems: "center", gap: 4 },
  flowIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  flowLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  youLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  flowArrow: { alignItems: "center", gap: 4, paddingHorizontal: 4 },
  boxesBubble: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  boxesBubbleText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  // أصناف
  itemPill: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 20, overflow: "hidden",
    gap: 0,
  },
  itemPillName: { fontSize: 11, fontFamily: "Inter_400Regular", paddingHorizontal: 8, paddingVertical: 4 },
  itemPillQty: { paddingHorizontal: 7, paddingVertical: 4 },
  itemPillQtyText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  // ملاحظات
  notesRow: { flexDirection: "row", gap: 6, padding: 8, alignItems: "flex-start" },
  notesText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
});
