import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';
import toast from 'react-hot-toast';
import OrderView from './OrderView';
import OrdersList from './OrdersList';
import CustomerManagement from './CustomerManagement';
import FloorPopup from './FloorPopup';
import SessionSummaryModal from '../../components/ui/SessionSummaryModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  Coffee, Receipt, ClipboardList, UserCircle, LayoutGrid,
  Search, ChefHat, LogOut, Lock, LayoutDashboard,
  UtensilsCrossed, Tag, Ticket, BarChart3, Settings, ChevronRight,
  ShoppingBag, TrendingUp, IndianRupee, Package, Clock, Activity, X
} from 'lucide-react';
import { BACKEND_ROLES, KDS_ROLES, SESSION_ROLES, hasRole } from '../../constants/access';

/* ── session timer ──────────────────────────────── */
function useSessionTimer(openedAt) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!openedAt) { setElapsed(''); return; }
    const tick = () => {
      const ms = Date.now() - new Date(openedAt);
      const totalMins = Math.floor(ms / 60000);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setElapsed(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [openedAt]);
  return elapsed;
}

const FONT_HEADING = "'Outfit', system-ui, sans-serif";
const FONT_BODY    = "'Plus Jakarta Sans', system-ui, sans-serif";
const BG           = '#FFFDF5';
const FG           = '#1E293B';
const ACCENT       = '#8B5CF6';
const AMBER        = '#FBBF24';
const PINK         = '#F472B6';
const EMERALD      = '#34D399';
const MUTED_FG     = '#64748B';
const BORDER       = '#E2E8F0';

const TAB_ACCENTS = {
  order:        ACCENT,
  'orders-list': EMERALD,
  customers:    PINK,
  'table-view': AMBER,
  kitchen:      EMERALD,
  bar:           PINK,
};

export default function PosTerminal() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Restore last active tab from sessionStorage on refresh
  const [currentView, setCurrentView] = useState(
    () => sessionStorage.getItem('pos-active-tab') || 'welcome'
  );

  // Wrapper that persists the tab before setting state
  const setView = (view) => {
    if (view === 'welcome') {
      sessionStorage.removeItem('pos-active-tab');
    } else {
      sessionStorage.setItem('pos-active-tab', view);
    }
    setCurrentView(view);
  };
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [showFloorPopup, setShowFloorPopup] = useState(false);
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [closeLoading, setCloseLoading] = useState(false);
  const [closingSummary, setClosingSummary] = useState(null);
  const [closedSession, setClosedSession] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [dashStats, setDashStats] = useState(null);

  const sessionTimer = useSessionTimer(session?.openedAt);
  const canManageSession = hasRole(user, SESSION_ROLES);

  const [closeCheck, setCloseCheck] = useState(null);
