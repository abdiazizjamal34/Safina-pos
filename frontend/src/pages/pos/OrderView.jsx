
import { useEffect, useState, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../api/client';
import { EDITABLE_ORDER_STATUSES, ORDER_STATUS } from '../../constants/orders';
import toast from 'react-hot-toast';
import {
  Armchair, ShoppingBag, User, Ticket, ChefHat, Search,
  Loader2, CheckCircle2, Wallet, CreditCard, Smartphone,
  Printer, Coins, Sparkles, Coffee, ShoppingCart, AlertTriangle,
  X, Mail, Plus, Check, MapPin, Home, Truck, Package, ClipboardList, RotateCcw
} from 'lucide-react';


/* ─────────────────────────────────────────────────────────
   SMALL HELPERS
───────────────────────────────────────────────────────── */
const fmt = (n) =>
  `ETB ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;

  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('blob:')
  ) {
    return imageUrl;
  }

  return `${SERVER_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};

function Modal({ title, onClose, children, maxW = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className={`bg-white border-2 border-slate-800 rounded-2xl w-full ${maxW} max-h-[90vh] flex flex-col`}
        style={{ boxShadow: 'var(--pop-shadow-lg)', animation: 'modalIn 0.18s ease-out' }}
      >
        <div className="flex items-center justify-between p-5 border-b-2 border-slate-100 bg-white rounded-t-2xl shrink-0">
          <h3 className="text-slate-800 font-bold text-lg font-outfit">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 bg-[#FFFDF5] rounded-b-2xl font-jakarta text-slate-700 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   RECEIPT MODAL
───────────────────────────────────────────────────────── */
function ReceiptModal({ order, onClose, onNewOrder }) {
  const completedOrder = order;
  const [emailInput, setEmailInput] = useState(order?.customers?.[0]?.email || order?.customer?.email || '');
  const [sendingEmail, setSendingEmail] = useState(false);

  const handlePrint = () => {
    const o = completedOrder;
    const lines = (o.lines || [])
      .map(l => {
        const rate = parseFloat(l.product?.tax || 0);
        const lineTax = parseFloat(l.lineTotal || 0) * (rate / 100);
        const taxText = rate > 0 ? `<br/><span style="font-size:10px;color:#555">${rate}% Tax: ETB ${lineTax.toFixed(2)}</span>` : '';
        return `<tr><td>${l.product?.name} &times; ${l.quantity}${taxText}</td><td class="amt">ETB ${Number(l.lineTotal).toFixed(2)}</td></tr>`;
      })
      .join('');
    const discount = parseFloat(o.discountAmount || 0);
    const paymentRows = (o.payments || [])
      .map(p => `<tr><td style="font-size:11px;color:#555">Paid via ${p.paymentMethod} ${p.paymentReference ? `(${p.paymentReference})` : ''}</td><td class="amt" style="font-size:11px;color:#555">ETB ${Number(p.amount).toFixed(2)}</td></tr>`)
      .join('');
    const customerNames = o.customers?.map(c => c.name).join(', ') || o.customer?.name || '';

    // Calculate tax breakdown
    const taxBreakdown = {};
    (o.lines || []).forEach(l => {
      const rate = parseFloat(l.product?.tax || 0);
      const lineTotal = parseFloat(l.lineTotal || 0);
      if (!taxBreakdown[rate]) taxBreakdown[rate] = 0;
      taxBreakdown[rate] += lineTotal * (rate / 100);
    });
    const totalPreTax = Object.values(taxBreakdown).reduce((s, v) => s + v, 0);
    const actualTax = parseFloat(o.taxAmount || 0);
    const scale = totalPreTax > 0 ? (actualTax / totalPreTax) : 0;

    const taxHtmlLines = Object.keys(taxBreakdown).sort((a, b) => parseFloat(a) - parseFloat(b)).map(rateStr => {
      const rate = parseFloat(rateStr);
      const amt = taxBreakdown[rateStr] * scale;
      return `<div class="row"><span>Tax (${rate}%)</span><span>ETB ${amt.toFixed(2)}</span></div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${o.orderNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:13px;color:#000;background:#fff;width:300px;padding:16px}
  h1{text-align:center;font-size:18px;font-weight:bold;margin-bottom:4px}
  .center{text-align:center;font-size:11px;color:#555;margin-bottom:12px}
  .row{display:flex;justify-content:space-between;margin:3px 0;font-size:12px}
  .divider{border-top:1px dashed #999;margin:8px 0}
  table{width:100%;border-collapse:collapse;margin:6px 0}
  td{padding:3px 0;font-size:12px}
  td.amt{text-align:right;white-space:nowrap}
  .total-row{display:flex;justify-content:space-between;font-weight:bold;font-size:15px;margin-top:6px;border-top:2px solid #000;padding-top:6px}
  .footer{text-align:center;font-size:11px;color:#555;margin-top:12px}
  @media print{@page{size:80mm auto;margin:0}body{width:80mm;padding:8px}}
</style></head><body>
  <h1>☕ Safina Cafe & Bakery</h1>
  <div class="center">Thank you for your visit!</div>
  <div class="row"><span>Order #</span><span>${o.orderNumber}</span></div>
  <div class="row"><span>Type</span><span>${o.orderType || (o.table ? 'TABLE' : 'PICKUP')}</span></div>
  ${o.table?.tableNumber ? `<div class="row"><span>Table</span><span>${o.table.tableNumber}</span></div>` : ''}
  ${o.deliveryLocation ? `<div class="row"><span>Location</span><span>${o.deliveryLocation}</span></div>` : ''}
  ${customerNames ? `<div class="row"><span>Customer(s)</span><span>${customerNames}</span></div>` : ''}
  <div class="row"><span>Date</span><span>${new Date(o.createdAt).toLocaleString('en-IN')}</span></div>
  <div class="divider"></div>
  <table>${lines}</table>
  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>ETB ${Number(o.subtotal||0).toFixed(2)}</span></div>
  ${discount > 0 ? `<div class="row"><span>Discount</span><span>-ETB ${discount.toFixed(2)}</span></div>` : ''}
  ${taxHtmlLines}
  <div class="total-row"><span>TOTAL</span><span>ETB ${Number(o.total||0).toFixed(2)}</span></div>
  ${paymentRows ? `<table>${paymentRows}</table>` : ''}
  <div class="footer"> <span>see our website: wwww.safinacafe.com</span></div>
</body></html>`;

    const old = document.getElementById('__receipt_frame__');
    if (old) old.remove();
    const iframe = document.createElement('iframe');
    iframe.id = '__receipt_frame__';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 3000);
    }, 500);
  };

  const handleSendEmail = async () => {
    if (!emailInput) return toast.error('Enter an email address');
    setSendingEmail(true);
    try {
      await api.post(`/orders/${completedOrder.id}/send-receipt`,
        { email: emailInput });
      toast.success(`Receipt sent to ${emailInput}`);
    } catch (err) {
      toast.error(err.error || 'Failed to send email');
    } finally { setSendingEmail(false); }
  };

  return (
    <Modal title="Payment Complete" onClose={onClose} maxW="max-w-lg">

      <div className="text-center mb-6">
        <div className="flex justify-center mb-2">
          <CheckCircle2 className="text-emerald-500 animate-bounce" size={48} />
        </div>
        <div className="text-emerald-600 font-bold text-xl font-outfit">Payment Successful</div>
      </div>

      {/* Receipt body */}
      <div 
        className="bg-white border-2 border-slate-800 rounded-xl p-5 space-y-2 text-sm font-mono text-slate-800"
        style={{ boxShadow: 'var(--pop-shadow-sm)' }}
      >
        <div className="flex items-center justify-center gap-2 text-slate-800 font-bold text-lg mb-3 font-outfit">
          <Coffee size={18} className="text-violet-600" />
          <span>Safina Cafe & Bakery</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Order #</span><span className="text-slate-800 font-bold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Type</span><span className="text-slate-800 font-bold">{order.orderType || (order.table ? 'TABLE' : 'PICKUP')}</span>
        </div>
        {order.table?.tableNumber && (
          <div className="flex justify-between text-slate-500">
            <span>Table</span><span className="text-slate-800 font-bold">{order.table.tableNumber.toUpperCase()}</span>
          </div>
        )}
        {order.deliveryLocation && (
          <div className="flex justify-between text-slate-500 gap-4">
            <span>Location</span><span className="text-slate-800 font-bold text-right truncate max-w-[220px]">{order.deliveryLocation}</span>
          </div>
        )}
        {((order.customers && order.customers.length > 0) || order.customer) && (
          <div className="flex justify-between text-slate-500">
            <span>Customer(s)</span>
            <span className="text-slate-800 font-bold truncate max-w-[180px]">
              {order.customers?.map(c => c.name).join(', ') || order.customer?.name}
            </span>
          </div>
        )}
        <div className="flex justify-between text-slate-500">
          <span>Date</span><span className="text-slate-800 font-bold">{new Date(order.createdAt).toLocaleString('en-IN')}</span>
        </div>
        <div className="border-t border-dashed border-slate-300 my-3" />
        {order.lines?.map(l => {
          const rate = parseFloat(l.product?.tax || 0);
          const lineTax = parseFloat(l.lineTotal || 0) * (rate / 100);
          return (
            <div key={l.id} className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-slate-600 font-semibold">{l.product?.name} × {l.quantity}</span>
                {/* {rate > 0 && (
                  <span className="text-[10px] text-emerald-600 font-medium leading-none mt-0.5">
                    {rate}% Tax (ETB {lineTax.toFixed(2)})
                  </span>
                )} */}
              </div>
              <span className="text-slate-800 font-bold">{fmt(l.lineTotal)}</span>
            </div>
          );
        })}
        <div className="border-t border-dashed border-slate-300 my-3" />
        <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-medium text-slate-800">{fmt(order.subtotal)}</span></div>
        {parseFloat(order.discountAmount) > 0 && (
          <div className="flex justify-between text-emerald-600 font-medium"><span>Discount</span><span>−{fmt(order.discountAmount)}</span></div>
        )}
        {(() => {
          const linesBreakdown = {};
          order.lines?.forEach(l => {
            const rate = parseFloat(l.product?.tax || 0);
            const lineTotal = parseFloat(l.lineTotal || 0);
            if (!linesBreakdown[rate]) linesBreakdown[rate] = 0;
            linesBreakdown[rate] += lineTotal * (rate / 100);
          });
          const totalPreTax = Object.values(linesBreakdown).reduce((s, v) => s + v, 0);
          const actualTax = parseFloat(order.taxAmount || 0);
          const scale = totalPreTax > 0 ? (actualTax / totalPreTax) : 0;

          return Object.keys(linesBreakdown).sort((a, b) => parseFloat(a) - parseFloat(b)).map(rateStr => {
            const rate = parseFloat(rateStr);
            const amt = linesBreakdown[rateStr] * scale;
            return (
              <div key={rate} className="flex justify-between text-slate-500">
                <span>Tax ({rate}%)</span>
                <span className="font-medium text-slate-800">{fmt(amt)}</span>
              </div>
            );
          });
        })()}
        <div className="flex justify-between text-violet-600 font-bold text-base mt-2">
          <span>TOTAL</span><span>{fmt(order.total)}</span>
        </div>
        {order.payments && order.payments.length > 0 && (
          <div className="mt-3 space-y-1 pt-2 border-t border-slate-100 text-xs text-slate-550 font-jakarta">
            <div className="font-bold text-slate-700">Payment Breakdown:</div>
            {order.payments.map((p, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{p.paymentMethod} {p.paymentReference ? `(${p.paymentReference})` : ''}</span>
                <span className="font-bold text-slate-800">{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="text-center text-slate-400 text-xs mt-4">Thank you! Visit again 🙏</div>
      </div>

      <div className="flex gap-4 mt-5 no-print font-outfit">
        <button 
          onClick={handlePrint} 
          className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-800 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5"
          style={{ boxShadow: 'var(--pop-shadow-sm)' }}
        >
          <Printer size={16} /> Print
        </button>
        <button 
          onClick={onNewOrder} 
          className="flex-1 bg-violet-600 hover:bg-violet-700 border-2 border-slate-800 text-white py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5"
          style={{ boxShadow: 'var(--pop-shadow-sm)' }}
        >
          <Plus size={16} /> New Order
        </button>
      </div>

      <div className="flex gap-3 mt-4 no-print font-jakarta">
        <input
          type="email"
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          placeholder="customer@email.com"
          className="flex-1 bg-white border-2 border-slate-300 text-slate-800
                     rounded-xl px-3 py-2 text-sm focus:outline-none
                     focus:border-slate-800 focus:ring-0 transition"
        />
        <button
          onClick={handleSendEmail}
          disabled={sendingEmail}
          className="bg-violet-600 hover:bg-violet-700 text-white border-2 border-slate-800 px-5 py-2
                     rounded-xl text-sm font-bold disabled:opacity-50 transition flex items-center justify-center"
          style={{ boxShadow: 'var(--pop-shadow-sm)' }}
        >
          {sendingEmail ? 'Sending...' : <span className="flex items-center gap-1.5"><Mail size={16} /> Send Receipt</span>}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────
   COUPON MODAL
───────────────────────────────────────────────────────── */
function CouponModal({ onApply, onClose }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleApply = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const coupon = await api.post('/coupons/validate', { code });
      onApply(coupon);
      toast.success(`Coupon "${coupon.code}" applied!`);
      onClose();
    } catch (e) { setErr(e.error || 'Invalid coupon code'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Apply Coupon" onClose={onClose}>
      <form onSubmit={handleApply} className="space-y-4 font-jakarta">
        <input required value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code (e.g. SAVE20)"
          className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-xl px-3 py-2.5 font-mono uppercase focus:outline-none focus:border-slate-800 transition" />
        {err && <div className="text-rose-600 text-sm bg-rose-50 border-2 border-rose-200 rounded-xl px-3 py-2">{err}</div>}
        <div className="flex gap-4 font-outfit">
          <button type="button" onClick={onClose} className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-800 py-2.5 rounded-xl font-bold transition shadow-pop-sm">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 bg-violet-600 hover:bg-violet-700 border-2 border-slate-800 text-white py-2.5 rounded-xl font-bold disabled:opacity-50 transition shadow-pop-sm">
            {loading ? 'Checking…' : 'Apply Coupon'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────
   CUSTOMER MODAL
───────────────────────────────────────────────────────── */
function CustomerModal({ onAssign, onClose }) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '' });
  const [tab, setTab] = useState('search');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const url = search.trim() ? `/customers?search=${search}` : '/customers';
        const res = await api.get(url);
        setCustomers(res || []);
      } catch {}
    };

    if (search.length === 0) {
      fetchCustomers();
      return;
    }

    const t = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(t);
  }, [search]);

  const createAndAssign = async (e) => {
    e.preventDefault();
    try {
      const c = await api.post('/customers', newForm);
      onAssign(c);
    } catch { toast.error('Failed to create customer'); }
  };

  return (
    <Modal title="Assign Customer" onClose={onClose}>
      <div className="flex gap-1 bg-slate-100 border-2 border-slate-800 rounded-xl p-1 mb-4 font-outfit">
        {['search', 'new'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-bold capitalize transition ${tab === t ? 'bg-violet-600 text-white border border-slate-800' : 'text-slate-600 hover:text-slate-800'}`}
            style={{ boxShadow: tab === t ? 'var(--pop-shadow-sm)' : 'none' }}>
            {t === 'search' ? 'Search Existing' : 'Create New'}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <div className="space-y-3 font-jakarta">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-800 transition" />
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {customers.map(c => (
              <button key={c.id} onClick={() => onAssign(c)}
                className="w-full text-left px-3 py-2.5 bg-white border-2 border-slate-200 hover:border-slate-800 rounded-xl transition mb-2"
                style={{ boxShadow: 'var(--pop-shadow-sm)' }}>
                <div className="text-slate-800 text-sm font-bold font-outfit">{c.name}</div>
                <div className="text-slate-500 text-xs mt-0.5">{c.email || c.phone || '—'}</div>
              </button>
            ))}
            {search && customers.length === 0 && <div className="text-slate-500 text-sm text-center py-4">No customers found</div>}
          </div>
        </div>
      )}

      {tab === 'new' && (
        <form onSubmit={createAndAssign} className="space-y-3 font-jakarta">
          <input required value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })}
            placeholder="Full name *"
            className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-800 transition" />
          <input type="email" value={newForm.email} onChange={e => setNewForm({ ...newForm, email: e.target.value })}
            placeholder="Email"
            className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-800 transition" />
          <input value={newForm.phone} onChange={e => setNewForm({ ...newForm, phone: e.target.value })}
            placeholder="Phone"
            className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-800 transition" />
          <div className="flex gap-4 pt-2 font-outfit">
            <button type="button" onClick={onClose} className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-800 py-2 rounded-xl font-bold transition shadow-pop-sm">Cancel</button>
            <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 border-2 border-slate-800 text-white py-2 rounded-xl font-bold transition shadow-pop-sm">Create & Assign</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN: ORDER VIEW
───────────────────────────────────────────────────────── */
export default function OrderView({ table, session, existingOrder, initialOrder, searchQuery, onOrderComplete, onOrderUpdate, onTableClick, allowPayment = false }) {
  /* ── data ── */
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

  const [promotions, setPromotions] = useState([]);
  const [activePromos, setActivePromos] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  /* ── cart ── */
  const [cartItems, setCartItems] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [localSearch, setLocalSearch] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(existingOrder);
  const [mobileTab, setMobileTab] = useState('products');



  /* ── order details ── */
  const [orderType, setOrderType] = useState(
    existingOrder?.orderType || (table ? 'TABLE' : 'PICKUP')
  );
  const [deliveryLocation, setDeliveryLocation] = useState(existingOrder?.deliveryLocation || '');
  const [customerNotes, setCustomerNotes] = useState(existingOrder?.customerNotes || '');
  const [roomNumber, setRoomNumber] = useState(
    existingOrder?.orderType === 'ROOM' && existingOrder?.deliveryLocation
      ? String(existingOrder.deliveryLocation).replace(/^Room\s*/i, '')
      : ''
  );

  const assignCustomer = (c) => {
    setCustomers(prev => {
      if (prev.some(x => x.id === c.id)) return prev;
      return [...prev, c];
    });
  };

  const removeCustomer = (id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  /* ── UI state ── */
  const [showPayment, setShowPayment] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [hideCustomerSuggest, setHideCustomerSuggest] = useState(false);
  const [paidOrder, setPaidOrder] = useState(null);
  const [payMethod, setPayMethod] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [kitchenLoading, setKitchenLoading] = useState(false);
  const saveTimerRef = useRef(null);
  const loadedOrderIdRef = useRef(null);

  /* ── Split Payment state ── */
  const [isSplit, setIsSplit] = useState(false);
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'item'
  const [equalCount, setEqualCount] = useState(2);
  const [paidSplits, setPaidSplits] = useState([]);
  const [activeSplitIdx, setActiveSplitIdx] = useState(null);
  const [itemAssignments, setItemAssignments] = useState({});


  /// payment methods laoding

useEffect(() => {
  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);

      const data = await api.get('/payment-methods');

      const enabledMethods = (Array.isArray(data) ? data : [])
        .filter(method => method.isEnabled);

      setPaymentMethods(enabledMethods);

      // Select the first available method automatically
      if (enabledMethods.length > 0) {
        setPayMethod(enabledMethods[0].name);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);

      toast.error(
        error?.response?.data?.error ||
        'Failed to load payment methods'
      );
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  loadPaymentMethods();
}, []);


  useEffect(() => {
    if (!showPayment) {
      setIsSplit(false);
      setSplitMode('equal');
      setEqualCount(2);
      setPaidSplits([]);
      setActiveSplitIdx(null);
      setItemAssignments({});
    }
  }, [showPayment]);

  const getEqualSplits = () => {
    const share = Math.floor((total / equalCount) * 100) / 100;
    const parts = [];
    let allocated = 0;
    for (let i = 0; i < equalCount; i++) {
      const amt = i === equalCount - 1 ? total - allocated : share;
      allocated += amt;
      parts.push({
        index: i,
        amount: amt,
        paid: paidSplits[i] ? true : false,
        method: paidSplits[i]?.method,
        reference: paidSplits[i]?.reference
      });
    }
    return parts;
  };

  const numGuests = Math.max(2, customers.length);
  const getGuestName = (idx) => {
    if (customers[idx]) return customers[idx].name;
    return `Guest ${idx + 1}`;
  };

  const getAssignedGuest = (itemIdx) => {
    return itemAssignments[itemIdx] ?? 0;
  };

  const getItemSplits = () => {
    const parts = Array.from({ length: numGuests }, (_, g) => ({
      index: g,
      name: getGuestName(g),
      subtotal: 0,
      preDiscountTax: 0,
      discount: 0,
      tax: 0,
      total: 0
    }));

    cartItems.forEach((item, itemIdx) => {
      const guestIdx = getAssignedGuest(itemIdx);
      const itemSubtotal = item.price * item.quantity;
      parts[guestIdx].subtotal += itemSubtotal;
      parts[guestIdx].preDiscountTax += itemSubtotal * (parseFloat(item.tax || 0) / 100);
    });

    let allocatedTotal = 0;
    parts.forEach((part, g) => {
      if (subtotal > 0) {
        const ratio = part.subtotal / subtotal;
        part.discount = totalDiscount * ratio;
        const afterDiscount = Math.max(part.subtotal - part.discount, 0);
        part.tax = part.subtotal > 0 ? part.preDiscountTax * (afterDiscount / part.subtotal) : 0;
        part.total = Math.round((afterDiscount + part.tax) * 100) / 100;
      }
      
      if (g === numGuests - 1) {
        part.total = Math.max(0, Math.round((total - allocatedTotal) * 100) / 100);
      } else {
        allocatedTotal += part.total;
      }

      part.paid = paidSplits[g] ? true : false;
      part.method = paidSplits[g]?.method;
      part.reference = paidSplits[g]?.reference;
    });

    return parts;
  };

  const confirmSplitPayment = (method, reference) => {
    const amt = splitMode === 'equal' ? getEqualSplits()[activeSplitIdx].amount : getItemSplits()[activeSplitIdx].total;
    setPaidSplits(prev => {
      const next = [...prev];
      next[activeSplitIdx] = { amount: amt, method, reference };
      return next;
    });
    setActiveSplitIdx(null);
  };

  const resetSplitPayment = (idx) => {
    setPaidSplits(prev => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const isSplitFullyPaid = () => {
    const parts = splitMode === 'equal' ? getEqualSplits() : getItemSplits();
    return parts.every(p => p.paid || p.amount === 0 || p.total === 0);
  };



  /* ── load master data ── */
  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/categories'),
      api.get('/payment-methods'),
      api.get('/promotions'),
    ]).then(([p, c, pm, pr]) => {
      setProducts(p || []);
      setCategories(c || []);
      setPaymentMethods((pm || []).filter(m => m.isEnabled));
      setPromotions(pr || []);
    }).catch(() => toast.error('Failed to load products'))
      .finally(() => setDataLoading(false));
  }, []);

  /* ── seed cart from existing order / initial order ── */
  useEffect(() => {
    const orderToLoad = initialOrder || existingOrder;
    if (!orderToLoad) {
      loadedOrderIdRef.current = null;
      setCurrentOrder(null);
      setCartItems([]);
      setCoupon(null);
      setCustomers([]);
      setPayMethod(null);
      setCashReceived('');
      setHideCustomerSuggest(false);
      setOrderType(table ? 'TABLE' : 'PICKUP');
      setDeliveryLocation('');
      setCustomerNotes('');
      setRoomNumber('');
      return;
    }

    // Only load if the order ID is different from what we last loaded
    if (orderToLoad.id === loadedOrderIdRef.current) {
      return;
    }
    loadedOrderIdRef.current = orderToLoad.id;
    setCurrentOrder(orderToLoad);
    setOrderType(orderToLoad.orderType || (orderToLoad.tableId || orderToLoad.table ? 'TABLE' : 'PICKUP'));
    setDeliveryLocation(orderToLoad.deliveryLocation || '');
    setCustomerNotes(orderToLoad.customerNotes || '');
    setRoomNumber(
      orderToLoad.orderType === 'ROOM' && orderToLoad.deliveryLocation
        ? String(orderToLoad.deliveryLocation).replace(/^Room\s*/i, '')
        : ''
    );

    if (orderToLoad.cartItems) {
      setCartItems(orderToLoad.cartItems);
      if (Array.isArray(orderToLoad.customers)) {
        setCustomers(orderToLoad.customers);
      } else if (orderToLoad.customer) {
        setCustomers([orderToLoad.customer]);
      } else {
        setCustomers([]);
      }
      if (orderToLoad.couponCode) {
        api.post('/coupons/validate', { code: orderToLoad.couponCode })
          .then(setCoupon)
          .catch(() => {});
      }
    } else if (orderToLoad.lines) {
      setCartItems(orderToLoad.lines.map(l => ({
        productId: l.productId,
        name: l.product?.name,
        imageUrl: l.product?.imageUrl || null,
        price: parseFloat(l.unitPrice),
        quantity: l.quantity,
        color: l.product?.category?.color,
        tax: parseFloat(l.product?.tax || 0),
      })));
      if (Array.isArray(orderToLoad.customers)) {
        setCustomers(orderToLoad.customers);
      } else if (orderToLoad.customer) {
        setCustomers([orderToLoad.customer]);
      } else {
        setCustomers([]);
      }
      if (orderToLoad.couponCode) {
        api.post('/coupons/validate', { code: orderToLoad.couponCode })
          .then(setCoupon)
          .catch(() => {});
      }
    }
  }, [existingOrder, initialOrder]);

  /* ── sync external search ── */
  useEffect(() => { setLocalSearch(searchQuery || ''); }, [searchQuery]);

  /* ─── Promotions check ─── */
  const checkPromotions = (cartItems) => {
    const subtotal = cartItems.reduce((s, i) => s + (i.price || i.unitPrice || 0) * i.quantity, 0);
    const triggered = [];

    promotions.forEach(promo => {
      if (!promo.isActive) return;

      if (promo.applyTo === 'ORDER' && subtotal >= parseFloat(promo.minOrderAmount)) {
        const disc = promo.discountType === 'PERCENTAGE'
          ? (subtotal * parseFloat(promo.discountValue)) / 100
          : parseFloat(promo.discountValue);
        triggered.push({ name: promo.name, discount: disc, type: 'auto' });
      }

      if (promo.applyTo === 'PRODUCT') {
        const cartItem = cartItems.find(i => i.productId === promo.productId);
        if (cartItem && cartItem.quantity >= promo.minQuantity) {
          const disc = promo.discountType === 'PERCENTAGE'
            ? (subtotal * parseFloat(promo.discountValue)) / 100
            : parseFloat(promo.discountValue);
          triggered.push({ name: promo.name, discount: disc, type: 'auto' });
        }
      }
    });

    setActivePromos(triggered);
  };

  useEffect(() => {
    checkPromotions(cartItems);
  }, [cartItems, promotions]);

  // /* ── Frequently ordered together suggestions ── */
  // useEffect(() => {
  //   if (cartItems.length === 0) { setSuggestions([]); return; }
  //   const lastItem = cartItems[cartItems.length - 1];
  //   api.get(`/products/frequently-together/${lastItem.productId}`)
  //     .then(res => setSuggestions(res))
  //     .catch(() => setSuggestions([]));
  // }, [cartItems.length]);

  /* ────── computed values ────── */
  const subtotal = cartItems.reduce((s, i) => s + (i.price || i.unitPrice || 0) * i.quantity, 0);
  const promoDiscount = activePromos.reduce((s, p) => s + p.discount, 0);
  
  const couponData = coupon;
  const setCouponData = setCoupon;
  const couponDiscountAmt = couponData
    ? couponData.discountType === 'PERCENTAGE'
      ? (subtotal * parseFloat(couponData.discountValue)) / 100
      : parseFloat(couponData.discountValue)
    : 0;
  
  const totalDiscount = promoDiscount + couponDiscountAmt;
  const afterDiscount = Math.max(0, subtotal - totalDiscount);

  const preDiscountTaxAmount = cartItems.reduce((s, i) => {
    const rate = parseFloat(i.tax || 0);
    const itemTotal = (i.price || i.unitPrice || 0) * i.quantity;
    return s + itemTotal * (rate / 100);
  }, 0);

  const tax = subtotal > 0 ? preDiscountTaxAmount * (afterDiscount / subtotal) : 0;
  const taxAmount = tax;
  const total = afterDiscount + tax;

  const getTaxBreakdown = (items, grossSubtotal, netSubtotal) => {
    const breakdown = {};
    items.forEach(i => {
      const rate = parseFloat(i.tax !== undefined ? i.tax : (i.product?.tax !== undefined ? i.product.tax : 0));
      const price = parseFloat(i.price !== undefined ? i.price : (i.unitPrice !== undefined ? i.unitPrice : 0));
      const qty = parseInt(i.quantity || 0, 10);
      const itemTotal = price * qty;
      if (!breakdown[rate]) {
        breakdown[rate] = 0;
      }
      breakdown[rate] += itemTotal * (rate / 100);
    });

    const scaleFactor = grossSubtotal > 0 ? (netSubtotal / grossSubtotal) : 0;
    return Object.keys(breakdown).sort((a, b) => parseFloat(a) - parseFloat(b)).map(rateStr => {
      const rate = parseFloat(rateStr);
      return {
        rate,
        amount: breakdown[rateStr] * scaleFactor
      };
    });
  };

  const taxBreakdown = getTaxBreakdown(cartItems, subtotal, afterDiscount);

  const cashChange = cashReceived ? Math.max(0, parseFloat(cashReceived) - total) : null;

  /* ────── filtered products ────── */
  const visibleProducts = products.filter(p => {
    const matchCat = activeCat === 'all' || p.categoryId === activeCat;
    const q = localSearch.trim().toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  /* ────── cart helpers ────── */
  const addToCart = (product) => {
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.productId === product.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 }; return next;
      }
      return [...prev, { productId: product.id, name: product.name, imageUrl: product.imageUrl || null, price: parseFloat(product.price), quantity: 1, color: product.category?.color, tax: parseFloat(product.tax || 0) }];
    });
    toast.success(`${product.name} added`, {
      duration: 1500,
      style: { background: '#065f46', color: '#d1fae5', border: '1px solid #047857' },
      icon: <CheckCircle2 size={18} className="text-green-400" />,
    });
  };

  const updateQty = (idx, delta) => {
    setCartItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + delta };
      if (next[idx].quantity <= 0) next.splice(idx, 1);
      return next;
    });
  };

  const removeItem = (idx) => setCartItems(prev => prev.filter((_, i) => i !== idx));

  /* ────── order details helpers ────── */
  const effectiveDeliveryLocation = orderType === 'ROOM'
    ? (roomNumber.trim() ? `Room ${roomNumber.trim()}` : '')
    : deliveryLocation.trim();

  const validateOrderDetails = () => {
    if (orderType === 'TABLE' && !table?.id) {
      toast.error('Select a table before sending this order');
      return false;
    }

    if ((orderType === 'ROOM' || orderType === 'DELIVERY') && !effectiveDeliveryLocation) {
      toast.error(orderType === 'ROOM' ? 'Enter the room number' : 'Enter the delivery location');
      return false;
    }

    return true;
  };

  const getOrderPayload = (lines) => ({
    lines,
    tableId: orderType === 'TABLE' ? (table?.id || null) : null,
    orderType,
    deliveryLocation: effectiveDeliveryLocation || null,
    customerNotes: customerNotes.trim() || null,
    customerIds: customers.map(c => c.id),
    couponCode: coupon?.code || null,
  });



 

  /* ────── send to kitchen ────── */
  // const handleSendKitchen = async () => {
  //   if (!cartItems.length) return toast.error('Cart is empty');
  //   if (!validateOrderDetails()) return;
  //   setKitchenLoading(true);
  //   try {
  //     let order = currentOrder;
  //     const lines = cartItems.map(i => ({ productId: i.productId, quantity: i.quantity }));
  //     const payload = getOrderPayload(lines);
  //     if (order) {
  //       if (EDITABLE_ORDER_STATUSES.includes(order.status)) {
  //         order = await api.put(`/orders/${order.id}`, payload);
  //         setCurrentOrder(order);
  //         onOrderUpdate?.(order);
  //       }
  //     } else {
  //       order = await api.post('/orders', {
  //         ...payload,
  //         sessionId: session.id,
  //       });
  //       setCurrentOrder(order);
  //       onOrderUpdate?.(order);
  //     }
  //     if (order.status === ORDER_STATUS.DRAFT) {
  //       const updatedOrder = await api.put(`/orders/${order.id}/send-kitchen`);
  //       setCurrentOrder(updatedOrder);
  //       onOrderUpdate?.(updatedOrder);
  //       toast.success('Order sent to kitchen!', {
  //         icon: <ChefHat size={18} className="text-blue-400" />
  //       });
  //     } else {
  //       toast.success('Order updated');
  //     }
  //   } catch (err) { toast.error(err?.error || err?.message || 'Failed to send to kitchen'); }
  //   finally { setKitchenLoading(false); }
  // };

  const handleSendKitchen = async () => {
  if (!cartItems.length) {
    return toast.error('Cart is empty');
  }

  if (!validateOrderDetails()) {
    return;
  }

  setKitchenLoading(true);

  try {
    const lines = cartItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const payload = getOrderPayload(lines);

    // ============================================
    // EXISTING ORDER
    // ============================================
    if (currentOrder) {
      let updatedOrder;

      // DRAFT → send the existing order to kitchen
      if (currentOrder.status === ORDER_STATUS.DRAFT) {
        updatedOrder = await api.put(
          `/orders/${currentOrder.id}/send-kitchen`
        );

        setCurrentOrder(updatedOrder);
        onOrderUpdate?.(updatedOrder);

        toast.success('Order sent to kitchen!', {
          icon: (
            <ChefHat
              size={18}
              className="text-blue-400"
            />
          ),
        });

        return;
      }

      // SENT_TO_KITCHEN / READY → update only when
      // the user clicks "Update Kitchen"
      if (
        currentOrder.status === ORDER_STATUS.SENT_TO_KITCHEN ||
        currentOrder.status === ORDER_STATUS.READY
      ) {
        updatedOrder = await api.put(
          `/orders/${currentOrder.id}`,
          payload
        );

        setCurrentOrder(updatedOrder);
        onOrderUpdate?.(updatedOrder);

        toast.success('Kitchen order updated');

        return;
      }

      // PAID or another non-editable status
      return;
    }

    // ============================================
    // NO EXISTING ORDER → CREATE DRAFT
    // ============================================
    const newOrder = await api.post('/orders', {
      ...payload,
      sessionId: session.id,
    });

    setCurrentOrder(newOrder);
    onOrderUpdate?.(newOrder);

    // Send newly created order to kitchen
    const sentOrder = await api.put(
      `/orders/${newOrder.id}/send-kitchen`
    );

    setCurrentOrder(sentOrder);
    onOrderUpdate?.(sentOrder);

    toast.success('Order sent to kitchen!', {
      icon: (
        <ChefHat
          size={18}
          className="text-blue-400"
        />
      ),
    });
  } catch (err) {
    console.error('Failed to send/update kitchen:', err);

    toast.error(
      err?.response?.data?.message ||
      err?.error ||
      err?.message ||
      'Failed to send to kitchen'
    );
  } finally {
    setKitchenLoading(false);
  }
};

const handlePay = async () => {
  // --------------------------------------------------
  // 1. Basic validation
  // --------------------------------------------------
  if (!cartItems.length) {
    toast.error('Cart is empty');
    return;
  }

  if (!currentOrder?.id) {
    toast.error('No order found');
    return;
  }

  if (currentOrder.status !== ORDER_STATUS.READY) {
    toast.error('Only READY orders can be paid');
    return;
  }

  // --------------------------------------------------
  // 2. Normal payment validation
  // --------------------------------------------------
  if (!isSplit && !payMethod) {
    toast.error('Select a payment method');
    return;
  }

  // --------------------------------------------------
  // 3. Split payment validation
  // --------------------------------------------------
  if (isSplit) {
    if (!isSplitFullyPaid()) {
      toast.error('Please complete all split payments');
      return;
    }

    if (!paidSplits || paidSplits.length === 0) {
      toast.error('No split payments found');
      return;
    }

    const validSplits = paidSplits.filter(Boolean);

    if (validSplits.length === 0) {
      toast.error('Please add at least one payment');
      return;
    }

    // Make sure every split has a valid amount and method
    const invalidSplit = validSplits.find(
      (split) =>
        !Number.isFinite(Number(split.amount)) ||
        Number(split.amount) <= 0 ||
        !split.method
    );

    if (invalidSplit) {
      toast.error('One or more split payments are invalid');
      return;
    }
  }

  setPayLoading(true);

  try {
    // --------------------------------------------------
    // 4. Build payment payload
    // --------------------------------------------------
    let paymentPayload;

    if (isSplit) {
      const validSplits = paidSplits
        .filter(Boolean)
        .map((split) => ({
          amount: Number(split.amount),
          method: String(split.method).trim(),
          reference: split.reference || null,
        }));

      paymentPayload = {
        paymentMethod: 'SPLIT',
        paymentReference: 'Split Billing',
        payments: validSplits,
      };
    } else {
      paymentPayload = {
        paymentMethod: String(payMethod).trim(),
        paymentReference:
          payMethod === 'CARD'
            ? (cardRef?.trim() || null)
            : null,
        payments: null,
      };
    }

    // --------------------------------------------------
    // 5. Debug information
    // --------------------------------------------------
    console.log('========== FRONTEND PAYMENT ==========');
    console.log('ORDER ID:', currentOrder.id);
    console.log('ORDER STATUS:', currentOrder.status);
    console.log('PAY METHOD:', payMethod);
    console.log('IS SPLIT:', isSplit);
    console.log('PAID SPLITS:', paidSplits);
    console.log('PAYMENT PAYLOAD:', paymentPayload);
    console.log('======================================');

    // --------------------------------------------------
    // 6. Send payment directly
    // --------------------------------------------------
    const paid = await api.put(
      `/orders/${currentOrder.id}/pay`,
      paymentPayload
    );

    // --------------------------------------------------
    // 7. Update local order
    // --------------------------------------------------
    setCurrentOrder(paid);
    onOrderUpdate?.(paid);

    // --------------------------------------------------
    // 8. Show receipt
    // --------------------------------------------------
    setPaidOrder(paid);
    setShowReceipt(true);
    setShowPayment(false);

    // --------------------------------------------------
    // 9. Reset payment state
    // --------------------------------------------------
    setPayMethod(null);
    setCashReceived('');
    setCardRef('');
    setIsSplit(false);
    setPaidSplits([]);
    setActiveSplitIdx(null);
    setItemAssignments({});

    // --------------------------------------------------
    // 10. Success message
    // --------------------------------------------------
    toast.success(
      `Payment of ${fmt(paid.total)} received!`,
      {
        duration: 3000,
        style: {
          background: '#064e3b',
          color: '#a7f3d0',
          border: '1px solid #059669',
        },
        icon: (
          <Coins
            size={18}
            className="text-yellow-400"
          />
        ),
      }
    );

  } catch (err) {
    console.error('PAYMENT FAILED:', err);
    console.error('PAYMENT ERROR RESPONSE:', err?.response);
    console.error('PAYMENT ERROR DATA:', err?.response?.data);

    toast.error(
      err?.error ||
      err?.response?.data?.error ||
      err?.message ||
      'Payment failed'
    );
  } finally {
    setPayLoading(false);
  }
};

  const handleNewOrder = () => {
    setCartItems([]); setCoupon(null); setCustomers([]);
    setCurrentOrder(null); setPayMethod(null); setCashReceived('');
    setOrderType(table ? 'TABLE' : 'PICKUP');
    setDeliveryLocation(''); setCustomerNotes(''); setRoomNumber('');
    setShowReceipt(false); setPaidOrder(null);
    onOrderComplete?.();
  };


  const upiMethod = paymentMethods.find(m => m.name === 'UPI');

  /* ────── render ────── */
  const BG     = '#FFFDF5';
  const WHITE  = '#FFFFFF';
  const FG     = '#1E293B';
  const MUTED  = '#64748B';
  const BORDER = '#E2E8F0';
  const ACCENT = '#8B5CF6';
  const AMBER  = '#FBBF24';
  const EMERALD= '#34D399';
  const PINK   = '#F472B6';
  const FONT_H = "'Outfit', system-ui, sans-serif";
  const FONT_B = "'Plus Jakarta Sans', system-ui, sans-serif";

  return (
    <div className="pos-layout flex flex-col lg:flex-row h-full overflow-hidden" style={{ background: BG, fontFamily: FONT_B }}>

      {/* Mobile segmented toggle */}
      <div className="lg:hidden shrink-0 px-4 py-2 bg-white border-b-2 border-slate-800" style={{ background: WHITE }}>
        <div className="flex bg-slate-150 p-0.5 rounded-xl border-2 border-slate-800" style={{ boxShadow: 'var(--pop-shadow-sm)' }}>
          <button
            type="button"
            onClick={() => setMobileTab('products')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${mobileTab === 'products' ? 'bg-white text-slate-800 border-2 border-slate-800 shadow-sm' : 'text-slate-500'}`}
            style={{ fontFamily: FONT_H }}
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${mobileTab === 'cart' ? 'bg-white text-slate-800 border-2 border-slate-800 shadow-sm' : 'text-slate-500'}`}
            style={{ fontFamily: FONT_H }}
          >
            <span>Cart</span>
            {cartItems.length > 0 && (
              <span className="bg-[#F472B6] text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-slate-800" style={{ boxShadow: '1px 1px 0px 0px #1E293B' }}>
                {cartItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ══ LEFT — Product Grid ══════════════════════════ */}
      <div className={`pos-product-col flex-col shrink-0 border-r ${mobileTab === 'products' ? 'flex' : 'hidden'} lg:flex lg:w-[58%] w-full h-full`}
           style={{ borderColor: BORDER, background: BG }}>

        {/* Category tabs + Local search bar */}
        <div className="shrink-0 px-4 pt-3 pb-2 space-y-2" style={{ background: WHITE, borderBottom: `2px solid ${BORDER}` }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full text-sm rounded-xl pl-9 pr-9 py-2.5 focus:outline-none transition"
              style={{ background: '#F8FAFC', border: `2px solid ${BORDER}`, color: FG }}
              onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `4px 4px 0px 0px ${ACCENT}`; }}
              onBlur={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = 'none'; }}
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-200/50 rounded-lg transition"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setActiveCat('all')}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
              style={activeCat === 'all'
                ? { background: ACCENT, color: '#fff', border: `2px solid ${FG}`, boxShadow: '2px 2px 0px 0px #1E293B' }
                : { background: WHITE, color: MUTED, border: `2px solid ${BORDER}` }}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                style={activeCat === c.id
                  ? { background: c.color, color: '#fff', border: `2px solid ${FG}`, boxShadow: '2px 2px 0px 0px #1E293B' }
                  : { background: WHITE, color: MUTED, border: `2px solid ${BORDER}` }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-3" style={{ background: BG }}>
          {dataLoading ? (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-2.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl" style={{ minHeight: 110, background: BORDER, animationDelay: `${i * 50}ms`, opacity: 0.6 }} />
              ))}
            </div>
          ) : (
            <div className="pos-product-grid grid grid-cols-3 xl:grid-cols-4 gap-2.5">
            {visibleProducts.map(p => {
  const catColor = p.category?.color || '#8B5CF6';
  const inCart = cartItems.find(i => i.productId === p.id);
  const imageUrl = getImageUrl(p.imageUrl);

  return (
    <button
      key={p.id}
      onClick={() => addToCart(p)}
      className="product-card group relative text-left rounded-xl p-2.5 transition-all duration-200 active:scale-95 flex flex-col justify-between overflow-hidden"
      style={{
        background: WHITE,
        border: `2px solid ${inCart ? catColor : BORDER}`,
        minHeight: 190,
        boxShadow: inCart
          ? `4px 4px 0px 0px ${catColor}`
          : `4px 4px 0px 0px ${BORDER}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = catColor;
        e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${catColor}`;
        e.currentTarget.style.transform = 'translate(-2px,-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = inCart ? catColor : BORDER;
        e.currentTarget.style.boxShadow = inCart
          ? `4px 4px 0px 0px ${catColor}`
          : `4px 4px 0px 0px ${BORDER}`;
        e.currentTarget.style.transform = 'translate(0,0)';
      }}
    >
      {/* Product image */}
      <div
        className="w-full rounded-lg overflow-hidden mb-2.5 relative"
        style={{
          height: 100,
          background: `${catColor}12`,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={p.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}

        {/* Fallback when no image */}
        <div
          className={`${imageUrl ? 'hidden' : ''} absolute inset-0 flex items-center justify-center`}
          style={{ color: catColor }}
        >
          <Coffee size={30} strokeWidth={1.8} />
        </div>

        {/* Category color bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: catColor }}
        />
      </div>

      {/* Product information */}
      <div className="w-full">
        <div
          className="product-card-name font-bold leading-tight mb-1 line-clamp-1"
          style={{
            color: FG,
            fontSize: 13,
            fontFamily: FONT_H,
          }}
        >
          {p.name}
        </div>

        {p.description && (
          <div
            className="text-[10px] leading-tight text-slate-400 mb-2 line-clamp-2"
            style={{ fontFamily: FONT_B }}
          >
            {p.description}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="flex items-baseline justify-between mt-auto w-full">
        <div
          className="font-black"
          style={{
            color: catColor,
            fontSize: 16,
          }}
        >
          ETB {parseFloat(p.price).toFixed(0)}
        </div>

        <div
          className="text-[10px] font-semibold"
          style={{ color: MUTED }}
        >
          {p.unitOfMeasure}
        </div>
      </div>

      {/* Quantity badge */}
      {inCart && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white border-2 border-white"
          style={{ background: catColor }}
        >
          {inCart.quantity}
        </div>
      )}

      {/* Add (+) on hover */}
      {!inCart && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-black opacity-0 group-hover:opacity-100 transition border-2 border-white"
          style={{ background: catColor }}
        >
          +
        </div>
      )}
    </button>
  );
})}
            </div>
          )}
          {!dataLoading && visibleProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center border-2" style={{ background: WHITE, borderColor: BORDER, boxShadow: `4px 4px 0px 0px ${BORDER}` }}>
                <Search size={28} style={{ color: MUTED }} />
              </div>
              <div className="text-sm font-semibold" style={{ color: MUTED }}>
                {localSearch ? `No products matching "${localSearch}"` : 'No products in this category'}
              </div>
            </div>
          )}
          {/* Mobile floating View Cart banner */}
          {cartItems.length > 0 && (
            <div className="lg:hidden p-3 bg-[#FFFDF5] border-t-2 border-[#1E293B] sticky bottom-0 left-0 right-0 z-10 shrink-0">
              <button
                type="button"
                onClick={() => setMobileTab('cart')}
                className="w-full h-11 flex items-center justify-between px-4 rounded-xl font-black text-sm transition-all duration-200 border-2"
                style={{ background: ACCENT, color: '#fff', borderColor: FG, boxShadow: `3px 3px 0px 0px ${FG}` }}
              >
                <span className="flex items-center gap-1.5">
                  <ShoppingCart size={15} strokeWidth={2.5} />
                  View Cart ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})
                </span>
                <span>{fmt(total)}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT — Cart + Payment ════════════════════════ */}
      <div className={`pos-cart-col flex-col flex-1 ${mobileTab === 'cart' ? 'flex' : 'hidden'} lg:flex h-full`} style={{ background: WHITE, borderLeft: `2px solid ${BORDER}` }}>

        {/* ── Cart Header ── */}
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: `2px solid ${BORDER}`, background: WHITE }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-base" style={{ color: FG, fontFamily: FONT_H }}>
                {currentOrder ? (
                  <span className="flex items-center gap-2">
                    <span style={{ color: MUTED, fontWeight: 500, fontSize: 13 }}>Order</span>
                    <span style={{ color: ACCENT, fontFamily: 'monospace', fontSize: 15 }}>{currentOrder.orderNumber}</span>
                    {currentOrder.status === ORDER_STATUS.READY && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-2"
                        style={{ background: '#EDE9FE', color: '#7C3AED', borderColor: '#C4B5FD' }}>
                        Ready
                      </span>
                    )}
                    {currentOrder.status === ORDER_STATUS.SENT_TO_KITCHEN && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-2"
                        style={{ background: '#FEF3C7', color: '#D97706', borderColor: '#FCD34D' }}>
                        Cooking
                      </span>
                    )}
                    {currentOrder.status === ORDER_STATUS.DRAFT && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-2"
                        style={{ background: '#F1F5F9', color: '#475569', borderColor: '#CBD5E1' }}>
                        Draft
                      </span>
                    )}
                    {currentOrder.status === ORDER_STATUS.PAID && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-2"
                        style={{ background: '#D1FAE5', color: '#059669', borderColor: '#A7F3D0' }}>
                        Paid
                      </span>
                    )}
                    {currentOrder.status === ORDER_STATUS.CANCELLED && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-2"
                        style={{ background: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5' }}>
                        Cancelled
                      </span>
                    )}
                  </span>
                ) : 'New Order'}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap" style={{ color: MUTED, fontSize: 12 }}>
                <span className="flex items-center gap-1">
                  {orderType === 'TABLE' ? <Armchair size={11} /> : orderType === 'ROOM' ? <Home size={11} /> : orderType === 'DELIVERY' ? <Truck size={11} /> : <Package size={11} />}
                  {orderType === 'TABLE' ? `Table ${table?.tableNumber?.toUpperCase() || '—'}` : orderType === 'ROOM' ? (roomNumber ? `Room ${roomNumber}` : 'Room') : orderType === 'DELIVERY' ? 'Delivery' : 'Pickup'}
                </span>
                {customers.map(c => (
                  <span key={c.id} className="flex items-center gap-1 bg-violet-50 text-violet-850 border border-violet-200 px-2 py-0.5 rounded-lg text-xs font-bold font-jakarta">
                    <User size={10} /> {c.name}
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeCustomer(c.id); }}
                      className="ml-1 text-violet-400 hover:text-rose-500 font-black text-xs shrink-0 cursor-pointer"
                      title="Remove Customer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-full text-xs font-bold border-2" style={{ background: `${ACCENT}15`, borderColor: `${ACCENT}40`, color: ACCENT }}>
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* ── Order Details ── */}
        {!showPayment && (
          <div className="px-3 pt-2 shrink-0">
            <div className="rounded-xl p-3 border-2" style={{ background: '#FFFDF5', borderColor: BORDER, boxShadow: '3px 3px 0px 0px #E2E8F0' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <ClipboardList size={14} style={{ color: ACCENT }} />
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: FG, fontFamily: FONT_H }}>Order Details</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { value: 'TABLE', label: 'Table', icon: Armchair },
                  { value: 'ROOM', label: 'Room', icon: Home },
                  { value: 'DELIVERY', label: 'Delivery', icon: Truck },
                  { value: 'PICKUP', label: 'Pickup', icon: Package },
                ].map(({ value, label, icon: Icon }) => {
                  const selected = orderType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setOrderType(value);
                        if (value !== 'ROOM') setRoomNumber('');
                        if (value !== 'DELIVERY') setDeliveryLocation(value === 'ROOM' ? '' : '');
                      }}
                      className="py-2 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black transition"
                      style={{
                        background: selected ? ACCENT : WHITE,
                        color: selected ? '#fff' : MUTED,
                        borderColor: selected ? FG : BORDER,
                        boxShadow: selected ? '2px 2px 0px 0px #1E293B' : 'none',
                        fontFamily: FONT_H,
                      }}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </div>

              {orderType === 'TABLE' && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg px-3 py-2 border-2" style={{ background: WHITE, borderColor: table ? '#C4B5FD' : '#FCD34D' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Armchair size={14} className="shrink-0" style={{ color: table ? ACCENT : '#D97706' }} />
                    <span className="text-xs font-bold truncate" style={{ color: FG }}>
                      {table ? `Table ${table.tableNumber}` : 'No table selected'}
                    </span>
                  </div>
                  {!table && onTableClick && (
                    <button type="button" onClick={() => onTableClick()} className="text-[10px] font-black text-violet-600 hover:underline shrink-0">
                      Select Table
                    </button>
                  )}
                </div>
              )}

              {orderType === 'ROOM' && (
                <div className="mt-2">
                  <label className="block text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: MUTED, fontFamily: FONT_H }}>Room Number *</label>
                  <input
                    value={roomNumber}
                    onChange={e => setRoomNumber(e.target.value)}
                    placeholder="e.g. 204"
                    className="w-full rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none border-2 transition"
                    style={{ background: WHITE, borderColor: BORDER, color: FG }}
                  />
                </div>
              )}

              {orderType === 'DELIVERY' && (
                <div className="mt-2">
                  <label className="block text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: MUTED, fontFamily: FONT_H }}>Delivery Location *</label>
                  <textarea
                    value={deliveryLocation}
                    onChange={e => setDeliveryLocation(e.target.value)}
                    placeholder="Enter delivery address / location"
                    rows={2}
                    className="w-full rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none border-2 transition resize-none"
                    style={{ background: WHITE, borderColor: BORDER, color: FG }}
                  />
                </div>
              )}

              <div className="mt-2">
                <label className="block text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: MUTED, fontFamily: FONT_H }}>Additional Info / Customer Notes</label>
                <textarea
                  value={customerNotes}
                  onChange={e => setCustomerNotes(e.target.value)}
                  placeholder="Special instructions, preferences, delivery notes…"
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm font-medium focus:outline-none border-2 transition resize-none"
                  style={{ background: WHITE, borderColor: BORDER, color: FG }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Cart Items ── */}
        {!showPayment && (
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{ background: '#FAFAFA' }}>
            {customers.length === 0 && !hideCustomerSuggest && (
              <div 
                className="border-2 border-dashed rounded-xl p-3 mb-2 flex items-center justify-between gap-2 text-xs font-semibold transition-all duration-200"
                style={{ 
                  background: '#F5F3FF', 
                  borderColor: '#C4B5FD', 
                  color: '#6D28D9',
                  boxShadow: '2px 2px 0px 0px #E2E8F0' 
                }}
              >
                <div className="flex items-center gap-2">
                  <User size={14} className="text-violet-500 shrink-0" />
                  <span><strong>Suggested:</strong> Assign a customer to track history & loyalty.</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={() => setShowCustomer(true)}
                    className="px-2.5 py-1 text-white rounded-lg font-bold transition text-[11px] border border-slate-800"
                    style={{ background: ACCENT, boxShadow: '1.5px 1.5px 0px 0px #1E293B' }}
                  >
                    Assign
                  </button>
                  <button 
                    onClick={() => setHideCustomerSuggest(true)}
                    className="w-5 h-5 rounded flex items-center justify-center text-violet-400 hover:text-violet-750 hover:bg-violet-100 transition shrink-0"
                    title="Dismiss suggestion"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-center gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center border-2" style={{ background: WHITE, borderColor: BORDER, boxShadow: `4px 4px 0px 0px ${BORDER}` }}>
                  <ShoppingCart size={28} style={{ color: BORDER }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: MUTED, fontFamily: FONT_H }}>Cart is empty</div>
                  <div className="text-xs mt-0.5" style={{ color: '#CBD5E1' }}>Tap a product to add it</div>
                </div>
              </div>
            ) : (
              cartItems.map((item, idx) => {
                const itemColor = item.color || ACCENT;
                return (
                  <div key={idx}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ background: WHITE, border: `2px solid ${BORDER}`, boxShadow: `3px 3px 0px 0px ${BORDER}` }}>
                    {/* Color bar */}
                    <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background: itemColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate" style={{ color: FG, fontFamily: FONT_H }}>{item.name}</div>
                      <div className="text-xs mt-0.5 flex gap-1.5 flex-wrap" style={{ color: MUTED }}>
                        <span>ETB {item.price.toFixed(2)} each</span>
                        {parseFloat(item.tax || 0) > 0 && (
                          <span className="text-emerald-600 font-medium">
                            · {item.tax}% Tax (ETB {((item.price * item.quantity) * (parseFloat(item.tax || 0) / 100)).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(idx, -1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm transition border-2"
                        style={{ background: WHITE, color: FG, borderColor: BORDER }}>−</button>
                      <span className="w-7 text-center font-black text-sm" style={{ color: FG }}>{item.quantity}</span>
                      <button onClick={() => updateQty(idx, +1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm transition border-2"
                        style={{ background: itemColor, color: '#fff', borderColor: FG }}>+</button>
                    </div>
                    <div className="font-black text-sm w-16 text-right shrink-0" style={{ color: ACCENT }}>
                      {fmt(item.price * item.quantity)}
                    </div>
                    <button onClick={() => removeItem(idx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition opacity-40 hover:opacity-100"
                      style={{ color: '#EF4444' }}>
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Promo + Coupon banners ── */}
        {!showPayment && (
          <div className="px-3 space-y-1.5 shrink-0">
            {/* {suggestions.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: `${AMBER}15`, border: `2px solid ${AMBER}50` }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: '#92400E', fontFamily: FONT_H }}>
                  <Sparkles size={11} style={{ color: AMBER }} /> Frequently ordered with this
                </p>
                <div className="flex gap-2 flex-wrap">
                  {suggestions.map(product => (
                    <button key={product.id} onClick={() => addToCart(product)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200 active:scale-95 border-2"
                      style={{ background: WHITE, color: FG, borderColor: BORDER, boxShadow: '2px 2px 0px 0px #E2E8F0' }}>
                      <span className="font-semibold">{product.name}</span>
                      <span className="font-black" style={{ color: ACCENT }}>+ETB {parseFloat(product.price).toFixed(0)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )} */}

            {activePromos.map((promo, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border-2"
                style={{ background: `${EMERALD}15`, borderColor: `${EMERALD}50`, color: '#059669' }}>
                <Sparkles size={13} />
                <span className="flex-1 font-semibold">{promo.name}</span>
                <span className="font-black">-ETB {promo.discount.toFixed(2)}</span>
              </div>
            ))}

            {couponData && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-1 border-2"
                style={{ background: `${ACCENT}12`, borderColor: `${ACCENT}40`, color: '#6D28D9' }}>
                <Ticket size={13} />
                <span className="flex-1 font-semibold">Coupon: {couponData.code}</span>
                <span className="font-black">-ETB {couponDiscountAmt.toFixed(2)}</span>
                <button onClick={() => setCouponData(null)} style={{ color: '#EF4444' }}><X size={13} /></button>
              </div>
            )}
          </div>
        )}

        {/* ── Order Totals ── */}
        {!showPayment && (
          <div className="px-3 pb-2 shrink-0">
            <div className="rounded-xl p-3 space-y-1.5 border-2" style={{ background: WHITE, borderColor: BORDER, boxShadow: '4px 4px 0px 0px #E2E8F0' }}>
              <div className="flex justify-between text-sm" style={{ color: MUTED }}>
                <span>Subtotal</span><span style={{ color: FG, fontWeight: 600 }}>ETB {subtotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: MUTED }}>Discount</span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>-ETB {totalDiscount.toFixed(2)}</span>
                </div>
              )}
              {taxBreakdown.map(({ rate, amount }) => (
                <div key={rate} className="flex justify-between text-sm" style={{ color: MUTED }}>
                  <span>Tax ({rate}%)</span><span style={{ color: FG, fontWeight: 600 }}>ETB {amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1.5 mt-1" style={{ borderTop: `2px solid ${BORDER}` }}>
                <span className="font-black text-base" style={{ color: FG, fontFamily: FONT_H }}>Total</span>
                <span className="font-black text-xl" style={{ color: ACCENT }}>ETB {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Action Buttons ── */}
        {!showPayment && (
          <div className="px-3 pb-3 grid grid-cols-2 gap-2 shrink-0">
            {/* <button onClick={() => setShowCustomer(true)}
              className="h-11 flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all duration-200 border-2"
              style={customers.length > 0
                ? { background: `${ACCENT}15`, color: ACCENT, borderColor: ACCENT, boxShadow: `2px 2px 0px 0px ${FG}` }
                : { background: WHITE, color: MUTED, borderColor: BORDER }}>
              <User size={14} strokeWidth={2.5} />{' '}
              {customers.length === 0
                ? 'Customer'
                : customers.length === 1
                ? customers[0].name.split(' ')[0]
                : `${customers[0].name.split(' ')[0]} (+${customers.length - 1})`}
            </button> */}


            {/* <button onClick={() => setShowCoupon(true)}
              className="h-11 flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all duration-200 border-2"
              style={coupon
                ? { background: `${PINK}15`, color: '#9D174D', borderColor: PINK, boxShadow: `2px 2px 0px 0px ${FG}` }
                : { background: WHITE, color: MUTED, borderColor: BORDER }}>
              <Ticket size={14} strokeWidth={2.5} /> {coupon ? coupon.code : 'Coupon'}
            </button> */}


            
            {/* <button onClick={handleSendKitchen} disabled={kitchenLoading || !cartItems.length}
              className="h-11 flex items-center justify-center gap-1.5 rounded-xl text-sm font-black transition-all duration-200 border-2 disabled:opacity-40"
              style={{ background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE', boxShadow: `2px 2px 0px 0px ${FG}` }}>
              {kitchenLoading ? <Loader2 size={14} className="animate-spin" /> : <ChefHat size={14} strokeWidth={2.5} />}
              Kitchen
            </button> */}

     {currentOrder?.status !== ORDER_STATUS.PAID && (
  <button
    onClick={handleSendKitchen}
    disabled={
      kitchenLoading ||
      !cartItems.length
    }
    className="h-11 flex items-center justify-center gap-1.5 rounded-xl text-sm font-black transition-all duration-200 border-2 disabled:opacity-40"
    style={{
      background:
        currentOrder?.status === ORDER_STATUS.SENT_TO_KITCHEN ||
        currentOrder?.status === ORDER_STATUS.READY
          ? '#FEF3C7'
          : '#EFF6FF',

      color:
        currentOrder?.status === ORDER_STATUS.SENT_TO_KITCHEN ||
        currentOrder?.status === ORDER_STATUS.READY
          ? '#B45309'
          : '#1D4ED8',

      borderColor:
        currentOrder?.status === ORDER_STATUS.SENT_TO_KITCHEN ||
        currentOrder?.status === ORDER_STATUS.READY
          ? '#FCD34D'
          : '#BFDBFE',

      boxShadow: `2px 2px 0px 0px ${FG}`
    }}
  >
    {kitchenLoading ? (
      <Loader2
        size={14}
        className="animate-spin"
      />
    ) : currentOrder?.status === ORDER_STATUS.SENT_TO_KITCHEN ||
      currentOrder?.status === ORDER_STATUS.READY ? (
      <RotateCcw
        size={14}
        strokeWidth={2.5}
      />
    ) : (
      <ChefHat
        size={14}
        strokeWidth={2.5}
      />
    )}

    {currentOrder?.status === ORDER_STATUS.SENT_TO_KITCHEN ||
    currentOrder?.status === ORDER_STATUS.READY
      ? 'Update Kitchen'
      : 'Kitchen'}
  </button>
)}



            {/* {allowPayment && currentOrder?.status === ORDER_STATUS.READY && <button onClick={() => {
              setShowPayment(true);
            }} disabled={!cartItems.length}
              className="h-11 flex items-center justify-center gap-1.5 rounded-xl font-black text-sm transition-all duration-200 border-2 disabled:opacity-40"
              style={{ background: ACCENT, color: '#fff', borderColor: FG, boxShadow: `3px 3px 0px 0px ${FG}` }}>
              <CreditCard size={14} strokeWidth={2.5} /> Charge {cartItems.length > 0 ? fmt(total) : ''}
            </button>} */}

            {/* Display Kitchen button if order is not yet sent to kitchen OR if new items/changes exist */}
            
{/* {(currentOrder?.status !== ORDER_STATUS.SENT_TO_KITCHEN && currentOrder?.status !== ORDER_STATUS.READY) && (
  <button 
    onClick={handleSendKitchen} 
    disabled={kitchenLoading || !cartItems.length}
    className="h-11 flex items-center justify-center gap-1.5 rounded-xl text-sm font-black transition-all duration-200 border-2 disabled:opacity-40"
    style={{ background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE', boxShadow: `2px 2px 0px 0px ${FG}` }}
  >
    {kitchenLoading ? <Loader2 size={14} className="animate-spin" /> : <ChefHat size={14} strokeWidth={2.5} />}
    Kitchen
  </button>
)} */}

{/* Charge / Payment Button */}
{allowPayment && currentOrder?.status === ORDER_STATUS.READY && (
  <button 
    onClick={() => setShowPayment(true)} 
    disabled={!cartItems.length}
    className="h-11 flex items-center justify-center gap-1.5 rounded-xl font-black text-sm transition-all duration-200 border-2 disabled:opacity-40"
    style={{ background: ACCENT, color: '#fff', borderColor: FG, boxShadow: `3px 3px 0px 0px ${FG}` }}
  >
    <CreditCard size={14} strokeWidth={2.5} /> Charge {cartItems.length > 0 ? fmt(total) : ''}
  </button>
)}
          </div>
        )}

        {/* ══ Payment Panel ══ */}
      {/* ══ Payment Panel ══ */}
{allowPayment && showPayment && (
  <div
    className="flex-1 flex flex-col overflow-hidden"
    style={{ background: WHITE }}
  >
    <div
      className="flex items-center justify-between px-4 py-3 shrink-0"
      style={{ borderBottom: `2px solid ${BORDER}` }}
    >
      <div>
        <div
          className="font-black text-base"
          style={{ color: FG, fontFamily: FONT_H }}
        >
          Checkout
        </div>

        <div
          className="text-3xl font-black mt-0.5"
          style={{ color: ACCENT, fontFamily: FONT_H }}
        >
          {fmt(total)}
        </div>

        {table && (
          <div
            className="text-xs mt-0.5 font-semibold"
            style={{ color: MUTED }}
          >
            Table {table.tableNumber.toUpperCase()}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowPayment(false)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition border-2"
        style={{
          background: WHITE,
          color: MUTED,
          borderColor: BORDER,
        }}
      >
        <X size={16} strokeWidth={2.5} />
      </button>
    </div>

    {/* Split billing header toggle */}
    <div
      className="px-4 py-2.5 shrink-0 border-b-2 border-slate-100 flex gap-2"
      style={{ background: '#FFFDF5' }}
    >
      <button
        type="button"
        onClick={() => setIsSplit(false)}
        className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition ${
          !isSplit
            ? 'bg-violet-600 text-white border-slate-800'
            : 'bg-white text-slate-600 border-slate-200'
        }`}
        style={{
          boxShadow: !isSplit
            ? 'var(--pop-shadow-sm)'
            : 'none',
          fontFamily: FONT_H,
        }}
      >
        Full Bill
      </button>

      <button
        type="button"
        onClick={() => setIsSplit(true)}
        className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition ${
          isSplit
            ? 'bg-violet-600 text-white border-slate-800'
            : 'bg-white text-slate-600 border-slate-200'
        }`}
        style={{
          boxShadow: isSplit
            ? 'var(--pop-shadow-sm)'
            : 'none',
          fontFamily: FONT_H,
        }}
      >
        Split Bill
      </button>
    </div>

    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 pt-3">
      {!isSplit ? (
        <>
          {/* ═══════════════════════════════════════════
              FULL BILL PAYMENT METHODS
          ═══════════════════════════════════════════ */}
          <div
            className="text-xs font-black uppercase tracking-wider mb-2"
            style={{
              color: MUTED,
              fontFamily: FONT_H,
            }}
          >
            Payment Method
          </div>

          {loadingPaymentMethods ? (
            <div
              className="text-center py-5 text-sm font-bold"
              style={{ color: MUTED }}
            >
              Loading payment methods...
            </div>
          ) : paymentMethods.length === 0 ? (
            <div
              className="text-center py-5 rounded-xl border-2"
              style={{
                color: '#DC2626',
                background: '#FEF2F2',
                borderColor: '#FECACA',
              }}
            >
              <div className="text-sm font-black">
                No payment methods available
              </div>

              <div className="text-xs mt-1">
                Enable at least one payment method from Payment Methods.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map(method => {
                const methodName = String(
                  method.name || ''
                ).trim();

                const methodKey = methodName.toUpperCase();

                const isSelected =
                  payMethod === methodName;

                const isCash =
                  methodKey === 'CASH';

                const isUpi =
                  methodKey === 'UPI';

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setPayMethod(methodName);

                      // Reset fields when switching methods
                      if (!isCash) {
                        setCashReceived('');
                      }

                      if (isCash) {
                        setCardRef('');
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-2"
                    style={
                      isSelected
                        ? {
                            borderColor: ACCENT,
                            background: `${ACCENT}12`,
                            boxShadow: `3px 3px 0px 0px ${FG}`,
                          }
                        : {
                            borderColor: BORDER,
                            background: WHITE,
                          }
                    }
                  >
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center border-2 shrink-0"
                      style={{
                        background: isSelected
                          ? ACCENT
                          : '#F8FAFC',
                        borderColor: isSelected
                          ? FG
                          : BORDER,
                      }}
                    >
                      {isCash ? (
                        <Wallet
                          size={16}
                          strokeWidth={2.5}
                          color={
                            isSelected ? '#fff' : MUTED
                          }
                        />
                      ) : isUpi ? (
                        <Smartphone
                          size={16}
                          strokeWidth={2.5}
                          color={
                            isSelected ? '#fff' : MUTED
                          }
                        />
                      ) : (
                        <CreditCard
                          size={16}
                          strokeWidth={2.5}
                          color={
                            isSelected ? '#fff' : MUTED
                          }
                        />
                      )}
                    </div>

                    {/* ACTUAL DATABASE NAME */}
                    <span
                      className="font-bold text-left truncate"
                      style={{
                        color: FG,
                        fontFamily: FONT_H,
                      }}
                    >
                      {methodName}
                    </span>

                    {isSelected && (
                      <Check
                        size={18}
                        strokeWidth={3}
                        className="ml-auto shrink-0"
                        style={{ color: ACCENT }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ═══════════════════════════════════════════
              CASH PAYMENT
          ═══════════════════════════════════════════ */}
          {payMethod &&
            String(payMethod).trim().toUpperCase() ===
              'CASH' && (
              <div
                className="rounded-xl p-3 space-y-2 border-2"
                style={{
                  background: WHITE,
                  borderColor: BORDER,
                }}
              >
                <label
                  className="block text-xs font-black uppercase tracking-wide"
                  style={{
                    color: MUTED,
                    fontFamily: FONT_H,
                  }}
                >
                  Cash Received (ETB)
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={e =>
                    setCashReceived(e.target.value)
                  }
                  placeholder={total.toFixed(2)}
                  className="w-full rounded-xl px-3 py-2.5 text-lg font-mono font-bold focus:outline-none border-2 transition"
                  style={{
                    background: '#F8FAFC',
                    borderColor: BORDER,
                    color: FG,
                  }}
                  onFocus={e => {
                    e.target.style.borderColor =
                      ACCENT;
                    e.target.style.boxShadow = `4px 4px 0px 0px ${ACCENT}`;
                  }}
                  onBlur={e => {
                    e.target.style.borderColor =
                      BORDER;
                    e.target.style.boxShadow =
                      'none';
                  }}
                />

                {cashChange !== null &&
                  cashChange >= 0 && (
                    <div
                      className="flex justify-between rounded-xl px-3 py-2 border-2"
                      style={{
                        background: `${EMERALD}15`,
                        borderColor: `${EMERALD}60`,
                      }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: '#059669' }}
                      >
                        Change to Return
                      </span>

                      <span
                        className="font-black"
                        style={{ color: '#059669' }}
                      >
                        {fmt(cashChange)}
                      </span>
                    </div>
                  )}
              </div>
            )}

          {/* ═══════════════════════════════════════════
              UPI PAYMENT
          ═══════════════════════════════════════════ */}
          {payMethod &&
            String(payMethod).trim().toUpperCase() ===
              'UPI' && (
              <>
                {(() => {
                  const selectedUpiMethod =
                    paymentMethods.find(
                      method =>
                        String(method.name)
                          .trim()
                          .toUpperCase() === 'UPI'
                    );

                  return selectedUpiMethod?.upiId ? (
                    <div
                      className="rounded-xl p-4 flex flex-col items-center gap-3 border-2"
                      style={{
                        background: WHITE,
                        borderColor: BORDER,
                      }}
                    >
                      <div
                        className="text-sm font-semibold"
                        style={{ color: MUTED }}
                      >
                        Scan to pay {fmt(total)}
                      </div>

                      <div
                        className="bg-white p-2 rounded-xl border-2"
                        style={{ borderColor: BORDER }}
                      >
                        <QRCodeSVG
                          value={`upi://pay?pa=${encodeURIComponent(
                            selectedUpiMethod.upiId
                          )}&am=${total.toFixed(
                            2
                          )}&cu=ETB&tn=Safina-Coffee-Restaurant`}
                          size={130}
                        />
                      </div>

                      <div
                        className="text-xs font-semibold"
                        style={{ color: MUTED }}
                      >
                        UPI ID:{' '}
                        {selectedUpiMethod.upiId}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs border-2"
                      style={{
                        background: '#FFFBEB',
                        borderColor: '#FDE68A',
                        color: '#92400E',
                      }}
                    >
                      <AlertTriangle
                        size={13}
                        className="shrink-0"
                      />

                      <span>
                        No UPI ID configured. Go to
                        Payment Methods.
                      </span>
                    </div>
                  );
                })()}
              </>
            )}

          {/* ═══════════════════════════════════════════
              OTHER / CUSTOM PAYMENT METHODS
          ═══════════════════════════════════════════ */}
          {payMethod &&
            !['CASH', 'UPI'].includes(
              String(payMethod)
                .trim()
                .toUpperCase()
            ) && (
              <div
                className="rounded-xl p-3 border-2"
                style={{
                  background: WHITE,
                  borderColor: BORDER,
                }}
              >
                <label
                  className="block text-xs font-black uppercase tracking-wide mb-2"
                  style={{
                    color: MUTED,
                    fontFamily: FONT_H,
                  }}
                >
                  Transaction Reference (optional)
                </label>

                <input
                  value={cardRef}
                  onChange={e =>
                    setCardRef(e.target.value)
                  }
                  placeholder="e.g. TXN-1234567"
                  className="w-full rounded-xl px-3 py-2.5 focus:outline-none border-2 transition font-mono"
                  style={{
                    background: '#F8FAFC',
                    borderColor: BORDER,
                    color: FG,
                  }}
                  onFocus={e => {
                    e.target.style.borderColor =
                      ACCENT;
                    e.target.style.boxShadow = `4px 4px 0px 0px ${ACCENT}`;
                  }}
                  onBlur={e => {
                    e.target.style.borderColor =
                      BORDER;
                    e.target.style.boxShadow =
                      'none';
                  }}
                />
              </div>
            )}
        </>
      ) : (
        <>
          {/* ═══════════════════════════════════════════
              SPLIT BILL
          ═══════════════════════════════════════════ */}

          <div className="flex gap-2 p-1 bg-slate-100 border-2 border-slate-800 rounded-xl mb-3">
            <button
              type="button"
              onClick={() => {
                setSplitMode('equal');
                setPaidSplits([]);
                setActiveSplitIdx(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition ${
                splitMode === 'equal'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              style={{ fontFamily: FONT_H }}
            >
              Equal Parts
            </button>

            <button
              type="button"
              onClick={() => {
                setSplitMode('item');
                setPaidSplits([]);
                setActiveSplitIdx(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition ${
                splitMode === 'item'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              style={{ fontFamily: FONT_H }}
            >
              Split by Items
            </button>
          </div>

          {splitMode === 'equal' ? (
            <div
              className="flex items-center justify-between p-3 bg-white border-2 border-slate-850 rounded-2xl mb-4"
              style={{
                boxShadow: 'var(--pop-shadow-sm)',
              }}
            >
              <span className="text-xs font-bold text-slate-700">
                Number of Guests
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEqualCount(c =>
                      Math.max(2, c - 1)
                    );
                    setPaidSplits([]);
                    setActiveSplitIdx(null);
                  }}
                  className="w-8 h-8 rounded-lg border-2 border-slate-800 flex items-center justify-center font-black"
                >
                  -
                </button>

                <span className="w-8 text-center font-black text-sm">
                  {equalCount}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setEqualCount(c =>
                      Math.min(10, c + 1)
                    );
                    setPaidSplits([]);
                    setActiveSplitIdx(null);
                  }}
                  className="w-8 h-8 rounded-lg border-2 border-slate-800 bg-slate-800 text-white flex items-center justify-center font-black"
                >
                  +
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              <div className="text-xs font-bold text-slate-500 mb-1">
                Assign Items to Guests:
              </div>

              {cartItems.map((item, itemIdx) => {
                const guestIdx =
                  getAssignedGuest(itemIdx);

                return (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between p-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs"
                    style={{
                      boxShadow:
                        'var(--pop-shadow-sm)',
                    }}
                  >
                    <div className="truncate pr-2 font-medium text-slate-800 flex flex-col">
                      <span>
                        {item.name}{' '}
                        <span className="text-slate-400">
                          × {item.quantity}
                        </span>
                      </span>

                      {parseFloat(item.tax || 0) >
                        0 && (
                        <span className="text-[10px] text-emerald-600 font-bold leading-none mt-0.5">
                          {item.tax}% Tax (ETB{' '}
                          {(
                            item.price *
                            item.quantity *
                            (parseFloat(
                              item.tax || 0
                            ) /
                              100)
                          ).toFixed(2)}
                          )
                        </span>
                      )}
                    </div>

                    <select
                      value={guestIdx}
                      onChange={e => {
                        setItemAssignments(
                          prev => ({
                            ...prev,
                            [itemIdx]:
                              parseInt(
                                e.target.value
                              ),
                          })
                        );

                        setPaidSplits([]);
                        setActiveSplitIdx(null);
                      }}
                      className="bg-slate-50 border-2 border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-slate-800 font-semibold text-slate-700"
                    >
                      {Array.from({
                        length: numGuests,
                      }).map((_, g) => (
                        <option
                          key={g}
                          value={g}
                        >
                          {getGuestName(g)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          {/* Split parts list */}
          <div className="space-y-2.5">
            {(splitMode === 'equal'
              ? getEqualSplits()
              : getItemSplits()
            ).map(part => {
              const amt =
                splitMode === 'equal'
                  ? part.amount
                  : part.total;

              if (amt === 0) return null;

              return (
                <div
                  key={part.index}
                  className="border-2 border-slate-800 rounded-2xl p-3 bg-white flex items-center justify-between"
                  style={{
                    boxShadow:
                      'var(--pop-shadow-sm)',
                  }}
                >
                  <div>
                    <div
                      className="text-xs font-black uppercase tracking-wider text-slate-400"
                      style={{ fontFamily: FONT_H }}
                    >
                      {splitMode === 'equal'
                        ? `Guest ${part.index + 1}`
                        : part.name}
                    </div>

                    <div className="text-lg font-black text-slate-800 mt-0.5">
                      {fmt(amt)}
                    </div>
                  </div>

                  <div>
                    {part.paid ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-[#D1FAE5] text-emerald-800 border-2 border-emerald-300 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                          <Check
                            size={11}
                            strokeWidth={3}
                          />

                          {part.method}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            resetSplitPayment(
                              part.index
                            )
                          }
                          className="w-7 h-7 flex items-center justify-center rounded-lg border-2 border-slate-200 text-rose-500 hover:border-slate-800 transition"
                          title="Reset Payment"
                        >
                          <X
                            size={13}
                            strokeWidth={2.5}
                          />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSplitIdx(
                            part.index
                          );
                          setPayMethod(null);
                          setCashReceived('');
                          setCardRef('');
                        }}
                        className="px-3 py-1.5 bg-violet-600 text-white border-2 border-slate-800 rounded-xl text-xs font-black hover:bg-violet-700 transition"
                        style={{
                          boxShadow:
                            '2px 2px 0px 0px #1E293B',
                          fontFamily: FONT_H,
                        }}
                      >
                        Pay Share
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════
              ACTIVE SPLIT PAYMENT MODAL
          ═══════════════════════════════════════════ */}
          {activeSplitIdx !== null && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
              <div
                className="bg-white border-2 border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4"
                style={{
                  boxShadow: 'var(--pop-shadow-lg)',
                }}
              >
                <div className="flex justify-between items-center pb-2 border-b-2">
                  <div>
                    <div
                      className="text-[10px] font-black uppercase tracking-wider text-slate-400"
                      style={{ fontFamily: FONT_H }}
                    >
                      Collect Share Payment
                    </div>

                    <div
                      className="text-base font-black text-slate-850"
                      style={{ fontFamily: FONT_H }}
                    >
                      {splitMode === 'equal'
                        ? `Guest ${activeSplitIdx + 1}`
                        : getGuestName(
                            activeSplitIdx
                          )}
                    </div>
                  </div>

                  <div className="text-xl font-black text-violet-600">
                    {fmt(
                      splitMode === 'equal'
                        ? getEqualSplits()[
                            activeSplitIdx
                          ].amount
                        : getItemSplits()[
                            activeSplitIdx
                          ].total
                    )}
                  </div>
                </div>

                <div
                  className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1"
                  style={{ fontFamily: FONT_H }}
                >
                  Select Method
                </div>

                {/* Dynamic payment methods */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {loadingPaymentMethods ? (
                    <div className="col-span-full text-center py-3 text-xs font-bold text-slate-400">
                      Loading payment methods...
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="col-span-full text-center py-3 text-xs font-bold text-red-500">
                      No payment methods are enabled
                    </div>
                  ) : (
                    paymentMethods.map(method => {
                      const methodName = String(
                        method.name || ''
                      ).trim();

                      const isSelected =
                        payMethod === methodName;

                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => {
                            setPayMethod(
                              methodName
                            );

                            const methodKey =
                              methodName.toUpperCase();

                            if (
                              methodKey !== 'CASH'
                            ) {
                              setCashReceived(
                                ''
                              );
                            }

                            if (
                              methodKey === 'CASH'
                            ) {
                              setCardRef('');
                            }
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-black border-2 transition truncate ${
                            isSelected
                              ? 'bg-violet-600 text-white border-slate-800'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                          style={{
                            boxShadow: isSelected
                              ? 'var(--pop-shadow-sm)'
                              : 'none',
                            fontFamily: FONT_H,
                          }}
                          title={methodName}
                        >
                          {methodName}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Split cash */}
                {payMethod &&
                  String(payMethod)
                    .trim()
                    .toUpperCase() ===
                    'CASH' && (
                    <div className="space-y-1.5">
                      <label
                        className="block text-[10px] font-black uppercase tracking-wide text-slate-400"
                        style={{
                          fontFamily: FONT_H,
                        }}
                      >
                        Cash Received (ETB)
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        value={cashReceived}
                        placeholder={(
                          splitMode === 'equal'
                            ? getEqualSplits()[
                                activeSplitIdx
                              ].amount
                            : getItemSplits()[
                                activeSplitIdx
                              ].total
                        ).toFixed(2)}
                        onChange={e =>
                          setCashReceived(
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm font-bold focus:outline-none border-2 transition bg-slate-50 border-slate-200 font-mono"
                      />

                      {cashReceived && (
                        <div className="flex justify-between text-xs font-bold text-emerald-600 bg-[#D1FAE5] px-2.5 py-1.5 rounded-lg border-2 border-emerald-350">
                          <span>
                            Change to Return
                          </span>

                          <span>
                            {fmt(
                              Math.max(
                                0,
                                parseFloat(
                                  cashReceived
                                ) -
                                  (splitMode ===
                                  'equal'
                                    ? getEqualSplits()[
                                        activeSplitIdx
                                      ].amount
                                    : getItemSplits()[
                                        activeSplitIdx
                                      ].total)
                              )
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                {/* Split UPI */}
                {payMethod &&
                  String(payMethod)
                    .trim()
                    .toUpperCase() ===
                    'UPI' && (
                    <>
                      {(() => {
                        const selectedUpiMethod =
                          paymentMethods.find(
                            method =>
                              String(
                                method.name
                              )
                                .trim()
                                .toUpperCase() ===
                              'UPI'
                          );

                        const splitAmount =
                          splitMode === 'equal'
                            ? getEqualSplits()[
                                activeSplitIdx
                              ].amount
                            : getItemSplits()[
                                activeSplitIdx
                              ].total;

                        return selectedUpiMethod?.upiId ? (
                          <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 border-2 rounded-xl">
                            <div className="text-[10px] font-semibold text-slate-500">
                              Scan to Pay Share
                            </div>

                            <div className="bg-white p-1 rounded-lg border">
                              <QRCodeSVG
                                value={`upi://pay?pa=${encodeURIComponent(
                                  selectedUpiMethod.upiId
                                )}&am=${splitAmount.toFixed(
                                  2
                                )}&cu=ETB&tn=Safina-Coffee-Restaurant-Share`}
                                size={90}
                              />
                            </div>

                            <div className="text-[9px] font-semibold text-slate-400 truncate max-w-[200px]">
                              {
                                selectedUpiMethod.upiId
                              }
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs border-2 bg-amber-50 border-amber-200 text-amber-800">
                            <AlertTriangle
                              size={13}
                              className="shrink-0"
                            />

                            <span>
                              No UPI ID configured.
                            </span>
                          </div>
                        );
                      })()}
                    </>
                  )}

                {/* Split custom / digital methods */}
                {payMethod &&
                  !['CASH', 'UPI'].includes(
                    String(payMethod)
                      .trim()
                      .toUpperCase()
                  ) && (
                    <div className="space-y-1.5">
                      <label
                        className="block text-[10px] font-black uppercase tracking-wide text-slate-400"
                        style={{
                          fontFamily: FONT_H,
                        }}
                      >
                        Transaction Reference
                        (optional)
                      </label>

                      <input
                        value={cardRef}
                        onChange={e =>
                          setCardRef(
                            e.target.value
                          )
                        }
                        placeholder="e.g. TXN-1234567"
                        className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none border-2 transition bg-slate-50 border-slate-200 font-mono"
                      />
                    </div>
                  )}

                {/* Split payment buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSplitIdx(null);
                      setPayMethod(null);
                      setCashReceived('');
                      setCardRef('');
                    }}
                    className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-800 rounded-xl font-bold transition text-xs shadow-pop-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={!payMethod}
                    onClick={() => {
                      const methodName =
                        String(
                          payMethod || ''
                        ).trim();

                      const methodKey =
                        methodName.toUpperCase();

                      const splitAmount =
                        splitMode === 'equal'
                          ? getEqualSplits()[
                              activeSplitIdx
                            ].amount
                          : getItemSplits()[
                              activeSplitIdx
                            ].total;

                      let paymentReference = '';

                      if (methodKey === 'CASH') {
                        const received =
                          cashReceived
                            ? parseFloat(
                                cashReceived
                              )
                            : 0;

                        const change =
                          Math.max(
                            0,
                            received -
                              splitAmount
                          );

                        paymentReference = `Cash Change: ${change.toFixed(
                          2
                        )}`;
                      } else if (
                        methodKey === 'UPI'
                      ) {
                        paymentReference =
                          'UPI Scan';
                      } else {
                        paymentReference =
                          cardRef?.trim() || '';
                      }

                      confirmSplitPayment(
                        methodName,
                        paymentReference
                      );

                      setPayMethod(null);
                      setCashReceived('');
                      setCardRef('');
                    }}
                    className="flex-1 py-2 bg-violet-600 text-white border-2 border-slate-800 rounded-xl font-black transition text-xs shadow-pop-sm disabled:opacity-50"
                  >
                    Confirm Pay
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>

    {/* ═══════════════════════════════════════════
        CHECKOUT ACTION BUTTON
    ═══════════════════════════════════════════ */}
    <div className="px-4 pb-4 shrink-0">
      {isSplit ? (
        <button
          onClick={handlePay}
          disabled={
            payLoading ||
            !isSplitFullyPaid()
          }
          className="w-full h-14 rounded-xl font-black text-base transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2 border-2"
          style={{
            background: ACCENT,
            color: '#fff',
            borderColor: FG,
            boxShadow: `4px 4px 0px 0px ${FG}`,
            fontFamily: FONT_H,
          }}
        >
          {payLoading ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              <span>Processing…</span>
            </>
          ) : (
            <>
              <CheckCircle2
                size={18}
                strokeWidth={2.5}
              />

              <span>
                Complete Split Payment · {fmt(total)}
              </span>
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handlePay}
          disabled={
            payLoading || !payMethod
          }
          className="w-full h-14 rounded-xl font-black text-base transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2 border-2"
          style={{
            background: ACCENT,
            color: '#fff',
            borderColor: FG,
            boxShadow: `4px 4px 0px 0px ${FG}`,
            fontFamily: FONT_H,
          }}
        >
          {payLoading ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              <span>Processing…</span>
            </>
          ) : (
            <>
              <CheckCircle2
                size={18}
                strokeWidth={2.5}
              />

              <span>
                Complete Payment · {fmt(total)}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  </div>
)}
      </div>

      {/* ── Modals ── */}
      {/* {showCoupon && <CouponModal onApply={setCoupon} onClose={() => setShowCoupon(false)} />} */}
      {showCustomer && (
        <CustomerModal
          onAssign={(c) => {
            assignCustomer(c);
            setShowCustomer(false);
          }}
          onClose={() => {
            setShowCustomer(false);
          }}
        />
      )}
      {showReceipt && paidOrder && (
        <ReceiptModal order={paidOrder} onClose={handleNewOrder} onNewOrder={handleNewOrder} />
      )}
    </div>
  );
}
