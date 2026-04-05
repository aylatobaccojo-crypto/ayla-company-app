import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
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
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { BTPrinterDevice } from "@/hooks/useBluetooth";
import { useBluetooth } from "@/hooks/useBluetooth";

export default function PrintInvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { invoices, vans, customers, companySettings } = useApp();
  const router = useRouter();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const bt = useBluetooth();
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const autoConnectTried = useRef(false);

  const invoice = invoices.find((inv) => inv.id === id);
  const van = invoice ? vans.find((v) => v.id === invoice.vanId) : null;
  const customer = invoice ? customers.find((c) => c.id === invoice.customerId) : null;

  // محاولة اتصال تلقائي عند الدخول
  useEffect(() => {
    if (!autoConnectTried.current && bt.savedPrinter && bt.isNative && !bt.isConnected) {
      autoConnectTried.current = true;
      bt.autoConnect();
    }
  }, [bt.savedPrinter]);

  if (!invoice) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="طباعة الفاتورة" showBack />
        <View style={styles.empty}>
          <Feather name="alert-circle" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>الفاتورة غير موجودة</Text>
        </View>
      </View>
    );
  }

  const totalCartons = invoice.items.reduce((s, i) => s + i.quantity, 0);

  // نص الفاتورة للمشاركة
  const getReceiptText = () => {
    const line = "================================";
    const short = "--------------------------------";
    let t = "";
    t += `       ${companySettings.name}\n`;
    if (companySettings.phone) t += `     هاتف: ${companySettings.phone}\n`;
    if (companySettings.taxNumber) t += `  رقم ضريبي: ${companySettings.taxNumber}\n`;
    if (companySettings.address) t += `  ${companySettings.address}\n`;
    t += `${line}\n`;
    t += `رقم الفاتورة: #${invoice.id.slice(-6).toUpperCase()}\n`;
    t += `التاريخ: ${new Date(invoice.date).toLocaleDateString("ar-SA")}\n`;
    t += `الوقت: ${new Date(invoice.date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}\n`;
    t += `${short}\n`;
    t += `العميل: ${invoice.customerName}\n`;
    if (customer?.phone) t += `هاتف: ${customer.phone}\n`;
    if (customer?.taxNumber) t += `رقم ضريبي: ${customer.taxNumber}\n`;
    if (van) t += `المندوب: ${van.driverName}\n`;
    t += `${line}\n`;
    t += `الأصناف:\n`;
    t += `${short}\n`;
    for (const item of invoice.items) {
      t += `${item.productName}\n`;
      t += `  الكمية: ${item.quantity}     ${item.unitPrice.toFixed(2)} د.أ     ${item.total.toFixed(2)} د.أ\n`;
    }
    t += `${short}\n`;
    t += `عدد الكروزات: ${totalCartons} علبة\n`;
    t += `${short}\n`;
    t += `المجموع الفرعي: ${invoice.subtotal.toFixed(2)} د.أ\n`;
    if (invoice.discount > 0) t += `الخصم: -${invoice.discount.toFixed(2)} د.أ\n`;
    t += `${short}\n`;
    t += `الإجمالي: ${invoice.total.toFixed(2)} د.أ\n`;
    t += `المدفوع: ${invoice.paid.toFixed(2)} د.أ\n`;
    if (invoice.remaining > 0) t += `المتبقي آجل: ${invoice.remaining.toFixed(2)} د.أ\n`;
    t += `${line}\n`;
    t += `     شكراً لتعاملكم معنا\n`;
    return t;
  };

  // بناء أسطر الطباعة ESC/POS
  const buildPrintLines = () => {
    const line1 = "================================";
    const line2 = "--------------------------------";

    // بناء سطور الأصناف — كل صنف سطرين: الاسم كاملاً ثم التفاصيل
    const itemLines: Array<{ text: string; align: "left" | "center" | "right"; bold?: boolean }> = [];
    for (const item of invoice.items) {
      itemLines.push({ text: item.productName, align: "right", bold: true });
      itemLines.push({
        text: `الكمية: ${item.quantity}     ${item.unitPrice.toFixed(2)}     ${item.total.toFixed(2)} د.أ`,
        align: "right",
      });
      itemLines.push({ text: line2, align: "center" });
    }

    return [
      // رأس الشركة
      { text: companySettings.name, align: "center" as const, bold: true, size: "large" as const },
      ...(companySettings.phone ? [{ text: `هاتف: ${companySettings.phone}`, align: "center" as const }] : []),
      ...(companySettings.taxNumber ? [{ text: `رقم ضريبي: ${companySettings.taxNumber}`, align: "center" as const }] : []),
      ...(companySettings.address ? [{ text: companySettings.address, align: "center" as const }] : []),
      { text: line1, align: "center" as const },

      // بيانات الفاتورة
      { text: `فاتورة رقم: #${invoice.id.slice(-6).toUpperCase()}`, align: "right" as const, bold: true },
      { text: `التاريخ: ${new Date(invoice.date).toLocaleDateString("ar-SA")}`, align: "right" as const },
      { text: `الوقت: ${new Date(invoice.date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`, align: "right" as const },
      { text: line2, align: "center" as const },

      // بيانات العميل
      { text: `العميل: ${invoice.customerName}`, align: "right" as const, bold: true },
      ...(customer?.phone ? [{ text: `هاتف: ${customer.phone}`, align: "right" as const }] : []),
      ...(customer?.taxNumber ? [{ text: `رقم ضريبي: ${customer.taxNumber}`, align: "right" as const }] : []),
      ...(van ? [{ text: `المندوب: ${van.driverName}`, align: "right" as const }] : []),
      { text: line1, align: "center" as const },

      // عنوان الأصناف
      { text: "*** الأصناف ***", align: "center" as const, bold: true },
      { text: line2, align: "center" as const },

      // الأصناف — كل صنف سطرين
      ...itemLines,

      // الإجماليات
      { text: `عدد الكروزات: ${totalCartons} علبة`, align: "right" as const },
      { text: line2, align: "center" as const },
      { text: `المجموع الفرعي: ${invoice.subtotal.toFixed(2)} د.أ`, align: "right" as const },
      ...(invoice.discount > 0 ? [{ text: `الخصم: -${invoice.discount.toFixed(2)} د.أ`, align: "right" as const }] : []),
      { text: line1, align: "center" as const },
      { text: `الإجمالي: ${invoice.total.toFixed(2)} د.أ`, align: "right" as const, bold: true, size: "large" as const },
      { text: line1, align: "center" as const },
      { text: `المدفوع: ${invoice.paid.toFixed(2)} د.أ`, align: "right" as const },
      ...(invoice.remaining > 0
        ? [{ text: `المتبقي آجل: ${invoice.remaining.toFixed(2)} د.أ`, align: "right" as const, bold: true }]
        : [{ text: "تم السداد بالكامل ✓", align: "right" as const }]),
      { text: line1, align: "center" as const },
      { text: "شكراً لتعاملكم معنا", align: "center" as const, bold: true },
    ];
  };

  const handleScan = async () => {
    await bt.scanDevices();
    if (bt.pairedDevices.length > 0 || true) {
      setShowDeviceModal(true);
    }
  };

  const handleSelectDevice = async (device: BTPrinterDevice) => {
    setShowDeviceModal(false);
    const ok = await bt.connectPrinter(device);
    if (ok) {
      Alert.alert("تم الاتصال ✓", `تم الاتصال بـ ${device.name}\nسيتذكر البرنامج هذه الطابعة تلقائياً`);
    }
  };

  const handlePrint = async () => {
    if (!bt.isNative) {
      Alert.alert("تنبيه", "الطباعة البلوتوث تعمل على تطبيق الأندرويد فقط.");
      return;
    }
    if (!bt.isConnected) {
      if (bt.savedPrinter) {
        Alert.alert(
          "الطابعة غير متصلة",
          `الطابعة المحفوظة: ${bt.savedPrinter.name}\n\nهل تريد الاتصال بها؟`,
          [
            { text: "لا" },
            { text: "اتصال", onPress: () => bt.autoConnect() },
          ]
        );
      } else {
        Alert.alert("لا توجد طابعة", "ابحث عن طابعة أولاً ثم اتصل بها.");
      }
      return;
    }
    const lines = buildPrintLines();
    const ok = await bt.printReceipt(lines);
    if (ok) {
      Alert.alert("تمت الطباعة ✓", "تم إرسال الفاتورة للطابعة بنجاح");
    }
  };

  const handleShare = async () => {
    const text = getReceiptText();
    try {
      await Share.share({ message: text, title: `فاتورة #${invoice.id.slice(-6).toUpperCase()}` });
    } catch (_) {}
  };

  const handleCopy = async () => {
    const text = getReceiptText();
    if (Platform.OS === "web") {
      try { await navigator.clipboard.writeText(text); } catch (_) {}
    } else {
      try { await Clipboard.setStringAsync(text); } catch (_) {}
    }
    Alert.alert("تم النسخ", "تم نسخ نص الفاتورة");
  };

  const statusColor = {
    idle: colors.mutedForeground,
    scanning: colors.warning,
    connecting: colors.warning,
    connected: "#22c55e",
    printing: colors.primary,
    error: colors.destructive,
  }[bt.status];

  const statusLabel = {
    idle: bt.savedPrinter ? `طابعة محفوظة: ${bt.savedPrinter.name}` : "لا توجد طابعة",
    scanning: "جاري البحث...",
    connecting: "جاري الاتصال...",
    connected: `متصل — ${bt.connectedPrinter?.name}`,
    printing: "جاري الطباعة...",
    error: "خطأ في الاتصال",
  }[bt.status];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="طباعة الفاتورة" showBack />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 14 }}>

        {/* بطاقة حالة الطابعة */}
        <Card style={styles.printerCard}>
          <View style={styles.printerTop}>
            <View style={styles.printerTitleRow}>
              <Feather name="printer" size={22} color={colors.primary} />
              <Text style={[styles.printerTitle, { color: colors.foreground }]}>الطابعة الحرارية</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {bt.isConnected && bt.connectedPrinter && (
            <View style={[styles.connectedBanner, { backgroundColor: "#22c55e15", borderColor: "#22c55e" }]}>
              <Feather name="check-circle" size={16} color="#22c55e" />
              <Text style={[styles.connectedText, { color: "#22c55e" }]}>
                {bt.connectedPrinter.name}
              </Text>
              <TouchableOpacity onPress={bt.disconnectPrinter} style={styles.disconnectBtn}>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>قطع</Text>
              </TouchableOpacity>
            </View>
          )}

          {!bt.isNative && (
            <View style={[styles.webNote, { backgroundColor: colors.accent, borderRadius: 10 }]}>
              <Feather name="info" size={15} color={colors.primary} />
              <Text style={[styles.webNoteText, { color: colors.primary }]}>
                الطباعة البلوتوث تعمل على تطبيق الأندرويد المثبّت فقط
              </Text>
            </View>
          )}

          <View style={styles.printerBtns}>
            <TouchableOpacity
              onPress={handleScan}
              disabled={bt.status === "scanning" || bt.status === "connecting" || bt.status === "printing"}
              style={[styles.btBtn, {
                backgroundColor: colors.accent,
                borderColor: colors.border,
                opacity: (bt.status === "scanning" || bt.status === "connecting") ? 0.6 : 1,
              }]}
            >
              <Feather
                name={bt.status === "scanning" ? "loader" : "bluetooth"}
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.btBtnText, { color: colors.primary }]}>
                {bt.status === "scanning" ? "جاري البحث..." : "بحث عن طابعة"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePrint}
              disabled={bt.status === "printing" || bt.status === "scanning" || bt.status === "connecting"}
              style={[styles.btBtn, {
                backgroundColor: bt.isConnected ? "#22c55e" : colors.accent,
                borderColor: bt.isConnected ? "#22c55e" : colors.border,
                opacity: bt.status === "printing" ? 0.6 : 1,
              }]}
            >
              <Feather name="printer" size={18} color={bt.isConnected ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.btBtnText, { color: bt.isConnected ? "#fff" : colors.mutedForeground }]}>
                {bt.status === "printing" ? "جاري الطباعة..." : "طباعة"}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* معاينة الفاتورة */}
        <Card style={[styles.receiptPreview, { borderStyle: "dashed", borderColor: colors.border }]}>
          <Text style={[styles.receiptLabel, { color: colors.mutedForeground }]}>معاينة نص الفاتورة</Text>
          <Text style={[styles.receiptText, { color: colors.foreground }]}>{getReceiptText()}</Text>
        </Card>

        {/* المشاركة والنسخ */}
        <Card style={styles.shareCard}>
          <Text style={[styles.shareTitle, { color: colors.foreground }]}>مشاركة الفاتورة</Text>
          <View style={styles.shareBtns}>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.shareBtn, { backgroundColor: "#25D36615", borderColor: "#25D366" }]}
            >
              <Feather name="share-2" size={18} color="#25D366" />
              <Text style={[styles.shareBtnText, { color: "#25D366" }]}>مشاركة</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCopy}
              style={[styles.shareBtn, { backgroundColor: colors.accent, borderColor: colors.border }]}
            >
              <Feather name="copy" size={18} color={colors.mutedForeground} />
              <Text style={[styles.shareBtnText, { color: colors.mutedForeground }]}>نسخ النص</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      {/* مودال اختيار الطابعة */}
      <Modal visible={showDeviceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>اختر الطابعة</Text>
              <TouchableOpacity onPress={() => setShowDeviceModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {bt.pairedDevices.length === 0 ? (
              <View style={styles.noDevices}>
                <Feather name="bluetooth" size={40} color={colors.mutedForeground} />
                <Text style={[styles.noDevicesTitle, { color: colors.foreground }]}>لا توجد أجهزة مقترنة</Text>
                <Text style={[styles.noDevicesSub, { color: colors.mutedForeground }]}>
                  افتح إعدادات البلوتوث في هاتفك وقم بإقران الطابعة أولاً، ثم ارجع وابحث من جديد.
                </Text>
                <Button
                  title="إعادة البحث"
                  icon="refresh-cw"
                  onPress={async () => {
                    setShowDeviceModal(false);
                    await bt.scanDevices();
                    setShowDeviceModal(true);
                  }}
                  variant="secondary"
                  small
                />
              </View>
            ) : (
              <>
                <Text style={[styles.deviceListLabel, { color: colors.mutedForeground }]}>
                  الأجهزة المقترنة بهاتفك ({bt.pairedDevices.length})
                </Text>
                <ScrollView style={{ maxHeight: 320 }}>
                  {bt.pairedDevices.map((device) => {
                    const isSaved = bt.savedPrinter?.address === device.address;
                    const isConn = bt.connectedPrinter?.address === device.address;
                    return (
                      <TouchableOpacity
                        key={device.address}
                        onPress={() => handleSelectDevice(device)}
                        style={[styles.deviceRow, {
                          backgroundColor: isConn ? "#22c55e10" : colors.accent,
                          borderColor: isConn ? "#22c55e" : isSaved ? colors.primary : colors.border,
                        }]}
                      >
                        <Feather
                          name={isConn ? "check-circle" : "bluetooth"}
                          size={20}
                          color={isConn ? "#22c55e" : isSaved ? colors.primary : colors.mutedForeground}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.deviceName, { color: colors.foreground }]}>{device.name}</Text>
                          <Text style={[styles.deviceAddr, { color: colors.mutedForeground }]}>{device.address}</Text>
                        </View>
                        {isSaved && !isConn && <Badge label="محفوظة" variant="primary" />}
                        {isConn && <Badge label="متصل" variant="success" />}
                        <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  printerCard: { gap: 12 },
  printerTop: { gap: 10 },
  printerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  printerTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  connectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  connectedText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  disconnectBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  webNote: { flexDirection: "row", gap: 8, padding: 10, alignItems: "flex-start" },
  webNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "right" },
  printerBtns: { flexDirection: "row", gap: 10 },
  btBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  btBtnText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  receiptPreview: { gap: 8, borderWidth: 1.5 },
  receiptLabel: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  receiptText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 19,
    textAlign: "left",
    letterSpacing: 0.2,
  },
  shareCard: { gap: 12 },
  shareTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  shareBtns: { flexDirection: "row", gap: 10 },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  shareBtnText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20, maxHeight: "80%" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  noDevices: { alignItems: "center", padding: 20, gap: 12 },
  noDevicesTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  noDevicesSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  deviceListLabel: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", marginBottom: 10 },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  deviceName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right" },
  deviceAddr: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
});
