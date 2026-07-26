import type { Business, Quote, QuoteItem } from '../types';
import { normalizePhoneNumber } from '../utils/phone';

interface InvoicePreviewProps {
  business: Business;
  quote: Quote;
  items: QuoteItem[];
  allQuotes: Quote[];
  onBack: () => void;
  onStatusChange: (status: Quote['status']) => void;
}

export default function InvoicePreview({
  business,
  quote,
  items,
  allQuotes,
  onBack,
  onStatusChange,
}: InvoicePreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountType = quote.discountType || 'percentage';
  const discountValue = quote.discountValue || 0;
  const rawDiscountAmount =
    discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
  const discountAmount = Math.min(Math.max(rawDiscountAmount, 0), subtotal);
  const netAmount = subtotal - discountAmount;
  const vatAmount = business.vatRegistered ? netAmount * (business.vatRate / 100) : 0;

  // Construct WhatsApp text
  const isInvoice = quote.documentType === 'invoice';
  const docTypeName = isInvoice ? 'Invoice' : 'Quote';
  const prefilledText = `Hi *${quote.customerName}*,\n\nHere is your *${docTypeName} (${quote.documentNumber})* from *${business.name}*.\n\n*Total Amount:* ${business.currencySymbol} ${quote.totalAmount.toFixed(2)}\n\nI will send the PDF document over this chat shortly. Thank you!`;
  
  const cleanPhone = quote.customerPhone
    ? normalizePhoneNumber(quote.customerPhone, business.defaultCountryCode)
    : '';

  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(prefilledText)}`
    : `https://wa.me/?text=${encodeURIComponent(prefilledText)}`;

  return (
    <div className="preview-container">
      {/* A4 Sheet Frame */}
      <div className={`a4-page-frame ${isInvoice ? 'doc-type-invoice' : 'doc-type-quote'}`} id="print-area">
        <div className="invoice-header">
          <div className="invoice-header-left">
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="invoice-logo"
              />
            )}
            <div className="invoice-biz-details">
              <h2>{business.name}</h2>
              <p style={{ whiteSpace: 'pre-line' }}>{business.address}</p>
              <p>Phone: {business.phone}</p>
              {business.email && <p>Email: {business.email}</p>}
              <p style={{ marginTop: '0.4rem', fontWeight: '600', fontSize: '0.8rem', color: '#475569' }}>
                TPIN: {business.tpin}
              </p>
            </div>
          </div>
          
          <div className="invoice-header-right">
            <h1 className="invoice-title">{docTypeName}</h1>
            {isInvoice && (
              <span className={`badge badge-${quote.status}`} style={{ marginBottom: '0.6rem' }}>
                {quote.status}
              </span>
            )}
            <div className="invoice-meta-grid">
              <dt>Number:</dt>
              <dd>{quote.documentNumber}</dd>
              
              <dt>Date Issued:</dt>
              <dd>{quote.issuedDate}</dd>
              
              {quote.dueDate && (
                <>
                  <dt>Due Date:</dt>
                  <dd className={isInvoice ? 'due-date-highlight' : ''}>{quote.dueDate}</dd>
                </>
              )}

              {quote.linkedQuoteId && (
                <>
                  <dt>Converted From:</dt>
                  <dd>{allQuotes.find((q) => q.id === quote.linkedQuoteId)?.documentNumber || 'a quote'}</dd>
                </>
              )}
              {quote.linkedInvoiceId && (
                <>
                  <dt>Converted To:</dt>
                  <dd>{allQuotes.find((q) => q.id === quote.linkedInvoiceId)?.documentNumber || 'an invoice'}</dd>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="invoice-bill-to">
          <h3>Bill To</h3>
          <p>{quote.customerName}</p>
          {quote.customerPhone && (
            <p className="customer-phone">Phone: {quote.customerPhone}</p>
          )}
        </div>

        <table className="invoice-items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="num-col">Qty</th>
              <th className="num-col">Unit Price</th>
              <th className="total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td className="num-col">{item.quantity} {item.unit && item.unit !== 'item' ? item.unit : ''}</td>
                <td className="num-col">
                  {business.currencySymbol} {item.unitPrice.toFixed(2)}
                  {item.unit ? `/${item.unit}` : ''}
                </td>
                <td className="total-col">{business.currencySymbol} {item.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-summary">
          <div className="invoice-summary-box" style={{ width: '300px', gridTemplateColumns: '1.2fr 1fr' }}>
            {(discountAmount > 0 || business.vatRegistered) && (
              <>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Subtotal:</span>
                <span style={{ textAlign: 'right', fontWeight: '600', fontSize: '0.9rem' }}>
                  {business.currencySymbol} {subtotal.toFixed(2)}
                </span>
              </>
            )}
            {discountAmount > 0 && (
              <>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}:
                </span>
                <span style={{ textAlign: 'right', fontWeight: '600', fontSize: '0.9rem', color: 'var(--accent-rose)' }}>
                  - {business.currencySymbol} {discountAmount.toFixed(2)}
                </span>
              </>
            )}
            {business.vatRegistered && (
              <>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>VAT ({business.vatRate}%):</span>
                <span style={{ textAlign: 'right', fontWeight: '600', fontSize: '0.9rem' }}>
                  {business.currencySymbol} {vatAmount.toFixed(2)}
                </span>
              </>
            )}
            <span className="grand-total-label">Grand Total:</span>
            <span className="grand-total-val" style={{ textAlign: 'right' }}>
              {business.currencySymbol} {quote.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {isInvoice && business.bankDetails && (
          <div className="invoice-payment-details">
            <h3>Payment Details</h3>
            <p style={{ whiteSpace: 'pre-line' }}>{business.bankDetails}</p>
          </div>
        )}
      </div>

      {/* Control Sidebar (Hidden during browser printing) */}
      <div className="no-print business-sidebar">
        <div className="card">
          <button
            className="btn btn-secondary"
            onClick={onBack}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            <svg className="icon" style={{ width: '16px', height: '16px' }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <button
            className="btn btn-primary"
            onClick={handlePrint}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            <svg className="icon" style={{ width: '16px', height: '16px' }}>
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
            </svg>
            Print / Save PDF
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-teal btn-secondary"
            style={{ width: '100%', display: 'flex', textDecoration: 'none', justifyContent: 'center' }}
          >
            <svg className="icon" style={{ width: '16px', height: '16px', fill: 'currentColor' }} viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.135-3.52c1.654.982 3.51 1.5 5.412 1.51 5.492.002 9.961-4.464 9.964-9.946.002-2.656-1.03-5.153-2.906-7.03C16.787 3.138 14.294 2.1 11.64 2.1c-5.497 0-9.966 4.467-9.969 9.948 0 1.992.518 3.94 1.508 5.663l-.988 3.606 3.693-.97z" />
            </svg>
            Share via WhatsApp
          </a>
        </div>

        {/* Status Toggle Card */}
        <div className="card">
          <h4 style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-title)' }}>
            Document Status
            <span
              className="info-icon"
              title={
                quote.documentType === 'quote'
                  ? 'Draft: not yet shared · Sent: shared with the customer · Accepted: customer agreed · Converted: turned into an invoice'
                  : 'Draft: not yet shared · Unpaid: invoice outstanding · Paid: payment received'
              }
            >
              i
            </span>
          </h4>
          {quote.status === 'converted' ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              This quote has been converted to an invoice, so its status is locked.
            </p>
          ) : (
            <select
              className="form-control"
              value={quote.status}
              onChange={(e) => onStatusChange(e.target.value as Quote['status'])}
            >
              {quote.documentType === 'quote' ? (
                <>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                </>
              ) : (
                <>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="draft">Draft</option>
                </>
              )}
            </select>
          )}
        </div>

        {/* Print Settings Checklist UI — collapsed by default */}
        <details className="card checklist-card">
          <summary className="checklist-title">Tips for a clean PDF (click to expand)</summary>
          <ul className="checklist-items">
            <li className="checklist-item">
              <svg className="icon" style={{ width: '16px', height: '16px', color: 'var(--accent-teal)', flexShrink: 0 }}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Set Destination to <strong>Save as PDF</strong></span>
            </li>
            
            <li className="checklist-item checklist-item-critical">
              <svg className="icon" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                <path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>CRITICAL: Enable "Background Graphics" in options (otherwise styles/logo may fail to render)</span>
            </li>

            <li className="checklist-item">
              <svg className="icon" style={{ width: '16px', height: '16px', color: 'var(--accent-teal)', flexShrink: 0 }}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Disable <strong>Headers and Footers</strong> to remove browser URLs/dates</span>
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}
