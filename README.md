# safina Cafe POS — Full-Stack Point of Sale System

A production-ready, real-time Point of Sale (POS) system designed for cafes and restaurants. Built with Node.js, Express, Prisma ORM, PostgreSQL, React, Vite, and Socket.IO for live, bidirectional communication across all terminals and displays.

---

## Table of Contents

1. [Overview](#overview)
2. [Mobile & Desktop Responsiveness](#mobile--desktop-responsiveness)
3. [Screenshots](#screenshots)
4. [Feature Reference](#feature-reference)
5. [Demo Credentials](#demo-credentials)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [Security Architecture](#security-architecture)
9. [API Endpoints Reference](#api-endpoints-reference)



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

-

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
