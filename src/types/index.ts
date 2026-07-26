export interface Business {
  id: string;
  name: string;
  logoUrl: string; // Base64 data URL
  address: string;
  phone: string;
  email?: string;
  tpin: string;               // Required tax ID
  currencyCode: string;       // e.g. "ZMW"
  currencySymbol: string;     // e.g. "K"
  vatRegistered: boolean;
  vatRate: number;            // 0 if not registered
  quotePrefix: string;        // e.g. "Q-"
  invoicePrefix: string;      // e.g. "INV-"
  defaultCountryCode: string; // for WhatsApp normalization (e.g. "260")
  bankDetails?: string;       // optional payment/bank details, shown on invoices only
  nextQuoteNumber: number;
  nextInvoiceNumber: number;
  createdAt: string;
}

export interface Quote {
  id: string;
  businessId: string;
  documentType: 'quote' | 'invoice';
  documentNumber: string; // generated using prefix + padding
  customerName: string;
  customerPhone?: string;
  status: 'draft' | 'sent' | 'accepted' | 'converted' | 'paid' | 'unpaid';
  totalAmount: number;
  issuedDate: string;
  dueDate?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number; // raw entered value; 0 or undefined means no discount
  linkedInvoiceId?: string; // set on a quote once it's been converted — points to the derived invoice
  linkedQuoteId?: string;   // set on an invoice that was converted from a quote — points back to the original
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  description: string;
  quantity: number;
  unit: string; // e.g. "item", "hour", "day", "bag", "kg", "m²", or custom text
  unitPrice: number;
  lineTotal: number;
}

export interface AppState {
  currentView: 'dashboard' | 'business_form' | 'quote_form' | 'invoice_preview' | 'onboarding';
  businesses: Business[];
  quotes: Quote[];
  quoteItems: QuoteItem[];
  activeBusinessId: string | null;
  editingQuoteId: string | null;
}

export type AppAction =
  | { type: 'SET_VIEW'; payload: AppState['currentView'] }
  | { type: 'ADD_BUSINESS'; payload: Business }
  | { type: 'UPDATE_BUSINESS'; payload: Business }
  | { type: 'DELETE_BUSINESS'; payload: string }
  | { type: 'SET_ACTIVE_BUSINESS'; payload: string | null }
  | { type: 'ADD_QUOTE'; payload: { quote: Quote; items: QuoteItem[]; updateCounters: boolean } }
  | { type: 'UPDATE_QUOTE'; payload: { quote: Quote; items: QuoteItem[] } }
  | {
      type: 'CONVERT_QUOTE_TO_INVOICE';
      payload: { originalQuote: Quote; newInvoice: Quote; newItems: QuoteItem[] };
    }
  | { type: 'DELETE_QUOTE'; payload: string }
  | { type: 'SET_EDITING_QUOTE'; payload: string | null }
  | { type: 'IMPORT_DATA'; payload: { businesses: Business[]; quotes: Quote[]; quoteItems: QuoteItem[] } };
