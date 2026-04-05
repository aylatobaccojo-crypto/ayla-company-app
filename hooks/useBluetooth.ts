import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

const BT_PRINTER_KEY = "cashvan_bt_printer_v1";

export interface BTPrinterDevice {
  name: string;
  address: string;
}

export type PrinterStatus = "idle" | "scanning" | "connecting" | "connected" | "printing" | "error";

let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;

if (Platform.OS !== "web") {
  try {
    const mod = require("react-native-bluetooth-escpos-printer");
    BluetoothManager = mod.BluetoothManager;
    BluetoothEscposPrinter = mod.BluetoothEscposPrinter;
  } catch (_) {}
}

export function useBluetooth() {
  const [status, setStatus] = useState<PrinterStatus>("idle");
  const [pairedDevices, setPairedDevices] = useState<BTPrinterDevice[]>([]);
  const [savedPrinter, setSavedPrinter] = useState<BTPrinterDevice | null>(null);
  const [connectedPrinter, setConnectedPrinter] = useState<BTPrinterDevice | null>(null);
  const [isBluetoothOn, setIsBluetoothOn] = useState(false);
  const connectedRef = useRef(false);

  const isNative = Platform.OS === "android" && !!BluetoothManager;

  // تحميل الطابعة المحفوظة عند البدء
  useEffect(() => {
    AsyncStorage.getItem(BT_PRINTER_KEY).then((val) => {
      if (val) {
        try { setSavedPrinter(JSON.parse(val)); } catch (_) {}
      }
    });
  }, []);

  // فحص حالة البلوتوث
  const checkBluetooth = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;
    try {
      const enabled = await BluetoothManager.isBluetoothEnabled();
      setIsBluetoothOn(!!enabled);
      return !!enabled;
    } catch (_) {
      return false;
    }
  }, [isNative]);

  // مسح الأجهزة المقترنة
  const scanDevices = useCallback(async () => {
    if (!isNative) {
      Alert.alert(
        "البلوتوث غير متاح",
        "الطباعة عبر البلوتوث تعمل على تطبيق الأندرويد المثبّت فقط.",
        [{ text: "حسناً" }]
      );
      return;
    }
    setStatus("scanning");
    try {
      const btOn = await checkBluetooth();
      if (!btOn) {
        await BluetoothManager.enableBluetooth();
        await new Promise((res) => setTimeout(res, 1000));
        const recheckOn = await BluetoothManager.isBluetoothEnabled();
        if (!recheckOn) {
          setStatus("error");
          Alert.alert("البلوتوث معطّل", "يرجى تفعيل البلوتوث من إعدادات الهاتف.");
          return;
        }
      }

      const result = await BluetoothManager.scanDevices();
      const paired: BTPrinterDevice[] = [];

      // الأجهزة المقترنة مسبقاً
      if (result?.paired) {
        const list = typeof result.paired === "string"
          ? JSON.parse(result.paired)
          : result.paired;
        for (const d of list) {
          if (d.name && d.address) {
            paired.push({ name: d.name, address: d.address });
          }
        }
      }
      // الأجهزة المكتشفة حديثاً
      if (result?.found) {
        const list = typeof result.found === "string"
          ? JSON.parse(result.found)
          : result.found;
        for (const d of list) {
          if (d.name && d.address && !paired.find((p) => p.address === d.address)) {
            paired.push({ name: d.name, address: d.address });
          }
        }
      }

      setPairedDevices(paired);
      setStatus("idle");
    } catch (e: any) {
      setStatus("error");
      Alert.alert("خطأ في البحث", e?.message || "تعذّر البحث عن الأجهزة.");
    }
  }, [isNative, checkBluetooth]);

  // الاتصال بطابعة
  const connectPrinter = useCallback(async (device: BTPrinterDevice): Promise<boolean> => {
    if (!isNative) return false;
    setStatus("connecting");
    try {
      await BluetoothManager.connect(device.address);
      setConnectedPrinter(device);
      setSavedPrinter(device);
      connectedRef.current = true;
      await AsyncStorage.setItem(BT_PRINTER_KEY, JSON.stringify(device));
      setStatus("connected");
      return true;
    } catch (e: any) {
      setStatus("error");
      Alert.alert(
        "فشل الاتصال",
        `تعذّر الاتصال بـ ${device.name}.\n${e?.message || ""}\n\nتأكد من:\n• أن الطابعة مشغّلة\n• أنها مقترنة بهاتفك من إعدادات البلوتوث`
      );
      return false;
    }
  }, [isNative]);

  // قطع الاتصال
  const disconnectPrinter = useCallback(async () => {
    if (!isNative) return;
    try {
      await BluetoothManager.disconnect();
    } catch (_) {}
    setConnectedPrinter(null);
    connectedRef.current = false;
    setStatus("idle");
  }, [isNative]);

  // حفظ الطابعة بدون اتصال (للتذكّر)
  const savePrinter = useCallback(async (device: BTPrinterDevice) => {
    setSavedPrinter(device);
    await AsyncStorage.setItem(BT_PRINTER_KEY, JSON.stringify(device));
  }, []);

  // طباعة فاتورة ESC/POS
  const printReceipt = useCallback(async (
    lines: Array<{ text: string; align?: "left" | "center" | "right"; bold?: boolean; size?: "normal" | "large" }>
  ): Promise<boolean> => {
    if (!isNative || !BluetoothEscposPrinter) {
      Alert.alert("غير متاح", "الطباعة تعمل على تطبيق الأندرويد فقط.");
      return false;
    }
    if (!connectedRef.current && !connectedPrinter) {
      Alert.alert("غير متصل", "يرجى الاتصال بالطابعة أولاً.");
      return false;
    }
    setStatus("printing");
    try {
      const ALIGN = { left: 0, center: 1, right: 2 };
      for (const line of lines) {
        await BluetoothEscposPrinter.printerAlign(ALIGN[line.align || "right"]);
        const config: any = { fonttype: line.bold ? 1 : 0 };
        if (line.size === "large") {
          config.widthtimes = 1;
          config.heigthtimes = 1;
        }
        await BluetoothEscposPrinter.printText(line.text + "\n", config);
      }
      await BluetoothEscposPrinter.printText("\n\n\n", {});
      setStatus("connected");
      return true;
    } catch (e: any) {
      setStatus("error");
      Alert.alert("خطأ في الطباعة", e?.message || "فشلت عملية الطباعة.");
      return false;
    }
  }, [isNative, connectedPrinter]);

  // الاتصال التلقائي بالطابعة المحفوظة
  const autoConnect = useCallback(async (): Promise<boolean> => {
    if (!isNative || !savedPrinter) return false;
    return connectPrinter(savedPrinter);
  }, [isNative, savedPrinter, connectPrinter]);

  return {
    isNative,
    isBluetoothOn,
    status,
    pairedDevices,
    savedPrinter,
    connectedPrinter,
    isConnected: !!connectedPrinter,
    checkBluetooth,
    scanDevices,
    connectPrinter,
    disconnectPrinter,
    savePrinter,
    printReceipt,
    autoConnect,
  };
}
