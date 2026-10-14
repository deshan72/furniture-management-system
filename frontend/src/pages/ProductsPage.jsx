import React, { useState, useEffect, useMemo } from 'react';
import {
  Armchair,
  Boxes,
  Layers,
  Search,
  Filter,
  X,
  Plus,
  Download,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Eye,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  DollarSign,
  Ruler,
  Tag,
  Package,
  PackagePlus,
  PackageMinus,
  List,
  LayoutGrid,
  Store,
  Sparkles,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { apiRequest } from '../services/api';

// Realistic initial Sri Lankan wooden furniture records (6 items as requested)
const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    item_code: 'FURN-101',
    name: 'Royal Teak 6-Seater Dining Table',
    category: 'dining',
    wood_type: 'Teak (තේක්ක)',
    finish: 'Natural Matte Lacquer',
    dimensions: '72"L x 38"W x 30"H',
    cost_price: 65000,
    selling_price: 98500,
    stock_quantity: 4,
    reorder_level: 2,
    description: 'Solid Ceylon Teak wood top with heavy carved legs and 6 matching cushioned chairs.',
    created_at: '2026-09-15T10:00:00Z',
  },
  {
    id: 'prod-2',
    item_code: 'FURN-102',
    name: 'Mahogany 3-Door Wardrobe (Almirah)',
    category: 'bedroom',
    wood_type: 'Mahogany (මහෝගනී)',
    finish: 'Warm Mahogany Gloss',
    dimensions: '78"H x 54"W x 22"D',
    cost_price: 52000,
    selling_price: 78000,
    stock_quantity: 1,
    reorder_level: 2,
    description: 'Fitted with inner locker, solid brass hinges, full-length mirror, and polished drawers.',
    created_at: '2026-09-20T14:30:00Z',
  },
  {
    id: 'prod-3',
    item_code: 'FURN-103',
    name: 'Nadun King Size Platform Bed',
    category: 'bedroom',
    wood_type: 'Nadun (නැදුන්)',
    finish: 'Dark Walnut Finish',
    dimensions: '78"L x 72"W x 48"H Headboard',
    cost_price: 85000,
    selling_price: 135000,
    stock_quantity: 3,
    reorder_level: 2,
    description: 'Premium heavy Nadun timber frame with carved headboard and heavy cross-beams.',
    created_at: '2026-09-25T11:15:00Z',
  },
  {
    id: 'prod-4',
    item_code: 'FURN-104',
    name: 'Executive Teak Office Desk (L-Shape)',
    category: 'office',
    wood_type: 'Teak (තේක්ක)',
    finish: 'Melamine Scratch-Resistant',
    dimensions: '60"W x 30"D x 30"H + 36" Side Return',
    cost_price: 45000,
    selling_price: 68500,
    stock_quantity: 2,
    reorder_level: 2,
    description: 'Modern executive office desk with 3 lockable drawers, cable ports, and keyboard tray.',
    created_at: '2026-10-01T09:00:00Z',
  },
  {
    id: 'prod-5',
    item_code: 'FURN-105',
    name: 'Ceylon Mara Coffee Table with Glass Top',
    category: 'living_room',
    wood_type: 'Mara (මාර)',
    finish: 'Natural Live-Edge Varnish',
    dimensions: '42"L x 24"W x 18"H',
    cost_price: 18000,
    selling_price: 28500,
    stock_quantity: 5,
    reorder_level: 2,
    description: 'Rustic live-edge Mara wood center table with 8mm tempered glass top.',
    created_at: '2026-10-05T16:20:00Z',
  },
  {
    id: 'prod-6',
    item_code: 'FURN-106',
    name: 'Teak Veranda Easy Lounge Armchair',
    category: 'living_room',
    wood_type: 'Teak (තේක්ක)',
    finish: 'Outdoor Weatherproof Teak Oil',
    dimensions: '32"W x 34"D x 36"H',
    cost_price: 14000,
    selling_price: 22500,
    stock_quantity: 0,
    reorder_level: 2,
    description: 'Traditional Sri Lankan plantation style relaxing veranda chair with handwoven rattan back.',
    created_at: '2026-10-08T13:10:00Z',
  },
];

