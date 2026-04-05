import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useMemo } from "react";
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
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function TransferScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vans, products, vanInventory, transferToVan, transfers } = useApp();
  const [selectedVan, setSelectedVan] = useState<string>("");
  const [items, setItems] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [expandedTransfer, setExpandedTransfer] = useState<string | null>(null);
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const mainInventory = vanInventory.main || [];

  const getMainQty = (productId: string) => {
    const item = mainInventory.find((i) => i.productId === productId);
    return item?.quantity || 0;
  };

  const updateQty = (productId: string, qty: number) => {
    const max = getMainQty(productId);
    const safe = Math.max(0, Math.min(qty, max));
    setItems((prev) => ({ ...prev, [productId]: safe }));
  };

  const selectedEntries = Object.entries(items).filter(([, v]) => v > 0);
  const totalItems = selectedEntries.length;
  const totalBoxes = selectedEntries.reduce((s, [, v]) => s + v, 0);

  const availableProducts = useMemo(
    () => products.filter((p) => {
      const qty = getMainQty(p.id);
      if (qty === 0) return false;
      if (!search) return true;
      return p.name.includes(search) || p.brand.includes(search) || p.category.includes(search);
    }),
    [products, mainInventory, search]
  );

  const handleTransfer = () => {
    if (!selectedVan) {
      Alert.alert("خطأ", "يرجى اختيار الفان أولاً");
      return;
    }
    if (totalItems === 0) {
      Alert.alert("خطأ", "يرجى تحديد كمية لصنف واحد على الأقل");
      return;
    }
    const van = vans.find((v) => v.id === selectedVan);
    const transferItems = selectedEntries.map(([productId, quantity]) => ({ productId, quantity }));
    const success = transferToVan(selectedVan, transferItems, notes);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "تم التحويل ✓",
        `تم تحويل ${totalItems} صنف (${totalBoxes} كروز) إلى ${van?.name || ""}`
      );
      setItems({});
      setNotes("");
    } else {
      Alert.alert("خطأ", "الكمية المطلوبة غير متوفرة في المستودع الرئيسي");
    }
  };

  const handleClearAll = () => setItems({});

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="تحويل بضاعة للمندوبين" showBack />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 100, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── اختيار الفان ─── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          <Feather name="truck" size={15} /> اختر المندوب
        </Text>
        <View style={styles.vansRow}>
          {vans.map((van) => {
            const active = selectedVan === van.id;
            return (
              <TouchableOpacity
                key={van.id}
                onPress={() => setSelectedVan(van.id)}
                style={[
                  styles.vanBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather name="truck" size={20} color={active ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.vanBtnText, { color: active ? "#fff" : colors.foreground }]}>
                  {van.name}
                </Text>
                <Text style={[styles.vanBtnSub, { color: active ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>
                  {van.driverName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── ملخص التحويل (يظهر عند اختيار أصناف) ─── */}
        {totalItems > 0 && (
          <View style={[styles.summaryBox, { backgroundColor: "#e8531d12", borderColor: "#e8531d40", borderWidth: 1, borderRadius: 14 }]}>
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryTitle, { color: "#e8531d" }]}>
                ملخص التحويل — {totalItems} صنف
              </Text>
              <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                <Feather name="x" size={14} color="#dc2626" />
                <Text style={styles.clearBtnText}>مسح الكل</Text>
              </TouchableOpacity>
            </View>
            {selectedEntries.map(([productId, qty]) => {
              const product = products.find((p) => p.id === productId);
              return (
                <View key={productId} style={[styles.summaryRow, { borderBottomColor: "#e8531d20" }]}>
                  <Text style={[styles.summaryProd, { color: colors.foreground }]} numberOfLines={1}>
                    {product?.name || productId}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.summaryQty, { color: "#e8531d" }]}>{qty} كروز</Text>
                    <TouchableOpacity onPress={() => updateQty(productId, 0)}>
                      <Feather name="trash-2" size={14} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            <View style={[styles.summaryTotal, { backgroundColor: "#e8531d" }]}>
              <Text style={styles.summaryTotalLbl}>الإجمالي</Text>
              <Text style={styles.summaryTotalVal}>{totalBoxes} كروز — {totalItems} صنف</Text>
            </View>
          </View>
        )}

        {/* ─── البحث عن منتج ─── */}
        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="بحث عن منتج..."
            style={[styles.searchInput, { borderWidth: 0, backgroundColor: "transparent", marginBottom: 0 }]}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ─── قائمة المنتجات ─── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          <Feather name="package" size={15} /> تحديد الكميات ({availableProducts.length} صنف متوفر)
        </Text>

        {availableProducts.length === 0 && (
          <View style={styles.empty}>
            <Feather name="inbox" size={36} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }]}>
              {search ? "لا توجد نتائج" : "المستودع فارغ"}
            </Text>
          </View>
        )}

        {availableProducts.map((product) => {
          const mainQty = getMainQty(product.id);
          const transferQty = items[product.id] || 0;
          const isSelected = transferQty > 0;

          return (
            <Card
              key={product.id}
              style={[
                styles.productCard,
                isSelected && {
                  borderWidth: 2,
                  borderColor: "#e8531d",
                },
              ]}
            >
              {/* رأس المنتج */}
              <View style={styles.productTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                  <Text style={[styles.productBrand, { color: colors.mutedForeground }]}>{product.category}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Badge
                    label={`متوفر: ${mainQty} كروز`}
                    variant={mainQty < 20 ? "warning" : "success"}
                  />
                  {isSelected && (
                    <Badge label={`محدد: ${transferQty}`} variant="primary" />
                  )}
                </View>
              </View>

              {/* شريط الكمية */}
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  onPress={() => updateQty(product.id, 0)}
                  style={[styles.qtyBtn, { backgroundColor: transferQty > 0 ? "#fee2e2" : colors.muted }]}
                >
                  <Feather name="trash-2" size={14} color={transferQty > 0 ? "#dc2626" : colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateQty(product.id, transferQty - 10)}
                  style={[styles.qtyBtn, { backgroundColor: colors.muted }]}
                >
                  <Text style={[styles.qtyBtnText, { color: colors.foreground }]}>-10</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateQty(product.id, transferQty - 1)}
                  style={[styles.qtyBtn, { backgroundColor: colors.muted }]}
                >
                  <Feather name="minus" size={16} color={colors.foreground} />
                </TouchableOpacity>
                <Input
                  value={transferQty > 0 ? String(transferQty) : ""}
                  onChangeText={(v) => updateQty(product.id, parseInt(v) || 0)}
                  keyboardType="number-pad"
                  style={[
                    styles.qtyInput,
                    { borderColor: isSelected ? "#e8531d" : colors.border, backgroundColor: isSelected ? "#fff8f6" : undefined },
                  ]}
                  placeholder="0"
                />
                <TouchableOpacity
                  onPress={() => updateQty(product.id, transferQty + 1)}
                  style={[styles.qtyBtn, { backgroundColor: colors.primary + "18" }]}
                >
                  <Feather name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateQty(product.id, transferQty + 10)}
                  style={[styles.qtyBtn, { backgroundColor: colors.primary + "18" }]}
                >
                  <Text style={[styles.qtyBtnText, { color: colors.primary }]}>+10</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateQty(product.id, mainQty)}
                  style={[styles.qtyBtn, { backgroundColor: "#22c55e18" }]}
                >
                  <Text style={[styles.qtyBtnText, { color: "#22c55e" }]}>كل</Text>
                </TouchableOpacity>
              </View>

              {/* شريط التقدم */}
              {isSelected && (
                <View style={[styles.progressBar, { backgroundColor: colors.accent }]}>
                  <View style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (transferQty / mainQty) * 100)}%`, backgroundColor: "#e8531d" }
                  ]} />
                </View>
              )}
            </Card>
          );
        })}

        <Input
          label="ملاحظات"
          value={notes}
          onChangeText={setNotes}
          placeholder="ملاحظات التحويل..."
          multiline
        />

        {/* ─── سجل التحويلات ─── */}
        {transfers.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>
              <Feather name="clock" size={15} /> آخر التحويلات
            </Text>
            {transfers.slice().reverse().slice(0, 10).map((t) => {
              const isEx = expandedTransfer === t.id;
              const totalBoxes = t.items.reduce((s, i) => s + i.quantity, 0);
              return (
                <Card key={t.id} style={{ padding: 0, overflow: "hidden", borderRightWidth: 3, borderRightColor: "#e8531d" }}>
                  <TouchableOpacity
                    onPress={() => setExpandedTransfer(isEx ? null : t.id)}
                    activeOpacity={0.8}
                    style={{ padding: 12 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          {t.transferRef ? (
                            <View style={{ backgroundColor: "#e8531d", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>{t.transferRef}</Text>
                            </View>
                          ) : null}
                          <Badge label={t.vanName} variant="primary" />
                        </View>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                          {new Date(t.date).toLocaleDateString("ar-SA")} {new Date(t.date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 2 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#e8531d" }}>{totalBoxes} كروز</Text>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{t.items.length} صنف</Text>
                      </View>
                      <Feather name={isEx ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                    </View>
                  </TouchableOpacity>

                  {isEx && (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                      {t.items.map((item, idx) => (
                        <View key={idx} style={{
                          flexDirection: "row", alignItems: "center",
                          paddingVertical: 9, paddingHorizontal: 12,
                          borderBottomWidth: idx < t.items.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}>
                          <View style={{
                            width: 28, height: 28, borderRadius: 8,
                            backgroundColor: "#e8531d20",
                            alignItems: "center", justifyContent: "center", marginLeft: 10,
                          }}>
                            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#e8531d" }}>{idx + 1}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                            {item.productName}
                          </Text>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#e8531d" }}>
                            {item.quantity} كروز
                          </Text>
                        </View>
                      ))}
                      {t.notes ? (
                        <View style={{ padding: 10, backgroundColor: colors.accent }}>
                          <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                            ملاحظة: {t.notes}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* ─── زر التحويل الثابت ─── */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 8 }]}>
        {totalItems > 0 && selectedVan && (
          <Text style={[styles.bottomSummary, { color: colors.mutedForeground }]}>
            {totalItems} صنف · {totalBoxes} كروز → {vans.find((v) => v.id === selectedVan)?.name}
          </Text>
        )}
        <Button
          title={
            !selectedVan
              ? "اختر الفان أولاً"
              : totalItems === 0
              ? "حدد كمية لصنف واحد على الأقل"
              : `تحويل ${totalItems} صنف (${totalBoxes} كروز)`
          }
          icon="send"
          onPress={handleTransfer}
          disabled={!selectedVan || totalItems === 0}
          style={{ backgroundColor: selectedVan && totalItems > 0 ? "#e8531d" : undefined }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right", gap: 6 },
  vansRow: { flexDirection: "row", gap: 12 },
  vanBtn: { flex: 1, padding: 14, alignItems: "center", gap: 6, borderWidth: 2 },
  vanBtnText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vanBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryBox: { gap: 0, overflow: "hidden" },
  summaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  summaryTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  clearBtnText: { fontSize: 12, color: "#dc2626", fontFamily: "Inter_500Medium" },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1,
  },
  summaryProd: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryQty: { fontSize: 13, fontFamily: "Inter_700Bold" },
  summaryTotal: {
    flexDirection: "row", justifyContent: "space-between",
    padding: 10, marginTop: 0,
  },
  summaryTotalLbl: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  summaryTotalVal: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
  },
  searchInput: { flex: 1 },
  empty: { alignItems: "center", gap: 10, padding: 32 },
  productCard: { gap: 10 },
  productTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  productName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  productBrand: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 5 },
  qtyBtn: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  qtyInput: { flex: 1, textAlign: "center", marginBottom: 0 },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  transferRecord: { gap: 6 },
  transferTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  transferDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  transferPill: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  transferPillText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16, borderTopWidth: 1, gap: 6,
  },
  bottomSummary: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
