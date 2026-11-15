import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Package,
  TrendingUp,
  Wallet,
  CreditCard,
  Download,
  Printer,
  Search,
  RotateCcw,
  Building2,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  X,
  Eye,
  LayoutGrid,
  List,
  Calendar,
  Layers,
  Phone,
  FileText,
  User,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Hammer,
  Share2,
  SlidersHorizontal,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { formatLKR, formatDate, formatDateTime } from '../utils/formatters';
import { formatCenterCode } from '../utils/centersData';
import { INITIAL_PRODUCTS } from '../utils/productUtils';
import { loadSavedPayments, sanitizeOrphanedPayments } from '../utils/paymentsData';
import {
  REPORT_TYPES,
  loadAllOrders,
  loadAllExpenses,
  exportReportToCSV,
  printReportToPDF,
  aggregateDailyProfits,
  aggregateMonthlyProfits,
  aggregateYearlyProfits,
  aggregateCashCollections,
} from '../utils/reportsData';
import { apiRequest } from '../services/api';

// Helper: Extract Initials from Customer Name
const getInitials = (name) => {
  if (!name) return 'DS';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function ReportsPage({
  initialReportType = 'sales_revenue',
  selectedCenter = 'all',
  centers = [],
  onNavigate = null,
}) {
  const getValidReport = (type) => {
    return ['sales_revenue', 'profit_margin', 'cash_collection', 'inventory_valuation'].includes(type)
      ? type
      : 'sales_revenue';
  };

  // Active Report Type State
  const [activeReport, setActiveReport] = useState(() => getValidReport(initialReportType));

  // Sub-tabs for Profit Report: 'daily' | 'monthly' | 'yearly' | 'orders'
  const [profitPeriodTab, setProfitPeriodTab] = useState('daily');

  // Sub-tabs for Cash Collection Report: 'receipts' | 'daily' | 'centers' | 'methods'
  const [cashCollectionSubTab, setCashCollectionSubTab] = useState('receipts');

  // View Mode: 'table' | 'cards'
  const [viewMode, setViewMode] = useState('table');

  // Active Selected Record for Detail Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Sync active report if initialReportType changes (e.g. from sidebar clicks)
  useEffect(() => {
    if (initialReportType) {
      setActiveReport(getValidReport(initialReportType));
    }
  }, [initialReportType]);

  // Filter States
  const [datePreset, setDatePreset] = useState('all'); // 'all', 'today', 'yesterday', 'week', 'month', 'quarter', 'ytd', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [centerFilter, setCenterFilter] = useState(selectedCenter || 'all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all'); // 'all', 'Cash', 'Bank Transfer', 'Online Deposit', 'Cheque'
  const [searchQuery, setSearchQuery] = useState('');

  // Sync center filter if selectedCenter prop changes
  useEffect(() => {
    if (selectedCenter) {
      setCenterFilter(selectedCenter);
    }
  }, [selectedCenter]);

  // Sourced Data from LocalStorage & APIs with real-time updates
  const [orders, setOrders] = useState(() => loadAllOrders());
  const [payments, setPayments] = useState(() => loadSavedPayments());
  const [expenses, setExpenses] = useState(() => loadAllExpenses());

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

  // Sync fresh data from API / Supabase on mount and listen to storage events
  useEffect(() => {
    let isMounted = true;

    // Fetch live orders
    apiRequest('/orders')
      .then((res) => {
        if (!isMounted) return;
        const fetchedList = Array.isArray(res) ? res : res && Array.isArray(res.data) ? res.data : null;
        if (fetchedList && fetchedList.length > 0) {
          setOrders((prev) => {
            const dbIds = new Set(fetchedList.map((d) => d.id));
            const localOnly = prev.filter((p) => !dbIds.has(p.id));
            return [...fetchedList, ...localOnly];
          });
        }
      })
      .catch((e) => console.warn('Reports orders API sync notice:', e));

    // Fetch live payments
    apiRequest('/payments')
      .then((res) => {
        if (!isMounted) return;
        const fetchedPayments = Array.isArray(res) ? res : res && Array.isArray(res.data) ? res.data : null;
        if (fetchedPayments && fetchedPayments.length > 0) {
          setPayments((prev) => {
            const dbIds = new Set(fetchedPayments.map((d) => d.id));
            const localOnly = prev.filter((p) => !dbIds.has(p.id));
            const merged = [...fetchedPayments, ...localOnly];
            return sanitizeOrphanedPayments(merged, loadAllOrders());
          });
        }
      })
      .catch((e) => console.warn('Reports payments API sync notice:', e));

    // Real-time synchronization event listeners
    const handleStorage = () => {
      setOrders(loadAllOrders());
      setPayments(loadSavedPayments());
      setExpenses(loadAllExpenses());
      try {
        const savedP = localStorage.getItem('dnd_products_list');
        if (savedP) {
          const parsedP = JSON.parse(savedP);
          if (Array.isArray(parsedP) && parsedP.length > 0) setProducts(parsedP);
        }
      } catch {}
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('dnd_orders_updated', handleStorage);
    window.addEventListener('dnd_payments_updated', handleStorage);
    window.addEventListener('dnd_customers_updated', handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('dnd_orders_updated', handleStorage);
      window.removeEventListener('dnd_payments_updated', handleStorage);
      window.removeEventListener('dnd_customers_updated', handleStorage);
    };
  }, []);

  // Quick Date Presets Handler
  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      setStartDate(monday.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const firstDayQ = new Date(now.getFullYear(), currentQuarter * 3, 1);
      setStartDate(firstDayQ.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'ytd') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      setStartDate(firstDayYear.toISOString().slice(0, 10));
      setEndDate(todayStr);
    }
  };

  // Calculate Date Boundaries
  const dateRangeBounds = useMemo(() => {
    if (startDate || endDate) {
      return { start: startDate, end: endDate };
    }
    return { start: '', end: '' };
  }, [startDate, endDate]);

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

  // Reset all filters
  const handleResetFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setCenterFilter('all');
    setPaymentMethodFilter('all');
    setSearchQuery('');
  };

  const isAnyFilterActive =
    datePreset !== 'all' ||
    centerFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    Boolean(searchQuery.trim()) ||
    Boolean(startDate) ||
    Boolean(endDate);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (datePreset !== 'all' || startDate || endDate) count += 1;
    if (centerFilter !== 'all') count += 1;
    if (paymentMethodFilter !== 'all') count += 1;
    if (searchQuery.trim()) count += 1;
    return count;
  }, [datePreset, startDate, endDate, centerFilter, paymentMethodFilter, searchQuery]);

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
    if (datePreset === 'all' && !startDate && !endDate) return 'All Recorded History (Cumulative)';
    if (datePreset === 'today') return `Today (${formatDate(startDate)})`;
    if (datePreset === 'yesterday') return `Yesterday (${formatDate(startDate)})`;
    if (datePreset === 'week') return `This Week (${formatDate(startDate)} to ${formatDate(endDate)})`;
    if (datePreset === 'month') return `This Month (${formatDate(startDate)} to ${formatDate(endDate)})`;
    if (datePreset === 'quarter') return `This Quarter (${formatDate(startDate)} to ${formatDate(endDate)})`;
    if (datePreset === 'ytd') return `Year to Date (${formatDate(startDate)} to ${formatDate(endDate)})`;
    if (startDate && endDate) {
      return `${formatDate(startDate)} to ${formatDate(endDate)}`;
    }
    if (startDate) return `From ${formatDate(startDate)}`;
    if (endDate) return `Up to ${formatDate(endDate)}`;
    return 'Active Period';
  }, [datePreset, startDate, endDate]);

  // =========================================================
  // 1. FILTERED REPORT DATASETS
  // =========================================================

  // Report 1: Sales & Revenue Dataset
  const filteredSalesData = useMemo(() => {
    return orders.filter((o) => {
      if (!isDateInRange(o.date)) return false;
      if (!isCenterMatch(o.branch_code, o.center_code)) return false;
      if (paymentMethodFilter !== 'all') {
        const pm = String(o.payment_method || (o.payment_type === 'cash' ? 'Cash' : 'Installment')).toLowerCase();
        if (!pm.includes(paymentMethodFilter.toLowerCase())) return false;
      }
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
  }, [orders, dateRangeBounds, centerFilter, paymentMethodFilter, searchQuery]);

  // Report 2: Inventory & Stock Valuation Dataset
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

  // Report 3: Profit & Loss / Margin Dataset (Orders with COGS & Margins)
  const filteredProfitData = useMemo(() => {
    return filteredSalesData.map((o) => {
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
        matched_item: matchedProd ? matchedProd.name : (o.items_summary || o.item_name || 'Solid Wood Furniture'),
      };
    });
  }, [filteredSalesData, products]);

  // Filtered Expenses
  const filteredExpensesData = useMemo(() => {
    return expenses.filter((e) => {
      if (!isDateInRange(e.date)) return false;
      if (!isCenterMatch(e.branch_code, e.center_code)) return false;
      return true;
    });
  }, [expenses, dateRangeBounds, centerFilter]);

  // Daily, Monthly, Yearly Profit Aggregations
  const dailyProfitRows = useMemo(() => {
    return aggregateDailyProfits(filteredProfitData, filteredExpensesData);
  }, [filteredProfitData, filteredExpensesData]);

  const monthlyProfitRows = useMemo(() => {
    return aggregateMonthlyProfits(filteredProfitData, filteredExpensesData);
  }, [filteredProfitData, filteredExpensesData]);

  const yearlyProfitRows = useMemo(() => {
    return aggregateYearlyProfits(filteredProfitData, filteredExpensesData);
  }, [filteredProfitData, filteredExpensesData]);

  // High-Level Profit KPIs
  const profitKpis = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = todayStr.slice(0, 7);
    const thisYearStr = todayStr.slice(0, 4);

    // Today's Profit
    const todayRow = dailyProfitRows.find((r) => r.date === todayStr);
    const todayProfit = todayRow ? todayRow.netProfit : 0;

    // This Month's Profit
    const monthRow = monthlyProfitRows.find((r) => r.month === thisMonthStr);
    const monthProfit = monthRow ? monthRow.netProfit : 0;

    // This Year's Profit
    const yearRow = yearlyProfitRows.find((r) => r.year === thisYearStr);
    const yearProfit = yearRow ? yearRow.netProfit : 0;

    // Overall Period Profit & Margin
    const totalRev = filteredProfitData.reduce((s, p) => s + (Number(p.gross_amount) || 0), 0);
    const totalCOGS = filteredProfitData.reduce((s, p) => s + (Number(p.cogs) || 0), 0);
    const totalExp = filteredExpensesData.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalNetProfit = totalRev - totalCOGS - totalExp;
    const overallMargin = totalRev > 0 ? Math.round((totalNetProfit / totalRev) * 100) : 0;

    return {
      todayProfit,
      monthProfit,
      yearProfit,
      totalRev,
      totalCOGS,
      totalExp,
      totalNetProfit,
      overallMargin,
    };
  }, [dailyProfitRows, monthlyProfitRows, yearlyProfitRows, filteredProfitData, filteredExpensesData]);

  // Report 4: Cash Collections Dataset
  const filteredPaymentsData = useMemo(() => {
    return payments.filter((p) => {
      // Date filter
      if (!isDateInRange(p.date || p.created_at)) return false;

      // Center filter
      if (centerFilter && centerFilter !== 'all') {
        const pCenter = formatCenterCode(p.center_code);
        if (centerFilter.includes('/')) {
          const [, selC] = centerFilter.split('/');
          if (pCenter !== formatCenterCode(selC)) return false;
        } else if (pCenter !== formatCenterCode(centerFilter)) {
          return false;
        }
      }

      // Payment method filter
      if (paymentMethodFilter !== 'all') {
        const m = String(p.payment_method || '').toLowerCase();
        if (!m.includes(paymentMethodFilter.toLowerCase())) return false;
      }

      // Live search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          String(p.receipt_no || '').toLowerCase().includes(q) ||
          String(p.customer_name || '').toLowerCase().includes(q) ||
          String(p.customer_nic || '').toLowerCase().includes(q) ||
          String(p.customer_phone || '').toLowerCase().includes(q) ||
          String(p.contract_no || '').toLowerCase().includes(q) ||
          String(p.invoice_no || '').toLowerCase().includes(q) ||
          String(p.payment_type || '').toLowerCase().includes(q) ||
          String(p.notes || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [payments, dateRangeBounds, centerFilter, paymentMethodFilter, searchQuery]);

  // Cash Collection Aggregations
  const cashCollectionStats = useMemo(() => {
    return aggregateCashCollections(filteredPaymentsData);
  }, [filteredPaymentsData]);

  // High-Level Cash Collection KPIs
  const cashKpis = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = todayStr.slice(0, 7);

    const todayCollected = payments
      .filter((p) => String(p.date || '').slice(0, 10) === todayStr)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const monthCollected = payments
      .filter((p) => String(p.date || '').slice(0, 7) === thisMonthStr)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const periodCollected = filteredPaymentsData.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const uniqueDays = new Set(filteredPaymentsData.map((p) => String(p.date).slice(0, 10))).size || 1;
    const avgDailyRecovery = Math.round(periodCollected / uniqueDays);

    return {
      todayCollected,
      monthCollected,
      periodCollected,
      avgDailyRecovery,
      totalReceipts: filteredPaymentsData.length,
    };
  }, [payments, filteredPaymentsData]);

  // Active Report Object Definition
  const activeReportObj = REPORT_TYPES.find((r) => r.id === activeReport) || REPORT_TYPES[0];

  // Open Detail Modal
  const handleOpenDetail = (record) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  // =========================================================
  // 2. EXPORT HANDLERS (CSV & PDF)
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
        'Customer Name',
        'NIC / ID',
        'Phone',
        'Center Hub',
        'Furniture Summary',
        'Category',
        'Gross Amount (LKR)',
        'Advance Paid (LKR)',
        'Balance Due (LKR)',
        'Payment Mode',
        'Order Status',
      ];
      const rows = filteredSalesData.map((o) => [
        o.invoice_no || o.contract_no || o.id,
        formatDate(o.date),
        o.customer_name || 'Client',
        o.customer_id || o.customer_nic || '-',
        o.customer_phone || '-',
        `${o.branch_code || 'MHG'}/${formatCenterCode(o.center_code || 'C001')}`,
        o.items_summary || o.item_name || 'Solid Wood Furniture',
        o.category || 'wood',
        Number(o.gross_amount) || 0,
        Number(o.advance_paid) || 0,
        Number(o.balance_due) || 0,
        o.payment_method || 'Cash',
        o.status || 'Active Loan',
      ]);
      const totalGross = filteredSalesData.reduce((s, o) => s + (Number(o.gross_amount) || 0), 0);
      const totalAdv = filteredSalesData.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);
      const totalBal = filteredSalesData.reduce((s, o) => s + (Number(o.balance_due) || 0), 0);
      const summaryRow = ['TOTALS', '', '', '', '', '', '', `${filteredSalesData.length} Orders`, totalGross, totalAdv, totalBal, '', ''];

      exportReportToCSV({
        filename: `DNS_Sales_Revenue_${new Date().toISOString().slice(0, 10)}`,
        reportTitle: 'Sales & Invoiced Revenue Report',
        headers,
        rows,
        summaryRow,
        metadata: meta,
      });
    } else if (activeReport === 'profit_margin') {
      if (profitPeriodTab === 'daily') {
        const headers = ['Date', 'Orders Count', 'Gross Revenue (LKR)', 'COGS (LKR)', 'Expenses (LKR)', 'Net Profit (LKR)', 'Margin %'];
        const rows = dailyProfitRows.map((r) => [r.date, r.ordersCount, r.revenue, r.cogs, r.expenses, r.netProfit, `${r.marginPct}%`]);
        exportReportToCSV({
          filename: `DNS_Daily_Profit_Report_${new Date().toISOString().slice(0, 10)}`,
          reportTitle: 'Daily Profit & Loss Report',
          headers,
          rows,
          metadata: meta,
        });
      } else if (profitPeriodTab === 'monthly') {
        const headers = ['Month', 'Orders Count', 'Gross Revenue (LKR)', 'COGS (LKR)', 'Expenses (LKR)', 'Net Profit (LKR)', 'Margin %'];
        const rows = monthlyProfitRows.map((r) => [r.month, r.ordersCount, r.revenue, r.cogs, r.expenses, r.netProfit, `${r.marginPct}%`]);
        exportReportToCSV({
          filename: `DNS_Monthly_Profit_Report_${new Date().toISOString().slice(0, 10)}`,
          reportTitle: 'Monthly Profit & Loss Report',
          headers,
          rows,
          metadata: meta,
        });
      } else if (profitPeriodTab === 'yearly') {
        const headers = ['Year', 'Orders Count', 'Gross Revenue (LKR)', 'COGS (LKR)', 'Expenses (LKR)', 'Net Profit (LKR)', 'Margin %'];
        const rows = yearlyProfitRows.map((r) => [r.year, r.ordersCount, r.revenue, r.cogs, r.expenses, r.netProfit, `${r.marginPct}%`]);
        exportReportToCSV({
          filename: `DNS_Yearly_Profit_Report_${new Date().toISOString().slice(0, 10)}`,
          reportTitle: 'Yearly Profit & Loss Report',
          headers,
          rows,
          metadata: meta,
        });
      } else {
        const headers = ['Invoice No', 'Date', 'Customer', 'Furniture Item', 'Revenue (LKR)', 'COGS (LKR)', 'Gross Profit (LKR)', 'Margin %'];
        const rows = filteredProfitData.map((p) => [
          p.invoice_no || p.contract_no || p.id,
          formatDate(p.date),
          p.customer_name || 'Client',
          p.matched_item || p.items_summary || p.item_name,
          Number(p.gross_amount) || 0,
          Number(p.cogs) || 0,
          Number(p.gross_profit) || 0,
          `${p.margin_pct}%`,
        ]);
        exportReportToCSV({
          filename: `DNS_Order_Profits_${new Date().toISOString().slice(0, 10)}`,
          reportTitle: 'Order-by-Order Profit Breakdown',
          headers,
          rows,
          metadata: meta,
        });
      }
    } else if (activeReport === 'cash_collection') {
      const headers = ['Receipt No', 'Date', 'Customer Name', 'NIC / Phone', 'Ref / Contract', 'Payment Type', 'Center Hub', 'Payment Method', 'Collected By', 'Amount (LKR)'];
      const rows = filteredPaymentsData.map((p) => [
        p.receipt_no || p.id,
        formatDate(p.date),
        p.customer_name || 'Client',
        `${p.customer_nic || ''} ${p.customer_phone || ''}`.trim(),
        p.contract_no || p.invoice_no || '-',
        p.payment_type || 'Installment',
        p.center_code || 'Direct Single',
        p.payment_method || 'Cash',
        p.collected_by || 'Officer',
        Number(p.amount) || 0,
      ]);
      const summaryRow = ['TOTALS', '', '', '', '', '', '', '', `${filteredPaymentsData.length} Receipts`, cashKpis.periodCollected];

      exportReportToCSV({
        filename: `DNS_Cash_Collections_${new Date().toISOString().slice(0, 10)}`,
        reportTitle: 'Official Cash Collections Report',
        headers,
        rows,
        summaryRow,
        metadata: meta,
      });
    } else if (activeReport === 'inventory_valuation') {
      const headers = ['Item Code', 'Furniture Model', 'Category', 'Wood / Material', 'In Stock', 'Cost Price (LKR)', 'Cost Valuation (LKR)', 'Retail Price (LKR)', 'Retail Valuation (LKR)'];
      const rows = filteredInventoryData.map((p) => [
        p.item_code,
        p.name,
        p.category,
        p.wood_type || 'Melamine/Teak',
        Number(p.stock_quantity) || 0,
        Number(p.cost_price) || 0,
        (Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0),
        Number(p.selling_price) || 0,
        (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0),
      ]);
      exportReportToCSV({
        filename: `DNS_Inventory_Valuation_${new Date().toISOString().slice(0, 10)}`,
        reportTitle: 'Inventory Stock Valuation Report',
        headers,
        rows,
        metadata: meta,
      });
    }
  };

  const handlePrintPDF = () => {
    if (activeReport === 'sales_revenue') {
      const totalGross = filteredSalesData.reduce((s, o) => s + (Number(o.gross_amount) || 0), 0);
      const totalAdv = filteredSalesData.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);
      const totalBal = filteredSalesData.reduce((s, o) => s + (Number(o.balance_due) || 0), 0);

      printReportToPDF({
        reportTitle: 'Sales & Invoiced Revenue Report',
        subtitle: 'Official Customer Sales, Contract Value, Advances, and Receivables Ledger',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Total Invoiced Sales', value: formatLKR(totalGross), color: '#2563EB' },
          { label: 'Advances Collected', value: formatLKR(totalAdv), color: '#10B981' },
          { label: 'Outstanding Balance', value: formatLKR(totalBal), color: '#DC2626' },
          { label: 'Total Invoices', value: filteredSalesData.length, sub: 'Generated orders' },
        ],
        tableHeaders: [
          { label: 'Invoice No' },
          { label: 'Date' },
          { label: 'Customer' },
          { label: 'Center' },
          { label: 'Item Description' },
          { label: 'Gross (LKR)', align: 'right' },
          { label: 'Advance (LKR)', align: 'right' },
          { label: 'Balance (LKR)', align: 'right' },
          { label: 'Status', align: 'center' },
        ],
        tableRows: filteredSalesData.map((o) => [
          `<span style="font-family: monospace; font-weight: 700;">${o.invoice_no || o.contract_no || o.id}</span>`,
          formatDate(o.date),
          o.customer_name || 'Client',
          `${o.branch_code || 'MHG'}/${formatCenterCode(o.center_code || 'C001')}`,
          o.items_summary || o.item_name || 'Solid Wood Furniture',
          formatLKR(Number(o.gross_amount) || 0),
          formatLKR(Number(o.advance_paid) || 0),
          `<strong style="color: ${Number(o.balance_due) > 0 ? '#DC2626' : '#16A34A'};">${formatLKR(Number(o.balance_due) || 0)}</strong>`,
          `<span class="badge badge-subtle">${o.status || 'Active Loan'}</span>`,
        ]),
        summaryCells: ['TOTALS', '', '', '', `${filteredSalesData.length} Orders`, formatLKR(totalGross), formatLKR(totalAdv), formatLKR(totalBal), ''],
      });
    } else if (activeReport === 'profit_margin') {
      printReportToPDF({
        reportTitle: 'Profit & Loss Performance Report',
        subtitle: 'Executive Daily, Monthly & Yearly Profit Margin Analysis (Revenue vs COGS)',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: "Today's Profit", value: formatLKR(profitKpis.todayProfit), color: '#10B981' },
          { label: "This Month's Profit", value: formatLKR(profitKpis.monthProfit), color: '#2563EB' },
          { label: "This Year's Profit", value: formatLKR(profitKpis.yearProfit), color: '#7C3AED' },
          { label: 'Net Profit Margin %', value: `${profitKpis.overallMargin}%`, color: '#059669' },
        ],
        tableHeaders: [
          { label: 'Date / Period' },
          { label: 'Orders Count', align: 'center' },
          { label: 'Revenue (LKR)', align: 'right' },
          { label: 'COGS (LKR)', align: 'right' },
          { label: 'Expenses (LKR)', align: 'right' },
          { label: 'Net Profit (LKR)', align: 'right' },
          { label: 'Margin %', align: 'center' },
        ],
        tableRows: (profitPeriodTab === 'daily' ? dailyProfitRows : profitPeriodTab === 'monthly' ? monthlyProfitRows : yearlyProfitRows).map((r) => [
          r.date || r.month || r.year,
          r.ordersCount,
          formatLKR(r.revenue),
          formatLKR(r.cogs),
          formatLKR(r.expenses),
          `<strong style="color: ${r.netProfit >= 0 ? '#10B981' : '#DC2626'};">${formatLKR(r.netProfit)}</strong>`,
          `<strong>${r.marginPct}%</strong>`,
        ]),
        summaryCells: [
          'TOTALS',
          filteredProfitData.length,
          formatLKR(profitKpis.totalRev),
          formatLKR(profitKpis.totalCOGS),
          formatLKR(profitKpis.totalExp),
          formatLKR(profitKpis.totalNetProfit),
          `${profitKpis.overallMargin}%`,
        ],
      });
    } else if (activeReport === 'cash_collection') {
      printReportToPDF({
        reportTitle: 'Official Cash Collections Report',
        subtitle: 'Daily Center Inflows, Single Customer Routes, Advances & Payment Receipts',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Collected Today', value: formatLKR(cashKpis.todayCollected), color: '#10B981' },
          { label: 'This Month Collections', value: formatLKR(cashKpis.monthCollected), color: '#2563EB' },
          { label: 'Period Total Inflow', value: formatLKR(cashKpis.periodCollected), color: '#059669' },
          { label: 'Total Receipts Issued', value: cashKpis.totalReceipts, color: '#7C3AED' },
        ],
        tableHeaders: [
          { label: 'Receipt No' },
          { label: 'Date' },
          { label: 'Customer Name' },
          { label: 'Ref / Contract' },
          { label: 'Payment Type' },
          { label: 'Center Hub' },
          { label: 'Payment Method' },
          { label: 'Amount (LKR)', align: 'right' },
        ],
        tableRows: filteredPaymentsData.map((p) => [
          `<span style="font-family: monospace; font-weight: 700;">#${p.receipt_no || p.id}</span>`,
          formatDate(p.date),
          p.customer_name || 'Client',
          p.contract_no || p.invoice_no || '-',
          p.payment_type || 'Installment',
          p.center_code || 'Direct Single',
          p.payment_method || 'Cash',
          `<strong style="color: #10B981;">${formatLKR(Number(p.amount) || 0)}</strong>`,
        ]),
        summaryCells: ['TOTALS', '', '', '', '', '', `${filteredPaymentsData.length} Receipts`, formatLKR(cashKpis.periodCollected)],
      });
    } else if (activeReport === 'inventory_valuation') {
      const totalCostVal = filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0), 0);
      const totalRetailVal = filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0), 0);
      const totalUnits = filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0), 0);

      printReportToPDF({
        reportTitle: 'Finished Furniture Inventory Stock Valuation Report',
        subtitle: 'Warehouse Physical Stock, Raw Material Production Cost, and Marked Retail Valuation',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Total Models', value: filteredInventoryData.length, color: '#2563EB' },
          { label: 'Physical Units in Stock', value: totalUnits, color: '#10B981' },
          { label: 'Cost Valuation (COGS)', value: formatLKR(totalCostVal), color: '#F59E0B' },
          { label: 'Retail Valuation', value: formatLKR(totalRetailVal), color: '#8B5CF6' },
        ],
        tableHeaders: [
          { label: 'Item Code' },
          { label: 'Model Name' },
          { label: 'Category' },
          { label: 'Material' },
          { label: 'Stock Qty', align: 'center' },
          { label: 'Cost Price (LKR)', align: 'right' },
          { label: 'Cost Value (LKR)', align: 'right' },
          { label: 'Retail Price (LKR)', align: 'right' },
        ],
        tableRows: filteredInventoryData.map((p) => [
          `<span style="font-family: monospace; font-weight: 700;">${p.item_code}</span>`,
          p.name,
          p.category,
          p.wood_type || 'Melamine/Teak',
          p.stock_quantity,
          formatLKR(p.cost_price),
          formatLKR((Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0)),
          formatLKR(p.selling_price),
        ]),
        summaryCells: ['TOTALS', '', '', '', totalUnits, '', formatLKR(totalCostVal), formatLKR(totalRetailVal)],
      });
    }
  };

  // =========================================================
  // 3. EXECUTIVE KPI STAT CARDS
  // =========================================================

  const renderActiveStatCards = () => {
    if (activeReport === 'sales_revenue') {
      const totalGross = filteredSalesData.reduce((s, o) => s + (Number(o.gross_amount) || 0), 0);
      const totalAdv = filteredSalesData.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);
      const avgOrder = filteredSalesData.length ? Math.round(totalGross / filteredSalesData.length) : 0;
      const fullyPaidOrders = filteredSalesData.filter((o) => Number(o.balance_due) <= 0);
      const activeLoanOrders = filteredSalesData.filter((o) => Number(o.balance_due) > 0);

      return (
        <div className="stats-grid">
          <StatCard
            title="Total Invoiced Sales"
            value={formatLKR(totalGross)}
            subtitle={`${filteredSalesData.length} generated sales order(s)`}
            icon={BarChart3}
            color="#2563EB"
            bg="rgba(37, 99, 235, 0.12)"
          />
          <StatCard
            title="Advances Collected"
            value={formatLKR(totalAdv)}
            subtitle="Cash and bank deposits received"
            icon={CheckCircle}
            color="#10B981"
            bg="rgba(16, 185, 129, 0.12)"
          />
          <StatCard
            title="Fully Settled Orders"
            value={`${fullyPaidOrders.length} Settled`}
            subtitle={`${activeLoanOrders.length} active installment loan(s)`}
            icon={CheckCircle2}
            color="#059669"
            bg="rgba(16, 185, 129, 0.12)"
          />
          <StatCard
            title="Average Order Value"
            value={formatLKR(avgOrder)}
            subtitle="Per client furniture order"
            icon={TrendingUp}
            color="#8B5CF6"
            bg="rgba(139, 92, 246, 0.12)"
          />
        </div>
      );
    }

    if (activeReport === 'profit_margin') {
      return (
        <div className="stats-grid">
          <StatCard
            title="Today's Net Profit (දෛනික ලාභය)"
            value={formatLKR(profitKpis.todayProfit)}
            subtitle="Today's sales revenue minus COGS"
            icon={CheckCircle}
            color="#10B981"
            bg="rgba(16, 185, 129, 0.12)"
          />
          <StatCard
            title="This Month's Profit (මාසික ලාභය)"
            value={formatLKR(profitKpis.monthProfit)}
            subtitle="Current calendar month net profit"
            icon={Calendar}
            color="#2563EB"
            bg="rgba(37, 99, 235, 0.12)"
          />
          <StatCard
            title="This Year's Profit (වාර්ෂික ලාභය)"
            value={formatLKR(profitKpis.yearProfit)}
            subtitle="Current annual cumulative net profit"
            icon={TrendingUp}
            color="#7C3AED"
            bg="rgba(124, 58, 237, 0.12)"
          />
          <StatCard
            title="Average Net Margin %"
            value={`${profitKpis.overallMargin}%`}
            subtitle="Overall profitability margin ratio"
            icon={Percent}
            color="#059669"
            bg="rgba(5, 150, 105, 0.12)"
          />
        </div>
      );
    }

    if (activeReport === 'cash_collection') {
      return (
        <div className="stats-grid">
          <StatCard
            title="Collected Today (අද එකතු කළ මුදල)"
            value={formatLKR(cashKpis.todayCollected)}
            subtitle="Across centers & single routes"
            icon={CheckCircle}
            color="#10B981"
            bg="rgba(16, 185, 129, 0.12)"
          />
          <StatCard
            title="This Month Collections (මාසික එකතුව)"
            value={formatLKR(cashKpis.monthCollected)}
            subtitle="Monthly total cash recoveries"
            icon={Calendar}
            color="#2563EB"
            bg="rgba(37, 99, 235, 0.12)"
          />
          <StatCard
            title="Period Inflow (තෝරාගත් කාල සීමාව)"
            value={formatLKR(cashKpis.periodCollected)}
            subtitle={`From ${cashKpis.totalReceipts} payment receipts issued`}
            icon={Wallet}
            color="#059669"
            bg="rgba(5, 150, 105, 0.12)"
          />
          <StatCard
            title="Average Daily Recovery"
            value={formatLKR(cashKpis.avgDailyRecovery)}
            subtitle="Cash recovery velocity per day"
            icon={TrendingUp}
            color="#8B5CF6"
            bg="rgba(139, 92, 246, 0.12)"
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
            color="#2563EB"
            bg="rgba(37, 99, 235, 0.12)"
          />
          <StatCard
            title="Total Stock Units"
            value={totalUnits}
            subtitle="Showroom & workshop storage"
            icon={Layers}
            color="#10B981"
            bg="rgba(16, 185, 129, 0.12)"
          />
          <StatCard
            title="Cost Valuation (COGS)"
            value={formatLKR(totalCostVal)}
            subtitle="Raw material & carpenter labor cost"
            icon={Hammer}
            color="#F59E0B"
            bg="rgba(245, 158, 11, 0.12)"
          />
          <StatCard
            title="Retail Selling Value"
            value={formatLKR(totalRetailVal)}
            subtitle="Showroom marked turnover potential"
            icon={TrendingUp}
            color="#8B5CF6"
            bg="rgba(139, 92, 246, 0.12)"
          />
        </div>
      );
    }

    return null;
  };

  // =========================================================
  // 4. EXECUTIVE CUSTOM TABLE
  // =========================================================

  const renderActiveTable = () => {
    // 1. Sales & Revenue Table
    if (activeReport === 'sales_revenue') {
      const totalGross = filteredSalesData.reduce((s, o) => s + (Number(o.gross_amount) || 0), 0);
      const totalAdv = filteredSalesData.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);
      const totalBal = filteredSalesData.reduce((s, o) => s + (Number(o.balance_due) || 0), 0);

      return (
        <table className="custom-table" style={{ width: '100%', minWidth: '1180px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)', borderBottom: '2px solid #E2E8F0' }}>
              <th style={{ width: '14%', minWidth: '150px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Invoice & Contract
              </th>
              <th style={{ width: '10%', minWidth: '110px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Order Date
              </th>
              <th style={{ width: '18%', minWidth: '180px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Client Details
              </th>
              <th style={{ width: '18%', minWidth: '190px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Furniture Item Ordered
              </th>
              <th style={{ width: '12%', minWidth: '120px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Gross Total
              </th>
              <th style={{ width: '11%', minWidth: '110px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Advance Paid
              </th>
              <th style={{ width: '11%', minWidth: '110px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Balance Due
              </th>
              <th style={{ width: '6%', minWidth: '70px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSalesData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
                  <strong>No sales invoice records match the selected filters.</strong>
                </td>
              </tr>
            ) : (
              filteredSalesData.map((o, idx) => {
                const isPaid = Number(o.balance_due) <= 0;
                return (
                  <tr key={o.id || idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1E4D8C', fontSize: '0.86rem' }}>
                        {o.invoice_no || o.contract_no || o.id}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                        {o.branch_code || 'MHG'}/{formatCenterCode(o.center_code || 'C001')}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.82rem', color: '#475569' }}>
                      {formatDate(o.date)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.86rem' }}>{o.customer_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                        NIC: {o.customer_nic || o.customer_id || '-'} • 📞 {o.customer_phone || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.84rem' }}>
                        {o.items_summary || o.item_name || 'Solid Wood Furniture'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#2563EB', marginTop: '2px' }}>
                        {o.category || 'Custom Furniture'}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                      {formatLKR(o.gross_amount)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: '#10B981' }}>
                      {formatLKR(o.advance_paid)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.88rem', color: isPaid ? '#10B981' : '#DC2626' }}>
                      {formatLKR(o.balance_due)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(o)}
                        className="btn btn-secondary"
                        style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                        title="View full audit record"
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredSalesData.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F1F5F9', borderTop: '2px solid #CBD5E1', fontWeight: 900, fontSize: '0.86rem' }}>
                <td colSpan={4} style={{ padding: '14px 12px', color: '#1E293B' }}>
                  Summary Total ({filteredSalesData.length} Orders):
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#0F172A' }}>
                  {formatLKR(totalGross)}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#10B981' }}>
                  {formatLKR(totalAdv)}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'monospace', color: totalBal > 0 ? '#DC2626' : '#10B981' }}>
                  {formatLKR(totalBal)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    // 2. Profit & Loss Report Tables (Daily, Monthly, Yearly, and Order Breakdown)
    if (activeReport === 'profit_margin') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-Tab Navigation for Profit Breakdown */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setProfitPeriodTab('daily')}
              style={{
                border: 'none',
                background: profitPeriodTab === 'daily' ? '#1E4D8C' : '#F1F5F9',
                color: profitPeriodTab === 'daily' ? '#FFFFFF' : '#475569',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Calendar size={15} /> 📅 Daily Profit (දෛනික ලාභය) ({dailyProfitRows.length})
            </button>

            <button
              type="button"
              onClick={() => setProfitPeriodTab('monthly')}
              style={{
                border: 'none',
                background: profitPeriodTab === 'monthly' ? '#1E4D8C' : '#F1F5F9',
                color: profitPeriodTab === 'monthly' ? '#FFFFFF' : '#475569',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Calendar size={15} /> 🗓️ Monthly Profit (මාසික ලාභය) ({monthlyProfitRows.length})
            </button>

            <button
              type="button"
              onClick={() => setProfitPeriodTab('yearly')}
              style={{
                border: 'none',
                background: profitPeriodTab === 'yearly' ? '#1E4D8C' : '#F1F5F9',
                color: profitPeriodTab === 'yearly' ? '#FFFFFF' : '#475569',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <TrendingUp size={15} /> 📈 Yearly Profit (වාර්ෂික ලාභය) ({yearlyProfitRows.length})
            </button>

            <button
              type="button"
              onClick={() => setProfitPeriodTab('orders')}
              style={{
                border: 'none',
                background: profitPeriodTab === 'orders' ? '#1E4D8C' : '#F1F5F9',
                color: profitPeriodTab === 'orders' ? '#FFFFFF' : '#475569',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <List size={15} /> 📋 Order-by-Order Breakdown ({filteredProfitData.length})
            </button>
          </div>

          {/* Daily Profit View */}
          {profitPeriodTab === 'daily' && (
            <table className="custom-table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', width: '16%' }}>Date (දිනය)</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '12%' }}>Orders Count</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '18%' }}>Gross Revenue (ආදායම)</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '18%' }}>Production COGS (වියදම)</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '18%' }}>Daily Net Profit (දෛනික ශුද්ධ ලාභය)</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '18%' }}>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {dailyProfitRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                      No sales or profit records found for the selected period.
                    </td>
                  </tr>
                ) : (
                  dailyProfitRows.map((r, idx) => (
                    <tr key={r.date} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A' }}>
                        {formatDate(r.date)}
                        {r.date === new Date().toISOString().slice(0, 10) && (
                          <span style={{ marginLeft: '8px', fontSize: '0.68rem', background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            TODAY
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>
                        {r.ordersCount} Orders
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                        {formatLKR(r.revenue)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#F59E0B', fontWeight: 700 }}>
                        {formatLKR(r.cogs)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: r.netProfit >= 0 ? '#10B981' : '#DC2626', fontSize: '0.94rem' }}>
                        {formatLKR(r.netProfit)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.78rem', background: r.marginPct >= 25 ? '#DCFCE7' : '#FEF3C7', color: r.marginPct >= 25 ? '#166534' : '#B45309', padding: '3px 8px', borderRadius: '12px', fontWeight: 800 }}>
                          {r.marginPct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Monthly Profit View */}
          {profitPeriodTab === 'monthly' && (
            <table className="custom-table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', width: '20%' }}>Month (මාසය)</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '12%' }}>Total Orders</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '18%' }}>Monthly Revenue (ආදායම)</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '18%' }}>Total Production Cost</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '18%' }}>Monthly Net Profit (මාසික ලාභය)</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '14%' }}>Net Margin %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyProfitRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                      No monthly profit history available.
                    </td>
                  </tr>
                ) : (
                  monthlyProfitRows.map((r, idx) => (
                    <tr key={r.month} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                        📅 {r.month}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>
                        {r.ordersCount} Orders
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                        {formatLKR(r.revenue)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#F59E0B', fontWeight: 700 }}>
                        {formatLKR(r.cogs)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: r.netProfit >= 0 ? '#10B981' : '#DC2626', fontSize: '0.96rem' }}>
                        {formatLKR(r.netProfit)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8rem', background: '#DBEAFE', color: '#1E40AF', padding: '3px 10px', borderRadius: '12px', fontWeight: 800 }}>
                          {r.marginPct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Yearly Profit View */}
          {profitPeriodTab === 'yearly' && (
            <table className="custom-table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', width: '22%' }}>Financial Year (වර්ෂය)</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '14%' }}>Annual Orders</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '18%' }}>Annual Revenue (ආදායම)</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '18%' }}>Annual Production Cost</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '18%' }}>Annual Net Profit (වාර්ෂික ලාභය)</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '10%' }}>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {yearlyProfitRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                      No yearly profit data found.
                    </td>
                  </tr>
                ) : (
                  yearlyProfitRows.map((r, idx) => (
                    <tr key={r.year} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '12px', fontWeight: 900, color: '#1E4D8C', fontSize: '1rem' }}>
                        🏛️ Year {r.year}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>
                        {r.ordersCount} Orders
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                        {formatLKR(r.revenue)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#F59E0B', fontWeight: 700 }}>
                        {formatLKR(r.cogs)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: r.netProfit >= 0 ? '#10B981' : '#DC2626', fontSize: '1rem' }}>
                        {formatLKR(r.netProfit)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.84rem', background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontWeight: 800 }}>
                          {r.marginPct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Orders Itemized Breakdown View */}
          {profitPeriodTab === 'orders' && (
            <table className="custom-table" style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', width: '14%' }}>Invoice No</th>
                  <th style={{ padding: '12px', width: '10%' }}>Date</th>
                  <th style={{ padding: '12px', width: '20%' }}>Customer Name</th>
                  <th style={{ padding: '12px', width: '20%' }}>Furniture Model</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '12%' }}>Selling Price</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '12%' }}>Est. COGS</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '12%' }}>Gross Profit</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '10%' }}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfitData.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                      No order breakdown records available for selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredProfitData.map((p, idx) => (
                    <tr key={p.id || idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#1E4D8C' }}>
                        {p.invoice_no || p.contract_no || p.id}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.82rem', color: '#475569' }}>
                        {formatDate(p.date)}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#0F172A' }}>
                        {p.customer_name}
                      </td>
                      <td style={{ padding: '12px', color: '#334155' }}>
                        {p.matched_item || p.items_summary || p.item_name}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                        {formatLKR(p.gross_amount)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#F59E0B' }}>
                        {formatLKR(p.cogs)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#10B981' }}>
                        {formatLKR(p.gross_profit)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.78rem', background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                          {p.margin_pct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      );
    }

    // 3. Cash Collections Report Tables
    if (activeReport === 'cash_collection') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-Tabs for Cash Collection Views */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', paddingBottom: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setCashCollectionSubTab('receipts')}
              style={{
                border: 'none',
                background: cashCollectionSubTab === 'receipts' ? '#10B981' : '#F1F5F9',
                color: cashCollectionSubTab === 'receipts' ? '#FFFFFF' : '#475569',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={15} /> 📋 All Receipts (සියලුම ලදුපත්) ({filteredPaymentsData.length})
            </button>

            <button
              type="button"
              onClick={() => setCashCollectionSubTab('daily')}
              style={{
                border: 'none',
                background: cashCollectionSubTab === 'daily' ? '#10B981' : '#F1F5F9',
                color: cashCollectionSubTab === 'daily' ? '#FFFFFF' : '#475569',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Calendar size={15} /> 📅 Daily Cash Summary (දිනපතා සාරාංශය) ({cashCollectionStats.dailyList.length})
            </button>

            <button
              type="button"
              onClick={() => setCashCollectionSubTab('centers')}
              style={{
                border: 'none',
                background: cashCollectionSubTab === 'centers' ? '#10B981' : '#F1F5F9',
                color: cashCollectionSubTab === 'centers' ? '#FFFFFF' : '#475569',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Building2 size={15} /> 🏢 Centers & Routes (මධ්‍යස්ථාන හා Routes) ({cashCollectionStats.centerList.length})
            </button>

            <button
              type="button"
              onClick={() => setCashCollectionSubTab('methods')}
              style={{
                border: 'none',
                background: cashCollectionSubTab === 'methods' ? '#10B981' : '#F1F5F9',
                color: cashCollectionSubTab === 'methods' ? '#FFFFFF' : '#475569',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <CreditCard size={15} /> 💳 Payment Methods (ගෙවීම් ක්‍රම)
            </button>
          </div>

          {/* View 1: All Receipts Ledger */}
          {cashCollectionSubTab === 'receipts' && (
            <table className="custom-table" style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', width: '13%' }}>Receipt #</th>
                  <th style={{ padding: '12px', width: '11%' }}>Date</th>
                  <th style={{ padding: '12px', width: '18%' }}>Customer Details</th>
                  <th style={{ padding: '12px', width: '15%' }}>Contract / Ref</th>
                  <th style={{ padding: '12px', width: '12%' }}>Type</th>
                  <th style={{ padding: '12px', width: '11%' }}>Method</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '14%' }}>Amount Paid</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '6%' }}>Slip</th>
                </tr>
              </thead>
              <tbody>
                {filteredPaymentsData.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                      No payment receipts match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredPaymentsData.map((p, idx) => (
                    <tr key={p.id || idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#1E4D8C' }}>
                        #{p.receipt_no || p.id}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.82rem', color: '#475569' }}>
                        {formatDate(p.date)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>{p.customer_name || 'Client'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                          NIC: {p.customer_nic || '-'} • 📞 {p.customer_phone || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#2563EB', fontWeight: 700 }}>
                          {p.contract_no || p.invoice_no || '-'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {p.center_code || 'Direct Single'}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: '0.74rem', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          {p.payment_type || 'Installment'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: '0.74rem', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          {p.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#10B981', fontSize: '0.94rem' }}>
                        {formatLKR(p.amount)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(p)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                          title="Inspect receipt"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredPaymentsData.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#F1F5F9', borderTop: '2px solid #CBD5E1', fontWeight: 900, fontSize: '0.88rem' }}>
                    <td colSpan={6} style={{ padding: '14px 12px', color: '#1E293B' }}>
                      Total Cash Collections ({filteredPaymentsData.length} Receipts):
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#10B981', fontSize: '1rem' }}>
                      {formatLKR(cashKpis.periodCollected)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {/* View 2: Daily Cash Summary Table */}
          {cashCollectionSubTab === 'daily' && (
            <table className="custom-table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', width: '18%' }}>Collection Date (දිනය)</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '14%' }}>Receipts Count</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '17%' }}>Cash (LKR)</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '17%' }}>Bank Transfer (LKR)</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '17%' }}>Online / Cheque (LKR)</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '17%' }}>Total Inflow (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {cashCollectionStats.dailyList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                      No daily collections found for selected period.
                    </td>
                  </tr>
                ) : (
                  cashCollectionStats.dailyList.map((d, idx) => (
                    <tr key={d.date} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A' }}>
                        {formatDate(d.date)}
                        {d.date === new Date().toISOString().slice(0, 10) && (
                          <span style={{ marginLeft: '8px', fontSize: '0.68rem', background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            TODAY
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>
                        {d.count} Receipts
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>
                        {formatLKR(d.cash)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#2563EB', fontWeight: 700 }}>
                        {formatLKR(d.bank)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#D97706', fontWeight: 700 }}>
                        {formatLKR(d.online + d.cheque)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#10B981', fontSize: '0.94rem' }}>
                        {formatLKR(d.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* View 3: Center & Route Collections Table */}
          {cashCollectionSubTab === 'centers' && (
            <table className="custom-table" style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: '12px', width: '30%' }}>Regional Center / Route Hub</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '20%' }}>Receipts Issued</th>
                  <th style={{ padding: '12px', textAlign: 'right', width: '25%' }}>Total Cash Collected</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '25%' }}>Contribution %</th>
                </tr>
              </thead>
              <tbody>
                {cashCollectionStats.centerList.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                      No center collection statistics available.
                    </td>
                  </tr>
                ) : (
                  cashCollectionStats.centerList.map((c, idx) => {
                    const pct = cashKpis.periodCollected > 0 ? Math.round((c.total / cashKpis.periodCollected) * 100) : 0;
                    return (
                      <tr key={c.centerCode} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                        <td style={{ padding: '12px', fontWeight: 800, color: '#1E4D8C' }}>
                          🏢 {c.centerCode}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>
                          {c.count} Payments
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#10B981', fontSize: '0.95rem' }}>
                          {formatLKR(c.total)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.78rem', background: '#EFF6FF', color: '#1D4ED8', padding: '3px 10px', borderRadius: '10px', fontWeight: 800 }}>
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* View 4: Payment Methods Distribution Cards */}
          {cashCollectionSubTab === 'methods' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {cashCollectionStats.methodList.map((m) => (
                <div
                  key={m.method}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1.5px solid #E2E8F0',
                    padding: '18px 20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CreditCard size={18} color="#2563EB" /> {m.method}
                    </div>
                    <span style={{ fontSize: '0.74rem', background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                      {m.pct}%
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Inflow</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10B981', marginTop: '2px', fontFamily: 'monospace' }}>
                      {formatLKR(m.total)}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                      {m.count} confirmed transaction(s)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 4. Stock Valuation Table
    if (activeReport === 'inventory_valuation') {
      const totalCostVal = filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0), 0);
      const totalRetailVal = filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0), 0);
      const totalUnits = filteredInventoryData.reduce((s, p) => s + (Number(p.stock_quantity) || 0), 0);

      return (
        <table className="custom-table" style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              <th style={{ padding: '12px', width: '12%' }}>Item Code</th>
              <th style={{ padding: '12px', width: '22%' }}>Model Name</th>
              <th style={{ padding: '12px', width: '14%' }}>Category</th>
              <th style={{ padding: '12px', width: '14%' }}>Material</th>
              <th style={{ padding: '12px', textAlign: 'center', width: '10%' }}>Stock Units</th>
              <th style={{ padding: '12px', textAlign: 'right', width: '14%' }}>Cost Valuation</th>
              <th style={{ padding: '12px', textAlign: 'right', width: '14%' }}>Retail Valuation</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventoryData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  No stock items match your search.
                </td>
              </tr>
            ) : (
              filteredInventoryData.map((p, idx) => (
                <tr key={p.id || idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#1E4D8C' }}>
                    {p.item_code}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A' }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>
                    {p.category}
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>
                    {p.wood_type || 'Melamine/Teak'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800 }}>
                    {p.stock_quantity}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#F59E0B', fontWeight: 800 }}>
                    {formatLKR((Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0))}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#10B981', fontWeight: 900 }}>
                    {formatLKR((Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredInventoryData.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F1F5F9', borderTop: '2px solid #CBD5E1', fontWeight: 900 }}>
                <td colSpan={4} style={{ padding: '14px 12px' }}>Total Stock Valuation:</td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}>{totalUnits} Units</td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#F59E0B' }}>{formatLKR(totalCostVal)}</td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#10B981' }}>{formatLKR(totalRetailVal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    return null;
  };

  return (
    <div className="reports-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '40px' }}>
      {/* 1. EXECUTIVE REPORT TYPE SELECTOR (4-PILL RIBBON) */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
              OFFICIAL EXECUTIVE AUDITS
            </span>
            <h2 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
              Financial & Operational Reports Hub (මූල්‍ය හා මෙහෙයුම් වාර්තා)
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              title="Download structured CSV file (Excel ready)"
              style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px', borderRadius: '8px', fontWeight: 700 }}
            >
              <FileSpreadsheet size={15} color="#059669" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrintPDF}
              title="Download or Print corporate audit document"
              style={{ padding: '8px 16px', fontSize: '0.82rem', gap: '6px', borderRadius: '8px', fontWeight: 700 }}
            >
              <Printer size={15} />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>

        {/* 4 Active Report Switcher Pills */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
            borderTop: '1px solid #F1F5F9',
            paddingTop: '12px',
          }}
        >
          {REPORT_TYPES.map((rep) => {
            const isActive = activeReport === rep.id;
            let count = 0;
            if (rep.id === 'sales_revenue') count = filteredSalesData.length;
            if (rep.id === 'profit_margin') count = filteredProfitData.length;
            if (rep.id === 'cash_collection') count = filteredPaymentsData.length;
            if (rep.id === 'inventory_valuation') count = filteredInventoryData.length;

            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => setActiveReport(rep.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: isActive ? '2px solid #1E4D8C' : '1px solid #E2E8F0',
                  background: isActive ? '#1E4D8C' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#1E293B',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 4px 12px rgba(30, 77, 140, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : '#F1F5F9',
                    color: isActive ? '#FFFFFF' : '#1E4D8C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {rep.id === 'sales_revenue' && <BarChart3 size={18} />}
                  {rep.id === 'profit_margin' && <TrendingUp size={18} />}
                  {rep.id === 'cash_collection' && <Wallet size={18} />}
                  {rep.id === 'inventory_valuation' && <Package size={18} />}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 800 }}>
                    {rep.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: isActive ? 'rgba(255, 255, 255, 0.85)' : '#64748B',
                      fontWeight: 600,
                      marginTop: '2px',
                    }}
                  >
                    {count} Record(s) Available
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. USER-FRIENDLY FILTER & SEARCH COMMAND CONTROL PANEL */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Row 1: Search Box + Center Selector + Payment Method Filter + View Mode Switch + Reset */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
            />
            <input
              type="text"
              placeholder={`🔍 Search in ${activeReportObj.label} by Client, NIC, Phone, Invoice, Ref...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 36px 9px 38px',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.84rem',
                outline: 'none',
                background: '#F8FAFC',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Center Selector Dropdown */}
            <select
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#1E293B',
                background: '#F8FAFC',
                minWidth: '200px',
              }}
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

            {/* Payment Method Selector Dropdown */}
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#1E293B',
                background: '#F8FAFC',
                minWidth: '160px',
              }}
            >
              <option value="all">💳 All Payment Methods</option>
              <option value="Cash">💵 Cash Only</option>
              <option value="Bank Transfer">🏦 Bank Transfer</option>
              <option value="Online Deposit">🌐 Online Deposit</option>
              <option value="Cheque">📜 Cheque</option>
            </select>

            {/* Reset Button with active filters badge */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.8rem', gap: '5px', borderRadius: '8px', fontWeight: 800 }}
                title="Reset all search, date and center filters"
              >
                <RotateCcw size={13} /> Reset ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Quick 1-Click Date Presets + Inline Pickers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            borderTop: '1px solid #F1F5F9',
            paddingTop: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> Period:
            </span>

            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'quarter', label: 'This Quarter' },
              { id: 'ytd', label: 'This Year (YTD)' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => {
              const active = datePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleDatePreset(p.id)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '20px',
                    border: active ? '1.5px solid #1E4D8C' : '1px solid #CBD5E1',
                    background: active ? '#EFF6FF' : '#FFFFFF',
                    color: active ? '#1E4D8C' : '#475569',
                    fontSize: '0.76rem',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}

            {/* Custom Date Pickers */}
            {(datePreset === 'custom' || startDate || endDate) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px', background: '#F8FAFC', padding: '3px 8px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B' }}>From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  style={{ padding: '3px 6px', fontSize: '0.76rem', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B' }}>To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  style={{ padding: '3px 6px', fontSize: '0.76rem', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                />
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={13} color="#2563EB" />
            <span>Active Range: <strong>{currentDateRangeLabel}</strong></span>
          </div>
        </div>

        {/* Row 3: Active Filters Summary Tag Ribbon */}
        {isAnyFilterActive && (
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, color: '#1E4D8C' }}>Applied Filters:</span>
              {(startDate || endDate || datePreset !== 'all') && (
                <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  📅 {currentDateRangeLabel}
                </span>
              )}
              {centerFilter !== 'all' && (
                <span style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  📍 {currentCenterLabel}
                </span>
              )}
              {paymentMethodFilter !== 'all' && (
                <span style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  💳 Method: {paymentMethodFilter}
                </span>
              )}
              {searchQuery && (
                <span style={{ background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  🔍 "{searchQuery}"
                </span>
              )}
            </div>

            <span style={{ color: '#64748B', fontWeight: 700 }}>
              Showing {activeReport === 'sales_revenue' ? filteredSalesData.length : activeReport === 'profit_margin' ? filteredProfitData.length : activeReport === 'cash_collection' ? filteredPaymentsData.length : filteredInventoryData.length} records matching criteria
            </span>
          </div>
        )}
      </div>

      {/* 3. EXECUTIVE KPI STAT CARDS */}
      {renderActiveStatCards()}

      {/* 4. ACTIVE DATA TABLE */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          padding: '18px 20px',
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {activeReportObj.iconName === 'TrendingUp' && <TrendingUp size={20} color="#10B981" />}
              {activeReportObj.iconName === 'Wallet' && <Wallet size={20} color="#2563EB" />}
              {activeReportObj.iconName === 'BarChart3' && <BarChart3 size={20} color="#2563EB" />}
              {activeReportObj.iconName === 'Package' && <Package size={20} color="#F59E0B" />}
              {activeReportObj.label} Statement
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
              {activeReportObj.subtitle}
            </span>
          </div>
        </div>

        {renderActiveTable()}
      </div>

      {/* 5. RECORD DETAIL INSPECTION MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Audit Record Details"
      >
        {selectedRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.84rem' }}>
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Reference ID:</span>
                <strong style={{ fontFamily: 'monospace', color: '#1E4D8C' }}>{selectedRecord.receipt_no || selectedRecord.invoice_no || selectedRecord.contract_no || selectedRecord.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Customer Name:</span>
                <strong>{selectedRecord.customer_name || 'Client'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Date:</span>
                <span>{formatDate(selectedRecord.date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Center Hub:</span>
                <span>{selectedRecord.center_code || 'Direct Single'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #CBD5E1', paddingTop: '8px' }}>
                <span style={{ fontWeight: 800 }}>Total Value / Amount:</span>
                <strong style={{ color: '#10B981', fontSize: '1rem' }}>{formatLKR(selectedRecord.amount || selectedRecord.gross_amount)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDetailModalOpen(false)}
                style={{ padding: '8px 18px', fontWeight: 700 }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
