import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, PermissionsAndroid, Platform } from "react-native";

const BT_PRINTER_KEY = "cashvan_bt_printer_v1";
const BT_PAPER_KEY   = "cashvan_bt_paper_v1";

export interface BTPrinterDevice {
  name: string;
  address: string;
}

export type PrinterStatus = "idle" | "scanning" | "connecting" | "connected" | "printing" | "error";
export type PaperSize = "58" | "80";

let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;

if (Platform.OS !== "web") {
  try {
    const mod = require("react-native-bluetooth-escpos-printer");
    BluetoothManager = mod.BluetoothManager;
    BluetoothEscposPrinter = mod.BluetoothEscposPrinter;
  } catch (_) {}
}

// طلب صلاحيات البلوتوث — مطلوبة على Android 6+
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
  const [paperSize, setPaperSizeState] = useState<PaperSize>("80");
  const connectedRef = useRef(false);

  const isNative = Platform.OS === "android" && !!BluetoothManager;

  // تحميل الإعدادات المحفوظة عند البدء
  useEffect(() => {
    AsyncStorage.multiGet([BT_PRINTER_KEY, BT_PAPER_KEY]).then((pairs) => {
      for (const [key, val] of pairs) {
        if (!val) continue;
        if (key === BT_PRINTER_KEY) {
          try { setSavedPrinter(JSON.parse(val)); } catch (_) {}
        }
        if (key === BT_PAPER_KEY) {
          if (val === "58" || val === "80") setPaperSizeState(val);
        }
      }
    });
  }, []);

  // حفظ حجم الورق
  const setPaperSize = useCallback(async (size: PaperSize) => {
    setPaperSizeState(size);
    await AsyncStorage.setItem(BT_PAPER_KEY, size);
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
      // 2. فحص البلوتوث
      const btOn = await checkBluetooth();
      if (!btOn) {
        setStatus("error");
        Alert.alert(
          "البلوتوث معطّل",
          "يرجى تفعيل البلوتوث من إعدادات الهاتف ثم اضغط بحث مجدداً.",
          [{ text: "حسناً" }]
        );
        return;
      }

      // 3. البحث عن الأجهزة (الـ patch يعيد الأجهزة المقترنة حتى لو فشل الـ discovery)
      let result: any;
      try {
        result = await BluetoothManager.scanDevices();
      } catch (scanErr: any) {
        const msg = String(scanErr?.message || scanErr || "");
        setStatus("error");
        Alert.alert(
          "خطأ في البحث",
          msg || "تعذّر البحث، تأكد من تفعيل البلوتوث.",
          [{ text: "حسناً" }]
        );
        return;
      }
      const paired: BTPrinterDevice[] = [];

      if (result?.paired) {
        const list = typeof result.paired === "string" ? JSON.parse(result.paired) : result.paired;
        for (const d of list) {
          if (d.name && d.address) paired.push({ name: d.name, address: d.address });
        }
      }
      if (result?.found) {
        const list = typeof result.found === "string" ? JSON.parse(result.found) : result.found;
        for (const d of list) {
          if (d.name && d.address && !paired.find((p) => p.address === d.address))
            paired.push({ name: d.name, address: d.address });
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
        Alert.alert("خطأ في الصلاحيات", "يرجى السماح بصلاحيات البلوتوث من إعدادات التطبيق.", [{ text: "حسناً" }]);
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

  // طباعة فاتورة كصورة (الطريقة الموثوقة للعربية)
  const printAsImage = useCallback(async (base64png: string): Promise<boolean> => {
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
      // عرض الطباعة بالبكسل: 58mm=384, 80mm=576
      const printerWidth = paperSize === "58" ? 384 : 576;
      // تجريد بادئة data URL إن وجدت
      const base64 = base64png.startsWith("data:") ? base64png.split(",")[1] : base64png;
      await BluetoothEscposPrinter.printPic(base64, { width: printerWidth, left: 0 });
      // سطور فراغ لتحريك الورق بعد الطباعة
      await BluetoothEscposPrinter.printText("\n\n\n", {});
      setStatus("connected");
      return true;
    } catch (e: any) {
      setStatus("error");
      Alert.alert("خطأ في الطباعة", e?.message || "فشلت عملية الطباعة.");
      return false;
    }
  }, [isNative, connectedPrinter, paperSize]);

  // طباعة فاتورة ESC/POS نصية (احتياطي)
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
      const lineWidth = paperSize === "58" ? 32 : 48;
      for (const line of lines) {
        await BluetoothEscposPrinter.printerAlign(ALIGN[line.align || "right"]);
        const config: any = { fonttype: line.bold ? 1 : 0, encoding: "windows-1256", codepage: 28 };
        if (line.size === "large") { config.widthtimes = 1; config.heigthtimes = 1; }
        const txt = line.text.length > lineWidth ? line.text.substring(0, lineWidth) : line.text;
        await BluetoothEscposPrinter.printText(txt + "\n", config);
      }
      await BluetoothEscposPrinter.printText("\n\n\n", {});
      setStatus("connected");
      return true;
    } catch (e: any) {
      setStatus("error");
      Alert.alert("خطأ في الطباعة", e?.message || "فشلت عملية الطباعة.");
      return false;
    }
  }, [isNative, connectedPrinter, paperSize]);

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
    paperSize,
    setPaperSize,
    isConnected: !!connectedPrinter,
    checkBluetooth,
    scanDevices,
    connectPrinter,
    disconnectPrinter,
    savePrinter,
    printReceipt,
    printAsImage,
    autoConnect,
  };
}
