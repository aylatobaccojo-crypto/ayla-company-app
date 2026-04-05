import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

export default function CompanySettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { companySettings, updateCompanySettings, syncStatus, loadFromServer } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [name, setName] = useState(companySettings.name);
  const [phone, setPhone] = useState(companySettings.phone);
  const [taxNumber, setTaxNumber] = useState(companySettings.taxNumber);
  const [address, setAddress] = useState(companySettings.address);
  const [syncKey, setSyncKey] = useState(companySettings.syncKey || "");
  const [serverUrl, setServerUrl] = useState(companySettings.serverUrl || "");
  const [showSyncKey, setShowSyncKey] = useState(false);

  const isDirty =
    name !== companySettings.name ||
    phone !== companySettings.phone ||
    taxNumber !== companySettings.taxNumber ||
    address !== companySettings.address ||
    syncKey !== (companySettings.syncKey || "") ||
    serverUrl !== (companySettings.serverUrl || "");

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم الشركة");
      return;
    }
    if (syncKey.trim() && syncKey.trim().length < 6) {
      Alert.alert("خطأ", "رمز المزامنة يجب أن يكون 6 أحرف على الأقل");
      return;
    }
    updateCompanySettings({
      name: name.trim(),
      phone: phone.trim(),
      taxNumber: taxNumber.trim(),
      address: address.trim(),
      syncKey: syncKey.trim() || undefined,
      serverUrl: serverUrl.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("تم الحفظ ✓", "تم حفظ بيانات الشركة — ستظهر على جميع الفواتير");
  };

  const handleSyncNow = async () => {
    const key = syncKey.trim() || companySettings.syncKey?.trim();
    if (!key) {
      Alert.alert("تنبيه", "أدخل رمز المزامنة أولاً ثم احفظ");
      return;
    }
    await loadFromServer(key);
    Alert.alert("تمت المزامنة ✓", "تم جلب أحدث البيانات من السحابة");
  };

  const syncStatusInfo = {
    idle: { color: colors.mutedForeground, icon: "cloud" as const, label: "غير مفعّلة" },
    syncing: { color: "#f59e0b", icon: "loader" as const, label: "جاري المزامنة..." },
    synced: { color: "#22c55e", icon: "cloud" as const, label: "مزامنة ناجحة ✓" },
    error: { color: colors.destructive, icon: "cloud-off" as const, label: "خطأ في الاتصال" },
  }[syncStatus];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="بيانات الشركة" showBack />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 20, gap: 16 }}>

        {/* معاينة الفاتورة */}
        <Card style={[styles.previewCard, { borderColor: colors.primary + "40", borderWidth: 1.5, borderStyle: "dashed" }]}>
          <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>معاينة رأس الفاتورة</Text>
          <View style={styles.previewContent}>
            <Text style={[styles.previewCompany, { color: colors.primary }]}>{name || "اسم الشركة"}</Text>
            {phone ? (
              <View style={styles.previewRow}>
                <Feather name="phone" size={13} color={colors.mutedForeground} />
                <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>{phone}</Text>
              </View>
            ) : null}
            {taxNumber ? (
              <View style={styles.previewRow}>
                <Feather name="hash" size={13} color={colors.mutedForeground} />
                <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>
                  رقم التسجيل الضريبي: {taxNumber}
                </Text>
              </View>
            ) : null}
            {address ? (
              <View style={styles.previewRow}>
                <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                <Text style={[styles.previewSub, { color: colors.mutedForeground }]}>{address}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* الحقول */}
        <Card style={{ gap: 4 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>معلومات الشركة</Text>

          <Input
            label="اسم الشركة"
            value={name}
            onChangeText={setName}
            placeholder="مثال: Ayla Company"
          />
          <Input
            label="رقم الهاتف"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="مثال: 0781272009"
          />
          <Input
            label="العنوان"
            value={address}
            onChangeText={setAddress}
            placeholder="مثال: عمان، الأردن"
          />
        </Card>

        <Card style={{ gap: 4 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>البيانات الضريبية</Text>

          <View style={[styles.infoBox, { backgroundColor: "#0891b215", borderRadius: 10 }]}>
            <Feather name="info" size={15} color="#0891b2" />
            <Text style={[styles.infoText, { color: "#0891b2" }]}>
              رقم التسجيل الضريبي يظهر على جميع الفواتير المطبوعة والمشاركة.
            </Text>
          </View>

          <Input
            label="رقم التسجيل الضريبي"
            value={taxNumber}
            onChangeText={setTaxNumber}
            keyboardType="numeric"
            placeholder="مثال: 12345678"
          />
        </Card>

        {/* ─── قسم المزامنة السحابية ─── */}
        <Card style={{ gap: 12 }}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Feather name="cloud" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                المزامنة السحابية
              </Text>
            </View>
            <View style={[styles.syncBadge, { backgroundColor: syncStatusInfo.color + "20" }]}>
              <Feather name={syncStatusInfo.icon} size={13} color={syncStatusInfo.color} />
              <Text style={[styles.syncBadgeText, { color: syncStatusInfo.color }]}>
                {syncStatusInfo.label}
              </Text>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.primary + "12", borderRadius: 10 }]}>
            <Feather name="info" size={15} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              أدخل رابط السيرفر ورمزاً سرياً خاصاً بشركتك. ثبّت التطبيق على أجهزة المدير والمندوبين وأدخل نفس البيانات في كل جهاز — ستُشارك جميعها نفس البيانات تلقائياً.
            </Text>
          </View>

          <Input
            label="رابط سيرفر المزامنة (API URL)"
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="https://your-api.replit.app/api"
            keyboardType="url"
            autoCapitalize="none"
          />

          <View style={styles.syncKeyRow}>
            <Input
              label="رمز المزامنة السري"
              value={showSyncKey ? syncKey : syncKey.replace(/./g, "●")}
              onChangeText={setSyncKey}
              placeholder="مثال: ayla2024secret"
              style={{ flex: 1, marginBottom: 0 }}
              editable={showSyncKey}
            />
            <TouchableOpacity
              onPress={() => setShowSyncKey(!showSyncKey)}
              style={[styles.eyeBtn, { backgroundColor: colors.accent, borderColor: colors.border }]}
            >
              <Feather name={showSyncKey ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {syncKey.trim() && (
            <TouchableOpacity
              onPress={handleSyncNow}
              disabled={syncStatus === "syncing"}
              style={[styles.syncNowBtn, {
                backgroundColor: colors.primary + "15",
                borderColor: colors.primary,
                opacity: syncStatus === "syncing" ? 0.6 : 1,
              }]}
            >
              <Feather name="refresh-cw" size={16} color={colors.primary} />
              <Text style={[styles.syncNowText, { color: colors.primary }]}>
                {syncStatus === "syncing" ? "جاري المزامنة..." : "مزامنة الآن"}
              </Text>
            </TouchableOpacity>
          )}

          {!syncKey.trim() && (
            <Text style={[styles.syncHint, { color: colors.mutedForeground }]}>
              اتركه فارغاً لإيقاف المزامنة والعمل محلياً فقط
            </Text>
          )}
        </Card>

        <Button
          title={isDirty ? "حفظ التغييرات" : "محفوظ ✓"}
          icon={isDirty ? "save" : "check"}
          onPress={handleSave}
          disabled={!isDirty}
          style={{ opacity: isDirty ? 1 : 0.6 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  previewCard: { gap: 10 },
  previewLabel: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  previewContent: { alignItems: "center", gap: 6, paddingVertical: 8 },
  previewCompany: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold", textAlign: "center" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 8 },
  infoBox: { flexDirection: "row", gap: 10, padding: 12, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "right" },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  syncKeyRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  eyeBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  syncNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  syncNowText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  syncHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
});
