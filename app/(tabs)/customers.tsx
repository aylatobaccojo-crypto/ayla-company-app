import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
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

export default function CustomersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser, customers, vans, addCustomer, updateCustomer } = useApp();
  const isAdmin = currentUser?.role === "admin";
  const vanId = currentUser?.vanId;
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [form, setForm] = useState<{
    name: string; phone: string; address: string;
    vanId: string; taxNumber: string; lat?: number; lng?: number;
  }>({ name: "", phone: "", address: "", vanId: vanId || "", taxNumber: "" });

  const filtered = customers.filter(
    (c) =>
      (isAdmin || c.vanId === vanId) &&
      (c.name.includes(search) || c.phone.includes(search))
  );

  const openAdd = () => {
    setForm({ name: "", phone: "", address: "", vanId: vanId || "", taxNumber: "", lat: undefined, lng: undefined });
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setForm({
      name: c.name, phone: c.phone, address: c.address,
      vanId: c.vanId || "", taxNumber: c.taxNumber || "",
      lat: c.lat, lng: c.lng,
    });
    setEditId(c.id);
    setShowModal(true);
  };

  const captureLocation = async () => {
    if (Platform.OS === "web") {
      Alert.alert("تنبيه", "تحديد الموقع غير متاح على الويب — يمكنك إدخال العنوان يدوياً");
      return;
    }
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("خطأ", "لا يوجد إذن للوصول للموقع");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      // احفظ الإحداثيات في النموذج
      setForm((f) => ({ ...f, lat: latitude, lng: longitude }));
      // إذا كنا في وضع التعديل، حدّث مباشرةً
      if (editId) {
        updateCustomer(editId, { lat: latitude, lng: longitude });
      }
    } catch {
      Alert.alert("خطأ", "تعذّر تحديد الموقع — حاول مرة أخرى");
    } finally {
      setLocLoading(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم العميل");
      return;
    }
    if (!form.phone.trim()) {
      Alert.alert("خطأ", "يرجى إدخال رقم الهاتف");
      return;
    }
    if (editId) {
      updateCustomer(editId, form);
    } else {
      addCustomer(form);
    }
    setShowModal(false);
  };

  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="العملاء"
        rightAction={{ icon: "plus", onPress: openAdd, label: "إضافة" }}
      />

      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <Input
          placeholder="بحث..."
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { backgroundColor: "transparent", borderWidth: 0 }]}
        />
        <TouchableOpacity onPress={() => router.push("/(tabs)/tracking")}>
          <Feather name="map" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: botPad + 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openEdit(item)}>
            <Card style={styles.customerCard}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{item.name.slice(0, 1)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.phone, { color: colors.mutedForeground }]}>{item.phone}</Text>
                {item.address ? (
                  <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.address}
                  </Text>
                ) : null}
              </View>
              <View style={styles.right}>
                {item.balance > 0 && (
                  <Badge label={`${item.balance} د.أ`} variant="warning" />
                )}
                {item.lat && (
                  <Feather name="map-pin" size={16} color={colors.success} />
                )}
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد عملاء</Text>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editId ? "تعديل عميل" : "إضافة عميل"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="الاسم *"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="اسم العميل"
              />
              <Input
                label="رقم الهاتف *"
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                keyboardType="phone-pad"
                placeholder="07XXXXXXXX"
              />
              <Input
                label="العنوان"
                value={form.address}
                onChangeText={(v) => setForm({ ...form, address: v })}
                placeholder="حي، شارع، منطقة..."
              />

              {/* موقع GPS */}
              <View style={styles.locSection}>
                <TouchableOpacity
                  onPress={captureLocation}
                  disabled={locLoading}
                  style={[
                    styles.locBtn,
                    {
                      backgroundColor: form.lat ? colors.success + "18" : colors.primary + "18",
                      borderRadius: colors.radius,
                      borderWidth: 1,
                      borderColor: form.lat ? colors.success : colors.primary,
                    },
                  ]}
                >
                  <Feather
                    name={locLoading ? "loader" : form.lat ? "check-circle" : "map-pin"}
                    size={18}
                    color={form.lat ? colors.success : colors.primary}
                  />
                  <Text style={[styles.locBtnText, { color: form.lat ? colors.success : colors.primary }]}>
                    {locLoading ? "جارٍ تحديد الموقع..." : form.lat ? "تم تحديد الموقع ✓" : "تحديد موقع العميل (GPS)"}
                  </Text>
                </TouchableOpacity>
                {form.lat && (
                  <View style={[styles.locBadge, { backgroundColor: colors.success + "10" }]}>
                    <Feather name="map-pin" size={12} color={colors.success} />
                    <Text style={[styles.locCoords, { color: colors.success }]}>
                      {form.lat.toFixed(5)}, {form.lng?.toFixed(5)}
                    </Text>
                    <TouchableOpacity onPress={() => setForm((f) => ({ ...f, lat: undefined, lng: undefined }))}>
                      <Feather name="x" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {isAdmin && (
                <>
                  <Input
                    label="الرقم الضريبي (اختياري)"
                    value={form.taxNumber}
                    onChangeText={(v) => setForm({ ...form, taxNumber: v })}
                    keyboardType="numeric"
                    placeholder="رقم التسجيل الضريبي"
                  />
                  <View style={styles.vanSelect}>
                    <Text style={[styles.label, { color: colors.foreground }]}>الفان المخصص</Text>
                    {["", ...vans.map((v) => v.id)].map((vid) => (
                      <TouchableOpacity
                        key={vid}
                        onPress={() => setForm({ ...form, vanId: vid })}
                        style={[
                          styles.vanOption,
                          { borderColor: form.vanId === vid ? colors.primary : colors.border },
                        ]}
                      >
                        <Text style={[styles.vanOptionText, { color: form.vanId === vid ? colors.primary : colors.foreground }]}>
                          {vid ? vans.find((v) => v.id === vid)?.name || vid : "غير محدد"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Button title={editId ? "حفظ التعديلات" : "إضافة العميل"} icon={editId ? "save" : "user-plus"} onPress={handleSave} style={styles.saveBtn} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, marginBottom: 0 },
  customerCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  phone: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right" },
  address: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  right: { alignItems: "flex-end", gap: 6 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vanSelect: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 8, textAlign: "right" },
  vanOption: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6 },
  vanOptionText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  locSection: { marginBottom: 12, gap: 8 },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
  },
  locBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  locBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
  },
  locCoords: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  saveBtn: { marginTop: 4, marginBottom: 20 },
});
