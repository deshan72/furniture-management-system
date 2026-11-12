import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Package,
  TrendingUp,
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
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { formatLKR, formatDate, formatDateTime } from '../utils/formatters';
import { formatCenterCode } from '../utils/centersData';
import { INITIAL_PRODUCTS } from '../utils/productUtils';
import {
  REPORT_TYPES,
  loadAllOrders,
  exportReportToCSV,
  printReportToPDF,
} from '../utils/reportsData';

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
    return ['sales_revenue', 'inventory_valuation', 'profit_margin'].includes(type)
      ? type
      : 'sales_revenue';
  };

  // Active Report Type State
  const [activeReport, setActiveReport] = useState(() => getValidReport(initialReportType));

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

  // Sourced Data from LocalStorage with safe fallbacks
  const [orders, setOrders] = useState(() => loadAllOrders());

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

  // Sync with live storage updates when orders or products change
  useEffect(() => {
    const handleStorage = () => {
      setOrders(loadAllOrders());
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

  // Report 3: Profit & Loss / Margin Dataset
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
        matched_item: matchedProd ? matchedProd.name : (o.items_summary || o.item_name || 'Solid Wood Furniture'),
      };
    });
  }, [filteredSalesData, products]);

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
      'DNS Home Solutions': 'Official Management Report Ledger',
      'Report Type': activeReportObj.label,
      'Regional Hub': currentCenterLabel,
      'Time Horizon': currentDateRangeLabel,
      'Generated On': formatDateTime(new Date().toISOString()),
    };

    if (activeReport === 'sales_revenue') {
      const headers = [
        'Invoice No',
        'Contract No',
        'Date',
        'Customer ID',
        'Customer Name',
        'Phone',
        'Regional Hub',
        'Furniture Items',
        'Gross Amount (LKR)',
        'Advance Paid (LKR)',
        'Balance Due (LKR)',
        'Payment Method',
        'Status',
      ];
      const rows = filteredSalesData.map((o) => [
        o.invoice_no || o.id,
        o.contract_no || '-',
        o.date,
        o.customer_id || o.customer_nic || '-',
        o.customer_name || 'Client',
        o.customer_phone || '-',
        `${o.branch_code || 'MHG'}/${o.center_code || 'C001'}`,
        o.items_summary || o.item_name || 'Solid Wood Furniture',
        Number(o.gross_amount) || 0,
        Number(o.advance_paid) || 0,
        Number(o.balance_due) || 0,
        o.payment_method || (o.payment_type === 'cash' ? 'Cash' : 'Installment'),
        o.status || 'Active',
      ]);
      const totalGross = filteredSalesData.reduce((s, o) => s + (Number(o.gross_amount) || 0), 0);
      const totalAdv = filteredSalesData.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);
      const totalBal = filteredSalesData.reduce((s, o) => s + (Number(o.balance_due) || 0), 0);
      const summaryRow = ['TOTALS', '', '', '', '', '', '', `${filteredSalesData.length} Orders`, totalGross, totalAdv, totalBal, '', ''];

      exportReportToCSV({
        filename: `DNS_Home_Solutions_Sales_Turnover_${Date.now()}`,
        reportTitle: 'Sales Turnover & Invoice Revenue Audit',
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
        'Stock Units',
        'Unit Cost (LKR)',
        'Selling Price (LKR)',
        'Cost Valuation (LKR)',
        'Retail Valuation (LKR)',
      ];
      const rows = filteredInventoryData.map((p) => [
        p.item_code,
        p.name,
        p.category,
        p.wood_type || 'Timber',
        Number(p.stock_quantity) || 0,
        Number(p.cost_price) || 0,
        Number(p.selling_price) || 0,
        (Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0),
        (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0),
      ]);
      const totalCostVal = filteredInventoryData.reduce(
        (s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.cost_price) || 0),
        0
      );
      const totalRetailVal = filteredInventoryData.reduce(
        (s, p) => s + (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0),
        0
      );
      const summaryRow = ['TOTALS', '', '', '', '', '', '', totalCostVal, totalRetailVal];

      exportReportToCSV({
        filename: `DNS_Home_Solutions_Stock_Valuation_${Date.now()}`,
        reportTitle: 'Inventory Stock Valuation & Model Catalog Report',
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
      const totalGross = filteredSalesData.reduce((s, o) => s + (Number(o.gross_amount) || 0), 0);
      const totalAdv = filteredSalesData.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);
      const totalBal = filteredSalesData.reduce((s, o) => s + (Number(o.balance_due) || 0), 0);
      const fullyPaidOrders = filteredSalesData.filter((o) => Number(o.balance_due) <= 0);

      printReportToPDF({
        reportTitle: 'Sales Turnover & Revenue Audit Report',
        subtitle: 'Customer invoice transactions, advance collections, and delivery status',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Total Invoices', value: filteredSalesData.length, sub: 'Orders generated' },
          { label: 'Gross Revenue', value: formatLKR(totalGross), color: '#1E4D8C' },
          { label: 'Advances Collected', value: formatLKR(totalAdv), color: '#10B981' },
          { label: 'Fully Settled', value: `${fullyPaidOrders.length} Orders`, color: '#059669' },
        ],
        tableHeaders: [
          { label: 'Invoice No' },
          { label: 'Date' },
          { label: 'Customer' },
          { label: 'Hub' },
          { label: 'Items' },
          { label: 'Gross (LKR)', align: 'right' },
          { label: 'Advance (LKR)', align: 'right' },
          { label: 'Balance Due (LKR)', align: 'right' },
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
        reportTitle: 'Inventory Valuation & Finished Stock Report',
        subtitle: 'Cost price asset value vs. potential retail turnover in showrooms',
        dateRangeText: currentDateRangeLabel,
        centerText: currentCenterLabel,
        kpiCards: [
          { label: 'Total Models', value: filteredInventoryData.length, sub: 'Active furniture lines' },
          { label: 'Total Physical Stock', value: `${totalUnits} Units`, color: '#1E4D8C' },
          { label: 'Cost Valuation (COGS)', value: formatLKR(totalCostVal), color: '#F59E0B' },
          { label: 'Retail Value (Selling)', value: formatLKR(totalRetailVal), color: '#10B981' },
        ],
        tableHeaders: [
          { label: 'Item Code' },
          { label: 'Product Model' },
          { label: 'Category' },
          { label: 'Wood / Finish' },
          { label: 'Stock', align: 'center' },
          { label: 'Unit Cost', align: 'right' },
          { label: 'Selling Price', align: 'right' },
          { label: 'Cost Value (LKR)', align: 'right' },
          { label: 'Retail Value (LKR)', align: 'right' },
        ],
        tableRows: filteredInventoryData.map((p) => {
          const qty = Number(p.stock_quantity) || 0;
          const cost = Number(p.cost_price) || 0;
          const price = Number(p.selling_price) || 0;
          return [
            `<span style="font-family: monospace; font-weight: 700; color: #1E4D8C;">${p.item_code}</span>`,
            `<strong>${p.name}</strong>`,
            p.category,
            `${p.wood_type || 'Wood'} (${p.finish || 'Matte'})`,
            `<strong style="color: ${qty <= (p.reorder_level || 2) ? '#EF4444' : '#10B981'};">${qty}</strong>`,
            formatLKR(cost),
            formatLKR(price),
            formatLKR(qty * cost),
            formatLKR(qty * price),
          ];
        }),
        summaryCells: ['TOTAL VALUATION', '', '', '', `${totalUnits} Units`, '', '', formatLKR(totalCostVal), formatLKR(totalRetailVal)],
      });
    } else if (activeReport === 'profit_margin') {
      const totalRev = filteredProfitData.reduce((s, p) => s + (Number(p.gross_amount) || 0), 0);
      const totalCOGS = filteredProfitData.reduce((s, p) => s + (Number(p.cogs) || 0), 0);
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

    if (activeReport === 'profit_margin') {
      const totalRev = filteredProfitData.reduce((s, p) => s + (Number(p.gross_amount) || 0), 0);
      const totalCOGS = filteredProfitData.reduce((s, p) => s + (Number(p.cogs) || 0), 0);
      const totalProfit = totalRev - totalCOGS;
      const overallMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0;

      return (
        <div className="stats-grid">
          <StatCard
            title="Gross Revenue"
            value={formatLKR(totalRev)}
            subtitle={`${filteredProfitData.length} completed furniture sales`}
            icon={BarChart3}
            color="#2563EB"
            bg="rgba(37, 99, 235, 0.12)"
          />
          <StatCard
            title="Estimated COGS"
            value={formatLKR(totalCOGS)}
            subtitle="Timber, lacquer, and labor cost"
            icon={Hammer}
            color="#F59E0B"
            bg="rgba(245, 158, 11, 0.12)"
          />
          <StatCard
            title="Gross Profit"
            value={formatLKR(totalProfit)}
            subtitle="Revenue minus production cost"
            icon={CheckCircle}
            color="#10B981"
            bg="rgba(16, 185, 129, 0.12)"
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
              <th style={{ width: '14%', minWidth: '150px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                Invoice & Contract
              </th>
              <th style={{ width: '10%', minWidth: '110px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                Date
              </th>
              <th style={{ width: '22%', minWidth: '220px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Client Profile & NIC
              </th>
              <th style={{ width: '10%', minWidth: '110px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                Hub Center
              </th>
              <th style={{ width: '18%', minWidth: '190px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Furniture Item
              </th>
              <th style={{ width: '12%', minWidth: '130px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>
                Order Value
              </th>
              <th style={{ width: '12%', minWidth: '130px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>
                Advance Paid
              </th>
              <th style={{ width: '12%', minWidth: '130px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>
                Balance Due
              </th>
              <th style={{ width: '10%', minWidth: '120px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap' }}>
                Payment Mode
              </th>
              <th style={{ width: '10%', minWidth: '115px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap' }}>
                Status
              </th>
              <th style={{ width: '8%', minWidth: '85px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSalesData.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '48px 24px', color: '#64748B' }}>
                  <Package size={36} color="#94A3B8" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <strong>No sales invoice records match the selected filters.</strong>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Try switching date presets or clearing the search query.</div>
                </td>
              </tr>
            ) : (
              filteredSalesData.map((o, idx) => {
                const isEven = idx % 2 === 0;
                const pMethod = o.payment_method || (o.payment_type === 'cash' ? 'Cash' : 'Installment');
                const isPaid = Number(o.balance_due) <= 0;
                return (
                  <tr
                    key={o.id || idx}
                    style={{
                      background: isEven ? '#FFFFFF' : '#F8FAFC',
                      borderBottom: '1px solid #E2E8F0',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#EFF6FF')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isEven ? '#FFFFFF' : '#F8FAFC')}
                  >
                    {/* Invoice & Contract */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          color: '#1E4D8C',
                          background: '#EFF6FF',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #BFDBFE',
                          display: 'inline-block',
                        }}
                      >
                        🧾 {o.invoice_no || o.id}
                      </div>
                      {o.contract_no && (
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px', fontFamily: 'monospace' }}>
                          📜 {o.contract_no}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: '0.82rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={13} color="#64748B" />
                        <span>{formatDate(o.date)}</span>
                      </div>
                    </td>

                    {/* Client Profile */}
                    <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: '#EFF6FF',
                            border: '1.5px solid #BFDBFE',
                            color: '#1E4D8C',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(o.customer_name)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {o.customer_name || 'Valued Client'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span className="nic-pill" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.68rem', padding: '1px 6px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                              🆔 {o.customer_id || o.customer_nic || 'N/A'}
                            </span>
                            {o.customer_phone && (
                              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                📞 {o.customer_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Hub */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#334155',
                        }}
                      >
                        📍 {o.branch_code || 'MHG'}/{formatCenterCode(o.center_code || 'C001')}
                      </span>
                    </td>

                    {/* Furniture Item */}
                    <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1E293B' }}>
                        🪵 {o.items_summary || o.item_name || 'Handcrafted Furniture'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                        {o.item_code ? `Code: ${o.item_code} • ` : ''}Qty: {o.quantity || 1}
                      </div>
                    </td>

                    {/* Gross Order Value */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A', fontFamily: 'var(--font-heading)' }}>
                        {formatLKR(Number(o.gross_amount) || 0)}
                      </span>
                    </td>

                    {/* Advance Paid */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          color: '#059669',
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        + {formatLKR(Number(o.advance_paid) || 0)}
                      </span>
                    </td>

                    {/* Balance Due */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          color: isPaid ? '#10B981' : '#D97706',
                          background: isPaid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.12)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${isPaid ? '#A7F3D0' : '#FDE68A'}`,
                        }}
                      >
                        {formatLKR(Number(o.balance_due) || 0)}
                      </span>
                    </td>

                    {/* Payment Mode */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: pMethod.toLowerCase().includes('cash') ? '#ECFDF5' : '#EFF6FF',
                          color: pMethod.toLowerCase().includes('cash') ? '#047857' : '#1D4ED8',
                          border: `1px solid ${pMethod.toLowerCase().includes('cash') ? '#A7F3D0' : '#BFDBFE'}`,
                        }}
                      >
                        {pMethod.toLowerCase().includes('cash') ? '💵 Cash' : '🏦 ' + pMethod}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: isPaid ? '#DCFCE7' : '#FEF3C7',
                          color: isPaid ? '#15803D' : '#B45309',
                          border: `1px solid ${isPaid ? '#86EFAC' : '#FDE68A'}`,
                        }}
                      >
                        {isPaid ? '✓ Fully Paid' : '⏳ Active Loan'}
                      </span>
                    </td>

                    {/* Quick View Button */}
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleOpenDetail(o)}
                        title="View Full Order Breakdown"
                        style={{ padding: '4px 8px', fontSize: '0.74rem', borderRadius: '6px' }}
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredSalesData.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F1F5F9', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
                <td colSpan={5} style={{ padding: '14px 16px', textAlign: 'right', textTransform: 'uppercase', color: '#1E293B', fontSize: '0.78rem' }}>
                  Summary Total ({filteredSalesData.length} Orders):
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#1E4D8C', fontSize: '0.92rem' }}>
                  {formatLKR(totalGross)}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#059669', fontSize: '0.92rem' }}>
                  +{formatLKR(totalAdv)}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#D97706', fontSize: '0.92rem' }}>
                  {formatLKR(totalBal)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    // 2. Stock Valuation Table
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
        <table className="custom-table" style={{ width: '100%', minWidth: '1150px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)', borderBottom: '2px solid #E2E8F0' }}>
              <th style={{ width: '12%', minWidth: '120px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Item Code
              </th>
              <th style={{ width: '25%', minWidth: '240px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Product Model & Finish
              </th>
              <th style={{ width: '12%', minWidth: '120px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Category
              </th>
              <th style={{ width: '10%', minWidth: '90px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                Stock Units
              </th>
              <th style={{ width: '12%', minWidth: '120px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Unit Cost
              </th>
              <th style={{ width: '12%', minWidth: '120px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Selling Price
              </th>
              <th style={{ width: '14%', minWidth: '140px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Cost Value
              </th>
              <th style={{ width: '14%', minWidth: '140px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Retail Value
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredInventoryData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px', color: '#64748B' }}>
                  <Package size={36} color="#94A3B8" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <strong>No inventory models found in database.</strong>
                </td>
              </tr>
            ) : (
              filteredInventoryData.map((p, idx) => {
                const qty = Number(p.stock_quantity) || 0;
                const cost = Number(p.cost_price) || 0;
                const price = Number(p.selling_price) || 0;
                const isEven = idx % 2 === 0;
                const isLow = qty <= (p.reorder_level || 2);
                return (
                  <tr
                    key={p.id || idx}
                    style={{
                      background: isEven ? '#FFFFFF' : '#F8FAFC',
                      borderBottom: '1px solid #E2E8F0',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#EFF6FF')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isEven ? '#FFFFFF' : '#F8FAFC')}
                  >
                    <td style={{ padding: '12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          color: '#1E4D8C',
                          background: '#EFF6FF',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        {p.item_code}
                      </span>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                        {p.wood_type || 'Timber'} • {p.finish || 'Matte Lacquer'}
                      </div>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#F1F5F9',
                          color: '#475569',
                          textTransform: 'capitalize',
                        }}
                      >
                        {p.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          color: isLow ? '#DC2626' : '#0F172A',
                          background: isLow ? '#FEE2E2' : '#F1F5F9',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: isLow ? '1px solid #FECACA' : 'none',
                        }}
                      >
                        {qty}
                      </span>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#475569' }}>
                        {formatLKR(cost)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>
                        {formatLKR(price)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569' }}>
                        {formatLKR(qty * cost)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#059669' }}>
                        {formatLKR(qty * price)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredInventoryData.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F1F5F9', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
                <td colSpan={3} style={{ padding: '14px 16px', textAlign: 'right', textTransform: 'uppercase', color: '#1E293B', fontSize: '0.78rem' }}>
                  Stock Portfolio Total:
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'center', color: '#1E4D8C', fontSize: '0.9rem' }}>
                  {totalUnits} Units
                </td>
                <td colSpan={2}></td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#64748B', fontSize: '0.92rem' }}>
                  {formatLKR(totalCostVal)}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#059669', fontSize: '0.95rem' }}>
                  {formatLKR(totalRetailVal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    // 3. Profit & Margins Table
    if (activeReport === 'profit_margin') {
      const totalRev = filteredProfitData.reduce((s, p) => s + (Number(p.gross_amount) || 0), 0);
      const totalCOGS = filteredProfitData.reduce((s, p) => s + (Number(p.cogs) || 0), 0);
      const totalProfit = totalRev - totalCOGS;
      const overallMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0;

      return (
        <table className="custom-table" style={{ width: '100%', minWidth: '1120px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)', borderBottom: '2px solid #E2E8F0' }}>
              <th style={{ width: '14%', minWidth: '140px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Invoice No
              </th>
              <th style={{ width: '11%', minWidth: '110px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Date
              </th>
              <th style={{ width: '18%', minWidth: '180px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Client Name
              </th>
              <th style={{ width: '21%', minWidth: '200px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Furniture Item
              </th>
              <th style={{ width: '12%', minWidth: '120px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Revenue
              </th>
              <th style={{ width: '12%', minWidth: '120px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Estimated COGS
              </th>
              <th style={{ width: '12%', minWidth: '120px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                Gross Profit
              </th>
              <th style={{ width: '10%', minWidth: '95px', padding: '14px 12px', fontSize: '0.74rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                Margin %
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProfitData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px', color: '#64748B' }}>
                  <TrendingUp size={36} color="#94A3B8" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <strong>No profit margin data found for current filters.</strong>
                </td>
              </tr>
            ) : (
              filteredProfitData.map((p, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={p.id || idx}
                    style={{
                      background: isEven ? '#FFFFFF' : '#F8FAFC',
                      borderBottom: '1px solid #E2E8F0',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#EFF6FF')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isEven ? '#FFFFFF' : '#F8FAFC')}
                  >
                    <td style={{ padding: '12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          color: '#1E4D8C',
                          background: '#EFF6FF',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        🧾 {p.invoice_no || p.contract_no || p.id}
                      </span>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: '0.82rem', color: '#334155' }}>
                      {formatDate(p.date)}
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>
                        {p.customer_name || 'Client'}
                      </div>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1E293B' }}>
                        🪵 {p.items_summary || p.item_name || 'Solid Wood Furniture'}
                      </div>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E293B' }}>
                        {formatLKR(Number(p.gross_amount) || 0)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.86rem', color: '#64748B' }}>
                        {formatLKR(Number(p.cogs) || 0)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          color: '#059669',
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        +{formatLKR(Number(p.gross_profit) || 0)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: '#F3E8FF',
                          color: '#7E22CE',
                          border: '1px solid #E9D5FF',
                        }}
                      >
                        {p.margin_pct || 0}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredProfitData.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F1F5F9', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
                <td colSpan={4} style={{ padding: '14px 16px', textAlign: 'right', textTransform: 'uppercase', color: '#1E293B', fontSize: '0.78rem' }}>
                  Total Profitability Summary:
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#1E4D8C', fontSize: '0.95rem' }}>
                  {formatLKR(totalRev)}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#64748B', fontSize: '0.92rem' }}>
                  {formatLKR(totalCOGS)}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: '#059669', fontSize: '0.98rem' }}>
                  +{formatLKR(totalProfit)}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'center', color: '#9333EA', fontSize: '0.92rem' }}>
                  {overallMargin}%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      );
    }

    return null;
  };

  // =========================================================
  // 5. EXECUTIVE CARDS VIEW (ALTERNATIVE TO TABLE)
  // =========================================================

  const renderActiveCardsView = () => {
    if (activeReport === 'sales_revenue') {
      if (filteredSalesData.length === 0) {
        return (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', color: '#64748B' }}>
            <Package size={36} color="#94A3B8" style={{ margin: '0 auto 8px', display: 'block' }} />
            <strong>No sales orders found matching filters.</strong>
          </div>
        );
      }
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredSalesData.map((o) => {
            const isPaid = Number(o.balance_due) <= 0;
            return (
              <div
                key={o.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.84rem', color: '#1E4D8C', background: '#EFF6FF', padding: '3px 8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                    🧾 {o.invoice_no || o.id}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: isPaid ? '#DCFCE7' : '#FEF3C7',
                      color: isPaid ? '#15803D' : '#B45309',
                    }}
                  >
                    {isPaid ? '✓ Fully Paid' : '⏳ Active Loan'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E4D8C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.82rem' }}>
                    {getInitials(o.customer_name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>{o.customer_name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>🆔 {o.customer_id || o.customer_nic} • 📍 {o.branch_code}/{o.center_code}</div>
                  </div>
                </div>

                <div style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 700, color: '#1E293B' }}>🪵 {o.items_summary || o.item_name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>📅 Date: {formatDate(o.date)}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Value</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>{formatLKR(Number(o.gross_amount) || 0)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Balance Due</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isPaid ? '#10B981' : '#D97706' }}>
                      {formatLKR(Number(o.balance_due) || 0)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleOpenDetail(o)}
                  style={{ width: '100%', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px' }}
                >
                  <Eye size={14} /> View Order Breakdown
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    // Default fallback to table for other reports
    return renderActiveTable();
  };

  return (
    <div className="reports-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* =========================================================
          1. EXECUTIVE REPORT TYPE SELECTOR (STREAMLINED 3-PILL RIBBON)
          ========================================================= */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          padding: '14px 18px',
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
              Financial & Operational Reports Hub
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

        {/* 3 Active Report Switcher Pills */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            borderTop: '1px solid #F1F5F9',
            paddingTop: '12px',
          }}
        >
          {REPORT_TYPES.map((rep) => {
            const isActive = activeReport === rep.id;
            let count = 0;
            if (rep.id === 'sales_revenue') count = filteredSalesData.length;
            if (rep.id === 'inventory_valuation') count = filteredInventoryData.length;
            if (rep.id === 'profit_margin') count = filteredProfitData.length;

            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => setActiveReport(rep.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
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
                  {rep.id === 'inventory_valuation' && <Package size={18} />}
                  {rep.id === 'profit_margin' && <TrendingUp size={18} />}
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

      {/* =========================================================
          2. FILTER & SEARCH CONTROL TOOLBAR
          ========================================================= */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
            />
            <input
              type="text"
              placeholder={`Search in ${activeReportObj.label} by client, invoice, code, or description...`}
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
            {/* Center Selector */}
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
                minWidth: '220px',
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

            {/* View Mode Switcher */}
            <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'table' ? '#1E4D8C' : '#64748B',
                  boxShadow: viewMode === 'table' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <List size={14} /> Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: viewMode === 'cards' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'cards' ? '#1E4D8C' : '#64748B',
                  boxShadow: viewMode === 'cards' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <LayoutGrid size={14} /> Cards
              </button>
            </div>

            {/* Reset Button */}
            {isAnyFilterActive && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetFilters}
                style={{ padding: '8px 12px', fontSize: '0.8rem', gap: '4px', borderRadius: '8px' }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Date Range Quick Chips */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Period:</span>

            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'quarter', label: 'This Quarter' },
              { id: 'ytd', label: 'Year to Date' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => {
              const active = datePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDatePreset(p.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: active ? '1.5px solid #1E4D8C' : '1px solid #CBD5E1',
                    background: active ? '#EFF6FF' : '#FFFFFF',
                    color: active ? '#1E4D8C' : '#475569',
                    fontSize: '0.76rem',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              );
            })}

            {datePreset === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                />
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={13} color="#2563EB" />
            <span>Active Range: <strong>{currentDateRangeLabel}</strong></span>
          </div>
        </div>
      </div>

      {/* =========================================================
          3. DYNAMIC STAT CARDS FOR ACTIVE REPORT
          ========================================================= */}
      {renderActiveStatCards()}

      {/* =========================================================
          4. MAIN REPORT DATA CONTAINER (TABLE / CARDS VIEW)
          ========================================================= */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid #E2E8F0',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                {activeReportObj.label} Report Ledger
              </h3>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, background: '#EFF6FF', color: '#1E4D8C', padding: '2px 8px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                Official Business Record
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>
              Filtered by: {currentCenterLabel} • {currentDateRangeLabel}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleExportCSV}
              style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '5px' }}
            >
              <Download size={14} /> Download CSV
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handlePrintPDF}
              style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '5px' }}
            >
              <Printer size={14} /> Print PDF
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', padding: viewMode === 'cards' ? '18px' : '0' }}>
          {viewMode === 'table' ? renderActiveTable() : renderActiveCardsView()}
        </div>
      </div>

      {/* =========================================================
          5. AUDIT DETAIL MODAL
          ========================================================= */}
      {isDetailModalOpen && selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid #CBD5E1',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                background: '#1E4D8C',
                color: '#FFFFFF',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Record Audit Breakdown
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#BFDBFE' }}>
                  {selectedRecord.invoice_no || selectedRecord.contract_no || selectedRecord.ref_no || selectedRecord.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Client Name</div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', marginTop: '2px' }}>
                    {selectedRecord.customer_name || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                    NIC: {selectedRecord.customer_id || selectedRecord.customer_nic || 'N/A'}
                  </div>
                </div>

                <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Hub & Location</div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A', marginTop: '2px' }}>
                    {selectedRecord.branch_code || 'MHG'}/{formatCenterCode(selectedRecord.center_code || 'C001')}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                    Date: {formatDate(selectedRecord.date)}
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Furniture Item / Specification</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1E293B', marginTop: '4px' }}>
                  🪵 {selectedRecord.items_summary || selectedRecord.item_name || 'Handcrafted Furniture'}
                </div>
                {selectedRecord.item_code && (
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                    Item Code: {selectedRecord.item_code} • Qty: {selectedRecord.quantity || 1}
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 14px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#1E4D8C', fontWeight: 700, textTransform: 'uppercase' }}>Gross Value</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', marginTop: '2px' }}>
                      {formatLKR(Number(selectedRecord.gross_amount) || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>Advance Paid</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#059669', marginTop: '2px' }}>
                      {formatLKR(Number(selectedRecord.advance_paid) || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#D97706', fontWeight: 700, textTransform: 'uppercase' }}>Balance Due</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#D97706', marginTop: '2px' }}>
                      {formatLKR(Number(selectedRecord.balance_due) || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {selectedRecord.notes && (
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontStyle: 'italic' }}>
                  📝 Note: {selectedRecord.notes}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 20px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close View
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handlePrintPDF();
                }}
              >
                <Printer size={15} /> Print Official Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
