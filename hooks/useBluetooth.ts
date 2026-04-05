import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, PermissionsAndroid, Platform } from "react-native";

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

// طلب صلاحيات البلوتوث - مطلوبة على Android 6+
async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    if ((Platform.Version as number) >= 31) {
      // Android 12+ يتطلب BLUETOOTH_SCAN و BLUETOOTH_CONNECT
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      const scanOk = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
      const connectOk = results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
      return scanOk && connectOk;
    } else {
      // Android < 12 يتطلب الموقع للمسح
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "صلاحية الموقع",
          message: "يحتاج التطبيق صلاحية الموقع للبحث عن أجهزة البلوتوث.",
          buttonPositive: "سماح",
          buttonNegative: "رفض",
        }
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (_) {
    return false;
  }
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

  // مسح الأجهزة
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

    // 1. طلب الصلاحيات أولاً
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      setStatus("error");
      Alert.alert(
        "صلاحيات مرفوضة",
        "يحتاج التطبيق صلاحيات البلوتوث للبحث عن الطابعات.\nيرجى السماح من إعدادات التطبيق.",
        [{ text: "حسناً" }]
      );
      return;
    }

    try {
      // 2. فحص أو تفعيل البلوتوث
      let btOn = await checkBluetooth();
      if (!btOn) {
        // على Android 13+ لا يمكن تفعيل البلوتوث برمجياً - نطلب من المستخدم
        if ((Platform.Version as number) >= 33) {
          setStatus("error");
          Alert.alert(
            "البلوتوث معطّل",
            "يرجى تفعيل البلوتوث من إعدادات الهاتف ثم حاول مجدداً.",
            [{ text: "حسناً" }]
          );
          return;
        }
        try {
          await BluetoothManager.enableBluetooth();
          await new Promise((res) => setTimeout(res, 1500));
          btOn = await BluetoothManager.isBluetoothEnabled();
        } catch (_) {
          btOn = false;
        }
        if (!btOn) {
          setStatus("error");
          Alert.alert("البلوتوث معطّل", "يرجى تفعيل البلوتوث من إعدادات الهاتف.");
          return;
        }
      }

      // 3. البحث عن الأجهزة
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

      if (paired.length === 0) {
        Alert.alert(
          "لا توجد أجهزة",
          "لم يُعثر على طابعات. تأكد من:\n• أن الطابعة مشغّلة\n• أنها مقترنة بهاتفك من إعدادات البلوتوث",
          [{ text: "حسناً" }]
        );
      }

      setPairedDevices(paired);
      setStatus("idle");
    } catch (e: any) {
      setStatus("error");
      const msg = e?.message || String(e) || "";
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("security")) {
        Alert.alert(
          "خطأ في الصلاحيات",
          "يرجى السماح بصلاحيات البلوتوث من إعدادات التطبيق.",
          [{ text: "حسناً" }]
        );
      } else {
        Alert.alert("خطأ في البحث", msg || "تعذّر البحث عن الأجهزة.");
      }
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
    try { await BluetoothManager.disconnect(); } catch (_) {}
    setConnectedPrinter(null);
    connectedRef.current = false;
    setStatus("idle");
  }, [isNative]);

  // حفظ الطابعة
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

  // الاتصال التلقائي
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
