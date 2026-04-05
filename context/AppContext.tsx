import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type Role = "admin" | "driver";

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  vanId?: string;
  phone?: string;
}

export interface Van {
  id: string;
  name: string;
  driverId: string;
  driverName: string;
  plate: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  priceSpecial: number;
  priceLow: number;
  priceHigh: number;
  costPrice: number;
  stock: number;
  unit: string;
  category: string;
}

export interface PriceApprovalRequest {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  priceSpecial: number;
  vanId: string;
  driverName: string;
  customerId: string;
  customerName: string;
  status: "pending" | "approved" | "rejected";
  date: string;
  itemRef: string;
}

export interface VanInventoryItem {
  productId: string;
  quantity: number;
}

export interface CompanySettings {
  name: string;
  phone: string;
  taxNumber: string;
  address: string;
  syncKey?: string; // رمز المزامنة السحابية
  serverUrl?: string; // رابط سيرفر المزامنة
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  notes?: string;
}

export interface MessageReply {
  id: string;
  fromUserId: string;
  fromName: string;
  body: string;
  date: string;
}

export interface AppMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  toVanId: string; // "all" = جميع المندوبين
  subject: string;
  body: string;
  date: string;
  readBy: string[]; // مصفوفة معرّفات المستخدمين الذين قرأوها
  replies: MessageReply[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
  vanId?: string;
  balance: number;
  taxNumber?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  vanId: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  remaining: number;
  date: string;
  notes?: string;
  status?: "active" | "cancelled";
}

export interface Transfer {
  id: string;
  transferRef: string;
  vanId: string;
  vanName: string;
  items: { productId: string; productName: string; quantity: number }[];
  date: string;
  notes?: string;
}

export interface CashEntry {
  id: string;
  vanId: string;
  type: "collect" | "pay";
  amount: number;
  description: string;
  date: string;
  invoiceId?: string;
}

export interface Expense {
  id: string;
  vanId: string;
  category: "fuel" | "maintenance" | "other";
  amount: number;
  description: string;
  date: string;
}

export interface LocationUpdate {
  vanId: string;
  lat: number;
  lng: number;
  timestamp: string;
  driverName: string;
}

export interface SpecialPrice {
  id: string;
  productId: string;
  vanId?: string;
  customerId?: string;
  price: number;
  notes?: string;
}

export interface Purchase {
  id: string;
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
  supplier?: string;
  notes?: string;
}

export interface PurchaseInvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceRef: string;
  date: string;
  supplier?: string;
  notes?: string;
  items: PurchaseInvoiceItem[];
  totalCost: number;
  totalQuantity: number;
}

