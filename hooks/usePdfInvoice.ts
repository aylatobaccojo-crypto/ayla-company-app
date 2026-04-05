import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import type { CompanySettings, Customer, Expense, Invoice, Van } from "@/context/AppContext";

function buildInvoiceHtml(
  invoice: Invoice,
  customer: Customer | null | undefined,
  van: Van | null | undefined,
  companySettings: CompanySettings
): string {
  const date = new Date(invoice.date);
  const dateStr = date.toLocaleDateString("ar-SA");
  const timeStr = date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const invoiceNum = invoice.id.slice(-6).toUpperCase();
  const totalCartons = invoice.items.reduce((s, i) => s + i.quantity, 0);

  const itemRows = invoice.items
    .map(
      (item, idx) => `
      <tr class="${idx % 2 === 0 ? "row-even" : "row-odd"}">
        <td class="item-name">${item.productName}</td>
        <td class="item-num">${item.quantity}</td>
        <td class="item-num">${item.unitPrice.toFixed(2)}</td>
        <td class="item-total">${item.total.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const isCancelled = invoice.status === "cancelled";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>فاتورة #${invoiceNum}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Tahoma', 'Arial', sans-serif;
      direction: rtl;
      background: #fff;
      color: #1a1a2e;
      font-size: 13px;
      padding: 24px 28px;
    }

    /* رأس الشركة */
    .company-header {
      text-align: center;
      border-bottom: 3px solid #e8531d;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .company-name {
      font-size: 26px;
      font-weight: 900;
      color: #e8531d;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .company-meta {
      color: #555;
      font-size: 12px;
      line-height: 1.7;
    }
    .company-tax {
      display: inline-block;
      background: #fff3ed;
      color: #e8531d;
      border: 1px solid #e8531d55;
      border-radius: 6px;
      padding: 2px 10px;
      margin-top: 4px;
      font-size: 11px;
    }

    /* بادج الإلغاء */
    .cancelled-banner {
      background: #fef2f2;
      border: 2px solid #dc2626;
      border-radius: 8px;
      text-align: center;
      padding: 10px;
      margin-bottom: 14px;
      color: #dc2626;
      font-size: 15px;
      font-weight: bold;
    }

    /* صف بيانات الفاتورة والعميل */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 18px;
    }
    .info-box {
      background: #f8f9fa;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .info-box-title {
      font-size: 11px;
      color: #888;
      margin-bottom: 6px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #666; font-size: 12px; }
    .info-value { font-weight: bold; font-size: 12px; color: #1a1a2e; }
    .inv-number { color: #e8531d; font-size: 16px; font-weight: 900; }

    /* الحالة */
    .status-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
    }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-partial { background: #fef3c7; color: #92400e; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }

    /* جدول الأصناف */
    .items-title {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a2e;
      margin-bottom: 8px;
      padding-right: 4px;
      border-right: 4px solid #e8531d;
      padding-right: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border-radius: 10px;
      overflow: hidden;
    }
    thead th {
      background: #1a1a2e;
      color: #fff;
      padding: 10px 12px;
      font-size: 12px;
      text-align: right;
    }
    thead th.item-num { text-align: center; }
    thead th.item-total { text-align: center; }
    tbody td {
      padding: 9px 12px;
      font-size: 12px;
      border-bottom: 1px solid #f0f0f0;
    }
    .item-name { font-weight: bold; color: #1a1a2e; }
    .item-num { text-align: center; color: #555; }
    .item-total { text-align: center; font-weight: bold; color: #e8531d; }
    .row-even { background: #fff; }
    .row-odd  { background: #f9fafb; }

    /* ذيل الجدول */
    .table-footer {
      background: #f3f4f6;
    }
    .table-footer td {
      padding: 8px 12px;
      font-size: 12px;
      color: #555;
      border-bottom: none;
    }

    /* الإجماليات */
    .totals-box {
      background: #f8f9fa;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 18px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }
    .totals-row:last-child { border-bottom: none; }
    .totals-label { color: #555; }
    .totals-value { font-weight: bold; }
    .totals-grand {
      background: #e8531d;
      border-radius: 8px;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
    }
    .totals-grand .totals-label { color: #fff; font-weight: bold; font-size: 14px; }
    .totals-grand .totals-value { color: #fff; font-size: 18px; font-weight: 900; }
    .remaining-row { background: #fef3c7; border-radius: 6px; padding: 8px 16px; margin-top: 8px; display: flex; justify-content: space-between; }
    .remaining-label { color: #92400e; font-weight: bold; }
    .remaining-value { color: #92400e; font-weight: bold; font-size: 15px; }
    .paid-full { background: #d1fae5; border-radius: 6px; padding: 8px 16px; margin-top: 8px; text-align: center; color: #065f46; font-weight: bold; }

    /* ذيل الفاتورة */
    .footer {
      text-align: center;
      color: #888;
      font-size: 11px;
      border-top: 1px dashed #ddd;
      padding-top: 12px;
      margin-top: 8px;
    }
    .footer-brand { color: #e8531d; font-weight: bold; font-size: 13px; }
  </style>
</head>
<body>

  <!-- رأس الشركة -->
  <div class="company-header">
    <div class="company-name">${companySettings.name}</div>
    <div class="company-meta">
      ${companySettings.phone ? `📞 ${companySettings.phone}` : ""}
      ${companySettings.phone && companySettings.address ? " &nbsp;|&nbsp; " : ""}
      ${companySettings.address ? `📍 ${companySettings.address}` : ""}
    </div>
    ${companySettings.taxNumber ? `<div><span class="company-tax">رقم التسجيل الضريبي: ${companySettings.taxNumber}</span></div>` : ""}
  </div>

  ${isCancelled ? `<div class="cancelled-banner">⚠️ هذه الفاتورة ملغاة</div>` : ""}

  <!-- معلومات الفاتورة والعميل -->
  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-title">بيانات الفاتورة</div>
      <div class="info-row">
        <span class="info-label">رقم الفاتورة</span>
        <span class="inv-number">#${invoiceNum}</span>
      </div>
      <div class="info-row">
        <span class="info-label">التاريخ</span>
        <span class="info-value">${dateStr}</span>
      </div>
      <div class="info-row">
        <span class="info-label">الوقت</span>
        <span class="info-value">${timeStr}</span>
      </div>
      ${van ? `<div class="info-row">
        <span class="info-label">المندوب</span>
        <span class="info-value">${van.driverName}</span>
      </div>` : ""}
      <div class="info-row">
        <span class="info-label">الحالة</span>
        <span class="status-badge ${isCancelled ? "status-cancelled" : invoice.remaining > 0 ? "status-partial" : "status-paid"}">
          ${isCancelled ? "ملغاة" : invoice.remaining > 0 ? "آجل جزئي" : "مدفوعة"}
        </span>
      </div>
    </div>
    <div class="info-box">
      <div class="info-box-title">بيانات العميل</div>
      <div class="info-row">
        <span class="info-label">الاسم</span>
        <span class="info-value">${invoice.customerName}</span>
      </div>
      ${customer?.phone ? `<div class="info-row">
        <span class="info-label">الهاتف</span>
        <span class="info-value">${customer.phone}</span>
      </div>` : ""}
      ${customer?.address ? `<div class="info-row">
        <span class="info-label">العنوان</span>
        <span class="info-value">${customer.address}</span>
      </div>` : ""}
      ${customer?.taxNumber ? `<div class="info-row">
        <span class="info-label">رقم ضريبي</span>
        <span class="info-value">${customer.taxNumber}</span>
      </div>` : ""}
    </div>
  </div>

  <!-- الأصناف -->
  <div class="items-title">الأصناف</div>
  <table>
    <thead>
      <tr>
        <th>اسم الصنف</th>
        <th class="item-num">الكمية</th>
        <th class="item-num">سعر الوحدة (د.أ)</th>
        <th class="item-total">الإجمالي (د.أ)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="table-footer">
        <td colspan="1" style="font-weight:bold; color:#1a1a2e;">إجمالي الكروزات: ${totalCartons} علبة</td>
        <td colspan="3"></td>
      </tr>
    </tbody>
  </table>

  <!-- الإجماليات -->
  <div class="totals-box">
    <div class="totals-row">
      <span class="totals-label">المجموع الفرعي</span>
      <span class="totals-value">${invoice.subtotal.toFixed(2)} د.أ</span>
    </div>
    ${invoice.discount > 0 ? `<div class="totals-row">
      <span class="totals-label">الخصم</span>
      <span class="totals-value" style="color:#dc2626;">- ${invoice.discount.toFixed(2)} د.أ</span>
    </div>` : ""}
    <div class="totals-grand">
      <span class="totals-label">الإجمالي</span>
      <span class="totals-value">${invoice.total.toFixed(2)} د.أ</span>
    </div>
    <div class="totals-row" style="margin-top:10px;">
      <span class="totals-label">المدفوع نقداً</span>
      <span class="totals-value" style="color:#059669;">${invoice.paid.toFixed(2)} د.أ</span>
    </div>
    ${invoice.remaining > 0
      ? `<div class="remaining-row">
          <span class="remaining-label">المتبقي آجل</span>
          <span class="remaining-value">${invoice.remaining.toFixed(2)} د.أ</span>
        </div>`
      : `<div class="paid-full">✓ تم السداد بالكامل</div>`
    }
  </div>

  <!-- الذيل -->
  <div class="footer">
    <div class="footer-brand">${companySettings.name}</div>
    ${companySettings.phone ? `<div>${companySettings.phone}</div>` : ""}
    <div style="margin-top:4px;">شكراً لتعاملكم معنا — تم إصدار هذه الفاتورة إلكترونياً</div>
  </div>

</body>
</html>`;
}

// ======================================
// تصدير التقرير PDF
// ======================================

export interface ReportData {
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
  invoices: Invoice[];
  expenses: Expense[];
}

function buildReportHtml(data: ReportData, companySettings: CompanySettings): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-SA");
  const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  const profitColor = data.netProfit >= 0 ? "#059669" : "#dc2626";

  const vanRows = data.vanStats.map((v, i) => `
    <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
      <td class="td-r">${v.vanName}</td>
      <td class="td-r">${v.driverName}</td>
      <td class="td-c">${v.invoiceCount}</td>
      <td class="td-c num-green">${v.sales.toFixed(2)}</td>
      <td class="td-c num-red">${v.expenses.toFixed(2)}</td>
      <td class="td-c" style="color:${v.profit >= 0 ? "#059669" : "#dc2626"}; font-weight:bold;">${v.profit.toFixed(2)}</td>
    </tr>`).join("");

  const productRows = data.topProducts.map((p, i) => `
    <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
      <td class="td-c rank">${i + 1}</td>
      <td class="td-r">${p.name}</td>
      <td class="td-c">${p.qty} علبة</td>
      <td class="td-c num-green">${p.revenue.toFixed(2)} د.أ</td>
    </tr>`).join("");

  const invoiceRows = data.invoices.slice(0, 50).map((inv, i) => {
    const statusLabel = inv.status === "cancelled" ? "ملغاة" : inv.remaining > 0 ? "آجل" : "مدفوعة";
    const statusColor = inv.status === "cancelled" ? "#dc2626" : inv.remaining > 0 ? "#d97706" : "#059669";
    return `
    <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
      <td class="td-c" style="font-weight:bold; color:#e8531d;">#${inv.id.slice(-6).toUpperCase()}</td>
      <td class="td-r">${inv.customerName}</td>
      <td class="td-c">${new Date(inv.date).toLocaleDateString("ar-SA")}</td>
      <td class="td-c num-green">${inv.total.toFixed(2)}</td>
      <td class="td-c">${inv.paid.toFixed(2)}</td>
      <td class="td-c num-red">${inv.remaining > 0 ? inv.remaining.toFixed(2) : "—"}</td>
      <td class="td-c" style="color:${statusColor}; font-weight:bold;">${statusLabel}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>تقرير ${data.period} — ${companySettings.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Tahoma','Arial',sans-serif; direction:rtl; background:#fff; color:#1a1a2e; font-size:12px; padding:20px 24px; }

    .company-header { text-align:center; border-bottom:3px solid #e8531d; padding-bottom:12px; margin-bottom:16px; }
    .company-name { font-size:24px; font-weight:900; color:#e8531d; margin-bottom:2px; }
    .company-sub { color:#666; font-size:11px; line-height:1.6; }

    .report-title { text-align:center; margin-bottom:16px; }
    .report-title h2 { font-size:18px; color:#1a1a2e; font-weight:900; }
    .report-meta { color:#888; font-size:11px; margin-top:4px; }

    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
    .stat-card { border-radius:10px; padding:12px 14px; text-align:center; }
    .stat-label { font-size:11px; color:#555; margin-bottom:4px; }
    .stat-value { font-size:16px; font-weight:900; }
    .stat-green { background:#d1fae5; }
    .stat-green .stat-value { color:#059669; }
    .stat-blue { background:#dbeafe; }
    .stat-blue .stat-value { color:#1d4ed8; }
    .stat-yellow { background:#fef3c7; }
    .stat-yellow .stat-value { color:#d97706; }
    .stat-red { background:#fee2e2; }
    .stat-red .stat-value { color:#dc2626; }

    .profit-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:14px 18px; margin-bottom:16px; }
    .profit-box h3 { font-size:13px; color:#1a1a2e; font-weight:bold; margin-bottom:10px; padding-right:8px; border-right:3px solid #e8531d; }
    .profit-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #f0f0f0; }
    .profit-row:last-child { border-bottom:none; }
    .profit-label { color:#666; }
    .profit-value { font-weight:bold; }
    .net-profit-row { background:#e8531d; border-radius:8px; padding:10px 16px; display:flex; justify-content:space-between; margin-top:8px; }
    .net-profit-row .profit-label { color:#fff; font-size:14px; font-weight:bold; }
    .net-profit-row .profit-value { color:#fff; font-size:18px; font-weight:900; }

    .section-title { font-size:14px; font-weight:bold; color:#1a1a2e; margin:16px 0 8px; padding-right:10px; border-right:4px solid #e8531d; }

    table { width:100%; border-collapse:collapse; margin-bottom:16px; border-radius:8px; overflow:hidden; }
    thead th { background:#1a1a2e; color:#fff; padding:8px 10px; font-size:11px; text-align:right; }
    thead th.td-c { text-align:center; }
    tbody td { padding:7px 10px; border-bottom:1px solid #f0f0f0; font-size:11px; }
    .td-r { text-align:right; }
    .td-c { text-align:center; }
    .row-even { background:#fff; }
    .row-odd { background:#f9fafb; }
    .num-green { color:#059669; font-weight:bold; }
    .num-red { color:#dc2626; }
    .rank { font-size:14px; font-weight:900; color:#e8531d; }

    .footer { text-align:center; color:#888; font-size:10px; border-top:1px dashed #ddd; padding-top:10px; margin-top:12px; }
    .footer-brand { color:#e8531d; font-weight:bold; font-size:12px; margin-bottom:2px; }

    @media print { body { padding:10px 14px; } }
  </style>
</head>
<body>

  <!-- رأس الشركة -->
  <div class="company-header">
    <div class="company-name">${companySettings.name}</div>
    <div class="company-sub">
      ${companySettings.phone ? `📞 ${companySettings.phone}` : ""}
      ${companySettings.address ? `&nbsp;|&nbsp; 📍 ${companySettings.address}` : ""}
      ${companySettings.taxNumber ? `&nbsp;|&nbsp; رقم ضريبي: ${companySettings.taxNumber}` : ""}
    </div>
  </div>

  <!-- عنوان التقرير -->
  <div class="report-title">
    <h2>📊 تقرير ${data.period}</h2>
    <div class="report-meta">تاريخ الإصدار: ${dateStr} &nbsp;|&nbsp; ${timeStr} &nbsp;|&nbsp; عدد الفواتير: ${data.invoiceCount}</div>
  </div>

  <!-- الإحصائيات الرئيسية -->
  <div class="stats-grid">
    <div class="stat-card stat-green">
      <div class="stat-label">إجمالي المبيعات</div>
      <div class="stat-value">${data.totalSales.toFixed(2)}</div>
      <div class="stat-label">د.أ</div>
    </div>
    <div class="stat-card stat-blue">
      <div class="stat-label">المقبوض</div>
      <div class="stat-value">${data.totalPaid.toFixed(2)}</div>
      <div class="stat-label">د.أ</div>
    </div>
    <div class="stat-card stat-yellow">
      <div class="stat-label">الآجل</div>
      <div class="stat-value">${data.totalRemaining.toFixed(2)}</div>
      <div class="stat-label">د.أ</div>
    </div>
    <div class="stat-card stat-red">
      <div class="stat-label">المصاريف</div>
      <div class="stat-value">${data.totalExpenses.toFixed(2)}</div>
      <div class="stat-label">د.أ</div>
    </div>
  </div>

  <!-- ملخص الأرباح -->
  <div class="profit-box">
    <h3>ملخص الأرباح</h3>
    <div class="profit-row">
      <span class="profit-label">إجمالي المبيعات</span>
      <span class="profit-value num-green">${data.totalSales.toFixed(2)} د.أ</span>
    </div>
    <div class="profit-row">
      <span class="profit-label">تكلفة البضاعة المباعة</span>
      <span class="profit-value num-red">- ${data.totalCost.toFixed(2)} د.أ</span>
    </div>
    <div class="profit-row">
      <span class="profit-label">الربح الإجمالي</span>
      <span class="profit-value" style="color:#0891b2;">${data.grossProfit.toFixed(2)} د.أ</span>
    </div>
    <div class="profit-row">
      <span class="profit-label">المصاريف التشغيلية</span>
      <span class="profit-value num-red">- ${data.totalExpenses.toFixed(2)} د.أ</span>
    </div>
    <div class="net-profit-row">
      <span class="profit-label">صافي الربح</span>
      <span class="profit-value" style="color:#fff;">${data.netProfit.toFixed(2)} د.أ</span>
    </div>
  </div>

  ${data.vanStats.length > 0 ? `
  <!-- أداء الفانات -->
  <div class="section-title">أداء كل فان</div>
  <table>
    <thead>
      <tr>
        <th>الفان</th>
        <th>المندوب</th>
        <th class="td-c">فواتير</th>
        <th class="td-c">مبيعات (د.أ)</th>
        <th class="td-c">مصاريف (د.أ)</th>
        <th class="td-c">ربح (د.أ)</th>
      </tr>
    </thead>
    <tbody>${vanRows}</tbody>
  </table>` : ""}

  ${data.topProducts.length > 0 ? `
  <!-- أكثر المنتجات مبيعاً -->
  <div class="section-title">أكثر المنتجات مبيعاً</div>
  <table>
    <thead>
      <tr>
        <th class="td-c">#</th>
        <th>اسم المنتج</th>
        <th class="td-c">الكمية</th>
        <th class="td-c">الإيراد (د.أ)</th>
      </tr>
    </thead>
    <tbody>${productRows}</tbody>
  </table>` : ""}

  ${data.invoices.length > 0 ? `
  <!-- تفاصيل الفواتير -->
  <div class="section-title">تفاصيل الفواتير${data.invoices.length > 50 ? " (أحدث 50 فاتورة)" : ""}</div>
  <table>
    <thead>
      <tr>
        <th class="td-c">الرقم</th>
        <th>العميل</th>
        <th class="td-c">التاريخ</th>
        <th class="td-c">الإجمالي (د.أ)</th>
        <th class="td-c">المدفوع (د.أ)</th>
        <th class="td-c">الآجل (د.أ)</th>
        <th class="td-c">الحالة</th>
      </tr>
    </thead>
    <tbody>${invoiceRows}</tbody>
  </table>` : ""}

  <!-- الذيل -->
  <div class="footer">
    <div class="footer-brand">${companySettings.name}</div>
    <div>تم إصدار هذا التقرير تلقائياً — ${dateStr}</div>
  </div>

</body>
</html>`;
}

async function sharePdf(html: string, title: string): Promise<void> {
  if (Platform.OS === "web") {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
    return;
  }
  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
    } else {
      Alert.alert("خطأ", "المشاركة غير متاحة على هذا الجهاز");
    }
  } catch (err) {
    console.error("PDF export error:", err);
    Alert.alert("خطأ في التصدير", "تعذّر إنشاء ملف PDF.");
  }
}

