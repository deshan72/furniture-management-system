// Reports Data Service & Utilities for D&S Furniture Management System
import { formatDateTime } from './formatters';

export const REPORT_TYPES = [
  {
    id: 'sales_revenue',
    label: 'Sales & Revenue',
    subtitle: 'Customer sales turnover, invoices, deposits, and payment modes',
    iconName: 'BarChart3',
    badge: 'Sales',
  },
  {
    id: 'inventory_valuation',
    label: 'Stock Valuation',
    subtitle: 'Finished furniture inventory, cost valuation, and reorder levels',
    iconName: 'Package',
    badge: 'Stock',
  },
  {
    id: 'profit_margin',
    label: 'Profit & Margins',
    subtitle: 'Gross revenue vs. cost of goods sold (COGS) and net margin %',
    iconName: 'TrendingUp',
    badge: 'Margins',
  },
];

const ORDERS_STORAGE_KEY = 'dnd_orders_list_v2';
const EXPENSES_STORAGE_KEY = 'dnd_expenses_list_v2';

// Baseline Realistic Seed Orders
const INITIAL_ORDERS = [
  {
    id: 'ORD-1001',
    invoice_no: 'DS-INV-1081',
    date: '2026-10-12',
    customer_id: 'MHG/C001/1/DT001',
    customer_name: 'Sunil Jayawardena',
    customer_phone: '0771234567',
    branch_code: 'MHG',
    center_code: 'C001',
    items_summary: 'Royal Teak 6-Seater Dining Table (Solid Wood)',
    category: 'wood',
    gross_amount: 98500,
    advance_paid: 53500,
    balance_due: 45000,
    payment_method: 'Bank Transfer',
    status: 'Advance Received',
  },
  {
    id: 'ORD-1002',
    invoice_no: 'DS-INV-1082',
    date: '2026-10-18',
    customer_id: 'MHG/C002/1/WR003',
    customer_name: 'Chamari Perera',
    customer_phone: '0714567890',
    branch_code: 'MHG',
    center_code: 'C002',
    items_summary: 'Mahogany 3-Door Wardrobe (Almirah)',
    category: 'wood',
    gross_amount: 78000,
    advance_paid: 78000,
    balance_due: 0,
    payment_method: 'Cash',
    status: 'Fully Paid',
  },
  {
    id: 'ORD-1003',
    invoice_no: 'DS-INV-1083',
    date: '2026-10-24',
    customer_id: 'MRT/C001/1/KT005',
    customer_name: 'Nimal Fernando',
    customer_phone: '0767890123',
    branch_code: 'MRT',
    center_code: 'C001',
    items_summary: 'Modern Melamine Modular Kitchen Pantry Unit',
    category: 'melamine',
    gross_amount: 135000,
    advance_paid: 50000,
    balance_due: 85000,
    payment_method: 'Bank Transfer',
    status: 'Advance Received',
  },
  {
    id: 'ORD-1004',
    invoice_no: 'DS-INV-1084',
    date: '2026-10-28',
    customer_id: 'DHW/C001/1/DK002',
    customer_name: 'Anura Wickramasinghe',
    customer_phone: '0783456789',
    branch_code: 'DHW',
    center_code: 'C001',
    items_summary: 'Executive Melamine Office Desk (L-Shape)',
    category: 'melamine',
    gross_amount: 68500,
    advance_paid: 68500,
    balance_due: 0,
    payment_method: 'Credit Card',
    status: 'Fully Paid',
  },
  {
    id: 'ORD-1005',
    invoice_no: 'DS-INV-1085',
    date: '2026-11-02',
    customer_id: 'NGB/C001/1/VN004',
    customer_name: 'Priyantha De Silva',
    customer_phone: '0702345678',
    branch_code: 'NGB',
    center_code: 'C001',
    items_summary: 'Smart LED Mirror Vanity & Concealed Wiring',
    category: 'electrical_item',
    gross_amount: 28500,
    advance_paid: 28500,
    balance_due: 0,
    payment_method: 'Cash',
    status: 'Fully Paid',
  },
  {
    id: 'ORD-1006',
    invoice_no: 'DS-INV-1086',
    date: '2026-11-05',
    customer_id: 'CMB/C003/1/AC006',
    customer_name: 'Dhammika Bandara',
    customer_phone: '0758901234',
    branch_code: 'CMB',
    center_code: 'C003',
    items_summary: 'Teak Veranda Easy Lounge Armchair (Pair)',
    category: 'wood',
    gross_amount: 45000,
    advance_paid: 20000,
    balance_due: 25000,
    payment_method: 'Bank Transfer',
    status: 'Advance Received',
  },
  {
    id: 'ORD-1007',
    invoice_no: 'DS-INV-1087',
    date: '2026-11-08',
    customer_id: 'MHG/C001/2/SB007',
    customer_name: 'Kasun Rathnayake',
    customer_phone: '0721234567',
    branch_code: 'MHG',
    center_code: 'C001',
    items_summary: 'Solid Teak 4-Seater Coffee Table Set',
    category: 'wood',
    gross_amount: 54000,
    advance_paid: 54000,
    balance_due: 0,
    payment_method: 'Cash',
    status: 'Fully Paid',
  },
  {
    id: 'ORD-1008',
    invoice_no: 'DS-INV-1088',
    date: '2026-11-09',
    customer_id: 'MRT/C001/2/DR008',
    customer_name: 'Roshan Dias',
    customer_phone: '0776543210',
    branch_code: 'MRT',
    center_code: 'C001',
    items_summary: 'Custom Melamine Shoe Rack & Coat Hanger',
    category: 'melamine',
    gross_amount: 32000,
    advance_paid: 12000,
    balance_due: 20000,
    payment_method: 'Cheque',
    status: 'Advance Received',
  },
];

