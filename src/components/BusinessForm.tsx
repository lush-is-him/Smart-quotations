import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import type { Business } from '../types';
import { resizeAndCompressImage } from '../utils/image';

interface BusinessFormProps {
  business: Business | null; // Null means create new
  onSave: (business: Business) => void;
  onCancel: () => void;
}

export default function BusinessForm({ business, onSave, onCancel }: BusinessFormProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tpin, setTpin] = useState('');
  const [currencyCode, setCurrencyCode] = useState('ZMW');
  const [currencySymbol, setCurrencySymbol] = useState('K');
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatRate, setVatRate] = useState(16);
  const [quotePrefix, setQuotePrefix] = useState('Q-');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [defaultCountryCode, setDefaultCountryCode] = useState('260');
  const [bankDetails, setBankDetails] = useState('');

  const [logoUrl, setLogoUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (business) {
      setName(business.name);
      setAddress(business.address);
      setPhone(business.phone);
      setEmail(business.email || '');
      setTpin(business.tpin || '');
      setCurrencyCode(business.currencyCode || 'ZMW');
      setCurrencySymbol(business.currencySymbol || 'K');
      setVatRegistered(business.vatRegistered || false);
      setVatRate(business.vatRate || 16);
      setQuotePrefix(business.quotePrefix || 'Q-');
      setInvoicePrefix(business.invoicePrefix || 'INV-');
      setDefaultCountryCode(business.defaultCountryCode || '260');
      setBankDetails(business.bankDetails || '');
      setLogoUrl(business.logoUrl);
    } else {
      setName('');
      setAddress('');
      setPhone('');
      setEmail('');
      setTpin('');
      setCurrencyCode('ZMW');
      setCurrencySymbol('K');
      setVatRegistered(false);
      setVatRate(16);
      setQuotePrefix('Q-');
      setInvoicePrefix('INV-');
      setDefaultCountryCode('260');
      setBankDetails('');
      setLogoUrl('');
    }
  }, [business]);

  const handleLogoUpload = async (file: File) => {
    try {
      setIsCompressing(true);
      const compressed = await resizeAndCompressImage(file);
      setLogoUrl(compressed);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error processing image.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleLogoUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Business Name is required.');
    if (!address.trim()) return alert('Business Address is required.');
    if (!phone.trim()) return alert('Business Phone is required.');
    if (!logoUrl) return alert('Business Logo is required.');
    if (!tpin.trim()) return alert('Taxpayer Identification Number (TPIN) is required.');
    if (vatRegistered && (isNaN(vatRate) || vatRate <= 0)) {
      return alert('VAT rate must be a positive percentage when VAT registered.');
    }
    if (!currencyCode.trim()) return alert('Currency Code is required.');
    if (!currencySymbol.trim()) return alert('Currency Symbol is required.');
    if (!quotePrefix.trim()) return alert('Quote Prefix is required.');
    if (!invoicePrefix.trim()) return alert('Invoice Prefix is required.');
    if (!defaultCountryCode.trim()) return alert('WhatsApp default country code is required.');

    const savedBusiness: Business = {
      id: business?.id || crypto.randomUUID(),
      name: name.trim(),
      logoUrl,
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      tpin: tpin.trim(),
      currencyCode: currencyCode.toUpperCase().trim(),
      currencySymbol: currencySymbol.trim(),
      vatRegistered,
      vatRate: vatRegistered ? vatRate : 0,
      quotePrefix: quotePrefix.trim(),
      invoicePrefix: invoicePrefix.trim(),
      defaultCountryCode: defaultCountryCode.replace(/\D/g, ''),
      bankDetails: bankDetails.trim() || undefined,
      nextQuoteNumber: business?.nextQuoteNumber ?? 1,
      nextInvoiceNumber: business?.nextInvoiceNumber ?? 1,
      createdAt: business?.createdAt || new Date().toISOString(),
    };

    onSave(savedBusiness);
  };

  return (
    <div className="card" style={{ maxWidth: '750px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-title)' }}>
        {business ? 'Edit Business Details' : 'Setup Your Business'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Business Name *</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Kekaka Hardware"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Logo * (Compressed automatically)</label>
          <div
            className={`file-upload-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('logo-file-input')?.click()}
          >
            <input
              id="logo-file-input"
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {logoUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <img
                  src={logoUrl}
                  alt="Business Logo Preview"
                  style={{ maxHeight: '80px', maxWidth: '120px', objectFit: 'contain' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-teal)' }}>Logo Uploaded Successfully</span>
              </div>
            ) : (
              <>
                <svg className="icon" style={{ width: '32px', height: '32px', color: 'var(--text-secondary)' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {isCompressing ? 'Compressing...' : 'Drag & drop your logo here or click to browse'}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Business Address *</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="e.g. Plot 104, Great East Road, Lusaka"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. +260 977 123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>WhatsApp Default Country Code *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 260 for Zambia"
              value={defaultCountryCode}
              onChange={(e) => setDefaultCountryCode(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Email Address (Optional)</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. contact@kekakahardware.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Taxpayer Identification Number (TPIN) *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 1000234567"
              value={tpin}
              onChange={(e) => setTpin(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Currency Code *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. ZMW"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Currency Symbol *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. K"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row" style={{ alignItems: 'end' }}>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px', marginBottom: '1.25rem' }}>
            <input
              type="checkbox"
              id="form-vat-reg"
              checked={vatRegistered}
              onChange={(e) => {
                setVatRegistered(e.target.checked);
                if (e.target.checked && !vatRate) {
                  setVatRate(16);
                }
              }}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="form-vat-reg" style={{ margin: 0, cursor: 'pointer', userSelect: 'none' }}>
              VAT Registered Business
            </label>
          </div>

          {vatRegistered && (
            <div className="form-group">
              <label>VAT Rate (%) *</label>
              <input
                type="number"
                className="form-control"
                min="0.1"
                step="0.1"
                value={vatRate}
                onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Quote No. Prefix *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Q-"
              value={quotePrefix}
              onChange={(e) => setQuotePrefix(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Invoice No. Prefix *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. INV-"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              required
                />
          </div>
        </div>

        <div className="form-group">
          <label>Payment / Bank Details (Optional — shown on invoices only)</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder={'e.g. Bank: Zanaco\nAccount Name: Journey of Fath\nAccount No: 0123456789'}
            value={bankDetails}
            onChange={(e) => setBankDetails(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isCompressing}>
            {isCompressing ? 'Processing Logo...' : business ? 'Save Changes' : 'Create Business'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isCompressing}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