// ─── تقرير المندوبين حسب الأسعار ───
export interface DriverTierReportData {
  period: string;
  dateStr: string;
  companySettings: CompanySettings;
  drivers: {
    vanName: string;
    driverName: string;
    tier2: { total: number; value: number; byProduct: { name: string; category: string; qty: number; value: number }[] };
    tier3: { total: number; value: number; byProduct: { name: string; category: string; qty: number; value: number }[] };
    tier1: { total: number; value: number; byProduct: { name: string; category: string; qty: number; value: number }[] };
    byCategory: Record<string, { qty2: number; qty3: number; val2: number; val3: number }>;
  }[];
}

function buildDriverReportHtml(data: DriverTierReportData): string {
  const css = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Tahoma','Arial',sans-serif;direction:rtl;background:#fff;color:#1a1a2e;font-size:12px;padding:20px 24px}
    .co-header{text-align:center;border-bottom:3px solid #e8531d;padding-bottom:12px;margin-bottom:16px}
    .co-name{font-size:22px;font-weight:900;color:#e8531d}
    .co-sub{color:#666;font-size:11px;line-height:1.6}
    .rep-title{text-align:center;margin-bottom:16px}
    .rep-title h2{font-size:17px;font-weight:900;color:#1a1a2e}
    .rep-meta{color:#888;font-size:11px;margin-top:4px}
    .driver-block{border:1px solid #e5e7eb;border-radius:10px;margin-bottom:20px;overflow:hidden}
    .driver-header{background:#e8531d;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center}
    .driver-name{font-size:14px;font-weight:900}
    .driver-van{font-size:11px;opacity:.85}
    .tier-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border-bottom:1px solid #e5e7eb}
    .tier-box{padding:10px 14px;text-align:center;border-left:1px solid #e5e7eb}
    .tier-box:last-child{border-left:none}
    .tier-label{font-size:11px;color:#666;margin-bottom:4px}
    .tier-qty{font-size:18px;font-weight:900}
    .tier-val{font-size:11px;color:#888;margin-top:2px}
    .t2{color:#1d4ed8}.t3{color:#059669}.t1{color:#e67e22}
    .sec-title{font-size:12px;font-weight:bold;padding:8px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;color:#374151}
    table{width:100%;border-collapse:collapse}
    th{background:#f3f4f6;padding:7px 10px;font-size:11px;color:#4b5563;font-weight:bold;text-align:right;border-bottom:1px solid #e5e7eb}
    td{padding:6px 10px;font-size:11px;color:#374151;border-bottom:1px solid #f0f0f0}
    .even{background:#fafafa}
    .t2c{color:#1d4ed8;font-weight:bold}.t3c{color:#059669;font-weight:bold}
    .cat-block{padding:10px 14px}
    .cat-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0}
    .cat-name{font-weight:bold;color:#374151;font-size:12px}
    .cat-nums{display:flex;gap:16px}
    .cat-num{text-align:center}
    .cat-num-label{font-size:10px;color:#9ca3af}
    .cat-num-val{font-size:12px;font-weight:bold}
  `;

  const driversHtml = data.drivers.map((d) => {
    const allProducts = new Map<string, { name: string; category: string; qty2: number; qty3: number; qty1: number; val2: number; val3: number; val1: number }>();

    for (const item of d.tier2.byProduct) {
      const e = allProducts.get(item.name) || { name: item.name, category: item.category, qty2: 0, qty3: 0, qty1: 0, val2: 0, val3: 0, val1: 0 };
      e.qty2 += item.qty; e.val2 += item.value;
      allProducts.set(item.name, e);
    }
    for (const item of d.tier3.byProduct) {
      const e = allProducts.get(item.name) || { name: item.name, category: item.category, qty2: 0, qty3: 0, qty1: 0, val2: 0, val3: 0, val1: 0 };
      e.qty3 += item.qty; e.val3 += item.value;
      allProducts.set(item.name, e);
    }
    for (const item of d.tier1.byProduct) {
      const e = allProducts.get(item.name) || { name: item.name, category: item.category, qty2: 0, qty3: 0, qty1: 0, val2: 0, val3: 0, val1: 0 };
      e.qty1 += item.qty; e.val1 += item.value;
      allProducts.set(item.name, e);
    }

    const productRows = [...allProducts.values()]
      .filter((p) => p.qty2 + p.qty3 + p.qty1 > 0)
      .sort((a, b) => (b.qty2 + b.qty3) - (a.qty2 + a.qty3))
      .map((p, i) => `
        <tr class="${i % 2 === 0 ? "even" : ""}">
          <td>${p.name}</td>
          <td style="text-align:center;color:#6b7280">${p.category}</td>
          <td style="text-align:center" class="t2c">${p.qty2 > 0 ? p.qty2 + " كروز" : "—"}</td>
          <td style="text-align:center;color:#9ca3af;font-size:10px">${p.qty2 > 0 ? p.val2.toFixed(2) + " د.أ" : ""}</td>
          <td style="text-align:center" class="t3c">${p.qty3 > 0 ? p.qty3 + " كروز" : "—"}</td>
          <td style="text-align:center;color:#9ca3af;font-size:10px">${p.qty3 > 0 ? p.val3.toFixed(2) + " د.أ" : ""}</td>
          ${d.tier1.total > 0 ? `<td style="text-align:center;color:#e67e22;font-weight:bold">${p.qty1 > 0 ? p.qty1 + " كروز" : "—"}</td>` : ""}
        </tr>`).join("");

    const catRows = Object.entries(d.byCategory)
      .sort((a, b) => (b[1].qty2 + b[1].qty3) - (a[1].qty2 + a[1].qty3))
      .map(([ cat, c ]) => `
        <div class="cat-row">
          <span class="cat-name">${cat}</span>
          <span class="cat-nums">
            <span class="cat-num"><div class="cat-num-label">سعر 2</div><div class="cat-num-val t2c">${c.qty2} كروز</div></span>
            <span class="cat-num"><div class="cat-num-label">سعر 3</div><div class="cat-num-val t3c">${c.qty3} كروز</div></span>
          </span>
        </div>`).join("");

    const totalBoxes = d.tier2.total + d.tier3.total + d.tier1.total;
    const totalValue = d.tier2.value + d.tier3.value + d.tier1.value;

    return `
    <div class="driver-block">
      <div class="driver-header">
        <span class="driver-name">${d.driverName}</span>
        <span class="driver-van">${d.vanName} &nbsp;|&nbsp; ${totalBoxes} كروز &nbsp;|&nbsp; ${totalValue.toFixed(2)} د.أ</span>
      </div>
      <div class="tier-summary">
        <div class="tier-box">
          <div class="tier-label">سعر 2</div>
          <div class="tier-qty t2">${d.tier2.total} كروز</div>
          <div class="tier-val">${d.tier2.value.toFixed(2)} د.أ</div>
        </div>
        <div class="tier-box">
          <div class="tier-label">سعر 3</div>
          <div class="tier-qty t3">${d.tier3.total} كروز</div>
          <div class="tier-val">${d.tier3.value.toFixed(2)} د.أ</div>
        </div>
        <div class="tier-box">
          <div class="tier-label">سعر 1</div>
          <div class="tier-qty t1">${d.tier1.total} كروز</div>
          <div class="tier-val">${d.tier1.value.toFixed(2)} د.أ</div>
        </div>
      </div>
      ${Object.keys(d.byCategory).length > 0 ? `
      <div class="sec-title">حسب الفئة</div>
      <div class="cat-block">${catRows}</div>` : ""}
      ${productRows ? `
      <div class="sec-title">تفصيل المنتجات</div>
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th style="text-align:center">الفئة</th>
            <th style="text-align:center;color:#1d4ed8">كمية سعر 2</th>
            <th style="text-align:center">قيمة</th>
            <th style="text-align:center;color:#059669">كمية سعر 3</th>
            <th style="text-align:center">قيمة</th>
            ${d.tier1.total > 0 ? '<th style="text-align:center;color:#e67e22">كمية سعر 1</th>' : ""}
          </tr>
        </thead>
        <tbody>${productRows}</tbody>
      </table>` : ""}
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/><title>تقرير المندوبين — ${data.period}</title>
<style>${css}</style></head>
<body>
<div class="co-header">
  <div class="co-name">${data.companySettings.name}</div>
  <div class="co-sub">${data.companySettings.phone}${data.companySettings.address ? " | " + data.companySettings.address : ""}${data.companySettings.taxNumber ? " | رقم ضريبي: " + data.companySettings.taxNumber : ""}</div>
</div>
<div class="rep-title">
  <h2>تقرير مبيعات المندوبين حسب مستوى الأسعار</h2>
  <div class="rep-meta">الفترة: ${data.period} &nbsp;|&nbsp; تاريخ الطباعة: ${data.dateStr}</div>
</div>
${driversHtml}
</body></html>`;
}

export async function exportDriverReportPdf(data: DriverTierReportData): Promise<void> {
  const html = buildDriverReportHtml(data);
  await sharePdf(html, `تقرير المندوبين — ${data.period}`);
}

export async function exportReportPdf(data: ReportData, companySettings: CompanySettings): Promise<void> {
  const html = buildReportHtml(data, companySettings);
  await sharePdf(html, `تقرير ${data.period} — ${companySettings.name}`);
}

export async function exportInvoicePdf(
  invoice: Invoice,
  customer: Customer | null | undefined,
  van: Van | null | undefined,
  companySettings: CompanySettings
): Promise<void> {
  const html = buildInvoiceHtml(invoice, customer, van, companySettings);
  await sharePdf(html, `فاتورة #${invoice.id.slice(-6).toUpperCase()}`);
}
