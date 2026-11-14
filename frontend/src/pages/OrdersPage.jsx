import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Download,
  Printer,
  X,
  CreditCard,
  LayoutGrid,
  List,
  Trash2,
  FileText,
  UserPlus,
  CheckCircle,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  Eye,
  ArrowRight,
  Clock,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import Modal from '../components/Modal';
import { formatLKR, formatDate } from '../utils/formatters';
import {
  loadSavedOrders,
  saveOrdersToStorage,
  generateNextPassbookNo,
  buildContractNumber,
} from '../utils/ordersData';
import { loadSavedCustomers, saveCustomersToStorage } from '../utils/customersData';
import { loadSavedProducts } from '../utils/productUtils';
import { INITIAL_CENTERS, formatCenterCode } from '../utils/centersData';
import { addLiveNotification } from '../utils/notificationsData';
import { printHtmlDocument } from '../utils/printUtils';
import { apiRequest } from '../services/api';
import {
  validateNic,
  validatePhone,
  validateName,
  validateAmount,
  sanitizeNicInput,
  sanitizePhoneInput,
} from '../utils/validators';

// WhatsApp Official SVG Icon Component
const WhatsAppIcon = ({ size = 15, color = 'currentColor', style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// Format WhatsApp Click-to-Chat URL
export const getWhatsAppUrl = (phone, text = '') => {
  if (!phone) return null;
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '94' + clean.slice(1);
  } else if (!clean.startsWith('94')) {
    clean = '94' + clean;
  }
  const encodedText = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${clean}${encodedText}`;
};

// Generates professional structured invoice summary for WhatsApp
export const generateWhatsAppInvoiceMessage = (order) => {
  if (!order) return '';

  const isInstallment = order.payment_type === 'installment';
  const customerName = order.customer_name || 'Valued Customer';
  const nic = order.customer_nic || order.customer_id || 'N/A';
  const phone = order.customer_phone || '';
  const center = order.center_code || 'C001';
  const orderDate = order.date ? formatDate(order.date) : new Date().toLocaleDateString('en-GB');

  let paymentSection = '';
  if (isInstallment) {
    paymentSection = `💰 *PAYMENT TERMS (INSTALLMENT PLAN)*
• Gross Total: ${formatLKR(order.gross_amount || 0)}
• Advance Paid: ${formatLKR(order.advance_paid || 0)}
• Remaining Balance: ${formatLKR(order.balance_due || 0)}
• Monthly/Weekly Plan: ${formatLKR(order.installment_value || 0)} / ${order.loan_frequency || 'Monthly'}
• Terms: ${order.loan_terms || 12} Installments${order.first_due_date ? `\n• First Due Date: ${formatDate(order.first_due_date)}` : ''}`;
  } else {
    paymentSection = `💰 *PAYMENT DETAILS (FULL CASH)*
• Total Amount: ${formatLKR(order.gross_amount || 0)}
• Advance / Paid: ${formatLKR(order.gross_amount || 0)}
• Payment Status: Fully Paid (Settled)`;
  }

  return `🛋️ *D N S HOME SOLUTIONS*
*Official Customer Sales Invoice & Agreement*
───────────────────────────
📄 *Invoice No:* ${order.invoice_no || 'N/A'}
📜 *Contract No:* ${order.contract_no || 'N/A'}
📅 *Date:* ${orderDate}

👤 *CUSTOMER INFORMATION*
• Name: ${customerName}
• NIC: ${nic}
• Phone: ${phone}
• Center Code: ${center}
${order.customer_address ? `• Delivery Address: ${order.customer_address}\n` : ''}
🛋️ *ITEM SPECIFICATIONS*
• Item: ${order.item_name || 'Furniture Item'}${order.item_code ? ` (${order.item_code})` : ''}
• Quantity: ${order.quantity || 1} Unit(s)
• Unit Price: ${formatLKR(order.unit_price || 0)}
${Number(order.document_charge) > 0 ? `• Agreement / Doc Fee: ${formatLKR(order.document_charge)}\n` : ''}
${paymentSection}

───────────────────────────
✨ *Thank you for your business with D N S Home Solutions!*
📞 For inquiries & customer support: 0772345671`;
};

export default function OrdersPage({ headerCenter = 'all', onNavigate }) {
  // Orders, customers, products and centers data
  const [orders, setOrders] = useState(() => loadSavedOrders());
  const [customers, setCustomers] = useState(() => loadSavedCustomers());
  const [products, setProducts] = useState(() => loadSavedProducts());
  const [centers] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_centers_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_CENTERS;
  });

  // Main Page Filters & View Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // Default to professional Table View

  // Modals
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isOrderSuccessModalOpen, setIsOrderSuccessModalOpen] = useState(false);
  const [placedSuccessOrder, setPlacedSuccessOrder] = useState(null);

  // Selected Order for viewing details, printing, or paying
  const [activeSelectedOrder, setActiveSelectedOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Quick Register Customer inside Add Order Modal
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickClient, setQuickClient] = useState({
    first_name: '',
    last_name: '',
    nic: '',
    phone: '',
    city: 'Maharagama',
    address: '',
    branch_code: 'MHG',
    center_code: 'C001',
  });

  // ==========================================
  // ADD NEW ORDER FORM STATE
  // ==========================================
  const [formCustomerId, setFormCustomerId] = useState('');
  const [clientSearchText, setClientSearchText] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [formCenterCode, setFormCenterCode] = useState('C001');
  const [formBranchCode, setFormBranchCode] = useState('MHG');
  const [formDeliveryAddress, setFormDeliveryAddress] = useState('');

  const [formProductId, setFormProductId] = useState('');
  const [selectedProductObj, setSelectedProductObj] = useState(null);
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnitPrice, setFormUnitPrice] = useState(0);

  // Autocomplete Search & Suggestions state for Code & Name
  const [codeSearchText, setCodeSearchText] = useState('');
  const [nameSearchText, setNameSearchText] = useState('');
  const [isCodeDropdownOpen, setIsCodeDropdownOpen] = useState(false);
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);

  const [formPassbookNo, setFormPassbookNo] = useState('PN');
  const [formPaymentType, setFormPaymentType] = useState('installment'); // 'installment' | 'cash'
  const [formDocumentCharge, setFormDocumentCharge] = useState(1000); // Documentation fee in LKR
  const [formDownPayment, setFormDownPayment] = useState(0);
  const [formLoanFrequency, setFormLoanFrequency] = useState('monthly'); // 'monthly' | 'weekly'
  const [formLoanTerms, setFormLoanTerms] = useState(12);
  const [formFirstDueDate, setFormFirstDueDate] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Cash');
  const [formNotes, setFormNotes] = useState('');
  const [formAutoWhatsApp, setFormAutoWhatsApp] = useState(true);

  // Sync external changes from localStorage and fetch latest products & orders from backend/Supabase
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch latest products
    apiRequest('/products')
      .then((res) => {
        if (isMounted && res && Array.isArray(res.data) && res.data.length > 0) {
          setProducts(res.data);
          try {
            localStorage.setItem('dnd_products_list', JSON.stringify(res.data));
          } catch {
            // ignore storage errors
          }
        }
      })
      .catch(() => {
        // Fallback to localStorage products already loaded
      });

    // 2. Fetch latest orders from Supabase / database and merge
    apiRequest('/orders')
      .then((res) => {
        if (isMounted && res && Array.isArray(res.data)) {
          if (res.data.length === 0) {
            // Database currently has 0 orders; sync initial/local orders to DB
            const localOrders = loadSavedOrders();
            if (localOrders && localOrders.length > 0) {
              console.log(`📤 Initializing database orders sync (${localOrders.length} records)...`);
              localOrders.forEach((ord) => {
                apiRequest('/orders', {
                  method: 'POST',
                  body: JSON.stringify(ord),
                }).catch(() => {});
              });
            }
          } else {
            setOrders((prev) => {
              const dbOrders = res.data;
              const dbIds = new Set(dbOrders.map((d) => d.id));
              const dbContracts = new Set(
                dbOrders.map((d) => (d.contract_no || '').trim().toUpperCase()).filter(Boolean)
              );
              // Keep local records not yet present in db and sync them
              const localOnly = prev.filter(
                (p) =>
                  !dbIds.has(p.id) &&
                  !dbContracts.has((p.contract_no || '').trim().toUpperCase())
              );
              if (localOnly.length > 0) {
                localOnly.forEach((locOrd) => {
                  apiRequest('/orders', { method: 'POST', body: JSON.stringify(locOrd) }).catch(() => {});
                });
              }
              const merged = [...dbOrders, ...localOnly];
              saveOrdersToStorage(merged);
              return merged;
            });
          }
        }
      })
      .catch((err) => {
        console.warn('Orders fetch notice:', err);
      });

    const handleStorage = (e) => {
      if (!e || e.key === 'dnd_orders_list_v2') setOrders(loadSavedOrders());
      if (!e || e.key === 'dnd_customers_list') setCustomers(loadSavedCustomers());
      if (!e || e.key === 'dnd_products_list') setProducts(loadSavedProducts());
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Filter for active registered clients only
  const activeCustomers = useMemo(() => {
    return customers.filter((c) => c && c.status !== 'inactive');
  }, [customers]);

  // Form: Currently selected active customer
  const formSelectedCustomer = useMemo(() => {
    return activeCustomers.find((c) => c.id === formCustomerId || (c.nic && c.nic === formCustomerId)) || null;
  }, [activeCustomers, formCustomerId]);

  // Suggestions for Customer search (search by Name, NIC, Phone, City, Customer ID)
  const customerSuggestions = useMemo(() => {
    const q = clientSearchText.toLowerCase().trim();
    if (!q || (formSelectedCustomer && `${formSelectedCustomer.name} — NIC: ${formSelectedCustomer.nic || formSelectedCustomer.customer_id}`.toLowerCase() === q)) {
      return activeCustomers;
    }
    return activeCustomers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q) ||
        c.nic?.toLowerCase().includes(q) ||
        c.customer_id?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.city?.toLowerCase().includes(q)
    );
  }, [activeCustomers, clientSearchText, formSelectedCustomer]);

  // Select customer handler
  const handleSelectCustomer = (cust) => {
    if (cust) {
      setFormCustomerId(cust.id);
      setClientSearchText(`${cust.name} — NIC: ${cust.nic || cust.customer_id}`);
      if (cust.center_code) setFormCenterCode(formatCenterCode(cust.center_code));
      if (cust.branch_code) setFormBranchCode(cust.branch_code);
      if (cust.address) setFormDeliveryAddress(cust.address);
    } else {
      setFormCustomerId('');
      setClientSearchText('');
    }
    setIsClientDropdownOpen(false);
  };

  // Type in client search input
  const handleClientSearchChange = (val) => {
    setClientSearchText(val);
    setIsClientDropdownOpen(true);
    setIsCodeDropdownOpen(false);
    setIsNameDropdownOpen(false);

    const clean = val.trim().toLowerCase();
    if (!clean) {
      setFormCustomerId('');
      return;
    }
    const exact = activeCustomers.find(
      (c) =>
        (c.nic && c.nic.toLowerCase() === clean) ||
        (c.customer_id && c.customer_id.toLowerCase() === clean) ||
        (c.phone && c.phone.replace(/\D/g, '') === clean.replace(/\D/g, '') && clean.length >= 9) ||
        (c.name && c.name.toLowerCase() === clean)
    );
    if (exact) {
      setFormCustomerId(exact.id);
      if (exact.center_code) setFormCenterCode(formatCenterCode(exact.center_code));
      if (exact.branch_code) setFormBranchCode(exact.branch_code);
      if (exact.address) setFormDeliveryAddress(exact.address);
    }
  };

  // Form: Currently selected product (prioritizes direct selection or exact code match)
  const formSelectedProduct = useMemo(() => {
    if (selectedProductObj) {
      return selectedProductObj;
    }
    if (formProductId) {
      const found = products.find(
        (p) =>
          (p.id && String(p.id) === String(formProductId)) ||
          (p.item_code && p.item_code.toLowerCase() === String(formProductId).toLowerCase())
      );
      if (found) return found;
    }
    if (codeSearchText.trim()) {
      const byCode = products.find(
        (p) => p.item_code && p.item_code.trim().toLowerCase() === codeSearchText.trim().toLowerCase()
      );
      if (byCode) return byCode;
    }
    if (nameSearchText.trim()) {
      const byName = products.find(
        (p) => p.name && p.name.trim().toLowerCase() === nameSearchText.trim().toLowerCase()
      );
      if (byName) return byName;
    }
    if (codeSearchText.trim() || nameSearchText.trim()) {
      return {
        id: `prod-${Date.now()}`,
        item_code: codeSearchText.trim().toUpperCase() || 'WD-101',
        name: nameSearchText.trim() || 'Custom Furniture Item',
        category: 'wood',
        selling_price: Number(formUnitPrice) || 0,
      };
    }
    return null;
  }, [selectedProductObj, products, formProductId, codeSearchText, nameSearchText, formUnitPrice]);

  // Form: Auto-calculated Furniture Item Total (Qty * UnitPrice)
  const formItemTotal = useMemo(() => {
    return (Number(formQuantity) || 1) * (Number(formUnitPrice) || 0);
  }, [formQuantity, formUnitPrice]);

  // Form: Auto-calculated Gross Order Total (Item Total + Document Charge)
  const formGrossTotal = useMemo(() => {
    return formItemTotal + (Number(formDocumentCharge) || 0);
  }, [formItemTotal, formDocumentCharge]);

  // Form: Loan Balance calculation
  const formLoanBalance = useMemo(() => {
    if (formPaymentType === 'cash') return 0;
    return Math.max(0, formGrossTotal - (Number(formDownPayment) || 0));
  }, [formPaymentType, formGrossTotal, formDownPayment]);

  // Form: Auto-calculated Installment Value
  const formCalculatedInstallment = useMemo(() => {
    if (formPaymentType === 'cash' || formLoanBalance <= 0) return 0;
    const t = Number(formLoanTerms) || 1;
    return Math.ceil(formLoanBalance / t);
  }, [formPaymentType, formLoanBalance, formLoanTerms]);

  // Form: Real-time Contract Code (PN / center code / item code)
  const formContractCode = useMemo(() => {
    const pn = (formPassbookNo || 'PN').trim().toUpperCase();
    const center = (formCenterCode || 'C001').trim().toUpperCase();
    const item = (
      codeSearchText.trim() ||
      formSelectedProduct?.item_code ||
      'WD-001'
    ).trim().toUpperCase();
    return buildContractNumber(pn, center, item);
  }, [formPassbookNo, formCenterCode, formSelectedProduct, codeSearchText]);

  // Suggestions for Code search (shows all products when empty or matching already-selected code so switching items is easy)
  const codeSuggestions = useMemo(() => {
    const q = codeSearchText.toLowerCase().trim();
    if (!q || (formSelectedProduct?.item_code && formSelectedProduct.item_code.toLowerCase().trim() === q)) {
      return products;
    }
    return products.filter(
      (p) => p.item_code?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
    );
  }, [products, codeSearchText, formSelectedProduct]);

  // Suggestions for Name search (shows all products when empty or matching already-selected name so switching items is easy)
  const nameSuggestions = useMemo(() => {
    const q = nameSearchText.toLowerCase().trim();
    if (!q || (formSelectedProduct?.name && formSelectedProduct.name.toLowerCase().trim() === q)) {
      return products;
    }
    return products.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.item_code?.toLowerCase().includes(q)
    );
  }, [products, nameSearchText, formSelectedProduct]);

  // Select a product from suggestions or direct selection
  const handleSelectProduct = (prod) => {
    if (prod) {
      setSelectedProductObj(prod);
      setFormProductId(prod.id || prod.item_code || '');
      const price = Number(prod.selling_price ?? prod.price) || 0;
      setFormUnitPrice(price > 0 ? price : '');
      setCodeSearchText(prod.item_code || '');
      setNameSearchText(prod.name || '');
      const total = (Number(formQuantity) || 1) * price;
      setFormDownPayment(price > 0 ? Math.round(total * 0.2) : 0);
    } else {
      setSelectedProductObj(null);
      setFormProductId('');
      setFormUnitPrice('');
      setCodeSearchText('');
      setNameSearchText('');
      setFormDownPayment('');
    }
    setIsCodeDropdownOpen(false);
    setIsNameDropdownOpen(false);
  };

  // Handle typing in Product Code field (auto-selects matching item & updates Contract Code live)
  const handleCodeSearchChange = (val) => {
    setCodeSearchText(val);
    setIsCodeDropdownOpen(true);
    setIsNameDropdownOpen(false);

    const clean = val.trim().toLowerCase();
    if (!clean) {
      setSelectedProductObj(null);
      setFormProductId('');
      return;
    }

    const exactMatch = products.find(
      (p) => p.item_code && p.item_code.trim().toLowerCase() === clean
    );
    if (exactMatch) {
      setSelectedProductObj(exactMatch);
      setFormProductId(exactMatch.id || exactMatch.item_code || '');
      const price = Number(exactMatch.selling_price ?? exactMatch.price) || 0;
      setFormUnitPrice(price > 0 ? price : '');
      setNameSearchText(exactMatch.name || '');
      const total = (Number(formQuantity) || 1) * price;
      setFormDownPayment(price > 0 ? Math.round(total * 0.2) : 0);
    }
  };

  // Handle typing in Product Name field (auto-selects matching item & updates Contract Code live)
  const handleNameSearchChange = (val) => {
    setNameSearchText(val);
    setIsNameDropdownOpen(true);
    setIsCodeDropdownOpen(false);

    const clean = val.trim().toLowerCase();
    if (!clean) {
      setSelectedProductObj(null);
      setFormProductId('');
      return;
    }

    const exactMatch = products.find(
      (p) => p.name && p.name.trim().toLowerCase() === clean
    );
    if (exactMatch) {
      setSelectedProductObj(exactMatch);
      setFormProductId(exactMatch.id || exactMatch.item_code || '');
      const price = Number(exactMatch.selling_price ?? exactMatch.price) || 0;
      setFormUnitPrice(price > 0 ? price : '');
      setCodeSearchText(exactMatch.item_code || '');
      const total = (Number(formQuantity) || 1) * price;
      setFormDownPayment(price > 0 ? Math.round(total * 0.2) : 0);
    }
  };

  // Open "Add New Order" Modal & Initialize Defaults
  const handleOpenAddOrderModal = () => {
    setFormPassbookNo('PN');

    const firstCust = activeCustomers[0] || null;
    if (firstCust) {
      setFormCustomerId(firstCust.id);
      setClientSearchText(`${firstCust.name} — NIC: ${firstCust.nic || firstCust.customer_id}`);
      setFormCenterCode(formatCenterCode(firstCust.center_code || 'C001'));
      setFormBranchCode(firstCust.branch_code || 'MHG');
      setFormDeliveryAddress(firstCust.address || '');
    } else {
      setFormCustomerId('');
      setClientSearchText('');
    }

    const firstProd = products[0] || null;
    if (firstProd) {
      setSelectedProductObj(firstProd);
      setFormProductId(firstProd.id || firstProd.item_code || '');
      setCodeSearchText(firstProd.item_code || '');
      setNameSearchText(firstProd.name || '');
      const price = Number(firstProd.selling_price ?? firstProd.price) || 0;
      setFormUnitPrice(price > 0 ? price : '');
      setFormQuantity(1);
      setFormDownPayment(price > 0 ? Math.round(price * 0.2) : 0);
    } else {
      setSelectedProductObj(null);
      setFormProductId('');
      setCodeSearchText('');
      setNameSearchText('');
      setFormUnitPrice('');
      setFormQuantity(1);
      setFormDownPayment(0);
    }

    setFormPaymentType('installment');
    setFormDocumentCharge(1000);
    setFormLoanFrequency('monthly');
    setFormLoanTerms(12);

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setFormFirstDueDate(nextMonth.toISOString().slice(0, 10));

    setFormPaymentMethod('Cash');
    setFormNotes('');
    setShowQuickRegister(false);
    setIsClientDropdownOpen(false);
    setIsCodeDropdownOpen(false);
    setIsNameDropdownOpen(false);
    setIsAddOrderModalOpen(true);
  };

  // When customer changes in form
  const handleFormSelectCustomer = (custId) => {
    setFormCustomerId(custId);
    const cust = activeCustomers.find((c) => c.id === custId);
    if (cust) {
      if (cust.center_code) setFormCenterCode(formatCenterCode(cust.center_code));
      if (cust.branch_code) setFormBranchCode(cust.branch_code);
      if (cust.address) setFormDeliveryAddress(cust.address);
    }
  };

  // When loan frequency changes
  const handleFormFrequencyChange = (freq) => {
    setFormLoanFrequency(freq);
    if (freq === 'weekly') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setFormFirstDueDate(nextWeek.toISOString().slice(0, 10));
    } else {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setFormFirstDueDate(nextMonth.toISOString().slice(0, 10));
    }
  };

  // Quick percent preset for down payment (calculated from item value)
  const handleSetDownPaymentPercent = (pct) => {
    const calculated = Math.round(formItemTotal * (pct / 100));
    setFormDownPayment(calculated);
  };

  // Quick Register Customer inside Modal
  const handleQuickRegisterClient = (e) => {
    e.preventDefault();

    const fnCheck = validateName(quickClient.first_name, 'First Name', true);
    if (!fnCheck.isValid) {
      alert(fnCheck.message);
      return;
    }
    if (quickClient.last_name) {
      const lnCheck = validateName(quickClient.last_name, 'Last Name', false);
      if (!lnCheck.isValid) {
        alert(lnCheck.message);
        return;
      }
    }

    const nicCheck = validateNic(quickClient.nic, true);
    if (!nicCheck.isValid) {
      alert(`NIC Validation Error:\n${nicCheck.message}`);
      return;
    }

    const phoneCheck = validatePhone(quickClient.phone, true);
    if (!phoneCheck.isValid) {
      alert(`Phone Number Validation Error:\n${phoneCheck.message}`);
      return;
    }

    const cleanNic = nicCheck.cleanNic;
    const cleanPhone = phoneCheck.cleanPhone;
    const existing = customers.find(
      (c) => (c.nic && c.nic.trim().toUpperCase() === cleanNic) || c.customer_id === cleanNic
    );
    if (existing) {
      alert(`Customer with NIC "${cleanNic}" already exists. Selected automatically.`);
      setFormCustomerId(existing.id);
      setShowQuickRegister(false);
      return;
    }

    const fullName = `${quickClient.first_name} ${quickClient.last_name || ''}`.trim();
    const newCust = {
      id: `cust-${Date.now()}`,
      customer_id: cleanNic,
      branch_code: quickClient.branch_code || 'MHG',
      center_code: formatCenterCode(quickClient.center_code || 'C001'),
      contract_no: '1',
      item_code: '',
      first_name: quickClient.first_name,
      last_name: quickClient.last_name || '',
      name: fullName,
      civil_status: 'Single',
      dob: '',
      phone: cleanPhone,
      whatsapp: cleanPhone,
      nic: cleanNic,
      city: quickClient.city || 'Maharagama',
      address: quickClient.address || '',
      category: 'custom_order',
      outstanding_balance: 0,
      total_spent: 0,
      total_orders: 0,
      status: 'active',
      notes: 'Registered during order creation',
      created_at: new Date().toISOString(),
    };

    const updated = [newCust, ...customers];
    setCustomers(updated);
    saveCustomersToStorage(updated);

    addLiveNotification({
      title: `Client Registered`,
      desc: `${newCust.name} (NIC: ${newCust.nic}) registered at ${newCust.branch_code}/${newCust.center_code}.`,
      category: 'alerts',
      type: 'info',
      targetTab: 'customer-directory',
    });

    setFormCustomerId(newCust.id);
    setClientSearchText(`${newCust.name} — NIC: ${newCust.nic}`);
    setFormCenterCode(newCust.center_code);
    setFormBranchCode(newCust.branch_code);
    setFormDeliveryAddress(newCust.address);
    setShowQuickRegister(false);
    setIsClientDropdownOpen(false);
  };

  // Submit and Place Order
  const handleConfirmPlaceOrder = ({ andPrint = false, andWhatsApp = false } = {}) => {
    if (!formSelectedCustomer) {
      alert('Please select an active registered customer. Only active clients can place orders.');
      return;
    }
    if (!formSelectedProduct) {
      alert('Please select a furniture item.');
      return;
    }

    const finalPassbook = (formPassbookNo || 'PN').trim().toUpperCase();
    const finalItemCode = (
      codeSearchText.trim() ||
      formSelectedProduct?.item_code ||
      'WD-001'
    ).trim().toUpperCase();
    const finalAssignedCenter = formatCenterCode(formSelectedCustomer?.center_code || formCenterCode || 'C001');
    const finalContract = buildContractNumber(
      finalPassbook,
      finalAssignedCenter,
      finalItemCode
    );

    const isInstallment = formPaymentType === 'installment';
    const finalDocCharge = Math.max(0, Number(formDocumentCharge) || 0);
    const finalQty = Number(formQuantity) || 1;
    if (finalQty <= 0) {
      alert('Order quantity must be at least 1 unit.');
      return;
    }
    const finalUnitPrice = Number(formUnitPrice) || 0;
    if (finalUnitPrice <= 0) {
      alert('Item unit price must be greater than 0.');
      return;
    }

    const finalItemTotal = finalQty * finalUnitPrice;
    const finalGross = finalItemTotal + finalDocCharge;

    const downPaymentVal = Number(formDownPayment) || 0;
    if (downPaymentVal < 0) {
      alert('Advance payment cannot be negative.');
      return;
    }
    if (downPaymentVal > finalGross) {
      alert(`Advance payment (${formatLKR(downPaymentVal)}) cannot exceed the total order value (${formatLKR(finalGross)}).`);
      return;
    }

    const finalAdvance = isInstallment ? Math.min(downPaymentVal, finalGross) : finalGross;
    const finalBalanceDue = Math.max(0, finalGross - finalAdvance);
    const finalTerms = isInstallment ? Number(formLoanTerms) || 1 : 1;
    const finalInstallmentVal = isInstallment ? Math.ceil(finalBalanceDue / finalTerms) : 0;

    const newOrder = {
      id: `ORD-${Date.now().toString().slice(-4)}`,
      invoice_no: `DS-INV-${Math.floor(1000 + Math.random() * 9000)}`,
      contract_no: finalContract,
      passbook_no: finalPassbook,
      date: new Date().toISOString().slice(0, 10),
      customer_id: formSelectedCustomer.nic || formSelectedCustomer.customer_id,
      customer_name: formSelectedCustomer.name,
      customer_phone: formSelectedCustomer.phone,
      customer_whatsapp: formSelectedCustomer.whatsapp || formSelectedCustomer.phone,
      customer_nic: formSelectedCustomer.nic || formSelectedCustomer.customer_id,
      customer_address: formDeliveryAddress || formSelectedCustomer.address,
      branch_code: '',
      center_code: finalAssignedCenter,
      item_id: formSelectedProduct.id,
      item_code: formSelectedProduct.item_code,
      item_name: formSelectedProduct.name,
      category: formSelectedProduct.category,
      quantity: Number(formQuantity),
      unit_price: Number(formUnitPrice),
      item_total: finalItemTotal,
      document_charge: finalDocCharge,
      gross_amount: finalGross,
      advance_paid: finalAdvance,
      balance_due: finalBalanceDue,
      payment_type: formPaymentType,
      loan_frequency: isInstallment ? formLoanFrequency : null,
      loan_terms: finalTerms,
      installment_value: finalInstallmentVal,
      first_due_date: isInstallment ? formFirstDueDate : null,
      installments_paid: isInstallment && finalBalanceDue <= 0 ? finalTerms : finalAdvance > 0 ? 1 : 0,
      payment_method: formPaymentMethod,
      order_status: 'In Production',
      status: finalBalanceDue <= 0 ? 'Fully Paid' : 'Active Loan',
      notes: formNotes || `Order for ${formSelectedProduct.name}`,
      created_at: new Date().toISOString(),
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);

    // Persist new order & initial advance to database (Supabase / Express)
    try {
      apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(newOrder),
      })
        .then((res) => {
          if (res && res.data && res.data.id) {
            const merged = { ...newOrder, ...res.data };
            setOrders((prev) => prev.map((o) => (o.id === newOrder.id ? merged : o)));
            const fresh = loadSavedOrders().map((o) => (o.id === newOrder.id ? merged : o));
            saveOrdersToStorage(fresh);
          }
        })
        .catch((dbErr) => {
          console.warn('Order DB persist notice:', dbErr);
        });
    } catch {}

    // Update customer stats
    const updatedCustomers = customers.map((c) => {
      if (c.id === formSelectedCustomer.id) {
        return {
          ...c,
          outstanding_balance: (c.outstanding_balance || 0) + finalBalanceDue,
          total_spent: (c.total_spent || 0) + finalGross,
          total_orders: (c.total_orders || 0) + 1,
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    saveCustomersToStorage(updatedCustomers);

    // Broadcast live notifications for real-time order creation & advance payment
    addLiveNotification({
      title: `New Order: ${newOrder.invoice_no}`,
      desc: `${newOrder.item_name} (Qty: ${newOrder.quantity || 1}) placed for ${newOrder.customer_name} (${newOrder.center_code}). Total: ${formatLKR(newOrder.gross_amount)}.`,
      category: 'orders',
      type: 'order',
      targetTab: 'orders',
    });

    if (finalAdvance > 0) {
      addLiveNotification({
        title: `Advance Received: ${formatLKR(finalAdvance)}`,
        desc: `Initial down payment received for ${newOrder.contract_no} from ${newOrder.customer_name} via ${formPaymentMethod}.`,
        category: 'payments',
        type: 'payment',
        targetTab: 'payments',
      });
    }

    setPlacedSuccessOrder(newOrder);
    setActiveSelectedOrder(newOrder);
    setIsAddOrderModalOpen(false);

    if (andWhatsApp) {
      handleSendWhatsAppInvoice(newOrder);
    }

    if (andPrint) {
      setIsPrintModalOpen(true);
    } else {
      setIsOrderSuccessModalOpen(true);
    }
  };

  // Send WhatsApp Invoice Directly to Customer
  const handleSendWhatsAppInvoice = (order) => {
    if (!order) return;
    const targetPhone = order.customer_whatsapp || order.customer_phone || '';
    if (!targetPhone) {
      alert('Customer phone number is missing. Cannot send WhatsApp invoice.');
      return;
    }
    const message = generateWhatsAppInvoiceMessage(order);
    const waUrl = getWhatsAppUrl(targetPhone, message);
    if (waUrl) {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Record Installment Payment
  const handleRecordInstallment = (e) => {
    e.preventDefault();
    if (!activeSelectedOrder) return;
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (amt > activeSelectedOrder.balance_due) {
      alert(`Amount exceeds balance due of ${formatLKR(activeSelectedOrder.balance_due)}.`);
      return;
    }

    const newBal = Math.max(0, activeSelectedOrder.balance_due - amt);
    const newPaidCount = (activeSelectedOrder.installments_paid || 0) + 1;
    const newStatus = newBal <= 0 ? 'Fully Paid' : 'Active Loan';

    const updatedOrders = orders.map((o) => {
      if (o.id === activeSelectedOrder.id) {
        return {
          ...o,
          balance_due: newBal,
          advance_paid: (o.advance_paid || 0) + amt,
          installments_paid: newPaidCount,
          status: newStatus,
        };
      }
      return o;
    });
    setOrders(updatedOrders);
    saveOrdersToStorage(updatedOrders);

    // Update customer outstanding balance
    const updatedCustomers = customers.map((c) => {
      if (c.nic === activeSelectedOrder.customer_nic || c.id === activeSelectedOrder.customer_id) {
        return {
          ...c,
          outstanding_balance: Math.max(0, (c.outstanding_balance || 0) - amt),
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
    saveCustomersToStorage(updatedCustomers);

    const updatedCurrent = {
      ...activeSelectedOrder,
      balance_due: newBal,
      advance_paid: (activeSelectedOrder.advance_paid || 0) + amt,
      status: newStatus,
    };
    setActiveSelectedOrder(updatedCurrent);

    // Broadcast live payment notification
    addLiveNotification({
      title: newBal <= 0 ? `Loan Fully Settled! 🎉` : `Payment Received: ${formatLKR(amt)}`,
      desc: `${formatLKR(amt)} received for ${activeSelectedOrder.contract_no} (${activeSelectedOrder.customer_name}). ${newBal <= 0 ? 'Account is now cleared!' : `Remaining balance: ${formatLKR(newBal)}`}`,
      category: newBal <= 0 ? 'collections' : 'payments',
      type: newBal <= 0 ? 'collection' : 'payment',
      targetTab: 'payments',
    });

    // Persist installment payment and updated balance to database
    try {
      apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          order_id: activeSelectedOrder.id,
          contract_no: activeSelectedOrder.contract_no,
          customer_id: activeSelectedOrder.customer_id,
          customer_name: activeSelectedOrder.customer_name,
          customer_nic: activeSelectedOrder.customer_nic,
          customer_phone: activeSelectedOrder.customer_phone,
          branch_code: activeSelectedOrder.branch_code,
          center_code: activeSelectedOrder.center_code,
          amount: amt,
          previous_balance: activeSelectedOrder.balance_due,
          new_balance: newBal,
          payment_method: 'Cash',
          payment_type: 'Installment Loan',
          notes: `Installment for ${activeSelectedOrder.contract_no}`,
        }),
      }).catch((e) => console.warn('Payment DB sync notice:', e));

      if (activeSelectedOrder.id) {
        apiRequest(`/orders/${activeSelectedOrder.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            advance_paid: (activeSelectedOrder.advance_paid || 0) + amt,
            balance_due: newBal,
            status: newStatus,
          }),
        }).catch((e) => console.warn('Order DB update notice:', e));
      }
    } catch {}

    setIsPaymentModalOpen(false);
    setPaymentAmount('');
    alert(`Installment of ${formatLKR(amt)} recorded! Remaining balance: ${formatLKR(newBal)}`);
  };

  // Cancel / Delete Order
  const handleDeleteOrder = (orderId, contractNo) => {
    if (window.confirm(`Are you sure you want to cancel order "${contractNo}"?`)) {
      const removed = orders.find((o) => o.id === orderId);
      const updated = orders.filter((o) => o.id !== orderId);
      setOrders(updated);
      saveOrdersToStorage(updated);
      if (activeSelectedOrder && activeSelectedOrder.id === orderId) {
        setIsViewDetailsModalOpen(false);
        setActiveSelectedOrder(null);
      }

      apiRequest(`/orders/${orderId}`, { method: 'DELETE' }).catch((err) => {
        console.warn('Order DB delete notice:', err);
      });

      addLiveNotification({
        title: `Order Cancelled`,
        desc: `Order ${removed?.invoice_no || contractNo} was removed from the active register.`,
        category: 'alerts',
        type: 'warning',
        targetTab: 'orders',
      });
    }
  };

  // Export CSV (Focused on Order & Production Details)
  const handleExportCSV = () => {
    if (!filteredOrders.length) {
      alert('No orders to export.');
      return;
    }
    const headers = [
      'Invoice No',
      'Order Date',
      'Contract Ref',
      'Customer Name',
      'NIC',
      'Phone',
      'Center',
      'Delivery Address',
      'Furniture Item',
      'Item Code',
      'Quantity',
      'Unit Price',
      'Total Amount',
      'Notes',
    ];
    const rows = filteredOrders.map((o) => [
      `"${o.invoice_no}"`,
      `"${o.date}"`,
      `"${o.contract_no}"`,
      `"${o.customer_name}"`,
      `"${o.customer_nic || ''}"`,
      `"${o.customer_phone || ''}"`,
      `"${o.branch_code}/${o.center_code}"`,
      `"${(o.customer_address || '').replace(/"/g, '""')}"`,
      `"${o.item_name}"`,
      `"${o.item_code}"`,
      o.quantity || 1,
      o.unit_price || o.gross_amount,
      o.gross_amount,
      `"${(o.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `orders_manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export filtered orders to Printable PDF Manifest / Download PDF
  const handleExportPDF = () => {
    if (!filteredOrders.length) {
      alert('No orders to export.');
      return;
    }

    const totalTurnover = filteredOrders.reduce((sum, o) => sum + (Number(o.gross_amount) || 0), 0);
    const totalUnits = filteredOrders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0);

    const rowsHtml = filteredOrders
      .map((o, idx) => {
        return `
          <tr style="background: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; font-size: 10px;">${idx + 1}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-family: monospace; font-weight: 700; color: #2563EB; font-size: 10.5px;">
              ${o.invoice_no}<br>
              <span style="color: #64748B; font-size: 9.5px; font-weight: normal;">Ref: ${o.contract_no}</span>
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10.5px; white-space: nowrap;">
              ${formatDate(o.date)}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10.5px;">
              <strong style="color: #0F172A;">${o.customer_name}</strong>
              <div style="color: #64748B; font-size: 9.5px; font-family: monospace;">
                NIC: ${o.customer_nic || 'N/A'} • ${o.customer_phone || ''}
              </div>
              <div style="color: #D97706; font-size: 9px; font-weight: 700;">
                Center: ${o.branch_code}/${o.center_code}
              </div>
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10.5px;">
              <strong style="color: #0F172A;">🛋️ ${o.item_name}</strong>
              <div style="color: #64748B; font-size: 9.5px;">
                Code: ${o.item_code} • Qty: <strong>${o.quantity || 1}</strong>
              </div>
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 10px; max-width: 180px;">
              ${o.customer_address ? `📍 ${o.customer_address}` : 'Showroom Pickup'}
              ${o.notes ? `<div style="color: #D97706; font-style: italic; font-size: 9px; margin-top: 2px;">"${o.notes}"</div>` : ''}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 800; font-size: 11px; color: #0F172A; white-space: nowrap;">
              Rs. ${(Number(o.gross_amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>D N S Home Solutions - Orders & Invoices Manifest</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0F172A; margin: 0; padding: 20px; font-size: 11px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border-bottom: 2.5px solid #1E4D8C; padding-bottom: 12px; }
            .brand-title { font-size: 22px; font-weight: 900; color: #1E4D8C; margin: 0; letter-spacing: -0.5px; }
            .brand-sub { font-size: 10.5px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-top: 2px; }
            .report-title { font-size: 15px; font-weight: 800; color: #0F172A; margin-top: 6px; }
            .meta-text { font-size: 10.5px; color: #64748B; text-align: right; line-height: 1.5; }
            .summary-cards { display: flex; gap: 12px; margin-bottom: 16px; }
            .summary-card { border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 14px; background: #F8FAFC; flex: 1; }
            .summary-label { font-size: 9.5px; color: #64748B; text-transform: uppercase; font-weight: 800; letter-spacing: 0.04em; }
            .summary-val { font-size: 17px; font-weight: 900; color: #0F172A; margin-top: 3px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10.5px; }
            table.data-table th { background: #F1F5F9; color: #1E293B; padding: 9px 10px; text-align: left; font-weight: 800; border-bottom: 2px solid #CBD5E1; font-size: 10px; text-transform: uppercase; }
            .signatures { display: flex; justify-content: space-between; margin-top: 35px; padding-top: 14px; border-top: 1px dashed #CBD5E1; }
            .sig-box { width: 28%; text-align: center; }
            .sig-line { border-bottom: 1px solid #475569; height: 35px; margin-bottom: 6px; }
            .sig-label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; }
            .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #E2E8F0; font-size: 9.5px; color: #94A3B8; display: flex; justify-content: space-between; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <img src="${window.location.origin}/ds-logo.png" alt="D N S Home Solutions" style="height:52px;width:52px;object-fit:contain;vertical-align:middle;margin-right:12px;float:left;border-radius:6px;border:1px solid #CBD5E1;padding:2px;background:#fff;" />
                <div class="brand-title">D N S HOME SOLUTIONS</div>
                <div class="brand-sub">Furniture Workshop & Showroom Ledger</div>
                <div class="report-title">Orders & Invoices Manifest Report</div>
              </td>
              <td class="meta-text">
                <div><strong>Generated Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
                <div><strong>Center Scope:</strong> ${headerCenter && headerCenter !== 'all' ? headerCenter : 'All Island Centers'}</div>
                <div><strong>Records:</strong> ${filteredOrders.length} Order(s)</div>
              </td>
            </tr>
          </table>

          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-label">Total Filtered Orders</div>
              <div class="summary-val">${filteredOrders.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Furniture Units</div>
              <div class="summary-val" style="color: #2563EB;">${totalUnits} Units</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Order Value</div>
              <div class="summary-val" style="color: #1E4D8C;">Rs. ${totalTurnover.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Invoice & Contract</th>
                <th>Order Date</th>
                <th>Customer & Center</th>
                <th>Furniture Item & Specs</th>
                <th>Delivery Address & Notes</th>
                <th style="text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #E2E8F0; font-weight: 900;">
                <td colspan="6" style="padding: 10px; text-align: right; font-size: 11px;">GRAND TOTAL (${totalUnits} Total Furniture Units):</td>
                <td style="padding: 10px; text-align: right; font-size: 12px; color: #1E4D8C;">
                  Rs. ${totalTurnover.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Prepared By (Sales / Cashier)</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Verified By (Workshop Supervisor)</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Approved By (Managing Director)</div>
            </div>
          </div>

          <div class="footer">
            <span>D N S Home Solutions System • Official Order Manifest Document</span>
            <span>Printed via Furniture Management System Web Application</span>
          </div>

        </body>
      </html>
    `;

    printHtmlDocument(htmlContent, { title: 'DNS_Orders_Manifest' });
  };

  // Print Single Order Official Invoice / Agreement as PDF
  const handlePrintSingleInvoicePDF = (order) => {
    if (!order) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>D N S Home Solutions - Invoice ${order.invoice_no}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0F172A; margin: 0; padding: 20px; font-size: 11.5px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2.5px solid #1E4D8C; padding-bottom: 14px; }
            .brand-title { font-size: 24px; font-weight: 900; color: #1E4D8C; margin: 0; letter-spacing: -0.5px; }
            .brand-sub { font-size: 10.5px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-top: 2px; }
            .doc-type { font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 6px; text-transform: uppercase; }
            .meta-text { font-size: 11px; color: #475569; text-align: right; line-height: 1.6; }
            .info-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; }
            .info-col { flex: 1; }
            .info-title { font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 6px; }
            .info-val { font-size: 12px; font-weight: 700; color: #0F172A; }
            .info-sub { font-size: 10.5px; color: #475569; margin-top: 2px; }
            table.invoice-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11.5px; }
            table.invoice-table th { background: #F1F5F9; color: #1E293B; padding: 10px; text-align: left; font-weight: 800; border-bottom: 2px solid #CBD5E1; font-size: 10.5px; text-transform: uppercase; }
            table.invoice-table td { padding: 10px; border-bottom: 1px solid #E2E8F0; }
            .totals-table { width: 280px; margin-left: auto; margin-top: 16px; border-collapse: collapse; font-size: 11.5px; }
            .totals-table td { padding: 6px 8px; }
            .terms-box { margin-top: 30px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 10px 14px; font-size: 9.5px; color: #92400E; line-height: 1.45; }
            .signatures { display: flex; justify-content: space-between; margin-top: 45px; padding-top: 14px; }
            .sig-box { width: 38%; text-align: center; }
            .sig-line { border-bottom: 1px solid #475569; height: 40px; margin-bottom: 6px; }
            .sig-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <img src="${window.location.origin}/ds-logo.png" alt="D N S Home Solutions" style="height:56px;width:56px;object-fit:contain;vertical-align:middle;margin-right:12px;float:left;border-radius:6px;border:1px solid #CBD5E1;padding:2px;background:#fff;" />
                <div class="brand-title">D N S HOME SOLUTIONS</div>
                <div class="brand-sub">Handcrafted Solid Teak & Luxury Woodcraft</div>
                <div class="doc-type">Sales Invoice & Customer Agreement Bill</div>
              </td>
              <td class="meta-text">
                <div><strong>Invoice No:</strong> <span style="font-family: monospace; font-size: 13px; font-weight: 900; color: #1E4D8C;">${order.invoice_no}</span></div>
                <div><strong>Contract No:</strong> <span style="font-family: monospace; font-weight: 800; color: #2563EB;">${order.contract_no}</span></div>
                <div><strong>Date:</strong> ${formatDate(order.date)}</div>
                <div><strong>Center Hub:</strong> ${order.branch_code}/${order.center_code}</div>
              </td>
            </tr>
          </table>

          <div class="info-grid">
            <div class="info-col">
              <div class="info-title">Billed To (Customer Details)</div>
              <div class="info-val">${order.customer_name}</div>
              <div class="info-sub"><strong>NIC:</strong> ${order.customer_nic || 'N/A'}</div>
              <div class="info-sub"><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</div>
              <div class="info-sub"><strong>Delivery Address:</strong> ${order.customer_address || 'Showroom Direct Collection'}</div>
            </div>
            <div class="info-col" style="text-align: right;">
              <div class="info-title">Payment Mode & Terms</div>
              <div class="info-val" style="color: #1E4D8C;">${order.payment_type === 'installment' ? 'Installment Plan' : 'Cash / Full Payment'}</div>
              <div class="info-sub"><strong>Center:</strong> ${order.branch_code}/${order.center_code}</div>
              ${order.notes ? `<div class="info-sub" style="color: #D97706; font-style: italic; margin-top: 4px;">"${order.notes}"</div>` : ''}
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Furniture Description & Specifications</th>
                <th>Model Code</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">1</td>
                <td>
                  <strong>${order.item_name}</strong>
                  <div style="font-size: 9.5px; color: #64748B;">Category: Furniture Woodcraft • Center: ${order.branch_code}/${order.center_code}</div>
                </td>
                <td style="font-family: monospace; font-weight: 700;">${order.item_code}</td>
                <td style="text-align: center; font-weight: 800;">${order.quantity || 1}</td>
                <td style="text-align: right;">Rs. ${(Number(order.unit_price) || Number(order.gross_amount)).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right; font-weight: 800;">Rs. ${((Number(order.unit_price) || Number(order.gross_amount)) * (Number(order.quantity) || 1)).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${Number(order.document_charge) > 0 ? `
                <tr style="background: #F8FAFC;">
                  <td style="text-align: center;">2</td>
                  <td colspan="4" style="color: #475569; font-weight: 600;">
                    Document Charge / Legal Stamp & Customer Registration Fee
                  </td>
                  <td style="text-align: right; font-weight: 800;">
                    Rs. ${Number(order.document_charge).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td style="color: #64748B;">Gross Total:</td>
              <td style="text-align: right; font-weight: 800;">Rs. ${(Number(order.gross_amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="color: #16A34A; font-weight: 700;">Advance Paid:</td>
              <td style="text-align: right; font-weight: 800; color: #16A34A;">Rs. ${(Number(order.advance_paid) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr style="border-top: 1.5px solid #CBD5E1; font-size: 13px;">
              <td style="font-weight: 900; color: #0F172A;">Balance Due:</td>
              <td style="text-align: right; font-weight: 900; color: ${Number(order.balance_due) > 0 ? '#DC2626' : '#16A34A'};">
                Rs. ${(Number(order.balance_due) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            ${order.payment_type === 'installment' ? `
              <tr style="background: #F1F5F9;">
                <td style="font-size: 10px; color: #1E4D8C; font-weight: 700;">Repayment Terms:</td>
                <td style="text-align: right; font-size: 10px; font-weight: 800; color: #1E4D8C;">
                  Rs. ${(Number(order.installment_value) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })} / ${order.loan_frequency || 'month'}
                </td>
              </tr>
            ` : ''}
          </table>

          <div class="terms-box">
            <strong>Terms & Conditions:</strong><br />
            1. All handcrafted solid timber furniture is covered under D N S standard workshop warranty against natural wood defects.<br />
            2. Customer agrees that goods delivered remain property of D N S Home Solutions until all installments and balances are settled in full.<br />
            3. Goods once received and signed for in good condition cannot be returned without prior workshop inspection.
          </div>

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Customer Acceptance Signature</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">D N S Authorized Officer</div>
            </div>
          </div>

        </body>
      </html>
    `;

    printHtmlDocument(htmlContent, { title: `DNS_Invoice_${order.invoice_no || order.id}` });
  };

  // Filtered orders list (Order Specifications focused)
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInvoice = order.invoice_no?.toLowerCase().includes(q);
        const matchContract = order.contract_no?.toLowerCase().includes(q);
        const matchCust = order.customer_name?.toLowerCase().includes(q);
        const matchNic = (order.customer_nic || order.customer_id)?.toLowerCase().includes(q);
        const matchItem = (order.item_name || order.items_summary)?.toLowerCase().includes(q);
        const matchCode = order.item_code?.toLowerCase().includes(q);
        const matchPhone = order.customer_phone?.includes(q);
        if (!matchInvoice && !matchContract && !matchCust && !matchNic && !matchItem && !matchCode && !matchPhone) {
          return false;
        }
      }

      // Header Center filter
      if (headerCenter && headerCenter !== 'all') {
        const parts = headerCenter.split('/');
        if (parts.length === 2 && formatCenterCode(order.center_code) !== formatCenterCode(parts[1])) {
          return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, headerCenter]);

  // Cumulative totals for the order table view
  const filteredTotalValue = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + (Number(o.gross_amount) || 0), 0);
  }, [filteredOrders]);

  const filteredTotalUnits = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + (Number(o.quantity) || 1), 0);
  }, [filteredOrders]);

  return (
    <div className="orders-page-container" style={{ padding: '20px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* =========================================================
          1. HEADER: CLEAN, PROMINENT "+ Add New Order" BUTTON
          ========================================================= */}
      <div
        className="orders-header-card"
        style={{
          background: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle, var(--ash-200))',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--ash-900)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={24} color="var(--primary)" /> Orders & Invoices
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', fontSize: '0.82rem', color: 'var(--ash-500)', flexWrap: 'wrap' }}>
            <span>Total Orders: <strong style={{ color: 'var(--ash-900)' }}>{orders.length}</strong></span>
            <span>•</span>
            <span>Total Turnover: <strong style={{ color: 'var(--primary)' }}>{formatLKR(filteredTotalValue)}</strong></span>
            <span>•</span>
            <span>Total Items: <strong style={{ color: 'var(--ash-900)' }}>{filteredTotalUnits} Units</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Download orders list as CSV (Excel)"
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportPDF}
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            title="Download or Print filtered orders manifest as PDF"
          >
            <Printer size={14} /> Download PDF
          </button>

          {/* MAIN PROMINENT "+ Add New Order" BUTTON IN HEADER */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddOrderModal}
            style={{
              padding: '10px 22px',
              fontSize: '0.92rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.28)',
            }}
          >
            <Plus size={18} strokeWidth={2.5} /> Add New Order
          </button>
        </div>
      </div>

      {/* =========================================================
          2. SEARCH & FILTER BAR
          ========================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
            placeholder="Search by client name, NIC, contract (PN/Center/Item), invoice, or item code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '9px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ash-400)',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View Layout Switcher */}
        <div style={{ display: 'flex', background: 'var(--ash-100)', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            style={{
              border: 'none',
              background: viewMode === 'cards' ? 'var(--bg-card, #fff)' : 'transparent',
              color: viewMode === 'cards' ? 'var(--primary)' : 'var(--ash-600)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <LayoutGrid size={14} /> Cards View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              border: 'none',
              background: viewMode === 'table' ? 'var(--bg-card, #fff)' : 'transparent',
              color: viewMode === 'table' ? 'var(--primary)' : 'var(--ash-600)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <List size={14} /> Table View
          </button>
        </div>
      </div>

      {/* =========================================================
          3. BELOW: ORDER DETAILS / PLACED ORDERS LIST
          "pahalin oredr details pennanna"
          ========================================================= */}
      {filteredOrders.length === 0 ? (
        <div
          className="empty-state-box"
          style={{
            padding: '60px',
            textAlign: 'center',
            background: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            border: '1px dashed var(--border-subtle, var(--ash-300))',
            color: 'var(--ash-500)',
          }}
        >
          <ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>No orders found matching your search</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--ash-400)', marginTop: '4px' }}>
            Click "+ Add New Order" above to place an order for a client.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* CLIENT-FRIENDLY MODERN CARDS GRID (ORDER DETAILS ONLY) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filteredOrders.map((order) => {
            return (
              <div
                key={order.id}
                className="orders-card-item"
                style={{
                  background: 'var(--bg-card, #fff)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle, var(--ash-200))',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  {/* Top Bar: Invoice Number Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        color: '#2563EB',
                        background: '#EFF6FF',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        border: '1px solid #BFDBFE',
                      }}
                    >
                      📄 {order.invoice_no}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ash-500)', fontFamily: 'monospace' }}>
                      Ref: {order.contract_no}
                    </span>
                  </div>

                  {/* Client Info */}
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ash-900)' }}>
                    {order.customer_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '0.78rem', color: 'var(--ash-600)' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      🆔 {order.customer_nic || order.customer_id}
                    </span>
                    <span>•</span>
                    <span>📞 {order.customer_phone}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                    📍 Center: {order.center_code || 'C001'} • Ordered: {formatDate(order.date)}
                  </div>

                  {/* Furniture Item Box */}
                  <div
                    className="card-sub-box"
                    style={{
                      background: 'var(--ash-50)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginTop: '10px',
                      border: '1px solid var(--border-subtle, var(--ash-200))',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--ash-900)' }}>
                      🛋️ {order.item_name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--ash-600)', marginTop: '3px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Code: {order.item_code}</span>
                      <span>Qty: <strong>{order.quantity || 1} Unit(s)</strong></span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                      Unit Price: {formatLKR(order.unit_price)}
                    </div>
                  </div>

                  {/* Delivery Location & Notes */}
                  <div className="card-sub-box" style={{ marginTop: '10px', background: 'var(--ash-100, #F8FAFC)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.76rem', color: 'var(--ash-700)', border: '1px solid var(--border-subtle, #E2E8F0)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                      <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 600 }}>{order.customer_address || 'Showroom Pickup / Maharagama'}</span>
                    </div>
                    {order.notes && (
                      <div style={{ marginTop: '4px', color: 'var(--ash-500)', fontStyle: 'italic', fontSize: '0.72rem' }}>
                        Note: "{order.notes}"
                      </div>
                    )}
                  </div>

                  {/* Order Total */}
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-subtle, var(--ash-200))', paddingTop: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--ash-600)', fontWeight: 700 }}>Total Order Value:</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--ash-900)', fontWeight: 900 }}>
                      {formatLKR(order.gross_amount)}
                    </strong>
                  </div>
                </div>

                {/* Bottom Actions for each card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle, var(--ash-100))', paddingTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      setActiveSelectedOrder(order);
                      setIsViewDetailsModalOpen(true);
                    }}
                  >
                    <Eye size={13} /> View Details
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#15803D',
                        borderColor: '#86EFAC',
                        background: '#F0FDF4',
                        fontWeight: 700,
                      }}
                      title="Send Invoice to Customer via WhatsApp"
                      onClick={() => handleSendWhatsAppInvoice(order)}
                    >
                      <WhatsAppIcon size={13} color="#15803D" /> WhatsApp
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        setActiveSelectedOrder(order);
                        setIsPrintModalOpen(true);
                      }}
                    >
                      <Printer size={13} /> Print Invoice
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* PROFESSIONAL ENTERPRISE TABLE VIEW (ORDER DETAILS ONLY) */
        <div
          className="orders-table-card"
          style={{
            background: 'var(--bg-card, #fff)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle, var(--ash-200))',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <div className="table-responsive" style={{ margin: 0, width: '100%', overflowX: 'auto' }}>
            <table className="custom-table" style={{ margin: 0, width: '100%', minWidth: '1060px', borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr style={{ background: 'var(--ash-100, #F8FAFC)', borderBottom: '1px solid var(--border-subtle, var(--ash-200))' }}>
                  <th style={{ width: '16%', minWidth: '150px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Order & Invoice
                  </th>
                  <th style={{ width: '18%', minWidth: '175px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Customer Details
                  </th>
                  <th style={{ width: '22%', minWidth: '200px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Furniture Item & Specs
                  </th>
                  <th style={{ width: '18%', minWidth: '175px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Delivery Address & Notes
                  </th>
                  <th style={{ width: '14%', minWidth: '130px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Total Amount
                  </th>
                  <th style={{ width: '12%', minWidth: '110px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--ash-700, #475569)', letterSpacing: '0.3px', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => {
                  return (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, var(--ash-100))',
                        background: idx % 2 === 0 ? 'var(--bg-card, #fff)' : 'var(--ash-50)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover, #F1F5F9)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? 'var(--bg-card, #fff)' : 'var(--ash-50)')}
                    >
                      {/* 1. Order Invoice & Date */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: '#2563EB',
                            fontSize: '0.8rem',
                            background: '#EFF6FF',
                            padding: '3px 7px',
                            borderRadius: '4px',
                            border: '1px solid #BFDBFE',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          📄 {order.invoice_no}
                        </span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          📅 {formatDate(order.date)} • Ref: {order.contract_no}
                        </div>
                      </td>

                      {/* 2. Customer Details */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--ash-900)', whiteSpace: 'nowrap', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.customer_name}>
                          {order.customer_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                            🆔 {order.customer_nic || order.customer_id}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '1px', whiteSpace: 'nowrap' }}>
                          📞 {order.customer_phone} • {order.center_code || 'C001'}
                        </div>
                      </td>

                      {/* 3. Furniture Item & Specifications */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            color: 'var(--ash-900)',
                            maxWidth: '210px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={order.item_name}
                        >
                          🛋️ {order.item_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '0.72rem' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: '#F1F5F9',
                              color: 'var(--ash-700)',
                              border: '1px solid var(--ash-200)',
                            }}
                          >
                            {order.item_code}
                          </span>
                          <span style={{ color: 'var(--ash-600)', textTransform: 'capitalize' }}>
                            {order.category?.replace('_', ' ') || 'Furniture'}
                          </span>
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                            • Qty: {order.quantity || 1}
                          </span>
                        </div>
                      </td>

                      {/* 4. Delivery Address & Notes */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '0.76rem', color: 'var(--ash-800)', maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.customer_address}>
                          <MapPin size={12} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }} />
                          <span>{order.customer_address || 'Showroom Pickup'}</span>
                        </div>
                        {order.notes && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '2px', fontStyle: 'italic', maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.notes}>
                            💬 {order.notes}
                          </div>
                        )}
                      </td>

                      {/* 5. Total Amount */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--ash-900)', whiteSpace: 'nowrap' }}>
                          {formatLKR(order.gross_amount)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '1px', whiteSpace: 'nowrap' }}>
                          @ {formatLKR(order.unit_price)} each
                        </div>
                      </td>

                      {/* 6. Actions (Order details & Invoice print only, no Pay button) */}
                      <td style={{ padding: '10px 10px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 7px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                            title="View Full Order Specifications"
                            onClick={() => {
                              setActiveSelectedOrder(order);
                              setIsViewDetailsModalOpen(true);
                            }}
                          >
                            <Eye size={12} /> View
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}
                            title="Print Sales & Delivery Invoice"
                            onClick={() => {
                              setActiveSelectedOrder(order);
                              setIsPrintModalOpen(true);
                            }}
                          >
                            <Printer size={12} /> Invoice
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 6px',
                              fontSize: '0.72rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              whiteSpace: 'nowrap',
                              color: '#15803D',
                              borderColor: '#86EFAC',
                              background: '#F0FDF4',
                              fontWeight: 700,
                            }}
                            title={`Send Invoice via WhatsApp to ${order.customer_name} (${order.customer_phone})`}
                            onClick={() => handleSendWhatsAppInvoice(order)}
                          >
                            <WhatsAppIcon size={12} color="#15803D" /> WhatsApp
                          </button>

                          <button
                            type="button"
                            style={{
                              border: '1px solid var(--border-subtle, var(--ash-200))',
                              background: 'var(--bg-card, #fff)',
                              color: 'var(--ash-400)',
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: '5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap',
                            }}
                            title="Cancel Order"
                            onClick={() => handleDeleteOrder(order.id, order.contract_no)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#DC2626';
                              e.currentTarget.style.borderColor = '#FCA5A5';
                              e.currentTarget.style.background = '#FEF2F2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--ash-400)';
                              e.currentTarget.style.borderColor = 'var(--border-subtle, var(--ash-200))';
                              e.currentTarget.style.background = 'var(--bg-card, #fff)';
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer */}
          <div
            className="summary-footer-bar"
            style={{
              padding: '12px 18px',
              background: 'var(--ash-100, #F8FAFC)',
              borderTop: '1px solid var(--border-subtle, var(--ash-200))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.8rem',
              color: 'var(--ash-600)',
            }}
          >
            <div>
              Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> customer orders
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div>
                Total Ordered Units: <strong style={{ color: 'var(--primary)', fontSize: '0.88rem' }}>{filteredTotalUnits} pcs</strong>
              </div>
              <div>
                Total Invoiced Value: <strong style={{ color: 'var(--ash-900)', fontSize: '0.88rem' }}>{formatLKR(filteredTotalValue)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          4. MODAL: ADD NEW ORDER (CLEAN, CLIENT-FRIENDLY & PROFESSIONAL)
          ========================================================= */}
      <Modal
        isOpen={isAddOrderModalOpen}
        onClose={() => setIsAddOrderModalOpen(false)}
        title="Create New Furniture Order & Contract"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* STEP 1: SELECT ACTIVE CLIENT */}
          <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)', position: 'relative' }}>
            {/* Click-outside backdrop when client suggestions are open */}
            {isClientDropdownOpen && (
              <div
                onClick={() => setIsClientDropdownOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 55,
                  background: 'transparent',
                }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 800, margin: 0, fontSize: '0.86rem' }}>
                1. Select Active Customer *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {formSelectedCustomer && (
                  <button
                    type="button"
                    onClick={() => handleSelectCustomer(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RotateCcw size={12} /> Clear / Change Client
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowQuickRegister(!showQuickRegister)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <UserPlus size={13} /> {showQuickRegister ? 'Cancel' : '+ Quick Register Client'}
                </button>
              </div>
            </div>

            {/* Quick Register inline drawer */}
            {showQuickRegister && (
              <div
                style={{
                  background: 'var(--bg-card, #fff)',
                  border: '1px solid var(--primary-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
                  Register New Customer:
                </div>
                <div className="form-grid" style={{ gap: '8px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>First Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Sunil"
                      value={quickClient.first_name}
                      onChange={(e) => setQuickClient({ ...quickClient, first_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Last Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Perera"
                      value={quickClient.last_name}
                      onChange={(e) => setQuickClient({ ...quickClient, last_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>NIC *</label>
                    <input
                      type="text"
                      className="form-input"
                      maxLength={12}
                      placeholder="198512345678 or 851234567V"
                      value={quickClient.nic}
                      onChange={(e) => setQuickClient({ ...quickClient, nic: sanitizeNicInput(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.72rem' }}>Phone *</label>
                    <input
                      type="tel"
                      className="form-input"
                      maxLength={10}
                      placeholder="07XXXXXXXX (10 digits)"
                      value={quickClient.phone}
                      onChange={(e) => setQuickClient({ ...quickClient, phone: sanitizePhoneInput(e.target.value) })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: '8px', padding: '4px 12px', fontSize: '0.76rem', fontWeight: 700 }}
                  onClick={handleQuickRegisterClient}
                >
                  Save & Select Client
                </button>
              </div>
            )}

            {/* Client Search Input with Live Suggestions */}
            <div style={{ position: 'relative', zIndex: 58 }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ash-400)', pointerEvents: 'none' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search active client by Name, NIC, or Phone number..."
                value={clientSearchText}
                onFocus={() => {
                  setIsClientDropdownOpen(true);
                  setIsCodeDropdownOpen(false);
                  setIsNameDropdownOpen(false);
                }}
                onChange={(e) => handleClientSearchChange(e.target.value)}
                style={{
                  paddingLeft: '36px',
                  paddingRight: clientSearchText ? '30px' : '12px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              />
              {clientSearchText && (
                <button
                  type="button"
                  onClick={() => handleSelectCustomer(null)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '9px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--ash-400)',
                  }}
                  title="Clear Customer"
                >
                  <X size={14} />
                </button>
              )}

              {/* Live Customer Suggestions Popover */}
              {isClientDropdownOpen && (
                <div
                  className="dropdown-popover"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-card, #fff)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle, var(--primary-border))',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
                    maxHeight: '230px',
                    overflowY: 'auto',
                    zIndex: 65,
                  }}
                >
                  {customerSuggestions.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--ash-500)' }}>
                      No client found matching "{clientSearchText}".
                      <div style={{ marginTop: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                          onClick={() => {
                            setIsClientDropdownOpen(false);
                            setShowQuickRegister(true);
                            setQuickClient((prev) => ({ ...prev, first_name: clientSearchText }));
                          }}
                        >
                          + Quick Register This Client
                        </button>
                      </div>
                    </div>
                  ) : (
                    customerSuggestions.map((cust) => {
                      const isChosen = formCustomerId === cust.id;
                      return (
                        <div
                          key={cust.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectCustomer(cust);
                          }}
                          onClick={() => handleSelectCustomer(cust)}
                          style={{
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border-subtle, var(--ash-100))',
                            cursor: 'pointer',
                            background: isChosen ? 'var(--primary-tint)' : 'var(--bg-card, #fff)',
                            transition: 'background 0.1s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-tint)')}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = isChosen ? 'var(--primary-tint)' : 'var(--bg-card, #fff)')
                          }
                        >
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--ash-900)' }}>
                              {cust.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '0.74rem', color: 'var(--ash-600)' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                                🆔 {cust.nic || cust.customer_id}
                              </span>
                              <span>•</span>
                              <span>📞 {cust.phone}</span>
                              {cust.city && <span>• 📍 {cust.city}</span>}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'var(--ash-600)',
                              background: 'var(--ash-100, #F1F5F9)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {cust.center_code || 'C001'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {formSelectedCustomer && (
              <div
                style={{
                  marginTop: '10px',
                  background: 'var(--bg-card, #fff)',
                  border: '1px solid var(--border-subtle, var(--ash-200))',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                }}
              >
                <div>
                  Client: <strong style={{ color: 'var(--ash-900)' }}>{formSelectedCustomer.name}</strong> •{' '}
                  NIC: <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{formSelectedCustomer.nic || formSelectedCustomer.customer_id}</strong>
                </div>
                <div style={{ color: 'var(--ash-600)' }}>
                  📍 Center: <strong>{formCenterCode}</strong>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: SEARCH & SELECT FURNITURE ITEM (BY CODE OR NAME WITH LIVE SUGGESTIONS) */}
          <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--ash-200)', position: 'relative' }}>
            {/* Click-outside backdrop when suggestions are open */}
            {(isCodeDropdownOpen || isNameDropdownOpen) && (
              <div
                onClick={() => {
                  setIsCodeDropdownOpen(false);
                  setIsNameDropdownOpen(false);
                }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 55,
                  background: 'transparent',
                }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 800, margin: 0, fontSize: '0.86rem' }}>
                2. Furniture Item Search (By Code or Name) *
              </label>
              {formSelectedProduct && (
                <button
                  type="button"
                  onClick={() => handleSelectProduct(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={12} /> Clear / Change Item
                </button>
              )}
            </div>

            <div className="form-grid" style={{ gap: '12px' }}>
              {/* Dual Search 1: Search by Product Code with suggestions */}
              <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                  Search by Product Code (WD / MEL / ELC)
                </label>
                <div style={{ position: 'relative', zIndex: 58 }}>
                  <Search
                    size={15}
                    style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ash-400)', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type code e.g. WD-001, MEL-001..."
                    value={codeSearchText}
                    onFocus={() => {
                      setIsCodeDropdownOpen(true);
                      setIsNameDropdownOpen(false);
                    }}
                    onChange={(e) => handleCodeSearchChange(e.target.value)}
                    style={{
                      paddingLeft: '32px',
                      paddingRight: codeSearchText ? '28px' : '10px',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      fontSize: '0.86rem',
                    }}
                  />
                  {codeSearchText && (
                    <button
                      type="button"
                      onClick={() => handleCodeSearchChange('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '8px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--ash-400)',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Live Code Suggestions Popover */}
                {isCodeDropdownOpen && (
                  <div
                    className="dropdown-popover"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--bg-card, #fff)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, var(--primary-border))',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      zIndex: 65,
                    }}
                  >
                    {codeSuggestions.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--ash-500)' }}>
                        No furniture items match code "{codeSearchText}"
                      </div>
                    ) : (
                      codeSuggestions.map((item, idx) => {
                        const isChosen =
                          (formSelectedProduct?.item_code && formSelectedProduct.item_code === item.item_code) ||
                          (formSelectedProduct?.id && formSelectedProduct.id === item.id);
                        return (
                          <div
                            key={item.id || item.item_code || idx}
                            className="dropdown-popover-item"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectProduct(item);
                            }}
                            onClick={() => handleSelectProduct(item)}
                            style={{
                              padding: '9px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid var(--border-subtle, var(--ash-100))',
                              cursor: 'pointer',
                              background: isChosen ? 'var(--primary-tint)' : 'var(--bg-card, #fff)',
                              transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-tint)')}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = isChosen ? 'var(--primary-tint)' : 'var(--bg-card, #fff)')
                            }
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  color: 'var(--primary)',
                                  background: '#EFF6FF',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #BFDBFE',
                                }}
                              >
                                {item.item_code}
                              </span>
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ash-900)' }}>
                                  {item.name}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'capitalize' }}>
                                  {item.category?.replace('_', ' ')}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16A34A', whiteSpace: 'nowrap' }}>
                              {formatLKR(item.selling_price)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Dual Search 2: Search by Product Name with suggestions */}
              <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                  Search by Product Name
                </label>
                <div style={{ position: 'relative', zIndex: 58 }}>
                  <Search
                    size={15}
                    style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ash-400)', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type name e.g. Dining Table, Cupboard, Chair..."
                    value={nameSearchText}
                    onFocus={() => {
                      setIsNameDropdownOpen(true);
                      setIsCodeDropdownOpen(false);
                    }}
                    onChange={(e) => handleNameSearchChange(e.target.value)}
                    style={{
                      paddingLeft: '32px',
                      paddingRight: nameSearchText ? '28px' : '10px',
                      fontWeight: 600,
                      fontSize: '0.86rem',
                    }}
                  />
                  {nameSearchText && (
                    <button
                      type="button"
                      onClick={() => handleNameSearchChange('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '8px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--ash-400)',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Live Name Suggestions Popover */}
                {isNameDropdownOpen && (
                  <div
                    className="dropdown-popover"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'var(--bg-card, #fff)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, var(--primary-border))',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      zIndex: 65,
                    }}
                  >
                    {nameSuggestions.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--ash-500)' }}>
                        No furniture items match name "{nameSearchText}"
                      </div>
                    ) : (
                      nameSuggestions.map((item, idx) => {
                        const isChosen =
                          (formSelectedProduct?.item_code && formSelectedProduct.item_code === item.item_code) ||
                          (formSelectedProduct?.id && formSelectedProduct.id === item.id);
                        return (
                          <div
                            key={item.id || item.item_code || idx}
                            className="dropdown-popover-item"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectProduct(item);
                            }}
                            onClick={() => handleSelectProduct(item)}
                            style={{
                              padding: '9px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid var(--border-subtle, var(--ash-100))',
                              cursor: 'pointer',
                              background: isChosen ? 'var(--primary-tint)' : 'var(--bg-card, #fff)',
                              transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-tint)')}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = isChosen ? 'var(--primary-tint)' : 'var(--bg-card, #fff)')
                            }
                          >
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ash-900)' }}>
                                {item.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 800,
                                    fontSize: '0.72rem',
                                    color: 'var(--primary)',
                                  }}
                                >
                                  {item.item_code}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'capitalize' }}>
                                  • {item.category?.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16A34A', whiteSpace: 'nowrap' }}>
                              {formatLKR(item.selling_price)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-generated Item Amount & Quantity & Confirmation Box */}
            {formSelectedProduct ? (
              <div
                style={{
                  marginTop: '12px',
                  background: 'var(--bg-card, #fff)',
                  border: '1px solid var(--border-subtle, var(--ash-200))',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                    Item Amount (Auto-generated LKR) *
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formUnitPrice === '' ? '' : formUnitPrice}
                    onFocus={(e) => {
                      if (formUnitPrice === 0 || formUnitPrice === '0') {
                        setFormUnitPrice('');
                      } else {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormUnitPrice(val);
                      if (val !== '' && !isNaN(Number(val))) {
                        const num = Number(val);
                        const q = Number(formQuantity) || 1;
                        setFormDownPayment(Math.round(num * q * 0.2));
                      }
                    }}
                    onBlur={() => {
                      if (formUnitPrice === '' || isNaN(Number(formUnitPrice))) {
                        setFormUnitPrice(0);
                      } else {
                        setFormUnitPrice(Number(formUnitPrice));
                      }
                    }}
                    placeholder="Enter item price"
                    min="0"
                    step="any"
                    style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--ash-500)' }}>
                    Quantity *
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    step="1"
                    value={formQuantity === '' ? '' : formQuantity}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormQuantity(val);
                      if (val !== '' && !isNaN(Number(val))) {
                        const q = Number(val);
                        const u = Number(formUnitPrice) || 0;
                        setFormDownPayment(Math.round(u * q * 0.2));
                      }
                    }}
                    onBlur={() => {
                      const num = parseInt(formQuantity, 10);
                      setFormQuantity(isNaN(num) || num < 1 ? 1 : num);
                    }}
                    style={{ fontWeight: 800, fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Order Value
                  </span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--ash-900)' }}>
                    {formatLKR(formGrossTotal)}
                  </div>
                  {Number(formDocumentCharge) > 0 ? (
                    <div style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: 700, marginTop: '1px' }}>
                      (Item: {formatLKR(formItemTotal)} + Doc: {formatLKR(formDocumentCharge)})
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.68rem', color: 'var(--ash-500)', marginTop: '1px' }}>
                      ({formQuantity} unit{formQuantity > 1 ? 's' : ''} × {formatLKR(formUnitPrice)})
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  background: 'var(--amber-tint, rgba(245, 158, 11, 0.12))',
                  borderRadius: '6px',
                  border: '1px dashed rgba(245, 158, 11, 0.4)',
                  color: 'var(--amber-700, #D97706)',
                  fontSize: '0.76rem',
                }}
              >
                💡 Type an Item Code or Product Name above to view instant suggestions and auto-generate the item price.
              </div>
            )}
          </div>

          {/* STEP 3: CONTRACT CODE (pn / center code / item code) */}
          <div
            style={{
              background: 'var(--blue-tint, rgba(59, 130, 246, 0.1))',
              border: '1px solid var(--blue-200, rgba(59, 130, 246, 0.3))',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                CONTRACT CODE (pn / center code / item code)
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem', color: 'var(--primary)', marginTop: '2px' }}>
                📜 {formContractCode}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Branch:</span>
              <input
                type="text"
                value={formPassbookNo}
                onChange={(e) => setFormPassbookNo(e.target.value.toUpperCase())}
                style={{
                  width: '85px',
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle, var(--ash-300))',
                  background: 'var(--bg-card, #fff)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          </div>

          {/* STEP 4: INSTALLMENT PLAN, TERMS & FREQUENCY */}
          <div style={{ background: 'var(--ash-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle, var(--ash-200))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <label className="form-label" style={{ fontWeight: 800, margin: 0, fontSize: '0.86rem' }}>
                3. Payment Terms & Installment Plan
              </label>
              <div style={{ display: 'flex', background: 'var(--ash-200)', padding: '2px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => setFormPaymentType('installment')}
                  style={{
                    border: 'none',
                    background: formPaymentType === 'installment' ? 'var(--primary)' : 'transparent',
                    color: formPaymentType === 'installment' ? '#fff' : 'var(--text-main)',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                  }}
                >
                  Installment Loan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormPaymentType('cash');
                    setFormDownPayment(formGrossTotal);
                  }}
                  style={{
                    border: 'none',
                    background: formPaymentType === 'cash' ? 'var(--primary)' : 'transparent',
                    color: formPaymentType === 'cash' ? '#fff' : 'var(--text-main)',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                  }}
                >
                  Full Cash
                </button>
              </div>
            </div>

            {formPaymentType === 'installment' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-grid" style={{ gap: '12px' }}>
                  {/* Document Charge Field */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        Document Charge (LKR) *
                      </label>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[0, 500, 1000, 1500, 2000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setFormDocumentCharge(amt)}
                            style={{
                              border: '1px solid var(--border-subtle, var(--ash-300))',
                              background: formDocumentCharge === amt ? 'var(--primary)' : 'var(--bg-card, #fff)',
                              color: formDocumentCharge === amt ? '#fff' : 'var(--text-main)',
                              fontSize: '0.66rem',
                              padding: '2px 5px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            {amt === 0 ? 'Free' : amt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      step="any"
                      value={formDocumentCharge === '' ? '' : formDocumentCharge}
                      onFocus={(e) => {
                        if (formDocumentCharge === 0 || formDocumentCharge === '0') {
                          setFormDocumentCharge('');
                        } else {
                          e.target.select();
                        }
                      }}
                      onChange={(e) => setFormDocumentCharge(e.target.value)}
                      onBlur={() => {
                        if (formDocumentCharge === '' || isNaN(Number(formDocumentCharge))) {
                          setFormDocumentCharge(0);
                        } else {
                          setFormDocumentCharge(Math.max(0, Number(formDocumentCharge)));
                        }
                      }}
                      placeholder="e.g. 1000"
                      style={{ fontWeight: 800, color: '#1E40AF', fontSize: '0.92rem' }}
                    />
                    <span style={{ fontSize: '0.66rem', color: 'var(--ash-500)', marginTop: '2px', display: 'block' }}>
                      Documentation, stamp & agreement processing fee
                    </span>
                  </div>

                  {/* Down Payment (Advance LKR) */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800, margin: 0, color: 'var(--ash-800)' }}>
                        Down Payment (Advance LKR)
                      </label>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[10, 20, 30].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleSetDownPaymentPercent(pct)}
                            style={{
                              border: '1px solid var(--border-subtle, var(--ash-300))',
                              background: 'var(--bg-card, #fff)',
                              color: 'var(--text-main)',
                              fontSize: '0.66rem',
                              padding: '2px 5px',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      step="any"
                      value={formDownPayment === '' ? '' : formDownPayment}
                      onFocus={(e) => {
                        if (formDownPayment === 0 || formDownPayment === '0') {
                          setFormDownPayment('');
                        } else {
                          e.target.select();
                        }
                      }}
                      onChange={(e) => setFormDownPayment(e.target.value)}
                      onBlur={() => {
                        if (formDownPayment === '' || isNaN(Number(formDownPayment))) {
                          setFormDownPayment(0);
                        } else {
                          setFormDownPayment(Math.max(0, Number(formDownPayment)));
                        }
                      }}
                      placeholder="0"
                      style={{ fontWeight: 800, fontSize: '0.92rem' }}
                    />
                    <span style={{ fontSize: '0.66rem', color: 'var(--ash-500)', marginTop: '2px', display: 'block' }}>
                      Initial cash down payment received from client
                    </span>
                  </div>

                  {/* Loan Frequency */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                      Loan Frequency *
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className={`btn ${formLoanFrequency === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '7px', fontSize: '0.78rem', fontWeight: 700 }}
                        onClick={() => handleFormFrequencyChange('monthly')}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        className={`btn ${formLoanFrequency === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '7px', fontSize: '0.78rem', fontWeight: 700 }}
                        onClick={() => handleFormFrequencyChange('weekly')}
                      >
                        Weekly
                      </button>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                      Terms ({formLoanFrequency === 'weekly' ? 'Weeks' : 'Months'}) *
                    </label>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        step="1"
                        value={formLoanTerms === '' ? '' : formLoanTerms}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setFormLoanTerms(e.target.value)}
                        onBlur={() => {
                          const parsed = parseInt(formLoanTerms, 10);
                          setFormLoanTerms(isNaN(parsed) || parsed < 1 ? 12 : parsed);
                        }}
                        style={{ fontWeight: 800, width: '75px', fontSize: '0.92rem' }}
                      />
                      {[6, 12, 16, 24].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormLoanTerms(t)}
                          style={{
                            border: '1px solid var(--border-subtle, var(--ash-300))',
                            background: formLoanTerms === t ? 'var(--primary)' : 'var(--bg-card, #fff)',
                            color: formLoanTerms === t ? '#fff' : 'var(--text-main)',
                            fontSize: '0.7rem',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* First Due Date */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                      First Due Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formFirstDueDate}
                      onChange={(e) => setFormFirstDueDate(e.target.value)}
                    />
                  </div>

                  {/* Upfront Cash Payable Today Box */}
                  <div
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
                      Upfront Cash To Collect Today:
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#15803D', marginTop: '1px' }}>
                      {formatLKR(Number(formDownPayment || 0) + Number(formDocumentCharge || 0))}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#166534', marginTop: '1px' }}>
                      (Advance: {formatLKR(formDownPayment || 0)} + Doc Fee: {formatLKR(formDocumentCharge || 0)})
                    </div>
                  </div>
                </div>

                {/* Auto Installment Banner with Full Mathematical Breakdown */}
                <div
                  style={{
                    background: '#FEF9C3',
                    border: '1px solid #FEF08A',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#854D0E', fontWeight: 800, textTransform: 'uppercase' }}>
                        Auto Installment Plan:
                      </span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#A16207' }}>
                        {formatLKR(formCalculatedInstallment)} / {formLoanFrequency === 'weekly' ? 'week' : 'month'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: '#854D0E', fontWeight: 800 }}>REMAINING BALANCE DUE</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#DC2626' }}>
                        {formatLKR(formLoanBalance)}
                      </div>
                    </div>
                  </div>

                  {/* Micro Breakdown of Financials */}
                  <div
                    style={{
                      borderTop: '1px dashed #EAB308',
                      paddingTop: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      fontSize: '0.74rem',
                      color: '#713F12',
                    }}
                  >
                    <span>Item: <strong>{formatLKR(formItemTotal)}</strong></span>
                    <span>+ Doc Fee: <strong>{formatLKR(formDocumentCharge || 0)}</strong></span>
                    <span>= Contract Value: <strong>{formatLKR(formGrossTotal)}</strong></span>
                    <span>- Advance Paid: <strong>{formatLKR(formDownPayment || 0)}</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px 16px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
                      Full Cash Settlement:
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803D' }}>
                      {formatLKR(formGrossTotal)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#166534' }}>
                    <div>Item Price: <strong>{formatLKR(formItemTotal)}</strong></div>
                    {Number(formDocumentCharge) > 0 && (
                      <div style={{ color: '#15803D' }}>Doc Charge: <strong>{formatLKR(formDocumentCharge)}</strong></div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Notification Option */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#166534',
              marginTop: '10px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={formAutoWhatsApp}
                onChange={(e) => setFormAutoWhatsApp(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#16A34A', cursor: 'pointer' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <WhatsAppIcon size={16} color="#25D366" />
                Send Invoice to Customer via WhatsApp
              </span>
            </label>
            {formSelectedCustomer && (
              <span style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: 700, fontFamily: 'monospace' }}>
                Recipient: 📱 {formSelectedCustomer.whatsapp || formSelectedCustomer.phone}
              </span>
            )}
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddOrderModalOpen(false)}
            >
              Cancel
            </button>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleConfirmPlaceOrder({ andWhatsApp: true })}
                disabled={!formSelectedCustomer || !formSelectedProduct}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  color: '#15803D',
                  borderColor: '#86EFAC',
                  background: '#F0FDF4',
                }}
                title="Create order and open WhatsApp to send invoice to customer"
              >
                <WhatsAppIcon size={15} color="#15803D" /> Place & WhatsApp
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleConfirmPlaceOrder({ andPrint: true })}
                disabled={!formSelectedCustomer || !formSelectedProduct}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Printer size={15} /> Place & Print Bill
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleConfirmPlaceOrder({ andWhatsApp: formAutoWhatsApp })}
                disabled={!formSelectedCustomer || !formSelectedProduct}
                style={{ fontWeight: 800, padding: '9px 18px' }}
              >
                <CheckCircle size={16} /> Confirm & Place Order
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* =========================================================
          4.5 POPUP MODAL: ORDER PLACED SUCCESSFULLY CONFIRMATION
          ========================================================= */}
      <Modal
        isOpen={isOrderSuccessModalOpen}
        onClose={() => setIsOrderSuccessModalOpen(false)}
        title="🎉 Order Placed Successfully!"
      >
        {placedSuccessOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Success Header Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                border: '1px solid #A7F3D0',
                borderRadius: '12px',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                }}
              >
                <CheckCircle size={26} strokeWidth={2.8} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#065F46' }}>
                  Order & Contract Created Successfully!
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#047857' }}>
                  The furniture order has been registered into the active contracts ledger.
                </p>
              </div>
            </div>

            {/* Prominent Contract Code Box */}
            <div
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  OFFICIAL CONTRACT CODE
                </span>
                <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 900, color: '#1D4ED8', marginTop: '2px' }}>
                  📜 {placedSuccessOrder.contract_no}
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#1E40AF' }}>
                <div>Invoice: <strong>{placedSuccessOrder.invoice_no}</strong></div>
                <div>Date: <strong>{formatDate(placedSuccessOrder.date)}</strong></div>
              </div>
            </div>

            {/* WhatsApp Invoice Direct Share Banner */}
            <div
              style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#25D366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.35)',
                  }}
                >
                  <WhatsAppIcon size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.88rem' }}>
                    Send Invoice & Agreement via WhatsApp
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#15803D' }}>
                    Recipient: <strong>{placedSuccessOrder.customer_name}</strong> (📞 {placedSuccessOrder.customer_whatsapp || placedSuccessOrder.customer_phone})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSendWhatsAppInvoice(placedSuccessOrder)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 211, 102, 0.35)',
                }}
              >
                <WhatsAppIcon size={15} color="#fff" /> WhatsApp Invoice Now
              </button>
            </div>

            {/* 2-Column Summary Cards: Client & Item */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {/* Customer Box */}
              <div style={{ background: '#F8FAFC', border: '1px solid var(--ash-200)', borderRadius: '10px', padding: '12px 14px', fontSize: '0.82rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 800 }}>
                  👤 Client Details
                </span>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--ash-900)', marginTop: '4px' }}>
                  {placedSuccessOrder.customer_name}
                </div>
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--ash-700)' }}>
                  <div>
                    NIC: <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{placedSuccessOrder.customer_nic || placedSuccessOrder.customer_id}</strong>
                  </div>
                  <div>Phone: <strong>{placedSuccessOrder.customer_phone}</strong></div>
                  <div>Center: <strong>{placedSuccessOrder.center_code || 'C001'}</strong></div>
                  {placedSuccessOrder.customer_address && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--ash-500)', marginTop: '2px' }}>
                      📍 {placedSuccessOrder.customer_address}
                    </div>
                  )}
                </div>
              </div>

              {/* Item Box */}
              <div style={{ background: '#F8FAFC', border: '1px solid var(--ash-200)', borderRadius: '10px', padding: '12px 14px', fontSize: '0.82rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 800 }}>
                  🛋️ Furniture Item
                </span>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--ash-900)', marginTop: '4px' }}>
                  {placedSuccessOrder.item_name}
                </div>
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--ash-700)' }}>
                  <div>
                    Item Code: <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{placedSuccessOrder.item_code}</strong>
                  </div>
                  <div>Quantity: <strong>{placedSuccessOrder.quantity} Unit(s)</strong></div>
                  <div>Unit Price: <strong>{formatLKR(placedSuccessOrder.unit_price)}</strong></div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--ash-500)', textTransform: 'capitalize' }}>
                    Category: {placedSuccessOrder.category?.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial & Repayment Breakdown Card */}
            <div
              style={{
                background: '#FEFCE8',
                border: '1px solid #FEF08A',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#854D0E', fontWeight: 800, textTransform: 'uppercase' }}>Total Order Value</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--ash-900)', marginTop: '2px' }}>
                    {formatLKR(placedSuccessOrder.gross_amount)}
                  </div>
                  {Number(placedSuccessOrder.document_charge) > 0 && (
                    <div style={{ fontSize: '0.68rem', color: '#854D0E', fontWeight: 700, marginTop: '2px' }}>
                      (Includes {formatLKR(placedSuccessOrder.document_charge)} Doc Fee)
                    </div>
                  )}
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#854D0E', fontWeight: 800, textTransform: 'uppercase' }}>Advance Paid</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16A34A', marginTop: '2px' }}>
                    {formatLKR(placedSuccessOrder.advance_paid)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#854D0E', fontWeight: 800, textTransform: 'uppercase' }}>Remaining Balance</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: Number(placedSuccessOrder.balance_due) > 0 ? '#DC2626' : '#16A34A', marginTop: '2px' }}>
                    {formatLKR(placedSuccessOrder.balance_due)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.68rem', color: '#854D0E', fontWeight: 800, textTransform: 'uppercase' }}>Payment Plan</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#A16207', marginTop: '2px' }}>
                    {placedSuccessOrder.payment_type === 'installment'
                      ? `${formatLKR(placedSuccessOrder.installment_value)} / ${placedSuccessOrder.loan_frequency}`
                      : 'Full Cash Sale'}
                  </div>
                  {placedSuccessOrder.payment_type === 'installment' && (
                    <span style={{ fontSize: '0.72rem', color: '#854D0E' }}>
                      ({placedSuccessOrder.loan_terms} terms)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppInvoice(placedSuccessOrder)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#25D366',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.35)',
                  }}
                >
                  <WhatsAppIcon size={16} color="#fff" /> WhatsApp Invoice
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsOrderSuccessModalOpen(false);
                    setIsPrintModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Printer size={15} /> Print Agreement / Bill
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsOrderSuccessModalOpen(false);
                    setIsViewDetailsModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Eye size={15} /> View Full Contract
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsOrderSuccessModalOpen(false)}
                  style={{ padding: '8px 22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle size={15} /> Done
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          5. MODAL: VIEW ORDER DETAILS (ORDER SPECIFICATIONS ONLY)
          ========================================================= */}
      <Modal
        isOpen={isViewDetailsModalOpen}
        onClose={() => setIsViewDetailsModalOpen(false)}
        title={activeSelectedOrder ? `Order Specifications - ${activeSelectedOrder.invoice_no}` : 'Order Details'}
      >
        {activeSelectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header info */}
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 700 }}>OFFICIAL INVOICE NUMBER</span>
                <div style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 900, color: '#1D4ED8' }}>
                  📄 {activeSelectedOrder.invoice_no}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#1E40AF', marginTop: '2px' }}>
                  Contract Ref: {activeSelectedOrder.contract_no} • Order Date: {formatDate(activeSelectedOrder.date)}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#1E40AF' }}>
                <div><strong>Center Hub:</strong> {activeSelectedOrder.center_code || 'C001'}</div>
                <div style={{ fontSize: '0.72rem', color: '#3B82F6', marginTop: '2px' }}>Status: Registered</div>
              </div>
            </div>

            {/* 2-Column Info: Customer & Item */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--ash-200)', fontSize: '0.82rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Client & Delivery Details</span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ash-900)', marginTop: '2px' }}>
                  {activeSelectedOrder.customer_name}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    🆔 NIC: {activeSelectedOrder.customer_nic || activeSelectedOrder.customer_id}
                  </span>
                  <span>📞 Phone: {activeSelectedOrder.customer_phone}</span>
                  <span>📍 Center: {activeSelectedOrder.center_code || 'C001'}</span>
                  <span>🏠 Address: <strong>{activeSelectedOrder.customer_address || 'Showroom Pickup'}</strong></span>
                </div>
              </div>

              <div style={{ background: 'var(--ash-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--ash-200)', fontSize: '0.82rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ash-500)', textTransform: 'uppercase', fontWeight: 700 }}>Furniture Item & Specs</span>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ash-900)', marginTop: '2px' }}>
                  {activeSelectedOrder.item_name}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Item Code: {activeSelectedOrder.item_code}</span>
                  <span style={{ textTransform: 'capitalize' }}>Category: {activeSelectedOrder.category?.replace('_', ' ') || 'Furniture'}</span>
                  <span>Quantity: <strong>{activeSelectedOrder.quantity || 1} Unit(s)</strong></span>
                  <span>Unit Price: {formatLKR(activeSelectedOrder.unit_price)}</span>
                </div>
              </div>
            </div>

            {/* Order Value & Special Notes */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', fontWeight: 700 }}>TOTAL ORDER VALUE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--ash-900)' }}>
                    {formatLKR(activeSelectedOrder.gross_amount)}
                  </div>
                  {Number(activeSelectedOrder.document_charge) > 0 && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--ash-500)', marginTop: '1px' }}>
                      (Includes Documentation Charge: {formatLKR(activeSelectedOrder.document_charge)})
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', maxWidth: '300px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ash-500)', fontWeight: 700 }}>SPECIAL WORKSHOP / DELIVERY NOTES</div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ash-800)', marginTop: '2px', fontStyle: 'italic' }}>
                    {activeSelectedOrder.notes || 'Standard manufacturing and showroom handling.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ash-200)', paddingTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                onClick={() => handleDeleteOrder(activeSelectedOrder.id, activeSelectedOrder.contract_no)}
              >
                <Trash2 size={14} /> Cancel Order
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {onNavigate && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsViewDetailsModalOpen(false);
                      onNavigate('payments');
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="View Payments & Balances for this client"
                  >
                    <CreditCard size={14} /> Payments & Advances
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleSendWhatsAppInvoice(activeSelectedOrder)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    color: '#15803D',
                    borderColor: '#86EFAC',
                    background: '#F0FDF4',
                  }}
                  title="Send Invoice to Customer via WhatsApp"
                >
                  <WhatsAppIcon size={14} color="#15803D" /> WhatsApp Invoice
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsViewDetailsModalOpen(false);
                    setIsPrintModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Printer size={14} /> Print Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================
          6. MODAL: RECORD INSTALLMENT PAYMENT
          ========================================================= */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={activeSelectedOrder ? `Pay Installment - ${activeSelectedOrder.contract_no}` : 'Record Payment'}
      >
        {activeSelectedOrder && (
          <form onSubmit={handleRecordInstallment}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--ash-50)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.84rem' }}>
                <div>Client: <strong>{activeSelectedOrder.customer_name}</strong></div>
                <div>NIC: <strong>{activeSelectedOrder.customer_nic}</strong></div>
                <div>Remaining Balance: <strong style={{ color: '#DC2626' }}>{formatLKR(activeSelectedOrder.balance_due)}</strong></div>
                <div>Installment Due: <strong>{formatLKR(activeSelectedOrder.installment_value)}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount (LKR) *</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  min="1"
                  max={activeSelectedOrder.balance_due}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  Confirm Payment
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================
          7. MODAL: PRINT BILL / CONTRACT RECEIPT
          ========================================================= */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={activeSelectedOrder ? `Print Bill - ${activeSelectedOrder.contract_no}` : 'Print Bill'}
      >
        {activeSelectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              id="printable-bill"
              style={{
                background: '#fff',
                padding: '20px',
                border: '1px solid var(--ash-300)',
                borderRadius: '8px',
                color: '#1e293b',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>D N S HOME SOLUTIONS</h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Center: {activeSelectedOrder.center_code || 'C001'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>CONTRACT RECEIPT</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 900, color: '#2563eb' }}>
                    {activeSelectedOrder.contract_no}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0', fontSize: '0.82rem' }}>
                <div>
                  <div>Customer: <strong>{activeSelectedOrder.customer_name}</strong></div>
                  <div>NIC: <strong>{activeSelectedOrder.customer_nic}</strong></div>
                  <div>Phone: {activeSelectedOrder.customer_phone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Date: {formatDate(activeSelectedOrder.date)}</div>
                  <div>Invoice No: <strong>{activeSelectedOrder.invoice_no}</strong></div>
                </div>
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', margin: '10px 0' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '6px' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px' }}>
                      {activeSelectedOrder.item_name} ({activeSelectedOrder.item_code})
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{activeSelectedOrder.quantity}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{formatLKR(activeSelectedOrder.unit_price)}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 800 }}>
                      {formatLKR((Number(activeSelectedOrder.unit_price) || 0) * (Number(activeSelectedOrder.quantity) || 1))}
                    </td>
                  </tr>
                  {Number(activeSelectedOrder.document_charge) > 0 && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#F8FAFC' }}>
                      <td colSpan={3} style={{ padding: '6px', color: '#475569', fontWeight: 600 }}>
                        📄 Document Charge / Stamp & Agreement Fee
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 800 }}>
                        {formatLKR(activeSelectedOrder.document_charge)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Financials */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <div style={{ width: '250px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gross Amount:</span>
                    <strong>{formatLKR(activeSelectedOrder.gross_amount)}</strong>
                  </div>
                  {Number(activeSelectedOrder.document_charge) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b' }}>
                      <span>(Includes Doc Charge:</span>
                      <span>{formatLKR(activeSelectedOrder.document_charge)})</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Advance Received:</span>
                    <strong>{formatLKR(activeSelectedOrder.advance_paid)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '4px', color: '#dc2626', fontWeight: 900 }}>
                    <span>Remaining Balance:</span>
                    <span>{formatLKR(activeSelectedOrder.balance_due)}</span>
                  </div>
                  {activeSelectedOrder.payment_type === 'installment' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f5f9', padding: '4px 6px', borderRadius: '4px', marginTop: '2px', fontSize: '0.78rem' }}>
                      <span>Installment Plan:</span>
                      <strong>{formatLKR(activeSelectedOrder.installment_value)} / {activeSelectedOrder.loan_frequency}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsPrintModalOpen(false)}
              >
                Close
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleSendWhatsAppInvoice(activeSelectedOrder)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    color: '#15803D',
                    borderColor: '#86EFAC',
                    background: '#F0FDF4',
                  }}
                  title="Send Invoice to Customer via WhatsApp"
                >
                  <WhatsAppIcon size={14} color="#15803D" /> Send via WhatsApp
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handlePrintSingleInvoicePDF(activeSelectedOrder)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
                >
                  <Printer size={15} /> Download / Print PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
