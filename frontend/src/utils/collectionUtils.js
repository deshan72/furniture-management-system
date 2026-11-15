import { formatCenterCode } from './centersData';
import { formatLKR, formatDate } from './formatters';

/**
 * Checks whether a center is scheduled for collection on the given date.
 * Supports:
 * - Direct ISO date matching: center.cash_collect_date === dateStr (e.g. '2026-11-14')
 * - Day of month matching: e.g. center.cash_collect_date === '14' or '14th'
 * - Day of week matching: e.g. center.cash_collect_date === 'Saturday'
 */
export const isCenterScheduledForDate = (center, dateStr) => {
  if (!center) return false;
  const ccd = String(center.cash_collect_date || '').trim();
  if (!ccd) return false;

  // Direct date match: '2026-11-14' === '2026-11-14'
  if (ccd === dateStr) return true;

  try {
    const targetDate = new Date(dateStr);
    if (!isNaN(targetDate.getTime())) {
      // Check day of month: '14' === '14'
      const targetDay = targetDate.getDate();
      const numMatch = ccd.match(/^(\d{1,2})/);
      if (numMatch && parseInt(numMatch[1], 10) === targetDay) {
        return true;
      }

      // Check day of week: e.g. 'Monday', 'Saturday'
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetWeekday = weekdays[targetDate.getDay()];
      if (ccd.toLowerCase().includes(targetWeekday.toLowerCase())) {
        return true;
      }
    }
  } catch {}

  return false;
};

/**
 * Normalizes customer or order center identity to match a center object.
 */
export const isItemInCenter = (item, center) => {
  if (!item || !center) return false;
  const targetCode = formatCenterCode(center.center_code);

  const itemCenter = formatCenterCode(item.center_code || item.centerCode);

  // If center code matches
  if (itemCenter && targetCode && itemCenter === targetCode) {
    return true;
  }

  // Contract number check (e.g. PN/C003/MEL-001)
  if (item.contract_no && typeof item.contract_no === 'string') {
    const cUpper = item.contract_no.toUpperCase();
    if (
      cUpper.includes(`/${targetCode}/`) ||
      cUpper.includes(`-${targetCode}-`) ||
      cUpper.includes(`/${targetCode}`) ||
      cUpper.includes(`${targetCode}/`)
    ) {
      return true;
    }
  }

  // Also check if center name matches
  const centerName = (center.name || '').trim().toLowerCase();
  if (item.center_name && item.center_name.trim().toLowerCase() === centerName) {
    return true;
  }
  if (typeof item.center === 'string') {
    if (item.center.includes(targetCode)) return true;
    if (centerName && item.center.toLowerCase().includes(centerName)) return true;
  }

  return false;
};

/**
 * Checks whether a customer belongs to a center.
 */
export const isCustomerInCenter = (customer, center) => {
  if (!customer || !center) return false;
  const targetCode = formatCenterCode(center.center_code);
  const custCenter = formatCenterCode(customer.center_code || customer.centerCode);
  if (custCenter && targetCode && custCenter === targetCode) {
    return true;
  }
  const centerCity = (center.city || '').trim().toLowerCase();
  const custCity = (customer.city || '').trim().toLowerCase();
  if (custCity && centerCity && custCity === centerCity) {
    return true;
  }
  const centerName = (center.name || '').trim().toLowerCase();
  if (customer.center_name && centerName && customer.center_name.trim().toLowerCase() === centerName) {
    return true;
  }
  return false;
};

/**
 * Calculates Center Collection Statistics for a specific Center & Date.
 * Computes Target, Collected, Shortfall, Progress %, and segregates into:
 * - pendingList (Unpaid clients who owe installments today)
 * - confirmedList (Paid clients who paid today with receipt confirmation)
 */
