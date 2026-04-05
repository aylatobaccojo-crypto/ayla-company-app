import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import type { SavedReport } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { exportReportPdf } from "@/hooks/usePdfInvoice";

export default function SavedReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { savedReports, deleteReport, invoices, vans, companySettings } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const allReports = savedReports || [];

  const handleDelete = (report: SavedReport) => {
    Alert.alert(
      "حذف التقرير",
      `هل تريد حذف تقرير "${report.period}" المحفوظ بتاريخ ${new Date(report.savedAt).toLocaleDateString("ar-SA")}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: () => deleteReport(report.id) },
      ]
    );
  };

  const handleExportPdf = async (report: SavedReport) => {
    if (pdfLoadingId) return;
    setPdfLoadingId(report.id);
    const reportInvoices = invoices.filter((inv) => report.invoiceIds.includes(inv.id));
    await exportReportPdf(
      {
        period: report.period,
        totalSales: report.totalSales,
        totalPaid: report.totalPaid,
        totalRemaining: report.totalRemaining,
        totalExpenses: report.totalExpenses,
        totalCost: report.totalCost,
        grossProfit: report.grossProfit,
        netProfit: report.netProfit,
        invoiceCount: report.invoiceCount,
        vanStats: report.vanStats,
        topProducts: report.topProducts,
        invoices: reportInvoices,
        expenses: [],
      },
      companySettings
    );
    setPdfLoadingId(null);
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("ar-SA")} - ${d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="أرشيف التقارير" showBack />

      {allReports.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="archive" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد تقارير محفوظة</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            اذهب إلى شاشة التقارير واضغط زر الحفظ 💾 لأرشفة التقرير
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 12 }}>

          {/* شريط المعلومات */}
          <View style={[styles.infoBar, { backgroundColor: "#0f766e15", borderColor: "#0f766e40", borderWidth: 1, borderRadius: 12 }]}>
            <Feather name="info" size={16} color="#0f766e" />
            <Text style={[styles.infoText, { color: "#0f766e" }]}>
              {allReports.length} تقرير محفوظ — يمكن تصديرها PDF أو حذفها
            </Text>
          </View>

          {allReports.map((report) => {
            const isExpanded = expandedId === report.id;
            const isPdfLoading = pdfLoadingId === report.id;
            const netColor = report.netProfit >= 0 ? "#059669" : "#dc2626";

            return (
              <Card key={report.id} style={styles.reportCard}>
                {/* رأس التقرير */}
                <TouchableOpacity
                  style={styles.reportHeader}
                  onPress={() => setExpandedId(isExpanded ? null : report.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.reportHeaderLeft}>
                    <View style={[styles.periodBadge, { backgroundColor: "#0f766e20" }]}>
                      <Text style={[styles.periodText, { color: "#0f766e" }]}>{report.period}</Text>
                    </View>
                    <View style={styles.reportMeta}>
                      <Text style={[styles.reportDate, { color: colors.foreground }]}>{fmtDate(report.savedAt)}</Text>
                      <Text style={[styles.reportSub, { color: colors.mutedForeground }]}>
                        {report.invoiceCount} فاتورة
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reportHeaderRight}>
                    <Text style={[styles.netLabel, { color: colors.mutedForeground }]}>صافي الربح</Text>
                    <Text style={[styles.netValue, { color: netColor }]}>{report.netProfit.toFixed(2)} د.أ</Text>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
                  </View>
                </TouchableOpacity>

                {/* ملخص سريع دائم */}
                <View style={styles.quickStats}>
                  <QuickStat label="مبيعات" value={report.totalSales.toFixed(2)} color="#059669" />
                  <QuickStat label="مقبوض" value={report.totalPaid.toFixed(2)} color="#1d4ed8" />
                  <QuickStat label="آجل" value={report.totalRemaining.toFixed(2)} color="#d97706" />
                  <QuickStat label="مصاريف" value={report.totalExpenses.toFixed(2)} color="#dc2626" />
                </View>

                {/* التفاصيل الموسّعة */}
                {isExpanded && (
                  <View style={[styles.expandedSection, { borderTopColor: colors.border, borderTopWidth: 1 }]}>

                    {/* أداء الفانات */}
                    {report.vanStats.length > 0 && (
                      <>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أداء الفانات</Text>
                        {report.vanStats.map((v, idx) => (
                          <View key={idx} style={[styles.vanRow, { borderBottomColor: colors.border }]}>
                            <View style={styles.vanInfo}>
                              <Text style={[styles.vanName, { color: colors.foreground }]}>{v.vanName}</Text>
                              <Text style={[styles.vanDriver, { color: colors.mutedForeground }]}>{v.driverName}</Text>
                            </View>
                            <View style={styles.vanNums}>
                              <Text style={{ color: "#059669", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>{v.sales.toFixed(2)}</Text>
                              <Text style={{ color: "#dc2626", fontSize: 11, fontFamily: "Inter_400Regular" }}>- {v.expenses.toFixed(2)}</Text>
                              <Text style={{ color: v.profit >= 0 ? "#059669" : "#dc2626", fontSize: 13, fontWeight: "bold", fontFamily: "Inter_700Bold" }}>{v.profit.toFixed(2)} د.أ</Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )}

                    {/* أكثر المنتجات مبيعاً */}
                    {report.topProducts.length > 0 && (
                      <>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أكثر الأصناف مبيعاً</Text>
                        {report.topProducts.map((p, idx) => (
                          <View key={idx} style={styles.productRow}>
                            <Text style={[styles.productRank, { color: colors.primary }]}>{idx + 1}</Text>
                            <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                            <Text style={[styles.productQty, { color: colors.mutedForeground }]}>{p.qty} علبة</Text>
                            <Text style={[styles.productRev, { color: "#059669" }]}>{p.revenue.toFixed(2)} د.أ</Text>
                          </View>
                        ))}
                      </>
                    )}

                    {/* لقطة المخزون المتبقي */}
                    {Object.keys(report.inventorySnapshot || {}).length > 0 && (
                      <>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>المخزون المتبقي (لحظة الحفظ)</Text>
                        {Object.entries(report.inventorySnapshot).map(([vanId, items]) => {
                          const van = vans.find((v) => v.id === vanId);
                          const hasItems = items.some((i) => i.quantity > 0);
                          if (!hasItems) return null;
                          return (
                            <View key={vanId} style={[styles.inventoryBox, { backgroundColor: colors.accent, borderRadius: 10 }]}>
                              <Text style={[styles.inventoryVan, { color: colors.foreground }]}>
                                {vanId === "main" ? "🏭 المستودع الرئيسي" : `🚐 ${van?.name || vanId}`}
                              </Text>
                              {items.filter((i) => i.quantity > 0).map((item) => (
                                <View key={item.productId} style={styles.inventoryRow}>
                                  <Text style={[styles.inventoryName, { color: colors.foreground }]} numberOfLines={1}>{item.productName}</Text>
                                  <Badge label={`${item.quantity} علبة`} variant="muted" />
                                </View>
                              ))}
                            </View>
                          );
                        })}
                      </>
                    )}

                    {/* أزرار الإجراءات */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#e8531d15", borderColor: "#e8531d" }]}
                        onPress={() => handleExportPdf(report)}
                        disabled={!!pdfLoadingId}
                      >
                        <Feather name={isPdfLoading ? "loader" : "file-text"} size={16} color="#e8531d" />
                        <Text style={[styles.actionText, { color: "#e8531d" }]}>PDF</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#dc262615", borderColor: "#dc2626" }]}
                        onPress={() => handleDelete(report)}
                      >
                        <Feather name="trash-2" size={16} color="#dc2626" />
                        <Text style={[styles.actionText, { color: "#dc2626" }]}>حذف</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.quickStat}>
      <Text style={[styles.quickStatVal, { color }]}>{value}</Text>
      <Text style={[styles.quickStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  infoBar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
  reportCard: { gap: 0, padding: 0, overflow: "hidden" },
  reportHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  reportHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  periodBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  periodText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  reportMeta: { flex: 1 },
  reportDate: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  reportSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  reportHeaderRight: { alignItems: "flex-end", gap: 2 },
  netLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  netValue: { fontSize: 15, fontWeight: "800", fontFamily: "Inter_700Bold" },
  quickStats: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 14, paddingBottom: 12 },
  quickStat: { alignItems: "center", gap: 2 },
  quickStatVal: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  quickStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  expandedSection: { marginTop: 4, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right", paddingRight: 8, borderRightWidth: 3, borderRightColor: "#e8531d" },
  vanRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1 },
  vanInfo: { flex: 1 },
  vanName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  vanDriver: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  vanNums: { alignItems: "flex-end", gap: 2 },
  productRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  productRank: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold", width: 24, textAlign: "center" },
  productName: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  productQty: { fontSize: 11, fontFamily: "Inter_400Regular" },
  productRev: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  inventoryBox: { padding: 12, gap: 8 },
  inventoryVan: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 4 },
  inventoryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  inventoryName: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  actionText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
