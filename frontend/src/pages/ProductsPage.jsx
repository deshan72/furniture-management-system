import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Armchair,
  Search,
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
  Package,
  PackagePlus,
  PackageMinus,
  List,
  LayoutGrid,
  Zap,
  Upload,
  Image as ImageIcon,
  Boxes,
  Hammer,
  Sparkles,
  TrendingUp,
  Layers,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { printHtmlDocument } from '../utils/printUtils';
import { apiRequest, uploadImageToSupabaseStorage } from '../services/api';
import { generateNextItemCode, getCategoryPrefix } from '../utils/productUtils';
import { addLiveNotification } from '../utils/notificationsData';

// Helper to compress and convert image File to optimized Base64 Data URL (~50-80 KB for fast database storage)
const compressImageFile = (file, maxDim = 900, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (JPG, PNG, or WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
  });
};

// Realistic initial product records across the 3 allowed categories (Wood -> WD, Melamine -> MEL, Electrical Items -> ELC)
const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    item_code: 'WD-001',
    name: 'Royal Teak 6-Seater Dining Table',
    category: 'wood',
    wood_type: 'Teak',
    finish: 'Natural Matte Lacquer',
    dimensions: '72"L x 38"W x 30"H',
    cost_price: 65000,
    selling_price: 98500,
    stock_quantity: 4,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=600&q=80',
    description: 'Solid Ceylon Teak wood top with heavy carved legs and 6 matching cushioned chairs.',
    created_at: '2026-09-15T10:00:00Z',
  },
  {
    id: 'prod-2',
    item_code: 'WD-002',
    name: 'Mahogany 3-Door Wardrobe (Almirah)',
    category: 'wood',
    wood_type: 'Mahogany',
    finish: 'Warm Mahogany Gloss',
    dimensions: '78"H x 54"W x 22"D',
    cost_price: 52000,
    selling_price: 78000,
    stock_quantity: 1,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=600&q=80',
    description: 'Fitted with inner locker, solid brass hinges, full-length mirror, and polished drawers.',
    created_at: '2026-09-20T14:30:00Z',
  },
  {
    id: 'prod-3',
    item_code: 'MEL-001',
    name: 'Modern Melamine Modular Kitchen Pantry Unit',
    category: 'melamine',
    wood_type: 'Melamine Board',
    finish: 'Matt Frost White & Oak Texture',
    dimensions: '96"W x 24"D x 84"H',
    cost_price: 85000,
    selling_price: 135000,
    stock_quantity: 3,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
    description: 'Water-resistant premium melamine board body with hydraulic soft-close hinges.',
    created_at: '2026-09-25T11:15:00Z',
  },
  {
    id: 'prod-4',
    item_code: 'MEL-002',
    name: 'Executive Melamine Office Desk (L-Shape)',
    category: 'melamine',
    wood_type: 'Melamine Board',
    finish: 'Melamine Scratch-Resistant Walnut',
    dimensions: '60"W x 30"D x 30"H + 36" Side Return',
    cost_price: 45000,
    selling_price: 68500,
    stock_quantity: 2,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80',
    description: 'Modern executive desk with 3 lockable drawers, cable management ports, and keyboard tray.',
    created_at: '2026-10-01T09:00:00Z',
  },
  {
    id: 'prod-5',
    item_code: 'ELC-001',
    name: 'Smart LED Mirror Vanity & Concealed Wiring',
    category: 'electrical_item',
    wood_type: 'Electrical & Metal Fittings',
    finish: 'Touch-Sensor 3-Tone LED',
    dimensions: '36"W x 28"H x 5"D',
    cost_price: 18000,
    selling_price: 28500,
    stock_quantity: 5,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1622372738946-62e02505feb3?auto=format&fit=crop&w=600&q=80',
    description: 'Smart vanity mirror with 3-tone touch LED light, anti-fog heating pad, and power socket.',
    created_at: '2026-10-05T16:20:00Z',
  },
  {
    id: 'prod-6',
    item_code: 'WD-003',
    name: 'Teak Veranda Easy Lounge Armchair',
    category: 'wood',
    wood_type: 'Teak',
    finish: 'Outdoor Weatherproof Teak Oil',
    dimensions: '32"W x 34"D x 36"H',
    cost_price: 14000,
    selling_price: 22500,
    stock_quantity: 0,
    reorder_level: 2,
    image_url: 'https://images.unsplash.com/photo-1580481077111-94e82e2cbaef?auto=format&fit=crop&w=600&q=80',
    description: 'Traditional Sri Lankan plantation style relaxing veranda chair with handwoven rattan back.',
    created_at: '2026-10-08T13:10:00Z',
  },
];