export interface InvoiceEditRequest {
  id: string;
  invoiceId: string;
  invoiceRef: string;
  vanId: string;
  driverName: string;
  customerName: string;
  type: "edit" | "cancel";
  reason: string;
  requestedChanges?: {
    paid?: number;
    discount?: number;
    notes?: string;
  };
  originalPaid: number;
  originalTotal: number;
  originalDiscount: number;
  status: "pending" | "approved" | "rejected";
  date: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface TripStop {
  lat: number;
  lng: number;
  arrivalTime: string;
  departureTime?: string;
  durationMinutes: number;
}

export interface DriverTrip {
  id: string;
  vanId: string;
  driverName: string;
  date: string;
  startTime: string;
  endTime?: string;
  points: RoutePoint[];
  distanceKm: number;
  stops: TripStop[];
  isActive: boolean;
}

export interface DailyCloseItem {
  productId: string;
  productName: string;
  closingQty: number;
  soldQty: number;
}

export interface DailyClose {
  id: string;
  vanId: string;
  vanName: string;
  driverName: string;
  openedAt: string;
  closedAt: string;
  inventory: DailyCloseItem[];
  cashToHandOver: number;
  totalSales: number;
  totalCollected: number;
  totalPaid: number;
  totalExpenses: number;
  invoiceCount: number;
  notes?: string;
}

export interface VanToVanTransferRequest {
  id: string;
  transferRef: string;
  fromVanId: string;
  fromVanName: string;
  fromDriverName: string;
  toVanId: string;
  toVanName: string;
  toDriverName: string;
  items: { productId: string; productName: string; quantity: number }[];
  notes?: string;
  status: "pending" | "approved" | "rejected";
  date: string;
  resolvedAt?: string;
}

export interface SavedReport {
  id: string;
  savedAt: string;
  period: string;
  totalSales: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  invoiceCount: number;
  vanStats: Array<{
    vanName: string;
    driverName: string;
    sales: number;
    expenses: number;
    profit: number;
    invoiceCount: number;
  }>;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  invoiceIds: string[];
  inventorySnapshot: Record<string, Array<{ productId: string; productName: string; quantity: number }>>;
}

interface AppState {
  currentUser: User | null;
  users: User[];
  vans: Van[];
  products: Product[];
  vanInventory: Record<string, VanInventoryItem[]>;
  customers: Customer[];
  invoices: Invoice[];
  transfers: Transfer[];
  cashEntries: CashEntry[];
  expenses: Expense[];
  driverLocations: LocationUpdate[];
  specialPrices: SpecialPrice[];
  priceApprovalRequests: PriceApprovalRequest[];
  purchases: Purchase[];
  purchaseInvoices: PurchaseInvoice[];
  dailyCloses: DailyClose[];
  dayOpenedAt: Record<string, string>;
  invoiceEditRequests: InvoiceEditRequest[];
  driverTrips: DriverTrip[];
  companySettings: CompanySettings;
  savedReports: SavedReport[];
  suppliers: Supplier[];
  vanTransferRequests: VanToVanTransferRequest[];
  messages: AppMessage[];
}

interface AppContextType extends AppState {
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, "id">) => void;
  updateUser: (id: string, updates: Partial<Omit<User, "id">>) => void;
  deleteUser: (id: string) => void;
  addProduct: (product: Omit<Product, "id">) => string;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addVan: (van: Omit<Van, "id">) => void;
  transferToVan: (
    vanId: string,
    items: { productId: string; quantity: number }[],
    notes?: string
  ) => boolean;
  addCustomer: (customer: Omit<Customer, "id" | "balance">) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;
  saveReport: (report: Omit<SavedReport, "id" | "savedAt">) => void;
  deleteReport: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, "id">) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  createInvoice: (invoice: Omit<Invoice, "id" | "date">) => string | null;
  updateInvoice: (id: string, updates: Partial<Omit<Invoice, "id" | "date" | "vanId">>) => void;
  addCashEntry: (entry: Omit<CashEntry, "id" | "date">) => void;
  addExpense: (expense: Omit<Expense, "id" | "date">) => void;
  updateDriverLocation: (update: Omit<LocationUpdate, "timestamp">) => void;
  addSpecialPrice: (sp: Omit<SpecialPrice, "id">) => void;
  removeSpecialPrice: (id: string) => void;
  getVanBalance: (vanId: string) => number;
  getProductPrice: (
    productId: string,
    quantity: number,
    vanId?: string,
    customerId?: string
  ) => number;
  addPurchase: (purchase: Omit<Purchase, "id" | "date">) => void;
  addPurchaseInvoice: (invoice: Omit<PurchaseInvoice, "id" | "date" | "invoiceRef">) => void;
  closeDailyInventory: (vanId: string, notes?: string) => DailyClose | null;
  requestPriceApproval: (req: Omit<PriceApprovalRequest, "id" | "date" | "status">) => string;
  approvePriceRequest: (id: string) => void;
  rejectPriceRequest: (id: string) => void;
  cancelPriceRequest: (id: string) => void;
  requestInvoiceEdit: (req: Omit<InvoiceEditRequest, "id" | "date" | "status">) => void;
  approveInvoiceEdit: (id: string) => void;
  rejectInvoiceEdit: (id: string) => void;
  requestVanTransfer: (req: Omit<VanToVanTransferRequest, "id" | "date" | "status" | "transferRef" | "fromVanName" | "fromDriverName" | "toVanName" | "toDriverName">) => void;
  approveVanTransfer: (id: string) => void;
  rejectVanTransfer: (id: string) => void;
  startTrip: (vanId: string, driverName: string) => void;
  endTrip: (vanId: string) => void;
  addRoutePoint: (vanId: string, lat: number, lng: number) => void;
  sendMessage: (msg: { toVanId: string; subject: string; body: string }) => void;
  replyToMessage: (messageId: string, body: string) => void;
  markMessageRead: (messageId: string) => void;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  loadFromServer: (syncKey: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

const INITIAL_USERS: User[] = [
  { id: "admin1", name: "المدير العام", username: "admin", password: "admin123", role: "admin" },
  { id: "driver1", name: "أحمد محمد", username: "ahmed", password: "1234", role: "driver", vanId: "van1", phone: "0501234567" },
  { id: "driver2", name: "محمد علي", username: "mohammed", password: "1234", role: "driver", vanId: "van2", phone: "0507654321" },
];

const INITIAL_VANS: Van[] = [
  { id: "van1", name: "فان 1", driverId: "driver1", driverName: "أحمد محمد", plate: "أ ب ج 1234" },
  { id: "van2", name: "فان 2", driverId: "driver2", driverName: "محمد علي", plate: "د هـ و 5678" },
];

const INITIAL_PRODUCTS: Product[] = [
  // Camel
  { id: "p1",  name: "كاميل لايت",           brand: "كاميل",     priceSpecial: 0, priceLow: 28.25, priceHigh: 28.47, costPrice: 28.25, stock: 0, unit: "علبة", category: "سجائر" },
  // LM
  { id: "p2",  name: "ال ام ابيض",            brand: "ال ام",     priceSpecial: 0, priceLow: 23.00, priceHigh: 23.05, costPrice: 22.95, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p3",  name: "ال ام احمر",            brand: "ال ام",     priceSpecial: 0, priceLow: 23.00, priceHigh: 23.05, costPrice: 22.95, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p4",  name: "ال ام سلفر",            brand: "ال ام",     priceSpecial: 0, priceLow: 23.00, priceHigh: 23.05, costPrice: 22.95, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p5",  name: "ال ام لوفت احمر",       brand: "ال ام",     priceSpecial: 0, priceLow: 20.58, priceHigh: 20.65, costPrice: 20.53, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p6",  name: "ال ام لوفت ازرق",       brand: "ال ام",     priceSpecial: 0, priceLow: 20.58, priceHigh: 20.65, costPrice: 20.53, stock: 0, unit: "علبة", category: "سجائر" },
  // LD
  { id: "p7",  name: "ال دي ابيض",            brand: "ال دي",     priceSpecial: 0, priceLow: 20.56, priceHigh: 20.65, costPrice: 20.53, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p8",  name: "ال دي احمر",            brand: "ال دي",     priceSpecial: 0, priceLow: 20.56, priceHigh: 20.65, costPrice: 20.53, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p9",  name: "ال دي سلفر",            brand: "ال دي",     priceSpecial: 0, priceLow: 20.56, priceHigh: 20.65, costPrice: 20.53, stock: 0, unit: "علبة", category: "سجائر" },
  // Elegance
  { id: "p10", name: "اليجانس اخضر",          brand: "اليجانس",   priceSpecial: 0, priceLow: 18.35, priceHigh: 18.15, costPrice: 18.04, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p11", name: "اليجانس ازرق",          brand: "اليجانس",   priceSpecial: 0, priceLow: 18.05, priceHigh: 18.15, costPrice: 18.04, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p12", name: "اليجانس سلفر",          brand: "اليجانس",   priceSpecial: 0, priceLow: 18.05, priceHigh: 18.15, costPrice: 18.04, stock: 0, unit: "علبة", category: "سجائر" },
  // Anderson
  { id: "p13", name: "اندرسون احمر",          brand: "اندرسون",   priceSpecial: 0, priceLow: 18.05, priceHigh: 18.29, costPrice: 18.05, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p14", name: "اندرسون ازرق",          brand: "اندرسون",   priceSpecial: 0, priceLow: 18.05, priceHigh: 18.29, costPrice: 18.05, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p15", name: "اندرسون ازرق طويل",     brand: "اندرسون",   priceSpecial: 0, priceLow: 19.70, priceHigh: 19.80, costPrice: 19.59, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p16", name: "اندرسون سلفر",          brand: "اندرسون",   priceSpecial: 0, priceLow: 18.05, priceHigh: 18.50, costPrice: 18.05, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p17", name: "اندرسون سلفر طويل",     brand: "اندرسون",   priceSpecial: 0, priceLow: 19.70, priceHigh: 19.80, costPrice: 19.60, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p18", name: "اندرسون طويل احمر",     brand: "اندرسون",   priceSpecial: 0, priceLow: 19.70, priceHigh: 19.80, costPrice: 19.59, stock: 0, unit: "علبة", category: "سجائر" },
  // Parliament
  { id: "p19", name: "بارلمنت اكوا",          brand: "بارلمنت",   priceSpecial: 0, priceLow: 25.38, priceHigh: 25.50, costPrice: 25.33, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p20", name: "بارلمنت نايت",          brand: "بارلمنت",   priceSpecial: 0, priceLow: 25.38, priceHigh: 25.50, costPrice: 25.33, stock: 0, unit: "علبة", category: "سجائر" },
  // Tira
  { id: "p21", name: "تيرا امير",             brand: "تيرا",      priceSpecial: 0, priceLow: 21.95, priceHigh: 22.00, costPrice: 21.75, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p22", name: "تيرا برونز",            brand: "تيرا",      priceSpecial: 0, priceLow: 22.00, priceHigh: 21.95, costPrice: 21.75, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p23", name: "تيرا بيرل",             brand: "تيرا",      priceSpecial: 0, priceLow: 22.25, priceHigh: 22.05, costPrice: 21.75, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p24", name: "تيرا تيك",              brand: "تيرا",      priceSpecial: 0, priceLow: 22.25, priceHigh: 22.05, costPrice: 21.75, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p25", name: "تيرا سلفر",             brand: "تيرا",      priceSpecial: 0, priceLow: 22.30, priceHigh: 22.05, costPrice: 21.75, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p26", name: "تيرا سينا",             brand: "تيرا",      priceSpecial: 0, priceLow: 21.95, priceHigh: 22.00, costPrice: 21.75, stock: 0, unit: "علبة", category: "سجائر" },
  // أخرى
  { id: "p27", name: "ج",                      brand: "أخرى",      priceSpecial: 0, priceLow: 3.00,  priceHigh: 3.00,  costPrice: 1.90,  stock: 0, unit: "قطعة", category: "أخرى" },
  // Gloze
  { id: "p28", name: "جلواز اصفر",            brand: "جلواز",     priceSpecial: 0, priceLow: 20.55, priceHigh: 20.70, costPrice: 20.50, stock: 0, unit: "علبة", category: "سجائر" },
  // Dove
  { id: "p29", name: "دوف احمر+ابيض",         brand: "دوف",       priceSpecial: 0, priceLow: 23.50, priceHigh: 23.70, costPrice: 23.45, stock: 0, unit: "علبة", category: "سجائر" },
  // Delia
  { id: "p30", name: "ديليا فولد",            brand: "ديليا",     priceSpecial: 0, priceLow: 19.80, priceHigh: 19.80, costPrice: 19.50, stock: 0, unit: "علبة", category: "سجائر" },
  // أخرى
  { id: "p31", name: "ززز",                   brand: "أخرى",      priceSpecial: 0, priceLow: 1487,  priceHigh: 1487,  costPrice: 1487,  stock: 0, unit: "قطعة", category: "أخرى" },
  // Siraj Charcoal
  { id: "p32", name: "فحم سراج",              brand: "سراج",      priceSpecial: 0, priceLow: 15.00, priceHigh: 15.00, costPrice: 13.00, stock: 0, unit: "قطعة", category: "أخرى" },
  // Philip
  { id: "p33", name: "فيلب ابيض",             brand: "فيلب",      priceSpecial: 0, priceLow: 20.80, priceHigh: 20.75, costPrice: 19.75, stock: 0, unit: "علبة", category: "سجائر" },
  // Lighters
  { id: "p34", name: "قداحات جني",            brand: "جني",       priceSpecial: 0, priceLow: 2.25,  priceHigh: 2.25,  costPrice: 2.25,  stock: 0, unit: "قطعة", category: "أخرى" },
  // Kent
  { id: "p35", name: "كنت ادفانس",            brand: "كنت",       priceSpecial: 0, priceLow: 25.18, priceHigh: 25.40, costPrice: 25.10, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p36", name: "كنت ادفانس سلفر",       brand: "كنت",       priceSpecial: 0, priceLow: 25.18, priceHigh: 25.40, costPrice: 25.10, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p37", name: "كنت ازرق",              brand: "كنت",       priceSpecial: 0, priceLow: 24.18, priceHigh: 24.40, costPrice: 24.10, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p38", name: "كنت سلفر",              brand: "كنت",       priceSpecial: 0, priceLow: 24.18, priceHigh: 24.40, costPrice: 24.10, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p39", name: "كنت كيبسه",             brand: "كنت",       priceSpecial: 0, priceLow: 28.18, priceHigh: 28.40, costPrice: 28.10, stock: 0, unit: "علبة", category: "سجائر" },
  // Coast
  { id: "p40", name: "كوست ابيض",             brand: "كوست",      priceSpecial: 0, priceLow: 23.45, priceHigh: 23.60, costPrice: 23.43, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p41", name: "كوست ابيض 100s",        brand: "كوست",      priceSpecial: 0, priceLow: 23.45, priceHigh: 23.60, costPrice: 23.43, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p42", name: "كوست احمر",             brand: "كوست",      priceSpecial: 0, priceLow: 23.45, priceHigh: 23.60, costPrice: 23.43, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p43", name: "كوست احمر 100s",        brand: "كوست",      priceSpecial: 0, priceLow: 23.45, priceHigh: 23.60, costPrice: 23.43, stock: 0, unit: "علبة", category: "سجائر" },
  // Marlboro
  { id: "p44", name: "مالبورو ابيض",          brand: "مالبورو",   priceSpecial: 0, priceLow: 27.75, priceHigh: 27.90, costPrice: 27.70, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p45", name: "مالبورو احمر",          brand: "مالبورو",   priceSpecial: 0, priceLow: 27.75, priceHigh: 27.90, costPrice: 27.70, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p46", name: "مالبورو تنش",           brand: "مالبورو",   priceSpecial: 0, priceLow: 25.30, priceHigh: 25.40, costPrice: 25.24, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p47", name: "مالبورو ديل مكس",       brand: "مالبورو",   priceSpecial: 0, priceLow: 27.75, priceHigh: 27.90, costPrice: 27.70, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p48", name: "مالبورو سلفر",          brand: "مالبورو",   priceSpecial: 0, priceLow: 27.75, priceHigh: 27.90, costPrice: 27.70, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p49", name: "مالبورو كرافتد",        brand: "مالبورو",   priceSpecial: 0, priceLow: 25.35, priceHigh: 25.50, costPrice: 25.25, stock: 0, unit: "علبة", category: "سجائر" },
  // أخرى - Abu Rashed
  { id: "p50", name: "معجون ابو راشد",        brand: "ابو راشد",  priceSpecial: 0, priceLow: 0.75,  priceHigh: 0.75,  costPrice: 0.75,  stock: 0, unit: "قطعة", category: "أخرى" },
  { id: "p51", name: "معمول ابو راشد",        brand: "ابو راشد",  priceSpecial: 0, priceLow: 0.50,  priceHigh: 0.50,  costPrice: 0.00,  stock: 0, unit: "قطعة", category: "أخرى" },
  { id: "p52", name: "ممسوح",                 brand: "أخرى",      priceSpecial: 0, priceLow: 9.50,  priceHigh: 9.50,  costPrice: 8.00,  stock: 0, unit: "قطعة", category: "أخرى" },
  { id: "p53", name: "مي ابو راشد",           brand: "ابو راشد",  priceSpecial: 0, priceLow: 0.50,  priceHigh: 0.50,  costPrice: 0.00,  stock: 0, unit: "قطعة", category: "أخرى" },
  { id: "p54", name: "مي ابو راشد بيبي",      brand: "ابو راشد",  priceSpecial: 0, priceLow: 0.50,  priceHigh: 0.50,  costPrice: 0.25,  stock: 0, unit: "قطعة", category: "أخرى" },
  // Winston
  { id: "p55", name: "ونستون 100s",           brand: "ونستون",    priceSpecial: 0, priceLow: 25.33, priceHigh: 25.50, costPrice: 25.30, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p56", name: "ونستون ابيض",           brand: "ونستون",    priceSpecial: 0, priceLow: 25.33, priceHigh: 25.50, costPrice: 25.30, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p57", name: "ونستون احمر",           brand: "ونستون",    priceSpecial: 0, priceLow: 25.33, priceHigh: 25.50, costPrice: 25.30, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p58", name: "ونستون بيرل مكس",       brand: "ونستون",    priceSpecial: 0, priceLow: 24.38, priceHigh: 24.50, costPrice: 24.34, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p59", name: "ونستون سلفر",           brand: "ونستون",    priceSpecial: 0, priceLow: 25.33, priceHigh: 25.50, costPrice: 25.30, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p60", name: "ونستون كيبسه",          brand: "ونستون",    priceSpecial: 0, priceLow: 25.33, priceHigh: 25.50, costPrice: 25.30, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p61", name: "ونستون كومباكت ازرق",   brand: "ونستون",    priceSpecial: 0, priceLow: 24.38, priceHigh: 24.50, costPrice: 24.34, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p62", name: "ونستون كومباكت سلفر",   brand: "ونستون",    priceSpecial: 0, priceLow: 24.80, priceHigh: 24.60, costPrice: 24.38, stock: 0, unit: "علبة", category: "سجائر" },
  { id: "p63", name: "ونستون ون",             brand: "ونستون",    priceSpecial: 0, priceLow: 25.33, priceHigh: 25.50, costPrice: 25.30, stock: 0, unit: "علبة", category: "سجائر" },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: "c1", name: "بقالة الأمل", phone: "0551234567", address: "حي الروضة، شارع الملك فهد", lat: 24.6877, lng: 46.7219, vanId: "van1", balance: 0 },
  { id: "c2", name: "سوبرماركت النور", phone: "0559876543", address: "حي العليا، شارع العليا", lat: 24.6917, lng: 46.6892, vanId: "van1", balance: 250 },
  { id: "c3", name: "محل الفرحان", phone: "0554455667", address: "حي الشميسي", lat: 24.6345, lng: 46.7123, vanId: "van2", balance: 0 },
];

const STORAGE_KEY = "cashvan_data_v4";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: INITIAL_USERS,
    vans: INITIAL_VANS,
    products: INITIAL_PRODUCTS,
    vanInventory: {
      main: INITIAL_PRODUCTS.map((p) => ({ productId: p.id, quantity: 0 })),
      van1: [],
      van2: [],
    },
    customers: [],
    invoices: [],
    transfers: [],
    cashEntries: [],
    expenses: [],
    driverLocations: [],
    specialPrices: [],
    priceApprovalRequests: [],
    purchases: [],
    purchaseInvoices: [],
    dailyCloses: [],
    dayOpenedAt: {},
    invoiceEditRequests: [],
    driverTrips: [],
    companySettings: {
      name: "Ayla Company",
      phone: "0781272009",
      taxNumber: "",
      address: "الأردن",
    },
    savedReports: [],
    suppliers: [],
    vanTransferRequests: [],
    messages: [],
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setState((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    });
  }, []);

  // ─── حالة المزامنة السحابية ───
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedAtRef = useRef<number>(0);
  const isSyncingRef = useRef(false);

  const getApiBase = (serverUrl?: string) => {
    // أولاً: استخدم الرابط المدخل في إعدادات الشركة
    const customUrl = serverUrl?.trim() || state.companySettings?.serverUrl?.trim();
    if (customUrl) {
      return customUrl.replace(/\/$/, ""); // بدون / في النهاية
    }
    // ثانياً: استخدم متغير البيئة (للتطوير فقط)
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    if (!domain) return null;
    return `https://${domain}/api`;
  };

  const syncToServer = useCallback(async (stateToSync: AppState) => {
    const syncKey = stateToSync.companySettings?.syncKey?.trim();
    const apiBase = getApiBase();
    if (!syncKey || !apiBase || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus("syncing");
    try {
      const { currentUser, ...toSave } = stateToSync;
      const res = await fetch(`${apiBase}/sync/${encodeURIComponent(syncKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: toSave, clientUpdatedAt: lastSyncedAtRef.current }),
      });
      if (!res.ok) throw new Error("sync failed");
      const data = await res.json() as { conflict?: boolean; state?: object; updatedAt?: number; success?: boolean };
      if (data.conflict && data.state) {
        // السيرفر أحدث — دمج البيانات
        setState((prev) => ({ ...prev, ...(data.state as Partial<AppState>), currentUser: prev.currentUser }));
        if (data.updatedAt) lastSyncedAtRef.current = data.updatedAt;
      } else if (data.success && data.updatedAt) {
        lastSyncedAtRef.current = data.updatedAt;
      }
      setSyncStatus("synced");
    } catch {
      setSyncStatus("error");
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const loadFromServer = useCallback(async (syncKey: string) => {
    const apiBase = getApiBase();
    if (!syncKey.trim() || !apiBase) return;
    setSyncStatus("syncing");
    try {
      const res = await fetch(`${apiBase}/sync/${encodeURIComponent(syncKey.trim())}`);
      if (!res.ok) throw new Error("load failed");
      const data = await res.json() as { found?: boolean; state?: object; updatedAt?: number };
      if (data.found && data.state) {
        setState((prev) => ({ ...prev, ...(data.state as Partial<AppState>), currentUser: prev.currentUser }));
        if (data.updatedAt) lastSyncedAtRef.current = data.updatedAt;
        // حفظ محلي أيضاً
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data.state));
        setSyncStatus("synced");
      } else {
        setSyncStatus("idle");
      }
    } catch {
      setSyncStatus("error");
    }
  }, []);

  // جلب البيانات عند بدء التطبيق إذا كان رمز المزامنة مضبوطاً
  useEffect(() => {
    const syncKey = state.companySettings?.syncKey?.trim();
    if (syncKey) {
      loadFromServer(syncKey);
    }
  }, []); // eslint-disable-line

  // استطلاع دوري كل 5 ثوانٍ لجلب أحدث البيانات تلقائياً
  useEffect(() => {
    const interval = setInterval(() => {
      const syncKey = state.companySettings?.syncKey?.trim();
      if (syncKey) {
        loadFromServer(syncKey);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [state.companySettings?.syncKey, loadFromServer]);

  const saveState = useCallback((newState: AppState) => {
    const { currentUser, ...toSave } = newState;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    // مزامنة سحابية مؤجلة ثانية واحدة بعد آخر تغيير
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => syncToServer(newState), 1000);
  }, [syncToServer]);

  const updateState = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setState((prev) => {
        const next = updater(prev);
        saveState(next);
        return next;
      });
    },
    [saveState]
  );

  const login = useCallback(
    (username: string, password: string): boolean => {
      const user = state.users.find(
        (u) => u.username === username.trim() && u.password === password
      );
      if (user) {
        setState((p) => ({ ...p, currentUser: user }));
        return true;
      }
      return false;
    },
    [state.users]
  );

  const logout = useCallback(() => {
    setState((p) => ({ ...p, currentUser: null }));
  }, []);

  const addUser = useCallback(
    (user: Omit<User, "id">) => {
      const newUser = { ...user, id: generateId() };
      updateState((prev) => ({ ...prev, users: [...prev.users, newUser] }));
    },
    [updateState]
  );

  const updateUser = useCallback(
    (id: string, updates: Partial<Omit<User, "id">>) => {
      updateState((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
      }));
    },
    [updateState]
  );

  const deleteUser = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== id),
      }));
    },
    [updateState]
  );

  const addProduct = useCallback(
    (product: Omit<Product, "id">): string => {
      const newProduct = { ...product, id: generateId() };
      updateState((prev) => ({
        ...prev,
        products: [...prev.products, newProduct],
        vanInventory: {
          ...prev.vanInventory,
          main: [...(prev.vanInventory.main || []), { productId: newProduct.id, quantity: product.stock }],
        },
      }));
      return newProduct.id;
    },
    [updateState]
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<Product>) => {
      updateState((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }));
    },
    [updateState]
  );

  const addVan = useCallback(
    (van: Omit<Van, "id">) => {
      const newVan = { ...van, id: generateId() };
      updateState((prev) => ({
        ...prev,
        vans: [...prev.vans, newVan],
        vanInventory: { ...prev.vanInventory, [newVan.id]: [] },
      }));
    },
    [updateState]
  );

  const transferToVan = useCallback(
    (vanId: string, items: { productId: string; quantity: number }[], notes?: string): boolean => {
      let canTransfer = true;
      const mainInventory = state.vanInventory.main || [];
      for (const item of items) {
        const mainItem = mainInventory.find((m) => m.productId === item.productId);
        if (!mainItem || mainItem.quantity < item.quantity) {
          canTransfer = false;
          break;
        }
      }
      if (!canTransfer) return false;

      const products = state.products;
      const transferItems = items.map((item) => ({
        productId: item.productId,
        productName: products.find((p) => p.id === item.productId)?.name || "",
        quantity: item.quantity,
      }));

      updateState((prev) => {
        const count = prev.transfers.length + 1;
        const year = new Date().getFullYear();
        const transferRef = `ت-${year}-${String(count).padStart(3, "0")}`;
        const transfer: Transfer = {
          id: generateId(),
          transferRef,
          vanId,
          vanName: state.vans.find((v) => v.id === vanId)?.name || vanId,
          items: transferItems,
          date: new Date().toISOString(),
          notes,
        };
        const newMain = (prev.vanInventory.main || []).map((m) => {
          const item = items.find((i) => i.productId === m.productId);
          return item ? { ...m, quantity: m.quantity - item.quantity } : { ...m };
        });
        const prevVanInv = prev.vanInventory[vanId] || [];
        // تحديث الأصناف الموجودة (نسخ جديدة — بدون mutation)
        const newVanInv = prevVanInv.map((vi) => {
          const item = items.find((i) => i.productId === vi.productId);
          return item ? { ...vi, quantity: vi.quantity + item.quantity } : { ...vi };
        });
        // إضافة أصناف جديدة غير موجودة في الفان
        for (const item of items) {
          if (!prevVanInv.find((vi) => vi.productId === item.productId)) {
            newVanInv.push({ productId: item.productId, quantity: item.quantity });
          }
        }
        return {
          ...prev,
          vanInventory: { ...prev.vanInventory, main: newMain, [vanId]: newVanInv },
          transfers: [...prev.transfers, transfer],
        };
      });
      return true;
    },
    [state, updateState]
  );

  const addCustomer = useCallback(
    (customer: Omit<Customer, "id" | "balance">) => {
      updateState((prev) => ({
        ...prev,
        customers: [...prev.customers, { ...customer, id: generateId(), balance: 0 }],
      }));
    },
    [updateState]
  );

  const updateCustomer = useCallback(
    (id: string, updates: Partial<Customer>) => {
      updateState((prev) => ({
        ...prev,
        customers: prev.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }));
    },
    [updateState]
  );

  const updateCompanySettings = useCallback(
    (settings: Partial<CompanySettings>) => {
      updateState((prev) => ({
        ...prev,
        companySettings: { ...prev.companySettings, ...settings },
      }));
    },
    [updateState]
  );

  const saveReport = useCallback(
    (report: Omit<SavedReport, "id" | "savedAt">) => {
      updateState((prev) => ({
        ...prev,
        savedReports: [
          { ...report, id: generateId(), savedAt: new Date().toISOString() },
          ...(prev.savedReports || []),
        ],
      }));
    },
    [updateState]
  );

  const deleteReport = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        savedReports: (prev.savedReports || []).filter((r) => r.id !== id),
      }));
    },
    [updateState]
  );

  const addSupplier = useCallback(
    (supplier: Omit<Supplier, "id">) => {
      updateState((prev) => ({
        ...prev,
        suppliers: [...(prev.suppliers || []), { ...supplier, id: generateId() }],
      }));
    },
    [updateState]
  );

  const updateSupplier = useCallback(
    (id: string, updates: Partial<Supplier>) => {
      updateState((prev) => ({
        ...prev,
        suppliers: (prev.suppliers || []).map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }));
    },
    [updateState]
  );

  const deleteSupplier = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        suppliers: (prev.suppliers || []).filter((s) => s.id !== id),
      }));
    },
    [updateState]
  );

  const getProductPrice = useCallback(
    (productId: string, quantity: number, vanId?: string, customerId?: string): number => {
      const specialPrices = state.specialPrices;
      const product = state.products.find((p) => p.id === productId);
      if (!product) return 0;

      if (customerId) {
        const sp = specialPrices.find((s) => s.productId === productId && s.customerId === customerId);
        if (sp) return sp.price;
      }
      if (vanId) {
        const sp = specialPrices.find((s) => s.productId === productId && s.vanId === vanId && !s.customerId);
        if (sp) return sp.price;
      }

      return quantity >= 50 ? product.priceHigh : product.priceLow;
    },
    [state.specialPrices, state.products]
  );

  const createInvoice = useCallback(
    (invoice: Omit<Invoice, "id" | "date">): string | null => {
      const vanInv = state.vanInventory[invoice.vanId] || [];
      for (const item of invoice.items) {
        const stock = vanInv.find((vi) => vi.productId === item.productId);
        if (!stock || stock.quantity < item.quantity) return null;
      }

      const newInvoice: Invoice = { ...invoice, id: generateId(), date: new Date().toISOString() };

      updateState((prev) => {
        const updatedVanInv = (prev.vanInventory[invoice.vanId] || []).map((vi) => {
          const invoiceItem = invoice.items.find((i) => i.productId === vi.productId);
          return invoiceItem ? { ...vi, quantity: vi.quantity - invoiceItem.quantity } : vi;
        });

        const cashEntry: CashEntry = {
          id: generateId(),
          vanId: invoice.vanId,
          type: "collect",
          amount: invoice.paid,
          description: `فاتورة #${newInvoice.id.slice(-6)} - ${invoice.customerName}`,
          date: new Date().toISOString(),
          invoiceId: newInvoice.id,
        };

        const updatedCustomers = invoice.remaining > 0
          ? prev.customers.map((c) =>
              c.id === invoice.customerId
                ? { ...c, balance: c.balance + invoice.remaining }
                : c
            )
          : prev.customers;

        return {
          ...prev,
          vanInventory: { ...prev.vanInventory, [invoice.vanId]: updatedVanInv },
          invoices: [...prev.invoices, newInvoice],
          cashEntries: invoice.paid > 0 ? [...prev.cashEntries, cashEntry] : prev.cashEntries,
          customers: updatedCustomers,
        };
      });
      return newInvoice.id;
    },
    [state, updateState]
  );

  const updateInvoice = useCallback(
    (id: string, updates: Partial<Omit<Invoice, "id" | "date" | "vanId">>) => {
      updateState((prev) => ({
        ...prev,
        invoices: prev.invoices.map((inv) =>
          inv.id === id ? { ...inv, ...updates } : inv
        ),
      }));
    },
    [updateState]
  );

  const addCashEntry = useCallback(
    (entry: Omit<CashEntry, "id" | "date">) => {
      updateState((prev) => ({
        ...prev,
        cashEntries: [...prev.cashEntries, { ...entry, id: generateId(), date: new Date().toISOString() }],
      }));
    },
    [updateState]
  );

  const addExpense = useCallback(
    (expense: Omit<Expense, "id" | "date">) => {
      updateState((prev) => ({
        ...prev,
        expenses: [...prev.expenses, { ...expense, id: generateId(), date: new Date().toISOString() }],
      }));
    },
    [updateState]
  );

  const addPurchase = useCallback(
    (purchase: Omit<Purchase, "id" | "date">) => {
      const newPurchase: Purchase = { ...purchase, id: generateId(), date: new Date().toISOString() };
      updateState((prev) => {
        const mainInv = prev.vanInventory.main || [];
        const updatedMain = mainInv.map((vi) =>
          vi.productId === purchase.productId
            ? { ...vi, quantity: vi.quantity + purchase.quantity }
            : vi
        );
        const exists = mainInv.some((vi) => vi.productId === purchase.productId);
        if (!exists) updatedMain.push({ productId: purchase.productId, quantity: purchase.quantity });
        return {
          ...prev,
          vanInventory: { ...prev.vanInventory, main: updatedMain },
          purchases: [...(prev.purchases || []), newPurchase],
        };
      });
    },
    [updateState]
  );

  const addPurchaseInvoice = useCallback(
    (invoice: Omit<PurchaseInvoice, "id" | "date" | "invoiceRef">) => {
      updateState((prev) => {
        const count = (prev.purchaseInvoices || []).length + 1;
        const year = new Date().getFullYear();
        const invoiceRef = `ش-${year}-${String(count).padStart(3, "0")}`;
        const newInvoice: PurchaseInvoice = {
          ...invoice,
          id: generateId(),
          invoiceRef,
          date: new Date().toISOString(),
        };
        // تحديث المستودع الرئيسي لكل صنف
        let mainInv = [...(prev.vanInventory.main || [])];
        for (const item of invoice.items) {
          const idx = mainInv.findIndex((vi) => vi.productId === item.productId);
          if (idx !== -1) {
            mainInv = mainInv.map((vi, i) =>
              i === idx ? { ...vi, quantity: vi.quantity + item.quantity } : { ...vi }
            );
          } else {
            mainInv = [...mainInv, { productId: item.productId, quantity: item.quantity }];
          }
        }
        return {
          ...prev,
          vanInventory: { ...prev.vanInventory, main: mainInv },
          purchaseInvoices: [...(prev.purchaseInvoices || []), newInvoice],
        };
      });
    },
    [updateState]
  );

  const closeDailyInventory = useCallback(
    (vanId: string, notes?: string): DailyClose | null => {
      let result: DailyClose | null = null;
      updateState((prev) => {
        const van = prev.vans.find((v) => v.id === vanId);
        if (!van) return prev;

        const now = new Date().toISOString();
        const openedAt = prev.dayOpenedAt[vanId] || prev.invoices
          .filter((i) => i.vanId === vanId)
          .sort((a, b) => a.date.localeCompare(b.date))[0]?.date
          || now;

        const dayInvoices = prev.invoices.filter(
          (i) => i.vanId === vanId && i.date >= openedAt
        );
        const dayCashEntries = prev.cashEntries.filter(
          (e) => e.vanId === vanId && e.date >= openedAt
        );
        const dayExpenses = prev.expenses.filter(
          (e) => e.vanId === vanId && e.date >= openedAt
        );

        const totalSales = dayInvoices.reduce((s, i) => s + i.total, 0);
        const totalCollected = dayCashEntries
          .filter((e) => e.type === "collect")
          .reduce((s, e) => s + e.amount, 0);
        const totalPaid = dayCashEntries
          .filter((e) => e.type === "pay")
          .reduce((s, e) => s + e.amount, 0);
        const totalExpenses = dayExpenses.reduce((s, e) => s + e.amount, 0);
        const cashToHandOver = totalCollected - totalPaid;

        const vanInv = prev.vanInventory[vanId] || [];
        const inventory: DailyCloseItem[] = vanInv.map((vi) => {
          const product = prev.products.find((p) => p.id === vi.productId);
          const soldQty = dayInvoices.reduce((s, inv) => {
            const item = inv.items.find((it) => it.productId === vi.productId);
            return s + (item?.quantity || 0);
          }, 0);
          return {
            productId: vi.productId,
            productName: product?.name || vi.productId,
            closingQty: vi.quantity,
            soldQty,
          };
        }).filter((i) => i.closingQty > 0 || i.soldQty > 0);

        const dailyClose: DailyClose = {
          id: generateId(),
          vanId,
          vanName: van.name,
          driverName: van.driverName,
          openedAt,
          closedAt: now,
          inventory,
          cashToHandOver,
          totalSales,
          totalCollected,
          totalPaid,
          totalExpenses,
          invoiceCount: dayInvoices.length,
          notes,
        };

        result = dailyClose;

        // ─── ترحيل المخزون المتبقي للمستودع الرئيسي تلقائياً ───
        const mainInv = [...(prev.vanInventory["main"] || [])];
        const updatedVanInv = (prev.vanInventory[vanId] || []).map((vi) => {
          if (vi.quantity <= 0) return vi;
          // أضف الكمية المتبقية للمستودع الرئيسي
          const mainIdx = mainInv.findIndex((m) => m.productId === vi.productId);
          if (mainIdx >= 0) {
            mainInv[mainIdx] = { ...mainInv[mainIdx], quantity: mainInv[mainIdx].quantity + vi.quantity };
          } else {
            mainInv.push({ productId: vi.productId, quantity: vi.quantity });
          }
          // أصفر الكمية في فان المندوب
          return { ...vi, quantity: 0 };
        });

        return {
          ...prev,
          dailyCloses: [...(prev.dailyCloses || []), dailyClose],
          dayOpenedAt: { ...prev.dayOpenedAt, [vanId]: now },
          vanInventory: {
            ...prev.vanInventory,
            [vanId]: updatedVanInv,
            main: mainInv,
          },
        };
      });
      return result;
    },
    [updateState]
  );

  const updateDriverLocation = useCallback(
    (update: Omit<LocationUpdate, "timestamp">) => {
      updateState((prev) => ({
        ...prev,
        driverLocations: [
          ...prev.driverLocations.filter((l) => l.vanId !== update.vanId),
          { ...update, timestamp: new Date().toISOString() },
        ],
      }));
    },
    [updateState]
  );

  // ── حساب المسافة بصيغة هافيرسين (كم) ──
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const startTrip = useCallback(
    (vanId: string, driverName: string) => {
      const now = new Date().toISOString();
      const newTrip: DriverTrip = {
        id: generateId(),
        vanId,
        driverName,
        date: now.split("T")[0],
        startTime: now,
        points: [],
        distanceKm: 0,
        stops: [],
        isActive: true,
      };
      updateState((prev) => ({
        ...prev,
        driverTrips: [
          ...prev.driverTrips.map((t) => t.vanId === vanId && t.isActive ? { ...t, isActive: false, endTime: now } : t),
          newTrip,
        ],
      }));
    },
    [updateState]
  );

  const endTrip = useCallback(
    (vanId: string) => {
      const now = new Date().toISOString();
      updateState((prev) => ({
        ...prev,
        driverTrips: prev.driverTrips.map((t) =>
          t.vanId === vanId && t.isActive
            ? { ...t, isActive: false, endTime: now }
            : t
        ),
      }));
    },
    [updateState]
  );

  const addRoutePoint = useCallback(
    (vanId: string, lat: number, lng: number) => {
      const now = new Date().toISOString();
      updateState((prev) => {
        const tripIdx = prev.driverTrips.findIndex((t) => t.vanId === vanId && t.isActive);
        if (tripIdx === -1) return prev;

        const trip = prev.driverTrips[tripIdx];
        const newPoint: RoutePoint = { lat, lng, timestamp: now };
        const pts = trip.points;

        // حساب المسافة التراكمية
        let addedKm = 0;
        if (pts.length > 0) {
          const last = pts[pts.length - 1];
          addedKm = haversineKm(last.lat, last.lng, lat, lng);
        }

        // كشف التوقفات: إذا المسافة < 0.15 كم وفارق الوقت > 4 دقائق
        let updatedStops = [...trip.stops];
        if (pts.length > 0) {
          const last = pts[pts.length - 1];
          const distKm = haversineKm(last.lat, last.lng, lat, lng);
          const timeDiffMin = (new Date(now).getTime() - new Date(last.timestamp).getTime()) / 60000;
          if (distKm < 0.15 && timeDiffMin >= 4) {
            const lastStop = updatedStops[updatedStops.length - 1];
            const isContinuingStop = lastStop && !lastStop.departureTime &&
              haversineKm(lastStop.lat, lastStop.lng, lat, lng) < 0.15;
            if (isContinuingStop) {
              updatedStops[updatedStops.length - 1] = {
                ...lastStop,
                durationMinutes: Math.round((new Date(now).getTime() - new Date(lastStop.arrivalTime).getTime()) / 60000),
              };
            } else {
              updatedStops.push({
                lat: last.lat,
                lng: last.lng,
                arrivalTime: last.timestamp,
                durationMinutes: Math.round(timeDiffMin),
              });
            }
          } else if (distKm >= 0.15) {
            // غادر التوقف — أغلق آخر توقفة مفتوحة
            const lastStop = updatedStops[updatedStops.length - 1];
            if (lastStop && !lastStop.departureTime) {
              updatedStops[updatedStops.length - 1] = {
                ...lastStop,
                departureTime: now,
                durationMinutes: Math.round((new Date(now).getTime() - new Date(lastStop.arrivalTime).getTime()) / 60000),
              };
            }
          }
        }

        const updatedTrip: DriverTrip = {
          ...trip,
          points: [...pts, newPoint],
          distanceKm: trip.distanceKm + addedKm,
          stops: updatedStops,
        };

        const updatedTrips = [...prev.driverTrips];
        updatedTrips[tripIdx] = updatedTrip;
        return { ...prev, driverTrips: updatedTrips };
      });
    },
    [updateState]
  );

  // ─── نظام الرسائل ───
  const sendMessage = useCallback(
    (msg: { toVanId: string; subject: string; body: string }) => {
      if (!state.currentUser) return;
      const newMsg: AppMessage = {
        id: generateId(),
        fromUserId: state.currentUser.id,
        fromName: state.currentUser.name,
        toVanId: msg.toVanId,
        subject: msg.subject,
        body: msg.body,
        date: new Date().toISOString(),
        readBy: [state.currentUser.id],
        replies: [],
      };
      updateState((prev) => ({ ...prev, messages: [...(prev.messages || []), newMsg] }));
    },
    [state.currentUser, updateState]
  );

  const replyToMessage = useCallback(
    (messageId: string, body: string) => {
      if (!state.currentUser) return;
      const reply: MessageReply = {
        id: generateId(),
        fromUserId: state.currentUser.id,
        fromName: state.currentUser.name,
        body,
        date: new Date().toISOString(),
      };
      updateState((prev) => ({
        ...prev,
        messages: (prev.messages || []).map((m) =>
          m.id === messageId
            ? {
                ...m,
                replies: [...m.replies, reply],
                readBy: [...new Set([...m.readBy, state.currentUser!.id])],
              }
            : m
        ),
      }));
    },
    [state.currentUser, updateState]
  );

  const markMessageRead = useCallback(
    (messageId: string) => {
      if (!state.currentUser) return;
      const uid = state.currentUser.id;
      updateState((prev) => ({
        ...prev,
        messages: (prev.messages || []).map((m) =>
          m.id === messageId && !m.readBy.includes(uid)
            ? { ...m, readBy: [...m.readBy, uid] }
            : m
        ),
      }));
    },
    [state.currentUser, updateState]
  );

  const addSpecialPrice = useCallback(
    (sp: Omit<SpecialPrice, "id">) => {
      updateState((prev) => ({
        ...prev,
        specialPrices: [...prev.specialPrices, { ...sp, id: generateId() }],
      }));
    },
    [updateState]
  );

  const removeSpecialPrice = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        specialPrices: prev.specialPrices.filter((s) => s.id !== id),
      }));
    },
    [updateState]
  );

  const getVanBalance = useCallback(
    (vanId: string): number => {
      const entries = state.cashEntries.filter((e) => e.vanId === vanId);
      return entries.reduce((sum, e) => (e.type === "collect" ? sum + e.amount : sum - e.amount), 0);
    },
    [state.cashEntries]
  );

  const requestPriceApproval = useCallback(
    (req: Omit<PriceApprovalRequest, "id" | "date" | "status">): string => {
      const newReq: PriceApprovalRequest = {
        ...req,
        id: generateId(),
        date: new Date().toISOString(),
        status: "pending",
      };
      updateState((prev) => ({
        ...prev,
        priceApprovalRequests: [...prev.priceApprovalRequests, newReq],
      }));
      return newReq.id;
    },
    [updateState]
  );

  const approvePriceRequest = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        priceApprovalRequests: prev.priceApprovalRequests.map((r) =>
          r.id === id ? { ...r, status: "approved" } : r
        ),
      }));
    },
    [updateState]
  );

  const rejectPriceRequest = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        priceApprovalRequests: prev.priceApprovalRequests.map((r) =>
          r.id === id ? { ...r, status: "rejected" } : r
        ),
      }));
    },
    [updateState]
  );

  const cancelPriceRequest = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        priceApprovalRequests: prev.priceApprovalRequests.filter((r) => r.id !== id),
      }));
    },
    [updateState]
  );

  const requestInvoiceEdit = useCallback(
    (req: Omit<InvoiceEditRequest, "id" | "date" | "status">) => {
      const newReq: InvoiceEditRequest = {
        ...req,
        id: generateId(),
        date: new Date().toISOString(),
        status: "pending",
      };
      updateState((prev) => ({
        ...prev,
        invoiceEditRequests: [...(prev.invoiceEditRequests || []), newReq],
      }));
    },
    [updateState]
  );

  const approveInvoiceEdit = useCallback(
    (id: string) => {
      updateState((prev) => {
        const req = (prev.invoiceEditRequests || []).find((r) => r.id === id);
        if (!req) return prev;

        let updatedInvoices = prev.invoices;
        let updatedInventory = prev.vanInventory;
        let updatedCustomers = prev.customers;
        let updatedCashEntries = prev.cashEntries;

        if (req.type === "cancel") {
          const inv = prev.invoices.find((i) => i.id === req.invoiceId);
          if (inv) {
            updatedInvoices = prev.invoices.map((i) =>
              i.id === req.invoiceId ? { ...i, status: "cancelled" as const } : i
            );
            const vanInv = prev.vanInventory[inv.vanId] || [];
            const restoredInv = vanInv.map((vi) => {
              const soldItem = inv.items.find((it) => it.productId === vi.productId);
              return soldItem ? { ...vi, quantity: vi.quantity + soldItem.quantity } : vi;
            });
            updatedInventory = { ...prev.vanInventory, [inv.vanId]: restoredInv };
            if (inv.paid > 0) {
              updatedCashEntries = [
                ...prev.cashEntries,
                {
                  id: generateId(),
                  vanId: inv.vanId,
                  type: "pay" as const,
                  amount: inv.paid,
                  description: `إلغاء فاتورة #${inv.id.slice(-6).toUpperCase()} - ${inv.customerName}`,
                  date: new Date().toISOString(),
                },
              ];
            }
            const customer = prev.customers.find((c) => c.id === inv.customerId);
            if (customer && inv.remaining > 0) {
              updatedCustomers = prev.customers.map((c) =>
                c.id === inv.customerId ? { ...c, balance: Math.max(0, c.balance - inv.remaining) } : c
              );
            }
          }
        } else if (req.type === "edit" && req.requestedChanges) {
          const inv = prev.invoices.find((i) => i.id === req.invoiceId);
          if (inv) {
            const newDiscount = req.requestedChanges.discount ?? inv.discount;
            const newTotal = inv.subtotal - newDiscount;
            const newPaid = req.requestedChanges.paid ?? inv.paid;
            const newRemaining = Math.max(0, newTotal - newPaid);
            const paidDiff = newPaid - inv.paid;
            updatedInvoices = prev.invoices.map((i) =>
              i.id === req.invoiceId
                ? {
                    ...i,
                    discount: newDiscount,
                    total: newTotal,
                    paid: newPaid,
                    remaining: newRemaining,
                    notes: req.requestedChanges?.notes ?? i.notes,
                  }
                : i
            );
            if (paidDiff !== 0) {
              updatedCashEntries = [
                ...prev.cashEntries,
                {
                  id: generateId(),
                  vanId: inv.vanId,
                  type: paidDiff > 0 ? ("collect" as const) : ("pay" as const),
                  amount: Math.abs(paidDiff),
                  description: `تعديل فاتورة #${inv.id.slice(-6).toUpperCase()} - ${inv.customerName}`,
                  date: new Date().toISOString(),
                },
              ];
            }
            const oldRemaining = inv.remaining;
            const balanceDiff = oldRemaining - newRemaining;
            if (balanceDiff !== 0) {
              updatedCustomers = prev.customers.map((c) =>
                c.id === inv.customerId ? { ...c, balance: Math.max(0, c.balance - balanceDiff) } : c
              );
            }
          }
        }

        return {
          ...prev,
          invoices: updatedInvoices,
          vanInventory: updatedInventory,
          customers: updatedCustomers,
          cashEntries: updatedCashEntries,
          invoiceEditRequests: (prev.invoiceEditRequests || []).map((r) =>
            r.id === id ? { ...r, status: "approved" as const } : r
          ),
        };
      });
    },
    [updateState]
  );

  const rejectInvoiceEdit = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        invoiceEditRequests: (prev.invoiceEditRequests || []).map((r) =>
          r.id === id ? { ...r, status: "rejected" as const } : r
        ),
      }));
    },
    [updateState]
  );

  const requestVanTransfer = useCallback(
    (req: Omit<VanToVanTransferRequest, "id" | "date" | "status" | "transferRef" | "fromVanName" | "fromDriverName" | "toVanName" | "toDriverName">) => {
      const fromVan = state.vans.find((v) => v.id === req.fromVanId);
      const toVan = state.vans.find((v) => v.id === req.toVanId);
      updateState((prev) => {
        const count = (prev.vanTransferRequests || []).length + 1;
        const year = new Date().getFullYear();
        const transferRef = `ف-${year}-${String(count).padStart(3, "0")}`;
        const newReq: VanToVanTransferRequest = {
          ...req,
          id: generateId(),
          transferRef,
          date: new Date().toISOString(),
          status: "pending",
          fromVanName: fromVan?.name || req.fromVanId,
          fromDriverName: fromVan?.driverName || "",
          toVanName: toVan?.name || req.toVanId,
          toDriverName: toVan?.driverName || "",
        };
        return {
          ...prev,
          vanTransferRequests: [...(prev.vanTransferRequests || []), newReq],
        };
      });
    },
    [state.vans, updateState]
  );

  const approveVanTransfer = useCallback(
    (id: string) => {
      updateState((prev) => {
        const req = (prev.vanTransferRequests || []).find((r) => r.id === id);
        if (!req || req.status !== "pending") return prev;

        // تحقق من الكميات في فان المُرسِل
        const fromInv = prev.vanInventory[req.fromVanId] || [];
        for (const item of req.items) {
          const found = fromInv.find((i) => i.productId === item.productId);
          if (!found || found.quantity < item.quantity) return prev; // لا تكفي
        }

        // خصم من مخزون المُرسِل (نسخة جديدة لكل كائن)
        const newFromInv = fromInv.map((i) => {
          const item = req.items.find((it) => it.productId === i.productId);
          return item ? { ...i, quantity: i.quantity - item.quantity } : { ...i };
        });

        // إضافة لمخزون المُستلم (نسخ كاملة — بدون mutation)
        const prevToInv = prev.vanInventory[req.toVanId] || [];
        // الأصناف الموجودة مسبقاً عند المُستلم: أضف إليها
        const newToInv = prevToInv.map((i) => {
          const item = req.items.find((it) => it.productId === i.productId);
          return item ? { ...i, quantity: i.quantity + item.quantity } : { ...i };
        });
        // الأصناف غير الموجودة عند المُستلم: أضفها جديدة
        for (const item of req.items) {
          if (!prevToInv.find((i) => i.productId === item.productId)) {
            newToInv.push({ productId: item.productId, quantity: item.quantity });
          }
        }

        return {
          ...prev,
          vanInventory: {
            ...prev.vanInventory,
            [req.fromVanId]: newFromInv,
            [req.toVanId]: newToInv,
          },
          vanTransferRequests: (prev.vanTransferRequests || []).map((r) =>
            r.id === id ? { ...r, status: "approved" as const, resolvedAt: new Date().toISOString() } : r
          ),
        };
      });
    },
    [updateState]
  );

  const rejectVanTransfer = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        vanTransferRequests: (prev.vanTransferRequests || []).map((r) =>
          r.id === id ? { ...r, status: "rejected" as const, resolvedAt: new Date().toISOString() } : r
        ),
      }));
    },
    [updateState]
  );

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        logout,
        addProduct,
        addUser,
        updateUser,
        deleteUser,
        updateProduct,
        addVan,
        transferToVan,
        addCustomer,
        updateCustomer,
        updateCompanySettings,
        saveReport,
        deleteReport,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        createInvoice,
        updateInvoice,
        addCashEntry,
        addExpense,
        addPurchase,
        addPurchaseInvoice,
        closeDailyInventory,
        updateDriverLocation,
        addSpecialPrice,
        removeSpecialPrice,
        getVanBalance,
        getProductPrice,
        requestPriceApproval,
        approvePriceRequest,
        rejectPriceRequest,
        cancelPriceRequest,
        requestInvoiceEdit,
        approveInvoiceEdit,
        rejectInvoiceEdit,
        requestVanTransfer,
        approveVanTransfer,
        rejectVanTransfer,
        startTrip,
        endTrip,
        addRoutePoint,
        sendMessage,
        replyToMessage,
        markMessageRead,
        syncStatus,
        loadFromServer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
