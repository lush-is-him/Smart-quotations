import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Business } from '../types';
import { resizeAndCompressImage } from '../utils/image';

interface OnboardingWizardProps {
  onComplete: (business: Business) => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tpin, setTpin] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [currencyCode, setCurrencyCode] = useState('ZMW');
  const [currencySymbol, setCurrencySymbol] = useState('K');
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatRate, setVatRate] = useState(16); // Default 16% in Zambia
  const [quotePrefix, setQuotePrefix] = useState('Q-');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [defaultCountryCode, setDefaultCountryCode] = useState('260'); // Zambia default
  
  const [isCompressing, setIsCompressing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleLogoUpload = async (file: File) => {
    try {
      setIsCompressing(true);
      const compressed = await resizeAndCompressImage(file);
      setLogoUrl(compressed);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error processing logo.');
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

  const nextStep = () => {
    if (step === 1) {
      if (!name.trim()) return alert('Business Name is required.');
      if (!address.trim()) return alert('Address is required.');
      if (!logoUrl) return alert('Business Logo is required.');
      setStep(2);
    } else if (step === 2) {
      if (!phone.trim()) return alert('Phone Number is required.');
      if (!defaultCountryCode.trim()) return alert('WhatsApp Country Code is required.');
      setStep(3);
    }
  };

  const prevStep = () => {
    setStep(Math.max(1, step - 1));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!tpin.trim()) return alert('Taxpayer Identification Number (TPIN) is required.');
    if (vatRegistered && (isNaN(vatRate) || vatRate <= 0)) {
      return alert('VAT rate must be a positive percentage when VAT registered.');
    }
    if (!currencyCode.trim()) return alert('Currency Code is required.');
    if (!currencySymbol.trim()) return alert('Currency Symbol is required.');
    if (!quotePrefix.trim()) return alert('Quote prefix is required.');
    if (!invoicePrefix.trim()) return alert('Invoice prefix is required.');

    const newBusiness: Business = {
      id: crypto.randomUUID(),
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
      nextQuoteNumber: 1,
      nextInvoiceNumber: 1,
      createdAt: new Date().toISOString(),
    };

    onComplete(newBusiness);
  };

  return (
    <div className="card" style={{ maxWidth: '650px', margin: '3rem auto', borderTop: '4px solid var(--primary)' }}>
      {/* Wizard Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: 'var(--text-primary)' }}>
          Welcome to Smart Quotations
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Let's get your business profile set up. This runs only once.
        </p>

        {/* Progress Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                height: '4px',
                width: '60px',
                borderRadius: '2px',
                background: s <= step ? 'var(--primary)' : 'var(--bg-tertiary)',
                transition: 'var(--transition)',
              }}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* STEP 1: Basic Profile */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: '1.25rem', fontFamily: 'var(--font-title)', color: 'var(--accent-teal)' }}>
              1. Business Identity
            </h3>

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
              <label>Logo * (Automatically resized & compressed)</label>
              <div
                className={`file-upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('wizard-logo-input')?.click()}
              >
                <input
                  id="wizard-logo-input"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {logoUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      style={{ maxHeight: '80px', maxWidth: '120px', objectFit: 'contain' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-teal)' }}>Logo Uploaded</span>
                  </div>
                ) : (
                  <>
                    <svg className="icon" style={{ width: '32px', height: '32px', color: 'var(--text-secondary)' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {isCompressing ? 'Compressing...' : 'Drag logo here or click to browse'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Address *</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="e.g. Plot 104, Great East Road, Lusaka"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button type="button" className="btn btn-primary" onClick={nextStep} disabled={isCompressing}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Contacts & WhatsApp */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: '1.25rem', fontFamily: 'var(--font-title)', color: 'var(--accent-teal)' }}>
              2. Contacts & WhatsApp
            </h3>

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
              <label>WhatsApp Default Country Code *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 260 for Zambia"
                value={defaultCountryCode}
                onChange={(e) => setDefaultCountryCode(e.target.value.replace(/\D/g, ''))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                This is prepended to local customer numbers starting with 0 when generating WhatsApp links.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={prevStep}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={nextStep}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Localization & Tax (Submit) */}
        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: '1.25rem', fontFamily: 'var(--font-title)', color: 'var(--accent-teal)' }}>
              3. Tax & Preferences
            </h3>

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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Legal requirement: Zambian invoices must display the business TPIN.
              </span>
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
                  id="wizard-vat-reg"
                  checked={vatRegistered}
                  onChange={(e) => {
                    setVatRegistered(e.target.checked);
                    if (e.target.checked && !vatRate) {
                      setVatRate(16); // auto default to 16% on toggle
                    }
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="wizard-vat-reg" style={{ margin: 0, cursor: 'pointer', userSelect: 'none' }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={prevStep}>
                Back
              </button>
              <button type="submit" className="btn btn-primary">
                Finish Setup
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