export default function ProductsPage({ initialStockFilter = 'all' }) {
  // Products state with local storage persistence
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_products_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_PRODUCTS;
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'living_room', 'bedroom', 'dining', 'office', 'custom'
  const [woodFilter, setWoodFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState(initialStockFilter); // 'all', 'in_stock', 'low_stock', 'out_of_stock'
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'price_desc', 'price_asc', 'stock_asc', 'stock_desc', 'name_asc'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState(1);
  const [adjustType, setAdjustType] = useState('add'); // 'add' | 'reduce'
  const [adjustReason, setAdjustReason] = useState('Workshop completion');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Form state for new product
  const [newProduct, setNewProduct] = useState({
    item_code: '',
    name: '',
    category: 'living_room',
    wood_type: 'Teak (තේක්ක)',
    finish: 'Natural Matte Lacquer',
    dimensions: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '1',
    reorder_level: '2',
    description: '',
  });

  // Save to localStorage whenever products change
  useEffect(() => {
    try {
      localStorage.setItem('dnd_products_list', JSON.stringify(products));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [products]);

  // Sync initialStockFilter prop if changed
  useEffect(() => {
    if (initialStockFilter) {
      setStockFilter(initialStockFilter);
    }
  }, [initialStockFilter]);

  // Try fetching from backend API on mount
  useEffect(() => {
    let isMounted = true;
    apiRequest('/products')
      .then((res) => {
        if (isMounted && res && res.data && res.data.length > 0) {
          setProducts(res.data);
        }
      })
      .catch(() => {
        // Fallback already loaded
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Format currency helper
  const formatLKR = (amount) => {
    const num = Number(amount) || 0;
    return `Rs. ${num.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get unique wood types for dropdown filter
  const availableWoodTypes = useMemo(() => {
    const woods = new Set();
    products.forEach((p) => {
      if (p.wood_type && p.wood_type.trim()) woods.add(p.wood_type.trim());
    });
    return Array.from(woods).sort();
  }, [products]);

  // KPI Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => Number(p.stock_quantity) > 0);
    const lowStock = products.filter(
      (p) => Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= Number(p.reorder_level || 2)
    );
    const outOfStock = products.filter((p) => Number(p.stock_quantity) <= 0);
    const totalValue = inStock.reduce(
      (sum, p) => sum + (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0),
      0
    );

    return {
      total,
      inStockCount: inStock.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      totalValue,
    };
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((prod) => {
        // 1. Text Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            prod.item_code?.toLowerCase().includes(q) ||
            prod.name?.toLowerCase().includes(q) ||
            prod.wood_type?.toLowerCase().includes(q) ||
            prod.category?.toLowerCase().includes(q) ||
            prod.dimensions?.toLowerCase().includes(q) ||
            prod.finish?.toLowerCase().includes(q) ||
            prod.description?.toLowerCase().includes(q);

          if (!matches) return false;
        }

        // 2. Category Filter
        if (categoryFilter !== 'all' && prod.category !== categoryFilter) {
          return false;
        }

        // 3. Wood Type Filter
        if (woodFilter !== 'all' && prod.wood_type !== woodFilter) {
          return false;
        }

        // 4. Stock Level Filter
        const qty = Number(prod.stock_quantity) || 0;
        const reorder = Number(prod.reorder_level || 2);
        if (stockFilter === 'in_stock' && qty <= 0) return false;
        if (stockFilter === 'low_stock' && (qty <= 0 || qty > reorder)) return false;
        if (stockFilter === 'out_of_stock' && qty > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_desc') {
          return (Number(b.selling_price) || 0) - (Number(a.selling_price) || 0);
        }
        if (sortBy === 'price_asc') {
          return (Number(a.selling_price) || 0) - (Number(b.selling_price) || 0);
        }
        if (sortBy === 'stock_asc') {
          return (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0);
        }
        if (sortBy === 'stock_desc') {
          return (Number(b.stock_quantity) || 0) - (Number(a.stock_quantity) || 0);
        }
        if (sortBy === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '');
        }
        // 'recent' by default
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [products, searchQuery, categoryFilter, woodFilter, stockFilter, sortBy]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setWoodFilter('all');
    setStockFilter('all');
    setSortBy('recent');
  };

  const isFilterActive =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'all' ||
    woodFilter !== 'all' ||
    stockFilter !== 'all' ||
    sortBy !== 'recent';

  // Open Add Product Modal with auto-generated Item Code
  const handleOpenAddModal = () => {
    const nextCodeNum = 100 + products.length + 1;
    setNewProduct({
      item_code: `FURN-${nextCodeNum}`,
      name: '',
      category: 'living_room',
      wood_type: 'Teak (තේක්ක)',
      finish: 'Natural Matte Lacquer',
      dimensions: '',
      cost_price: '',
      selling_price: '',
      stock_quantity: '1',
      reorder_level: '2',
      description: '',
    });
    setIsAddModalOpen(true);
  };

  // Add Product Handler
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.selling_price) {
      alert('Please fill in Product Name and Selling Price.');
      return;
    }

    const nextCodeNum = 100 + products.length + 1;
    const assignedCode = newProduct.item_code?.trim() || `FURN-${nextCodeNum}`;

    const createdRecord = {
      id: `prod-${Date.now()}`,
      item_code: assignedCode,
      name: newProduct.name.trim(),
      category: newProduct.category || 'living_room',
      wood_type: newProduct.wood_type || 'Teak (තේක්ක)',
      finish: newProduct.finish || 'Natural Finish',
      dimensions: newProduct.dimensions || 'Standard',
      cost_price: Number(newProduct.cost_price) || 0,
      selling_price: Number(newProduct.selling_price) || 0,
      stock_quantity: Number(newProduct.stock_quantity) || 0,
      reorder_level: Number(newProduct.reorder_level) || 2,
      description: newProduct.description || '',
      created_at: new Date().toISOString(),
    };

    // Try sending to backend
    try {
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(createdRecord),
      });
    } catch {
      // Local state fallback continues
    }

    setProducts((prev) => [createdRecord, ...prev]);
    setIsAddModalOpen(false);
  };

  // Open Edit Product Modal
  const handleOpenEdit = (product) => {
    setEditingProduct({ ...product });
    setIsEditModalOpen(true);
  };

  // Save Updated Product Details
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.selling_price) {
      alert('Please fill in Product Name and Selling Price.');
      return;
    }

    const updated = {
      ...editingProduct,
      cost_price: Number(editingProduct.cost_price) || 0,
      selling_price: Number(editingProduct.selling_price) || 0,
      stock_quantity: Number(editingProduct.stock_quantity) || 0,
      reorder_level: Number(editingProduct.reorder_level) || 2,
    };

    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

    if (selectedProduct?.id === updated.id) {
      setSelectedProduct(updated);
    }

    try {
      await apiRequest(`/products/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
    } catch {
      // Local state persists
    }

    setIsEditModalOpen(false);
    setEditingProduct(null);
  };

  // Delete Product
  const handleDeleteProduct = (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the product catalog?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (selectedProduct?.id === id) {
        setIsViewModalOpen(false);
      }
    }
  };

  // Open Quick Stock Adjust Modal
  const handleOpenAdjust = (product) => {
    setSelectedProduct(product);
    setAdjustQuantity(1);
    setAdjustType('add');
    setAdjustReason('Workshop batch received');
    setIsAdjustModalOpen(true);
  };

  // Confirm Stock Adjust
  const handleConfirmAdjust = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = Number(adjustQuantity) || 0;
    if (qty <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === selectedProduct.id) {
          const current = Number(p.stock_quantity) || 0;
          const newQty = adjustType === 'add' ? current + qty : Math.max(0, current - qty);
          return {
            ...p,
            stock_quantity: newQty,
          };
        }
        return p;
      })
    );

    setIsAdjustModalOpen(false);
  };

  // Export filtered products to CSV
  const handleExportCSV = () => {
    if (!filteredProducts.length) {
      alert('No products to export.');
      return;
    }

    const headers = [
      'Item Code',
      'Product Name',
      'Category',
      'Wood Type',
      'Finish',
      'Dimensions',
      'Cost Price (LKR)',
      'Selling Price (LKR)',
      'Stock Quantity',
      'Stock Status',
      'Description',
    ];

    const rows = filteredProducts.map((p) => {
      const qty = Number(p.stock_quantity) || 0;
      const reorder = Number(p.reorder_level || 2);
      let status = 'In Stock';
      if (qty <= 0) status = 'Out of Stock';
      else if (qty <= reorder) status = 'Low Stock';

      return [
        `"${p.item_code || ''}"`,
        `"${p.name?.replace(/"/g, '""') || ''}"`,
        `"${p.category || ''}"`,
        `"${p.wood_type || ''}"`,
        `"${p.finish || ''}"`,
        `"${p.dimensions || ''}"`,
        p.cost_price || 0,
        p.selling_price || 0,
        qty,
        `"${status}"`,
        `"${p.description?.replace(/"/g, '""') || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dd_furniture_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export filtered products to Printable PDF Catalog
  const handleExportPDF = () => {
    if (!filteredProducts.length) {
      alert('No products to export.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker prevented opening the print window. Please allow popups.');
      return;
    }

    const totalStockUnits = filteredProducts.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0);
    const totalInventoryValue = filteredProducts.reduce(
      (sum, p) => sum + (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0),
      0
    );

    const rowsHtml = filteredProducts
      .map((p, idx) => {
        const qty = Number(p.stock_quantity) || 0;
        const reorder = Number(p.reorder_level || 2);
        let statusBadge = `<span style="color: #2E9E5B; font-weight: bold;">● In Stock (${qty})</span>`;
        if (qty <= 0) {
          statusBadge = `<span style="color: #D64545; font-weight: bold;">✕ Out of Stock</span>`;
        } else if (qty <= reorder) {
          statusBadge = `<span style="color: #E5A100; font-weight: bold;">▲ Low Stock (${qty})</span>`;
        }

        return `
        <tr>
          <td style="padding: 9px 12px; border-bottom: 1px solid #CED4DA; text-align: center;">${idx + 1}</td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #CED4DA; font-family: monospace; font-weight: 700; color: #1E4D8C;">${p.item_code}</td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #CED4DA; font-weight: 600;">
            ${p.name}
            ${p.dimensions ? `<br><span style="color: #8A939C; font-size: 10px;">Size: ${p.dimensions}</span>` : ''}
          </td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #CED4DA; text-transform: capitalize;">${p.category?.replace('_', ' ')}</td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #CED4DA;">${p.wood_type}</td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #CED4DA; text-align: right; font-weight: 700;">Rs. ${Number(p.selling_price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 9px 12px; border-bottom: 1px solid #CED4DA; text-align: center;">${statusBadge}</td>
        </tr>
      `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>D & D Furniture - Inventory & Catalog Report</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #22272B; margin: 0; padding: 24px; font-size: 11px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; border-bottom: 2px solid #1E4D8C; padding-bottom: 12px; }
            .brand-title { font-size: 22px; font-weight: 800; color: #1E4D8C; margin: 0; letter-spacing: -0.5px; }
            .brand-sub { font-size: 11px; color: #4A5259; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
            .report-title { font-size: 16px; font-weight: 700; color: #143661; margin-top: 6px; }
            .meta-text { font-size: 11px; color: #4A5259; text-align: right; line-height: 1.5; }
            .summary-cards { display: flex; gap: 14px; margin-bottom: 18px; }
            .summary-card { border: 1px solid #CED4DA; border-radius: 8px; padding: 10px 16px; background: #F5F7F9; flex: 1; }
            .summary-label { font-size: 10px; color: #8A939C; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
            .summary-val { font-size: 18px; font-weight: 800; color: #22272B; margin-top: 3px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
            table.data-table th { background: #E9ECEF; color: #22272B; padding: 10px 12px; text-align: left; font-weight: 700; border-bottom: 2px solid #CED4DA; font-size: 11px; text-transform: uppercase; }
            .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #CED4DA; font-size: 10px; color: #8A939C; display: flex; justify-content: space-between; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="brand-title">D & D FURNITURE SYSTEM</div>
                <div class="brand-sub">Workshop & Showroom Inventory Catalog</div>
                <div class="report-title">Product Stock & Valuation Report</div>
              </td>
              <td class="meta-text">
                <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div><strong>Total Items:</strong> ${filteredProducts.length} Product Models</div>
              </td>
            </tr>
          </table>

          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-label">Total Filtered Models</div>
              <div class="summary-val">${filteredProducts.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Stock Units</div>
              <div class="summary-val">${totalStockUnits} Units</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Valuation (Selling)</div>
              <div class="summary-val" style="color: #1E4D8C;">Rs. ${totalInventoryValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th style="width: 90px;">Item Code</th>
                <th>Product Description & Size</th>
                <th>Category</th>
                <th>Wood Type</th>
                <th style="text-align: right;">Unit Price (LKR)</th>
                <th style="text-align: center;">Stock Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <span>D & D Furniture System • Automated Inventory Report</span>
            <span>Page 1 of 1</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Category badge helper
  const renderCategoryBadge = (category) => {
    switch (category) {
      case 'living_room':
        return (
          <span className="status-badge badge-showroom">
            <Armchair size={12} /> Living Room
          </span>
        );
      case 'bedroom':
        return (
          <span className="status-badge badge-custom">
            <Layers size={12} /> Bedroom
          </span>
        );
      case 'dining':
        return (
          <span className="status-badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
            <Sparkles size={12} /> Dining Suite
          </span>
        );
      case 'office':
        return (
          <span className="status-badge badge-wholesale">
            <Store size={12} /> Office Furniture
          </span>
        );
      default:
        return <span className="status-badge badge-custom">{category?.replace('_', ' ')}</span>;
    }
  };

  // Stock status pill helper
  const renderStockBadge = (quantity, reorderLevel = 2) => {
    const qty = Number(quantity) || 0;
    const reorder = Number(reorderLevel) || 2;

    if (qty <= 0) {
      return (
        <span className="status-badge badge-debt">
          <AlertCircle size={12} /> Out of Stock (0)
        </span>
      );
    }
    if (qty <= reorder) {
      return (
        <span className="status-badge" style={{ background: 'var(--warning-tint)', color: 'var(--warning)', border: '1px solid var(--warning-border)' }}>
          <AlertTriangle size={12} /> Low Stock ({qty} left)
        </span>
      );
    }
    return (
      <span className="status-badge badge-settled">
        <CheckCircle size={12} /> In Stock ({qty})
      </span>
    );
  };

  return (
    <div className="products-page-container">
      {/* =========================================================
          1. STATS OVERVIEW CARDS
          ========================================================= */}
      <div className="stats-grid">
        <StatCard
          title="Total Furniture Models"
          value={stats.total}
          subtitle="Catalog models in system"
          icon={Armchair}
          color="var(--primary)"
          bg="var(--primary-tint)"
        />
        <StatCard
          title="Available In Stock"
          value={stats.inStockCount}
          subtitle="Ready for showroom sale"
          icon={CheckCircle}
          color="var(--success)"
          bg="var(--success-tint)"
        />
        <StatCard
          title="Low Stock Reorders (අඩු තොග)"
          value={stats.lowStockCount}
          subtitle="Needs workshop carpentry"
          icon={AlertTriangle}
          color="var(--warning)"
          bg="var(--warning-tint)"
        />
        <StatCard
          title="Total Stock Valuation"
          value={formatLKR(stats.totalValue)}
          subtitle="Current physical inventory"
          icon={DollarSign}
          color="var(--accent)"
          bg="var(--accent-tint)"
        />
      </div>

      {/* =========================================================
          2. ADVANCED FILTER & SEARCH PANEL
          ========================================================= */}
      <div className="filter-card">
        {/* Row 1: Search Box + Action Buttons */}
        <div className="filter-row-top">
          <div className="filter-search-box">
            <Search className="filter-search-icon" size={18} />
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search by Code (FURN-101), Name, Wood (Teak), Size..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="filter-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear Search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="filter-actions-group">
            {/* Reset Filters Button */}
            {isFilterActive && (
              <button
                className="btn btn-secondary"
                onClick={handleResetFilters}
                title="Reset all applied filters"
                style={{ padding: '9px 14px', fontSize: '0.84rem' }}
              >
                <RotateCcw size={15} /> Reset
              </button>
            )}

            {/* Export Dropdown */}
            <div className="export-dropdown-wrapper">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                title="Export or Print Product Catalog"
                style={{ padding: '9px 14px', fontSize: '0.84rem', gap: '6px' }}
              >
                <Download size={15} /> Export <ChevronDown size={14} />
              </button>
              {isExportMenuOpen && (
                <div className="export-menu">
                  <button
                    type="button"
                    className="export-menu-item"
                    onClick={() => {
                      handleExportCSV();
                      setIsExportMenuOpen(false);
                    }}
                  >
                    <FileSpreadsheet size={16} color="var(--success)" />
                    <span>Export Catalog as CSV (Excel)</span>
                  </button>
                  <button
                    type="button"
                    className="export-menu-item"
                    onClick={() => {
                      handleExportPDF();
                      setIsExportMenuOpen(false);
                    }}
                  >
                    <Printer size={16} color="var(--primary)" />
                    <span>Print Catalog Report (PDF)</span>
                  </button>
                </div>
              )}
            </div>

            {/* + Add New Product Button */}
            <button
              className="btn btn-primary"
              onClick={handleOpenAddModal}
              style={{ padding: '9px 16px', fontSize: '0.86rem' }}
            >
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>

        {/* Row 2: Filter Dropdowns */}
        <div className="filter-row-secondary">
          {/* Category Filter */}
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">🛋️ All Furniture Categories</option>
            <option value="living_room">🛋️ Living Room (සාලය)</option>
            <option value="bedroom">🛏️ Bedroom (නිදන කාමර)</option>
            <option value="dining">🪑 Dining Room (කෑම කාමර)</option>
            <option value="office">💼 Office Furniture (කාර්යාල)</option>
          </select>

          {/* Wood Type Filter */}
          <select
            className="filter-select"
            value={woodFilter}
            onChange={(e) => setWoodFilter(e.target.value)}
          >
            <option value="all">🪵 All Wood Types (සියලු දැව)</option>
            {availableWoodTypes.map((wood) => (
              <option key={wood} value={wood}>
                🪵 {wood}
              </option>
            ))}
          </select>

          {/* Stock Level Filter */}
          <select
            className="filter-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">📦 All Stock Levels</option>
            <option value="in_stock">✅ In Stock Only</option>
            <option value="low_stock">⚠️ Low Stock Alerts (≤ 2)</option>
            <option value="out_of_stock">🚨 Out of Stock (0 units)</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recent">⏱️ Recently Added</option>
            <option value="price_desc">💰 Price: High to Low</option>
            <option value="price_asc">💵 Price: Low to High</option>
            <option value="stock_asc">📉 Stock: Low to High</option>
            <option value="stock_desc">📈 Stock: High to Low</option>
            <option value="name_asc">🔤 Name: A to Z</option>
          </select>
        </div>

        {/* Row 3: Quick Filter Chips */}
        <div className="filter-row-chips">
          <div className="filter-chips-list">
            <span className="filter-chips-label">Quick Filters:</span>

            <button
              className={`filter-chip-btn ${stockFilter === 'all' && categoryFilter === 'all' && woodFilter === 'all' ? 'active' : ''}`}
              onClick={handleResetFilters}
            >
              All Items <span className="filter-count-badge">{stats.total}</span>
            </button>

            <button
              className={`filter-chip-btn ${stockFilter === 'in_stock' ? 'active' : ''}`}
              onClick={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
            >
              <CheckCircle size={12} color="var(--success)" /> In Stock{' '}
              <span className="filter-count-badge">{stats.inStockCount}</span>
            </button>

            <button
              className={`filter-chip-btn ${stockFilter === 'low_stock' ? 'active' : ''}`}
              onClick={() => setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock')}
            >
              <AlertTriangle size={12} color="var(--warning)" /> Low Stock Alerts{' '}
              <span className="filter-count-badge">{stats.lowStockCount}</span>
            </button>

            <button
              className={`filter-chip-btn ${woodFilter.includes('Teak') ? 'active' : ''}`}
              onClick={() => setWoodFilter(woodFilter.includes('Teak') ? 'all' : 'Teak (තේක්ක)')}
            >
              🪵 Teak Wood
            </button>

            <button
              className={`filter-chip-btn ${categoryFilter === 'bedroom' ? 'active' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === 'bedroom' ? 'all' : 'bedroom')}
            >
              🛏️ Bedroom Sets
            </button>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--ash-500)', fontWeight: 500 }}>
            Showing <strong>{filteredProducts.length}</strong> of {products.length} items
          </div>
        </div>
      </div>

      {/* =========================================================
          3. PRODUCTS LIST & INVENTORY PANEL (TABLE / CARDS)
          ========================================================= */}
      <div className="table-wrapper">
        <div className="table-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Armchair size={19} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ash-900)' }}>
              Furniture Catalog & Stock Ledger
            </h3>
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table Grid View with Horizontal Scroll"
            >
              <List size={14} /> Table View
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card Tiles View"
            >
              <LayoutGrid size={14} /> Cards View
            </button>
          </div>
        </div>

        {/* View Mode 1: Table View */}
        {viewMode === 'table' ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '280px' }}>Product Details</th>
                  <th>Category</th>
                  <th>Wood Type & Finish</th>
                  <th>Dimensions (Size)</th>
                  <th style={{ textAlign: 'right' }}>Selling Price</th>
                  <th style={{ textAlign: 'center' }}>Stock Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="table-empty-state">
                        <Armchair size={42} color="var(--ash-400)" />
                        <h4 style={{ color: 'var(--ash-900)' }}>No matching furniture items found</h4>
                        <p style={{ color: 'var(--ash-500)', fontSize: '0.84rem' }}>
                          Try adjusting your search terms or reset the filters.
                        </p>
                        <button className="btn btn-secondary" onClick={handleResetFilters}>
                          Reset All Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => {
                    const qty = Number(prod.stock_quantity) || 0;

                    return (
                      <tr key={prod.id}>
                        {/* Product Info */}
                        <td>
                          <div className="table-user-cell">
                            <div
                              className="user-avatar"
                              style={{
                                background: 'var(--primary-tint)',
                                color: 'var(--primary)',
                                borderRadius: '10px',
                              }}
                            >
                              <Armchair size={18} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="customer-name">{prod.name}</span>
                                <span
                                  style={{
                                    background: 'var(--primary-tint)',
                                    color: 'var(--primary)',
                                    padding: '1px 7px',
                                    borderRadius: '5px',
                                    fontSize: '0.68rem',
                                    fontWeight: '700',
                                    fontFamily: 'monospace',
                                    border: '1px solid var(--primary-border)',
                                  }}
                                >
                                  {prod.item_code}
                                </span>
                              </div>
                              <div className="customer-meta">
                                <span>{prod.finish || 'Polished Finish'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td>{renderCategoryBadge(prod.category)}</td>

                        {/* Wood Type */}
                        <td>
                          <span
                            style={{
                              background: 'var(--ash-100)',
                              border: '1px solid var(--ash-300)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: 'var(--ash-900)',
                            }}
                          >
                            🪵 {prod.wood_type}
                          </span>
                        </td>

                        {/* Dimensions */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Ruler size={13} color="var(--ash-500)" />
                            <span style={{ fontSize: '0.84rem', color: 'var(--ash-700)' }}>
                              {prod.dimensions || 'Standard Dimension'}
                            </span>
                          </div>
                        </td>

                        {/* Selling Price */}
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--ash-900)' }}>
                            {formatLKR(prod.selling_price)}
                          </span>
                          {prod.cost_price > 0 && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: '0.72rem',
                                color: 'var(--ash-500)',
                                marginTop: '2px',
                              }}
                            >
                              Cost: {formatLKR(prod.cost_price)}
                            </span>
                          )}
                        </td>

                        {/* Stock Status & Quantity */}
                        <td style={{ textAlign: 'center' }}>
                          {renderStockBadge(prod.stock_quantity, prod.reorder_level)}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                            {/* Quick Adjust Button */}
                            <button
                              className="btn btn-secondary"
                              style={{
                                padding: '4px 9px',
                                fontSize: '0.74rem',
                                gap: '4px',
                                borderColor: 'var(--ash-300)',
                              }}
                              onClick={() => handleOpenAdjust(prod)}
                              title="Adjust Stock Quantity (+ / -)"
                            >
                              <Package size={13} color="var(--primary)" /> Stock
                            </button>

                            {/* Edit Product */}
                            <button
                              className="icon-btn-action"
                              title="Edit Furniture Details"
                              onClick={() => handleOpenEdit(prod)}
                            >
                              <Edit2 size={15} />
                            </button>

                            {/* View Specs */}
                            <button
                              className="icon-btn-action"
                              title="View Furniture Specs & History"
                              onClick={() => {
                                setSelectedProduct(prod);
                                setIsViewModalOpen(true);
                              }}
                            >
                              <Eye size={15} />
                            </button>

                            {/* Delete Product */}
                            <button
                              className="icon-btn-action icon-btn-delete"
                              title="Delete Product"
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* View Mode 2: Cards Grid View */
          <div className="customer-cards-grid">
            {filteredProducts.map((prod) => {
              return (
                <div key={prod.id} className="customer-card-item">
                  <div className="customer-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        className="user-avatar"
                        style={{
                          background: 'var(--primary-tint)',
                          color: 'var(--primary)',
                          borderRadius: '10px',
                        }}
                      >
                        <Armchair size={18} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="customer-name" style={{ fontSize: '0.95rem' }}>
                            {prod.name}
                          </span>
                          <span
                            style={{
                              background: 'var(--primary-tint)',
                              color: 'var(--primary)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.66rem',
                              fontWeight: '700',
                              fontFamily: 'monospace',
                              border: '1px solid var(--primary-border)',
                            }}
                          >
                            {prod.item_code}
                          </span>
                        </div>
                        <div className="customer-meta">
                          <span>🪵 {prod.wood_type}</span>
                        </div>
                      </div>
                    </div>
                    {renderCategoryBadge(prod.category)}
                  </div>

                  <div className="customer-card-body">
                    {/* Size */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Dimensions:</span>
                      <span style={{ fontWeight: 600, color: 'var(--ash-900)' }}>{prod.dimensions || 'Standard'}</span>
                    </div>

                    {/* Finish */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Finish:</span>
                      <span style={{ color: 'var(--ash-700)' }}>{prod.finish || 'Polished'}</span>
                    </div>

                    {/* Price */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Selling Price:</span>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                        {formatLKR(prod.selling_price)}
                      </span>
                    </div>

                    {/* Stock Status */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Current Stock:</span>
                      {renderStockBadge(prod.stock_quantity, prod.reorder_level)}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="customer-card-footer">
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '0.76rem', gap: '5px' }}
                      onClick={() => handleOpenAdjust(prod)}
                    >
                      <Package size={13} color="var(--primary)" /> Adjust Stock
                    </button>

                    <div className="action-btn-group">
                      <button
                        className="icon-btn-action"
                        title="Edit Product"
                        onClick={() => handleOpenEdit(prod)}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="icon-btn-action"
                        title="View Details"
                        onClick={() => {
                          setSelectedProduct(prod);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="icon-btn-action icon-btn-delete"
                        title="Delete Product"
                        onClick={() => handleDeleteProduct(prod.id, prod.name)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          4. MODAL: ADD NEW PRODUCT
          ========================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Wooden Furniture Item"
      >
        <form onSubmit={handleAddProduct}>
          <div className="form-grid">
            {/* Item Code & Category */}
            <div className="form-group">
              <label className="form-label">Item Code / SKU *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. FURN-107"
                value={newProduct.item_code}
                onChange={(e) => setNewProduct({ ...newProduct, item_code: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select-full"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              >
                <option value="living_room">Living Room (සාලය)</option>
                <option value="bedroom">Bedroom (නිදන කාමර)</option>
                <option value="dining">Dining Room (කෑම කාමර)</option>
                <option value="office">Office Furniture (කාර්යාල)</option>
                <option value="custom">Custom Made (ඇණවුම්)</option>
              </select>
            </div>

            {/* Product Name */}
            <div className="form-group full-width">
              <label className="form-label">Furniture Model Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. 6-Seater Solid Teak Dining Table"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>

            {/* Wood Type & Finish */}
            <div className="form-group">
              <label className="form-label">Wood Type (දැව වර්ගය)</label>
              <select
                className="form-select-full"
                value={newProduct.wood_type}
                onChange={(e) => setNewProduct({ ...newProduct, wood_type: e.target.value })}
              >
                <option value="Teak (තේක්ක)">Teak (තේක්ක)</option>
                <option value="Mahogany (මහෝගනී)">Mahogany (මහෝගනී)</option>
                <option value="Nadun (නැදුන්)">Nadun (නැදුන්)</option>
                <option value="Mara (මාර)">Mara (මාර)</option>
                <option value="Iron Wood / Golu Mora">Iron Wood / Golu Mora</option>
                <option value="Treated Rubber Wood">Treated Rubber Wood</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Polish / Finish</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Natural Matte, Gloss Lacquer, Dark Walnut"
                value={newProduct.finish}
                onChange={(e) => setNewProduct({ ...newProduct, finish: e.target.value })}
              />
            </div>

            {/* Dimensions */}
            <div className="form-group full-width">
              <label className="form-label">Dimensions / Size</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 72 inch L x 36 inch W x 30 inch H"
                value={newProduct.dimensions}
                onChange={(e) => setNewProduct({ ...newProduct, dimensions: e.target.value })}
              />
            </div>

            {/* Selling Price & Cost Price */}
            <div className="form-group">
              <label className="form-label">Selling Price (LKR) *</label>
              <input
                type="number"
                className="form-input"
                required
                min="0"
                step="500"
                placeholder="95000"
                value={newProduct.selling_price}
                onChange={(e) => setNewProduct({ ...newProduct, selling_price: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Workshop Cost (LKR)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                step="500"
                placeholder="65000"
                value={newProduct.cost_price}
                onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
              />
            </div>

            {/* Stock Quantity & Reorder Level */}
            <div className="form-group">
              <label className="form-label">Initial Stock Quantity (Units)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                placeholder="1"
                value={newProduct.stock_quantity}
                onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Low Stock Reorder Alert Level</label>
              <input
                type="number"
                className="form-input"
                min="1"
                placeholder="2"
                value={newProduct.reorder_level}
                onChange={(e) => setNewProduct({ ...newProduct, reorder_level: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="form-group full-width">
              <label className="form-label">Carpentry Specs & Description</label>
              <textarea
                className="form-textarea"
                placeholder="Timber grain details, brass fittings, carving patterns, warranty notes..."
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Save Product
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================
          5. MODAL: EDIT PRODUCT
          ========================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingProduct ? `Edit Product - ${editingProduct.item_code}` : 'Edit Product'}
      >
        {editingProduct && (
          <form onSubmit={handleUpdateProduct}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Item Code / SKU</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editingProduct.item_code || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, item_code: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select-full"
                  value={editingProduct.category || 'living_room'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                >
                  <option value="living_room">Living Room (සාලය)</option>
                  <option value="bedroom">Bedroom (නිදන කාමර)</option>
                  <option value="dining">Dining Room (කෑම කාමර)</option>
                  <option value="office">Office Furniture (කාර්යාල)</option>
                  <option value="custom">Custom Made (ඇණවුම්)</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Furniture Model Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Wood Type</label>
                <select
                  className="form-select-full"
                  value={editingProduct.wood_type || 'Teak (තේක්ක)'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, wood_type: e.target.value })}
                >
                  <option value="Teak (තේක්ක)">Teak (තේක්ක)</option>
                  <option value="Mahogany (මහෝගනී)">Mahogany (මහෝගනී)</option>
                  <option value="Nadun (නැදුන්)">Nadun (නැදුන්)</option>
                  <option value="Mara (මාර)">Mara (මාර)</option>
                  <option value="Iron Wood / Golu Mora">Iron Wood / Golu Mora</option>
                  <option value="Treated Rubber Wood">Treated Rubber Wood</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Finish / Polish</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingProduct.finish || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, finish: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Dimensions</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingProduct.dimensions || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, dimensions: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Selling Price (LKR) *</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  min="0"
                  step="500"
                  value={editingProduct.selling_price ?? ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, selling_price: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Workshop Cost (LKR)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step="500"
                  value={editingProduct.cost_price ?? ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Stock Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={editingProduct.stock_quantity ?? ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reorder Level Alert</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={editingProduct.reorder_level ?? ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, reorder_level: e.target.value })}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Description & Notes</label>
                <textarea
                  className="form-textarea"
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <CheckCircle size={16} /> Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================
          6. MODAL: VIEW PRODUCT SPECS
          ========================================================= */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Furniture Specifications & Stock Details"
      >
        {selectedProduct && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                paddingBottom: '18px',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '18px',
              }}
            >
              <div
                className="user-avatar"
                style={{
                  width: '56px',
                  height: '56px',
                  fontSize: '1.25rem',
                  borderRadius: '14px',
                  background: 'var(--primary-tint)',
                  color: 'var(--primary)',
                }}
              >
                <Armchair size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ash-900)' }}>
                    {selectedProduct.name}
                  </h3>
                  <span
                    style={{
                      background: 'var(--primary-tint)',
                      color: 'var(--primary)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      fontFamily: 'monospace',
                      border: '1px solid var(--primary-border)',
                    }}
                  >
                    {selectedProduct.item_code}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                  {renderCategoryBadge(selectedProduct.category)}
                  <span className="nic-pill">🪵 {selectedProduct.wood_type}</span>
                  {renderStockBadge(selectedProduct.stock_quantity, selectedProduct.reorder_level)}
                </div>
              </div>
            </div>

            {/* Quick Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  background: 'var(--ash-50)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--ash-500)', marginBottom: '4px' }}>
                  FINISH & POLISH
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ash-900)' }}>
                  {selectedProduct.finish || 'Polished'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ash-700)', marginTop: '4px' }}>
                  Dimensions: {selectedProduct.dimensions || 'N/A'}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--ash-50)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--ash-500)', marginBottom: '4px' }}>
                  SELLING PRICE (LKR)
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)' }}>
                  {formatLKR(selectedProduct.selling_price)}
                </div>
                {selectedProduct.cost_price > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                    Cost Price: {formatLKR(selectedProduct.cost_price)}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {selectedProduct.description && (
              <div
                style={{
                  background: 'var(--ash-50)',
                  border: '1px solid var(--border-subtle)',
                  padding: '14px',
                  borderRadius: '10px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--ash-500)', fontWeight: 700, marginBottom: '6px' }}>
                  CARPENTRY DETAILS & SPECIFICATIONS
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--ash-700)', lineHeight: '1.5' }}>
                  {selectedProduct.description}
                </p>
              </div>
            )}

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenAdjust(selectedProduct);
                }}
              >
                <Package size={15} color="var(--primary)" /> Adjust Inventory Quantity
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(selectedProduct);
                }}
              >
                <Edit2 size={15} /> Edit Product
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          7. MODAL: QUICK STOCK ADJUSTMENT
          ========================================================= */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={selectedProduct ? `Adjust Stock - ${selectedProduct.name}` : 'Stock Adjustment'}
      >
        {selectedProduct && (
          <form onSubmit={handleConfirmAdjust}>
            <div
              style={{
                background: 'var(--ash-50)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--ash-500)', fontWeight: 600 }}>CURRENT STOCK</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ash-900)' }}>
                  {selectedProduct.stock_quantity || 0} Units
                </div>
              </div>
              <div>{renderStockBadge(selectedProduct.stock_quantity, selectedProduct.reorder_level)}</div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Adjustment Type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className={`btn ${adjustType === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setAdjustType('add');
                    setAdjustReason('Workshop production received');
                  }}
                  style={{ gap: '6px', padding: '10px' }}
                >
                  <PackagePlus size={16} /> Add Inward Stock (+)
                </button>
                <button
                  type="button"
                  className={`btn ${adjustType === 'reduce' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => {
                    setAdjustType('reduce');
                    setAdjustReason('Showroom sale / delivery');
                  }}
                  style={{ gap: '6px', padding: '10px' }}
                >
                  <PackageMinus size={16} /> Deduct Stock (-)
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Quantity to {adjustType === 'add' ? 'Add' : 'Deduct'} (Units) *</label>
              <input
                type="number"
                className="form-input"
                required
                min="1"
                placeholder="1"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Adjustment Reason / Notes</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 2 finished units received from Moratuwa workshop"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${adjustType === 'add' ? 'btn-primary' : 'btn-danger'}`}
              >
                <CheckCircle size={16} /> Update Inventory
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