// Baseline Realistic Seed Expenses
const INITIAL_EXPENSES = [
  {
    id: 'EXP-101',
    voucher_no: 'PV-891',
    date: '2026-10-10',
    category: 'Timber Procurement',
    payee: 'Moratuwa Sawmill Syndicate',
    branch_code: 'MRT',
    center_code: 'C001',
    amount: 145000,
    payment_method: 'Bank Transfer',
    notes: '80 cu. ft. Seasoned Ceylon Teak Wood logs for dining tables',
  },
  {
    id: 'EXP-102',
    voucher_no: 'PV-892',
    date: '2026-10-14',
    category: 'Carpenter Labor Wages',
    payee: 'K. G. Nihal & Carpentry Team (4 Carpenters)',
    branch_code: 'MRT',
    center_code: 'C001',
    amount: 72000,
    payment_method: 'Cash',
    notes: 'Weekly piece-rate wages for Dining Table & Wardrobe carving',
  },
  {
    id: 'EXP-103',
    voucher_no: 'PV-893',
    date: '2026-10-20',
    category: 'Polish, Lacquer & Hardware',
    payee: 'Lanka Paint & Hardware Dealers',
    branch_code: 'MHG',
    center_code: 'C001',
    amount: 38500,
    payment_method: 'Cash',
    notes: 'Polyurethane matte lacquer, brass hinges, drawer slides, sanding sheets',
  },
  {
    id: 'EXP-104',
    voucher_no: 'PV-894',
    date: '2026-10-25',
    category: 'Timber Procurement',
    payee: 'Southern Hardwoods (Pvt) Ltd',
    branch_code: 'MRT',
    center_code: 'C001',
    amount: 95000,
    payment_method: 'Cheque',
    notes: '45 cu. ft. Treated Mahogany wood planks for bedroom suites',
  },
  {
    id: 'EXP-105',
    voucher_no: 'PV-895',
    date: '2026-10-31',
    category: 'Showroom Rent & Utilities',
    payee: 'Building Owner (High Level Road)',
    branch_code: 'MHG',
    center_code: 'C001',
    amount: 85000,
    payment_method: 'Bank Transfer',
    notes: 'Monthly showroom rent and electricity utility bill for Maharagama hub',
  },
  {
    id: 'EXP-106',
    voucher_no: 'PV-896',
    date: '2026-11-03',
    category: 'Transport & Delivery',
    payee: 'Lorry Fleet Logistics Colombo',
    branch_code: 'MHG',
    center_code: 'C001',
    amount: 24000,
    payment_method: 'Cash',
    notes: 'Showroom delivery of kitchen pantry units to Negombo and Dehiwala clients',
  },
  {
    id: 'EXP-107',
    voucher_no: 'PV-897',
    date: '2026-11-06',
    category: 'Carpenter Labor Wages',
    payee: 'Saman Silva (Master Polisher)',
    branch_code: 'MRT',
    center_code: 'C001',
    amount: 36000,
    payment_method: 'Cash',
    notes: 'Lacquer spraying & hand finish for 6-seater dining sets',
  },
];