export const calculateCenterCollectionStats = ({
  center,
  dateStr,
  orders = [],
  payments = [],
  customers = [],
}) => {
  if (!center) {
    return {
      targetAmount: 0,
      collectedToday: 0,
      pendingShortfall: 0,
      achievementRate: 0,
      totalClientsCount: 0,
      confirmedCount: 0,
      pendingCount: 0,
      pendingList: [],
      confirmedList: [],
      centerName: '',
      centerCode: '',
      isScheduledToday: false,
    };
  }

  // The collection date MUST equal center's cash_collect_date if set
  const todayStr = new Date().toISOString().slice(0, 10);
  const targetCollectDate = center.cash_collect_date || dateStr || todayStr;
  const isScheduledToday = targetCollectDate === todayStr || isCenterScheduledForDate(center, todayStr);
  const targetCenterCode = formatCenterCode(center.center_code);

  // Helper to resolve customer registered for an item/order
  const findCustomer = (queryId, queryNic, queryName) => {
    const qId = String(queryId || '').trim();
    const qNic = String(queryNic || '').trim().toUpperCase();
    const qName = String(queryName || '').trim().toLowerCase();

    return customers.find((c) => {
      const cId = String(c.id || '').trim();
      const cCustId = String(c.customer_id || '').trim().toUpperCase();
      const cNic = String(c.nic || '').trim().toUpperCase();
      const cName = String(c.name || '').trim().toLowerCase();

      if (qNic && (cNic === qNic || cCustId === qNic)) return true;
      if (qId && (cId === qId || cCustId === qId || cNic === qId)) return true;
      if (qName && cName === qName) return true;
      return false;
    });
  };

  // Filter orders that belong to this center
  const centerOrders = orders.filter((o) => {
    // 1. Direct match on order's own center properties
    if (isItemInCenter(o, center)) return true;
    if (formatCenterCode(o.center_code) === targetCenterCode) return true;
    if (o.contract_no && o.contract_no.toUpperCase().includes(`/${targetCenterCode}/`)) return true;

    // 2. Resolve registered customer record for this order
    const cust = findCustomer(o.customer_id, o.customer_nic, o.customer_name);
    if (cust && (isCustomerInCenter(cust, center) || isItemInCenter(cust, center))) {
      return true;
    }

    return false;
  });

  // Filter active installment accounts (balance_due > 0 and status !== 'Cancelled')
  const activeOrders = centerOrders.filter(
    (o) => o.status !== 'Cancelled' && Number(o.balance_due) > 0
  );

  // All payments received on targetCollectDate for this center
  const centerPaymentsToday = payments.filter((p) => {
    const matchesDate =
      p.date === targetCollectDate ||
      (dateStr && p.date === dateStr) ||
      (targetCollectDate === todayStr && p.date === todayStr);

    if (!matchesDate) return false;
    // Check if payment center matches
    if (isItemInCenter(p, center)) return true;
    // Check if payment contract matches any order in this center
    if (p.contract_no && centerOrders.some((o) => o.contract_no === p.contract_no)) return true;
    return false;
  });

  const collectedToday = centerPaymentsToday.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const pendingList = [];
  const confirmedList = [];
  let targetAmount = 0;

  activeOrders.forEach((order) => {
    const balDue = Number(order.balance_due) || 0;
    const instVal = Number(order.installment_value) || balDue;
    // Expected due for this collection round
    const expectedDue = Math.min(balDue, instVal > 0 ? instVal : balDue);
    targetAmount += expectedDue;

    // Check if there is a payment today for this contract/customer
    const paymentsForOrder = centerPaymentsToday.filter(
      (p) =>
        p.contract_no === order.contract_no ||
        (p.customer_nic && order.customer_nic && p.customer_nic === order.customer_nic) ||
        (p.order_id && p.order_id === order.id)
    );

    const amountPaidToday = paymentsForOrder.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const hasPaidToday = paymentsForOrder.length > 0 || amountPaidToday > 0;

    const verifiedCust = findCustomer(order.customer_id, order.customer_nic, order.customer_name);

    const finalCustName = order.customer_name || verifiedCust?.name || 'Valued Client';
    const finalCustNic = order.customer_nic || verifiedCust?.nic || verifiedCust?.customer_id || '-';
    const finalCustPhone = order.customer_phone || verifiedCust?.phone || '-';
    const finalCustAddress = order.customer_address || order.delivery_address || verifiedCust?.address || '-';

    const enrichedItem = {
      order,
      orderId: order.id,
      contractNo: order.contract_no,
      customerName: finalCustName,
      customerNic: finalCustNic,
      customerPhone: finalCustPhone,
      customerAddress: finalCustAddress,
      itemName: order.item_name || 'Furniture Item',
      itemCode: order.item_code || '',
      installmentDue: expectedDue,
      balanceDue: balDue,
      loanTerms: order.loan_terms || 12,
      installmentsPaid: order.installments_paid || 0,
      frequency: order.loan_frequency || 'monthly',
      hasPaidToday,
      amountPaidToday,
      paymentsToday: paymentsForOrder,
      latestReceiptNo: paymentsForOrder[0]?.receipt_no || '',
      paidAtTime: paymentsForOrder[0]?.created_at || paymentsForOrder[0]?.date || '',
    };

    if (hasPaidToday) {
      confirmedList.push(enrichedItem);
    } else {
      pendingList.push(enrichedItem);
    }
  });

  // Also include any payments today for settled orders that might not be in activeOrders
  centerPaymentsToday.forEach((p) => {
    const alreadyListed = confirmedList.some(
      (item) => item.paymentsToday.some((pt) => pt.id === p.id || pt.receipt_no === p.receipt_no)
    );
    if (!alreadyListed) {
      confirmedList.push({
        order: null,
        orderId: p.order_id || null,
        contractNo: p.contract_no || '-',
        customerName: p.customer_name || 'Client',
        customerNic: p.customer_nic || '-',
        customerPhone: p.customer_phone || '-',
        customerAddress: '-',
        itemName: p.notes || 'Full Settlement / Advance',
        itemCode: '',
        installmentDue: Number(p.amount) || 0,
        balanceDue: 0,
        loanTerms: 1,
        installmentsPaid: 1,
        frequency: 'one-time',
        hasPaidToday: true,
        amountPaidToday: Number(p.amount) || 0,
        paymentsToday: [p],
        latestReceiptNo: p.receipt_no || '',
        paidAtTime: p.created_at || p.date || '',
      });
    }
  });

  const pendingShortfall = Math.max(0, targetAmount - collectedToday);
  const achievementRate =
    targetAmount > 0
      ? Math.min(100, Math.round((collectedToday / targetAmount) * 100))
      : collectedToday > 0
      ? 100
      : 0;

  return {
    center,
    centerCode: formatCenterCode(center.center_code),
    centerName: center.name,
    branchCode: center.branch_code || '',
    officerInCharge: center.contact_person || 'Field Officer',
    officerPhone: center.phone || '',
    dateStr: targetCollectDate,
    cashCollectDate: targetCollectDate,
    dueDate: center.due_date || '',
    isScheduledToday,
    targetAmount,
    collectedToday,
    pendingShortfall,
    achievementRate,
    totalClientsCount: activeOrders.length,
    confirmedCount: confirmedList.length,
    pendingCount: pendingList.length,
    pendingList,
    confirmedList,
  };
};

