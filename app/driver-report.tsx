import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { useApp } from "@/context/AppContext";
import type { Product } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { exportDriverReportPdf } from "@/hooks/usePdfInvoice";

type Period = "today" | "week" | "month";

function detectTier(unitPrice: number, product: Product | undefined): "low" | "high" | "special" {
  if (!product) return "low";
  if (product.priceSpecial > 0 && Math.abs(unitPrice - product.priceSpecial) < 0.05) return "special";
  const diffHigh = Math.abs(unitPrice - product.priceHigh);
  const diffLow = Math.abs(unitPrice - product.priceLow);
  return diffHigh <= diffLow ? "high" : "low";
}

export default function DriverReportScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, invoices, vans, products, companySettings } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [period, setPeriod] = useState<Period>("month");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [expandedVan, setExpandedVan] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "admin";
  const myVanId = currentUser?.vanId;

  const now = new Date();
  const filterDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "week") {
      const diff = now.getTime() - d.getTime();
      return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
    }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "اليوم" },
    { key: "week", label: "الأسبوع" },
    { key: "month", label: "الشهر" },
  ];
  const periodLabel = periods.find((p) => p.key === period)?.label || "";

  const targetVans = isAdmin ? vans : vans.filter((v) => v.id === myVanId);

  const driverStats = useMemo(() => {
    return targetVans.map((van) => {
      const vanInvoices = invoices.filter(
        (inv) => inv.vanId === van.id && filterDate(inv.date) && inv.status !== "cancelled"
      );

      const tier2Map: Record<string, { name: string; category: string; qty: number; value: number }> = {};
      const tier3Map: Record<string, { name: string; category: string; qty: number; value: number }> = {};
      const tier1Map: Record<string, { name: string; category: string; qty: number; value: number }> = {};
      const catMap: Record<string, { qty2: number; qty3: number; val2: number; val3: number }> = {};

      for (const inv of vanInvoices) {
        for (const item of inv.items) {
          const product = products.find((p) => p.id === item.productId);
          const category = product?.category || "أخرى";
          const tier = detectTier(item.unitPrice, product);

          if (!catMap[category]) catMap[category] = { qty2: 0, qty3: 0, val2: 0, val3: 0 };

          if (tier === "high") {
            if (!tier3Map[item.productId]) tier3Map[item.productId] = { name: item.productName, category, qty: 0, value: 0 };
            tier3Map[item.productId].qty += item.quantity;
            tier3Map[item.productId].value += item.total;
            catMap[category].qty3 += item.quantity;
            catMap[category].val3 += item.total;
          } else if (tier === "special") {
            if (!tier1Map[item.productId]) tier1Map[item.productId] = { name: item.productName, category, qty: 0, value: 0 };
            tier1Map[item.productId].qty += item.quantity;
            tier1Map[item.productId].value += item.total;
          } else {
            if (!tier2Map[item.productId]) tier2Map[item.productId] = { name: item.productName, category, qty: 0, value: 0 };
            tier2Map[item.productId].qty += item.quantity;
            tier2Map[item.productId].value += item.total;
            catMap[category].qty2 += item.quantity;
            catMap[category].val2 += item.total;
          }
        }
      }

      const tier2List = Object.values(tier2Map).sort((a, b) => b.qty - a.qty);
      const tier3List = Object.values(tier3Map).sort((a, b) => b.qty - a.qty);
      const tier1List = Object.values(tier1Map).sort((a, b) => b.qty - a.qty);

      return {
        van,
        invoiceCount: vanInvoices.length,
        tier2: {
          total: tier2List.reduce((s, i) => s + i.qty, 0),
          value: tier2List.reduce((s, i) => s + i.value, 0),
          byProduct: tier2List,
        },
        tier3: {
          total: tier3List.reduce((s, i) => s + i.qty, 0),
          value: tier3List.reduce((s, i) => s + i.value, 0),
          byProduct: tier3List,
        },
        tier1: {
          total: tier1List.reduce((s, i) => s + i.qty, 0),
          value: tier1List.reduce((s, i) => s + i.value, 0),
          byProduct: tier1List,
        },
        byCategory: catMap,
      };
    });
  }, [targetVans, invoices, products, period]);

  const handleExportPdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      await exportDriverReportPdf({
        period: periodLabel,
        dateStr: now.toLocaleDateString("ar-SA"),
        companySettings,
        drivers: driverStats.map((d) => ({
          vanName: d.van.name,
          driverName: d.van.driverName,
          tier2: d.tier2,
          tier3: d.tier3,
          tier1: d.tier1,
          byCategory: d.byCategory,
        })),
      });
    } catch {
      Alert.alert("خطأ", "تعذّر تصدير PDF");
    }
    setPdfLoading(false);
  };

  const totalBoxes2 = driverStats.reduce((s, d) => s + d.tier2.total, 0);
  const totalBoxes3 = driverStats.reduce((s, d) => s + d.tier3.total, 0);
  const totalVal2 = driverStats.reduce((s, d) => s + d.tier2.value, 0);
  const totalVal3 = driverStats.reduce((s, d) => s + d.tier3.value, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={isAdmin ? "تقرير المندوبين" : "تقريري"}
        showBack
        rightAction={{ icon: pdfLoading ? "loader" : "file-text", onPress: handleExportPdf, label: pdfLoading ? "جاري..." : "PDF" }}
      />

      {/* ─── اختيار الفترة ─── */}
      <View style={[styles.periodRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[styles.periodBtn, period === p.key && { backgroundColor: colors.primary, borderRadius: 8 }]}
          >
            <Text style={[styles.periodText, { color: period === p.key ? "#fff" : colors.mutedForeground }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>

        {/* ─── ملخص إجمالي للمدير ─── */}
        {isAdmin && (
          <View style={[styles.totalCard, { backgroundColor: "#1e293b" }]}>
            <Text style={styles.totalTitle}>الإجمالي الكلي — {periodLabel}</Text>
            <View style={styles.totalRow}>
              <View style={styles.totalItem}>
                <Text style={[styles.totalQty, { color: "#60a5fa" }]}>{totalBoxes2.toLocaleString()}</Text>
                <Text style={styles.totalLbl}>كروز سعر 2</Text>
                <Text style={[styles.totalVal, { color: "#93c5fd" }]}>{totalVal2.toFixed(2)} د.أ</Text>
              </View>
              <View style={[styles.totalDivider, { backgroundColor: "#334155" }]} />
              <View style={styles.totalItem}>
                <Text style={[styles.totalQty, { color: "#4ade80" }]}>{totalBoxes3.toLocaleString()}</Text>
                <Text style={styles.totalLbl}>كروز سعر 3</Text>
                <Text style={[styles.totalVal, { color: "#86efac" }]}>{totalVal3.toFixed(2)} د.أ</Text>
              </View>
              <View style={[styles.totalDivider, { backgroundColor: "#334155" }]} />
              <View style={styles.totalItem}>
                <Text style={[styles.totalQty, { color: "#fbbf24" }]}>
                  {(totalBoxes2 + totalBoxes3).toLocaleString()}
                </Text>
                <Text style={styles.totalLbl}>إجمالي الكروزات</Text>
                <Text style={[styles.totalVal, { color: "#fde68a" }]}>
                  {(totalVal2 + totalVal3).toFixed(2)} د.أ
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── بطاقة كل مندوب ─── */}
        {driverStats.map((d) => {
          const isExpanded = expandedVan === d.van.id;
          const hasData = d.tier2.total + d.tier3.total + d.tier1.total > 0;

          return (
            <Card key={d.van.id} style={[styles.driverCard, { borderRightWidth: 4, borderRightColor: "#e8531d" }]}>
              {/* رأس المندوب */}
              <TouchableOpacity
                onPress={() => setExpandedVan(isExpanded ? null : d.van.id)}
                style={styles.driverHeader}
                activeOpacity={0.7}
              >
                <View style={[styles.driverAvatar, { backgroundColor: "#e8531d20" }]}>
                  <Feather name="user" size={18} color="#e8531d" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.driverName, { color: colors.foreground }]}>{d.van.driverName}</Text>
                  <Text style={[styles.driverVan, { color: colors.mutedForeground }]}>
                    {d.van.name} · {d.invoiceCount} فاتورة
                  </Text>
                </View>
                <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>

              {/* ملخص الأسعار */}
              <View style={[styles.tierSummary, { borderTopColor: colors.border }]}>
                <View style={styles.tierBox}>
                  <Text style={[styles.tierNum, { color: "#1d4ed8" }]}>{d.tier2.total}</Text>
                  <Text style={[styles.tierLbl, { color: colors.mutedForeground }]}>كروز سعر 2</Text>
                  <Text style={[styles.tierVal, { color: "#1d4ed8" }]}>{d.tier2.value.toFixed(2)}</Text>
                </View>
                <View style={[styles.tierDivider, { backgroundColor: colors.border }]} />
                <View style={styles.tierBox}>
                  <Text style={[styles.tierNum, { color: "#059669" }]}>{d.tier3.total}</Text>
                  <Text style={[styles.tierLbl, { color: colors.mutedForeground }]}>كروز سعر 3</Text>
                  <Text style={[styles.tierVal, { color: "#059669" }]}>{d.tier3.value.toFixed(2)}</Text>
                </View>
                {d.tier1.total > 0 && (
                  <>
                    <View style={[styles.tierDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.tierBox}>
                      <Text style={[styles.tierNum, { color: "#e67e22" }]}>{d.tier1.total}</Text>
                      <Text style={[styles.tierLbl, { color: colors.mutedForeground }]}>كروز سعر 1</Text>
                      <Text style={[styles.tierVal, { color: "#e67e22" }]}>{d.tier1.value.toFixed(2)}</Text>
                    </View>
                  </>
                )}
              </View>

              {/* التفاصيل المفتوحة */}
              {isExpanded && hasData && (
                <View style={[styles.expandedArea, { borderTopColor: colors.border }]}>

                  {/* حسب الفئة */}
                  {Object.keys(d.byCategory).length > 0 && (
                    <>
                      <Text style={[styles.sectionLbl, { color: colors.mutedForeground, backgroundColor: colors.accent }]}>
                        حسب الفئة
                      </Text>
                      {Object.entries(d.byCategory)
                        .sort((a, b) => (b[1].qty2 + b[1].qty3) - (a[1].qty2 + a[1].qty3))
                        .map(([cat, c]) => (
                          <View key={cat} style={[styles.catRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.catName, { color: colors.foreground }]}>{cat}</Text>
                            <View style={styles.catNums}>
                              <View style={styles.catNum}>
                                <Text style={[styles.catNumVal, { color: "#1d4ed8" }]}>{c.qty2}</Text>
                                <Text style={[styles.catNumLbl, { color: colors.mutedForeground }]}>س2</Text>
                              </View>
                              <View style={styles.catNum}>
                                <Text style={[styles.catNumVal, { color: "#059669" }]}>{c.qty3}</Text>
                                <Text style={[styles.catNumLbl, { color: colors.mutedForeground }]}>س3</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                    </>
                  )}

                  {/* سعر 2 تفصيل */}
                  {d.tier2.byProduct.length > 0 && (
                    <>
                      <Text style={[styles.sectionLbl, { color: "#1d4ed8", backgroundColor: "#eff6ff" }]}>
                        سعر 2 — تفصيل المنتجات
                      </Text>
                      {d.tier2.byProduct.map((p) => (
                        <View key={p.name} style={[styles.productRow, { borderBottomColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                            <Text style={[styles.productCat, { color: colors.mutedForeground }]}>{p.category}</Text>
                          </View>
                          <View style={styles.productRight}>
                            <Text style={[styles.productQty, { color: "#1d4ed8" }]}>{p.qty} كروز</Text>
                            <Text style={[styles.productVal, { color: colors.mutedForeground }]}>{p.value.toFixed(2)} د.أ</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}

                  {/* سعر 3 تفصيل */}
                  {d.tier3.byProduct.length > 0 && (
                    <>
                      <Text style={[styles.sectionLbl, { color: "#059669", backgroundColor: "#f0fdf4" }]}>
                        سعر 3 — تفصيل المنتجات
                      </Text>
                      {d.tier3.byProduct.map((p) => (
                        <View key={p.name} style={[styles.productRow, { borderBottomColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                            <Text style={[styles.productCat, { color: colors.mutedForeground }]}>{p.category}</Text>
                          </View>
                          <View style={styles.productRight}>
                            <Text style={[styles.productQty, { color: "#059669" }]}>{p.qty} كروز</Text>
                            <Text style={[styles.productVal, { color: colors.mutedForeground }]}>{p.value.toFixed(2)} د.أ</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}

                  {/* سعر 1 تفصيل */}
                  {d.tier1.byProduct.length > 0 && (
                    <>
                      <Text style={[styles.sectionLbl, { color: "#e67e22", backgroundColor: "#fff7ed" }]}>
                        سعر 1 — تفصيل المنتجات
                      </Text>
                      {d.tier1.byProduct.map((p) => (
                        <View key={p.name} style={[styles.productRow, { borderBottomColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                            <Text style={[styles.productCat, { color: colors.mutedForeground }]}>{p.category}</Text>
                          </View>
                          <View style={styles.productRight}>
                            <Text style={[styles.productQty, { color: "#e67e22" }]}>{p.qty} كروز</Text>
                            <Text style={[styles.productVal, { color: colors.mutedForeground }]}>{p.value.toFixed(2)} د.أ</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )}

              {isExpanded && !hasData && (
                <View style={[styles.noData, { borderTopColor: colors.border }]}>
                  <Feather name="inbox" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.noDataText, { color: colors.mutedForeground }]}>لا يوجد مبيعات في هذه الفترة</Text>
                </View>
              )}
            </Card>
          );
        })}

        {/* زر PDF */}
        <TouchableOpacity
          onPress={handleExportPdf}
          style={[styles.pdfBtn, { backgroundColor: "#dc2626" }]}
          activeOpacity={0.85}
        >
          <Feather name={pdfLoading ? "loader" : "file-text"} size={18} color="#fff" />
          <Text style={styles.pdfBtnText}>
            {pdfLoading ? "جاري التصدير..." : `تصدير تقرير ${periodLabel} PDF`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  periodRow: {
    flexDirection: "row", padding: 8, gap: 6,
    borderBottomWidth: 1,
  },
  periodBtn: { flex: 1, alignItems: "center", paddingVertical: 8 },
  periodText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  totalCard: {
    borderRadius: 14, padding: 16, gap: 12,
  },
  totalTitle: { color: "#94a3b8", fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  totalRow: { flexDirection: "row", alignItems: "center" },
  totalItem: { flex: 1, alignItems: "center", gap: 4 },
  totalDivider: { width: 1, height: 50, marginHorizontal: 4 },
  totalQty: { fontSize: 22, fontFamily: "Inter_700Bold", fontWeight: "900" },
  totalLbl: { color: "#94a3b8", fontSize: 11, fontFamily: "Inter_400Regular" },
  totalVal: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  driverCard: { gap: 0, padding: 0, overflow: "hidden" },
  driverHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  driverAvatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
  },
  driverName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  driverVan: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  tierSummary: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 12 },
  tierBox: { flex: 1, alignItems: "center", gap: 3 },
  tierDivider: { width: 1 },
  tierNum: { fontSize: 20, fontFamily: "Inter_700Bold", fontWeight: "900" },
  tierLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tierVal: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  expandedArea: { borderTopWidth: 1 },
  sectionLbl: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    paddingVertical: 7, paddingHorizontal: 14,
  },
  catRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1,
  },
  catName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  catNums: { flexDirection: "row", gap: 16 },
  catNum: { alignItems: "center", gap: 2 },
  catNumVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  catNumLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  productRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1,
  },
  productName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  productCat: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  productRight: { alignItems: "flex-end", gap: 2 },
  productQty: { fontSize: 14, fontFamily: "Inter_700Bold" },
  productVal: { fontSize: 11, fontFamily: "Inter_400Regular" },
  noData: { borderTopWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  noDataText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pdfBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 14, borderRadius: 12,
  },
  pdfBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