const [closeCheckLoading, setCloseCheckLoading] = useState(false);

  const fetchDashStats = async () => {
    try {
      const data = await api.get('/reports/dashboard?period=today');
      setDashStats(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    const init = async () => {
      setSessionLoading(true);
      try {
        let s = await api.get('/session/current');
        if (!s && canManageSession) s = await api.post('/session/open');
        setSession(s);
      } catch (err) {
        setSession(null);
        toast.error(err?.error || 'Could not load the POS session');
      }
      finally { setSessionLoading(false); }
    };
    init();
  }, [canManageSession]);

  useEffect(() => {
    if (currentView === 'welcome') fetchDashStats();
  }, [currentView]);

  useEffect(() => {
    if (location.state?.loadOrder) {
      const { loadOrder } = location.state;
      setCurrentOrder(loadOrder);
      setSelectedTable(loadOrder.table);
      setCurrentView('order');   // intentionally raw — 'order' tab without a specific item doesn't make sense to persist
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!sessionLoading && !session && !showSummaryModal && canManageSession) {
      toast('No open session. Start one from the session panel.', { icon: '🔒' });
    }
  }, [sessionLoading, session, showSummaryModal, canManageSession]);

  const handleTableSelect = (table, existingOrder = null) => {
    setSelectedTable(table); setCurrentOrder(existingOrder);
    setShowFloorPopup(false); setView('order');
  };
  const handleNoTable = () => {
    setSelectedTable(null); setCurrentOrder(null);
    setShowFloorPopup(false); setView('order');
  };
  const handleLogout = async () => {
    sessionStorage.removeItem('pos-active-tab');
    try { await api.post('/auth/logout'); } catch {}
    logout(); navigate('/login'); toast.success('Logged out');
  };

  // const openCloseConfirm = async () => {
  //   try { const { count } = await api.get('/session/draft-count'); setDraftCount(count); } catch { setDraftCount(0); }
  //   setShowCloseConfirm(true); setMenuOpen(false);
  // };

    const openCloseConfirm = async () => {
  setMenuOpen(false);
  setCloseCheckLoading(true);

  try {
    const result = await api.get('/session/close-check');

    setCloseCheck(result);
    setShowCloseConfirm(true);

  } catch (err) {
    toast.error(
      err?.error ||
      err?.message ||
      'Could not check unfinished orders'
    );
  } finally {
    setCloseCheckLoading(false);
  }
};


  // const handleCloseSession = async () => {
  //   setCloseLoading(true);
  //   try {
  //     await api.post('/session/close');
  //     const summary = await api.get('/reports/dashboard?period=today');
  //     setClosedSession(session); setClosingSummary(summary);
  //     setSession(null); setShowCloseConfirm(false); setShowSummaryModal(true);
  //     sessionStorage.removeItem('pos-active-tab');
  //     toast.success('Session closed');
  //   } catch (err) { toast.error(err.error || 'Failed to close session'); }
  //   finally { setCloseLoading(false); }
  // };
  
const handleCloseSession = async () => {
  // Extra frontend protection
  if (closeCheck?.hasUnfinishedOrders) {
    toast.error(
      'Cannot close session. Please finish all unpaid and kitchen orders first.'
    );
    return;
  }

  setCloseLoading(true);

  try {
    await api.post('/session/close');

    const summary = await api.get(
      '/reports/dashboard?period=today'
    );

    setClosedSession(session);
    setClosingSummary(summary);
    setSession(null);
    setShowCloseConfirm(false);
    setShowSummaryModal(true);

    sessionStorage.removeItem('pos-active-tab');

    toast.success('Session closed');

  } catch (err) {
    toast.error(
      err?.error ||
      err?.message ||
      'Failed to close session'
    );
  } finally {
    setCloseLoading(false);
  }
};

  const handleNewSession = async () => {
    try {
      const s = await api.post('/session/open');
      setSession(s); setClosingSummary(null); setShowFloorPopup(false);
      toast.success('New session started!');
    } catch { toast.error('Failed to start new session'); }
  };

  const tabs = [
    { id: 'order',        label: 'POS Order',   Icon: Receipt },
    { id: 'orders-list',  label: 'Orders',      Icon: ClipboardList },
    { id: 'customers',    label: 'Customers',   Icon: UserCircle },
    { id: 'table-view',   label: 'Table View',  Icon: LayoutGrid },
    ...(hasRole(user, KDS_ROLES) ? [
      { id: 'kitchen', label: 'Kitchen KDS', Icon: ChefHat },
      { id: 'bar', label: 'Bar KDS', Icon: Coffee },
    ] : []),
  ];

  const handleTabChange = (tabId) => {
    if (tabId === 'kitchen' || tabId === 'bar') {
      navigate(tabId === 'bar' ? '/bar' : '/kitchen');
    } else {
      setView(tabId);
    }
    setMenuOpen(false);
  };

  /* ── Loading ── */
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-[#1E293B]"
             style={{ background: ACCENT, boxShadow: '4px 4px 0px 0px #1E293B' }}>
          <Coffee size={28} strokeWidth={2.5} color="#fff" />
        </div>
        <LoadingSpinner size="lg" />
        <p className="text-sm font-semibold" style={{ color: MUTED_FG, fontFamily: FONT_BODY }}>Opening POS session…</p>
      </div>
    );
  }

  if (!session && !showSummaryModal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG, fontFamily: FONT_BODY }}>
        <div className="w-full max-w-md rounded-2xl border-2 border-[#1E293B] bg-white p-8 text-center" style={{ boxShadow: 'var(--pop-shadow)' }}>
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center border-2 border-[#1E293B]" style={{ background: ACCENT, boxShadow: 'var(--pop-shadow-sm)' }}>
            <Lock size={24} color="#fff" />
          </div>
          <h1 className="text-xl font-black text-slate-800 font-outfit">No open POS session</h1>
          <p className="mt-2 text-sm text-slate-500">A cashier, manager, or admin must open a session before orders can be taken.</p>
          <div className="mt-6 flex gap-3">
            {canManageSession && (
              <button onClick={handleNewSession} className="flex-1 rounded-xl border-2 border-[#1E293B] bg-emerald-400 px-4 py-2.5 text-sm font-black text-slate-800" style={{ boxShadow: 'var(--pop-shadow-sm)' }}>
                Open Session
              </button>
            )}
            <button onClick={handleLogout} className="flex-1 rounded-xl border-2 border-[#1E293B] bg-white px-4 py-2.5 text-sm font-black text-slate-800" style={{ boxShadow: 'var(--pop-shadow-sm)' }}>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: BG, fontFamily: FONT_BODY }}>

      {/* ── Top Navigation Bar ─────────────────────────── */}
      <header
        className="px-4 py-2.5 flex items-center gap-3 shrink-0 z-30"
        style={{ background: '#FFFFFF', borderBottom: `2px solid ${BORDER}`, boxShadow: '0 2px 0px 0px #E2E8F0' }}
      >
        <button
          onClick={() => setView('welcome')}
          className="flex items-center gap-2.5 shrink-0 mr-3 hover:opacity-80 transition text-left"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border-2 border-[#1E293B]"
               style={{ background: ACCENT, boxShadow: '3px 3px 0px 0px #1E293B' }}>
            <Coffee size={17} strokeWidth={2.5} color="#fff" />
          </div>
          <div>
            <div className="font-bold leading-none" style={{ fontFamily: FONT_HEADING, color: FG, fontSize: 16 }}>Cafe POS</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: MUTED_FG }}>Terminal</div>
          </div>
        </button>

        {/* Tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {tabs.map(tab => {
            const TabIcon = tab.Icon;
            const active = currentView === tab.id && tab.id !== 'table-view';
            const accent = TAB_ACCENTS[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                style={active
                  ? { background: accent, color: '#fff', border: `2px solid ${FG}`, boxShadow: '3px 3px 0px 0px #1E293B' }
                  : { background: 'transparent', color: MUTED_FG, border: '2px solid transparent' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = FG; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = MUTED_FG; } }}
              >
                <TabIcon size={15} strokeWidth={2.5} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Search */}
        <div className="hidden md:block flex-1 max-w-sm mx-2">
          <div className="relative">
            <Search size={14} strokeWidth={2.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED_FG }} />
            <input
              type="text"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-sm rounded-xl pl-9 pr-9 py-2 focus:outline-none transition"
              style={{ background: '#F8FAFC', border: `2px solid ${BORDER}`, color: FG, fontFamily: FONT_BODY }}
              onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `4px 4px 0px 0px ${ACCENT}`; }}
              onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none'; }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-200/50 rounded-lg transition"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Table chip */}
          <button
            onClick={() => setShowFloorPopup(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={selectedTable
              ? { background: `${AMBER}25`, border: `2px solid ${FG}`, color: FG, boxShadow: '2px 2px 0px 0px #1E293B' }
              : { background: '#F8FAFC', border: `2px solid ${BORDER}`, color: MUTED_FG }}
          >
            <LayoutGrid size={14} strokeWidth={2.5} />
            {selectedTable ? `Table ${selectedTable.tableNumber.toUpperCase()}` : 'No Table'}
          </button>

          {/* Session timer */}
          {session && sessionTimer && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl"
                 style={{ background: `${EMERALD}20`, border: `2px solid ${EMERALD}60` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: EMERALD }} />
              <span className="text-xs font-semibold" style={{ color: '#059669', fontFamily: FONT_BODY }}>Session: {sessionTimer}</span>
            </div>
          )}

          {/* Hamburger for admin navigation */}
          {hasRole(user, BACKEND_ROLES) && (
            <div className="relative">
              <button
                onClick={() => setShowHamburger(!showHamburger)}
                className="p-2 rounded-xl transition-all duration-200"
                style={{ border: `2px solid ${BORDER}`, color: MUTED_FG, background: '#F8FAFC' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = FG; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = MUTED_FG; }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="2" y="4" width="16" height="2" rx="1"/>
                  <rect x="2" y="9" width="16" height="2" rx="1"/>
                  <rect x="2" y="14" width="16" height="2" rx="1"/>
                </svg>
              </button>

              {showHamburger && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowHamburger(false)} />
                  <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl py-2 overflow-hidden"
                       style={{ background: '#fff', border: `2px solid ${BORDER}`, boxShadow: '6px 6px 0px 0px #E2E8F0' }}>
                    <div className="px-4 py-2 border-b" style={{ borderColor: BORDER }}>
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED_FG }}>Navigation</p>
                    </div>
                    {[
                      { path: '/backend',           label: 'Dashboard',      Icon: LayoutDashboard, color: ACCENT },
                      { path: '/backend/products',   label: 'Products',       Icon: UtensilsCrossed, color: PINK },
                      { path: '/backend/categories', label: 'Categories',     Icon: Tag,             color: AMBER },
                      { path: '/backend/tables',     label: 'Floor & Tables', Icon: LayoutGrid,      color: ACCENT },
                      { path: '/backend/coupons',    label: 'Coupons',        Icon: Ticket,          color: PINK },
                      { path: '/backend/reports',    label: 'Reports',        Icon: BarChart3,       color: EMERALD },
                    ].map(({ path, label, Icon: NavIcon, color }) => (
                      <button key={path}
                        onClick={() => { navigate(path); setShowHamburger(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-3 transition-all duration-150"
                        style={{ color: FG }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <NavIcon size={14} strokeWidth={2.5} color={color} />{label}
                      </button>
                    ))}
                    {hasRole(user, KDS_ROLES) && <div className="border-t mt-1" style={{ borderColor: BORDER }}>
                      <button onClick={() => { navigate('/kitchen'); setShowHamburger(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-3 transition"
                        style={{ color: FG }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <ChefHat size={14} strokeWidth={2.5} color={EMERALD} /> Kitchen Display
                      </button>
                      <button onClick={() => { navigate('/bar'); setShowHamburger(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-3 transition"
                        style={{ color: FG }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Coffee size={14} strokeWidth={2.5} color={PINK} /> Bar Display
                      </button>
                    </div>}
                    <div className="border-t mt-1" style={{ borderColor: BORDER }}>
                      <button onClick={openCloseConfirm}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-3 transition"
                        style={{ color: '#D97706' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FFFBEB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Lock size={14} strokeWidth={2.5} /> Close Session
                      </button>
                      <button onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-3 transition"
                        style={{ color: '#EF4444' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <LogOut size={14} strokeWidth={2.5} /> Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center border-2 border-[#1E293B] transition"
              style={{ background: ACCENT, boxShadow: '2px 2px 0px 0px #1E293B', fontFamily: FONT_HEADING }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-56 rounded-2xl z-50 py-2 overflow-hidden"
                     style={{ background: '#fff', border: `2px solid ${BORDER}`, boxShadow: '6px 6px 0px 0px #E2E8F0' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
                    <div className="text-sm font-bold" style={{ color: FG, fontFamily: FONT_HEADING }}>{user?.name}</div>
                    <div className="text-xs" style={{ color: MUTED_FG }}>{user?.role}</div>
                    {session && (
                      <div className="text-xs mt-1 flex items-center gap-1" style={{ color: '#059669' }}>
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Session open · {sessionTimer}
                      </div>
                    )}
                  </div>
                  {hasRole(user, BACKEND_ROLES) && (
                    <button onClick={() => { navigate('/backend'); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition"
                      style={{ color: FG }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Settings size={14} strokeWidth={2.5} color={ACCENT} /> Backend Admin
                    </button>
                  )}
                  {hasRole(user, KDS_ROLES) && <button onClick={() => { navigate('/kitchen'); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition"
                    style={{ color: FG }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <ChefHat size={14} strokeWidth={2.5} color={EMERALD} /> Kitchen Display
                  </button>}
                  {hasRole(user, KDS_ROLES) && <button onClick={() => { navigate('/bar'); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition"
                    style={{ color: FG }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Coffee size={14} strokeWidth={2.5} color={PINK} /> Bar Display
                  </button>}
                  <div className="border-t mt-1" style={{ borderColor: BORDER }} />
                  {canManageSession && <button onClick={openCloseConfirm}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition"
                    style={{ color: '#D97706' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FFFBEB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Lock size={14} strokeWidth={2.5} /> Close Session
                  </button>}
                  <button onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition"
                    style={{ color: '#EF4444' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <LogOut size={14} strokeWidth={2.5} /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Content Area ── */}
      <main className="flex-1 overflow-hidden" style={{ background: BG }}>
        {currentView === 'order' && (
          <OrderView
            table={selectedTable}
            session={session}
            existingOrder={currentOrder}
            initialOrder={currentOrder}
            searchQuery={searchQuery}
            onTableClick={() => setShowFloorPopup(true)}
            onOrderComplete={() => { setSelectedTable(null); setCurrentOrder(null); }}
            onOrderUpdate={(order) => setCurrentOrder(order)}
            allowPayment={['ADMIN', 'MANAGER', 'WAITER'].includes(user?.role)}
          />
        )}
        {currentView === 'orders-list' && <OrdersList session={session} />}
        {currentView === 'customers' && <CustomerManagement />}
        {currentView === 'table-view' && (
          <div className="h-full p-6 overflow-hidden bg-[#FFFDF5]">
            <FloorPopup
              onSelect={handleTableSelect}
              onNoTable={handleNoTable}
              isInline={true}
              session={session}
            />
          </div>
        )}
        {currentView === 'welcome' && (
          <div className="h-full flex flex-col overflow-y-auto" style={{ background: 'var(--brand-bg)' }}>

            {/* ── Welcome Header Card ── */}
            <div
              className="px-8 py-5 flex items-center justify-between shrink-0 border-2 border-[#1E293B] rounded-2xl mx-6 mt-6 bg-white animate-fadeIn"
              style={{ boxShadow: 'var(--pop-shadow)' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center border-2 border-[#1E293B] shrink-0"
                  style={{ background: ACCENT, boxShadow: 'var(--pop-shadow-sm)' }}
                >
                  <Coffee size={20} strokeWidth={2.5} color="#fff" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#1E293B] leading-tight font-outfit">
                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0] || 'Barista'}
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5 font-jakarta">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {session && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-[#1E293B] bg-[#ECFDF5]" style={{ boxShadow: '2px 2px 0px 0px #1E293B' }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-emerald-600 font-outfit">SESSION OPEN</span>
                  {sessionTimer && <span className="text-xs text-slate-500 font-semibold font-jakarta">· {sessionTimer}</span>}
                </div>
              )}
            </div>

            {/* ── Stats Row ── */}
            <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
              {[
                {
                  label: "Today's Orders",
                  value: dashStats?.totalOrders ?? dashStats?.ordersCount ?? '—',
                  icon: Package,
                  color: ACCENT,
                  bg: '#EDE9FE',
                },
                {
                  label: "Today's Revenue",
                  value: (dashStats?.revenue ?? dashStats?.totalRevenue) != null ? `ETB ${Number(dashStats.revenue ?? dashStats.totalRevenue).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—',
                  icon: IndianRupee,
                  color: '#059669',
                  bg: '#D1FAE5',
                },
                {
                  label: 'Avg. Order Value',
                  value: dashStats?.avgOrderValue != null ? `ETB ${Number(dashStats.avgOrderValue).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—',
                  icon: TrendingUp,
                  color: '#D97706',
                  bg: '#FEF3C7',
                },
                {
                  label: 'Session Duration',
                  value: sessionTimer || '—',
                  icon: Clock,
                  color: '#0EA5E9',
                  bg: '#E0F2FE',
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border-2 border-[#1E293B] transition-all duration-200 hover:-translate-y-0.5"
                  style={{ boxShadow: 'var(--pop-shadow-sm)' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center border-2 border-[#1E293B] shrink-0" style={{ background: bg }}>
                    <Icon size={17} strokeWidth={2.5} color={color} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-black truncate font-outfit" style={{ color: '#0F172A', lineHeight: 1.1 }}>{value}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5 truncate font-jakarta" style={{ color: '#94A3B8' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Main 2-column layout ── */}
            <div className="flex-1 px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">

              {/* LEFT: Action Cards (2/3 width) */}
              <div className="lg:col-span-2 flex flex-col gap-4">

                {/* Label */}
                <p className="text-[10px] font-black uppercase tracking-widest font-outfit" style={{ color: '#94A3B8' }}>New Order</p>

                {/* 2 hero cards side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1" style={{ minHeight: 0 }}>

                  {/* Dine-In */}
                  <button
                    onClick={() => setView('table-view')}
                    className="relative overflow-hidden rounded-2xl p-6 text-left group transition-all duration-200 hover:rotate-[-0.5deg] hover:scale-[1.01] active:translate-x-[2px] active:translate-y-[2px] border-2 border-[#1E293B]"
                    style={{
                      background: 'var(--brand-accent)',
                      boxShadow: 'var(--pop-shadow)',
                      minHeight: 180,
                    }}
                  >
                    {/* Pattern fill on background */}
                    <div className="absolute inset-0 opacity-15 dot-grid pointer-events-none" />
                    {/* BG icon */}
                    <div className="absolute -right-3 -bottom-3 opacity-[0.12] pointer-events-none">
                      <LayoutGrid size={110} strokeWidth={1} color="#fff" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                      <div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[#1E293B] mb-4 bg-white" style={{ boxShadow: '2px 2px 0px 0px #1E293B' }}>
                          <LayoutGrid size={18} strokeWidth={2.5} style={{ color: 'var(--brand-accent)' }} />
                        </div>
                        <h3 className="text-lg font-black text-white font-outfit">Dine-In Orders</h3>
                        <p className="text-xs mt-1 leading-relaxed text-violet-100 font-jakarta">Select a table from the floor map and take orders for seated guests.</p>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-black rounded-xl px-3.5 py-2 transition-colors bg-white border-2 border-[#1E293B] text-slate-800" style={{ boxShadow: '2px 2px 0px 0px #1E293B' }}>
                        <span>Open Floor Map</span>
                        <ChevronRight size={13} strokeWidth={3} />
                      </div>
                    </div>
                  </button>

                  {/* Takeaway */}
                  <button
                    onClick={handleNoTable}
                    className="relative overflow-hidden rounded-2xl p-6 text-left group transition-all duration-200 hover:rotate-[0.5deg] hover:scale-[1.01] active:translate-x-[2px] active:translate-y-[2px] border-2 border-[#1E293B]"
                    style={{
                      background: 'var(--brand-quaternary)',
                      boxShadow: 'var(--pop-shadow)',
                      minHeight: 180,
                    }}
                  >
                    <div className="absolute inset-0 opacity-15 dot-grid pointer-events-none" />
                    <div className="absolute -right-3 -bottom-3 opacity-[0.12] pointer-events-none">
                      <ShoppingBag size={110} strokeWidth={1} color="#1E293B" />
                    </div>
                    <div className="relative z-10 flex flex-col justify-between h-full">
                      <div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[#1E293B] mb-4 bg-white" style={{ boxShadow: '2px 2px 0px 0px #1E293B' }}>
                          <ShoppingBag size={18} strokeWidth={2.5} style={{ color: 'var(--brand-quaternary)' }} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 font-outfit">Takeaway / Walk-In</h3>
                        <p className="text-xs mt-1 leading-relaxed text-[#064E3B] font-jakarta">Bill walk-in or phone orders instantly — no table needed.</p>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-black rounded-xl px-3.5 py-2 transition-colors bg-white border-2 border-[#1E293B] text-slate-800" style={{ boxShadow: '2px 2px 0px 0px #1E293B' }}>
                        <span>Start Billing</span>
                        <ChevronRight size={13} strokeWidth={3} />
                      </div>
                    </div>
                  </button>
                </div>

                {/* Label */}
                <p className="text-[10px] font-black uppercase tracking-widest font-outfit" style={{ color: '#94A3B8' }}>Management</p>

                {/* 3 utility cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Active Orders', sub: 'View & complete orders', Icon: ClipboardList, color: '#DB2777', bg: '#FDF2F8', onClick: () => setView('orders-list') },
                    { label: 'Customers', sub: 'Profiles & loyalty', Icon: UserCircle, color: '#2563EB', bg: '#EFF6FF', onClick: () => setView('customers') },
                    { label: 'Kitchen KDS', sub: 'Cook tickets & queue', Icon: ChefHat, color: '#EA580C', bg: '#FFF7ED', onClick: () => navigate('/kitchen') },
                  ].map(({ label, sub, Icon, color, bg, onClick }) => (
                    <button
                      key={label}
                      onClick={onClick}
                      className="bg-white rounded-2xl p-4 text-left group transition-all duration-200 border-2 border-[#1E293B] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
                      style={{ boxShadow: 'var(--pop-shadow-sm)' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--pop-shadow)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--pop-shadow-sm)'; }}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center border-2 border-[#1E293B] mb-2.5 shrink-0" style={{ background: bg }}>
                        <Icon size={17} strokeWidth={2.5} color={color} />
                      </div>
                      <p className="text-sm font-extrabold text-slate-800 font-outfit">{label}</p>
                      <p className="text-[10px] text-slate-400 font-bold font-jakarta mt-0.5 leading-tight">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT: Session Info Panel (1/3 width) */}
              <div className="flex flex-col gap-4">
                <p className="text-[10px] font-black uppercase tracking-widest font-outfit" style={{ color: '#94A3B8' }}>Session Info</p>

                {/* Session card */}
                <div className="bg-white rounded-2xl overflow-hidden flex-1 border-2 border-[#1E293B] flex flex-col" style={{ boxShadow: 'var(--pop-shadow)' }}>
                  {/* Card header */}
                  <div className="px-5 py-4 border-b-2 border-[#1E293B] bg-[#FFFDF5]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center border-2 border-[#1E293B]" style={{ background: ACCENT }}>
                        <Activity size={14} strokeWidth={2.5} color="#fff" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-800 font-outfit">Current Session</p>
                        <p className="text-[10px] font-semibold font-jakarta" style={{ color: '#64748B' }}>POS Terminal · {user?.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Session detail rows */}
                  <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
                    {[
                      { label: 'Operator', value: user?.name || '—' },
                      { label: 'Opened At', value: session?.openedAt ? new Date(session.openedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—' },
                      { label: 'Duration', value: sessionTimer || '—' },
                      { label: 'Orders Today', value: dashStats?.totalOrders ?? dashStats?.ordersCount ?? '—' },
                      { label: 'Revenue Today', value: (dashStats?.revenue ?? dashStats?.totalRevenue) != null ? `ETB ${Number(dashStats.revenue ?? dashStats.totalRevenue).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between pb-1.5 border-b border-slate-100 last:border-0 last:pb-0">
                        <span className="text-xs font-semibold font-jakarta" style={{ color: '#94A3B8' }}>{label}</span>
                        <span className="text-xs font-extrabold text-slate-800 font-outfit">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Status badge */}
                  <div className="px-5 pb-4">
                    <div className="w-full rounded-xl py-2 flex items-center justify-center gap-2 border-2 border-[#1E293B] bg-[#ECFDF5]" style={{ boxShadow: '2px 2px 0px 0px #1E293B' }}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black text-emerald-600 font-outfit">SESSION ACTIVE</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-[#1E293B] px-5 py-4 space-y-2 bg-[#FFFDF5]">
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => navigate('/backend')}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1E293B] bg-white transition hover:-translate-y-0.5 active:translate-y-0.5 font-outfit text-slate-800"
                        style={{ boxShadow: '2px 2px 0px 0px #1E293B' }}
                      >
                        <LayoutDashboard size={14} strokeWidth={2.5} color={ACCENT} /> Backend Dashboard
                      </button>
                    )}
                    {canManageSession && <button
                      onClick={openCloseConfirm}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1E293B] bg-[#FEF3C7] transition hover:-translate-y-0.5 active:translate-y-0.5 font-outfit text-slate-800"
                      style={{ boxShadow: '2px 2px 0px 0px #1E293B' }}
                    >
                      <Lock size={14} strokeWidth={2.5} color="#D97706" /> Close Session
                    </button>}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black border-2 border-[#1E293B] bg-[#FEE2E2] transition hover:-translate-y-0.5 active:translate-y-0.5 font-outfit text-red-700"
                      style={{ boxShadow: '2px 2px 0px 0px #1E293B' }}
                    >
                      <LogOut size={14} strokeWidth={2.5} color="#EF4444" /> Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Global Mobile Tab Bar ── */}
      <nav className="lg:hidden shrink-0 h-16 border-t-2 border-[#1E293B] bg-white flex items-center justify-around z-35 w-full"
           style={{ boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        {tabs.map(tab => {
          const TabIcon = tab.Icon;
          const active = currentView === tab.id;
          const accent = TAB_ACCENTS[tab.id] || ACCENT;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              type="button"
              className="flex-1 h-full flex flex-col items-center justify-center gap-1 font-bold text-[10px] transition-all"
              style={{
                color: active ? accent : MUTED_FG,
                fontFamily: FONT_HEADING,
              }}
            >
              <div className="relative">
                <TabIcon size={18} strokeWidth={active ? 3 : 2.5} />
                {tab.id === 'order' && draftCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-pink-500 text-[9px] font-black text-white flex items-center justify-center border border-slate-800"
                        style={{ boxShadow: '1px 1px 0px 0px #1E293B' }}>
                    {draftCount}
                  </span>
                )}
              </div>
              <span>{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Floor Popup ── */}
      {showFloorPopup && (
        <FloorPopup onSelect={handleTableSelect} onNoTable={handleNoTable} onClose={() => setShowFloorPopup(false)} session={session} />
      )}

      {/* ── Close Session Confirm ── */}
      {/* <ConfirmDialog
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleCloseSession}
        loading={closeLoading}
        title="Close Session?"
        icon={<Lock size={18} strokeWidth={2.5} />}
        confirmLabel="Close Session"
        confirmClass="bg-yellow-500 hover:bg-yellow-600"
        message={
          draftCount > 0
            ? `This will end the current POS session. Note: ${draftCount} draft order${draftCount !== 1 ? 's' : ''} will be abandoned.`
            : 'This will end the current POS session and generate a closing summary.'
        }
      /> */}


      <ConfirmDialog
  isOpen={showCloseConfirm}
  onClose={() => setShowCloseConfirm(false)}
  onConfirm={handleCloseSession}
  loading={closeLoading}
  title={
    closeCheck?.hasUnfinishedOrders
      ? 'Cannot Close Session'
      : 'Close Session?'
  }
  icon={<Lock size={18} strokeWidth={2.5} />}
  confirmLabel={
    closeCheck?.hasUnfinishedOrders
      ? 'Close'
      : 'Close Session'
  }
  confirmClass={
    closeCheck?.hasUnfinishedOrders
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-yellow-500 hover:bg-yellow-600'
  }
  message={
    closeCheck?.hasUnfinishedOrders ? (
      <div className="space-y-2">
        <p className="font-medium text-red-600">
          You cannot close this session yet.
        </p>

        <p>
          There are {closeCheck.unfinishedCount} unfinished order
          {closeCheck.unfinishedCount !== 1 ? 's' : ''}.
          Please complete or cancel them first.
        </p>

        <div className="text-sm space-y-1">
          {closeCheck.draftCount > 0 && (
            <p>
              • {closeCheck.draftCount} draft order
              {closeCheck.draftCount !== 1 ? 's' : ''}
            </p>
          )}

          {closeCheck.kitchenCount > 0 && (
            <p>
              • {closeCheck.kitchenCount} order
              {closeCheck.kitchenCount !== 1 ? 's' : ''} in kitchen
            </p>
          )}

          {closeCheck.readyCount > 0 && (
            <p>
              • {closeCheck.readyCount} ready order
              {closeCheck.readyCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    ) : (
      'All orders are paid or cancelled. Are you sure you want to close this session and generate the closing summary?'
    )
  }
/>

      <SessionSummaryModal
        isOpen={showSummaryModal}
        onClose={handleLogout}
        summary={closingSummary}
        session={closedSession}
      />
    </div>
  );
}
