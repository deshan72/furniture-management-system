// Returns & Repairs Management Data Store
// Aligned with D&S Furniture System specifications

export const REPAIRS_STORAGE_KEY = 'dnd_repairs_list_v1';

export const REPAIR_CATEGORIES = [
  'Wood Polish & Surface',
  'Structural & Joint Repair',
  'Hardware & Hinges',
  'Melamine & Edge Banding',
  'Upholstery & Fabric',
  'Transit & Delivery Damage',
  'Customer Modification',
];

export const REPAIR_STATUSES = {
  pending: { label: 'Reported / Pending Inspection', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  in_repair: { label: 'In Workshop Repair', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  ready: { label: 'Ready for Handover', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  completed: { label: 'Completed & Handed Over', color: '#16A34A', bg: '#DCFCE7', border: '#86EFAC' },
  replaced: { label: 'Item Replaced / Exchanged', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  cancelled: { label: 'Cancelled / Withdrawn', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' },
};

export const WORKSHOP_TECHNICIANS = [
  'Bandara (Master Polisher)',
  'Sunil Shantha (Master Carpenter)',
  'Kamal Perera (Fitter & Hardware)',
  'Anura Kumara (Workshop Supervisor)',
  'Pradeep Silva (Upholstery Specialist)',
];

export const INITIAL_REPAIRS = [
  {
    id: 'rep-001',
    ticket_no: 'DS-REP-2026-001',
    date_reported: '2026-10-20',
    order_id: 'ORD-1001',
    contract_no: 'PN/C001/WD-001',
    customer_id: '197814502391',
    customer_name: 'Sunil Jayawardena',
    customer_phone: '0771234567',
    customer_nic: '197814502391',
    branch_code: 'MHG',
    center_code: 'C001',
    item_code: 'WD-001',
    item_name: 'Royal Teak 6-Seater Dining Table',
    category: 'Wood Polish & Surface',
    priority: 'Medium',
    status: 'in_repair',
    action_type: 'Workshop Repair',
    estimated_cost: 0,
    cost_bearer: 'Under Warranty',
    assigned_technician: 'Bandara (Master Polisher)',
    expected_completion: '2026-11-15',
    issue_description: 'Minor lacquer scratch on tabletop corner during dining chair placement. Workshop touch-up sanding and topcoat clear polish required.',
    resolution_notes: 'Table brought to Maharagama workshop bay 2. Sanded down with 400 grit, first coat lacquer applied.',
    created_at: '2026-10-20T11:00:00Z',
  },
  {
    id: 'rep-002',
    ticket_no: 'DS-REP-2026-002',
    date_reported: '2026-10-28',
    order_id: 'ORD-1002',
    contract_no: 'PN-002/C002/WD-002',
    customer_id: '198578901234',
    customer_name: 'Chamari Perera',
    customer_phone: '0718899221',
    customer_nic: '198578901234',
    branch_code: 'MHG',
    center_code: 'C002',
    item_code: 'WD-002',
    item_name: 'Mahogany 3-Door Wardrobe (Almirah)',
    category: 'Hardware & Hinges',
    priority: 'Low',
    status: 'completed',
    action_type: 'On-site Carpenter Visit',
    estimated_cost: 0,
    cost_bearer: 'Under Warranty',
    assigned_technician: 'Sunil Shantha (Master Carpenter)',
    expected_completion: '2026-10-30',
    issue_description: 'Right almirah door soft-close hinge slightly stiff and out of alignment after customer floor leveling.',
    resolution_notes: 'Carpenter Sunil visited Kottawa residence. Adjusted 3x hydraulic hinges, tested door latch and lock. Customer signed satisfaction voucher.',
    completed_at: '2026-10-30T15:30:00Z',
    created_at: '2026-10-28T09:30:00Z',
  },
  {
    id: 'rep-003',
    ticket_no: 'DS-REP-2026-003',
    date_reported: '2026-11-05',
    order_id: 'ORD-1003',
    contract_no: 'PN-003/C001/MEL-001',
    customer_id: '196923405678',
    customer_name: 'Nimal Karunaratne',
    customer_phone: '0763344552',
    customer_nic: '196923405678',
    branch_code: 'MRT',
    center_code: 'C001',
    item_code: 'MEL-001',
    item_name: 'Modern Melamine Modular Kitchen Pantry Unit',
    category: 'Melamine & Edge Banding',
    priority: 'High',
    status: 'pending',
    action_type: 'On-site Carpenter Visit',
    estimated_cost: 0,
    cost_bearer: 'Under Warranty',
    assigned_technician: 'Kamal Perera (Fitter & Hardware)',
    expected_completion: '2026-11-16',
    issue_description: 'Moisture ingress noticed along 20cm of edge-banding near sink cutout. Needs hot-melt PVC re-banding and silicone waterproof sealing.',
    resolution_notes: 'Initial inspection scheduled with client. Technician Kamal to take portable edge trimmer on Saturday.',
    created_at: '2026-11-05T14:45:00Z',
  },
];

export function loadSavedRepairs() {
  try {
    const raw = localStorage.getItem(REPAIRS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(INITIAL_REPAIRS));
      return INITIAL_REPAIRS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_REPAIRS;
  } catch (err) {
    console.error('Error loading repairs:', err);
    return INITIAL_REPAIRS;
  }
}

export function saveRepairsToStorage(repairs) {
  try {
    localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(repairs));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Error saving repairs:', err);
  }
}

export function generateNextTicketNo(existingRepairs = []) {
  const currentYear = new Date().getFullYear();
  const prefix = `DS-REP-${currentYear}-`;
  let maxSeq = 3;
  existingRepairs.forEach((r) => {
    if (r.ticket_no && r.ticket_no.startsWith(prefix)) {
      const numPart = parseInt(r.ticket_no.slice(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  });
  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