// Helper: Load Orders from LocalStorage with seed fallback
export const loadAllOrders = () => {
  try {
    const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((o, idx) => ({
          ...o,
          id: o.id || `ORD-${idx + 1000}`,
          invoice_no: o.invoice_no || o.contract_no || `DS-INV-${idx + 1000}`,
          customer_name: o.customer_name || 'Client',
          customer_id: o.customer_id || o.customer_nic || 'N/A',
          customer_phone: o.customer_phone || '-',
          branch_code: o.branch_code || 'MHG',
          center_code: o.center_code || 'C001',
          items_summary: o.items_summary || o.item_name || 'Solid Wood Furniture',
          item_name: o.item_name || o.items_summary || 'Solid Wood Furniture',
          gross_amount: Number(o.gross_amount) || (Number(o.unit_price) * (Number(o.quantity) || 1)) || 0,
          advance_paid: Number(o.advance_paid) || 0,
          balance_due: typeof o.balance_due !== 'undefined' ? Number(o.balance_due) : Math.max(0, (Number(o.gross_amount) || 0) - (Number(o.advance_paid) || 0)),
          payment_method: o.payment_method || (o.payment_type === 'cash' ? 'Cash' : 'Installment Loan'),
          status: o.status || ((Number(o.balance_due) || 0) > 0 ? 'Active Loan' : 'Fully Paid'),
          date: o.date || new Date().toISOString().slice(0, 10),
        }));
      }
    }
  } catch (e) {
    console.error('Error loading orders:', e);
  }
  // Initialize with seed orders
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
  } catch {}
  return INITIAL_ORDERS;
};

// Helper: Load Expenses from LocalStorage with seed fallback
export const loadAllExpenses = () => {
  try {
    const saved = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((e, idx) => ({
          ...e,
          id: e.id || `EXP-${idx + 100}`,
          voucher_no: e.voucher_no || `PV-${idx + 890}`,
          date: e.date || new Date().toISOString().slice(0, 10),
          category: e.category || 'Operating Expense',
          payee: e.payee || 'Supplier',
          branch_code: e.branch_code || 'MHG',
          center_code: e.center_code || 'C001',
          amount: Number(e.amount) || 0,
          payment_method: e.payment_method || 'Cash',
          notes: e.notes || '',
        }));
      }
    }
  } catch (e) {
    console.error('Error loading expenses:', e);
  }
  // Initialize with seed expenses
  try {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(INITIAL_EXPENSES));
  } catch {}
  return INITIAL_EXPENSES;
};

// Helper: Export to standard CSV File
export const exportReportToCSV = ({ filename, reportTitle, headers, rows, summaryRow = null, metadata = {} }) => {
  let csv = '\uFEFF'; // Excel UTF-8 BOM

  // Metadata Header lines
  csv += `"D N S HOME SOLUTIONS - OFFICIAL MANAGEMENT REPORT"\r\n`;
  csv += `"Report Name:","${reportTitle}"\r\n`;
  if (metadata.dateRange) csv += `"Reporting Period:","${metadata.dateRange}"\r\n`;
  if (metadata.center) csv += `"Distribution Center:","${metadata.center}"\r\n`;
  csv += `"Generated At:","${formatDateTime(new Date().toISOString())}"\r\n`;
  csv += `\r\n`; // Empty line separator

  // Table Headers
  csv += headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\r\n';

  // Table Rows
  rows.forEach((row) => {
    csv += row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',') + '\r\n';
  });

  // Summary Row if provided
  if (summaryRow) {
    csv += `\r\n`;
    csv += summaryRow.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',') + '\r\n';
  }

  // Trigger browser download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper: Print & Download Report as PDF
