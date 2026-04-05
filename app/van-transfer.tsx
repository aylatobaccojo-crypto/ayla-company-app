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

export default function VanTransferScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    currentUser, vans, products, vanInventory,
    vanTransferRequests, requestVanTransfer,
  } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myVanId = currentUser?.vanId || "";
  const myVan = vans.find((v) => v.id === myVanId);
  const myInventory = vanInventory[myVanId] || [];

  const [toVanId, setToVanId] = useState("");
  const [items, setItems] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  const getMyQty = (productId: string) =>
    myInventory.find((i) => i.productId === productId)?.quantity || 0;

  const updateQty = (productId: string, qty: number) => {
    const max = getMyQty(productId);
    setItems((prev) => ({ ...prev, [productId]: Math.max(0, Math.min(qty, max)) }));
  };

  const otherVans = vans.filter((v) => v.id !== myVanId);

  const selectedEntries = Object.entries(items).filter(([, v]) => v > 0);
  const totalItems = selectedEntries.length;
  const totalBoxes = selectedEntries.reduce((s, [, v]) => s + v, 0);

  const availableProducts = useMemo(
    () => products.filter((p) => {
      if (getMyQty(p.id) === 0) return false;
      if (!search) return true;
      return p.name.includes(search) || p.category.includes(search);
    }),
    [products, myInventory, search]
  );

  const myRequests = (vanTransferRequests || [])
    .filter((r) => r.fromVanId === myVanId || r.toVanId === myVanId)
    .slice().reverse()
    .slice(0, 15);

  const handleSubmit = () => {
    if (!toVanId) { Alert.alert("خطأ", "اختر الفان المستلم"); return; }
    if (totalItems === 0) { Alert.alert("خطأ", "حدد كمية لصنف واحد على الأقل"); return; }

    const transferItems = selectedEntries.map(([productId, quantity]) => ({
      productId,
      productName: products.find((p) => p.id === productId)?.name || productId,
      quantity,
    }));

    requestVanTransfer({ fromVanId: myVanId, toVanId, items: transferItems, notes });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "تم إرسال الطلب ✓",
      `طلبك بانتظار موافقة المدير\n${totalItems} صنف · ${totalBoxes} كروز`
    );
    setItems({});
    setNotes("");
    setToVanId("");
  };

  const statusBadge = (s: string) => {
    if (s === "pending") return <Badge label="بانتظار الموافقة" variant="warning" />;
    if (s === "approved") return <Badge label="مقبول ✓" variant="success" />;
    return <Badge label="مرفوض ✗" variant="destructive" />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="تحويل بين الفانات" showBack />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 100, gap: 14 }}
        keyboardShouldPersistTaps="handled">

        {/* ─── اختيار الفان المستلم ─── */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أرسل إلى فان:</Text>
        <View style={styles.vansRow}>
          {otherVans.map((van) => {
            const active = toVanId === van.id;
            return (
              <TouchableOpacity
                key={van.id}
                onPress={() => setToVanId(van.id)}
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
                <Text style={[styles.vanBtnText, { color: active ? "#fff" : colors.foreground }]}>{van.name}</Text>
                <Text style={[styles.vanBtnSub, { color: active ? "rgba(255,255,255,0.75)" : colors.mutedForeground }]}>
                  {van.driverName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── ملخص ─── */}
        {totalItems > 0 && (
          <View style={[styles.summaryBox, { backgroundColor: "#e8531d12", borderColor: "#e8531d40", borderRadius: 14, borderWidth: 1 }]}>
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryTitle, { color: "#e8531d" }]}>{totalItems} صنف · {totalBoxes} كروز</Text>
              <TouchableOpacity onPress={() => setItems({})}>
                <Text style={{ color: "#dc2626", fontSize: 12, fontFamily: "Inter_500Medium" }}>مسح الكل</Text>
              </TouchableOpacity>
            </View>
            {selectedEntries.map(([pid, qty]) => (
              <View key={pid} style={[styles.summaryRow, { borderBottomColor: "#e8531d20" }]}>
                <Text style={[styles.summaryProd, { color: colors.foreground }]} numberOfLines={1}>
                  {products.find((p) => p.id === pid)?.name}
                </Text>
                <Text style={[styles.summaryQty, { color: "#e8531d" }]}>{qty} كروز</Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── تنبيه موافقة المدير ─── */}
        <View style={[styles.infoBanner, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            يتطلب التحويل بين الفانات موافقة المدير. ستُخصم الكميات فور الموافقة.
          </Text>
        </View>

        {/* ─── بحث ─── */}
        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <Input value={search} onChangeText={setSearch} placeholder="بحث..."
            style={{ flex: 1, borderWidth: 0, backgroundColor: "transparent", marginBottom: 0 }} />
          {search ? <TouchableOpacity onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></TouchableOpacity> : null}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          مخزون فانك ({availableProducts.length} صنف)
        </Text>

        {availableProducts.length === 0 && (
          <View style={styles.empty}>
            <Feather name="inbox" size={36} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
              لا توجد أصناف في فانك
            </Text>
          </View>
        )}

        {availableProducts.map((product) => {
          const myQty = getMyQty(product.id);
          const qty = items[product.id] || 0;
          const isSelected = qty > 0;
          return (
            <Card key={product.id} style={[styles.productCard, isSelected && { borderWidth: 2, borderColor: "#e8531d" }]}>
              <View style={styles.productTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                  <Text style={[styles.productBrand, { color: colors.mutedForeground }]}>{product.category}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Badge label={`عندي: ${myQty}`} variant={myQty < 10 ? "warning" : "success"} />
                  {isSelected && <Badge label={`محدد: ${qty}`} variant="primary" />}
                </View>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity onPress={() => updateQty(product.id, 0)}
                  style={[styles.qtyBtn, { backgroundColor: qty > 0 ? "#fee2e2" : colors.muted }]}>
                  <Feather name="trash-2" size={14} color={qty > 0 ? "#dc2626" : colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateQty(product.id, qty - 10)}
                  style={[styles.qtyBtn, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.qtyBtnText, { color: colors.foreground }]}>-10</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateQty(product.id, qty - 1)}
                  style={[styles.qtyBtn, { backgroundColor: colors.muted }]}>
                  <Feather name="minus" size={16} color={colors.foreground} />
                </TouchableOpacity>
                <Input value={qty > 0 ? String(qty) : ""} onChangeText={(v) => updateQty(product.id, parseInt(v) || 0)}
                  keyboardType="number-pad"
                  style={[styles.qtyInput, { borderColor: isSelected ? "#e8531d" : colors.border }]}
                  placeholder="0" />
                <TouchableOpacity onPress={() => updateQty(product.id, qty + 1)}
                  style={[styles.qtyBtn, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateQty(product.id, qty + 10)}
                  style={[styles.qtyBtn, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.qtyBtnText, { color: colors.primary }]}>+10</Text>
                </TouchableOpacity>
              </View>
              {isSelected && (
                <View style={[styles.progressBar, { backgroundColor: colors.accent }]}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (qty / myQty) * 100)}%`, backgroundColor: "#e8531d" }]} />
                </View>
              )}
            </Card>
          );
        })}

        <Input label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="سبب الطلب..." multiline />

        {/* ─── طلباتي السابقة ─── */}
        {myRequests.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>طلباتي السابقة</Text>
            {myRequests.map((r) => {
              const isEx = expandedReq === r.id;
              const totalBoxes = r.items.reduce((s, i) => s + i.quantity, 0);
              const accentColor = r.status === "approved" ? "#22c55e" : r.status === "rejected" ? "#dc2626" : "#f59e0b";
              return (
                <Card key={r.id} style={{ padding: 0, overflow: "hidden", borderRightWidth: 3, borderRightColor: accentColor }}>
                  <TouchableOpacity
                    onPress={() => setExpandedReq(isEx ? null : r.id)}
                    activeOpacity={0.8}
                    style={{ padding: 12 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          {r.transferRef ? (
                            <View style={{ backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>{r.transferRef}</Text>
                            </View>
                          ) : null}
                          {statusBadge(r.status)}
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{r.fromVanName}</Text>
                          <Feather name="arrow-left" size={12} color={colors.mutedForeground} />
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.primary }}>{r.toVanName}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1 }}>
                          {new Date(r.date).toLocaleDateString("ar-SA")}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 2 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: accentColor }}>{totalBoxes} كروز</Text>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{r.items.length} صنف</Text>
                      </View>
                      <Feather name={isEx ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                    </View>
                  </TouchableOpacity>

                  {isEx && (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                      {r.items.map((item, idx) => (
                        <View key={idx} style={{
                          flexDirection: "row", alignItems: "center",
                          paddingVertical: 9, paddingHorizontal: 12,
                          borderBottomWidth: idx < r.items.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}>
                          <View style={{
                            width: 28, height: 28, borderRadius: 8,
                            backgroundColor: accentColor + "20",
                            alignItems: "center", justifyContent: "center", marginLeft: 10,
                          }}>
                            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: accentColor }}>{idx + 1}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                            {item.productName}
                          </Text>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: accentColor }}>
                            {item.quantity} كروز
                          </Text>
                        </View>
                      ))}
                      {r.notes ? (
                        <View style={{ padding: 10, backgroundColor: colors.accent }}>
                          <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                            ملاحظة: {r.notes}
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

      {/* ─── زر الإرسال ─── */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 8 }]}>
        {totalItems > 0 && toVanId && (
          <Text style={[styles.bottomSummary, { color: colors.mutedForeground }]}>
            {totalItems} صنف · {totalBoxes} كروز → {vans.find((v) => v.id === toVanId)?.name}
          </Text>
        )}
        <Button
          title={
            !toVanId ? "اختر الفان المستلم أولاً"
              : totalItems === 0 ? "حدد كمية لصنف واحد على الأقل"
              : `إرسال طلب التحويل (${totalItems} صنف)`
          }
          icon="send"
          onPress={handleSubmit}
          disabled={!toVanId || totalItems === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  vansRow: { flexDirection: "row", gap: 12 },
  vanBtn: { flex: 1, padding: 14, alignItems: "center", gap: 6, borderWidth: 2 },
  vanBtnText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vanBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryBox: { overflow: "hidden" },
  summaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  summaryTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1 },
  summaryProd: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryQty: { fontSize: 13, fontFamily: "Inter_700Bold" },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
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
  reqCard: { gap: 6 },
  reqTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reqDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  reqVans: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  reqVanTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, gap: 6 },
  bottomSummary: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
