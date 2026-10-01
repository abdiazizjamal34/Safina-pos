

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import Login from './pages/Login';
import Signup from './pages/Signup';
import WaiterDisplay from './pages/waiter/WaiterDisplay';

import BackendLayout from './components/layout/BackendLayout';
import Dashboard from './pages/backend/Dashboard';
import Products from './pages/backend/Products';
import Categories from './pages/backend/Categories';
import PaymentMethods from './pages/backend/PaymentMethods';
import Tables from './pages/backend/Tables';
import Coupons from './pages/backend/Coupons';
import Users from './pages/backend/Users';
import Reports from './pages/backend/Reports';

import CustomerCredit from './pages/customers/CustomerCredit';

import PosTerminal from './pages/pos/PosTerminal';
import KitchenDisplay from './pages/kitchen/KitchenDisplay';

import {
  BACKEND_ROLES,
  BAR_ROLES,
  KITCHEN_ROLES,
  POS_ROLES,
  ROLES,
  getHomePath,
  hasRole,
} from './constants/access';


/* ── Splash shown while localStorage is being read ───────── */

function HydrationSplash() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FFFDF5',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: '#8B5CF6',
          border: '2px solid #1E293B',
          boxShadow: '4px 4px 0px 0px #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        ☕
      </div>
    </div>
  );
}


/* ── Guards ────────────────────────────────────────────────── */

function RoleGuard({ children, allowedRoles }) {
  const { user, _hydrated } = useAuthStore();

  if (!_hydrated) return <HydrationSplash />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(user, allowedRoles)) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  return children;
}


function AdminGuard({ children }) {
  return (
    <RoleGuard allowedRoles={BACKEND_ROLES}>
      {children}
    </RoleGuard>
  );
}


function AdminOnlyGuard({ children }) {
  return (
    <RoleGuard allowedRoles={[ROLES.ADMIN]}>
      {children}
    </RoleGuard>
  );
}


/*
 * Customer Credit is available to:
 * - ADMIN
 * - MANAGER
 * - CASHIER
 * - WAITER
 */
const CUSTOMER_CREDIT_ROLES = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.CASHIER,
  ROLES.WAITER,
];


/* ── Inventory ─────────────────────────────────────────────── */

function InventoryHome() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFDF5] p-6 text-center font-jakarta">
      <div className="max-w-md rounded-2xl border-2 border-slate-800 bg-white p-8 shadow-pop">
        <h1 className="font-outfit text-2xl font-black text-slate-800">
          Inventory workspace
        </h1>

        <p className="mt-2 text-sm font-semibold text-slate-500">
          Inventory workflows are not available in this frontend yet.
        </p>
      </div>
    </div>
  );
}


/* ── Cashier ───────────────────────────────────────────────── */

function CashierHome() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFDF5] p-6 text-center font-jakarta">
      <div className="max-w-md rounded-2xl border-2 border-slate-800 bg-white p-8 shadow-pop">
        <h1 className="font-outfit text-2xl font-black text-slate-800">
          Cashier workspace
        </h1>

        <p className="mt-2 text-sm font-semibold text-slate-500">
          Open or close POS sessions from the cashier tools when they are enabled.
        </p>
      </div>
    </div>
  );
}


/* ── Guest Guard ───────────────────────────────────────────── */

// Prevents logged-in users from seeing /login or /signup
function GuestGuard({ children }) {
  const { user, _hydrated } = useAuthStore();

  if (!_hydrated) {
    return <HydrationSplash />;
  }

  if (user) {
    if (hasRole(user, BACKEND_ROLES)) {
      return <Navigate to="/backend" replace />;
    }

    return <Navigate to={getHomePath(user.role)} replace />;
  }

  return children;
}


/* ── App ───────────────────────────────────────────────────── */

export default function App() {
  return (
    <BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{ duration: 3000 }}
      />

      <Routes>

        {/* Authentication */}
        <Route
          path="/login"
          element={
            <GuestGuard>
              <Login />
            </GuestGuard>
          }
        />

        <Route
          path="/signup"
          element={
            <GuestGuard>
              <Signup />
            </GuestGuard>
          }
        />

   {/* Public waiter display — no login required */}
<Route path="/waiter-display" element={<WaiterDisplay />} />
        {/* Kitchen */}
        <Route
          path="/kitchen"
          element={
            <RoleGuard allowedRoles={KITCHEN_ROLES}>
              <KitchenDisplay station="KITCHEN" />
            </RoleGuard>
          }
        />


        {/* Bar */}
        <Route
          path="/bar"
          element={
            <RoleGuard allowedRoles={BAR_ROLES}>
              <KitchenDisplay station="BAR" />
            </RoleGuard>
          }
        />


        {/* Cashier */}
        <Route
          path="/cashier"
          element={
            <RoleGuard allowedRoles={[ROLES.CASHIER]}>
              <CashierHome />
            </RoleGuard>
          }
        />


        {/* Inventory */}
        <Route
          path="/inventory"
          element={
            <RoleGuard allowedRoles={[ROLES.INVENTORY]}>
              <InventoryHome />
            </RoleGuard>
          }
        />


        {/* POS */}
        <Route
          path="/pos"
          element={
            <RoleGuard allowedRoles={POS_ROLES}>
              <PosTerminal />
            </RoleGuard>
          }
        />


        {/* Backend */}
        <Route
          path="/backend"
          element={
            <AdminGuard>
              <BackendLayout />
            </AdminGuard>
          }
        >
          <Route index element={<Dashboard />} />

          <Route
            path="products"
            element={
              <AdminOnlyGuard>
                <Products />
              </AdminOnlyGuard>
            }
          />

          <Route
            path="categories"
            element={
              <AdminOnlyGuard>
                <Categories />
              </AdminOnlyGuard>
            }
          />

          <Route
            path="payment-methods"
            element={
              <AdminOnlyGuard>
                <PaymentMethods />
              </AdminOnlyGuard>
            }
          />

          <Route
            path="tables"
            element={
              <AdminOnlyGuard>
                <Tables />
              </AdminOnlyGuard>
            }
          />

          <Route
            path="coupons"
            element={
              <AdminOnlyGuard>
                <Coupons />
              </AdminOnlyGuard>
            }
          />

          <Route
            path="users"
            element={<Users />}
          />

          <Route
            path="reports"
            element={<Reports />}
          />
        </Route>


        {/* Customer Credit
            Accessible by Admin, Manager, Cashier and Waiter
        */}
        <Route
          path="/customers/credit"
          element={
            <RoleGuard allowedRoles={CUSTOMER_CREDIT_ROLES}>
              <CustomerCredit />
            </RoleGuard>
          }
        />


        {/* Default */}
        <Route
          path="/"
          element={
            <GuestGuard>
              <Navigate to="/login" replace />
            </GuestGuard>
          }
        />

      </Routes>

    </BrowserRouter>
  );
}
