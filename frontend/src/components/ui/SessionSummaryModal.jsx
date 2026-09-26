import Modal from './Modal';
import { Trophy, Printer, LogOut, CheckCircle2 } from 'lucide-react';

export default function SessionSummaryModal({ isOpen, onClose, summary, session }) {
  if (!summary) return null;

  const handlePrint = () => {
    const fmt2 = n => `ETB ${Number(n||0).toFixed(2)}`;
    const categoryRows = (summary.topCategories || []).slice(0, 6)
      .map(c => `<tr><td>${c.name}</td><td style="text-align:right">${fmt2(c.revenue)}</td></tr>`)
      .join('');
    const topProduct = summary.topProducts?.[0];
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Shift Summary</title>
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
  @media print{@page{margin:15mm}}
</style></head><body>
  <h1>Cafe POS — Shift Summary</h1>
  <div class="sub">
    Session: ${session?.openedAt ? new Date(session.openedAt).toLocaleString('en-IN') : ''} → ${new Date().toLocaleString('en-IN')}
  </div>
  <div class="divider"></div>
  <div class="metrics">
    <div class="metric"><div class="val">${summary.totalOrders}</div><div class="lbl">Total Orders</div></div>
    <div class="metric"><div class="val">ETB ${Number(summary.revenue||0).toFixed(0)}</div><div class="lbl">Revenue</div></div>
    <div class="metric"><div class="val">ETB ${Number(summary.avgOrderValue||0).toFixed(0)}</div><div class="lbl">Avg Order</div></div>
  </div>
  ${topProduct ? `<div class="divider"></div><p><strong>Best Seller:</strong> ${topProduct.name} — ${topProduct.qty}× sold (ETB ${Number(topProduct.revenue||0).toFixed(0)})</p>` : ''}
  ${categoryRows ? `<div class="divider"></div>
  <table><thead><tr><th>Category</th><th style="text-align:right">Revenue</th></tr></thead>
  <tbody>${categoryRows}</tbody></table>` : ''}
  <div class="footer">Printed on ${new Date().toLocaleString('en-IN')} · Cafe POS</div>
</body></html>`;

    const old = document.getElementById('__session_frame__');
    if (old) old.remove();
    const iframe = document.createElement('iframe');
    iframe.id = '__session_frame__';
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
    <Modal isOpen={isOpen} onClose={onClose} title="Session Closed — Shift Summary" size="lg">
      <div className="space-y-6">

        {/* Header */}
        <div className="text-center p-6 bg-white border-2 border-slate-800 rounded-xl flex flex-col items-center" style={{ boxShadow: 'var(--pop-shadow-sm)' }}>
          <CheckCircle2 size={48} className="text-emerald-500 mb-3 animate-bounce" />
          <h2 className="text-xl font-bold text-slate-800 font-outfit">Great work today!</h2>
          <p className="text-slate-500 text-sm mt-1 font-jakarta">
            Session opened: {session?.openedAt
              ? new Date(session.openedAt).toLocaleString('en-IN')
              : 'N/A'}
          </p>
          <p className="text-slate-500 text-sm font-jakarta">
            Session closed: {new Date().toLocaleString('en-IN')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border-2 border-slate-800 rounded-xl p-4 text-center" style={{ boxShadow: 'var(--pop-shadow-sm)' }}>
            <div className="text-3xl font-black text-amber-500 font-outfit">
              {summary.totalOrders}
            </div>
            <div className="text-slate-500 text-xs font-bold mt-1 font-jakarta">Total Orders</div>
          </div>
          <div className="bg-white border-2 border-slate-800 rounded-xl p-4 text-center" style={{ boxShadow: 'var(--pop-shadow-sm)' }}>
            <div className="text-3xl font-black text-emerald-500 font-outfit">
              ETB {summary.revenue?.toFixed(0) || 0}
            </div>
            <div className="text-slate-500 text-xs font-bold mt-1 font-jakarta">Total Revenue</div>
          </div>
          <div className="bg-white border-2 border-slate-800 rounded-xl p-4 text-center" style={{ boxShadow: 'var(--pop-shadow-sm)' }}>
            <div className="text-3xl font-black text-violet-500 font-outfit">
              ETB {summary.avgOrderValue?.toFixed(0) || 0}
            </div>
            <div className="text-slate-500 text-xs font-bold mt-1 font-jakarta">Avg Order</div>
          </div>
        </div>

        {/* Top Product */}
        {summary.topProducts?.[0] && (
          <div className="bg-white border-2 border-slate-800 rounded-xl p-4 flex items-center gap-4" style={{ boxShadow: 'var(--pop-shadow-sm)' }}>
            <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shrink-0">
              <Trophy size={20} />
            </div>
            <div>
              <div className="text-slate-800 font-bold font-outfit">
                Best Seller: {summary.topProducts[0].name}
              </div>
              <div className="text-slate-500 text-xs font-medium font-jakarta mt-0.5">
                {summary.topProducts[0].qty} units sold —
                ETB {summary.topProducts[0].revenue?.toFixed(0)}
              </div>
            </div>
          </div>
        )}

        {/* Top Categories */}
        {summary.topCategories?.length > 0 && (
          <div className="bg-white border-2 border-slate-800 rounded-xl p-4" style={{ boxShadow: 'var(--pop-shadow-sm)' }}>
            <h3 className="text-slate-800 font-bold mb-3 font-outfit">Sales by Category</h3>
            <div className="space-y-2">
              {summary.topCategories.slice(0, 4).map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: cat.color || '#6b7280' }}
                  />
                  <div className="flex-1 text-sm font-medium text-slate-600 font-jakarta">{cat.name}</div>
                  <div className="text-sm font-bold text-slate-800 font-jakarta">
                    ETB {cat.revenue?.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handlePrint}
            className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-800 py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5"
            style={{ boxShadow: 'var(--pop-shadow-sm)' }}
          >
            <Printer size={16} />
            <span className="font-outfit">Print Summary</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white border-2 border-slate-800 py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5"
            style={{ boxShadow: 'var(--pop-shadow-sm)' }}
          >
            <LogOut size={16} />
            <span className="font-outfit">Done — Logout</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
