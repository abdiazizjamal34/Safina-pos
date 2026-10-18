const nodemailer = require('nodemailer');

/* ── explicit SMTP (more reliable than service:'gmail') ── */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,          // STARTTLS on port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_PASS || '').replace(/\s/g, ''), // strip spaces from app-password
  },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 5000, // 5 seconds
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

/* ── verify connection at startup so errors appear in logs ── */
transporter.verify((err) => {
  if (err) console.error('❌ Email transporter error:', err.message);
  else     console.log(`✅ Email ready — sending as ${process.env.EMAIL_USER}`);
});

const sendReceiptEmail = async (to, order) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials (EMAIL_USER / EMAIL_PASS) are not configured on the hosted server.');
  }
  const itemRows = order.lines.map(l => {
    const rate = parseFloat(l.product?.tax || 0);
    const lineTax = parseFloat(l.lineTotal || 0) * (rate / 100);
    const taxText = rate > 0 ? `<br/><span style="font-size:11px;color:#9ca3af">${rate}% Tax: Rs.${lineTax.toFixed(2)}</span>` : '';
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #333">${l.product.name}${taxText}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:center">${l.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right">Rs.${parseFloat(l.unitPrice).toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right">Rs.${parseFloat(l.lineTotal).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const taxBreakdown = {};
  order.lines.forEach(l => {
    const rate = parseFloat(l.product?.tax || 0);
    const lineTotal = parseFloat(l.lineTotal || 0);
    if (!taxBreakdown[rate]) {
      taxBreakdown[rate] = 0;
    }
    taxBreakdown[rate] += lineTotal * (rate / 100);
  });

  const totalPreDiscountTax = Object.values(taxBreakdown).reduce((s, a) => s + a, 0);
  const actualTaxAmount = parseFloat(order.taxAmount);
  const scale = totalPreDiscountTax > 0 ? (actualTaxAmount / totalPreDiscountTax) : 0;

  const taxHtmlRows = Object.keys(taxBreakdown).sort((a, b) => parseFloat(a) - parseFloat(b)).map(rateStr => {
    const rate = parseFloat(rateStr);
    const amount = taxBreakdown[rateStr] * scale;
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#9ca3af">Tax (${rate}%)</span>
        <span>Rs.${amount.toFixed(2)}</span>
      </div>
    `;
  }).join('');

  const taxTextLines = Object.keys(taxBreakdown).sort((a, b) => parseFloat(a) - parseFloat(b)).map(rateStr => {
    const rate = parseFloat(rateStr);
    const amount = taxBreakdown[rateStr] * scale;
    return `Tax (${rate}%):  Rs.${amount.toFixed(2)}`;
  });

  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#1a1a1a;color:#fff;padding:24px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#f97316;margin:0">Cafe POS</h1>
        <p style="color:#9ca3af;margin:4px 0">Thank you for your visit!</p>
      </div>
      <div style="background:#262626;padding:16px;border-radius:8px;margin-bottom:16px">
        <p style="margin:4px 0;color:#9ca3af">Order: <span style="color:#fff;font-weight:bold">${order.orderNumber}</span></p>
        <p style="margin:4px 0;color:#9ca3af">Date: <span style="color:#fff">${new Date(order.createdAt).toLocaleString('en-IN')}</span></p>
        ${order.table ? `<p style="margin:4px 0;color:#9ca3af">Table: <span style="color:#fff">${order.table.tableNumber}</span></p>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f97316">
            <th style="padding:10px;text-align:left">Item</th>
            <th style="padding:10px;text-align:center">Qty</th>
            <th style="padding:10px;text-align:right">Price</th>
            <th style="padding:10px;text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="margin-top:16px;padding:16px;background:#262626;border-radius:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#9ca3af">Subtotal</span>
          <span>Rs.${parseFloat(order.subtotal).toFixed(2)}</span>
        </div>
        ${taxHtmlRows}
        ${parseFloat(order.discountAmount) > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#9ca3af">Discount</span>
          <span style="color:#10b981">-Rs.${parseFloat(order.discountAmount).toFixed(2)}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold;border-top:1px solid #444;padding-top:12px;margin-top:8px">
          <span>Total</span>
          <span style="color:#f97316">Rs.${parseFloat(order.total).toFixed(2)}</span>
        </div>
        <div style="margin-top:8px;color:#9ca3af;font-size:12px">
          Payment: ${order.paymentMethod || 'N/A'}
        </div>
      </div>
      <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:24px">
        Visit us again! | ${process.env.EMAIL_USER}
      </p>
    </div>
  `;

  /* plain-text fallback (improves inbox placement) */
  const text = [
    'Cafe POS — Receipt',
    `Order: ${order.orderNumber}`,
    `Date: ${new Date(order.createdAt).toLocaleString('en-IN')}`,
    order.table ? `Table: ${order.table.tableNumber}` : '',
    '',
    ...order.lines.map(l => {
      const rate = parseFloat(l.product?.tax || 0);
      const lineTax = parseFloat(l.lineTotal || 0) * (rate / 100);
      const taxSuffix = rate > 0 ? ` (+${rate}% Tax: Rs.${lineTax.toFixed(2)})` : '';
      return `${l.product.name} x${l.quantity}${taxSuffix}  Rs.${parseFloat(l.lineTotal).toFixed(2)}`;
    }),
    '',
    `Subtotal: Rs.${parseFloat(order.subtotal).toFixed(2)}`,
    ...taxTextLines,
    `TOTAL:    Rs.${parseFloat(order.total).toFixed(2)}`,
    '',
    'Thank you for visiting Cafe POS!',
  ].filter(l => l !== undefined).join('\n');

  const info = await transporter.sendMail({
    from: `"Cafe POS" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your receipt for ${order.orderNumber} — Rs.${parseFloat(order.total).toFixed(2)}`,
    text,
    html,
  });

  console.log(`📧 Email sent to ${to} — messageId: ${info.messageId}`);
};

module.exports = { sendReceiptEmail };

/**
 * Send an alert 30 minutes before closing if there are unfinished orders
 */
const sendClosingAlertEmail = async (adminEmail, unfinishedOrders) => {
  try {
    const fmt = (n) => `ETB ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    
    const rows = unfinishedOrders.map(o => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${o.orderNumber}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${o.table?.tableNumber || o.orderType}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; color: #dc2626; font-weight: bold;">${o.status}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmt(o.total)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #dc2626;">⚠️ URGENT: Session Closing in 30 Minutes</h2>
        <p>The POS session will close automatically shortly.</p>
        <p>You currently have <strong>${unfinishedOrders.length} unfinished order(s)</strong>. If they are not completed or cancelled, the system will automatically mark them as PAID at closing time.</p>
        
        <h3>Unfinished Orders:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f1f5f9; text-align: left;">
            <th style="padding: 8px;">Order #</th>
            <th style="padding: 8px;">Type/Table</th>
            <th style="padding: 8px;">Status</th>
            <th style="padding: 8px; text-align: right;">Total</th>
          </tr>
          ${rows}
        </table>
        
        <p style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
          This is an automated alert from Safina POS.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `⚠️ URGENT: ${unfinishedOrders.length} Unfinished Orders Pending Close`,
      html
    });
    console.log('✅ Closing alert email sent.');
  } catch (error) {
    console.error('❌ Failed to send alert email:', error);
  }
};

/**
 * Send the Daily End-of-Day Report
 */
const sendDailyReportEmail = async (adminEmail, reportData, loans) => {
  try {
    const fmt = (n) => `ETB ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    
    // Build the payment methods HTML
    const paymentRows = (reportData.paymentMethods?.methods || []).map(m => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${m.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmt(m.amount)}</td>
      </tr>
    `).join('');

    // Build the outstanding loans HTML
    const loanRows = loans.map(l => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${l.customer?.name || 'Unknown'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${l.order?.orderNumber || '—'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #dc2626;">${fmt(l.remainingAmount)}</td>
      </tr>
    `).join('') || '<tr><td colspan="3" style="padding: 8px; text-align: center;">No outstanding loans</td></tr>';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #8B5CF6;">Safina POS - Daily Session Report</h2>
        <p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>
        
        <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0;">Summary</h3>
          <p>Total Orders: <strong>${reportData.totalOrders}</strong></p>
          <p>Total Revenue: <strong style="color: #059669;">${fmt(reportData.revenue)}</strong></p>
          <p>Average Order Value: <strong>${fmt(reportData.avgOrderValue)}</strong></p>
        </div>

        <h3>Sales by Payment Method</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #f1f5f9; text-align: left;">
            <th style="padding: 8px;">Method</th>
            <th style="padding: 8px; text-align: right;">Amount</th>
          </tr>
          ${paymentRows}
        </table>

                <!-- Force Paid Orders Alert -->
        ${reportData.forcedPaidOrders && reportData.forcedPaidOrders.length > 0 ? `
          <div style="background: #FEF2F2; border: 2px solid #FECACA; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #DC2626;">⚠️ Auto-Settled Orders</h3>
            <p>The following orders were unfinished at closing time and were automatically marked as <strong>PAID</strong>:</p>
            <ul style="margin: 0; padding-left: 20px; color: #991B1B;">
              ${reportData.forcedPaidOrders.map(id => `<li>Order #${id}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <h3>Outstanding Customer Loans</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f1f5f9; text-align: left;">
            <th style="padding: 8px;">Customer</th>
            <th style="padding: 8px;">Order #</th>
            <th style="padding: 8px; text-align: right;">Remaining</th>
          </tr>
          ${loanRows}
        </table>
        
        <p style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
          This is an automated message from Safina POS.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `Safina POS Daily Report - ${new Date().toLocaleDateString()}`,
      html
    });
    console.log('✅ Daily report email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send daily report email:', error);
  }
};

module.exports = {  sendReceiptEmail, 
  sendDailyReportEmail, 
  sendClosingAlertEmail  };
