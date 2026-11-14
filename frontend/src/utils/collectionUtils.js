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
  const targetBranch = (center.branch_code || '').trim().toUpperCase();

  const itemCenter = formatCenterCode(item.center_code || item.centerCode);
  const itemBranch = (item.branch_code || item.branchCode || '').trim().toUpperCase();

  // If center code matches
  if (itemCenter && itemCenter === targetCode) {
    if (!targetBranch || !itemBranch || itemBranch === targetBranch) {
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

  // Filter orders that belong to this center
  const centerOrders = orders.filter((o) => {
    // Check if order directly belongs to center
    if (isItemInCenter(o, center)) return true;
    // Check if customer of order belongs to center
    if (o.customer_id) {
      const cust = customers.find((c) => c.id === o.customer_id || c.nic === o.customer_nic);
      if (cust && isItemInCenter(cust, center)) return true;
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

    const enrichedItem = {
      order,
      orderId: order.id,
      contractNo: order.contract_no,
      customerName: order.customer_name || 'Valued Client',
      customerNic: order.customer_nic || '-',
      customerPhone: order.customer_phone || '-',
      customerAddress: order.customer_address || order.delivery_address || '-',
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

