import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBluetooth, BTPrinterDevice, PaperSize } from "@/hooks/useBluetooth";
import { useColors } from "@/hooks/useColors";

export function PrinterCard() {
  const colors = useColors();
  const {
    isNative,
    status,
    pairedDevices,
    savedPrinter,
    connectedPrinter,
    paperSize,
    setPaperSize,
    isConnected,
    scanDevices,
    connectPrinter,
    disconnectPrinter,
  } = useBluetooth();

  const [showDevices, setShowDevices] = useState(false);

  const isScanning    = status === "scanning";
  const isConnecting  = status === "connecting";
  const busy          = isScanning || isConnecting;

  const statusColor   = isConnected ? "#22c55e" : status === "error" ? "#ef4444" : "#f59e0b";
  const statusLabel   = isConnected
    ? `متصل: ${connectedPrinter?.name}`
    : savedPrinter
    ? `غير متصل (${savedPrinter.name})`
    : "لم يُحدَّد طابعة";

  const handleScan = async () => {
    setShowDevices(true);
    await scanDevices();
  };

  const handleConnect = async (device: BTPrinterDevice) => {
    await connectPrinter(device);
    setShowDevices(false);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* رأس البطاقة */}
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: "#1d6ae818" }]}>
          <Feather name="printer" size={22} color="#1d6ae8" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>إعدادات الطابعة</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusTxt, { color: colors.mutedForeground }]} numberOfLines={1}>
              {isNative ? statusLabel : "البلوتوث يعمل على الأجهزة فقط"}
            </Text>
          </View>
        </View>
      </View>

      {/* اختيار حجم الورق */}
      <View style={styles.paperRow}>
        <Text style={[styles.paperLabel, { color: colors.mutedForeground }]}>حجم الورق:</Text>
        <View style={[styles.toggle, { backgroundColor: colors.muted }]}>
          {(["58", "80"] as PaperSize[]).map((size) => (
            <TouchableOpacity
              key={size}
              onPress={() => setPaperSize(size)}
              style={[
                styles.toggleBtn,
                paperSize === size && { backgroundColor: "#1d6ae8" },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleTxt, { color: paperSize === size ? "#fff" : colors.mutedForeground }]}>
                {size} mm
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* أزرار التحكم */}
      {isNative && (
        <View style={styles.btnRow}>
          {/* بحث */}
          <TouchableOpacity
            onPress={handleScan}
            disabled={busy}
            style={[styles.btn, { backgroundColor: "#1d6ae8" + (busy ? "66" : "ff") }]}
            activeOpacity={0.8}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="search" size={16} color="#fff" />
            )}
            <Text style={styles.btnTxt}>{isScanning ? "جاري البحث..." : "بحث عن طابعة"}</Text>
          </TouchableOpacity>

          {/* قطع الاتصال */}
          {isConnected && (
            <TouchableOpacity
              onPress={disconnectPrinter}
              style={[styles.btn, { backgroundColor: "#ef444418", borderWidth: 1, borderColor: "#ef4444" }]}
              activeOpacity={0.8}
            >
              <Feather name="bluetooth-off" size={16} color="#ef4444" />
              <Text style={[styles.btnTxt, { color: "#ef4444" }]}>قطع الاتصال</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* قائمة الأجهزة */}
      {showDevices && pairedDevices.length > 0 && (
        <View style={[styles.deviceList, { borderTopColor: colors.border }]}>
          <Text style={[styles.deviceListTitle, { color: colors.mutedForeground }]}>
            اختر الطابعة للاتصال:
          </Text>
          {pairedDevices.map((device) => (
            <TouchableOpacity
              key={device.address}
              onPress={() => handleConnect(device)}
              disabled={isConnecting}
              style={[styles.deviceItem, { borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <View style={styles.deviceItemLeft}>
                {isConnecting ? (
                  <ActivityIndicator size="small" color="#1d6ae8" />
                ) : (
                  <Feather name="bluetooth" size={18} color="#1d6ae8" />
                )}
                <View>
                  <Text style={[styles.deviceName, { color: colors.foreground }]}>{device.name}</Text>
                  <Text style={[styles.deviceAddr, { color: colors.mutedForeground }]}>{device.address}</Text>
                </View>
              </View>
              <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* إذا لم توجد أجهزة بعد البحث */}
      {showDevices && !isScanning && pairedDevices.length === 0 && (
        <View style={[styles.emptyDevices, { borderTopColor: colors.border }]}>
          <Feather name="bluetooth-off" size={24} color={colors.mutedForeground} />
          <Text style={[styles.emptyTxt, { color: colors.mutedForeground }]}>
            لم يُعثر على أجهزة.{"\n"}
            اقترن الطابعة بالهاتف أولاً من إعدادات البلوتوث.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
    justifyContent: "flex-end",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    flexShrink: 1,
  },
  paperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  paperLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  toggle: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
  },
  toggleTxt: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 12,
  },
  btnTxt: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  deviceList: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 6,
  },
  deviceListTitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginBottom: 4,
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  deviceItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
  },
  deviceAddr: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },
  emptyDevices: {
    borderTopWidth: 1,
    alignItems: "center",
    gap: 8,
    padding: 16,
  },
  emptyTxt: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
