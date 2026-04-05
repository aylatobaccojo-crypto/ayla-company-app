import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
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
import { Input } from "@/components/Input";
import type { InvoiceItem } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type PriceTier = "special" | "low" | "high";

interface ItemWithTier extends InvoiceItem {
  tier: PriceTier;
  approvalId?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
}

export default function NewInvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    currentUser, customers, products, vanInventory,
    createInvoice, getProductPrice,
    requestPriceApproval, cancelPriceRequest,
    priceApprovalRequests, vans,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";
  const vanId = currentUser?.vanId || "";
  const effectiveVanId = isAdmin ? (vans[0]?.id || "") : vanId;
  const vanInv = vanInventory[isAdmin ? effectiveVanId : vanId] || [];

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [items, setItems] = useState<ItemWithTier[]>([]);
  const [paid, setPaid] = useState("");
  const [received, setReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myCustomers = customers.filter(
    (c) => c.vanId === (isAdmin ? effectiveVanId : vanId) || isAdmin
  );

  const LOW_STOCK_THRESHOLD = 5;

  // كل المنتجات التي سبق تحويلها للفان (سواء كان رصيدها صفر أم لا)
  const allVanProducts = products
    .filter((p) => vanInv.some((vi) => vi.productId === p.id))
    .sort((a, b) => {
      const qa = vanInv.find((vi) => vi.productId === a.id)?.quantity || 0;
      const qb = vanInv.find((vi) => vi.productId === b.id)?.quantity || 0;
      if (qa === 0 && qb > 0) return 1;
      if (qa > 0 && qb === 0) return -1;
      return 0;
    });

  const getStock = (productId: string) => {
    const inv = vanInv.find((vi) => vi.productId === productId);
    return inv?.quantity || 0;
  };

  // المنتجات على وشك النفاذ (أقل من الحد الأدنى وأكثر من صفر)
  const lowStockItems = allVanProducts.filter((p) => {
    const qty = getStock(p.id);
    return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
  });

  const outOfStockItems = allVanProducts.filter((p) => getStock(p.id) === 0);

  const getPriceForTier = (product: any, qty: number, tier: PriceTier): number => {
    if (tier === "special") return product.priceSpecial || product.priceLow;
    if (tier === "high") return product.priceHigh;
    return product.priceLow;
  };

  // للمدير: السعر بناء على الصنف منفرداً
  const getAutoTier = (qty: number): PriceTier => qty >= 50 ? "high" : "low";

  // للمندوب: السعر بناء على مجموع الكروزات في الفاتورة كلها
  const getInvoiceTier = (currentItems: ItemWithTier[], overrideTotalQty?: number): PriceTier => {
    const total = overrideTotalQty ?? currentItems.reduce((s, i) => s + i.quantity, 0);
    return total > 50 ? "high" : "low";
  };

  // إعادة حساب أسعار جميع الأصناف للمندوب بعد أي تغيير في الكميات
  const recalcDriverTiers = (currentItems: ItemWithTier[]): ItemWithTier[] => {
    const tier = getInvoiceTier(currentItems);
    return currentItems.map((i) => {
      if (i.approvalStatus === "pending" || i.approvalStatus === "approved") return i;
      const product = products.find((p) => p.id === i.productId);
      const price = tier === "high" ? (product?.priceHigh || i.unitPrice) : (product?.priceLow || i.unitPrice);
      return { ...i, tier, unitPrice: price, total: price * i.quantity };
    });
  };

  useEffect(() => {
    const hasPending = items.some((i) => i.approvalStatus === "pending");
    if (hasPending) {
      pollRef.current = setInterval(() => {
        setItems((prev) =>
          prev.map((item) => {
            if (item.approvalStatus !== "pending" || !item.approvalId) return item;
            const req = priceApprovalRequests.find((r) => r.id === item.approvalId);
            if (!req) return item;
            if (req.status === "approved") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              return { ...item, approvalStatus: "approved" };
            }
            if (req.status === "rejected") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              const product = products.find((p) => p.productId === item.productId);
              const autoTier = getAutoTier(item.quantity);
              const fallbackPrice = autoTier === "high" ? (product?.priceHigh || item.unitPrice) : (product?.priceLow || item.unitPrice);
              return {
                ...item,
                approvalStatus: "rejected",
                tier: autoTier,
                unitPrice: fallbackPrice,
                total: fallbackPrice * item.quantity,
                approvalId: undefined,
              };
            }
            return item;
          })
        );
      }, 2000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [items, priceApprovalRequests]);

  const requestSpecialPrice = (item: ItemWithTier) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product || !product.priceSpecial || product.priceSpecial <= 0) {
      Alert.alert("تنبيه", "لم يُحدَّد سعر 1 لهذا المنتج من قِبَل المدير");
      return;
    }
    if (!selectedCustomer) {
      Alert.alert("تنبيه", "يرجى اختيار عميل أولاً");
      return;
    }
    const van = vans.find((v) => v.id === (isAdmin ? effectiveVanId : vanId));
    const approvalId = requestPriceApproval({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      priceSpecial: product.priceSpecial,
      vanId: isAdmin ? effectiveVanId : vanId,
      driverName: van?.driverName || currentUser?.name || "",
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      itemRef: item.productId,
    });

    setItems((prev) =>
      prev.map((i) =>
        i.productId === item.productId
          ? {
              ...i,
              tier: "special",
              approvalId,
              approvalStatus: "pending",
              unitPrice: product.priceSpecial,
              total: product.priceSpecial * i.quantity,
            }
          : i
      )
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("طلب موافقة", "تم إرسال طلب سعر 1 للمدير — بانتظار الموافقة...");
  };

  const cancelSpecialRequest = (item: ItemWithTier) => {
    if (item.approvalId) cancelPriceRequest(item.approvalId);
    const product = products.find((p) => p.id === item.productId);
    const autoTier = getAutoTier(item.quantity);
    const price = autoTier === "high" ? (product?.priceHigh || 0) : (product?.priceLow || 0);
    setItems((prev) =>
      prev.map((i) =>
        i.productId === item.productId
          ? { ...i, tier: autoTier, approvalId: undefined, approvalStatus: undefined, unitPrice: price, total: price * i.quantity }
          : i
      )
    );
  };

  const changeTier = (item: ItemWithTier, tier: PriceTier) => {
    if (tier === "special") {
      requestSpecialPrice(item);
      return;
    }
    if (item.approvalId && item.approvalStatus === "pending") {
      cancelPriceRequest(item.approvalId);
    }
    const product = products.find((p) => p.id === item.productId);
    const price = getPriceForTier(product, item.quantity, tier);
    setItems((prev) =>
      prev.map((i) =>
        i.productId === item.productId
          ? { ...i, tier, unitPrice: price, total: price * i.quantity, approvalId: undefined, approvalStatus: undefined }
          : i
      )
    );
  };

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = subtotal;
  const paidAmt = parseFloat(paid) || 0;
  const remaining = Math.max(0, total - paidAmt);
  // للمندوب: المبلغ المستلم والباقي للعميل (الفكة)
  const receivedAmt = parseFloat(received) || 0;
  const changeAmt = Math.max(0, receivedAmt - total);
  const driverShortfall = received !== "" && receivedAmt < total;

  const addProduct = (product: any) => {
    const existing = items.find((i) => i.productId === product.id);
    const qty = existing ? existing.quantity + 1 : 1;
    if (qty > getStock(product.id)) {
      Alert.alert("خطأ", "الكمية المطلوبة غير متوفرة في المخزون");
      return;
    }

    let updated: ItemWithTier[];
    if (existing) {
      updated = items.map((i) =>
        i.productId === product.id ? { ...i, quantity: qty } : i
      );
    } else {
      updated = [...items, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        tier: "low" as PriceTier,
        unitPrice: product.priceLow,
        total: product.priceLow,
      }];
    }

    if (!isAdmin) {
      // المندوب: السعر بناء على مجموع الكروزات في الفاتورة
      updated = recalcDriverTiers(updated);
    } else {
      // المدير: السعر بناء على كمية الصنف منفرداً
      const autoTier = getAutoTier(qty);
      const price = getPriceForTier(product, qty, autoTier);
      updated = updated.map((i) =>
        i.productId === product.id && i.approvalStatus !== "approved"
          ? { ...i, tier: autoTier, unitPrice: price, total: price * qty }
          : i
      );
    }

    setItems(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowProductModal(false);
  };

  const updateItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      const item = items.find((i) => i.productId === productId);
      if (item?.approvalId) cancelPriceRequest(item.approvalId);
      const filtered = items.filter((i) => i.productId !== productId);
      setItems(!isAdmin ? recalcDriverTiers(filtered) : filtered);
      return;
    }
    if (qty > getStock(productId)) {
      Alert.alert("خطأ", "الكمية المطلوبة تتجاوز المخزون");
      return;
    }

    // تحديث الكمية أولاً
    let updated = items.map((i) =>
      i.productId === productId ? { ...i, quantity: qty } : i
    );

    if (!isAdmin) {
      // المندوب: أعد حساب جميع الأصناف بناء على المجموع الجديد
      updated = recalcDriverTiers(updated);
    } else {
      // المدير: حساب الصنف منفرداً
      const product = products.find((p) => p.id === productId);
      updated = updated.map((i) => {
        if (i.productId !== productId) return i;
        const tier = i.approvalStatus === "approved" ? "special" : getAutoTier(qty);
        const price = i.approvalStatus === "approved"
          ? (product?.priceSpecial || i.unitPrice)
          : getPriceForTier(product, qty, tier);
        return { ...i, quantity: qty, tier, unitPrice: price, total: price * qty };
      });
    }

    setItems(updated);
  };

  const handleSubmit = () => {
    const hasPending = items.some((i) => i.approvalStatus === "pending");
    if (hasPending) {
      Alert.alert("انتظر", "بعض المنتجات لا تزال بانتظار موافقة المدير على سعر 1");
      return;
    }
    if (!selectedCustomer) {
      Alert.alert("خطأ", "يرجى اختيار عميل");
      return;
    }
    if (items.length === 0) {
      Alert.alert("خطأ", "يرجى إضافة منتج واحد على الأقل");
      return;
    }
    if (!isAdmin && driverShortfall) {
      Alert.alert("خطأ", `المبلغ المستلم (${receivedAmt.toFixed(2)} د.أ) أقل من إجمالي الفاتورة (${total.toFixed(2)} د.أ)`);
      return;
    }
    if (!isAdmin && received === "") {
      Alert.alert("خطأ", "يرجى إدخال المبلغ المستلم من العميل");
      return;
    }

    // للمندوب: المبلغ المدفوع = الإجمالي دائماً (لا آجل)
    const finalPaid = isAdmin ? paidAmt : total;
    const finalRemaining = isAdmin ? remaining : 0;

    const invoiceId = createInvoice({
      vanId: isAdmin ? effectiveVanId : vanId,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      items: items.map(({ tier, approvalId, approvalStatus, ...rest }) => rest),
      subtotal,
      discount: 0,
      total,
      paid: finalPaid,
      remaining: finalRemaining,
      notes,
    });

    if (invoiceId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // انتقل مباشرةً لشاشة الطباعة
      router.replace(`/print-invoice?id=${invoiceId}`);
    } else {
      Alert.alert("خطأ", "حدث خطأ أثناء إنشاء الفاتورة - تحقق من المخزون");
    }
  };

  const getTierLabel = (tier: PriceTier) => {
    if (tier === "special") return "سعر 1";
    if (tier === "high") return "سعر 3";
    return "سعر 2";
  };

  const getTierColor = (tier: PriceTier) => {
    if (tier === "special") return "#e67e22";
    if (tier === "high") return colors.success;
    return colors.primary;
  };

  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="فاتورة جديدة" showBack />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 12 }}>
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
          <Card style={[styles.balanceWarning, { borderColor: colors.warning }]}>
            <Feather name="alert-circle" size={16} color={colors.warning} />
            <Text style={[styles.balanceText, { color: colors.warning }]}>
              رصيد سابق: {selectedCustomer.balance} د.أ
            </Text>
          </Card>
        )}

        {/* ─── تنبيه مخزون منخفض ─── */}
        {!isAdmin && lowStockItems.length > 0 && (
          <Card style={[styles.lowStockBanner, { backgroundColor: "#fff7ed", borderColor: "#fb923c" }]}>
            <View style={styles.lowStockHeader}>
              <Feather name="alert-triangle" size={16} color="#ea580c" />
              <Text style={[styles.lowStockTitle, { color: "#ea580c" }]}>
                تنبيه: {lowStockItems.length} صنف على وشك النفاذ
              </Text>
            </View>
            <View style={styles.lowStockList}>
              {lowStockItems.map((p) => (
                <View key={p.id} style={styles.lowStockRow}>
                  <Text style={[styles.lowStockName, { color: "#c2410c" }]}>{p.name}</Text>
                  <Text style={[styles.lowStockQty, { backgroundColor: "#fed7aa", color: "#c2410c" }]}>
                    {getStock(p.id)} كروز
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* ─── تنبيه أصناف نفذت ─── */}
        {!isAdmin && outOfStockItems.length > 0 && (
          <Card style={[styles.lowStockBanner, { backgroundColor: "#fef2f2", borderColor: "#f87171" }]}>
            <View style={styles.lowStockHeader}>
              <Feather name="x-circle" size={16} color="#dc2626" />
              <Text style={[styles.lowStockTitle, { color: "#dc2626" }]}>
                {outOfStockItems.length} صنف نفذت كميته — تواصل مع المدير لتحويل مخزون
              </Text>
            </View>
          </Card>
        )}

        {isAdmin ? (
          <Card style={[styles.priceTierLegend, { backgroundColor: colors.accent }]}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#e67e22" }]} />
                <Text style={[styles.legendText, { color: colors.foreground }]}>سعر 1 — يحتاج موافقة المدير</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.foreground }]}>سعر 2 — أقل من 50 كروز</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendText, { color: colors.foreground }]}>سعر 3 — 50 كروز فأكثر</Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={[styles.priceTierLegend, { backgroundColor: colors.accent }]}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.foreground }]}>سعر 2 تلقائي — أقل من 50 كروز</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendText, { color: colors.foreground }]}>سعر 3 تلقائي — 50 كروز فأكثر</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>المنتجات</Text>
          <TouchableOpacity
            onPress={() => setShowProductModal(true)}
            style={[styles.addItemBtn, { backgroundColor: colors.primary + "18", borderRadius: 8 }]}
          >
            <Feather name="plus" size={16} color={colors.primary} />
            <Text style={[styles.addItemText, { color: colors.primary }]}>إضافة</Text>
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
            return (
              <Card key={item.productId} style={[styles.itemCard, { borderRightWidth: 3, borderRightColor: tierColor }]}>
                <View style={styles.itemTop}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.productName}</Text>
                  <Text style={[styles.itemTotal, { color: tierColor }]}>{item.total.toFixed(2)} د.أ</Text>
                </View>

                {/* أزرار السعر — للمدير فقط */}
                {isAdmin ? (
                  <View style={styles.tierRow}>
                    {hasSpecial && (
                      <TouchableOpacity
                        onPress={() => changeTier(item, "special")}
                        disabled={item.approvalStatus === "pending"}
                        style={[
                          styles.tierBtn,
                          {
                            backgroundColor: item.tier === "special" ? "#e67e22" : "#e67e2218",
                            borderColor: "#e67e22",
                          },
                        ]}
                      >
                        <Feather
                          name={item.approvalStatus === "approved" ? "check-circle" : item.approvalStatus === "pending" ? "clock" : "lock"}
                          size={11}
                          color={item.tier === "special" ? "#fff" : "#e67e22"}
                        />
                        <Text style={[styles.tierBtnText, { color: item.tier === "special" ? "#fff" : "#e67e22" }]}>
                          سعر 1
                          {item.approvalStatus === "pending" ? " ⏳" : ""}
                          {item.approvalStatus === "rejected" ? " ✗" : ""}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => changeTier(item, "low")}
                      style={[
                        styles.tierBtn,
                        {
                          backgroundColor: item.tier === "low" ? colors.primary : colors.primary + "18",
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text style={[styles.tierBtnText, { color: item.tier === "low" ? "#fff" : colors.primary }]}>
                        سعر 2
                      </Text>
                      <Text style={[styles.tierPrice, { color: item.tier === "low" ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                        {product?.priceLow}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => changeTier(item, "high")}
                      style={[
                        styles.tierBtn,
                        {
                          backgroundColor: item.tier === "high" ? colors.success : colors.success + "18",
                          borderColor: colors.success,
                        },
                      ]}
                    >
                      <Text style={[styles.tierBtnText, { color: item.tier === "high" ? "#fff" : colors.success }]}>
                        سعر 3
                      </Text>
                      <Text style={[styles.tierPrice, { color: item.tier === "high" ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                        {product?.priceHigh}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* للمندوب: مؤشر السعر التلقائي فقط */
                  <View style={[styles.autoTierBadge, {
                    backgroundColor: item.tier === "high" ? colors.success + "15" : colors.primary + "15",
                    borderColor: item.tier === "high" ? colors.success : colors.primary,
                  }]}>
                    <Feather name="zap" size={12} color={item.tier === "high" ? colors.success : colors.primary} />
                    <Text style={[styles.autoTierText, { color: item.tier === "high" ? colors.success : colors.primary }]}>
                      {item.tier === "high"
                        ? `سعر 3 تلقائي — مجموع الفاتورة ${totalQty} كروز (أكثر من 50)`
                        : `سعر 2 تلقائي — مجموع الفاتورة ${totalQty} كروز (50 أو أقل)`}
                    </Text>
                  </View>
                )}

                {item.approvalStatus === "pending" && (
                  <View style={[styles.approvalBanner, { backgroundColor: "#fff3e0", borderRadius: 8 }]}>
                    <Feather name="clock" size={14} color="#e67e22" />
                    <Text style={styles.approvalText}>بانتظار موافقة المدير على سعر 1...</Text>
                    <TouchableOpacity onPress={() => cancelSpecialRequest(item)}>
                      <Text style={styles.cancelApproval}>إلغاء</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {item.approvalStatus === "approved" && (
                  <View style={[styles.approvalBanner, { backgroundColor: "#e8f5e9", borderRadius: 8 }]}>
                    <Feather name="check-circle" size={14} color="#22c55e" />
                    <Text style={[styles.approvalText, { color: "#22c55e" }]}>تمت الموافقة على سعر 1 ✓</Text>
                  </View>
                )}
                {item.approvalStatus === "rejected" && (
                  <View style={[styles.approvalBanner, { backgroundColor: "#fdecea", borderRadius: 8 }]}>
                    <Feather name="x-circle" size={14} color={colors.destructive} />
                    <Text style={[styles.approvalText, { color: colors.destructive }]}>رُفض سعر 1 — تم التحويل لسعر 2</Text>
                  </View>
                )}

                <View style={styles.itemBottom}>
                  <Text style={[styles.itemPrice, { color: colors.mutedForeground }]}>
                    {item.unitPrice.toFixed(2)} د.أ × علبة
                    <Text style={{ color: tierColor }}> ({getTierLabel(item.tier)})</Text>
                  </Text>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      onPress={() => updateItemQty(item.productId, item.quantity - 1)}
                      style={[styles.qtyBtn, { backgroundColor: colors.destructive + "18" }]}
                    >
                      <Feather name="minus" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                    <TextInput
                      value={String(item.quantity)}
                      onChangeText={(v) => {
                        const n = parseInt(v.replace(/[^0-9]/g, "")) || 0;
                        updateItemQty(item.productId, n);
                      }}
                      keyboardType="number-pad"
                      style={[styles.qtyInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius }]}
                    />
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
            {isAdmin ? (
              <>
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
              </>
            ) : (
              <>
                <Input
                  label="المبلغ المستلم من العميل"
                  value={received}
                  onChangeText={setReceived}
                  keyboardType="decimal-pad"
                  placeholder={String(total.toFixed(2))}
                />
                {driverShortfall && (
                  <View style={[styles.remainingRow, { backgroundColor: "#fef2f2", borderRadius: 8, borderWidth: 1, borderColor: "#f87171" }]}>
                    <Feather name="alert-circle" size={15} color="#dc2626" />
                    <Text style={[styles.remainingText, { color: "#dc2626" }]}>
                      المبلغ المستلم أقل من الإجمالي بـ {(total - receivedAmt).toFixed(2)} د.أ
                    </Text>
                  </View>
                )}
                {!driverShortfall && received !== "" && changeAmt > 0 && (
                  <View style={[styles.remainingRow, { backgroundColor: "#f0fdf4", borderRadius: 8, borderWidth: 1, borderColor: "#86efac" }]}>
                    <Feather name="refresh-cw" size={15} color="#16a34a" />
                    <Text style={[styles.remainingText, { color: "#16a34a", fontWeight: "700" }]}>
                      الباقي للعميل: {changeAmt.toFixed(2)} د.أ
                    </Text>
                  </View>
                )}
                {!driverShortfall && received !== "" && changeAmt === 0 && (
                  <View style={[styles.remainingRow, { backgroundColor: "#f0fdf4", borderRadius: 8 }]}>
                    <Feather name="check-circle" size={15} color="#16a34a" />
                    <Text style={[styles.remainingText, { color: "#16a34a" }]}>
                      المبلغ مطابق — لا يوجد باقٍ
                    </Text>
                  </View>
                )}
              </>
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

      <Modal visible={showCustomerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>اختر عميل</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Input placeholder="بحث..." value={customerSearch} onChangeText={setCustomerSearch} />
            <FlatList
              data={myCustomers.filter((c) => c.name.includes(customerSearch) || c.phone.includes(customerSearch))}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCustomer(item);
                    setShowCustomerModal(false);
                  }}
                  style={[styles.listItem, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.listItemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.listItemSub, { color: colors.mutedForeground }]}>{item.phone}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center", padding: 20 }]}>
                  لا يوجد عملاء — أضف عميلاً أولاً
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>اختر منتج</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Input placeholder="بحث..." value={productSearch} onChangeText={setProductSearch} />
            <FlatList
              data={allVanProducts.filter((p) => p.name.includes(productSearch) || p.brand.includes(productSearch))}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const stock = getStock(item.id);
                const isOut = stock === 0;
                const isLow = stock > 0 && stock <= LOW_STOCK_THRESHOLD;
                const stockColor = isOut ? "#dc2626" : isLow ? "#ea580c" : "#16a34a";
                const stockBg = isOut ? "#fef2f2" : isLow ? "#fff7ed" : "#f0fdf4";
                const stockVariant = isOut ? "destructive" : isLow ? "warning" : "success";
                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (isOut) {
                        Alert.alert(
                          "نفذت الكمية",
                          `لا يوجد مخزون من "${item.name}"\nتواصل مع المدير لتحويل كمية من المستودع الرئيسي`,
                          [{ text: "حسناً" }]
                        );
                        return;
                      }
                      addProduct(item);
                    }}
                    style={[
                      styles.productListItem,
                      { borderBottomColor: colors.border, opacity: isOut ? 0.6 : 1 },
                    ]}
                  >
                    <View style={styles.productListInfo}>
                      {/* اسم المنتج + الكمية المتبقية بجانبه مباشرة */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Text style={[styles.listItemName, { color: isOut ? colors.mutedForeground : colors.foreground, flex: 1 }]}>
                          {item.name}
                        </Text>
                        <View style={[styles.stockPill, { backgroundColor: stockBg }]}>
                          <Feather name="package" size={11} color={stockColor} />
                          <Text style={[styles.stockPillText, { color: stockColor }]}>
                            {isOut ? "نفذ" : `${stock} كروز`}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.listItemSub, { color: colors.mutedForeground }]}>{item.brand}</Text>
                      {isOut && (
                        <Text style={{ fontSize: 11, color: "#dc2626", fontFamily: "Inter_400Regular" }}>
                          تواصل مع المدير لتحويل مخزون
                        </Text>
                      )}
                    </View>
                    <View style={styles.productListRight}>
                      <View style={styles.priceList}>
                        {item.priceSpecial > 0 && (
                          <Text style={{ fontSize: 11, color: "#e67e22", fontFamily: "Inter_600SemiBold" }}>س1: {item.priceSpecial}</Text>
                        )}
                        <Text style={{ fontSize: 11, color: colors.primary, fontFamily: "Inter_600SemiBold" }}>س2: {item.priceLow}</Text>
                        <Text style={{ fontSize: 11, color: colors.success, fontFamily: "Inter_600SemiBold" }}>س3: {item.priceHigh}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center", padding: 20 }]}>
                  لا يوجد منتجات — اطلب تحويل مخزون من المدير
                </Text>
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
  selectRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  selectText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "right" },
  balanceWarning: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1 },
  balanceText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  priceTierLegend: { padding: 12, gap: 6 },
  legendRow: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 8 },
  addItemText: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  emptyItems: { alignItems: "center", padding: 24, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  itemCard: { gap: 8 },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  itemTotal: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  autoTierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  autoTierText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  tierRow: { flexDirection: "row", gap: 6 },
  tierBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierBtnText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  tierPrice: { fontSize: 10, fontFamily: "Inter_400Regular" },
  approvalBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8 },
  approvalText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: "#e67e22" },
  cancelApproval: { fontSize: 12, color: "#e67e22", fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
  itemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemPrice: { fontSize: 13, fontFamily: "Inter_400Regular" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  qty: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", minWidth: 28, textAlign: "center" },
  qtyInput: { width: 56, height: 34, borderWidth: 1, textAlign: "center", fontSize: 15, fontWeight: "700", paddingHorizontal: 4 },
  summaryCard: { gap: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryVal: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1 },
  totalLabel: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  totalVal: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  remainingRow: { flexDirection: "row", alignItems: "center", padding: 10, gap: 8 },
  remainingText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  listItem: { paddingVertical: 14, borderBottomWidth: 1 },
  listItemName: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  listItemSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  productListItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1 },
  productListInfo: { flex: 1, gap: 2 },
  productListRight: { alignItems: "flex-end", gap: 4 },
  priceList: { alignItems: "flex-end", gap: 2 },
  // تنبيهات المخزون
  lowStockBanner: {
    borderWidth: 1, borderRadius: 10, padding: 12, gap: 8,
  },
  lowStockHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  lowStockTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  lowStockList: { gap: 4 },
  lowStockRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 3,
  },
  lowStockName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  lowStockQty: {
    fontSize: 12, fontFamily: "Inter_700Bold",
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  // بادج نفذ
  outBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#fca5a5",
  },
  outBadgeText: { fontSize: 10, color: "#dc2626", fontFamily: "Inter_700Bold" },
  // بيل الكمية
  stockPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  stockPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
