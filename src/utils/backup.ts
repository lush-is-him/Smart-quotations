import type { Business, Quote, QuoteItem } from '../types';

interface BackupData {
  version: string;
  businesses: Business[];
  quotes: Quote[];
  quoteItems: QuoteItem[];
}

/**
 * Downloads a JSON file containing all application data tables.
 */
export function exportData(
  businesses: Business[],
  quotes: Quote[],
  quoteItems: QuoteItem[]
): void {
  const backup: BackupData = {
    version: '1.0.0',
    businesses,
    quotes,
    quoteItems,
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `smart_quotations_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads a JSON file, validates its structure, and returns the tables.
 * Throws an error if the structure is invalid.
 */
export function importData(file: File): Promise<{
  businesses: Business[];
  quotes: Quote[];
  quoteItems: QuoteItem[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Validation check
        if (!json || typeof json !== 'object') {
          throw new Error('Invalid file format: Not a JSON object.');
        }

        if (
          !Array.isArray(json.businesses) ||
          !Array.isArray(json.quotes) ||
          !Array.isArray(json.quoteItems)
        ) {
          throw new Error(
            'Invalid backup structure. The file must contain businesses, quotes, and quoteItems arrays.'
          );
        }

        // Validate basic fields of at least one record or type check
        // Businesses validation
        for (const b of json.businesses) {
          if (!b.id || !b.name || !b.logoUrl || !b.address || !b.phone) {
            throw new Error('Invalid business record in backup file.');
          }
        }

        // Quotes validation
        for (const q of json.quotes) {
          if (!q.id || !q.businessId || !q.documentType || !q.documentNumber || !q.customerName || !q.status) {
            throw new Error('Invalid quote record in backup file.');
          }
        }

        // Items validation
        for (const item of json.quoteItems) {
          if (!item.id || !item.quoteId || !item.description || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
            throw new Error('Invalid quote item record in backup file.');
          }
        }

        resolve({
          businesses: json.businesses,
          quotes: json.quotes,
          quoteItems: json.quoteItems,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Unknown error parsing file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
export type { BackupData };
