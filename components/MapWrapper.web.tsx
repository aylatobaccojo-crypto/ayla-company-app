import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function AppMapView({ children, style, ...props }: any) {
  const colors = useColors();
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.muted }, style]}>
      <Feather name="map" size={60} color={colors.mutedForeground} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        الخريطة متاحة على تطبيق الهاتف
      </Text>
    </View>
  );
}

export function AppMarker(props: any) {
  return null;
}

export function AppCallout(props: any) {
  return null;
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