/**
 * Generates direct WhatsApp URL with reminder text
 */
export const generateWhatsAppReminderLink = (clientItem, center, dueAmount) => {
  const phone = String(clientItem.customerPhone || '').replace(/\D/g, '');
  if (!phone) return null;

  // Format SL number 07X -> 947X
  const formattedPhone = phone.startsWith('0') ? `94${phone.slice(1)}` : phone;

  const name = clientItem.customerName || 'Customer';
  const contract = clientItem.contractNo || 'Contract';
  const centerName = center?.name || 'Center';
  const due = formatLKR(dueAmount || clientItem.installmentDue || 0);
  const bal = formatLKR(clientItem.balanceDue || 0);

  const text = `ආයුබෝවන් ${name} මහත්මයාණෙනි/මහත්මියනි,\n\nD N S Home Solutions වෙතින් කෙරෙන සුහද සිහිපත්කිරීමයි. ඔබගේ ගෘහභාණ්ඩ ණය ගිවිසුම (${contract}) සඳහා අද දින (${centerName}) මුදල් එකතු කිරීමේ දිනයයි.\n\n• අද දින ගෙවිය යුතු වාරිකය: ${due}\n• ඉතිරි මුළු ණය ශේෂය: ${bal}\n\nකරුණාකර ක්ෂේත්‍ර නිලධාරීතුමා වෙත මුදල් ලබාදීමට කටයුතු කරන්න. ස්තුතියි!\n\n— D N S Home Solutions Management\nHotline: ${center?.phone || '0112345678'}`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
};

