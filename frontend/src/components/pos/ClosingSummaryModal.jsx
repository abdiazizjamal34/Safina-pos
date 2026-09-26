import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  Clipboard, Coins, BarChart3, XCircle, AlertTriangle,
  Trophy, Printer, LogOut, Play, CheckCircle2,
  Wallet, CreditCard, Smartphone
} from 'lucide-react';

const fmt = (n) =>
  `ETB ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function MetricCard({ label, value, sub, icon: Icon, iconBg, iconColor = 'text-slate-800' }) {
  return (
    <div 
      className="bg-white border-2 border-slate-800 rounded-xl p-4 flex items-center gap-4 font-jakarta"
      style={{ boxShadow: 'var(--pop-shadow-sm)' }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border-2 border-slate-800 ${iconBg} ${iconColor}`}>
        {Icon && <Icon size={22} />}
      </div>
      <div>
        <div className="text-2xl font-black text-slate-800 font-outfit">{value}</div>
        <div className="text-xs font-bold text-slate-500">{label}</div>
        {sub && <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function PaymentBar({ breakdown }) {
  const total = (breakdown?.CASH || 0) + (breakdown?.CARD || 0) + (breakdown?.UPI || 0);
  const pct = (v) => total > 0 ? (v / total) * 100 : 0;

  const segments = [
    { key: 'CASH', label: 'Cash',  color: 'bg-emerald-500', icon: Wallet },
    { key: 'CARD', label: 'Card',  color: 'bg-blue-500',  icon: CreditCard },
    { key: 'UPI',  label: 'UPI',   color: 'bg-purple-500',icon: Smartphone },
  ].filter(s => (breakdown?.[s.key] || 0) > 0);

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="h-4 rounded-full overflow-hidden bg-slate-100 border border-slate-300 flex">
        {segments.map(s => (
          <div
            key={s.key}
            className={`${s.color} transition-all duration-700`}
            style={{ width: `${pct(breakdown?.[s.key] || 0)}%` }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: 'CASH', label: 'Cash',  color: 'bg-emerald-500', icon: Wallet, iconColor: 'text-emerald-600' },
          { key: 'CARD', label: 'Card',  color: 'bg-blue-500',  icon: CreditCard, iconColor: 'text-blue-600' },
          { key: 'UPI',  label: 'UPI',   color: 'bg-purple-500',icon: Smartphone, iconColor: 'text-purple-600' },
        ].map(s => {
          const LegendIcon = s.icon;
          return (
            <div 
              key={s.key} 
              className="bg-white border-2 border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center font-jakarta"
              style={{ boxShadow: 'var(--pop-shadow-sm)' }}
            >
              <LegendIcon size={20} className={`mb-1 ${s.iconColor}`} />
              <div className="text-slate-800 font-bold text-sm font-outfit">{fmt(breakdown?.[s.key] || 0)}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                <span className="text-xs text-slate-650 font-bold">{pct(breakdown?.[s.key] || 0).toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ClosingSummaryModal({ summary, onClose }) {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  if (!summary) return null;

  const handleReturnToLogin = () => {
    logout();
    navigate('/login');
  };

  const handleStartNew = async () => {
    try {
      await api.post('/session/open');
      toast.success('New session started!');
      onClose();
    } catch { toast.error('Failed to start new session'); }
  };

  const handleDownloadPDF = () => {
    const s = summary;
    const fmt2 = n => `ETB ${Number(n||0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;

    const categoryRows = (s.categoryBreakdown || [])
      .map(c => `<tr><td>${c.name}</td><td style="text-align:right">${fmt2(c.revenue)}</td></tr>`)
      .join('');

    const payRows = ['CASH','CARD','UPI']
      .filter(k => (s.paymentBreakdown?.[k] || 0) > 0)
      .map(k => `<tr><td>${k}</td><td style="text-align:right">${fmt2(s.paymentBreakdown[k])}</td></tr>`)
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Shift Summary — ${new Date(s.closedAt).toLocaleDateString('en-IN')}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:sans-serif;font-size:13px;color:#111;background:#fff;padding:24px;max-width:480px;margin:auto}
  h1{text-align:center;font-size:20px;font-weight:700;margin-bottom:4px}
  .sub{text-align:center;color:#666;font-size:11px;margin-bottom:16px}
  .divider{border-top:1px dashed #ccc;margin:12px 0}
  .metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}
  .metric{border:1px solid #ddd;border-radius:8px;padding:10px;text-align:center}
  .metric .val{font-size:18px;font-weight:700;color:#f97316}
  .metric .lbl{font-size:10px;color:#666;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin:8px 0}
  th{text-align:left;font-size:11px;color:#666;padding:4px 0;border-bottom:1px solid #eee}
  td{padding:5px 0;font-size:12px;border-bottom:1px solid #f5f5f5}
  .footer{text-align:center;color:#999;font-size:10px;margin-top:16px}
  @media print{@page{margin:15mm}body{padding:0}}
</style></head><body>
  <h1>Cafe POS — Shift Summary</h1>
  <div class="sub">
    ${new Date(s.openedAt).toLocaleString('en-IN')} → ${new Date(s.closedAt).toLocaleString('en-IN')}
    &nbsp;·&nbsp; Duration: ${s.duration || '—'}
  </div>
  <div class="divider"></div>
  <div class="metrics">
    <div class="metric"><div class="val">${s.totalOrders}</div><div class="lbl">Total Orders</div></div>
    <div class="metric"><div class="val">${fmt2(s.totalRevenue)}</div><div class="lbl">Revenue</div></div>
    <div class="metric"><div class="val">${fmt2(s.avgOrderValue)}</div><div class="lbl">Avg Order</div></div>
  </div>
  ${s.topProduct ? `<div class="divider"></div>
  <p><strong>Best Seller:</strong> ${s.topProduct.name} — ${s.topProduct.quantity}× sold (${fmt2(s.topProduct.revenue)})</p>` : ''}
  ${payRows ? `<div class="divider"></div>
  <table><thead><tr><th>Payment Method</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${payRows}</tbody></table>` : ''}
  ${categoryRows ? `<div class="divider"></div>
  <table><thead><tr><th>Category</th><th style="text-align:right">Revenue</th></tr></thead>
  <tbody>${categoryRows}</tbody></table>` : ''}
  <div class="footer">Printed on ${new Date().toLocaleString('en-IN')} · Cafe POS</div>
</body></html>`;

    const old = document.getElementById('__shift_frame__');
    if (old) old.remove();
    const iframe = document.createElement('iframe');
    iframe.id = '__shift_frame__';
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white border-2 border-slate-800 rounded-2xl w-full max-w-2xl my-4 flex flex-col"
        style={{ boxShadow: 'var(--pop-shadow-lg)', animation: 'modalIn 0.18s ease-out' }}
      >
        {/* Header */}
        <div className="bg-[#FFFDF5] border-b-2 border-slate-100 rounded-t-2xl px-8 py-6 text-center flex flex-col items-center shrink-0 font-jakarta">
          <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 mb-3 animate-bounce">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 font-outfit">Session Closed</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Session ran for <span className="text-slate-800 font-bold">{summary.duration}</span>
            <span className="mx-2 text-slate-350">·</span>
            {new Date(summary.openedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {' → '}
            {new Date(summary.closedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="px-8 py-6 space-y-6 bg-[#FFFDF5] rounded-b-2xl">
          {/* Draft warning */}
          {summary.draftOrdersWarning > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="text-amber-500 shrink-0 animate-pulse" size={24} />
              <div className="font-jakarta">
                <div className="text-amber-800 font-bold text-sm">Draft Orders Abandoned</div>
                <div className="text-amber-600 text-xs mt-0.5 font-medium">
                  {summary.draftOrdersWarning} draft order{summary.draftOrdersWarning !== 1 ? 's were' : ' was'} not completed when the session closed.
                </div>
              </div>
            </div>
          )}

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Total Orders (Paid)" value={summary.totalOrders} icon={Clipboard} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <MetricCard label="Total Revenue" value={fmt(summary.totalRevenue)} icon={Coins} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <MetricCard label="Avg Order Value" value={fmt(summary.avgOrderValue)} icon={BarChart3} iconBg="bg-amber-50" iconColor="text-amber-600" />
            <MetricCard
              label="Cancelled Orders"
              value={summary.orderStatusBreakdown?.cancelled || 0}
              icon={XCircle}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              sub={`${summary.orderStatusBreakdown?.paid || 0} paid · ${summary.orderStatusBreakdown?.draft || 0} draft`}
            />
          </div>

          {/* Payment breakdown */}
          <div className="border-t-2 border-slate-100 pt-4">
            <h3 className="text-slate-800 font-bold text-sm mb-3 flex items-center gap-2 font-outfit">
              <CreditCard size={16} className="text-violet-600" />
              <span>Payment Breakdown</span>
            </h3>
            <PaymentBar breakdown={summary.paymentBreakdown} />
          </div>

          {/* Top product */}
          {summary.topProduct && (
            <div 
              className="bg-white border-2 border-slate-800 rounded-xl px-5 py-4 flex items-center justify-between"
              style={{ boxShadow: 'var(--pop-shadow-sm)' }}
            >
              <div className="flex items-center gap-3">
                <Trophy className="text-amber-500 animate-pulse" size={28} />
                <div className="font-jakarta">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Top Selling Product</div>
                  <div className="text-slate-800 font-black text-lg mt-0.5 font-outfit">{summary.topProduct.name}</div>
                </div>
              </div>
              <div className="text-right font-jakarta">
                <div className="text-violet-600 font-black text-xl font-outfit">{summary.topProduct.quantity}×</div>
                <div className="text-slate-500 text-xs font-bold">{fmt(summary.topProduct.revenue)}</div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-4 pt-2 no-print font-outfit">
            <button
              onClick={handleDownloadPDF}
              className="flex flex-col items-center gap-1.5 bg-white hover:bg-slate-50 border-2 border-slate-800 text-slate-800 py-3 px-4 rounded-xl text-sm font-bold shadow-pop-sm transition"
            >
              <Printer size={20} className="text-slate-500" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleReturnToLogin}
              className="flex flex-col items-center gap-1.5 bg-white hover:bg-slate-50 border-2 border-slate-800 text-slate-800 py-3 px-4 rounded-xl text-sm font-bold shadow-pop-sm transition"
            >
              <LogOut size={20} className="text-slate-500" />
              <span>Return to Login</span>
            </button>
            <button
              onClick={handleStartNew}
              className="flex flex-col items-center gap-1.5 bg-violet-600 hover:bg-violet-700 border-2 border-slate-800 text-white py-3 px-4 rounded-xl text-sm font-bold shadow-pop-sm transition"
            >
              <Play size={20} />
              <span>New Session</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
