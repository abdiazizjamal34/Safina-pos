import { useEffect, useMemo, useState } from 'react';
import {
  Search, User, Phone, Mail, Wallet, CreditCard, Calendar,
  FileText, CheckCircle2, Clock, AlertCircle, XCircle,
  ArrowLeft, DollarSign, RefreshCw, History, Banknote,
  Loader2, ChevronRight, Users, TrendingUp, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import LoanPaymentReceiptModal from '../../components/ui/LoanPaymentReceiptModal';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const fmt = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/* ─────────────────────────────────────────────
   Design tokens (POS style)
───────────────────────────────────────────── */
const BG = '#FFFDF5';
const WHITE = '#FFFFFF';
const FG = '#1E293B';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT = '#8B5CF6';
const AMBER = '#FBBF24';
const PINK = '#F472B6';
const EMERALD = '#34D399';
const DANGER = '#EF4444';
const FONT_H = "'Outfit', system-ui, sans-serif";
const FONT_B = "'Plus Jakarta Sans', system-ui, sans-serif";

/* Reusable pop-shadow helpers */
const popSm = '2px 2px 0px 0px #1E293B';
const popMd = '3px 3px 0px 0px #1E293B';
const popLg = '4px 4px 0px 0px #1E293B';

/* ─────────────────────────────────────────────
   Loan status config
───────────────────────────────────────────── */
const loanStatusConfig = {
  PENDING: {
    label: 'Pending',
    icon: Clock,
    bg: '#FEF3C7',
    border: '#FCD34D',
    color: '#B45309',
  },
  PARTIALLY_PAID: {
    label: 'Partial',
    icon: DollarSign,
    bg: '#DBEAFE',
    border: '#93C5FD',
    color: '#1D4ED8',
  },
  PAID: {
    label: 'Paid',
    icon: CheckCircle2,
    bg: '#D1FAE5',
    border: '#6EE7B7',
    color: '#047857',
  },
  OVERDUE: {
    label: 'Overdue',
    icon: AlertCircle,
    bg: '#FEE2E2',
    border: '#FCA5A5',
    color: '#B91C1C',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    bg: '#F1F5F9',
    border: '#CBD5E1',
    color: '#475569',
  },
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function CustomerCredit() {
  /* Customer list state */
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | with-debt | cleared
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingCustomerLoans, setLoadingCustomerLoans] = useState(false);

  /* Payment methods */
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  /* Pay modal */
  const [showPayModal, setShowPayModal] = useState(false);
  const [targetLoan, setTargetLoan] = useState(null); // when paying a specific loan
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paying, setPaying] = useState(false);

  const [showLoanReceipt, setShowLoanReceipt] = useState(false);
const [receiptData, setReceiptData] = useState(null);

  /* ─────────────────────────────────────────
     Load customers
  ───────────────────────────────────────── */
  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const data = await api.get('/customers');
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error(
        error?.error || error?.message || 'Failed to load customers'
      );
    } finally {
      setLoadingCustomers(false);
    }
  };

  /* ─────────────────────────────────────────
     Load customer loans
  ───────────────────────────────────────── */
  const loadCustomerLoans = async (customerId, showLoading = true) => {
    try {
      if (showLoading) setLoadingCustomerLoans(true);
      const data = await api.get(`/loans/customer/${customerId}`);
      setCustomerData(data);

      if (data?.customer) {
        setCustomers((current) =>
          current.map((customer) =>
            customer.id === customerId
              ? { ...customer, ...data.customer }
              : customer
          )
        );
        setSelectedCustomer((current) =>
          current?.id === customerId ? { ...current, ...data.customer } : current
        );
      }
      return data;
    } catch (error) {
      console.error('Failed to load customer loans:', error);
      toast.error(
        error?.error || error?.message || 'Failed to load customer loans'
      );
    } finally {
      if (showLoading) setLoadingCustomerLoans(false);
    }
  };

  /* ─────────────────────────────────────────
     Load payment methods
  ───────────────────────────────────────── */
  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const data = await api.get('/payment-methods');
      const enabledMethods = (Array.isArray(data) ? data : []).filter(
        (m) => m.isEnabled
      );
      setPaymentMethods(enabledMethods);
      if (enabledMethods.length > 0 && !payMethod) {
        setPayMethod(enabledMethods[0].name);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      toast.error(
        error?.error || error?.message || 'Failed to load payment methods'
      );
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadPaymentMethods();
  }, []);

  /* ─────────────────────────────────────────
     Select customer
  ───────────────────────────────────────── */
  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    await loadCustomerLoans(customer.id);
  };

  const handleBack = () => {
    setSelectedCustomer(null);
    setCustomerData(null);
  };

  /* ─────────────────────────────────────────
     Refresh
  ───────────────────────────────────────── */
  const handleRefresh = async () => {
    await loadCustomers();
    if (selectedCustomer) {
      await loadCustomerLoans(selectedCustomer.id, false);
    }
  };

  /* ─────────────────────────────────────────
     Open Pay modal — full customer balance
  ───────────────────────────────────────── */
  const openPayModal = () => {
    if (!selectedCustomer) return;
    const balance = Number(
      customerData?.summary?.totalOutstanding ||
        selectedCustomer.outstandingBalance ||
        0
    );
    if (balance <= 0) {
      toast.error('This customer has no outstanding balance');
      return;
    }
    setTargetLoan(null);
    setPayAmount(balance.toFixed(2));
    setPaymentReference('');
    setPaymentNotes('');
    if (paymentMethods.length > 0 && !payMethod) {
      setPayMethod(paymentMethods[0].name);
    }
    setShowPayModal(true);
  };

  /* ─────────────────────────────────────────
     Open Pay modal — specific loan
  ───────────────────────────────────────── */
  const openPayLoanModal = (loan) => {
    const remaining = Number(loan?.remainingAmount || 0);
    if (remaining <= 0.01) {
      toast.error('This loan is already fully paid');
      return;
    }
    setTargetLoan(loan);
    setPayAmount(remaining.toFixed(2));
    setPaymentReference('');
    setPaymentNotes('');
    if (paymentMethods.length > 0 && !payMethod) {
      setPayMethod(paymentMethods[0].name);
    }
    setShowPayModal(true);
  };

  /* ─────────────────────────────────────────
     Close modal
  ───────────────────────────────────────── */
  const closePayModal = () => {
    if (paying) return;
    setShowPayModal(false);
    setTargetLoan(null);
    setPayAmount('');
    setPaymentReference('');
    setPaymentNotes('');
  };

  /* ─────────────────────────────────────────
     Pay debt (either total or specific loan)
  ───────────────────────────────────────── */
  const handlePayDebt = async (event) => {
    event.preventDefault();
    if (!selectedCustomer) return;

    const amount = Number(payAmount);

    const outstanding = targetLoan
      ? Number(targetLoan.remainingAmount)
      : Number(
          customerData?.summary?.totalOutstanding ||
            selectedCustomer.outstandingBalance ||
            0
        );

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (amount > outstanding + 0.01) {
      toast.error(
        `Payment cannot exceed ${fmt(outstanding)}`
      );
      return;
    }
    if (!payMethod) {
      toast.error('Please select a payment method');
      return;
    }

    try {
      setPaying(true);
    //   await api.post(`/loans/customer/${selectedCustomer.id}/pay`, {
    //     amount,
    //     paymentMethod: payMethod,
    //     paymentReference: paymentReference.trim() || null,
    //     notes: paymentNotes.trim() || null,
    //   });

    //   toast.success(`Payment of ${fmt(amount)} recorded successfully`);

    //   setShowPayModal(false);
    //   setTargetLoan(null);
    //   setPayAmount('');
    //   setPaymentReference('');
    //   setPaymentNotes('');

    //   await loadCustomers();
    //   await loadCustomerLoans(selectedCustomer.id, false);
    
const response = await api.post(
  `/loans/customer/${selectedCustomer.id}/pay`,
  {
    amount,
    paymentMethod: payMethod,
    paymentReference: paymentReference.trim() || null,
    notes: paymentNotes.trim() || null,
  }
);

toast.success(`Payment of ${fmt(amount)} recorded successfully`);

// 👇 NEW: Build receipt data from the response
setReceiptData({
  payment: {
    id: response?.allocations?.[0]?.paymentId || null,
    amount,
    paymentMethod: payMethod,
    paymentReference: paymentReference.trim() || null,
    notes: paymentNotes.trim() || null,
    createdAt: new Date().toISOString(),
  },
  customer: response?.customer || selectedCustomer,
  allocations: response?.allocations || [],
  summary: response?.summary || {},
});

// Close the pay modal, then show the receipt modal
setShowPayModal(false);
setTargetLoan(null);
setPayAmount('');
setPaymentReference('');
setPaymentNotes('');

// Show receipt AFTER modal closes — helps with stacking
setTimeout(() => {
  setShowLoanReceipt(true);
}, 150);

await loadCustomers();
await loadCustomerLoans(selectedCustomer.id, false);

} catch (error) {
      console.error('Failed to pay customer debt:', error);
      toast.error(
        error?.error || error?.message || 'Failed to record payment'
      );
    } finally {
      setPaying(false);
    }
  };

  /* ─────────────────────────────────────────
     Computed — filtered customers
  ───────────────────────────────────────── */
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = customers;

    if (filter === 'with-debt') {
      list = list.filter((c) => Number(c.outstandingBalance || 0) > 0.01);
    } else if (filter === 'cleared') {
      list = list.filter((c) => Number(c.outstandingBalance || 0) <= 0.01);
    }

    if (q) {
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, search, filter]);

  /* ─────────────────────────────────────────
     Computed — grand totals
  ───────────────────────────────────────── */
  const grandTotalOutstanding = useMemo(() => {
    return customers.reduce(
      (sum, c) => sum + Number(c.outstandingBalance || 0),
      0
    );
  }, [customers]);

  const customersWithDebt = useMemo(
    () => customers.filter((c) => Number(c.outstandingBalance || 0) > 0.01).length,
    [customers]
  );

  /* ─────────────────────────────────────────
     Selected customer computed values
  ───────────────────────────────────────── */
  const outstanding = Number(
    customerData?.summary?.totalOutstanding ||
      selectedCustomer?.outstandingBalance ||
      0
  );
  const totalBorrowed = Number(customerData?.summary?.totalBorrowed || 0);
  const totalPaid = Number(customerData?.summary?.totalPaid || 0);
  const openLoans = Number(customerData?.summary?.openLoans || 0);
  const loans = customerData?.loans || [];

  /* ═════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════ */
  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: BG, fontFamily: FONT_B }}
    >
      {/* ─────────────────────────────────────
          HEADER + GRAND TOTALS
      ───────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-3 space-y-3">
        {/* Title bar */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1
              className="text-xl font-black leading-tight"
              style={{ color: FG, fontFamily: FONT_H }}
            >
              Customer Credit
            </h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>
              Loans, balances & repayments
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loadingCustomers || loadingCustomerLoans}
            className="h-10 px-3.5 rounded-xl flex items-center gap-2 text-xs font-black transition-all border-2 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0.5"
            style={{
              background: WHITE,
              color: FG,
              borderColor: FG,
              boxShadow: popSm,
              fontFamily: FONT_H,
            }}
          >
            <RefreshCw
              size={14}
              strokeWidth={2.5}
              className={
                loadingCustomers || loadingCustomerLoans ? 'animate-spin' : ''
              }
            />
            Refresh
          </button>
        </div>

        {/* Grand total cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Total outstanding */}
          <div
            className="rounded-xl p-3 border-2"
            style={{
              background: WHITE,
              borderColor: FG,
              boxShadow: popMd,
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center border-2"
                style={{
                  background: '#FEE2E2',
                  borderColor: FG,
                }}
              >
                <Wallet size={13} strokeWidth={2.5} color={DANGER} />
              </div>
              <span
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: MUTED, fontFamily: FONT_H }}
              >
                Total Outstanding
              </span>
            </div>
            <div
              className="text-lg font-black leading-none"
              style={{ color: DANGER, fontFamily: FONT_H }}
            >
              ETB {fmt(grandTotalOutstanding)}
            </div>
          </div>

          {/* Customers with debt */}
          <div
            className="rounded-xl p-3 border-2"
            style={{
              background: WHITE,
              borderColor: FG,
              boxShadow: popMd,
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center border-2"
                style={{ background: '#EDE9FE', borderColor: FG }}
              >
                <Users size={13} strokeWidth={2.5} color={ACCENT} />
              </div>
              <span
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: MUTED, fontFamily: FONT_H }}
              >
                Customers w/ Debt
              </span>
            </div>
            <div
              className="text-lg font-black leading-none"
              style={{ color: FG, fontFamily: FONT_H }}
            >
              {customersWithDebt} / {customers.length}
            </div>
          </div>

          {/* Filter tabs */}
          <div
            className="col-span-2 sm:col-span-1 rounded-xl p-1 border-2 flex gap-1"
            style={{
              background: WHITE,
              borderColor: FG,
              boxShadow: popMd,
            }}
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'with-debt', label: 'With Debt' },
              { id: 'cleared', label: 'Cleared' },
            ].map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all"
                  style={
                    active
                      ? {
                          background: ACCENT,
                          color: '#fff',
                          fontFamily: FONT_H,
                        }
                      : {
                          background: 'transparent',
                          color: MUTED,
                          fontFamily: FONT_H,
                        }
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────
          BODY (scrollable)
      ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">

        {/* ═══ CUSTOMER LIST ═══ */}
        {!selectedCustomer && (
          <div
            className="rounded-2xl border-2 overflow-hidden"
            style={{
              background: WHITE,
              borderColor: FG,
              boxShadow: popLg,
            }}
          >
            {/* Search */}
            <div
              className="p-3 border-b-2"
              style={{ borderColor: BORDER, background: '#FFFDF5' }}
            >
              <div className="relative">
                <Search
                  size={15}
                  strokeWidth={2.5}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: MUTED }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, phone, or email…"
                  className="w-full rounded-xl py-2.5 pl-10 pr-10 text-sm font-semibold outline-none border-2 transition focus:shadow-[3px_3px_0px_0px_#8B5CF6]"
                  style={{
                    background: WHITE,
                    borderColor: FG,
                    color: FG,
                    fontFamily: FONT_B,
                  }}
                />
              </div>
            </div>

            {/* Loading */}
            {loadingCustomers ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 size={30} className="animate-spin" style={{ color: MUTED }} />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 border-2"
                  style={{ background: WHITE, borderColor: BORDER }}
                >
                  <User size={28} strokeWidth={2} style={{ color: MUTED }} />
                </div>
                <h3 className="font-black text-sm" style={{ color: FG, fontFamily: FONT_H }}>
                  No customers found
                </h3>
                <p className="mt-1 text-xs" style={{ color: MUTED }}>
                  Try another filter or search.
                </p>
              </div>
            ) : (
              <div className="divide-y-2" style={{ borderColor: BORDER }}>
                {filteredCustomers.map((customer) => {
                  const balance = Number(customer.outstandingBalance || 0);
                  const hasDebt = balance > 0.01;
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 transition hover:bg-[#FAF5FF]"
                    >
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border-2 font-black text-sm"
                        style={{
                          background: hasDebt ? '#FEE2E2' : '#D1FAE5',
                          borderColor: FG,
                          color: hasDebt ? DANGER : '#047857',
                          fontFamily: FONT_H,
                        }}
                      >
                        {customer.name?.[0]?.toUpperCase() || '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className="font-bold text-sm truncate"
                            style={{ color: FG, fontFamily: FONT_H }}
                          >
                            {customer.name}
                          </p>
                          {hasDebt && (
                            <span
                              className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase border"
                              style={{
                                background: '#FEE2E2',
                                borderColor: '#FCA5A5',
                                color: DANGER,
                                fontFamily: FONT_H,
                              }}
                            >
                              Owes
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] mt-0.5 truncate" style={{ color: MUTED }}>
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={10} /> {customer.phone}
                            </span>
                          )}
                          {customer.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail size={10} /> {customer.email}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="shrink-0 text-right">
                        <div
                          className="font-black text-sm"
                          style={{
                            color: hasDebt ? DANGER : '#059669',
                            fontFamily: FONT_H,
                          }}
                        >
                          ETB {fmt(balance)}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: MUTED }}>
                          {hasDebt ? 'Outstanding' : 'Cleared'}
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight size={18} strokeWidth={2.5} style={{ color: MUTED }} className="shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ CUSTOMER DETAILS ═══ */}
        {selectedCustomer && (
          <div className="space-y-3">
            {/* Back */}
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-xs font-black transition hover:-translate-x-0.5"
              style={{ color: FG, fontFamily: FONT_H }}
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              Back to customers
            </button>

            {loadingCustomerLoans ? (
              <div
                className="flex min-h-[400px] items-center justify-center rounded-2xl border-2"
                style={{ background: WHITE, borderColor: FG, boxShadow: popLg }}
              >
                <div className="text-center">
                  <Loader2 size={32} className="mx-auto animate-spin" style={{ color: ACCENT }} />
                  <p className="mt-3 text-sm font-semibold" style={{ color: MUTED }}>
                    Loading customer credit…
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* CUSTOMER HEADER CARD */}
                <div
                  className="rounded-2xl p-4 border-2"
                  style={{
                    background: WHITE,
                    borderColor: FG,
                    boxShadow: popLg,
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border-2 font-black text-xl"
                        style={{
                          background: outstanding > 0 ? '#FEE2E2' : '#D1FAE5',
                          borderColor: FG,
                          color: outstanding > 0 ? DANGER : '#047857',
                          fontFamily: FONT_H,
                          boxShadow: popSm,
                        }}
                      >
                        {(customerData?.customer?.name || selectedCustomer.name)?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2
                          className="text-lg font-black leading-tight truncate"
                          style={{ color: FG, fontFamily: FONT_H }}
                        >
                          {customerData?.customer?.name || selectedCustomer.name}
                        </h2>
                        <div
                          className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mt-1"
                          style={{ color: MUTED }}
                        >
                          {(customerData?.customer?.phone || selectedCustomer.phone) && (
                            <span className="flex items-center gap-1">
                              <Phone size={10} />
                              {customerData?.customer?.phone || selectedCustomer.phone}
                            </span>
                          )}
                          {(customerData?.customer?.email || selectedCustomer.email) && (
                            <span className="flex items-center gap-1">
                              <Mail size={10} />
                              {customerData?.customer?.email || selectedCustomer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={openPayModal}
                      disabled={outstanding <= 0}
                      className="h-11 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-black border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0.5"
                      style={{
                        background: ACCENT,
                        color: '#fff',
                        borderColor: FG,
                        boxShadow: popMd,
                        fontFamily: FONT_H,
                      }}
                    >
                      <Wallet size={16} strokeWidth={2.5} />
                      Pay Debt
                    </button>
                  </div>
                </div>

                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Outstanding */}
                  <div
                    className="rounded-2xl p-3 border-2"
                    style={{
                      background: WHITE,
                      borderColor: FG,
                      boxShadow: popMd,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-black uppercase tracking-wider"
                        style={{ color: MUTED, fontFamily: FONT_H }}
                      >
                        Outstanding
                      </span>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center border-2"
                        style={{ background: '#FEE2E2', borderColor: FG }}
                      >
                        <Wallet size={13} strokeWidth={2.5} color={DANGER} />
                      </div>
                    </div>
                    <div
                      className="text-lg font-black leading-none"
                      style={{ color: DANGER, fontFamily: FONT_H }}
                    >
                      ETB {fmt(outstanding)}
                    </div>
                    <div className="text-[10px] font-semibold mt-1" style={{ color: MUTED }}>
                      Current debt
                    </div>
                  </div>

                  {/* Borrowed */}
                  <div
                    className="rounded-2xl p-3 border-2"
                    style={{
                      background: WHITE,
                      borderColor: FG,
                      boxShadow: popMd,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-black uppercase tracking-wider"
                        style={{ color: MUTED, fontFamily: FONT_H }}
                      >
                        Borrowed
                      </span>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center border-2"
                        style={{ background: '#EDE9FE', borderColor: FG }}
                      >
                        <TrendingUp size={13} strokeWidth={2.5} color={ACCENT} />
                      </div>
                    </div>
                    <div
                      className="text-lg font-black leading-none"
                      style={{ color: FG, fontFamily: FONT_H }}
                    >
                      ETB {fmt(totalBorrowed)}
                    </div>
                    <div className="text-[10px] font-semibold mt-1" style={{ color: MUTED }}>
                      Lifetime credit
                    </div>
                  </div>

                  {/* Paid */}
                  <div
                    className="rounded-2xl p-3 border-2"
                    style={{
                      background: WHITE,
                      borderColor: FG,
                      boxShadow: popMd,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-black uppercase tracking-wider"
                        style={{ color: MUTED, fontFamily: FONT_H }}
                      >
                        Paid
                      </span>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center border-2"
                        style={{ background: '#D1FAE5', borderColor: FG }}
                      >
                        <CheckCircle2 size={13} strokeWidth={2.5} color="#059669" />
                      </div>
                    </div>
                    <div
                      className="text-lg font-black leading-none"
                      style={{ color: '#059669', fontFamily: FONT_H }}
                    >
                      ETB {fmt(totalPaid)}
                    </div>
                    <div className="text-[10px] font-semibold mt-1" style={{ color: MUTED }}>
                      Repaid to date
                    </div>
                  </div>

                  {/* Open loans */}
                  <div
                    className="rounded-2xl p-3 border-2"
                    style={{
                      background: WHITE,
                      borderColor: FG,
                      boxShadow: popMd,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-black uppercase tracking-wider"
                        style={{ color: MUTED, fontFamily: FONT_H }}
                      >
                        Open Loans
                      </span>
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center border-2"
                        style={{ background: '#FEF3C7', borderColor: FG }}
                      >
                        <FileText size={13} strokeWidth={2.5} color="#B45309" />
                      </div>
                    </div>
                    <div
                      className="text-lg font-black leading-none"
                      style={{ color: FG, fontFamily: FONT_H }}
                    >
                      {openLoans}
                    </div>
                    <div className="text-[10px] font-semibold mt-1" style={{ color: MUTED }}>
                      Unpaid credit orders
                    </div>
                  </div>
                </div>

                {/* LOAN HISTORY */}
                <div
                  className="rounded-2xl border-2 overflow-hidden"
                  style={{
                    background: WHITE,
                    borderColor: FG,
                    boxShadow: popLg,
                  }}
                >
                  <div
                    className="flex items-center justify-between p-4 border-b-2"
                    style={{ borderColor: BORDER, background: '#FFFDF5' }}
                  >
                    <div className="flex items-center gap-2">
                      <History size={16} strokeWidth={2.5} color={ACCENT} />
                      <div>
                        <h3
                          className="font-black text-sm leading-tight"
                          style={{ color: FG, fontFamily: FONT_H }}
                        >
                          Loan History
                        </h3>
                        <p className="text-[10px] font-semibold" style={{ color: MUTED }}>
                          Credit and repayment log
                        </p>
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black border-2"
                      style={{
                        background: WHITE,
                        borderColor: FG,
                        color: FG,
                        fontFamily: FONT_H,
                      }}
                    >
                      {loans.length} loan{loans.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {loans.length === 0 ? (
                    <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 border-2"
                        style={{ background: '#D1FAE5', borderColor: FG }}
                      >
                        <CheckCircle2 size={28} strokeWidth={2.5} color="#047857" />
                      </div>
                      <h3
                        className="font-black text-sm"
                        style={{ color: FG, fontFamily: FONT_H }}
                      >
                        No loan history
                      </h3>
                      <p className="mt-1 text-xs" style={{ color: MUTED }}>
                        This customer has no credit orders yet.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y-2" style={{ borderColor: BORDER }}>
                      {loans.map((loan) => {
                        const config =
                          loanStatusConfig[loan.status] || loanStatusConfig.PENDING;
                        const StatusIcon = config.icon;
                        const remaining = Number(loan.remainingAmount || 0);
                        const canPay = remaining > 0.01;
                        const isOverdue =
                          loan.status === 'OVERDUE' ||
                          (loan.dueDate &&
                            new Date(loan.dueDate) < new Date() &&
                            remaining > 0.01);

                        return (
                          <div key={loan.id} className="p-4">
                            <div className="flex flex-col gap-3">
                              {/* Top row: order + status */}
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div
                                    className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border-2"
                                    style={{
                                      background: isOverdue ? '#FEE2E2' : '#F1F5F9',
                                      borderColor: FG,
                                    }}
                                  >
                                    <FileText
                                      size={16}
                                      strokeWidth={2.5}
                                      color={isOverdue ? DANGER : MUTED}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className="font-black text-sm leading-tight truncate"
                                      style={{ color: FG, fontFamily: FONT_H }}
                                    >
                                      Order #{loan.order?.orderNumber || loan.orderId}
                                    </p>
                                    <div
                                      className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-semibold mt-1"
                                      style={{ color: MUTED }}
                                    >
                                      <span className="flex items-center gap-1">
                                        <Calendar size={10} />
                                        {formatDate(loan.createdAt)}
                                      </span>
                                      {loan.dueDate && (
                                        <span
                                          style={{
                                            color: isOverdue ? DANGER : MUTED,
                                            fontWeight: isOverdue ? 900 : 600,
                                          }}
                                        >
                                          Due: {formatDate(loan.dueDate)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border-2"
                                    style={{
                                      background: config.bg,
                                      borderColor: config.border,
                                      color: config.color,
                                      fontFamily: FONT_H,
                                    }}
                                  >
                                    <StatusIcon size={11} strokeWidth={2.5} />
                                    {config.label}
                                  </span>

                                  {canPay && (
                                    <button
                                      type="button"
                                      onClick={() => openPayLoanModal(loan)}
                                      className="px-3 py-1.5 rounded-lg text-[10px] font-black border-2 flex items-center gap-1.5 transition hover:-translate-y-0.5 active:translate-y-0.5"
                                      style={{
                                        background: ACCENT,
                                        color: '#fff',
                                        borderColor: FG,
                                        boxShadow: popSm,
                                        fontFamily: FONT_H,
                                      }}
                                    >
                                      <Wallet size={11} strokeWidth={2.5} />
                                      Pay This Loan
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Amounts */}
                              <div className="grid grid-cols-3 gap-2">
                                <div
                                  className="rounded-lg px-2.5 py-2 border-2"
                                  style={{ background: '#FFFDF5', borderColor: BORDER }}
                                >
                                  <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: MUTED }}>
                                    Original
                                  </div>
                                  <div
                                    className="text-xs font-black mt-0.5"
                                    style={{ color: FG, fontFamily: FONT_H }}
                                  >
                                    {fmt(loan.originalAmount)}
                                  </div>
                                </div>
                                <div
                                  className="rounded-lg px-2.5 py-2 border-2"
                                  style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}
                                >
                                  <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: '#047857' }}>
                                    Paid
                                  </div>
                                  <div
                                    className="text-xs font-black mt-0.5"
                                    style={{ color: '#059669', fontFamily: FONT_H }}
                                  >
                                    {fmt(loan.paidAmount)}
                                  </div>
                                </div>
                                <div
                                  className="rounded-lg px-2.5 py-2 border-2"
                                  style={{ background: '#FEF2F2', borderColor: '#FECACA' }}
                                >
                                  <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: DANGER }}>
                                    Remaining
                                  </div>
                                  <div
                                    className="text-xs font-black mt-0.5"
                                    style={{ color: DANGER, fontFamily: FONT_H }}
                                  >
                                    {fmt(loan.remainingAmount)}
                                  </div>
                                </div>
                              </div>

                              {/* Payment history */}
                              {loan.payments?.length > 0 && (
                                <div
                                  className="rounded-lg p-3 border-2"
                                  style={{ background: '#FFFDF5', borderColor: BORDER }}
                                >
                                  <div
                                    className="text-[10px] font-black uppercase tracking-wider mb-2"
                                    style={{ color: MUTED, fontFamily: FONT_H }}
                                  >
                                    Repayment history
                                  </div>
                                  <div className="space-y-1.5">
                                    {loan.payments.map((payment) => (
                                      <div
                                        key={payment.id}
                                        className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 border"
                                        style={{ background: WHITE, borderColor: BORDER }}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div
                                            className="w-6 h-6 rounded-md flex items-center justify-center border"
                                            style={{ background: '#D1FAE5', borderColor: '#6EE7B7' }}
                                          >
                                            <Banknote size={11} strokeWidth={2.5} color="#059669" />
                                          </div>
                                          <div className="min-w-0">
                                            <div
                                              className="text-[11px] font-bold truncate"
                                              style={{ color: FG, fontFamily: FONT_H }}
                                            >
                                              {payment.paymentMethod?.name || 'Payment'}
                                            </div>
                                            <div className="text-[9px] font-semibold" style={{ color: MUTED }}>
                                              {formatDateTime(payment.createdAt)}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div
                                            className="text-xs font-black"
                                            style={{ color: '#059669', fontFamily: FONT_H }}
                                          >
                                            +{fmt(payment.amount)}
                                          </div>
                                          {payment.paymentReference && (
                                            <div className="text-[9px] truncate max-w-[120px]" style={{ color: MUTED }}>
                                              Ref: {payment.paymentReference}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════
          PAY DEBT MODAL
      ═════════════════════════════════════════ */}
      {showPayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          style={{ animation: 'modalIn 0.15s ease-out' }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden border-2"
            style={{
              background: WHITE,
              borderColor: FG,
              boxShadow: popLg,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b-2"
              style={{ borderColor: BORDER, background: '#FFFDF5' }}
            >
              <div>
                <h2
                  className="font-black text-base leading-tight"
                  style={{ color: FG, fontFamily: FONT_H }}
                >
                  {targetLoan ? 'Pay This Loan' : 'Pay Customer Debt'}
                </h2>
                <p className="text-[10px] font-semibold mt-0.5" style={{ color: MUTED }}>
                  {targetLoan
                    ? `Order #${targetLoan.order?.orderNumber || targetLoan.orderId}`
                    : selectedCustomer?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closePayModal}
                disabled={paying}
                className="w-8 h-8 rounded-lg flex items-center justify-center border-2 transition hover:bg-slate-100 disabled:opacity-40"
                style={{ background: WHITE, borderColor: BORDER }}
              >
                <XCircle size={16} strokeWidth={2.5} color={MUTED} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handlePayDebt} className="p-5 space-y-4">
              {/* Outstanding */}
              <div
                className="rounded-xl p-3.5 border-2"
                style={{
                  background: '#FEF2F2',
                  borderColor: '#FECACA',
                }}
              >
                <div
                  className="text-[10px] font-black uppercase tracking-wider"
                  style={{ color: DANGER, fontFamily: FONT_H }}
                >
                  {targetLoan ? 'This Loan Remaining' : 'Outstanding Balance'}
                </div>
                <div
                  className="text-2xl font-black mt-1 leading-none"
                  style={{ color: '#991B1B', fontFamily: FONT_H }}
                >
                  ETB {fmt(
                    targetLoan
                      ? Number(targetLoan.remainingAmount)
                      : outstanding
                  )}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label
                  className="block text-[10px] font-black uppercase tracking-wider mb-1.5"
                  style={{ color: MUTED, fontFamily: FONT_H }}
                >
                  Payment Amount
                </label>
                <div className="relative">
                  <DollarSign
                    size={16}
                    strokeWidth={2.5}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: MUTED }}
                  />
                  <input
                    type="number"
                    min="0.01"
                    max={
                      targetLoan
                        ? Number(targetLoan.remainingAmount)
                        : outstanding
                    }
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={paying}
                    className="w-full rounded-xl py-2.5 pl-10 pr-4 text-lg font-black outline-none border-2 transition focus:shadow-[3px_3px_0px_0px_#8B5CF6] disabled:bg-slate-50"
                    style={{
                      background: WHITE,
                      borderColor: FG,
                      color: FG,
                      fontFamily: FONT_H,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setPayAmount(
                        (targetLoan
                          ? Number(targetLoan.remainingAmount)
                          : outstanding
                        ).toFixed(2)
                      )
                    }
                    disabled={paying}
                    className="text-[10px] font-black uppercase tracking-wider hover:underline"
                    style={{ color: ACCENT, fontFamily: FONT_H }}
                  >
                    Use full amount
                  </button>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label
                  className="block text-[10px] font-black uppercase tracking-wider mb-1.5"
                  style={{ color: MUTED, fontFamily: FONT_H }}
                >
                  Payment Method
                </label>
                {loadingPaymentMethods ? (
                  <div
                    className="flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold"
                    style={{ borderColor: BORDER, color: MUTED }}
                  >
                    <Loader2 size={14} className="animate-spin" />
                    Loading…
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div
                    className="rounded-xl border-2 px-3 py-2.5 text-xs font-bold"
                    style={{ background: '#FEF2F2', borderColor: '#FECACA', color: DANGER }}
                  >
                    No enabled payment methods found
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => {
                      const selected = payMethod === method.name;
                      const isCash = method.name?.toLowerCase().includes('cash');
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPayMethod(method.name)}
                          disabled={paying}
                          className="flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-black transition hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50"
                          style={
                            selected
                              ? {
                                  background: ACCENT,
                                  color: '#fff',
                                  borderColor: FG,
                                  boxShadow: popSm,
                                  fontFamily: FONT_H,
                                }
                              : {
                                  background: WHITE,
                                  color: FG,
                                  borderColor: FG,
                                  fontFamily: FONT_H,
                                }
                          }
                        >
                          {isCash ? (
                            <Banknote size={14} strokeWidth={2.5} />
                          ) : (
                            <CreditCard size={14} strokeWidth={2.5} />
                          )}
                          <span className="truncate">{method.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reference */}
              <div>
                <label
                  className="block text-[10px] font-black uppercase tracking-wider mb-1.5"
                  style={{ color: MUTED, fontFamily: FONT_H }}
                >
                  Reference <span className="font-semibold normal-case" style={{ color: MUTED }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Receipt number, transaction ID…"
                  disabled={paying}
                  className="w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none border-2 transition focus:shadow-[3px_3px_0px_0px_#8B5CF6] disabled:bg-slate-50"
                  style={{
                    background: WHITE,
                    borderColor: FG,
                    color: FG,
                    fontFamily: FONT_B,
                  }}
                />
              </div>

              {/* Notes */}
              <div>
                <label
                  className="block text-[10px] font-black uppercase tracking-wider mb-1.5"
                  style={{ color: MUTED, fontFamily: FONT_H }}
                >
                  Notes <span className="font-semibold normal-case" style={{ color: MUTED }}>(optional)</span>
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  disabled={paying}
                  className="w-full resize-none rounded-xl px-3 py-2 text-sm font-semibold outline-none border-2 transition focus:shadow-[3px_3px_0px_0px_#8B5CF6] disabled:bg-slate-50"
                  style={{
                    background: WHITE,
                    borderColor: FG,
                    color: FG,
                    fontFamily: FONT_B,
                  }}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closePayModal}
                  disabled={paying}
                  className="flex-1 rounded-xl py-2.5 text-sm font-black border-2 transition hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50"
                  style={{
                    background: WHITE,
                    color: FG,
                    borderColor: FG,
                    fontFamily: FONT_H,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    paying ||
                    !payMethod ||
                    Number(payAmount) <= 0 ||
                    Number(payAmount) >
                      (targetLoan
                        ? Number(targetLoan.remainingAmount)
                        : outstanding) +
                        0.01
                  }
                  className="flex-1 rounded-xl py-2.5 text-sm font-black flex items-center justify-center gap-2 border-2 transition hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: ACCENT,
                    color: '#fff',
                    borderColor: FG,
                    boxShadow: popMd,
                    fontFamily: FONT_H,
                  }}
                >
                  {paying ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Wallet size={15} strokeWidth={2.5} />
                      Pay {fmt(Number(payAmount))}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LoanPaymentReceiptModal
  open={showLoanReceipt}
  onClose={() => {
    setShowLoanReceipt(false);
    setReceiptData(null);
  }}
  data={receiptData}
/>
    </div>
  );
}