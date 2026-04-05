import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import type { AppMessage } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser, vans, users, messages, sendMessage, replyToMessage, markMessageRead } = useApp();
  const isAdmin = currentUser?.role === "admin";
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // الرسائل المرئية لهذا المستخدم
  const myMessages = (messages || [])
    .filter((m) => {
      if (isAdmin) return true; // المدير يرى كل الرسائل
      const myVanId = currentUser?.vanId || "";
      return m.toVanId === "all" || m.toVanId === myVanId;
    })
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const unreadCount = myMessages.filter(
    (m) => !m.readBy.includes(currentUser?.id || "")
  ).length;

  // حالة عرض الرسالة والرد
  const [selectedMsg, setSelectedMsg] = useState<AppMessage | null>(null);
  const [replyText, setReplyText] = useState("");

  // حالة إنشاء رسالة جديدة (للمدير فقط)
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTo, setComposeTo] = useState<string>("all");

  const drivers = vans; // قائمة الفانات (كل فان = مندوب)

  const openMessage = (msg: AppMessage) => {
    setSelectedMsg(msg);
    setReplyText("");
    if (!msg.readBy.includes(currentUser?.id || "")) {
      markMessageRead(msg.id);
    }
  };

  const handleReply = () => {
    if (!replyText.trim()) {
      Alert.alert("تنبيه", "يرجى كتابة نص الرد");
      return;
    }
    if (!selectedMsg) return;
    replyToMessage(selectedMsg.id, replyText.trim());
    setReplyText("");
    // تحديث الرسالة المعروضة
    setSelectedMsg((prev) =>
      prev
        ? {
            ...prev,
            replies: [
              ...prev.replies,
              {
                id: Date.now().toString(),
                fromUserId: currentUser?.id || "",
                fromName: currentUser?.name || "",
                body: replyText.trim(),
                date: new Date().toISOString(),
              },
            ],
          }
        : null
    );
  };

  const handleSend = () => {
    if (!composeSubject.trim()) {
      Alert.alert("خطأ", "يرجى إدخال موضوع الرسالة");
      return;
    }
    if (!composeBody.trim()) {
      Alert.alert("خطأ", "يرجى كتابة نص الرسالة");
      return;
    }
    sendMessage({ toVanId: composeTo, subject: composeSubject.trim(), body: composeBody.trim() });
    setShowCompose(false);
    setComposeSubject("");
    setComposeBody("");
    setComposeTo("all");
    Alert.alert("تم", "تم إرسال الرسالة بنجاح ✓");
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date().toDateString();
    if (d.toDateString() === today) {
      return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
  };

  const getToLabel = (toVanId: string) => {
    if (toVanId === "all") return "جميع المندوبين";
    const van = drivers.find((v) => v.id === toVanId);
    return van ? `${van.driverName} (${van.name})` : toVanId;
  };

  const isUnread = (msg: AppMessage) => !msg.readBy.includes(currentUser?.id || "");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={`البريد الداخلي${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
        showBack
        rightAction={isAdmin ? { icon: "edit", onPress: () => setShowCompose(true), label: "رسالة جديدة" } : undefined}
      />

      {myMessages.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد رسائل</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {isAdmin ? "أرسل رسالة للمندوبين بالضغط على «رسالة جديدة»" : "لم تصلك رسائل بعد"}
          </Text>
          {isAdmin && (
            <Button title="رسالة جديدة" icon="edit" onPress={() => setShowCompose(true)} style={{ marginTop: 16 }} />
          )}
        </View>
      ) : (
        <FlatList
          data={myMessages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: botPad + 20 }}
          renderItem={({ item }) => {
            const unread = isUnread(item);
            return (
              <TouchableOpacity onPress={() => openMessage(item)} activeOpacity={0.8}>
                <Card style={[
                  styles.msgCard,
                  { borderRightWidth: 3, borderRightColor: unread ? colors.primary : colors.border },
                ]}>
                  <View style={styles.msgTop}>
                    <View style={[styles.senderAvatar, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.senderInitial, { color: colors.primary }]}>
                        {item.fromName.slice(0, 1)}
                      </Text>
                    </View>
                    <View style={styles.msgMeta}>
                      <View style={styles.msgTitleRow}>
                        <Text style={[styles.msgSubject, { color: colors.foreground, fontWeight: unread ? "700" : "500" }]} numberOfLines={1}>
                          {item.subject}
                        </Text>
                        {unread && (
                          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                        )}
                      </View>
                      <Text style={[styles.msgSender, { color: colors.mutedForeground }]}>
                        من: {item.fromName}
                      </Text>
                      {isAdmin && (
                        <Text style={[styles.msgTo, { color: colors.mutedForeground }]}>
                          إلى: {getToLabel(item.toVanId)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.msgRight}>
                      <Text style={[styles.msgDate, { color: colors.mutedForeground }]}>
                        {formatDate(item.date)}
                      </Text>
                      {item.replies.length > 0 && (
                        <View style={[styles.replyBadge, { backgroundColor: colors.success + "20" }]}>
                          <Feather name="corner-down-left" size={10} color={colors.success} />
                          <Text style={[styles.replyCount, { color: colors.success }]}>{item.replies.length}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.msgPreview, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ─── مودال عرض الرسالة والرد ─── */}
      <Modal visible={!!selectedMsg} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={2}>
                {selectedMsg?.subject}
              </Text>
              <TouchableOpacity onPress={() => setSelectedMsg(null)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.msgInfoBar, { backgroundColor: colors.accent, borderRadius: 8 }]}>
              <View style={styles.infoItem}>
                <Feather name="user" size={13} color={colors.mutedForeground} />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  من: {selectedMsg?.fromName}
                </Text>
              </View>
              {isAdmin && (
                <View style={styles.infoItem}>
                  <Feather name="send" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                    إلى: {selectedMsg ? getToLabel(selectedMsg.toVanId) : ""}
                  </Text>
                </View>
              )}
              <View style={styles.infoItem}>
                <Feather name="clock" size={13} color={colors.mutedForeground} />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  {selectedMsg ? new Date(selectedMsg.date).toLocaleString("ar-SA") : ""}
                </Text>
              </View>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {/* نص الرسالة الأصلية */}
                <View style={[styles.msgBody, { backgroundColor: colors.background, borderRadius: 10 }]}>
                  <Text style={[styles.msgBodyText, { color: colors.foreground }]}>
                    {selectedMsg?.body}
                  </Text>
                </View>

                {/* الردود */}
                {(selectedMsg?.replies || []).length > 0 && (
                  <View style={styles.repliesSection}>
                    <Text style={[styles.repliesTitle, { color: colors.mutedForeground }]}>
                      الردود ({selectedMsg?.replies.length})
                    </Text>
                    {selectedMsg?.replies.map((reply) => {
                      const isMine = reply.fromUserId === currentUser?.id;
                      return (
                        <View
                          key={reply.id}
                          style={[
                            styles.replyBubble,
                            {
                              backgroundColor: isMine ? colors.primary + "15" : colors.accent,
                              borderColor: isMine ? colors.primary : colors.border,
                              alignSelf: isMine ? "flex-start" : "flex-end",
                            },
                          ]}
                        >
                          <Text style={[styles.replyFrom, { color: isMine ? colors.primary : colors.foreground }]}>
                            {reply.fromName}
                          </Text>
                          <Text style={[styles.replyText, { color: colors.foreground }]}>
                            {reply.body}
                          </Text>
                          <Text style={[styles.replyDate, { color: colors.mutedForeground }]}>
                            {formatDate(reply.date)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              {/* حقل الرد */}
              <View style={[styles.replyBox, { borderTopColor: colors.border }]}>
                <Input
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="اكتب ردّك هنا..."
                  multiline
                  style={{ marginBottom: 0, minHeight: 44 }}
                />
                <TouchableOpacity
                  onPress={handleReply}
                  disabled={!replyText.trim()}
                  style={[
                    styles.sendReplyBtn,
                    { backgroundColor: replyText.trim() ? colors.primary : colors.muted },
                  ]}
                >
                  <Feather name="send" size={18} color={replyText.trim() ? "#fff" : colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* ─── مودال إنشاء رسالة جديدة (للمدير) ─── */}
      <Modal visible={showCompose} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>رسالة جديدة</Text>
              <TouchableOpacity onPress={() => setShowCompose(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* المستلم */}
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>إرسال إلى</Text>
              <TouchableOpacity
                onPress={() => setComposeTo("all")}
                style={[
                  styles.toOption,
                  {
                    borderColor: composeTo === "all" ? colors.primary : colors.border,
                    backgroundColor: composeTo === "all" ? colors.primary + "12" : colors.muted,
                  },
                ]}
              >
                <Feather name="users" size={16} color={composeTo === "all" ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.toOptionText, { color: composeTo === "all" ? colors.primary : colors.foreground }]}>
                  جميع المندوبين
                </Text>
                {composeTo === "all" && <Feather name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>

              {drivers.map((van) => (
                <TouchableOpacity
                  key={van.id}
                  onPress={() => setComposeTo(van.id)}
                  style={[
                    styles.toOption,
                    {
                      borderColor: composeTo === van.id ? colors.primary : colors.border,
                      backgroundColor: composeTo === van.id ? colors.primary + "12" : colors.muted,
                    },
                  ]}
                >
                  <Feather name="user" size={16} color={composeTo === van.id ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.toOptionText, { color: composeTo === van.id ? colors.primary : colors.foreground }]}>
                    {van.driverName} — {van.name}
                  </Text>
                  {composeTo === van.id && <Feather name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}

              <View style={{ marginTop: 12 }}>
                <Input
                  label="الموضوع *"
                  value={composeSubject}
                  onChangeText={setComposeSubject}
                  placeholder="موضوع الرسالة..."
                />
                <Input
                  label="نص الرسالة *"
                  value={composeBody}
                  onChangeText={setComposeBody}
                  placeholder="اكتب رسالتك هنا..."
                  multiline
                  style={{ minHeight: 100 }}
                />
              </View>

              <Button title="إرسال الرسالة" icon="send" onPress={handleSend} style={{ marginTop: 8, marginBottom: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  msgCard: { gap: 8 },
  msgTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  senderAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  senderInitial: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  msgMeta: { flex: 1, gap: 2 },
  msgTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  msgSubject: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  msgSender: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  msgTo: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  msgRight: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  msgDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  replyBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  replyCount: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  msgPreview: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "right", lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { padding: 20, maxHeight: "92%", flex: 0 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 10 },
  modalTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", flex: 1, textAlign: "right" },
  msgInfoBar: { padding: 10, gap: 4, marginBottom: 12 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  msgBody: { padding: 14, marginBottom: 12 },
  msgBodyText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24, textAlign: "right" },
  repliesSection: { gap: 8, marginBottom: 12 },
  repliesTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  replyBubble: { padding: 10, borderRadius: 10, borderWidth: 1, maxWidth: "90%", gap: 4 },
  replyFrom: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  replyText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, textAlign: "right" },
  replyDate: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  replyBox: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 10, borderTopWidth: 1 },
  sendReplyBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 12 },
  fieldLabel: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "right", marginBottom: 8 },
  toOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  toOptionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
});
