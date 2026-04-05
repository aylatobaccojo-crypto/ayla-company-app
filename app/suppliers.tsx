import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApp } from "@/context/AppContext";
import type { Supplier } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";

export default function SuppliersScreen() {
  const router = useRouter();
  const colors = useColors();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useAppContext();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", taxNumber: "", notes: "" });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", address: "", taxNumber: "", notes: "" });
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      phone: s.phone || "",
      address: s.address || "",
      taxNumber: s.taxNumber || "",
      notes: s.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert("خطأ", "اسم المورد مطلوب");
      return;
    }
    if (editing) {
      updateSupplier(editing.id, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        taxNumber: form.taxNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
    } else {
      addSupplier({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        taxNumber: form.taxNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
    }
    setShowModal(false);
  };

  const handleDelete = (s: Supplier) => {
    Alert.alert(
      "حذف المورد",
      `هل تريد حذف "${s.name}"؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => deleteSupplier(s.id),
        },
      ]
    );
  };

  const sorted = [...(suppliers || [])].sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="الموردون"
        showBack
        rightAction={{ icon: "plus", onPress: openAdd, label: "إضافة" }}
      />

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="truck" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            لا يوجد موردون بعد
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: "#b45309" }]}
            onPress={openAdd}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>إضافة مورد</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={
            <TouchableOpacity
              style={[styles.addBtnRow, { backgroundColor: "#b45309" }]}
              onPress={openAdd}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.addBtnText}>إضافة مورد جديد</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.iconCircle, { backgroundColor: "#b4530920" }]}>
                  <Feather name="truck" size={20} color="#b45309" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: colors.foreground }]}>{item.name}</Text>
                  {item.phone ? (
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      <Feather name="phone" size={12} /> {item.phone}
                    </Text>
                  ) : null}
                  {item.address ? (
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      <Feather name="map-pin" size={12} /> {item.address}
                    </Text>
                  ) : null}
                  {item.taxNumber ? (
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      رقم ضريبي: {item.taxNumber}
                    </Text>
                  ) : null}
                  {item.notes ? (
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                    onPress={() => openEdit(item)}
                  >
                    <Feather name="edit-2" size={15} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#fef2f2" }]}
                    onPress={() => handleDelete(item)}
                  >
                    <Feather name="trash-2" size={15} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editing ? "تعديل المورد" : "إضافة مورد جديد"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              <Input
                label="اسم المورد *"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="مثال: شركة الدخان الأردنية"
              />
              <Input
                label="رقم الهاتف"
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                placeholder="07xxxxxxxx"
                keyboardType="phone-pad"
              />
              <Input
                label="العنوان"
                value={form.address}
                onChangeText={(v) => setForm({ ...form, address: v })}
                placeholder="المدينة، الشارع..."
              />
              <Input
                label="الرقم الضريبي"
                value={form.taxNumber}
                onChangeText={(v) => setForm({ ...form, taxNumber: v })}
                placeholder="رقم ضريبي اختياري"
              />
              <Input
                label="ملاحظات"
                value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                placeholder="أي ملاحظات..."
                multiline
              />
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: colors.accent }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: "#b45309", flex: 1 }]}
                onPress={handleSave}
              >
                <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
                  {editing ? "حفظ التعديلات" : "إضافة مورد"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  emptyText: { fontSize: 16, textAlign: "center" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  addBtnRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 10, marginBottom: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  card: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconCircle: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: "center", alignItems: "center",
  },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 16, fontWeight: "700", textAlign: "right" },
  cardSub: { fontSize: 13, textAlign: "right" },
  actions: { flexDirection: "column", gap: 6 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
  },
  modalOverlay: {
    flex: 1, backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  modalBox: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalFooter: {
    flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1,
  },
  footerBtn: {
    paddingVertical: 13, paddingHorizontal: 18,
    borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
});
