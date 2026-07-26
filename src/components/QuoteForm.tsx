import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import type { Business, Quote, QuoteItem } from '../types';

interface QuoteFormProps {
  activeBusiness: Business;
  quote: Quote | null;
  items: QuoteItem[];
  onSave: (quote: Quote, items: QuoteItem[], updateCounters: boolean) => void;
  onCancel: () => void;
}

interface LocalLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const UNIT_PRESETS = ['item', 'hour', 'day', 'bag', 'kg', 'm²'];

// A unit select shows "custom" whenever the stored value isn't one of the presets
const getUnitSelectValue = (unit: string) => (UNIT_PRESETS.includes(unit) ? unit : 'custom');

export default function QuoteForm({ activeBusiness, quote, items, onSave, onCancel }: QuoteFormProps) {
  const [documentType, setDocumentType] = useState<'quote' | 'invoice'>('quote');
  const [documentNumber, setDocumentNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [status, setStatus] = useState<Quote['status']>('draft');
  const [issuedDate, setIssuedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState<LocalLineItem[]>([]);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);

  // Track if we are editing an existing quote or creating a new one
  const isEditing = !!quote;

  // Track if the document number was custom edited
  const [isNumberCustom, setIsNumberCustom] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    if (quote) {
      setDocumentType(quote.documentType);
      setDocumentNumber(quote.documentNumber);
      setCustomerName(quote.customerName);
      setCustomerPhone(quote.customerPhone || '');
      setStatus(quote.status);
      setIssuedDate(quote.issuedDate);
      setDueDate(quote.dueDate || '');
      setDiscountType(quote.discountType || 'percentage');
      setDiscountValue(quote.discountValue || 0);
      setLineItems(
        items.map((it) => ({
          id: it.id,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit || 'item',
          unitPrice: it.unitPrice,
        }))
      );
      setIsNumberCustom(true); // Don't auto-generate if editing
    } else {
      setDocumentType('quote');
      setCustomerName('');
      setCustomerPhone('');
      setStatus('draft');
      setIssuedDate(today);
      setDueDate('');
      setDiscountType('percentage');
      setDiscountValue(0);
      setLineItems([{ id: crypto.randomUUID(), description: '', quantity: 1, unit: 'item', unitPrice: 0 }]);
      setIsNumberCustom(false);

      // Auto-generate starting number for quote
      const qNum = `${activeBusiness.quotePrefix}${String(activeBusiness.nextQuoteNumber).padStart(4, '0')}`;
      setDocumentNumber(qNum);
    }
  }, [quote, activeBusiness]);

  // Auto-generate document number when documentType changes, if not custom edited
  useEffect(() => {
    if (isEditing || isNumberCustom) return;

    if (documentType === 'quote') {
      const qNum = `${activeBusiness.quotePrefix}${String(activeBusiness.nextQuoteNumber).padStart(4, '0')}`;
      setDocumentNumber(qNum);
      setStatus('draft');
    } else {
      const invNum = `${activeBusiness.invoicePrefix}${String(activeBusiness.nextInvoiceNumber).padStart(4, '0')}`;
      setDocumentNumber(invNum);
      setStatus('unpaid');
    }
  }, [documentType, activeBusiness, isEditing, isNumberCustom]);

  const handleDocumentTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDocumentType(e.target.value as 'quote' | 'invoice');
  };

  const handleLineItemChange = (index: number, field: keyof LocalLineItem, value: any) => {
    const updated = [...lineItems];
    if (field === 'quantity') {
      updated[index].quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === 'unitPrice') {
      updated[index].unitPrice = Math.max(0, parseFloat(value) || 0);
    } else {
      updated[index][field] = value as any;
    }
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: crypto.randomUUID(), description: '', quantity: 1, unit: 'item', unitPrice: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      alert('Your quote must have at least one line item.');
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Compute total amount: Subtotal -> Discount -> Net -> VAT -> Grand Total
  const subtotal = lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const rawDiscountAmount =
    discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
  // Never let a discount take the net below zero
  const discountAmount = Math.min(Math.max(rawDiscountAmount, 0), subtotal);
  const netAmount = subtotal - discountAmount;
  const vatAmount = activeBusiness.vatRegistered ? netAmount * (activeBusiness.vatRate / 100) : 0;
  const totalAmount = netAmount + vatAmount;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return alert('Customer Name is required.');
    if (!documentNumber.trim()) return alert('Document Number is required.');
    if (lineItems.some((it) => !it.description.trim())) {
      return alert('All line items must have a description.');
    }

    const savedQuote: Quote = {
      id: quote?.id || crypto.randomUUID(),
      businessId: activeBusiness.id,
      documentType,
      documentNumber: documentNumber.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      status,
      totalAmount,
      issuedDate,
      dueDate: dueDate || undefined,
      discountType,
      discountValue: discountValue || undefined,
      createdAt: quote?.createdAt || new Date().toISOString(),
    };

    const savedItems: QuoteItem[] = lineItems.map((item) => ({
      id: item.id,
      quoteId: savedQuote.id,
      description: item.description.trim(),
      quantity: item.quantity,
      unit: item.unit || 'item',
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));

    // If we are creating a new quote, update counters if documentNumber matches the default format.
    // That way if they type a custom string we don't necessarily increment or we can decide.
    // Let's increment counters only if isEditing is false.
    onSave(savedQuote, savedItems, !isEditing);
  };

  return (
    <div className="card" style={{ maxWidth: '850px', margin: '1rem auto' }}>
      <h2 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-title)' }}>
        {isEditing ? `Edit ${quote.documentType === 'quote' ? 'Quote' : 'Invoice'} ${quote.documentNumber}` : 'Create New Document'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Document Type</label>
            <select className="form-control" value={documentType} onChange={handleDocumentTypeChange}>
              <option value="quote">Quote</option>
              <option value="invoice">Invoice</option>
            </select>
          </div>

          <div className="form-group">
            <label>Document Number</label>
            <input
              type="text"
              className="form-control"
              value={documentNumber}
              onChange={(e) => {
                setDocumentNumber(e.target.value);
                setIsNumberCustom(true);
              }}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Customer Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. John Mwanza"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Customer Phone (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 0977 987654"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Issue Date *</label>
            <input
              type="date"
              className="form-control"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Due Date (Optional)</label>
            <input
              type="date"
              className="form-control"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value as Quote['status'])}
            >
              {documentType === 'quote' ? (
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
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border-color)', margin: '1.5rem 0' }} />

        <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-title)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Line Items
          <button type="button" className="btn btn-secondary btn-teal" onClick={addLineItem} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            + Add Line Item
          </button>
        </h3>

        <div className="line-items-grid">
          {lineItems.map((item, index) => (
            <div className="line-item-row" key={item.id}>
              <div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Item description (e.g. Cement 50kg bag)"
                  value={item.description}
                  onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                  required
                />
              </div>
              <div>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                  min="1"
                  required
                />
              </div>
              <div>
                <select
                  className="form-control"
                  value={getUnitSelectValue(item.unit)}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleLineItemChange(index, 'unit', val === 'custom' ? '' : val);
                  }}
                >
                  {UNIT_PRESETS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value="custom">Custom…</option>
                </select>
                {getUnitSelectValue(item.unit) === 'custom' && (
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. sqm, load, session"
                    value={item.unit}
                    onChange={(e) => handleLineItemChange(index, 'unit', e.target.value)}
                    style={{ marginTop: '0.4rem' }}
                  />
                )}
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="Price"
                  value={item.unitPrice || ''}
                  onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                  min="0"
                  required
                />
              </div>
              <div className="line-item-total">
                {activeBusiness.currencySymbol} {(item.quantity * item.unitPrice).toFixed(2)}
                {item.unit && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    {item.quantity} × {activeBusiness.currencySymbol}{item.unitPrice}/{item.unit}
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-danger btn-icon"
                  onClick={() => removeLineItem(index)}
                  style={{ width: '32px', height: '32px', padding: 0 }}
                >
                  <svg className="icon" style={{ width: '16px', height: '16px' }}>
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <hr style={{ borderColor: 'var(--border-color)', margin: '1.5rem 0' }} />

        <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-title)' }}>Discount (Optional)</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Discount Type</label>
            <select
              className="form-control"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount ({activeBusiness.currencySymbol})</option>
            </select>
          </div>
          <div className="form-group">
            <label>Discount Value</label>
            <input
              type="number"
              className="form-control"
              min="0"
              step="0.01"
              value={discountValue || ''}
              placeholder="0"
              onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingRight: '3.5rem', gap: '2rem' }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(discountAmount > 0 || activeBusiness.vatRegistered) && (
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Subtotal: </span>
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                  {activeBusiness.currencySymbol} {subtotal.toFixed(2)}
                </span>
              </div>
            )}
            {discountAmount > 0 && (
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}:{' '}
                </span>
                <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--accent-rose)' }}>
                  - {activeBusiness.currencySymbol} {discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            {activeBusiness.vatRegistered && (
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>VAT ({activeBusiness.vatRate}%): </span>
                <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--accent-teal)' }}>
                  {activeBusiness.currencySymbol} {vatAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div style={{ borderTop: (discountAmount > 0 || activeBusiness.vatRegistered) ? '1px solid var(--border-color)' : 'none', paddingTop: (discountAmount > 0 || activeBusiness.vatRegistered) ? '0.5rem' : '0' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Grand Total:</span>
              <h3 style={{ fontSize: '1.6rem', color: 'var(--accent-teal)', fontFamily: 'var(--font-title)', marginTop: '0.1rem' }}>
                {activeBusiness.currencySymbol} {totalAmount.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
            Save Document
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
