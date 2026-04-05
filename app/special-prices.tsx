import { Feather } from "@expo/vector-icons";
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

export default function SpecialPricesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, vans, customers, specialPrices, addSpecialPrice, removeSpecialPrice, currentUser } = useApp();

  if (currentUser?.role !== "admin") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="الأسعار الخاصة" showBack />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Feather name="lock" size={48} color={colors.destructive} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" }}>
            غير مصرح لك بالوصول
          </Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
            هذه الصفحة للمدير فقط
          </Text>
        </View>
      </View>
    );
  }
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    vanId: "",
    customerId: "",
    price: "",
    notes: "",
    targetType: "van" as "van" | "customer",
  });
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSave = () => {
    if (!form.productId) {
      Alert.alert("خطأ", "يرجى اختيار المنتج");
      return;
    }
    const price = parseFloat(form.price);
    if (!price || price <= 0) {
      Alert.alert("خطأ", "يرجى إدخال سعر صحيح");
      return;
    }
    addSpecialPrice({
      productId: form.productId,
      vanId: form.targetType === "van" ? form.vanId : undefined,
      customerId: form.targetType === "customer" ? form.customerId : undefined,
      price,
      notes: form.notes,
    });
    setShowModal(false);
    setForm({ productId: "", vanId: "", customerId: "", price: "", notes: "", targetType: "van" });
  };

  const handleDelete = (id: string) => {
    Alert.alert("حذف", "هل تريد حذف هذا السعر الخاص؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => removeSpecialPrice(id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="الأسعار الخاصة"
        subtitle="أوردر خاص"
        showBack
        rightAction={{ icon: "plus", onPress: () => setShowModal(true), label: "إضافة" }}
      />

      <FlatList
        data={specialPrices}
        keyExtractor={(sp) => sp.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: botPad + 20 }}
        renderItem={({ item }) => {
          const product = products.find((p) => p.id === item.productId);
          const van = item.vanId ? vans.find((v) => v.id === item.vanId) : null;
          const customer = item.customerId ? customers.find((c) => c.id === item.customerId) : null;
          return (
            <Card style={styles.spCard}>
              <View style={styles.spTop}>
                <Text style={[styles.productName, { color: colors.foreground }]}>
                  {product?.name || "منتج غير معروف"}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
              <View style={styles.spRow}>
                <Text style={[styles.spLabel, { color: colors.mutedForeground }]}>السعر الخاص</Text>
                <Text style={[styles.spPrice, { color: colors.primary }]}>{item.price} د.أ</Text>
              </View>
              <View style={styles.spRow}>
                <Text style={[styles.spLabel, { color: colors.mutedForeground }]}>
                  {van ? "الفان" : "العميل"}
                </Text>
                <Badge label={van?.name || customer?.name || "-"} variant="primary" />
              </View>
              {item.notes ? (
                <Text style={[styles.notes, { color: colors.mutedForeground }]}>{item.notes}</Text>
              ) : null}
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="tag" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد أسعار خاصة</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              أضف سعر خاص لمنتج معين لفان أو عميل محدد
            </Text>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>إضافة سعر خاص</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.foreground }]}>المنتج</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                {products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setForm({ ...form, productId: p.id })}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: form.productId === p.id ? colors.primary : colors.muted,
                        borderRadius: 20,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: form.productId === p.id ? "#fff" : colors.foreground }]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { color: colors.foreground }]}>مخصص لـ</Text>
              <View style={styles.targetRow}>
                <TouchableOpacity
                  onPress={() => setForm({ ...form, targetType: "van" })}
                  style={[styles.targetBtn, { backgroundColor: form.targetType === "van" ? colors.primary : colors.muted, borderRadius: 8 }]}
                >
                  <Feather name="truck" size={16} color={form.targetType === "van" ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.targetBtnText, { color: form.targetType === "van" ? "#fff" : colors.foreground }]}>فان</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setForm({ ...form, targetType: "customer" })}
                  style={[styles.targetBtn, { backgroundColor: form.targetType === "customer" ? colors.primary : colors.muted, borderRadius: 8 }]}
                >
                  <Feather name="user" size={16} color={form.targetType === "customer" ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.targetBtnText, { color: form.targetType === "customer" ? "#fff" : colors.foreground }]}>عميل</Text>
                </TouchableOpacity>
              </View>

              {form.targetType === "van" ? (
                <>
                  <Text style={[styles.label, { color: colors.foreground }]}>اختر الفان</Text>
                  {vans.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => setForm({ ...form, vanId: v.id })}
                      style={[styles.optRow, { borderColor: form.vanId === v.id ? colors.primary : colors.border }]}
                    >
                      <Text style={[styles.optText, { color: form.vanId === v.id ? colors.primary : colors.foreground }]}>
                        {v.name} - {v.driverName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: colors.foreground }]}>اختر العميل</Text>
                  {customers.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setForm({ ...form, customerId: c.id })}
                      style={[styles.optRow, { borderColor: form.customerId === c.id ? colors.primary : colors.border }]}
                    >
                      <Text style={[styles.optText, { color: form.customerId === c.id ? colors.primary : colors.foreground }]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <Input label="السعر الخاص" value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} keyboardType="decimal-pad" placeholder="0.00" />
              <Input label="ملاحظات (اختياري)" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} placeholder="سبب السعر الخاص..." />
              <Button title="حفظ" icon="check" onPress={handleSave} style={styles.saveBtn} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  spCard: { gap: 8 },
  spTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  productName: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  spRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  spLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  spPrice: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  notes: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  label: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 8, textAlign: "right" },
  hScroll: { marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  targetRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  targetBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, gap: 8 },
  targetBtnText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  optRow: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  optText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  saveBtn: { marginTop: 8, marginBottom: 20 },
});
