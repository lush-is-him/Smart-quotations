import React, { useState, useRef } from 'react';
import type { Business, Quote, QuoteItem } from '../types';
import { exportData, importData } from '../utils/backup';

interface DashboardProps {
  businesses: Business[];
  quotes: Quote[];
  quoteItems: QuoteItem[];
  activeBusinessId: string | null;
  onSelectBusiness: (id: string | null) => void;
  onEditBusiness: () => void;
  onDeleteBusiness: (id: string) => void;
  onNewBusiness: () => void;
  onNewQuote: () => void;
  onEditQuote: (id: string) => void;
  onViewQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
  onConvertToInvoice: (quoteId: string) => void;
  onImportBackup: (data: { businesses: Business[]; quotes: Quote[]; quoteItems: QuoteItem[] }) => void;
}

export default function Dashboard({
  businesses,
  quotes,
  quoteItems,
  activeBusinessId,
  onSelectBusiness,
  onEditBusiness,
  onDeleteBusiness,
  onNewBusiness,
  onNewQuote,
  onEditQuote,
  onViewQuote,
  onDeleteQuote,
  onConvertToInvoice,
  onImportBackup,
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'quote' | 'invoice' | 'unpaid' | 'paid'>('all');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{
    businesses: Business[];
    quotes: Quote[];
    quoteItems: QuoteItem[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId);

  // Filter quotes belonging to the active business
  const businessQuotes = quotes.filter((q) => q.businessId === activeBusinessId);

  // Stats calculation
  const totalQuotesCount = businessQuotes.filter((q) => q.documentType === 'quote').length;
  const totalInvoicesCount = businessQuotes.filter((q) => q.documentType === 'invoice').length;
  const unpaidTotal = businessQuotes
    .filter((q) => q.documentType === 'invoice' && q.status === 'unpaid')
    .reduce((sum, q) => sum + q.totalAmount, 0);
  const paidTotal = businessQuotes
    .filter((q) => q.documentType === 'invoice' && q.status === 'paid')
    .reduce((sum, q) => sum + q.totalAmount, 0);

  // Filtering quotes for list view
  const filteredQuotes = businessQuotes.filter((q) => {
    const matchesSearch =
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.documentNumber.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'quote') return q.documentType === 'quote';
    if (filterType === 'invoice') return q.documentType === 'invoice';
    if (filterType === 'unpaid') return q.documentType === 'invoice' && q.status === 'unpaid';
    if (filterType === 'paid') return q.documentType === 'invoice' && q.status === 'paid';

    return true;
  });

  // Handle backup import file selection
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const data = await importData(e.target.files[0]);
        setPendingImportData(data);
        setShowImportConfirm(true);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Invalid backup file format');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const confirmImport = () => {
    if (pendingImportData) {
      onImportBackup(pendingImportData);
      setShowImportConfirm(false);
      setPendingImportData(null);
      alert('Data imported successfully!');
    }
  };

  const triggerDeleteBusiness = () => {
    if (!activeBusinessId) return;
    if (
      confirm(
        `Are you absolutely sure you want to delete "${activeBusiness?.name}"?\n\nThis will permanently delete the business profile, all of its quotes, and all line items. This action cannot be undone.`
      )
    ) {
      onDeleteBusiness(activeBusinessId);
    }
  };

  return (
    <div className="dashboard-grid">
      {/* Sidebar Controls */}
      <div className="business-sidebar">
        {/* Active Business Switcher */}
        <div className="card">
          <h4 style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-title)' }}>Active Business</h4>
          <select
            className="switcher-select"
            value={activeBusinessId || ''}
            onChange={(e) => onSelectBusiness(e.target.value || null)}
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            <option value="">+ Setup New Business</option>
          </select>

          {activeBusiness && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={onEditBusiness} style={{ flex: 1, padding: '0.5rem' }}>
                Edit Info
              </button>
              <button
                className="btn btn-danger btn-secondary"
                onClick={triggerDeleteBusiness}
                title="Delete Business"
                style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <svg className="icon" style={{ width: '16px', height: '16px' }}>
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span style={{ fontSize: '0.85rem' }}>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Business details card summary */}
        {activeBusiness ? (
          <div className="card business-info-card">
            <div className="business-logo-container">
              {activeBusiness.logoUrl ? (
                <img src={activeBusiness.logoUrl} alt={activeBusiness.name} className="business-logo-img" />
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Logo</div>
              )}
            </div>
            <h3 className="business-name">{activeBusiness.name}</h3>
            <div className="business-meta">
              <span>{activeBusiness.address}</span>
              <span>Phone: {activeBusiness.phone}</span>
              {activeBusiness.email && <span>{activeBusiness.email}</span>}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                WA Prefix: +{activeBusiness.defaultCountryCode}
              </span>
            </div>
          </div>
        ) : (
          <div className="card text-center" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--accent-teal)' }}>No Business Set Up</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
              You need to register at least one business profile to start generating quotes.
            </p>
            <button className="btn btn-primary" onClick={onNewBusiness} style={{ width: '100%' }}>
              Setup Business Now
            </button>
          </div>
        )}

        {/* Data backup import/export */}
        <div className="card">
          <h4 style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-title)' }}>Backup & Sync</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Your data is already saved in this browser — refreshing or closing the tab won't lose it.
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Use export/import only as a backup, or to move your data to another device or browser. Import will completely replace current data.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => exportData(businesses, quotes, quoteItems)} style={{ justifyContent: 'center' }}>
              Export Backup File
            </button>
            <button className="btn btn-secondary btn-teal" onClick={() => fileInputRef.current?.click()} style={{ justifyContent: 'center' }}>
              Import Backup File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Main Quote List & Stats */}
      <div className="quote-list-container">
        {activeBusiness ? (
          <>
            {/* Stats row */}
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-label">Total Quotes</span>
                <span className="stat-value">{totalQuotesCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Invoices</span>
                <span className="stat-value">{totalInvoicesCount}</span>
              </div>
              <div className="stat-card" style={{ borderLeftColor: 'var(--accent-rose)' }}>
                <span className="stat-label" style={{ color: 'var(--accent-rose)' }}>Unpaid Amount</span>
                <span className="stat-value" style={{ color: 'var(--accent-rose)' }}>{activeBusiness.currencySymbol} {unpaidTotal.toFixed(2)}</span>
              </div>
              <div className="stat-card" style={{ borderLeftColor: 'var(--accent-emerald)' }}>
                <span className="stat-label" style={{ color: 'var(--accent-emerald)' }}>Paid Amount</span>
                <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{activeBusiness.currencySymbol} {paidTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* List and table card */}
            <div className="card" style={{ flex: 1 }}>
              <div className="list-header-row">
                <div className="search-filter-bar">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by customer or doc number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ maxWidth: '280px' }}
                  />
                  <select
                    className="form-control"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    style={{ maxWidth: '150px' }}
                  >
                    <option value="all">All Documents</option>
                    <option value="quote">Quotes Only</option>
                    <option value="invoice">Invoices Only</option>
                    <option value="unpaid">Unpaid Invoices</option>
                    <option value="paid">Paid Invoices</option>
                  </select>
                </div>

                <button className="btn btn-primary" onClick={onNewQuote}>
                  + Create Document
                </button>
              </div>

              {filteredQuotes.length > 0 ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Doc Number</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Total Amount</th>
                        <th>
                          Status
                          <span
                            className="info-icon"
                            title="Draft: not yet shared · Sent: shared with the customer · Accepted: customer agreed · Converted: turned into an invoice · Unpaid: invoice outstanding · Paid: payment received"
                          >
                            i
                          </span>
                        </th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuotes.map((q) => (
                        <tr key={q.id}>
                          <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{q.documentNumber}</td>
                          <td>{q.customerName}</td>
                          <td>{q.issuedDate}</td>
                          <td>
                            <span style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>
                              {q.documentType}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>{activeBusiness.currencySymbol} {q.totalAmount.toFixed(2)}</td>
                          <td>
                            <span className={`badge badge-${q.status}`}>{q.status}</span>
                            {q.status === 'converted' && q.linkedInvoiceId && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                → {businessQuotes.find((bq) => bq.id === q.linkedInvoiceId)?.documentNumber || 'invoice'}
                              </div>
                            )}
                            {q.linkedQuoteId && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                from {businessQuotes.find((bq) => bq.id === q.linkedQuoteId)?.documentNumber || 'quote'}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                className="btn btn-secondary btn-icon"
                                onClick={() => onViewQuote(q.id)}
                                title="View/Print Preview"
                                style={{ width: '30px', height: '30px', padding: 0 }}
                              >
                                <svg className="icon" style={{ width: '14px', height: '14px' }}>
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>

                              <button
                                className="btn btn-secondary btn-icon"
                                onClick={() => onEditQuote(q.id)}
                                title="Edit Document"
                                style={{ width: '30px', height: '30px', padding: 0 }}
                              >
                                <svg className="icon" style={{ width: '14px', height: '14px' }}>
                                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                              </button>

                              {q.documentType === 'quote' && q.status !== 'converted' && (
                                <button
                                  className="btn btn-teal btn-secondary btn-icon"
                                  onClick={() => onConvertToInvoice(q.id)}
                                  title="Convert Quote to Invoice"
                                  style={{ width: '30px', height: '30px', padding: 0 }}
                                >
                                  <svg className="icon" style={{ width: '14px', height: '14px' }}>
                                    <path d="M20 11.08V12a8 8 0 1 1-4.8-7.32M22 4L12 14.01l-3-3" />
                                  </svg>
                                </button>
                              )}

                              <button
                                className="btn btn-danger btn-secondary"
                                onClick={() => {
                                  if (confirm(`Delete "${q.documentNumber}"? This is permanent.`)) {
                                    onDeleteQuote(q.id);
                                  }
                                }}
                                title="Delete Document"
                                style={{ height: '30px', padding: '0 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                <svg className="icon" style={{ width: '14px', height: '14px' }}>
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span style={{ fontSize: '0.75rem' }}>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <svg className="icon" style={{ width: '48px', height: '48px', color: 'var(--text-muted)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <h3>No documents found</h3>
                  <p>Create your first quote or invoice to get started for this business profile.</p>
                  <button className="btn btn-primary" onClick={onNewQuote}>
                    + Create Document
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card text-center empty-state" style={{ flex: 1, justifyContent: 'center' }}>
            <h3>Welcome to Smart Quotations!</h3>
            <p>Setup a business profile on the left sidebar to start generating quotes and invoices for your clients.</p>
            <button className="btn btn-primary" onClick={onNewBusiness} style={{ padding: '0.75rem 1.5rem', marginTop: '1rem' }}>
              + Create Business Profile
            </button>
          </div>
        )}
      </div>

      {/* Backup Confirmation Destructive Overwrite Dialog */}
      {showImportConfirm && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3 className="modal-header" style={{ color: 'var(--accent-rose)' }}>
              <svg className="icon" style={{ width: '24px', height: '24px' }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
              </svg>
              Destructive Import Confirmation
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Are you sure you want to import this file?
            </p>
            <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
              <strong style={{ color: '#ff4a6b', fontSize: '0.85rem' }}>
                Warning: Importing data will overwrite all current businesses, quotes, and items. This action cannot be undone.
              </strong>
            </div>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={confirmImport}>
                Proceed and Overwrite Data
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportConfirm(false);
                  setPendingImportData(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
