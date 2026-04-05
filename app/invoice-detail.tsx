import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { exportInvoicePdf } from "@/hooks/usePdfInvoice";


export default function InvoiceDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    invoices, vans, customers, currentUser,
    requestInvoiceEdit, invoiceEditRequests,
    companySettings,
  } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isAdmin = currentUser?.role === "admin";

  const [showEditModal, setShowEditModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportPdf = async () => {
    if (!invoice || pdfLoading) return;
    setPdfLoading(true);
    await exportInvoicePdf(invoice, customer, van, companySettings);
    setPdfLoading(false);
  };
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [editForm, setEditForm] = useState({ paid: "", discount: "", notes: "" });
  const [reason, setReason] = useState("");

  const invoice = invoices.find((inv) => inv.id === id);
  if (!invoice) return null;

  const isCancelled = invoice.status === "cancelled";
  const van = vans.find((v) => v.id === invoice.vanId);
  const customer = customers.find((c) => c.id === invoice.customerId);
  const totalCartons = invoice.items.reduce((s, i) => s + i.quantity, 0);

  const existingPendingReq = (invoiceEditRequests || []).find(
    (r) => r.invoiceId === invoice.id && r.status === "pending"
  );

  const handleRequestEdit = () => {
    if (!reason.trim()) {
      Alert.alert("خطأ", "يرجى إدخال سبب التعديل");
      return;
    }
    const changes: any = {};
    if (editForm.paid !== "") changes.paid = parseFloat(editForm.paid) || 0;
    if (editForm.discount !== "") changes.discount = parseFloat(editForm.discount) || 0;
    if (editForm.notes.trim()) changes.notes = editForm.notes.trim();
    if (Object.keys(changes).length === 0) {
      Alert.alert("خطأ", "يرجى إدخال تعديل واحد على الأقل");
      return;
    }
    requestInvoiceEdit({
      invoiceId: invoice.id,
      invoiceRef: invoice.id.slice(-6).toUpperCase(),
      vanId: invoice.vanId,
      driverName: currentUser?.name || "",
      customerName: invoice.customerName,
      type: "edit",
      reason: reason.trim(),
      requestedChanges: changes,
      originalPaid: invoice.paid,
      originalTotal: invoice.total,
      originalDiscount: invoice.discount,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowEditModal(false);
    setReason("");
    setEditForm({ paid: "", discount: "", notes: "" });
    Alert.alert("تم الإرسال", "تم إرسال طلب التعديل للمدير — بانتظار الموافقة");
  };

  const handleRequestCancel = () => {
    if (!reason.trim()) {
      Alert.alert("خطأ", "يرجى إدخال سبب الإلغاء");
      return;
    }
    requestInvoiceEdit({
      invoiceId: invoice.id,
      invoiceRef: invoice.id.slice(-6).toUpperCase(),
      vanId: invoice.vanId,
      driverName: currentUser?.name || "",
      customerName: invoice.customerName,
      type: "cancel",
      reason: reason.trim(),
      originalPaid: invoice.paid,
      originalTotal: invoice.total,
      originalDiscount: invoice.discount,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCancelModal(false);
    setReason("");
    Alert.alert("تم الإرسال", "تم إرسال طلب الإلغاء للمدير — بانتظار الموافقة");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="تفاصيل الفاتورة"
        showBack
        rightAction2={{
          icon: pdfLoading ? "loader" : "file-text",
          onPress: handleExportPdf,
        }}
        rightAction={{
          icon: "printer",
          onPress: () => router.push(`/print-invoice?id=${invoice.id}`),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 12 }}>

        {/* شعار الشركة */}
        <Card style={[styles.companyHeader, { borderColor: colors.primary + "40", borderWidth: 1 }]}>
          <Text style={[styles.companyName, { color: colors.primary }]}>{companySettings.name}</Text>
          {companySettings.phone ? (
            <View style={styles.companyPhoneRow}>
              <Feather name="phone" size={14} color={colors.mutedForeground} />
              <Text style={[styles.companyPhone, { color: colors.mutedForeground }]}>{companySettings.phone}</Text>
            </View>
          ) : null}
          {companySettings.taxNumber ? (
            <View style={styles.companyPhoneRow}>
              <Feather name="hash" size={14} color={colors.mutedForeground} />
              <Text style={[styles.companyPhone, { color: colors.mutedForeground }]}>
                رقم التسجيل الضريبي: {companySettings.taxNumber}
              </Text>
            </View>
          ) : null}
          {companySettings.address ? (
            <View style={styles.companyPhoneRow}>
              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
              <Text style={[styles.companyPhone, { color: colors.mutedForeground }]}>{companySettings.address}</Text>
            </View>
          ) : null}
        </Card>

        {/* بادج الإلغاء */}
        {isCancelled && (
          <View style={[styles.cancelledBanner, { backgroundColor: "#dc262618", borderColor: "#dc2626" }]}>
            <Feather name="slash" size={18} color="#dc2626" />
            <Text style={[styles.cancelledText, { color: "#dc2626" }]}>هذه الفاتورة ملغاة</Text>
          </View>
        )}

        {/* طلب معلّق */}
        {existingPendingReq && (
          <View style={[styles.pendingBanner, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b" }]}>
            <Feather name="clock" size={16} color="#f59e0b" />
            <Text style={[styles.pendingText, { color: "#f59e0b" }]}>
              طلب {existingPendingReq.type === "cancel" ? "إلغاء" : "تعديل"} بانتظار موافقة المدير
            </Text>
          </View>
        )}

        {/* بيانات الفاتورة */}
        <Card>
          <InfoRow label="رقم الفاتورة" val={`#${invoice.id.slice(-6).toUpperCase()}`} colors={colors} />
          <InfoRow
            label="التاريخ"
            val={`${new Date(invoice.date).toLocaleDateString("ar-SA")} ${new Date(invoice.date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`}
            colors={colors}
          />
          <InfoRow label="العميل" val={invoice.customerName} colors={colors} />
          {customer?.phone && <InfoRow label="هاتف العميل" val={customer.phone} colors={colors} />}
          {customer?.taxNumber ? <InfoRow label="رقم ضريبي للعميل" val={customer.taxNumber} colors={colors} /> : null}
          {van && <InfoRow label="المندوب" val={`${van.driverName} (${van.name})`} colors={colors} />}
          <View style={styles.statusRow}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>الحالة</Text>
            {isCancelled ? (
              <Badge label="ملغاة" variant="destructive" />
            ) : (
              <Badge
                label={invoice.remaining > 0 ? `آجل ${invoice.remaining} د.أ` : "مدفوع بالكامل"}
                variant={invoice.remaining > 0 ? "warning" : "success"}
              />
            )}
          </View>
        </Card>

        {/* المنتجات */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>المنتجات</Text>
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

        {/* الإجماليات */}
        <Card style={styles.summaryCard}>
          <InfoRow label="إجمالي الكروزات" val={`${totalCartons} علبة`} colors={colors} bold />
          <InfoRow label="المجموع الفرعي" val={`${invoice.subtotal.toFixed(2)} د.أ`} colors={colors} />
          {invoice.discount > 0 && (
            <InfoRow label="الخصم" val={`- ${invoice.discount} د.أ`} colors={colors} />
          )}
          <View style={[styles.totalRowSep, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي</Text>
            <Text style={[styles.totalVal, { color: colors.primary }]}>{invoice.total.toFixed(2)} د.أ</Text>
          </View>
          <InfoRow label="المدفوع" val={`${invoice.paid.toFixed(2)} د.أ`} colors={colors} />
          {invoice.remaining > 0 && (
            <InfoRow label="المتبقي (آجل)" val={`${invoice.remaining.toFixed(2)} د.أ`} colors={colors} />
          )}
        </Card>

        {invoice.notes ? (
          <Card>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>ملاحظات</Text>
            <Text style={[styles.notes, { color: colors.foreground }]}>{invoice.notes}</Text>
          </Card>
        ) : null}

        {/* أزرار الإجراءات */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => router.push(`/print-invoice?id=${invoice.id}`)}
            style={[styles.actionBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary }]}
          >
            <Feather name="printer" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>طباعة</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push(`/edit-invoice?id=${invoice.id}` as any)}
              style={[styles.actionBtn, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b" }]}
            >
              <Feather name="edit-2" size={18} color="#f59e0b" />
              <Text style={[styles.actionBtnText, { color: "#f59e0b" }]}>تعديل مباشر</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* أزرار الطلب للمندوب */}
        {!isAdmin && !isCancelled && !existingPendingReq && (
          <View style={[styles.requestSection, { backgroundColor: colors.accent, borderRadius: 14 }]}>
            <View style={styles.requestHeader}>
              <Feather name="send" size={16} color={colors.mutedForeground} />
              <Text style={[styles.requestTitle, { color: colors.mutedForeground }]}>
                طلب تعديل أو إلغاء يحتاج موافقة المدير
              </Text>
            </View>
            <View style={styles.requestBtns}>
              <TouchableOpacity
                onPress={() => { setReason(""); setEditForm({ paid: "", discount: "", notes: "" }); setShowEditModal(true); }}
                style={[styles.requestBtn, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b" }]}
              >
                <Feather name="edit-2" size={16} color="#f59e0b" />
                <Text style={[styles.requestBtnText, { color: "#f59e0b" }]}>طلب تعديل</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setReason(""); setShowCancelModal(true); }}
                style={[styles.requestBtn, { backgroundColor: "#dc262618", borderColor: "#dc2626" }]}
              >
                <Feather name="trash-2" size={16} color="#dc2626" />
                <Text style={[styles.requestBtnText, { color: "#dc2626" }]}>طلب إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* حالة الطلبات السابقة */}
        {(() => {
          const allReqs = (invoiceEditRequests || []).filter((r) => r.invoiceId === invoice.id);
          if (allReqs.length === 0) return null;
          return (
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>سجل الطلبات</Text>
              {[...allReqs].reverse().map((req) => (
                <View key={req.id} style={[styles.reqCard, {
                  backgroundColor: colors.card,
                  borderRightColor: req.status === "approved" ? "#22c55e" : req.status === "rejected" ? "#ef4444" : "#f59e0b",
                  borderRightWidth: 3,
                  borderRadius: 10,
                }]}>
                  <View style={styles.reqTop}>
                    <Badge
                      label={req.status === "approved" ? "مقبول" : req.status === "rejected" ? "مرفوض" : "قيد الانتظار"}
                      variant={req.status === "approved" ? "success" : req.status === "rejected" ? "destructive" : "warning"}
                    />
                    <Text style={[styles.reqType, { color: colors.foreground }]}>
                      {req.type === "cancel" ? "طلب إلغاء" : "طلب تعديل"}
                    </Text>
                  </View>
                  <Text style={[styles.reqReason, { color: colors.mutedForeground }]}>السبب: {req.reason}</Text>
                  <Text style={[styles.reqDate, { color: colors.mutedForeground }]}>
                    {new Date(req.date).toLocaleDateString("ar-SA")} {new Date(req.date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              ))}
            </View>
          );
        })()}

      </ScrollView>

      {/* ═══ مودال طلب التعديل ═══ */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>طلب تعديل الفاتورة</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.invoiceSummary, { backgroundColor: colors.accent }]}>
              <Text style={[styles.invSumText, { color: colors.mutedForeground }]}>
                فاتورة #{invoice.id.slice(-6).toUpperCase()} — {invoice.customerName}
              </Text>
              <Text style={[styles.invSumVals, { color: colors.foreground }]}>
                الإجمالي: {invoice.total.toFixed(2)} د.أ | مدفوع: {invoice.paid.toFixed(2)} د.أ
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>المبلغ المدفوع الجديد (اختياري)</Text>
            <TextInput
              value={editForm.paid}
              onChangeText={(v) => setEditForm((f) => ({ ...f, paid: v }))}
              placeholder={`الحالي: ${invoice.paid.toFixed(2)} د.أ`}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.textInput, { backgroundColor: colors.accent, color: colors.foreground, borderColor: colors.border }]}
              textAlign="right"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>الخصم الجديد (اختياري)</Text>
            <TextInput
              value={editForm.discount}
              onChangeText={(v) => setEditForm((f) => ({ ...f, discount: v }))}
              placeholder={`الحالي: ${invoice.discount.toFixed(2)} د.أ`}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.textInput, { backgroundColor: colors.accent, color: colors.foreground, borderColor: colors.border }]}
              textAlign="right"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ملاحظات جديدة (اختياري)</Text>
            <TextInput
              value={editForm.notes}
              onChangeText={(v) => setEditForm((f) => ({ ...f, notes: v }))}
              placeholder="ملاحظات..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, { backgroundColor: colors.accent, color: colors.foreground, borderColor: colors.border }]}
              textAlign="right"
            />

            <Text style={[styles.fieldLabel, { color: "#f59e0b" }]}>سبب التعديل *</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="اكتب سبب طلب التعديل..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, styles.reasonInput, { backgroundColor: colors.accent, color: colors.foreground, borderColor: "#f59e0b" }]}
              multiline
              numberOfLines={2}
              textAlign="right"
              textAlignVertical="top"
            />

            <Button
              title="إرسال طلب التعديل للمدير"
              icon="send"
              onPress={handleRequestEdit}
              style={{ marginTop: 4, marginBottom: 20, backgroundColor: "#f59e0b" }}
            />
          </View>
        </View>
      </Modal>

      {/* ═══ مودال طلب الإلغاء ═══ */}
      <Modal visible={showCancelModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>طلب إلغاء الفاتورة</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.warnBox, { backgroundColor: "#dc262612", borderRadius: 10 }]}>
              <Feather name="alert-triangle" size={18} color="#dc2626" />
              <Text style={[styles.warnText, { color: "#dc2626" }]}>
                عند الموافقة: سيتم استرجاع {totalCartons} علبة للفان وعكس الحركات المالية
              </Text>
            </View>

            <View style={[styles.invoiceSummary, { backgroundColor: colors.accent }]}>
              <Text style={[styles.invSumText, { color: colors.mutedForeground }]}>
                فاتورة #{invoice.id.slice(-6).toUpperCase()} — {invoice.customerName}
              </Text>
              <Text style={[styles.invSumVals, { color: colors.foreground }]}>
                {totalCartons} علبة | إجمالي: {invoice.total.toFixed(2)} د.أ
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { color: "#dc2626" }]}>سبب الإلغاء *</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="اكتب سبب طلب الإلغاء..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, styles.reasonInput, { backgroundColor: colors.accent, color: colors.foreground, borderColor: "#dc2626" }]}
              multiline
              numberOfLines={3}
              textAlign="right"
              textAlignVertical="top"
            />

            <Button
              title="إرسال طلب الإلغاء للمدير"
              icon="send"
              onPress={handleRequestCancel}
              style={{ marginTop: 4, marginBottom: 20, backgroundColor: "#dc2626" }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, val, colors, bold = false }: { label: string; val: string; colors: any; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.foreground, fontFamily: bold ? "Inter_700Bold" : "Inter_600SemiBold" }]}>
        {val}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  companyHeader: { alignItems: "center", padding: 16, gap: 6 },
  companyName: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  companyPhoneRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  companyPhone: { fontSize: 14, fontFamily: "Inter_400Regular" },
  cancelledBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  cancelledText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  pendingBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  pendingText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  value: { fontSize: 14, textAlign: "right" },
  sectionTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  itemDetail: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  itemTotal: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  summaryCard: { gap: 4 },
  totalRowSep: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 10, marginTop: 4, marginBottom: 6 },
  totalLabel: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  totalVal: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  notes: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
  },
  actionBtnText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  requestSection: { padding: 14, gap: 10 },
  requestHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  requestTitle: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
  requestBtns: { flexDirection: "row", gap: 10 },
  requestBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
  },
  requestBtnText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  reqCard: { padding: 12, gap: 6 },
  reqTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reqType: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  reqReason: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  reqDate: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  invoiceSummary: { padding: 10, borderRadius: 10, gap: 4, marginBottom: 4 },
  invSumText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  invSumVals: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right", marginBottom: 6, marginTop: 4 },
  textInput: {
    borderWidth: 1, borderRadius: 10, padding: 10,
    fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 4,
  },
  reasonInput: { minHeight: 60, textAlignVertical: "top" },
  warnBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, marginBottom: 4 },
  warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "right" },
});
