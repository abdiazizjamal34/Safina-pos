import { useState } from 'react';
import {
  CheckCircle2,
  Printer,
  X,
  Coffee,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const fmt = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/* ─────────────────────────────────────────────
   Design tokens
───────────────────────────────────────────── */
const BG = '#FFFDF5';
const WHITE = '#FFFFFF';
const FG = '#1E293B';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT = '#8B5CF6';
const EMERALD = '#34D399';
const DANGER = '#EF4444';
const FONT_H = "'Outfit', system-ui, sans-serif";

/**
 * =========================================================
 * LoanPaymentReceiptModal
 *
 * Props:
 *   open     boolean  — visibility
 *   onClose  fn       — close handler
 *   data     object   — { payment, customer, allocations, summary }
 * =========================================================
 */
export default function LoanPaymentReceiptModal({
  open,
  onClose,
  data,
}) {
  const [printing, setPrinting] = useState(false);

  if (!open || !data) return null;

  const payment = data.payment || {};
  const customer = data.customer || {};
  const summary = data.summary || {};
  const allocations = data.allocations || [];

  const totalOutstanding = Number(
    summary.customerOutstanding ?? 0
  );

  /* Build "Applied To" rows */
  const appliedToRows = allocations.map((a) => ({
    orderId: a.orderId,
    loanId: a.loanId,
    amount: Number(a.amount || 0),
    remaining: Number(a.remainingAmount || 0),
    status: a.status,
  }));

  /* ─────────────────────────────────────────
     Print handler — 80mm thermal layout
  ───────────────────────────────────────── */
  const handlePrint = () => {
    setPrinting(true);
    try {
      const appliedRowsHtml = appliedToRows
        .map(
          (r) => `
          <div class="row">
            <span>Order #${(r.orderId || '').slice(0, 8)}</span>
            <span>ETB ${fmt(r.amount)}</span>
          </div>
          <div class="row sub">
            <span>&nbsp;&nbsp;→ Remaining</span>
            <span>ETB ${fmt(r.remaining)}</span>
          </div>
          <div class="row sub">
            <span>&nbsp;&nbsp;→ Status</span>
            <span>${r.status}</span>
          </div>
        `
        )
        .join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Loan Payment Receipt</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:13px;color:#000;background:#fff;width:300px;padding:16px}
  h1{text-align:center;font-size:17px;font-weight:bold;margin-bottom:2px}
  .subtitle{text-align:center;font-size:11px;color:#555;margin-bottom:10px}
  .row{display:flex;justify-content:space-between;margin:3px 0;font-size:12px}
  .row.sub{font-size:11px;color:#444}
  .divider{border-top:1px dashed #999;margin:8px 0}
  .total-row{display:flex;justify-content:space-between;font-weight:bold;font-size:15px;margin-top:6px;border-top:2px solid #000;padding-top:6px}
  .section-title{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;margin-top:8px;margin-bottom:4px;font-weight:bold}
  .footer{text-align:center;font-size:11px;color:#555;margin-top:12px}
  @media print{@page{size:80mm auto;margin:0}body{width:80mm;padding:8px}}
</style></head><body>
  <h1>☕ Safina Cafe & Bakery</h1>
  <div class="subtitle">Loan Payment Receipt</div>

  <div class="row"><span>Date</span><span>${formatDateTime(payment.createdAt || new Date())}</span></div>
  ${payment.id ? `<div class="row"><span>Receipt ID</span><span>${String(payment.id).slice(0, 13).toUpperCase()}</span></div>` : ''}
  ${customer.name ? `<div class="row"><span>Customer</span><span>${customer.name}</span></div>` : ''}
  ${customer.phone ? `<div class="row"><span>Phone</span><span>${customer.phone}</span></div>` : ''}

  <div class="divider"></div>

  <div class="row" style="font-size:14px;font-weight:bold">
    <span>AMOUNT PAID</span>
    <span>ETB ${fmt(payment.amount)}</span>
  </div>
  <div class="row"><span>Method</span><span>${payment.paymentMethod || '-'}</span></div>
  ${payment.paymentReference ? `<div class="row"><span>Reference</span><span>${payment.paymentReference}</span></div>` : ''}
  ${payment.notes ? `<div class="row"><span>Notes</span><span>${payment.notes}</span></div>` : ''}

  <div class="divider"></div>

  <div class="section-title">Applied To</div>
  ${appliedRowsHtml || '<div class="row"><span>—</span><span>—</span></div>'}

  <div class="total-row">
    <span>REMAINING BALANCE</span>
    <span>ETB ${fmt(totalOutstanding)}</span>
  </div>

  <div class="footer">
    <div>Thank you for your payment 🙏</div>
    <div style="font-size:10px;margin-top:4px">www.safinacafe.com</div>
  </div>
</body></html>`;

      const old = document.getElementById('__loan_receipt_frame__');
      if (old) old.remove();
      const iframe = document.createElement('iframe');
      iframe.id = '__loan_receipt_frame__';
      iframe.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none';
      document.body.appendChild(iframe);
      const doc =
        iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => iframe.remove(), 3000);
      }, 400);
    } catch (e) {
      console.error('Print error:', e);
      toast.error('Failed to print receipt');
    } finally {
      setTimeout(() => setPrinting(false), 500);
    }
  };

  /* ─────────────────────────────────────────
     Render — screen modal
  ───────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      style={{ animation: 'modalIn 0.15s ease-out' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden border-2 flex flex-col max-h-[90vh]"
        style={{
          background: WHITE,
          borderColor: FG,
          boxShadow: '4px 4px 0px 0px #1E293B',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b-2 shrink-0"
          style={{ borderColor: BORDER, background: BG }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border-2"
              style={{ background: EMERALD, borderColor: FG }}
            >
              <CheckCircle2 size={18} strokeWidth={2.5} color="#fff" />
            </div>
            <div>
              <h2
                className="font-black text-sm leading-tight"
                style={{ color: FG, fontFamily: FONT_H }}
              >
                Payment Recorded
              </h2>
              <p
                className="text-[10px] font-semibold"
                style={{ color: MUTED }}
              >
                Loan payment receipt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border-2 transition hover:bg-slate-100"
            style={{ background: WHITE, borderColor: BORDER }}
          >
            <X size={16} strokeWidth={2.5} color={MUTED} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div
            className="rounded-xl p-4 border-2 space-y-3"
            style={{
              background: WHITE,
              borderColor: FG,
              boxShadow: '3px 3px 0px 0px #1E293B',
              fontFamily: "'Courier New', monospace",
            }}
          >
            {/* Brand */}
            <div
              className="flex items-center justify-center gap-2 font-bold text-base"
              style={{ color: FG, fontFamily: FONT_H }}
            >
              <Coffee size={16} color={ACCENT} />
              Safina Cafe & Bakery
            </div>
            <div
              className="text-center text-[10px] uppercase tracking-widest font-bold"
              style={{ color: MUTED }}
            >
              Loan Payment Receipt
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Meta */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: MUTED }}>Date</span>
                <span className="font-bold" style={{ color: FG }}>
                  {formatDateTime(payment.createdAt || new Date())}
                </span>
              </div>
              {customer.name && (
                <div className="flex justify-between">
                  <span style={{ color: MUTED }}>Customer</span>
                  <span
                    className="font-bold truncate max-w-[180px]"
                    style={{ color: FG }}
                  >
                    {customer.name}
                  </span>
                </div>
              )}
              {customer.phone && (
                <div className="flex justify-between">
                  <span style={{ color: MUTED }}>Phone</span>
                  <span className="font-bold" style={{ color: FG }}>
                    {customer.phone}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Amount */}
            <div className="flex justify-between items-center">
              <span
                className="text-sm font-black uppercase"
                style={{ color: FG, fontFamily: FONT_H }}
              >
                Amount Paid
              </span>
              <span
                className="text-xl font-black"
                style={{ color: ACCENT, fontFamily: FONT_H }}
              >
                ETB {fmt(payment.amount)}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: MUTED }}>Method</span>
                <span className="font-bold" style={{ color: FG }}>
                  {payment.paymentMethod || '—'}
                </span>
              </div>
              {payment.paymentReference && (
                <div className="flex justify-between">
                  <span style={{ color: MUTED }}>Reference</span>
                  <span
                    className="font-mono font-bold truncate max-w-[180px]"
                    style={{ color: FG }}
                  >
                    {payment.paymentReference}
                  </span>
                </div>
              )}
              {payment.notes && (
                <div className="flex justify-between">
                  <span style={{ color: MUTED }}>Notes</span>
                  <span
                    className="font-bold truncate max-w-[180px]"
                    style={{ color: FG }}
                  >
                    {payment.notes}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Applied to */}
            <div>
              <div
                className="text-[10px] uppercase tracking-widest font-black mb-2"
                style={{ color: MUTED, fontFamily: FONT_H }}
              >
                Applied To
              </div>

              {appliedToRows.length === 0 ? (
                <div className="text-xs italic" style={{ color: MUTED }}>
                  No allocation details available
                </div>
              ) : (
                <div className="space-y-2">
                  {appliedToRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg px-2.5 py-2 border"
                      style={{ background: BG, borderColor: BORDER }}
                    >
                      <div className="flex justify-between text-xs">
                        <span className="font-bold" style={{ color: FG }}>
                          Order #{(row.orderId || '').slice(0, 8)}
                        </span>
                        <span
                          className="font-black"
                          style={{ color: ACCENT }}
                        >
                          ETB {fmt(row.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] mt-0.5">
                        <span style={{ color: MUTED }}>Remaining</span>
                        <span
                          className="font-bold"
                          style={{
                            color:
                              row.remaining <= 0.01 ? '#059669' : DANGER,
                          }}
                        >
                          ETB {fmt(row.remaining)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: MUTED }}>Status</span>
                        <span className="font-bold" style={{ color: FG }}>
                          {row.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Total outstanding */}
            <div
              className="flex justify-between items-center rounded-lg px-3 py-2 border-2"
              style={{
                background:
                  totalOutstanding > 0.01 ? '#FEF2F2' : '#ECFDF5',
                borderColor:
                  totalOutstanding > 0.01 ? '#FCA5A5' : '#6EE7B7',
              }}
            >
              <span
                className="text-xs font-black uppercase tracking-wide"
                style={{
                  color: totalOutstanding > 0.01 ? DANGER : '#047857',
                  fontFamily: FONT_H,
                }}
              >
                Remaining Balance
              </span>
              <span
                className="text-base font-black"
                style={{
                  color: totalOutstanding > 0.01 ? DANGER : '#047857',
                  fontFamily: FONT_H,
                }}
              >
                ETB {fmt(totalOutstanding)}
              </span>
            </div>

            <div
              className="text-center text-[10px] pt-2"
              style={{ color: MUTED }}
            >
              Thank you for your payment 🙏
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-5 py-4 border-t-2 flex gap-2"
          style={{ borderColor: BORDER, background: BG }}
        >
          <button
            type="button"
            onClick={handlePrint}
            disabled={printing}
            className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-black border-2 transition hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50"
            style={{
              background: WHITE,
              color: FG,
              borderColor: FG,
              boxShadow: '2px 2px 0px 0px #1E293B',
              fontFamily: FONT_H,
            }}
          >
            <Printer size={15} strokeWidth={2.5} />
            {printing ? 'Printing…' : 'Print'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-black border-2 transition hover:-translate-y-0.5 active:translate-y-0.5"
            style={{
              background: ACCENT,
              color: '#fff',
              borderColor: FG,
              boxShadow: '2px 2px 0px 0px #1E293B',
              fontFamily: FONT_H,
            }}
          >
            <CheckCircle2 size={15} strokeWidth={2.5} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}