export default function ProductsPage({ initialStockFilter = 'all', mode = 'products', onNavigate }) {
  // Active operational mode: 'products' (Catalog) | 'stock' (Stock Ledger) | 'low-stock' (Alerts)
  const [activeMode, setActiveMode] = useState(() => {
    if (mode) return mode;
    if (initialStockFilter === 'low_stock') return 'low-stock';
    return 'products';
  });

  // Products state with local storage persistence and legacy category/code normalization
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_products_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize legacy categories and legacy FURN codes to WD-, MEL-, ELC-
          const legacyCodeMap = {
            'FURN-101': 'WD-001',
            'FURN-102': 'WD-002',
            'FURN-103': 'MEL-001',
            'FURN-104': 'MEL-002',
            'FURN-105': 'ELC-001',
            'FURN-106': 'WD-003',
          };

          return parsed.map((p) => {
            let cat = p.category;
            if (cat === 'living_room' || cat === 'bedroom' || cat === 'dining' || cat === 'custom') {
              cat = 'wood';
            } else if (cat === 'office') {
              cat = 'melamine';
            } else if (cat === 'electrical' || cat === 'electrical_items') {
              cat = 'electrical_item';
            } else if (cat !== 'wood' && cat !== 'melamine' && cat !== 'electrical_item') {
              cat = 'wood';
            }

            let code = p.item_code;
            if (code && legacyCodeMap[code]) {
              code = legacyCodeMap[code];
            } else if (code && code.startsWith('FURN-')) {
              const numDigits = code.replace(/\D/g, '');
              const numVal = parseInt(numDigits, 10) || 1;
              const pref = getCategoryPrefix(cat);
              code = `${pref}${String(numVal % 1000).padStart(3, '0')}`;
            }

            let wood = p.wood_type;
            if (wood) {
              wood = wood
                .replace(/Teak\s*\([^)]*\)/i, 'Teak')
                .replace(/Mahogany\s*\([^)]*\)/i, 'Mahogany')
                .replace(/Nadun\s*\([^)]*\)/i, 'Nadun')
                .replace(/Mara\s*\([^)]*\)/i, 'Mara')
                .replace(/Melamine Board\s*\([^)]*\)/i, 'Melamine Board')
                .replace(/[\u0D80-\u0DFF]/g, '')
                .trim();
            }

            return {
              ...p,
              item_code: code || p.item_code,
              category: cat,
              wood_type: wood || p.wood_type,
            };
          });
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_PRODUCTS;
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'wood', 'melamine', 'electrical_item'
  const [woodFilter, setWoodFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState(() => (mode === 'low-stock' || initialStockFilter === 'low_stock' ? 'low_stock' : 'all'));
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'price_desc', 'price_asc', 'stock_asc', 'stock_desc', 'name_asc'
  const [viewMode, setViewMode] = useState(() => (mode === 'products' ? 'cards' : 'table')); // 'table' | 'cards'

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

  // Database connection & submitting state
  const [dbConnected, setDbConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image file input refs & drag state
  const addFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const [isAddDragging, setIsAddDragging] = useState(false);
  const [isEditDragging, setIsEditDragging] = useState(false);

  // Form state for new product
  const [newProduct, setNewProduct] = useState({
    item_code: '',
    name: '',
    category: 'wood',
    wood_type: 'Teak',
    finish: 'Natural Matte Lacquer',
    dimensions: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '1',
    reorder_level: '2',
    image_url: '',
    description: '',
  });

  // Handlers for Add Product image file selection
  const processAddImageFile = async (file) => {
    try {
      const compressedDataUrl = await compressImageFile(file);
      setNewProduct((prev) => ({ ...prev, image_url: compressedDataUrl }));
    } catch (err) {
      alert(err.message || 'Failed to process product image.');
    }
  };

  const handleNewImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processAddImageFile(file);
    }
    // reset input so same file can be re-selected if removed
    e.target.value = '';
  };

  // Handlers for Edit Product image file selection
  const processEditImageFile = async (file) => {
    try {
      const compressedDataUrl = await compressImageFile(file);
      setEditingProduct((prev) => ({ ...prev, image_url: compressedDataUrl }));
    } catch (err) {
      alert(err.message || 'Failed to process product image.');
    }
  };

  const handleEditImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processEditImageFile(file);
    }
    e.target.value = '';
  };

  // Save to localStorage whenever products change
  useEffect(() => {
    try {
      localStorage.setItem('dnd_products_list', JSON.stringify(products));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [products]);

  // Sync activeMode and filters when mode prop changes from App sidebar navigation
  useEffect(() => {
    if (mode) {
      setActiveMode(mode);
      if (mode === 'low-stock') {
        setStockFilter('low_stock');
        setViewMode('table');
      } else if (mode === 'stock') {
        setStockFilter('all');
        setViewMode('table');
      } else {
        setStockFilter('all');
        setViewMode('cards');
      }
    }
  }, [mode]);

  // Sync initialStockFilter prop if changed
  useEffect(() => {
    if (initialStockFilter) {
      setStockFilter(initialStockFilter);
    }
  }, [initialStockFilter]);

  // Try fetching from database on mount
  useEffect(() => {
    let isMounted = true;
    apiRequest('/products')
      .then((res) => {
        if (isMounted) {
          setDbConnected(true);
          if (res && res.data && res.data.length > 0) {
            setProducts(res.data);
          }
        }
      })
      .catch((err) => {
        console.warn('Initial load using local products:', err.message);
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

  // KPI Statistics tailored for all 3 views
  const stats = useMemo(() => {
    const totalModels = products.length;
    let totalUnits = 0;
    let totalStockValue = 0;
    let totalCostValue = 0;
    let woodCount = 0;
    let melamineCount = 0;
    let electricalCount = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let adequateStockCount = 0;
    let totalDeficitUnits = 0;
    let estimatedRestockCost = 0;

    products.forEach((p) => {
      const qty = Number(p.stock_quantity) || 0;
      const reorder = Number(p.reorder_level || 2);
      const price = Number(p.selling_price) || 0;
      const cost = Number(p.cost_price) || Math.round(price * 0.65);
      const cat = (p.category || '').toLowerCase();

      totalUnits += qty;
      totalStockValue += qty * price;
      totalCostValue += qty * cost;

      if (cat === 'wood') woodCount++;
      else if (cat === 'melamine') melamineCount++;
      else if (cat === 'electrical_item' || cat.includes('elect')) electricalCount++;

      if (qty <= 0) {
        outOfStockCount++;
        const deficit = reorder;
        totalDeficitUnits += deficit;
        estimatedRestockCost += deficit * cost;
      } else if (qty <= reorder) {
        lowStockCount++;
        const deficit = reorder - qty + 1;
        totalDeficitUnits += deficit;
        estimatedRestockCost += deficit * cost;
      } else {
        adequateStockCount++;
      }
    });

    return {
      total: totalModels,
      totalModels,
      totalUnits,
      totalStockValue,
      totalCostValue,
      inStockCount: products.filter((p) => Number(p.stock_quantity) > 0).length,
      woodCount,
      melamineCount,
      electricalCount,
      outOfStockCount,
      lowStockCount,
      adequateStockCount,
      totalAlertsCount: outOfStockCount + lowStockCount,
      totalDeficitUnits,
      estimatedRestockCost,
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
        if (categoryFilter !== 'all') {
          const prodCat = (prod.category || '').toLowerCase();
          if (categoryFilter === 'electrical_item') {
            if (prodCat !== 'electrical_item' && prodCat !== 'electrical' && prodCat !== 'electrical_items') {
              return false;
            }
          } else if (prodCat !== categoryFilter.toLowerCase()) {
            return false;
          }
        }

        // 3. Wood Type Filter
        if (woodFilter !== 'all' && prod.wood_type !== woodFilter) {
          return false;
        }

        // 4. Stock Level Filter (In low_stock mode, includes both 0 and <= reorder)
        const qty = Number(prod.stock_quantity) || 0;
        const reorder = Number(prod.reorder_level || 2);
        if (stockFilter === 'in_stock' && qty <= 0) return false;
        if (stockFilter === 'low_stock' && qty > reorder) return false;
        if (stockFilter === 'out_of_stock' && qty > 0) return false;

        return true;
      })
      .sort((a, b) => {
        // In Low Stock mode, prioritize zero-stock (critical) items first
        if (activeMode === 'low-stock' && sortBy === 'recent') {
          const stockDiff = (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0);
          if (stockDiff !== 0) return stockDiff;
        }

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
  }, [products, searchQuery, categoryFilter, woodFilter, stockFilter, sortBy, activeMode]);

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

  // Open Add Product Modal with auto-generated Item Code based on Category
  const handleOpenAddModal = () => {
    const defaultCat = categoryFilter !== 'all' ? categoryFilter : 'wood';
    const nextCode = generateNextItemCode(defaultCat, products);
    const defaultWood =
      defaultCat === 'melamine'
        ? 'Melamine Board'
        : defaultCat === 'electrical_item'
        ? 'Electrical & Metal Fittings'
        : 'Teak';
    const defaultFinish =
      defaultCat === 'electrical_item'
        ? 'Touch-Sensor 3-Tone LED'
        : defaultCat === 'melamine'
        ? 'Melamine Scratch-Resistant Walnut'
        : 'Natural Matte Lacquer';

    setNewProduct({
      item_code: nextCode,
      name: '',
      category: defaultCat,
      wood_type: defaultWood,
      finish: defaultFinish,
      dimensions: '',
      cost_price: '',
      selling_price: '',
      stock_quantity: '1',
      reorder_level: '2',
      image_url: '',
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

    const assignedCode =
      newProduct.item_code?.trim() ||
      generateNextItemCode(newProduct.category, products);

    setIsSubmitting(true);

    let finalImageUrl = newProduct.image_url?.trim() || '';

    // If an image was selected (base64 data URL), upload directly to Supabase Storage bucket 'project product image'
    if (finalImageUrl.startsWith('data:image/')) {
      try {
        finalImageUrl = await uploadImageToSupabaseStorage(finalImageUrl, assignedCode);
      } catch (uploadErr) {
        console.warn('Storage upload error in handleAddProduct:', uploadErr);
        // Will continue or fallback to directSupabaseRequest
      }
    }

    const createdRecord = {
      id: `prod-${Date.now()}`,
      item_code: assignedCode,
      name: newProduct.name.trim(),
      category: newProduct.category || 'wood',
      wood_type: newProduct.wood_type || 'Teak',
      finish: newProduct.finish || 'Natural Finish',
      dimensions: newProduct.dimensions || 'Standard',
      cost_price: Number(newProduct.cost_price) || 0,
      selling_price: Number(newProduct.selling_price) || 0,
      stock_quantity: Number(newProduct.stock_quantity) || 0,
      reorder_level: Number(newProduct.reorder_level) || 2,
      image_url: finalImageUrl,
      description: newProduct.description || '',
      created_at: new Date().toISOString(),
    };

    let finalSavedItem = createdRecord;

    // Send to database (Backend API or direct Supabase)
    try {
      const res = await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(createdRecord),
      });

      if (res?.data) {
        // Use real Supabase database row with UUID
        finalSavedItem = { ...createdRecord, ...res.data };
      }
      setDbConnected(true);
      alert('✅ Product and Image successfully saved into Supabase Storage & Database!');
    } catch (err) {
      console.warn('Database save warning:', err);
      alert(`⚠️ Saved locally, but database sync returned: ${err.message}. Please check connection.`);
    } finally {
      setIsSubmitting(false);
    }

    setProducts((prev) => [finalSavedItem, ...prev.filter((p) => p.id !== finalSavedItem.id && p.id !== createdRecord.id)]);
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

    setIsSubmitting(true);

    let finalImageUrl = editingProduct.image_url?.trim() || '';

    // If a new image was chosen (base64 data URL), upload directly to Supabase Storage bucket 'project product image'
    if (finalImageUrl.startsWith('data:image/')) {
      try {
        finalImageUrl = await uploadImageToSupabaseStorage(finalImageUrl, editingProduct.item_code);
      } catch (uploadErr) {
        console.warn('Storage upload error in handleUpdateProduct:', uploadErr);
      }
    }

    const updated = {
      ...editingProduct,
      cost_price: Number(editingProduct.cost_price) || 0,
      selling_price: Number(editingProduct.selling_price) || 0,
      stock_quantity: Number(editingProduct.stock_quantity) || 0,
      reorder_level: Number(editingProduct.reorder_level) || 2,
      image_url: finalImageUrl,
    };

    let finalUpdatedItem = updated;

    try {
      const res = await apiRequest(`/products/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
      if (res?.data) {
        finalUpdatedItem = { ...updated, ...res.data };
      }
      setDbConnected(true);
      alert('✅ Product and Image updated in Supabase Storage & Database!');
    } catch (err) {
      console.warn('Update failed in database:', err);
      alert(`⚠️ Updated locally, but database reported: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }

    setProducts((prev) => prev.map((p) => (p.id === updated.id ? finalUpdatedItem : p)));

    if (selectedProduct?.id === updated.id) {
      setSelectedProduct(finalUpdatedItem);
    }

    setIsEditModalOpen(false);
    setEditingProduct(null);
  };

  // Delete Product
  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the product catalog?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (selectedProduct?.id === id) {
        setIsViewModalOpen(false);
      }
      try {
        await apiRequest(`/products/${id}`, {
          method: 'DELETE',
        });
        setDbConnected(true);
      } catch (err) {
        console.warn('Delete in database warning:', err);
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

  // Quick 1-click stock stepper for Stock Management view (+1 / -1)
  const handleQuickIncrement = (productId, delta) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const current = Number(p.stock_quantity) || 0;
          const newQty = Math.max(0, current + delta);
          if (newQty === current) return p;

          const reorder = Number(p.reorder_level) || 2;
          addLiveNotification({
            type: newQty <= reorder ? 'stock_alert' : 'order_created',
            title: `Stock Updated: ${p.item_code} (${delta > 0 ? '+' : ''}${delta})`,
            message: `${p.name} stock level changed from ${current} to ${newQty} units.`,
            badge: newQty <= reorder ? 'Low Stock' : 'Stock Ledger',
            linkTab: newQty <= reorder ? 'low-stock' : 'stock',
          });

          return { ...p, stock_quantity: newQty };
        }
        return p;
      })
    );
  };

  // Open Workshop Restock Modal prefilled with needed deficit
  const handleOpenRestockWorkshop = (product) => {
    setSelectedProduct(product);
    const qty = Number(product.stock_quantity) || 0;
    const reorder = Number(product.reorder_level) || 2;
    const deficit = Math.max(1, reorder - qty + 1);
    setAdjustQuantity(deficit);
    setAdjustType('add');
    setAdjustReason('Workshop production batch replenishment');
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

          addLiveNotification({
            type: newQty <= (Number(p.reorder_level) || 2) ? 'stock_alert' : 'order_created',
            title: `Stock Adjustment: ${p.item_code} (${adjustType === 'add' ? '+' : '-'}${qty})`,
            message: `${p.name} stock updated to ${newQty} units. Reason: ${adjustReason || 'General inventory adjust'}.`,
            badge: 'Inventory',
            linkTab: newQty <= (Number(p.reorder_level) || 2) ? 'low-stock' : 'stock',
          });

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

  // Helper to format category labels
  const getCategoryLabel = (category) => {
    switch (category?.toLowerCase()) {
      case 'wood':
        return 'Wood';
      case 'melamine':
        return 'Melamine';
      case 'electrical':
      case 'electrical_item':
      case 'electrical_items':
        return 'Electrical Items';
      default:
        return category ? category.replace(/_/g, ' ') : 'General';
    }
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
        `"${getCategoryLabel(p.category)}"`,
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
          <td style="padding: 9px 12px; border-bottom: 1px solid #CED4DA;">${getCategoryLabel(p.category)}</td>
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
          <title>D N S Home Solutions - Inventory & Catalog Report</title>
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
                <img src="${window.location.origin}/ds-logo.png" alt="D N S Home Solutions" style="height:56px;width:56px;object-fit:contain;vertical-align:middle;margin-right:12px;float:left;" /><div class="brand-title">D N S HOME SOLUTIONS</div>
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
            <span>D N S Home Solutions System • Automated Inventory Report</span>
            <span>Page 1 of 1</span>
          </div>
        </body>
      </html>
    `;

    printHtmlDocument(htmlContent, { title: 'DNS_Product_Catalog' });
  };

  // Category badge helper
  const renderCategoryBadge = (category) => {
    switch (category?.toLowerCase()) {
      case 'wood':
        return (
          <span
            className="status-badge"
            style={{
              background: '#FDF4ED',
              color: '#9A3412',
              border: '1px solid #FED7AA',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            🪵 Wood
          </span>
        );
      case 'melamine':
        return (
          <span
            className="status-badge"
            style={{
              background: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            📋 Melamine
          </span>
        );
      case 'electrical':
      case 'electrical_item':
      case 'electrical_items':
        return (
          <span
            className="status-badge"
            style={{
              background: '#FEF3C7',
              color: '#B45309',
              border: '1px solid #FCD34D',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            <Zap size={12} /> Electrical Item
          </span>
        );
      default:
        return (
          <span className="status-badge badge-custom">
            {category ? category.replace(/_/g, ' ') : 'General'}
          </span>
        );
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
          0. INVENTORY MODULE SUB-VIEW RIBBON SWITCHER
          ========================================================= */}
      <div
        className="panel"
        style={{
          padding: '10px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderRadius: '12px',
          flexWrap: 'wrap',
          border: '1.5px solid var(--border-subtle)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Sub-tab 1: Products Catalog */}
          <button
            type="button"
            className={`btn ${activeMode === 'products' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: '0.86rem',
              fontWeight: 600,
              gap: '8px',
              borderRadius: '8px',
            }}
            onClick={() => {
              setActiveMode('products');
              setStockFilter('all');
              setViewMode('cards');
              onNavigate?.('products');
            }}
          >
            <Armchair size={16} /> Products Catalog
            <span
              style={{
                background: activeMode === 'products' ? 'rgba(255,255,255,0.28)' : 'var(--ash-200)',
                color: activeMode === 'products' ? '#FFFFFF' : 'var(--ash-800)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {stats.totalModels} Models
            </span>
          </button>

          {/* Sub-tab 2: Stock Management */}
          <button
            type="button"
            className={`btn ${activeMode === 'stock' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: '0.86rem',
              fontWeight: 600,
              gap: '8px',
              borderRadius: '8px',
            }}
            onClick={() => {
              setActiveMode('stock');
              setStockFilter('all');
              setViewMode('table');
              onNavigate?.('stock');
            }}
          >
            <Boxes size={16} /> Stock Management
            <span
              style={{
                background: activeMode === 'stock' ? 'rgba(255,255,255,0.28)' : 'var(--ash-200)',
                color: activeMode === 'stock' ? '#FFFFFF' : 'var(--ash-800)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {stats.totalUnits} Units
            </span>
          </button>

          {/* Sub-tab 3: Low Stock Alerts */}
          <button
            type="button"
            className={`btn ${activeMode === 'low-stock' ? 'btn-danger' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: '0.86rem',
              fontWeight: 600,
              gap: '8px',
              borderRadius: '8px',
              background: activeMode === 'low-stock' ? '#DC2626' : undefined,
              color: activeMode === 'low-stock' ? '#FFFFFF' : undefined,
              borderColor: activeMode === 'low-stock' ? '#DC2626' : undefined,
            }}
            onClick={() => {
              setActiveMode('low-stock');
              setStockFilter('low_stock');
              setViewMode('table');
              onNavigate?.('low-stock');
            }}
          >
            <AlertTriangle size={16} color={activeMode === 'low-stock' ? '#FFFFFF' : '#DC2626'} /> Low Stock Alerts
            <span
              style={{
                background:
                  activeMode === 'low-stock'
                    ? 'rgba(255,255,255,0.32)'
                    : stats.totalAlertsCount > 0
                    ? '#FEE2E2'
                    : 'var(--ash-200)',
                color:
                  activeMode === 'low-stock'
                    ? '#FFFFFF'
                    : stats.totalAlertsCount > 0
                    ? '#DC2626'
                    : 'var(--ash-800)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {stats.totalAlertsCount}
            </span>
          </button>
        </div>

        {/* Live sync badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.74rem',
              fontWeight: 600,
              background: dbConnected ? '#ECFDF5' : '#FEF3C7',
              color: dbConnected ? '#059669' : '#D97706',
              border: `1px solid ${dbConnected ? '#A7F3D0' : '#FDE68A'}`,
            }}
            title={dbConnected ? 'Live database connected to Supabase' : 'Offline / Local cache mode'}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dbConnected ? '#10B981' : '#F59E0B' }}></span>
            {dbConnected ? 'Database Connected' : 'Local Cache'}
          </span>
        </div>
      </div>

      {/* =========================================================
          1. STATS OVERVIEW CARDS (TAILORED BY OPERATIONAL MODE)
          ========================================================= */}
      <div className="stats-grid">
        {activeMode === 'products' ? (
          <>
            <StatCard
              title="Total Furniture Models"
              value={stats.totalModels}
              subtitle="Showroom catalog portfolio"
              icon={Armchair}
              color="var(--primary)"
              bg="var(--primary-tint)"
            />
            <StatCard
              title="Solid Wood Collection"
              value={stats.woodCount}
              subtitle="Teak, Mahogany, Nadun, Mara"
              icon={Sparkles}
              color="#B45309"
              bg="#FEF3C7"
            />
            <StatCard
              title="Melamine Series"
              value={stats.melamineCount}
              subtitle="Pantry & executive office units"
              icon={Layers}
              color="#2563EB"
              bg="#EFF6FF"
            />
            <StatCard
              title="Electrical & Smart Items"
              value={stats.electricalCount}
              subtitle="LED mirrors & smart fixtures"
              icon={Zap}
              color="#7C3AED"
              bg="#F5F3FF"
            />
          </>
        ) : activeMode === 'stock' ? (
          <>
            <StatCard
              title="Total Warehouse Stock"
              value={`${stats.totalUnits} Units`}
              subtitle="Physical units across all models"
              icon={Boxes}
              color="var(--primary)"
              bg="var(--primary-tint)"
            />
            <StatCard
              title="Total Stock Valuation"
              value={formatLKR(stats.totalStockValue)}
              subtitle="At retail showroom selling value"
              icon={DollarSign}
              color="var(--accent)"
              bg="var(--accent-tint)"
            />
            <StatCard
              title="Adequate Stock Models"
              value={stats.adequateStockCount}
              subtitle="Above reorder safety limits"
              icon={CheckCircle}
              color="var(--success)"
              bg="var(--success-tint)"
            />
            <StatCard
              title="Zero Stock Models"
              value={stats.outOfStockCount}
              subtitle="Depleted inventory items"
              icon={AlertCircle}
              color="var(--error)"
              bg="var(--error-tint)"
            />
          </>
        ) : (
          /* low-stock mode */
          <>
            <StatCard
              title="Critical Zero Stock"
              value={stats.outOfStockCount}
              subtitle="Models completely out of stock"
              icon={AlertCircle}
              color="#DC2626"
              bg="#FEF2F2"
            />
            <StatCard
              title="Low Stock Warnings"
              value={stats.lowStockCount}
              subtitle="Models below safety limit"
              icon={AlertTriangle}
              color="#D97706"
              bg="#FEF3C7"
            />
            <StatCard
              title="Replenishment Deficit"
              value={`${stats.totalDeficitUnits} Units`}
              subtitle="Total units needed from workshop"
              icon={Hammer}
              color="#2563EB"
              bg="#EFF6FF"
            />
            <StatCard
              title="Est. Restock Investment"
              value={formatLKR(stats.estimatedRestockCost)}
              subtitle="Estimated carpentry workshop cost"
              icon={TrendingUp}
              color="#059669"
              bg="#ECFDF5"
            />
          </>
        )}
      </div>

      {/* =========================================================
          1.1 LOW STOCK COMMAND NOTIFICATION BANNER
          ========================================================= */}
      {activeMode === 'low-stock' && (
        stats.totalAlertsCount > 0 ? (
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '12px',
              padding: '14px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#991B1B' }}>
                  Workshop Procurement Notice: {stats.totalAlertsCount} Furniture Model{stats.totalAlertsCount > 1 ? 's' : ''} Under Reorder Threshold
                </div>
                <div style={{ fontSize: '0.82rem', color: '#B91C1C', marginTop: '3px' }}>
                  {stats.outOfStockCount > 0 && <strong>{stats.outOfStockCount} model(s) are completely DEPLETED (0 units). </strong>}
                  A total of <strong>{stats.totalDeficitUnits} units</strong> must be crafted to bring workshop inventory back to safety stock.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                background: '#DC2626',
                borderColor: '#DC2626',
                padding: '9px 16px',
                fontSize: '0.84rem',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
              onClick={() => {
                const firstDepleted = products.find((p) => (Number(p.stock_quantity) || 0) <= (Number(p.reorder_level) || 2));
                if (firstDepleted) handleOpenRestockWorkshop(firstDepleted);
              }}
            >
              <Hammer size={16} /> Restock Depleted Items
            </button>
          </div>
        ) : (
          <div
            style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '12px',
              padding: '14px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#065F46',
            }}
          >
            <CheckCircle size={22} color="#10B981" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>All Furniture Inventory Levels Are Healthy!</div>
              <div style={{ fontSize: '0.82rem', color: '#047857' }}>
                There are currently no furniture models below reorder levels. All items are stocked to showroom requirements.
              </div>
            </div>
          </div>
        )
      )}

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
              placeholder={
                activeMode === 'products'
                  ? 'Search Catalog by Model Name, Code (WD-001, MEL-001), Wood, Finish...'
                  : activeMode === 'stock'
                  ? 'Search Warehouse Stock by Item SKU, Furniture Name, Category...'
                  : 'Search Low Stock Items needing urgent workshop replenishment...'
              }
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
                title="Export or Print Inventory Catalog"
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
                    <span>Export {activeMode === 'products' ? 'Catalog' : activeMode === 'stock' ? 'Stock Ledger' : 'Low Stock Alerts'} as CSV (Excel)</span>
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
                    <span>Print Printable Report (PDF)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mode-Specific Primary Action */}
            {activeMode === 'products' && (
              <button
                className="btn btn-primary"
                onClick={handleOpenAddModal}
                style={{ padding: '9px 16px', fontSize: '0.86rem' }}
              >
                <Plus size={16} /> Add Furniture Model
              </button>
            )}

            {activeMode === 'stock' && (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const firstProduct = products[0];
                    if (firstProduct) handleOpenAdjust(firstProduct);
                  }}
                  style={{ padding: '9px 16px', fontSize: '0.86rem', gap: '6px' }}
                >
                  <Zap size={16} /> Quick Stock Adjustment
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenAddModal}
                  style={{ padding: '9px 14px', fontSize: '0.86rem' }}
                  title="Add new furniture item"
                >
                  <Plus size={16} /> New Model
                </button>
              </>
            )}

            {activeMode === 'low-stock' && (
              <button
                className="btn btn-primary"
                style={{
                  padding: '9px 16px',
                  fontSize: '0.86rem',
                  gap: '6px',
                  background: '#DC2626',
                  borderColor: '#DC2626',
                }}
                onClick={() => {
                  const firstLow = products.find((p) => (Number(p.stock_quantity) || 0) <= (Number(p.reorder_level) || 2));
                  if (firstLow) handleOpenRestockWorkshop(firstLow);
                }}
              >
                <Hammer size={16} /> Batch Restock Workshop
              </button>
            )}
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
            <option value="all">📂 All Categories</option>
            <option value="wood">🪵 Wood</option>
            <option value="melamine">📋 Melamine</option>
            <option value="electrical_item">⚡ Electrical Items</option>
          </select>

          {/* Wood Type Filter */}
          <select
            className="filter-select"
            value={woodFilter}
            onChange={(e) => setWoodFilter(e.target.value)}
          >
            <option value="all">🪵 All Wood Types</option>
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

            {activeMode === 'products' ? (
              <>
                <button
                  className={`filter-chip-btn ${stockFilter === 'all' && categoryFilter === 'all' && woodFilter === 'all' ? 'active' : ''}`}
                  onClick={handleResetFilters}
                >
                  All Items <span className="filter-count-badge">{stats.total}</span>
                </button>
                <button
                  className={`filter-chip-btn ${categoryFilter === 'wood' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === 'wood' ? 'all' : 'wood')}
                >
                  🪵 Wood ({stats.woodCount})
                </button>
                <button
                  className={`filter-chip-btn ${categoryFilter === 'melamine' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === 'melamine' ? 'all' : 'melamine')}
                >
                  📋 Melamine ({stats.melamineCount})
                </button>
                <button
                  className={`filter-chip-btn ${categoryFilter === 'electrical_item' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === 'electrical_item' ? 'all' : 'electrical_item')}
                >
                  ⚡ Electrical ({stats.electricalCount})
                </button>
                <button
                  className={`filter-chip-btn ${woodFilter.toLowerCase().includes('teak') ? 'active' : ''}`}
                  onClick={() => setWoodFilter(woodFilter.toLowerCase().includes('teak') ? 'all' : 'Teak')}
                >
                  🪵 Teak Wood
                </button>
              </>
            ) : activeMode === 'stock' ? (
              <>
                <button
                  className={`filter-chip-btn ${stockFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStockFilter('all')}
                >
                  All Stock Items <span className="filter-count-badge">{stats.total}</span>
                </button>
                <button
                  className={`filter-chip-btn ${stockFilter === 'in_stock' ? 'active' : ''}`}
                  onClick={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
                >
                  <CheckCircle size={12} color="var(--success)" /> Adequate Stock{' '}
                  <span className="filter-count-badge">{stats.adequateStockCount}</span>
                </button>
                <button
                  className={`filter-chip-btn ${stockFilter === 'low_stock' ? 'active' : ''}`}
                  onClick={() => setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock')}
                >
                  <AlertTriangle size={12} color="var(--warning)" /> Reorder Warning{' '}
                  <span className="filter-count-badge">{stats.lowStockCount}</span>
                </button>
                <button
                  className={`filter-chip-btn ${stockFilter === 'out_of_stock' ? 'active' : ''}`}
                  onClick={() => setStockFilter(stockFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
                >
                  <AlertCircle size={12} color="var(--error)" /> Zero Stock (0){' '}
                  <span className="filter-count-badge">{stats.outOfStockCount}</span>
                </button>
              </>
            ) : (
              /* low-stock mode */
              <>
                <button
                  className={`filter-chip-btn ${stockFilter === 'low_stock' ? 'active' : ''}`}
                  onClick={() => setStockFilter('low_stock')}
                >
                  All Low Stock Items <span className="filter-count-badge">{stats.totalAlertsCount}</span>
                </button>
                <button
                  className={`filter-chip-btn ${stockFilter === 'out_of_stock' ? 'active' : ''}`}
                  onClick={() => setStockFilter(stockFilter === 'out_of_stock' ? 'low_stock' : 'out_of_stock')}
                >
                  <AlertCircle size={12} color="#DC2626" /> Critical 0-Stock{' '}
                  <span className="filter-count-badge">{stats.outOfStockCount}</span>
                </button>
                <button
                  className={`filter-chip-btn ${stockFilter === 'low_stock' && woodFilter === 'all' && categoryFilter === 'wood' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === 'wood' ? 'all' : 'wood')}
                >
                  🪵 Wood Reorders
                </button>
                <button
                  className={`filter-chip-btn ${stockFilter === 'low_stock' && categoryFilter === 'melamine' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === 'melamine' ? 'all' : 'melamine')}
                >
                  📋 Melamine Reorders
                </button>
              </>
            )}
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
            {activeMode === 'products' ? (
              <Armchair size={19} color="var(--primary)" />
            ) : activeMode === 'stock' ? (
              <Boxes size={19} color="var(--primary)" />
            ) : (
              <AlertTriangle size={19} color="#DC2626" />
            )}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ash-900)' }}>
              {activeMode === 'products'
                ? 'Furniture Catalog & Showroom Specifications'
                : activeMode === 'stock'
                ? 'Warehouse Stock Ledger & Quantity Control'
                : 'Urgent Replenishment & Low Stock Register'}
            </h3>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--ash-500)',
                fontWeight: 500,
                marginLeft: '4px',
              }}
            >
              ({filteredProducts.length} items)
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={14} /> Table View
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Cards Grid View"
            >
              <LayoutGrid size={14} /> Cards View
            </button>
          </div>
        </div>

        {/* View Mode 1: Table View */}
        {viewMode === 'table' ? (
          <div className="table-responsive">
            <table className="custom-table">
              {/* Specialized headers by mode */}
              {activeMode === 'products' && (
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
              )}

              {activeMode === 'stock' && (
                <thead>
                  <tr>
                    <th style={{ width: '260px' }}>Item Code & Product</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Unit Selling Price</th>
                    <th style={{ textAlign: 'center', minWidth: '170px' }}>Warehouse Stock Units</th>
                    <th style={{ textAlign: 'center' }}>Safety Limit</th>
                    <th style={{ textAlign: 'right' }}>Stock Valuation</th>
                    <th style={{ textAlign: 'center' }}>Stock Health</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
              )}

              {activeMode === 'low-stock' && (
                <thead>
                  <tr>
                    <th style={{ width: '170px' }}>Replenishment Urgency</th>
                    <th style={{ width: '260px' }}>Furniture Model & Code</th>
                    <th>Category & Material</th>
                    <th style={{ textAlign: 'center' }}>Current Stock</th>
                    <th style={{ textAlign: 'center' }}>Safe Min Threshold</th>
                    <th style={{ textAlign: 'center' }}>Required Deficit</th>
                    <th style={{ textAlign: 'right' }}>Est. Restock Cost</th>
                    <th style={{ textAlign: 'right' }}>Replenishment Action</th>
                  </tr>
                </thead>
              )}

              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-empty-state">
                        {activeMode === 'low-stock' ? (
                          <>
                            <CheckCircle size={42} color="var(--success)" />
                            <h4 style={{ color: 'var(--ash-900)' }}>No Low Stock Items!</h4>
                            <p style={{ color: 'var(--ash-500)', fontSize: '0.84rem' }}>
                              All furniture models are currently stocked well above their reorder safety levels.
                            </p>
                          </>
                        ) : (
                          <>
                            <Armchair size={42} color="var(--ash-400)" />
                            <h4 style={{ color: 'var(--ash-900)' }}>No matching furniture items found</h4>
                            <p style={{ color: 'var(--ash-500)', fontSize: '0.84rem' }}>
                              Try adjusting your search terms or reset the filters.
                            </p>
                            <button className="btn btn-secondary" onClick={handleResetFilters}>
                              Reset All Filters
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => {
                    const qty = Number(prod.stock_quantity) || 0;
                    const reorder = Number(prod.reorder_level) || 2;
                    const isCritical = qty <= 0;
                    const deficitUnits = isCritical ? reorder : Math.max(1, reorder - qty + 1);
                    const unitCost = Number(prod.cost_price) || Math.round((Number(prod.selling_price) || 0) * 0.65);
                    const restockCost = deficitUnits * unitCost;

                    /* -------------------------------------------
                       1. MODE: PRODUCTS CATALOG ROW
                       ------------------------------------------- */
                    if (activeMode === 'products') {
                      return (
                        <tr key={prod.id}>
                          <td>
                            <div className="table-user-cell">
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="product-table-thumb"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <div
                                className="user-avatar"
                                style={{
                                  background: 'var(--primary-tint)',
                                  color: 'var(--primary)',
                                  borderRadius: '10px',
                                  display: prod.image_url ? 'none' : 'flex',
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
                          <td>{renderCategoryBadge(prod.category)}</td>
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
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Ruler size={13} color="var(--ash-500)" />
                              <span style={{ fontSize: '0.84rem', color: 'var(--ash-700)' }}>
                                {prod.dimensions || 'Standard Dimension'}
                              </span>
                            </div>
                          </td>
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
                          <td style={{ textAlign: 'center' }}>
                            {renderStockBadge(prod.stock_quantity, prod.reorder_level)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
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
                              <button
                                className="icon-btn-action"
                                title="Edit Furniture Details"
                                onClick={() => handleOpenEdit(prod)}
                              >
                                <Edit2 size={15} />
                              </button>
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
                    }

                    /* -------------------------------------------
                       2. MODE: STOCK MANAGEMENT ROW
                       ------------------------------------------- */
                    if (activeMode === 'stock') {
                      return (
                        <tr key={prod.id}>
                          <td>
                            <div className="table-user-cell">
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="product-table-thumb"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <div
                                className="user-avatar"
                                style={{
                                  background: 'var(--primary-tint)',
                                  color: 'var(--primary)',
                                  borderRadius: '10px',
                                  display: prod.image_url ? 'none' : 'flex',
                                }}
                              >
                                <Boxes size={18} />
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
                                  <span>🪵 {prod.wood_type}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{renderCategoryBadge(prod.category)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--ash-900)' }}>
                              {formatLKR(prod.selling_price)}
                            </span>
                          </td>
                          {/* Interactive In-line Stepper */}
                          <td style={{ textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--ash-50)',
                                padding: '3px 8px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              <button
                                type="button"
                                className="icon-btn-action"
                                style={{ width: '26px', height: '26px', padding: 0 }}
                                disabled={qty <= 0}
                                onClick={() => handleQuickIncrement(prod.id, -1)}
                                title="Deduct 1 unit (-1)"
                              >
                                <PackageMinus size={14} color="var(--error)" />
                              </button>
                              <span
                                style={{
                                  minWidth: '55px',
                                  textAlign: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.92rem',
                                  color: qty === 0 ? 'var(--error)' : 'var(--ash-900)',
                                }}
                              >
                                {qty} Unit{qty === 1 ? '' : 's'}
                              </span>
                              <button
                                type="button"
                                className="icon-btn-action"
                                style={{ width: '26px', height: '26px', padding: 0 }}
                                onClick={() => handleQuickIncrement(prod.id, 1)}
                                title="Add 1 unit (+1)"
                              >
                                <PackagePlus size={14} color="var(--success)" />
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--ash-600)', fontSize: '0.84rem' }}>
                              {reorder} Units
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.94rem' }}>
                              {formatLKR(qty * (Number(prod.selling_price) || 0))}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {renderStockBadge(prod.stock_quantity, prod.reorder_level)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-btn-group" style={{ justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.74rem',
                                  gap: '4px',
                                  borderColor: 'var(--ash-300)',
                                }}
                                onClick={() => handleOpenAdjust(prod)}
                                title="Adjust Stock Quantity with Reason"
                              >
                                <Zap size={13} color="var(--primary)" /> Adjust
                              </button>
                              <button
                                className="icon-btn-action"
                                title="Edit Product"
                                onClick={() => handleOpenEdit(prod)}
                              >
                                <Edit2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    /* -------------------------------------------
                       3. MODE: LOW STOCK ALERTS ROW
                       ------------------------------------------- */
                    return (
                      <tr key={prod.id} style={{ background: isCritical ? 'rgba(239, 68, 68, 0.03)' : undefined }}>
                        <td>
                          {isCritical ? (
                            <span
                              className="status-badge"
                              style={{
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <AlertCircle size={13} /> CRITICAL (0 Stock)
                            </span>
                          ) : (
                            <span
                              className="status-badge"
                              style={{
                                background: '#FFFBEB',
                                color: '#D97706',
                                border: '1px solid #FDE68A',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <AlertTriangle size={13} /> Low Stock ({qty} left)
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="table-user-cell">
                            {prod.image_url ? (
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="product-table-thumb"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : null}
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
                                <span>{prod.dimensions || 'Standard'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {renderCategoryBadge(prod.category)}
                            <span style={{ fontSize: '0.74rem', color: 'var(--ash-600)', marginTop: '2px' }}>
                              🪵 {prod.wood_type}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '0.94rem',
                              color: isCritical ? '#DC2626' : '#D97706',
                            }}
                          >
                            {qty} Unit{qty === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 600, color: 'var(--ash-600)', fontSize: '0.84rem' }}>
                            {reorder} Units
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                            }}
                          >
                            Needs +{deficitUnits} Units
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: 'var(--ash-900)', fontSize: '0.92rem' }}>
                            {formatLKR(restockCost)}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.70rem', color: 'var(--ash-500)' }}>
                            @ {formatLKR(unitCost)}/unit
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              className="btn btn-primary"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.78rem',
                                gap: '6px',
                                background: '#DC2626',
                                borderColor: '#DC2626',
                              }}
                              onClick={() => handleOpenRestockWorkshop(prod)}
                              title="Restock this item from workshop batch"
                            >
                              <Hammer size={14} /> Restock Workshop
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
              const qty = Number(prod.stock_quantity) || 0;
              const reorder = Number(prod.reorder_level) || 2;
              const isCritical = qty <= 0;
              const deficitUnits = isCritical ? reorder : Math.max(1, reorder - qty + 1);

              return (
                <div key={prod.id} className="customer-card-item" style={{ overflow: 'hidden' }}>
                  {/* Low Stock Alert Flag for low-stock mode */}
                  {activeMode === 'low-stock' && (
                    <div
                      style={{
                        background: isCritical ? '#DC2626' : '#D97706',
                        color: '#FFFFFF',
                        padding: '5px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {isCritical ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
                        {isCritical ? 'CRITICAL: OUT OF STOCK' : 'LOW STOCK REORDER'}
                      </span>
                      <span>Needs +{deficitUnits} Units</span>
                    </div>
                  )}

                  {prod.image_url ? (
                    <div className="product-card-cover">
                      <img src={prod.image_url} alt={prod.name} />
                    </div>
                  ) : null}

                  <div className="customer-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {prod.image_url ? null : (
                        <div
                          className="user-avatar"
                          style={{
                            background: 'var(--primary-tint)',
                            color: 'var(--primary)',
                            borderRadius: '10px',
                          }}
                        >
                          {activeMode === 'stock' ? <Boxes size={18} /> : <Armchair size={18} />}
                        </div>
                      )}
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
                    {/* Size & Finish for products mode */}
                    {activeMode === 'products' && (
                      <>
                        <div className="customer-card-row">
                          <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Dimensions:</span>
                          <span style={{ fontWeight: 600, color: 'var(--ash-900)' }}>{prod.dimensions || 'Standard'}</span>
                        </div>
                        <div className="customer-card-row">
                          <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Finish:</span>
                          <span style={{ color: 'var(--ash-700)' }}>{prod.finish || 'Polished'}</span>
                        </div>
                      </>
                    )}

                    {/* Stock Valuation for stock mode */}
                    {activeMode === 'stock' && (
                      <>
                        <div className="customer-card-row">
                          <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Stock Value:</span>
                          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.92rem' }}>
                            {formatLKR(qty * (Number(prod.selling_price) || 0))}
                          </span>
                        </div>
                        <div className="customer-card-row">
                          <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Safety Level:</span>
                          <span style={{ fontWeight: 600, color: 'var(--ash-700)' }}>{reorder} Units</span>
                        </div>
                      </>
                    )}

                    {/* Low Stock Deficit for low-stock mode */}
                    {activeMode === 'low-stock' && (
                      <>
                        <div className="customer-card-row">
                          <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Safe Threshold:</span>
                          <span style={{ fontWeight: 600, color: 'var(--ash-700)' }}>{reorder} Units</span>
                        </div>
                        <div className="customer-card-row">
                          <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Required Deficit:</span>
                          <span style={{ fontWeight: 800, color: '#DC2626' }}>+{deficitUnits} Units</span>
                        </div>
                      </>
                    )}

                    {/* Price */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Selling Price:</span>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                        {formatLKR(prod.selling_price)}
                      </span>
                    </div>

                    {/* Current Stock */}
                    <div className="customer-card-row">
                      <span style={{ color: 'var(--ash-500)', fontSize: '0.78rem' }}>Current Stock:</span>
                      {renderStockBadge(prod.stock_quantity, prod.reorder_level)}
                    </div>

                    {/* Inline Quick Stepper in Stock Mode */}
                    {activeMode === 'stock' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          background: 'var(--ash-50)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          marginTop: '6px',
                        }}
                      >
                        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--ash-700)' }}>Quick Adjust:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="icon-btn-action"
                            style={{ width: '26px', height: '26px', padding: 0 }}
                            disabled={qty <= 0}
                            onClick={() => handleQuickIncrement(prod.id, -1)}
                            title="Deduct 1 unit"
                          >
                            <PackageMinus size={14} color="var(--error)" />
                          </button>
                          <span style={{ minWidth: '40px', textAlign: 'center', fontWeight: 800, fontSize: '0.88rem' }}>
                            {qty}
                          </span>
                          <button
                            type="button"
                            className="icon-btn-action"
                            style={{ width: '26px', height: '26px', padding: 0 }}
                            onClick={() => handleQuickIncrement(prod.id, 1)}
                            title="Add 1 unit"
                          >
                            <PackagePlus size={14} color="var(--success)" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="customer-card-footer">
                    {activeMode === 'low-stock' ? (
                      <button
                        className="btn btn-primary"
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.78rem',
                          gap: '6px',
                          background: '#DC2626',
                          borderColor: '#DC2626',
                          flex: 1,
                        }}
                        onClick={() => handleOpenRestockWorkshop(prod)}
                      >
                        <Hammer size={14} /> Restock Workshop
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.76rem', gap: '5px' }}
                        onClick={() => handleOpenAdjust(prod)}
                      >
                        <Package size={13} color="var(--primary)" /> Adjust Stock
                      </button>
                    )}

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
                      {activeMode === 'products' && (
                        <button
                          className="icon-btn-action icon-btn-delete"
                          title="Delete Product"
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
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
        title="Add New Product Item"
      >
        <form onSubmit={handleAddProduct}>
          <div className="form-grid">
            {/* Item Code & Category */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Item Code / SKU *</label>
                <button
                  type="button"
                  onClick={() => {
                    const nextCode = generateNextItemCode(newProduct.category, products);
                    setNewProduct((prev) => ({ ...prev, item_code: nextCode }));
                  }}
                  title="Generate next sequential item code for this category"
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--primary)',
                    background: 'rgba(30, 77, 140, 0.08)',
                    border: '1px solid rgba(30, 77, 140, 0.25)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  ⚡ Auto Code
                </button>
              </div>
              <input
                type="text"
                className="form-input"
                required
                placeholder={
                  newProduct.category === 'wood'
                    ? 'e.g. WD-001'
                    : newProduct.category === 'melamine'
                    ? 'e.g. MEL-001'
                    : 'e.g. ELC-001'
                }
                value={newProduct.item_code}
                onChange={(e) => setNewProduct({ ...newProduct, item_code: e.target.value })}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Code Prefix: <strong>WD-</strong> (Wood), <strong>MEL-</strong> (Melamine), <strong>ELC-</strong> (Electrical)
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select-full"
                value={newProduct.category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  const autoCode = generateNextItemCode(newCat, products);
                  let defaultWood = newProduct.wood_type;
                  let defaultFinish = newProduct.finish;
                  if (newCat === 'wood') {
                    if (defaultWood === 'Melamine Board' || defaultWood === 'Electrical & Metal Fittings') {
                      defaultWood = 'Teak';
                    }
                    if (defaultFinish === 'Touch-Sensor 3-Tone LED' || defaultFinish?.includes('Melamine')) {
                      defaultFinish = 'Natural Matte Lacquer';
                    }
                  } else if (newCat === 'melamine') {
                    defaultWood = 'Melamine Board';
                    defaultFinish = 'Melamine Scratch-Resistant Walnut';
                  } else if (newCat === 'electrical_item') {
                    defaultWood = 'Electrical & Metal Fittings';
                    defaultFinish = 'Touch-Sensor 3-Tone LED';
                  }
                  setNewProduct({
                    ...newProduct,
                    category: newCat,
                    item_code: autoCode,
                    wood_type: defaultWood,
                    finish: defaultFinish,
                  });
                }}
              >
                <option value="wood">Wood (WD)</option>
                <option value="melamine">Melamine (MEL)</option>
                <option value="electrical_item">Electrical Items (ELC)</option>
              </select>
            </div>

            {/* Product Name */}
            <div className="form-group full-width">
              <label className="form-label">Furniture / Product Name *</label>
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
              <label className="form-label">Wood / Material Type</label>
              <select
                className="form-select-full"
                value={newProduct.wood_type}
                onChange={(e) => setNewProduct({ ...newProduct, wood_type: e.target.value })}
              >
                <option value="Teak">Teak</option>
                <option value="Mahogany">Mahogany</option>
                <option value="Nadun">Nadun</option>
                <option value="Mara">Mara</option>
                <option value="Melamine Board">Melamine Board</option>
                <option value="MDF / Plywood">MDF / Plywood</option>
                <option value="Electrical & Metal Fittings">Electrical & Metal Fittings</option>
                <option value="Treated Rubber Wood">Treated Rubber Wood</option>
                <option value="Iron Wood / Golu Mora">Iron Wood / Golu Mora</option>
                <option value="Other Material">Other Material</option>
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

            {/* Product Image Upload Section */}
            <div className="form-group full-width">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={15} color="var(--primary)" /> Product Photo / Image
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', fontWeight: 400 }}>
                  PNG, JPG, WebP • Stored directly in Database
                </span>
              </label>

              {newProduct.image_url ? (
                <div className="image-preview-container">
                  <img
                    src={newProduct.image_url}
                    alt="Product Preview"
                    className="image-preview-img"
                  />
                  <div className="image-preview-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 600, fontSize: '0.84rem' }}>
                      <CheckCircle size={15} /> Image Ready to Store in Database
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ash-600)', marginTop: '3px' }}>
                      Optimized and ready to be saved with the product record.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.76rem', gap: '5px' }}
                        onClick={() => addFileInputRef.current?.click()}
                      >
                        <Upload size={13} /> Change Image
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '5px 12px', fontSize: '0.76rem', gap: '5px' }}
                        onClick={() => setNewProduct({ ...newProduct, image_url: '' })}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={addFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleNewImageFileChange}
                  />
                </div>
              ) : (
                <div
                  className={`image-upload-dropzone ${isAddDragging ? 'dragging' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsAddDragging(true);
                  }}
                  onDragLeave={() => setIsAddDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsAddDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processAddImageFile(file);
                  }}
                  onClick={() => addFileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={addFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleNewImageFileChange}
                  />
                  <div className="upload-dropzone-icon">
                    <Upload size={22} color="var(--primary)" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ash-900)' }}>
                      Click to Browse or Drag & Drop Product Image
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--ash-500)', marginTop: '3px' }}>
                      Supports phone photos, camera uploads, and digital graphics
                    </div>
                  </div>
                </div>
              )}

              {/* Optional URL Input */}
              <div style={{ marginTop: '8px' }}>
                <input
                  type="url"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '7px 12px' }}
                  placeholder="Or paste direct image URL (https://...)"
                  value={newProduct.image_url?.startsWith('data:') ? '' : newProduct.image_url}
                  onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                />
              </div>
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
            <button type="button" className="btn btn-secondary" disabled={isSubmitting} onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RotateCcw size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Uploading & Saving...
                </>
              ) : (
                <>
                  <Plus size={16} /> Save Product
                </>
              )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Item Code / SKU *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextCode = generateNextItemCode(
                        editingProduct.category,
                        products.filter((p) => p.id !== editingProduct.id)
                      );
                      setEditingProduct((prev) => ({ ...prev, item_code: nextCode }));
                    }}
                    title="Generate next sequential item code for this category"
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--primary)',
                      background: 'rgba(30, 77, 140, 0.08)',
                      border: '1px solid rgba(30, 77, 140, 0.25)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    ⚡ Auto Code
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder={
                    editingProduct.category === 'wood'
                      ? 'e.g. WD-001'
                      : editingProduct.category === 'melamine'
                      ? 'e.g. MEL-001'
                      : 'e.g. ELC-001'
                  }
                  value={editingProduct.item_code || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, item_code: e.target.value })}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Code Prefix: <strong>WD-</strong> (Wood), <strong>MEL-</strong> (Melamine), <strong>ELC-</strong> (Electrical)
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-select-full"
                  value={editingProduct.category || 'wood'}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setEditingProduct({ ...editingProduct, category: newCat });
                  }}
                >
                  <option value="wood">Wood (WD)</option>
                  <option value="melamine">Melamine (MEL)</option>
                  <option value="electrical_item">Electrical Items (ELC)</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Furniture / Product Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Wood / Material Type</label>
                <select
                  className="form-select-full"
                  value={editingProduct.wood_type || 'Teak'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, wood_type: e.target.value })}
                >
                  <option value="Teak">Teak</option>
                  <option value="Mahogany">Mahogany</option>
                  <option value="Nadun">Nadun</option>
                  <option value="Mara">Mara</option>
                  <option value="Melamine Board">Melamine Board</option>
                  <option value="MDF / Plywood">MDF / Plywood</option>
                  <option value="Electrical & Metal Fittings">Electrical & Metal Fittings</option>
                  <option value="Treated Rubber Wood">Treated Rubber Wood</option>
                  <option value="Iron Wood / Golu Mora">Iron Wood / Golu Mora</option>
                  <option value="Other Material">Other Material</option>
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

              {/* Product Image Section (Edit) */}
              <div className="form-group full-width">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={15} color="var(--primary)" /> Product Photo / Image
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', fontWeight: 400 }}>
                    PNG, JPG, WebP • Stored directly in Database
                  </span>
                </label>

                {editingProduct.image_url ? (
                  <div className="image-preview-container">
                    <img
                      src={editingProduct.image_url}
                      alt="Product Preview"
                      className="image-preview-img"
                    />
                    <div className="image-preview-details">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 600, fontSize: '0.84rem' }}>
                        <CheckCircle size={15} /> Image Ready to Update in Database
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ash-600)', marginTop: '3px' }}>
                        Optimized and ready to be saved with the product record.
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '0.76rem', gap: '5px' }}
                          onClick={() => editFileInputRef.current?.click()}
                        >
                          <Upload size={13} /> Change Image
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '5px 12px', fontSize: '0.76rem', gap: '5px' }}
                          onClick={() => setEditingProduct({ ...editingProduct, image_url: '' })}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleEditImageFileChange}
                    />
                  </div>
                ) : (
                  <div
                    className={`image-upload-dropzone ${isEditDragging ? 'dragging' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsEditDragging(true);
                    }}
                    onDragLeave={() => setIsEditDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsEditDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processEditImageFile(file);
                    }}
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleEditImageFileChange}
                    />
                    <div className="upload-dropzone-icon">
                      <Upload size={22} color="var(--primary)" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ash-900)' }}>
                        Click to Browse or Drag & Drop New Photo
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--ash-500)', marginTop: '3px' }}>
                        Replace or upload a new photo for this product
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional URL Input */}
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="url"
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '7px 12px' }}
                    placeholder="Or paste direct image URL (https://...)"
                    value={editingProduct.image_url?.startsWith('data:') ? '' : (editingProduct.image_url || '')}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                  />
                </div>
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
              <button type="button" className="btn btn-secondary" disabled={isSubmitting} onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RotateCcw size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    Uploading & Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} /> Save Changes
                  </>
                )}
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
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    objectFit: 'cover',
                    border: '1px solid var(--border-subtle)',
                  }}
                />
              ) : (
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
              )}
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

            {/* Product Photo Showcase */}
            {selectedProduct.image_url && (
              <div
                style={{
                  width: '100%',
                  maxHeight: '260px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '18px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--ash-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  style={{ width: '100%', height: '260px', objectFit: 'cover' }}
                />
              </div>
            )}

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
