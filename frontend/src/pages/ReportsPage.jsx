import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  AlertTriangle,
  Package,
  Banknote,
  Hammer,
  TrendingUp,
  Download,
  Printer,
  Search,
  RotateCcw,
  Building2,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { formatLKR, formatDate } from '../utils/formatters';
import { formatCenterCode } from '../utils/centersData';
import { INITIAL_CUSTOMERS } from '../utils/customersData';
import { INITIAL_PRODUCTS } from '../utils/productUtils';
import {
  REPORT_TYPES,
  loadAllOrders,
  loadAllExpenses,
  exportReportToCSV,
  printReportToPDF,
} from '../utils/reportsData';

export default function ReportsPage({
  initialReportType = 'sales_revenue',
  selectedCenter = 'all',
  centers = [],
}) {
  // Active Report Type State
  const [activeReport, setActiveReport] = useState(initialReportType);

  // Sync active report if initialReportType changes (e.g. from sidebar clicks)
  useEffect(() => {
    if (initialReportType) {
      setActiveReport(initialReportType);
    }
  }, [initialReportType]);

  // Filter States
  const [datePreset, setDatePreset] = useState('all'); // 'today', 'week', 'month', 'quarter', 'ytd', 'all', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [centerFilter, setCenterFilter] = useState(selectedCenter || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync center filter if selectedCenter prop changes
  useEffect(() => {
    if (selectedCenter) {
      setCenterFilter(selectedCenter);
    }
  }, [selectedCenter]);

  // Sourced Data from LocalStorage
  const [orders, setOrders] = useState(() => loadAllOrders());
  const [expenses, setExpenses] = useState(() => loadAllExpenses());

  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_customers_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_CUSTOMERS;
  });

  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_products_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_PRODUCTS;
  });

  // Sync with live storage updates when orders or expenses are added
  useEffect(() => {
    const handleStorage = () => {
      setOrders(loadAllOrders());
      setExpenses(loadAllExpenses());
      try {
        const savedC = localStorage.getItem('dnd_customers_list');
        if (savedC) {
          const parsedC = JSON.parse(savedC);
          if (Array.isArray(parsedC) && parsedC.length > 0) setCustomers(parsedC);
        }
      } catch {}
      try {
        const savedP = localStorage.getItem('dnd_products_list');
        if (savedP) {
          const parsedP = JSON.parse(savedP);
          if (Array.isArray(parsedP) && parsedP.length > 0) setProducts(parsedP);
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Calculate Date Boundaries based on Presets
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (datePreset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (datePreset === 'week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      return { start: monday.toISOString().slice(0, 10), end: todayStr };
    }
    if (datePreset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: firstDay.toISOString().slice(0, 10), end: todayStr };
    }
    if (datePreset === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const firstDayQ = new Date(now.getFullYear(), currentQuarter * 3, 1);
      return { start: firstDayQ.toISOString().slice(0, 10), end: todayStr };
    }
    if (datePreset === 'ytd') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      return { start: firstDayYear.toISOString().slice(0, 10), end: todayStr };
    }
    if (datePreset === 'custom') {
      return { start: startDate, end: endDate };
    }
    return { start: '', end: '' };
  }, [datePreset, startDate, endDate]);

  // Check if a record date is within the active date filter
  const isDateInRange = (dateStr) => {
    if (!dateStr) return true;
    const clean = String(dateStr).slice(0, 10);
    if (dateRangeBounds.start && clean < dateRangeBounds.start) return false;
    if (dateRangeBounds.end && clean > dateRangeBounds.end) return false;
    return true;
  };

  // Check if center matches filter
  const isCenterMatch = (branch, center) => {
    if (!centerFilter || centerFilter === 'all') return true;
    const bCode = (branch || '').toUpperCase();
    const cCode = formatCenterCode(center);
    if (centerFilter.includes('/')) {
      const [selB, selC] = centerFilter.split('/');
      return bCode === selB.toUpperCase() && cCode === formatCenterCode(selC);
    }
    return cCode === formatCenterCode(centerFilter);
  };

  // Current center filter label text
  const currentCenterLabel = useMemo(() => {
    if (!centerFilter || centerFilter === 'all') return 'All Centers (Island-Wide)';
    const found = centers.find((c) => {
      const key = `${c.branch_code?.toUpperCase()}/${formatCenterCode(c.center_code)}`;
      return key === centerFilter || c.id === centerFilter;
    });
    return found ? `${found.branch_code}/${found.center_code} — ${found.name}` : centerFilter;
  }, [centerFilter, centers]);

  // Current date range text for reports header
  const currentDateRangeLabel = useMemo(() => {
    if (datePreset === 'all') return 'All Recorded History (Cumulative)';
    if (datePreset === 'today') return `Today (${formatDate(dateRangeBounds.start)})`;
    if (datePreset === 'week') return `This Week (${formatDate(dateRangeBounds.start)} to ${formatDate(dateRangeBounds.end)})`;
    if (datePreset === 'month') return `This Month (${formatDate(dateRangeBounds.start)} to ${formatDate(dateRangeBounds.end)})`;
    if (datePreset === 'quarter') return `This Quarter (${formatDate(dateRangeBounds.start)} to ${formatDate(dateRangeBounds.end)})`;
    if (datePreset === 'ytd') return `Year to Date (${formatDate(dateRangeBounds.start)} to ${formatDate(dateRangeBounds.end)})`;
    if (datePreset === 'custom') {
      return `${startDate ? formatDate(startDate) : 'Start'} to ${endDate ? formatDate(endDate) : 'End'}`;
    }
    return 'Active Period';
  }, [datePreset, dateRangeBounds, startDate, endDate]);

  // Reset all filters
  const handleResetFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setCenterFilter('all');
    setSearchQuery('');
  };

  const isAnyFilterActive =
    datePreset !== 'all' ||
    centerFilter !== 'all' ||
    searchQuery.trim().length > 0;

  // =========================================================
  // 1. FILTERED REPORT DATASETS
  // =========================================================

  // Report 1: Sales & Revenue Dataset
  const filteredSalesData = useMemo(() => {
    return orders.filter((o) => {
      if (!isDateInRange(o.date)) return false;
      if (!isCenterMatch(o.branch_code, o.center_code)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inv = String(o.invoice_no || o.contract_no || o.id || '').toLowerCase();
        const cName = String(o.customer_name || '').toLowerCase();
        const cId = String(o.customer_id || o.customer_nic || '').toLowerCase();
        const items = String(o.items_summary || o.item_name || '').toLowerCase();
        const pMethod = String(o.payment_method || (o.payment_type === 'cash' ? 'Cash' : 'Installment') || '').toLowerCase();
        const match =
          inv.includes(q) ||
          cName.includes(q) ||
          cId.includes(q) ||
          items.includes(q) ||
          pMethod.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [orders, dateRangeBounds, centerFilter, searchQuery]);

  // Report 2: Outstanding Balances Dataset
  const filteredOutstandingData = useMemo(() => {
    return customers.filter((c) => {
      const parts = String(c.customer_id || c.nic || '').split('/');
      const bCode = c.branch_code || (parts.length === 4 ? parts[0] : '');
      const cCode = c.center_code || (parts.length === 4 ? parts[1] : '');
      if (!isCenterMatch(bCode, cCode)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          (c.name && String(c.name).toLowerCase().includes(q)) ||
          (c.customer_id && String(c.customer_id).toLowerCase().includes(q)) ||
          (c.nic && String(c.nic).toLowerCase().includes(q)) ||
          (c.phone && String(c.phone).includes(q)) ||
          (c.city && String(c.city).toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [customers, centerFilter, searchQuery]);

  // Report 3: Inventory & Stock Valuation Dataset
  const filteredInventoryData = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          (p.item_code && String(p.item_code).toLowerCase().includes(q)) ||
          (p.name && String(p.name).toLowerCase().includes(q)) ||
          (p.wood_type && String(p.wood_type).toLowerCase().includes(q)) ||
          (p.category && String(p.category).toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [products, searchQuery]);

  // Report 4: Daily Cash Flow & Drawer Ledger Dataset
  const filteredCashFlowData = useMemo(() => {
    const combined = [];

    // Add cash orders
    orders.forEach((o) => {
      if (isDateInRange(o.date) && isCenterMatch(o.branch_code, o.center_code)) {
        const pMethod = o.payment_method || (o.payment_type === 'cash' ? 'Cash' : 'Installment');
        const advPaid = Number(o.advance_paid) || 0;
        const gross = Number(o.gross_amount) || 0;
        if (pMethod === 'Cash' || advPaid > 0) {
          const cashAmt = pMethod === 'Cash' ? (gross > 0 ? gross : advPaid) : advPaid;
          if (cashAmt > 0) {
            combined.push({
              id: `cf-${o.id}`,
              date: o.date || new Date().toISOString().slice(0, 10),
              ref_no: o.invoice_no || o.contract_no || o.id,
              particulars: `Order Payment (${o.customer_name || 'Client'}) - ${o.items_summary || o.item_name || 'Furniture Order'}`,
              type: 'inflow',
              category: 'Sales Advance / Full Cash',
              branch_code: o.branch_code || 'MHG',
              center_code: o.center_code || 'C001',
              inflow: cashAmt,
              outflow: 0,
              handled_by: 'Cashier Desk',
            });
          }
        }
      }
    });

    // Add cash expenses
    expenses.forEach((e) => {
      if (isDateInRange(e.date) && isCenterMatch(e.branch_code, e.center_code)) {
        if (e.payment_method === 'Cash' || !e.payment_method) {
          combined.push({
            id: `cf-${e.id}`,
            date: e.date || new Date().toISOString().slice(0, 10),
            ref_no: e.voucher_no || e.id,
            particulars: `${e.category || 'Expense'}: ${e.payee || 'Supplier'} - ${e.notes || ''}`,
            type: 'outflow',
            category: e.category || 'Operating Expense',
            branch_code: e.branch_code || 'MHG',
            center_code: e.center_code || 'C001',
            inflow: 0,
            outflow: Number(e.amount) || 0,
            handled_by: 'Workshop Office',
          });
        }
      }
    });

    // Sort chronologically
    combined.sort((a, b) => (a.date > b.date ? 1 : -1));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return combined.filter(
        (c) =>
          (c.ref_no && String(c.ref_no).toLowerCase().includes(q)) ||
          (c.particulars && String(c.particulars).toLowerCase().includes(q)) ||
          (c.category && String(c.category).toLowerCase().includes(q))
      );
    }
    return combined;
  }, [orders, expenses, dateRangeBounds, centerFilter, searchQuery]);

  // Report 5: Expenses & Workshop Procurement Dataset
  const filteredExpensesData = useMemo(() => {
    return expenses.filter((e) => {
      if (!isDateInRange(e.date)) return false;
      if (!isCenterMatch(e.branch_code, e.center_code)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          (e.voucher_no && String(e.voucher_no).toLowerCase().includes(q)) ||
          (e.category && String(e.category).toLowerCase().includes(q)) ||
          (e.payee && String(e.payee).toLowerCase().includes(q)) ||
          (e.notes && String(e.notes).toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [expenses, dateRangeBounds, centerFilter, searchQuery]);

  // Report 6: Profit & Loss / Margin Dataset
  const filteredProfitData = useMemo(() => {
    return filteredSalesData.map((o) => {
      // Find approximate matching product to calculate cost of production
      const summary = String(o.items_summary || o.item_name || '').toLowerCase();
      const matchedProd = products.find((p) => {
        if (!p) return false;
        if (o.item_id && p.id === o.item_id) return true;
        if (o.item_code && p.item_code && p.item_code === o.item_code) return true;
        const pName = String(p.name || '').toLowerCase();
        if (pName && summary && (summary.includes(pName.slice(0, 10)) || pName.includes(summary.slice(0, 10)))) return true;
        return false;
      });
      const grossAmt = Number(o.gross_amount) || 0;
      const estimatedCost = matchedProd && Number(matchedProd.cost_price) > 0
        ? Number(matchedProd.cost_price) * (Number(o.quantity) || 1)
        : Math.round(grossAmt * 0.65);
      const grossProfit = grossAmt - estimatedCost;
      const marginPct = grossAmt > 0 ? Math.round((grossProfit / grossAmt) * 100) : 0;

      return {
        ...o,
        cogs: estimatedCost,
        gross_profit: grossProfit,
        margin_pct: marginPct,
      };
    });
  }, [filteredSalesData, products]);

  // =========================================================
  // 2. EXPORT CSV & PDF HANDLERS
  // =========================================================

  const handleExportCSV = () => {
    const meta = {
      dateRange: currentDateRangeLabel,
      center: currentCenterLabel,
    };

    if (activeReport === 'sales_revenue') {
      const headers = [
        'Invoice No',
        'Date',
        'Customer ID',
        'Customer Name',
        'Phone',
        'Center Hub',
        'Items Description',
        'Gross Amount (LKR)',
        'Advance Paid (LKR)',
        'Balance Due (LKR)',
        'Payment Method',
        'Status',
      ];
      const rows = filteredSalesData.map((o) => [
        o.invoice_no || o.contract_no || o.id,
        o.date,
        o.customer_id || o.customer_nic || 'N/A',
        o.customer_name || 'Client',
        o.customer_phone || '-',
        `${o.branch_code || 'MHG'}/${o.center_code || 'C001'}`,
        o.items_summary || o.item_name || 'Solid Wood Furniture',
        Number(o.gross_amount) || 0,
        Number(o.advance_paid) || 0,
        Number(o.balance_due) || 0,
        o.payment_method || (o.payment_type === 'cash' ? 'Cash' : 'Installment Loan'),
        o.status || 'Active Loan',
      ]);
      const totalGross = filteredSalesData.reduce((s, o) => s + (Number(o.gross_amount) || 0), 0);
      const totalAdv = filteredSalesData.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);
      const totalBal = filteredSalesData.reduce((s, o) => s + (Number(o.balance_due) || 0), 0);
      const summaryRow = ['TOTALS', '', '', '', '', '', `${filteredSalesData.length} Invoices`, totalGross, totalAdv, totalBal, '', ''];

      exportReportToCSV({
        filename: `DNS_Home_Solutions_Sales_Report_${Date.now()}`,
        reportTitle: 'Sales Turnover & Revenue Audit Report',
        headers,
        rows,
        summaryRow,
        metadata: meta,
      });
    } else if (activeReport === 'outstanding_credit') {
      const headers = [
        'Customer ID',
        'Client Name',
        'Phone',
        'NIC',
        'City',
        'Branch / Center',
        'Total Spent (LKR)',
        'Outstanding Balance (LKR)',
        'Total Orders',
        'Credit Risk Tier',
      ];
      const rows = filteredOutstandingData.map((c) => {
        const bal = Number(c.outstanding_balance) || 0;
        const risk = bal > 50000 ? 'High Risk' : bal > 20000 ? 'Medium Risk' : bal > 0 ? 'Low Risk' : 'Fully Settled';
        return [
          c.customer_id,
          c.name,
          c.phone,
          c.nic,
          c.city,
          `${c.branch_code || 'MHG'}/${c.center_code || 'C001'}`,
          c.total_spent,
          bal,
          c.total_orders || 1,
          risk,
        ];
      });
      const totalBal = filteredOutstandingData.reduce((s, c) => s + (Number(c.outstanding_balance) || 0), 0);
      const summaryRow = ['TOTAL OUTSTANDING', '', '', '', '', '', '', totalBal, '', ''];

      exportReportToCSV({
        filename: `DS_Furniture_Credit_Ledger_${Date.now()}`,
        reportTitle: 'Customer Credit Ledger & Outstanding Balances',
        headers,
        rows,
        summaryRow,
        metadata: meta,
      });
    } else if (activeReport === 'inventory_valuation') {
      const headers = [
        'Item Code',
        'Product Name',
        'Category',
        'Wood / Material',
        'Finish',
        'Units in Hand',
        'Unit Cost (LKR)',
        'Unit Price (LKR)',
        'Total Cost Valuation (LKR)',
        'Total Retail Valuation (LKR)',
        'Potential Profit (LKR)',
        'Stock Health',
      ];
      const rows = filteredInventoryData.map((p) => {
        const qty = Number(p.stock_quantity) || 0;
        const cost = Number(p.cost_price) || 0;
        const price = Number(p.selling_price) || 0;
        const totalCost = qty * cost;
        const totalRetail = qty * price;
        const potProfit = totalRetail - totalCost;
        const health = qty <= 0 ? 'Out of Stock' : qty <= Number(p.reorder_level || 2) ? 'Low Stock' : 'In Stock';
        return [
          p.item_code,
          p.name,
          p.category,
          p.wood_type,
          p.finish,
          qty,
          cost,
          price,
          totalCost,
          totalRetail,
          potProfit,
          health,
        ];
      });
      const totalCostVal = filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0), 0);
      const totalRetailVal = filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0), 0);
      const summaryRow = ['TOTALS', '', '', '', '', filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0), 0), '', '', totalCostVal, totalRetailVal, totalRetailVal - totalCostVal, ''];

      exportReportToCSV({
        filename: `DS_Furniture_Stock_Valuation_${Date.now()}`,
        reportTitle: 'Inventory Stock Valuation & Asset Report',
        headers,
        rows,
        summaryRow,
        metadata: meta,
      });
    } else if (activeReport === 'cash_flow') {
      const headers = [
        'Date',
        'Voucher / Ref No',
        'Particulars',
        'Category',
        'Center',
        'Cash Inflow (LKR)',
        'Cash Outflow (LKR)',
        'Handled By',
      ];
      const rows = filteredCashFlowData.map((c) => [
        c.date,
        c.ref_no,
        c.particulars,
        c.category,
        `${c.branch_code}/${c.center_code}`,
        c.inflow,
        c.outflow,
        c.handled_by,
      ]);
      const totalIn = filteredCashFlowData.reduce((s, c) => s + c.inflow, 0);
      const totalOut = filteredCashFlowData.reduce((s, c) => s + c.outflow, 0);
      const summaryRow = ['TOTALS', '', '', '', '', totalIn, totalOut, `Net: ${totalIn - totalOut}`];

      exportReportToCSV({
        filename: `DS_Furniture_Cash_Flow_${Date.now()}`,
        reportTitle: 'Daily Cash Flow & Drawer Ledger Report',
        headers,
        rows,
        summaryRow,
        metadata: meta,
      });
    } else if (activeReport === 'expenses_procurement') {
      const headers = [
        'Voucher No',
        'Date',
        'Category',
        'Payee / Supplier',
        'Center Hub',
        'Amount (LKR)',
        'Payment Method',
        'Notes & Details',
      ];
      const rows = filteredExpensesData.map((e) => [
        e.voucher_no,
        e.date,
        e.category,
        e.payee,
        `${e.branch_code}/${e.center_code}`,
        e.amount,
        e.payment_method,
        e.notes,
      ]);
      const totalExp = filteredExpensesData.reduce((s, e) => s + e.amount, 0);
      const summaryRow = ['TOTAL EXPENSES', '', '', '', '', totalExp, '', ''];

      exportReportToCSV({
        filename: `DS_Furniture_Expenses_${Date.now()}`,
        reportTitle: 'Workshop Procurement & Operating Expenses Report',
        headers,
        rows,
        summaryRow,
        metadata: meta,
      });
    } else if (activeReport === 'profit_margin') {
      const headers = [
        'Invoice No',
        'Date',
        'Customer Name',
        'Items Description',
        'Gross Revenue (LKR)',
        'Estimated COGS (LKR)',
        'Gross Profit (LKR)',
        'Gross Margin %',
        'Payment Method',
      ];
      const rows = filteredProfitData.map((p) => [
        p.invoice_no || p.contract_no || p.id,
        p.date,
        p.customer_name || 'Client',
        p.items_summary || p.item_name || 'Solid Wood Furniture',
        Number(p.gross_amount) || 0,
        Number(p.cogs) || 0,
        Number(p.gross_profit) || 0,
        `${p.margin_pct || 0}%`,
        p.payment_method || (p.payment_type === 'cash' ? 'Cash' : 'Installment Loan'),
      ]);
      const totalRev = filteredProfitData.reduce((s, p) => s + (Number(p.gross_amount) || 0), 0);
      const totalCOGS = filteredProfitData.reduce((s, p) => s + (Number(p.cogs) || 0), 0);
      const totalProfit = totalRev - totalCOGS;
      const overallMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0;
      const summaryRow = ['TOTALS', '', '', '', totalRev, totalCOGS, totalProfit, `${overallMargin}%`, ''];

      exportReportToCSV({
        filename: `DNS_Home_Solutions_Profit_Margins_${Date.now()}`,
        reportTitle: 'Gross Profit Margins & Cost Analysis Report',
        headers,
        rows,
        summaryRow,
        metadata: meta,
      });
    }
  };

  const handlePrintPDF = () => {
    if (activeReport === 'sales_revenue') {
      const totalGross = filteredSalesData.reduce((s, o) => s + o.gross_amount, 0);
      const totalAdv = filteredSalesData.reduce((s, o) => s + o.advance_paid, 0);
      const totalBal = filteredSalesData.reduce((s, o) => s + o.balance_due, 0);

      printReportToPDF({
        reportTitle: 'Sales Turnover & Revenue Audit Report',
        subtitle: 'Customer invoice transactions, advance collections, and pending balances',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Total Invoices', value: filteredSalesData.length, sub: 'Orders generated' },
          { label: 'Gross Revenue', value: formatLKR(totalGross), color: '#1E4D8C' },
          { label: 'Advances Collected', value: formatLKR(totalAdv), color: '#10B981' },
          { label: 'Pending Balances', value: formatLKR(totalBal), color: '#F59E0B' },
        ],
        tableHeaders: [
          { label: 'Invoice No' },
          { label: 'Date' },
          { label: 'Customer' },
          { label: 'Hub' },
          { label: 'Items' },
          { label: 'Gross (LKR)', align: 'right' },
          { label: 'Advance (LKR)', align: 'right' },
          { label: 'Balance (LKR)', align: 'right' },
          { label: 'Status', align: 'center' },
        ],
        tableRows: filteredSalesData.map((o) => [
          `<span style="font-family: monospace; font-weight: 700; color: #1E4D8C;">${o.invoice_no || o.contract_no || o.id}</span>`,
          formatDate(o.date),
          `<strong>${o.customer_name || 'Client'}</strong><br><span style="color: #64748B; font-size: 9px;">${o.customer_id || o.customer_nic || ''}</span>`,
          `${o.branch_code || 'MHG'}/${o.center_code || 'C001'}`,
          o.items_summary || o.item_name || 'Solid Wood Furniture',
          formatLKR(Number(o.gross_amount) || 0),
          formatLKR(Number(o.advance_paid) || 0),
          formatLKR(Number(o.balance_due) || 0),
          `<span style="font-weight: 700; color: ${(Number(o.balance_due) || 0) > 0 ? '#D97706' : '#10B981'};">${o.status || 'Active'}</span>`,
        ]),
        summaryCells: [
          'TOTALS',
          '',
          '',
          '',
          `${filteredSalesData.length} Orders`,
          formatLKR(totalGross),
          formatLKR(totalAdv),
          formatLKR(totalBal),
          '',
        ],
      });
    } else if (activeReport === 'outstanding_credit') {
      const totalBal = filteredOutstandingData.reduce((s, c) => s + (Number(c.outstanding_balance) || 0), 0);
      const withDebt = filteredOutstandingData.filter((c) => Number(c.outstanding_balance) > 0);
      const highRisk = filteredOutstandingData.filter((c) => Number(c.outstanding_balance) > 50000);

      printReportToPDF({
        reportTitle: 'Customer Credit Ledger & Outstanding Balances',
        subtitle: 'Unpaid delivery balances, credit limits, and collection status',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Total Outstanding Debt', value: formatLKR(totalBal), color: '#EF4444' },
          { label: 'Accounts with Debt', value: withDebt.length, sub: 'Active debtors' },
          { label: 'High Risk (> Rs. 50k)', value: highRisk.length, color: '#DC2626' },
          { label: 'Average Balance', value: formatLKR(withDebt.length ? Math.round(totalBal / withDebt.length) : 0) },
        ],
        tableHeaders: [
          { label: 'Customer ID' },
          { label: 'Customer Name' },
          { label: 'Phone' },
          { label: 'City' },
          { label: 'Total Spent (LKR)', align: 'right' },
          { label: 'Outstanding (LKR)', align: 'right' },
          { label: 'Risk Tier', align: 'center' },
        ],
        tableRows: filteredOutstandingData.map((c) => {
          const bal = Number(c.outstanding_balance) || 0;
          const isHigh = bal > 50000;
          return [
            `<span style="font-family: monospace; font-weight: 700;">${c.customer_id}</span>`,
            `<strong>${c.name}</strong>`,
            c.phone || '-',
            c.city || '-',
            formatLKR(c.total_spent || 0),
            `<strong style="color: ${bal > 0 ? '#DC2626' : '#10B981'};">${formatLKR(bal)}</strong>`,
            `<span style="font-weight: 700; color: ${isHigh ? '#DC2626' : bal > 0 ? '#D97706' : '#10B981'};">${isHigh ? 'High Risk' : bal > 0 ? 'Moderate' : 'Settled'}</span>`,
          ];
        }),
        summaryCells: ['TOTAL OUTSTANDING', '', '', '', '', formatLKR(totalBal), ''],
      });
    } else if (activeReport === 'inventory_valuation') {
      const totalCostVal = filteredInventoryData.reduce(
        (s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0),
        0
      );
      const totalRetailVal = filteredInventoryData.reduce(
        (s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0),
        0
      );
      const totalUnits = filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0), 0);

      printReportToPDF({
        reportTitle: 'Inventory Stock Valuation & Asset Report',
        subtitle: 'Showroom physical inventory, factory cost value vs. selling value',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Total Models', value: filteredInventoryData.length, sub: 'In catalog' },
          { label: 'Stock Units', value: totalUnits, sub: 'Finished furniture pieces' },
          { label: 'Total Cost Valuation', value: formatLKR(totalCostVal), color: '#1E4D8C' },
          { label: 'Total Retail Valuation', value: formatLKR(totalRetailVal), color: '#10B981' },
        ],
        tableHeaders: [
          { label: 'Code' },
          { label: 'Product Model' },
          { label: 'Category' },
          { label: 'Wood / Finish' },
          { label: 'Units', align: 'center' },
          { label: 'Unit Cost', align: 'right' },
          { label: 'Selling Price', align: 'right' },
          { label: 'Cost Valuation (LKR)', align: 'right' },
          { label: 'Retail Valuation (LKR)', align: 'right' },
        ],
        tableRows: filteredInventoryData.map((p) => {
          const qty = Number(p.stock_quantity) || 0;
          const cost = Number(p.cost_price) || 0;
          const price = Number(p.selling_price) || 0;
          return [
            `<span style="font-family: monospace; font-weight: 700;">${p.item_code}</span>`,
            `<strong>${p.name}</strong>`,
            p.category,
            `${p.wood_type} (${p.finish})`,
            qty,
            formatLKR(cost),
            formatLKR(price),
            formatLKR(qty * cost),
            formatLKR(qty * price),
          ];
        }),
        summaryCells: [
          'TOTALS',
          '',
          '',
          '',
          totalUnits,
          '',
          '',
          formatLKR(totalCostVal),
          formatLKR(totalRetailVal),
        ],
      });
    } else if (activeReport === 'cash_flow') {
      const totalIn = filteredCashFlowData.reduce((s, c) => s + c.inflow, 0);
      const totalOut = filteredCashFlowData.reduce((s, c) => s + c.outflow, 0);
      const netCash = totalIn - totalOut;

      printReportToPDF({
        reportTitle: 'Daily Cash Flow & Drawer Ledger Report',
        subtitle: 'Cash in hand, drawer transactions, and petty cash balancing',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Total Cash Inflow', value: formatLKR(totalIn), color: '#10B981' },
          { label: 'Total Cash Outflow', value: formatLKR(totalOut), color: '#EF4444' },
          { label: 'Net Cash Position', value: formatLKR(netCash), color: netCash >= 0 ? '#10B981' : '#EF4444' },
          { label: 'Transactions', value: filteredCashFlowData.length, sub: 'Logged entries' },
        ],
        tableHeaders: [
          { label: 'Date' },
          { label: 'Ref / Voucher' },
          { label: 'Particulars' },
          { label: 'Hub' },
          { label: 'Category' },
          { label: 'Cash In (LKR)', align: 'right' },
          { label: 'Cash Out (LKR)', align: 'right' },
        ],
        tableRows: filteredCashFlowData.map((c) => [
          formatDate(c.date),
          `<span style="font-family: monospace; font-weight: 700;">${c.ref_no}</span>`,
          c.particulars,
          `${c.branch_code}/${c.center_code}`,
          c.category,
          c.inflow > 0 ? `<strong style="color: #10B981;">+${formatLKR(c.inflow)}</strong>` : '-',
          c.outflow > 0 ? `<strong style="color: #EF4444;">-${formatLKR(c.outflow)}</strong>` : '-',
        ]),
        summaryCells: ['TOTALS', '', '', '', '', formatLKR(totalIn), formatLKR(totalOut)],
      });
    } else if (activeReport === 'expenses_procurement') {
      const totalExp = filteredExpensesData.reduce((s, e) => s + e.amount, 0);

      printReportToPDF({
        reportTitle: 'Workshop Procurement & Operating Expenses Report',
        subtitle: 'Timber log purchases, master carpenter wages, hardware, rent, and overheads',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Total Expenses', value: formatLKR(totalExp), color: '#EF4444' },
          { label: 'Expense Vouchers', value: filteredExpensesData.length, sub: 'Paid payment vouchers' },
          {
            label: 'Timber Procurement',
            value: formatLKR(
              filteredExpensesData
                .filter((e) => e.category === 'Timber Procurement')
                .reduce((s, e) => s + e.amount, 0)
            ),
          },
          {
            label: 'Carpenter Labor',
            value: formatLKR(
              filteredExpensesData
                .filter((e) => e.category === 'Carpenter Labor Wages')
                .reduce((s, e) => s + e.amount, 0)
            ),
          },
        ],
        tableHeaders: [
          { label: 'Voucher No' },
          { label: 'Date' },
          { label: 'Category' },
          { label: 'Payee / Supplier' },
          { label: 'Hub' },
          { label: 'Payment Method' },
          { label: 'Amount (LKR)', align: 'right' },
        ],
        tableRows: filteredExpensesData.map((e) => [
          `<span style="font-family: monospace; font-weight: 700;">${e.voucher_no}</span>`,
          formatDate(e.date),
          `<strong>${e.category}</strong>`,
          `${e.payee}<br><span style="color: #64748B; font-size: 9px;">${e.notes}</span>`,
          `${e.branch_code}/${e.center_code}`,
          e.payment_method,
          `<strong style="color: #EF4444;">${formatLKR(e.amount)}</strong>`,
        ]),
        summaryCells: ['TOTAL EXPENSES', '', '', '', '', '', formatLKR(totalExp)],
      });
    } else if (activeReport === 'profit_margin') {
      const totalRev = filteredProfitData.reduce((s, p) => s + p.gross_amount, 0);
      const totalCOGS = filteredProfitData.reduce((s, p) => s + p.cogs, 0);
      const totalProfit = totalRev - totalCOGS;
      const overallMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0;

      printReportToPDF({
        reportTitle: 'Gross Profit Margins & Cost Analysis Report',
        subtitle: 'Revenue generated vs. manufacturing material and carpentry labor costs',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Total Revenue', value: formatLKR(totalRev), color: '#1E4D8C' },
          { label: 'Estimated COGS', value: formatLKR(totalCOGS), color: '#D97706' },
          { label: 'Gross Profit', value: formatLKR(totalProfit), color: '#10B981' },
          { label: 'Overall Margin %', value: `${overallMargin}%`, color: '#9333EA' },
        ],
        tableHeaders: [
          { label: 'Invoice No' },
          { label: 'Date' },
          { label: 'Customer' },
          { label: 'Furniture Item' },
          { label: 'Revenue (LKR)', align: 'right' },
          { label: 'COGS (LKR)', align: 'right' },
          { label: 'Gross Profit (LKR)', align: 'right' },
          { label: 'Margin %', align: 'center' },
        ],
        tableRows: filteredProfitData.map((p) => [
          `<span style="font-family: monospace; font-weight: 700;">${p.invoice_no || p.contract_no || p.id}</span>`,
          formatDate(p.date),
          p.customer_name || 'Client',
          p.items_summary || p.item_name || 'Solid Wood Furniture',
          formatLKR(Number(p.gross_amount) || 0),
          formatLKR(Number(p.cogs) || 0),
          `<strong style="color: #10B981;">${formatLKR(Number(p.gross_profit) || 0)}</strong>`,
          `<strong>${p.margin_pct || 0}%</strong>`,
        ]),
        summaryCells: [
          'TOTALS',
          '',
          '',
          '',
          formatLKR(totalRev),
          formatLKR(totalCOGS),
          formatLKR(totalProfit),
          `${overallMargin}%`,
        ],
      });
    }
  };

  // =========================================================
  // 3. RENDER ACTIVE STAT CARDS
  // =========================================================

  const renderActiveStatCards = () => {
    if (activeReport === 'sales_revenue') {
      const totalGross = filteredSalesData.reduce((s, o) => s + o.gross_amount, 0);
      const totalAdv = filteredSalesData.reduce((s, o) => s + o.advance_paid, 0);
      const totalBal = filteredSalesData.reduce((s, o) => s + o.balance_due, 0);

      return (
        <div className="stats-grid">
          <StatCard
            title="Total Invoiced Sales"
            value={formatLKR(totalGross)}
            subtitle={`${filteredSalesData.length} generated sales order(s)`}
            icon={BarChart3}
            color="var(--primary)"
            bg="var(--primary-tint)"
          />
          <StatCard
            title="Advances Collected"
            value={formatLKR(totalAdv)}
            subtitle="Cash and bank deposits received"
            icon={CheckCircle}
            color="var(--success)"
            bg="var(--success-tint)"
          />
          <StatCard
            title="Outstanding Balances"
            value={formatLKR(totalBal)}
            subtitle="Customer credit due upon delivery"
            icon={AlertTriangle}
            color="var(--warning)"
            bg="var(--warning-tint)"
          />
          <StatCard
            title="Average Order Value"
            value={formatLKR(filteredSalesData.length ? Math.round(totalGross / filteredSalesData.length) : 0)}
            subtitle="Per client furniture order"
            icon={TrendingUp}
            color="var(--accent)"
            bg="var(--accent-tint)"
          />
        </div>
      );
    }

    if (activeReport === 'outstanding_credit') {
      const totalBal = filteredOutstandingData.reduce((s, c) => s + (Number(c.outstanding_balance) || 0), 0);
      const withDebt = filteredOutstandingData.filter((c) => Number(c.outstanding_balance) > 0);
      const highRisk = filteredOutstandingData.filter((c) => Number(c.outstanding_balance) > 50000);

      return (
        <div className="stats-grid">
          <StatCard
            title="Total Outstanding Debt"
            value={formatLKR(totalBal)}
            subtitle={`${withDebt.length} client(s) with pending credit`}
            icon={AlertTriangle}
            color="var(--danger, #EF4444)"
            bg="rgba(239, 68, 68, 0.12)"
          />
          <StatCard
            title="High Risk Debtors"
            value={highRisk.length}
            subtitle="Outstanding balance > Rs. 50,000"
            icon={Clock}
            color="var(--warning)"
            bg="var(--warning-tint)"
          />
          <StatCard
            title="Total Filtered Clients"
            value={filteredOutstandingData.length}
            subtitle="Registered in customer directory"
            icon={Building2}
            color="var(--primary)"
            bg="var(--primary-tint)"
          />
          <StatCard
            title="Average Pending Balance"
            value={formatLKR(withDebt.length ? Math.round(totalBal / withDebt.length) : 0)}
            subtitle="Per active debtor"
            icon={Banknote}
            color="var(--accent)"
            bg="var(--accent-tint)"
          />
        </div>
      );
    }

    if (activeReport === 'inventory_valuation') {
      const totalCostVal = filteredInventoryData.reduce(
        (s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0),
        0
      );
      const totalRetailVal = filteredInventoryData.reduce(
        (s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0),
        0
      );
      const totalUnits = filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0), 0);

      return (
        <div className="stats-grid">
          <StatCard
            title="Finished Models"
            value={filteredInventoryData.length}
            subtitle={`${totalUnits} physical units in stock`}
            icon={Package}
            color="var(--primary)"
            bg="var(--primary-tint)"
          />
          <StatCard
            title="Total Cost Valuation"
            value={formatLKR(totalCostVal)}
            subtitle="Timber and carpentry factory cost"
            icon={Banknote}
            color="var(--accent)"
            bg="var(--accent-tint)"
          />
          <StatCard
            title="Total Retail Valuation"
            value={formatLKR(totalRetailVal)}
            subtitle="Showroom selling price value"
            icon={CheckCircle}
            color="var(--success)"
            bg="var(--success-tint)"
          />
          <StatCard
            title="Potential Profit"
            value={formatLKR(totalRetailVal - totalCostVal)}
            subtitle="Unrealized gross profit margin"
            icon={TrendingUp}
            color="#9333EA"
            bg="rgba(147, 51, 234, 0.12)"
          />
        </div>
      );
    }

    if (activeReport === 'cash_flow') {
      const totalIn = filteredCashFlowData.reduce((s, c) => s + c.inflow, 0);
      const totalOut = filteredCashFlowData.reduce((s, c) => s + c.outflow, 0);
      const netCash = totalIn - totalOut;

      return (
        <div className="stats-grid">
          <StatCard
            title="Cash Drawer Inflow"
            value={formatLKR(totalIn)}
            subtitle="Cash sales and customer deposits"
            icon={ArrowDownRight}
            color="var(--success)"
            bg="var(--success-tint)"
          />
          <StatCard
            title="Cash Drawer Outflow"
            value={formatLKR(totalOut)}
            subtitle="Cash purchases and wage vouchers"
            icon={ArrowUpRight}
            color="var(--danger, #EF4444)"
            bg="rgba(239, 68, 68, 0.12)"
          />
          <StatCard
            title="Net Cash Position"
            value={formatLKR(netCash)}
            subtitle="Inflow minus cash expenses"
            icon={Banknote}
            color={netCash >= 0 ? 'var(--success)' : 'var(--danger, #EF4444)'}
            bg={netCash >= 0 ? 'var(--success-tint)' : 'rgba(239, 68, 68, 0.12)'}
          />
          <StatCard
            title="Cash Transactions"
            value={filteredCashFlowData.length}
            subtitle="Logged cash register events"
            icon={CheckCircle}
            color="var(--primary)"
            bg="var(--primary-tint)"
          />
        </div>
      );
    }

    if (activeReport === 'expenses_procurement') {
      const totalExp = filteredExpensesData.reduce((s, e) => s + e.amount, 0);
      const timberExp = filteredExpensesData
        .filter((e) => e.category === 'Timber Procurement')
        .reduce((s, e) => s + e.amount, 0);
      const wageExp = filteredExpensesData
        .filter((e) => e.category === 'Carpenter Labor Wages')
        .reduce((s, e) => s + e.amount, 0);

      return (
        <div className="stats-grid">
          <StatCard
            title="Total Operating Expenses"
            value={formatLKR(totalExp)}
            subtitle={`${filteredExpensesData.length} payment vouchers paid`}
            icon={Hammer}
            color="var(--danger, #EF4444)"
            bg="rgba(239, 68, 68, 0.12)"
          />
          <StatCard
            title="Timber & Raw Materials"
            value={formatLKR(timberExp)}
            subtitle="Teak and mahogany log procurement"
            icon={Package}
            color="var(--primary)"
            bg="var(--primary-tint)"
          />
          <StatCard
            title="Carpenter Wages"
            value={formatLKR(wageExp)}
            subtitle="Piece-rate & workshop labor pay"
            icon={Banknote}
            color="var(--warning)"
            bg="var(--warning-tint)"
          />
          <StatCard
            title="Store Overheads & Rent"
            value={formatLKR(totalExp - timberExp - wageExp)}
            subtitle="Rent, transport, lacquer and hardware"
            icon={Building2}
            color="var(--accent)"
            bg="var(--accent-tint)"
          />
        </div>
      );
    }

    if (activeReport === 'profit_margin') {
      const totalRev = filteredProfitData.reduce((s, p) => s + p.gross_amount, 0);
      const totalCOGS = filteredProfitData.reduce((s, p) => s + p.cogs, 0);
      const totalProfit = totalRev - totalCOGS;
      const overallMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0;

      return (
        <div className="stats-grid">
          <StatCard
            title="Gross Revenue"
            value={formatLKR(totalRev)}
            subtitle={`${filteredProfitData.length} completed furniture sales`}
            icon={BarChart3}
            color="var(--primary)"
            bg="var(--primary-tint)"
          />
          <StatCard
            title="Estimated COGS"
            value={formatLKR(totalCOGS)}
            subtitle="Timber, lacquer, and labor cost"
            icon={Hammer}
            color="var(--warning)"
            bg="var(--warning-tint)"
          />
          <StatCard
            title="Gross Profit"
            value={formatLKR(totalProfit)}
            subtitle="Revenue minus production cost"
            icon={CheckCircle}
            color="var(--success)"
            bg="var(--success-tint)"
          />
          <StatCard
            title="Overall Margin"
            value={`${overallMargin}%`}
            subtitle="Average gross profit margin"
            icon={TrendingUp}
            color="#9333EA"
            bg="rgba(147, 51, 234, 0.12)"
          />
        </div>
      );
    }

    return null;
  };

  // =========================================================
  // 4. RENDER DATA TABLE ACCORDING TO ACTIVE REPORT
  // =========================================================

  const renderActiveTable = () => {
    // 1. Sales & Revenue Table
    if (activeReport === 'sales_revenue') {
      const totalGross = filteredSalesData.reduce((s, o) => s + o.gross_amount, 0);
      const totalAdv = filteredSalesData.reduce((s, o) => s + o.advance_paid, 0);
      const totalBal = filteredSalesData.reduce((s, o) => s + o.balance_due, 0);

      return (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Invoice No</th>
              <th style={{ width: '100px' }}>Date</th>
              <th style={{ minWidth: '180px' }}>Customer & ID</th>
              <th style={{ width: '110px' }}>Hub</th>
              <th style={{ minWidth: '220px' }}>Items Description</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Gross Amount</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Advance Paid</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Balance Due</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Payment Mode</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredSalesData.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No sales invoice records match the selected date and center filters.
                </td>
              </tr>
            ) : (
              filteredSalesData.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    {o.invoice_no || o.contract_no || o.id}
                  </td>
                  <td>{formatDate(o.date)}</td>
                  <td>
                    <strong>{o.customer_name || 'Client'}</strong>
                    <br />
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{o.customer_id || o.customer_nic || ''}</span>
                  </td>
                  <td>
                    <span className="badge-showroom" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>
                      {o.branch_code || 'MHG'}/{o.center_code || 'C001'}
                    </span>
                  </td>
                  <td>{o.items_summary || o.item_name || 'Solid Wood Furniture'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatLKR(Number(o.gross_amount) || 0)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                    {formatLKR(Number(o.advance_paid) || 0)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: (Number(o.balance_due) || 0) > 0 ? 'var(--warning)' : 'var(--text-muted)',
                    }}
                  >
                    {formatLKR(Number(o.balance_due) || 0)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      💳 {o.payment_method || (o.payment_type === 'cash' ? 'Cash' : 'Installment')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: (Number(o.balance_due) || 0) === 0 ? 'var(--success-tint)' : 'var(--warning-tint)',
                        color: (Number(o.balance_due) || 0) === 0 ? 'var(--success)' : 'var(--warning)',
                      }}
                    >
                      {o.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredSalesData.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--ash-50)', fontWeight: 800 }}>
                <td colSpan={5} style={{ textAlign: 'right', textTransform: 'uppercase' }}>
                  Summary Total ({filteredSalesData.length} Invoices):
                </td>
                <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{formatLKR(totalGross)}</td>
                <td style={{ textAlign: 'right', color: 'var(--success)' }}>{formatLKR(totalAdv)}</td>
                <td style={{ textAlign: 'right', color: 'var(--warning)' }}>{formatLKR(totalBal)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    // 2. Outstanding Balances Table
    if (activeReport === 'outstanding_credit') {
      const totalBal = filteredOutstandingData.reduce((s, c) => s + (Number(c.outstanding_balance) || 0), 0);

      return (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '150px' }}>Customer ID</th>
              <th style={{ minWidth: '180px' }}>Client Name</th>
              <th style={{ width: '120px' }}>Contact Phone</th>
              <th style={{ width: '120px' }}>NIC</th>
              <th style={{ width: '110px' }}>City</th>
              <th style={{ width: '110px' }}>Center Hub</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Total Spent</th>
              <th style={{ width: '140px', textAlign: 'right' }}>Outstanding Balance</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Credit Risk Tier</th>
            </tr>
          </thead>
          <tbody>
            {filteredOutstandingData.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No customer credit records found matching the active filter.
                </td>
              </tr>
            ) : (
              filteredOutstandingData.map((c) => {
                const bal = Number(c.outstanding_balance) || 0;
                const isHigh = bal > 50000;
                return (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.customer_id}</td>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.nic || '-'}</td>
                    <td>{c.city || '-'}</td>
                    <td>
                      <span className="badge-showroom" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>
                        {c.branch_code || 'MHG'}/{c.center_code || 'C001'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatLKR(c.total_spent || 0)}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: bal > 0 ? 'var(--danger, #EF4444)' : 'var(--success)',
                      }}
                    >
                      {formatLKR(bal)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isHigh
                            ? 'rgba(239, 68, 68, 0.12)'
                            : bal > 0
                            ? 'var(--warning-tint)'
                            : 'var(--success-tint)',
                          color: isHigh
                            ? 'var(--danger, #EF4444)'
                            : bal > 0
                            ? 'var(--warning)'
                            : 'var(--success)',
                        }}
                      >
                        {isHigh ? '⚠️ High Risk (>50k)' : bal > 0 ? '🟡 Moderate Risk' : '✅ Settled'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredOutstandingData.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--ash-50)', fontWeight: 800 }}>
                <td colSpan={7} style={{ textAlign: 'right', textTransform: 'uppercase' }}>
                  Total Outstanding Balance Across Clients:
                </td>
                <td style={{ textAlign: 'right', color: 'var(--danger, #EF4444)' }}>{formatLKR(totalBal)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    // 3. Inventory & Stock Valuation Table
    if (activeReport === 'inventory_valuation') {
      const totalCostVal = filteredInventoryData.reduce(
        (s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0),
        0
      );
      const totalRetailVal = filteredInventoryData.reduce(
        (s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0),
        0
      );

      return (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Item Code</th>
              <th style={{ minWidth: '220px' }}>Product Model</th>
              <th style={{ width: '120px' }}>Category</th>
              <th style={{ width: '140px' }}>Wood / Material</th>
              <th style={{ width: '90px', textAlign: 'center' }}>In Stock</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Unit Cost</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Unit Price</th>
              <th style={{ width: '140px', textAlign: 'right' }}>Cost Valuation</th>
              <th style={{ width: '140px', textAlign: 'right' }}>Retail Valuation</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Stock Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventoryData.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No inventory models found in database.
                </td>
              </tr>
            ) : (
              filteredInventoryData.map((p) => {
                const qty = Number(p.stock_quantity) || 0;
                const cost = Number(p.cost_price) || 0;
                const price = Number(p.selling_price) || 0;
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      {p.item_code}
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                      <br />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.finish}</span>
                    </td>
                    <td>
                      <span className="badge-wholesale" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>
                        {p.category}
                      </span>
                    </td>
                    <td>{p.wood_type}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{qty}</td>
                    <td style={{ textAlign: 'right' }}>{formatLKR(cost)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatLKR(price)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{formatLKR(qty * cost)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                      {formatLKR(qty * price)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background:
                            qty <= 0
                              ? 'rgba(239, 68, 68, 0.12)'
                              : qty <= Number(p.reorder_level || 2)
                              ? 'var(--warning-tint)'
                              : 'var(--success-tint)',
                          color:
                            qty <= 0
                              ? 'var(--danger, #EF4444)'
                              : qty <= Number(p.reorder_level || 2)
                              ? 'var(--warning)'
                              : 'var(--success)',
                        }}
                      >
                        {qty <= 0 ? 'Out of Stock' : qty <= Number(p.reorder_level || 2) ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredInventoryData.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--ash-50)', fontWeight: 800 }}>
                <td colSpan={7} style={{ textAlign: 'right', textTransform: 'uppercase' }}>
                  Total Inventory Asset Valuation:
                </td>
                <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{formatLKR(totalCostVal)}</td>
                <td style={{ textAlign: 'right', color: 'var(--success)' }}>{formatLKR(totalRetailVal)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    // 4. Daily Cash Flow & Drawer Ledger Table
    if (activeReport === 'cash_flow') {
      const totalIn = filteredCashFlowData.reduce((s, c) => s + c.inflow, 0);
      const totalOut = filteredCashFlowData.reduce((s, c) => s + c.outflow, 0);

      return (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Date</th>
              <th style={{ width: '130px' }}>Ref / Voucher</th>
              <th style={{ minWidth: '260px' }}>Particulars / Description</th>
              <th style={{ width: '110px' }}>Hub</th>
              <th style={{ width: '150px' }}>Category</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Cash Inflow</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Cash Outflow</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Handled By</th>
            </tr>
          </thead>
          <tbody>
            {filteredCashFlowData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No cash drawer entries recorded for this filter range.
                </td>
              </tr>
            ) : (
              filteredCashFlowData.map((c) => (
                <tr key={c.id}>
                  <td>{formatDate(c.date)}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    {c.ref_no}
                  </td>
                  <td>{c.particulars}</td>
                  <td>
                    <span className="badge-showroom" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>
                      {c.branch_code}/{c.center_code}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{c.category}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                    {c.inflow > 0 ? `+${formatLKR(c.inflow)}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger, #EF4444)' }}>
                    {c.outflow > 0 ? `-${formatLKR(c.outflow)}` : '-'}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {c.handled_by}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredCashFlowData.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--ash-50)', fontWeight: 800 }}>
                <td colSpan={5} style={{ textAlign: 'right', textTransform: 'uppercase' }}>
                  Cash Inflow vs Outflow Totals:
                </td>
                <td style={{ textAlign: 'right', color: 'var(--success)' }}>+{formatLKR(totalIn)}</td>
                <td style={{ textAlign: 'right', color: 'var(--danger, #EF4444)' }}>-{formatLKR(totalOut)}</td>
                <td style={{ textAlign: 'center', color: totalIn >= totalOut ? 'var(--success)' : 'var(--danger, #EF4444)' }}>
                  Net: {formatLKR(totalIn - totalOut)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    // 5. Operating Expenses & Workshop Procurement Table
    if (activeReport === 'expenses_procurement') {
      const totalExp = filteredExpensesData.reduce((s, e) => s + e.amount, 0);

      return (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Voucher No</th>
              <th style={{ width: '100px' }}>Date</th>
              <th style={{ width: '180px' }}>Category</th>
              <th style={{ minWidth: '220px' }}>Payee / Supplier</th>
              <th style={{ width: '110px' }}>Hub</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Payment Mode</th>
              <th style={{ width: '140px', textAlign: 'right' }}>Amount Paid</th>
              <th style={{ minWidth: '200px' }}>Notes & Purpose</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpensesData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No workshop expenses recorded for the selected filter period.
                </td>
              </tr>
            ) : (
              filteredExpensesData.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--danger, #EF4444)' }}>
                    {e.voucher_no}
                  </td>
                  <td>{formatDate(e.date)}</td>
                  <td>
                    <span className="badge-custom" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>
                      {e.category}
                    </span>
                  </td>
                  <td>
                    <strong>{e.payee}</strong>
                  </td>
                  <td>
                    <span className="badge-showroom" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>
                      {e.branch_code}/{e.center_code}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                    {e.payment_method}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger, #EF4444)' }}>
                    {formatLKR(e.amount)}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.notes}</td>
                </tr>
              ))
            )}
          </tbody>
          {filteredExpensesData.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--ash-50)', fontWeight: 800 }}>
                <td colSpan={6} style={{ textAlign: 'right', textTransform: 'uppercase' }}>
                  Total Expenses Incurred:
                </td>
                <td style={{ textAlign: 'right', color: 'var(--danger, #EF4444)' }}>{formatLKR(totalExp)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    // 6. Profit & Loss / Margin Table
    if (activeReport === 'profit_margin') {
      const totalRev = filteredProfitData.reduce((s, p) => s + p.gross_amount, 0);
      const totalCOGS = filteredProfitData.reduce((s, p) => s + p.cogs, 0);
      const totalProfit = totalRev - totalCOGS;
      const overallMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0;

      return (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Invoice No</th>
              <th style={{ width: '100px' }}>Date</th>
              <th style={{ minWidth: '180px' }}>Client</th>
              <th style={{ minWidth: '220px' }}>Furniture Line</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Revenue (LKR)</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Estimated COGS</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Gross Profit</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Margin %</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Payment Mode</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfitData.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No sales data available to calculate profit margins.
                </td>
              </tr>
            ) : (
              filteredProfitData.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    {p.invoice_no || p.contract_no || p.id}
                  </td>
                  <td>{formatDate(p.date)}</td>
                  <td>{p.customer_name || 'Client'}</td>
                  <td>{p.items_summary || p.item_name || 'Solid Wood Furniture'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatLKR(Number(p.gross_amount) || 0)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--warning)', fontWeight: 600 }}>
                    {formatLKR(Number(p.cogs) || 0)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                    {formatLKR(Number(p.gross_profit) || 0)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: (Number(p.margin_pct) || 0) >= 30 ? 'var(--success-tint)' : 'var(--warning-tint)',
                        color: (Number(p.margin_pct) || 0) >= 30 ? 'var(--success)' : 'var(--warning)',
                      }}
                    >
                      {p.margin_pct || 0}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                    {p.payment_method || (p.payment_type === 'cash' ? 'Cash' : 'Installment')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredProfitData.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--ash-50)', fontWeight: 800 }}>
                <td colSpan={4} style={{ textAlign: 'right', textTransform: 'uppercase' }}>
                  Total Profitability Summary:
                </td>
                <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{formatLKR(totalRev)}</td>
                <td style={{ textAlign: 'right', color: 'var(--warning)' }}>{formatLKR(totalCOGS)}</td>
                <td style={{ textAlign: 'right', color: 'var(--success)' }}>{formatLKR(totalProfit)}</td>
                <td style={{ textAlign: 'center', color: '#9333EA' }}>{overallMargin}%</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    return null;
  };

  const activeReportObj = REPORT_TYPES.find((r) => r.id === activeReport) || REPORT_TYPES[0];

  return (
    <div className="reports-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* =========================================================
          1. REPORT SELECTOR SEGMENTED HEADER BAR
          ========================================================= */}
      <div
        className="filter-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
              Management Reports & Analytics Hub
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Comprehensive operational audits, sales turnover, customer credit ledger, and stock valuation
            </p>
          </div>

          {/* Action Export Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              title="Download structured CSV file (compatible with Excel & Sheets)"
              style={{ padding: '8px 14px', fontSize: '0.84rem', gap: '6px' }}
            >
              <FileSpreadsheet size={16} color="var(--success)" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrintPDF}
              title="Download or Print high-resolution corporate PDF report"
              style={{ padding: '8px 16px', fontSize: '0.84rem', gap: '6px' }}
            >
              <Printer size={16} />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '8px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px',
          }}
        >
          {REPORT_TYPES.map((rep) => {
            const isActive = activeReport === rep.id;
            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => setActiveReport(rep.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: isActive ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: isActive ? 'var(--primary-tint)' : 'var(--card-bg)',
                  color: isActive ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isActive ? 'var(--primary)' : 'var(--ash-100)',
                    color: isActive ? '#FFFFFF' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {rep.id === 'sales_revenue' && <BarChart3 size={17} />}
                  {rep.id === 'outstanding_credit' && <AlertTriangle size={17} />}
                  {rep.id === 'inventory_valuation' && <Package size={17} />}
                  {rep.id === 'cash_flow' && <Banknote size={17} />}
                  {rep.id === 'expenses_procurement' && <Hammer size={17} />}
                  {rep.id === 'profit_margin' && <TrendingUp size={17} />}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {rep.label}
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontWeight: 600,
                    }}
                  >
                    {rep.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================
          2. FILTER & SEARCH CONTROL TOOLBAR
          ========================================================= */}
      <div className="filter-card">
        {/* Row 1: Search + Center + Reset */}
        <div className="filter-row-top">
          <div className="filter-search-box">
            <Search className="filter-search-icon" size={17} />
            <input
              type="text"
              className="filter-search-input"
              placeholder={`Search in ${activeReportObj.label} by invoice, client, items, or ref...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="filter-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear Search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="filter-actions-group">
            {/* Regional Center Hub Selector */}
            <select
              className="filter-select"
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              title="Filter report by distribution center hub"
              style={{ minWidth: '220px' }}
            >
              <option value="all">🌐 All Centers (Island-Wide)</option>
              {centers.map((c) => {
                const key = `${c.branch_code?.toUpperCase()}/${formatCenterCode(c.center_code)}`;
                return (
                  <option key={c.id} value={key}>
                    📍 {c.branch_code}/{formatCenterCode(c.center_code)} — {c.name}
                  </option>
                );
              })}
            </select>

            {/* Reset Button */}
            {isAnyFilterActive && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetFilters}
                title="Clear all date, center, and search filters"
                style={{ padding: '8px 12px', fontSize: '0.82rem' }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Date Range Quick Chips & Custom Dates */}
        <div className="filter-row-chips" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
          <div className="filter-chips-list">
            <span className="filter-chips-label">Period:</span>

            <button
              type="button"
              className={`filter-chip-btn ${datePreset === 'all' ? 'active' : ''}`}
              onClick={() => setDatePreset('all')}
            >
              All Time
            </button>
            <button
              type="button"
              className={`filter-chip-btn ${datePreset === 'today' ? 'active' : ''}`}
              onClick={() => setDatePreset('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`filter-chip-btn ${datePreset === 'week' ? 'active' : ''}`}
              onClick={() => setDatePreset('week')}
            >
              This Week
            </button>
            <button
              type="button"
              className={`filter-chip-btn ${datePreset === 'month' ? 'active' : ''}`}
              onClick={() => setDatePreset('month')}
            >
              This Month
            </button>
            <button
              type="button"
              className={`filter-chip-btn ${datePreset === 'quarter' ? 'active' : ''}`}
              onClick={() => setDatePreset('quarter')}
            >
              This Quarter
            </button>
            <button
              type="button"
              className={`filter-chip-btn ${datePreset === 'ytd' ? 'active' : ''}`}
              onClick={() => setDatePreset('ytd')}
            >
              Year to Date
            </button>
            <button
              type="button"
              className={`filter-chip-btn ${datePreset === 'custom' ? 'active' : ''}`}
              onClick={() => setDatePreset('custom')}
            >
              Custom Range
            </button>

            {/* Custom Date Pickers */}
            {datePreset === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Active: <strong>{currentDateRangeLabel}</strong>
          </div>
        </div>
      </div>

      {/* =========================================================
          3. DYNAMIC STAT CARDS FOR ACTIVE REPORT
          ========================================================= */}
      {renderActiveStatCards()}

      {/* =========================================================
          4. MAIN REPORT DATA TABLE
          ========================================================= */}
      <div className="table-wrapper">
        <div
          className="table-header-bar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {activeReportObj.label} Report Ledger
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Filtered by: {currentCenterLabel} • {currentDateRangeLabel}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleExportCSV}
              style={{ padding: '6px 12px', fontSize: '0.76rem', gap: '5px' }}
            >
              <Download size={13} /> Download CSV
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handlePrintPDF}
              style={{ padding: '6px 12px', fontSize: '0.76rem', gap: '5px' }}
            >
              <Printer size={13} /> Print PDF
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {renderActiveTable()}
        </div>
      </div>
    </div>
  );
}
