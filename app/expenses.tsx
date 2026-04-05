import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
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
import type { Expense } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES: { key: Expense["category"]; label: string; icon: string; color: string }[] = [
  { key: "fuel", label: "بنزين", icon: "droplet", color: "#e8531d" },
  { key: "maintenance", label: "صيانة", icon: "tool", color: "#8b5cf6" },
  { key: "other", label: "أخرى", icon: "more-horizontal", color: "#0891b2" },
];

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, expenses, vans, addExpense } = useApp();
  const isAdmin = currentUser?.role === "admin";
  const vanId = currentUser?.vanId;
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{ category: Expense["category"]; amount: string; description: string; vanId: string }>({
    category: "fuel",
    amount: "",
    description: "",
    vanId: vanId || "",
  });
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myExpenses = expenses
    .filter((e) => isAdmin || e.vanId === vanId)
    .slice()
    .reverse();

  const totalFuel = myExpenses.filter((e) => e.category === "fuel").reduce((s, e) => s + e.amount, 0);
  const totalMaint = myExpenses.filter((e) => e.category === "maintenance").reduce((s, e) => s + e.amount, 0);
  const totalOther = myExpenses.filter((e) => e.category === "other").reduce((s, e) => s + e.amount, 0);
  const total = totalFuel + totalMaint + totalOther;

  const handleSave = () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح");
      return;
    }
    if (!form.description) {
      Alert.alert("خطأ", "يرجى إدخال وصف");
      return;
    }
    addExpense({
      vanId: form.vanId || vanId || "",
      category: form.category,
      amount: amt,
      description: form.description,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setForm({ category: "fuel", amount: "", description: "", vanId: vanId || "" });
  };

  const getCatInfo = (cat: Expense["category"]) => CATEGORIES.find((c) => c.key === cat)!;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="المصاريف"
        rightAction={{ icon: "plus", onPress: () => setShowModal(true), label: "إضافة" }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ملخص المصاريف</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map((cat) => {
              const val = cat.key === "fuel" ? totalFuel : cat.key === "maintenance" ? totalMaint : totalOther;
              return (
                <View key={cat.key} style={styles.catItem}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + "18" }]}>
                    <Feather name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <Text style={[styles.catLabel, { color: colors.mutedForeground }]}>{cat.label}</Text>
                  <Text style={[styles.catVal, { color: colors.foreground }]}>{val.toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي</Text>
            <Text style={[styles.totalVal, { color: colors.destructive }]}>{total.toLocaleString()} د.أ</Text>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>سجل المصاريف</Text>

        {myExpenses.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="trending-down" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد مصاريف</Text>
          </View>
        ) : (
          myExpenses.map((expense) => {
            const cat = getCatInfo(expense.category);
            const van = vans.find((v) => v.id === expense.vanId);
            return (
              <Card key={expense.id} style={styles.expenseCard}>
                <View style={[styles.catIconSmall, { backgroundColor: cat.color + "18" }]}>
                  <Feather name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={[styles.expenseDesc, { color: colors.foreground }]}>{expense.description}</Text>
                  <Text style={[styles.expenseDate, { color: colors.mutedForeground }]}>
                    {new Date(expense.date).toLocaleDateString("ar-SA")}
                  </Text>
                  {isAdmin && van && (
                    <Text style={[styles.expenseVan, { color: colors.mutedForeground }]}>{van.name}</Text>
                  )}
                </View>
                <View style={styles.expenseRight}>
                  <Text style={[styles.expenseAmount, { color: colors.destructive }]}>
                    {expense.amount.toLocaleString()} د.أ
                  </Text>
                  <Badge label={cat.label} variant="muted" />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>إضافة مصروف</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>الفئة</Text>
            <View style={styles.catSelect}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setForm({ ...form, category: cat.key })}
                  style={[
                    styles.catSelectBtn,
                    {
                      backgroundColor: form.category === cat.key ? cat.color : colors.muted,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Feather name={cat.icon as any} size={18} color={form.category === cat.key ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.catSelectText, { color: form.category === cat.key ? "#fff" : colors.foreground }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isAdmin && (
              <View style={styles.vanSelectContainer}>
                <Text style={[styles.label, { color: colors.foreground }]}>الفان</Text>
                {vans.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setForm({ ...form, vanId: v.id })}
                    style={[styles.vanOpt, { borderColor: form.vanId === v.id ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.vanOptText, { color: form.vanId === v.id ? colors.primary : colors.foreground }]}>
                      {v.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Input label="المبلغ" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="decimal-pad" placeholder="0.00" />
            <Input label="الوصف" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="مثال: تعبئة بنزين..." />
            <Button title="حفظ" icon="check" onPress={handleSave} style={styles.saveBtn} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  catRow: { flexDirection: "row", justifyContent: "space-around" },
  catItem: { alignItems: "center", gap: 6 },
  catIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  catVal: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1 },
  totalLabel: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  totalVal: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  expenseCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  catIconSmall: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  expenseDate: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  expenseVan: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  expenseRight: { alignItems: "flex-end", gap: 4 },
  expenseAmount: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  label: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 8, textAlign: "right" },
  catSelect: { flexDirection: "row", gap: 10, marginBottom: 16 },
  catSelectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 10, gap: 6 },
  catSelectText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  vanSelectContainer: { marginBottom: 12 },
  vanOpt: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6 },
  vanOptText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  saveBtn: { marginTop: 4, marginBottom: 20 },
});