/**
 * Generates an official A4 printable HTML document for field cash collection rounds
 */
export const generateFieldCollectionSheetHtml = (stats) => {
  const {
    centerName,
    centerCode,
    branchCode,
    officerInCharge,
    officerPhone,
    dateStr,
    targetAmount,
    totalClientsCount,
    pendingList = [],
    confirmedList = [],
  } = stats;

  const allRows = [
    ...pendingList.map((item, idx) => ({ ...item, isPaid: false, index: idx + 1 })),
    ...confirmedList.map((item, idx) => ({ ...item, isPaid: true, index: pendingList.length + idx + 1 })),
  ];

  const rowsHtml = allRows
    .map(
      (r) => `
      <tr style="border-bottom: 1px solid #E2E8F0; ${r.isPaid ? 'background-color: #F0FDF4;' : ''}">
        <td style="padding: 8px 10px; font-weight: 700; text-align: center;">${r.index}</td>
        <td style="padding: 8px 10px;">
          <div style="font-weight: 700; color: #0F172A;">${r.customerName}</div>
          <div style="font-size: 11px; color: #64748B;">NIC: ${r.customerNic}</div>
        </td>
        <td style="padding: 8px 10px; font-size: 12px; color: #1E293B;">
          <div>📞 ${r.customerPhone}</div>
          <div style="font-size: 11px; color: #64748B;">${r.customerAddress}</div>
        </td>
        <td style="padding: 8px 10px; font-size: 11px;">
          <strong>${r.contractNo}</strong><br/>
          <span style="color: #64748B;">${r.itemName}</span>
        </td>
        <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: #0F172A;">
          ${formatLKR(r.installmentDue)}
        </td>
        <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: ${r.isPaid ? '#15803D' : '#94A3B8'};">
          ${r.isPaid ? formatLKR(r.amountPaidToday) : '...................'}
        </td>
        <td style="padding: 8px 10px; text-align: center; font-size: 11px;">
          ${r.isPaid ? `<span style="color: #15803D; font-weight: 700;">✓ PAID (${r.latestReceiptNo})</span>` : '................................'}
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Daily Center Cash Collection Sheet - ${centerCode}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #0F172A;
            font-size: 12px;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #1E4D8C;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .title { font-size: 20px; font-weight: 900; color: #1E4D8C; margin: 0 0 2px 0; }
          .subtitle { font-size: 11px; color: #64748B; margin: 0; }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 16px;
            gap: 8px;
          }
          .meta-item { font-size: 11px; }
          .meta-label { color: #64748B; text-transform: uppercase; font-size: 9px; font-weight: 700; }
          .meta-val { font-size: 13px; font-weight: 800; color: #0F172A; margin-top: 1px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
          th { background: #1E4D8C; color: #ffffff; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer-box { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px solid #CBD5E1; }
          .sign-col { text-align: center; width: 30%; }
          .sign-line { border-bottom: 1px dashed #64748B; margin-bottom: 6px; height: 35px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1 class="title">D N S HOME SOLUTIONS</h1>
            <p class="subtitle">Furniture Workshop & Regional Showroom Network • Official Field Collection Sheet</p>
          </div>
          <div style="text-align: right;">
            <div style="background: #E8F1FA; color: #1E4D8C; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 12px; display: inline-block;">
              ${branchCode ? `${branchCode} / ` : ''}${centerCode}
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 3px;">Date: <strong>${formatDate(dateStr)}</strong></div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Regional Center</div>
            <div class="meta-val">${centerName} (${centerCode})</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Officer In Charge</div>
            <div class="meta-val">${officerInCharge} ${officerPhone ? `(${officerPhone})` : ''}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Collection Target (LKR)</div>
            <div class="meta-val" style="color: #1E4D8C;">${formatLKR(targetAmount)} <span style="font-size: 10px; color: #64748B;">(${totalClientsCount} clients)</span></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>Customer Details</th>
              <th>Contact & Address</th>
              <th>Contract & Item</th>
              <th style="text-align: right;">Due (Rs.)</th>
              <th style="text-align: right;">Collected (Rs.)</th>
              <th style="text-align: center;">Client Signature</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="7" style="padding: 20px; text-align: center; color: #64748B;">No active installment clients scheduled for this center.</td></tr>`}
          </tbody>
        </table>

        <div class="footer-box">
          <div class="sign-col">
            <div class="sign-line"></div>
            <div><strong>Field Officer Signature</strong></div>
            <div style="font-size: 9px; color: #64748B;">Cash Collected & Handover</div>
          </div>
          <div class="sign-col">
            <div class="sign-line"></div>
            <div><strong>Center Manager Approval</strong></div>
            <div style="font-size: 9px; color: #64748B;">Verified in Regional Center</div>
          </div>
          <div class="sign-col">
            <div class="sign-line"></div>
            <div><strong>Head Office Cashier</strong></div>
            <div style="font-size: 9px; color: #64748B;">System Data Entered & Confirmed</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

// ============================================================================
// 5-DAY WEEKLY SINGLE CUSTOMER COLLECTION HELPERS
// ============================================================================

export const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export const WEEKDAYS_CONFIG = {
  monday: {
    key: 'monday',
    dayNumber: 1,
    nameEn: 'Monday',
    nameSi: 'සඳුදා',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    badgeClass: 'badge-blue',
  },
  tuesday: {
    key: 'tuesday',
    dayNumber: 2,
    nameEn: 'Tuesday',
    nameSi: 'අඟහරුවාදා',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    badgeClass: 'badge-purple',
  },
  wednesday: {
    key: 'wednesday',
    dayNumber: 3,
    nameEn: 'Wednesday',
    nameSi: 'බදාදා',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    badgeClass: 'badge-green',
  },
  thursday: {
    key: 'thursday',
    dayNumber: 4,
    nameEn: 'Thursday',
    nameSi: 'බ්‍රහස්පතින්දා',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    badgeClass: 'badge-amber',
  },
  friday: {
    key: 'friday',
    dayNumber: 5,
    nameEn: 'Friday',
    nameSi: 'සිකුරාදා',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    badgeClass: 'badge-rose',
  },
};

/**
 * Returns today's weekday key ('monday' ... 'friday').
 * Weekend (Sat/Sun) is mapped to Friday or Monday.
 */
export const getCurrentWeekdayKey = () => {
  const d = new Date().getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  if (d === 0) return 'monday';
  if (d === 6) return 'friday';
  if (d === 1) return 'monday';
  if (d === 2) return 'tuesday';
  if (d === 3) return 'wednesday';
  if (d === 4) return 'thursday';
  if (d === 5) return 'friday';
  return 'monday';
};

/**
 * Maps an order to one of the 5 working weekdays based on its first_due_date or purchase date.
 * If the date falls on Saturday, it is mapped to Friday; Sunday is mapped to Monday.
 */
export const getCustomerWeekday = (order) => {
  if (!order) return { ...WEEKDAYS_CONFIG.monday, rawDayNumber: 1 };

  const rawDateStr = order.first_due_date || order.date || order.created_at;
  if (!rawDateStr) {
    return { ...WEEKDAYS_CONFIG.monday, rawDayNumber: 1 };
  }

  try {
    const d = new Date(rawDateStr);
    if (!isNaN(d.getTime())) {
      const dayNum = d.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
      if (dayNum === 1) return { ...WEEKDAYS_CONFIG.monday, rawDayNumber: dayNum };
      if (dayNum === 2) return { ...WEEKDAYS_CONFIG.tuesday, rawDayNumber: dayNum };
      if (dayNum === 3) return { ...WEEKDAYS_CONFIG.wednesday, rawDayNumber: dayNum };
      if (dayNum === 4) return { ...WEEKDAYS_CONFIG.thursday, rawDayNumber: dayNum };
      if (dayNum === 5) return { ...WEEKDAYS_CONFIG.friday, rawDayNumber: dayNum };
      if (dayNum === 6) {
        // Saturday mapped to Friday for 5-day weekday field collections
        return { ...WEEKDAYS_CONFIG.friday, rawDayNumber: dayNum, isWeekendAdjusted: true, originalDay: 'Saturday' };
      }
      if (dayNum === 0) {
        // Sunday mapped to Monday
        return { ...WEEKDAYS_CONFIG.monday, rawDayNumber: dayNum, isWeekendAdjusted: true, originalDay: 'Sunday' };
      }
    }
  } catch {}

  return { ...WEEKDAYS_CONFIG.monday, rawDayNumber: 1 };
};

/**
 * Calculates 5-Day Weekly Collection Statistics for single customers.
 * Distributes active installment customers across Monday to Friday.
 */
export const calculate5DayWeeklyStats = (orders = [], payments = []) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Initialize weekday buckets + all bucket
  const stats = {
    monday: {
      ...WEEKDAYS_CONFIG.monday,
      totalClients: 0,
      targetAmount: 0,
      collectedToday: 0,
      pendingShortfall: 0,
      pendingList: [],
      confirmedList: [],
      allClients: [],
    },
    tuesday: {
      ...WEEKDAYS_CONFIG.tuesday,
      totalClients: 0,
      targetAmount: 0,
      collectedToday: 0,
      pendingShortfall: 0,
      pendingList: [],
      confirmedList: [],
      allClients: [],
    },
    wednesday: {
      ...WEEKDAYS_CONFIG.wednesday,
      totalClients: 0,
      targetAmount: 0,
      collectedToday: 0,
      pendingShortfall: 0,
      pendingList: [],
      confirmedList: [],
      allClients: [],
    },
    thursday: {
      ...WEEKDAYS_CONFIG.thursday,
      totalClients: 0,
      targetAmount: 0,
      collectedToday: 0,
      pendingShortfall: 0,
      pendingList: [],
      confirmedList: [],
      allClients: [],
    },
    friday: {
      ...WEEKDAYS_CONFIG.friday,
      totalClients: 0,
      targetAmount: 0,
      collectedToday: 0,
      pendingShortfall: 0,
      pendingList: [],
      confirmedList: [],
      allClients: [],
    },
    all: {
      key: 'all',
      nameEn: 'All Customers',
      nameSi: 'සියලුම ගනුදෙනුකරුවන්',
      color: '#0F172A',
      bg: '#F8FAFC',
      border: '#E2E8F0',
      badgeClass: 'badge-dark',
      totalClients: 0,
      targetAmount: 0,
      collectedToday: 0,
      pendingShortfall: 0,
      pendingList: [],
      confirmedList: [],
      allClients: [],
    },
  };

  orders.forEach((order) => {
    const bal = Number(order.balance_due) || 0;
    const isSettled = bal <= 0;

    // Filter receipts for this order
    const ordReceipts = payments.filter(
      (p) => p.order_id === order.id || (order.contract_no && p.contract_no === order.contract_no)
    );

    // Payments collected today for this order
    const todayReceipts = ordReceipts.filter(
      (p) => String(p.date || '').slice(0, 10) === todayStr
    );
    const collectedTodayForOrder = todayReceipts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Installment target calculation
    const instVal = Number(order.installment_value) || 0;
    const termCount = Number(order.loan_terms) || 12;
    const computedInst = instVal > 0 ? instVal : bal > 0 ? Math.round(bal / termCount) : 0;
    const targetVal = bal > 0 ? Math.min(computedInst, bal) : 0;

    // Get assigned weekday
    const dayInfo = getCustomerWeekday(order);
    const dayKey = dayInfo.dayKey;

    const enriched = {
      ...order,
      dayInfo,
      installmentDue: targetVal,
      collectedToday: collectedTodayForOrder,
      isPaidToday: collectedTodayForOrder > 0,
      isSettled,
      todayReceipts,
      receiptsCount: ordReceipts.length,
    };

    // Add to specific weekday bucket
    const bucket = stats[dayKey];
    if (bucket) {
      bucket.totalClients += 1;
      bucket.targetAmount += targetVal;
      bucket.collectedToday += collectedTodayForOrder;
      bucket.allClients.push(enriched);

      if (collectedTodayForOrder > 0 || isSettled) {
        bucket.confirmedList.push(enriched);
      } else {
        bucket.pendingList.push(enriched);
      }
    }

    // Add to 'all' bucket
    stats.all.totalClients += 1;
    stats.all.targetAmount += targetVal;
    stats.all.collectedToday += collectedTodayForOrder;
    stats.all.allClients.push(enriched);

    if (collectedTodayForOrder > 0 || isSettled) {
      stats.all.confirmedList.push(enriched);
    } else {
      stats.all.pendingList.push(enriched);
    }
  });

  // Calculate shortfalls for all buckets
  Object.keys(stats).forEach((k) => {
    stats[k].pendingShortfall = Math.max(0, stats[k].targetAmount - stats[k].collectedToday);
  });

  return stats;
};

