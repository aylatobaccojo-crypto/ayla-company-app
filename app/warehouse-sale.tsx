import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";
import type { InvoiceItem } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type PriceTier = "special" | "low" | "high";

interface SaleItem extends InvoiceItem {
  tier: PriceTier;
}

export default function WarehouseSaleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    customers, products, vanInventory, createInvoice,
  } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // مخزون المستودع الرئيسي
  const mainInv = vanInventory["main"] || [];

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [paid, setPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // المنتجات المتوفرة في المستودع
  const availableProducts = products.filter((p) => {
    const inv = mainInv.find((vi) => vi.productId === p.id);
    return inv && inv.quantity > 0;
  });

  const getStock = (productId: string) => {
    const inv = mainInv.find((vi) => vi.productId === productId);
    return inv?.quantity || 0;
  };

  const getPriceForTier = (product: any, tier: PriceTier): number => {
    if (tier === "special") return product.priceSpecial || product.priceLow;
    if (tier === "high") return product.priceHigh;
    return product.priceLow;
  };

  const getAutoTier = (qty: number): PriceTier => qty >= 50 ? "high" : "low";

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = subtotal;
  const paidAmt = parseFloat(paid) || 0;
  const remaining = Math.max(0, total - paidAmt);

  const addProduct = (product: any) => {
    const existing = items.find((i) => i.productId === product.id);
    const qty = existing ? existing.quantity + 1 : 1;
    if (qty > getStock(product.id)) {
      Alert.alert("خطأ", "الكمية المطلوبة غير متوفرة في المستودع");
      return;
    }
    const tier = getAutoTier(qty);
    const price = getPriceForTier(product, tier);

    if (existing) {
      setItems(items.map((i) =>
        i.productId === product.id
          ? { ...i, quantity: qty, tier, unitPrice: price, total: price * qty }
          : i
      ));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        tier: "low",
        unitPrice: product.priceLow,
        total: product.priceLow,
      }]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowProductModal(false);
  };

  const updateItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setItems(items.filter((i) => i.productId !== productId));
      return;
    }
    if (qty > getStock(productId)) {
      Alert.alert("خطأ", "الكمية تتجاوز مخزون المستودع");
      return;
    }
    const product = products.find((p) => p.id === productId);
    setItems(items.map((i) => {
      if (i.productId !== productId) return i;
      const tier = i.tier !== "special" ? getAutoTier(qty) : "special";
      const price = getPriceForTier(product, tier);
      return { ...i, quantity: qty, tier, unitPrice: price, total: price * qty };
    }));
  };

  const changeTier = (productId: string, tier: PriceTier) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (tier === "special" && (!product.priceSpecial || product.priceSpecial <= 0)) {
      Alert.alert("تنبيه", "لم يُحدَّد سعر 1 لهذا المنتج");
      return;
    }
    const price = getPriceForTier(product, tier);
    setItems(items.map((i) =>
      i.productId === productId
        ? { ...i, tier, unitPrice: price, total: price * i.quantity }
        : i
    ));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getTierColor = (tier: PriceTier) => {
    if (tier === "special") return "#e67e22";
    if (tier === "high") return colors.success;
    return colors.primary;
  };

  const handleSubmit = () => {
    if (!selectedCustomer) {
      Alert.alert("خطأ", "يرجى اختيار عميل");
      return;
    }
    if (items.length === 0) {
      Alert.alert("خطأ", "يرجى إضافة منتج واحد على الأقل");
      return;
    }

    Alert.alert(
      "تأكيد البيع",
      `بيع مباشر من المستودع\nالعميل: ${selectedCustomer.name}\nالإجمالي: ${total.toFixed(2)} د.أ\nالمدفوع: ${paidAmt.toFixed(2)} د.أ${remaining > 0 ? `\nآجل: ${remaining.toFixed(2)} د.أ` : ""}`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
          onPress: () => {
            const invoiceId = createInvoice({
              vanId: "main",
              customerId: selectedCustomer.id,
              customerName: selectedCustomer.name,
              items: items.map(({ tier, ...rest }) => rest),
              subtotal,
              discount: 0,
              total,
              paid: paidAmt,
              remaining,
              notes: notes ? `[بيع مباشر] ${notes}` : "[بيع مباشر من المستودع]",
            });

            if (invoiceId) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("تم", "تم إنشاء الفاتورة وخصم الكمية من المستودع الرئيسي", [
                { text: "حسناً", onPress: () => router.back() },
              ]);
            } else {
              Alert.alert("خطأ", "تعذّر إنشاء الفاتورة — تحقق من المخزون");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="مبيعات المستودع" showBack />

      {/* شريط توضيحي */}
      <View style={[styles.sourceBanner, { backgroundColor: colors.secondary }]}>
        <Feather name="home" size={16} color="#fff" />
        <Text style={styles.sourceBannerText}>البيع يُخصم مباشرة من المستودع الرئيسي</Text>
        <Badge label={`${availableProducts.length} صنف`} variant="muted" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 12 }}>

        {/* اختيار العميل */}
        <TouchableOpacity onPress={() => setShowCustomerModal(true)}>
          <Card style={styles.selectRow}>
            <Feather name="user" size={20} color={selectedCustomer ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.selectText, { color: selectedCustomer ? colors.foreground : colors.mutedForeground }]}>
              {selectedCustomer ? selectedCustomer.name : "اختر عميل *"}
            </Text>
            <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
          </Card>
        </TouchableOpacity>

        {selectedCustomer?.balance > 0 && (
          <Card style={[styles.balanceWarn, { borderColor: colors.warning }]}>
            <Feather name="alert-circle" size={15} color={colors.warning} />
            <Text style={[styles.balanceWarnText, { color: colors.warning }]}>
              رصيد سابق: {selectedCustomer.balance.toFixed(2)} د.أ
            </Text>
          </Card>
        )}

        {/* المنتجات */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>المنتجات</Text>
          <TouchableOpacity
            onPress={() => setShowProductModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary + "18" }]}
          >
            <Feather name="plus" size={16} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>إضافة</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <Card style={styles.emptyItems}>
            <Feather name="shopping-cart" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لم يتم إضافة منتجات</Text>
          </Card>
        ) : (
          items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            const hasSpecial = product && product.priceSpecial > 0;
            const tierColor = getTierColor(item.tier);
            const stock = getStock(item.productId);

            return (
              <Card key={item.productId} style={[styles.itemCard, { borderRightWidth: 3, borderRightColor: tierColor }]}>
                <View style={styles.itemTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.productName}</Text>
                    <Text style={[styles.itemStock, { color: colors.mutedForeground }]}>
                      متوفر: {stock} علبة
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: tierColor }]}>{item.total.toFixed(2)} د.أ</Text>
                </View>

                {/* أزرار الأسعار — المدير يختار مباشرة بدون موافقة */}
                <View style={styles.tierRow}>
                  {hasSpecial && (
                    <TouchableOpacity
                      onPress={() => changeTier(item.productId, "special")}
                      style={[styles.tierBtn, {
                        backgroundColor: item.tier === "special" ? "#e67e22" : "#e67e2215",
                        borderColor: "#e67e22",
                      }]}
                    >
                      <Text style={[styles.tierBtnText, { color: item.tier === "special" ? "#fff" : "#e67e22" }]}>
                        سعر 1
                      </Text>
                      <Text style={[styles.tierPrice, { color: item.tier === "special" ? "rgba(255,255,255,0.8)" : "#e67e22" }]}>
                        {product?.priceSpecial}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => changeTier(item.productId, "low")}
                    style={[styles.tierBtn, {
                      backgroundColor: item.tier === "low" ? colors.primary : colors.primary + "15",
                      borderColor: colors.primary,
                    }]}
                  >
                    <Text style={[styles.tierBtnText, { color: item.tier === "low" ? "#fff" : colors.primary }]}>سعر 2</Text>
                    <Text style={[styles.tierPrice, { color: item.tier === "low" ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                      {product?.priceLow}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => changeTier(item.productId, "high")}
                    style={[styles.tierBtn, {
                      backgroundColor: item.tier === "high" ? colors.success : colors.success + "15",
                      borderColor: colors.success,
                    }]}
                  >
                    <Text style={[styles.tierBtnText, { color: item.tier === "high" ? "#fff" : colors.success }]}>سعر 3</Text>
                    <Text style={[styles.tierPrice, { color: item.tier === "high" ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                      {product?.priceHigh}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* كمية */}
                <View style={styles.itemBottom}>
                  <Text style={[styles.itemPrice, { color: colors.mutedForeground }]}>
                    {item.unitPrice.toFixed(2)} د.أ × علبة
                  </Text>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      onPress={() => updateItemQty(item.productId, item.quantity - 1)}
                      style={[styles.qtyBtn, { backgroundColor: colors.destructive + "18" }]}
                    >
                      <Feather name="minus" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                    <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateItemQty(item.productId, item.quantity + 1)}
                      style={[styles.qtyBtn, { backgroundColor: colors.primary + "18" }]}
                    >
                      <Feather name="plus" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        )}

        {/* ملخص الفاتورة */}
        {items.length > 0 && (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>المجموع ({totalQty} علبة)</Text>
              <Text style={[styles.summaryVal, { color: colors.foreground }]}>{subtotal.toFixed(2)} د.أ</Text>
            </View>
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي</Text>
              <Text style={[styles.totalVal, { color: colors.primary }]}>{total.toFixed(2)} د.أ</Text>
            </View>

            <Input
              label="المبلغ المدفوع"
              value={paid}
              onChangeText={setPaid}
              keyboardType="decimal-pad"
              placeholder={String(total.toFixed(2))}
            />

            {remaining > 0 && (
              <View style={[styles.remainingRow, { backgroundColor: colors.warning + "18", borderRadius: 8 }]}>
                <Feather name="clock" size={16} color={colors.warning} />
                <Text style={[styles.remainingText, { color: colors.warning }]}>
                  آجل: {remaining.toFixed(2)} د.أ
                </Text>
              </View>
            )}
          </Card>
        )}

        <Input
          label="ملاحظات"
          value={notes}
          onChangeText={setNotes}
          placeholder="ملاحظات إضافية..."
          multiline
        />

        <Button
          title="إنشاء الفاتورة"
          icon="file-plus"
          onPress={handleSubmit}
          disabled={!selectedCustomer || items.length === 0}
        />
      </ScrollView>

      {/* مودال العميل */}
      <Modal visible={showCustomerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>اختر عميل</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Input placeholder="بحث..." value={customerSearch} onChangeText={setCustomerSearch} />
            <FlatList
              data={customers.filter(
                (c) => c.name.includes(customerSearch) || c.phone.includes(customerSearch)
              )}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setSelectedCustomer(item); setShowCustomerModal(false); setCustomerSearch(""); }}
                  style={[styles.listRow, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.listSub, { color: colors.mutedForeground }]}>{item.phone}</Text>
                  </View>
                  {item.balance > 0 && (
                    <Badge label={`${item.balance.toFixed(0)} د.أ`} variant="warning" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.mutedForeground, padding: 20 }]}>لا يوجد عملاء</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* مودال المنتج */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>اختر منتج</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Input placeholder="بحث..." value={productSearch} onChangeText={setProductSearch} />
            <FlatList
              data={availableProducts.filter((p) => p.name.includes(productSearch))}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item: product }) => {
                const stock = getStock(product.id);
                const alreadyAdded = items.find((i) => i.productId === product.id);
                return (
                  <TouchableOpacity
                    onPress={() => addProduct(product)}
                    style={[styles.listRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listName, { color: colors.foreground }]}>{product.name}</Text>
                      <Text style={[styles.listSub, { color: colors.mutedForeground }]}>
                        {product.priceLow} د.أ • مخزون: {stock} علبة
                      </Text>
                    </View>
                    {alreadyAdded
                      ? <Badge label={`${alreadyAdded.quantity} ✓`} variant="success" />
                      : <Feather name="plus-circle" size={20} color={colors.primary} />
                    }
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", padding: 30, gap: 8 }}>
                  <Feather name="package" size={36} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد منتجات في المستودع</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sourceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sourceBannerText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
  },
  selectRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  selectText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "right" },
  balanceWarn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  balanceWarnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyItems: { alignItems: "center", gap: 12, paddingVertical: 30 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  itemCard: { gap: 10 },
  itemTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  itemName: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  itemStock: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  itemTotal: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  tierRow: { flexDirection: "row", gap: 6 },
  tierBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, gap: 2 },
  tierBtnText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  tierPrice: { fontSize: 11, fontFamily: "Inter_400Regular" },
  itemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemPrice: { fontSize: 13, fontFamily: "Inter_400Regular" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  qty: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", minWidth: 28, textAlign: "center" },
  summaryCard: { gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  totalVal: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  remainingRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  remainingText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  listRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  listName: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  listSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
});
