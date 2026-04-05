/**
 * MessageNotifier
 * - يطلب صلاحيات الإشعارات عند بدء التطبيق
 * - يراقب الرسائل الجديدة غير المقروءة للمندوب
 * - يشغّل إشعار نظام (صوت + اهتزاز) عبر expo-notifications
 * - يعرض بانر داخلي متحرك عند وصول رسالة جديدة
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// إعداد طريقة عرض الإشعارات عند فتح التطبيق
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function MessageNotifier() {
  const { currentUser, messages } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // بانر داخلي
  const bannerAnim = useRef(new Animated.Value(-120)).current;
  const bannerVisible = useRef(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bannerData, setBannerData] = React.useState<{ subject: string; from: string } | null>(null);

  // تتبع الرسائل المقروءة السابقة
  const prevUnreadIds = useRef<Set<string>>(new Set());
  const permRequested = useRef(false);

  // طلب صلاحيات الإشعارات
  useEffect(() => {
    if (permRequested.current) return;
    permRequested.current = true;
    if (Platform.OS !== "web") {
      Notifications.requestPermissionsAsync().then(({ status }) => {
        if (status !== "granted") {
          console.log("Notification permissions not granted");
        }
      });
    }
  }, []);

  // رصد الرسائل الجديدة للمندوب
  useEffect(() => {
    if (!currentUser || currentUser.role === "admin") return;

    const myVanId = currentUser.vanId || "";
    const uid = currentUser.id;

    const myMessages = (messages || []).filter((m) => {
      return (m.toVanId === "all" || m.toVanId === myVanId) && !m.readBy.includes(uid);
    });

    const newMessages = myMessages.filter((m) => !prevUnreadIds.current.has(m.id));

    if (newMessages.length > 0) {
      const latest = newMessages[newMessages.length - 1];

      // 1) اهتزاز قوي
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // 2) إشعار نظام (صوت + اشعار بار)
      if (Platform.OS !== "web") {
        Notifications.scheduleNotificationAsync({
          content: {
            title: `📬 رسالة جديدة من ${latest.fromName}`,
            body: latest.subject,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 100, 250],
          },
          trigger: null, // يظهر فوراً
        }).catch(() => {});
      }

      // 3) بانر داخلي
      setBannerData({ subject: latest.subject, from: latest.fromName });
      showBanner();

      // تحديث الرسائل المتتبعة
      newMessages.forEach((m) => prevUnreadIds.current.add(m.id));
    }

    // إزالة الرسائل المقروءة من التتبع
    const currentUnreadIds = new Set(myMessages.map((m) => m.id));
    prevUnreadIds.current.forEach((id) => {
      if (!currentUnreadIds.has(id)) prevUnreadIds.current.delete(id);
    });
  }, [messages, currentUser]);

  const showBanner = () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    if (bannerVisible.current) {
      // إعادة الرسوم مباشرة
      Animated.spring(bannerAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    } else {
      bannerVisible.current = true;
      Animated.spring(bannerAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    }
    bannerTimer.current = setTimeout(hideBanner, 4500);
  };

  const hideBanner = () => {
    Animated.timing(bannerAnim, { toValue: -120, duration: 300, useNativeDriver: true }).start(() => {
      bannerVisible.current = false;
      setBannerData(null);
    });
  };

  if (!bannerData) return null;

  const topOffset = Platform.OS === "web" ? 0 : insets.top;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: colors.primary,
          top: topOffset + 10,
          transform: [{ translateY: bannerAnim }],
          shadowColor: colors.primary,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          hideBanner();
          router.push("/messages");
        }}
        style={styles.bannerContent}
        activeOpacity={0.9}
      >
        <View style={styles.bannerIcon}>
          <Feather name="mail" size={20} color="#fff" />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle} numberOfLines={1}>
            رسالة جديدة من {bannerData.from}
          </Text>
          <Text style={styles.bannerSub} numberOfLines={1}>
            {bannerData.subject}
          </Text>
        </View>
        <TouchableOpacity onPress={hideBanner} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 14,
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    zIndex: 9999,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  bannerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },
});
