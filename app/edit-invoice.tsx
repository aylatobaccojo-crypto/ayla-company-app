import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function EditInvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { invoices, currentUser, updateInvoice } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isAdmin = currentUser?.role === "admin";

  const invoice = invoices.find((inv) => inv.id === id);

  const [paid, setPaid] = useState(String(invoice?.paid ?? 0));
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [discount, setDiscount] = useState(String(invoice?.discount ?? 0));

  if (!invoice) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="تعديل الفاتورة" showBack />
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>الفاتورة غير موجودة</Text>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="تعديل الفاتورة" showBack />
        <View style={styles.center}>
          <Feather name="lock" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>للمدير فقط</Text>
        </View>
      </View>
    );
  }

  const discountAmt = parseFloat(discount) || 0;
  const paidAmt = parseFloat(paid) || 0;
  const newTotal = Math.max(0, invoice.subtotal - discountAmt);
  const newRemaining = Math.max(0, newTotal - paidAmt);

  const totalCartons = invoice.items.reduce((s, i) => s + i.quantity, 0);

  const handleSave = () => {
    if (paidAmt > newTotal) {
      Alert.alert("خطأ", "المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي");
      return;
    }
    updateInvoice(invoice.id, {
      paid: paidAmt,
      discount: discountAmt,
      total: newTotal,
      remaining: newRemaining,
      notes,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("تم", "تم تحديث الفاتورة بنجاح", [
      { text: "حسناً", onPress: () => router.back() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={`تعديل فاتورة #${invoice.id.slice(-6).toUpperCase()}`} showBack />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>
        <Card style={[styles.infoCard, { borderRightColor: colors.primary, borderRightWidth: 3 }]}>
          <View style={styles.infoRow}>
            <Feather name="user" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>العميل:</Text>
            <Text style={[styles.infoVal, { color: colors.foreground }]}>{invoice.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="calendar" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>التاريخ:</Text>
            <Text style={[styles.infoVal, { color: colors.foreground }]}>
              {new Date(invoice.date).toLocaleDateString("ar-SA")}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="package" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>الكروزات:</Text>
            <Text style={[styles.infoVal, { color: colors.foreground }]}>{totalCartons} علبة</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="dollar-sign" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>المجموع الفرعي:</Text>
            <Text style={[styles.infoVal, { color: colors.foreground }]}>{invoice.subtotal.toFixed(2)} د.أ</Text>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>المنتجات (للعرض فقط)</Text>
        {invoice.items.map((item, idx) => (
          <Card key={idx} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: colors.foreground }]}>{item.productName}</Text>
              <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>
                {item.quantity} علبة × {item.unitPrice.toFixed(2)} د.أ
              </Text>
            </View>
            <Text style={[styles.itemTotal, { color: colors.primary }]}>{item.total.toFixed(2)} د.أ</Text>
          </Card>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>تعديل القيم</Text>

        <Card style={{ gap: 4 }}>
          <Input
            label="الخصم (د.أ)"
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Input
            label="المبلغ المدفوع (د.أ)"
            value={paid}
            onChangeText={setPaid}
            keyboardType="decimal-pad"
            placeholder={String(newTotal.toFixed(2))}
          />
          <Input
            label="ملاحظات"
            value={notes}
            onChangeText={setNotes}
            placeholder="ملاحظات..."
            multiline
          />
        </Card>

        <Card style={[styles.previewCard, { backgroundColor: colors.accent }]}>
          <Text style={[styles.previewTitle, { color: colors.foreground }]}>معاينة القيم الجديدة</Text>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>إجمالي الكروزات</Text>
            <Text style={[styles.previewVal, { color: colors.foreground }]}>{totalCartons} علبة</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>المجموع الفرعي</Text>
            <Text style={[styles.previewVal, { color: colors.foreground }]}>{invoice.subtotal.toFixed(2)} د.أ</Text>
          </View>
          {discountAmt > 0 && (
            <View style={styles.previewRow}>
              <Text style={[styles.previewLabel, { color: colors.destructive }]}>الخصم</Text>
              <Text style={[styles.previewVal, { color: colors.destructive }]}>- {discountAmt.toFixed(2)} د.أ</Text>
            </View>
          )}
          <View style={[styles.previewRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
            <Text style={[styles.previewLabel, { color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }]}>الإجمالي</Text>
            <Text style={[styles.previewVal, { color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 18 }]}>{newTotal.toFixed(2)} د.أ</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>المدفوع</Text>
            <Text style={[styles.previewVal, { color: colors.success }]}>{paidAmt.toFixed(2)} د.أ</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: newRemaining > 0 ? colors.warning : colors.success }]}>
              {newRemaining > 0 ? "المتبقي (آجل)" : "مدفوع بالكامل ✓"}
            </Text>
            <Text style={[styles.previewVal, { color: newRemaining > 0 ? colors.warning : colors.success }]}>
              {newRemaining > 0 ? `${newRemaining.toFixed(2)} د.أ` : ""}
            </Text>
          </View>
        </Card>

        <Button title="حفظ التعديلات" icon="check" onPress={handleSave} />

        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>إلغاء</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  infoCard: { gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoVal: { flex: 1, fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  sectionTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  itemDetail: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  previewCard: { gap: 8, padding: 14 },
  previewTitle: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 4 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  previewVal: { fontSize: 15, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
