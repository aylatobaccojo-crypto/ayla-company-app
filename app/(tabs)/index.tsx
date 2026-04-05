import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
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
import { StatCard } from "@/components/StatCard";
import { PrinterCard } from "@/components/PrinterCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser, vans, invoices, expenses, cashEntries, vanInventory, products, customers, getVanBalance, priceApprovalRequests, vanTransferRequests, messages } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (!currentUser) {
      router.replace("/login");
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";
  const today = new Date().toDateString();

  const todayInvoices = invoices.filter(
    (inv) =>
      new Date(inv.date).toDateString() === today &&
      (isAdmin || inv.vanId === currentUser.vanId)
  );
  const todaySales = todayInvoices.reduce((s, inv) => s + inv.total, 0);
  const todayCount = todayInvoices.length;

  const vanId = currentUser.vanId;
  const vanBalance = vanId ? getVanBalance(vanId) : 0;

  const vanInv = vanId ? (vanInventory[vanId] || []) : [];
  const lowStock = vanInv.filter((vi) => vi.quantity < 10).length;
  const totalVanItems = vanInv.reduce((s, vi) => s + vi.quantity, 0);
  const totalVanSKUs = vanInv.filter((vi) => vi.quantity > 0).length;

  const totalSales = invoices
    .filter((inv) => isAdmin || inv.vanId === vanId)
    .reduce((s, inv) => s + inv.total, 0);

  const totalExpenses = expenses
    .filter((e) => isAdmin || e.vanId === vanId)
    .reduce((s, e) => s + e.amount, 0);

  const pendingApprovals = priceApprovalRequests.filter((r) => r.status === "pending").length;
  const pendingVanTransfers = (vanTransferRequests || []).filter((r) => r.status === "pending").length;
  const debtCustomerCount = customers.filter((c) => c.balance > 0).length;
  const totalReceivables = customers.filter((c) => c.balance > 0).reduce((s, c) => s + c.balance, 0);

  const myPendingTransfers = (vanTransferRequests || []).filter(
    (r) => r.status === "pending" && (r.fromVanId === currentUser?.vanId || r.toVanId === currentUser?.vanId)
  ).length;

  const myVanId = currentUser?.vanId || "";
  const unreadMessages = (messages || []).filter((m) => {
    const isForMe = isAdmin || m.toVanId === "all" || m.toVanId === myVanId;
    return isForMe && !m.readBy.includes(currentUser?.id || "");
  }).length;

  const menuItems = isAdmin
    ? [
        { title: "المنتجات", icon: "package", route: "/(tabs)/inventory", color: "#e8531d" },
        { title: "مبيعات مباشرة", icon: "shopping-bag", route: "/warehouse-sale", color: "#059669" },
        { title: "تحويل للفانات", icon: "send", route: "/transfer", color: "#16213e" },
        { title: "الفواتير", icon: "file-text", route: "/invoices", color: "#8b5cf6" },
        { title: "العملاء", icon: "users", route: "/(tabs)/customers", color: "#0891b2" },
        { title: "الذمم", icon: "alert-circle", route: "/receivables", color: "#dc2626", badge: debtCustomerCount },
        { title: "الصندوق", icon: "dollar-sign", route: "/cash", color: "#22c55e" },
        { title: "المصاريف", icon: "trending-down", route: "/expenses", color: "#f59e0b" },
        { title: "التقارير", icon: "bar-chart-2", route: "/(tabs)/reports", color: "#ec4899" },
        { title: "المندوبون", icon: "map-pin", route: "/(tabs)/tracking", color: "#06b6d4" },
        { title: "أسعار خاصة", icon: "tag", route: "/special-prices", color: "#7c3aed" },
        { title: "المستخدمون", icon: "users", route: "/manage-users", color: "#059669" },
        { title: "طلبات سعر 1", icon: "unlock", route: "/price-approvals", color: "#e67e22", badge: pendingApprovals },
        { title: "طلبات التحويل", icon: "repeat", route: "/transfer-approvals", color: "#0891b2", badge: pendingVanTransfers },
        { title: "تقرير التحويلات", icon: "list", route: "/transfer-report", color: "#0f766e" },
        { title: "إعدادات الشركة", icon: "settings", route: "/company-settings", color: "#6366f1" },
        { title: "أرشيف التقارير", icon: "archive", route: "/saved-reports", color: "#0f766e" },
        { title: "الموردون", icon: "truck", route: "/suppliers", color: "#b45309" },
        { title: "تقرير المندوبين", icon: "bar-chart-2", route: "/driver-report", color: "#0284c7" },
        { title: "البريد الداخلي", icon: "mail", route: "/messages", color: "#1d6ae8", badge: unreadMessages },
      ]
    : [
        { title: "فاتورة جديدة", icon: "plus-circle", route: "/new-invoice", color: "#e8531d" },
        { title: "مخزوني", icon: "package", route: "/(tabs)/inventory", color: "#16213e" },
        { title: "العملاء", icon: "users", route: "/(tabs)/customers", color: "#0891b2" },
        { title: "فواتيري", icon: "file-text", route: "/invoices", color: "#8b5cf6" },
        { title: "صندوقي", icon: "dollar-sign", route: "/cash", color: "#22c55e" },
        { title: "مصاريفي", icon: "trending-down", route: "/expenses", color: "#f59e0b" },
        { title: "تحويل بين الفانات", icon: "repeat", route: "/van-transfer", color: "#0891b2", badge: myPendingTransfers },
        { title: "سجل التحويلات", icon: "list", route: "/transfer-report", color: "#0f766e" },
        { title: "تقريري", icon: "bar-chart-2", route: "/driver-report", color: "#0284c7" },
        { title: "البريد الداخلي", icon: "mail", route: "/messages", color: "#1d6ae8", badge: unreadMessages },
      ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBg, { backgroundColor: colors.secondary, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.push("/profile")} style={styles.avatarBtn}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {currentUser.name.slice(0, 1)}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.greetArea}>
            <Text style={styles.greetSub}>مرحبا بك 👋</Text>
            <Text style={styles.greetName}>{currentUser.name}</Text>
          </View>
          {!isAdmin && (
            <TouchableOpacity
              onPress={() => router.push("/new-invoice")}
              style={[styles.fabSmall, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          <StatCard label="مبيعات اليوم" value={`${todaySales.toLocaleString()} د.أ`} icon="trending-up" color="#22c55e" />
          <StatCard label="فواتير اليوم" value={String(todayCount)} icon="file-text" color="#e8531d" />
          {!isAdmin && <StatCard label="رصيد الصندوق" value={`${vanBalance.toLocaleString()} د.أ`} icon="dollar-sign" color="#f59e0b" />}
          {!isAdmin && lowStock > 0 && <StatCard label="مخزون منخفض" value={String(lowStock)} icon="alert-triangle" color="#ef4444" sub="صنف" />}
          {isAdmin && <StatCard label="إجمالي المبيعات" value={`${totalSales.toLocaleString()} د.أ`} icon="bar-chart-2" color="#8b5cf6" />}
          {isAdmin && <StatCard label="إجمالي المصاريف" value={`${totalExpenses.toLocaleString()} د.أ`} icon="trending-down" color="#f59e0b" />}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: botPad + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* لوحة المندوب — ترصيد فوري */}
        {!isAdmin && (
          <View style={styles.driverPanel}>
            <TouchableOpacity
              onPress={() => router.push("/cash")}
              activeOpacity={0.85}
              style={[styles.driverPanelCard, { backgroundColor: "#22c55e18", borderColor: "#22c55e55" }]}
            >
              <View style={[styles.driverPanelIcon, { backgroundColor: "#22c55e22" }]}>
                <Feather name="dollar-sign" size={22} color="#22c55e" />
              </View>
              <Text style={[styles.driverPanelLbl, { color: colors.mutedForeground }]}>صندوقي</Text>
              <Text style={[styles.driverPanelVal, { color: "#22c55e" }]}>{vanBalance.toFixed(2)}</Text>
              <Text style={[styles.driverPanelUnit, { color: colors.mutedForeground }]}>د.أ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/inventory")}
              activeOpacity={0.85}
              style={[styles.driverPanelCard, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "55" }]}
            >
              <View style={[styles.driverPanelIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="package" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.driverPanelLbl, { color: colors.mutedForeground }]}>مخزوني</Text>
              <Text style={[styles.driverPanelVal, { color: colors.primary }]}>{totalVanItems}</Text>
              <Text style={[styles.driverPanelUnit, { color: colors.mutedForeground }]}>علبة / {totalVanSKUs} صنف</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isAdmin && lowStock > 0 && (
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/inventory")}
            style={[styles.lowStockBanner, { backgroundColor: "#ef444418", borderColor: "#ef4444" }]}
          >
            <Feather name="alert-triangle" size={16} color="#ef4444" />
            <Text style={[styles.lowStockText, { color: "#ef4444" }]}>
              {lowStock} {lowStock === 1 ? "صنف" : "أصناف"} بمخزون منخفض — اضغط للمراجعة
            </Text>
            <Feather name="chevron-left" size={16} color="#ef4444" />
          </TouchableOpacity>
        )}

        {/* إعدادات الطابعة */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الطابعة</Text>
        <PrinterCard />

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>القائمة الرئيسية</Text>
        {pendingApprovals > 0 && isAdmin && (
          <TouchableOpacity onPress={() => router.push("/price-approvals" as any)}>
            <View style={[styles.alertBanner, { backgroundColor: "#e67e22" }]}>
              <Feather name="clock" size={16} color="#fff" />
              <Text style={styles.alertBannerText}>
                {pendingApprovals} طلب سعر 1 بانتظار موافقتك — اضغط للمراجعة
              </Text>
              <Feather name="chevron-left" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
              style={styles.menuItemWrapper}
            >
              <Card style={styles.menuItem} padding={16}>
                <View style={{ position: "relative" }}>
                  <View style={[styles.menuIcon, { backgroundColor: item.color + "18" }]}>
                    <Feather name={item.icon as any} size={26} color={item.color} />
                  </View>
                  {(item as any).badge > 0 && (
                    <View style={[styles.badge, { backgroundColor: item.color }]}>
                      <Text style={styles.badgeText}>{(item as any).badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.menuTitle, { color: colors.foreground }]}>{item.title}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {invoices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>آخر الفواتير</Text>
            {invoices
              .filter((inv) => isAdmin || inv.vanId === vanId)
              .slice(-3)
              .reverse()
              .map((inv) => (
                <TouchableOpacity
                  key={inv.id}
                  onPress={() => router.push({ pathname: "/invoice-detail", params: { id: inv.id } })}
                >
                  <Card style={styles.invoiceRow}>
                    <View>
                      <Text style={[styles.invName, { color: colors.foreground }]}>{inv.customerName}</Text>
                      <Text style={[styles.invDate, { color: colors.mutedForeground }]}>
                        {new Date(inv.date).toLocaleDateString("ar-SA")}
                      </Text>
                    </View>
                    <View style={styles.invRight}>
                      <Text style={[styles.invAmount, { color: colors.primary }]}>
                        {inv.total.toLocaleString()} د.أ
                      </Text>
                      <Badge
                        label={inv.remaining > 0 ? "آجل" : "مدفوع"}
                        variant={inv.remaining > 0 ? "warning" : "success"}
                      />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  avatarBtn: {},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  greetArea: { flex: 1 },
  greetSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  greetName: { color: "#fff", fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  fabSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: 12, paddingVertical: 4, paddingBottom: 8 },
  body: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginTop: 22,
    marginBottom: 14,
    textAlign: "right",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  menuItemWrapper: { width: "47%" },
  menuItem: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
  },
  menuIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  invName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  invDate: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  invRight: { alignItems: "flex-end", gap: 6 },
  invAmount: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  driverPanel: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    marginBottom: 4,
  },
  driverPanelCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  driverPanelIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  driverPanelLbl: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  driverPanelVal: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
  },
  driverPanelUnit: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  lowStockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  lowStockText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  alertBannerText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