export const printReportToPDF = ({
  reportTitle,
  subtitle,
  dateRangeText,
  centerText,
  kpiCards = [],
  tableHeaders = [],
  tableRows = [],
  summaryCells = [],
}) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup blocker prevented opening the print window. Please allow popups for this site.');
    return;
  }

  const kpisHtml = kpiCards.length
    ? `
    <div class="kpi-grid">
      ${kpiCards
        .map(
          (k) => `
        <div class="kpi-card">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value" style="color: ${k.color || '#1E4D8C'};">${k.value}</div>
          ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `
    : '';

  const headersHtml = tableHeaders
    .map(
      (h) => `
    <th style="padding: 9px 10px; background: #F1F5F9; border-bottom: 2px solid #CBD5E1; text-align: ${h.align || 'left'}; font-weight: 700; font-size: 10px; text-transform: uppercase;">
      ${h.label}
    </th>
  `
    )
    .join('');

  const rowsHtml = tableRows
    .map(
      (row, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
      ${row
        .map(
          (cell, cellIdx) => `
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: ${tableHeaders[cellIdx]?.align || 'left'}; font-size: 10.5px;">
          ${cell}
        </td>
      `
        )
        .join('')}
    </tr>
  `
    )
    .join('');

  const summaryHtml = summaryCells.length
    ? `
    <tfoot>
      <tr style="background: #E2E8F0; font-weight: 800;">
        ${summaryCells
          .map(
            (c, cIdx) => `
          <td style="padding: 10px 10px; border-top: 2px solid #94A3B8; text-align: ${tableHeaders[cIdx]?.align || 'left'}; font-size: 11px;">
            ${c}
          </td>
        `
          )
          .join('')}
      </tr>
    </tfoot>
  `
    : '';

  const docHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>D N S Home Solutions - ${reportTitle}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1E293B; margin: 0; padding: 20px; font-size: 11px; }
          .header-box { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1E4D8C; padding-bottom: 12px; margin-bottom: 16px; }
          .company-title { font-size: 22px; font-weight: 800; color: #1E4D8C; letter-spacing: -0.5px; margin: 0; }
          .company-subtitle { font-size: 10.5px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-top: 2px; }
          .doc-title { font-size: 16px; font-weight: 800; color: #0F172A; margin: 8px 0 2px; }
          .doc-sub { font-size: 11px; color: #64748B; margin: 0; }
          .meta-box { text-align: right; font-size: 10.5px; color: #475569; line-height: 1.5; }
          .kpi-grid { display: flex; gap: 12px; margin-bottom: 16px; }
          .kpi-card { flex: 1; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 14px; background: #F8FAFC; }
          .kpi-label { font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; }
          .kpi-value { font-size: 17px; font-weight: 800; margin-top: 4px; }
          .kpi-sub { font-size: 9.5px; color: #94A3B8; margin-top: 2px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 14px; border-top: 1px dashed #CBD5E1; }
          .sig-box { width: 28%; text-align: center; }
          .sig-line { border-bottom: 1px solid #475569; height: 35px; margin-bottom: 6px; }
          .sig-label { font-size: 10px; font-weight: 600; color: #475569; text-transform: uppercase; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/ds-logo.png" alt="D N S Home Solutions" style="height: 52px; width: 52px; object-fit: contain; border-radius: 8px; border: 1px solid #CBD5E1; padding: 2px; background: #fff;" />
            <div>
              <h1 class="company-title">D N S HOME SOLUTIONS</h1>
              <div class="company-subtitle">Handcrafted Luxury Woodcraft • Showroom & Workshop Ledger</div>
              <h2 class="doc-title">${reportTitle.toUpperCase()}</h2>
              <p class="doc-sub">${subtitle}</p>
            </div>
          </div>
          <div class="meta-box">
            <div><strong>Period:</strong> ${dateRangeText}</div>
            <div><strong>Location Hub:</strong> ${centerText}</div>
            <div><strong>Generated At:</strong> ${formatDateTime(new Date().toISOString())}</div>
            <div><strong>Audit Classification:</strong> Official Business Record</div>
          </div>
        </div>

        ${kpisHtml}

        <table class="data-table">
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          ${summaryHtml}
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">Prepared By (Staff / Cashier)</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">Verified By (Accountant / Auditor)</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">Authorized Managing Director</div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(docHtml);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 400);
};
