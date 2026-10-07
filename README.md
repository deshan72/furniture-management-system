# D & D Furniture Management System

A high-performance full-stack web application designed for furniture manufacturing and retail businesses. Provides real-time tracking of day-to-day cash handling, furniture product inventory, customer accounts, and custom made-to-order projects.

---

## 📁 Project Architecture & Directory Structure

```
furniture-management-system/
├── backend/                             # Express.js & Node.js API
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js              # Supabase Client connection
│   │   ├── controllers/
│   │   │   ├── productsController.js    # Furniture items, wood types, inventory
│   │   │   ├── customersController.js   # Customers & credit tracking
│   │   │   ├── ordersController.js      # Orders, advances, balance collection
│   │   │   ├── cashbookController.js    # Day-to-day cash handling & expenses
│   │   │   └── dashboardController.js   # Analytics & KPI overview
│   │   ├── middleware/
│   │   │   └── errorHandler.js          # Central error handling
│   │   ├── routes/
│   │   │   ├── productRoutes.js
│   │   │   ├── customerRoutes.js
│   │   │   ├── orderRoutes.js
│   │   │   ├── cashbookRoutes.js
│   │   │   └── dashboardRoutes.js
│   │   └── server.js                    # Express app entry point
│   ├── .env                             # Environment secrets (port, Supabase keys)
│   ├── .env.example
│   └── package.json
│
├── frontend/                            # React 19 + Vite Admin Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx               # Date & quick action topbar
│   │   │   ├── Modal.jsx                # Reusable popup dialog
│   │   │   ├── Sidebar.jsx              # Navigation menu
│   │   │   └── StatCard.jsx             # KPI metric cards
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx        # Cash flow summary, stock alerts
│   │   │   ├── ProductsPage.jsx         # Furniture catalog & stock manager
│   │   │   ├── CustomersPage.jsx        # Customer directory & WhatsApp links
│   │   │   ├── OrdersPage.jsx           # Booking, advances, printable bills
│   │   │   └── CashHandlingPage.jsx     # Daily cash register & day balancing
│   │   ├── services/
│   │   │   └── api.js                   # REST API client
│   │   ├── utils/
│   │   │   └── formatters.js            # LKR (Rs.) & Date formatting
│   │   ├── App.jsx                      # App root state & router
│   │   ├── index.css                    # Luxury dark-glassmorphism design system
│   │   └── main.jsx
│   ├── index.html
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── database/                            # Supabase PostgreSQL Database
│   ├── schema.sql                       # Complete SQL schema (Tables, Keys, Functions)
│   └── sample_data.sql                  # Seed data for test products, customers & expenses
│
├── .gitignore
├── package.json                         # Root orchestration scripts
└── README.md
```

---

## ⚡ Quick Start Instructions

### 1. Database Setup (Supabase)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Open the **SQL Editor** in Supabase.
3. Copy and run the contents of [`database/schema.sql`](file:///d:/D%20&%20D%20Furniture%20System/furniture-management-system/database/schema.sql).
4. (Optional) Run [`database/sample_data.sql`](file:///d:/D%20&%20D%20Furniture%20System/furniture-management-system/database/sample_data.sql) to populate initial sample furniture and records.
5. In your Supabase Project Settings > API, copy the **Project URL** and **anon public key**.
6. Paste them into `backend/.env` and `frontend/.env`.

### 2. Running the Backend API
```bash
cd backend
npm run dev
```
API runs on: `http://localhost:5000/api`

### 3. Running the Frontend Admin Dashboard
```bash
cd frontend
npm run dev
```
Dashboard runs on: `http://localhost:5173`

---

## 🪵 Key Features Included

1. **Day-End Cash Balancing**:
   - `Opening Drawer Cash + Today's Cash In - Total Expenses = Drawer Balance`.
   - Prevents cash loss at the end of every business day.
2. **Custom Furniture Orders & Advances**:
   - Track made-to-order furniture with advances paid and delivery balance due.
3. **Customer Credit Ledger**:
   - Real-time customer outstanding balances and one-click WhatsApp chat.
4. **Stock Tracking & Alerts**:
   - Low stock warnings for wooden furniture items.
5. **Printable Invoices**:
   - Professional branded furniture invoices ready for printing or PDF export.
