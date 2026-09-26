# Cafe POS — Full-Stack Point of Sale System

A production-ready, real-time Point of Sale (POS) system designed for cafes and restaurants. Built with Node.js, Express, Prisma ORM, PostgreSQL, React, Vite, and Socket.IO for live, bidirectional communication across all terminals and displays.

**Live Demo:** [odoo-cafe-pos-zeta.vercel.app](https://odoo-cafe-pos-zeta.vercel.app/)  
**Backend API:** [odoo-cafe-pos-81do.onrender.com](https://odoo-cafe-pos-81do.onrender.com)

---

## Table of Contents

1. [Overview](#overview)
2. [Playful Geometric Design System](#playful-geometric-design-system)
3. [Mobile & Desktop Responsiveness](#mobile--desktop-responsiveness)
4. [Screenshots](#screenshots)
5. [Feature Reference](#feature-reference)
6. [Demo Credentials](#demo-credentials)
7. [Quick Demo Walkthrough](#quick-demo-walkthrough)
8. [Tech Stack](#tech-stack)
9. [Project Structure](#project-structure)
10. [Local Development Setup](#local-development-setup)
11. [Bulk Data Seeding](#bulk-data-seeding)
12. [Production Deployment Guide](#production-deployment-guide)
13. [Security Architecture](#security-architecture)
14. [API Endpoints Reference](#api-endpoints-reference)

---

## Overview

Cafe POS is designed as a multi-role, real-time system where:

- **Employees** use the POS terminal to take orders, manage tables, apply promotions, and process payments.
- **Kitchen Staff** use the Kitchen Display System (KDS) to see incoming orders in real time and update ticket statuses without any page refresh.
- **Administrators** use the backend panel to manage products, categories, tables, coupons, promotions, payment methods, users, and generate analytical reports.

All roles share a common authentication layer with JWT access and refresh token rotation. Role-based guards control page access automatically.

---

## Playful Geometric Design System

This project features a custom-crafted **Playful Geometric (Memphis-Style)** design system. It focuses on warmth, high-contrast tactility, and visual personality:

* **🎨 Color Palette**: Warm Cream background (`#FFFDF5`), Slate text (`#1E293B`), Vivid Violet (`#8B5CF6`) primary, Hot Pink (`#F472B6`) secondary, Amber (`#FBBF24`) tertiary, and Mint (`#34D399`) quaternary.
* **✍️ Typography**: `"Outfit"` for headings (characterful geometric sans) and `"Plus Jakarta Sans"` for body copy and UI elements.
* **⚡ Visual Signatures**: Chunky `2px solid #1E293B` borders, hard offset shadows (no blur) with hover-lift and active-press offsets, rotating "sticker" cards, and retro dot-grid patterns.

---

## Mobile & Desktop Responsiveness

The interface is optimized for all devices, ranging from wide desktop displays to tablet and mobile viewports:

1. **Dynamic Single-Column Switcher (Mobile)**:
   - Below `1024px` width, the POS Billing screen utilizes a clean single-column layout (swapping between the **Product Catalog** and **Cart Details**).
   - Pinned segmented toggle control (**Catalog | Cart**) sits at the top for easy navigation.
   - Smart floating bottom pill button (**View Cart**) displays cart counts and subtotal.
2. **Global Mobile Tab Bar**:
   - Pushes header tabs to a sticky bottom navigation bar on mobile/tablet screens.
   - Clears the header to prevent text overflow and overlapping logo elements.
3. **Responsive Grids & Lists**:
   - Management widgets auto-wrap vertically on narrow screens.
   - Orders lists hide secondary information (time, customer name) on mobile to fit the row.

---

## 📸 Screenshots Overview

<details open>
<summary><b>🔐 Authentication Portal</b></summary>
<br>

| 🔑 Login Portal | 📝 User Signup & Registration |
|:---:|:---:|
| <img src="screenshots/01_login.png" width="100%" alt="Login Portal"/> | <img src="screenshots/02_signup.png" width="100%" alt="Signup Portal"/> |
| Central login interface routing employees to cashier POS terminal and admins to backend panel. | Form for registering new users; automatically defaults to EMPLOYEE role. |

</details>

<details open>
<summary><b>🛒 Cashier POS Terminal Flow</b></summary>
<br>

| 1️⃣ Table Selection & Occupancy | 2️⃣ POS Empty Dashboard |
|:---:|:---:|
| <img src="screenshots/03_table_selection.png" width="100%" alt="Table Selection"/> | <img src="screenshots/04_pos_empty.png" width="100%" alt="POS Empty"/> |
| Live floor map updating table status in real time via Socket.IO. | Clean slate cashier view with color-coded categories. |
| **3️⃣ Active Cart with Taxes** | **4️⃣ Stacking Coupons & Auto-Promos** |
| <img src="screenshots/05_pos_with_cart.png" width="100%" alt="Active Cart"/> | <img src="screenshots/06_pos_coupon.png" width="100%" alt="Coupon Applied"/> |
| Products grid with inline tax percentages and per-rate line item summaries. | Dynamic calculation with auto-applied promotion rules. |
| **5️⃣ Direct Kitchen Dispatch** | **6️⃣ Smart Checkout & Payment Modal** |
| <img src="screenshots/07_kitchen_sent.png" width="100%" alt="Kitchen Sent"/> | <img src="screenshots/08_payment_modal.png" width="100%" alt="Payment Modal"/> |
| Pushing order to KDS instantly with auditory alert. | Cash, Card, or dynamic UPI QR generation. |

</details>

<details open>
<summary><b>🍳 Kitchen Display System (KDS)</b></summary>
<br>

| ⏰ Real-time Kanban Board | 🍳 Preparing Tickets |
|:---:|:---:|
| <img src="screenshots/09_kitchen_display.png" width="100%" alt="KDS Incoming"/> | <img src="screenshots/10_kitchen_preparing.png" width="100%" alt="KDS Preparing"/> |
| Color-coded ticketing column board sorting orders based on wait duration. | Preparing state with interactive checkable items. |

</details>

<details open>
<summary><b>📊 Admin Backend Panel</b></summary>
<br>

| 🏠 Admin Dashboard Analytics | 📦 Products & Tax Config |
|:---:|:---:|
| <img src="screenshots/11_admin_dashboard.png" width="100%" alt="Dashboard"/> | <img src="screenshots/12_admin_products.png" width="100%" alt="Products"/> |
| Recharts-driven sales metrics, revenue curves, and category donut chart. | CRUD control panel managing product prices, descriptions, and tax rates. |
| **🎨 Categories Management** | **💳 Payment Methods Setup** |
| <img src="screenshots/13_admin_categories.png" width="100%" alt="Categories"/> | <img src="screenshots/14_admin_payment_methods.png" width="100%" alt="Payment Methods"/> |
| Color-coded tag groups mapped directly to POS tabs. | Enable cash/card or assign a custom UPI alias/address. |
| **🪑 Floor Plans & Table Layout** | **🎫 Coupons & Promotions Editor** |
| <img src="screenshots/15_admin_tables.png" width="100%" alt="Tables"/> | <img src="screenshots/16_admin_coupons.png" width="100%" alt="Coupons"/> |
| Customize floor labels and table coordinates. | Setup flat or percentage discount triggers. |
| **👥 User & Role Administration** | **📑 Financial Reports & CSV Export** |
| <img src="screenshots/17_admin_users.png" width="100%" alt="Users"/> | <img src="screenshots/18_admin_reports.png" width="100%" alt="Reports"/> |
| Manage access credentials and toggle user activity. | View sales logs and download analytical archives. |

</details>



## Feature Reference

### POS Terminal (Employee Role)
| Feature | Description |
|---|---|
| Floor map & table selection | Live floor plan with real-time occupancy status across 3 floors (20 tables) |
| Product grid | Color-coded category tabs (20 categories, 200+ products), search, and quantity controls |
| Per-product tax display | Each cart item shows its own tax rate inline; totals show a breakdown per rate |
| Automatic promotions | Rules evaluated in real time based on cart contents |
| Coupon validation | Code-based discount system with stacking support (10 coupons available) |
| Customer assignment | Link orders to registered customer profiles |
| Kitchen routing | Socket.IO push to KDS on order confirmation |
| Cash payment | Tender entry with auto-calculated change |
| Card payment | Confirmation-based flow |
| UPI payment | Dynamic QR code generated from configured UPI ID |
| Receipt options | Print, email (SMTP), or new order |

### Kitchen Display System (KDS)
| Feature | Description |
|---|---|
| Three-column Kanban | To Cook / Preparing / Completed workflow |
| Live ticket arrival | Socket.IO push; tickets appear without page refresh |
| Per-item checklist | Mark individual items as ready |
| Age-based color coding | Green / yellow / red border based on ticket duration |
| Urgent pulsing border | Animated border for overdue tickets (> 15 min) |
| Audio notification | Sound alert on new order arrival |

### Backend Administration (Admin Role)
| Module | Capabilities |
|---|---|
| Dashboard | Session stats, revenue charts, category breakdown |
| Products | Create, edit, delete, toggle availability; set per-product tax rate |
| Categories | Create, edit, assign color, reorder |
| Payment Methods | Enable/disable, configure UPI QR |
| Tables & Floors | Create floors, add tables, manage occupancy |
| Coupons | Code-based percentage or flat discounts |
| Promotions | Conditional auto-apply rules |
| Users | Role management, account creation and deactivation |
| Reports | Revenue trends, category breakdown, CSV/PDF export |

---

## Demo Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| Admin | admin@cafe.com | Admin@123 | Full backend + POS terminal |
| Admin | meetc8030@gmail.com | Meet@8030 | Full backend + POS terminal |
| Employee | rahul@cafe.com | Rahul@123 | POS terminal only |
| Employee | priya@cafe.com | Priya@123 | POS terminal only |
| Employee | amit@cafe.com | Emp@1234 | POS terminal only |
| Employee | sneha@cafe.com | Emp@1234 | POS terminal only |
| Employee | rohan@cafe.com | Emp@1234 | POS terminal only |

---

## Live Demo URLs

| Page | URL |
|---|---|
| Login / Entry | [odoo-cafe-pos-zeta.vercel.app/login](https://odoo-cafe-pos-zeta.vercel.app/login) |
| POS Terminal | [odoo-cafe-pos-zeta.vercel.app/pos](https://odoo-cafe-pos-zeta.vercel.app/pos) |
| Kitchen Display (KDS) | [odoo-cafe-pos-zeta.vercel.app/kitchen](https://odoo-cafe-pos-zeta.vercel.app/kitchen) |
| Admin Backend Panel | [odoo-cafe-pos-zeta.vercel.app/backend](https://odoo-cafe-pos-zeta.vercel.app/backend) |
| Backend REST API | [odoo-cafe-pos-81do.onrender.com](https://odoo-cafe-pos-81do.onrender.com) |

> Note: The Render backend is on the free tier. The first request after a period of inactivity may take 30–50 seconds while the instance wakes up. Subsequent requests respond normally.

---

## Quick Demo Walkthrough

The following sequence demonstrates the complete order lifecycle from table selection to kitchen completion in under 2 minutes.

1. **Login as Employee**: Go to [odoo-cafe-pos-zeta.vercel.app/login](https://odoo-cafe-pos-zeta.vercel.app/login) and log in with `rahul@cafe.com` / `Rahul@123`. The floor map popup appears automatically.
2. **Select a Table**: Click on an available table (e.g., G3 on Ground Floor) to start an order session.
3. **Build the Order**: Click product cards to add items — Cappuccino (5% tax), Paneer Tikka (10% tax), and a Brownie (5% tax). Observe individual tax rates shown inline on each item, and the split tax breakdown in totals.
4. **Apply a Coupon**: Click the coupon field and enter `WELCOME20`. Click Apply. The 20% discount stacks on top of the auto-promotion. Tax recalculates proportionally.
5. **Send to Kitchen**: Click the Kitchen button. The order is transmitted instantly.
6. **Open the KDS**: In a second browser tab, open [odoo-cafe-pos-zeta.vercel.app/kitchen](https://odoo-cafe-pos-zeta.vercel.app/kitchen). The new ticket appears immediately in the "To Cook" column.
7. **Advance the Ticket**: Click the state button on the ticket to move it to "Preparing".
8. **Process Payment**: Back in the POS terminal, click Charge, select UPI, and scan the generated QR code to complete the transaction.
9. **Check the Dashboard**: Log in as `admin@cafe.com` at [odoo-cafe-pos-zeta.vercel.app/backend](https://odoo-cafe-pos-zeta.vercel.app/backend). Revenue and session counts reflect the completed order.

---

## Tech Stack

| Component | Technology | Version |
|---|---|---|
| Backend runtime | Node.js + Express | 18+ |
| Real-time transport | Socket.IO | v4 |
| ORM | Prisma | v5 |
| Database | PostgreSQL | 14+ |
| Authentication | JWT (access + refresh token rotation) | — |
| Frontend framework | React + Vite | React 18 |
| Styling | Tailwind CSS | v3 |
| State management | Zustand | v4 |
| Data visualization | Recharts | v2 |
| QR code generation | qrcode.react | v3 |
| HTTP client | Axios | v1 |
| Notifications | react-hot-toast | v2 |
| Email | Nodemailer (SMTP) | v6 |

---

## Project Structure

```text
cafe-pos/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Data model: User, Product, Category, Order, Table, Coupon, Promotion
│   │   ├── seed.js                # Seeds admin, demo products, categories, tables, coupons, orders
│   │   └── migrations/            # Prisma migration history
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification, role guards (ADMIN / EMPLOYEE)
│   │   │   └── validate.js        # Request body validation using Zod
│   │   ├── routes/
│   │   │   ├── auth.js            # POST /login, /logout, /refresh
│   │   │   ├── users.js           # CRUD for user accounts
│   │   │   ├── products.js        # CRUD for menu items (includes tax field)
│   │   │   ├── categories.js      # CRUD for product categories
│   │   │   ├── tables.js          # Floor and table management
│   │   │   ├── orders.js          # Order creation, per-product tax calc, status transitions
│   │   │   ├── coupons.js         # Coupon creation and validation
│   │   │   ├── promotions.js      # Conditional promotion rules
│   │   │   ├── paymentMethods.js  # Payment option configuration
│   │   │   ├── payments.js        # Payment recording and receipt generation
│   │   │   ├── reports.js         # Revenue and session aggregations
│   │   │   ├── customers.js       # Customer profile management
│   │   │   ├── sessions.js        # POS session lifecycle
│   │   │   └── kitchen.js         # KDS status transitions
│   │   └── utils/
│   │       ├── promotionEngine.js # Evaluates cart against active promotion rules
│   │       └── emailService.js    # SMTP receipt emails with dynamic tax breakdown
│   ├── bulk_seed.js               # Bulk seeder: 20 categories, 100 products, 10 coupons, 20 tables, 25 orders
│   ├── bulk_seed_products2.js     # Batch 2 seeder: 100 more products across all categories
│   ├── demo_reset.js              # Resets runtime data for demo/hackathon presentations
│   ├── server.js                  # Express app, Socket.IO setup, route mounting
│   └── render.yaml                # Render.com deployment configuration
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js          # Axios instance with base URL, auth headers, refresh interceptor
    │   ├── components/
    │   │   ├── layout/
    │   │   │   └── BackendLayout.jsx  # Admin sidebar, navigation, logout
    │   │   └── ui/                # Shared UI primitives (Badge, Modal, Spinner)
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Signup.jsx
    │   │   ├── pos/
    │   │   │   ├── OrderView.jsx  # Main POS terminal: cart, tax breakdown, payment, receipt
    │   │   │   └── OrdersList.jsx # Order history with dynamic per-rate tax display
    │   │   ├── kitchen/
    │   │   │   └── KitchenDisplay.jsx
    │   │   └── backend/
    │   │       ├── Dashboard.jsx
    │   │       ├── Products.jsx
    │   │       ├── Categories.jsx
    │   │       ├── PaymentMethods.jsx
    │   │       ├── Tables.jsx
    │   │       ├── Coupons.jsx
    │   │       ├── Users.jsx
    │   │       └── Reports.jsx
    │   ├── store/
    │   │   └── authStore.js       # Zustand store: user session, login/logout actions
    │   └── App.jsx                # Route definitions, AdminGuard, AuthGuard, GuestGuard
    └── vercel.json                # Vercel SPA routing config (rewrites all paths to index.html)
```

---

## Local Development Setup

### Prerequisites

- Node.js v18 or higher
- PostgreSQL 14+ (local or cloud instance)
- npm v9+

---

### 1. Clone the Repository

```bash
git clone https://github.com/DEXTERPIRO/Odoo-Cafe-POS.git
cd Odoo-Cafe-POS/cafe-pos
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create and configure environment variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cafe_pos"
JWT_SECRET="your-32-char-access-secret"
JWT_REFRESH_SECRET="your-32-char-refresh-secret"
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
PORT=5000
EMAIL_USER="your-gmail@gmail.com"    # Optional — for email receipts
EMAIL_PASS="your-app-password"        # Optional — Gmail App Password
```

Run database migrations and seed default data:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Start the backend server:

```bash
node server.js
# Server runs on http://localhost:5000
```

---

### 3. Frontend Setup

Open a new terminal window:

```bash
cd frontend
npm install
```

Create a frontend environment file (`.env.local`):

```env
VITE_API_URL=http://localhost:5000/api
```

Start the development server:

```bash
npm run dev
# Frontend runs on http://localhost:5173
```

---

### 4. Access the Application

| URL | Description |
|---|---|
| `http://localhost:5173/login` | Login page |
| `http://localhost:5173/pos` | POS terminal (Employee) |
| `http://localhost:5173/kitchen` | Kitchen Display System |
| `http://localhost:5173/backend` | Admin panel |

---

## Bulk Data Seeding

Two bulk seed scripts are included for populating both local and deployed databases with realistic demo data.

### What gets seeded

| Script | Data Added |
|---|---|
| `bulk_seed.js` | 2 admin accounts, 5 employees, 20 categories, 100 products, 10 coupons, 20 tables (3 floors), 25 orders |
| `bulk_seed_products2.js` | 100 additional products across all existing categories (Batch 2) |

### Run on local database

```bash
cd backend
node bulk_seed.js
node bulk_seed_products2.js
```

### Run on deployed (production) database

```bash
cd backend
DATABASE_URL="your-external-postgres-url" node bulk_seed.js
DATABASE_URL="your-external-postgres-url" node bulk_seed_products2.js
```

> Both scripts are **idempotent** — safe to run multiple times without creating duplicates.

### Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@cafe.com | Admin@123 |
| Admin | meetc8030@gmail.com | Meet@8030 |
| Employee | rahul@cafe.com | Rahul@123 |
| Employee | priya@cafe.com | Priya@123 |
| Employee | amit@cafe.com | Emp@1234 |
| Employee | sneha@cafe.com | Emp@1234 |
| Employee | rohan@cafe.com | Emp@1234 |

### Seeded coupons

| Code | Type | Value |
|---|---|---|
| WELCOME20 | Percentage | 20% off |
| SAVE50 | Fixed | ₹50 off |
| FLAT10 | Percentage | 10% off |
| SAVE10 | Percentage | 10% off |
| MEET20 | Percentage | 20% off |
| HAPPY15 | Percentage | 15% off |
| FLAT100 | Fixed | ₹100 off |
| NEWUSER25 | Percentage | 25% off |
| VIP30 | Percentage | 30% off |
| WEEKEND5 | Percentage | 5% off |

---

## Production Deployment Guide

### Step 1 — Database (Render PostgreSQL or Supabase)

1. Create a PostgreSQL database on [render.com](https://render.com) or [supabase.com](https://supabase.com).
2. Copy the **External Database URL** for running seed scripts locally.
3. Copy the **Internal Database URL** (for Render) or the **pooler connection string** (for Supabase) for the backend service.

---

### Step 2 — Backend (Render.com)

1. Push the repository to GitHub.
2. Go to [render.com](https://render.com) and create a **New Web Service**.
3. Connect the GitHub repo. Set the **Root Directory** to `cafe-pos/backend`.
4. Render detects `render.yaml` automatically. Build command: `npm install && npx prisma generate && npx prisma migrate deploy`. Start command: `node server.js`.
5. Add the following **Environment Variables** in the Render dashboard:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Internal Database URL |
   | `JWT_SECRET` | Random 32+ character string |
   | `JWT_REFRESH_SECRET` | Random 32+ character string |
   | `FRONTEND_URL` | Vercel deployment URL (add after Step 3) |
   | `NODE_ENV` | `production` |
   | `EMAIL_USER` | Gmail address (optional) |
   | `EMAIL_PASS` | Gmail App Password (optional) |

6. After the first successful deploy, seed the database:
   ```bash
   DATABASE_URL="your-external-db-url" node bulk_seed.js
   DATABASE_URL="your-external-db-url" node bulk_seed_products2.js
   ```

---

### Step 3 — Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and create a **New Project**.
2. Import the GitHub repository. Set the **Root Directory** to `cafe-pos/frontend`.
3. Add the following **Environment Variable**:
   - `VITE_API_URL` = `https://[your-render-service].onrender.com/api`
4. Deploy. Vercel uses `vercel.json` to handle SPA routing automatically.
5. Copy the Vercel deployment URL and update `FRONTEND_URL` in the Render dashboard (required for CORS).

---

## Security Architecture

| Mechanism | Implementation |
|---|---|
| Authentication | JWT access tokens (15-minute expiry) + refresh tokens (7-day expiry) stored in httpOnly cookies |
| Token rotation | On refresh, the previous refresh token is invalidated and a new pair is issued |
| Password hashing | Bcrypt with 12 salt rounds |
| HTTP headers | Helmet.js sets security headers (CSP, HSTS, X-Frame-Options, etc.) |
| Rate limiting | express-rate-limit applied to all `/api/auth/*` routes (max 10 requests per 15 minutes) |
| Input validation | Zod schemas validate all request bodies before they reach route handlers |
| Role-based access | Route-level guards enforce ADMIN vs. EMPLOYEE separation; frontend guards redirect unauthorized access |
| CORS policy | Configured to allow only the `FRONTEND_URL` origin in production |

---

## API Endpoints Reference

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Returns access + refresh tokens |
| POST | `/api/auth/logout` | Required | Invalidates refresh token |
| POST | `/api/auth/refresh` | Refresh token | Issues new access + refresh tokens |

### Products
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/products` | Any | List all active products (includes tax field) |
| POST | `/api/products` | Admin | Create a product with name, price, category, tax rate |
| PUT | `/api/products/:id` | Admin | Update a product |
| DELETE | `/api/products/:id` | Admin | Delete a product |

### Orders & Sessions
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/orders` | Employee | Create a new order (tax calculated per product) |
| GET | `/api/orders/kitchen` | Any | Get active kitchen orders |
| PUT | `/api/orders/:id/status` | Any | Update order status (triggers Socket.IO) |
| POST | `/api/sessions` | Employee | Open a POS session |
| PUT | `/api/sessions/:id/close` | Employee | Close session after payment |

### Reports
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/reports/revenue` | Admin | Daily/weekly revenue aggregation |
| GET | `/api/reports/categories` | Admin | Sales volume by category |
| GET | `/api/reports/sessions` | Admin | Session log with totals |

*Additional endpoints exist for Categories, Tables, Coupons, Promotions, Payment Methods, Users, and Customers following the same REST pattern.*

---

## Changelog

### Latest Updates

- **Per-product tax calculation**: Tax is now applied individually per product at its own rate (e.g., 5% on beverages, 10% on food). The bill totals show a separate line for each tax rate. Discounts and coupons scale the tax proportionally.
- **Email receipts**: Dynamic tax breakdown in SMTP email receipts — one row per tax rate instead of a hardcoded flat rate.
- **Bulk seeding**: Added `bulk_seed.js` and `bulk_seed_products2.js` to populate databases with 200+ products, 20 categories, 10 coupons, 20 tables across 3 floors, 25 orders, and 7 user accounts.
- **Extended product catalog**: 200+ menu items across 20 categories (Hot Drinks, Cold Drinks, Burgers, Pizza, Pasta, Rice Bowls, Salads, Soups, Desserts, and more).
- **Multi-floor layout**: 3 floors (Ground, First, Rooftop) with 20 tables total.
- **Additional admin**: `meetc8030@gmail.com` added as a second admin account.

---

*Cafe POS v2.0 — Built with Node.js, Prisma, React, and Socket.IO*
