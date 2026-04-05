import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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
import { StatCard } from "@/components/StatCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { exportReportPdf } from "@/hooks/usePdfInvoice";

type Period = "today" | "week" | "month";

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, invoices, expenses, cashEntries, vans, products, vanInventory, companySettings, saveReport } = useApp();
  const [period, setPeriod] = useState<Period>("today");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

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

  const filteredInvoices = invoices.filter((inv) => filterDate(inv.date));
  const filteredExpenses = expenses.filter((e) => filterDate(e.date));

  const totalSales = filteredInvoices.reduce((s, inv) => s + inv.total, 0);
  const totalPaid = filteredInvoices.reduce((s, inv) => s + inv.paid, 0);
  const totalRemaining = filteredInvoices.reduce((s, inv) => s + inv.remaining, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const totalCost = useMemo(() => {
    let cost = 0;
    for (const inv of filteredInvoices) {
      for (const item of inv.items) {
        const product = products.find((p) => p.id === item.productId);
        if (product) cost += product.costPrice * item.quantity;
      }
    }
    return cost;
  }, [filteredInvoices, products]);

  const grossProfit = totalSales - totalCost;
  const netProfit = grossProfit - totalExpenses;

  const vanStats = vans.map((van) => {
    const vanInvoices = filteredInvoices.filter((inv) => inv.vanId === van.id);
    const vanExpenses = filteredExpenses.filter((e) => e.vanId === van.id);
    const sales = vanInvoices.reduce((s, inv) => s + inv.total, 0);
    const exps = vanExpenses.reduce((s, e) => s + e.amount, 0);
    let cost = 0;
    for (const inv of vanInvoices) {
      for (const item of inv.items) {
        const product = products.find((p) => p.id === item.productId);
        if (product) cost += product.costPrice * item.quantity;
      }
    }
    return { van, sales, expenses: exps, profit: sales - cost - exps, invoiceCount: vanInvoices.length };
  });

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const inv of filteredInvoices) {
      for (const item of inv.items) {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.total;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredInvoices]);

  const periods = [
    { key: "today" as Period, label: "اليوم" },
    { key: "week" as Period, label: "الأسبوع" },
    { key: "month" as Period, label: "الشهر" },
  ];

  const periodLabel = periods.find((p) => p.key === period)?.label || "";

  // بناء بيانات التقرير (مُعاد الاستخدام)
  const buildReportPayload = () => ({
    period: periodLabel,
    totalSales,
    totalPaid,
    totalRemaining,
    totalExpenses,
    totalCost,
    grossProfit,
    netProfit,
    invoiceCount: filteredInvoices.length,
    vanStats: vanStats.map((v) => ({
      vanName: v.van.name,
      driverName: v.van.driverName,
      sales: v.sales,
      expenses: v.expenses,
      profit: v.profit,
      invoiceCount: v.invoiceCount,
    })),
    topProducts,
    invoices: filteredInvoices,
    expenses: filteredExpenses,
  });

  const handleExportPdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    await exportReportPdf(buildReportPayload(), companySettings);
    setPdfLoading(false);
  };

  const handleSaveReport = () => {
    if (saving) return;
    setSaving(true);

    // لقطة المخزون المتبقي مع أسماء المنتجات
    const inventorySnapshot: Record<string, Array<{ productId: string; productName: string; quantity: number }>> = {};
    for (const [vanId, items] of Object.entries(vanInventory)) {
      inventorySnapshot[vanId] = items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return { productId: item.productId, productName: product?.name || item.productId, quantity: item.quantity };
      });
    }

    saveReport({
      period: periodLabel,
      totalSales,
      totalPaid,
      totalRemaining,
      totalExpenses,
      totalCost,
      grossProfit,
      netProfit,
      invoiceCount: filteredInvoices.length,
      vanStats: vanStats.map((v) => ({
        vanName: v.van.name,
        driverName: v.van.driverName,
        sales: v.sales,
        expenses: v.expenses,
        profit: v.profit,
        invoiceCount: v.invoiceCount,
      })),
      topProducts,
      invoiceIds: filteredInvoices.map((inv) => inv.id),
      inventorySnapshot,
    });

    setTimeout(() => setSaving(false), 600);
    Alert.alert("تم الحفظ ✓", `تم حفظ تقرير "${periodLabel}" في الأرشيف مع لقطة المخزون`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="التقارير والأرباح"
        rightAction2={{
          icon: saving ? "check" : "save",
          onPress: handleSaveReport,
          label: saving ? "تم" : "حفظ",
        }}
        rightAction={{
          icon: pdfLoading ? "loader" : "file-text",
          onPress: handleExportPdf,
          label: pdfLoading ? "جاري..." : "PDF",
        }}
      />

      <View style={[styles.periodRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[
              styles.periodBtn,
              period === p.key && { backgroundColor: colors.primary, borderRadius: 8 },
            ]}
          >
            <Text
              style={[
                styles.periodText,
                { color: period === p.key ? "#fff" : colors.mutedForeground },
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: botPad + 20 }}>
        <View style={styles.statsGrid}>
          <StatCard label="إجمالي المبيعات" value={`${totalSales.toLocaleString()} د.أ`} icon="trending-up" color="#22c55e" />
          <StatCard label="المقبوض" value={`${totalPaid.toLocaleString()} د.أ`} icon="dollar-sign" color="#0891b2" />
        </View>
        <View style={styles.statsGrid}>
          <StatCard label="الآجل" value={`${totalRemaining.toLocaleString()} د.أ`} icon="clock" color="#f59e0b" />
          <StatCard label="المصاريف" value={`${totalExpenses.toLocaleString()} د.أ`} icon="trending-down" color="#ef4444" />
        </View>

        <Card style={styles.profitCard}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ملخص الأرباح</Text>
          <View style={styles.profitRow}>
            <Text style={[styles.profitLabel, { color: colors.mutedForeground }]}>إجمالي المبيعات</Text>
            <Text style={[styles.profitVal, { color: colors.foreground }]}>{totalSales.toLocaleString()} د.أ</Text>
          </View>
          <View style={styles.profitRow}>
            <Text style={[styles.profitLabel, { color: colors.mutedForeground }]}>تكلفة البضاعة</Text>
            <Text style={[styles.profitVal, { color: colors.destructive }]}>- {totalCost.toLocaleString()} د.أ</Text>
          </View>
          <View style={styles.profitRow}>
            <Text style={[styles.profitLabel, { color: colors.mutedForeground }]}>ربح إجمالي</Text>
            <Text style={[styles.profitVal, { color: colors.success }]}>{grossProfit.toLocaleString()} د.أ</Text>
          </View>
          <View style={styles.profitRow}>
            <Text style={[styles.profitLabel, { color: colors.mutedForeground }]}>المصاريف</Text>
            <Text style={[styles.profitVal, { color: colors.destructive }]}>- {totalExpenses.toLocaleString()} د.أ</Text>
          </View>
          <View style={[styles.profitDivider, { backgroundColor: colors.border }]} />
          <View style={styles.profitRow}>
            <Text style={[styles.profitTotalLabel, { color: colors.foreground }]}>صافي الربح</Text>
            <Text style={[styles.profitTotal, { color: netProfit >= 0 ? colors.success : colors.destructive }]}>
              {netProfit.toLocaleString()} د.أ
            </Text>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أداء كل فان</Text>
        {vanStats.map(({ van, sales, expenses: exps, profit, invoiceCount }) => (
          <Card key={van.id} style={styles.vanCard}>
            <View style={styles.vanHeader}>
              <View style={[styles.vanIcon, { backgroundColor: colors.secondary + "18" }]}>
                <Feather name="truck" size={20} color={colors.secondary} />
              </View>
              <View style={styles.vanInfo}>
                <Text style={[styles.vanName, { color: colors.foreground }]}>{van.name}</Text>
                <Text style={[styles.vanDriver, { color: colors.mutedForeground }]}>{van.driverName}</Text>
              </View>
              <Badge label={`${invoiceCount} فاتورة`} variant="primary" />
            </View>
            <View style={styles.vanStats}>
              <View style={styles.vanStat}>
                <Text style={[styles.vanStatVal, { color: colors.success }]}>{sales.toLocaleString()}</Text>
                <Text style={[styles.vanStatLabel, { color: colors.mutedForeground }]}>مبيعات</Text>
              </View>
              <View style={styles.vanStat}>
                <Text style={[styles.vanStatVal, { color: colors.destructive }]}>{exps.toLocaleString()}</Text>
                <Text style={[styles.vanStatLabel, { color: colors.mutedForeground }]}>مصاريف</Text>
              </View>
              <View style={styles.vanStat}>
                <Text style={[styles.vanStatVal, { color: profit >= 0 ? colors.success : colors.destructive }]}>
                  {profit.toLocaleString()}
                </Text>
                <Text style={[styles.vanStatLabel, { color: colors.mutedForeground }]}>ربح</Text>
              </View>
            </View>
          </Card>
        ))}

        {topProducts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أكثر المنتجات مبيعاً</Text>
            {topProducts.map((p, idx) => (
              <Card key={p.name} style={styles.productRow}>
                <Text style={[styles.rank, { color: colors.primary }]}>{idx + 1}</Text>
                <Text style={[styles.productName, { color: colors.foreground }]}>{p.name}</Text>
                <View style={styles.productStats}>
                  <Text style={[styles.productQty, { color: colors.mutedForeground }]}>{p.qty} علبة</Text>
                  <Text style={[styles.productRev, { color: colors.success }]}>{p.revenue.toLocaleString()} د.أ</Text>
                </View>
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
  periodRow: {
    flexDirection: "row",
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 8,
    justifyContent: "center",
  },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: "center" },
  periodText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", gap: 12 },
  profitCard: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right", marginTop: 4 },
  profitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  profitLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  profitVal: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  profitDivider: { height: 1, marginVertical: 6 },
  profitTotalLabel: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  profitTotal: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  vanCard: { gap: 12 },
  vanHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  vanIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  vanInfo: { flex: 1 },
  vanName: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  vanDriver: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  vanStats: { flexDirection: "row", justifyContent: "space-around" },
  vanStat: { alignItems: "center", gap: 4 },
  vanStatVal: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vanStatLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  productRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  rank: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold", width: 28, textAlign: "center" },
  productName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  productStats: { alignItems: "flex-end", gap: 2 },
  productQty: { fontSize: 12, fontFamily: "Inter_400Regular" },
  productRev: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
