import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: { icon: string; onPress: () => void; label?: string };
  rightAction2?: { icon: string; onPress: () => void; label?: string };
}

export function Header({ title, subtitle, showBack, rightAction, rightAction2 }: HeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          paddingTop: topPad + 8,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-right" size={20} color={colors.primary} />
            <Text style={[styles.backLabel, { color: colors.primary }]}>رجوع</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {rightAction2 ? (
            <TouchableOpacity onPress={rightAction2.onPress} style={styles.actionBtn}>
              <Feather name={rightAction2.icon as any} size={18} color={colors.primary} />
              {rightAction2.label ? (
                <Text style={[styles.actionLabel, { color: colors.primary }]}>{rightAction2.label}</Text>
              ) : null}
            </TouchableOpacity>
          ) : null}
          {rightAction ? (
            <TouchableOpacity onPress={rightAction.onPress} style={styles.actionBtn}>
              <Feather name={rightAction.icon as any} size={18} color={colors.primary} />
              {rightAction.label ? (
                <Text style={[styles.actionLabel, { color: colors.primary }]}>{rightAction.label}</Text>
              ) : null}
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 60,
  },
  backLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 60,
    justifyContent: "flex-end",
  },
  actionBtn: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  actionLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  placeholder: {
    minWidth: 60,
  },
});
