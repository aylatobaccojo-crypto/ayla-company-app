import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  small,
}: ButtonProps) {
  const colors = useColors();

  const bgColor =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
      ? colors.secondary
      : variant === "destructive"
      ? colors.destructive
      : "transparent";

  const textColor =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "secondary"
      ? colors.secondaryForeground
      : variant === "destructive"
      ? colors.destructiveForeground
      : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.btn,
        {
          backgroundColor: bgColor,
          borderRadius: colors.radius,
          paddingVertical: small ? 8 : 14,
          opacity: disabled ? 0.5 : 1,
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: colors.primary,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && (
            <Feather
              name={icon}
              size={small ? 15 : 18}
              color={textColor}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              { color: textColor, fontSize: small ? 14 : 16 },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 8,
  },
  icon: {
    marginLeft: 4,
  },
  text: {
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
});
