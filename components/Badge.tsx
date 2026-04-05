import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface BadgeProps {
  label: string;
  variant?: "success" | "warning" | "destructive" | "primary" | "muted";
}

export function Badge({ label, variant = "primary" }: BadgeProps) {
  const colors = useColors();
  const bg =
    variant === "success"
      ? colors.success + "20"
      : variant === "warning"
      ? colors.warning + "20"
      : variant === "destructive"
      ? colors.destructive + "20"
      : variant === "muted"
      ? colors.muted
      : colors.primary + "18";

  const fg =
    variant === "success"
      ? colors.success
      : variant === "warning"
      ? colors.warning
      : variant === "destructive"
      ? colors.destructive
      : variant === "muted"
      ? colors.mutedForeground
      : colors.primary;

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: 20 }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
