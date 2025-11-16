/**
 * Currency formatting utilities
 */

export const formatCurrency = (amount: number | null, currency: string | null | undefined = 'MXN'): string => {
  if (amount === null || amount === undefined) return 'N/A';
  
  // Handle null/undefined currency
  const validCurrency = currency || 'MXN';
  
  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: validCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
};

export const getCurrencySymbol = (currency: string | null | undefined): string => {
  if (!currency) return '$';
  
  switch (currency.toUpperCase()) {
    case 'USD':
      return '$';
    case 'MXN':
      return '$';
    case 'EUR':
      return '€';
    default:
      return '$';
  }
};

export const getCurrencyCode = (currency: string | null | undefined): string => {
  if (!currency) return 'MXN';
  return currency.toUpperCase();
};

export const formatPriceWithCurrency = (amount: number | null, currency: string | null | undefined = 'MXN'): string => {
  if (amount === null || amount === undefined) return 'N/A';
  
  const symbol = getCurrencySymbol(currency);
  const code = getCurrencyCode(currency);
  
  return `${symbol}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
};

export const isUSD = (currency: string | null | undefined): boolean => {
  if (!currency) return false;
  return currency.toUpperCase() === 'USD';
};

export const isMXN = (currency: string | null | undefined): boolean => {
  if (!currency) return true; // Default to MXN if no currency specified
  return currency.toUpperCase() === 'MXN';
};




