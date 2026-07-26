import { useReducer, useEffect } from 'react';
import type { AppState, AppAction, Quote } from './types';
import Dashboard from './components/Dashboard';
import BusinessForm from './components/BusinessForm';
import QuoteForm from './components/QuoteForm';
import InvoicePreview from './components/InvoicePreview';
import OnboardingWizard from './components/OnboardingWizard';

const LOCAL_STORAGE_KEYS = {
  BUSINESSES: 'smart_biz_businesses',
  QUOTES: 'smart_biz_quotes',
  QUOTE_ITEMS: 'smart_biz_quote_items',
  ACTIVE_BUSINESS_ID: 'smart_biz_active_id',
};

// Initial state loader
const getInitialState = (): AppState => {
  try {
    let businesses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.BUSINESSES) || '[]');
    let quotes = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.QUOTES) || '[]');
    let quoteItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.QUOTE_ITEMS) || '[]');

    // If no business exists, route to onboarding wizard
    if (businesses.length === 0) {
      return {
        currentView: 'onboarding',
        businesses: [],
        quotes: [],
        quoteItems: [],
        activeBusinessId: null,
        editingQuoteId: null,
      };
    }

    const activeBusinessId = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_BUSINESS_ID) || (businesses[0]?.id || null);

    return {
      currentView: 'dashboard',
      businesses,
      quotes,
      quoteItems,
      activeBusinessId,
      editingQuoteId: null,
    };
  } catch (err) {
    console.error('Failed to load initial state from localStorage:', err);
    return {
      currentView: 'dashboard',
      businesses: [],
      quotes: [],
      quoteItems: [],
      activeBusinessId: null,
      editingQuoteId: null,
    };
  }
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };

    case 'ADD_BUSINESS': {
      const nextBusinesses = [...state.businesses, action.payload];
      return {
        ...state,
        businesses: nextBusinesses,
        activeBusinessId: action.payload.id,
        currentView: 'dashboard',
      };
    }

    case 'UPDATE_BUSINESS': {
      const nextBusinesses = state.businesses.map((b) =>
        b.id === action.payload.id ? action.payload : b
      );
      return {
        ...state,
        businesses: nextBusinesses,
        currentView: 'dashboard',
      };
    }

    case 'DELETE_BUSINESS': {
      const businessId = action.payload;
      
      // Cascade delete: quotes and items
      const quotesToDelete = state.quotes.filter((q) => q.businessId === businessId);
      const quoteIdsToDelete = new Set(quotesToDelete.map((q) => q.id));

      const nextQuotes = state.quotes.filter((q) => q.businessId !== businessId);
      const nextQuoteItems = state.quoteItems.filter((item) => !quoteIdsToDelete.has(item.quoteId));
      const nextBusinesses = state.businesses.filter((b) => b.id !== businessId);

      const nextActiveId =
        state.activeBusinessId === businessId
          ? nextBusinesses[0]?.id || null
          : state.activeBusinessId;

      return {
        ...state,
        businesses: nextBusinesses,
        quotes: nextQuotes,
        quoteItems: nextQuoteItems,
        activeBusinessId: nextActiveId,
        currentView: 'dashboard',
      };
    }

    case 'SET_ACTIVE_BUSINESS':
      return {
        ...state,
        activeBusinessId: action.payload,
      };

    case 'ADD_QUOTE': {
      const { quote, items, updateCounters } = action.payload;
      
      let nextBusinesses = state.businesses;
      if (updateCounters) {
        // Increment document counter on Business record
        nextBusinesses = state.businesses.map((b) => {
          if (b.id === quote.businessId) {
            return {
              ...b,
              nextQuoteNumber:
                quote.documentType === 'quote' ? b.nextQuoteNumber + 1 : b.nextQuoteNumber,
              nextInvoiceNumber:
                quote.documentType === 'invoice' ? b.nextInvoiceNumber + 1 : b.nextInvoiceNumber,
            };
          }
          return b;
        });
      }

      return {
        ...state,
        businesses: nextBusinesses,
        quotes: [...state.quotes, quote],
        quoteItems: [...state.quoteItems, ...items],
        currentView: 'dashboard',
      };
    }

    case 'UPDATE_QUOTE': {
      const { quote, items } = action.payload;
      const nextQuotes = state.quotes.map((q) => (q.id === quote.id ? quote : q));
      
      // Clear old line items and append updated ones
      const nextQuoteItems = [
        ...state.quoteItems.filter((item) => item.quoteId !== quote.id),
        ...items,
      ];

      return {
        ...state,
        quotes: nextQuotes,
        quoteItems: nextQuoteItems,
        currentView: 'dashboard',
      };
    }

    case 'CONVERT_QUOTE_TO_INVOICE': {
      const { originalQuote, newInvoice, newItems } = action.payload;

      // The original quote stays as its own record (status flips to
      // 'converted'), and the new invoice is a separate record with its
      // own copy of the line items — nothing here touches or removes
      // the original quote's items.
      const nextQuotes = [
        ...state.quotes.map((q) => (q.id === originalQuote.id ? originalQuote : q)),
        newInvoice,
      ];
      const nextQuoteItems = [...state.quoteItems, ...newItems];

      const nextBusinesses = state.businesses.map((b) =>
        b.id === newInvoice.businessId ? { ...b, nextInvoiceNumber: b.nextInvoiceNumber + 1 } : b
      );

      return {
        ...state,
        quotes: nextQuotes,
        quoteItems: nextQuoteItems,
        businesses: nextBusinesses,
        currentView: 'dashboard',
      };
    }

    case 'DELETE_QUOTE': {
      const quoteId = action.payload;
      const target = state.quotes.find((q) => q.id === quoteId);

      let nextQuotes = state.quotes.filter((q) => q.id !== quoteId);
      const nextQuoteItems = state.quoteItems.filter((item) => item.quoteId !== quoteId);

      // Deleting an invoice that was converted from a quote: give the
      // original quote back its 'accepted' status and clear the link,
      // rather than leaving it pointing at an invoice that no longer exists.
      if (target?.linkedQuoteId) {
        nextQuotes = nextQuotes.map((q) =>
          q.id === target.linkedQuoteId ? { ...q, status: 'accepted', linkedInvoiceId: undefined } : q
        );
      }

      // Deleting a quote that was converted to an invoice: the invoice
      // stays, just no longer references a quote that no longer exists.
      if (target?.linkedInvoiceId) {
        nextQuotes = nextQuotes.map((q) =>
          q.id === target.linkedInvoiceId ? { ...q, linkedQuoteId: undefined } : q
        );
      }

      return {
        ...state,
        quotes: nextQuotes,
        quoteItems: nextQuoteItems,
      };
    }

    case 'SET_EDITING_QUOTE':
      return { ...state, editingQuoteId: action.payload };

    case 'IMPORT_DATA': {
      const { businesses, quotes, quoteItems } = action.payload;
      return {
        ...state,
        businesses,
        quotes,
        quoteItems,
        activeBusinessId: businesses[0]?.id || null,
        currentView: 'dashboard',
      };
    }

    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, null, getInitialState);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.BUSINESSES, JSON.stringify(state.businesses));
    localStorage.setItem(LOCAL_STORAGE_KEYS.QUOTES, JSON.stringify(state.quotes));
    localStorage.setItem(LOCAL_STORAGE_KEYS.QUOTE_ITEMS, JSON.stringify(state.quoteItems));
    if (state.activeBusinessId) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_BUSINESS_ID, state.activeBusinessId);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_BUSINESS_ID);
    }
  }, [state.businesses, state.quotes, state.quoteItems, state.activeBusinessId]);

  const activeBusiness = state.businesses.find((b) => b.id === state.activeBusinessId);
  const editingQuote = state.quotes.find((q) => q.id === state.editingQuoteId);
  const editingQuoteItems = state.quoteItems.filter((item) => item.quoteId === state.editingQuoteId);

  // Handle Switch Active Business
  const handleSelectBusiness = (id: string | null) => {
    if (id === null) {
      dispatch({ type: 'SET_VIEW', payload: 'business_form' });
      dispatch({ type: 'SET_ACTIVE_BUSINESS', payload: null });
    } else {
      dispatch({ type: 'SET_ACTIVE_BUSINESS', payload: id });
    }
  };

  // Convert Quote to Invoice — creates a new, separate invoice record linked
  // back to the original quote. The quote stays intact (status: 'converted')
  // so its history isn't lost.
  const handleConvertToInvoice = (quoteId: string) => {
    const targetQuote = state.quotes.find((q) => q.id === quoteId);
    if (!targetQuote || !activeBusiness) return;

    const targetItems = state.quoteItems.filter((item) => item.quoteId === quoteId);

    const nextInvNumber = `${activeBusiness.invoicePrefix}${String(activeBusiness.nextInvoiceNumber).padStart(4, '0')}`;
    const newInvoiceId = crypto.randomUUID();

    const newInvoice: Quote = {
      ...targetQuote,
      id: newInvoiceId,
      documentType: 'invoice',
      documentNumber: nextInvNumber,
      status: 'unpaid',
      issuedDate: new Date().toISOString().split('T')[0], // Reset date to today for billing
      linkedQuoteId: targetQuote.id,
      linkedInvoiceId: undefined,
      createdAt: new Date().toISOString(),
    };

    // Give the invoice its own copies of the line items — the original
    // quote's items are left completely untouched.
    const newItems = targetItems.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      quoteId: newInvoiceId,
    }));

    const updatedOriginalQuote: Quote = {
      ...targetQuote,
      status: 'converted',
      linkedInvoiceId: newInvoiceId,
    };

    dispatch({
      type: 'CONVERT_QUOTE_TO_INVOICE',
      payload: { originalQuote: updatedOriginalQuote, newInvoice, newItems },
    });

    alert(`Quote converted successfully to Invoice ${nextInvNumber}! The original quote is kept for your records.`);
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="app-header no-print">
        <div className="logo-section">
          <div className="logo-icon">Q</div>
          <span className="logo-text">Smart Quotations</span>
        </div>
        <div className="header-actions">
          {activeBusiness && state.currentView === 'dashboard' && (
            <button
              className="btn btn-primary"
              onClick={() => {
                dispatch({ type: 'SET_EDITING_QUOTE', payload: null });
                dispatch({ type: 'SET_VIEW', payload: 'quote_form' });
              }}
            >
              + Create Document
            </button>
          )}
        </div>
      </header>

      {/* Main Page Area */}
      <main className="main-content">
        {state.currentView === 'onboarding' && (
          <OnboardingWizard
            onComplete={(business) => dispatch({ type: 'ADD_BUSINESS', payload: business })}
          />
        )}

        {state.currentView === 'dashboard' && (
          <Dashboard
            businesses={state.businesses}
            quotes={state.quotes}
            quoteItems={state.quoteItems}
            activeBusinessId={state.activeBusinessId}
            onSelectBusiness={handleSelectBusiness}
            onEditBusiness={() => dispatch({ type: 'SET_VIEW', payload: 'business_form' })}
            onDeleteBusiness={(id) => dispatch({ type: 'DELETE_BUSINESS', payload: id })}
            onNewBusiness={() => {
              dispatch({ type: 'SET_ACTIVE_BUSINESS', payload: null });
              dispatch({ type: 'SET_VIEW', payload: 'business_form' });
            }}
            onNewQuote={() => {
              dispatch({ type: 'SET_EDITING_QUOTE', payload: null });
              dispatch({ type: 'SET_VIEW', payload: 'quote_form' });
            }}
            onEditQuote={(id) => {
              dispatch({ type: 'SET_EDITING_QUOTE', payload: id });
              dispatch({ type: 'SET_VIEW', payload: 'quote_form' });
            }}
            onViewQuote={(id) => {
              dispatch({ type: 'SET_EDITING_QUOTE', payload: id });
              dispatch({ type: 'SET_VIEW', payload: 'invoice_preview' });
            }}
            onDeleteQuote={(id) => dispatch({ type: 'DELETE_QUOTE', payload: id })}
            onConvertToInvoice={handleConvertToInvoice}
            onImportBackup={(data) => dispatch({ type: 'IMPORT_DATA', payload: data })}
          />
        )}

        {state.currentView === 'business_form' && (
          <BusinessForm
            business={activeBusiness || null}
            onSave={(biz) => {
              if (activeBusiness) {
                dispatch({ type: 'UPDATE_BUSINESS', payload: biz });
              } else {
                dispatch({ type: 'ADD_BUSINESS', payload: biz });
              }
            }}
            onCancel={() => {
              // If there are no businesses, they must create one, otherwise they go back
              if (state.businesses.length === 0) {
                alert('Please register a business profile to proceed.');
              } else {
                // Return to first business in list if we were creating a new one and cancelled
                const resetId = state.activeBusinessId || state.businesses[0].id;
                dispatch({ type: 'SET_ACTIVE_BUSINESS', payload: resetId });
                dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
              }
            }}
          />
        )}

        {state.currentView === 'quote_form' && activeBusiness && (
          <QuoteForm
            activeBusiness={activeBusiness}
            quote={editingQuote || null}
            items={editingQuote ? editingQuoteItems : []}
            onSave={(quote, items, updateCounters) => {
              if (state.editingQuoteId) {
                dispatch({ type: 'UPDATE_QUOTE', payload: { quote, items } });
              } else {
                dispatch({
                  type: 'ADD_QUOTE',
                  payload: { quote, items, updateCounters },
                });
              }
            }}
            onCancel={() => dispatch({ type: 'SET_VIEW', payload: 'dashboard' })}
          />
        )}

        {state.currentView === 'invoice_preview' && activeBusiness && editingQuote && (
          <InvoicePreview
            business={activeBusiness}
            quote={editingQuote}
            items={editingQuoteItems}
            allQuotes={state.quotes}
            onBack={() => dispatch({ type: 'SET_VIEW', payload: 'dashboard' })}
            onStatusChange={(status) => {
              const updatedQuote = { ...editingQuote, status };
              dispatch({
                type: 'UPDATE_QUOTE',
                payload: { quote: updatedQuote, items: editingQuoteItems },
              });
              // Keep view on preview after status toggle
              dispatch({ type: 'SET_EDITING_QUOTE', payload: updatedQuote.id });
              dispatch({ type: 'SET_VIEW', payload: 'invoice_preview' });
            }}
          />
        )}
      </main>
    </div>
  );
}
