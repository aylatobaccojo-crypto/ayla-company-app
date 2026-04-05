import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Tab = "warehouse" | "purchases";

const CATEGORIES = ["سجائر", "معسل", "سيجار", "أخرى"];

export default function InventoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    currentUser, products, vanInventory,
    addProduct, updateProduct,
    addPurchase, addPurchaseInvoice, purchases, purchaseInvoices, suppliers,
  } = useApp();
  const isAdmin = currentUser?.role === "admin";
  const vanId = currentUser?.vanId;

  const [activeTab, setActiveTab] = useState<Tab>("warehouse");
  const [search, setSearch] = useState("");

  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    name: "", brand: "", priceSpecial: "",
    priceLow: "", priceHigh: "", costPrice: "",
    stock: "", category: "سجائر",
  });

  // ─── سلة المشتريات المتعددة ───
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [cartItems, setCartItems] = useState<{id:string;productId:string;productName:string;qty:number;cost:number}[]>([]);
  const [curProductId, setCurProductId] = useState("");
  const [curQty, setCurQty] = useState("");
  const [curCost, setCurCost] = useState("");
  const [purchaseSupplier, setPurchaseSupplier] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productPickerSearch, setProductPickerSearch] = useState("");
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showNewProductInPurchase, setShowNewProductInPurchase] = useState(false);
  const [newProductInPurchase, setNewProductInPurchase] = useState({
    name: "", brand: "", priceSpecial: "", priceLow: "", priceHigh: "", category: "سجائر",
  });

  const inventory = isAdmin
    ? (vanInventory.main || [])
    : (vanInventory[vanId || ""] || []);

  const totalVanBoxes = !isAdmin ? inventory.reduce((s, vi) => s + vi.quantity, 0) : 0;
  const totalVanSKUs = !isAdmin ? inventory.filter((vi) => vi.quantity > 0).length : 0;
  const lowStockCount = !isAdmin ? inventory.filter((vi) => vi.quantity > 0 && vi.quantity < 10).length : 0;

  // إحصائيات المستودع الرئيسي للمدير
  const warehouseSummary = isAdmin ? (() => {
    let totalBoxes = 0;
    let totalCostValue = 0;
    let totalSellValue = 0;
    let totalSKUs = 0;
    let zeroStockSKUs = 0;
    let lowStockSKUs = 0; // 1-9
    const byCategory: Record<string, { boxes: number; costVal: number; skus: number }> = {};
    for (const p of products) {
      const vi = inventory.find((i) => i.productId === p.id);
      const qty = vi?.quantity || 0;
      if (qty === 0) { zeroStockSKUs++; continue; }
      if (qty < 10) lowStockSKUs++;
      totalSKUs++;
      totalBoxes += qty;
      totalCostValue += qty * p.costPrice;
      totalSellValue += qty * p.priceLow;
      const cat = p.category || "أخرى";
      byCategory[cat] = byCategory[cat] || { boxes: 0, costVal: 0, skus: 0 };
      byCategory[cat].boxes += qty;
      byCategory[cat].costVal += qty * p.costPrice;
      byCategory[cat].skus++;
    }
    return { totalBoxes, totalCostValue, totalSellValue, byCategory, totalSKUs, zeroStockSKUs, lowStockSKUs };
  })() : null;

  const getQty = (productId: string) => {
    const item = inventory.find((i) => i.productId === productId);
    return item?.quantity || 0;
  };

  const displayProducts = products.filter(
    (p) => (p.name.includes(search) || p.brand.includes(search))
  );

  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const openAddProduct = () => {
    setProductForm({ name: "", brand: "", priceSpecial: "", priceLow: "", priceHigh: "", costPrice: "", stock: "", category: "سجائر" });
    setEditProduct(null);
    setShowProductModal(true);
  };

  const openEditProduct = (product: any) => {
    setProductForm({
      name: product.name,
      brand: product.brand,
      priceSpecial: String(product.priceSpecial || 0),
      priceLow: String(product.priceLow),
      priceHigh: String(product.priceHigh),
      costPrice: String(product.costPrice),
      stock: String(getQty(product.id)),
      category: product.category,
    });
    setEditProduct(product);
    setShowProductModal(true);
  };

  const handleSaveProduct = () => {
    if (!productForm.name || !productForm.priceLow) {
      Alert.alert("خطأ", "اسم المنتج وسعر 2 مطلوبان");
      return;
    }
    const data = {
      name: productForm.name,
      brand: productForm.brand,
      priceSpecial: parseFloat(productForm.priceSpecial) || 0,
      priceLow: parseFloat(productForm.priceLow) || 0,
      priceHigh: parseFloat(productForm.priceHigh) || 0,
      costPrice: parseFloat(productForm.costPrice) || 0,
      stock: parseInt(productForm.stock) || 0,
      unit: "علبة",
      category: productForm.category,
    };
    if (editProduct) {
      updateProduct(editProduct.id, data);
    } else {
      addProduct(data);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowProductModal(false);
  };

  const curProduct = products.find((p) => p.id === curProductId);
  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.cost, 0);
  const cartTotalBoxes = cartItems.reduce((s, i) => s + i.qty, 0);

  const openAddPurchase = () => {
    setCartItems([]);
    setCurProductId(""); setCurQty(""); setCurCost("");
    setPurchaseSupplier(""); setPurchaseNotes("");
    setShowNewProductInPurchase(false);
    setNewProductInPurchase({ name: "", brand: "", priceSpecial: "", priceLow: "", priceHigh: "", category: "سجائر" });
    setShowPurchaseModal(true);
  };

  const handleAddToCart = () => {
    if (showNewProductInPurchase) {
      if (!newProductInPurchase.name || !newProductInPurchase.priceLow) {
        Alert.alert("خطأ", "اسم المنتج وسعر 2 مطلوبان");
        return;
      }
      if (!curQty || parseInt(curQty) <= 0) {
        Alert.alert("خطأ", "يرجى إدخال كمية صحيحة");
        return;
      }
      if (!curCost || parseFloat(curCost) <= 0) {
        Alert.alert("خطأ", "يرجى إدخال سعر الشراء");
        return;
      }
      // يُنشئ المنتج الآن ويضيفه للسلة كـ "new:xxx"
      setCartItems((prev) => [
        ...prev,
        {
          id: `new_${Date.now()}`,
          productId: `__new__${newProductInPurchase.name}`,
          productName: newProductInPurchase.name + " (جديد)",
          qty: parseInt(curQty),
          cost: parseFloat(curCost),
        },
      ]);
      // نحتفظ ببيانات المنتج الجديد مؤقتاً في اسم خاص
      setNewProductInPurchase({ name: "", brand: "", priceSpecial: "", priceLow: "", priceHigh: "", category: "سجائر" });
      setCurProductId(""); setCurQty(""); setCurCost("");
      setShowNewProductInPurchase(false);
      return;
    }
    if (!curProductId) {
      Alert.alert("خطأ", "يرجى اختيار المنتج");
      return;
    }
    if (!curQty || parseInt(curQty) <= 0) {
      Alert.alert("خطأ", "يرجى إدخال كمية صحيحة");
      return;
    }
    if (!curCost || parseFloat(curCost) <= 0) {
      Alert.alert("خطأ", "يرجى إدخال سعر الشراء");
      return;
    }
    const existing = cartItems.find((c) => c.productId === curProductId);
    if (existing) {
      setCartItems((prev) =>
        prev.map((c) =>
          c.productId === curProductId
            ? { ...c, qty: c.qty + parseInt(curQty), cost: parseFloat(curCost) }
            : c
        )
      );
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          id: `${curProductId}_${Date.now()}`,
          productId: curProductId,
          productName: curProduct?.name || "",
          qty: parseInt(curQty),
          cost: parseFloat(curCost),
        },
      ]);
    }
    setCurProductId(""); setCurQty(""); setCurCost("");
  };

  const handleConfirmAllPurchases = () => {
    if (cartItems.length === 0) {
      Alert.alert("السلة فارغة", "يرجى إضافة صنف واحد على الأقل");
      return;
    }
    const validItems = cartItems.filter((item) => !item.productId.startsWith("__new__"));
    if (validItems.length === 0) {
      Alert.alert("خطأ", "لا يوجد أصناف صالحة في السلة");
      return;
    }
    addPurchaseInvoice({
      supplier: purchaseSupplier || undefined,
      notes: purchaseNotes || undefined,
      items: validItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.qty,
        costPrice: item.cost,
        totalCost: item.qty * item.cost,
      })),
      totalCost: cartTotal,
      totalQuantity: cartTotalBoxes,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "تم تسجيل الفاتورة ✓",
      `${validItems.length} صنف — ${cartTotalBoxes} كروز — ${cartTotal.toFixed(2)} د.أ\nتمت إضافتها للمستودع الرئيسي`
    );
    setShowPurchaseModal(false);
  };

  const sortedPurchases = [...(purchases || [])].reverse();
  const sortedInvoices = [...(purchaseInvoices || [])].reverse();
  const totalPurchasesValue = (purchaseInvoices || []).reduce((s, p) => s + p.totalCost, 0);
  const totalPurchasesQty = (purchaseInvoices || []).reduce((s, p) => s + p.totalQuantity, 0);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={isAdmin ? "المستودع الرئيسي" : "مخزوني"} />

      {isAdmin && (
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setActiveTab("warehouse")}
            style={[styles.tab, activeTab === "warehouse" && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
          >
            <Feather name="package" size={16} color={activeTab === "warehouse" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: activeTab === "warehouse" ? colors.primary : colors.mutedForeground }]}>
              المستودع
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("purchases")}
            style={[styles.tab, activeTab === "purchases" && { borderBottomWidth: 2, borderBottomColor: "#22c55e" }]}
          >
            <Feather name="shopping-cart" size={16} color={activeTab === "purchases" ? "#22c55e" : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: activeTab === "purchases" ? "#22c55e" : colors.mutedForeground }]}>
              المشتريات
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── ملخص المستودع الرئيسي للمدير ─── */}
      {isAdmin && activeTab === "warehouse" && warehouseSummary && (
        <View style={[styles.warehouseSummary, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {/* ── أعداد الأصناف ── */}
          <View style={[styles.skuRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.skuCard, { backgroundColor: "#22c55e14" }]}>
              <Feather name="layers" size={15} color="#22c55e" />
              <Text style={[styles.skuVal, { color: "#22c55e" }]}>{warehouseSummary.totalSKUs}</Text>
              <Text style={[styles.skuLbl, { color: colors.mutedForeground }]}>صنف متوفر</Text>
            </View>
            {warehouseSummary.lowStockSKUs > 0 && (
              <View style={[styles.skuCard, { backgroundColor: "#f59e0b14" }]}>
                <Feather name="alert-triangle" size={15} color="#f59e0b" />
                <Text style={[styles.skuVal, { color: "#f59e0b" }]}>{warehouseSummary.lowStockSKUs}</Text>
                <Text style={[styles.skuLbl, { color: colors.mutedForeground }]}>يوشك النفاذ</Text>
              </View>
            )}
            {warehouseSummary.zeroStockSKUs > 0 && (
              <View style={[styles.skuCard, { backgroundColor: "#dc262614" }]}>
                <Feather name="x-circle" size={15} color="#dc2626" />
                <Text style={[styles.skuVal, { color: "#dc2626" }]}>{warehouseSummary.zeroStockSKUs}</Text>
                <Text style={[styles.skuLbl, { color: colors.mutedForeground }]}>نفذ المخزون</Text>
              </View>
            )}
            <View style={[styles.skuCard, { backgroundColor: colors.primary + "14" }]}>
              <Feather name="package" size={15} color={colors.primary} />
              <Text style={[styles.skuVal, { color: colors.primary }]}>{warehouseSummary.totalBoxes.toLocaleString()}</Text>
              <Text style={[styles.skuLbl, { color: colors.mutedForeground }]}>كروز إجمالي</Text>
            </View>
          </View>

          <View style={styles.summaryTopRow}>
            <View style={[styles.summaryBigCard, { backgroundColor: colors.primary + "14" }]}>
              <Feather name="package" size={20} color={colors.primary} />
              <Text style={[styles.summaryBigVal, { color: colors.primary }]}>
                {warehouseSummary.totalBoxes.toLocaleString()}
              </Text>
              <Text style={[styles.summaryBigLbl, { color: colors.mutedForeground }]}>إجمالي الكروزات</Text>
            </View>
            <View style={[styles.summaryBigCard, { backgroundColor: "#dc262614" }]}>
              <Feather name="tag" size={20} color="#dc2626" />
              <Text style={[styles.summaryBigVal, { color: "#dc2626" }]}>
                {warehouseSummary.totalCostValue.toFixed(0)}
              </Text>
              <Text style={[styles.summaryBigLbl, { color: colors.mutedForeground }]}>قيمة التكلفة (د.أ)</Text>
            </View>
            <View style={[styles.summaryBigCard, { backgroundColor: "#22c55e14" }]}>
              <Feather name="dollar-sign" size={20} color="#22c55e" />
              <Text style={[styles.summaryBigVal, { color: "#22c55e" }]}>
                {warehouseSummary.totalSellValue.toFixed(0)}
              </Text>
              <Text style={[styles.summaryBigLbl, { color: colors.mutedForeground }]}>قيمة البيع (سعر 2)</Text>
            </View>
          </View>

          {/* الصف السفلي — توزيع حسب الفئة */}
          {Object.keys(warehouseSummary.byCategory).length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categorySummaryRow}
            >
              {Object.entries(warehouseSummary.byCategory)
                .sort((a, b) => b[1].boxes - a[1].boxes)
                .map(([cat, data]) => (
                  <View key={cat} style={[styles.catChipStat, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                    <Text style={[styles.catChipName, { color: colors.foreground }]}>{cat}</Text>
                    <Text style={[{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
                      {data.skus} صنف
                    </Text>
                    <Text style={[styles.catChipBoxes, { color: colors.primary }]}>
                      {data.boxes.toLocaleString()} علبة
                    </Text>
                    <Text style={[styles.catChipVal, { color: colors.mutedForeground }]}>
                      {data.costVal.toFixed(0)} د.أ
                    </Text>
                  </View>
                ))}
            </ScrollView>
          )}

          {/* الهامش التقريبي */}
          {warehouseSummary.totalCostValue > 0 && (
            <View style={[styles.marginRow, { backgroundColor: "#f59e0b12", borderRadius: 8 }]}>
              <Feather name="trending-up" size={14} color="#f59e0b" />
              <Text style={[styles.marginText, { color: "#f59e0b" }]}>
                الهامش المتوقع:{" "}
                <Text style={{ fontFamily: "Inter_700Bold" }}>
                  {(warehouseSummary.totalSellValue - warehouseSummary.totalCostValue).toFixed(0)} د.أ
                </Text>
                {" "}({(
                  ((warehouseSummary.totalSellValue - warehouseSummary.totalCostValue) / warehouseSummary.totalSellValue) * 100
                ).toFixed(1)}%)
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ─── ملخص مخزون المندوب ─── */}
      {!isAdmin && (
        <View style={[styles.driverSummaryBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.driverStat, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="package" size={16} color={colors.primary} />
            <Text style={[styles.driverStatVal, { color: colors.primary }]}>{totalVanBoxes}</Text>
            <Text style={[styles.driverStatLbl, { color: colors.mutedForeground }]}>علبة إجمالي</Text>
          </View>
          <View style={[styles.driverStat, { backgroundColor: "#8b5cf618" }]}>
            <Feather name="layers" size={16} color="#8b5cf6" />
            <Text style={[styles.driverStatVal, { color: "#8b5cf6" }]}>{totalVanSKUs}</Text>
            <Text style={[styles.driverStatLbl, { color: colors.mutedForeground }]}>صنف متوفر</Text>
          </View>
          {lowStockCount > 0 && (
            <View style={[styles.driverStat, { backgroundColor: "#ef444418" }]}>
              <Feather name="alert-triangle" size={16} color="#ef4444" />
              <Text style={[styles.driverStatVal, { color: "#ef4444" }]}>{lowStockCount}</Text>
              <Text style={[styles.driverStatLbl, { color: colors.mutedForeground }]}>منخفض</Text>
            </View>
          )}
        </View>
      )}

      {/* ─── تبويب المستودع ─── */}
      {(!isAdmin || activeTab === "warehouse") && (
        <>
          <View style={[styles.searchRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <Input
              placeholder="بحث عن منتج..."
              value={search}
              onChangeText={setSearch}
              style={[styles.searchInput, { backgroundColor: "transparent", borderWidth: 0 }]}
            />
            {isAdmin && (
              <TouchableOpacity
                onPress={openAddProduct}
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={displayProducts}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 10 }}
            ListHeaderComponent={!isAdmin && (() => {
              const vanInvData = vanInventory[vanId || ""] || [];
              const nearEmpty = vanInvData.filter((vi) => vi.quantity > 0 && vi.quantity <= 5);
              const outOfStock = vanInvData.filter((vi) => vi.quantity === 0);
              if (nearEmpty.length === 0 && outOfStock.length === 0) return null;
              return (
                <View style={{ gap: 8, marginBottom: 8 }}>
                  {nearEmpty.length > 0 && (
                    <View style={[styles.alertBanner, { backgroundColor: "#fff7ed", borderColor: "#fb923c" }]}>
                      <View style={styles.alertRow}>
                        <Feather name="alert-triangle" size={16} color="#ea580c" />
                        <Text style={[styles.alertTitle, { color: "#ea580c" }]}>
                          {nearEmpty.length} صنف على وشك النفاذ
                        </Text>
                      </View>
                      {nearEmpty.map((vi) => {
                        const prod = products.find((p) => p.id === vi.productId);
                        return (
                          <View key={vi.productId} style={styles.alertItemRow}>
                            <Text style={[styles.alertItemName, { color: "#c2410c" }]}>{prod?.name || vi.productId}</Text>
                            <Text style={[styles.alertItemQty, { backgroundColor: "#fed7aa", color: "#c2410c" }]}>
                              {vi.quantity} كروز
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  {outOfStock.length > 0 && (
                    <View style={[styles.alertBanner, { backgroundColor: "#fef2f2", borderColor: "#f87171" }]}>
                      <View style={styles.alertRow}>
                        <Feather name="x-circle" size={16} color="#dc2626" />
                        <Text style={[styles.alertTitle, { color: "#dc2626" }]}>
                          {outOfStock.length} صنف نفذت كميته — تواصل مع المدير لتحويل مخزون
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })()}
            renderItem={({ item }) => {
              const qty = getQty(item.id);
              const lowStock = qty < 10;
              return (
                <Card style={styles.productCard}>
                  <View style={styles.productTop}>
                    <View style={[styles.categoryBadge, { backgroundColor: colors.primary + "18" }]}>
                      <Text style={[styles.category, { color: colors.primary }]}>{item.category}</Text>
                    </View>
                    {isAdmin && (
                      <TouchableOpacity onPress={() => openEditProduct(item)} style={styles.editBtn}>
                        <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                        <Text style={[styles.editBtnText, { color: colors.mutedForeground }]}>تعديل</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.productName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.brand, { color: colors.mutedForeground }]}>{item.brand}</Text>

                  {isAdmin ? (
                    <>
                      <View style={styles.priceRow}>
                        {item.priceSpecial > 0 && (
                          <>
                            <View style={styles.priceItem}>
                              <Text style={[styles.priceLabel, { color: "#e67e22" }]}>سعر 1</Text>
                              <Text style={[styles.priceVal, { color: "#e67e22" }]}>{item.priceSpecial}</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                          </>
                        )}
                        <View style={styles.priceItem}>
                          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>سعر 2</Text>
                          <Text style={[styles.priceVal, { color: colors.primary }]}>{item.priceLow}</Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.priceItem}>
                          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>سعر 3</Text>
                          <Text style={[styles.priceVal, { color: colors.success }]}>{item.priceHigh}</Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.priceItem}>
                          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>التكلفة</Text>
                          <Text style={[styles.priceVal, { color: colors.foreground }]}>{item.costPrice}</Text>
                        </View>
                      </View>
                      <View style={styles.stockRow}>
                        {qty === 0 ? (
                          <Badge label="نفذ المخزون" variant="destructive" />
                        ) : lowStock ? (
                          <Badge label="يوشك النفاذ" variant="warning" />
                        ) : (
                          <Badge label="متوفر" variant="success" />
                        )}
                        <View style={[styles.qtyPill, {
                          backgroundColor: qty === 0 ? "#fef2f2" : lowStock ? "#fff7ed" : "#f0fdf4",
                          borderColor: qty === 0 ? "#fca5a5" : lowStock ? "#fdba74" : "#86efac",
                        }]}>
                          <Feather
                            name={qty === 0 ? "x-circle" : "package"}
                            size={12}
                            color={qty === 0 ? "#dc2626" : lowStock ? "#ea580c" : "#16a34a"}
                          />
                          <Text style={[styles.stockQty, {
                            color: qty === 0 ? "#dc2626" : lowStock ? "#ea580c" : "#16a34a",
                            fontFamily: "Inter_700Bold",
                          }]}>
                            {qty} كروز
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : qty === 0 ? (
                    <View style={[styles.driverQtyBox, {
                      backgroundColor: "#fef2f2",
                      borderRadius: colors.radius,
                      borderWidth: 1, borderColor: "#fca5a5",
                    }]}>
                      <Feather name="x-circle" size={18} color="#dc2626" />
                      <Text style={[styles.driverQtyLabel, { color: "#dc2626", fontFamily: "Inter_700Bold" }]}>
                        نفذت الكمية
                      </Text>
                      <Text style={{ fontSize: 11, color: "#ef4444", fontFamily: "Inter_400Regular", textAlign: "center" }}>
                        تواصل مع المدير{"\n"}لتحويل مخزون
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.driverQtyBox, {
                      backgroundColor: qty <= 5 ? "#fff7ed" : colors.primary + "12",
                      borderRadius: colors.radius,
                      borderWidth: qty <= 5 ? 1 : 0,
                      borderColor: qty <= 5 ? "#fb923c" : "transparent",
                    }]}>
                      <Feather name="package" size={18} color={qty <= 5 ? "#ea580c" : colors.primary} />
                      <Text style={[styles.driverQtyLabel, { color: colors.mutedForeground }]}>الكمية</Text>
                      <Text style={[styles.driverQtyVal, { color: qty <= 5 ? "#ea580c" : colors.primary }]}>
                        {qty} كروز
                      </Text>
                      {qty <= 5 && (
                        <Badge label="⚠ يوشك النفاذ" variant="warning" />
                      )}
                    </View>
                  )}
                </Card>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="package" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد منتجات</Text>
                {isAdmin && (
                  <Button title="إضافة منتج" icon="plus" onPress={openAddProduct} small variant="secondary" />
                )}
              </View>
            }
          />
        </>
      )}

      {/* ─── تبويب المشتريات ─── */}
      {isAdmin && activeTab === "purchases" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.purchasesHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.purchasesStats}>
              <View style={[styles.statBox, { backgroundColor: "#22c55e18", borderRadius: 10 }]}>
                <Text style={[styles.statVal, { color: "#22c55e" }]}>{sortedInvoices.length}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>فاتورة شراء</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: "#3b82f618", borderRadius: 10 }]}>
                <Text style={[styles.statVal, { color: "#3b82f6" }]}>{totalPurchasesQty}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>كروز</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.primary + "18", borderRadius: 10 }]}>
                <Text style={[styles.statVal, { color: colors.primary }]}>{totalPurchasesValue.toFixed(2)}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>د.أ إجمالي</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={openAddPurchase}
              style={[styles.addPurchaseBtn, { backgroundColor: "#22c55e" }]}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addPurchaseBtnText}>تسجيل مشتريات</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={sortedInvoices}
            keyExtractor={(inv) => inv.id}
            contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 10 }}
            renderItem={({ item: inv }) => {
              const isExpanded = expandedInvoice === inv.id;
              return (
                <Card style={[styles.purchaseCard, { borderRightWidth: 3, borderRightColor: "#22c55e", padding: 0, overflow: "hidden" }]}>
                  {/* ─── رأس الفاتورة ─── */}
                  <TouchableOpacity
                    onPress={() => setExpandedInvoice(isExpanded ? null : inv.id)}
                    activeOpacity={0.8}
                    style={{ padding: 12 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <View style={{ backgroundColor: "#22c55e", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>{inv.invoiceRef}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                            {new Date(inv.date).toLocaleDateString("ar-SA")} {new Date(inv.date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        </View>
                        {inv.supplier ? (
                          <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                            المورد: {inv.supplier}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 2 }}>
                        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#22c55e" }}>{inv.totalCost.toFixed(2)} د.أ</Text>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                          {inv.items.length} صنف · {inv.totalQuantity} كروز
                        </Text>
                      </View>
                      <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={colors.mutedForeground}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* ─── أصناف الفاتورة (قابلة للطي) ─── */}
                  {isExpanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                      {inv.items.map((item, idx) => (
                        <View
                          key={idx}
                          style={{
                            flexDirection: "row", alignItems: "center",
                            paddingVertical: 9, paddingHorizontal: 12,
                            borderBottomWidth: idx < inv.items.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <View style={{
                            width: 28, height: 28, borderRadius: 8,
                            backgroundColor: "#22c55e20",
                            alignItems: "center", justifyContent: "center", marginLeft: 10,
                          }}>
                            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#22c55e" }}>{idx + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                              {item.productName}
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
                              {item.quantity} كروز × {item.costPrice.toFixed(2)} د.أ
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                            {item.totalCost.toFixed(2)} د.أ
                          </Text>
                        </View>
                      ))}
                      {inv.notes ? (
                        <View style={{ padding: 10, backgroundColor: colors.accent }}>
                          <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                            ملاحظة: {inv.notes}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </Card>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="shopping-cart" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد فواتير مشتريات</Text>
                <Button title="تسجيل مشتريات" icon="plus" onPress={openAddPurchase} small variant="secondary" />
              </View>
            }
          />
        </View>
      )}

      {/* ─── مودال إضافة/تعديل المنتج ─── */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
              </Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Input label="اسم المنتج *" value={productForm.name} onChangeText={(v) => setProductForm({ ...productForm, name: v })} placeholder="مارلبورو أحمر" />
              <Input label="الماركة" value={productForm.brand} onChangeText={(v) => setProductForm({ ...productForm, brand: v })} placeholder="مارلبورو" />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>الفئة</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setProductForm({ ...productForm, category: cat })}
                    style={[styles.catChip, {
                      backgroundColor: productForm.category === cat ? colors.primary : colors.accent,
                      borderColor: productForm.category === cat ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[styles.catChipText, { color: productForm.category === cat ? "#fff" : colors.foreground }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.priceSection, { backgroundColor: "#e67e2210", borderRadius: 10 }]}>
                <Text style={[styles.priceSectionTitle, { color: "#e67e22" }]}>الأسعار</Text>
                <Input label="سعر 1 (يحتاج موافقة — 0 = غير مفعّل)" value={productForm.priceSpecial} onChangeText={(v) => setProductForm({ ...productForm, priceSpecial: v })} keyboardType="decimal-pad" placeholder="0" />
                <Input label="سعر 2 — أقل من 50 كروز *" value={productForm.priceLow} onChangeText={(v) => setProductForm({ ...productForm, priceLow: v })} keyboardType="decimal-pad" placeholder="15.00" />
                <Input label="سعر 3 — 50 كروز فأكثر" value={productForm.priceHigh} onChangeText={(v) => setProductForm({ ...productForm, priceHigh: v })} keyboardType="decimal-pad" placeholder="13.50" />
                <Input label="سعر الشراء (التكلفة)" value={productForm.costPrice} onChangeText={(v) => setProductForm({ ...productForm, costPrice: v })} keyboardType="decimal-pad" placeholder="12.00" />
              </View>

              {!editProduct && (
                <Input label="الكمية الابتدائية في المستودع" value={productForm.stock} onChangeText={(v) => setProductForm({ ...productForm, stock: v })} keyboardType="number-pad" placeholder="0" />
              )}

              <Button title={editProduct ? "حفظ التعديلات" : "إضافة المنتج"} icon="check" onPress={handleSaveProduct} style={{ marginTop: 8, marginBottom: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── مودال تسجيل المشتريات (سلة متعددة) ─── */}
      <Modal visible={showPurchaseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>تسجيل مشتريات</Text>
                {cartItems.length > 0 && (
                  <Text style={{ fontSize: 12, color: "#22c55e", fontFamily: "Inter_500Medium" }}>
                    {cartItems.length} صنف في السلة — {cartTotal.toFixed(2)} د.أ
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowPurchaseModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── السلة الحالية ── */}
              {cartItems.length > 0 && (
                <View style={[{ borderRadius: 12, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: "#22c55e40" }]}>
                  <View style={{ backgroundColor: "#22c55e12", padding: 10, flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: "#22c55e" }}>السلة</Text>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground }}>
                      {cartTotalBoxes} علبة
                    </Text>
                  </View>
                  {cartItems.map((item, idx) => (
                    <View key={item.id} style={[{
                      flexDirection: "row", alignItems: "center", padding: 10,
                      borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: colors.border,
                      backgroundColor: colors.card,
                    }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground }]} numberOfLines={1}>
                          {item.productName}
                        </Text>
                        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground }}>
                          {item.qty} علبة × {item.cost.toFixed(2)} = {(item.qty * item.cost).toFixed(2)} د.أ
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setCartItems((prev) => prev.filter((c) => c.id !== item.id))}
                        style={{ padding: 6 }}
                      >
                        <Feather name="trash-2" size={16} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={{ backgroundColor: "#22c55e", padding: 10, flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" }}>الإجمالي</Text>
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" }}>{cartTotal.toFixed(2)} د.أ</Text>
                  </View>
                </View>
              )}

              {/* ── إضافة صنف جديد للسلة ── */}
              <View style={[{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 12 }]}>
                <View style={{ backgroundColor: colors.accent, padding: 10, flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: colors.foreground }}>
                    {cartItems.length === 0 ? "أضف صنفاً" : "أضف صنفاً آخر"}
                  </Text>
                  <View style={[styles.toggleRow, { backgroundColor: colors.border, borderRadius: 8, padding: 2, marginBottom: 0, gap: 0 }]}>
                    <TouchableOpacity
                      onPress={() => setShowNewProductInPurchase(false)}
                      style={[{ paddingHorizontal: 10, paddingVertical: 4 }, !showNewProductInPurchase && { backgroundColor: colors.card, borderRadius: 6 }]}
                    >
                      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: !showNewProductInPurchase ? colors.primary : colors.mutedForeground }}>
                        موجود
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowNewProductInPurchase(true)}
                      style={[{ paddingHorizontal: 10, paddingVertical: 4 }, showNewProductInPurchase && { backgroundColor: "#22c55e20", borderRadius: 6 }]}
                    >
                      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: showNewProductInPurchase ? "#22c55e" : colors.mutedForeground }}>
                        جديد
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ padding: 10 }}>
                  {!showNewProductInPurchase ? (
                    <>
                      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>المنتج *</Text>
                      <TouchableOpacity
                        onPress={() => { setProductPickerSearch(""); setShowProductPicker(true); }}
                        style={[styles.productPickerBtn, { borderColor: colors.border, backgroundColor: colors.accent }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.productPickerText, { color: curProduct ? colors.foreground : colors.mutedForeground }]}>
                            {curProduct ? curProduct.name : "اضغط لاختيار المنتج..."}
                          </Text>
                          {curProduct && (() => {
                            const mainQty = (vanInventory.main || []).find((vi) => vi.productId === curProduct.id)?.quantity || 0;
                            return (
                              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: mainQty > 0 ? "#22c55e" : "#f59e0b", marginTop: 1 }}>
                                المستودع الحالي: {mainQty} كروز
                              </Text>
                            );
                          })()}
                        </View>
                        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={[{ backgroundColor: "#22c55e10", borderRadius: 10, padding: 8, marginBottom: 4 }]}>
                      <Text style={[styles.priceSectionTitle, { color: "#22c55e" }]}>بيانات المنتج الجديد</Text>
                      <Input label="اسم المنتج *" value={newProductInPurchase.name} onChangeText={(v) => setNewProductInPurchase({ ...newProductInPurchase, name: v })} placeholder="اسم المنتج" />
                      <Input label="الماركة" value={newProductInPurchase.brand} onChangeText={(v) => setNewProductInPurchase({ ...newProductInPurchase, brand: v })} placeholder="الماركة" />
                      <Input label="سعر 2 *" value={newProductInPurchase.priceLow} onChangeText={(v) => setNewProductInPurchase({ ...newProductInPurchase, priceLow: v })} keyboardType="decimal-pad" placeholder="0.00" />
                      <Input label="سعر 3" value={newProductInPurchase.priceHigh} onChangeText={(v) => setNewProductInPurchase({ ...newProductInPurchase, priceHigh: v })} keyboardType="decimal-pad" placeholder="0.00" />
                    </View>
                  )}

                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Input label="الكمية *" value={curQty} onChangeText={setCurQty} keyboardType="number-pad" placeholder="0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input label="سعر الشراء/علبة *" value={curCost} onChangeText={setCurCost} keyboardType="decimal-pad" placeholder="0.00" />
                    </View>
                  </View>

                  {curQty && curCost ? (
                    <View style={[styles.totalPreview, { backgroundColor: "#22c55e18", borderRadius: 10 }]}>
                      <Text style={[styles.totalPreviewLabel, { color: colors.mutedForeground }]}>قيمة هذا الصنف</Text>
                      <Text style={[styles.totalPreviewVal, { color: "#22c55e" }]}>
                        {(parseInt(curQty || "0") * parseFloat(curCost || "0")).toFixed(2)} د.أ
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleAddToCart}
                    style={{
                      flexDirection: "row", alignItems: "center", justifyContent: "center",
                      gap: 8, backgroundColor: "#3b82f6", borderRadius: 10,
                      paddingVertical: 11, marginTop: 8,
                    }}
                  >
                    <Feather name="plus-circle" size={17} color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>
                      أضف للسلة
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ─── المورد والملاحظات ─── */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>المورد (مشترك لجميع الأصناف)</Text>
              <TouchableOpacity
                onPress={() => { setSupplierSearch(""); setShowSupplierPicker(true); }}
                style={[styles.productPickerBtn, { borderColor: colors.border, backgroundColor: colors.accent }]}
              >
                <Text style={[styles.productPickerText, { color: purchaseSupplier ? colors.foreground : colors.mutedForeground }]}>
                  {purchaseSupplier || "اضغط لاختيار مورد..."}
                </Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {purchaseSupplier ? (
                    <TouchableOpacity onPress={() => setPurchaseSupplier("")}>
                      <Feather name="x-circle" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  ) : null}
                  <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
              <Input label="ملاحظات" value={purchaseNotes} onChangeText={setPurchaseNotes} placeholder="ملاحظات..." multiline />

              {/* ─── ملخص نهائي للفاتورة ─── */}
              {cartItems.length > 0 && (
                <View style={{
                  borderRadius: 14, overflow: "hidden",
                  borderWidth: 1.5, borderColor: "#22c55e",
                  marginTop: 8, marginBottom: 4,
                }}>
                  <View style={{ backgroundColor: "#22c55e", paddingVertical: 8, paddingHorizontal: 14 }}>
                    <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13, textAlign: "center" }}>
                      ملخص الفاتورة
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", backgroundColor: colors.card }}>
                    {/* عدد الأصناف */}
                    <View style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderLeftWidth: 1, borderLeftColor: colors.border }}>
                      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#3b82f6" }}>
                        {cartItems.length}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                        صنف
                      </Text>
                    </View>
                    {/* إجمالي الكروز */}
                    <View style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderLeftWidth: 1, borderLeftColor: colors.border }}>
                      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#e8531d" }}>
                        {cartTotalBoxes}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                        كروز
                      </Text>
                    </View>
                    {/* إجمالي القيمة */}
                    <View style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
                      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#22c55e" }}>
                        {cartTotal.toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                        د.أ
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <Button
                title={cartItems.length === 0 ? "السلة فارغة" : `تأكيد الفاتورة (${cartItems.length} صنف)`}
                icon="check"
                onPress={handleConfirmAllPurchases}
                style={{ marginTop: 8, marginBottom: 20, backgroundColor: cartItems.length > 0 ? "#22c55e" : "#9ca3af" }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── منتقي المنتجات ─── */}
      <Modal visible={showProductPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>اختر منتجاً</Text>
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Input placeholder="بحث..." value={productPickerSearch} onChangeText={setProductPickerSearch} />
            <FlatList
              data={products.filter((p) => p.name.includes(productPickerSearch) || p.brand.includes(productPickerSearch))}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => {
                const mainQty = (vanInventory.main || []).find((vi) => vi.productId === item.id)?.quantity || 0;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setCurProductId(item.id);
                      if (!curCost) setCurCost(String(item.costPrice));
                      setShowProductPicker(false);
                    }}
                    style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemName, { color: colors.foreground }]}>{item.name}</Text>
                      <Text style={[styles.pickerItemSub, { color: colors.mutedForeground }]}>{item.brand}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 3 }}>
                      <Text style={[styles.pickerItemPrice, { color: colors.primary }]}>{item.costPrice} د.أ</Text>
                      <View style={[{
                        flexDirection: "row", alignItems: "center", gap: 4,
                        backgroundColor: mainQty > 0 ? "#22c55e15" : "#f59e0b15",
                        borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
                      }]}>
                        <Feather name="package" size={10} color={mainQty > 0 ? "#22c55e" : "#f59e0b"} />
                        <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: mainQty > 0 ? "#22c55e" : "#f59e0b" }}>
                          {mainQty} كروز
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center", padding: 20 }]}>
                  لا يوجد نتائج
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ─── منتقي الموردين ─── */}
      <Modal visible={showSupplierPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>اختر مورداً</Text>
              <TouchableOpacity onPress={() => setShowSupplierPicker(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Input placeholder="بحث عن مورد..." value={supplierSearch} onChangeText={setSupplierSearch} />
            <FlatList
              data={(suppliers || []).filter((s) =>
                s.name.includes(supplierSearch) || (s.phone || "").includes(supplierSearch)
              )}
              keyExtractor={(s) => s.id}
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setPurchaseSupplier(item.name);
                    setShowSupplierPicker(false);
                  }}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerItemName, { color: colors.foreground }]}>{item.name}</Text>
                    {item.phone ? (
                      <Text style={[styles.pickerItemSub, { color: colors.mutedForeground }]}>{item.phone}</Text>
                    ) : null}
                  </View>
                  <Feather name="truck" size={16} color="#b45309" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: "center", gap: 12 }}>
                  <Feather name="truck" size={32} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center" }]}>
                    {supplierSearch ? "لا يوجد نتائج" : "لا يوجد موردون محفوظون"}
                  </Text>
                  <Text style={[{ color: colors.mutedForeground, textAlign: "center", fontSize: 12 }]}>
                    أضف موردين من قائمة "الموردون" في لوحة المدير
                  </Text>
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
  },
  tabText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  warehouseSummary: {
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  summaryTopRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryBigCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  summaryBigVal: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    lineHeight: 24,
  },
  summaryBigLbl: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  categorySummaryRow: {
    gap: 8,
    paddingVertical: 2,
  },
  catChipStat: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    gap: 3,
    minWidth: 80,
  },
  catChipName: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  catChipBoxes: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  catChipVal: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  marginRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
  },
  marginText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    textAlign: "right",
  },
  driverSummaryBar: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    justifyContent: "center",
  },
  driverStat: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  driverStatVal: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  driverStatLbl: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, marginBottom: 0 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  productCard: { gap: 8 },
  productTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  category: { fontSize: 11, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  editBtnText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  productName: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  brand: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  priceRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 8 },
  priceItem: { alignItems: "center", flex: 1 },
  priceLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  priceVal: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  divider: { width: 1, marginHorizontal: 4 },
  stockRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  stockQty: { fontSize: 13, fontFamily: "Inter_700Bold" },
  qtyPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  skuRow: {
    flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 10,
    borderBottomWidth: 1,
  },
  skuCard: {
    flex: 1, alignItems: "center", gap: 3,
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4,
  },
  skuVal: { fontSize: 18, fontFamily: "Inter_700Bold", fontWeight: "900" },
  skuLbl: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  driverQtyBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginTop: 6 },
  driverQtyLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  driverQtyVal: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  alertBanner: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  alertItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
  alertItemName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  alertItemQty: { fontSize: 12, fontFamily: "Inter_700Bold", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  empty: { alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  purchasesHeader: {
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  purchasesStats: { flexDirection: "row", gap: 12 },
  statBox: { flex: 1, padding: 12, alignItems: "center", gap: 4 },
  statVal: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  addPurchaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addPurchaseBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  purchaseCard: { gap: 6 },
  purchaseTop: { flexDirection: "row", justifyContent: "space-between" },
  purchaseName: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  purchaseSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  purchaseDate: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  purchaseRight: { alignItems: "flex-end", gap: 2 },
  purchaseTotal: { fontSize: 17, fontWeight: "800", fontFamily: "Inter_700Bold" },
  purchaseQty: { fontSize: 12, fontFamily: "Inter_400Regular" },
  purchaseCostPer: { fontSize: 11, fontFamily: "Inter_400Regular" },
  purchaseNotes: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", borderTopWidth: 1, paddingTop: 6, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { padding: 20, maxHeight: "92%", marginHorizontal: 0 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 8, textAlign: "right" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  priceSection: { padding: 12, marginBottom: 8 },
  priceSectionTitle: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 4 },
  toggleRow: { flexDirection: "row", padding: 4, marginBottom: 14 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  toggleText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  productPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  productPickerText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
  twoCol: { flexDirection: "row", gap: 12 },
  totalPreview: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, marginBottom: 12 },
  totalPreviewLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  totalPreviewVal: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  pickerItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
  pickerItemName: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  pickerItemSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  pickerItemPrice: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