/**
 * Generates an official printable Single Customer Daily Collection Sheet for a specific weekday.
 */
export const generateSingleCustomerDaySheetHtml = ({
  dayKey = 'monday',
  dayNameEn = 'Monday',
  dayNameSi = 'සඳුදා',
  dateStr = new Date().toISOString().slice(0, 10),
  clients = [],
  officerName = 'Showroom Executive',
  targetAmount = 0,
}) => {
  const rowsHtml = clients
    .map((c, idx) => {
      const isPaid = c.isPaidToday;
      const statusBadge = isPaid
        ? '<span style="color: #166534; font-weight: 800; font-size: 10px;">PAID TODAY</span>'
        : Number(c.balance_due) <= 0
        ? '<span style="color: #2563EB; font-weight: 800; font-size: 10px;">SETTLED</span>'
        : '<span style="color: #D97706; font-weight: 800; font-size: 10px;">DUE</span>';

      return `
        <tr>
          <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
          <td>
            <strong>${c.customer_name || 'Customer'}</strong>
            <div style="font-size: 10px; color: #475569;">NIC: ${c.customer_nic || c.customer_id || '-'}</div>
          </td>
          <td>
            <div>📞 <strong>${c.customer_phone || '-'}</strong></div>
            <div style="font-size: 9.5px; color: #64748B;">${c.customer_address || 'Maharagama / Direct'}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${c.item_name || 'Furniture Item'}</div>
            <div style="font-family: monospace; font-size: 9.5px; color: #2563EB;">${c.contract_no || '-'}</div>
          </td>
          <td style="text-align: right; font-weight: 800; color: #1E4D8C;">
            ${formatLKR(c.installmentDue || c.installment_value || 0)}
          </td>
          <td style="text-align: right; font-weight: 700; color: ${Number(c.balance_due) > 0 ? '#DC2626' : '#15803D'};">
            ${formatLKR(c.balance_due || 0)}
          </td>
          <td style="text-align: right; font-weight: 800; color: #166534;">
            ${c.collectedToday > 0 ? formatLKR(c.collectedToday) : '<span style="color: #94A3B8;">________</span>'}
          </td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="height: 28px; border-bottom: 1px solid #CBD5E1;"></td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Single Customer Weekly Collection Sheet - ${dayNameEn}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0F172A; margin: 0; padding: 12px; font-size: 11px; }
          .header-box { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1E4D8C; padding-bottom: 8px; margin-bottom: 12px; }
          .brand-title { font-size: 18px; font-weight: 900; color: #1E4D8C; margin: 0; }
          .subtitle { font-size: 10px; color: #64748B; margin: 2px 0 0 0; }
          .day-badge { background: #1E4D8C; color: #fff; padding: 4px 12px; border-radius: 6px; font-weight: 900; font-size: 13px; text-transform: uppercase; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 11px; }
          .meta-label { font-size: 9.5px; color: #64748B; font-weight: 700; text-transform: uppercase; }
          .meta-val { font-weight: 800; color: #0F172A; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th { background: #F1F5F9; color: #1E293B; padding: 7px 6px; text-align: left; border: 1px solid #CBD5E1; font-weight: 800; font-size: 9.5px; text-transform: uppercase; }
          td { padding: 6px; border: 1px solid #E2E8F0; vertical-align: middle; }
          .footer-box { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 10px; }
          .sign-col { width: 28%; text-align: center; }
          .sign-line { border-bottom: 1.5px solid #475569; height: 32px; margin-bottom: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1 class="brand-title">D N S HOME SOLUTIONS</h1>
            <p class="subtitle">Single Customer 5-Day Weekly Installment Field Collection Sheet</p>
          </div>
          <div style="text-align: right;">
            <div class="day-badge">${dayNameEn} (${dayNameSi})</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 4px;">Collection Date: <strong>${formatDate(dateStr)}</strong></div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-label">Collection Day</div>
            <div class="meta-val">${dayNameEn} / ${dayNameSi} (Weekly Cycle)</div>
          </div>
          <div>
            <div class="meta-label">Collecting Officer</div>
            <div class="meta-val">${officerName}</div>
          </div>
          <div>
            <div class="meta-label">Scheduled Clients</div>
            <div class="meta-val">${clients.length} Customers</div>
          </div>
          <div>
            <div class="meta-label">Day Target (LKR)</div>
            <div class="meta-val" style="color: #1E4D8C; font-size: 13px;">${formatLKR(targetAmount)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>Customer Name & NIC</th>
              <th>Phone & Delivery Address</th>
              <th>Contract & Item</th>
              <th style="text-align: right;">Due (Rs.)</th>
              <th style="text-align: right;">Balance (Rs.)</th>
              <th style="text-align: right;">Collected (Rs.)</th>
              <th style="text-align: center; width: 60px;">Status</th>
              <th style="width: 90px; text-align: center;">Client Signature</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="9" style="padding: 20px; text-align: center; color: #64748B;">No single customers scheduled for ${dayNameEn}.</td></tr>`}
          </tbody>
        </table>

        <div class="footer-box">
          <div class="sign-col">
            <div class="sign-line"></div>
            <div><strong>Field Collection Officer</strong></div>
            <div style="font-size: 9px; color: #64748B;">Cash Collected & Received</div>
          </div>
          <div class="sign-col">
            <div class="sign-line"></div>
            <div><strong>Showroom / Center Manager</strong></div>
            <div style="font-size: 9px; color: #64748B;">Verified & Cross-checked</div>
          </div>
          <div class="sign-col">
            <div class="sign-line"></div>
            <div><strong>Head Office Accounts Cashier</strong></div>
            <div style="font-size: 9px; color: #64748B;">Logged to System Database</div>
          </div>
        </div>
      </body>
    </html>
  `;
};

