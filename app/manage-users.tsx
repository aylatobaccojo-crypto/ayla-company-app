import { Feather } from "@expo/vector-icons";
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
import type { Role, User } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const EMPTY_FORM = {
  name: "",
  username: "",
  password: "",
  phone: "",
  role: "driver" as Role,
  vanId: "",
};

export default function ManageUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { users, vans, currentUser, addUser, updateUser, deleteUser } = useApp();
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (currentUser?.role !== "admin") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="إدارة المستخدمين" showBack />
        <View style={styles.denied}>
          <Feather name="lock" size={48} color={colors.destructive} />
          <Text style={[styles.deniedText, { color: colors.foreground }]}>غير مصرح لك بالوصول</Text>
          <Text style={[styles.deniedSub, { color: colors.mutedForeground }]}>هذه الصفحة للمدير فقط</Text>
        </View>
      </View>
    );
  }

  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);

  const openAdd = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      name: user.name,
      username: user.username,
      password: user.password,
      phone: user.phone || "",
      role: user.role,
      vanId: user.vanId || "",
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert("خطأ", "يرجى إدخال الاسم"); return; }
    if (!form.username.trim()) { Alert.alert("خطأ", "يرجى إدخال اسم المستخدم"); return; }
    if (!form.password.trim()) { Alert.alert("خطأ", "يرجى إدخال كلمة السر"); return; }
    if (form.role === "driver" && !form.vanId) { Alert.alert("خطأ", "يرجى اختيار الفان للمندوب"); return; }

    const existing = users.find(
      (u) => u.username === form.username.trim() && u.id !== editUser?.id
    );
    if (existing) { Alert.alert("خطأ", "اسم المستخدم مستخدم بالفعل"); return; }

    const selectedVan = vans.find((v) => v.id === form.vanId);
    const payload = {
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      password: form.password,
      phone: form.phone.trim(),
      role: form.role,
      vanId: form.role === "driver" ? form.vanId : undefined,
    };

    if (editUser) {
      updateUser(editUser.id, payload);
    } else {
      addUser(payload);
    }
    setShowModal(false);
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert("خطأ", "لا يمكنك حذف حسابك الحالي");
      return;
    }
    Alert.alert(
      "حذف المستخدم",
      `هل تريد حذف حساب "${user.name}"؟`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: () => deleteUser(user.id) },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="إدارة المستخدمين"
        subtitle={`${users.length} مستخدم`}
        showBack
        rightAction={{ icon: "user-plus", onPress: openAdd, label: "إضافة" }}
      />

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: botPad + 20 }}
        renderItem={({ item }) => (
          <Card style={styles.userCard}>
            <View style={[styles.avatar, { backgroundColor: item.role === "admin" ? colors.primary + "20" : colors.accent }]}>
              <Feather
                name={item.role === "admin" ? "shield" : "truck"}
                size={22}
                color={item.role === "admin" ? colors.primary : colors.mutedForeground}
              />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.userUsername, { color: colors.mutedForeground }]}>
                @{item.username}
              </Text>
              {item.vanId && (
                <Text style={[styles.userVan, { color: colors.mutedForeground }]}>
                  {vans.find((v) => v.id === item.vanId)?.name}
                </Text>
              )}
            </View>
            <View style={styles.userActions}>
              <Badge
                label={item.role === "admin" ? "مدير" : "مندوب"}
                variant={item.role === "admin" ? "primary" : "default"}
              />
              <View style={styles.actionBtns}>
                <TouchableOpacity
                  onPress={() => openEdit(item)}
                  style={[styles.iconBtn, { backgroundColor: colors.accent }]}
                >
                  <Feather name="edit-2" size={15} color={colors.foreground} />
                </TouchableOpacity>
                {item.id !== currentUser?.id && (
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    style={[styles.iconBtn, { backgroundColor: colors.destructive + "15" }]}
                  >
                    <Feather name="trash-2" size={15} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="الاسم الكامل *"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="مثال: أحمد محمد"
              />

              <Input
                label="اسم المستخدم *"
                value={form.username}
                onChangeText={(v) => setForm({ ...form, username: v })}
                placeholder="مثال: ahmed"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.passwordRow}>
                <Input
                  label="كلمة السر *"
                  value={form.password}
                  onChangeText={(v) => setForm({ ...form, password: v })}
                  placeholder="كلمة السر"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <Input
                label="رقم الهاتف"
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                placeholder="07XXXXXXXX"
                keyboardType="phone-pad"
              />

              <Text style={[styles.label, { color: colors.foreground }]}>الصلاحية *</Text>
              <View style={styles.roleRow}>
                {(["driver", "admin"] as Role[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setForm({ ...form, role: r, vanId: r === "admin" ? "" : form.vanId })}
                    style={[
                      styles.roleBtn,
                      {
                        backgroundColor: form.role === r ? colors.primary : colors.muted,
                        borderRadius: 8,
                      },
                    ]}
                  >
                    <Feather
                      name={r === "admin" ? "shield" : "truck"}
                      size={16}
                      color={form.role === r ? "#fff" : colors.mutedForeground}
                    />
                    <Text style={[styles.roleBtnText, { color: form.role === r ? "#fff" : colors.foreground }]}>
                      {r === "admin" ? "مدير" : "مندوب"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.role === "driver" && (
                <>
                  <Text style={[styles.label, { color: colors.foreground }]}>الفان *</Text>
                  {vans.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => setForm({ ...form, vanId: v.id })}
                      style={[
                        styles.vanOption,
                        {
                          borderColor: form.vanId === v.id ? colors.primary : colors.border,
                          backgroundColor: form.vanId === v.id ? colors.primary + "10" : "transparent",
                          borderRadius: 8,
                        },
                      ]}
                    >
                      <Feather name="truck" size={16} color={form.vanId === v.id ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.vanText, { color: form.vanId === v.id ? colors.primary : colors.foreground }]}>
                        {v.name} — {v.plate}
                      </Text>
                      {form.vanId === v.id && <Feather name="check" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <Button title={editUser ? "حفظ التعديلات" : "إضافة المستخدم"} icon={editUser ? "check" : "user-plus"} onPress={handleSave} style={styles.saveBtn} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  userCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  userUsername: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  userVan: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  userActions: { alignItems: "flex-end", gap: 6 },
  actionBtns: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  label: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 8, textAlign: "right" },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  roleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, gap: 8 },
  roleBtnText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  vanOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  vanText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
  passwordRow: { position: "relative" },
  eyeBtn: { position: "absolute", left: 12, bottom: 14 },
  saveBtn: { marginTop: 8, marginBottom: 20 },
  denied: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  deniedText: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  deniedSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
